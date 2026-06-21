import React, { useState, useCallback } from 'react';
import { SlidersHorizontal, RotateCcw, Save, Info } from 'lucide-react';
import { DEFAULT_RECOMMENDATION_WEIGHTS, getRecommendationWeights } from '../services/RecommendationWeights';
import StorageService from '../services/StorageService';
import './RecommendationTunerPanel.css';

const WEIGHT_CATEGORIES = [
  {
    label: 'Mood & Genre Affinity',
    keys: [
      { key: 'moodHighRateBonus', label: 'Mood High Rate Bonus', min: 0, max: 60, step: 1 },
      { key: 'moodMediumRateBonus', label: 'Mood Medium Rate Bonus', min: 0, max: 40, step: 1 },
      { key: 'moodLowRateBonus', label: 'Mood Low Rate Bonus', min: 0, max: 30, step: 1 },
      { key: 'moodHighRateThreshold', label: 'Mood High Threshold %', min: 50, max: 95, step: 1 },
      { key: 'moodMediumRateThreshold', label: 'Mood Medium Threshold %', min: 30, max: 70, step: 1 },
      { key: 'genreHighRateBonus', label: 'Genre High Rate Bonus', min: 0, max: 50, step: 1 },
      { key: 'genreMediumRateBonus', label: 'Genre Medium Rate Bonus', min: 0, max: 30, step: 1 },
      { key: 'genreLowRateBonus', label: 'Genre Low Rate Bonus', min: 0, max: 20, step: 1 },
      { key: 'genreHighRateThreshold', label: 'Genre High Threshold %', min: 50, max: 95, step: 1 },
      { key: 'genreMediumRateThreshold', label: 'Genre Medium Threshold %', min: 30, max: 70, step: 1 },
    ]
  },
  {
    label: 'Session & Time Fit',
    keys: [
      { key: 'sessionPerfectMatchBonus', label: 'Session Perfect Match', min: 0, max: 30, step: 1 },
      { key: 'sessionCloseMatchBonus', label: 'Session Close Match', min: 0, max: 25, step: 1 },
      { key: 'sessionNearMatchBonus', label: 'Session Near Match', min: 0, max: 15, step: 1 },
      { key: 'timeAvailabilityFitBonus', label: 'Time Window Fit Bonus', min: 0, max: 25, step: 1 },
      { key: 'timeAvailabilityAlmostFitBonus', label: 'Time Almost Fit Bonus', min: 0, max: 15, step: 1 },
    ]
  },
  {
    label: 'Discovery & Replay',
    keys: [
      { key: 'unplayedBonus', label: 'Unplayed Game Bonus', min: 0, max: 30, step: 1 },
      { key: 'recentlyPlayedWeekPenalty', label: 'Recent Week Penalty', min: 0, max: 30, step: 1 },
      { key: 'recentlyPlayedFortnightPenalty', label: 'Recent Fortnight Penalty', min: 0, max: 20, step: 1 },
      { key: 'replayIntentActiveBonus', label: 'Replay: Active Bonus', min: 0, max: 50, step: 1 },
      { key: 'replayIntentSoonBonus', label: 'Replay: Soon Bonus', min: 0, max: 30, step: 1 },
      { key: 'replayIntentEndlessBonus', label: 'Replay: Endless Bonus', min: 0, max: 20, step: 1 },
      { key: 'replayIntentFinishedPenalty', label: 'Replay: Finished Penalty', min: 0, max: 40, step: 1 },
      { key: 'explorationSlotEnabled', label: 'Exploration Slot', min: 0, max: 1, step: 1 },
      { key: 'explorationUnplayedBonus', label: 'Exploration Unplayed Bonus', min: 0, max: 50, step: 1 },
      { key: 'explorationGenreNoveltyWeight', label: 'Exploration Novelty Weight', min: 0, max: 60, step: 1 },
    ]
  },
  {
    label: 'Persona & Feedback',
    keys: [
      { key: 'personaAlignmentMultiplier', label: 'Persona Alignment Multiplier', min: 0, max: 1, step: 0.05 },
      { key: 'likedGameBonus', label: 'Liked Game Bonus', min: 0, max: 40, step: 1 },
      { key: 'dislikedGamePenalty', label: 'Disliked Game Penalty', min: 0, max: 60, step: 1 },
      { key: 'hardwareCannotRunPenalty', label: 'Hardware Cannot Run Penalty', min: 0, max: 70, step: 1 },
    ]
  },
  {
    label: 'Onboarding Seed',
    keys: [
      { key: 'seedMoodMatchWithProfile', label: 'Seed Mood Match (w/ Profile)', min: 0, max: 15, step: 1 },
      { key: 'seedMoodMatchWithoutProfile', label: 'Seed Mood Match (no Profile)', min: 0, max: 20, step: 1 },
      { key: 'seedGenreMatchWithProfile', label: 'Seed Genre Match (w/ Profile)', min: 0, max: 15, step: 1 },
      { key: 'seedGenreMatchWithoutProfile', label: 'Seed Genre Match (no Profile)', min: 0, max: 20, step: 1 },
      { key: 'seedSessionCloseBonus', label: 'Seed Session Close Bonus', min: 0, max: 15, step: 1 },
      { key: 'seedSessionNearBonus', label: 'Seed Session Near Bonus', min: 0, max: 10, step: 1 },
    ]
  }
];

export default function RecommendationTunerPanel() {
  const [weights, setWeights] = useState(() => {
    const saved = StorageService.get('customRecommendationWeights', null);
    const mode = StorageService.get('experienceMode', null);
    const base = getRecommendationWeights(mode);
    return saved && typeof saved === 'object' ? { ...base, ...saved } : base;
  });

  const [hasChanges, setHasChanges] = useState(false);

  const handleChange = useCallback((key, value) => {
    setWeights((prev) => {
      const next = { ...prev, [key]: Number(value) };
      return next;
    });
    setHasChanges(true);
  }, []);

  const handleSave = useCallback(() => {
    const diff = {};
    Object.keys(weights).forEach((key) => {
      if (weights[key] !== DEFAULT_RECOMMENDATION_WEIGHTS[key]) {
        diff[key] = weights[key];
      }
    });
    if (Object.keys(diff).length === 0) {
      StorageService.remove('customRecommendationWeights');
    } else {
      StorageService.set('customRecommendationWeights', diff);
    }
    window.dispatchEvent(new CustomEvent('gamepilot:interface-preferences-changed'));
    setHasChanges(false);
  }, [weights]);

  const handleReset = useCallback(() => {
    const mode = StorageService.get('experienceMode', null);
    const base = getRecommendationWeights(mode);
    setWeights(base);
    StorageService.remove('customRecommendationWeights');
    window.dispatchEvent(new CustomEvent('gamepilot:interface-preferences-changed'));
    setHasChanges(false);
  }, []);

  const handlePreset = useCallback((presetKey) => {
    const base = getRecommendationWeights(presetKey || null);
    setWeights(base);
    StorageService.set('experienceMode', presetKey || null);
    StorageService.remove('customRecommendationWeights');
    window.dispatchEvent(new CustomEvent('gamepilot:interface-preferences-changed'));
    window.dispatchEvent(new CustomEvent('gamepilot:experience-mode-changed'));
    setHasChanges(false);
  }, []);

  return (
    <div className="rec-tuner-panel">
      <div className="rec-tuner-header">
        <div className="rec-tuner-title-row">
          <SlidersHorizontal size={20} />
          <h3>Recommendation Engine Tuner</h3>
        </div>
        <p className="rec-tuner-subtitle">
          Fine-tune how GamePilot scores and ranks game recommendations.
          <span className="rec-tuner-info">
            <Info size={14} /> Changes apply immediately to GamePilot Picks and Perfect Play.
          </span>
        </p>
      </div>

      <div className="rec-tuner-presets">
        <button
          type="button"
          className={`rec-tuner-preset-btn ${!StorageService.get('experienceMode', null) && !StorageService.get('customRecommendationWeights', null) ? 'active' : ''}`}
          onClick={() => handlePreset('balanced')}
        >
          Balanced
        </button>
        <button
          type="button"
          className={`rec-tuner-preset-btn ${StorageService.get('experienceMode', null) === 'librarian' ? 'active' : ''}`}
          onClick={() => handlePreset('librarian')}
        >
          Librarian
        </button>
        <button
          type="button"
          className={`rec-tuner-preset-btn ${StorageService.get('experienceMode', null) === 'full' ? 'active' : ''}`}
          onClick={() => handlePreset('full')}
        >
          Full
        </button>
      </div>

      <div className="rec-tuner-categories">
        {WEIGHT_CATEGORIES.map((cat) => (
          <div key={cat.label} className="rec-tuner-category">
            <h4 className="rec-tuner-category-title">{cat.label}</h4>
            <div className="rec-tuner-sliders">
              {cat.keys.map(({ key, label, min, max, step }) => {
                const value = weights[key] ?? DEFAULT_RECOMMENDATION_WEIGHTS[key];
                const isDefault = value === DEFAULT_RECOMMENDATION_WEIGHTS[key];
                return (
                  <div key={key} className={`rec-tuner-row ${!isDefault ? 'modified' : ''}`}>
                    <label className="rec-tuner-label">
                      {label}
                      {!isDefault && <span className="rec-tuner-modified-dot" />}
                    </label>
                    <div className="rec-tuner-control">
                      <input
                        type="range"
                        min={min}
                        max={max}
                        step={step}
                        value={value}
                        onChange={(e) => handleChange(key, e.target.value)}
                        className="rec-tuner-slider"
                      />
                      <span className="rec-tuner-value">{value}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="rec-tuner-footer">
        <button
          type="button"
          className="rec-tuner-btn secondary"
          onClick={handleReset}
        >
          <RotateCcw size={16} /> Reset to Preset
        </button>
        <button
          type="button"
          className={`rec-tuner-btn primary ${hasChanges ? 'has-changes' : ''}`}
          onClick={handleSave}
          disabled={!hasChanges}
        >
          <Save size={16} /> Save Custom Weights
        </button>
      </div>
    </div>
  );
}
