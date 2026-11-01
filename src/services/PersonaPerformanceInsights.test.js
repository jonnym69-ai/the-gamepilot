import { PersonaPerformanceInsights } from './PersonaPerformanceInsights';

describe('PersonaPerformanceInsights', () => {
  const session = (gameName, minutes, daysAgo = 1) => ({
    gameName,
    endTime: Date.now() - daysAgo * 86400000,
    playtimeMinutes: minutes,
  });

  beforeEach(() => localStorage.clear());

  describe('estimateSessionMinutes', () => {
    test('returns null when game has no usable signals', () => {
      expect(PersonaPerformanceInsights.estimateSessionMinutes({})).toBe(null);
      expect(PersonaPerformanceInsights.estimateSessionMinutes(null)).toBe(null);
    });

    test('uses the recorded-session median when at least three sessions exist', () => {
      const game = { name: 'Sessioned' };
      const history = [session('Sessioned', 20, 3), session('Sessioned', 30, 2), session('Sessioned', 120, 1)];
      expect(PersonaPerformanceInsights.estimateSessionMinutes(game, history)).toBe(30);
    });

    test('recorded median beats an explicit estimate', () => {
      const game = { name: 'Sessioned', estimated_session_minutes: 90 };
      const history = [session('Sessioned', 20), session('Sessioned', 30), session('Sessioned', 40)];
      expect(PersonaPerformanceInsights.estimateSessionMinutes(game, history)).toBe(30);
    });

    test('sessions of other games are ignored', () => {
      const game = { name: 'Mine' };
      const history = [session('Other Game', 45), session('Other Game', 60), session('Other Game', 90)];
      expect(PersonaPerformanceInsights.estimateSessionMinutes(game, history)).toBe(null);
    });

    test('fewer than three sessions falls back to the explicit estimate', () => {
      const game = { name: 'Two Sessions', estimated_session_minutes: 45 };
      const history = [session('Two Sessions', 10), session('Two Sessions', 20)];
      expect(PersonaPerformanceInsights.estimateSessionMinutes(game, history)).toBe(45);
      expect(PersonaPerformanceInsights.estimateSessionMinutes({ name: 'Two Sessions' }, history)).toBe(null);
    });

    test('uses explicit estimated_session_minutes when provided', () => {
      expect(PersonaPerformanceInsights.estimateSessionMinutes({ estimated_session_minutes: 47 })).toBe(47);
    });

    test('clamps minimum to 10 minutes', () => {
      expect(PersonaPerformanceInsights.estimateSessionMinutes({ estimated_session_minutes: 5 })).toBe(10);
    });

    test('no longer derives a quotient from lifetime playtime / launch count', () => {
      expect(PersonaPerformanceInsights.estimateSessionMinutes({ time_played: 600, launch_count: 10 })).toBe(null);
    });

    test('returns null when only a lifetime total exists without launches', () => {
      expect(PersonaPerformanceInsights.estimateSessionMinutes({ time_played: 75 })).toBe(null);
      expect(PersonaPerformanceInsights.estimateSessionMinutes({ time_played: 75, launch_count: 0 })).toBe(null);
    });

    test('rejects non-finite, zero, and negative inputs', () => {
      expect(PersonaPerformanceInsights.estimateSessionMinutes({ estimated_session_minutes: NaN })).toBe(null);
      expect(PersonaPerformanceInsights.estimateSessionMinutes({ estimated_session_minutes: Infinity })).toBe(null);
      expect(PersonaPerformanceInsights.estimateSessionMinutes({ estimated_session_minutes: 0 })).toBe(null);
      expect(PersonaPerformanceInsights.estimateSessionMinutes({ estimated_session_minutes: -30 })).toBe(null);
      expect(PersonaPerformanceInsights.estimateSessionMinutes({ time_played: NaN, launch_count: 5 })).toBe(null);
      expect(PersonaPerformanceInsights.estimateSessionMinutes({ time_played: Infinity, launch_count: 5 })).toBe(null);
      expect(PersonaPerformanceInsights.estimateSessionMinutes({ time_played: 0, launch_count: 5 })).toBe(null);
      expect(PersonaPerformanceInsights.estimateSessionMinutes({ time_played: -100, launch_count: 5 })).toBe(null);
      expect(PersonaPerformanceInsights.estimateSessionMinutes({ time_played: 600, launch_count: -2 })).toBe(null);
    });
  });

  describe('extractGenres', () => {
    test('returns a copy of the genres array', () => {
      const game = { genres: ['RPG', 'Strategy'] };
      const result = PersonaPerformanceInsights.extractGenres(game);
      expect(result).toEqual(['RPG', 'Strategy']);
      expect(result).not.toBe(game.genres);
    });

    test('appends fallback genre when not already present', () => {
      expect(PersonaPerformanceInsights.extractGenres({ genres: ['RPG'] }, 'Strategy')).toEqual(['RPG', 'Strategy']);
      expect(PersonaPerformanceInsights.extractGenres({ genres: ['RPG'] }, 'RPG')).toEqual(['RPG']);
    });

    test('handles missing genres safely', () => {
      expect(PersonaPerformanceInsights.extractGenres({}, 'Action')).toEqual(['Action']);
      expect(PersonaPerformanceInsights.extractGenres({})).toEqual([]);
    });
  });
});
