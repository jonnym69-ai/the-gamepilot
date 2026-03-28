// OpenedGamesTracker.js - Tracks which games have been opened/launched
export class OpenedGamesTracker {
  static STORAGE_KEY = 'openedGames';

  // Get all opened games
  static getOpenedGames() {
    try {
      const opened = localStorage.getItem(this.STORAGE_KEY);
      return opened ? JSON.parse(opened) : {};
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
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(opened));
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
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing opened games:', error);
    }
  }
}
