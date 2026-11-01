import PendingInstallService from './PendingInstallService';

const steamGame = (appid = '440', extra = {}) => ({
  source: 'steam',
  name: `Steam Game ${appid}`,
  appid,
  icon: 'https://cdn.example/icon.jpg',
  ...extra,
});

const epicGame = (appName = 'Fortnite') => ({
  source: 'epic',
  name: 'Fortnite',
  appName,
  catalogItemId: 'cid-1',
  icon: 'https://cdn.example/fn.jpg',
});

const gogGame = (productId = '1455615258') => ({
  source: 'gog',
  name: 'GOG Game',
  gogProductId: productId,
  icon: 'https://cdn.example/gog.jpg',
});

beforeEach(() => {
  localStorage.clear();
  window.electronAPI = {
    installWatchSet: jest.fn().mockResolvedValue({ ok: true, watching: 0 }),
  };
});

afterEach(() => {
  delete window.electronAPI;
});

test('keyFor derives a stable source:id key', () => {
  expect(PendingInstallService.keyFor(steamGame('440'))).toBe('steam:440');
  expect(PendingInstallService.keyFor(epicGame())).toBe('epic:Fortnite');
  expect(PendingInstallService.keyFor(gogGame())).toBe('gog:1455615258');
  expect(PendingInstallService.keyFor({ source: 'steam', name: 'no id' })).toBeNull();
  expect(PendingInstallService.keyFor({ source: 'uplay', appid: '1' })).toBeNull();
});

test('add stores an entry, keeps only the needed fields, and syncs to main', () => {
  const entry = PendingInstallService.add(steamGame('440', { playtimeForever: 999 }));
  expect(entry).toMatchObject({
    key: 'steam:440',
    source: 'steam',
    name: 'Steam Game 440',
    appid: '440',
  });
  expect(entry.playtimeForever).toBeUndefined();
  expect(PendingInstallService.list()).toHaveLength(1);
  expect(window.electronAPI.installWatchSet).toHaveBeenCalledWith([expect.objectContaining({ key: 'steam:440' })]);
});

test('add upserts the same game instead of duplicating it', () => {
  PendingInstallService.add(steamGame('440'));
  PendingInstallService.add(steamGame('440'));
  expect(PendingInstallService.list()).toHaveLength(1);
});

test('remove deletes the entry and re-syncs', () => {
  PendingInstallService.add(epicGame());
  PendingInstallService.remove('epic:Fortnite');
  expect(PendingInstallService.list()).toHaveLength(0);
});

test('expired entries are pruned on read', () => {
  PendingInstallService.add(steamGame('440'));
  const stored = JSON.parse(localStorage.getItem('gamepilot-pending-installs-v1'));
  stored[0].markedAt = Date.now() - PendingInstallService.TTL_MS - 1000;
  localStorage.setItem('gamepilot-pending-installs-v1', JSON.stringify(stored));
  expect(PendingInstallService.list()).toHaveLength(0);
});

test('sync is a no-op when the bridge is missing', () => {
  delete window.electronAPI;
  expect(() => PendingInstallService.sync()).not.toThrow();
});

test('installOwnedGame opens the right launcher per source and tracks pending', async () => {
  window.electronAPI = {
    steamInstall: jest.fn().mockResolvedValue(true),
    epicOpenApp: jest.fn().mockResolvedValue(true),
    gogOpenInGalaxy: jest.fn().mockResolvedValue(true),
    installWatchSet: jest.fn().mockResolvedValue({ ok: true }),
  };

  expect(await PendingInstallService.installOwnedGame(steamGame('440'))).toBe(true);
  expect(window.electronAPI.steamInstall).toHaveBeenCalledWith('440');
  expect(PendingInstallService.list().map((entry) => entry.key)).toContain('steam:440');

  expect(await PendingInstallService.installOwnedGame(epicGame())).toBe(true);
  expect(window.electronAPI.epicOpenApp).toHaveBeenCalledWith('Fortnite');

  expect(await PendingInstallService.installOwnedGame(gogGame())).toBe(true);
  expect(window.electronAPI.gogOpenInGalaxy).toHaveBeenCalledWith('1455615258');
});

test('installOwnedGame does not track when the launcher fails to open', async () => {
  window.electronAPI = {
    steamInstall: jest.fn().mockResolvedValue(false),
    installWatchSet: jest.fn(),
  };
  expect(await PendingInstallService.installOwnedGame(steamGame('440'))).toBe(false);
  expect(PendingInstallService.list()).toHaveLength(0);
});
