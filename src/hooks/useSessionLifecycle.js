import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '../components/Toast';
import { PlaytimeAutoLogger } from '../services/PlaytimeAutoLogger';
import SessionRepository from '../services/SessionRepository';
import { HabitTrackerService } from '../services/HabitTrackerService';
import { AchievementTracker } from '../AchievementSystem';
import { UserBehaviorProfile } from '../services/UserBehaviorProfile';
import { getResolvedMood } from '../constants/GenresMoods';
import {
  normalizeGameLibraryEntry,
  normalizeLibraryData,
  normalizeTrackedNumber,
  normalizeLastPlayedValue,
  getMostRecentlyPlayedGame,
} from '../services/LibraryDataService';

const getDateBucketKeys = (timestampValue) => {
  const date = new Date(normalizeLastPlayedValue(timestampValue) || Date.now());
  const year = date.getFullYear();
  const month = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  const daily = date.toISOString().split('T')[0];
  const weekStart = new Date(date);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekly = weekStart.toISOString().split('T')[0];
  return { daily, weekly, monthly: month, yearly: String(year) };
};

const incrementPlaytimeBucket = (bucket, key, minutes) => ({
  ...(bucket || {}),
  [key]: normalizeTrackedNumber(bucket?.[key]) + normalizeTrackedNumber(minutes),
});

const getSessionXPSnapshot = () => {
  try {
    return {
      habit: Number(HabitTrackerService.getHabitXP()?.total) || 0,
      bonus: Number(AchievementTracker.getBonusRewardStats()?.totalXP) || 0,
    };
  } catch {
    return { habit: 0, bonus: 0 };
  }
};

/**
 * Manages the full session lifecycle — starting, ending, recovering,
 * and tracking active game sessions.
 *
 * Needs:
 *   - library: the current library array
 *   - setLibrary: state setter for the library
 *   - saveLibrary: from useLibraryLoading
 *   - setLastPlayedGame: state setter
 *   - minimizeOnLaunch: boolean preference
 *   - hasLoadedLibrary: from useLibraryLoading
 *
 * Returns:
 *   - activeSessions: map of active game sessions
 *   - handleEndSession(gameName, metadata): end a session
 *   - refreshActiveSessions(): sync activeSessions with PlaytimeAutoLogger
 *   - sessionStorageReady: boolean
 */
export default function useSessionLifecycle({
  library,
  setLibrary,
  saveLibrary,
  setLastPlayedGame,
  minimizeOnLaunch,
  hasLoadedLibrary,
}) {
  const [activeSessions, setActiveSessions] = useState([]);
  const [sessionStorageReady, setSessionStorageReady] = useState(false);
  const sessionRecoveryCompleted = useRef(false);
  const { info: toastInfo } = useToast();

  // Initialize the session database
  useEffect(() => {
    SessionRepository.initialize()
      .then(() => setSessionStorageReady(true))
      .catch(() => setSessionStorageReady(true));
  }, []);

  const handleEndSession = useCallback(
    (gameName, sessionMetadata = {}) => {
      if (!gameName) {
        return null;
      }

      const xpSnapshotBefore = getSessionXPSnapshot();
      const sessionResult = PlaytimeAutoLogger.endSession(gameName, sessionMetadata);
      if (!sessionResult) {
        return null;
      }

      const endedGame = library.find((g) => g?.name === gameName);
      const genres = endedGame?.genres || [];
      try {
        HabitTrackerService.recordSession(
          gameName,
          sessionResult.playtimeMinutes || 0,
          genres,
          getResolvedMood(endedGame)
        );
      } catch (habitError) {
        console.error('Habit tracking failed during session end:', habitError);
      }

      AchievementTracker.recordSessionDurationAchievements(sessionResult.playtimeMinutes || 0);
      AchievementTracker.checkAndUnlockAchievements();

      const xpSnapshotAfter = getSessionXPSnapshot();
      // Session minutes always earn 0.5 XP/min (see getXPStats); the habit and
      // bonus deltas capture the session, first-session-of-day, streak and any
      // goal-completion XP this session triggered.
      const xpEarned = Math.max(
        0,
        Math.round(normalizeTrackedNumber(sessionResult.playtimeMinutes) * 0.5) +
          (xpSnapshotAfter.habit - xpSnapshotBefore.habit) +
          (xpSnapshotAfter.bonus - xpSnapshotBefore.bonus)
      );

      let endedGameSnapshot = null;

      setLibrary((previousLibrary) => {
        const normalizedLibrary = normalizeLibraryData(previousLibrary);
        const updatedLibrary = normalizedLibrary.map((game) => {
          if (!game || game.name !== gameName) {
            return game;
          }

          endedGameSnapshot = game;

          const nextTimePlayed =
            normalizeTrackedNumber(game.time_played) + normalizeTrackedNumber(sessionResult.playtimeMinutes);
          const sessionEndTimestamp = normalizeLastPlayedValue(sessionResult.endTime) || Date.now();
          const bucketKeys = getDateBucketKeys(sessionEndTimestamp);
          const currentPlaytime = game.playtime || {};

          return normalizeGameLibraryEntry({
            ...game,
            time_played: nextTimePlayed,
            launch_count: normalizeTrackedNumber(game.launch_count),
            last_played: sessionEndTimestamp,
            playtime: {
              ...currentPlaytime,
              total: nextTimePlayed,
              daily: incrementPlaytimeBucket(currentPlaytime.daily, bucketKeys.daily, sessionResult.playtimeMinutes),
              weekly: incrementPlaytimeBucket(currentPlaytime.weekly, bucketKeys.weekly, sessionResult.playtimeMinutes),
              monthly: incrementPlaytimeBucket(
                currentPlaytime.monthly,
                bucketKeys.monthly,
                sessionResult.playtimeMinutes
              ),
              yearly: incrementPlaytimeBucket(currentPlaytime.yearly, bucketKeys.yearly, sessionResult.playtimeMinutes),
            },
          });
        });

        saveLibrary(updatedLibrary);
        const mostRecentlyPlayedGame = getMostRecentlyPlayedGame(updatedLibrary);
        if (mostRecentlyPlayedGame) {
          setLastPlayedGame(mostRecentlyPlayedGame);
        }

        return updatedLibrary;
      });

      setActiveSessions(PlaytimeAutoLogger.getActiveSessions());

      if (minimizeOnLaunch && window.electronAPI?.restoreWindow) {
        window.electronAPI.restoreWindow().catch(() => {});
      }

      const endedGameId = endedGameSnapshot?.appid || endedGameSnapshot?.name || gameName;
      const recommendationLaunch = UserBehaviorProfile.getLatestRecommendationLaunch(endedGameId, gameName);

      window.dispatchEvent(
        new CustomEvent('gamepilot:session-ended', {
          detail: {
            gameName,
            gameId: endedGameId,
            mood: endedGameSnapshot?.mood || null,
            genre: Array.isArray(endedGameSnapshot?.genres)
              ? endedGameSnapshot.genres.find((genre) => genre && genre !== 'Unknown') || null
              : null,
            playtimeMinutes: normalizeTrackedNumber(sessionResult.playtimeMinutes),
            xpEarned,
            endTime: sessionResult.endTime || Date.now(),
            recommendationType: recommendationLaunch?.recommendationType || null,
            recommendationSource: recommendationLaunch?.source || null,
            recoveredSession: Boolean(sessionMetadata.recoveredSession),
            shutdownSession: Boolean(sessionMetadata.shutdownSession),
          },
        })
      );

      return sessionResult;
    },
    [library, saveLibrary, minimizeOnLaunch, setLibrary, setLastPlayedGame]
  );

  // Expose handleEndSession globally for Electron main process
  useEffect(() => {
    window.endSession = handleEndSession;

    return () => {
      if (window.endSession === handleEndSession) {
        delete window.endSession;
      }
    };
  }, [handleEndSession]);

  // Startup recovery: settle interrupted sessions at their last confirmed heartbeat.
  useEffect(() => {
    if (!hasLoadedLibrary || !sessionStorageReady || sessionRecoveryCompleted.current) {
      return;
    }

    sessionRecoveryCompleted.current = true;
    const interruptedSessions = PlaytimeAutoLogger.getActiveSessions();
    Object.entries(interruptedSessions).forEach(([gameName, session]) => {
      const recoveredEndTime = session.lastConfirmedAt || session.startTime;
      handleEndSession(gameName, {
        recoveredSession: true,
        recoveredEndTime,
        endTimeOverride: recoveredEndTime,
      });
    });
    setActiveSessions(PlaytimeAutoLogger.getActiveSessions());
  }, [handleEndSession, hasLoadedLibrary, sessionStorageReady]);

  // Session heartbeat — confirm active sessions every minute
  useEffect(() => {
    if (!hasLoadedLibrary) {
      return undefined;
    }

    const heartbeat = () => {
      const confirmedSessions = PlaytimeAutoLogger.confirmActiveSessions();
      setActiveSessions(confirmedSessions);
    };
    const intervalId = window.setInterval(heartbeat, 60 * 1000);
    return () => window.clearInterval(intervalId);
  }, [hasLoadedLibrary]);

  // Guard window close while an active session is running.
  useEffect(() => {
    const onBeforeUnload = (e) => {
      const sessions = PlaytimeAutoLogger.getActiveSessions();
      const names = Object.keys(sessions);
      if (names.length > 0) {
        const label = names.length === 1 ? names[0] : `${names.length} games`;
        const message = `Active session in progress for ${label}. Close anyway?`;
        e.preventDefault();
        e.returnValue = message;
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  // System shutdown handler — end all active sessions before the OS quits
  useEffect(() => {
    if (!window.electronAPI?.onSystemShutdown) return undefined;
    const unsubscribe = window.electronAPI.onSystemShutdown(() => {
      console.warn('[Session] System shutdown imminent — ending all active sessions');
      Object.keys(PlaytimeAutoLogger.getActiveSessions()).forEach((gameName) => {
        handleEndSession(gameName, { shutdownSession: true });
      });
    });
    return unsubscribe;
  }, [handleEndSession]);

  // Passive watcher session events: games detected running outside GamePilot.
  useEffect(() => {
    const api = window.electronAPI;
    if (!api || typeof api.onPassiveSessionStarted !== 'function') return undefined;

    const unsubscribeStarted = api.onPassiveSessionStarted((payload) => {
      const gameName = payload?.gameName;
      if (!gameName) return;
      const game = (library || []).find((g) => g?.name === gameName);
      PlaytimeAutoLogger.startSession(gameName, payload?.appid || game?.appid || null, {
        source: 'passive-watch',
        platform: payload?.platform || game?.platform || 'Unknown',
        genres: game?.genres || [],
        gameGenres: game?.genres || [],
      });
      setActiveSessions(PlaytimeAutoLogger.getActiveSessions());
      toastInfo(`${gameName} detected running — session tracking started.`);
    });

    const unsubscribeEnded = api.onPassiveSessionEnded((payload) => {
      const gameName = payload?.gameName;
      if (!gameName) return;
      handleEndSession(gameName, {
        source: 'passive-watch',
        platform: payload?.platform || 'Unknown',
      });
    });

    return () => {
      if (typeof unsubscribeStarted === 'function') unsubscribeStarted();
      if (typeof unsubscribeEnded === 'function') unsubscribeEnded();
    };
  }, [library, handleEndSession, toastInfo]);

  const refreshActiveSessions = useCallback(() => {
    setActiveSessions(PlaytimeAutoLogger.getActiveSessions());
  }, []);

  return { activeSessions, handleEndSession, refreshActiveSessions, sessionStorageReady };
}
