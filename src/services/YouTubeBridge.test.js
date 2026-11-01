jest.mock('electron', () => ({
  app: { getPath: jest.fn(() => 'C:\\fake\\userData') },
  safeStorage: {
    isEncryptionAvailable: jest.fn(() => true),
    getSelectedStorageBackend: jest.fn(() => 'dpapi'),
    encryptString: jest.fn((value) => Buffer.from(`enc:${Buffer.from(value).toString('base64')}`)),
    decryptString: jest.fn((buffer) => {
      const text = buffer.toString();
      if (!text.startsWith('enc:')) throw new Error('corrupted key blob');
      return Buffer.from(text.slice(4), 'base64').toString();
    }),
  },
}));

jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  renameSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

jest.mock('../../electron/net', () => ({ httpsRequest: jest.fn() }));

const fs = require('fs');
const { safeStorage } = require('electron');
const { httpsRequest } = require('../../electron/net');
const { registerIpcHandlers } = require('../../electron/youtube');

const KEY = `AIza${'a'.repeat(35)}`;
const handlers = {};

const storedKey = (key = KEY) => {
  fs.readFileSync.mockReturnValue(Buffer.from(`enc:${Buffer.from(key).toString('base64')}`));
};

const searchOk = (
  items = [{ id: { videoId: 'abcdefghij1' }, snippet: { title: 'Video One', channelTitle: 'Chan' } }]
) => httpsRequest.mockResolvedValue({ status: 200, headers: {}, body: JSON.stringify({ items }) });

beforeEach(() => {
  Object.keys(handlers).forEach((name) => delete handlers[name]);
  httpsRequest.mockReset();
  fs.readFileSync.mockReset();
  fs.writeFileSync.mockReset();
  fs.renameSync.mockReset();
  fs.unlinkSync.mockReset();
  safeStorage.isEncryptionAvailable.mockReturnValue(true);
  safeStorage.getSelectedStorageBackend.mockReturnValue('dpapi');
  registerIpcHandlers({ handle: (name, fn) => (handlers[name] = fn) });
});

test.each([
  [{ title: '', category: 'gameplay' }],
  [{ title: 'Terraria', category: 'cheats' }],
  [{ title: 'Terraria', category: 'constructor' }],
  [{ title: 'Terraria', category: '__proto__' }],
  [{ title: 'x'.repeat(201), category: 'guides' }],
  [{ category: 'gameplay' }],
  [null],
])('rejects invalid query %p without a request', async (request) => {
  storedKey();
  expect(await handlers['youtube-search'](null, request)).toEqual({ ok: false, error: 'invalid-query' });
  expect(httpsRequest).not.toHaveBeenCalled();
});

test('search without a saved key returns missing-key without a request', async () => {
  fs.readFileSync.mockImplementation(() => {
    const error = new Error('no file');
    error.code = 'ENOENT';
    throw error;
  });
  expect(await handlers['youtube-search'](null, { title: 'Terraria', category: 'gameplay' })).toEqual({
    ok: false,
    error: 'missing-key',
  });
  expect(httpsRequest).not.toHaveBeenCalled();
});

test('search hits the YouTube API with the key in a header and normalizes results', async () => {
  storedKey();
  searchOk();
  const result = await handlers['youtube-search'](null, { title: 'Terraria', category: 'reviews' });
  expect(result).toEqual({
    ok: true,
    cached: false,
    videos: [
      {
        id: 'abcdefghij1',
        title: 'Video One',
        channelTitle: 'Chan',
        thumbnailUrl: 'https://i.ytimg.com/vi/abcdefghij1/mqdefault.jpg',
      },
    ],
  });
  const [url, body, headers] = httpsRequest.mock.calls[0];
  const parsed = new URL(url);
  expect(`${parsed.protocol}//${parsed.host}${parsed.pathname}`).toBe('https://www.googleapis.com/youtube/v3/search');
  expect(parsed.searchParams.get('q')).toBe('Terraria game review');
  expect(parsed.searchParams.get('maxResults')).toBe('3');
  expect(url).not.toContain(KEY);
  expect(body).toBeNull();
  expect(headers['X-Goog-Api-Key']).toBe(KEY);
});

test('filters malformed video ids and invalid items', async () => {
  storedKey();
  searchOk([
    { id: { videoId: 'abcdefghij1' }, snippet: { title: 'Good', channelTitle: 'A' } },
    { id: { videoId: 'bad!' }, snippet: { title: 'Bad' } },
    { id: { kind: 'youtube#channel' }, snippet: { title: 'Not a video' } },
    null,
  ]);
  const result = await handlers['youtube-search'](null, { title: 'Terraria', category: 'gameplay' });
  expect(result.ok).toBe(true);
  expect(result.videos).toHaveLength(1);
  expect(result.videos[0].id).toBe('abcdefghij1');
});

test.each([
  [403, { error: { errors: [{ reason: 'quotaExceeded' }] } }, 'quota-exceeded'],
  [403, { error: { errors: [{ reason: 'dailyLimitExceeded' }] } }, 'quota-exceeded'],
  [403, { error: { errors: [{ reason: 'keyInvalid' }] } }, 'invalid-key'],
  [400, {}, 'invalid-key'],
  [401, {}, 'invalid-key'],
  [403, { error: { errors: [{ reason: 'accessNotConfigured' }] } }, 'access-denied'],
  [500, {}, 'unavailable'],
])('maps HTTP %s to sanitized %s error', async (status, body, code) => {
  storedKey();
  httpsRequest.mockResolvedValue({ status, headers: {}, body: JSON.stringify(body) });
  const result = await handlers['youtube-search'](null, { title: 'Hades', category: 'guides' });
  expect(result).toEqual({ ok: false, error: code });
});

test('a malformed 200 body fails without caching, and a good retry succeeds', async () => {
  storedKey();
  httpsRequest.mockResolvedValueOnce({ status: 200, headers: {}, body: 'not json at all' }).mockResolvedValueOnce({
    status: 200,
    headers: {},
    body: JSON.stringify({
      items: [{ id: { videoId: 'abcdefghij1' }, snippet: { title: 'Good', channelTitle: 'A' } }],
    }),
  });

  const bad = await handlers['youtube-search'](null, { title: 'Retry Quest', category: 'gameplay' });
  expect(bad.ok).toBe(false);

  const good = await handlers['youtube-search'](null, { title: 'Retry Quest', category: 'gameplay' });
  expect(good).toMatchObject({ ok: true, cached: false });
  expect(good.videos[0].id).toBe('abcdefghij1');
  expect(httpsRequest).toHaveBeenCalledTimes(2);
});

test('an inflight request under a cleared key cannot repopulate the cache', async () => {
  storedKey();
  const pending = new Promise((resolve) =>
    setTimeout(
      () =>
        resolve({
          status: 200,
          headers: {},
          body: JSON.stringify({
            items: [{ id: { videoId: 'oldresult00' }, snippet: { title: 'Old', channelTitle: 'A' } }],
          }),
        }),
      25
    )
  );
  httpsRequest
    .mockImplementationOnce(() => pending)
    .mockResolvedValueOnce({
      status: 200,
      headers: {},
      body: JSON.stringify({
        items: [{ id: { videoId: 'newresult00' }, snippet: { title: 'New', channelTitle: 'B' } }],
      }),
    });

  const oldSearch = handlers['youtube-search'](null, { title: 'Race Quest', category: 'gameplay' });
  await handlers['youtube-clear-key']();
  const fresh = await handlers['youtube-search'](null, { title: 'Race Quest', category: 'gameplay' });
  expect(fresh).toMatchObject({ ok: true, cached: false });
  await oldSearch;

  const cached = await handlers['youtube-search'](null, { title: 'Race Quest', category: 'gameplay' });
  expect(cached).toMatchObject({ ok: true, cached: true });
  expect(cached.videos[0].id).toBe('newresult00');
  expect(httpsRequest).toHaveBeenCalledTimes(2);
});

test('cached entries expire after 24 hours', async () => {
  storedKey();
  searchOk();
  const now = jest.spyOn(Date, 'now');
  try {
    now.mockReturnValue(1_000_000);
    await handlers['youtube-search'](null, { title: 'Expiry Quest', category: 'gameplay' });
    expect(httpsRequest).toHaveBeenCalledTimes(1);

    now.mockReturnValue(1_000_000 + 25 * 60 * 60 * 1000);
    const expired = await handlers['youtube-search'](null, { title: 'Expiry Quest', category: 'gameplay' });
    expect(expired).toMatchObject({ ok: true, cached: false });
    expect(httpsRequest).toHaveBeenCalledTimes(2);
  } finally {
    now.mockRestore();
  }
});

test('network failure surfaces as unavailable', async () => {
  storedKey();
  httpsRequest.mockRejectedValue(new Error('socket hangup'));
  expect(await handlers['youtube-search'](null, { title: 'Hades', category: 'gameplay' })).toEqual({
    ok: false,
    error: 'unavailable',
  });
});

test('successful results cache for 24h and concurrent queries dedupe', async () => {
  storedKey();
  searchOk();

  const [first, second] = await Promise.all([
    handlers['youtube-search'](null, { title: 'Dedupe Quest', category: 'gameplay' }),
    handlers['youtube-search'](null, { title: 'Dedupe Quest', category: 'gameplay' }),
  ]);
  expect(first.ok).toBe(true);
  expect(second.ok).toBe(true);
  expect(httpsRequest).toHaveBeenCalledTimes(1);

  const third = await handlers['youtube-search'](null, { title: 'Dedupe Quest', category: 'gameplay' });
  expect(third).toMatchObject({ ok: true, cached: true });
  expect(httpsRequest).toHaveBeenCalledTimes(1);

  // Different category is a different cache entry.
  await handlers['youtube-search'](null, { title: 'Dedupe Quest', category: 'guides' });
  expect(httpsRequest).toHaveBeenCalledTimes(2);
});

test('status reports configured without returning key material', async () => {
  fs.readFileSync.mockImplementation(() => {
    throw Object.assign(new Error('no file'), { code: 'ENOENT' });
  });
  expect(await handlers['youtube-status']()).toEqual({ ok: true, configured: false });

  storedKey();
  expect(await handlers['youtube-status']()).toEqual({ ok: true, configured: true });

  storedKey('junk'); // decrypts fine but fails the key pattern
  expect(await handlers['youtube-status']()).toEqual({ ok: true, configured: false });

  fs.readFileSync.mockReturnValue(Buffer.from('not-encrypted'));
  expect(await handlers['youtube-status']()).toEqual({ ok: true, configured: false });
});

test('set-key validates, encrypts and writes atomically without returning the key', async () => {
  expect(await handlers['youtube-set-key'](null, 'short')).toEqual({ ok: false, error: 'invalid-key' });
  expect(fs.writeFileSync).not.toHaveBeenCalled();

  const result = await handlers['youtube-set-key'](null, `  ${KEY}  `);
  expect(result).toEqual({ ok: true });
  expect(safeStorage.encryptString).toHaveBeenCalledWith(KEY);
  const [tempPath, data, options] = fs.writeFileSync.mock.calls[0];
  expect(tempPath).toContain('youtube-key.enc');
  expect(tempPath).toContain('.tmp');
  expect(options).toMatchObject({ mode: 0o600 });
  expect(data.toString()).not.toContain(KEY);
  const [from, to] = fs.renameSync.mock.calls[0];
  expect(from).toBe(tempPath);
  expect(to).not.toContain('.tmp');
  expect(to).toContain('youtube-key.enc');
});

test('set-key fails closed when encryption is unavailable or basic_text', async () => {
  safeStorage.isEncryptionAvailable.mockReturnValue(false);
  expect(await handlers['youtube-set-key'](null, KEY)).toEqual({ ok: false, error: 'secure-storage-unavailable' });
  expect(fs.writeFileSync).not.toHaveBeenCalled();

  safeStorage.isEncryptionAvailable.mockReturnValue(true);
  safeStorage.getSelectedStorageBackend.mockReturnValue('basic_text');
  expect(await handlers['youtube-set-key'](null, KEY)).toEqual({ ok: false, error: 'secure-storage-unavailable' });
  expect(fs.writeFileSync).not.toHaveBeenCalled();
});

test('clear-key removes the file, tolerates ENOENT and invalidates the cache', async () => {
  storedKey();
  searchOk();
  await handlers['youtube-search'](null, { title: 'Clear Quest', category: 'gameplay' });
  expect(httpsRequest).toHaveBeenCalledTimes(1);

  fs.unlinkSync.mockImplementation(() => {
    throw Object.assign(new Error('gone'), { code: 'ENOENT' });
  });
  expect(await handlers['youtube-clear-key']()).toEqual({ ok: true });
  expect(fs.unlinkSync.mock.calls[0][0]).toContain('youtube-key.enc');

  // Cache was invalidated: the same search hits the network again.
  await handlers['youtube-search'](null, { title: 'Clear Quest', category: 'gameplay' });
  expect(httpsRequest).toHaveBeenCalledTimes(2);
});
