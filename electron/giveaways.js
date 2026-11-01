const { httpsRequest } = require('./net');

const FEED_URL = 'https://www.gamerpower.com/api/filter?platform=pc&type=game&sort-by=value';
const STEAM_FEATURED_URL = 'https://store.steampowered.com/api/featuredcategories/';
const GOG_FREEBIES_URL = 'https://www.gog.com/games/ajax/filtered?priceRange=0,0&discounted=true&page=1';

const fetchJson = async (url) => {
  try {
    const response = await httpsRequest(url, null, { Accept: 'application/json' });
    if (response.status !== 200) return null;
    return JSON.parse(response.body);
  } catch {
    return null;
  }
};

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

  // Steam's featured categories and GOG's free filter send no CORS headers,
  // so they are fetched here rather than from the renderer. Each source is
  // returned independently so one outage doesn't blank the other.
  ipcMain.handle('store-free-games', async () => {
    const [steam, gog] = await Promise.all([fetchJson(STEAM_FEATURED_URL), fetchJson(GOG_FREEBIES_URL)]);
    const steamData = steam
      ? {
          freegames: (steam?.freegames?.items || steam?.free_games?.items || []).slice(0, 100),
          specials: (steam?.specials?.items || []).slice(0, 100),
        }
      : null;
    const gogProducts = Array.isArray(gog?.products) ? gog.products.slice(0, 60) : null;
    if (!steamData && !gogProducts) return { ok: false, error: 'store-free-games-unavailable' };
    return { ok: true, steam: steamData, gog: gogProducts };
  });
}

module.exports = { registerIpcHandlers };
