/**
 * StorageService - Centralized localStorage abstraction
 * Provides typed storage operations with error handling
 */

const PREFIX = 'gamepilot-';

const StorageService = {
  /**
   * Get item from storage with type safety
   * @param {string} key - Storage key (without prefix)
   * @param {*} defaultValue - Default value if not found
   * @returns {*} Parsed value or default
   */
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(`${PREFIX}${key}`);
      if (item === null) return defaultValue;
      return JSON.parse(item);
    } catch (error) {
      return defaultValue;
    }
  },

  /**
   * Set item in storage
   * @param {string} key - Storage key (without prefix)
   * @param {*} value - Value to store
   * @returns {boolean} Success status
   */
  set(key, value) {
    try {
      localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  },

  /**
   * Remove item from storage
   * @param {string} key - Storage key (without prefix)
   * @returns {boolean} Success status
   */
  remove(key) {
    try {
      localStorage.removeItem(`${PREFIX}${key}`);
      return true;
    } catch (error) {
      return false;
    }
  },

  /**
   * Check if key exists in storage
   * @param {string} key - Storage key (without prefix)
   * @returns {boolean}
   */
  has(key) {
    return localStorage.getItem(`${PREFIX}${key}`) !== null;
  },

  /**
   * Get string value (no JSON parsing)
   * @param {string} key - Storage key (without prefix)
   * @param {string} defaultValue - Default value
   * @returns {string}
   */
  getString(key, defaultValue = '') {
    try {
      return localStorage.getItem(`${PREFIX}${key}`) ?? defaultValue;
    } catch (error) {
      return defaultValue;
    }
  },

  /**
   * Set string value (no JSON stringification)
   * @param {string} key - Storage key (without prefix)
   * @param {string} value - Value to store
   * @returns {boolean}
   */
  setString(key, value) {
    try {
      localStorage.setItem(`${PREFIX}${key}`, String(value));
      return true;
    } catch (error) {
      return false;
    }
  },

  /**
   * Get all keys with the gamepilot prefix
   * @returns {string[]} Array of keys (without prefix)
   */
  keys() {
    try {
      return Object.keys(localStorage)
        .filter(key => key.startsWith(PREFIX))
        .map(key => key.slice(PREFIX.length));
    } catch (error) {
      return [];
    }
  },

  /**
   * Clear all gamepilot prefixed items
   * @returns {boolean}
   */
  clear() {
    try {
      this.keys().forEach(key => this.remove(key));
      return true;
    } catch (error) {
      return false;
    }
  },

  /**
   * Get storage size estimate in bytes
   * @returns {number}
   */
  size() {
    try {
      return this.keys().reduce((total, key) => {
        const item = localStorage.getItem(`${PREFIX}${key}`);
        return total + (item ? item.length * 2 : 0); // UTF-16 = 2 bytes per char
      }, 0);
    } catch (error) {
      return 0;
    }
  }
};

// Legacy key mappings for backward compatibility
const LEGACY_KEYS = {
  'library': 'gameLibrary',
  'favorites': 'favorites',
  'theme': 'gamepilot-theme',
  'animationsEnabled': 'animationsEnabled',
  'achievements': 'achievements',
  'unlockedAchievements': 'unlockedAchievements',
  'xp': 'xp',
  'calendarXP': 'calendarXP',
  'dailySpin': 'dailySpin',
  'userSettings': 'userSettings',
  'playtimeHistory': 'playtimeHistory',
  'gameLaunchData': 'gameLaunchData',
  'level': 'level',
  'featureTracking': 'featureTracking',
  'unlockedRewards': 'unlockedRewards',
  'selectedMusicPack': 'selectedMusicPack',
  'selectedAmbientPack': 'selectedAmbientPack',
  'selectedButtonPack': 'selectedButtonPack',
  'persona': 'persona',
  'startupQuestionnaireCompleted': 'startupQuestionnaireCompleted',
  'sessionHistory': 'sessionHistory',
  'rollingAchievements': 'rollingAchievements',
  'questHistory': 'questHistory',
  'audioVolume': 'audioVolume',
  'mutedAudioTypes': 'mutedAudioTypes'
};

/**
 * Migration helper to move data from legacy keys to new prefixed keys
 */
StorageService.migrate = function() {
  Object.entries(LEGACY_KEYS).forEach(([newKey, oldKey]) => {
    const prefixedNewKey = `${PREFIX}${newKey}`;
    if (localStorage.getItem(prefixedNewKey) === null) {
      const oldValue = localStorage.getItem(oldKey);
      if (oldValue !== null) {
        localStorage.setItem(prefixedNewKey, oldValue);
      }
    }
  });
};

export default StorageService;
export { LEGACY_KEYS };
