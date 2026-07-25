import SessionRepository from './SessionRepository';
import StorageService from './StorageService';

describe('SessionRepository', () => {
  beforeEach(() => {
    localStorage.clear();
    SessionRepository.cache = { activeSessions: {}, sessionHistory: [] };
    SessionRepository.initialized = false;
    SessionRepository.initializing = null;
    jest.clearAllMocks();
  });

  test('getActiveSessions returns a clone of cached sessions', () => {
    SessionRepository.cache.activeSessions = {
      'Game A': { startTime: '2024-01-01T00:00:00.000Z', sessionId: 'a-1' }
    };

    const first = SessionRepository.getActiveSessions();
    const second = SessionRepository.getActiveSessions();

    expect(first).toEqual({
      'Game A': { startTime: '2024-01-01T00:00:00.000Z', sessionId: 'a-1' }
    });
    expect(first).not.toBe(second);
    expect(first['Game A']).not.toBe(second['Game A']);
  });

  test('getSessionHistory returns a clone of cached history', () => {
    SessionRepository.cache.sessionHistory = [
      { sessionId: 'h-1', gameName: 'Game A', playtimeMinutes: 10 }
    ];

    const first = SessionRepository.getSessionHistory();
    const second = SessionRepository.getSessionHistory();

    expect(first).toHaveLength(1);
    expect(first[0].sessionId).toBe('h-1');
    expect(first).not.toBe(second);
    expect(first[0]).not.toBe(second[0]);
  });

  test('saveActiveSessions updates cache and localStorage fallback', () => {
    const sessions = {
      'Game B': { startTime: '2024-02-01T00:00:00.000Z', sessionId: 'b-1' }
    };

    SessionRepository.saveActiveSessions(sessions);

    expect(SessionRepository.cache.activeSessions).toEqual(sessions);
    const stored = StorageService.get('activeGameSessions', {});
    expect(stored).toEqual(sessions);
  });

  test('settleSession appends to history and updates active sessions', () => {
    const entry = {
      sessionId: 'settle-1',
      gameName: 'Game C',
      playtimeMinutes: 30,
      timestamp: '2024-03-01T00:00:00.000Z'
    };
    const remainingSessions = {
      'Game D': { startTime: '2024-03-01T01:00:00.000Z', sessionId: 'd-1' }
    };

    const result = SessionRepository.settleSession(entry, remainingSessions);

    expect(result).toBe(true);
    expect(SessionRepository.getSessionHistory()).toHaveLength(1);
    expect(SessionRepository.getSessionHistory()[0].sessionId).toBe('settle-1');
    expect(SessionRepository.getActiveSessions()).toEqual(remainingSessions);
  });

  test('settleSession rejects duplicate sessionId', () => {
    const entry = {
      sessionId: 'dup-1',
      gameName: 'Game E',
      playtimeMinutes: 5,
      timestamp: '2024-04-01T00:00:00.000Z'
    };

    SessionRepository.settleSession(entry, {});
    const result = SessionRepository.settleSession(entry, {});

    expect(result).toBe(false);
    expect(SessionRepository.getSessionHistory()).toHaveLength(1);
  });

  test('replaceHistory overwrites entire history', () => {
    SessionRepository.cache.sessionHistory = [
      { sessionId: 'old-1', gameName: 'Old Game', playtimeMinutes: 1 }
    ];

    const newHistory = [
      { sessionId: 'new-1', gameName: 'New Game', playtimeMinutes: 10 },
      { sessionId: 'new-2', gameName: 'New Game 2', playtimeMinutes: 20 }
    ];

    SessionRepository.replaceHistory(newHistory);

    expect(SessionRepository.getSessionHistory()).toHaveLength(2);
    expect(SessionRepository.getSessionHistory()[0].sessionId).toBe('new-1');
    expect(SessionRepository.getSessionHistory()[1].sessionId).toBe('new-2');
  });

  test('clear wipes cache and localStorage fallback', () => {
    SessionRepository.cache.activeSessions = {
      'Game F': { startTime: '2024-05-01T00:00:00.000Z', sessionId: 'f-1' }
    };
    SessionRepository.cache.sessionHistory = [
      { sessionId: 'h-2', gameName: 'Game F', playtimeMinutes: 15 }
    ];

    SessionRepository.clear();

    expect(SessionRepository.getActiveSessions()).toEqual({});
    expect(SessionRepository.getSessionHistory()).toEqual([]);
    expect(StorageService.get('activeGameSessions', null)).toBeNull();
    expect(StorageService.get('sessionHistory', null)).toBeNull();
  });

  test('getSnapshot returns a clone of both cache slices', () => {
    SessionRepository.cache.activeSessions = {
      'Game G': { startTime: '2024-06-01T00:00:00.000Z', sessionId: 'g-1' }
    };
    SessionRepository.cache.sessionHistory = [
      { sessionId: 'snap-1', gameName: 'Game G', playtimeMinutes: 45 }
    ];

    const snapshot = SessionRepository.getSnapshot();

    expect(snapshot.activeSessions).toEqual({
      'Game G': { startTime: '2024-06-01T00:00:00.000Z', sessionId: 'g-1' }
    });
    expect(snapshot.sessionHistory).toHaveLength(1);
    expect(snapshot.activeSessions).not.toBe(SessionRepository.cache.activeSessions);
    expect(snapshot.sessionHistory).not.toBe(SessionRepository.cache.sessionHistory);
  });

  test('initialize with no Electron API uses localStorage fallback', async () => {
    SessionRepository.cache.activeSessions = {
      'Legacy Game': { startTime: '2024-01-01T00:00:00.000Z', sessionId: 'legacy-1' }
    };
    SessionRepository.cache.sessionHistory = [
      { sessionId: 'legacy-h-1', gameName: 'Legacy Game', playtimeMinutes: 10 }
    ];

    const snapshot = await SessionRepository.initialize();

    expect(SessionRepository.initialized).toBe(true);
    expect(snapshot.activeSessions).toHaveProperty('Legacy Game');
    expect(snapshot.sessionHistory).toHaveLength(1);
  });

  test('initialize is idempotent', async () => {
    const first = await SessionRepository.initialize();
    const second = await SessionRepository.initialize();

    expect(first).toEqual(second);
    expect(SessionRepository.initialized).toBe(true);
  });
});
