/**
 * PlaytimeAutoLogger Service
 * Automatically tracks and logs playtime when games are launched and closed
 * Updates game.time_played without requiring manual scans
 */

import { UserBehaviorProfile } from './UserBehaviorProfile';
import { RollingAchievementsTracker } from './RollingAchievementsTracker';
import StorageService from './StorageService';

const MAX_ACTIVE_SESSION_AGE_MS = 18 * 60 * 60 * 1000;

const getSessionStartTime = (sessionEntry) => {
  if (!sessionEntry) {
    return null;
  }

  if (typeof sessionEntry === 'string') {
    return sessionEntry;
  }

  if (typeof sessionEntry === 'object' && sessionEntry.startTime) {
    return sessionEntry.startTime;
  }

  return null;
};

const normalizeActiveSessionEntry = (gameName, sessionEntry) => {
  const startTime = getSessionStartTime(sessionEntry);

  if (!startTime) {
    return null;
  }

  if (typeof sessionEntry === 'object' && sessionEntry !== null) {
    return {
      ...sessionEntry,
      startTime,
      gameId: sessionEntry.gameId || gameName,
      metadata: sessionEntry.metadata && typeof sessionEntry.metadata === 'object' ? sessionEntry.metadata : {},
      paused: Boolean(sessionEntry.paused)
    };
  }

  return {
    startTime,
    gameId: gameName,
    metadata: {},
    paused: false
  };
};

const isPlainObject = (value) => (
  Boolean(value)
  && typeof value === 'object'
  && !Array.isArray(value)
);

export class PlaytimeAutoLogger {
  static ACTIVE_SESSIONS_KEY = 'activeGameSessions';
  static SESSION_HISTORY_KEY = 'sessionHistory';

  /**
   * Start tracking a game session
   */
  static startSession(gameName, gameId = null, metadata = {}) {
    const sessions = this.getActiveSessions();
    const normalizedMetadata = metadata && typeof metadata === 'object' ? metadata : {};
    
    sessions[gameName] = {
      startTime: new Date().toISOString(),
      gameId,
      metadata: normalizedMetadata,
      paused: false
    };

    StorageService.set(this.ACTIVE_SESSIONS_KEY, sessions);

    // Trigger stats refresh event
    window.dispatchEvent(new CustomEvent('gameSessionStarted', { detail: { gameName } }));
    
    return sessions[gameName];
  }

  /**
   * End a game session and log playtime
   */
  static endSession(gameName, metadata = {}) {
    const sessions = this.getActiveSessions();
    const session = sessions[gameName];
    const normalizedMetadata = metadata && typeof metadata === 'object' ? metadata : {};

    if (!session) {
      return null;
    }

    const startTime = new Date(session.startTime);
    const endTime = new Date();
    const playtimeMinutes = Math.round((endTime - startTime) / (1000 * 60));

    // Only log if session was at least 1 minute
    if (playtimeMinutes >= 1) {
      const combinedMetadata = {
        startTime: session.startTime,
        endTime: endTime.toISOString(),
        ...(session.metadata || {}),
        ...normalizedMetadata
      };

      this.logSessionToHistory(gameName, playtimeMinutes, session.gameId, combinedMetadata);
      
      // Update RollingAchievementsTracker with session data
      RollingAchievementsTracker.updatePlaytime(playtimeMinutes);
      RollingAchievementsTracker.incrementSession();
      
      // Track game played if we have game info
      const sessionGenres = Array.isArray(combinedMetadata.genres) ? combinedMetadata.genres : [];
      const primaryGenre = sessionGenres.length > 0 ? sessionGenres[0] : (combinedMetadata.genre || null);
      const trackedGameId = session.gameId || gameName;
      if (trackedGameId) {
        RollingAchievementsTracker.trackGamePlayed(trackedGameId, primaryGenre, combinedMetadata.mood || null);
      }
    }

    delete sessions[gameName];
    StorageService.set(this.ACTIVE_SESSIONS_KEY, sessions);

    // Trigger stats refresh event
    window.dispatchEvent(new CustomEvent('gameSessionEnded', { detail: { gameName, playtimeMinutes } }));
    
    return {
      gameName,
      gameId: session.gameId || null,
      playtimeMinutes,
      startTime: session.startTime,
      endTime: endTime.toISOString(),
      metadata: {
        ...(session.metadata || {}),
        ...normalizedMetadata
      }
    };
  }

  /**
   * Pause a session (for when game is minimized)
   */
  static pauseSession(gameName) {
    const sessions = this.getActiveSessions();
    const session = sessions[gameName];

    if (!session) {
      return null;
    }

    session.paused = true;
    session.pausedAt = new Date().toISOString();
    StorageService.set(this.ACTIVE_SESSIONS_KEY, sessions);

    return session;
  }

  /**
   * Resume a paused session
   */
  static resumeSession(gameName) {
    const sessions = this.getActiveSessions();
    const session = sessions[gameName];

    if (!session) {
      return null;
    }

    if (session.paused && session.pausedAt) {
      const pausedTime = new Date(session.pausedAt);
      const resumeTime = new Date();
      const pausedDuration = Math.round((resumeTime - pausedTime) / (1000 * 60));

      // Add paused duration to start time to skip the pause period
      const startTime = new Date(session.startTime);
      startTime.setMinutes(startTime.getMinutes() + pausedDuration);
      session.startTime = startTime.toISOString();
    }

    session.paused = false;
    delete session.pausedAt;
    StorageService.set(this.ACTIVE_SESSIONS_KEY, sessions);

    return session;
  }

  /**
   * Get all active sessions
   */
  static getActiveSessions() {
    const stored = StorageService.getString(this.ACTIVE_SESSIONS_KEY);
    try {
      const parsedSessions = stored ? JSON.parse(stored) : {};
      if (!isPlainObject(parsedSessions)) {
        return {};
      }

      return Object.entries(parsedSessions).reduce((normalizedSessions, [gameName, sessionEntry]) => {
        const normalizedEntry = normalizeActiveSessionEntry(gameName, sessionEntry);

        if (normalizedEntry) {
          normalizedSessions[gameName] = normalizedEntry;
        }

        return normalizedSessions;
      }, {});
    } catch (e) {
      return {};
    }
  }

  static pruneStaleActiveSessions(maxAgeMs = MAX_ACTIVE_SESSION_AGE_MS) {
    const sessions = this.getActiveSessions();
    const now = Date.now();
    const nextSessions = {};
    let prunedCount = 0;

    Object.entries(sessions).forEach(([gameName, session]) => {
      const startedAt = new Date(session.startTime).getTime();
      if (!startedAt || Number.isNaN(startedAt) || now - startedAt > maxAgeMs) {
        prunedCount += 1;
        return;
      }

      nextSessions[gameName] = session;
    });

    if (prunedCount > 0) {
      StorageService.set(this.ACTIVE_SESSIONS_KEY, nextSessions);
    }

    return nextSessions;
  }

  /**
   * Get session duration in minutes
   */
  static getSessionDuration(gameName) {
    const sessions = this.getActiveSessions();
    const session = sessions[gameName];

    if (!session) return 0;

    const startTime = new Date(session.startTime);
    if (Number.isNaN(startTime.getTime())) return 0;

    const now = new Date();
    return Math.round((now - startTime) / (1000 * 60));
  }

  /**
   * Log session to history
   */
  static logSessionToHistory(gameName, playtimeMinutes, gameId = null, metadata = {}) {
    const history = this.getSessionHistory();
    const normalizedMetadata = metadata && typeof metadata === 'object' ? metadata : {};
    
    history.push({
      gameName,
      gameId,
      playtimeMinutes,
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleDateString(),
      ...normalizedMetadata
    });

    // Keep only last 1000 sessions for performance
    if (history.length > 1000) {
      history.shift();
    }

    StorageService.set(this.SESSION_HISTORY_KEY, history);
  }

  /**
   * Get session history
   */
  static getSessionHistory() {
    const stored = StorageService.getString(this.SESSION_HISTORY_KEY);
    try {
      const parsedHistory = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsedHistory) ? parsedHistory : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Update game playtime in library
   */
  static updateGamePlaytime(gameName, playtimeMinutes, library = null) {
    if (!library) {
      // Try to get library from localStorage if not provided
      const storedLibrary = StorageService.get('library', []);
      if (storedLibrary?.length) {
        library = storedLibrary;
      } else {
        return false;
      }
    }

    if (!Array.isArray(library)) {
      return false;
    }

    // Find and update game
    const game = library.find(g => g.name === gameName);
    if (!game) {
      return false;
    }

    // Update playtime
    game.time_played = (game.time_played || 0) + playtimeMinutes;
    game.last_played = Date.now();
    game.launch_count = (game.launch_count || 0) + 1;

    // Save updated library
    StorageService.set('library', library);

    return true;
  }

  /**
   * Get playtime stats for a game
   */
  static getGameStats(gameName) {
    const history = this.getSessionHistory();
    const gameSessions = history.filter(s => s.gameName === gameName);
    
    if (gameSessions.length === 0) {
      return {
        gameName,
        totalSessions: 0,
        totalPlaytime: 0,
        avgSessionLength: 0,
        lastPlayed: null
      };
    }

    const totalPlaytime = gameSessions.reduce((sum, s) => sum + s.playtimeMinutes, 0);
    const avgSessionLength = Math.round(totalPlaytime / gameSessions.length);
    const lastPlayed = gameSessions[gameSessions.length - 1].timestamp;

    return {
      gameName,
      totalSessions: gameSessions.length,
      totalPlaytime,
      avgSessionLength,
      lastPlayed,
      sessions: gameSessions
    };
  }

  /**
   * Get daily playtime stats
   */
  static getDailyStats(days = 7) {
    const history = this.getSessionHistory();
    const stats = {};
    const now = new Date();

    // Initialize stats for last N days
    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString();
      stats[dateStr] = 0;
    }

    // Aggregate playtime by date
    history.forEach(session => {
      const dateStr = new Date(session.timestamp).toLocaleDateString();
      if (stats.hasOwnProperty(dateStr)) {
        stats[dateStr] += session.playtimeMinutes;
      }
    });

    return stats;
  }

  /**
   * Get most played games from session history
   */
  static getMostPlayedGames(limit = 10) {
    const history = this.getSessionHistory();
    const gameStats = {};

    history.forEach(session => {
      if (!gameStats[session.gameName]) {
        gameStats[session.gameName] = {
          gameName: session.gameName,
          gameId: session.gameId,
          totalPlaytime: 0,
          sessions: 0
        };
      }
      gameStats[session.gameName].totalPlaytime += session.playtimeMinutes;
      gameStats[session.gameName].sessions += 1;
    });

    return Object.values(gameStats)
      .sort((a, b) => b.totalPlaytime - a.totalPlaytime)
      .slice(0, limit);
  }

  /**
   * Sync sessions with behavior profile
   */
  static syncWithBehaviorProfile(library = null) {
    const history = this.getSessionHistory();

    history.forEach(session => {
      // Find game in library to get mood/genre
      let game = null;
      if (library) {
        game = library.find(g => g.name === session.gameName);
      }

      // Track session length in behavior profile
      UserBehaviorProfile.trackSessionLength(session.playtimeMinutes);

      // If we have game data, track the selection
      if (game) {
        UserBehaviorProfile.trackSelection(game.mood, game.genres?.[0], null, game.appid);
      }
    });
  }

  /**
   * Sync completion status with behavior profile
   */
  static syncCompletionStatus(completedGames = []) {
    if (!completedGames || completedGames.length === 0) return;

    completedGames.forEach(gameId => {
      // Mark game as completed in behavior profile
      const profile = UserBehaviorProfile.getProfile();
      if (!profile.completionStats.completedGameIds) {
        profile.completionStats.completedGameIds = [];
      }
      if (!profile.completionStats.completedGameIds.includes(gameId)) {
        profile.completionStats.completedGameIds.push(gameId);
      }
    });

    UserBehaviorProfile.saveProfile();
  }

  /**
   * Auto-sync behavior data when session ends
   */
  static autoSyncOnSessionEnd(gameName, library = null, completedGames = []) {
    // Sync the individual session
    const history = this.getSessionHistory();
    const lastSession = history[history.length - 1];
    
    if (lastSession && lastSession.gameName === gameName) {
      const game = library?.find(g => g.name === gameName);
      
      // Track session in behavior profile
      UserBehaviorProfile.trackSessionLength(lastSession.playtimeMinutes);
      
      if (game) {
        UserBehaviorProfile.trackSelection(game.mood, game.genres?.[0], null, game.appid);
        
        // If game is completed, track that too
        if (completedGames?.includes(game.appid || game.name)) {
          UserBehaviorProfile.trackCompletion(
            game.name,
            game.mood,
            game.genres?.[0],
            lastSession.playtimeMinutes,
            game.appid || game.name
          );
        }
      }
    }
  }

  /**
   * Clear all session and history data
   */
  static clearAllData() {
    StorageService.remove(this.ACTIVE_SESSIONS_KEY);
    StorageService.remove(this.SESSION_HISTORY_KEY);
  }
}
