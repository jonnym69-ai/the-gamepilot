import StorageService from './StorageService';
import SteamFriendsService from './SteamFriendsService';

// Desktop notification preferences + trigger glue.
// Friends alerts run in the main process (friends watch); wishlist deal
// alerts fire here after each CheapShark price check diffs new alerts.
const PREFS_KEY = 'notificationPrefsV1';
const DEALS_SEEN_KEY = 'notifiedDealKeysV1';
const MAX_DEAL_TOASTS = 3;

const readPrefs = () => {
  const stored = StorageService.get(PREFS_KEY, {});
  return {
    friends: stored?.friends === true,
    deals: stored?.deals === true,
  };
};

const readSeenDeals = () => {
  const stored = StorageService.get(DEALS_SEEN_KEY, []);
  return new Set(Array.isArray(stored) ? stored : []);
};

class NotificationService {
  static getPrefs() {
    return readPrefs();
  }

  static setPref(kind, enabled) {
    const prefs = readPrefs();
    prefs[kind] = Boolean(enabled);
    StorageService.set(PREFS_KEY, prefs);
  }

  static isEnabled(kind) {
    return readPrefs()[kind] === true && Boolean(window.electronAPI?.notify);
  }

  static async notify({ title, body }) {
    try {
      return await window.electronAPI?.notify?.({ title, body });
    } catch {
      return null;
    }
  }

  // Register the main-process friends watcher with the current Steam64 ID
  // and owned game names. Call on Today mount and whenever prefs change —
  // the watcher only polls while enabled.
  static async syncFriendsWatch(library = []) {
    const api = window.electronAPI?.configureFriendsWatch;
    if (!api) return;
    const enabled = this.isEnabled('friends') && SteamFriendsService.isEnabled();
    const steamId = SteamFriendsService.getSteamId();
    try {
      await api({
        enabled,
        steamId: enabled ? steamId : '',
        ownedNames: enabled ? library.map((g) => g?.name).filter(Boolean) : [],
      });
    } catch {
      /* watch unavailable — fine */
    }
  }

  // Called after every wishlist price refresh: toast once per alert key.
  // The seen set persists so relaunches don't re-toast old deals.
  static onPriceAlertSummary(summary) {
    if (!this.isEnabled('deals') || !summary) return;
    const seen = readSeenDeals();
    const fresh = [...(summary.drops || []), ...(summary.deals || [])].filter(
      (item) => item?.key && !seen.has(item.key)
    );
    if (fresh.length === 0) return;
    fresh.slice(0, MAX_DEAL_TOASTS).forEach((item) => {
      const price = item.currentPrice?.price != null ? `$${item.currentPrice.price.toFixed(2)}` : 'on sale';
      this.notify({
        title: 'Wishlist deal',
        body: `${item.title || item.name || 'A wishlist game'} is ${price}`,
      });
    });
    fresh.forEach((item) => seen.add(item.key));
    // Bound the seen set — oldest keys matter least.
    StorageService.set(DEALS_SEEN_KEY, [...seen].slice(-500));
  }
}

export default NotificationService;
