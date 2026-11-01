jest.mock('electron', () => ({}));

const { registerIpcHandlers, __test } = require('../../electron/installWatcher');
const { isInstalledSteamManifest, isInstalledEpicManifest, looksInstalledGogOutput, sanitizeEntry, entryKey } = __test;

describe('manifest/install-marker helpers', () => {
  test('steam appmanifest is installed only when StateFlags is 4', () => {
    expect(isInstalledSteamManifest('"StateFlags"		"4"')).toBe(true);
    expect(isInstalledSteamManifest('"StateFlags"		"1026"')).toBe(false);
    expect(isInstalledSteamManifest('')).toBe(false);
  });

  test('epic manifest is installed unless bIsIncomplete is true', () => {
    expect(isInstalledEpicManifest({ AppName: 'Fortnite' })).toBe(true);
    expect(isInstalledEpicManifest({ AppName: 'Fortnite', bIsIncomplete: false })).toBe(true);
    expect(isInstalledEpicManifest({ AppName: 'Fortnite', bIsIncomplete: true })).toBe(false);
    expect(isInstalledEpicManifest(null)).toBe(false);
  });

  test('gog reg output counts as installed when it contains game values', () => {
    expect(looksInstalledGogOutput('HKEY_...\n    path    REG_SZ    C:\\GOG Games\\Foo')).toBe(true);
    expect(looksInstalledGogOutput('    gameID    REG_SZ    1455615258')).toBe(true);
    expect(looksInstalledGogOutput('')).toBe(false);
    expect(looksInstalledGogOutput('ERROR: The system was unable to find the specified registry key')).toBe(false);
  });
});

describe('sanitizeEntry', () => {
  test('accepts well-formed entries per source', () => {
    expect(sanitizeEntry({ source: 'steam', appid: '440', name: 'TF2' })).toMatchObject({
      source: 'steam',
      appid: '440',
    });
    expect(
      sanitizeEntry({ source: 'epic', appName: 'Fortnite', catalogItemId: 'abc_123', name: 'Fortnite' })
    ).toMatchObject({ source: 'epic', appName: 'Fortnite' });
    expect(sanitizeEntry({ source: 'gog', gogProductId: '1455615258', name: 'FOLON' })).toMatchObject({
      source: 'gog',
      gogProductId: '1455615258',
    });
  });

  test('rejects malformed or unsupported entries', () => {
    expect(sanitizeEntry(null)).toBeNull();
    expect(sanitizeEntry({ source: 'uplay', appid: '1' })).toBeNull();
    expect(sanitizeEntry({ source: 'steam', appid: '0' })).toBeNull();
    expect(sanitizeEntry({ source: 'steam', appid: 'not-a-number' })).toBeNull();
    expect(sanitizeEntry({ source: 'steam', appid: '99999999999' })).toBeNull();
    expect(sanitizeEntry({ source: 'epic', appName: 'bad name!' })).toBeNull();
    expect(sanitizeEntry({ source: 'epic', appName: 'x' })).toBeNull();
    expect(sanitizeEntry({ source: 'gog', gogProductId: 'abc' })).toBeNull();
    expect(sanitizeEntry({ source: 'steam' })).toBeNull();
  });

  test('drops non-https images and stamps markedAt', () => {
    // eslint-disable-next-line no-script-url -- fixture verifying non-https rejection
    const entry = sanitizeEntry({ source: 'steam', appid: '440', image: 'javascript:alert(1)' });
    expect(entry.image).toBeNull();
    expect(typeof entry.markedAt).toBe('number');
  });
});

describe('install-watch-set handler', () => {
  let handlers;
  const register = () => {
    handlers = {};
    registerIpcHandlers(
      {
        handle: (name, callback) => {
          handlers[name] = callback;
        },
      },
      { getMainWindow: () => null }
    );
  };

  test('sanitizes, dedupes by key, and reports the watch count', async () => {
    register();
    const result = await handlers['install-watch-set'](null, [
      { source: 'steam', appid: '440', name: 'TF2' },
      { source: 'steam', appid: '440', name: 'TF2 dup' },
      { source: 'uplay', appid: '1' },
      { source: 'epic', appName: 'Fortnite' },
      'garbage',
    ]);
    expect(result).toEqual({ ok: true, watching: 2 });
  });

  test('handles non-array input gracefully', async () => {
    register();
    expect(await handlers['install-watch-set'](null, undefined)).toEqual({ ok: true, watching: 0 });
  });

  test('entryKey matches renderer PendingInstallService keys', () => {
    expect(entryKey({ source: 'steam', appid: '440' })).toBe('steam:440');
    expect(entryKey({ source: 'epic', appName: 'Fortnite' })).toBe('epic:Fortnite');
    expect(entryKey({ source: 'gog', gogProductId: '123' })).toBe('gog:123');
  });
});
