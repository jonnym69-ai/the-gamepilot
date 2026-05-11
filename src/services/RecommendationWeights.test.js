import StorageService from './StorageService';
import {
  DEFAULT_RECOMMENDATION_WEIGHTS,
  RECOMMENDATION_WEIGHT_PRESETS,
  getRecommendationWeights,
  getActiveRecommendationWeights,
  invalidateRecommendationWeightsCache
} from './RecommendationWeights';

describe('RecommendationWeights', () => {
  beforeEach(() => {
    localStorage.clear();
    invalidateRecommendationWeightsCache();
  });

  describe('default shape', () => {
    test('exposes every weight needed by RecommendationEngine.scoreGameByBehavior', () => {
      // If this list ever drifts from the engine, scoring will silently use undefined.
      // Keep this assertion strict so the contract is visible.
      const requiredKeys = [
        'base',
        'moodHighRateBonus', 'moodMediumRateBonus', 'moodLowRateBonus',
        'moodHighRateThreshold', 'moodMediumRateThreshold',
        'genreHighRateBonus', 'genreMediumRateBonus', 'genreLowRateBonus',
        'genreHighRateThreshold', 'genreMediumRateThreshold',
        'sessionPerfectMatchBonus', 'sessionCloseMatchBonus', 'sessionNearMatchBonus',
        'sessionMatchDiffDivisor',
        'seedMoodMatchWithProfile', 'seedMoodMatchWithoutProfile',
        'seedGenreMatchWithProfile', 'seedGenreMatchWithoutProfile',
        'seedGenreOverlapWithProfile', 'seedGenreOverlapWithoutProfile',
        'seedSessionCloseBonus', 'seedSessionNearBonus',
        'seedSessionCloseMaxDiffMin', 'seedSessionNearMaxDiffMin',
        'personaAlignmentMultiplier',
        'hardwareCannotRunPenalty',
        'unplayedBonus',
        'recentlyPlayedWeekPenalty', 'recentlyPlayedFortnightPenalty',
        'timeAvailabilityFitBonus', 'timeAvailabilityAlmostFitBonus',
        'timeAvailabilityAlmostFitMultiplier',
        'replayIntentActiveBonus', 'replayIntentSoonBonus',
        'replayIntentEndlessBonus', 'replayIntentFinishedPenalty',
        'scoreMin', 'scoreMax',
        'explorationSlotEnabled', 'explorationMinPicks',
        'explorationUnplayedBonus', 'explorationGenreNoveltyWeight',
        'explorationRequireRunnable'
      ];

      requiredKeys.forEach((key) => {
        expect(DEFAULT_RECOMMENDATION_WEIGHTS[key]).toBeDefined();
        expect(typeof DEFAULT_RECOMMENDATION_WEIGHTS[key]).toBe('number');
      });
    });

    test('default base + clamps preserve historical engine behavior', () => {
      // These are the exact values that used to live in RecommendationEngine.
      // Any change here would silently shift scoring for every existing user.
      expect(DEFAULT_RECOMMENDATION_WEIGHTS.base).toBe(50);
      expect(DEFAULT_RECOMMENDATION_WEIGHTS.scoreMin).toBe(0);
      expect(DEFAULT_RECOMMENDATION_WEIGHTS.scoreMax).toBe(100);
      expect(DEFAULT_RECOMMENDATION_WEIGHTS.unplayedBonus).toBe(10);
      expect(DEFAULT_RECOMMENDATION_WEIGHTS.replayIntentActiveBonus).toBe(25);
      expect(DEFAULT_RECOMMENDATION_WEIGHTS.replayIntentFinishedPenalty).toBe(20);
      expect(DEFAULT_RECOMMENDATION_WEIGHTS.hardwareCannotRunPenalty).toBe(35);
    });

    test('default weights are frozen', () => {
      expect(Object.isFrozen(DEFAULT_RECOMMENDATION_WEIGHTS)).toBe(true);
    });
  });

  describe('getRecommendationWeights', () => {
    test('returns defaults for null/unknown mode', () => {
      expect(getRecommendationWeights(null)).toEqual(DEFAULT_RECOMMENDATION_WEIGHTS);
      expect(getRecommendationWeights('not-a-mode')).toEqual(DEFAULT_RECOMMENDATION_WEIGHTS);
    });

    test('returns defaults for Balanced (no overrides)', () => {
      expect(getRecommendationWeights('balanced')).toEqual(DEFAULT_RECOMMENDATION_WEIGHTS);
    });

    test('Librarian: harsher hardware penalty, less discovery, more relevance', () => {
      const w = getRecommendationWeights('librarian');
      expect(w.hardwareCannotRunPenalty).toBeGreaterThan(DEFAULT_RECOMMENDATION_WEIGHTS.hardwareCannotRunPenalty);
      expect(w.unplayedBonus).toBeLessThan(DEFAULT_RECOMMENDATION_WEIGHTS.unplayedBonus);
      expect(w.recentlyPlayedWeekPenalty).toBeGreaterThan(DEFAULT_RECOMMENDATION_WEIGHTS.recentlyPlayedWeekPenalty);
      expect(w.personaAlignmentMultiplier).toBeGreaterThan(DEFAULT_RECOMMENDATION_WEIGHTS.personaAlignmentMultiplier);
    });

    test('Full: more discovery, gentler repetition penalty, bigger active replay reward', () => {
      const w = getRecommendationWeights('full');
      expect(w.unplayedBonus).toBeGreaterThan(DEFAULT_RECOMMENDATION_WEIGHTS.unplayedBonus);
      expect(w.recentlyPlayedWeekPenalty).toBeLessThan(DEFAULT_RECOMMENDATION_WEIGHTS.recentlyPlayedWeekPenalty);
      expect(w.recentlyPlayedFortnightPenalty).toBeLessThan(DEFAULT_RECOMMENDATION_WEIGHTS.recentlyPlayedFortnightPenalty);
      expect(w.replayIntentActiveBonus).toBeGreaterThan(DEFAULT_RECOMMENDATION_WEIGHTS.replayIntentActiveBonus);
    });

    test('overrides do not mutate the default object', () => {
      getRecommendationWeights('librarian');
      getRecommendationWeights('full');
      expect(DEFAULT_RECOMMENDATION_WEIGHTS.hardwareCannotRunPenalty).toBe(35);
      expect(DEFAULT_RECOMMENDATION_WEIGHTS.unplayedBonus).toBe(10);
    });

    test('returned object always contains every default key', () => {
      const librarian = getRecommendationWeights('librarian');
      const full = getRecommendationWeights('full');
      Object.keys(DEFAULT_RECOMMENDATION_WEIGHTS).forEach((key) => {
        expect(librarian[key]).toBeDefined();
        expect(full[key]).toBeDefined();
      });
    });
  });

  describe('getActiveRecommendationWeights', () => {
    test('reads experienceMode from storage', () => {
      StorageService.set('experienceMode', 'librarian');
      invalidateRecommendationWeightsCache();
      expect(getActiveRecommendationWeights().hardwareCannotRunPenalty).toBe(50);

      StorageService.set('experienceMode', 'full');
      invalidateRecommendationWeightsCache();
      expect(getActiveRecommendationWeights().unplayedBonus).toBe(15);
    });

    test('returns defaults when experienceMode is unset', () => {
      expect(getActiveRecommendationWeights()).toEqual(DEFAULT_RECOMMENDATION_WEIGHTS);
    });

    test('caches result across calls when mode does not change', () => {
      const a = getActiveRecommendationWeights();
      const b = getActiveRecommendationWeights();
      expect(a).toBe(b); // reference equality - cached
    });

    test('cache invalidates when mode changes via storage', () => {
      const a = getActiveRecommendationWeights();
      StorageService.set('experienceMode', 'librarian');
      const b = getActiveRecommendationWeights();
      expect(a).not.toBe(b);
      expect(b.hardwareCannotRunPenalty).toBe(50);
    });

    test('invalidateRecommendationWeightsCache forces re-read', () => {
      const a = getActiveRecommendationWeights();
      invalidateRecommendationWeightsCache();
      const b = getActiveRecommendationWeights();
      // Same mode (null) so values are equal, but the object is freshly built
      expect(b).toEqual(a);
    });
  });

  describe('preset registry', () => {
    test('exposes all three named presets', () => {
      expect(RECOMMENDATION_WEIGHT_PRESETS.librarian).toBeDefined();
      expect(RECOMMENDATION_WEIGHT_PRESETS.balanced).toBeDefined();
      expect(RECOMMENDATION_WEIGHT_PRESETS.full).toBeDefined();
    });

    test('balanced has no overrides (intentional)', () => {
      expect(Object.keys(RECOMMENDATION_WEIGHT_PRESETS.balanced)).toHaveLength(0);
    });
  });
});
