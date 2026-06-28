// WishlistService.js
// Local-first wishlist with ITAD price-check integration.
// All wishlist data stays in localStorage. Price lookups hit the
// IsThereAnyDeal public API with 24h caching. No user data leaves the device.

import StorageService from './StorageService';
import { getGameGenres } from '../GameGenreDatabase';

const WISHLIST_KEY = 'wishlistItemsV1';
const PRICE_CACHE_KEY = 'wishlistPriceCacheV1';
const ALERTS_KEY = 'wishlistAlertSummaryV1';
const LAST_REFRESH_KEY = 'wishlistLastRefreshV1';
const SETTINGS_KEY = 'wishlistEnabled';
const PRICE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const CHEAPSHARK_API = 'https://www.cheapshark.com/api/1.0';

const storeName = (id) => {
  const stores = {
    '1': 'Steam', '2': 'GamersGate', '3': 'GreenManGaming', '4': 'Amazon',
    '5': 'GameStop', '6': 'Direct2Drive', '7': 'GOG', '8': 'Origin',
    '9': 'Get Games', '10': 'Shiny Loot', '11': 'Humble Store',
    '12': 'Desura', '13': 'Uplay', '14': 'IndieGameStand',
    '15': 'Fanatical', '16': 'Gamesrocket', '17': 'Games Republic',
    '18': 'SilaGames', '19': 'Playfield', '20': 'ImperialGames',
    '21': 'WinGameStore', '22': 'FunStockDigital', '23': 'GameBillet',
    '24': 'Voidu', '25': 'Epic Games Store', '26': 'Razer Game Store',
    '27': 'Gamesplanet', '28': 'Gamesload', '29': '2Game',
    '30': 'IndieGala', '31': 'Blizzard Shop', '32': 'AllYouPlay',
    '33': 'DLGamer', '34': 'Noctre'
  };
  return stores[String(id)] || 'Unknown';
};

const inflight = new Map();

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

const readWishlist = () => {
  try {
    const parsed = parseStoredValue(StorageService.get(WISHLIST_KEY, null), []);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
};

const writeWishlist = (items) => {
  try { StorageService.set(WISHLIST_KEY, Array.isArray(items) ? items : []); }
  catch (err) { console.warn('[Wishlist] write failed:', err); }
};

const readPriceCache = () => {
  try {
    const parsed = parseStoredValue(StorageService.get(PRICE_CACHE_KEY, null), {});
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch { return {}; }
};

const writePriceCache = (cache) => {
  try { StorageService.set(PRICE_CACHE_KEY, cache && typeof cache === 'object' && !Array.isArray(cache) ? cache : {}); }
  catch (err) { console.warn('[Wishlist] price cache write failed:', err); }
};

const readAlertSummary = () => {
  try {
    const parsed = parseStoredValue(StorageService.get(ALERTS_KEY, null), null);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : { drops: [], deals: [], checkedAt: null, count: 0 };
  } catch { return { drops: [], deals: [], checkedAt: null, count: 0 }; }
};

const writeAlertSummary = (summary) => {
  try { StorageService.set(ALERTS_KEY, summary); }
  catch (err) { console.warn('[Wishlist] alert summary write failed:', err); }
};

const buildAlertSummary = (items = readWishlist()) => {
  const safeItems = Array.isArray(items) ? items : [];
  const drops = safeItems.filter((item) => item.currentPrice && item.threshold && item.currentPrice.price <= item.threshold);
  const deals = safeItems.filter((item) => item.currentPrice && item.historicalLow && item.currentPrice.price <= item.historicalLow.price);
  const summary = {
    drops,
    deals,
    checkedAt: Date.now(),
    count: drops.length + deals.filter((deal) => !drops.some((drop) => drop.key === deal.key)).length
  };
  writeAlertSummary(summary);
  return summary;
};

const applyPriceEntryToWishlist = (key, entry) => {
  const items = readWishlist().map((item) =>
    item.key === key ? { ...item, currentPrice: entry.currentPrice, historicalLow: entry.historicalLow, priceCheckedAt: entry.fetchedAt } : item
  );
  writeWishlist(items);
  buildAlertSummary(items);
  return items;
};

const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

class WishlistService {
  static isEnabled() {
    const raw = StorageService.getString(SETTINGS_KEY);
    if (raw === null || raw === undefined || raw === '') return true;
    const parsed = parseStoredValue(raw, true);
    if (typeof parsed === 'boolean') return parsed;
    return String(parsed).toLowerCase() !== 'false';
  }

  static setEnabled(enabled) {
    StorageService.setString(SETTINGS_KEY, String(Boolean(enabled)));
  }

  static getWishlist() {
    return readWishlist();
  }

  static isWishlisted(gameName) {
    const key = slug(gameName);
    const items = readWishlist();
    return Array.isArray(items) && items.some((item) => item.key === key);
  }

  static addGame(game, { threshold = null, notes = '', genres = null } = {}) {
    const key = slug(game.name || game.title || '');
    if (!key) return null;
    const items = readWishlist();
    if (items.some((item) => item.key === key)) return null;
    const name = game.name || game.title || '';
    // Resolve genres so Buy Recommendations can rank this item against the
    // player's taste profile. Prefer explicit genres (e.g. from a matched
    // library game), then any genres on the passed object, then derive them
    // from the title via the local genre database.
    let resolvedGenres = Array.isArray(genres) && genres.length > 0
      ? genres
      : (Array.isArray(game.genres) && game.genres.length > 0 ? game.genres : null);
    if (!resolvedGenres) {
      try {
        resolvedGenres = getGameGenres(name);
      } catch {
        resolvedGenres = [];
      }
    }
    const entry = {
      key,
      name,
      platform: game.platform || '',
      appid: game.appid || '',
      genres: Array.isArray(resolvedGenres) ? resolvedGenres : [],
      addedAt: Date.now(),
      threshold: typeof threshold === 'number' ? threshold : null,
      notes,
      currentPrice: null,
      historicalLow: null,
      priceCheckedAt: null
    };
    items.push(entry);
    writeWishlist(items);
    buildAlertSummary(items);
    return entry;
  }

  static removeGame(gameName) {
    const key = slug(gameName);
    const items = readWishlist().filter((item) => item.key !== key);
    writeWishlist(items);
    buildAlertSummary(items);
  }

  static setThreshold(gameName, threshold) {
    const key = slug(gameName);
    const items = readWishlist().map((item) =>
      item.key === key ? { ...item, threshold: typeof threshold === 'number' ? threshold : null } : item
    );
    writeWishlist(items);
    buildAlertSummary(items);
  }

  static setNotes(gameName, notes) {
    const key = slug(gameName);
    const items = readWishlist().map((item) =>
      item.key === key ? { ...item, notes } : item
    );
    writeWishlist(items);
  }

  static getCachedPrice(gameName) {
    const key = slug(gameName);
    const cache = readPriceCache();
    const entry = cache[key];
    if (entry && Date.now() - entry.fetchedAt < PRICE_CACHE_TTL) {
      return entry;
    }
    return null;
  }

  static getAlertSummary() {
    return readAlertSummary();
  }

  static getLastRefreshAt() {
    const value = parseStoredValue(StorageService.get(LAST_REFRESH_KEY, null), null);
    const timestamp = Number(value || 0);
    return timestamp > 0 ? timestamp : null;
  }

  static async searchGame(query, library = []) {
    if (!query || query.trim().length < 2) return [];
    const q = query.trim();
    const qLower = q.toLowerCase();

    // Search local library for matches
    const libraryMatches = (library || [])
      .filter((g) => (g.name || g.title || '').toLowerCase().includes(qLower))
      .slice(0, 5)
      .map((g) => ({
        id: g.appid || g.name || g.title,
        name: g.name || g.title,
        source: 'library',
        platform: g.platform
      }));

    // Search CheapShark for external matches
    let externalMatches = [];
    try {
      const response = await fetch(`${CHEAPSHARK_API}/games?title=${encodeURIComponent(q)}`);
      if (response.ok) {
        const data = await response.json();
        externalMatches = (Array.isArray(data) ? data : [])
          .slice(0, 5)
          .map((g) => ({
            id: String(g.gameID || g.steamAppID),
            name: g.external || g.title || q,
            source: 'cheapshark',
            thumb: g.thumb || null,
            steamAppID: g.steamAppID || null
          }));
      }
    } catch (err) {
      console.warn('[Wishlist] CheapShark search failed:', err.message);
    }

    // Always offer a custom entry with the typed name
    const customEntry = {
      id: 'custom_' + slug(q),
      name: q,
      source: 'custom'
    };

    // Combine and deduplicate by name (library first, then external, then custom)
    const seen = new Set();
    const results = [];
    for (const item of [...libraryMatches, ...externalMatches, customEntry]) {
      const key = (item.name || '').toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        results.push(item);
      }
    }

    return results;
  }

  static async fetchPrice(gameName, { force = false } = {}) {
    const key = slug(gameName);
    if (!key) return null;

    const cached = this.getCachedPrice(gameName);
    if (cached && !force) {
      applyPriceEntryToWishlist(key, cached);
      return cached;
    }

    if (inflight.has(key)) return inflight.get(key);

    const promise = (async () => {
      try {
        // Use CheapShark to find the game and its best deal
        const searchResponse = await fetch(`${CHEAPSHARK_API}/games?title=${encodeURIComponent(gameName)}`);
        if (!searchResponse.ok) throw new Error(`CheapShark search failed: ${searchResponse.status}`);
        const searchData = await searchResponse.json();
        const match = Array.isArray(searchData) && searchData.length > 0 ? searchData[0] : null;
        if (!match) throw new Error('Game not found on CheapShark');

        const gameId = match.gameID;
        const dealsResponse = await fetch(`${CHEAPSHARK_API}/games?id=${encodeURIComponent(gameId)}`);
        let currentBest = null;
        let historicalLow = null;
        if (dealsResponse.ok) {
          const dealsData = await dealsResponse.json();
          const deals = Array.isArray(dealsData?.deals) ? dealsData.deals : (Array.isArray(dealsData) ? dealsData : []);
          currentBest = deals.length > 0
            ? deals.reduce((best, d) => (parseFloat(d.price) < parseFloat(best.price) ? d : best), deals[0])
            : null;
          if (dealsData?.cheapestPriceEver?.price) {
            historicalLow = { price: parseFloat(dealsData.cheapestPriceEver.price), cut: null, store: null, recorded: dealsData.cheapestPriceEver.date ? dealsData.cheapestPriceEver.date * 1000 : null };
          } else if (currentBest) {
            historicalLow = { price: parseFloat(currentBest.price), cut: parseFloat(currentBest.savings || 0), store: storeName(currentBest.storeID), recorded: null };
          }
        }

        const entry = {
          key,
          currentPrice: currentBest ? { price: parseFloat(currentBest.price), priceFormatted: `$${parseFloat(currentBest.price).toFixed(2)}`, retail: parseFloat(currentBest.retailPrice), cut: parseFloat(currentBest.savings || 0), store: storeName(currentBest.storeID), dealID: currentBest.dealID } : null,
          historicalLow,
          fetchedAt: Date.now()
        };

        const cache = readPriceCache();
        cache[key] = entry;
        writePriceCache(cache);

        applyPriceEntryToWishlist(key, entry);

        return entry;
      } catch (err) {
        console.warn('[Wishlist] price fetch failed for', gameName, ':', err.message);
        const entry = { key, currentPrice: null, historicalLow: null, fetchedAt: Date.now(), error: err.message };
        const cache = readPriceCache();
        cache[key] = entry;
        writePriceCache(cache);
        return entry;
      } finally {
        inflight.delete(key);
      }
    })();

    inflight.set(key, promise);
    return promise;
  }

  static async refreshAllPrices({ force = true } = {}) {
    const items = readWishlist();
    const results = [];
    for (const item of items) {
      const price = await this.fetchPrice(item.name, { force });
      results.push({ ...item, ...price });
    }
    StorageService.set(LAST_REFRESH_KEY, Date.now());
    buildAlertSummary(readWishlist());
    return results;
  }

  static async refreshIfStale(maxAgeMs = PRICE_CACHE_TTL) {
    if (!this.isEnabled()) return null;
    const items = readWishlist();
    if (items.length === 0) {
      buildAlertSummary([]);
      return [];
    }
    const lastRefreshAt = this.getLastRefreshAt();
    if (lastRefreshAt && Date.now() - lastRefreshAt < maxAgeMs) {
      return items;
    }
    return this.refreshAllPrices({ force: false });
  }

  static recalculateAlertSummary() {
    return buildAlertSummary(readWishlist());
  }

  static getPriceDrops() {
    const items = readWishlist();
    return items.filter((item) => {
      if (!item.currentPrice || !item.threshold) return false;
      return item.currentPrice.price <= item.threshold;
    });
  }

  static getDeals() {
    const items = readWishlist();
    return items.filter((item) => {
      if (!item.currentPrice || !item.historicalLow) return false;
      return item.currentPrice.price <= item.historicalLow.price;
    });
  }

  static getWishlistCount() {
    return readWishlist().length;
  }
}

export default WishlistService;
