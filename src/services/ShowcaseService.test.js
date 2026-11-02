import {
  getShowcaseNames,
  hasCustomShowcase,
  setShowcaseNames,
  resetShowcase,
  getShowcaseGames,
  SHOWCASE_STORAGE_KEY,
  SHOWCASE_LIMIT,
} from './ShowcaseService';

const game = (name, minutes) => ({ name, playtimeForever: minutes });

const library = [
  game('Alpha', 600),
  game('Beta', 1200),
  game('Gamma', 300),
  game('Delta', 900),
  game('Echo', 1800),
  game('Foxtrot', 60),
  game('Golf', 2400),
];

beforeEach(() => {
  localStorage.clear();
});

describe('setShowcaseNames', () => {
  it('stores picks in order and reads them back', () => {
    setShowcaseNames(['Beta', 'Alpha']);
    expect(getShowcaseNames()).toEqual(['Beta', 'Alpha']);
    expect(hasCustomShowcase()).toBe(true);
  });

  it('dedupes, trims, and caps at the showcase limit', () => {
    setShowcaseNames(['Alpha', ' Beta ', 'Alpha', 'Gamma', 'Delta', 'Echo', 'Foxtrot', 'Golf']);
    expect(getShowcaseNames()).toEqual(['Alpha', 'Beta', 'Gamma', 'Delta', 'Echo', 'Foxtrot']);
    expect(getShowcaseNames().length).toBe(SHOWCASE_LIMIT);
  });

  it('clears the key when given an empty list (back to auto)', () => {
    setShowcaseNames(['Alpha']);
    setShowcaseNames([]);
    expect(getShowcaseNames()).toBeNull();
    expect(hasCustomShowcase()).toBe(false);
  });

  it('filters out non-string junk', () => {
    setShowcaseNames(['Alpha', null, undefined, 42, '']);
    expect(getShowcaseNames()).toEqual(['Alpha']);
  });
});

describe('resetShowcase', () => {
  it('removes stored picks', () => {
    setShowcaseNames(['Alpha']);
    resetShowcase();
    expect(getShowcaseNames()).toBeNull();
  });
});

describe('getShowcaseGames', () => {
  it('auto-fills with the most-played games, ordered by playtime', () => {
    const { games, mode } = getShowcaseGames(library);
    expect(mode).toBe('auto');
    expect(games.map((g) => g.name)).toEqual(['Golf', 'Echo', 'Beta', 'Delta', 'Alpha', 'Gamma']);
  });

  it('returns custom picks in pick order', () => {
    setShowcaseNames(['Gamma', 'Alpha']);
    const { games, mode } = getShowcaseGames(library);
    expect(mode).toBe('custom');
    expect(games.map((g) => g.name)).toEqual(['Gamma', 'Alpha']);
  });

  it('drops picks that are no longer in the library', () => {
    setShowcaseNames(['Gamma', 'Missing Game', 'Alpha']);
    const { games } = getShowcaseGames(library);
    expect(games.map((g) => g.name)).toEqual(['Gamma', 'Alpha']);
  });

  it('falls back to auto when every custom pick is gone', () => {
    setShowcaseNames(['Missing Game']);
    const { games, mode } = getShowcaseGames(library);
    expect(mode).toBe('auto');
    expect(games.length).toBeGreaterThan(0);
  });

  it('handles an empty or missing library', () => {
    expect(getShowcaseGames([]).games).toEqual([]);
    expect(getShowcaseGames(null).games).toEqual([]);
  });

  it('handles corrupt storage gracefully', () => {
    localStorage.setItem(`gamepilot-${SHOWCASE_STORAGE_KEY}`, '{not json');
    const { games, mode } = getShowcaseGames(library);
    expect(mode).toBe('auto');
    expect(games.length).toBeGreaterThan(0);
  });
});
