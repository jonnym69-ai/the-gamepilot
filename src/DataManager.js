// DataManager.js - Utilities for exporting and importing user data
// Date formatting helpers were previously used for UI timestamps but are no longer needed here. Removed to clean ESLint warnings.
import StorageService from './services/StorageService';

const BACKUP_VERSION = '2.0';

const JSON_STORAGE_DEFAULTS = Object.freeze({
  gameLibrary: [],
  completedGames: [],
  sessionHistory: [],
  gameLaunchData: {},
  gamingStats: {},
  unlockedAchievements: [],
  achievementStats: {},
  featureTracking: {},
  favorites: [],
  activeGameSessions: {},
  openedGames: {},
  gamingEvents: {},
  userBehaviorProfile: {},
  userFounders: [],
  gamePrices: {},
  buttonSampleSelection: {},
  patreonXpBoost: {},
  timeAchievementAssignments: {},
  timeAchievements_daily: {},
  timeAchievements_weekly: {},
  timeAchievements_monthly: {},
  timeAchievements_yearly: {},
  platformStats: {},
  featureStats: {},
  moodStats: {},
  genreStats: {},
  uniqueGameStats: { games: {} },
  recentlyUnlocked: [],
  achievementUnlockHistory: [],
  rollingAchievements: {},
  timeStats: {},
  launchRewardStats: { totalXP: 0, launches: 0 },
  profileCustomization: {},
  rewardPresentationCustomization: {},
  exportFilterCustomization: {},
  retentionQuestPreferences: {}
});

const STRING_STORAGE_KEYS = Object.freeze([
  'gamerLevel',
  'gamerTitle',
  'gamerType',
  'joinDate',
  'gamepilot-theme',
  'animationsEnabled',
  'dateFormat',
  'timeFormat',
  'timezone',
  'autoTheme',
  'themeMode',
  'cacheEnabled',
  'selectedCurrency',
  'customBgImage',
  'customBgOverlay',
  'ambientAudioEnabled',
  'ambientSoundPack',
  'ambientVolume',
  'buttonSfxEnabled',
  'buttonSoundPack',
  'buttonSfxVolume',
  'musicEnabled',
  'musicPack',
  'musicVolume',
  'notificationsEnabled',
  'achievementNotifications',
  'gameLaunchNotifications',
  'dailySummaryNotifications',
  'scanCompleteNotifications',
  'backupReminders',
  'profileUsername',
  'profilePic',
  'welcomeMessage',
  'lastReset_daily',
  'lastReset_weekly',
  'lastReset_monthly',
  'lastReset_yearly'
]);

const STRING_STORAGE_DEFAULTS = Object.freeze({
  gamerLevel: '1',
  gamerTitle: 'Casual Gamer',
  gamerType: 'Casual'
});

const KNOWN_IMPORT_KEYS = new Set([
  ...Object.keys(JSON_STORAGE_DEFAULTS),
  ...STRING_STORAGE_KEYS,
  'achievements',
  'library',
  'gamepilotTheme'
]);

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const cloneDefaultValue = (value) => {
  if (Array.isArray(value)) return [...value];
  if (isPlainObject(value)) return { ...value };
  return value;
};

const isValidForDefault = (value, fallback) => {
  if (Array.isArray(fallback)) {
    return Array.isArray(value);
  }
  if (isPlainObject(fallback)) {
    return isPlainObject(value);
  }
  if (typeof fallback === 'number') {
    return typeof value === 'number' && Number.isFinite(value);
  }
  if (typeof fallback === 'boolean') {
    return typeof value === 'boolean';
  }
  if (typeof fallback === 'string') {
    return typeof value === 'string';
  }
  return value !== undefined;
};

const readJSONStorage = (key, fallback) => {
  try {
    const parsed = StorageService.get(key, null);
    return isValidForDefault(parsed, fallback) ? parsed : cloneDefaultValue(fallback);
  } catch (error) {
    return cloneDefaultValue(fallback);
  }
};

const normalizeImportPayload = (payload) => {
  if (!isPlainObject(payload)) {
    return null;
  }
  const normalized = { ...payload };

  if (!Array.isArray(normalized.gameLibrary) && isPlainObject(normalized.library) && Array.isArray(normalized.library.games)) {
    normalized.gameLibrary = normalized.library.games;
  }

  if (!Array.isArray(normalized.unlockedAchievements)) {
    if (Array.isArray(normalized.achievements)) {
      normalized.unlockedAchievements = normalized.achievements;
    } else if (isPlainObject(normalized.achievements) && Array.isArray(normalized.achievements.achievements)) {
      normalized.unlockedAchievements = normalized.achievements.achievements;
    }
  }

  if (typeof normalized['gamepilot-theme'] !== 'string' && typeof normalized.gamepilotTheme === 'string') {
    normalized['gamepilot-theme'] = normalized.gamepilotTheme;
  }

  return normalized;
};

const extractImportPayload = (rawImport) => {
  if (!isPlainObject(rawImport)) {
    return null;
  }

  const payload = isPlainObject(rawImport.data) ? rawImport.data : rawImport;
  return normalizeImportPayload(payload);
};

const parseImportedValue = (value, fallback) => {
  if (isValidForDefault(value, fallback)) {
    return value;
  }

  if (typeof value === 'string' && (Array.isArray(fallback) || isPlainObject(fallback))) {
    try {
      const parsed = JSON.parse(value);
      if (isValidForDefault(parsed, fallback)) {
        return parsed;
      }
    } catch (error) {
      return null;
    }
  }

  return null;
};

const getLegacyAchievements = (data) => {
  if (!isPlainObject(data)) {
    return null;
  }

  if (Array.isArray(data.achievements)) {
    return data.achievements;
  }

  if (isPlainObject(data.achievements) && Array.isArray(data.achievements.achievements)) {
    return data.achievements.achievements;
  }

  return null;
};

export class DataManager {
  static exportUserData() {
    try {
      const jsonData = Object.entries(JSON_STORAGE_DEFAULTS).reduce((acc, [key, fallback]) => {
        acc[key] = readJSONStorage(key, fallback);
        return acc;
      }, {});

      const legacyAchievements = readJSONStorage('achievements', []);
      if (!jsonData.unlockedAchievements.length && legacyAchievements.length) {
        jsonData.unlockedAchievements = legacyAchievements;
      }

      const stringData = {};
      STRING_STORAGE_KEYS.forEach((key) => {
        const value = StorageService.getString(key);
        if (value !== null) {
          stringData[key] = value;
        }
      });

      Object.entries(STRING_STORAGE_DEFAULTS).forEach(([key, fallback]) => {
        if (typeof stringData[key] === 'undefined') {
          stringData[key] = fallback;
        }
      });

      const userData = {
        version: BACKUP_VERSION,
        exportDate: new Date().toISOString(),
        data: {
          ...jsonData,
          ...stringData
        }
      };

      return userData;
    } catch (error) {
      console.error('Error exporting user data:', error);
      throw new Error('Failed to export user data');
    }
  }

  static downloadUserData() {
    try {
      const userData = this.exportUserData();
      const dataStr = JSON.stringify(userData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

      const exportFileDefaultName = `gamepilot-backup-${new Date().toISOString().split('T')[0]}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();

      return true;
    } catch (error) {
      console.error('Error downloading user data:', error);
      throw new Error('Failed to download backup file');
    }
  }

  static importUserData(jsonData) {
    try {
      const importedData = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;

      const data = extractImportPayload(importedData);
      if (!data) {
        throw new Error('Invalid backup file format');
      }

      const recognizedKeyCount = Object.keys(data).filter((key) => KNOWN_IMPORT_KEYS.has(key)).length;
      if (recognizedKeyCount === 0) {
        throw new Error('Backup file does not contain recognized GamePilot data');
      }

      let importedCount = 0;

      Object.entries(JSON_STORAGE_DEFAULTS).forEach(([key, fallback]) => {
        if (!Object.prototype.hasOwnProperty.call(data, key)) {
          return;
        }

        const value = parseImportedValue(data[key], fallback);
        if (value === null) {
          return;
        }

        StorageService.set(key, value);
        importedCount += 1;
      });

      const legacyAchievements = getLegacyAchievements(data);
      if (!Object.prototype.hasOwnProperty.call(data, 'unlockedAchievements') && Array.isArray(legacyAchievements)) {
        StorageService.set('unlockedAchievements', legacyAchievements);
        importedCount += 1;
      }

      STRING_STORAGE_KEYS.forEach((key) => {
        if (!Object.prototype.hasOwnProperty.call(data, key)) {
          return;
        }

        const value = data[key];
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          StorageService.setString(key, String(value));
          importedCount += 1;
        }
      });

      return {
        success: true,
        importedCount,
        message: `Successfully imported ${importedCount} data entries`
      };

    } catch (error) {
      console.error('Error importing user data:', error);
      return {
        success: false,
        message: `Import failed: ${error.message}`
      };
    }
  }

  static validateBackupFile(jsonData) {
    try {
      const parsed = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      const data = extractImportPayload(parsed);

      if (!data) {
        return { valid: false, message: 'Invalid backup file format' };
      }

      const dataKeys = Object.keys(data);
      const recognizedKeys = dataKeys.filter((key) => KNOWN_IMPORT_KEYS.has(key));
      if (recognizedKeys.length === 0) {
        return { valid: false, message: 'Backup file does not contain recognized GamePilot data' };
      }

      const hasValidLibrary = !Object.prototype.hasOwnProperty.call(data, 'gameLibrary') || Array.isArray(data.gameLibrary);
      const hasValidAchievements = !Object.prototype.hasOwnProperty.call(data, 'unlockedAchievements') || Array.isArray(data.unlockedAchievements);
      const hasValidPatreonBoost = !Object.prototype.hasOwnProperty.call(data, 'patreonXpBoost') || isPlainObject(data.patreonXpBoost);

      if (!hasValidLibrary || !hasValidAchievements || !hasValidPatreonBoost) {
        return { valid: false, message: 'Backup file contains invalid progression data types' };
      }

      const versionLabel = parsed?.version ? ` (v${parsed.version})` : '';
      return {
        valid: true,
        message: `Valid backup file${versionLabel} with ${dataKeys.length} data categories`,
        categories: dataKeys
      };
    } catch (error) {
      return { valid: false, message: `Invalid JSON: ${error.message}` };
    }
  }

  static clearAllUserData() {
    try {
      const keysToRemove = Array.from(new Set([
        ...Object.keys(JSON_STORAGE_DEFAULTS),
        ...STRING_STORAGE_KEYS,
        'achievements',
        'gamepilotTheme',
        'gamepilot-founder-tier',
        'libraryCache',
        'lastSync'
      ]));

      keysToRemove.forEach(key => {
        StorageService.remove(key);
      });

      return { success: true, message: 'All user data cleared successfully' };
    } catch (error) {
      console.error('Error clearing user data:', error);
      return { success: false, message: `Failed to clear data: ${error.message}` };
    }
  }
}
