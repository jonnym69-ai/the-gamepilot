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

export class LibraryScannerService {
  static RAW_SCAN_CACHE = [];
  static RAW_SCAN_CACHE_TIMESTAMP = 0;
  static RAW_SCAN_CACHE_TTL_MS = 5000;
  static LAST_SCAN_DEBUG = null;

  static isElectronRuntime() {
    return isElectronRuntime();
  }

  static async scanAllLibraries(assignMoodToGame) {
    const nativeGames = await this.getNativeScannedLibraries();
    return nativeGames
      .map((game) => enrichScannedGame(game, assignMoodToGame))
      .filter(Boolean);
  }

  static async getNativeScannedLibraries() {
    if (!this.isElectronRuntime()) {
      console.warn('Electron runtime not detected, cannot scan libraries.');
      return [];
    }

    const now = Date.now();
    if ((now - this.RAW_SCAN_CACHE_TIMESTAMP) < this.RAW_SCAN_CACHE_TTL_MS) {
      console.log('Using cached scan results, timestamp:', this.RAW_SCAN_CACHE_TIMESTAMP);
      return this.RAW_SCAN_CACHE;
    }

    const electronAPI = process.env.NODE_ENV === 'production'
      ? await waitForElectronAPI()
      : getElectronAPI();
    if (!electronAPI || typeof electronAPI.scanGameLibraries !== 'function') {
      console.error('Electron API for scanning libraries not available.');
      return [];
    }

    try {
      console.log('Initiating native library scan via Electron API...');
      const scannedLibraries = await electronAPI.scanGameLibraries();
      if (Array.isArray(scannedLibraries)) {
        console.log('Scan successful, received', scannedLibraries.length, 'games.');
        this.RAW_SCAN_CACHE = scannedLibraries;
        this.LAST_SCAN_DEBUG = null;
      } else if (scannedLibraries && typeof scannedLibraries === 'object') {
        console.log('Scan successful with debug info, received', (Array.isArray(scannedLibraries.games) ? scannedLibraries.games.length : 0), 'games.');
        this.RAW_SCAN_CACHE = Array.isArray(scannedLibraries.games) ? scannedLibraries.games : [];
        this.LAST_SCAN_DEBUG = scannedLibraries.debug || null;
      } else {
        console.warn('Scan returned unexpected data format:', scannedLibraries);
        this.RAW_SCAN_CACHE = [];
        this.LAST_SCAN_DEBUG = null;
      }
      this.RAW_SCAN_CACHE_TIMESTAMP = now;
      return this.RAW_SCAN_CACHE;
    } catch (error) {
      console.error('Error scanning native game libraries:', error);
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
}
