import { FreeGameRadar, getEpicOfferState } from './FreeGameRadar';
import StorageService from './StorageService';

const NOW = new Date('2026-09-27T12:00:00Z').getTime();
const offer = (start, end, discount = 0) => ({
  startDate: start,
  endDate: end,
  discountSetting: { discountPercentage: discount },
});
const entry = (id, promotions, extra = {}) => ({
  id,
  title: `Game ${id}`,
  description: 'A public store description.',
  price: { totalPrice: { discountPrice: 0 } },
  catalogNs: { mappings: [{ pageSlug: `game-${id}`, pageType: 'productHome' }] },
  promotions: { promotionalOffers: [{ promotionalOffers: promotions }] },
  ...extra,
});
const current = offer('2026-09-24T15:00:00Z', '2026-10-01T15:00:00Z');

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(NOW);
  localStorage.clear();
  window.electronAPI = { epicFreeGames: jest.fn().mockResolvedValue({ ok: true, elements: [] }) };
});
afterEach(() => {
  delete window.electronAPI;
  jest.useRealTimers();
});

test('separates current, upcoming and expired offers and resolves mapped Epic product URLs', async () => {
  window.electronAPI.epicFreeGames.mockResolvedValue({
    ok: true,
    elements: [
      entry('current', [current]),
      entry('sale', [offer(current.startDate, current.endDate, 50)]),
      entry('expired', [offer('2026-09-01', '2026-09-20')]),
      entry('upcoming', [], {
        promotions: { upcomingPromotionalOffers: [{ promotionalOffers: [offer('2026-10-01', '2026-10-08')] }] },
      }),
      entry('invalid', [offer('bad', 'bad')]),
    ],
  });
  const result = await FreeGameRadar.getEpicRadar();
  expect(result.games.map((game) => game.id)).toEqual(['epic-current', 'epic-upcoming']);
  expect(result.games[0].url).toBe('https://store.epicgames.com/p/game-current');
  expect(getEpicOfferState(result.games[0])).toBe('available');
  expect(getEpicOfferState(result.games[1])).toBe('upcoming');
  expect(result.stale).toBe(false);
  expect(window.electronAPI.epicFreeGames).toHaveBeenCalledWith();
});

test('deduplicates concurrent requests and caches results without sending library information', async () => {
  await Promise.all([FreeGameRadar.getEpicRadar(), FreeGameRadar.getEpicRadar()]);
  await FreeGameRadar.getEpicRadar();
  expect(window.electronAPI.epicFreeGames).toHaveBeenCalledTimes(1);
  await FreeGameRadar.getEpicRadar({ forceRefresh: true });
  expect(window.electronAPI.epicFreeGames).toHaveBeenCalledTimes(2);
});

test('retains dated cached offers when offline, but never presents expired offers as claimable', async () => {
  window.electronAPI.epicFreeGames.mockResolvedValue({ ok: true, elements: [entry('current', [current])] });
  const original = await FreeGameRadar.getEpicRadar();
  jest.setSystemTime(NOW + 7200000);
  window.electronAPI.epicFreeGames.mockRejectedValue(new Error('offline'));
  const cached = await FreeGameRadar.getEpicRadar();
  expect(cached.stale).toBe(true);
  expect(cached.checkedAt).toBe(original.checkedAt);
  expect(cached.games).toHaveLength(1);
  jest.setSystemTime(new Date('2026-10-02'));
  expect((await FreeGameRadar.getEpicRadar()).games).toHaveLength(0);
});

test('mystery titles and unsafe slugs link to the official radar rather than a fabricated product', async () => {
  window.electronAPI.epicFreeGames.mockResolvedValue({
    ok: true,
    elements: [
      entry('mystery', [current], { title: 'Mystery Game' }),
      entry('bad', [current], { catalogNs: { mappings: [{ pageSlug: '../bad?x=1' }] } }),
    ],
  });
  expect(
    (await FreeGameRadar.getEpicRadar()).games.every((game) => game.url === 'https://store.epicgames.com/free-games')
  ).toBe(true);
});

test('reports desktop-only availability and tolerates malformed saved caches', async () => {
  StorageService.set('epicFreeGameRadarCacheV1', { games: 'bad', checkedAt: NOW });
  delete window.electronAPI;
  const result = await FreeGameRadar.getEpicRadar();
  expect(result.games).toEqual([]);
  expect(result.error).toMatch(/desktop app/i);
});
