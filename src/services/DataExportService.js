// DataExportService.js - Export and backup library, achievements, and game data
import StorageService from './StorageService';

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
