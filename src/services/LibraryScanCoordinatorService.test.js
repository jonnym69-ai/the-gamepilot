import { mergeLibraryUpdates } from './LibraryDataService';
import { LibraryScanCoordinatorService } from './LibraryScanCoordinatorService';
import { LibraryScannerService } from './LibraryScannerService';

jest.mock('./LibraryDataService', () => ({
  mergeLibraryUpdates: jest.fn()
}));

jest.mock('./LibraryScannerService', () => ({
  LibraryScannerService: {
    isElectronRuntime: jest.fn(),
    scanAllLibraries: jest.fn(),
    getLastScanDebug: jest.fn()
  }
}));

jest.mock('./UserBehaviorProfile', () => ({
  __esModule: true,
  UserBehaviorProfile: {
    getProfile: jest.fn(() => ({
      selectionHistory: [],
      moodCounts: {},
      genreCounts: {},
      completionCounts: {},
      sessionLengths: [],
      peakPlayHours: {}
    })),
    trackRating: jest.fn()
  }
}));

describe('LibraryScanCoordinatorService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('delegates scanning availability to LibraryScannerService', () => {
    LibraryScannerService.isElectronRuntime.mockReturnValue(true);

    expect(LibraryScanCoordinatorService.isScanningAvailable()).toBe(true);
    expect(LibraryScannerService.isElectronRuntime).toHaveBeenCalledTimes(1);
  });

  test('collects games from native scanner service', async () => {
    const assignMoodToGame = jest.fn();

    LibraryScannerService.scanAllLibraries.mockResolvedValue([
      { name: 'Steam Game', platform: 'Steam' },
      { name: 'Epic Game', platform: 'Epic' }
    ]);

    const collectedGames = await LibraryScanCoordinatorService.collectScannedGames(assignMoodToGame);

    expect(collectedGames.map((game) => game.name)).toEqual(['Steam Game', 'Epic Game']);
    expect(LibraryScannerService.scanAllLibraries).toHaveBeenCalledWith(assignMoodToGame, expect.any(Object));
  });

  test('scans and merges library updates through merge policy', async () => {
    const assignMoodToGame = jest.fn();
    const currentLibrary = [{ name: 'Existing Game' }];

    LibraryScannerService.scanAllLibraries.mockResolvedValue([{ name: 'Steam Game', platform: 'Steam' }]);

    const mergedLibrary = [{ name: 'Existing Game' }, { name: 'Steam Game' }];
    mergeLibraryUpdates.mockReturnValue(mergedLibrary);

    const scanReport = { summary: { totalScanned: 1 }, platformStatus: {}, platformCounts: {} };
    LibraryScannerService.getLastScanDebug.mockReturnValue(scanReport);

    const result = await LibraryScanCoordinatorService.scanAndMergeLibrary({
      currentLibrary,
      assignMoodToGame
    });

    expect(mergeLibraryUpdates).toHaveBeenCalledWith(currentLibrary, [{ name: 'Steam Game', platform: 'Steam' }]);
    expect(LibraryScannerService.getLastScanDebug).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      allGames: [{ name: 'Steam Game', platform: 'Steam' }],
      mergedLibrary,
      scanReport
    });
  });
});
