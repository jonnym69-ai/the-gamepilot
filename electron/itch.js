const { httpsRequest } = require('./net');

// ---------------------------------------------------------------------------
// itch.io owned-library bridge.
// itch has no OAuth for third-party apps; instead users generate a personal
// API key at https://itch.io/user/settings/api-keys (stored locally, opt-in).
// GET /api/1/{key}/my-owned-keys returns purchase + claimed download keys,
// each carrying a `game` record — this is where big charity-bundle libraries
// become visible.
// ---------------------------------------------------------------------------

const KEY_PATTERN = /^[a-zA-Z0-9-]{20,64}$/;

const ITCH_ERRORS = {
  400: 'itch rejected that API key — check it in Settings.',
  401: 'itch rejected that API key — check it in Settings.',
  403: 'itch rejected that API key — check it in Settings.',
  429: 'itch is rate-limiting right now — try again in a bit.',
};

function registerIpcHandlers(ipcMain) {
  ipcMain.handle('itch-owned-games', async (_event, apiKey) => {
    const key = String(apiKey || '').trim();
    if (!KEY_PATTERN.test(key)) {
      return { ok: false, error: 'invalid-key' };
    }
    try {
      const res = await httpsRequest(`https://itch.io/api/1/${encodeURIComponent(key)}/my-owned-keys`, null, {
        Accept: 'application/json',
        'User-Agent': 'GamePilot (local library companion)',
      });
      if (res.status !== 200) {
        return { ok: false, error: ITCH_ERRORS[res.status] || `http-${res.status}` };
      }
      let parsed;
      try {
        parsed = JSON.parse(res.body);
      } catch {
        return { ok: false, error: 'parse' };
      }
      const keys = Array.isArray(parsed?.owned_keys) ? parsed.owned_keys : [];
      const seen = new Set();
      const games = keys
        .map((entry) => entry?.game)
        .filter((game) => game && game.id && typeof game.title === 'string')
        .filter((game) => {
          if (seen.has(game.id)) return false;
          seen.add(game.id);
          return true;
        })
        .map((game) => ({
          itchId: String(game.id),
          name: String(game.title).trim() || 'Untitled',
          icon: /^https:\/\//.test(game.cover_url || '') ? game.cover_url : null,
          url: /^https:\/\//.test(game.url || '') ? game.url : null,
          description: typeof game.short_text === 'string' ? game.short_text.trim() || null : null,
        }));
      return { ok: true, games };
    } catch (error) {
      console.warn('[itch] owned-keys fetch failed:', error.message);
      return { ok: false, error: error.message || 'unknown' };
    }
  });
}

module.exports = { registerIpcHandlers };
