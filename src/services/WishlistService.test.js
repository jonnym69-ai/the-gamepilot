import WishlistService from './WishlistService';
import StorageService from './StorageService';

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
