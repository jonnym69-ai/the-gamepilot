import ReleaseTrackerService from './ReleaseTrackerService';
import WishlistService from './WishlistService';
import StorageService from './StorageService';

jest.mock('./WishlistService', () => ({
  __esModule: true,
  default: {
    isEnabled: jest.fn(() => true),
    getWishlist: jest.fn(() => []),
  },
}));

const INFO_KEY = 'wishlistReleaseInfoV1';
const ANNOUNCED_KEY = 'wishlistReleaseAnnouncedV1';

const daysFromNow = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

const makeItem = (appid, name) => ({ key: name.toLowerCase(), name, steamAppID: appid });
const makeItems = (entries) => entries.map(([appid, entry]) => ({ appid, item: makeItem(appid, entry.name) }));

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  WishlistService.isEnabled.mockReturnValue(true);
  WishlistService.getWishlist.mockReturnValue([]);
  delete window.electronAPI;
});

describe('parseSteamReleaseDate', () => {
  test.each(['12 Dec, 2026', 'Dec 12, 2026', 'December 12, 2026'])('parses %s as day precision', (text) => {
    const parsed = ReleaseTrackerService.parseSteamReleaseDate(text);
    expect(parsed.precision).toBe('day');
    expect(parsed.label).toBe(text);
    expect(new Date(parsed.releaseAt).getFullYear()).toBe(2026);
    expect(new Date(parsed.releaseAt).getMonth()).toBe(11);
    expect(new Date(parsed.releaseAt).getDate()).toBe(12);
  });

  test.each(['December 2026', 'Dec 2026'])('parses %s as month precision', (text) => {
    const parsed = ReleaseTrackerService.parseSteamReleaseDate(text);
    expect(parsed.precision).toBe('month');
    expect(new Date(parsed.releaseAt).getDate()).toBe(1);
    expect(new Date(parsed.releaseAt).getMonth()).toBe(11);
  });

  test('parses quarter as first day of the quarter', () => {
    const parsed = ReleaseTrackerService.parseSteamReleaseDate('Q1 2027');
    expect(parsed.precision).toBe('quarter');
    expect(new Date(parsed.releaseAt).getMonth()).toBe(0);
    expect(new Date(parsed.releaseAt).getDate()).toBe(1);
  });

  test('parses bare year', () => {
    const parsed = ReleaseTrackerService.parseSteamReleaseDate('2027');
    expect(parsed.precision).toBe('year');
    expect(new Date(parsed.releaseAt).getMonth()).toBe(0);
  });

  test.each(['Coming soon', 'TBA', 'To be announced', ''])('treats %s as tba', (text) => {
    const parsed = ReleaseTrackerService.parseSteamReleaseDate(text);
    expect(parsed.precision).toBe('tba');
    expect(parsed.releaseAt).toBeNull();
  });
});

describe('formatCountdown', () => {
  const now = new Date();
  test('out today / tomorrow / days / weeks boundaries', () => {
    const at = (days) => ({ precision: 'day', releaseAt: daysFromNow(days) });
    expect(ReleaseTrackerService.formatCountdown(at(0), now)).toBe('Out today');
    expect(ReleaseTrackerService.formatCountdown(at(1), now)).toBe('Tomorrow');
    expect(ReleaseTrackerService.formatCountdown(at(5), now)).toBe('In 5 days');
    expect(ReleaseTrackerService.formatCountdown(at(14), now)).toBe('In 14 days');
    expect(ReleaseTrackerService.formatCountdown(at(15), now)).toBe('In 2 weeks');
  });

  test('non-day precision returns the label', () => {
    expect(ReleaseTrackerService.formatCountdown({ precision: 'quarter', label: 'Q1 2027' })).toBe('Q1 2027');
    expect(ReleaseTrackerService.formatCountdown({ precision: 'month', label: 'December 2026' })).toBe('December 2026');
    expect(ReleaseTrackerService.formatCountdown({ precision: 'tba', label: 'Coming soon' })).toBe('Coming soon');
  });
});

describe('summary building', () => {
  test('orders day before anchored precision before tba', () => {
    const items = makeItems([
      ['1', { name: 'Quarter Game' }],
      ['2', { name: 'Day Game' }],
      ['3', { name: 'Tba Game' }],
    ]);
    StorageService.set(INFO_KEY, {
      1: { precision: 'quarter', releaseAt: daysFromNow(60), label: 'Q1 2027' },
      2: { precision: 'day', releaseAt: daysFromNow(30), label: 'Dec 1, 2026' },
      3: { precision: 'tba', releaseAt: null, label: 'TBA' },
    });
    const summary = ReleaseTrackerService.buildAndStoreSummary(items);
    expect(summary.upcoming.map((r) => r.name)).toEqual(['Day Game', 'Quarter Game', 'Tba Game']);
    expect(summary.nextRelease.name).toBe('Day Game');
  });

  test('marks coming_soon=false and past day-precision as released', () => {
    const items = makeItems([
      ['1', { name: 'Released By Flag' }],
      ['2', { name: 'Released By Date' }],
      ['3', { name: 'Past Quarter Still Upcoming' }],
    ]);
    StorageService.set(INFO_KEY, {
      1: { comingSoon: false, precision: 'day', releaseAt: daysFromNow(40), label: 'Dec 2026' },
      2: { comingSoon: true, precision: 'day', releaseAt: daysFromNow(-1), label: 'Yesterday' },
      3: { comingSoon: true, precision: 'quarter', releaseAt: daysFromNow(-30), label: 'Q3 2026' },
    });
    const summary = ReleaseTrackerService.buildAndStoreSummary(items);
    expect(summary.releasedToday.map((r) => r.name)).toEqual(['Released By Date', 'Released By Flag']);
    expect(summary.upcoming.map((r) => r.name)).toEqual(['Past Quarter Still Upcoming']);
  });
});

describe('consumeReleaseDayAnnouncements', () => {
  test('announces each appid once', () => {
    const items = makeItems([['1', { name: 'Out Now' }]]);
    StorageService.set(INFO_KEY, {
      1: { comingSoon: false, precision: 'day', releaseAt: daysFromNow(1), label: 'x' },
    });
    ReleaseTrackerService.buildAndStoreSummary(items);
    const first = ReleaseTrackerService.consumeReleaseDayAnnouncements();
    expect(first.map((r) => r.name)).toEqual(['Out Now']);
    expect(ReleaseTrackerService.consumeReleaseDayAnnouncements()).toEqual([]);
  });

  test('skips already-announced appids on later releases', () => {
    StorageService.set(ANNOUNCED_KEY, ['1']);
    const items = makeItems([
      ['1', { name: 'Old Release' }],
      ['2', { name: 'New Release' }],
    ]);
    StorageService.set(INFO_KEY, {
      1: { comingSoon: false, precision: 'day', releaseAt: daysFromNow(-2), label: 'x' },
      2: { comingSoon: false, precision: 'day', releaseAt: daysFromNow(1), label: 'x' },
    });
    ReleaseTrackerService.buildAndStoreSummary(items);
    const fresh = ReleaseTrackerService.consumeReleaseDayAnnouncements();
    expect(fresh.map((r) => r.name)).toEqual(['New Release']);
  });
});

describe('refresh', () => {
  test('fetches release dates through the bridge and stores the summary', async () => {
    WishlistService.getWishlist.mockReturnValue([makeItem('12345', 'Future Game')]);
    window.electronAPI = {
      steamStoreDetails: jest.fn(async () => ({
        ok: true,
        data: { release_date: { coming_soon: true, date: 'December 12, 2026' } },
      })),
    };
    const summary = await ReleaseTrackerService.refresh();
    expect(window.electronAPI.steamStoreDetails).toHaveBeenCalledWith('12345');
    expect(summary.nextRelease.name).toBe('Future Game');
    expect(ReleaseTrackerService.getReleaseInfo('12345').precision).toBe('day');
  });

  test('serves cache within TTL without refetching', async () => {
    WishlistService.getWishlist.mockReturnValue([makeItem('9', 'Cached Game')]);
    StorageService.set(INFO_KEY, {
      9: { precision: 'day', releaseAt: daysFromNow(30), label: 'x', fetchedAt: Date.now() },
    });
    window.electronAPI = { steamStoreDetails: jest.fn(async () => ({ ok: true, data: {} })) };
    await ReleaseTrackerService.refresh();
    expect(window.electronAPI.steamStoreDetails).not.toHaveBeenCalled();
  });

  test('no electronAPI still builds the summary from cache', async () => {
    WishlistService.getWishlist.mockReturnValue([makeItem('7', 'Offline Game')]);
    StorageService.set(INFO_KEY, {
      7: { precision: 'day', releaseAt: daysFromNow(10), label: 'x', fetchedAt: Date.now() },
    });
    const summary = await ReleaseTrackerService.refresh();
    expect(summary.nextRelease.name).toBe('Offline Game');
  });
});
