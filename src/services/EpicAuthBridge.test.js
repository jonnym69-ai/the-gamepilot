const fs = require('fs');
const os = require('os');
const path = require('path');

const mockTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gamepilot-epicauth-'));

jest.mock('electron', () => ({
  app: { getPath: jest.fn(() => mockTmpDir) },
  safeStorage: {
    isEncryptionAvailable: jest.fn(() => true),
    encryptString: jest.fn((value) => Buffer.from(`enc:${value}`, 'utf8')),
    decryptString: jest.fn((buffer) => buffer.toString('utf8').replace(/^enc:/, '')),
  },
  BrowserWindow: { fromWebContents: jest.fn(() => null) },
  shell: { openExternal: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('../../electron/net', () => ({ httpsRequest: jest.fn() }));

let handlers;
let httpsRequest;
let shell;

const storeToken = (refreshToken = 'REFRESH1', extra = {}) => {
  fs.writeFileSync(
    path.join(mockTmpDir, 'epic-account.json'),
    JSON.stringify({
      v: 1,
      token: Buffer.from(`enc:${refreshToken}`, 'utf8').toString('base64'),
      accountId: 'acct-1',
      displayName: 'Pilot01',
      ...extra,
    })
  );
};

beforeEach(() => {
  // Fresh module each test: the access-token cache is module-level state.
  jest.resetModules();
  try {
    fs.unlinkSync(path.join(mockTmpDir, 'epic-account.json'));
  } catch {}
  httpsRequest = require('../../electron/net').httpsRequest;
  httpsRequest.mockReset();
  shell = require('electron').shell;
  handlers = {};
  require('../../electron/epicAuth').registerIpcHandlers({
    handle: (name, callback) => {
      handlers[name] = callback;
    },
  });
});

test('auth status reports unlinked when no session file exists', async () => {
  expect(await handlers['epic-auth-status']()).toEqual({ ok: true, linked: false });
});

test('auth status reports the stored account without leaking the token', async () => {
  storeToken();
  const status = await handlers['epic-auth-status']();
  expect(status).toEqual({ ok: true, linked: true, accountId: 'acct-1', displayName: 'Pilot01' });
  expect(JSON.stringify(status)).not.toContain('REFRESH1');
});

test('disconnect removes the stored session', async () => {
  storeToken();
  await handlers['epic-auth-disconnect']();
  expect(fs.existsSync(path.join(mockTmpDir, 'epic-account.json'))).toBe(false);
  expect(await handlers['epic-auth-status']()).toEqual({ ok: true, linked: false });
});

test('owned library refreshes the token, pages results and filters non-game records', async () => {
  storeToken();
  httpsRequest
    .mockResolvedValueOnce({
      status: 200,
      body: JSON.stringify({ access_token: 'AT-1', expires_in: 7200, refresh_token: 'REFRESH2' }),
    })
    .mockResolvedValueOnce({
      status: 200,
      body: JSON.stringify({
        records: [
          {
            appName: 'GameOne',
            catalogItemId: 'cid-1',
            categories: [{ path: 'games/edition/base' }],
            metadata: { title: 'Game One', keyImages: [{ type: 'DieselStoreFrontTall', url: 'https://img/1' }] },
          },
          {
            appName: 'UE_5_3',
            categories: [{ path: 'applications' }],
            metadata: { title: 'Unreal Engine' },
          },
        ],
        responseMetadata: { nextCursor: 'page-2' },
      }),
    })
    .mockResolvedValueOnce({ status: 200, body: JSON.stringify({ records: [], responseMetadata: {} }) });

  const result = await handlers['epic-owned-library']();
  expect(result.ok).toBe(true);
  expect(result.games).toEqual([
    { appName: 'GameOne', catalogItemId: 'cid-1', title: 'Game One', image: 'https://img/1', description: null },
  ]);
  expect(httpsRequest).toHaveBeenNthCalledWith(
    2,
    'https://library-service.live.use1a.on.epicgames.com/library/api/public/items?includeMetadata=true',
    null,
    { Authorization: 'Bearer AT-1', Accept: 'application/json' }
  );
  expect(httpsRequest).toHaveBeenNthCalledWith(
    3,
    'https://library-service.live.use1a.on.epicgames.com/library/api/public/items?includeMetadata=true&cursor=page-2',
    null,
    { Authorization: 'Bearer AT-1', Accept: 'application/json' }
  );
  // Epic rotated the refresh token — the stored file must carry the new one.
  const stored = JSON.parse(fs.readFileSync(path.join(mockTmpDir, 'epic-account.json'), 'utf8'));
  expect(Buffer.from(stored.token, 'base64').toString('utf8')).toBe('enc:REFRESH2');
});

test('owned library enriches titles via the catalog and drops non-game entries', async () => {
  storeToken();
  httpsRequest
    .mockResolvedValueOnce({
      status: 200,
      body: JSON.stringify({ access_token: 'AT-1', expires_in: 7200 }),
    })
    .mockResolvedValueOnce({
      status: 200,
      body: JSON.stringify({
        records: [
          {
            appName: '9f4b8c2e1d3a4f5e8b7c6d5a4b3c2e1f',
            catalogItemId: 'cid-real',
            namespace: 'ns1',
            categories: [{ path: 'games/edition' }],
            metadata: {},
          },
          {
            appName: 'QuixelBridge_5_5',
            catalogItemId: 'cid-quixel',
            namespace: 'ns1',
            categories: [{ path: 'games/edition' }],
            metadata: { title: 'Quixel Bridge' },
          },
          {
            appName: 'sometool',
            catalogItemId: 'cid-tool',
            namespace: 'ns1',
            categories: [{ path: 'games/edition' }],
            metadata: { title: 'Mystery Tool' },
          },
          {
            appName: 'legacybox',
            catalogItemId: 'cid-legacy',
            namespace: 'ns1',
            categories: [{ path: 'games/edition' }],
            metadata: {},
          },
        ],
        responseMetadata: {},
      }),
    })
    .mockResolvedValueOnce({
      status: 200,
      body: JSON.stringify({
        'cid-real': {
          title: 'The Real Game',
          keyImages: [{ type: 'DieselStoreFrontTall', url: 'https://img/real' }],
          categories: [{ path: 'games/edition/base' }],
          description: 'A real game',
        },
        'cid-quixel': { title: 'Quixel Bridge', categories: [{ path: 'applications' }] },
        'cid-tool': { title: 'Some Tool', categories: [{ path: 'applications' }] },
        'cid-legacy': {
          title: 'Legacy Box Game',
          keyImages: [{ type: 'DieselGameBox', url: 'https://img/legacy' }],
          categories: [{ path: 'games' }],
        },
      }),
    });

  const result = await handlers['epic-owned-library']();
  expect(result.ok).toBe(true);
  expect(result.games).toEqual([
    {
      appName: '9f4b8c2e1d3a4f5e8b7c6d5a4b3c2e1f',
      catalogItemId: 'cid-real',
      title: 'The Real Game',
      image: 'https://img/real',
      description: 'A real game',
    },
    {
      appName: 'legacybox',
      catalogItemId: 'cid-legacy',
      title: 'Legacy Box Game',
      image: 'https://img/legacy',
      description: null,
    },
  ]);
  expect(httpsRequest).toHaveBeenCalledTimes(3);
});

test('owned library clears the session and asks for re-link on revoked grants', async () => {
  storeToken();
  httpsRequest.mockResolvedValueOnce({
    status: 400,
    body: JSON.stringify({ errorCode: 'errors.com.epicgames.account.oauth.invalid_grant' }),
  });
  expect(await handlers['epic-owned-library']()).toEqual({ ok: false, error: 'reauth-required' });
  expect(fs.existsSync(path.join(mockTmpDir, 'epic-account.json'))).toBe(false);
});

test('owned library without a linked account refuses without a network call', async () => {
  expect(await handlers['epic-owned-library']()).toEqual({ ok: false, error: 'not-linked' });
  expect(httpsRequest).not.toHaveBeenCalled();
});

test('epic-open-app only launches the launcher URI for well-formed app names', async () => {
  expect(await handlers['epic-open-app'](null, 'Fortnite')).toBe(true);
  expect(shell.openExternal).toHaveBeenCalledWith('com.epicgames.launcher://apps/Fortnite?action=launch');
  expect(await handlers['epic-open-app'](null, 'bad name')).toBe(false);
  expect(await handlers['epic-open-app'](null, 'https://evil.example')).toBe(false);
  expect(shell.openExternal).toHaveBeenCalledTimes(1);
});
