import StorageService from './StorageService';

const BACKUP_VERSION = '1.0';
const BACKUP_TYPE = 'gamepilot-backup';
const EXCLUDED_KEYS = ['backupInProgress', 'migrationBannerDismissed'];

const BackupService = {
  /**
   * Create a full local backup of all GamePilot data.
   * @returns {{ success: boolean, data: object|null, blob: Blob|null, message: string }}
   */
  createBackup() {
    try {
      const keys = StorageService.keys().filter(key => !EXCLUDED_KEYS.includes(key));
      const data = {};
      for (const key of keys) {
        data[key] = StorageService.get(key);
      }
      const backup = {
        version: BACKUP_VERSION,
        type: BACKUP_TYPE,
        exportedAt: new Date().toISOString(),
        app: 'GamePilot',
        entries: keys.length,
        data
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      return { success: true, data: backup, blob, message: 'Backup created successfully.' };
    } catch (error) {
      return { success: false, data: null, blob: null, message: `Backup failed: ${error.message}` };
    }
  },

  /**
   * Validate a backup file.
   * @param {object} backup
   * @returns {{ valid: boolean, message: string }}
   */
  validateBackup(backup) {
    if (!backup || typeof backup !== 'object') {
      return { valid: false, message: 'Invalid backup file.' };
    }
    if (backup.type !== BACKUP_TYPE) {
      return { valid: false, message: 'This file is not a GamePilot backup.' };
    }
    if (!backup.data || typeof backup.data !== 'object') {
      return { valid: false, message: 'Backup is missing data object.' };
    }
    return { valid: true, message: 'Backup is valid.' };
  },

  /**
   * Parse a backup file from File object.
   * @param {File} file
   * @returns {Promise<{ success: boolean, backup: object|null, message: string }>}
   */
  async parseBackupFile(file) {
    return new Promise((resolve) => {
      if (!file) return resolve({ success: false, backup: null, message: 'No file selected.' });
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const backup = JSON.parse(reader.result);
          const validation = this.validateBackup(backup);
          if (!validation.valid) return resolve({ success: false, backup: null, message: validation.message });
          return resolve({ success: true, backup, message: 'Backup loaded.' });
        } catch (parseError) {
          return resolve({ success: false, backup: null, message: 'Could not parse backup file.' });
        }
      };
      reader.onerror = () => resolve({ success: false, backup: null, message: 'Failed to read file.' });
      reader.readAsText(file);
    });
  },

  /**
   * Get summary of backup contents.
   * @param {object} backup
   * @returns {object}
   */
  getBackupSummary(backup) {
    const data = backup?.data || {};
    const library = data.library || [];
    const sessions = data.sessionHistory || [];
    const totalSize = JSON.stringify(backup).length;
    return {
      games: Array.isArray(library) ? library.length : 0,
      sessions: Array.isArray(sessions) ? sessions.length : 0,
      settings: Object.keys(data).length,
      exportedAt: backup?.exportedAt || null,
      totalSize
    };
  },

  /**
   * Restore backup data.
   * @param {object} backup
   * @param {object} options
   * @param {boolean} options.overwrite - If true, clear all existing data before restore
   * @returns {{ success: boolean, message: string, restored: number }}
   */
  restoreBackup(backup, options = {}) {
    try {
      const validation = this.validateBackup(backup);
      if (!validation.valid) return { success: false, message: validation.message, restored: 0 };

      const { data } = backup;
      const keys = Object.keys(data);
      if (options.overwrite) {
        StorageService.clear();
      }
      let restored = 0;
      for (const key of keys) {
        if (data[key] === undefined) continue;
        StorageService.set(key, data[key]);
        restored += 1;
      }
      return { success: true, message: 'Backup restored successfully.', restored };
    } catch (error) {
      return { success: false, message: `Restore failed: ${error.message}`, restored: 0 };
    }
  },

  /**
   * Download a backup blob.
   * @param {Blob} blob
   * @param {string} filename
   */
  downloadBackup(blob, filename = `gamepilot-backup-${new Date().toISOString().split('T')[0]}.json`) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

export default BackupService;
export { BACKUP_VERSION, BACKUP_TYPE };
