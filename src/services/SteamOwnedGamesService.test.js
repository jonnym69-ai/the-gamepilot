import SteamOwnedGamesService from './SteamOwnedGamesService';
import StorageService from './StorageService';
import SteamWishlistService from './SteamWishlistService';

jest.mock('./StorageService', () => ({
  __esModule: true,
  default: { get: jest.fn(() => null), set: jest.fn(), getString: jest.fn(() => null), setString: jest.fn() },
}));

jest.mock('./SteamWishlistService', () => ({
  __esModule: true,
  default: { getSteamId: jest.fn(() => '76561198000000000') },
}));

const ownedGame = (appid, name, minutes = 0) => ({ appid, name, playtimeForever: minutes, lastPlayed: 0, icon: null });

beforeEach(() => {
  jest.clearAllMocks();
  delete window.electronAPI;
  StorageService.getString.mockReturnValue(null);
  StorageService.get.mockReturnValue(null);
  SteamWishlistService.getSteamId.mockReturnValue('76561198000000000');
});

test('is off by default and toggles via StorageService', () => {
  expect(SteamOwnedGamesService.isEnabled()).toBe(false);
  SteamOwnedGamesService.setEnabled(true);
  expect(StorageService.setString).toHaveBeenCalledWith('steamOwnedGamesEnabled', 'true');
  StorageService.getString.mockReturnValue('true');
  expect(SteamOwnedGamesService.isEnabled()).toBe(true);
});

test('fetchOwned returns normalized games and caches them', async () => {
  window.electronAPI = {
    steamOwnedLibrary: jest.fn().mockResolvedValue({
      ok: true,
      games: [
        { appid: 105600, name: 'Terraria', playtimeForever: 1200, lastPlayed: 1700000000, icon: 'https://x/i.jpg' },
        { appid: 0, name: 'Bad Row' },
      ],
      fetchedAt: 1700000100000,
    }),
  };

  const result = await SteamOwnedGamesService.fetchOwned();
  expect(result.success).toBe(true);
  expect(result.games).toHaveLength(1);
  expect(result.games[0]).toMatchObject({ appid: 105600, name: 'Terraria', platform: 'Steam', installed: false });
  expect(StorageService.set).toHaveBeenCalledWith(
    'steamOwnedCacheV1',
    expect.objectContaining({ fetchedAt: 1700000100000 })
  );
});

test('fetchOwned maps private game details and missing config to honest errors', async () => {
  window.electronAPI = { steamOwnedLibrary: jest.fn().mockResolvedValue({ ok: false, error: 'game-details-private' }) };
  const privateResult = await SteamOwnedGamesService.fetchOwned({ force: true });
  expect(privateResult.success).toBe(false);
  expect(privateResult.error).toMatch(/private/i);

  SteamWishlistService.getSteamId.mockReturnValue(null);
  const missing = await SteamOwnedGamesService.fetchOwned({ force: true });
  expect(missing.success).toBe(false);
  expect(missing.code).toBe('missing-steamid');
});

test('diffUninstalled excludes appids already in the local library', () => {
  const owned = [
    ownedGame(730, 'Counter-Strike 2', 5000),
    ownedGame(105600, 'Terraria', 1200),
    ownedGame(999999, 'Never Installed', 30),
  ];
  const library = [
    { name: 'Terraria', platform: 'Steam', appid: 105600 },
    { name: 'Not Steam', platform: 'Epic', appid: null },
  ];

  const missing = SteamOwnedGamesService.diffUninstalled(owned, library);
  expect(missing.map((g) => g.appid)).toEqual([730, 999999]);
  expect(missing[0].playtimeForever).toBe(5000);
});
