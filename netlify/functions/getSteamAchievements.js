const STEAM_API_BASE = 'https://api.steampowered.com';
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

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  const steamid = String(event.queryStringParameters?.steamid || '');
  if (!/^\d{17}$/.test(steamid)) {
    return respond(400, { ok: false, error: 'invalid-steamid' });
  }
  const appid = String(event.queryStringParameters?.appid || '');
  if (!/^\d+$/.test(appid)) {
    return respond(400, { ok: false, error: 'invalid-appid' });
  }

  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) {
    return respond(503, { ok: false, error: 'steam-error' });
  }

  try {
    const { status, data } = await fetchJson(
      `${STEAM_API_BASE}/ISteamUserStats/GetPlayerAchievements/v0001/` +
        `?key=${apiKey}&steamid=${steamid}&appid=${appid}&l=en&format=json`
    );

    if (status === 401 || status === 403) {
      return respond(403, { ok: false, error: 'private-profile' });
    }
    if (status !== 200 || !data) {
      return respond(502, { ok: false, error: 'steam-error' });
    }

    const playerstats = data.playerstats;
    if (playerstats?.success === false) {
      const reason = String(playerstats.error || '').toLowerCase();
      if (reason.includes('not public')) {
        return respond(403, { ok: false, error: 'private-profile' });
      }
      if (reason.includes('no stats')) {
        return respond(404, { ok: false, error: 'no-achievements' });
      }
      return respond(502, { ok: false, error: 'steam-error' });
    }

    const raw = Array.isArray(playerstats?.achievements) ? playerstats.achievements : [];
    const achievements = raw
      .map((item) => ({
        apiname: String(item?.apiname || ''),
        name: typeof item?.name === 'string' ? item.name : '',
        description: typeof item?.description === 'string' ? item.description : '',
        achieved: Number(item?.achieved || 0) > 0,
        unlockTime: Number(item?.unlocktime || 0) > 0 ? new Date(Number(item.unlocktime) * 1000).toISOString() : null,
      }))
      .filter((item) => item.apiname);

    return respond(200, {
      ok: true,
      gameName: typeof playerstats?.gameName === 'string' ? playerstats.gameName : '',
      achievements,
    });
  } catch {
    return respond(502, { ok: false, error: 'steam-error' });
  }
}
