import StorageService from './StorageService';

// RetroAchievements — opt-in, per-user credentials stored locally (the RA web
// API key is the user's own, like the Steam64 ID). The Electron main process
// calls retroachievements.org directly; there is no GamePilot relay.
const ENABLED_KEY = 'retroAchievementsEnabled';
const USERNAME_KEY = 'retroAchievementsUsername';
const API_KEY = 'retroAchievementsApiKey';
const PROGRESS_CAP_PER_SCAN = 40;

// Consoles RA supports. Missing from our platform list: GameCube/Wii/Wii U,
// 3DS, Switch, PS3 — RA doesn't track them, so those profiles get nothing.
export const RA_CONSOLE_IDS = {
  'Sega Genesis': 1,
  'Nintendo 64': 2,
  SNES: 3,
  'Game Boy': 4,
  'Game Boy Advance': 5,
  'Game Boy Color': 6,
  NES: 7,
  'PC Engine': 8,
  'Master System': 11,
  PlayStation: 12,
  'Game Gear': 15,
  'Nintendo DS': 18,
  'PlayStation 2': 21,
  Arcade: 27,
  Saturn: 39,
  Dreamcast: 40,
  PSP: 41,
};

const normalizeTitle = (title = '') =>
  String(title)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

class RetroAchievementsService {
  static isEnabled() {
    return StorageService.getString(ENABLED_KEY) === 'true';
  }

  static setEnabled(enabled) {
    StorageService.setString(ENABLED_KEY, String(Boolean(enabled)));
  }

  static getUsername() {
    return StorageService.getString(USERNAME_KEY) || '';
  }

  static setUsername(username) {
    StorageService.setString(USERNAME_KEY, String(username || '').trim());
  }

  static getApiKey() {
    return StorageService.getString(API_KEY) || '';
  }

  static setApiKey(apiKey) {
    StorageService.setString(API_KEY, String(apiKey || '').trim());
  }

  static getCredentials() {
    const username = this.getUsername();
    const apiKey = this.getApiKey();
    return username && apiKey ? { username, apiKey } : null;
  }

  static consoleIdFor(game = {}) {
    return RA_CONSOLE_IDS[game?.brandPlatform] || null;
  }

  static canTrack(game = {}) {
    const emulated = game?.source === 'emulator' || game?.launchType === 'emulator';
    return emulated && this.consoleIdFor(game) !== null;
  }

  static matchTitle(games = [], name = '') {
    const target = normalizeTitle(name);
    if (!target) return null;
    const normalized = games
      .map((game) => ({ ...game, _normalized: normalizeTitle(game.title) }))
      .filter((game) => game._normalized);

    return (
      normalized.find((game) => game._normalized === target) ||
      normalized.find((game) => game._normalized.startsWith(target)) ||
      normalized.find((game) => target.startsWith(game._normalized)) ||
      normalized.find((game) => game._normalized.includes(target) || target.includes(game._normalized)) ||
      null
    );
  }

  static async getGameList(consoleId) {
    const creds = this.getCredentials();
    if (!creds || !window.electronAPI?.raGameList || !consoleId) return null;
    try {
      const result = await window.electronAPI.raGameList({
        ...creds,
        consoleId,
      });
      return result?.ok && Array.isArray(result.games) ? result.games : null;
    } catch (error) {
      return null;
    }
  }

  static async getProgress(game) {
    const creds = this.getCredentials();
    const gameId = Number(game?.raGameId) || 0;
    if (!creds || !gameId || !window.electronAPI?.raGameProgress) return null;
    try {
      const result = await window.electronAPI.raGameProgress({ ...creds, gameId });
      return result?.ok ? result.progress : null;
    } catch (error) {
      return null;
    }
  }

  // Match each emulated game to its RA catalog entry (raGameId/raTitle/
  // raTotal), then fetch progress for a bounded slice so a big library doesn't
  // hammer the API. Attaches raProgress {earned,total,earnedHardcore,
  // completion} to games it can track.
  static async enrichEmulatedGames(games = []) {
    if (!this.isEnabled() || !this.getCredentials() || !window.electronAPI?.raGameList) {
      return games;
    }

    const listCache = new Map();
    const matched = [];
    for (const game of games) {
      if (!this.canTrack(game)) continue;
      const consoleId = this.consoleIdFor(game);
      if (!listCache.has(consoleId)) {
        listCache.set(consoleId, await this.getGameList(consoleId));
      }
      const catalog = listCache.get(consoleId);
      if (!catalog) continue;
      const match = this.matchTitle(catalog, game.name);
      if (!match) continue;
      game.raGameId = match.id;
      game.raTitle = match.title;
      game.raTotal = match.achievements || 0;
      matched.push(game);
    }

    for (const game of matched.slice(0, PROGRESS_CAP_PER_SCAN)) {
      const progress = await this.getProgress(game);
      if (progress) {
        game.raProgress = {
          earned: progress.earned,
          earnedHardcore: progress.earnedHardcore,
          total: progress.total,
          completion: progress.completion,
          completionHardcore: progress.completionHardcore,
        };
      }
    }
    return games;
  }
}

export default RetroAchievementsService;
