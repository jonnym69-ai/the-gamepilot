import StorageService from './StorageService';

const LINKED_KEY = 'epicAccountLinkedV1';
const META_KEY = 'epicAccountMetaV1';
const CACHE_KEY = 'epicOwnedGamesCacheV2';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const api = () => (typeof window !== 'undefined' ? window.electronAPI : null);

const normalizeName = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

export const normalizeOwnedGame = (record) => {
  const image = record?.image || record?.icon;
  return {
    appName: String(record?.appName || ''),
    catalogItemId: typeof record?.catalogItemId === 'string' ? record.catalogItemId : null,
    // Accepts raw bridge records (title/image) and already-normalized rows
    // (name/icon) so diffUninstalled can re-normalize safely.
    name: String(record?.title || record?.name || '').trim() || 'Unknown game',
    platform: 'Epic',
    icon: /^https:\/\//.test(image || '') ? image : null,
    description: String(record?.description || '').trim() || null,
  };
};

const readCache = () => {
  const cached = StorageService.get(CACHE_KEY, null);
  if (!cached || !Array.isArray(cached.games) || !Number.isFinite(cached.fetchedAt)) return null;
  return cached;
};

const AUTH_ERRORS = {
  cancelled: 'Epic linking was cancelled.',
  'timed-out': 'Epic sign-in timed out — try again.',
  'load-failed': 'The Epic sign-in page could not be loaded.',
  'already-open': 'The Epic sign-in window is already open.',
  'secure-storage-unavailable':
    'Encrypted storage is not available on this system, so the Epic session cannot be saved safely.',
  'token-failed': 'Epic sign-in failed — try again.',
  'not-linked': 'Link your Epic account in Settings to see owned games.',
  'reauth-required': 'Your Epic session expired — link the account again in Settings.',
  'epic-library-unavailable': 'Your Epic library is unavailable right now.',
};

const friendlyError = (code, fallback) => AUTH_ERRORS[code] || fallback;

/**
 * Epic account link + owned-library cache. The OAuth session lives in the
 * main process (safeStorage-encrypted file in userData); this service only
 * mirrors the linked flag and owned games for the renderer. Off by default —
 * linking is opt-in and detection-based Epic scanning works without it.
 */
class EpicAccountService {
  static isLinked() {
    return StorageService.getString(LINKED_KEY) === 'true';
  }

  static getAccountMeta() {
    const meta = StorageService.get(META_KEY, null);
    return meta && typeof meta === 'object' ? meta : null;
  }

  static persistStatus({ linked, accountId, displayName }) {
    StorageService.setString(LINKED_KEY, String(Boolean(linked)));
    if (linked) {
      StorageService.set(META_KEY, { accountId: accountId || null, displayName: displayName || null });
    } else {
      StorageService.remove(META_KEY);
    }
  }

  static async refreshStatus() {
    const bridge = api()?.epicAuthStatus;
    if (typeof bridge !== 'function') return { linked: this.isLinked() };
    const status = await bridge().catch(() => null);
    if (!status?.ok) return { linked: this.isLinked() };
    this.persistStatus(status);
    return { linked: status.linked === true, accountId: status.accountId, displayName: status.displayName };
  }

  static async link() {
    const bridge = api()?.epicAuthStart;
    if (typeof bridge !== 'function') {
      return { success: false, error: 'Epic linking is only available in the desktop app.', code: 'no-bridge' };
    }
    const result = await bridge();
    if (!result?.ok) {
      return {
        success: false,
        error: friendlyError(result?.error, 'Epic sign-in failed — try again.'),
        code: result?.error || null,
      };
    }
    this.persistStatus({ linked: true, accountId: result.accountId, displayName: result.displayName });
    return { success: true, displayName: result.displayName || null };
  }

  static async disconnect() {
    const bridge = api()?.epicAuthDisconnect;
    if (typeof bridge === 'function') await bridge().catch(() => null);
    this.persistStatus({ linked: false });
    StorageService.remove(CACHE_KEY);
    return { success: true };
  }

  static getCached() {
    const cached = readCache();
    return cached ? { games: cached.games.map(normalizeOwnedGame), fetchedAt: cached.fetchedAt } : null;
  }

  static async getOwned({ force = false } = {}) {
    if (!this.isLinked()) {
      return { success: false, error: friendlyError('not-linked'), games: [], code: 'not-linked' };
    }
    const bridge = api()?.epicOwnedLibrary;
    if (typeof bridge !== 'function') {
      return {
        success: false,
        error: 'Owned games is only available in the desktop app.',
        games: [],
        code: 'no-bridge',
      };
    }
    const cached = readCache();
    if (!force && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return { success: true, games: cached.games.map(normalizeOwnedGame), fetchedAt: cached.fetchedAt, cached: true };
    }
    try {
      const result = await bridge();
      if (!result?.ok) {
        if (result?.error === 'not-linked' || result?.error === 'reauth-required') {
          this.persistStatus({ linked: false });
        }
        return {
          success: false,
          error: friendlyError(result?.error, 'Your Epic library is unavailable right now.'),
          games: [],
          code: result?.error || null,
        };
      }
      const games = (Array.isArray(result.games) ? result.games : []).map(normalizeOwnedGame).filter((g) => g.appName);
      const fetchedAt = Date.now();
      StorageService.set(CACHE_KEY, { games: result.games, fetchedAt });
      return { success: true, games, fetchedAt };
    } catch (error) {
      return { success: false, error: error?.message || 'Your Epic library is unavailable right now.', games: [] };
    }
  }

  /**
   * Owned Epic games minus anything already in the local library. Matches on
   * Epic identifiers (appid/launchId = catalog item id, appName) and falls
   * back to normalized title so a game installed from another store isn't
   * offered as "not installed".
   */
  static diffUninstalled(ownedGames, library) {
    const installedIds = new Set();
    const installedNames = new Set();
    for (const game of Array.isArray(library) ? library : []) {
      if (game?.platform === 'Epic') {
        for (const id of [game.appid, game.launchId, game.appName]) {
          if (id) installedIds.add(String(id));
        }
      }
      const name = normalizeName(game?.name);
      if (name) installedNames.add(name);
    }
    return (Array.isArray(ownedGames) ? ownedGames : [])
      .map(normalizeOwnedGame)
      .filter(
        (game) =>
          game.appName &&
          !installedIds.has(game.appName) &&
          !(game.catalogItemId && installedIds.has(game.catalogItemId)) &&
          !installedNames.has(normalizeName(game.name))
      );
  }
}

export default EpicAccountService;
