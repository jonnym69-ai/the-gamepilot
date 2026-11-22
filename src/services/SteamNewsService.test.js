import SteamNewsService from './SteamNewsService';
import StorageService from './StorageService';

const APPID = '10';
const game = (extra = {}) => ({ name: 'News Game', platform: 'Steam', appid: APPID, ...extra });
const item = (dateMs, title = 'Post', feedLabel = '') => ({ gid: title, title, url: 'u', dateMs, feedLabel });

const seedCache = (items) => {
  StorageService.set('steamNewsCacheV2', {
    [APPID]: { found: true, fetchedAt: Date.now(), items },
  });
};

beforeEach(() => {
  localStorage.clear();
});

test('seconds, milliseconds and ISO last_played all mean the same moment', () => {
  const lpMs = 1700000000000; // 2023-11-14T22:13:20Z
  seedCache([item(lpMs - 60_000, 'Before'), item(lpMs + 60_000, 'After')]);
  for (const last of [1700000000, lpMs, new Date(lpMs).toISOString()]) {
    const status = SteamNewsService.getUpdateStatus(game({ last_played: last }));
    expect(status.sinceLastPlayed).toBe(true);
    expect(status.newerCount).toBe(1);
    expect(status.latest.title).toBe('After');
  }
  // camelCase lastPlayed works identically.
  expect(SteamNewsService.getUpdateStatus(game({ lastPlayed: 1700000000 })).newerCount).toBe(1);
});

test('latest is the newest valid post regardless of stored order', () => {
  const lpMs = 1700000000000;
  seedCache([item(lpMs + 300_000, 'Newest'), item(lpMs + 60_000, 'Middle'), item(lpMs + 180_000, 'Newer')]);
  const status = SteamNewsService.getUpdateStatus(game({ last_played: lpMs }));
  expect(status.newerCount).toBe(3);
  expect(status.latest.title).toBe('Newest');
});

test('future-dated posts are excluded, and a future lastPlayed never counts as since', () => {
  const lpMs = 1700000000000;
  const future = Date.now() + 365 * 86400000;
  seedCache([item(future, 'Scheduled'), item(lpMs + 60_000, 'Real')]);

  const status = SteamNewsService.getUpdateStatus(game({ last_played: lpMs }));
  expect(status.newerCount).toBe(1);
  expect(status.latest.title).toBe('Real');

  const futurePlayed = SteamNewsService.getUpdateStatus(game({ last_played: future }));
  expect(futurePlayed.sinceLastPlayed).toBe(false);

  seedCache([item(future, 'Only future')]);
  expect(SteamNewsService.getUpdateStatus(game({ last_played: lpMs }))).toBeNull();
});

test('unparseable last_played falls back to never-played framing', () => {
  seedCache([item(Date.now() - 86400000, 'Recent')]);
  const status = SteamNewsService.getUpdateStatus(game({ last_played: 'not-a-date' }));
  expect(status.sinceLastPlayed).toBe(false);
  expect(status.latest.title).toBe('Recent');
});

test('syndicated external feeds (feed_type 0) are dropped, official posts kept', async () => {
  window.electronAPI = {
    steamNews: jest.fn().mockResolvedValue({
      ok: true,
      items: [
        {
          gid: '1',
          title: 'Patch 1.0',
          date: 1700000000,
          contents: '',
          feed_type: 1,
          feedname: 'steam_community_announcements',
        },
        {
          gid: '2',
          title: 'Пост на русском',
          date: 1700000000,
          contents: '',
          feed_type: 0,
          feedname: 'PlayGround.ru - официальная группа',
        },
        { gid: '3', title: 'Legacy post', date: 1700000000, contents: '' },
      ],
    }),
  };

  const entry = await SteamNewsService.getNews(game(), { force: true });
  expect(entry.items.map((i) => i.title)).toEqual(['Patch 1.0', 'Legacy post']);

  delete window.electronAPI;
});
