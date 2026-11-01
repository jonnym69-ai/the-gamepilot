import StorageService from './StorageService';
import { getElectronAPI } from './ElectronBridge';

const KEY_KEY = 'itchApiKeyV1';
const CACHE_KEY = 'itchOwnedCacheV1';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

let inflight = null;

const normalizeName = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const normalizeGame = (record) => ({
  itchId: String(record?.itchId || record?.id || ''),
  name: String(record?.name || record?.title || '').trim() || 'Untitled',
  platform: 'itch.io',
  installed: false,
  icon: /^https:\/\//.test(record?.icon || record?.cover_url || '') ? record.icon || record.cover_url : null,
  url: /^https:\/\//.test(record?.url || '') ? record.url : null,
  description: typeof record?.description === 'string' ? record.description : null,
  playtimeForever: 0,
  lastPlayed: 0,
});

const readCache = () => {
  const cached = StorageService.get(CACHE_KEY, null);
  if (!cached || !Array.isArray(cached.games) || !Number.isFinite(cached.fetchedAt)) return null;
  return cached;
};

const FRIENDLY = {
  'invalid-key': 'That itch API key looks malformed — re-copy it from itch.io.',
  'no-bridge': 'itch import is only available in the desktop app.',
};

/**
 * itch.io owned-library import. itch has no third-party OAuth, so the user
 * pastes a personal API key (itch.io → Settings → API keys). The key is
 * stored only in localStorage and used solely to read their owned-keys list —
 * purchases, claimed freebies and bundle contents become browsable owned
 * games. Off by default like every other account source.
 */
class ItchAccountService {
  static getApiKey() {
    return String(StorageService.getString(KEY_KEY) || '').trim();
  }

  static setApiKey(key) {
    StorageService.setString(KEY_KEY, String(key || '').trim());
  }

  static clear() {
    StorageService.setString(KEY_KEY, '');
    StorageService.set(CACHE_KEY, null);
  }

  static isConfigured() {
    return Boolean(this.getApiKey());
  }

  static getCached() {
    const cached = readCache();
    return cached ? { games: cached.games.map(normalizeGame), fetchedAt: cached.fetchedAt } : null;
  }

  static async fetchOwned({ force = false } = {}) {
    const key = this.getApiKey();
    if (!key) {
      return { success: false, error: 'No itch API key configured.', games: [], code: 'missing-key' };
    }
    const api = getElectronAPI();
    if (!api || typeof api.itchOwnedGames !== 'function') {
      return { success: false, error: FRIENDLY['no-bridge'], games: [], code: 'no-bridge' };
    }

    const cached = readCache();
    if (!force && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return { success: true, games: cached.games.map(normalizeGame), fetchedAt: cached.fetchedAt, cached: true };
    }
    if (inflight) return inflight;

    inflight = Promise.resolve()
      .then(async () => {
        const result = await api.itchOwnedGames(key);
        if (!result?.ok || !Array.isArray(result.games)) {
          const error =
            result?.error === 'invalid-key'
              ? FRIENDLY['invalid-key']
              : typeof result?.error === 'string' && result.error.length < 140
                ? result.error
                : 'Your itch library is unavailable right now.';
          return {
            success: false,
            error,
            games: cached ? cached.games.map(normalizeGame) : [],
            code: result?.error || 'unknown',
            stale: Boolean(cached),
          };
        }
        const games = result.games.map(normalizeGame).filter((game) => game.itchId);
        StorageService.set(CACHE_KEY, { games, fetchedAt: Date.now() });
        return { success: true, games, fetchedAt: Date.now() };
      })
      .catch(() => ({
        success: false,
        error: 'Your itch library is unavailable right now.',
        games: cached ? cached.games.map(normalizeGame) : [],
        code: 'fetch-failed',
        stale: Boolean(cached),
      }))
      .finally(() => {
        inflight = null;
      });
    return inflight;
  }

  static async getOwned({ force = false } = {}) {
    if (!this.isConfigured()) {
      return { success: false, error: 'No itch API key configured.', games: [], code: 'missing-key' };
    }
    return this.fetchOwned({ force });
  }

  /** Name-match against the installed library — itch installs aren't
   * tracked locally, so anything sharing an installed name is hidden. */
  static diffUninstalled(ownedGames, library) {
    const installedNames = new Set(
      (Array.isArray(library) ? library : []).map((game) => normalizeName(game?.name)).filter(Boolean)
    );
    return (Array.isArray(ownedGames) ? ownedGames : [])
      .map(normalizeGame)
      .filter((game) => game.name && !installedNames.has(normalizeName(game.name)));
  }
}

export default ItchAccountService;
