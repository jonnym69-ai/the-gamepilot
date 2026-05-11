/**
 * RecommendationWeights.js
 *
 * Single source of truth for every magic number used by the recommendation
 * engine's behavior scorer. Centralizing these means:
 *   1. The whole tuning surface is visible in one file (no hunting through
 *      RecommendationEngine for `+ 25` and guessing what it does).
 *   2. Per-experience-mode tuning becomes a one-line override instead of a
 *      branching nightmare inside the scorer.
 *   3. Tests can assert "Librarian boosts hardware match" or "Full boosts
 *      discovery" by inspecting the resolved weights, without re-running the
 *      whole engine.
 *
 * Design rules:
 *   - Default weights below are the historical values from RecommendationEngine
 *     so that Balanced mode (the default for new users) is bit-for-bit identical
 *     to the engine's old behavior.
 *   - Each override is a *partial* object. Anything not overridden stays at the
 *     default. This keeps overrides reviewable.
 *   - The shape is flat. Nesting was tempting but it makes overrides clumsy.
 */

import StorageService from './StorageService';

export const DEFAULT_RECOMMENDATION_WEIGHTS = Object.freeze({
  base: 50,

  // Mood completion-rate bonus tiers
  moodHighRateBonus: 30,
  moodMediumRateBonus: 20,
  moodLowRateBonus: 10,
  moodHighRateThreshold: 70,
  moodMediumRateThreshold: 50,

  // Genre completion-rate bonus tiers
  genreHighRateBonus: 20,
  genreMediumRateBonus: 12,
  genreLowRateBonus: 6,
  genreHighRateThreshold: 70,
  genreMediumRateThreshold: 50,

  // Session-length match (estimated session vs avg session)
  sessionPerfectMatchBonus: 15,
  sessionCloseMatchBonus: 10,
  sessionNearMatchBonus: 5,
  sessionMatchDiffDivisor: 15,

  // Onboarding seed bonuses (scaled by live seedWeight 0..1)
  seedMoodMatchWithProfile: 4,
  seedMoodMatchWithoutProfile: 10,
  seedGenreMatchWithProfile: 5,
  seedGenreMatchWithoutProfile: 12,
  seedGenreOverlapWithProfile: 3,
  seedGenreOverlapWithoutProfile: 8,
  seedSessionCloseBonus: 8,
  seedSessionNearBonus: 4,
  seedSessionCloseMaxDiffMin: 30,
  seedSessionNearMaxDiffMin: 90,

  // Persona alignment (0-100 contribution multiplied)
  personaAlignmentMultiplier: 0.35,

  // Hardware compatibility
  hardwareCannotRunPenalty: 35,

  // Discovery / repetition
  unplayedBonus: 10,
  recentlyPlayedWeekPenalty: 15,
  recentlyPlayedFortnightPenalty: 8,

  // Time-window fit
  timeAvailabilityFitBonus: 10,
  timeAvailabilityAlmostFitBonus: 5,
  timeAvailabilityAlmostFitMultiplier: 1.5,

  // Replay intent
  replayIntentActiveBonus: 25,
  replayIntentSoonBonus: 15,
  replayIntentEndlessBonus: 5,
  replayIntentFinishedPenalty: 20,

  // Output clamp
  scoreMin: 0,
  scoreMax: 100,

  // Exploration slot — reserve the LAST slot of a multi-pick recommendation
  // (Perfect Play) for a genre-novel game the user hasn't been playing.
  // Off (0) for Librarian (pure tool, no surprises). On (1) for Balanced/Full.
  // Activates only when the caller asked for at least `explorationMinPicks`.
  explorationSlotEnabled: 1,
  explorationMinPicks: 3,
  // How much an unplayed game is rewarded vs a played one of the same genre
  explorationUnplayedBonus: 25,
  // Multiplier on "how rarely you play this genre" (0..1) -> bonus points
  explorationGenreNoveltyWeight: 35,
  // Hardware floor — never surface a totally-unrunnable exploration pick
  explorationRequireRunnable: 1
});

/**
 * Librarian: pure tool. Accuracy-first, lower discovery noise, harsher
 * "doesn't run on your machine" penalty (it's a library tool, it should
 * respect your hardware), tighter avoidance of recently-played games.
 */
const LIBRARIAN_OVERRIDES = Object.freeze({
  hardwareCannotRunPenalty: 50,
  unplayedBonus: 5,
  recentlyPlayedWeekPenalty: 20,
  recentlyPlayedFortnightPenalty: 12,
  personaAlignmentMultiplier: 0.45,
  explorationSlotEnabled: 0
});

/**
 * Balanced: the default. No overrides — historical engine behavior.
 */
const BALANCED_OVERRIDES = Object.freeze({});

/**
 * Full: maximum gamification. Reward exploration, soften the recently-played
 * penalty (if you're playing it a lot, you probably want more like it),
 * lean into "currently active" replay intent.
 */
const FULL_OVERRIDES = Object.freeze({
  unplayedBonus: 15,
  recentlyPlayedWeekPenalty: 10,
  recentlyPlayedFortnightPenalty: 4,
  replayIntentActiveBonus: 30
});

const PRESETS = Object.freeze({
  librarian: LIBRARIAN_OVERRIDES,
  balanced: BALANCED_OVERRIDES,
  full: FULL_OVERRIDES
});

/**
 * Pure function: resolve weights for an explicit mode (or default).
 * Exported separately so tests don't need to mock StorageService.
 *
 * @param {string|null} mode - 'librarian' | 'balanced' | 'full' | null
 * @returns {object} fully-resolved weights, never partial
 */
export function getRecommendationWeights(mode = null) {
  const overrides = (mode && PRESETS[mode]) || {};
  return { ...DEFAULT_RECOMMENDATION_WEIGHTS, ...overrides };
}

/**
 * Resolve the weights for the user's current experience mode (read from
 * persistent storage). Cached per call to avoid object churn inside the
 * hot scoring loop, but cache invalidates automatically when the mode changes.
 */
let _cachedMode = Symbol('uninitialized');
let _cachedWeights = null;

export function getActiveRecommendationWeights() {
  const mode = StorageService.get('experienceMode', null);
  if (mode !== _cachedMode) {
    _cachedMode = mode;
    _cachedWeights = getRecommendationWeights(mode);
  }
  return _cachedWeights;
}

/**
 * Test-only / mode-switch hook: clear the cached weights so the next call
 * re-reads from storage. Called automatically by InterfacePreferencesService
 * presets via the `gamepilot:experience-mode-changed` event listener below.
 */
export function invalidateRecommendationWeightsCache() {
  _cachedMode = Symbol('invalidated');
  _cachedWeights = null;
}

if (typeof window !== 'undefined') {
  window.addEventListener('gamepilot:interface-preferences-changed', invalidateRecommendationWeightsCache);
}

export const RECOMMENDATION_WEIGHT_PRESETS = PRESETS;
