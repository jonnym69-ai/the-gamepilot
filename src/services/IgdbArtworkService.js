import StorageService from './StorageService';
import { hasMissingCoverArt } from './GameArtworkService';

const ENABLED_KEY = 'igdbArtworkEnabled';
const CACHE_KEY = 'igdbArtworkCacheV1';
const HIT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // matched covers: 30 days
const MISS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // no-match retries: 7 days
const REQUEST_GAP_MS = 400; // stay well under IGDB's 4 req/s limit
const CACHE_LIMIT = 1000;

const normalizeKey = (name) =>
  String(name || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const readCache = () => {
  try {
    const raw = StorageService.get(CACHE_KEY, null);
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const writeCache = (cache) => {
  const entries = Object.entries(cache);
  if (entries.length > CACHE_LIMIT) {
    entries
      .sort((a, b) => Number(a[1]?.at || 0) - Number(b[1]?.at || 0))
      .slice(0, entries.length - CACHE_LIMIT)
      .forEach(([key]) => delete cache[key]);
  }
  StorageService.set(CACHE_KEY, cache);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class IgdbArtworkService {
  static isEnabled() {
    return StorageService.getString(ENABLED_KEY) === 'true';
  }

  static setEnabled(enabled) {
    StorageService.setString(ENABLED_KEY, String(Boolean(enabled)));
  }

  static getCachedCover(name) {
    const key = normalizeKey(name);
    const entry = readCache()[key];
    if (!entry) return undefined; // never looked up
    const ttl = entry.url ? HIT_TTL_MS : MISS_TTL_MS;
    if (Date.now() - Number(entry.at || 0) > ttl) return undefined;
    return entry.url || null; // null = looked up, no cover found
  }

  static async lookup(name) {
    const api = window.electronAPI?.igdbLookup;
    if (!api) return { found: false, game: null };

    const key = normalizeKey(name);
    if (!key) return { found: false, game: null };

    const cached = readCache()[key];
    if (cached) {
      const ttl = cached.url ? HIT_TTL_MS : MISS_TTL_MS;
      if (Date.now() - Number(cached.at || 0) <= ttl) {
        return { found: Boolean(cached.url), game: cached.game || null, cached: true };
      }
    }

    try {
      const result = await api(name);
      const cache = readCache();
      if (result?.ok && result.game?.cover?.card) {
        cache[key] = { url: result.game.cover.card, game: result.game, at: Date.now() };
        writeCache(cache);
        return { found: true, game: result.game };
      }
      // Verified miss (or broken response) — record so we don't re-query daily
      cache[key] = { url: null, game: null, at: Date.now() };
      writeCache(cache);
      return { found: false, game: null };
    } catch {
      return { found: false, game: null };
    }
  }

  /**
   * Fills coverImage on library games that resolve to no artwork at all
   * (non-Steam launches: Epic, GOG, itch, manual adds). Returns a new array
   * when anything changed, or null when nothing needed updating.
   */
  static async enrichLibraryCovers(library, { onProgress } = {}) {
    if (!this.isEnabled() || !Array.isArray(library)) return null;

    let changed = false;
    const updated = library.slice();
    const indexByGame = new Map(updated.map((game, i) => [game, i]));

    const applyCover = (game, coverUrl, igdbGame) => {
      const i = indexByGame.get(game);
      if (i === undefined || updated[i].coverImage) return;
      updated[i] = {
        ...updated[i],
        coverImage: coverUrl,
        igdbId: igdbGame?.id,
        igdbName: igdbGame?.name,
      };
      changed = true;
    };

    const missing = library.filter(
      (game) => !game?.coverArtOverride && hasMissingCoverArt(game) // user's custom cover always wins
    );

    for (const game of missing) {
      const name = game?.name || game?.title;
      const cachedCover = this.getCachedCover(name);
      if (cachedCover === null) continue; // verified miss — don't re-query
      if (typeof cachedCover === 'string') {
        applyCover(game, cachedCover, null);
        continue;
      }
      const result = await this.lookup(name);
      if (result.found && result.game?.cover?.card) {
        applyCover(game, result.game.cover.card, result.game);
      }
      onProgress?.(name, result.found);
      await sleep(REQUEST_GAP_MS);
    }

    return changed ? updated : null;
  }
}

export default IgdbArtworkService;
