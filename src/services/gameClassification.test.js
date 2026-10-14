import { getLibraryRank, isTopShelfRank } from './gameClassification';

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
