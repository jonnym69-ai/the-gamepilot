import FirstReadService from './FirstReadService';

const game = (name, imported, extra = {}) => ({ name, importedPlaytimeMinutes: imported, ...extra });

describe('FirstReadService', () => {
  test('returns null when there are enough real sessions', () => {
    const library = [game('Zomboid', 600)];
    const history = new Array(8).fill({ startTime: Date.now() });
    expect(FirstReadService.getFirstRead(library, history)).toBeNull();
  });

  test('returns null with no imported playtime', () => {
    expect(FirstReadService.getFirstRead([game('Zomboid', 0)], [])).toBeNull();
    expect(FirstReadService.getFirstRead([], [])).toBeNull();
  });

  test('summarizes imported playtime honestly', () => {
    const now = Date.now();
    const library = [
      game('Zomboid', 600, { platform: 'Steam', genres: ['Survival'], last_played: now - 86400000 }),
      game('Hades', 300, { platform: 'Steam', genres: ['Roguelike'], last_played: now - 2 * 86400000 }),
      game('Fortnite', 0, { platform: 'Epic' }), // Epic: library only, no minutes
      game('Celeste', 120, { platform: 'GOG' }),
    ];
    const read = FirstReadService.getFirstRead(library, []);
    expect(read.totalMinutes).toBe(1020);
    expect(read.topGames[0].name).toBe('Zomboid');
    expect(read.topGames).toHaveLength(3); // only imported games rank
    expect(read.importedGames).toBe(3);
    expect(read.ownedGames).toBe(4); // Epic games still count toward ownership
    expect(read.latestPlayed.name).toBe('Zomboid');
    expect(read.platformCounts[0]).toEqual(['Steam', 2]);
    expect(read.topGenres[0][0]).toBe('Survival');
  });
});
