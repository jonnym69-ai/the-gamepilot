import SteamPublicService from './SteamPublicService';
import { normalizeLibraryData } from './LibraryDataService';

const MAX_REFRESH_GAMES = 8;

const normalizePlatform = (platform = '') => String(platform || '').trim().toLowerCase();

const getSteamAppId = (game = {}) => {
  const directPlatform = normalizePlatform(game.platform);
  if (directPlatform === 'steam') {
    const directId = game.appid || game.steam_appid || game.appId;
    if (directId) return String(directId);
  }

  const sources = Array.isArray(game.launchSources) ? game.launchSources : [];
  const steamSource = sources.find((source) => normalizePlatform(source?.platform) === 'steam' && source?.appid);
  return steamSource?.appid ? String(steamSource.appid) : null;
};

const getGameName = (game = {}) => game.name || game.title || `Steam App ${getSteamAppId(game) || ''}`.trim();

const summarizeRows = (rows = [], steamGameCount = 0, refreshedAt = null) => {
  const withAchievements = rows.filter((row) => row.achievementTotal > 0);
  const totalAchievements = withAchievements.reduce((sum, row) => sum + row.achievementTotal, 0);
  const rarestRow = withAchievements.reduce((current, row) => {
    if (row.rarestPercent == null) return current;
    if (!current || row.rarestPercent < current.rarestPercent) return row;
    return current;
  }, null);
  const averageUnlockRate = withAchievements.length > 0
    ? withAchievements.reduce((sum, row) => sum + row.averagePercent, 0) / withAchievements.length
    : 0;

  return {
    generatedAt: Date.now(),
    refreshedAt,
    steamGameCount,
    cachedGameCount: rows.length,
    gamesWithAchievements: withAchievements.length,
    totalAchievements,
    averageUnlockRate: Number(averageUnlockRate.toFixed(1)),
    rarest: rarestRow ? {
      appid: rarestRow.appid,
      gameName: rarestRow.gameName,
      percent: rarestRow.rarestPercent,
      internalName: rarestRow.rarestInternalName,
      achievementsUrl: rarestRow.achievementsUrl
    } : null,
    rows: rows.sort((left, right) => {
      if (left.rarestPercent == null && right.rarestPercent == null) return right.achievementTotal - left.achievementTotal;
      if (left.rarestPercent == null) return 1;
      if (right.rarestPercent == null) return -1;
      return left.rarestPercent - right.rarestPercent;
    })
  };
};

const buildRowFromSnapshot = (game, snapshot) => {
  const achievements = snapshot?.achievements;
  if (!achievements) return null;
  return {
    appid: String(snapshot.appid || getSteamAppId(game)),
    gameName: getGameName(game),
    achievementTotal: Number(achievements.total || 0),
    averagePercent: Number(achievements.averagePercent || 0),
    rarestPercent: achievements.rarestPercent == null ? null : Number(achievements.rarestPercent),
    rarestInternalName: achievements.rarestInternalName || null,
    fetchedAt: snapshot.fetchedAt || null,
    achievementsUrl: snapshot.achievementsUrl || null
  };
};

class SteamAchievementAggregationService {
  static getSteamGames(library = []) {
    return normalizeLibraryData(library)
      .map((game) => ({ ...game, steamAppId: getSteamAppId(game) }))
      .filter((game) => game.steamAppId);
  }

  static getCachedSnapshot(library = []) {
    const steamGames = this.getSteamGames(library);
    const rows = steamGames
      .map((game) => buildRowFromSnapshot(game, SteamPublicService.getCached({ platform: 'Steam', appid: game.steamAppId })))
      .filter(Boolean);

    return summarizeRows(rows, steamGames.length);
  }

  static async refreshSnapshot(library = [], { limit = MAX_REFRESH_GAMES } = {}) {
    const steamGames = this.getSteamGames(library).slice(0, Math.max(1, Number(limit) || MAX_REFRESH_GAMES));
    const rows = [];

    for (const game of steamGames) {
      const snapshot = await SteamPublicService.getSnapshot({ platform: 'Steam', appid: game.steamAppId });
      const row = buildRowFromSnapshot(game, snapshot);
      if (row) rows.push(row);
    }

    return summarizeRows(rows, this.getSteamGames(library).length, Date.now());
  }

  static isEnabled() {
    return SteamPublicService.isEnabled();
  }

  static setEnabled(enabled) {
    SteamPublicService.setEnabled(enabled);
  }
}

export default SteamAchievementAggregationService;
