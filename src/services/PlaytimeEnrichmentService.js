import { PlaytimeAutoLogger } from './PlaytimeAutoLogger';
import { getDateKey } from './DateKeyService';

/**
 * Service to enrich game library with playtime data from session history
 */
export class PlaytimeEnrichmentService {
  /**
   * Enrich library games with playtime data from session history
   * @param {Array} library - Game library
   * @returns {Array} Enriched library with playtime data
   */
  static enrichLibraryWithPlaytime(library) {
    if (!library || !Array.isArray(library)) {
      return [];
    }

    const sessionHistory = PlaytimeAutoLogger.getSessionHistory();
    
    return library.map(game => {
      if (!game) return null;
      
      const gameName = game.name || game.appname;
      if (!gameName) return game;

      // Find all sessions for this game
      const gameSessions = sessionHistory.filter(s => 
        s.gameName === gameName || s.gameId === game.appid
      );

      // Build daily playtime map
      const daily = {};
      const weekly = {};
      const monthly = {};
      const yearly = {};
      let total = 0;

      gameSessions.forEach(session => {
        const sessionDate = session.date || getDateKey(session.startTime);
        const minutes = session.playtimeMinutes || session.duration || 0;
        
        if (minutes > 0) {
          // Daily
          daily[sessionDate] = (daily[sessionDate] || 0) + minutes;
          
          // Weekly
          const date = new Date(sessionDate);
          const weekKey = `${date.getFullYear()}-W${this.getWeekNumber(date)}`;
          weekly[weekKey] = (weekly[weekKey] || 0) + minutes;
          
          // Monthly
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          monthly[monthKey] = (monthly[monthKey] || 0) + minutes;
          
          // Yearly
          const yearKey = date.getFullYear().toString();
          yearly[yearKey] = (yearly[yearKey] || 0) + minutes;
          
          total += minutes;
        }
      });

      // Preserve externally-sourced playtime (e.g. imported Steam playtime)
      // which lives on game.time_played and is NOT represented in our local
      // session history. Session-derived total only wins when it is higher.
      const resolvedTotal = Math.max(total, Number(game.time_played) || 0);

      return {
        ...game,
        playtime: {
          total: resolvedTotal,
          daily,
          weekly,
          monthly,
          yearly,
          sessionCount: gameSessions.length,
          lastPlayed: gameSessions.length > 0 
            ? gameSessions[gameSessions.length - 1].date 
            : null
        },
        time_played: resolvedTotal,
        launch_count: gameSessions.length
      };
    }).filter(Boolean);
  }

  /**
   * Get week number for a date
   */
  static getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  /**
   * Get all dates with gaming activity from session history
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Array} Array of dates with activity
   */
  static getDatesWithActivity(startDate, endDate) {
    const history = PlaytimeAutoLogger.getSessionHistory();
    const datesWithActivity = new Set();

    history.forEach(session => {
      const sessionDate = session.date || getDateKey(session.startTime);
      if (sessionDate >= startDate && sessionDate <= endDate) {
        datesWithActivity.add(sessionDate);
      }
    });

    return Array.from(datesWithActivity).sort();
  }

  /**
   * Get daily stats from session history (not requiring library)
   * @param {string} date - Date string (YYYY-MM-DD)
   * @returns {Object} Daily stats
   */
  static getDailyStatsFromHistory(date) {
    const history = PlaytimeAutoLogger.getSessionHistory();
    
    const daySessions = history.filter(s => {
      const sessionDate = s.date || new Date(s.startTime).toLocaleDateString('en-CA');
      return sessionDate === date;
    });

    if (daySessions.length === 0) {
      return {
        totalMinutes: 0,
        gamesPlayed: [],
        mostPlayed: null,
        gameCount: 0,
        hasActivity: false,
        date
      };
    }

    // Group by game
    const gameMap = new Map();
    let totalMinutes = 0;

    daySessions.forEach(session => {
      const gameName = session.gameName;
      const minutes = session.playtimeMinutes || session.duration || 0;
      
      if (!gameMap.has(gameName)) {
        gameMap.set(gameName, {
          name: gameName,
          dailyMinutes: 0,
          sessions: 0,
          gameId: session.gameId
        });
      }
      
      const game = gameMap.get(gameName);
      game.dailyMinutes += minutes;
      game.sessions++;
      totalMinutes += minutes;
    });

    const gamesPlayed = Array.from(gameMap.values()).sort((a, b) => b.dailyMinutes - a.dailyMinutes);
    const mostPlayed = gamesPlayed[0];

    return {
      totalMinutes,
      gamesPlayed,
      mostPlayed,
      gameCount: gamesPlayed.length,
      hasActivity: true,
      date
    };
  }
}

export default PlaytimeEnrichmentService;
