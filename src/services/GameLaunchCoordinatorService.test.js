import { AchievementTracker } from '../AchievementSystem';
import { GamingIdentity } from '../GamingIdentity';
import { GameProcessMonitor } from '../GameProcessMonitor';
import { GameLaunchCoordinatorService } from './GameLaunchCoordinatorService';
import {
  createActiveSessionEntry,
  getActiveSessionStartTime,
  persistActiveGameSessions,
  readActiveGameSessions
} from './ActiveSessionService';
import { LauncherService } from './LauncherService';
import { PlaytimeAutoLogger } from './PlaytimeAutoLogger';

jest.mock('../AchievementSystem', () => ({
  AchievementTracker: {
    rewardGameLaunch: jest.fn(),
    logUniqueGamePlay: jest.fn(),
    logGameplayMood: jest.fn(),
    logGameplayGenre: jest.fn(),
    trackPlatformUsage: jest.fn(),
    trackThemeUsage: jest.fn(),
    checkDustOff: jest.fn(),
    checkShelfDiver: jest.fn(),
    trackBacklogMilestone: jest.fn(),
    checkAndUnlockAchievements: jest.fn()
  }
}));

jest.mock('../GamingIdentity', () => ({
  GamingIdentity: {
    updateGamingIdentity: jest.fn()
  }
}));

jest.mock('../GameProcessMonitor', () => ({
  GameProcessMonitor: {
    stopMonitoringByGame: jest.fn(),
    startMonitoring: jest.fn()
  }
}));

jest.mock('./ActiveSessionService', () => ({
  createActiveSessionEntry: jest.fn(),
  getActiveSessionStartTime: jest.fn(),
  persistActiveGameSessions: jest.fn(),
  readActiveGameSessions: jest.fn()
}));

jest.mock('./LauncherService', () => ({
  LauncherService: {
    launchGame: jest.fn()
  }
}));

jest.mock('./PlaytimeAutoLogger', () => ({
  PlaytimeAutoLogger: {
    startSession: jest.fn()
  }
}));

describe('GameLaunchCoordinatorService', () => {
  const game = {
    name: 'Halo Infinite',
    appid: '1240440',
    platform: 'Steam',
    genres: ['Shooter'],
    launch_count: 2
  };

  beforeEach(() => {
    jest.clearAllMocks();

    createActiveSessionEntry.mockImplementation((inputGame) => ({
      startTime: '2024-01-01T00:00:00.000Z',
      gameId: inputGame?.appid || inputGame?.name,
      metadata: {
        platform: inputGame?.platform || null,
        genres: inputGame?.genres || []
      },
      paused: false
    }));

    getActiveSessionStartTime.mockImplementation((entry) => {
      if (!entry) {
        return null;
      }
      if (typeof entry === 'string') {
        return entry;
      }
      return entry.startTime || null;
    });
  });

  test('launches game and performs full success orchestration with explicit endSession callback', async () => {
    const currentLibrary = [{ ...game, launch_count: 2 }];
    const onLibraryUpdated = jest.fn();
    const onLastPlayedGameUpdated = jest.fn();
    const onEndSession = jest.fn();

    readActiveGameSessions
      .mockReturnValueOnce({})
      .mockReturnValueOnce({});
    LauncherService.launchGame.mockResolvedValue({ success: true, message: 'Launched' });

    const result = await GameLaunchCoordinatorService.launchGame({
      game,
      library: currentLibrary,
      onLibraryUpdated,
      onLastPlayedGameUpdated,
      onEndSession
    });

    expect(result.success).toBe(true);
    expect(LauncherService.launchGame).toHaveBeenCalledWith(game);
    expect(onLibraryUpdated).toHaveBeenCalledTimes(1);
    expect(onLastPlayedGameUpdated).toHaveBeenCalledTimes(1);

    expect(PlaytimeAutoLogger.startSession).toHaveBeenCalledWith(
      'Halo Infinite',
      '1240440',
      expect.objectContaining({ platform: 'Steam' })
    );
    expect(AchievementTracker.rewardGameLaunch).toHaveBeenCalledWith(10);
    expect(GamingIdentity.updateGamingIdentity).toHaveBeenCalledTimes(1);

    expect(GameProcessMonitor.stopMonitoringByGame).toHaveBeenCalledWith('Halo Infinite');
    expect(GameProcessMonitor.startMonitoring).toHaveBeenCalledTimes(1);

    const monitorOptions = GameProcessMonitor.startMonitoring.mock.calls[0][1];
    monitorOptions.onGameClosed({ name: 'Halo Infinite' });
    expect(onEndSession).toHaveBeenCalledWith('Halo Infinite');
  });

  test('cleans up session on failed launch when no active session existed', async () => {
    readActiveGameSessions
      .mockReturnValueOnce({})
      .mockReturnValueOnce({
        'Halo Infinite': { startTime: '2024-01-01T00:00:00.000Z' },
        'Another Game': { startTime: '2024-01-01T01:00:00.000Z' }
      });
    LauncherService.launchGame.mockResolvedValue({ success: false, message: 'Launch failed' });

    const result = await GameLaunchCoordinatorService.launchGame({
      game,
      library: []
    });

    expect(result.success).toBe(false);
    expect(result.message).toBe('Launch failed');
    expect(persistActiveGameSessions).toHaveBeenCalledWith({
      'Another Game': { startTime: '2024-01-01T01:00:00.000Z' }
    });
    expect(GameProcessMonitor.startMonitoring).not.toHaveBeenCalled();
    expect(AchievementTracker.rewardGameLaunch).not.toHaveBeenCalled();
  });

  test('does not cleanup sessions on failed launch if an active session already existed', async () => {
    readActiveGameSessions.mockReturnValueOnce({
      'Halo Infinite': { startTime: '2024-01-01T00:00:00.000Z' }
    });
    LauncherService.launchGame.mockResolvedValue({ success: false, message: 'Launch failed' });

    const result = await GameLaunchCoordinatorService.launchGame({
      game,
      library: []
    });

    expect(result.success).toBe(false);
    expect(persistActiveGameSessions).not.toHaveBeenCalled();
  });

  test('migrates legacy string sessions during pre-launch preparation', () => {
    readActiveGameSessions.mockReturnValue({
      'Halo Infinite': '2024-01-01T00:00:00.000Z'
    });

    const result = GameLaunchCoordinatorService.prepareExistingSessionForLaunch(game);

    expect(result).toEqual({ hadExistingSession: true });
    expect(persistActiveGameSessions).toHaveBeenCalledWith({
      'Halo Infinite': {
        ...createActiveSessionEntry.mock.results[0].value,
        startTime: '2024-01-01T00:00:00.000Z'
      }
    });
  });
});
