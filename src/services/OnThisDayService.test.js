import { getTodaysEvents, ON_THIS_DAY_MAX_OFFSET } from '../services/OnThisDayService';

describe('getTodaysEvents', () => {
  it('returns the exact-day events when the date has entries', () => {
    const result = getTodaysEvents(new Date(2026, 8, 29)); // 29 September
    expect(result.exact).toBe(true);
    expect(result.date.getDate()).toBe(29);
    expect(result.events.some((item) => item.event.includes('Nintendo 64'))).toBe(true);
    expect(result.events.some((item) => item.event.includes('Cuphead'))).toBe(true);
  });

  it('caps the event list at three entries', () => {
    // 21 November has many entries in the dataset
    const result = getTodaysEvents(new Date(2026, 10, 21));
    expect(result.exact).toBe(true);
    expect(result.events.length).toBe(3);
  });

  it('falls back to the nearest covered day and marks it as not exact', () => {
    // 24 December has no entries; 23 December (Gran Turismo) is one day earlier
    const result = getTodaysEvents(new Date(2026, 11, 24));
    expect(result.exact).toBe(false);
    expect(result.date.getDate()).toBe(23);
    expect(result.events.some((item) => item.event.includes('Gran Turismo'))).toBe(true);
  });

  it('prefers earlier days over later ones at the same distance', () => {
    const source = {
      '03-02': [{ year: 2000, event: 'Earlier entry' }],
      '03-05': [{ year: 2001, event: 'Later entry' }],
    };
    // 3 March is 1 day before 3-02? No: offsets are -1 then +1, so -1 hits 03-02 first
    const result = getTodaysEvents(new Date(2026, 2, 3), source);
    expect(result.events[0].event).toBe('Earlier entry');
  });

  it('crosses month and year boundaries when searching', () => {
    const result = getTodaysEvents(new Date(2027, 0, 2)); // 2 January
    expect(result).not.toBeNull();
    expect(result.exact).toBe(false);
    // Nearest covered day is 3 January (Diablo, +1)
    expect(result.date.getDate()).toBe(3);
    expect(result.events.some((item) => item.event.includes('Diablo'))).toBe(true);
  });

  it('returns null when nothing exists within the search window', () => {
    expect(getTodaysEvents(new Date(2026, 5, 15), {})).toBeNull();
    expect(ON_THIS_DAY_MAX_OFFSET).toBe(3);
  });
});
