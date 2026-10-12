// DataManager.js - Utilities for exporting and importing user data
// Date formatting helpers were previously used for UI timestamps but are no longer needed here. Removed to clean ESLint warnings.
import StorageService from './services/StorageService';
import SessionRepository from './services/SessionRepository';

const BACKUP_VERSION = '3.0';

// Regenerable caches and in-flight state that must never round-trip through a
// backup. Everything else under the gamepilot- storage prefix is user data and
// is exported automatically — new features cannot be silently left out.
const EXPORT_EXCLUDED_KEYS = new Set([
  'activeGameSessions', // stale "currently playing" state must not be restored
  'igdbArtworkCacheV1',
  'wishlistPriceCacheV1',
  'steamProfileCacheV1',
  'steamFriendsCacheV1',
  'similarGamesCacheV1',
  'epicFreeGameRadarCacheV1',
  'gamerpowerRadarCacheV1',
  'freeGameRadarCacheV2',
  'steamGenreCacheV2',
  'steamSnapshotCacheV1',
  'steamPriceCache',
  'steamNewsCacheV1',
  'pcgwCacheV2',
  'patch_notes_cache',
  'systemInfo',
  'libraryCache',
  'lastLibraryHash',
]);

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
  gameRatings: {},
  profileCustomization: {},
  rewardPresentationCustomization: {},
  exportFilterCustomization: {},
  retentionQuestPreferences: {},
  completionHistoryV1: {},
  userCollectionsV1: [],
  collectionAssignmentsV1: {},
  hiddenGamesV1: [],
  librarianNotesV1: {},
  coverArtOverridesV1: {},
  sessionNotesV1: {},
  duplicateMergesV1: {},
  scanTimestampsV1: {},
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
  'lastReset_yearly',
]);

const KNOWN_IMPORT_KEYS = new Set([
  ...Object.keys(JSON_STORAGE_DEFAULTS),
  ...STRING_STORAGE_KEYS,
  'achievements',
  'library',
  'gamepilotTheme',
]);

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

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

const normalizeImportPayload = (payload) => {
  if (!isPlainObject(payload)) {
    return null;
  }
  const normalized = { ...payload };

  if (
    !Array.isArray(normalized.gameLibrary) &&
    isPlainObject(normalized.library) &&
    Array.isArray(normalized.library.games)
  ) {
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

// v3 backups store raw localStorage strings; v2 and older stored parsed values.
// This coerces either form into a parsed value for type checks and consumers.
const coerceImportedValue = (value) => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
};

const electronAPI = () => (typeof window !== 'undefined' ? window.electronAPI : null);

export class DataManager {
  static exportUserData() {
    try {
      // Export every gamepilot-prefixed storage key verbatim (localStorage
      // values are already strings), minus regenerable caches. New features
      // are picked up automatically instead of requiring a list update.
      const data = {};
      StorageService.keys().forEach((key) => {
        if (EXPORT_EXCLUDED_KEYS.has(key)) return;
        const raw = StorageService.getString(key, null);
        if (raw === null) return;
        data[key] = raw;
      });

      return {
        version: BACKUP_VERSION,
        exportDate: new Date().toISOString(),
        data,
      };
    } catch (error) {
      console.error('Error exporting user data:', error);
      throw new Error('Failed to export user data');
    }
  }

  static downloadUserData() {
    try {
      const userData = this.exportUserData();
      const dataStr = JSON.stringify(userData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

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

  static async importUserData(jsonData) {
    try {
      const importedData = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      const fromEnvelope = isPlainObject(importedData) && isPlainObject(importedData.data);

      const data = extractImportPayload(importedData);
      if (!data) {
        throw new Error('Invalid backup file format');
      }

      // Envelope-wrapped exports are our own format and are trusted to carry
      // any key; bare payloads (v2/manual) still need a recognized key.
      const recognizedKeyCount = Object.keys(data).filter((key) => KNOWN_IMPORT_KEYS.has(key)).length;
      if (!fromEnvelope && recognizedKeyCount === 0) {
        throw new Error('Backup file does not contain recognized GamePilot data');
      }

      let importedCount = 0;
      const skippedKeys = [];

      Object.entries(data).forEach(([key, value]) => {
        if (key === 'activeGameSessions' || EXPORT_EXCLUDED_KEYS.has(key)) return;
        if (typeof key !== 'string' || key.length === 0 || key.length > 100) return;
        if (value === undefined || value === null) return;

        // Known JSON keys keep their type validation; everything else is
        // restored verbatim (string) or as a JSON value (parsed payloads).
        const fallback = JSON_STORAGE_DEFAULTS[key];
        if (fallback !== undefined && parseImportedValue(value, fallback) === null) {
          skippedKeys.push(key);
          return;
        }

        if (typeof value === 'string') {
          StorageService.setString(key, value);
        } else {
          StorageService.set(key, value);
        }
        importedCount += 1;
      });

      // Session history lives in SQLite once initialized; localStorage is only
      // a fallback mirror. Route the restore through the repository so both
      // stores are replaced, and await the main-process write so the immediate
      // reload cannot race past it.
      if (Object.prototype.hasOwnProperty.call(data, 'sessionHistory')) {
        const history = coerceImportedValue(data.sessionHistory);
        if (Array.isArray(history)) {
          try {
            await electronAPI()?.sessionStoreReplaceHistory?.(SessionRepository.dedupeSessionHistory(history));
          } catch (error) {
            console.error('Failed to restore session history to SQLite:', error);
          }
          SessionRepository.replaceHistory(history);
        }
      }

      // A backup must never resurrect a stale "currently playing" state.
      SessionRepository.saveActiveSessions({});
      try {
        await electronAPI()?.sessionStoreSaveActive?.({});
      } catch (error) {
        console.error('Failed to clear active sessions in SQLite:', error);
      }

      return {
        success: true,
        importedCount,
        skippedKeys,
        message: `Successfully imported ${importedCount} data entries`,
      };
    } catch (error) {
      console.error('Error importing user data:', error);
      return {
        success: false,
        message: `Import failed: ${error.message}`,
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
      const fromEnvelope = isPlainObject(parsed.data);
      const recognizedKeys = dataKeys.filter((key) => KNOWN_IMPORT_KEYS.has(key));
      if (!fromEnvelope && recognizedKeys.length === 0) {
        return { valid: false, message: 'Backup file does not contain recognized GamePilot data' };
      }

      const hasValidLibrary =
        !Object.prototype.hasOwnProperty.call(data, 'gameLibrary') ||
        Array.isArray(coerceImportedValue(data.gameLibrary));
      const hasValidAchievements =
        !Object.prototype.hasOwnProperty.call(data, 'unlockedAchievements') ||
        Array.isArray(coerceImportedValue(data.unlockedAchievements));
      const hasValidPatreonBoost =
        !Object.prototype.hasOwnProperty.call(data, 'patreonXpBoost') ||
        isPlainObject(coerceImportedValue(data.patreonXpBoost));

      if (!hasValidLibrary || !hasValidAchievements || !hasValidPatreonBoost) {
        return { valid: false, message: 'Backup file contains invalid progression data types' };
      }

      const versionLabel = parsed?.version ? ` (v${parsed.version})` : '';
      return {
        valid: true,
        message: `Valid backup file${versionLabel} with ${dataKeys.length} data categories`,
        categories: dataKeys,
      };
    } catch (error) {
      return { valid: false, message: `Invalid JSON: ${error.message}` };
    }
  }

  static async clearAllUserData() {
    try {
      // Remove every gamepilot-prefixed key, not a curated subset, then clear
      // the SQLite session databases — otherwise the repository rehydrates
      // session history from SQLite on the next launch and the "clear"
      // silently fails for the app's most important data.
      StorageService.clear();
      SessionRepository.clear();
      try {
        await electronAPI()?.sessionStoreClear?.();
      } catch (error) {
        console.error('Failed to clear SQLite session databases:', error);
      }

      return { success: true, message: 'All user data cleared successfully' };
    } catch (error) {
      console.error('Error clearing user data:', error);
      return { success: false, message: `Failed to clear data: ${error.message}` };
    }
  }
}
