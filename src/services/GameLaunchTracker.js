// GameLaunchTracker.js - Tracks game launches, sessions, playtime, and statistics
import StorageService from './StorageService';

export class GameLaunchTracker {
  static STORAGE_KEY = 'gameLaunchData';

  // Get or initialize game launch data
  static getGameLaunchData(gameId) {
    try {
      const allData = StorageService.get(this.STORAGE_KEY, {});
      return allData[gameId] || this.getDefaultGameData();
    } catch (error) {
      console.error('Error reading game launch data:', error);
      return this.getDefaultGameData();
    }
  }

  // Get default game data structure
  static getDefaultGameData() {
    return {
      launchCount: 0,
      totalPlaytime: 0, // in minutes
      lastPlayed: null,
      firstPlayed: null,
      sessions: [],
      averageSessionLength: 0
    };
  }

  // Record a game launch
  static recordGameLaunch(gameId, gameName) {
    try {
      const allData = StorageService.get(this.STORAGE_KEY, {});
      const gameData = allData[gameId] || this.getDefaultGameData();

      // Update launch count
      gameData.launchCount += 1;

      // Set first played if not set
      if (!gameData.firstPlayed) {
        gameData.firstPlayed = Date.now();
      }

      // Update last played
      gameData.lastPlayed = Date.now();

      // Create new session
      const session = {
        startTime: Date.now(),
        endTime: null,
        duration: 0,
        date: new Date().toDateString()
      };

      gameData.sessions.push(session);

      // Save data
      allData[gameId] = gameData;
      StorageService.set(this.STORAGE_KEY, allData);

      return session;
    } catch (error) {
      console.error('Error recording game launch:', error);
      return null;
    }
  }

  // End a game session
  static endGameSession(gameId, durationMinutes) {
    try {
      const allData = StorageService.get(this.STORAGE_KEY, {});
      const gameData = allData[gameId];

      if (!gameData || gameData.sessions.length === 0) {
        return;
      }

      // Get the last session
      const lastSession = gameData.sessions[gameData.sessions.length - 1];
      lastSession.endTime = Date.now();
      lastSession.duration = durationMinutes;

      // Update total playtime
      gameData.totalPlaytime += durationMinutes;

      // Calculate average session length
      const completedSessions = gameData.sessions.filter(s => s.duration > 0);
      if (completedSessions.length > 0) {
        gameData.averageSessionLength = Math.round(
          completedSessions.reduce((sum, s) => sum + s.duration, 0) / completedSessions.length
        );
      }

      // Save data
      allData[gameId] = gameData;
      StorageService.set(this.STORAGE_KEY, allData);
    } catch (error) {
      console.error('Error ending game session:', error);
    }
  }

  // Get game statistics
  static getGameStats(gameId) {
    const gameData = this.getGameLaunchData(gameId);
    return {
      launchCount: gameData.launchCount,
      totalPlaytime: gameData.totalPlaytime,
      totalPlaytimeHours: (gameData.totalPlaytime / 60).toFixed(1),
      lastPlayed: gameData.lastPlayed ? new Date(gameData.lastPlayed).toLocaleString() : 'Never',
      firstPlayed: gameData.firstPlayed ? new Date(gameData.firstPlayed).toLocaleString() : 'Never',
      averageSessionLength: gameData.averageSessionLength,
      sessionCount: gameData.sessions.length,
      completedSessions: gameData.sessions.filter(s => s.duration > 0).length
    };
  }

  // Get all games with launch data
  static getAllGameStats() {
    try {
      const allData = StorageService.get(this.STORAGE_KEY, {});
      const stats = {};

      Object.entries(allData).forEach(([gameId, gameData]) => {
        stats[gameId] = {
          launchCount: gameData.launchCount,
          totalPlaytime: gameData.totalPlaytime,
          totalPlaytimeHours: (gameData.totalPlaytime / 60).toFixed(1),
          lastPlayed: gameData.lastPlayed,
          firstPlayed: gameData.firstPlayed,
          averageSessionLength: gameData.averageSessionLength
        };
      });

      return stats;
    } catch (error) {
      console.error('Error getting all game stats:', error);
      return {};
    }
  }

  // Get most played games
  static getMostPlayedGames(limit = 10) {
    const allStats = this.getAllGameStats();
    return Object.entries(allStats)
      .sort((a, b) => b[1].totalPlaytime - a[1].totalPlaytime)
      .slice(0, limit)
      .map(([gameId, stats]) => ({ gameId, ...stats }));
  }

  // Get recently played games
  static getRecentlyPlayedGames(limit = 10) {
    const allStats = this.getAllGameStats();
    return Object.entries(allStats)
      .filter(([_, stats]) => stats.lastPlayed !== null)
      .sort((a, b) => b[1].lastPlayed - a[1].lastPlayed)
      .slice(0, limit)
      .map(([gameId, stats]) => ({ gameId, ...stats }));
  }

  // Get total playtime across all games
  static getTotalPlaytime() {
    const allStats = this.getAllGameStats();
    return Object.values(allStats).reduce((sum, stats) => sum + stats.totalPlaytime, 0);
  }

  // Get total launch count across all games
  static getTotalLaunches() {
    const allStats = this.getAllGameStats();
    return Object.values(allStats).reduce((sum, stats) => sum + stats.launchCount, 0);
  }

  // Clear all launch data
  static clearAll() {
    try {
      StorageService.remove(this.STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing launch data:', error);
    }
  }

  // Clear data for a specific game
  static clearGameData(gameId) {
    try {
      const allData = StorageService.get(this.STORAGE_KEY, {});
      delete allData[gameId];
      StorageService.set(this.STORAGE_KEY, allData);
    } catch (error) {
      console.error('Error clearing game data:', error);
    }
  }
}
