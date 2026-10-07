const STEAM_API_BASE = 'https://api.steampowered.com';
const SUMMARY_BATCH_SIZE = 100;
const MAX_FRIENDS = 200;
const FETCH_TIMEOUT_MS = 8000;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const respond = (statusCode, body) => ({
  statusCode,
  headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const fetchJson = async (url) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return { status: response.status, data: await response.json().catch(() => null) };
  } finally {
    clearTimeout(timer);
  }
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  const steamid = String(event.queryStringParameters?.steamid || '');
  if (!/^\d{17}$/.test(steamid)) {
    return respond(400, { error: 'A valid 17-digit Steam ID is required.' });
  }

  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) {
    return respond(503, { error: 'Steam API is not configured.' });
  }

  try {
    const friendList = await fetchJson(
      `${STEAM_API_BASE}/ISteamUser/GetFriendList/v1/?key=${apiKey}&steamid=${steamid}&relationship=friend`
    );

    if (friendList.status === 401 || friendList.status === 403) {
      return respond(403, { error: 'This Steam friends list is private.' });
    }
    if (!friendList.data?.friendslist?.friends) {
      return respond(502, { error: 'Steam friends list is unavailable.' });
    }

    const steamIds = friendList.data.friendslist.friends
      .map((friend) => String(friend?.steamid || ''))
      .filter((id) => /^\d{17}$/.test(id))
      .slice(0, MAX_FRIENDS);

    if (steamIds.length === 0) {
      return respond(200, { friends: [], fetchedAt: Date.now() });
    }

    const players = [];
    for (let i = 0; i < steamIds.length; i += SUMMARY_BATCH_SIZE) {
      const batch = steamIds.slice(i, i + SUMMARY_BATCH_SIZE).join(',');
      const summaries = await fetchJson(
        `${STEAM_API_BASE}/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${batch}`
      );
      if (Array.isArray(summaries.data?.response?.players)) {
        players.push(...summaries.data.response.players);
      }
    }

    const friends = players.map((player) => ({
      steamid: String(player.steamid || ''),
      name: typeof player.personaname === 'string' ? player.personaname.slice(0, 64) : '',
      avatar:
        typeof player.avatarmedium === 'string' && player.avatarmedium.startsWith('https://')
          ? player.avatarmedium
          : null,
      state: Number.isInteger(player.personastate) ? player.personastate : 0,
      playing:
        typeof player.gameextrainfo === 'string' && player.gameextrainfo ? player.gameextrainfo.slice(0, 120) : null,
      appid: player.gameid ? String(player.gameid) : null,
      isPrivate: player.communityvisibilitystate !== 3,
    }));

    return respond(200, { friends, fetchedAt: Date.now() });
  } catch (error) {
    return respond(502, { error: 'Steam friends request failed.' });
  }
}
