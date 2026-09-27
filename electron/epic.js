const { httpsRequest } = require('./net');

const FEED_URL =
  'https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=en-US&country=US&allowCountries=US';

function registerIpcHandlers(ipcMain) {
  ipcMain.handle('epic-free-games', async () => {
    try {
      const response = await httpsRequest(FEED_URL, null, { Accept: 'application/json' });
      if (response.status !== 200) return { ok: false, error: 'epic-unavailable' };
      const elements = JSON.parse(response.body)?.data?.Catalog?.searchStore?.elements;
      return Array.isArray(elements)
        ? { ok: true, elements: elements.slice(0, 100) }
        : { ok: false, error: 'epic-unavailable' };
    } catch {
      return { ok: false, error: 'epic-unavailable' };
    }
  });
}

module.exports = { registerIpcHandlers };
