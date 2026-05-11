import { getGameGenres } from '../GameGenreDatabase';
import { getElectronAPI, isElectronRuntime, waitForElectronAPI } from './ElectronBridge';

const createTrackedDefaults = () => ({
  time_played: 0,
  launch_count: 0,
  last_played: null,
  playtime: {
    total: 0,
    daily: {},
    weekly: {},
    monthly: {},
    yearly: {}
  }
});

const enrichScannedGame = (game, assignMoodToGame) => {
  if (!game || typeof game !== 'object') {
    return null;
  }

  const gameName = game.name || 'Unknown Game';
  const detectedGenres = getGameGenres(gameName);
  const selectedGenres = detectedGenres.length > 0 ? detectedGenres : ['Story-driven'];

  return {
    ...createTrackedDefaults(),
    ...game,
    genres: selectedGenres,
    mood: assignMoodToGame(gameName, selectedGenres) || 'Relaxed'
  };
};

const normalizeScanDebug = (debug, games = []) => {
  if (!debug || typeof debug !== 'object') {
    return {
      summary: {
        totalGamesAfterDedupe: games.length,
        scannedPlatformCount: 0,
        successfulPlatformCount: 0,
        emptyPlatformCount: 0,
        errorPlatformCount: 0,
        lastScanAt: Date.now()
      },
      platformStatus: {},
      platformCounts: {},
      paths: {},
      activeDrives: []
    };
  }

  const platformStatus = debug.platformStatus && typeof debug.platformStatus === 'object'
    ? debug.platformStatus
    : {};
  const statusEntries = Object.values(platformStatus);
  const successfulPlatformCount = statusEntries.filter((entry) => entry?.scanStatus === 'found').length;
  const emptyPlatformCount = statusEntries.filter((entry) => entry?.scanStatus === 'empty').length;
  const errorPlatformCount = statusEntries.filter((entry) => entry?.scanStatus === 'error').length;

  return {
    ...debug,
    summary: {
      totalGamesAfterDedupe: games.length,
      scannedPlatformCount: statusEntries.length,
      successfulPlatformCount,
      emptyPlatformCount,
      errorPlatformCount,
      lastScanAt: Date.now(),
      ...(debug.summary || {})
    },
    platformStatus,
    platformCounts: debug.platformCounts && typeof debug.platformCounts === 'object'
      ? debug.platformCounts
      : {},
    paths: debug.paths && typeof debug.paths === 'object'
      ? debug.paths
      : {},
    activeDrives: Array.isArray(debug.activeDrives)
      ? debug.activeDrives
      : []
  };
};

export class LibraryScannerService {
  static RAW_SCAN_CACHE = [];
  static RAW_SCAN_CACHE_TIMESTAMP = 0;
  static RAW_SCAN_CACHE_TTL_MS = 5000;
  static LAST_SCAN_DEBUG = null;

  static isElectronRuntime() {
    return isElectronRuntime();
  }

  static async scanAllLibraries(assignMoodToGame, options = {}) {
    const nativeGames = await this.getNativeScannedLibraries(options);
    return nativeGames
      .map((game) => enrichScannedGame(game, assignMoodToGame))
      .filter(Boolean);
  }

  static async getNativeScannedLibraries(options = {}) {
    if (!this.isElectronRuntime()) {
      return [];
    }

    const now = Date.now();
    if ((now - this.RAW_SCAN_CACHE_TIMESTAMP) < this.RAW_SCAN_CACHE_TTL_MS) {
      return this.RAW_SCAN_CACHE;
    }

    const electronAPI = process.env.NODE_ENV === 'production'
      ? await waitForElectronAPI()
      : getElectronAPI();
    if (!electronAPI || typeof electronAPI.scanGameLibraries !== 'function') {
      return [];
    }

    try {
      const scannedLibraries = await electronAPI.scanGameLibraries(options);
      if (Array.isArray(scannedLibraries)) {
        this.RAW_SCAN_CACHE = scannedLibraries;
        this.LAST_SCAN_DEBUG = normalizeScanDebug(null, this.RAW_SCAN_CACHE);
      } else if (scannedLibraries && typeof scannedLibraries === 'object') {
        this.RAW_SCAN_CACHE = Array.isArray(scannedLibraries.games) ? scannedLibraries.games : [];
        this.LAST_SCAN_DEBUG = normalizeScanDebug(scannedLibraries.debug, this.RAW_SCAN_CACHE);
      } else {
        this.RAW_SCAN_CACHE = [];
        this.LAST_SCAN_DEBUG = normalizeScanDebug(null, []);
      }
      this.RAW_SCAN_CACHE_TIMESTAMP = now;
      return this.RAW_SCAN_CACHE;
    } catch (error) {
      this.LAST_SCAN_DEBUG = normalizeScanDebug({
        error: error?.message || 'Unknown scan error',
        summary: {
          totalGamesAfterDedupe: 0,
          scannedPlatformCount: 0,
          successfulPlatformCount: 0,
          emptyPlatformCount: 0,
          errorPlatformCount: 1
        }
      }, []);
      return [];
    }
  }

  static getLastScanDebug() {
    return this.LAST_SCAN_DEBUG;
  }

  static async filterByPlatform(platformName, assignMoodToGame) {
    const scannedLibraries = await this.scanAllLibraries(assignMoodToGame);
    return scannedLibraries.filter((game) => game.platform === platformName);
  }

  static async scanSteamLibrary(assignMoodToGame) {
    return this.filterByPlatform('Steam', assignMoodToGame);
  }

  static async scanEpicLibrary(assignMoodToGame) {
    return this.filterByPlatform('Epic', assignMoodToGame);
  }

  static async scanGogLibrary(assignMoodToGame) {
    return this.filterByPlatform('GOG', assignMoodToGame);
  }

  static async scanOriginLibrary(assignMoodToGame) {
    return this.filterByPlatform('EA', assignMoodToGame);
  }

  static async scanUplayLibrary(assignMoodToGame) {
    return this.filterByPlatform('Uplay', assignMoodToGame);
  }

  static async scanBattleNetLibrary(assignMoodToGame) {
    return this.filterByPlatform('Battle.net', assignMoodToGame);
  }

  static async scanRockstarLibrary(assignMoodToGame) {
    return this.filterByPlatform('Rockstar', assignMoodToGame);
  }

  static async scanXboxLibrary(assignMoodToGame) {
    return this.filterByPlatform('Xbox', assignMoodToGame);
  }

  static async scanPlaystationLibrary(assignMoodToGame) {
    return this.filterByPlatform('PlayStation', assignMoodToGame);
  }

  static async scanAmazonLibrary(assignMoodToGame) {
    return this.filterByPlatform('Amazon', assignMoodToGame);
  }

  static async scanItchLibrary(assignMoodToGame) {
    return this.filterByPlatform('Itch.io', assignMoodToGame);
  }
}
