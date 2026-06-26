// DataExportService.js - Export and backup library, achievements, and game data
import StorageService from './StorageService';

const toDateString = (date) => {
  if (!date) return null;
  const value = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) return null;
  return value.toISOString().split('T')[0];
};

const isWithinDateRange = (value, start, end) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : null;
  if (startDate && Number.isNaN(startDate.getTime())) return false;
  if (endDate && Number.isNaN(endDate.getTime())) return false;
  if (startDate && date < startDate) return false;
  if (endDate) {
    const inclusiveEnd = new Date(endDate);
    inclusiveEnd.setHours(23, 59, 59, 999);
    if (date > inclusiveEnd) return false;
  }
  return true;
};

const EXPORT_FIELD_PRESETS = Object.freeze({
  minimal: ['name', 'platform', 'time_played', 'launch_count'],
  standard: ['name', 'platform', 'time_played', 'launch_count', 'genres', 'mood', 'last_played', 'rating'],
  full: null
});

export class DataExportService {
  // Export library as JSON
  static exportLibraryAsJSON(library, filename = null) {
    try {
      const exportData = {
        exportDate: new Date().toISOString(),
        gameCount: library.length,
        games: library
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      this.downloadFile(blob, filename || `gamepilot-library-${new Date().toISOString().split('T')[0]}.json`);
      return true;
    } catch (error) {
      console.error('Error exporting library as JSON:', error);
      return false;
    }
  }

  // Export library as CSV
  static exportLibraryAsCSV(library, filename = null) {
    try {
      if (library.length === 0) {
        console.warn('No games to export');
        return false;
      }

      // Get all unique keys from all games
      const allKeys = new Set();
      library.forEach(game => {
        Object.keys(game).forEach(key => allKeys.add(key));
      });

      const headers = Array.from(allKeys);
      const rows = [headers.join(',')];

      // Add game data rows
      library.forEach(game => {
        const row = headers.map(header => {
          const value = game[header];
          if (value === null || value === undefined) {
            return '';
          }
          if (typeof value === 'object') {
            return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          }
          const stringValue = String(value).replace(/"/g, '""');
          return stringValue.includes(',') || stringValue.includes('"') ? `"${stringValue}"` : stringValue;
        });
        rows.push(row.join(','));
      });

      const csvContent = rows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      this.downloadFile(blob, filename || `gamepilot-library-${new Date().toISOString().split('T')[0]}.csv`);
      return true;
    } catch (error) {
      console.error('Error exporting library as CSV:', error);
      return false;
    }
  }

  // Export achievements as JSON
  static exportAchievementsAsJSON(filename = null) {
    try {
      const unlockedAchievements = StorageService.get('unlockedAchievements', []);
      
      const exportData = {
        exportDate: new Date().toISOString(),
        achievementCount: unlockedAchievements.length,
        achievements: unlockedAchievements
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      this.downloadFile(blob, filename || `gamepilot-achievements-${new Date().toISOString().split('T')[0]}.json`);
      return true;
    } catch (error) {
      console.error('Error exporting achievements as JSON:', error);
      return false;
    }
  }

  // Export all data (library + achievements + game launch data)
  static exportAllDataAsJSON(library, filename = null) {
    try {
      const unlockedAchievements = StorageService.get('unlockedAchievements', []);
      const gameLaunchData = StorageService.get('gameLaunchData', {});
      const featureTracking = StorageService.get('featureTracking', {});
      const rollingAchievements = StorageService.get('rollingAchievements', {});

      const exportData = {
        exportDate: new Date().toISOString(),
        version: '1.0',
        library: {
          gameCount: library.length,
          games: library
        },
        achievements: {
          unlockedCount: unlockedAchievements.length,
          achievements: unlockedAchievements
        },
        gameLaunchData: gameLaunchData,
        featureTracking: featureTracking,
        rollingAchievements: rollingAchievements
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      this.downloadFile(blob, filename || `gamepilot-backup-${new Date().toISOString().split('T')[0]}.json`);
      return true;
    } catch (error) {
      console.error('Error exporting all data as JSON:', error);
      return false;
    }
  }

  // Import library from JSON
  static importLibraryFromJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          const games = data.games || [];
          resolve(games);
        } catch (error) {
          reject(new Error('Invalid JSON file format'));
        }
      };
      reader.onerror = () => {
        reject(new Error('Error reading file'));
      };
      reader.readAsText(file);
    });
  }

  // Import achievements from JSON
  static importAchievementsFromJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          const achievements = data.achievements || [];
          StorageService.set('unlockedAchievements', achievements);
          resolve(achievements);
        } catch (error) {
          reject(new Error('Invalid JSON file format'));
        }
      };
      reader.onerror = () => {
        reject(new Error('Error reading file'));
      };
      reader.readAsText(file);
    });
  }

  // Import all data from backup JSON
  static importAllDataFromJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          
          // Import achievements
          if (data.achievements && data.achievements.achievements) {
            StorageService.set('unlockedAchievements', data.achievements.achievements);
          }

          // Import game launch data
          if (data.gameLaunchData) {
            StorageService.set('gameLaunchData', data.gameLaunchData);
          }

          // Import feature tracking
          if (data.featureTracking) {
            StorageService.set('featureTracking', data.featureTracking);
          }

          // Import rolling achievements
          if (data.rollingAchievements) {
            StorageService.set('rollingAchievements', data.rollingAchievements);
          }

          const games = data.library && data.library.games ? data.library.games : [];
          resolve(games);
        } catch (error) {
          reject(new Error('Invalid backup file format'));
        }
      };
      reader.onerror = () => {
        reject(new Error('Error reading file'));
      };
      reader.readAsText(file);
    });
  }

  // Helper function to download file
  static downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Filter library according to export options
  static applyExportFilters(library, options = {}) {
    const safeLibrary = Array.isArray(library) ? library : [];
    const {
      selectedGames = [],
      platforms = [],
      dateRange = 'all',
      startDate,
      endDate,
      hasPlaytime = false,
      hasLaunched = false,
      isFavorite = false,
      isHidden = false
    } = options;

    let filtered = safeLibrary;

    if (selectedGames.length > 0) {
      const selectedSet = new Set(selectedGames.map((game) => game?.appid || game?.id || game));
      filtered = filtered.filter((game) => {
        const key = game?.appid || game?.id || game?.name;
        return selectedSet.has(key) || selectedSet.has(game?.name);
      });
    }

    if (platforms.length > 0) {
      const platformSet = new Set(platforms.map((platform) => String(platform).toLowerCase()));
      filtered = filtered.filter((game) => {
        const platform = String(game?.platform || game?.brandPlatform || 'Unknown').toLowerCase();
        return platformSet.has(platform);
      });
    }

    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      let rangeStart = null;
      let rangeEnd = toDateString(now);
      const daysAgo = (days) => toDateString(new Date(now.getTime() - days * 24 * 60 * 60 * 1000));

      switch (dateRange) {
        case 'last7days':
          rangeStart = daysAgo(7);
          break;
        case 'last30days':
          rangeStart = daysAgo(30);
          break;
        case 'last90days':
          rangeStart = daysAgo(90);
          break;
        case 'lastYear':
          rangeStart = daysAgo(365);
          break;
        case 'custom':
          rangeStart = toDateString(startDate);
          rangeEnd = toDateString(endDate);
          break;
        default:
          rangeStart = null;
      }

      filtered = filtered.filter((game) => isWithinDateRange(game?.last_played, rangeStart, rangeEnd));
    }

    if (hasPlaytime) {
      filtered = filtered.filter((game) => Number(game?.time_played || 0) > 0);
    }

    if (hasLaunched) {
      filtered = filtered.filter((game) => Number(game?.launch_count || 0) > 0);
    }

    if (isFavorite) {
      filtered = filtered.filter((game) => game?.isFavorite === true || game?.favorite === true);
    }

    if (isHidden) {
      filtered = filtered.filter((game) => game?.hidden === true || game?.isHidden === true);
    }

    return filtered;
  }

  // Reduce game object to selected fields for stats-only or filtered exports
  static projectExportFields(game, fields = 'full') {
    if (!game || typeof game !== 'object') return game;
    const fieldList = EXPORT_FIELD_PRESETS[fields] || fields;
    if (!Array.isArray(fieldList)) return game;
    return fieldList.reduce((acc, key) => {
      acc[key] = game[key];
      return acc;
    }, {});
  }

  // Export filtered library as JSON
  static exportLibraryWithFilters(library, options = {}) {
    try {
      const filtered = this.applyExportFilters(library, options);
      const fields = options.fields || 'full';
      const projected = fields === 'full' ? filtered : filtered.map((game) => this.projectExportFields(game, fields));
      const exportData = {
        exportDate: new Date().toISOString(),
        filterOptions: options,
        gameCount: projected.length,
        games: projected
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      this.downloadFile(blob, options.filename || `gamepilot-library-filtered-${new Date().toISOString().split('T')[0]}.json`);
      return true;
    } catch (error) {
      console.error('Error exporting filtered library as JSON:', error);
      return false;
    }
  }

  // Export filtered library as CSV
  static exportLibraryWithFiltersAsCSV(library, options = {}) {
    try {
      const filtered = this.applyExportFilters(library, options);
      if (filtered.length === 0) {
        console.warn('No games match export filters');
        return false;
      }

      const fields = options.fields || 'standard';
      const fieldList = EXPORT_FIELD_PRESETS[fields] || fields;
      const headers = Array.isArray(fieldList) ? fieldList : Object.keys(filtered[0] || {});
      const rows = [headers.join(',')];

      filtered.forEach((game) => {
        const row = headers.map((header) => {
          const value = game[header];
          if (value === null || value === undefined) return '';
          if (Array.isArray(value)) return `"${value.join('; ').replace(/"/g, '""')}"`;
          if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          const stringValue = String(value).replace(/"/g, '""');
          return stringValue.includes(',') || stringValue.includes('"') ? `"${stringValue}"` : stringValue;
        });
        rows.push(row.join(','));
      });

      const csvContent = rows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      this.downloadFile(blob, options.filename || `gamepilot-library-filtered-${new Date().toISOString().split('T')[0]}.csv`);
      return true;
    } catch (error) {
      console.error('Error exporting filtered library as CSV:', error);
      return false;
    }
  }

  // Get backup summary
  static getBackupSummary(library) {
    try {
      const unlockedAchievements = StorageService.get('unlockedAchievements', []);
      const gameLaunchData = StorageService.get('gameLaunchData', {});
      const totalPlaytime = Object.values(gameLaunchData).reduce((sum, game) => sum + (game.totalPlaytime || 0), 0);

      return {
        librarySize: library.length,
        unlockedAchievements: unlockedAchievements.length,
        totalAchievements: 370, // Total possible achievements
        totalPlaytime: totalPlaytime,
        totalPlaytimeHours: (totalPlaytime / 60).toFixed(1),
        gamesWithPlaytime: Object.keys(gameLaunchData).length,
        backupDate: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting backup summary:', error);
      return null;
    }
  }
}
