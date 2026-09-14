import StorageService from './StorageService';
import { RecommendationTuningService } from './RecommendationTuningService';
import { getActiveRecommendationWeights, invalidateRecommendationWeightsCache } from './RecommendationWeights';

beforeEach(() => {
  localStorage.clear();
  invalidateRecommendationWeightsCache();
});

test('basic tuning does not overwrite saved advanced weights', () => {
  const custom = { moodHighRateBonus: 40, unplayedBonus: 42 };
  StorageService.set('customRecommendationWeights', custom);
  RecommendationTuningService.setTuning({ novelty: 1, explorationEnabled: true });
  RecommendationTuningService.applyTuningToWeights();
  expect(StorageService.get('customRecommendationWeights')).toEqual(custom);
  expect(getActiveRecommendationWeights()).toEqual(expect.objectContaining(custom));
});

test('basic controls continue to affect recommendations without custom overrides', () => {
  RecommendationTuningService.setTuning({ novelty: 0 });
  RecommendationTuningService.applyTuningToWeights();
  expect(getActiveRecommendationWeights().unplayedBonus).toBe(5);
  RecommendationTuningService.setTuning({ novelty: 1 });
  RecommendationTuningService.applyTuningToWeights();
  expect(getActiveRecommendationWeights().unplayedBonus).toBe(25);
  expect(StorageService.get('customRecommendationWeights')).toBeNull();
});

test('resetting basic tuning leaves advanced overrides intact', () => {
  StorageService.set('customRecommendationWeights', { moodHighRateBonus: 40 });
  RecommendationTuningService.setTuning({ novelty: 1 });
  RecommendationTuningService.applyTuningToWeights();
  RecommendationTuningService.resetTuning();
  expect(StorageService.get('customRecommendationWeights')).toEqual({ moodHighRateBonus: 40 });
  expect(getActiveRecommendationWeights().unplayedBonus).toBe(15);
});
