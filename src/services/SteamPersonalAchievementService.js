import StorageService from './StorageService';
import SteamAchievementAggregationService from './SteamAchievementAggregationService';

const ENABLED_KEY = 'steamPersonalAchievementsEnabled';
const API_KEY_KEY = 'steamPersonalAchievementsApiKey';
const STEAM_ID_KEY = 'steamPersonalAchievementsSteamId';
const CACHE_KEY = 'steamPersonalAchievementCacheV1';
const MAX_PREFLIGHT_GAMES = 5;

const cleanApiKey = (value = '') => String(value || '').trim().replace(/[^A-Fa-f0-9]/g, '');
const cleanSteamId = (value = '') => String(value || '').trim().replace(/[^0-9]/g, '');

const readCache = () => {
  const cache = StorageService.get(CACHE_KEY, {});
  return cache && typeof cache === 'object' ? cache : {};
};

const writeCache = (cache) => StorageService.set(CACHE_KEY, cache && typeof cache === 'object' ? cache : {});

const summarizeRows = (rows = [], steamGameCount = 0) => {
  const validRows = rows.filter((row) => row.ok && row.total > 0);
  const totalPersonalAchievements = validRows.reduce((sum, row) => sum + row.total, 0);
  const totalUnlocked = validRows.reduce((sum, row) => sum + row.unlocked, 0);
  const latestFetchedAt = validRows.reduce((latest, row) => Math.max(latest, Number(row.fetchedAt || 0)), 0);
  const withPublicRarity = validRows.filter((row) => row.publicRarestPercent != null).length;

  return {
    generatedAt: Date.now(),
    latestFetchedAt: latestFetchedAt || null,
    steamGameCount,
    cachedGameCount: rows.length,
    gamesWithPersonalData: validRows.length,
    totalPersonalAchievements,
    totalUnlocked,
    completionRate: totalPersonalAchievements > 0 ? Number(((totalUnlocked / totalPersonalAchievements) * 100).toFixed(1)) : 0,
    withPublicRarity,
    rows: rows.sort((left, right) => {
      if (left.ok !== right.ok) return left.ok ? -1 : 1;
      return (right.completionRate || 0) - (left.completionRate || 0);
    })
  };
};

class SteamPersonalAchievementService {
  static isEnabled() {
    return StorageService.getString(ENABLED_KEY, 'false') === 'true';
  }

  static setEnabled(enabled) {
    StorageService.setString(ENABLED_KEY, enabled ? 'true' : 'false');
  }

  static getConfig() {
    const apiKey = cleanApiKey(StorageService.getString(API_KEY_KEY, ''));
    const steamId = cleanSteamId(StorageService.getString(STEAM_ID_KEY, ''));
    return {
      enabled: this.isEnabled(),
      apiKey,
      steamId,
      hasApiKey: apiKey.length >= 20,
      hasSteamId: steamId.length >= 16,
      ready: apiKey.length >= 20 && steamId.length >= 16
    };
  }

  static saveConfig({ enabled, apiKey, steamId } = {}) {
    if (enabled !== undefined) this.setEnabled(Boolean(enabled));
    if (apiKey !== undefined) StorageService.setString(API_KEY_KEY, cleanApiKey(apiKey));
    if (steamId !== undefined) StorageService.setString(STEAM_ID_KEY, cleanSteamId(steamId));
    return this.getConfig();
  }

  static clearConfig() {
    StorageService.remove(API_KEY_KEY);
    StorageService.remove(STEAM_ID_KEY);
    StorageService.remove(CACHE_KEY);
    this.setEnabled(false);
    return this.getConfig();
  }

  static clearCache() {
    StorageService.remove(CACHE_KEY);
  }

  static getCachedSnapshot(library = []) {
    const steamGames = SteamAchievementAggregationService.getSteamGames(library);
    const publicRows = new Map(
      SteamAchievementAggregationService.getCachedSnapshot(library).rows.map((row) => [String(row.appid), row])
    );
    const cache = readCache();
    const rows = steamGames
      .map((game) => {
        const appid = String(game.steamAppId || game.appid || '');
        const entry = cache[appid];
        if (!entry) return null;
        const publicRow = publicRows.get(appid);
        const total = Number(entry.total || 0);
        const unlocked = Number(entry.unlocked || 0);
        return {
          appid,
          gameName: entry.gameName || game.name || game.title || `Steam App ${appid}`,
          ok: Boolean(entry.ok),
          total,
          unlocked,
          locked: Math.max(0, total - unlocked),
          completionRate: total > 0 ? Number(((unlocked / total) * 100).toFixed(1)) : 0,
          fetchedAt: entry.fetchedAt || null,
          lastError: entry.lastError || null,
          personaName: entry.personaName || null,
          publicAchievementTotal: publicRow?.achievementTotal || null,
          publicAveragePercent: publicRow?.averagePercent ?? null,
          publicRarestPercent: publicRow?.rarestPercent ?? null,
          publicRarestInternalName: publicRow?.rarestInternalName || null,
          achievementsUrl: publicRow?.achievementsUrl || null
        };
      })
      .filter(Boolean);

    return summarizeRows(rows, steamGames.length);
  }

  static cachePreflightResult(result = {}) {
    if (!result?.ok || !Array.isArray(result.results)) return this.getCachedSnapshot();
    const fetchedAt = Date.now();
    const next = { ...readCache() };
    result.results.forEach((row) => {
      const appid = String(row?.appid || '').replace(/[^0-9]/g, '');
      if (!appid) return;
      next[appid] = {
        appid,
        gameName: row.name || `Steam App ${appid}`,
        ok: Boolean(row.ok),
        total: Number(row.total || 0),
        unlocked: Number(row.unlocked || 0),
        locked: Number(row.locked || 0),
        fetchedAt,
        lastError: row.ok ? null : row.error || 'achievement-preflight-failed',
        personaName: result.personaName || null,
        source: 'steam-web-api-preflight'
      };
    });
    writeCache(next);
    return this.getCachedSnapshot();
  }

  static getPreflightPlan(library = []) {
    const config = this.getConfig();
    const steamGames = SteamAchievementAggregationService.getSteamGames(library);
    return {
      ...config,
      steamGameCount: steamGames.length,
      sampleGames: steamGames.slice(0, MAX_PREFLIGHT_GAMES).map((game) => ({
        appid: String(game.steamAppId || game.appid || ''),
        name: game.name || game.title || `Steam App ${game.steamAppId || game.appid || ''}`.trim()
      })),
      bridgeAvailable: Boolean(typeof window !== 'undefined' && window.electronAPI?.steamPersonalAchievementsPreflight)
    };
  }

  static async runPreflight(library = []) {
    const plan = this.getPreflightPlan(library);
    if (!plan.enabled) return { ok: false, error: 'not-enabled', plan };
    if (!plan.ready) return { ok: false, error: 'missing-credentials', plan };
    if (!plan.bridgeAvailable) return { ok: false, error: 'electron-only', plan };

    const result = await window.electronAPI.steamPersonalAchievementsPreflight({
      apiKey: plan.apiKey,
      steamId: plan.steamId,
      games: plan.sampleGames
    });
    if (result?.ok) this.cachePreflightResult(result);
    return result;
  }
}

export default SteamPersonalAchievementService;
