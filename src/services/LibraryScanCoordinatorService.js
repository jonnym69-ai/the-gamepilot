import { mergeLibraryUpdates } from './LibraryDataService';
import { LibraryScannerService } from './LibraryScannerService';
import ManualGamesService from './ManualGamesService';
import StorageService from './StorageService';

const SCAN_REPORT_KEY = 'gamepilot-lastScanReport';

export class LibraryScanCoordinatorService {
  static isScanningAvailable() {
    return LibraryScannerService.isElectronRuntime();
  }

  static async collectScannedGames(assignMoodToGame, options = {}) {
    return LibraryScannerService.scanAllLibraries(assignMoodToGame, options);
  }

  static getLastScanReport() {
    return StorageService.get(SCAN_REPORT_KEY, null);
  }

  static clearLastScanReport() {
    StorageService.remove(SCAN_REPORT_KEY);
  }

  static async scanAndMergeLibrary({ currentLibrary = [], assignMoodToGame, manual = false }) {
    const allGames = await this.collectScannedGames(assignMoodToGame, { manual });
    // Manual (user-picked) games are never produced by the native scanners;
    // re-append them post-merge so a rescan can never silently drop them.
    const mergedLibrary = ManualGamesService.mergeIntoLibrary(mergeLibraryUpdates(currentLibrary, allGames));
    const scanReport = LibraryScannerService.getLastScanDebug();

    if (scanReport) {
      StorageService.set(SCAN_REPORT_KEY, scanReport);
    }

    return {
      allGames,
      mergedLibrary,
      scanReport,
    };
  }
}
