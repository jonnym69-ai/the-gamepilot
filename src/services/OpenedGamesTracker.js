// OpenedGamesTracker.js - Tracks which games have been opened/launched
import StorageService from './StorageService';

export class OpenedGamesTracker {
  static STORAGE_KEY = 'openedGames';

  // Get all opened games
  static getOpenedGames() {
    try {
      return StorageService.get(this.STORAGE_KEY, {});
    } catch (error) {
      console.error('Error reading opened games:', error);
      return {};
    }
  }

  // Mark a game as opened
  static markGameAsOpened(game) {
    if (!game || !game.appid) return;

    try {
      const opened = this.getOpenedGames();
      
      // Only add if not already opened
      if (!opened[game.appid]) {
        opened[game.appid] = {
          name: game.name,
          platform: game.platform,
          openedAt: Date.now(),
          appid: game.appid
        };
        StorageService.set(this.STORAGE_KEY, opened);
      }
    } catch (error) {
      console.error('Error marking game as opened:', error);
    }
  }

  // Check if a game has been opened
  static isGameOpened(game) {
    if (!game || !game.appid) return false;
    const opened = this.getOpenedGames();
    return !!opened[game.appid];
  }

  // Get count of opened games
  static getOpenedCount() {
    return Object.keys(this.getOpenedGames()).length;
  }

  // Get list of opened games
  static getOpenedGamesList() {
    return Object.values(this.getOpenedGames());
  }

  // Clear all opened games (for testing)
  static clearAll() {
    try {
      StorageService.remove(this.STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing opened games:', error);
    }
  }
}
