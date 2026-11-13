const { httpsRequest } = require('./net');

// SteamGridDB bridge. SGDB keys are per-user (free from steamgriddb.com), so
// like RetroAchievements the user's own key arrives per-request from renderer
// storage — no server-side secret, never logged or persisted in main.
// Returned artwork URLs are validated to the official CDN so a hostile or
// broken response can't inject arbitrary remote images.
const SGDB_API_BASE = 'https://www.steamgriddb.com/api/v2';
const CACHE_TTL_MS = 24 * 60 * 60000;
const cache = new Map();

const validKey = (apiKey) => {
  const key = String(apiKey || '').trim();
  return /^[a-z0-9]{20,128}$/i.test(key) ? key : null;
};

const cachedGet = async (cacheKey, url, key) => {
  const hit = cache.get(cacheKey);
  if (hit && Date.now() < hit.expiresAt) return { ...hit.data, cached: true };
  const res = await httpsRequest(url, null, {
    'User-Agent': 'GamePilot/1.9',
    Accept: 'application/json',
    Authorization: `Bearer ${key}`,
  });
  if (res.status === 401 || res.status === 403) return { ok: false, error: 'invalid-key' };
  if (res.status !== 200) return { ok: false, error: 'sgdb-unavailable' };
  let data;
  try {
    data = JSON.parse(res.body || '{}');
  } catch {
    return { ok: false, error: 'sgdb-unavailable' };
  }
  const result = { ok: true, data };
  cache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
  if (cache.size > 60) cache.delete(cache.keys().next().value);
  return result;
};

// SGDB image CDNs — any other host in a response is dropped.
const safeImageUrl = (url) => {
  try {
    const parsed = new URL(String(url || ''));
    return parsed.protocol === 'https:' && /(^|\.)steamgriddb\.com$/i.test(parsed.hostname) ? parsed.toString() : null;
  } catch {
    return null;
  }
};

const normalizeArt = (item) => ({
  id: item?.id,
  url: safeImageUrl(item?.url),
  thumb: safeImageUrl(item?.thumb),
  author: String(item?.author?.name || '').slice(0, 60) || null,
  score: Number(item?.score) || 0,
});

function registerIpcHandlers(ipcMain) {
  // Search SGDB's game catalog by name → [{id, name}] candidates.
  ipcMain.handle('sgdb-search', async (_event, payload = {}) => {
    const key = validKey(payload?.apiKey);
    const term = String(payload?.name || '')
      .trim()
      .slice(0, 120);
    if (!key) return { ok: false, error: 'invalid-key', games: [] };
    if (!term) return { ok: false, error: 'missing-name', games: [] };
    const result = await cachedGet(
      `search:${term.toLowerCase()}`,
      `${SGDB_API_BASE}/search/autocomplete/${encodeURIComponent(term)}`,
      key
    );
    if (!result.ok) return { ...result, games: [] };
    const games = (Array.isArray(result.data?.data) ? result.data.data : [])
      .slice(0, 8)
      .map((g) => ({ id: g.id, name: String(g.name || '').slice(0, 120) }))
      .filter((g) => g.id && g.name);
    return { ok: true, games };
  });

  // Artwork for an SGDB game id. kind: 'grids' | 'heroes' | 'logos'.
  ipcMain.handle('sgdb-art', async (_event, payload = {}) => {
    const key = validKey(payload?.apiKey);
    const gameId = Number(payload?.gameId) || 0;
    const kind = ['grids', 'heroes', 'logos'].includes(payload?.kind) ? payload.kind : 'grids';
    if (!key) return { ok: false, error: 'invalid-key', items: [] };
    if (!gameId) return { ok: false, error: 'missing-game', items: [] };
    const dims = kind === 'grids' ? '?dimensions=600x900,342x462,384x512,512x512&types=static' : '?types=static';
    const result = await cachedGet(`${kind}:${gameId}`, `${SGDB_API_BASE}/${kind}/game/${gameId}${dims}`, key);
    if (!result.ok) return { ...result, items: [] };
    const items = (Array.isArray(result.data?.data) ? result.data.data : [])
      .map(normalizeArt)
      .filter((a) => a.url)
      .sort((a, b) => b.score - a.score)
      .slice(0, 24);
    return { ok: true, items };
  });
}

module.exports = { registerIpcHandlers };
