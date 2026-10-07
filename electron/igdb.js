const { httpsRequest } = require('./net');

// ---------------------------------------------------------------------------
// IGDB metadata bridge. Calls the GamePilot Netlify relay
// (/.netlify/functions/getIgdbGame via the /api redirect) so the Twitch client
// credentials stay server-side and never ship in the client bundle.
// Used by IgdbArtworkService to fetch cover art + metadata for games that
// have no artwork source (non-Steam launchers). Cached in-memory per name.
// ---------------------------------------------------------------------------
const IGDB_RELAY_URL = 'https://gamepilot.netlify.app/api/getIgdbGame';
const IGDB_CACHE = new Map();
const IGDB_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_NAME_LENGTH = 120;

const normalizeName = (value) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NAME_LENGTH);

function registerIpcHandlers(ipcMain) {
  ipcMain.handle('igdb-lookup', async (_event, name) => {
    const cleanName = normalizeName(name);
    if (!cleanName) return { ok: false, error: 'invalid-name' };

    const cacheKey = cleanName.toLowerCase();
    const cached = IGDB_CACHE.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) return { ok: true, ...cached.data, cached: true };

    try {
      const res = await httpsRequest(`${IGDB_RELAY_URL}?name=${encodeURIComponent(cleanName)}`, null, {
        'User-Agent': 'GamePilot/1.9',
        Accept: 'application/json',
      });
      if (res.status !== 200) return { ok: false, error: 'igdb-unavailable' };
      const data = JSON.parse(res.body || '{}');
      const result = data.found === true && data.game ? { game: data.game } : { game: null };
      IGDB_CACHE.delete(cacheKey);
      IGDB_CACHE.set(cacheKey, { data: result, expiresAt: Date.now() + IGDB_CACHE_TTL_MS });
      // Bound the cache; oldest entries evicted first
      if (IGDB_CACHE.size > 512) IGDB_CACHE.delete(IGDB_CACHE.keys().next().value);
      return { ok: true, ...result };
    } catch (error) {
      console.warn('[IGDB] relay request failed:', error.message);
      return { ok: false, error: 'igdb-unavailable' };
    }
  });
}

module.exports = { registerIpcHandlers };
