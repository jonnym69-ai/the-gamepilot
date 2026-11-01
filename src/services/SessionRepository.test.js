import SessionRepository from './SessionRepository';
import StorageService from './StorageService';

describe('SessionRepository', () => {
  beforeEach(() => {
    localStorage.clear();
    delete window.electronAPI;
    SessionRepository.cache = { activeSessions: {}, sessionHistory: [] };
    SessionRepository.initialized = false;
    SessionRepository.initializing = null;
    jest.clearAllMocks();
  });

  test('getActiveSessions returns a clone of cached sessions', () => {
    SessionRepository.cache.activeSessions = {
      'Game A': { startTime: '2024-01-01T00:00:00.000Z', sessionId: 'a-1' },
    };

    const first = SessionRepository.getActiveSessions();
    const second = SessionRepository.getActiveSessions();

    expect(first).toEqual({
      'Game A': { startTime: '2024-01-01T00:00:00.000Z', sessionId: 'a-1' },
    });
    expect(first).not.toBe(second);
    expect(first['Game A']).not.toBe(second['Game A']);
  });

  test('getSessionHistory returns a clone of cached history', () => {
    SessionRepository.cache.sessionHistory = [{ sessionId: 'h-1', gameName: 'Game A', playtimeMinutes: 10 }];

    const first = SessionRepository.getSessionHistory();
    const second = SessionRepository.getSessionHistory();

    expect(first).toHaveLength(1);
    expect(first[0].sessionId).toBe('h-1');
    expect(first).not.toBe(second);
    expect(first[0]).not.toBe(second[0]);
  });

  test('saveActiveSessions updates cache and localStorage fallback', () => {
    const sessions = {
      'Game B': { startTime: '2024-02-01T00:00:00.000Z', sessionId: 'b-1' },
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
      timestamp: '2024-03-01T00:00:00.000Z',
    };
    const remainingSessions = {
      'Game D': { startTime: '2024-03-01T01:00:00.000Z', sessionId: 'd-1' },
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
      timestamp: '2024-04-01T00:00:00.000Z',
    };

    SessionRepository.settleSession(entry, {});
    const result = SessionRepository.settleSession(entry, {});

    expect(result).toBe(false);
    expect(SessionRepository.getSessionHistory()).toHaveLength(1);
  });

  test('replaceHistory overwrites entire history', () => {
    SessionRepository.cache.sessionHistory = [{ sessionId: 'old-1', gameName: 'Old Game', playtimeMinutes: 1 }];

    const newHistory = [
      { sessionId: 'new-1', gameName: 'New Game', playtimeMinutes: 10 },
      { sessionId: 'new-2', gameName: 'New Game 2', playtimeMinutes: 20 },
    ];

    SessionRepository.replaceHistory(newHistory);

    expect(SessionRepository.getSessionHistory()).toHaveLength(2);
    expect(SessionRepository.getSessionHistory()[0].sessionId).toBe('new-1');
    expect(SessionRepository.getSessionHistory()[1].sessionId).toBe('new-2');
  });

  test('updateSessionEntry merges a patch into a settled entry by sessionId', () => {
    SessionRepository.cache.sessionHistory = [
      { sessionId: 'note-1', gameName: 'Game H', playtimeMinutes: 25, endTime: '2024-07-01T20:00:00.000Z' },
      { sessionId: 'note-2', gameName: 'Game I', playtimeMinutes: 10, endTime: '2024-07-02T20:00:00.000Z' },
    ];

    const result = SessionRepository.updateSessionEntry('note-1', { note: 'finally beat the boss' });

    expect(result).toBe(true);
    const history = SessionRepository.getSessionHistory();
    expect(history[0].note).toBe('finally beat the boss');
    expect(history[1].note).toBeUndefined();
  });

  test('updateSessionEntry falls back to game + timestamp match for legacy entries', () => {
    SessionRepository.cache.sessionHistory = [
      { gameName: 'Game J', playtimeMinutes: 40, endTime: '2024-07-03T20:00:00.000Z' },
    ];

    const result = SessionRepository.updateSessionEntry(
      null,
      { note: 'cozy night' },
      {
        gameName: 'Game J',
        endTime: '2024-07-03T20:00:00.000Z',
      }
    );

    expect(result).toBe(true);
    expect(SessionRepository.getSessionHistory()[0].note).toBe('cozy night');
  });

  test('updateSessionEntry returns false when nothing matches', () => {
    SessionRepository.cache.sessionHistory = [{ sessionId: 'x-1', gameName: 'Game K', playtimeMinutes: 5 }];

    expect(SessionRepository.updateSessionEntry('missing', { note: 'nope' })).toBe(false);
    expect(SessionRepository.getSessionHistory()[0].note).toBeUndefined();
  });

  test('clear wipes cache and localStorage fallback', () => {
    SessionRepository.cache.activeSessions = {
      'Game F': { startTime: '2024-05-01T00:00:00.000Z', sessionId: 'f-1' },
    };
    SessionRepository.cache.sessionHistory = [{ sessionId: 'h-2', gameName: 'Game F', playtimeMinutes: 15 }];

    SessionRepository.clear();

    expect(SessionRepository.getActiveSessions()).toEqual({});
    expect(SessionRepository.getSessionHistory()).toEqual([]);
    expect(StorageService.get('activeGameSessions', null)).toBeNull();
    expect(StorageService.get('sessionHistory', null)).toBeNull();
  });

  test('getSnapshot returns a clone of both cache slices', () => {
    SessionRepository.cache.activeSessions = {
      'Game G': { startTime: '2024-06-01T00:00:00.000Z', sessionId: 'g-1' },
    };
    SessionRepository.cache.sessionHistory = [{ sessionId: 'snap-1', gameName: 'Game G', playtimeMinutes: 45 }];

    const snapshot = SessionRepository.getSnapshot();

    expect(snapshot.activeSessions).toEqual({
      'Game G': { startTime: '2024-06-01T00:00:00.000Z', sessionId: 'g-1' },
    });
    expect(snapshot.sessionHistory).toHaveLength(1);
    expect(snapshot.activeSessions).not.toBe(SessionRepository.cache.activeSessions);
    expect(snapshot.sessionHistory).not.toBe(SessionRepository.cache.sessionHistory);
  });

  test('initialize with no Electron API uses localStorage fallback', async () => {
    SessionRepository.cache.activeSessions = {
      'Legacy Game': { startTime: '2024-01-01T00:00:00.000Z', sessionId: 'legacy-1' },
    };
    SessionRepository.cache.sessionHistory = [
      { sessionId: 'legacy-h-1', gameName: 'Legacy Game', playtimeMinutes: 10 },
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

  describe('SQLite rejection resync', () => {
    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

    const diskSnapshot = {
      activeSessions: { 'Disk Game': { startTime: '2024-01-05T00:00:00.000Z', sessionId: 'disk-a' } },
      sessionHistory: [
        { sessionId: 'disk-1', gameName: 'Disk Game', playtimeMinutes: 42, endTime: '2024-01-05T01:00:00.000Z' },
      ],
    };

    test('replaceHistory re-syncs the cache from SQLite when the replace is rejected', async () => {
      window.electronAPI = {
        sessionStoreReplaceHistory: jest
          .fn()
          .mockResolvedValue({ ok: false, rejected: true, existing: 5, incoming: 1 }),
        sessionStoreGetSnapshot: jest.fn().mockResolvedValue(diskSnapshot),
      };

      SessionRepository.replaceHistory([{ sessionId: 'local-1', gameName: 'Local Game', playtimeMinutes: 1 }]);
      await flush();

      expect(window.electronAPI.sessionStoreGetSnapshot).toHaveBeenCalledTimes(1);
      expect(SessionRepository.getSessionHistory()).toEqual(diskSnapshot.sessionHistory);
      expect(StorageService.get('sessionHistory', [])).toEqual(diskSnapshot.sessionHistory);
    });

    test('updateSessionEntry re-syncs when its history write is rejected', async () => {
      window.electronAPI = {
        sessionStoreReplaceHistory: jest
          .fn()
          .mockResolvedValue({ ok: false, rejected: true, existing: 5, incoming: 1 }),
        sessionStoreGetSnapshot: jest.fn().mockResolvedValue(diskSnapshot),
      };
      SessionRepository.cache.sessionHistory = [
        { sessionId: 'note-1', gameName: 'Disk Game', playtimeMinutes: 10, endTime: '2024-01-05T01:00:00.000Z' },
      ];

      SessionRepository.updateSessionEntry('note-1', { note: 'hi' });
      await flush();

      expect(SessionRepository.getSessionHistory()).toEqual(diskSnapshot.sessionHistory);
    });

    test('replaceHistory forwards { force: true } and resolves once the write lands', async () => {
      window.electronAPI = {
        sessionStoreReplaceHistory: jest.fn().mockResolvedValue({ ok: true, existing: 5, incoming: 1 }),
      };
      const history = [{ sessionId: 'imp-1', gameName: 'Imported', playtimeMinutes: 20 }];

      const result = await SessionRepository.replaceHistory(history, { force: true });

      expect(result).toBe(true);
      expect(window.electronAPI.sessionStoreReplaceHistory).toHaveBeenCalledWith(history, { force: true });
      expect(SessionRepository.getSessionHistory()).toEqual(history);
    });

    test('replaceHistory defaults to { force: false } and resolves true without a bridge', async () => {
      window.electronAPI = {
        sessionStoreReplaceHistory: jest.fn().mockResolvedValue({ ok: true }),
      };
      await SessionRepository.replaceHistory([{ sessionId: 'd-1', gameName: 'G', playtimeMinutes: 1 }]);
      expect(window.electronAPI.sessionStoreReplaceHistory).toHaveBeenCalledWith(expect.any(Array), {
        force: false,
      });

      delete window.electronAPI;
      expect(SessionRepository.replaceHistory([{ sessionId: 'd-2', gameName: 'G2', playtimeMinutes: 1 }])).toBe(true);
    });

    test('sanitizeHistory re-syncs when its write is rejected', async () => {
      window.electronAPI = {
        sessionStoreReplaceHistory: jest
          .fn()
          .mockResolvedValue({ ok: false, rejected: true, existing: 20, incoming: 1 }),
        sessionStoreGetSnapshot: jest.fn().mockResolvedValue(diskSnapshot),
      };
      SessionRepository.cache.sessionHistory = [
        { sessionId: 'dup', gameName: 'Disk Game', playtimeMinutes: 10, endTime: '2024-01-05T01:00:00.000Z' },
        { gameName: 'Disk Game', playtimeMinutes: 10, endTime: '2024-01-05T01:00:00.000Z' },
      ];

      SessionRepository.sanitizeHistory();
      await flush();

      expect(window.electronAPI.sessionStoreGetSnapshot).toHaveBeenCalled();
      expect(SessionRepository.getSessionHistory()).toEqual(diskSnapshot.sessionHistory);
    });
  });

  describe('rolling backups', () => {
    test('listBackups forwards to the bridge and falls back to []', async () => {
      window.electronAPI = {
        sessionStoreListBackups: jest.fn().mockResolvedValue([
          {
            file: 'session-history-2024-01-01-startup.sqlite',
            path: '/x',
            sizeBytes: 10,
            createdAt: '2024-01-01',
            sessionCount: 3,
          },
        ]),
      };

      await expect(SessionRepository.listBackups()).resolves.toHaveLength(1);

      window.electronAPI = { sessionStoreListBackups: jest.fn().mockRejectedValue(new Error('nope')) };
      await expect(SessionRepository.listBackups()).resolves.toEqual([]);

      delete window.electronAPI;
      await expect(SessionRepository.listBackups()).resolves.toEqual([]);
    });

    test('restoreBackup adopts the returned snapshot and notifies listeners', async () => {
      const restored = {
        activeSessions: {},
        sessionHistory: [
          { sessionId: 'r-1', gameName: 'Restored', playtimeMinutes: 5, endTime: '2024-02-01T00:00:00.000Z' },
        ],
      };
      window.electronAPI = {
        sessionStoreRestoreBackup: jest.fn().mockResolvedValue({ ok: true, snapshot: restored }),
      };
      const listener = jest.fn();
      window.addEventListener('gamepilot:session-storage-ready', listener);

      const result = await SessionRepository.restoreBackup('session-history-2024-02-01-startup.sqlite');

      expect(result).toMatchObject({ ok: true });
      expect(window.electronAPI.sessionStoreRestoreBackup).toHaveBeenCalledWith(
        'session-history-2024-02-01-startup.sqlite'
      );
      expect(SessionRepository.getSessionHistory()).toEqual(restored.sessionHistory);
      expect(StorageService.get('sessionHistory', [])).toEqual(restored.sessionHistory);
      expect(listener).toHaveBeenCalledTimes(1);
      window.removeEventListener('gamepilot:session-storage-ready', listener);
    });
  });
});
