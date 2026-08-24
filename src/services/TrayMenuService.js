import { getElectronAPI, isElectronRuntime } from './ElectronBridge';

const MAX_TRAY_GAMES = 5;

class TrayMenuService {
  static isAvailable() {
    return isElectronRuntime();
  }

  static updateMenu(games = []) {
    const api = getElectronAPI();
    if (!api || typeof api.updateTrayMenu !== 'function') {
      return;
    }

    const recent = (Array.isArray(games) ? games : [])
      .filter((game) => game?.name && (game.last_played || game.time_played))
      .sort((a, b) => {
        const aPlayed = a.last_played || '';
        const bPlayed = b.last_played || '';
        return String(bPlayed).localeCompare(String(aPlayed));
      })
      .slice(0, MAX_TRAY_GAMES)
      .map((game) => ({
        name: game.name,
        platform: game.platform || '',
        appid: game.appid || game.app_id || null
      }));

    api.updateTrayMenu(recent).catch(() => {});
  }
}

export default TrayMenuService;
