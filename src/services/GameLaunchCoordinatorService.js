import { AchievementTracker } from '../AchievementSystem';
import { GamingIdentity } from '../GamingIdentity';
import { GameProcessMonitor } from '../GameProcessMonitor';
import {
  createActiveSessionEntry,
  getActiveSessionStartTime,
  persistActiveGameSessions,
  readActiveGameSessions
} from './ActiveSessionService';
import DiscordPresenceService from './DiscordPresenceService';
import { LauncherService } from './LauncherService';
import { PlaytimeAutoLogger } from './PlaytimeAutoLogger';

const mergeLaunchMetadata = (existingSession = {}, normalizedSessionEntry = {}) => ({
  ...existingSession,
  gameId: existingSession.gameId || normalizedSessionEntry.gameId,
  metadata: {
    ...(existingSession.metadata || {}),
    ...(normalizedSessionEntry.metadata || {})
  }
});

export class GameLaunchCoordinatorService {
  static prepareExistingSessionForLaunch(game) {
    const activeSessions = readActiveGameSessions();
    const existingSession = activeSessions[game.name];
    const existingStartTime = getActiveSessionStartTime(existingSession);
    const hadExistingSession = Boolean(existingStartTime);

    if (hadExistingSession && typeof existingSession === 'string') {
      activeSessions[game.name] = {
        ...createActiveSessionEntry(game),
        startTime: existingStartTime
      };
      persistActiveGameSessions(activeSessions);
    }

    return { hadExistingSession };
  }

  static updateLibraryForLaunch(library = [], game, launchTimestamp) {
    let launchedGame = {
      ...game,
      last_played: launchTimestamp,
      launch_count: (game.launch_count || 0) + 1
    };
    let libraryChanged = false;

    const updatedLibrary = (Array.isArray(library) ? library : []).map((existingGame) => {
      const matchesGame = existingGame.name === game.name || (
        typeof existingGame.appid !== 'undefined'
        && typeof game.appid !== 'undefined'
        && String(existingGame.appid) === String(game.appid)
      );

      if (!matchesGame) {
        return existingGame;
      }

      libraryChanged = true;
      launchedGame = {
        ...existingGame,
        last_played: launchTimestamp,
        launch_count: (existingGame.launch_count || 0) + 1
      };

      return launchedGame;
    });

    return {
      launchedGame,
      updatedLibrary,
      libraryChanged
    };
  }

  static reconcileSessionAfterLaunch(launchedGame) {
    const currentSessions = readActiveGameSessions();
    const currentSession = currentSessions[launchedGame.name];
    const currentSessionStart = getActiveSessionStartTime(currentSession);
    const normalizedSessionEntry = createActiveSessionEntry(launchedGame);
    let startedNewSession = false;

    if (!currentSessionStart) {
      PlaytimeAutoLogger.startSession(
        launchedGame.name,
        normalizedSessionEntry.gameId,
        normalizedSessionEntry.metadata
      );
      startedNewSession = true;
    } else if (typeof currentSession === 'string') {
      currentSessions[launchedGame.name] = {
        ...normalizedSessionEntry,
        startTime: currentSessionStart
      };
      persistActiveGameSessions(currentSessions);
    } else {
      currentSessions[launchedGame.name] = mergeLaunchMetadata(currentSession, normalizedSessionEntry);
      persistActiveGameSessions(currentSessions);
    }

    return { startedNewSession };
  }

  static monitorLaunchedGame(launchedGame, onEndSession) {
    DiscordPresenceService.startGamePresence(launchedGame);
    GameProcessMonitor.stopMonitoringByGame(launchedGame.name);
    GameProcessMonitor.startMonitoring(launchedGame, {
      onGameClosed: (closedGame) => {
        DiscordPresenceService.stopGamePresence();
        DiscordPresenceService.setIdlePresence();
        if (typeof onEndSession === 'function') {
          onEndSession(closedGame.name);
        }
      },
      onMonitorTimeout: (timedOutGame, meta) => {
        console.warn(`⚠️ Monitor timeout for ${timedOutGame.name}${meta?.reason ? ` (${meta.reason})` : ''}`);
      }
    });
  }

  static trackLaunchSideEffects(startedNewSession, launchedGame, originalGame) {
    try {
      if (startedNewSession) {
        AchievementTracker.rewardGameLaunch(10);
        AchievementTracker.logUniqueGamePlay(launchedGame);
        AchievementTracker.logGameplayMood(launchedGame?.mood);
        (Array.isArray(launchedGame?.genres) ? launchedGame.genres : []).forEach((genre) => {
          AchievementTracker.logGameplayGenre(genre);
        });
        AchievementTracker.trackThemeUsage(launchedGame);
        if (launchedGame?.platform) AchievementTracker.trackPlatformUsage(launchedGame.platform);

        // Backlog milestones — check original game before last_played was updated
        if (originalGame) {
          if (AchievementTracker.checkDustOff(originalGame)) {
            AchievementTracker.trackBacklogMilestone('dust_off');
          }
          if (AchievementTracker.checkShelfDiver(originalGame)) {
            AchievementTracker.trackBacklogMilestone('shelf_diver');
          }
        }

        AchievementTracker.checkAndUnlockAchievements();
      }

      GamingIdentity.updateGamingIdentity();
    } catch (error) {
      console.error('Error tracking launch rewards:', error);
    }
  }

  static cleanupFailedLaunch(gameName, hadExistingSession) {
    if (hadExistingSession) {
      return;
    }

    const currentSessions = readActiveGameSessions();
    delete currentSessions[gameName];
    persistActiveGameSessions(currentSessions);
  }

  static endSession(gameName) {
    return PlaytimeAutoLogger.endSession(gameName);
  }

  static async launchGame({
    game,
    library,
    onLibraryUpdated,
    onLastPlayedGameUpdated,
    onEndSession
  }) {
    const { hadExistingSession } = this.prepareExistingSessionForLaunch(game);
    const result = await LauncherService.launchGame(game);

    if (!result?.success) {
      this.cleanupFailedLaunch(game.name, hadExistingSession);
      return {
        success: false,
        mode: result?.mode || 'unknown',
        message: result?.message || 'Failed to launch game.',
        result
      };
    }

    const launchTimestamp = Date.now();
    const { launchedGame, updatedLibrary, libraryChanged } = this.updateLibraryForLaunch(
      library,
      game,
      launchTimestamp
    );

    if (libraryChanged && typeof onLibraryUpdated === 'function') {
      onLibraryUpdated(updatedLibrary);
    }

    if (typeof onLastPlayedGameUpdated === 'function') {
      onLastPlayedGameUpdated(launchedGame);
    }

    const { startedNewSession } = this.reconcileSessionAfterLaunch(launchedGame);
    this.monitorLaunchedGame(launchedGame, onEndSession);
    this.trackLaunchSideEffects(startedNewSession, launchedGame, game);

    return {
      success: true,
      mode: result?.mode || 'unknown',
      message: result?.message || `Launched ${game.name}`,
      launchedGame,
      libraryChanged,
      startedNewSession,
      result
    };
  }
}
