import React, { useEffect, useState } from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { GameProcessMonitor } from '../GameProcessMonitor';
import { useSessionLifecycle } from '../hooks/useSessionLifecycle';
import { GameLaunchCoordinatorService } from './GameLaunchCoordinatorService';
import { LauncherService } from './LauncherService';
import { PlaytimeAutoLogger } from './PlaytimeAutoLogger';

jest.mock('../AchievementSystem', () => ({
  AchievementTracker: {
    rewardGameLaunch: jest.fn(),
    trackPlatformUsage: jest.fn(),
    trackGenreUsage: jest.fn(),
    logUniqueGamePlay: jest.fn(),
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
    startMonitoring: jest.fn(),
    stopMonitoringByGame: jest.fn(),
    stopAllMonitors: jest.fn()
  }
}));

jest.mock('./LauncherService', () => ({
  LauncherService: {
    launchGame: jest.fn()
  }
}));

jest.mock('./PlaytimeAutoLogger', () => ({
  PlaytimeAutoLogger: {
    startSession: jest.fn(),
    endSession: jest.fn(),
    autoSyncOnSessionEnd: jest.fn()
  }
}));

const trackedGame = {
  name: 'Halo Infinite',
  appid: '1240440',
  platform: 'Steam',
  genres: ['Shooter'],
  launch_count: 1,
  time_played: 0,
  playtime: {
    total: 0,
    daily: {},
    weekly: {},
    monthly: {},
    yearly: {}
  }
};

const HookHarness = ({ onSnapshot }) => {
  const [library, setLibrary] = useState([trackedGame]);
  const [lastPlayedGame, setLastPlayedGame] = useState(null);

  const saveLibrary = (updatedLibrary) => {
    localStorage.setItem('gameLibrary', JSON.stringify(updatedLibrary));
  };

  const { endSession } = useSessionLifecycle({
    library,
    setLibrary,
    setLastPlayedGame,
    saveLibrary
  });

  useEffect(() => {
    onSnapshot({
      endSession,
      library,
      lastPlayedGame,
      setLibrary
    });
  }, [endSession, library, lastPlayedGame, onSnapshot]);

  return null;
};

describe('Launch -> monitor close -> session end integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    PlaytimeAutoLogger.startSession.mockImplementation((gameName, gameId, metadata) => {
      const sessions = JSON.parse(localStorage.getItem('activeGameSessions') || '{}');
      sessions[gameName] = {
        startTime: '2024-01-01T00:00:00.000Z',
        gameId,
        metadata,
        paused: false
      };
      localStorage.setItem('activeGameSessions', JSON.stringify(sessions));
      return sessions[gameName];
    });

    PlaytimeAutoLogger.endSession.mockImplementation((gameName) => {
      const sessions = JSON.parse(localStorage.getItem('activeGameSessions') || '{}');
      const currentSession = sessions[gameName];
      delete sessions[gameName];
      localStorage.setItem('activeGameSessions', JSON.stringify(sessions));

      return {
        gameName,
        gameId: currentSession?.gameId || trackedGame.appid,
        playtimeMinutes: 30,
        startTime: currentSession?.startTime || '2024-01-01T00:00:00.000Z',
        endTime: '2024-01-01T00:30:00.000Z',
        metadata: currentSession?.metadata || {
          platform: 'Steam',
          genres: ['Shooter']
        }
      };
    });

    LauncherService.launchGame.mockResolvedValue({
      success: true,
      message: 'Launch successful'
    });
  });

  test('persists updated library stats after monitor reports game closed', async () => {
    let snapshot;
    let monitorCallbacks;

    GameProcessMonitor.startMonitoring.mockImplementation((_game, callbacks) => {
      monitorCallbacks = callbacks;
      return 'monitor-id';
    });

    render(<HookHarness onSnapshot={(nextSnapshot) => { snapshot = nextSnapshot; }} />);

    await waitFor(() => {
      expect(snapshot?.library?.length).toBe(1);
    });

    await act(async () => {
      await GameLaunchCoordinatorService.launchGame({
        game: trackedGame,
        library: snapshot.library,
        onLibraryUpdated: snapshot.setLibrary,
        onLastPlayedGameUpdated: jest.fn(),
        onEndSession: (gameName) => snapshot.endSession(gameName)
      });
    });

    await waitFor(() => {
      expect(snapshot.library[0].launch_count).toBe(2);
    });

    expect(typeof monitorCallbacks?.onGameClosed).toBe('function');
    await act(async () => {
      monitorCallbacks.onGameClosed({ name: trackedGame.name });
    });

    await waitFor(() => {
      const persistedLibrary = JSON.parse(localStorage.getItem('gameLibrary') || '[]');
      expect(persistedLibrary[0].time_played).toBe(30);
    });

    await waitFor(() => {
      const persistedLibrary = JSON.parse(localStorage.getItem('gameLibrary') || '[]');
      expect(persistedLibrary[0].playtime.total).toBe(30);
    });

    const activeSessions = JSON.parse(localStorage.getItem('activeGameSessions') || '{}');
    expect(activeSessions[trackedGame.name]).toBeUndefined();
    expect(PlaytimeAutoLogger.endSession).toHaveBeenCalledWith(trackedGame.name);
  });
});
