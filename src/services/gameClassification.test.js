import { getLibraryRank, getTopPlayedGames, isTopShelfRank } from './gameClassification';

const game = (name, minutes) => ({ name, platform: 'Steam', time_played: minutes });

describe('getLibraryRank', () => {
  const library = [
    game('Most Played', 600),
    game('Mid Game', 300),
    game('Least Played', 60),
    game('Unplayed', 0),
    { name: 'GOG Galaxy', platform: 'GOG' }, // launcher token, not a game
  ];

  it('ranks games by blended playtime, most played first', () => {
    expect(getLibraryRank(library[0], library)).toEqual({ rank: 1, total: 4, minutes: 600 });
    expect(getLibraryRank(library[2], library)).toEqual({ rank: 3, total: 4, minutes: 60 });
  });

  it('excludes launcher non-games from the pool', () => {
    // GOG Galaxy is filtered out, so the pool is 4 not 5.
    expect(getLibraryRank(library[1], library).total).toBe(4);
  });

  it('ties share the same rank', () => {
    const tied = [game('A', 100), game('B', 100), game('C', 50)];
    expect(getLibraryRank(tied[0], tied).rank).toBe(1);
    expect(getLibraryRank(tied[1], tied).rank).toBe(1);
    expect(getLibraryRank(tied[2], tied).rank).toBe(3);
  });

  it('returns null for tiny libraries or a missing game', () => {
    expect(getLibraryRank(library[0], [library[0]])).toBeNull();
    expect(getLibraryRank(null, library)).toBeNull();
    expect(getLibraryRank(library[0], null)).toBeNull();
  });
});

describe('getTopPlayedGames', () => {
  const library = [
    game('Most Played', 600),
    game('Mid Game', 300),
    game('Least Played', 60),
    game('Unplayed', 0),
    { name: 'GOG Galaxy', platform: 'GOG' },
  ];

  it('returns played games sorted by blended playtime with ranks', () => {
    const top = getTopPlayedGames(library, 10);
    expect(top.map((entry) => entry.game.name)).toEqual(['Most Played', 'Mid Game', 'Least Played']);
    expect(top.map((entry) => entry.rank)).toEqual([1, 2, 3]);
    expect(top[0].total).toBe(4);
  });

  it('respects the limit but keeps ties at the cutoff rank', () => {
    const tied = [game('A', 500), game('B', 400), game('C', 400), game('D', 100)];
    const top = getTopPlayedGames(tied, 2);
    expect(top.map((entry) => entry.game.name)).toEqual(['A', 'B', 'C']);
    expect(top.map((entry) => entry.rank)).toEqual([1, 2, 2]);
  });

  it('skips unplayed games, non-games and tiny libraries', () => {
    expect(getTopPlayedGames(library, 10).some((entry) => entry.game.name === 'Unplayed')).toBe(false);
    expect(getTopPlayedGames(library, 10).some((entry) => entry.game.name === 'GOG Galaxy')).toBe(false);
    expect(getTopPlayedGames([game('Solo', 100)], 10)).toEqual([]);
    expect(getTopPlayedGames([game('A', 0), game('B', 0)], 10)).toEqual([]);
    expect(getTopPlayedGames(null, 10)).toEqual([]);
  });
});

describe('isTopShelfRank', () => {
  it('marks ranks 1-3 and the top 10% of large libraries', () => {
    expect(isTopShelfRank({ rank: 1, total: 4, minutes: 600 })).toBe(true);
    expect(isTopShelfRank({ rank: 3, total: 4, minutes: 60 })).toBe(true);
    expect(isTopShelfRank({ rank: 4, total: 4, minutes: 0 })).toBe(false);
    expect(isTopShelfRank({ rank: 4, total: 40, minutes: 10 })).toBe(true);
    expect(isTopShelfRank({ rank: 5, total: 40, minutes: 10 })).toBe(false);
  });

  it('never badges unplayed games or missing rank info', () => {
    expect(isTopShelfRank({ rank: 1, total: 4, minutes: 0 })).toBe(false);
    expect(isTopShelfRank(null)).toBe(false);
  });
});
