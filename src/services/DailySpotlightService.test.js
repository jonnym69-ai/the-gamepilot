import DailySpotlightService from './DailySpotlightService';
import StorageService from './StorageService';

const NOW = new Date('2026-09-23T12:00:00Z');
const library = [
  { name: 'Project Zomboid', platform: 'Steam', appid: 108600 },
  { name: 'Hades', platform: 'Steam', appid: 1145360 },
  { name: 'Local Adventure', platform: 'Local', id: 'local-1' },
];
const store = { releaseDate: '8 Nov, 2013', developers: ['The Indie Stone'], fetchedAt: NOW.getTime() };
const players = { count: 0, fetchedAt: NOW.getTime() };

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(NOW);
  localStorage.clear();
  StorageService.setString('timezone', 'UTC');
  window.electronAPI = { steamSpotlight: jest.fn().mockResolvedValue({ ok: true, store, players }) };
});

afterEach(() => {
  delete window.electronAPI;
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('keeps the daily game through reloads, reorderings, and additions', () => {
  const first = DailySpotlightService.selectGame(library);
  expect(DailySpotlightService.selectGame([...library].reverse())).toEqual(first);
  expect(DailySpotlightService.selectGame([...library, { name: 'New Game', platform: 'Local' }])).toEqual(first);
  jest.resetModules();
  const reloaded = require('./DailySpotlightService').default;
  expect(reloaded.selectGame(library)).toEqual(first);
});

test('rotates through the library without repeats, across year boundaries', () => {
  const picks = [0, 1, 2].map(
    (offset) => DailySpotlightService.selectGame(library, new Date(Date.UTC(2026, 11, 31 + offset))).name
  );
  expect(new Set(picks).size).toBe(3);
});

test('uses the preferred calendar day, not elapsed 24-hour intervals', () => {
  StorageService.setString('timezone', 'America/Los_Angeles');
  const first = DailySpotlightService.selectGame(library, new Date('2026-09-23T06:59:00Z'));
  const next = DailySpotlightService.selectGame(library, new Date('2026-09-23T07:01:00Z'));
  expect(next.name).not.toBe(first.name);
});

test('handles empty, single-game and removed-game libraries and excludes utilities', () => {
  expect(DailySpotlightService.selectGame(null)).toBeNull();
  expect(
    DailySpotlightService.selectGame([null, {}, { name: 'GOG Galaxy' }, { name: 'Hidden', hidden: true }])
  ).toBeNull();
  expect(DailySpotlightService.selectGame([library[0], library[0]])).toEqual(library[0]);
  expect(DailySpotlightService.selectGame([library[1]])).toEqual(library[1]);
});

test('does not confuse other platforms numeric IDs with Steam IDs', () => {
  expect(DailySpotlightService.getSteamAppId({ platform: 'gog', appid: 108600 })).toBeNull();
  expect(DailySpotlightService.getSteamAppId({ platform: 'steam', appid: '108600?extra=1' })).toBeNull();
  expect(DailySpotlightService.getSteamAppId({ platform: 'steam', appid: 0 })).toBeNull();
  expect(DailySpotlightService.getSteamAppId(library[0])).toBe('108600');
});

test('requires opt-in and does not fetch non-Steam games', async () => {
  expect(DailySpotlightService.isEnabled()).toBe(false);
  expect(await DailySpotlightService.getFacts(library[0])).toBeNull();
  DailySpotlightService.setEnabled(true);
  expect(await DailySpotlightService.getFacts(library[2])).toBeNull();
  expect(window.electronAPI.steamSpotlight).not.toHaveBeenCalled();
});

test('deduplicates requests, persists facts, and sends only the app ID', async () => {
  DailySpotlightService.setEnabled(true);
  const [first, second] = await Promise.all([
    DailySpotlightService.getFacts(library[0]),
    DailySpotlightService.getFacts(library[0]),
  ]);
  expect(first).toEqual(second);
  expect(first.players.count).toBe(0);
  expect(window.electronAPI.steamSpotlight).toHaveBeenCalledTimes(1);
  expect(window.electronAPI.steamSpotlight).toHaveBeenCalledWith('108600');
  expect(await DailySpotlightService.getFacts(library[0])).toEqual(first);
  expect(window.electronAPI.steamSpotlight).toHaveBeenCalledTimes(1);
  expect(DailySpotlightService.getCached(library[0])).toEqual(first);
});

test('refreshes after a day, preserving failed source data and its original timestamp', async () => {
  DailySpotlightService.setEnabled(true);
  await DailySpotlightService.getFacts(library[0]);
  jest.setSystemTime(new Date(NOW.getTime() + 25 * 3600000));
  const refreshedStore = { ...store, fetchedAt: Date.now() };
  window.electronAPI.steamSpotlight.mockResolvedValue({ ok: true, store: refreshedStore, players: null });
  const partial = await DailySpotlightService.getFacts(library[0]);
  expect(partial.store).toEqual(refreshedStore);
  expect(partial.players).toEqual(players);
  expect(partial.players.fetchedAt).toBe(NOW.getTime());
});

test('offline failures retain cached facts and back off retries', async () => {
  DailySpotlightService.setEnabled(true);
  await DailySpotlightService.getFacts(library[0]);
  jest.setSystemTime(new Date(NOW.getTime() + 25 * 3600000));
  window.electronAPI.steamSpotlight.mockRejectedValue(new Error('offline'));
  const offline = await DailySpotlightService.getFacts(library[0]);
  expect(offline.store).toEqual(store);
  expect(offline.players).toEqual(players);
  await DailySpotlightService.getFacts(library[0]);
  expect(window.electronAPI.steamSpotlight).toHaveBeenCalledTimes(2);
  DailySpotlightService.setEnabled(false);
  jest.setSystemTime(new Date(NOW.getTime() + 50 * 3600000));
  expect((await DailySpotlightService.getFacts(library[0])).players).toEqual(players);
  expect(window.electronAPI.steamSpotlight).toHaveBeenCalledTimes(2);
});

test('browser-only, malformed storage and storage-write failures are safe', async () => {
  StorageService.set('dailySpotlightSelectionV1', 'broken');
  StorageService.set('dailySpotlightFactsV1', []);
  jest.spyOn(StorageService, 'set').mockReturnValue(false);
  expect(DailySpotlightService.selectGame(library)).toBeTruthy();
  delete window.electronAPI;
  expect(await DailySpotlightService.getFacts(library[0])).toBeNull();
});

test('keeps cached entries bounded', async () => {
  DailySpotlightService.setEnabled(true);
  for (let appid = 1; appid <= 66; appid += 1) {
    await DailySpotlightService.getFacts({ platform: 'steam', appid });
    jest.setSystemTime(Date.now() + 1);
  }
  expect(Object.keys(StorageService.get('dailySpotlightFactsV1'))).toHaveLength(64);
});
