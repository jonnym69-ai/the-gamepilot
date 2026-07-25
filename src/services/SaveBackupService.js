import PCGamingWikiService from './PCGamingWikiService';
import StorageService from './StorageService';
import SessionRepository from './SessionRepository';

const HISTORY_KEY = 'saveBackupHistoryV1';
const MAX_HISTORY_ENTRIES = 100;

const isGameActive = (game = {}) => {
  const sessions = SessionRepository.getActiveSessions();
  if (!sessions || typeof sessions !== 'object') return false;
  const names = [game.name, game.title].filter(Boolean).map((value) => String(value).toLowerCase());
  return Object.keys(sessions).some((name) => names.includes(String(name).toLowerCase()));
};

const bytesToLabel = (bytes = 0) => {
  const value = Number(bytes || 0);
  if (value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size >= 10 || unitIndex === 0 ? Math.round(size) : size.toFixed(1)} ${units[unitIndex]}`;
};

const normalizeLocation = (path, type, source = 'pcgamingwiki') => {
  const rawPath = String(path || '').trim();
  if (!rawPath) return null;
  return {
    id: `${type}-${rawPath.toLowerCase()}`,
    type,
    source,
    label: type === 'save' ? 'Save data' : 'Config files',
    rawPath,
    path: rawPath
  };
};

const getGameKey = (game = {}) => String(
  game.appid
    || game.steam_appid
    || game.appId
    || game.name
    || game.title
    || ''
).toLowerCase();

const normalizeHistoryEntry = (result = {}, game = {}) => {
  const manifest = result.manifest || {};
  const createdAt = Number(manifest.createdAt || Date.now());
  return {
    id: `${getGameKey(game) || 'game'}-${createdAt}`,
    gameKey: getGameKey(game),
    gameName: manifest.game?.name || game.name || game.title || 'Unknown Game',
    appid: manifest.game?.appid || game.appid || game.steam_appid || game.appId || null,
    platform: manifest.game?.platform || game.platform || null,
    createdAt,
    backupPath: result.backupPath || '',
    manifestPath: result.manifestPath || '',
    restoreSupported: Boolean(manifest.restoreSupported),
    totals: manifest.totals || { bytes: 0, files: 0, dirs: 0, truncated: false },
    locations: Array.isArray(manifest.locations) ? manifest.locations : []
  };
};

class SaveBackupService {
  static async buildPlan(game) {
    const pcgw = await PCGamingWikiService.lookup(game);
    const candidates = [
      normalizeLocation(pcgw?.saveLocation, 'save'),
      normalizeLocation(pcgw?.configLocation, 'config')
    ].filter(Boolean);

    const plan = {
      gameName: game?.name || 'Unknown Game',
      generatedAt: Date.now(),
      source: pcgw?.found ? 'pcgamingwiki' : 'none',
      pageUrl: pcgw?.pageUrl || null,
      candidates,
      locations: [],
      readyCount: 0,
      missingCount: candidates.length,
      hasElectronBridge: Boolean(typeof window !== 'undefined' && window.electronAPI?.saveLocationStatus),
      hasBackupBridge: Boolean(typeof window !== 'undefined' && window.electronAPI?.chooseSaveBackupDestination && window.electronAPI?.createSaveBackup),
      hasRestorePreviewBridge: Boolean(typeof window !== 'undefined' && window.electronAPI?.previewSaveRestore),
      note: 'GamePilot can create a timestamped local backup with a manifest. Restore is intentionally disabled until overwrite safety checks are built.'
    };

    if (!plan.hasElectronBridge || candidates.length === 0) {
      return plan;
    }

    try {
      const result = await window.electronAPI.saveLocationStatus({ game, candidates });
      const locations = Array.isArray(result?.locations) ? result.locations : [];
      return {
        ...plan,
        locations,
        readyCount: locations.filter((location) => location.exists).length,
        missingCount: locations.filter((location) => !location.exists).length
      };
    } catch (error) {
      return {
        ...plan,
        error: error.message || 'Unable to validate save locations'
      };
    }
  }

  static async openLocation(game, location) {
    if (!window.electronAPI?.openSaveLocation || !location) {
      return { ok: false, error: 'electron-only' };
    }
    return window.electronAPI.openSaveLocation({ game, path: location.resolvedPath || location.rawPath || location.path });
  }

  static async chooseDestination() {
    if (!window.electronAPI?.chooseSaveBackupDestination) {
      return { ok: false, error: 'electron-only' };
    }
    return window.electronAPI.chooseSaveBackupDestination();
  }

  static async createBackup(game, destinationRoot, locations = []) {
    if (!window.electronAPI?.createSaveBackup) {
      return { ok: false, error: 'electron-only' };
    }
    const backupLocations = Array.isArray(locations) ? locations.filter((location) => location?.exists && location?.canOpen) : [];
    if (!destinationRoot) return { ok: false, error: 'missing-destination' };
    if (backupLocations.length === 0) return { ok: false, error: 'no-existing-locations' };
    const result = await window.electronAPI.createSaveBackup({ game, destinationRoot, locations: backupLocations });
    if (result?.ok) {
      this.recordBackupResult(result, game);
    }
    return result;
  }

  static getBackupHistory(game = null) {
    const history = StorageService.get(HISTORY_KEY, []);
    const safeHistory = Array.isArray(history) ? history : [];
    const gameKey = game ? getGameKey(game) : '';
    return safeHistory
      .filter((entry) => !gameKey || entry.gameKey === gameKey)
      .sort((left, right) => Number(right.createdAt || 0) - Number(left.createdAt || 0));
  }

  static recordBackupResult(result, game = {}) {
    if (!result?.ok || !result.manifest) return null;
    const entry = normalizeHistoryEntry(result, game);
    const history = this.getBackupHistory()
      .filter((item) => item.id !== entry.id && item.manifestPath !== entry.manifestPath);
    const nextHistory = [entry, ...history]
      .sort((left, right) => Number(right.createdAt || 0) - Number(left.createdAt || 0))
      .slice(0, MAX_HISTORY_ENTRIES);
    StorageService.set(HISTORY_KEY, nextHistory);
    return entry;
  }

  static getRestorePreview(historyEntry = null) {
    if (!historyEntry) return null;
    const locations = Array.isArray(historyEntry.locations) ? historyEntry.locations : [];
    return {
      restoreSupported: false,
      backupPath: historyEntry.backupPath,
      manifestPath: historyEntry.manifestPath,
      destinationCount: locations.length,
      destinations: locations.map((location) => ({
        label: location.label || location.type || 'Location',
        backupPath: location.backupPath || '',
        targetPath: location.resolvedPath || '',
        files: Number(location.files || 0),
        bytes: Number(location.bytes || 0)
      })),
      message: 'Restore preview only. GamePilot will not overwrite live save files until restore safety checks are implemented.'
    };
  }

  static async previewRestore(game, historyEntry = null) {
    if (!window.electronAPI?.previewSaveRestore) {
      return { ok: false, error: 'electron-only' };
    }
    if (!historyEntry?.manifestPath) {
      return { ok: false, error: 'missing-manifest' };
    }
    return window.electronAPI.previewSaveRestore({ game, manifestPath: historyEntry.manifestPath });
  }

  static async restoreBackup(game, historyEntry = null, options = {}) {
    if (!window.electronAPI?.restoreSaveBackup) {
      return { ok: false, error: 'electron-only' };
    }
    if (isGameActive(game)) {
      return { ok: false, error: 'game-active' };
    }
    if (!historyEntry?.manifestPath) {
      return { ok: false, error: 'missing-manifest' };
    }
    if (!options?.destinationRoot) {
      return { ok: false, error: 'missing-safety-backup-destination' };
    }
    if (String(options?.confirmation || '').trim() !== String(game?.name || game?.title || '').trim()) {
      return { ok: false, error: 'confirmation-mismatch' };
    }

    const readyLocations = Array.isArray(options?.readyLocations) ? options.readyLocations : [];
    const safetyBackup = await this.createBackup(game, options.destinationRoot, readyLocations);
    if (!safetyBackup?.ok) {
      return {
        ok: false,
        error: 'safety-backup-failed',
        safetyBackup
      };
    }

    const restoreResult = await window.electronAPI.restoreSaveBackup({
      game,
      manifestPath: historyEntry.manifestPath,
      confirmation: options.confirmation
    });

    return {
      ...restoreResult,
      safetyBackup
    };
  }

  static getRestoreSafetyAssessment(game = {}, preview = null) {
    const comparisons = Array.isArray(preview?.comparisons) ? preview.comparisons : [];
    const gameRunning = isGameActive(game);
    const overwriteCount = comparisons.filter((comparison) => comparison.wouldOverwrite).length;
    const missingBackupCount = comparisons.filter((comparison) => !comparison.backupExists).length;
    const uncheckedTargets = preview?.ok ? 0 : 1;
    const blockers = [];
    const requirements = [];

    if (gameRunning) blockers.push('Game appears to have an active session. Close/end the session before restore.');
    if (uncheckedTargets) blockers.push('Run live-target preflight before restore can be considered.');
    if (missingBackupCount > 0) blockers.push(`${missingBackupCount} backup location${missingBackupCount === 1 ? '' : 's'} missing from disk.`);
    if (overwriteCount > 0) requirements.push(`${overwriteCount} live target${overwriteCount === 1 ? '' : 's'} will be overwritten, but unknown extra live files are not deleted.`);
    requirements.push('Create a fresh safety backup of current live saves immediately before restore.');
    requirements.push('Require typed confirmation matching the game name before copying files.');

    return {
      restoreEnabled: blockers.length === 0,
      gameRunning,
      overwriteCount,
      missingBackupCount,
      checkedTargets: comparisons.length,
      blockers,
      requirements,
      status: blockers.length > 0 ? 'blocked' : 'guarded',
      message: blockers.length > 0
        ? 'Restore remains blocked until safety issues are resolved.'
        : 'Restore can run after a fresh safety backup and typed confirmation.'
    };
  }

  static bytesToLabel(bytes) {
    return bytesToLabel(bytes);
  }
}

export default SaveBackupService;
