import { SteamGenreEnrichmentService } from './SteamGenreEnrichmentService';

afterEach(() => {
  delete window.electronAPI;
  jest.restoreAllMocks();
});

test('uses the desktop bridge to map Steam genres and categories', async () => {
  window.electronAPI = {
    steamStoreDetails: jest.fn(async () => ({
      ok: true,
      data: {
        genres: [{ description: 'RPG' }],
        categories: [{ description: 'Online Co-op' }, { description: 'Steam Cloud' }],
      },
    })),
  };
  localStorage.clear();
  const genres = await SteamGenreEnrichmentService.fetchSteamGenres('774361');
  expect(window.electronAPI.steamStoreDetails).toHaveBeenCalledWith('774361');
  expect(genres).toEqual(expect.arrayContaining(['RPG', 'Multiplayer', 'Party']));
  // Second call hits the local cache instead of the bridge
  expect(await SteamGenreEnrichmentService.fetchSteamGenres('774361')).toEqual(genres);
  expect(window.electronAPI.steamStoreDetails).toHaveBeenCalledTimes(1);
});

test('returns empty without a bridge instead of a CORS-blocked fetch', async () => {
  localStorage.clear();
  global.fetch = jest.fn().mockRejectedValue(new Error('CORS'));
  expect(await SteamGenreEnrichmentService.fetchSteamGenres('12345')).toEqual([]);
  expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('appids=12345'));
  delete global.fetch;
});

test('does not cache failed bridge responses', async () => {
  window.electronAPI = { steamStoreDetails: jest.fn(async () => ({ ok: false, error: 'store-unavailable' })) };
  localStorage.clear();
  expect(await SteamGenreEnrichmentService.fetchSteamGenres('999999')).toEqual([]);
  expect(await SteamGenreEnrichmentService.fetchSteamGenres('999999')).toEqual([]);
  expect(window.electronAPI.steamStoreDetails).toHaveBeenCalledTimes(2);
});
