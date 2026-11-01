import { getSeasonalTheme, matchesSeasonalTheme } from './SeasonalDiscoveryService';

beforeEach(() => localStorage.clear());

test('theme exists only in October and December', () => {
  expect(getSeasonalTheme(new Date('2026-10-15T12:00:00Z'))?.id).toBe('halloween');
  expect(getSeasonalTheme(new Date('2026-12-15T12:00:00Z'))?.id).toBe('christmas');
  expect(getSeasonalTheme(new Date('2026-11-15T12:00:00Z'))).toBeNull();
  expect(getSeasonalTheme(new Date('2026-01-15T12:00:00Z'))).toBeNull();
});

test('matches exact metadata terms only, on strings or {name} objects', () => {
  const theme = getSeasonalTheme(new Date('2026-10-15T12:00:00Z'));
  expect(matchesSeasonalTheme({ genres: ['Horror'] }, theme)).toBe(true);
  expect(matchesSeasonalTheme({ tags: [{ name: 'Survival-Horror' }] }, theme)).toBe(true);
  expect(matchesSeasonalTheme({ genres: ['Action'] }, theme)).toBe(false);
  expect(matchesSeasonalTheme({ name: 'Horror Nights' }, theme)).toBe(false); // no title guessing
  expect(matchesSeasonalTheme({}, null)).toBe(false);
  const christmas = getSeasonalTheme(new Date('2026-12-15T12:00:00Z'));
  expect(matchesSeasonalTheme({ genres: ['Cozy'] }, christmas)).toBe(true);
  expect(matchesSeasonalTheme({ genres: ['Party-Based RPG'] }, christmas)).toBe(false);
});
