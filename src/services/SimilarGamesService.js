/**
 * SimilarGamesService — discovers games similar to what the user has been
 * playing, merging Steam catalog discoveries with existing wishlist items
 * into one ranked list.
 *
 * Three modes:
 *  - 'recent'   — anchored on the single most-recently-played game
 *  - 'fortnight'— aggregated taste from the last 14 days of sessions
 *  - 'custom'   — user picks a reference game from their library
 *
 * Discovery flow:
 *  1. Resolve the reference game(s) for the chosen mode.
 *  2. For each reference with a Steam appid, call the `steam-morelike` IPC
 *     handler to get Steam's "More Like This" recommendations.
 *  3. For references without an appid, search Steam by name to find the
 *     appid, then fetch morelike.
 *  4. Score discovered games against the reference taste profile (genres,
 *     mood, themes).
 *  5. Merge in existing wishlist items that share genres/mood with the
 *     reference.
 *  6. Deduplicate, rank, and return.
 *
 * All network calls go through the Electron main process via `electronAPI`.
 * The service degrades gracefully: if Steam is unreachable, it falls back
 * to wishlist-only ranking.
 */

import { mapGameGenresToValid, getResolvedMood } from '../constants/GenresMoods';
import { PlaytimeAutoLogger } from './PlaytimeAutoLogger';
import WishlistService from './WishlistService';
import StorageService from './StorageService';

const SIMILAR_CACHE_KEY = 'similarGamesCacheV1';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const normalizeKey = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const isElectronAvailable = () =>
  typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.steamMoreLike === 'function';

const readCache = () => {
  try {
    const raw = StorageService.get(SIMILAR_CACHE_KEY, null);
    if (!raw) return null;
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeCache = (data) => {
  try {
    StorageService.set(SIMILAR_CACHE_KEY, data);
  } catch {
    // storage is optional
  }
};

/**
 * Resolve the Steam appid for a game that doesn't have one.
 * Uses CheapShark's search API (same as WishlistService.searchGame) to find
 * the steamAppID, which is then used for the morelike call.
 */
const resolveSteamAppId = async (gameName) => {
  if (!gameName) return null;
  try {
    const response = await fetch(`https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(gameName)}`);
    if (!response.ok) return null;
    const data = await response.json();
    const match = (Array.isArray(data) ? data : []).find((g) => g.steamAppID);
    return match?.steamAppID ? String(match.steamAppID) : null;
  } catch {
    return null;
  }
};

/**
 * Fetch morelike results for a single appid via the Electron IPC bridge.
 * Returns [] if the IPC handler is unavailable or the call fails.
 */
const fetchMoreLike = async (appid) => {
  if (!appid || !isElectronAvailable()) return [];
  try {
    const result = await window.electronAPI.steamMoreLike(appid);
    if (result && result.ok && Array.isArray(result.items)) {
      return result.items;
    }
    return [];
  } catch {
    return [];
  }
};

// ---------------------------------------------------------------------------
// Reference-game resolution per mode
// ---------------------------------------------------------------------------

/**
 * Get the most-recently-played game from the library.
 */
const getRecentReferenceGame = (library) => {
  if (!Array.isArray(library) || library.length === 0) return null;
  return (
    library
      .filter((g) => g && g.last_played && g.time_played > 0)
      .sort((a, b) => new Date(b.last_played) - new Date(a.last_played))
      .slice(0, 1)[0] || null
  );
};

/**
 * Get the top 3 focus games from the last 14 days of session history.
 * Falls back to the recent reference if no session history is available.
 */
const getFortnightReferenceGames = (library) => {
  const byGame = new Map();
  const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;

  try {
    const history = PlaytimeAutoLogger.getSessionHistory() || [];
    history.forEach((session) => {
      const tsRaw = session?.endTime || session?.timestamp || session?.startTime;
      const ts = tsRaw ? new Date(tsRaw).getTime() : 0;
      if (!ts || ts < cutoff) return;
      const name = String(session.gameName || session.name || '').trim();
      if (!name) return;
      const key = normalizeKey(session.gameId || name);
      const minutes = Math.max(0, Number(session.playtimeMinutes) || 0);
      const entry = byGame.get(key) || { key, name, minutes: 0, sessions: 0, lastPlayed: 0 };
      entry.minutes += minutes;
      entry.sessions += 1;
      entry.lastPlayed = Math.max(entry.lastPlayed, ts);
      byGame.set(key, entry);
    });
  } catch {
    // session history optional
  }

  const sorted = Array.from(byGame.values()).sort((a, b) => {
    if (b.minutes !== a.minutes) return b.minutes - a.minutes;
    return b.lastPlayed - a.lastPlayed;
  });

  if (sorted.length > 0) {
    // Match back to library games for genre/mood data
    return sorted
      .slice(0, 3)
      .map((entry) => {
        const libGame = (library || []).find(
          (g) => normalizeKey(g.name) === entry.key || normalizeKey(g.appid) === entry.key
        );
        return libGame || { name: entry.name, genres: [], appid: '' };
      })
      .filter(Boolean);
  }

  // Fallback: use the most-recently-played library game
  const recent = getRecentReferenceGame(library);
  return recent ? [recent] : [];
};

// ---------------------------------------------------------------------------
// Taste-profile building
// ---------------------------------------------------------------------------

const buildTasteProfile = (referenceGames) => {
  const genres = new Set();
  const moods = new Set();
  const names = new Set();

  (referenceGames || []).forEach((game) => {
    if (!game) return;
    names.add(game.name);
    mapGameGenresToValid(game?.genres).forEach((g) => genres.add(g));
    const mood = getResolvedMood(game);
    if (mood) moods.add(mood);
  });

  return { genres, moods, names };
};

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/**
 * Score a discovered Steam game against the reference taste profile.
 * Returns { score, reasons }.
 */
const scoreDiscoveredGame = (item, taste, ownedNames) => {
  let score = 0;
  const reasons = [];

  // Skip games the user already owns
  if (ownedNames.has(normalizeKey(item.name))) {
    return { score: -1, reasons: ['Already in your library'], skip: true };
  }

  const itemGenres = mapGameGenresToValid(item.genres);
  const sharedGenres = itemGenres.filter((g) => taste.genres.has(g));
  if (sharedGenres.length > 0) {
    score += sharedGenres.length * 20;
    reasons.push(`Shares ${sharedGenres.length > 1 ? 'genres' : 'genre'} with your recent play`);
  }

  // Free games get a small boost
  if (item.isFree) {
    score += 8;
    reasons.push('Free to play');
  }

  // Has a price (not free, not null) — slight signal it's a real commercial game
  if (item.price && !item.isFree) {
    score += 2;
  }

  // Small randomness to break ties
  score += Math.random() * 4;

  return { score, reasons, skip: false };
};

/**
 * Score an existing wishlist item against the reference taste profile.
 */
const scoreWishlistItem = (item, taste) => {
  let score = 0;
  const reasons = [];

  const itemGenres = mapGameGenresToValid(item.genres);
  const sharedGenres = itemGenres.filter((g) => taste.genres.has(g));
  if (sharedGenres.length > 0) {
    score += sharedGenres.length * 18;
    reasons.push(`On your wishlist — shares ${sharedGenres.length > 1 ? 'genres' : 'genre'} with your recent play`);
  }

  // Price drop signal
  if (item.currentPrice && item.threshold && item.currentPrice.price <= item.threshold) {
    score += 15;
    reasons.push('Price drop active!');
  }

  // Historical low
  if (item.historicalLow && item.currentPrice && item.currentPrice.price <= item.historicalLow.price) {
    score += 10;
    reasons.push('At historical low price');
  }

  // Small randomness
  score += Math.random() * 3;

  return { score, reasons };
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const SIMILAR_GAMES_SERVICE = {
  /**
   * Get similar-game recommendations.
   *
   * @param {Object} params
   * @param {string} params.mode - 'recent' | 'fortnight' | 'custom'
   * @param {Array}  params.library - user's owned game library
   * @param {Object} [params.referenceGame] - required for 'custom' mode
   * @param {number} [params.count] - max results (default 6)
   * @param {boolean} [params.useCache] - allow cache hit (default true)
   * @returns {Promise<Object>} recommendation payload
   */
  async getSimilarRecommendations({
    mode = 'recent',
    library = [],
    referenceGame = null,
    count = 6,
    useCache = true,
  } = {}) {
    // Resolve reference games based on mode
    let refs = [];
    let referenceName = null;

    if (mode === 'custom') {
      if (!referenceGame) {
        return this._emptyResult('Pick a game to find similar recommendations.');
      }
      refs = [referenceGame];
      referenceName = referenceGame.name;
    } else if (mode === 'fortnight') {
      refs = getFortnightReferenceGames(library);
      referenceName = refs.length > 0 ? refs.map((r) => r.name).join(', ') : null;
    } else {
      // 'recent'
      const recent = getRecentReferenceGame(library);
      if (!recent) {
        return this._emptyResult('Play a game first, then check back for similar recommendations.');
      }
      refs = [recent];
      referenceName = recent.name;
    }

    if (refs.length === 0) {
      return this._emptyResult('No reference games found for the selected mode.');
    }

    // Check cache
    const cacheKey = this._cacheKey(mode, refs);
    if (useCache) {
      const cached = this._readCache(cacheKey);
      if (cached) return { ...cached, cached: true };
    }

    const taste = buildTasteProfile(refs);
    if (taste.genres.size === 0 && taste.moods.size === 0) {
      return this._emptyResult('Not enough taste signal from your recent play to find similar games.');
    }

    const ownedNames = new Set((library || []).map((g) => normalizeKey(g.name || g.title || '')));

    // --- Discover from Steam ---
    const discovered = [];
    for (const ref of refs) {
      let appid = ref.appid || ref.steamAppID || null;
      if (!appid || !/^\d+$/.test(String(appid))) {
        appid = await resolveSteamAppId(ref.name);
      }
      if (appid) {
        const items = await fetchMoreLike(appid);
        for (const item of items) {
          const scored = scoreDiscoveredGame(item, taste, ownedNames);
          if (!scored.skip && scored.score > 0) {
            discovered.push({
              ...item,
              source: 'steam',
              score: scored.score,
              reasons: scored.reasons,
              steamUrl: `https://store.steampowered.com/app/${item.appid}`,
            });
          }
        }
      }
    }

    // --- Merge in wishlist items ---
    const wishlistItems = WishlistService.getWishlist();
    const wishlistMatches = [];
    for (const item of wishlistItems) {
      // Skip if already owned
      if (ownedNames.has(normalizeKey(item.name))) continue;
      // Skip if already discovered from Steam (dedupe by appid/name)
      const alreadyDiscovered = discovered.some(
        (d) => normalizeKey(d.name) === normalizeKey(item.name) || (item.steamAppID && d.appid === item.steamAppID)
      );
      if (alreadyDiscovered) continue;

      const scored = scoreWishlistItem(item, taste);
      if (scored.score > 0) {
        const steamAppId = item.steamAppID || (item.appid && /^\d+$/.test(String(item.appid)) ? item.appid : null);
        wishlistMatches.push({
          appid: steamAppId || '',
          name: item.name,
          genres: item.genres || [],
          image: steamAppId
            ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${steamAppId}/header.jpg`
            : item.thumb || null,
          isFree: false,
          price: item.currentPrice?.priceFormatted || null,
          source: 'wishlist',
          score: scored.score,
          reasons: scored.reasons,
          steamUrl: steamAppId
            ? `https://store.steampowered.com/app/${steamAppId}`
            : `https://store.steampowered.com/search/?term=${encodeURIComponent(item.name)}`,
          wishlistItem: item,
        });
      }
    }

    // --- Merge, dedupe, rank ---
    const all = [...discovered, ...wishlistMatches];
    const seen = new Set();
    const deduped = all.filter((item) => {
      const key = normalizeKey(item.name);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const ranked = deduped.sort((a, b) => b.score - a.score).slice(0, count);

    // Clamp scores to 0-100 for display
    const maxScore = ranked.length > 0 ? Math.max(...ranked.map((r) => r.score)) : 100;
    const normalized = ranked.map((item) => ({
      ...item,
      displayScore: Math.min(100, Math.round((item.score / maxScore) * 100)),
    }));

    const result = {
      ok: true,
      mode,
      referenceName,
      entries: normalized,
      discoveredCount: discovered.length,
      wishlistCount: wishlistMatches.length,
      totalCandidates: deduped.length,
      message:
        normalized.length > 0
          ? normalized[0].reasons[0]
          : 'No similar games found right now. Try again later or pick a different reference.',
      cached: false,
    };

    this._writeCache(cacheKey, result);
    return result;
  },

  /**
   * Get the reference games for a given mode without doing discovery.
   * Useful for UI to show what the reference will be before fetching.
   */
  getReferenceGames(mode, library, referenceGame = null) {
    if (mode === 'custom') return referenceGame ? [referenceGame] : [];
    if (mode === 'fortnight') return getFortnightReferenceGames(library);
    const recent = getRecentReferenceGame(library);
    return recent ? [recent] : [];
  },

  /**
   * Clear the similar-games cache.
   */
  clearCache() {
    try {
      StorageService.remove(SIMILAR_CACHE_KEY);
    } catch {
      // storage optional
    }
  },

  // --- internal helpers ---

  _emptyResult(message) {
    return {
      ok: false,
      mode: null,
      referenceName: null,
      entries: [],
      discoveredCount: 0,
      wishlistCount: 0,
      totalCandidates: 0,
      message,
      cached: false,
    };
  },

  _cacheKey(mode, refs) {
    const refKey = refs.map((r) => normalizeKey(r.appid || r.name)).join('+');
    return `${mode}:${refKey}`;
  },

  _readCache(key) {
    const cache = readCache();
    if (!cache || !cache[key]) return null;
    const entry = cache[key];
    if (Date.now() - entry.at > CACHE_TTL) return null;
    return entry.value;
  },

  _writeCache(key, value) {
    const cache = readCache() || {};
    cache[key] = { at: Date.now(), value };
    writeCache(cache);
  },
};

export default SIMILAR_GAMES_SERVICE;
