import { getRecapSeasonYear } from './recapSeason';

describe('getRecapSeasonYear', () => {
  test('December points at the year still in progress', () => {
    expect(getRecapSeasonYear(new Date(2026, 11, 1))).toBe(2026);
    expect(getRecapSeasonYear(new Date(2026, 11, 31))).toBe(2026);
  });

  test('early January points back at the year that just ended', () => {
    expect(getRecapSeasonYear(new Date(2027, 0, 1))).toBe(2026);
    expect(getRecapSeasonYear(new Date(2027, 0, 15))).toBe(2026);
  });

  test('returns null after the January grace period and outside the season', () => {
    expect(getRecapSeasonYear(new Date(2027, 0, 16))).toBeNull();
    expect(getRecapSeasonYear(new Date(2026, 5, 15))).toBeNull();
    expect(getRecapSeasonYear(new Date(2026, 10, 30))).toBeNull();
  });
});
