import StorageService from './StorageService';
import WishlistService from './WishlistService';

const SETTINGS_KEY = 'steamWishlistEnabled';
const STEAM_ID_KEY = 'steamWishlistId';
const LAST_SYNC_KEY = 'steamWishlistLastSync';
const SYNC_RESULT_KEY = 'steamWishlistLastResult';

const parseStoredValue = (value, fallback) => {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'string' ? parseStoredValue(parsed, fallback) : parsed;
  } catch {
    return fallback;
  }
};

const normalizeSteamId = (id) => {
  if (!id) return '';
  return String(id).trim();
};

const readLastSync = () => {
  const value = parseStoredValue(StorageService.get(LAST_SYNC_KEY, null), null);
  const timestamp = Number(value || 0);
  return timestamp > 0 ? timestamp : null;
};

const readLastResult = () => {
  try {
    const parsed = parseStoredValue(StorageService.get(SYNC_RESULT_KEY, null), null);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : { success: false, count: 0, error: null };
  } catch {
    return { success: false, count: 0, error: null };
  }
};

class SteamWishlistService {
  static isEnabled() {
    const raw = StorageService.getString(SETTINGS_KEY);
    if (raw === null || raw === undefined || raw === '') return false;
    return raw === 'true' || raw === true;
  }

  static setEnabled(enabled) {
    StorageService.setString(SETTINGS_KEY, String(Boolean(enabled)));
  }

  static getSteamId() {
    const raw = StorageService.getString(STEAM_ID_KEY);
    return raw ? normalizeSteamId(raw) : '';
  }

  static setSteamId(id) {
    StorageService.setString(STEAM_ID_KEY, normalizeSteamId(id || ''));
  }

  static getLastSyncAt() {
    return readLastSync();
  }

  static getLastResult() {
    return readLastResult();
  }

  static async fetchWishlist(steamId) {
    const id = normalizeSteamId(steamId || this.getSteamId());
    if (!id) {
      return { success: false, error: 'Steam ID is required.', items: [] };
    }

    const api = window.electronAPI?.steamWishlist;
    if (!api) {
      return { success: false, error: 'Steam wishlist API is not available in this build.', items: [] };
    }

    try {
      const result = await api(id);
      return result || { success: false, error: 'No response from Steam wishlist API.', items: [] };
    } catch (err) {
      return { success: false, error: err?.message || 'Steam wishlist fetch failed.', items: [] };
    }
  }

  static async sync({ force = false } = {}) {
    if (!this.isEnabled()) {
      return { success: false, error: 'Steam wishlist sync is disabled.', count: 0 };
    }

    const steamId = this.getSteamId();
    if (!steamId) {
      return { success: false, error: 'Steam ID is missing.', count: 0 };
    }

    const result = await this.fetchWishlist(steamId);
    if (!result.success || !Array.isArray(result.items)) {
      const summary = { success: false, count: 0, error: result.error || 'Sync failed.', fetchedAt: Date.now() };
      StorageService.set(SYNC_RESULT_KEY, summary);
      return summary;
    }

    let addedCount = 0;
    const wishlist = WishlistService.getWishlist();
    const existingNames = new Set(wishlist.map((item) => (item.name || '').toLowerCase()));

    for (const item of result.items) {
      const name = item.name;
      if (!name) continue;
      const key = (name || '').toLowerCase();
      if (existingNames.has(key)) continue;

      WishlistService.addGame(
        {
          name,
          platform: 'Steam',
          appid: item.appid || null,
          genres: Array.isArray(item.genres) ? item.genres : [],
          image: item.image || null
        },
        { threshold: null, notes: 'Imported from Steam wishlist' }
      );
      existingNames.add(key);
      addedCount += 1;
    }

    const summary = {
      success: true,
      count: addedCount,
      totalFetched: result.items.length,
      error: null,
      fetchedAt: Date.now()
    };
    StorageService.set(LAST_SYNC_KEY, Date.now());
    StorageService.set(SYNC_RESULT_KEY, summary);
    return summary;
  }

  static async refreshIfStale(maxAgeMs = 24 * 60 * 60 * 1000) {
    if (!this.isEnabled()) return null;
    const lastSync = this.getLastSyncAt();
    if (lastSync && Date.now() - lastSync < maxAgeMs) {
      return this.getLastResult();
    }
    return this.sync({ force: false });
  }

  static disconnect() {
    this.setEnabled(false);
    this.setSteamId('');
    StorageService.set(LAST_SYNC_KEY, null);
    StorageService.set(SYNC_RESULT_KEY, null);
  }
}

export default SteamWishlistService;
