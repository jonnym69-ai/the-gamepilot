import OwnedBacklogService from './OwnedBacklogService';
import SteamOwnedGamesService from './SteamOwnedGamesService';
import EpicAccountService from './EpicAccountService';

jest.mock('./SteamOwnedGamesService', () => ({
  __esModule: true,
  default: {
    isEnabled: jest.fn(() => true),
    getSteamId: jest.fn(() => '76561198000000000'),
    fetchOwned: jest.fn(),
    diffUninstalled: jest.fn((games) => games),
  },
}));

jest.mock('./EpicAccountService', () => ({
  __esModule: true,
  default: {
    isLinked: jest.fn(() => true),
    getOwned: jest.fn(),
    diffUninstalled: jest.fn((games) => games),
  },
}));

const library = [{ name: 'Installed Game', platform: 'Steam', appid: 105600 }];

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  window.electronAPI = { gogUninstalled: jest.fn().mockResolvedValue({ ok: true, games: [] }) };
  SteamOwnedGamesService.isEnabled.mockReturnValue(true);
  SteamOwnedGamesService.getSteamId.mockReturnValue('76561198000000000');
  EpicAccountService.isLinked.mockReturnValue(true);
  SteamOwnedGamesService.fetchOwned.mockResolvedValue({ success: true, games: [] });
  EpicAccountService.getOwned.mockResolvedValue({ success: true, games: [] });
});

afterEach(() => {
  delete window.electronAPI;
});

test('merges all sources, ranks Steam playtime first, and diffs the library', async () => {
  SteamOwnedGamesService.fetchOwned.mockResolvedValue({
    success: true,
    games: [
      { appid: 4000, name: 'Barely Played', platform: 'Steam', playtimeForever: 60 },
      { appid: 5000, name: 'Heavily Played', platform: 'Steam', playtimeForever: 5000 },
    ],
  });
  EpicAccountService.getOwned.mockResolvedValue({
    success: true,
    games: [{ appName: 'EpicFreebie', name: 'Claimed Freebie', catalogItemId: 'c1' }],
  });
  window.electronAPI.gogUninstalled.mockResolvedValue({
    ok: true,
    games: [{ name: 'Galaxy Game', gogProductId: '12345', platform: 'GOG' }],
  });

  const pool = await OwnedBacklogService.getPool(library);
  expect(pool.map((game) => game.name)).toEqual(['Heavily Played', 'Barely Played', 'Claimed Freebie', 'Galaxy Game']);
  expect(pool.map((game) => game.source)).toEqual(['steam', 'steam', 'epic', 'gog']);
});

test('sources that are off or erroring never blank the rest', async () => {
  EpicAccountService.isLinked.mockReturnValue(false);
  SteamOwnedGamesService.fetchOwned.mockResolvedValue({ success: false, error: 'offline' });
  window.electronAPI.gogUninstalled.mockResolvedValue({
    ok: true,
    games: [{ name: 'Galaxy Game', gogProductId: '12345' }],
  });

  const pool = await OwnedBacklogService.getPool(library);
  expect(pool).toEqual([expect.objectContaining({ name: 'Galaxy Game', source: 'gog' })]);
});

test('installed GOG names are excluded even without a diff helper', async () => {
  window.electronAPI.gogUninstalled.mockResolvedValue({
    ok: true,
    games: [
      { name: 'Installed Game', gogProductId: '1' },
      { name: 'Galaxy Game', gogProductId: '2' },
    ],
  });
  const pool = await OwnedBacklogService.getPool(library);
  expect(pool.map((game) => game.name)).toEqual(['Galaxy Game']);
});

test('dismissed games leave the pool permanently', async () => {
  window.electronAPI.gogUninstalled.mockResolvedValue({
    ok: true,
    games: [
      { name: 'Keep Me', gogProductId: '2' },
      { name: 'Hide Me', gogProductId: '3' },
    ],
  });
  OwnedBacklogService.dismiss({ source: 'gog', gogProductId: '3' });
  const pool = await OwnedBacklogService.getPool(library);
  expect(pool.map((game) => game.name)).toEqual(['Keep Me']);
});

test('picksForDay is stable within a day and rotates across days', () => {
  const pool = Array.from({ length: 10 }, (_, index) => ({
    source: 'steam',
    appid: String(100 + index),
    name: `Game ${index}`,
  }));
  const dayA = new Date('2026-03-01T12:00:00Z');
  const dayB = new Date('2026-03-02T12:00:00Z');
  expect(OwnedBacklogService.picksForDay(pool, dayA)).toEqual(OwnedBacklogService.picksForDay(pool, dayA));
  const a = OwnedBacklogService.picksForDay(pool, dayA).map((game) => game.name);
  const b = OwnedBacklogService.picksForDay(pool, dayB).map((game) => game.name);
  expect(a).toHaveLength(4);
  expect(b).toHaveLength(4);
  expect(a).not.toEqual(b);
});

test('picksForDay wraps a small pool and handles empties', () => {
  const pool = [
    { source: 'gog', gogProductId: '1', name: 'One' },
    { source: 'gog', gogProductId: '2', name: 'Two' },
  ];
  expect(OwnedBacklogService.picksForDay(pool)).toHaveLength(2);
  expect(OwnedBacklogService.picksForDay([])).toEqual([]);
});
