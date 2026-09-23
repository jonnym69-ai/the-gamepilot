import StorageService from './StorageService';
import { getDateKey } from './DateKeyService';
import { isNonGameTitle } from './gameClassification';

const SELECTION_KEY = 'dailySpotlightSelectionV1';
const CACHE_KEY = 'dailySpotlightFactsV1';
const ENABLED_KEY = 'dailySpotlightOnlineEnabled';
const DAY_MS = 86400000;
const RETRY_MS = 3600000;
const inflight = new Map();

const readCache = () => {
  const cache = StorageService.get(CACHE_KEY, {});
  return cache && typeof cache === 'object' && !Array.isArray(cache) ? cache : {};
};

const hash = (value) => {
  let result = 2166136261;
  for (const character of value) result = Math.imul(result ^ character.charCodeAt(0), 16777619);
  return result >>> 0;
};

export default class DailySpotlightService {
  static getSteamAppId(game) {
    if (String(game?.platform || '').toLowerCase() !== 'steam') return null;
    const raw = game.appid ?? game.steam_appid ?? game.steamAppId ?? game.appId ?? game.app_id;
    const id = String(raw ?? '');
    return /^[1-9]\d{0,9}$/.test(id) && Number(id) <= 4294967295 ? id : null;
  }

  static getKey(game) {
    const appid = this.getSteamAppId(game);
    if (appid) return `steam:${appid}`;
    return `${String(game?.platform || 'local').toLowerCase()}:${String(
      game?.id || game?.appid || game?.name || game?.title || ''
    )
      .trim()
      .toLowerCase()}`;
  }

  static selectGame(library, date = new Date()) {
    const games = Array.isArray(library) ? library : [];
    const byKey = new Map();
    games.forEach((game) => {
      if (
        !game ||
        typeof (game.name || game.title) !== 'string' ||
        !(game.name || game.title).trim() ||
        game.hidden ||
        game.isHidden ||
        isNonGameTitle(game) ||
        ['dlc', 'software', 'tool'].includes(game.type)
      )
        return;
      byKey.set(this.getKey(game), game);
    });
    if (!byKey.size) return null;
    const day = getDateKey(date);
    if (!day) return null;
    const saved = StorageService.get(SELECTION_KEY);
    if (saved?.day === day && byKey.has(saved.key)) return byKey.get(saved.key);
    const keys = [...byKey.keys()].sort((a, b) => hash(a) - hash(b) || a.localeCompare(b));
    const ordinal = Math.floor(Date.parse(`${day}T00:00:00Z`) / DAY_MS);
    let index = ((ordinal % keys.length) + keys.length) % keys.length;
    if (keys.length > 1 && saved?.day !== day && keys[index] === saved?.key) index = (index + 1) % keys.length;
    const key = keys[index];
    StorageService.set(SELECTION_KEY, { day, key });
    return byKey.get(key);
  }

  static isEnabled() {
    return StorageService.get(ENABLED_KEY, false) === true;
  }

  static setEnabled(enabled) {
    StorageService.set(ENABLED_KEY, Boolean(enabled));
  }

  static getCached(game) {
    const appid = this.getSteamAppId(game);
    const entry = appid && readCache()[appid];
    return entry && typeof entry === 'object' && !Array.isArray(entry) ? entry : null;
  }

  static async getFacts(game) {
    const appid = this.getSteamAppId(game);
    if (!appid) return null;
    const cached = this.getCached(game);
    const api = typeof window !== 'undefined' && window.electronAPI?.steamSpotlight;
    if (!this.isEnabled() || !api || (typeof navigator !== 'undefined' && navigator.onLine === false)) return cached;
    const age = Date.now() - cached?.attemptedAt;
    if (age >= 0 && age < (cached?.complete ? DAY_MS : RETRY_MS)) return cached;
    if (inflight.has(appid)) return inflight.get(appid);

    const request = Promise.resolve()
      .then(async () => {
        let result;
        try {
          result = await api(appid);
        } catch {
          result = null;
        }
        const entry = {
          store: result?.ok && result.store ? result.store : cached?.store || null,
          players: result?.ok && result.players ? result.players : cached?.players || null,
          attemptedAt: Date.now(),
          complete: Boolean(result?.ok && result.store && result.players),
        };
        const entries = Object.entries({ ...readCache(), [appid]: entry })
          .sort(([, a], [, b]) => (Number(b?.attemptedAt) || 0) - (Number(a?.attemptedAt) || 0))
          .slice(0, 64);
        StorageService.set(CACHE_KEY, Object.fromEntries(entries));
        return entry;
      })
      .finally(() => inflight.delete(appid));
    inflight.set(appid, request);
    return request;
  }
}
