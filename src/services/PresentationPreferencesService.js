// Central wrapper around localStorage preferences for presentation rewards.
// Keeps key names consistent with existing code so older components keep working.
// All getters return a sensible default if not previously set.
import StorageService from './StorageService';

const STORAGE_KEYS = Object.freeze({
  transitionStyle: 'gamepilot_transition_style',
  surpriseMode: 'gamepilot_surprise_mode',
  libraryVariant: 'gamepilot_library_presentation',
  homeLayout: 'gamepilot_home_layout',
  recommendationPack: 'gamepilot_recommendation_pack'
});

function get(key, fallback = null) {
  try {
    const stored = StorageService.getString(key);
    return stored !== null ? stored : fallback;
  } catch (_err) {
    return fallback;
  }
}

function set(key, value) {
  try {
    StorageService.setString(key, value);
  } catch (_err) {
    // Swallow quota / availability errors – preferences are non-critical
  }
}

export const PresentationPreferencesService = Object.freeze({
  // Transition style
  getTransitionStyle: () => get(STORAGE_KEYS.transitionStyle, 'slide-up'),
  setTransitionStyle: (id) => set(STORAGE_KEYS.transitionStyle, id),

  // Surprise Me mode
  getSurpriseMode: () => get(STORAGE_KEYS.surpriseMode, 'random'),
  setSurpriseMode: (id) => set(STORAGE_KEYS.surpriseMode, id)
});
