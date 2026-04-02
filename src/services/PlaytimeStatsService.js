export class PlaytimeStatsService {
  static getPlaytimeStats(games, period = 'total') {
    if (!games || !Array.isArray(games)) {
      return { total: 0, games: [], mostPlayed: [] };
    }

    try {
      let totalMinutes = 0;
      let gameStats = [];

      games.forEach((game) => {
        if (!game) {
          return;
        }

        const playtime = game.playtime || { total: 0, daily: {}, weekly: {}, monthly: {}, yearly: {} };
        let gameMinutes = 0;

        if (period === 'total') {
          gameMinutes = playtime.total || 0;
        } else if (period === 'today') {
          const today = new Date().toISOString().split('T')[0];
          gameMinutes = playtime.daily?.[today] || 0;
        } else if (period === 'thisWeek') {
          const currentDate = new Date();
          const weekKey = `${currentDate.getFullYear()}-W${Math.floor((currentDate.getDate() - 1) / 7) + 1}`;
          gameMinutes = playtime.weekly?.[weekKey] || 0;
        } else if (period === 'thisMonth') {
          const currentDate = new Date();
          const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
          gameMinutes = playtime.monthly?.[monthKey] || 0;
        } else if (period === 'thisYear') {
          const yearKey = new Date().getFullYear().toString();
          gameMinutes = playtime.yearly?.[yearKey] || 0;
        }

        if (gameMinutes > 0) {
          totalMinutes += gameMinutes;
          gameStats.push({
            ...game,
            periodMinutes: gameMinutes,
            totalMinutes: playtime.total || 0
          });
        }
      });

      if (Array.isArray(gameStats)) {
        gameStats.sort((a, b) => (b?.periodMinutes || 0) - (a?.periodMinutes || 0));
      } else {
        gameStats = [];
      }

      return {
        total: totalMinutes || 0,
        games: Array.isArray(gameStats) ? gameStats : [],
        mostPlayed: Array.isArray(gameStats) ? gameStats.slice(0, 10) : []
      };
    } catch (error) {
      console.error('Error in getPlaytimeStats:', error);
      return { total: 0, games: [], mostPlayed: [] };
    }
  }

  static getMostPlayedGames(games, limit = 10, period = 'total') {
    if (!games || !Array.isArray(games)) {
      return [];
    }

    try {
      const stats = this.getPlaytimeStats(games, period);
      if (!stats || !stats.mostPlayed || !Array.isArray(stats.mostPlayed)) {
        return [];
      }
      return stats.mostPlayed.slice(0, limit || 10);
    } catch (error) {
      return [];
    }
  }
}
