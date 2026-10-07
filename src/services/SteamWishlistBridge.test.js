jest.mock('electron', () => ({ BrowserWindow: jest.fn() }));
jest.mock('../../electron/net', () => ({ httpsRequest: jest.fn() }));

const { BrowserWindow } = require('electron');
const { httpsRequest } = require('../../electron/net');
const { registerIpcHandlers } = require('../../electron/steam');
const steamId = '76561198042965266';
let handler;

const respond = (data, result) => ({
  status: 200,
  body: JSON.stringify(data),
  headers: result === undefined ? {} : { 'x-eresult': [String(result)] },
});
const details = (appid, name, type = 'game') => ({
  [appid]: {
    success: true,
    data: {
      steam_appid: appid,
      type,
      name,
      genres: [{ description: 'Action' }],
      header_image: 'https://shared.akamai.steamstatic.com/test.jpg',
    },
  },
});

beforeEach(() => {
  httpsRequest.mockReset();
  BrowserWindow.mockClear();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  registerIpcHandlers({
    handle: (name, fn) => {
      if (name === 'steam-wishlist') handler = fn;
    },
  });
});

afterEach(() => jest.restoreAllMocks());

test('imports modern wishlist IDs with individually fetched names, genres and artwork', async () => {
  httpsRequest.mockResolvedValueOnce(respond({ response: { items: [{ appid: 1145360 }, { appid: 620 }] } }, 1));
  httpsRequest.mockImplementation(async (url) => {
    const id = Number(new URL(url).searchParams.get('appids'));
    return respond(details(id, id === 1145360 ? 'Hades' : 'Portal 2'));
  });
  const result = await handler(null, steamId);
  expect(result).toMatchObject({
    success: true,
    count: 2,
    skippedCount: 0,
    items: [
      { appid: '1145360', name: 'Hades', genres: ['Action'], image: expect.any(String) },
      { appid: '620', name: 'Portal 2' },
    ],
  });
  expect(httpsRequest.mock.calls[0][0]).toBe(
    `https://api.steampowered.com/IWishlistService/GetWishlist/v1/?steamid=${steamId}`
  );
  expect(httpsRequest.mock.calls.slice(1).every(([url]) => !url.includes(','))).toBe(true);
  expect(BrowserWindow).not.toHaveBeenCalled();
});

test.each(['', null, {}, '123', `id${steamId}`, `${steamId}?x=1`])(
  'rejects invalid Steam ID %p without network access',
  async (id) => {
    expect(await handler(null, id)).toMatchObject({ success: false, error: 'A valid Steam64 ID is required.' });
    expect(httpsRequest).not.toHaveBeenCalled();
    expect(BrowserWindow).not.toHaveBeenCalled();
  }
);

test.each([{ response: { items: [] } }, { response: {} }])('accepts a confirmed empty wishlist %p', async (body) => {
  httpsRequest.mockResolvedValueOnce(respond(body, 1));
  expect(await handler(null, steamId)).toMatchObject({ success: true, count: 0, items: [] });
  expect(httpsRequest).toHaveBeenCalledTimes(1);
});

test('does not mistake access denied with an empty response for an empty wishlist', async () => {
  httpsRequest.mockResolvedValueOnce(respond({ response: {} }, 15));
  expect(await handler(null, steamId)).toMatchObject({
    success: false,
    error: expect.stringMatching(/private|access/i),
  });
  expect(BrowserWindow).not.toHaveBeenCalled();
});

test.each([
  { status: 429, body: '', headers: {} },
  { status: 200, body: '<html>Sign in</html>', headers: {} },
  respond({ response: {} }),
  respond({ response: { items: 'broken' } }, 1),
  respond({ response: { items: [{ appid: '12&evil=1' }] } }, 1),
  respond({ response: {} }, 2),
])('reports unavailable or malformed responses without blaming privacy: %p', async (response) => {
  httpsRequest.mockResolvedValueOnce(response);
  const result = await handler(null, steamId);
  expect(result.success).toBe(false);
  expect(result.error).not.toMatch(/private|make sure/i);
  expect(BrowserWindow).not.toHaveBeenCalled();
});

test('deduplicates app IDs and reports unavailable details without creating fake games', async () => {
  httpsRequest.mockResolvedValueOnce(
    respond({ response: { items: [{ appid: 100 }, { appid: 100 }, { appid: 200 }] } }, 1)
  );
  httpsRequest.mockImplementation(async (url) =>
    respond(url.includes('appids=100&') ? { alternate: details(100, 'An expansion', 'dlc')[100] } : null)
  );
  expect(await handler(null, steamId)).toMatchObject({
    success: true,
    count: 1,
    totalFetched: 2,
    skippedCount: 1,
    items: [{ appid: '100', name: 'An expansion' }],
  });
  expect(httpsRequest).toHaveBeenCalledTimes(3);
});

test('stops further detail batches after Steam rate limits requests', async () => {
  httpsRequest.mockResolvedValueOnce(
    respond({ response: { items: [401, 402, 403, 404].map((appid) => ({ appid })) } }, 1)
  );
  httpsRequest.mockResolvedValue({ status: 429, body: '', headers: {} });
  expect(await handler(null, steamId)).toMatchObject({ success: false });
  expect(httpsRequest).toHaveBeenCalledTimes(4);
});

test('fails honestly when every game-detail lookup fails', async () => {
  httpsRequest.mockResolvedValueOnce(respond({ response: { items: [{ appid: 300 }] } }, 1));
  httpsRequest.mockResolvedValueOnce(respond(details(999, 'Wrong game')));
  expect(await handler(null, steamId)).toMatchObject({
    success: false,
    items: [],
    error: expect.stringMatching(/game details/i),
  });
});
