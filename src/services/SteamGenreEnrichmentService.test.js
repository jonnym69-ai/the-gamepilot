import { SteamGenreEnrichmentService } from './SteamGenreEnrichmentService';
import SteamPublicService from './SteamPublicService';
import StorageService from './StorageService';

afterEach(() => {
  delete window.electronAPI;
  jest.restoreAllMocks();
});

const bridgeWith = (data) => {
  window.electronAPI = { steamStoreDetails: jest.fn(async () => ({ ok: true, data })) };
  return window.electronAPI.steamStoreDetails;
};

test('uses the desktop bridge to map Steam genres and categories', async () => {
  const bridge = bridgeWith({
    genres: [{ description: 'RPG' }],
    categories: [{ description: 'Online Co-op' }, { description: 'Steam Cloud' }],
  });
  localStorage.clear();
  const genres = await SteamGenreEnrichmentService.fetchSteamGenres('774361');
  expect(bridge).toHaveBeenCalledWith('774361');
  // Co-op is a multiplayer mode, not a Party genre.
  expect(genres).toEqual(expect.arrayContaining(['RPG', 'Multiplayer']));
  expect(genres).not.toContain('Party');
  // Second call hits the local cache instead of the bridge
  expect(await SteamGenreEnrichmentService.fetchSteamGenres('774361')).toEqual(genres);
  expect(bridge).toHaveBeenCalledTimes(1);
});

test('an explicit Party category still produces the Party genre', async () => {
  bridgeWith({ genres: [{ description: 'Casual' }], categories: [{ description: 'Party' }] });
  localStorage.clear();
  expect(await SteamGenreEnrichmentService.fetchSteamGenres('42')).toEqual(expect.arrayContaining(['Casual', 'Party']));
});

test('stores play modes separately from genres', async () => {
  bridgeWith({
    genres: [{ description: 'Action' }],
    categories: [
      { description: 'Single-player' },
      { description: 'Online Co-op' },
      { description: 'Shared/Split Screen Co-op' },
      { description: 'Steam Cloud' },
      { description: 'Online Co-op' },
    ],
  });
  localStorage.clear();
  await SteamGenreEnrichmentService.fetchSteamGenres('1234');
  expect(SteamGenreEnrichmentService.getCachedPlayModes('1234')).toEqual([
    'single-player',
    'online co-op',
    'shared/split screen co-op',
  ]);
});

test('enrichLibrary preserves playModes on the enriched game', async () => {
  bridgeWith({
    genres: [{ description: 'Action' }],
    categories: [{ description: 'Online Co-op' }],
  });
  localStorage.clear();
  const library = [{ name: 'Co-op Game', appid: '777', platform: 'Steam', genres: ['Action'] }];
  const [enriched] = await SteamGenreEnrichmentService.enrichLibrary(library);
  expect(enriched.playModes).toEqual(['online co-op']);
});

test('strips V2-inferred Party on fresh success but keeps unproven Party', async () => {
  bridgeWith({
    genres: [{ description: 'Strategy' }],
    categories: [{ description: 'Online Co-op' }],
  });
  localStorage.clear();
  // The V2 cache proves this app's Party came from the old co-op inference.
  StorageService.set(SteamGenreEnrichmentService.LEGACY_CACHE_KEY, {
    555: { genres: ['Strategy', 'Multiplayer', 'Party'], cachedAt: Date.now() },
  });
  const library = [{ name: 'Inferred', appid: '555', platform: 'Steam', genres: ['Strategy', 'Party'] }];
  const [enriched] = await SteamGenreEnrichmentService.enrichLibrary(library);
  expect(enriched.genres).toEqual(['Strategy', 'Multiplayer']);
  expect(enriched.steamGenreEnrichmentVersion).toBe(3);
});

test('keeps Party when the V2 cache cannot prove the old inference', async () => {
  bridgeWith({ genres: [{ description: 'Casual' }], categories: [{ description: 'Multiplayer' }] });
  localStorage.clear();
  const library = [{ name: 'Manual Party', appid: '556', platform: 'Steam', genres: ['Casual', 'Party'] }];
  const [enriched] = await SteamGenreEnrichmentService.enrichLibrary(library);
  expect(enriched.genres).toEqual(['Casual', 'Party', 'Multiplayer']);
  expect(enriched.steamGenreEnrichmentVersion).toBe(3);
});

test('a failed lookup preserves Party and adds no provenance', async () => {
  window.electronAPI = { steamStoreDetails: jest.fn(async () => ({ ok: false })) };
  localStorage.clear();
  StorageService.set(SteamGenreEnrichmentService.LEGACY_CACHE_KEY, {
    557: { genres: ['RPG', 'Party'], cachedAt: Date.now() },
  });
  const library = [{ name: 'Offline', appid: '557', platform: 'Steam', genres: ['RPG', 'Party'] }];
  const [enriched] = await SteamGenreEnrichmentService.enrichLibrary(library);
  expect(enriched.genres).toEqual(['RPG', 'Party']);
  expect(enriched.steamGenreEnrichmentVersion).toBeUndefined();
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

test('a disabled public-data lookup preserves genres unchanged', async () => {
  SteamPublicService.setEnabled(false);
  localStorage.clear();
  const library = [{ name: 'Disabled', appid: '558', platform: 'Steam', genres: ['RPG', 'Party'] }];
  const [enriched] = await SteamGenreEnrichmentService.enrichLibrary(library);
  expect(enriched.genres).toEqual(['RPG', 'Party']);
  expect(enriched.steamGenreEnrichmentVersion).toBeUndefined();
  SteamPublicService.setEnabled(true);
});
