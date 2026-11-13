import StorageService from './StorageService';

// SteamGridDB artwork browser. The user's own SGDB key lives in local storage
// (same trust model as the RetroAchievements key) and travels per-request to
// the main-process bridge — never bundled, never server-side.
const KEY = 'steamGridDbApiKey';

class SteamGridDbService {
  static getApiKey() {
    return StorageService.getString(KEY) || '';
  }

  static setApiKey(key) {
    StorageService.setString(KEY, String(key || '').trim());
  }

  static isConfigured() {
    return Boolean(this.getApiKey()) && Boolean(window.electronAPI?.sgdbSearch);
  }

  static async searchGames(name) {
    const res = await window.electronAPI.sgdbSearch({ name, apiKey: this.getApiKey() });
    return res?.ok ? res.games : [];
  }

  static async getArt(gameId, kind = 'grids') {
    const res = await window.electronAPI.sgdbArt({ gameId, kind, apiKey: this.getApiKey() });
    if (res?.error === 'invalid-key') throw new Error('invalid-key');
    return res?.ok ? res.items : [];
  }
}

export default SteamGridDbService;
