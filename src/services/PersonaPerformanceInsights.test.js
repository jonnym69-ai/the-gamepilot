import { PersonaPerformanceInsights } from './PersonaPerformanceInsights';

describe('PersonaPerformanceInsights', () => {
  describe('estimateSessionMinutes', () => {
    test('returns null when game has no usable signals', () => {
      expect(PersonaPerformanceInsights.estimateSessionMinutes({})).toBe(null);
      expect(PersonaPerformanceInsights.estimateSessionMinutes(null)).toBe(null);
    });

    test('uses explicit estimated_session_minutes when provided', () => {
      expect(PersonaPerformanceInsights.estimateSessionMinutes({ estimated_session_minutes: 47 })).toBe(47);
    });

    test('clamps minimum to 10 minutes', () => {
      expect(PersonaPerformanceInsights.estimateSessionMinutes({ estimated_session_minutes: 5 })).toBe(10);
    });

    test('derives average from time_played / launch_count when both exist', () => {
      expect(PersonaPerformanceInsights.estimateSessionMinutes({ time_played: 600, launch_count: 10 })).toBe(60);
    });

    test('falls back to time_played alone when no launch_count', () => {
      expect(PersonaPerformanceInsights.estimateSessionMinutes({ time_played: 75 })).toBe(75);
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
