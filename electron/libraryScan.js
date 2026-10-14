/**
 * Game launching and library scanning IPC handlers.
 */

function registerIpcHandlers(ipcMain, deps) {
  const { gameLauncher } = deps;

  // Game launching IPC handlers
  console.log('🔧 Setting up IPC handlers for game launching...');

  ipcMain.on('launch-game', async (event, game) => {
    console.log('🚀 Launching game:', game.name, 'Platform:', game.platform);

    try {
      // Use the new GameLauncher class
      const result = await gameLauncher.launchGame(game);

      // Send result back to renderer
      event.reply('launch-game-result', result);
      console.log('✅ Launch result:', result);
    } catch (error) {
      console.error('❌ Launch error:', error);
      event.reply('launch-game-result', {
        success: false,
        message: error.message,
      });
    }
  });

  ipcMain.handle('launch-game', async (_event, game) => {
    console.log('🚀 Launching game via invoke:', game.name, 'Platform:', game.platform);

    try {
      return await gameLauncher.launchGame(game);
    } catch (error) {
      console.error('❌ Launch error:', error);
      return {
        success: false,
        message: error.message,
      };
    }
  });

  ipcMain.handle('scan-game-libraries', async (_event, options = {}) => {
    try {
      if (!options || options.manual !== true) {
        console.warn('[Electron] Ignoring non-manual library scan request');
        return { games: [], debug: { skipped: true, reason: 'manual-scan-required' } };
      }

      console.log('[Electron] Starting game library scan...');
      const { scanAllLibraries } = require('../nativeLibraryScanner');
      const games = await scanAllLibraries();
      const debug = global.lastScanDebug || null;
      console.log(`[Electron] Scan complete: found ${games.length} games`);
      return { games, debug };
    } catch (error) {
      console.error('[Electron] Library scan error:', error);
      return {
        games: [],
        debug: {
          error: error?.message || 'Unknown scan error',
        },
      };
    }
  });

  ipcMain.handle('get-scan-debug', async () => global.lastScanDebug || null);

  // Owned-but-uninstalled GOG games, read from the local Galaxy DB. The
  // renderer sends only the names already in its library so the main
  // process can diff owned releases against installed ones.
  ipcMain.handle('gog-uninstalled', async (_event, names) => {
    try {
      const list = (Array.isArray(names) ? names : [])
        .map((name) => ({ name: String(name || '').slice(0, 200) }))
        .filter((entry) => entry.name)
        .slice(0, 5000);
      const { getGogGalaxyUninstalledGames } = require('../nativeLibraryScanner');
      const games = await getGogGalaxyUninstalledGames(list);
      return { ok: true, games: Array.isArray(games) ? games.slice(0, 500) : [] };
    } catch (error) {
      console.warn('[Electron] GOG uninstalled read failed:', error.message);
      return { ok: false, error: 'gog-uninstalled-unavailable', games: [] };
    }
  });
}

module.exports = { registerIpcHandlers };
