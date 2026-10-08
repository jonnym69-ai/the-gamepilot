const STEAM_API_BASE = 'https://api.steampowered.com';
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

const safeUrl = (value, allowedHostSuffix) => {
  if (typeof value !== 'string' || !value.startsWith('https://')) return null;
  try {
    const url = new URL(value);
    return url.hostname === allowedHostSuffix || url.hostname.endsWith(`.${allowedHostSuffix}`) ? value : null;
  } catch {
    return null;
  }
};

// Profile identity via the Steam Web API. The key stays server-side; the
// client sends only a Steam64 ID and receives trimmed public-profile fields.
// Level/badge data needs public game details — private profiles still return
// name + avatar with those fields null.
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
    const summaries = await fetchJson(
      `${STEAM_API_BASE}/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${steamid}`
    );
    const player = summaries.data?.response?.players?.[0];
    if (!player) {
      return respond(404, { error: 'No Steam profile found for that ID.' });
    }

    // Badges carries level + xp + badge list in one call; a private game
    // library returns an empty/errored response, which is not fatal.
    const badges = await fetchJson(`${STEAM_API_BASE}/IPlayerService/GetBadges/v1/?key=${apiKey}&steamid=${steamid}`);
    const badgeData = badges.data?.response;
    const badgeCount = Array.isArray(badgeData?.badges) ? badgeData.badges.length : null;
    const level = Number.isInteger(badgeData?.player_level) ? badgeData.player_level : null;
    const xp = Number.isInteger(badgeData?.player_xp) ? badgeData.player_xp : null;

    return respond(200, {
      profile: {
        steamid: String(player.steamid || ''),
        name: typeof player.personaname === 'string' ? player.personaname.slice(0, 64) : '',
        avatar: safeUrl(player.avatarfull, 'steamstatic.com') || safeUrl(player.avatarmedium, 'steamstatic.com'),
        profileUrl: safeUrl(player.profileurl, 'steamcommunity.com'),
        memberSince: Number.isInteger(player.timecreated) ? player.timecreated * 1000 : null,
        isPrivate: player.communityvisibilitystate !== 3,
        level,
        xp,
        badges: badgeCount,
      },
      fetchedAt: Date.now(),
    });
  } catch {
    return respond(502, { error: 'Steam profile request failed.' });
  }
}
