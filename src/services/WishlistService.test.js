import WishlistService from './WishlistService';
import StorageService from './StorageService';
import SteamWishlistService from './SteamWishlistService';

jest.mock('./StorageService', () => {
  const store = new Map();
  const PREFIX = 'gamepilot-';
  return {
    __esModule: true,
    default: {
      get: jest.fn((key, fallback) => (store.has(`${PREFIX}${key}`) ? store.get(`${PREFIX}${key}`) : fallback)),
      set: jest.fn((key, value) => store.set(`${PREFIX}${key}`, value)),
      getString: jest.fn((key, fallback = '') =>
        store.has(`${PREFIX}${key}`) ? store.get(`${PREFIX}${key}`) : fallback
      ),
      setString: jest.fn((key, value) => store.set(`${PREFIX}${key}`, String(value))),
      __clear: () => store.clear(),
    },
  };
});

jest.mock('../GameGenreDatabase', () => ({ getGameGenres: jest.fn(() => []) }));

beforeEach(() => {
  StorageService.__clear();
  WishlistService.setEnabled(true);
});

describe('WishlistService alert summary', () => {
  it('dispatches the wishlist-alerts event when the summary is written', () => {
    const listener = jest.fn();
    window.addEventListener('gamepilot:wishlist-alerts', listener);
    WishlistService.addGame({ name: 'Stardew Valley' });
    expect(listener).toHaveBeenCalled();
    window.removeEventListener('gamepilot:wishlist-alerts', listener);
  });

  it('counts threshold drops in the alert summary', () => {
    WishlistService.addGame({ name: 'Hades' });
    WishlistService.setThreshold('Hades', 10);
    // Inject a price under threshold via the service's own cache write path
    const items = WishlistService.getWishlist();
    const withPrice = items.map((item) =>
      item.key === 'hades' ? { ...item, currentPrice: { price: 5, store: 'Steam' }, historicalLow: null } : item
    );
    StorageService.set('wishlistItemsV1', withPrice);
    const summary = WishlistService.recalculateAlertSummary();
    expect(summary.count).toBe(1);
    expect(summary.drops[0].name).toBe('Hades');
  });

  it('removes games the user now owns', () => {
    WishlistService.addGame({ name: 'Portal 2' });
    WishlistService.addGame({ name: 'Celeste' });
    const result = WishlistService.removeOwnedItems([{ name: 'Portal 2', platform: 'steam' }]);
    expect(result.removed).toBe(1);
    expect(WishlistService.getWishlist()).toHaveLength(1);
  });
});

describe('Steam wishlist import', () => {
  let originalAPI;

  beforeEach(() => {
    originalAPI = window.electronAPI;
    window.electronAPI = { steamWishlist: jest.fn() };
    SteamWishlistService.setEnabled(true);
    SteamWishlistService.setSteamId('76561198042965266');
  });

  afterEach(() => {
    window.electronAPI = originalAPI;
  });

  it('preserves local games and reports partial imports without marking them fresh for 24 hours', async () => {
    WishlistService.addGame({ name: 'Celeste' });
    WishlistService.setThreshold('Celeste', 8);
    window.electronAPI.steamWishlist.mockResolvedValue({
      success: true,
      totalFetched: 3,
      skippedCount: 1,
      items: [
        { name: 'Celeste', appid: '504230' },
        { name: 'Hades', appid: '1145360' },
      ],
    });
    const result = await SteamWishlistService.sync();
    expect(result).toMatchObject({ success: true, count: 1, totalFetched: 3, skippedCount: 1 });
    expect(SteamWishlistService.getLastResult()).toEqual(result);
    expect(SteamWishlistService.getLastSyncAt()).toBeNull();
    expect(WishlistService.getWishlist()).toHaveLength(2);
    expect(WishlistService.getWishlist().find((item) => item.name === 'Celeste').threshold).toBe(8);
  });

  it('respects the stale guard after a complete import', async () => {
    window.electronAPI.steamWishlist.mockResolvedValue({ success: true, items: [{ name: 'Hades', appid: '1145360' }] });
    await SteamWishlistService.sync();
    await SteamWishlistService.refreshIfStale();
    expect(window.electronAPI.steamWishlist).toHaveBeenCalledTimes(1);
    expect(SteamWishlistService.getLastSyncAt()).toEqual(expect.any(Number));
  });

  it('persists imported artwork as thumb and backfills entries that missed it', async () => {
    WishlistService.addGame({ name: 'Nioh 3' }); // pre-existing entry with no art
    window.electronAPI.steamWishlist.mockResolvedValue({
      success: true,
      items: [
        {
          name: 'Nioh 3',
          appid: '3681010',
          image: 'https://shared.akamai.steamstatic.com/nioh3.jpg',
          genres: ['Action'],
        },
        { name: 'Hades', appid: '1145360', image: 'https://shared.akamai.steamstatic.com/hades.jpg' },
      ],
    });
    await SteamWishlistService.sync();
    const items = WishlistService.getWishlist();
    expect(items.find((i) => i.name === 'Nioh 3').thumb).toBe('https://shared.akamai.steamstatic.com/nioh3.jpg');
    expect(items.find((i) => i.name === 'Nioh 3').steamAppID).toBe('3681010');
    expect(items.find((i) => i.name === 'Hades').thumb).toBe('https://shared.akamai.steamstatic.com/hades.jpg');
  });

  it('keeps existing wishlist entries on fetch failure', async () => {
    WishlistService.addGame({ name: 'Celeste' });
    window.electronAPI.steamWishlist.mockResolvedValue({ success: false, error: 'Steam is unavailable.', items: [] });
    expect(await SteamWishlistService.sync()).toMatchObject({ success: false, error: 'Steam is unavailable.' });
    expect(WishlistService.getWishlist()).toHaveLength(1);
    expect(SteamWishlistService.getLastSyncAt()).toBeNull();
  });
});

describe('WishlistService price fetch', () => {
  afterEach(() => {
    delete global.fetch;
  });

  it('backfills artwork fields from the CheapShark info block on price refresh', async () => {
    WishlistService.addGame({ name: 'Hollow Knight' }); // entry with no art fields
    global.fetch = jest.fn((url) => {
      if (url.includes('/games?title=')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ gameID: '999', steamAppID: '367520' }]),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            info: { steamAppID: '367520', thumb: 'https://cdn.example.com/hk.jpg' },
            deals: [],
            cheapestPriceEver: null,
          }),
      });
    });

    await WishlistService.fetchPrice('Hollow Knight', { force: true });

    const item = WishlistService.getWishlist().find((i) => i.name === 'Hollow Knight');
    expect(item.steamAppID).toBe('367520');
    expect(item.thumb).toBe('https://cdn.example.com/hk.jpg');
  });
});

describe('WishlistService store compare, history, ranking and verdicts', () => {
  const mockDealResponse =
    (deals, low = null) =>
    (url) => {
      if (url.includes('/games?title=')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ gameID: '42', steamAppID: '1145360' }]),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ info: {}, deals, cheapestPriceEver: low }),
      });
    };

  afterEach(() => {
    delete global.fetch;
  });

  it('stores every store offer sorted cheapest-first', async () => {
    WishlistService.addGame({ name: 'Hades' });
    global.fetch = jest.fn(
      mockDealResponse([
        { storeID: '1', price: '12.99', retailPrice: '24.99', savings: '48', dealID: 'd1' },
        { storeID: '7', price: '9.99', retailPrice: '24.99', savings: '60', dealID: 'd2' },
      ])
    );
    await WishlistService.fetchPrice('Hades', { force: true });
    const item = WishlistService.getWishlist()[0];
    expect(item.deals.map((d) => d.store)).toEqual(['GOG', 'Steam']);
    expect(item.deals[0].price).toBe(9.99);
    expect(item.currentPrice.store).toBe('GOG');
  });

  it('appends one price-history point per calendar day', async () => {
    WishlistService.addGame({ name: 'Celeste' });
    global.fetch = jest.fn(
      mockDealResponse([{ storeID: '1', price: '9.99', retailPrice: '19.99', savings: '50', dealID: 'x' }])
    );
    await WishlistService.fetchPrice('Celeste', { force: true });
    expect(WishlistService.getWishlist()[0].priceHistory).toHaveLength(1);
    await WishlistService.fetchPrice('Celeste', { force: true });
    expect(WishlistService.getWishlist()[0].priceHistory).toHaveLength(1); // same day replaces, not appends
    const items = WishlistService.getWishlist();
    items[0].priceHistory = [{ t: Date.now() - 86400000, p: 14.99 }, ...items[0].priceHistory];
    StorageService.set('wishlistItemsV1', items);
    await WishlistService.fetchPrice('Celeste', { force: true });
    expect(WishlistService.getWishlist()[0].priceHistory).toHaveLength(2);
  });

  it('reorders items with moveItem', () => {
    WishlistService.addGame({ name: 'A One' });
    WishlistService.addGame({ name: 'B Two' });
    WishlistService.addGame({ name: 'C Three' });
    WishlistService.moveItem('C Three', 'A One');
    expect(WishlistService.getWishlist().map((i) => i.name)).toEqual(['C Three', 'A One', 'B Two']);
    WishlistService.moveItem('A One', null);
    expect(WishlistService.getWishlist().map((i) => i.name)).toEqual(['C Three', 'B Two', 'A One']);
  });

  it('returns buy/wait verdicts from stored price data', () => {
    expect(WishlistService.getVerdict({ currentPrice: { price: 5 }, historicalLow: { price: 7 } }).kind).toBe('low');
    expect(
      WishlistService.getVerdict({ currentPrice: { price: 8, cut: 0 }, threshold: 10, historicalLow: { price: 6 } })
        .kind
    ).toBe('target');
    expect(WishlistService.getVerdict({ currentPrice: { price: 10, cut: 55 }, historicalLow: { price: 2 } }).kind).toBe(
      'deal'
    );
    expect(WishlistService.getVerdict({ currentPrice: { price: 20, cut: 5 }, historicalLow: { price: 8 } }).kind).toBe(
      'wait'
    );
    expect(WishlistService.getVerdict({ currentPrice: { price: 20, cut: 5 }, historicalLow: { price: 19 } }).kind).toBe(
      'fair'
    );
    expect(WishlistService.getVerdict({ currentPrice: null })).toBeNull();
  });
});
