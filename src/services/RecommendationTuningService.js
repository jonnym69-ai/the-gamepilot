import StorageService from './StorageService';
import { invalidateRecommendationWeightsCache } from './RecommendationWeights';

const STORAGE_KEY = 'recommendationTuning';

export const DEFAULT_TUNING = Object.freeze({
  novelty: 0.5,
  diversity: 0.5,
  fatigueWindowHours: 1,
  explorationEnabled: true
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const safeNumber = (value, fallback) => {
  const num = Number(value);
  return Number.isNaN(num) ? fallback : num;
};

export class RecommendationTuningService {
  static getTuning() {
    try {
      const stored = StorageService.get(STORAGE_KEY, null);
      if (stored && typeof stored === 'object') {
        return {
          novelty: clamp(safeNumber(stored.novelty, DEFAULT_TUNING.novelty), 0, 1),
          diversity: clamp(safeNumber(stored.diversity, DEFAULT_TUNING.diversity), 0, 1),
          fatigueWindowHours: clamp(safeNumber(stored.fatigueWindowHours, DEFAULT_TUNING.fatigueWindowHours), 0, 168),
          explorationEnabled: stored.explorationEnabled !== undefined
            ? Boolean(stored.explorationEnabled)
            : DEFAULT_TUNING.explorationEnabled
        };
      }
    } catch (e) {
      console.warn('RecommendationTuningService: failed to read tuning', e);
    }
    return { ...DEFAULT_TUNING };
  }

  static setTuning(tuning) {
    const next = {
      novelty: clamp(safeNumber(tuning?.novelty, DEFAULT_TUNING.novelty), 0, 1),
      diversity: clamp(safeNumber(tuning?.diversity, DEFAULT_TUNING.diversity), 0, 1),
      fatigueWindowHours: clamp(safeNumber(tuning?.fatigueWindowHours, DEFAULT_TUNING.fatigueWindowHours), 0, 168),
      explorationEnabled: tuning?.explorationEnabled !== undefined
        ? Boolean(tuning.explorationEnabled)
        : DEFAULT_TUNING.explorationEnabled
    };
    StorageService.set(STORAGE_KEY, next);
    invalidateRecommendationWeightsCache();
    return next;
  }

  static resetTuning() {
    StorageService.set(STORAGE_KEY, { ...DEFAULT_TUNING });
    invalidateRecommendationWeightsCache();
    return { ...DEFAULT_TUNING };
  }

  static getWeightOverrides() {
    const tuning = this.getTuning();
    const novelty = tuning.novelty;
    const diversity = tuning.diversity;

    return {
      unplayedBonus: Math.round(5 + novelty * 20),
      recentlyPlayedWeekPenalty: Math.round(10 + (1 - novelty) * 15),
      recentlyPlayedFortnightPenalty: Math.round(4 + (1 - novelty) * 10),
      explorationSlotEnabled: tuning.explorationEnabled ? 1 : 0,
      explorationGenreNoveltyWeight: Math.round(10 + novelty * 40),
      explorationUnplayedBonus: Math.round(10 + novelty * 25),
      discoveryDiversityMultiplier: diversity,
      fatigueWindowHours: tuning.fatigueWindowHours
    };
  }

  static applyTuningToWeights() {
    const overrides = this.getWeightOverrides();
    StorageService.set('customRecommendationWeights', overrides);
    invalidateRecommendationWeightsCache();
    return overrides;
  }
}
