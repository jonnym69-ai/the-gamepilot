import EpicAccountService, { normalizeOwnedGame } from './EpicAccountService';
import StorageService from './StorageService';

const ownedRecord = (appName, title, extra = {}) => ({
  appName,
  catalogItemId: `cid-${appName}`,
  title,
  image: `https://cdn.example/${appName}.jpg`,
  ...extra,
});

beforeEach(() => {
  localStorage.clear();
  window.electronAPI = {
    epicAuthStart: jest.fn(),
    epicAuthStatus: jest.fn().mockResolvedValue({ ok: true, linked: false }),
    epicAuthDisconnect: jest.fn().mockResolvedValue({ ok: true }),
    epicOwnedLibrary: jest.fn(),
    epicOpenApp: jest.fn().mockResolvedValue(true),
  };
});

afterEach(() => {
  delete window.electronAPI;
});

test('link persists the account and reports the Epic display name', async () => {
  window.electronAPI.epicAuthStart.mockResolvedValue({
    ok: true,
    accountId: 'acct-1',
    displayName: 'Pilot01',
  });
  const result = await EpicAccountService.link();
  expect(result).toEqual({ success: true, displayName: 'Pilot01' });
  expect(EpicAccountService.isLinked()).toBe(true);
  expect(EpicAccountService.getAccountMeta()).toMatchObject({ accountId: 'acct-1', displayName: 'Pilot01' });
});

test('link surfaces friendly errors and never marks the account linked on failure', async () => {
  window.electronAPI.epicAuthStart.mockResolvedValue({ ok: false, error: 'secure-storage-unavailable' });
  const result = await EpicAccountService.link();
  expect(result.success).toBe(false);
  expect(result.error).toMatch(/encrypted storage/i);
  expect(EpicAccountService.isLinked()).toBe(false);
});

test('disconnect clears the session flag, metadata and owned-games cache', async () => {
  StorageService.setString('epicAccountLinkedV1', 'true');
  StorageService.set('epicAccountMetaV1', { accountId: 'a', displayName: 'Pilot' });
  StorageService.set('epicOwnedGamesCacheV2', { games: [ownedRecord('A', 'A Game')], fetchedAt: Date.now() });
  await EpicAccountService.disconnect();
  expect(window.electronAPI.epicAuthDisconnect).toHaveBeenCalledWith();
  expect(EpicAccountService.isLinked()).toBe(false);
  expect(EpicAccountService.getAccountMeta()).toBeNull();
  expect(EpicAccountService.getCached()).toBeNull();
});

test('getOwned refuses the bridge when unlinked and maps games when linked', async () => {
  expect((await EpicAccountService.getOwned()).code).toBe('not-linked');
  StorageService.setString('epicAccountLinkedV1', 'true');
  window.electronAPI.epicOwnedLibrary.mockResolvedValue({
    ok: true,
    games: [ownedRecord('Fortnite', 'Fortnite'), { appName: '', title: 'Broken row' }],
  });
  const result = await EpicAccountService.getOwned({ force: true });
  expect(result.success).toBe(true);
  expect(result.games).toHaveLength(1);
  expect(result.games[0]).toMatchObject({ appName: 'Fortnite', name: 'Fortnite', platform: 'Epic' });
});

test('getOwned caches for six hours and force-refreshes through the bridge', async () => {
  StorageService.setString('epicAccountLinkedV1', 'true');
  window.electronAPI.epicOwnedLibrary.mockResolvedValue({ ok: true, games: [ownedRecord('A', 'A Game')] });
  await EpicAccountService.getOwned({ force: true });
  await EpicAccountService.getOwned();
  expect(window.electronAPI.epicOwnedLibrary).toHaveBeenCalledTimes(1);
  await EpicAccountService.getOwned({ force: true });
  expect(window.electronAPI.epicOwnedLibrary).toHaveBeenCalledTimes(2);
});

test('an expired Epic session unlinks the account instead of looping on failures', async () => {
  StorageService.setString('epicAccountLinkedV1', 'true');
  window.electronAPI.epicOwnedLibrary.mockResolvedValue({ ok: false, error: 'reauth-required' });
  const result = await EpicAccountService.getOwned({ force: true });
  expect(result.success).toBe(false);
  expect(result.error).toMatch(/link the account again/i);
  expect(EpicAccountService.isLinked()).toBe(false);
});

test('diffUninstalled preserves name and icon on already-normalized owned games', () => {
  const owned = [normalizeOwnedGame(ownedRecord('Fortnite', 'Fortnite'))];
  const diff = EpicAccountService.diffUninstalled(owned, []);
  expect(diff[0].name).toBe('Fortnite');
  expect(diff[0].icon).toBe('https://cdn.example/Fortnite.jpg');
});

test('diffUninstalled drops games already installed via Epic ids or any-store name match', () => {
  const library = [
    { name: 'Installed Epic Game', platform: 'Epic', appid: 'cid-installed', launchId: 'cid-installed' },
    { name: 'Same Name Elsewhere', platform: 'Steam', appid: 123 },
  ];
  const owned = [
    ownedRecord('installed', 'Installed Epic Game', { catalogItemId: 'cid-installed' }),
    ownedRecord('crossstore', 'Same Name Elsewhere'),
    ownedRecord('newgame', 'Brand New Game'),
  ];
  const diff = EpicAccountService.diffUninstalled(owned, library);
  expect(diff.map((game) => game.appName)).toEqual(['newgame']);
});

test('normalizeOwnedGame only trusts https artwork', () => {
  const scriptScheme = 'javascript';
  expect(normalizeOwnedGame({ appName: 'A', title: 'T', image: `${scriptScheme}:alert(1)` }).icon).toBeNull();
  expect(normalizeOwnedGame({ appName: 'A', title: 'T', image: 'https://ok/img.png' }).icon).toBe('https://ok/img.png');
});
