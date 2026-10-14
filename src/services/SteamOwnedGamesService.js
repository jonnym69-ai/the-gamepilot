import StorageService from './StorageService';
import SteamWishlistService from './SteamWishlistService';
import { getSteamAppId } from './SteamStoreService';

const ENABLED_KEY = 'steamOwnedGamesEnabled';
const CACHE_KEY = 'steamOwnedCacheV1';
const CACHE_TTL_MS = 6 * 60 * 60000;

const readCache = () => {
  try {
    const raw = StorageService.get(CACHE_KEY, null);
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.games)) return null;
    return parsed;
  } catch {
    return null;
  }
};

const normalizeGame = (game) => ({
  appid: Number(game?.appid) || 0,
  name: String(game?.name || 'Unknown game'),
  platform: 'Steam',
  installed: false,
  playtimeForever: Number(game?.playtimeForever) || 0,
  lastPlayed: Number(game?.lastPlayed) || 0,
  icon: typeof game?.icon === 'string' && game.icon.startsWith('https://') ? game.icon : null,
});

/**
 * Owned-but-not-installed Steam games, via the GamePilot Netlify relay
 * (GetOwnedGames server-side — the API key never ships in the bundle).
 * Opt-in like Steam friends/profile and reuses the same Steam64 ID.
 * Free games only appear here if Steam has recorded playtime for them —
 * that is what GetOwnedGames returns, not a GamePilot filter.
 */
class SteamOwnedGamesService {
  static isEnabled() {
    return StorageService.getString(ENABLED_KEY) === 'true';
  }

  static setEnabled(enabled) {
    StorageService.setString(ENABLED_KEY, String(Boolean(enabled)));
  }

  static getSteamId() {
    return SteamWishlistService.getSteamId();
  }

  static getCached() {
    const cached = readCache();
    if (!cached) return null;
    return {
      games: cached.games.map(normalizeGame),
      fetchedAt: cached.fetchedAt,
      privateDetails: cached.privateDetails === true,
    };
  }

  static async fetchOwned({ force = false } = {}) {
    const steamId = this.getSteamId();
    if (!steamId) {
      return { success: false, error: 'Steam ID is not configured.', games: [], code: 'missing-steamid' };
    }

    const api = window.electronAPI?.steamOwnedLibrary;
    if (!api) {
      return { success: false, error: 'Owned games is not available in this build.', games: [], code: 'no-bridge' };
    }

    const cached = readCache();
    if (!force && cached && Date.now() - Number(cached.fetchedAt || 0) < CACHE_TTL_MS) {
      return {
        success: true,
        games: cached.games.map(normalizeGame),
        fetchedAt: cached.fetchedAt,
        privateDetails: cached.privateDetails === true,
        cached: true,
      };
    }

    try {
      const result = await api(steamId);
      if (!result?.ok) {
        const error =
          result?.error === 'game-details-private'
            ? 'Your Steam game details are private. Set "Game details" to public in Steam privacy settings to use this.'
            : result?.error === 'invalid-steamid'
              ? 'The saved Steam ID is not a valid Steam64 ID.'
              : 'Your Steam library is unavailable right now.';
        return { success: false, error, games: [], code: result?.error || null };
      }

      const games = result.games.map(normalizeGame).filter((game) => game.appid > 0);
      const fetchedAt = Number(result.fetchedAt) || Date.now();
      const privateDetails = result.privateDetails === true;
      StorageService.set(CACHE_KEY, { games: result.games, privateDetails, fetchedAt });
      return { success: true, games, fetchedAt, privateDetails };
    } catch (err) {
      return { success: false, error: err?.message || 'Steam library request failed.', games: [] };
    }
  }

  /**
   * Owned games minus anything already in the local library (matched by
   * Steam appid). Returns owned entries sorted most-played first.
   */
  static diffUninstalled(ownedGames, library) {
    const installedAppIds = new Set(
      (Array.isArray(library) ? library : [])
        .map((game) => getSteamAppId(game))
        .filter((id) => id !== null && id !== undefined)
        .map(String)
    );
    return (Array.isArray(ownedGames) ? ownedGames : [])
      .map(normalizeGame)
      .filter((game) => game.appid > 0 && !installedAppIds.has(String(game.appid)))
      .sort((a, b) => b.playtimeForever - a.playtimeForever);
  }
}

export default SteamOwnedGamesService;
