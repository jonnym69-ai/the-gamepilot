import { renderHook, act, waitFor } from '@testing-library/react';
import useSessionLifecycle from './useSessionLifecycle';
import { PlaytimeAutoLogger } from '../services/PlaytimeAutoLogger';

jest.mock('../components/Toast', () => ({
  useToast: () => ({ info: jest.fn(), success: jest.fn() }),
}));

jest.mock('../services/PlaytimeAutoLogger', () => ({
  PlaytimeAutoLogger: {
    endSession: jest.fn(),
    startSession: jest.fn(),
    getActiveSessions: jest.fn(() => ({})),
    confirmActiveSessions: jest.fn(() => ({})),
    saveActiveSessions: jest.fn(),
    getSessionHistory: jest.fn(() => []),
  },
}));

jest.mock('../services/SessionRepository', () => ({
  __esModule: true,
  default: {
    initialize: jest.fn(() => Promise.resolve()),
    getActiveSessions: jest.fn(() => ({})),
    saveActiveSessions: jest.fn(),
    settleSession: jest.fn(() => true),
    getSessionHistory: jest.fn(() => []),
  },
}));

const buildDeps = () => ({
  library: [{ name: 'Test Game', appid: 'tg1', genres: ['RPG'] }],
  setLibrary: jest.fn(),
  saveLibrary: jest.fn(),
  setLastPlayedGame: jest.fn(),
  minimizeOnLaunch: false,
  hasLoadedLibrary: true,
});

describe('useSessionLifecycle session reporting', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('session-ended events report the recorded playtime and session id', async () => {
    PlaytimeAutoLogger.endSession.mockReturnValue({
      playtimeMinutes: 90,
      endTime: Date.now(),
      sessionId: 's1',
    });

    const received = [];
    const listener = (event) => received.push(event.detail);
    window.addEventListener('gamepilot:session-ended', listener);
    try {
      const { result } = renderHook(() => useSessionLifecycle(buildDeps()));
      await waitFor(() => expect(PlaytimeAutoLogger.getActiveSessions).toHaveBeenCalled());

      act(() => {
        result.current.handleEndSession('Test Game');
      });

      expect(received).toHaveLength(1);
      expect(received[0].gameName).toBe('Test Game');
      expect(received[0].playtimeMinutes).toBe(90);
      expect(received[0].sessionId).toBe('s1');
      expect(received[0].xpEarned).toBeUndefined();
    } finally {
      window.removeEventListener('gamepilot:session-ended', listener);
    }
  });

  test('failed session ends report no event', async () => {
    PlaytimeAutoLogger.endSession.mockReturnValue(null);
    const listener = jest.fn();
    window.addEventListener('gamepilot:session-ended', listener);
    try {
      const { result } = renderHook(() => useSessionLifecycle(buildDeps()));
      await waitFor(() => expect(PlaytimeAutoLogger.getActiveSessions).toHaveBeenCalled());
      act(() => {
        expect(result.current.handleEndSession('Missing Game')).toBeNull();
      });
      expect(listener).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('gamepilot:session-ended', listener);
    }
  });
});
