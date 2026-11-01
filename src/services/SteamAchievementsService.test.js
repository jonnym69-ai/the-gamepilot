import SteamAchievementsService from './SteamAchievementsService';
import SteamOwnedGamesService from './SteamOwnedGamesService';
import StorageService from './StorageService';

jest.mock('./SteamOwnedGamesService');

const STEAM_ID = '76561199057118227';
const APPID = '1145360';
const CACHE_KEY = 'steamPlayerAchievementsV1';

const playerPayload = (overrides = {}) => ({
  ok: true,
  gameName: 'Hades',
  achievements: [
    {
      apiname: 'ACH_ONE',
      name: 'First',
      description: 'd1',
      achieved: true,
      unlockTime: '2024-01-01T00:00:00.000Z',
    },
    { apiname: 'ACH_TWO', name: 'Second', description: 'd2', achieved: false, unlockTime: null },
  ],
  ...overrides,
});

const globalPayload = {
  ok: true,
  achievements: [
    { name: 'ACH_ONE', percent: 55.5 },
    { name: 'ACH_TWO', percent: 2.1 },
  ],
};

beforeEach(() => {
  localStorage.clear();
  delete window.electronAPI;
  jest.clearAllMocks();
  SteamOwnedGamesService.getSteamId.mockReturnValue(STEAM_ID);
});

test('returns no-steam-id when no Steam ID is stored', async () => {
  SteamOwnedGamesService.getSteamId.mockReturnValue('');
  await expect(SteamAchievementsService.getForGame(APPID)).resolves.toEqual({
    ok: false,
    error: 'no-steam-id',
  });
});

test('fetches, merges global rarity, and caches the result', async () => {
  window.electronAPI = {
    steamPlayerAchievements: jest.fn().mockResolvedValue(playerPayload()),
    steamGlobalAchievements: jest.fn().mockResolvedValue(globalPayload),
  };

  const first = await SteamAchievementsService.getForGame(APPID);
  expect(first.ok).toBe(true);
  expect(first.unlocked).toBe(1);
  expect(first.total).toBe(2);
  expect(first.achievements[0].percent).toBe(55.5);
  expect(first.achievements[1].percent).toBe(2.1);
  expect(window.electronAPI.steamPlayerAchievements).toHaveBeenCalledWith({ steamId: STEAM_ID, appid: APPID });

  const second = await SteamAchievementsService.getForGame(APPID);
  expect(second.cached).toBe(true);
  expect(window.electronAPI.steamPlayerAchievements).toHaveBeenCalledTimes(1);
});

test('expired cache entries are refetched', async () => {
  StorageService.set(CACHE_KEY, {
    [APPID]: {
      fetchedAt: Date.now() - 7 * 60 * 60 * 1000, // > 6h success TTL
      accessedAt: Date.now(),
      result: { ok: true, unlocked: 9, total: 9, achievements: [] },
    },
  });
  window.electronAPI = {
    steamPlayerAchievements: jest.fn().mockResolvedValue(playerPayload()),
    steamGlobalAchievements: jest.fn().mockResolvedValue(globalPayload),
  };

  const result = await SteamAchievementsService.getForGame(APPID);
  expect(result.ok).toBe(true);
  expect(result.unlocked).toBe(1);
  expect(window.electronAPI.steamPlayerAchievements).toHaveBeenCalledTimes(1);
});

test('private-profile is cached (24h) but transient steam-error is not', async () => {
  window.electronAPI = {
    steamPlayerAchievements: jest
      .fn()
      .mockResolvedValue({ ok: false, error: 'steam-error' })
      .mockResolvedValueOnce({ ok: false, error: 'private-profile' }),
    steamGlobalAchievements: jest.fn().mockResolvedValue(globalPayload),
  };

  await expect(SteamAchievementsService.getForGame(APPID)).resolves.toEqual({
    ok: false,
    error: 'private-profile',
  });
  await expect(SteamAchievementsService.getForGame(APPID)).resolves.toMatchObject({
    ok: false,
    error: 'private-profile',
    cached: true,
  });
  expect(window.electronAPI.steamPlayerAchievements).toHaveBeenCalledTimes(1);

  StorageService.remove(CACHE_KEY);
  const errResult = await SteamAchievementsService.getForGame(APPID);
  expect(errResult).toEqual({ ok: false, error: 'steam-error' });
  // transient error → next call hits the bridge again
  await SteamAchievementsService.getForGame(APPID);
  expect(window.electronAPI.steamPlayerAchievements).toHaveBeenCalledTimes(3);
});

test('getSummaryForGames reads the cache only', async () => {
  window.electronAPI = { steamPlayerAchievements: jest.fn() };
  StorageService.set(CACHE_KEY, {
    [APPID]: {
      fetchedAt: Date.now(),
      accessedAt: Date.now(),
      result: { ok: true, unlocked: 3, total: 10, achievements: [] },
    },
  });

  const summary = SteamAchievementsService.getSummaryForGames([APPID, '999']);
  expect(summary).toEqual({ [APPID]: { unlocked: 3, total: 10 } });
  expect(window.electronAPI.steamPlayerAchievements).not.toHaveBeenCalled();
});
