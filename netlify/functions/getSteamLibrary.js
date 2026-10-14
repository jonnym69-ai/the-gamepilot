const STEAM_API_BASE = 'https://api.steampowered.com';
const MAX_GAMES = 500;
const FETCH_TIMEOUT_MS = 10000;

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

const toIconUrl = (appid, hash) =>
  appid && typeof hash === 'string' && /^[a-f0-9]{40}$/i.test(hash)
    ? `https://media.steampowered.com/steamcommunity/public/images/apps/${appid}/${hash}.jpg`
    : null;

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
    const owned = await fetchJson(
      `${STEAM_API_BASE}/IPlayerService/GetOwnedGames/v1/?key=${apiKey}&steamid=${steamid}` +
        '&include_appinfo=1&include_played_free_games=1&format=json'
    );

    if (owned.status === 401 || owned.status === 403) {
      return respond(403, { error: 'This Steam game list is private.' });
    }
    if (!owned.data?.response) {
      return respond(502, { error: 'Steam library is unavailable.' });
    }

    // Private game details return an empty games array — that is a privacy
    // answer, not an empty account, so flag it for honest messaging.
    const rawGames = Array.isArray(owned.data.response.games) ? owned.data.response.games : [];
    if (rawGames.length === 0) {
      return respond(200, { games: [], privateDetails: true, fetchedAt: Date.now() });
    }

    const games = rawGames
      .map((game) => ({
        appid: Number(game.appid) || 0,
        name: typeof game.name === 'string' ? game.name.slice(0, 160) : '',
        playtimeForever: Number(game.playtime_forever) || 0,
        playtime2Weeks: Number(game.playtime_2weeks) || 0,
        lastPlayed: Number(game.rtime_last_played) || 0,
        icon: toIconUrl(game.appid, game.img_icon_url),
      }))
      .filter((game) => game.appid > 0 && game.name)
      .sort((a, b) => b.playtimeForever - a.playtimeForever)
      .slice(0, MAX_GAMES);

    return respond(200, { games, privateDetails: false, fetchedAt: Date.now() });
  } catch (error) {
    return respond(502, { error: 'Steam library request failed.' });
  }
}
