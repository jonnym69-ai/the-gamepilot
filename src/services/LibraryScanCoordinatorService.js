import { mergeLibraryUpdates } from './LibraryDataService';
import { LibraryScannerService } from './LibraryScannerService';

export class LibraryScanCoordinatorService {
  static isScanningAvailable() {
    return LibraryScannerService.isElectronRuntime();
  }

  static async collectScannedGames(assignMoodToGame) {
    return LibraryScannerService.scanAllLibraries(assignMoodToGame);
  }

  static async scanAndMergeLibrary({ currentLibrary = [], assignMoodToGame }) {
    const allGames = await this.collectScannedGames(assignMoodToGame);
    const mergedLibrary = mergeLibraryUpdates(currentLibrary, allGames);
    const scanReport = LibraryScannerService.getLastScanDebug();

    return {
      allGames,
      mergedLibrary,
      scanReport
    };
  }
}
