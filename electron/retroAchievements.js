const { httpsRequest } = require('./net');

// RetroAchievements bridge. RA's API is keyed by the user's *own* web API key
// (z=username, y=key), so no server-side secret or Netlify relay is needed —
// main process fetches directly, which also bypasses renderer CORS limits.
// Credentials arrive per-request from renderer storage, are used in query
// strings only, and are never logged or persisted in main.
const RA_API_BASE = 'https://retroachievements.org/API';
const GAME_LIST_TTL_MS = 24 * 60 * 60000;
const PROGRESS_TTL_MS = 6 * 60 * 60000;

const gameListCache = new Map();
const progressCache = new Map();

const validCredentials = (username, apiKey) => {
  const user = String(username || '').trim();
  const key = String(apiKey || '').trim();
  // RA usernames are alnum/underscore; web API keys are 32-char tokens.
  if (!/^[\w]{1,32}$/i.test(user) || !/^[a-z0-9]{16,64}$/i.test(key)) return null;
  return { user, key };
};

const fetchJson = async (endpoint, params) => {
  const url = `${RA_API_BASE}/${endpoint}?${params.toString()}`;
  const res = await httpsRequest(url, null, {
    'User-Agent': 'GamePilot/1.9',
    Accept: 'application/json',
  });
  if (res.status !== 200) {
    throw new Error(`ra-${res.status}`);
  }
  return JSON.parse(res.body || '{}');
};

function registerIpcHandlers(ipcMain) {
  // Achievement-enabled game list for a console. Cached 24h per console+user —
  // catalogs change slowly and this is the biggest payload we pull.
  ipcMain.handle('ra-game-list', async (_event, payload = {}) => {
    const creds = validCredentials(payload?.username, payload?.apiKey);
    const consoleId = Number(payload?.consoleId) || 0;
    if (!creds || consoleId <= 0) return { ok: false, error: 'invalid-request' };

    const cacheKey = `${creds.user}:${consoleId}`;
    const cached = gameListCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return { ok: true, games: cached.games, cached: true };
    }

    try {
      const params = new URLSearchParams({ z: creds.user, y: creds.key, i: String(consoleId), f: '1' });
      const data = await fetchJson('API_GetGameList.php', params);
      const rows = Array.isArray(data) ? data : [];
      const games = rows
        .map((row) => ({
          id: Number(row.ID) || 0,
          title: typeof row.Title === 'string' ? row.Title : '',
          consoleId: Number(row.ConsoleID) || consoleId,
          achievements: Number(row.NumAchievements) || 0,
          imageIcon: typeof row.ImageIcon === 'string' ? row.ImageIcon : '',
        }))
        .filter((row) => row.id > 0 && row.title);
      gameListCache.set(cacheKey, { games, expiresAt: Date.now() + GAME_LIST_TTL_MS });
      if (gameListCache.size > 12) gameListCache.delete(gameListCache.keys().next().value);
      return { ok: true, games };
    } catch (error) {
      return { ok: false, error: 'unavailable' };
    }
  });

  // Per-game user progress (earned/total, completion %). Cached 6h per
  // game+user — progress moves as the user plays.
  ipcMain.handle('ra-game-progress', async (_event, payload = {}) => {
    const creds = validCredentials(payload?.username, payload?.apiKey);
    const gameId = Number(payload?.gameId) || 0;
    if (!creds || gameId <= 0) return { ok: false, error: 'invalid-request' };

    const cacheKey = `${creds.user}:${gameId}`;
    const cached = progressCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return { ok: true, progress: cached.progress, cached: true };
    }

    try {
      const params = new URLSearchParams({
        z: creds.user,
        y: creds.key,
        g: String(gameId),
        u: creds.user,
      });
      const data = await fetchJson('API_GetGameInfoAndUserProgress.php', params);
      const total = Number(data?.NumAchievements) || 0;
      if (total === 0) return { ok: false, error: 'no-achievements' };
      const progress = {
        gameId,
        title: typeof data?.Title === 'string' ? data.Title : '',
        total,
        earned: Number(data?.NumAwardedToUser) || 0,
        earnedHardcore: Number(data?.NumAwardedToUserHardcore) || 0,
        completion: String(data?.UserCompletion || ''),
        completionHardcore: String(data?.UserCompletionHardcore || ''),
      };
      progressCache.set(cacheKey, { progress, expiresAt: Date.now() + PROGRESS_TTL_MS });
      if (progressCache.size > 128) progressCache.delete(progressCache.keys().next().value);
      return { ok: true, progress };
    } catch (error) {
      return { ok: false, error: 'unavailable' };
    }
  });
}

module.exports = { registerIpcHandlers };
