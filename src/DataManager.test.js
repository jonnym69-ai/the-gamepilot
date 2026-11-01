import { DataManager } from './DataManager';
import StorageService from './services/StorageService';
import SessionRepository from './services/SessionRepository';

const resetRepository = () => {
  SessionRepository.cache = { activeSessions: {}, sessionHistory: [] };
  SessionRepository.initialized = false;
  SessionRepository.initializing = null;
};

beforeEach(() => {
  localStorage.clear();
  resetRepository();
  window.electronAPI = {
    sessionStoreReplaceHistory: jest.fn().mockResolvedValue(true),
    sessionStoreSaveActive: jest.fn().mockResolvedValue(true),
    sessionStoreClear: jest.fn().mockResolvedValue(true),
  };
});

afterEach(() => {
  delete window.electronAPI;
  localStorage.clear();
  resetRepository();
});

describe('exportUserData', () => {
  test('exports every prefixed key verbatim, including keys added after the original list', () => {
    StorageService.set('gameLibrary', [{ name: 'Zomboid' }]);
    StorageService.set('wishlistItemsV1', [{ key: 'hades', name: 'Hades' }]);
    StorageService.set('currentEraHistory', [{ era: 'Survival' }]);
    StorageService.setString('gamerTitle', 'Zombie Survivor');
    StorageService.set('brandNewFutureFeatureV1', { enabled: true });

    const backup = DataManager.exportUserData();

    expect(backup.version).toBe('3.0');
    expect(backup.data.gameLibrary).toBe('[{"name":"Zomboid"}]');
    expect(backup.data.wishlistItemsV1).toBe('[{"key":"hades","name":"Hades"}]');
    expect(backup.data.currentEraHistory).toBe('[{"era":"Survival"}]');
    expect(backup.data.gamerTitle).toBe('Zombie Survivor');
    expect(backup.data.brandNewFutureFeatureV1).toBe('{"enabled":true}');
  });

  test('excludes regenerable caches and in-flight session state', () => {
    StorageService.set('gameLibrary', [{ name: 'Zomboid' }]);
    StorageService.set('igdbArtworkCacheV1', { zomboid: 'url' });
    StorageService.set('steamProfileCacheV1', { profile: {} });
    StorageService.set('libraryCache', { games: [] });
    StorageService.set('activeGameSessions', { Zomboid: { startTime: 1 } });

    const backup = DataManager.exportUserData();

    expect(backup.data).not.toHaveProperty('igdbArtworkCacheV1');
    expect(backup.data).not.toHaveProperty('steamProfileCacheV1');
    expect(backup.data).not.toHaveProperty('libraryCache');
    expect(backup.data).not.toHaveProperty('activeGameSessions');
    expect(backup.data).toHaveProperty('gameLibrary');
  });
});

describe('importUserData', () => {
  test('round-trips an export verbatim, preserving raw-string and JSON keys', async () => {
    StorageService.set('gameLibrary', [{ name: 'Zomboid' }]);
    StorageService.set('wishlistItemsV1', [{ key: 'hades' }]);
    StorageService.setString('gamerTitle', 'Zombie Survivor');
    const backup = DataManager.exportUserData();

    localStorage.clear();
    const result = await DataManager.importUserData(JSON.stringify(backup));

    expect(result.success).toBe(true);
    expect(StorageService.getString('gamerTitle')).toBe('Zombie Survivor');
    expect(StorageService.get('gameLibrary')).toEqual([{ name: 'Zomboid' }]);
    expect(StorageService.get('wishlistItemsV1')).toEqual([{ key: 'hades' }]);
  });

  test('restores session history into SQLite via the repository path', async () => {
    const history = [{ sessionId: 's1', gameName: 'Zomboid', playtimeMinutes: 90 }];
    const backup = { version: '3.0', data: { sessionHistory: JSON.stringify(history) } };

    const result = await DataManager.importUserData(backup);

    expect(result.success).toBe(true);
    expect(window.electronAPI.sessionStoreReplaceHistory).toHaveBeenCalledWith(history, { force: true });
    expect(SessionRepository.getSessionHistory()).toEqual(history);
  });

  test('does not resurrect stale active sessions from a backup', async () => {
    const backup = {
      version: '3.0',
      data: {
        activeGameSessions: JSON.stringify({ Zomboid: { startTime: 1 } }),
        gameLibrary: '[]',
      },
    };

    await DataManager.importUserData(backup);

    expect(StorageService.get('activeGameSessions', 'missing')).toEqual({});
    expect(window.electronAPI.sessionStoreSaveActive).toHaveBeenCalledWith({});
  });

  test('still imports legacy v2 payloads with parsed values and old key names', async () => {
    const legacy = {
      version: '2.0',
      data: {
        library: { games: [{ name: 'Portal' }] },
        achievements: ['first-launch'],
        gamerTitle: 'Casual Gamer',
      },
    };

    const result = await DataManager.importUserData(legacy);

    expect(result.success).toBe(true);
    expect(StorageService.get('gameLibrary')).toEqual([{ name: 'Portal' }]);
    expect(StorageService.get('unlockedAchievements')).toEqual(['first-launch']);
    expect(StorageService.getString('gamerTitle')).toBe('Casual Gamer');
  });

  test('rejects files with no recognizable data', async () => {
    const result = await DataManager.importUserData({ totally: 'unrelated' });
    expect(result.success).toBe(false);
    expect(result.message).toContain('recognized GamePilot data');
  });
});

describe('validateBackupFile', () => {
  test('accepts v3 exports whose JSON values are raw strings', () => {
    StorageService.set('gameLibrary', [{ name: 'Zomboid' }]);
    const backup = DataManager.exportUserData();
    const validation = DataManager.validateBackupFile(JSON.stringify(backup));
    expect(validation.valid).toBe(true);
  });

  test('rejects a malformed gameLibrary', () => {
    const bad = { version: '3.0', data: { gameLibrary: '{"not":"an array"}' } };
    const validation = DataManager.validateBackupFile(bad);
    expect(validation.valid).toBe(false);
  });
});

describe('clearAllUserData', () => {
  test('wipes every prefixed key and clears the SQLite session databases', async () => {
    StorageService.set('gameLibrary', [{ name: 'Zomboid' }]);
    StorageService.set('sessionHistory', [{ sessionId: 's1' }]);
    StorageService.set('wishlistItemsV1', []);
    StorageService.setString('gamerTitle', 'Survivor');

    const result = await DataManager.clearAllUserData();

    expect(result.success).toBe(true);
    expect(StorageService.keys()).toEqual([]);
    expect(window.electronAPI.sessionStoreClear).toHaveBeenCalled();
  });
});

describe('credential protection', () => {
  const creds = {
    itchApiKeyV1: 'dummy-itch-key',
    retroAchievementsApiKey: 'dummy-ra-key',
    discordWebhookUrl: 'https://discord.invalid/dummy-webhook',
  };
  const seedCreds = () => Object.entries(creds).forEach(([key, value]) => StorageService.setString(key, value));
  const expectLocalCreds = () =>
    Object.entries(creds).forEach(([key, value]) => expect(StorageService.getString(key)).toBe(value));

  test('export never includes locally stored credentials', async () => {
    seedCreds();
    StorageService.set('gameLibrary', [{ name: 'Zomboid' }]);
    const backup = DataManager.exportUserData();
    expect(backup.data).not.toHaveProperty('itchApiKeyV1');
    expect(backup.data).not.toHaveProperty('retroAchievementsApiKey');
    expect(backup.data).not.toHaveProperty('discordWebhookUrl');
    expect(JSON.stringify(backup)).not.toContain('dummy-itch-key');
    const { default: BackupService } = await import('./services/BackupService');
    const legacy = BackupService.createBackup();
    expect(legacy.data).not.toHaveProperty('itchApiKeyV1');
    expect(legacy.data).not.toHaveProperty('discordWebhookUrl');
    expect(JSON.stringify(legacy.data)).not.toContain('dummy-ra-key');
  });

  test('a malicious backup cannot replace locally configured credentials', async () => {
    seedCreds();
    const hostile = {
      version: '3.0',
      data: {
        gameLibrary: '[]',
        itchApiKeyV1: 'attacker-itch',
        retroAchievementsApiKey: 'attacker-ra',
        discordWebhookUrl: 'https://attacker.invalid/hook',
      },
    };
    const result = await DataManager.importUserData(JSON.stringify(hostile));
    expect(result.success).toBe(true);
    expectLocalCreds();
  });

  test('BackupService restore skips credential keys and overwrite preserves them', async () => {
    const { default: BackupService } = await import('./services/BackupService');
    seedCreds();
    StorageService.setString('theme', 'dark');
    const backup = {
      version: '1.0',
      type: 'gamepilot-backup',
      data: {
        theme: 'light',
        itchApiKeyV1: 'attacker-itch',
        discordWebhookUrl: 'https://attacker.invalid/hook',
      },
    };
    const result = BackupService.restoreBackup(backup, { overwrite: true });
    expect(result.success).toBe(true);
    expect(StorageService.get('theme')).toBe('light');
    expectLocalCreds();
  });
});
