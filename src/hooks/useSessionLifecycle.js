import { useCallback } from 'react';
import {
  normalizeTrackedNumber,
  normalizeLastPlayedValue,
  normalizeGameLibraryEntry,
  normalizeLibraryData
} from '../services/LibraryDataService';
import { StatsAggregationService } from '../services/StatsAggregationService';
import { PlaytimeAutoLogger } from '../services/PlaytimeAutoLogger';

const getMostRecentlyPlayedGame = (libraryData = []) => (
  normalizeLibraryData(libraryData).reduce((mostRecentGame, currentGame) => {
    const currentLastPlayed = normalizeLastPlayedValue(currentGame?.last_played) || 0;
    const mostRecentLastPlayed = normalizeLastPlayedValue(mostRecentGame?.last_played) || 0;
    return currentLastPlayed > mostRecentLastPlayed ? currentGame : mostRecentGame;
  }, null)
);

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
  [key]: normalizeTrackedNumber(bucket?.[key]) + normalizeTrackedNumber(minutes)
});

/**
 * Owns the "game closed -> end session -> persist updated library" flow.
 *
 * Extracted from App.js so it can be unit/integration-tested directly and
 * reused by anything that needs to end a tracked play session (currently
 * the launch coordinator's onGameClosed callback and the manual
 * end-session button).
 *
 * The hook intentionally uses functional setState updaters so it does NOT
 * need `library` as a dependency; pass it in if your caller wants to keep
 * the prop for parity but it is otherwise unused.
 */
export function useSessionLifecycle({
  setLibrary,
  setLastPlayedGame,
  saveLibrary,
  setActiveSessions = null
} = {}) {
  const endSession = useCallback((gameName) => {
    if (!gameName) {
      return null;
    }

    const sessionResult = PlaytimeAutoLogger.endSession(gameName);
    if (!sessionResult) {
      return null;
    }

    let endedGameSnapshot = null;

    setLibrary((previousLibrary) => {
      const normalizedLibrary = normalizeLibraryData(previousLibrary);
      const updatedLibrary = normalizedLibrary.map((game) => {
        if (!game || game.name !== gameName) {
          return game;
        }

        endedGameSnapshot = game;

        const nextTimePlayed = normalizeTrackedNumber(game.time_played) + normalizeTrackedNumber(sessionResult.playtimeMinutes);
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
            monthly: incrementPlaytimeBucket(currentPlaytime.monthly, bucketKeys.monthly, sessionResult.playtimeMinutes),
            yearly: incrementPlaytimeBucket(currentPlaytime.yearly, bucketKeys.yearly, sessionResult.playtimeMinutes)
          }
        });
      });

      if (typeof saveLibrary === 'function') {
        saveLibrary(updatedLibrary);
      }

      const mostRecentlyPlayedGame = getMostRecentlyPlayedGame(updatedLibrary);
      if (mostRecentlyPlayedGame && typeof setLastPlayedGame === 'function') {
        setLastPlayedGame(mostRecentlyPlayedGame);
      }

      PlaytimeAutoLogger.autoSyncOnSessionEnd(gameName, updatedLibrary);
      return updatedLibrary;
    });

    if (typeof setActiveSessions === 'function') {
      setActiveSessions(PlaytimeAutoLogger.getActiveSessions());
    }
    StatsAggregationService.clearCache();

    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('gamepilot:session-ended', {
        detail: {
          gameName,
          gameId: endedGameSnapshot?.appid || endedGameSnapshot?.name || gameName,
          mood: endedGameSnapshot?.mood || null,
          genre: Array.isArray(endedGameSnapshot?.genres)
            ? endedGameSnapshot.genres.find((genre) => genre && genre !== 'Unknown') || null
            : null,
          playtimeMinutes: normalizeTrackedNumber(sessionResult.playtimeMinutes),
          endTime: sessionResult.endTime || Date.now()
        }
      }));
    }

    return sessionResult;
  }, [setLibrary, setLastPlayedGame, saveLibrary, setActiveSessions]);

  return { endSession };
}

export default useSessionLifecycle;
