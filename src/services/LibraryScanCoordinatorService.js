import { mergeLibraryUpdates } from './LibraryDataService';
import { LibraryScannerService } from './LibraryScannerService';

export class LibraryScanCoordinatorService {
  static isScanningAvailable() {
    return LibraryScannerService.isElectronRuntime();
  }

  static async collectScannedGames(assignMoodToGame, options = {}) {
    return LibraryScannerService.scanAllLibraries(assignMoodToGame, options);
  }

  static async scanAndMergeLibrary({ currentLibrary = [], assignMoodToGame, manual = false }) {
    const allGames = await this.collectScannedGames(assignMoodToGame, { manual });
    const mergedLibrary = mergeLibraryUpdates(currentLibrary, allGames);
    const scanReport = LibraryScannerService.getLastScanDebug();

    return {
      allGames,
      mergedLibrary,
      scanReport
    };
  }
}
