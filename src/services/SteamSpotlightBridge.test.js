jest.mock('electron', () => ({ BrowserWindow: jest.fn() }));
jest.mock('../../electron/net', () => ({ httpsRequest: jest.fn() }));

const { httpsRequest } = require('../../electron/net');
const { registerIpcHandlers } = require('../../electron/steam');
let handler;
let storeHandler;

const respond = (data) => Promise.resolve({ status: 200, body: JSON.stringify(data) });
const details = (appid) => ({
  [appid]: {
    success: true,
    data: {
      type: 'game',
      steam_appid: Number(appid),
      release_date: { date: '8 Nov, 2013', coming_soon: false },
      developers: ['The Indie Stone'],
      publishers: ['The Indie Stone'],
      genres: [{ description: 'Survival' }],
      metacritic: { score: 82 },
    },
  },
});

beforeEach(() => {
  httpsRequest.mockReset();
  registerIpcHandlers({
    handle: (name, fn) => {
      if (name === 'steam-spotlight') handler = fn;
      if (name === 'steam-store-details') storeHandler = fn;
    },
  });
});

test.each(['', null, {}, '12?url=evil', '../108600', '-1', '0', '4294967296'])(
  'rejects invalid appid %p without a request',
  async (appid) => {
    expect(handler).toBeDefined();
    expect(await handler(null, appid)).toEqual({ ok: false, error: 'invalid-appid' });
    expect(httpsRequest).not.toHaveBeenCalled();
  }
);

test('normalizes public facts and a genuine zero player count, with fixed endpoints', async () => {
  httpsRequest.mockImplementation((url) =>
    respond(url.includes('appdetails') ? details(108600) : { response: { result: 1, player_count: 0 } })
  );
  const result = await handler(null, '108600');
  expect(result.ok).toBe(true);
  expect(result.store).toEqual(
    expect.objectContaining({
      releaseDate: '8 Nov, 2013',
      developers: ['The Indie Stone'],
      genres: ['Survival'],
      metacritic: 82,
      fetchedAt: expect.any(Number),
    })
  );
  expect(result.players).toEqual({ count: 0, fetchedAt: expect.any(Number) });
  expect(httpsRequest).toHaveBeenCalledTimes(2);
  expect(httpsRequest.mock.calls.map(([url]) => new URL(url).hostname).sort()).toEqual([
    'api.steampowered.com',
    'store.steampowered.com',
  ]);
  expect(await handler(null, '108600')).toEqual(result);
  expect(httpsRequest).toHaveBeenCalledTimes(2);
});

test('accepts the requested game under a different outer key for both Spotlight and the modal', async () => {
  const app = details(774361)[774361];
  app.data.short_description = 'A punishing action-platformer.';
  app.data.screenshots = [
    {
      path_full: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/774361/ss_1.jpg',
      path_thumbnail: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/774361/ss_1.600x338.jpg',
    },
  ];
  app.data.price_overview = { currency: 'USD', final_formatted: '$24.99' };
  httpsRequest.mockImplementation((url) =>
    respond(url.includes('appdetails') ? { 1143852: app } : { response: { result: 1, player_count: 10 } })
  );
  const result = await handler(null, '774361');
  expect(result.store).toEqual(
    expect.objectContaining({
      shortDescription: app.data.short_description,
      screenshots: app.data.screenshots,
    })
  );
  const modal = await storeHandler(null, '774361');
  expect(modal.ok).toBe(true);
  expect(modal.data).toEqual(
    expect.objectContaining({
      steam_appid: 774361,
      short_description: app.data.short_description,
      screenshots: app.data.screenshots,
      price_overview: app.data.price_overview,
    })
  );
  expect(httpsRequest.mock.calls.filter(([url]) => url.includes('appdetails'))).toHaveLength(1);
});

test('rejects a different game even when it uses the requested outer key', async () => {
  const app = details(777)[777];
  httpsRequest.mockResolvedValue(await respond({ 9999994: app }));
  expect(await storeHandler(null, '9999994')).toEqual({ ok: false, error: 'store-unavailable' });
});

test('a failed store request can be retried and screenshot URLs are restricted and bounded', async () => {
  httpsRequest.mockRejectedValueOnce(new Error('timeout'));
  expect((await storeHandler(null, '9999995')).ok).toBe(false);
  const app = details(9999995)[9999995];
  const screenshot = {
    path_full: 'https://shared.akamai.steamstatic.com/ss_1.jpg',
    path_thumbnail: 'https://shared.akamai.steamstatic.com/ss_1.thumb.jpg',
  };
  app.data.screenshots = [
    { path_full: ['javascript', 'alert(1)'].join(':'), path_thumbnail: screenshot.path_thumbnail },
    { path_full: 'https://steamstatic.com.example.org/ss.jpg', path_thumbnail: screenshot.path_thumbnail },
    ...Array.from({ length: 20 }, () => screenshot),
  ];
  httpsRequest.mockResolvedValue(await respond({ 123: app }));
  const result = await storeHandler(null, '9999995');
  expect(result.ok).toBe(true);
  expect(result.data.screenshots).toHaveLength(8);
  expect(result.data.screenshots.every((item) => item.path_full === screenshot.path_full)).toBe(true);
});

test.each(['', null, {}, '12?url=evil', '../108600', '-1', '0', '4294967296'])(
  'rejects invalid store appid %p without a request',
  async (appid) => {
    expect(await storeHandler(null, appid)).toEqual({ ok: false, error: 'invalid-appid' });
    expect(httpsRequest).not.toHaveBeenCalled();
  }
);

test('allows store facts to succeed when player lookup fails', async () => {
  httpsRequest.mockImplementation((url) =>
    url.includes('appdetails') ? respond(details(1145360)) : Promise.reject(new Error('timeout'))
  );
  const result = await handler(null, '1145360');
  expect(result.store.developers).toEqual(['The Indie Stone']);
  expect(result.players).toBeNull();
});

test('does not fabricate facts for unavailable or malformed responses', async () => {
  httpsRequest.mockResolvedValue({ status: 200, body: '<html>Unavailable</html>' });
  expect(await handler(null, '9999991')).toEqual({ ok: false, store: null, players: null });
});

test('omits invalid player counts and non-game store responses', async () => {
  const data = details(9999992);
  data[9999992].data.type = 'dlc';
  httpsRequest.mockImplementation((url) =>
    respond(url.includes('appdetails') ? data : { response: { result: 1, player_count: null } })
  );
  expect(await handler(null, '9999992')).toEqual({ ok: false, store: null, players: null });
});

test('rejects mismatched store identity and failed player result', async () => {
  const data = details(9999993);
  data[9999993].data.steam_appid = 123;
  httpsRequest.mockImplementation((url) =>
    respond(url.includes('appdetails') ? data : { response: { result: 2, player_count: 40 } })
  );
  expect(await handler(null, '9999993')).toEqual({ ok: false, store: null, players: null });
});
