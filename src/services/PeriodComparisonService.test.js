// PeriodComparisonService.test.js
import PeriodComparisonService from './PeriodComparisonService';

const session = (date, minutes, gameName = 'Game') => ({
  timestamp: date,
  playtimeMinutes: minutes,
  gameName,
});

const NOW = new Date(2026, 5, 15, 12, 0, 0); // June 15 2026

describe('PeriodComparisonService.buildYearOverYear', () => {
  test('returns null when there are no sessions in either window', () => {
    expect(PeriodComparisonService.buildYearOverYear([], NOW)).toBeNull();
    expect(PeriodComparisonService.buildYearOverYear(null, NOW)).toBeNull();
  });

  test('compares year-to-date with the same stretch of last year', () => {
    const sessions = [
      session(new Date(2026, 0, 10), 120, 'Project Zomboid'),
      session(new Date(2026, 2, 5), 180, 'Project Zomboid'),
      session(new Date(2026, 5, 1), 60, 'Terraria'),
      session(new Date(2025, 1, 10), 60, 'Elden Ring'),
      session(new Date(2025, 3, 20), 60, 'Elden Ring'),
      // Outside both windows — must not leak in.
      session(new Date(2025, 8, 1), 600, 'Cyberpunk 2077'),
      session(new Date(2024, 0, 5), 300, 'Skyrim'),
    ];

    const result = PeriodComparisonService.buildYearOverYear(sessions, NOW);

    expect(result.currentYear).toBe(2026);
    expect(result.previousYear).toBe(2025);
    expect(result.current.minutes).toBe(360);
    expect(result.current.sessions).toBe(3);
    expect(result.current.activeDays).toBe(3);
    expect(result.current.games).toBe(2);
    expect(result.current.topGame).toEqual({ name: 'Project Zomboid', hours: 5 });
    expect(result.previous.minutes).toBe(120);
    expect(result.previous.sessions).toBe(2);
    expect(result.previous.games).toBe(1);
    expect(result.previous.topGame.name).toBe('Elden Ring');
    expect(result.deltas.hours).toBe(200); // 360 vs 120
    expect(result.deltas.sessions).toBe(50);
    expect(result.deltas.games).toBe(100);
  });

  test('handles a first year with no prior-year data', () => {
    const sessions = [session(new Date(2026, 3, 1), 90, 'Hades')];
    const result = PeriodComparisonService.buildYearOverYear(sessions, NOW);

    expect(result.current.sessions).toBe(1);
    expect(result.previous.sessions).toBe(0);
    expect(result.deltas.hours).toBeNull();
    expect(result.deltas.sessions).toBeNull();
  });

  test('ignores sessions with no usable duration', () => {
    const sessions = [
      session(new Date(2026, 0, 2), 0, 'Launcher'),
      session(new Date(2026, 0, 3), -50, 'Broken'),
      { timestamp: new Date(2026, 0, 4), gameName: 'NoMinutes' },
      session(new Date(2026, 0, 5), 45, 'Real Game'),
    ];
    const result = PeriodComparisonService.buildYearOverYear(sessions, NOW);

    expect(result.current.sessions).toBe(1);
    expect(result.current.minutes).toBe(45);
  });
});
