jest.mock('../../electron/net', () => ({ httpsRequest: jest.fn() }));
const { httpsRequest } = require('../../electron/net');
const { registerIpcHandlers } = require('../../electron/epic');
let handler;

beforeEach(() => {
  httpsRequest.mockReset();
  registerIpcHandlers({
    handle: (name, callback) => {
      if (name === 'epic-free-games') handler = callback;
    },
  });
});

test('fetches only the fixed public Epic feed without forwarding renderer input', async () => {
  httpsRequest.mockResolvedValue({
    status: 200,
    body: JSON.stringify({ data: { Catalog: { searchStore: { elements: [{ title: 'Public offer' }] } } } }),
  });
  expect(await handler(null, { url: 'https://example.org', library: ['private'] })).toEqual({
    ok: true,
    elements: [{ title: 'Public offer' }],
  });
  expect(httpsRequest).toHaveBeenCalledWith(
    'https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=en-US&country=US&allowCountries=US',
    null,
    { Accept: 'application/json' }
  );
});

test.each([
  { status: 500, body: '' },
  { status: 200, body: '<html>error</html>' },
  { status: 200, body: '{}' },
])('handles unavailable or malformed responses', async (response) => {
  httpsRequest.mockResolvedValue(response);
  expect(await handler()).toEqual({ ok: false, error: 'epic-unavailable' });
});
