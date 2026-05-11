import { scoreCommandMatch } from './commandPaletteMatch';

const navCmd = {
  id: 'nav-library',
  label: 'Go to Library',
  keywords: 'library games browse'
};

const gameCmd = (overrides = {}) => ({
  id: `game-${overrides.appid || overrides.name || 'x'}`,
  label: `▶ ${overrides.name || 'Doom'}`,
  keywords: `${overrides.name || 'Doom'} ${overrides.platform || 'Steam'}`,
  game: { name: 'Doom', platform: 'Steam', ...overrides }
});

describe('scoreCommandMatch', () => {
  test('empty query returns a positive score (everything passes)', () => {
    expect(scoreCommandMatch(navCmd, '')).toBeGreaterThan(0);
    expect(scoreCommandMatch(navCmd, '   ')).toBeGreaterThan(0);
  });

  test('canonical-key prefix on a game scores higher than a nav substring match', () => {
    const game = gameCmd({ name: 'DOOM™' });
    const gameScore = scoreCommandMatch(game, 'doom');
    const navScore = scoreCommandMatch(navCmd, 'library');
    expect(gameScore).toBeGreaterThan(navScore);
  });

  test('matches game with trademark symbols using plain query', () => {
    expect(scoreCommandMatch(gameCmd({ name: 'DOOM™' }), 'doom')).toBeGreaterThan(0);
    expect(scoreCommandMatch(gameCmd({ name: 'Mass Effect®' }), 'mass')).toBeGreaterThan(0);
  });

  test('matches game with punctuation using plain query', () => {
    expect(scoreCommandMatch(gameCmd({ name: "Marvel's Spider-Man" }), 'spider')).toBeGreaterThan(0);
    expect(scoreCommandMatch(gameCmd({ name: 'Half-Life 2' }), 'halflife')).toBeGreaterThan(0);
  });

  test('multi-token queries require ALL tokens to appear', () => {
    expect(scoreCommandMatch(navCmd, 'library games')).toBeGreaterThan(0);
    expect(scoreCommandMatch(navCmd, 'library nope')).toBe(0);
  });

  test('returns 0 for unrelated query', () => {
    expect(scoreCommandMatch(navCmd, 'cyberpunk')).toBe(0);
    expect(scoreCommandMatch(gameCmd({ name: 'Doom' }), 'skyrim')).toBe(0);
  });

  test('word-prefix beats arbitrary substring', () => {
    const cmdWithPrefix = { id: 'a', label: 'Apply Focus Home preset', keywords: 'focus home minimal preset clean' };
    const prefixScore = scoreCommandMatch(cmdWithPrefix, 'focus');
    expect(prefixScore).toBeGreaterThanOrEqual(600);
  });

  test('canonical-key match on game beats word-prefix on nav', () => {
    const game = gameCmd({ name: 'Cyberpunk 2077' });
    const cmdNav = { id: 'a', label: 'Cyberpunk page', keywords: '' };
    const gameScore = scoreCommandMatch(game, 'cyber');
    const navScore = scoreCommandMatch(cmdNav, 'cyber');
    expect(gameScore).toBeGreaterThan(navScore);
  });

  test('does not crash on malformed commands', () => {
    expect(scoreCommandMatch({}, 'anything')).toBe(0);
    expect(scoreCommandMatch({ label: null, keywords: null }, 'anything')).toBe(0);
  });
});
