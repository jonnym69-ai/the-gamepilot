const IGDB_API = 'https://api.igdb.com/v4';
const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const FETCH_TIMEOUT_MS = 8000;
const MAX_NAME_LENGTH = 120;

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

// Twitch client-credentials tokens last ~60 days. Cache module-scoped so warm
// invocations skip the token round-trip; cold starts re-fetch (one request).
let tokenCache = null;

const getAccessToken = async () => {
  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.token;

  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(
      `${TWITCH_TOKEN_URL}?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
      { method: 'POST', signal: controller.signal }
    );
    if (!response.ok) return null;
    const data = await response.json();
    if (!data?.access_token) return null;
    tokenCache = {
      token: data.access_token,
      // Refresh 5 minutes early so a stale token is never sent
      expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000 - 300000,
    };
    return tokenCache.token;
  } finally {
    clearTimeout(timer);
  }
};

const igdbQuery = async (token, endpoint, body) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(`${IGDB_API}/${endpoint}`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'text/plain',
      },
      body,
    });
    if (!response.ok) return { status: response.status, data: null };
    return { status: 200, data: await response.json() };
  } finally {
    clearTimeout(timer);
  }
};

// IGDB returns image URLs protocol-relative; normalise and offer the sizes
// the app's card surfaces actually use.
const coverUrls = (cover) => {
  const raw = typeof cover?.url === 'string' ? cover.url : '';
  if (!raw) return null;
  const absolute = raw.startsWith('//') ? `https:${raw}` : raw;
  return {
    thumb: absolute.replace(/t_[a-z0-9_]+/, 't_thumb'),
    card: absolute.replace(/t_[a-z0-9_]+/, 't_cover_big'),
    hd: absolute.replace(/t_[a-z0-9_]+/, 't_cover_big_2x'),
  };
};

const pickBestMatch = (results, wantedName) => {
  if (!Array.isArray(results) || results.length === 0) return null;
  const wanted = wantedName.trim().toLowerCase();
  return results.find((g) => typeof g.name === 'string' && g.name.trim().toLowerCase() === wanted) || results[0];
};

const esc = (value) => value.replace(/["\\]/g, '');

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  const name = String(event.queryStringParameters?.name || '')
    .trim()
    .slice(0, MAX_NAME_LENGTH);
  if (!name) {
    return respond(400, { error: 'A game name is required.' });
  }

  if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
    return respond(503, { error: 'IGDB is not configured.' });
  }

  try {
    const token = await getAccessToken();
    if (!token) return respond(502, { error: 'Could not authenticate with IGDB.' });

    let result = await igdbQuery(
      token,
      'games',
      `search "${esc(name)}"; fields name,cover.url,game_modes,genres.name,first_release_date,summary; limit 5;`
    );

    // Token may have been revoked between deploys — retry once with a fresh one
    if (result.status === 401 || result.status === 403) {
      tokenCache = null;
      const fresh = await getAccessToken();
      if (!fresh) return respond(502, { error: 'Could not authenticate with IGDB.' });
      result = await igdbQuery(
        fresh,
        'games',
        `search "${esc(name)}"; fields name,cover.url,game_modes,genres.name,first_release_date,summary; limit 5;`
      );
    }

    if (result.status !== 200 || !Array.isArray(result.data)) {
      return respond(502, { error: 'IGDB lookup failed.' });
    }

    const match = pickBestMatch(result.data, name);
    if (!match) {
      return respond(200, { found: false, game: null });
    }

    const MODE_NAMES = {
      1: 'Single player',
      2: 'Multiplayer',
      3: 'Co-op',
      4: 'Split screen',
      5: 'MMO',
      6: 'Battle Royale',
    };
    return respond(200, {
      found: true,
      game: {
        id: match.id,
        name: match.name,
        cover: coverUrls(match.cover),
        gameModes: (Array.isArray(match.game_modes) ? match.game_modes : []).map((m) => MODE_NAMES[m]).filter(Boolean),
        genres: (Array.isArray(match.genres) ? match.genres : [])
          .map((g) => (typeof g?.name === 'string' ? g.name : null))
          .filter(Boolean)
          .slice(0, 5),
        releaseDate: Number.isInteger(match.first_release_date) ? match.first_release_date * 1000 : null,
        summary: typeof match.summary === 'string' ? match.summary.slice(0, 500) : null,
      },
    });
  } catch {
    return respond(502, { error: 'IGDB lookup failed.' });
  }
}
