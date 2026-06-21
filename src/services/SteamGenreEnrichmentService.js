import StorageService from './StorageService';
import { normalizeGenres } from '../constants/GenresMoods';

/**
 * Maps Steam Store API genre descriptions to GamePilot canonical genres.
 */
const STEAM_TO_GAMEPILOT_GENRE_MAP = {
  'action': 'Action',
  'adventure': 'Adventure',
  'casual': 'Casual',
  'rpg': 'RPG',
  'strategy': 'Strategy',
  'simulation': 'Simulation',
  'sports': 'Sports',
  'racing': 'Racing',
  'puzzle': 'Puzzle',
  'indie': 'Indie',
  'massively multiplayer': 'Multiplayer',
  'mmo': 'Multiplayer',
  'free to play': 'Casual',
  'early access': 'Indie',
  'violent': 'Action',
  'gore': 'Action',
  'nudity': 'Story-driven',
  'sexual content': 'Story-driven',
  'education': 'Simulation',
  'software training': 'Simulation',
  'utilities': 'Simulation',
  'design & illustration': 'Creative',
  'photo editing': 'Creative',
  'video production': 'Creative',
  'web publishing': 'Creative',
  'animation & modeling': 'Creative',
  'audio production': 'Creative',
  'accounting': 'Management',
};

/**
 * Maps Steam Store API category descriptions to GamePilot canonical genres.
 * Steam categories (Multiplayer, Co-op, PvP, etc.) are separate from genres.
 */
const STEAM_CATEGORY_TO_GENRE_MAP = {
  'multiplayer': 'Multiplayer',
  'co-op': 'Multiplayer',
  'local co-op': 'Multiplayer',
  'online co-op': 'Multiplayer',
  'split screen': 'Multiplayer',
  'cross-platform multiplayer': 'Multiplayer',
  'pvp': 'Competitive',
  'online pvp': 'Competitive',
  'local pvp': 'Competitive',
  'shared/split screen pvp': 'Competitive',
  'mmo': 'Multiplayer',
  'massively multiplayer': 'Multiplayer',
  'party': 'Party',
  'steam achievements': null,
  'steam cloud': null,
  'full controller support': null,
  'partial controller support': null,
  'steam trading cards': null,
  'steam workshop': null,
  'steam leaderboards': 'Competitive',
  'vr support': null,
  'vr only': null,
  'single-player': null,
};

/**
 * Service that enriches Steam games with accurate genres from the Steam Store API.
 * Results are cached to avoid repeated API calls.
 */
export class SteamGenreEnrichmentService {
  static CACHE_KEY = 'steamGenreCacheV2';
  static CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  static getCache() {
    try {
      const raw = StorageService.getString(this.CACHE_KEY);
      if (!raw) return {};
      const data = JSON.parse(raw);
      const now = Date.now();
      // prune expired
      Object.keys(data).forEach((appId) => {
        if (now - (data[appId].cachedAt || 0) > this.CACHE_DURATION_MS) {
          delete data[appId];
        }
      });
      return data;
    } catch {
      return {};
    }
  }

  static saveCache(data) {
    try {
      StorageService.set(this.CACHE_KEY, data);
    } catch (e) {
      console.error('[SteamGenreEnrichment] Failed to save cache:', e);
    }
  }

  /**
   * Convert Steam API genre descriptions to GamePilot genres.
   */
  static mapSteamGenres(steamGenres = []) {
    const mapped = new Set();
    steamGenres.forEach((entry) => {
      const label = String(entry?.description || entry || '').toLowerCase().trim();
      if (!label) return;
      const canonical = STEAM_TO_GAMEPILOT_GENRE_MAP[label];
      if (canonical) {
        mapped.add(canonical);
      }
    });
    return Array.from(mapped);
  }

  /**
   * Convert Steam API category descriptions to GamePilot genres.
   */
  static mapSteamCategories(steamCategories = []) {
    const mapped = new Set();
    steamCategories.forEach((entry) => {
      const label = String(entry?.description || entry || '').toLowerCase().trim();
      if (!label) return;
      const canonical = STEAM_CATEGORY_TO_GENRE_MAP[label];
      if (canonical) {
        mapped.add(canonical);
      }
    });
    return Array.from(mapped);
  }

  /**
   * Fetch genres + categories for a single Steam app from the Steam Store API.
   */
  static async fetchSteamGenres(appId) {
    if (!appId) return [];
    const cache = this.getCache();
    if (cache[appId]?.genres) {
      return cache[appId].genres;
    }

    try {
      const response = await fetch(
        `https://store.steampowered.com/api/appdetails?appids=${appId}&filters=genres,categories`
      );
      const data = await response.json();
      const appData = data?.[appId];
      if (!appData?.success) return [];

      const steamGenres = appData?.data?.genres || [];
      const steamCategories = appData?.data?.categories || [];
      const mappedGenres = this.mapSteamGenres(steamGenres);
      const mappedCategories = this.mapSteamCategories(steamCategories);
      const combined = [...new Set([...mappedGenres, ...mappedCategories])];
      const normalized = normalizeGenres(combined);

      cache[appId] = {
        genres: normalized,
        cachedAt: Date.now(),
      };
      this.saveCache(cache);
      return normalized;
    } catch (e) {
      console.warn(`[SteamGenreEnrichment] Failed to fetch genres for ${appId}:`, e.message);
      return [];
    }
  }

  /**
   * Batch-enrich a library array. Only touches games with a valid Steam appid.
   * Won't overwrite non-Story-driven genres unless steamResult is non-empty.
   */
  static async enrichLibrary(library) {
    if (!Array.isArray(library)) return library;

    const enriched = [];
    const steamGames = library.filter(
      (g) => g?.appid && String(g.appid).length > 2 && g.platform === 'Steam'
    );

    // Fetch in small batches to avoid hammering the API
    const batchSize = 5;
    for (let i = 0; i < steamGames.length; i += batchSize) {
      const batch = steamGames.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (game) => {
          const steamGenres = await this.fetchSteamGenres(game.appid);
          if (steamGenres.length > 0) {
            game._steamGenres = steamGenres;
          }
        })
      );
    }

    for (const game of library) {
      const steamGenres = game._steamGenres;
      delete game._steamGenres;

      if (!steamGenres || steamGenres.length === 0) {
        enriched.push(game);
        continue;
      }

      const currentGenres = Array.isArray(game.genres) ? game.genres : [];
      const isGenericFallback =
        currentGenres.length === 1 && currentGenres[0] === 'Story-driven';

      if (isGenericFallback || currentGenres.length === 0) {
        enriched.push({
          ...game,
          genres: steamGenres,
        });
      } else {
        // Merge without duplicates, preferring existing order then appending new
        const merged = [...new Set([...currentGenres, ...steamGenres])];
        enriched.push({
          ...game,
          genres: merged,
        });
      }
    }

    return enriched;
  }

  /**
   * Run enrichment quietly in the background and return updated library.
   */
  static async runBackgroundEnrichment(library) {
    try {
      return await this.enrichLibrary(library);
    } catch (e) {
      console.error('[SteamGenreEnrichment] Background enrichment failed:', e);
      return library;
    }
  }
}
