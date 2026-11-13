import GamingVitalsService from './GamingVitalsService';

const session = (daysAgo, minutes, hour = 21, game = 'Zomboid') => {
  const start = new Date();
  start.setDate(start.getDate() - daysAgo);
  start.setHours(hour, 30, 0, 0);
  const end = start.getTime() + minutes * 60000;
  return { gameName: game, startTime: start.getTime(), endTime: end, playtimeMinutes: minutes };
};

describe('GamingVitalsService', () => {
  test('returns null with no sessions', () => {
    expect(GamingVitalsService.getVitals([])).toBeNull();
  });

  test('summarizes today, week, streak and depth bands', () => {
    const now = new Date();
    const history = [
      session(0, 120, 21, 'Zomboid'), // tonight — deep
      session(1, 40, 21, 'Hades'), // yesterday — steady
      session(2, 8, 21, 'Balatro'), // — hop
      session(4, 200, 21, 'Zomboid'), // deep, gap day 3
    ];
    const v = GamingVitalsService.getVitals(history, now);
    expect(v.today.sessions).toBe(1);
    expect(v.today.minutes).toBe(120);
    expect(v.week.bands).toEqual({ deep: 2, steady: 1, hop: 1 });
    expect(v.streak).toBe(3); // today, yesterday, day-before
    expect(v.daysSinceLast).toBe(0);
    expect(v.typicalStartHour).toBe(21);
    expect(v.week.topGame).toBe('Zomboid');
    expect(v.week.focusLabel).toBe('a mixed rhythm');
  });

  test('rest days report days since last session and zero streak', () => {
    const history = [session(3, 60), session(4, 60), session(5, 60)];
    const v = GamingVitalsService.getVitals(history, new Date());
    expect(v.today.played).toBe(false);
    expect(v.streak).toBe(0);
    expect(v.daysSinceLast).toBe(3);
  });
});
