/**
 * Per-user Steam achievement progress (own unlocks), fetched through the
 * server-side relay via window.electronAPI.steamPlayerAchievements and merged
 * with the anonymous global unlock percentages for rarity.
 *
 * The user's Steam64 ID comes from the shared wishlist/owned-games storage
 * (SteamOwnedGamesService.getSteamId) — no second ID field.
 *
 * Cache (`steamPlayerAchievementsV1`): successful payloads 6h, the stable
 * negative answers ('private-profile', 'no-achievements') 24h, transient
 * errors never cached. Bounded to 200 appids, evicting least-recently
 * accessed.
 */

import StorageService from './StorageService';
import SteamOwnedGamesService from './SteamOwnedGamesService';

const CACHE_KEY = 'steamPlayerAchievementsV1';
const MAX_ENTRIES = 200;
const SUCCESS_TTL_MS = 6 * 60 * 60 * 1000;
const NEGATIVE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHED_ERRORS = new Set(['private-profile', 'no-achievements']);

const cleanAppId = (appid) => String(appid ?? '').replace(/[^0-9]/g, '');

const readCache = () => {
  const all = StorageService.get(CACHE_KEY, {});
  return all && typeof all === 'object' && !Array.isArray(all) ? all : {};
};

const writeCache = (cache) => {
  // LRU-ish: evict least-recently accessed beyond the cap.
  const entries = Object.entries(cache);
  if (entries.length > MAX_ENTRIES) {
    entries
      .sort((a, b) => (a[1]?.accessedAt || 0) - (b[1]?.accessedAt || 0))
      .slice(0, entries.length - MAX_ENTRIES)
      .forEach(([appid]) => delete cache[appid]);
  }
  StorageService.set(CACHE_KEY, cache);
};

const entryTtl = (result) => (result?.ok ? SUCCESS_TTL_MS : CACHED_ERRORS.has(result?.error) ? NEGATIVE_TTL_MS : 0);

const readCachedResult = (appid, { touch = true } = {}) => {
  const cache = readCache();
  const entry = cache[appid];
  if (!entry || Date.now() - (entry.fetchedAt || 0) > entryTtl(entry.result)) return null;
  if (touch) {
    entry.accessedAt = Date.now();
    cache[appid] = entry;
    writeCache(cache);
  }
  return entry.result;
};

const storeResult = (appid, result) => {
  const cache = readCache();
  cache[appid] = { fetchedAt: Date.now(), accessedAt: Date.now(), result };
  writeCache(cache);
};

class SteamAchievementsService {
  static getSteamId() {
    return SteamOwnedGamesService.getSteamId();
  }

  /**
   * Personal achievement list for one Steam appid. Returns
   * { ok, unlocked, total, achievements[{apiname,name,description,achieved,
   * unlockTime,percent}], gameName, cached? } or { ok:false, error }.
   */
  static async getForGame(appid) {
    const id = cleanAppId(appid);
    if (!id) return { ok: false, error: 'invalid-appid' };

    const steamId = this.getSteamId();
    if (!steamId) return { ok: false, error: 'no-steam-id' };

    const cached = readCachedResult(id);
    if (cached) return { ...cached, cached: true };

    const api = window.electronAPI?.steamPlayerAchievements;
    if (!api) return { ok: false, error: 'unavailable' };

    const [playerRes, globalRes] = await Promise.all([
      api({ steamId, appid: id }).catch((error) => ({ ok: false, error: String(error?.message || 'steam-error') })),
      window.electronAPI?.steamGlobalAchievements
        ? window.electronAPI.steamGlobalAchievements(id).catch(() => ({ ok: false }))
        : Promise.resolve({ ok: false }),
    ]);

    if (!playerRes?.ok) {
      const result = { ok: false, error: playerRes?.error || 'steam-error' };
      if (CACHED_ERRORS.has(result.error)) storeResult(id, result);
      return result;
    }

    const percentByName = new Map(
      (Array.isArray(globalRes?.achievements) ? globalRes.achievements : []).map((a) => [
        String(a?.name || ''),
        Number(a?.percent) || 0,
      ])
    );
    const achievements = (Array.isArray(playerRes.achievements) ? playerRes.achievements : []).map((a) => ({
      apiname: String(a?.apiname || ''),
      name: typeof a?.name === 'string' ? a.name : '',
      description: typeof a?.description === 'string' ? a.description : '',
      achieved: Boolean(a?.achieved),
      unlockTime: a?.unlockTime || null,
      percent: percentByName.has(String(a?.apiname || '')) ? percentByName.get(String(a?.apiname || '')) : null,
    }));
    const unlocked = achievements.filter((a) => a.achieved).length;
    const result = {
      ok: true,
      gameName: typeof playerRes.gameName === 'string' ? playerRes.gameName : '',
      unlocked,
      total: achievements.length,
      achievements,
      fetchedAt: Date.now(),
    };
    storeResult(id, result);
    return result;
  }

  /**
   * Cache-only summary for bulk surfaces: { [appid]: { unlocked, total } }.
   * Never hits the network.
   */
  static getSummaryForGames(appids = []) {
    const summary = {};
    (Array.isArray(appids) ? appids : []).forEach((appid) => {
      const id = cleanAppId(appid);
      if (!id) return;
      const cached = readCachedResult(id);
      if (cached?.ok) summary[id] = { unlocked: cached.unlocked, total: cached.total };
    });
    return summary;
  }
}

export default SteamAchievementsService;
