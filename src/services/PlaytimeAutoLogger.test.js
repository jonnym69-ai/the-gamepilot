import { PlaytimeAutoLogger } from './PlaytimeAutoLogger';
import SessionRepository from './SessionRepository';
import { RollingAchievementsTracker } from './RollingAchievementsTracker';
import { UserBehaviorProfile } from './UserBehaviorProfile';
import { processSessionEnd } from './GamingIdentityEnhancements';

jest.mock('./RollingAchievementsTracker', () => ({
  RollingAchievementsTracker: {
    updatePlaytime: jest.fn(),
    incrementSession: jest.fn(),
    trackGamePlayed: jest.fn()
  }
}));

jest.mock('./UserBehaviorProfile', () => ({
  UserBehaviorProfile: {
    trackPassiveSession: jest.fn(),
    getProfile: jest.fn(() => ({ completionStats: {} })),
    trackSessionLength: jest.fn(),
    trackSelection: jest.fn(),
    trackCompletion: jest.fn(),
    saveProfile: jest.fn()
  }
}));

jest.mock('./GamingIdentityEnhancements', () => ({
  processSessionEnd: jest.fn()
}));

jest.mock('../constants/GenresMoods', () => ({
  getMoodForGame: jest.fn(() => 'Focused'),
  mapGameGenresToValid: jest.fn((genres) => genres || [])
}));

describe('PlaytimeAutoLogger session durability', () => {
  beforeEach(() => {
    localStorage.clear();
    SessionRepository.cache = { activeSessions: {}, sessionHistory: [] };
    SessionRepository.initialized = false;
    SessionRepository.initializing = null;
    jest.clearAllMocks();
  });

  test('creates a stable session ID and writes it to history', () => {
    const session = PlaytimeAutoLogger.startSession('Test Game', 'game-1', { genres: ['Strategy'] });
    const startedAt = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const active = PlaytimeAutoLogger.getActiveSessions();
    active['Test Game'].startTime = startedAt;
    active['Test Game'].lastConfirmedAt = startedAt;
    SessionRepository.saveActiveSessions(active);

    const result = PlaytimeAutoLogger.endSession('Test Game');
    const history = PlaytimeAutoLogger.getSessionHistory();

    expect(session.sessionId).toBeTruthy();
    expect(result.sessionId).toBe(session.sessionId);
    expect(history).toHaveLength(1);
    expect(history[0].sessionId).toBe(session.sessionId);
  });

  test('does not settle the same session twice', () => {
    const startTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const session = {
      startTime,
      lastConfirmedAt: new Date().toISOString(),
      gameId: 'game-1',
      sessionId: 'stable-session-id',
      metadata: {},
      paused: false
    };
    SessionRepository.saveActiveSessions({ 'Test Game': session });

    expect(PlaytimeAutoLogger.endSession('Test Game')).not.toBeNull();
    SessionRepository.saveActiveSessions({ 'Test Game': session });
    expect(PlaytimeAutoLogger.endSession('Test Game')).toBeNull();

    expect(PlaytimeAutoLogger.getSessionHistory()).toHaveLength(1);
    expect(RollingAchievementsTracker.incrementSession).toHaveBeenCalledTimes(1);
    expect(UserBehaviorProfile.trackPassiveSession).toHaveBeenCalledTimes(1);
    expect(processSessionEnd).toHaveBeenCalledTimes(1);
  });

  test('recovers an interrupted session at its last confirmed heartbeat', () => {
    const startTime = new Date(Date.now() - 60 * 60 * 1000);
    const lastConfirmedAt = new Date(startTime.getTime() + 5 * 60 * 1000);
    SessionRepository.saveActiveSessions({
      'Interrupted Game': {
        startTime: startTime.toISOString(),
        lastConfirmedAt: lastConfirmedAt.toISOString(),
        gameId: 'game-2',
        sessionId: 'interrupted-session-id',
        metadata: {},
        paused: false
      }
    });

    const [result] = PlaytimeAutoLogger.recoverInterruptedSessions();

    expect(result.playtimeMinutes).toBe(5);
    expect(result.endTime).toBe(lastConfirmedAt.toISOString());
    expect(result.metadata.recoveredSession).toBe(true);
  });

  test('preserves histories longer than one thousand sessions', () => {
    const history = Array.from({ length: 1000 }, (_, index) => ({
      sessionId: `existing-${index}`,
      gameName: 'Archive Game',
      playtimeMinutes: 1,
      timestamp: new Date(2020, 0, 1, 0, index).toISOString()
    }));
    SessionRepository.replaceHistory(history);

    const written = PlaytimeAutoLogger.logSessionToHistory('New Game', 10, 'new-game', {
      sessionId: 'new-session',
      endTime: new Date().toISOString()
    });

    expect(written).toBe(true);
    expect(PlaytimeAutoLogger.getSessionHistory()).toHaveLength(1001);
  });
});
