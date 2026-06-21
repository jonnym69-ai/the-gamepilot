import StorageService from './StorageService';

const CACHE_KEY = 'patch_notes_cache';
const DISMISSED_KEY = 'patch_notes_dismissed';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const getCache = () => {
  try {
    return StorageService.get(CACHE_KEY, {});
  } catch {
    return {};
  }
};

const setCache = (data) => {
  try {
    StorageService.set(CACHE_KEY, data);
  } catch {}
};

const getDismissedMap = () => {
  try {
    return StorageService.get(DISMISSED_KEY, {});
  } catch {
    return {};
  }
};

const setDismissedMap = (data) => {
  try {
    StorageService.set(DISMISSED_KEY, data);
  } catch {}
};

const getSteamAppId = (game) => {
  return game.appid || game.steamAppId || game.steam_appid || null;
};

export const PatchNotesService = {
  async fetchSteamNews(appId) {
    if (!appId) return null;

    const cache = getCache();
    const cached = cache[appId];
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      return cached.data;
    }

    try {
      const res = await fetch(
        `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${appId}&count=5&maxlength=300`
      );
      if (!res.ok) return null;
      const json = await res.json();
      const items = json?.appnews?.newsitems || [];

      const notes = items
        .filter(item => item.feed_type === 1) // patch notes feed type
        .map(item => ({
          title: item.title,
          url: item.url,
          date: new Date(item.date * 1000).toISOString(),
          author: item.author || 'Valve',
          contents: item.contents?.substring(0, 500) || ''
        }));

      cache[appId] = { data: notes, cachedAt: Date.now() };
      setCache(cache);
      return notes;
    } catch (e) {
      console.warn('Steam news fetch failed:', e);
      return null;
    }
  },

  async getPatchNotesForGame(game) {
    const appId = getSteamAppId(game);
    if (!appId) return { available: false, notes: [] };

    const notes = await this.fetchSteamNews(appId);
    if (!notes || notes.length === 0) return { available: false, notes: [] };

    const dismissed = getDismissedMap();
    const gameDismissed = dismissed[appId] || {};

    const unseen = notes.filter(n => !gameDismissed[n.url]);

    return {
      available: true,
      appId,
      totalNotes: notes.length,
      unseenCount: unseen.length,
      notes: unseen.slice(0, 3)
    };
  },

  dismissNote(appId, url) {
    const dismissed = getDismissedMap();
    if (!dismissed[appId]) dismissed[appId] = {};
    dismissed[appId][url] = true;
    setDismissedMap(dismissed);
  },

  async checkLibrary(library) {
    const results = [];
    const gamesToCheck = library.filter(g => getSteamAppId(g)).slice(0, 10);

    for (const game of gamesToCheck) {
      const notes = await this.getPatchNotesForGame(game);
      if (notes.available && notes.unseenCount > 0) {
        results.push({
          gameName: game.name || game.appname,
          appId: notes.appId,
          ...notes
        });
      }
    }

    return results;
  }
};

export default PatchNotesService;
