const { httpsRequest } = require('./net');

const FEED_URL = 'https://www.gamerpower.com/api/filter?platform=pc&type=game&sort-by=value';

function registerIpcHandlers(ipcMain) {
  ipcMain.handle('giveaway-feed', async () => {
    try {
      const response = await httpsRequest(FEED_URL, null, { Accept: 'application/json' });
      if (response.status !== 200) return { ok: false, error: 'giveaways-unavailable' };
      const giveaways = JSON.parse(response.body);
      return Array.isArray(giveaways)
        ? { ok: true, giveaways: giveaways.slice(0, 60) }
        : { ok: false, error: 'giveaways-unavailable' };
    } catch {
      return { ok: false, error: 'giveaways-unavailable' };
    }
  });
}

module.exports = { registerIpcHandlers };
