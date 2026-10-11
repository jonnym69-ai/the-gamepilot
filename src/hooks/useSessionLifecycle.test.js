import { renderHook, act, waitFor } from '@testing-library/react';
import useSessionLifecycle from './useSessionLifecycle';
import { PlaytimeAutoLogger } from '../services/PlaytimeAutoLogger';
import { HabitTrackerService } from '../services/HabitTrackerService';
import { AchievementTracker } from '../AchievementSystem';

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

describe('useSessionLifecycle XP reporting', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('session-ended events report the XP that session earned', async () => {
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
      const habitBefore = HabitTrackerService.getHabitXP().total;
      const bonusBefore = AchievementTracker.getBonusRewardStats().totalXP;

      act(() => {
        result.current.handleEndSession('Test Game');
      });

      const habitAfter = HabitTrackerService.getHabitXP().total;
      const bonusAfter = AchievementTracker.getBonusRewardStats().totalXP;
      expect(received).toHaveLength(1);
      expect(received[0].gameName).toBe('Test Game');
      // 90 minutes × 0.5 XP/min plus real habit/bonus deltas from the recorded session
      expect(received[0].xpEarned).toBe(45 + (habitAfter - habitBefore) + (bonusAfter - bonusBefore));
      expect(received[0].xpEarned).toBeGreaterThan(45);
    } finally {
      window.removeEventListener('gamepilot:session-ended', listener);
    }
  });

  test('failed session ends report no event and no XP', async () => {
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
