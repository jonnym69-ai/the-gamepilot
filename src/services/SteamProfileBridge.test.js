jest.mock('electron', () => ({ BrowserWindow: jest.fn() }));
jest.mock('../../electron/net', () => ({ httpsRequest: jest.fn() }));

const { httpsRequest } = require('../../electron/net');
const { registerIpcHandlers } = require('../../electron/steam');
const steamId = '76561198042965266';
// The handler caches in-memory per steamid; each network test needs a
// distinct ID so a cached success can't leak into failure assertions.
const otherId = '76561198042965267';
const thirdId = '76561198042965268';
let handler;

const respond = (status, data) => ({ status, body: JSON.stringify(data), headers: {} });

beforeEach(() => {
  httpsRequest.mockReset();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  registerIpcHandlers({
    handle: (name, fn) => {
      if (name === 'steam-profile') handler = fn;
    },
  });
});

afterEach(() => jest.restoreAllMocks());

test.each(['', null, {}, '123', 'notanumber'])('rejects invalid Steam ID %p without a request', async (id) => {
  expect(await handler(null, id)).toEqual({ ok: false, error: 'invalid-steamid' });
  expect(httpsRequest).not.toHaveBeenCalled();
});

test('passes a trimmed relay profile through and caches it', async () => {
  const profile = { steamid: steamId, name: 'Player', level: 42, badges: 120 };
  httpsRequest.mockResolvedValue(respond(200, { profile, fetchedAt: 123 }));

  const first = await handler(null, steamId);
  expect(first).toEqual({ ok: true, profile, fetchedAt: 123 });
  expect(httpsRequest.mock.calls[0][0]).toContain('getSteamProfile?steamid=' + steamId);

  const second = await handler(null, steamId);
  expect(second).toMatchObject({ ok: true, cached: true });
  expect(httpsRequest).toHaveBeenCalledTimes(1);
});

test('maps relay 404 to profile-not-found', async () => {
  httpsRequest.mockResolvedValue(respond(404, { error: 'No Steam profile found' }));
  expect(await handler(null, otherId)).toEqual({ ok: false, error: 'profile-not-found' });
});

test('maps relay failures to profile-unavailable without leaking internals', async () => {
  httpsRequest.mockResolvedValue(respond(502, { error: 'upstream stack trace with key=abc' }));
  const result = await handler(null, thirdId);
  expect(result).toEqual({ ok: false, error: 'profile-unavailable' });
});

test('returns profile-unavailable when the relay is unreachable', async () => {
  httpsRequest.mockRejectedValue(new Error('timeout'));
  expect(await handler(null, '76561198042965269')).toEqual({ ok: false, error: 'profile-unavailable' });
});
