import ItchAccountService from './ItchAccountService';

const itchKey = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

const ownedRecord = (id, title, extra = {}) => ({
  itchId: String(id),
  name: title,
  icon: `https://img.itch.zone/${id}.png`,
  url: `https://dev.itch.io/game-${id}`,
  description: 'A small game',
  ...extra,
});

beforeEach(() => {
  localStorage.clear();
  window.electronAPI = { itchOwnedGames: jest.fn() };
});

afterEach(() => {
  delete window.electronAPI;
});

test('isConfigured reflects a stored API key and clear() wipes it', () => {
  expect(ItchAccountService.isConfigured()).toBe(false);
  ItchAccountService.setApiKey(itchKey);
  expect(ItchAccountService.isConfigured()).toBe(true);
  expect(ItchAccountService.getApiKey()).toBe(itchKey);
  ItchAccountService.clear();
  expect(ItchAccountService.isConfigured()).toBe(false);
  expect(ItchAccountService.getCached()).toBeNull();
});

test('getOwned refuses the bridge when no key is configured', async () => {
  const result = await ItchAccountService.getOwned();
  expect(result.code).toBe('missing-key');
  expect(window.electronAPI.itchOwnedGames).not.toHaveBeenCalled();
});

test('fetchOwned normalizes owned-keys records into owned games', async () => {
  ItchAccountService.setApiKey(itchKey);
  window.electronAPI.itchOwnedGames.mockResolvedValue({
    ok: true,
    games: [ownedRecord(1, 'Bundle Game'), ownedRecord(2, 'Second Game'), { itchId: '', name: 'No ID' }],
  });
  const result = await ItchAccountService.fetchOwned({ force: true });
  expect(window.electronAPI.itchOwnedGames).toHaveBeenCalledWith(itchKey);
  expect(result.success).toBe(true);
  expect(result.games).toHaveLength(2);
  expect(result.games[0]).toMatchObject({
    itchId: '1',
    name: 'Bundle Game',
    platform: 'itch.io',
    url: 'https://dev.itch.io/game-1',
  });
});

test('invalid-key errors surface a friendly message', async () => {
  ItchAccountService.setApiKey(itchKey);
  window.electronAPI.itchOwnedGames.mockResolvedValue({ ok: false, error: 'invalid-key' });
  const result = await ItchAccountService.fetchOwned({ force: true });
  expect(result.success).toBe(false);
  expect(result.error).toMatch(/api key/i);
});

test('fetchOwned serves the cache inside the TTL window', async () => {
  ItchAccountService.setApiKey(itchKey);
  window.electronAPI.itchOwnedGames.mockResolvedValue({ ok: true, games: [ownedRecord(1, 'Cached')] });
  await ItchAccountService.fetchOwned({ force: true });
  window.electronAPI.itchOwnedGames.mockClear();
  const result = await ItchAccountService.fetchOwned();
  expect(result.success).toBe(true);
  expect(result.cached).toBe(true);
  expect(result.games[0].name).toBe('Cached');
  expect(window.electronAPI.itchOwnedGames).not.toHaveBeenCalled();
});

test('diffUninstalled hides games already in the library by name', () => {
  const diff = ItchAccountService.diffUninstalled(
    [ownedRecord(1, 'Celeste'), ownedRecord(2, 'Hidden Gem')],
    [{ name: 'Celeste' }]
  );
  expect(diff).toHaveLength(1);
  expect(diff[0].name).toBe('Hidden Gem');
});
