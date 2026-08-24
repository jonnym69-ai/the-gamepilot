/**
 * PlaytimeAutoLogger Service
 * Automatically tracks and logs playtime when games are launched and closed
 * Updates game.time_played without requiring manual scans
 */

import { UserBehaviorProfile } from './UserBehaviorProfile';
import { RollingAchievementsTracker } from './RollingAchievementsTracker';
import { processSessionEnd } from './GamingIdentityEnhancements';
import { getMoodForGame, mapGameGenresToValid } from '../constants/GenresMoods';
import StorageService from './StorageService';
import SessionRepository from './SessionRepository';

const MAX_ACTIVE_SESSION_AGE_MS = 18 * 60 * 60 * 1000;
const MAX_EMULATOR_SESSION_MINUTES = 240;

const getSessionGamePart = (gameName) => String(gameName || 'game')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')
  .slice(0, 40) || 'game';

const createSessionId = (gameName, startedAt = Date.now()) => {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `${getSessionGamePart(gameName)}-${startedAt}-${randomPart}`;
};

const createLegacySessionId = (gameName, startTime) => `${getSessionGamePart(gameName)}-${new Date(startTime).getTime() || 0}-legacy`;

const isEmulatorSession = (session = {}, metadata = {}) => {
  const combinedMetadata = {
    ...(session?.metadata && typeof session.metadata === 'object' ? session.metadata : {}),
    ...(metadata && typeof metadata === 'object' ? metadata : {})
  };

  return combinedMetadata.launchType === 'emulator'
    || combinedMetadata.source === 'emulator'
    || Boolean(combinedMetadata.romPath)
    || combinedMetadata.platform === 'Emulated';
};

const getEffectivePlaytimeMinutes = (session, metadata, startTime, endTime) => {
  const elapsedMinutes = Math.max(0, Math.round((endTime - startTime) / (1000 * 60)));

  if (!isEmulatorSession(session, metadata)) {
    return {
      playtimeMinutes: elapsedMinutes,
      adjusted: false,
      adjustmentReason: null,
      actualElapsedMinutes: elapsedMinutes
    };
  }

  if (elapsedMinutes <= MAX_EMULATOR_SESSION_MINUTES) {
    return {
      playtimeMinutes: elapsedMinutes,
      adjusted: false,
      adjustmentReason: null,
      actualElapsedMinutes: elapsedMinutes
    };
  }

  return {
    playtimeMinutes: MAX_EMULATOR_SESSION_MINUTES,
    adjusted: true,
    adjustmentReason: 'stale_emulator_session_capped',
    actualElapsedMinutes: elapsedMinutes
  };
};

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
      sessionId: sessionEntry.sessionId || createLegacySessionId(gameName, startTime),
      lastConfirmedAt: sessionEntry.lastConfirmedAt || startTime,
      paused: Boolean(sessionEntry.paused)
    };
  }

  return {
    startTime,
    gameId: gameName,
    metadata: {},
    sessionId: createLegacySessionId(gameName, startTime),
    lastConfirmedAt: startTime,
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
    
    const startTime = new Date().toISOString();
    sessions[gameName] = {
      startTime,
      gameId,
      metadata: normalizedMetadata,
      sessionId: createSessionId(gameName, Date.now()),
      lastConfirmedAt: startTime,
      paused: false
    };

    SessionRepository.saveActiveSessions(sessions);

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

    if (session.sessionId && this.getSessionHistory().some((entry) => entry?.sessionId === session.sessionId)) {
      delete sessions[gameName];
      SessionRepository.saveActiveSessions(sessions);
      return null;
    }

    const startTime = new Date(session.startTime);
    const requestedEndTime = normalizedMetadata.endTimeOverride || normalizedMetadata.recoveredEndTime || null;
    const parsedEndTime = requestedEndTime ? new Date(requestedEndTime) : new Date();
    const endTime = Number.isNaN(parsedEndTime.getTime()) || parsedEndTime < startTime ? new Date() : parsedEndTime;
    const {
      playtimeMinutes,
      adjusted,
      adjustmentReason,
      actualElapsedMinutes
    } = getEffectivePlaytimeMinutes(session, normalizedMetadata, startTime, endTime);

    // Only log if session was at least 1 minute
    if (playtimeMinutes >= 1) {
      const combinedMetadata = {
        startTime: session.startTime,
        endTime: endTime.toISOString(),
        actualElapsedMinutes,
        sessionAdjusted: adjusted,
        sessionAdjustmentReason: adjustmentReason,
        ...(session.metadata || {}),
        ...normalizedMetadata,
        sessionId: session.sessionId || createLegacySessionId(gameName, session.startTime)
      };

      const historyEntry = this.createHistoryEntry(gameName, playtimeMinutes, session.gameId, combinedMetadata);
      const remainingSessions = { ...sessions };
      delete remainingSessions[gameName];
      const historyWritten = SessionRepository.settleSession(historyEntry, remainingSessions);
      if (!historyWritten) {
        return null;
      }
      
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

      // Feed UserBehaviorProfile so the recommendation engine learns from every session
      try {
        const rawGenresForProfile = sessionGenres.length > 0
          ? sessionGenres
          : (combinedMetadata.gameGenres || []);
        const normalizedGenresForProfile = mapGameGenresToValid(rawGenresForProfile);
        const sessionMoodForProfile = combinedMetadata.mood
          || getMoodForGame(normalizedGenresForProfile);
        UserBehaviorProfile.trackPassiveSession(gameName, playtimeMinutes, {
          mood: sessionMoodForProfile,
          genres: normalizedGenresForProfile,
          gameId: trackedGameId
        });
      } catch (behaviorErr) {
        console.warn('UserBehaviorProfile passive tracking skipped:', behaviorErr);
      }

      // Process identity enhancements (streaks, milestones, timeline, seasonal)
      try {
        const history = this.getSessionHistory();
        const totalPlayTime = history.reduce((sum, s) => sum + s.playtimeMinutes, 0);
        const totalSessions = history.length;
        const platformCounts = {};
        history.forEach(s => {
          const platform = s.metadata?.platform || s.platform || 'Unknown';
          platformCounts[platform] = (platformCounts[platform] || 0) + 1;
        });
        const stats = {
          totalPlayTime,
          totalSessions,
          favoriteGenre: primaryGenre,
          platformDiversity: Object.keys(platformCounts).length
        };
        processSessionEnd(gameName, playtimeMinutes, stats);
      } catch (e) {
        console.log('Identity enhancement processing skipped:', e);
      }
    }

    delete sessions[gameName];
    SessionRepository.saveActiveSessions(sessions);

    // Trigger stats refresh event
    window.dispatchEvent(new CustomEvent('gameSessionEnded', { detail: { gameName, playtimeMinutes } }));
    
    return {
      gameName,
      gameId: session.gameId || null,
      playtimeMinutes,
      startTime: session.startTime,
      endTime: endTime.toISOString(),
      sessionId: session.sessionId || null,
      metadata: {
        actualElapsedMinutes,
        sessionAdjusted: adjusted,
        sessionAdjustmentReason: adjustmentReason,
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
    SessionRepository.saveActiveSessions(sessions);

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
    SessionRepository.saveActiveSessions(sessions);

    return session;
  }

  /**
   * Get all active sessions
   */
  static getActiveSessions() {
    try {
      const storedSessions = SessionRepository.getActiveSessions();
      if (!isPlainObject(storedSessions)) {
        return {};
      }

      return Object.entries(storedSessions).reduce((normalizedSessions, [gameName, sessionEntry]) => {
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

  /**
   * End all active sessions (used on system shutdown or startup recovery).
   * Returns an array of session-end results.
   */
  static endAllSessions() {
    const sessions = this.getActiveSessions();
    const results = [];
    Object.keys(sessions).forEach((gameName) => {
      const result = this.endSession(gameName);
      if (result) results.push(result);
    });
    return results;
  }

  static confirmActiveSessions(now = new Date()) {
    const sessions = this.getActiveSessions();
    const confirmedAt = now instanceof Date ? now.toISOString() : new Date(now).toISOString();
    let changed = false;

    Object.values(sessions).forEach((session) => {
      if (!session.paused) {
        session.lastConfirmedAt = confirmedAt;
        changed = true;
      }
    });

    if (changed) {
      SessionRepository.saveActiveSessions(sessions);
    }

    return sessions;
  }

  static recoverInterruptedSessions() {
    const sessions = this.getActiveSessions();
    return Object.entries(sessions).reduce((results, [gameName, session]) => {
      const recoveredEndTime = session.lastConfirmedAt || session.startTime;
      const result = this.endSession(gameName, {
        recoveredSession: true,
        recoveredEndTime,
        endTimeOverride: recoveredEndTime
      });
      if (result) results.push(result);
      return results;
    }, []);
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
      SessionRepository.saveActiveSessions(nextSessions);
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
  static createHistoryEntry(gameName, playtimeMinutes, gameId = null, metadata = {}) {
    const normalizedMetadata = metadata && typeof metadata === 'object' ? metadata : {};
    const sessionId = normalizedMetadata.sessionId || createSessionId(gameName);
    return {
      gameName,
      gameId,
      playtimeMinutes,
      timestamp: normalizedMetadata.endTime || new Date().toISOString(),
      date: new Date(normalizedMetadata.endTime || Date.now()).toLocaleDateString(),
      ...normalizedMetadata,
      sessionId
    };
  }

  static logSessionToHistory(gameName, playtimeMinutes, gameId = null, metadata = {}) {
    const entry = this.createHistoryEntry(gameName, playtimeMinutes, gameId, metadata);
    const history = this.getSessionHistory();
    if (history.some((existing) => existing?.sessionId === entry.sessionId)) {
      return false;
    }
    history.push(entry);
    return SessionRepository.replaceHistory(history);
  }

  /**
   * Get session history
   */
  static getSessionHistory() {
    try {
      const history = SessionRepository.getSessionHistory();
      if (!Array.isArray(history)) return [];
      // Always present a deduped view so persona/stats never double-count
      // legacy rows that snuck in before SQLite uniqueness.
      return typeof SessionRepository.dedupeSessionHistory === 'function'
        ? SessionRepository.dedupeSessionHistory(history)
        : history;
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
    const profile = UserBehaviorProfile.getProfile();
    const lastSync = profile.lastSyncedSessionTimestamp || null;

    let newLastSync = lastSync;

    history.forEach(session => {
      const sessionStart = session.startTime || session.timestamp;
      // Skip already-synced sessions
      if (lastSync && sessionStart && new Date(sessionStart).getTime() <= new Date(lastSync).getTime()) {
        return;
      }

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

      if (sessionStart && (!newLastSync || new Date(sessionStart).getTime() > new Date(newLastSync).getTime())) {
        newLastSync = sessionStart;
      }
    });

    if (newLastSync && newLastSync !== lastSync) {
      // Re-read profile after trackSessionLength/trackSelection calls (they save internally)
      const freshProfile = UserBehaviorProfile.getProfile();
      freshProfile.lastSyncedSessionTimestamp = newLastSync;
      UserBehaviorProfile.saveProfile(freshProfile);
    }
  }

  /**
   * Sync completion status with behavior profile
   */
  static syncCompletionStatus(completedGames = []) {
    if (!completedGames || completedGames.length === 0) return;

    const profile = UserBehaviorProfile.getProfile();
    if (!profile.completionStats.completedGameIds) {
      profile.completionStats.completedGameIds = [];
    }

    completedGames.forEach(gameId => {
      if (!profile.completionStats.completedGameIds.includes(gameId)) {
        profile.completionStats.completedGameIds.push(gameId);
      }
    });

    UserBehaviorProfile.saveProfile(profile);
  }

  /**
   * Auto-sync behavior data when session ends
   */
  static autoSyncOnSessionEnd(gameName, library = null, completedGames = []) {
    // Sync the individual session
    const history = this.getSessionHistory();
    const lastSession = history[history.length - 1];

    if (!lastSession || lastSession.gameName !== gameName) return;

    const sessionStart = lastSession.startTime || lastSession.timestamp;
    const profile = UserBehaviorProfile.getProfile();
    const lastSync = profile.lastSyncedSessionTimestamp || null;

    // Skip if this session was already synced
    if (lastSync && sessionStart && new Date(sessionStart).getTime() <= new Date(lastSync).getTime()) {
      return;
    }

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

    if (sessionStart) {
      // Re-read profile after trackSessionLength/trackSelection calls (they save internally)
      const freshProfile = UserBehaviorProfile.getProfile();
      freshProfile.lastSyncedSessionTimestamp = sessionStart;
      UserBehaviorProfile.saveProfile(freshProfile);
    }
  }

  /**
   * Clear all session and history data
   */
  static clearAllData() {
    SessionRepository.clear();
  }
}
