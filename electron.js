/**
 * GamePilot — Electron main process entry point.
 *
 * This file is the thin orchestrator that wires together the modular
 * sub-systems living in the `electron/` directory. Each module owns its
 * domain logic and registers its own IPC handlers via a `registerIpcHandlers`
 * function. Shared state (the main window, game launcher, session database)
 * is created here and passed to modules that need it.
 */

const { app, ipcMain, protocol } = require('electron');
const path = require('path');
const GameLauncher = require('./launchHandler');
const SessionDatabase = require('./sessionDatabase');
const discordPresence = require('./discordPresence');

// Module imports
const windowManager = require('./electron/windowManager');
const trayManager = require('./electron/trayManager');
const processMonitor = require('./electron/processMonitor');
const passiveWatcher = require('./electron/passiveWatcher');
const preferences = require('./electron/preferences');
const systemInfo = require('./electron/systemInfo');
const howLongToBeat = require('./electron/howLongToBeat');
const pcgamingWiki = require('./electron/pcgamingWiki');
const steam = require('./electron/steam');
const saveManager = require('./electron/saveManager');
const uninstall = require('./electron/uninstall');
const emulator = require('./electron/emulator');
const sessionStore = require('./electron/sessionStore');
const libraryScan = require('./electron/libraryScan');
const discord = require('./electron/discord');
const misc = require('./electron/misc');

const APP_DISPLAY_NAME = 'GamePilot';
app.setName(APP_DISPLAY_NAME);
app.setPath('userData', path.join(app.getPath('appData'), APP_DISPLAY_NAME));

// Shared instances
const gameLauncher = new GameLauncher();
const sessionDatabase = new SessionDatabase(app.getPath('userData'));

// Shared state getters for modules that need the main window
const { getMainWindow, getGameBarWindow, createWindow, createGameBarOverlayWindow } = windowManager;

// ---------------------------------------------------------------------------
// Register IPC handlers for every domain module.
// ---------------------------------------------------------------------------
const sharedDeps = { getMainWindow, getGameBarWindow, gameLauncher, sessionDatabase };

preferences.registerIpcHandlers(ipcMain);
systemInfo.registerIpcHandlers(ipcMain);
howLongToBeat.registerIpcHandlers(ipcMain);
pcgamingWiki.registerIpcHandlers(ipcMain);
steam.registerIpcHandlers(ipcMain);
saveManager.registerIpcHandlers(ipcMain);
uninstall.registerIpcHandlers(ipcMain);
emulator.registerIpcHandlers(ipcMain);
sessionStore.registerIpcHandlers(ipcMain, sharedDeps);
libraryScan.registerIpcHandlers(ipcMain, sharedDeps);
discord.registerIpcHandlers(ipcMain);
misc.registerIpcHandlers(ipcMain, sharedDeps);
processMonitor.registerIpcHandlers(ipcMain);
passiveWatcher.registerIpcHandlers(ipcMain, sharedDeps);
trayManager.registerIpcHandlers(ipcMain, {
  createWindow,
  createGameBarOverlayWindow,
  gameLauncher,
});

console.log('🔧 Electron starting...');
console.log('📦 Electron version:', process.versions.electron);
console.log('📦 Node version:', process.versions.node);
console.log('📦 App available:', !!app);

// Enable hot reloading only for the explicit dev-server workflow.
if (process.env.ELECTRON_ENABLE_RELOADER === 'true') {
  try {
    require('electron-reloader')(module, {
      debug: false,
      watchRenderer: false,
      ignore: [/node_modules/, /build/, /dist/, /backups/, /gamepilot-source.*\.zip$/],
    });
  } catch (_) {
    console.log('Electron reloader not available in production');
  }
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------
app
  .whenReady()
  .then(() => {
    console.log('🚀 App ready, creating window...');
    preferences.applyStartupLaunchPreference(preferences.getStartupLaunchPreference());

    trayManager.createTray({
      getMainWindow,
      createWindow,
      createGameBarOverlayWindow,
      gameLauncher,
    });

    // Register app:// protocol for local file access
    protocol.registerFileProtocol('app', (request, callback) => {
      try {
        const relativePath = decodeURIComponent(request.url.replace(/^app:\/\//, '')).replace(/^[/\\]+/, '');
        const appRoot = path.resolve(__dirname);
        const resolvedPath = path.resolve(appRoot, relativePath);
        if (resolvedPath !== appRoot && !resolvedPath.startsWith(`${appRoot}${path.sep}`)) {
          console.warn('Blocked app protocol path outside application root:', relativePath);
          return callback({ error: -10 });
        }
        return callback(resolvedPath);
      } catch (error) {
        console.error('Failed to resolve app protocol request', error);
        return callback({ error: -2 });
      }
    });

    createWindow({
      onWindowClosed: () => {
        processMonitor.stopAllGameMonitors();
      },
    });
  })
  .catch((err) => {
    console.error('❌ Error in app.whenReady():', err);
    console.error('❌ Error stack:', err.stack);
    process.exit(1);
  });

// Handle window creation when app is activated (macOS)
app.on('activate', () => {
  console.log('🔄 App activate event');
  const { BrowserWindow } = require('electron');
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow({
      onWindowClosed: () => {
        processMonitor.stopAllGameMonitors();
      },
    });
  }
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  console.log('❌ All windows closed');
  processMonitor.stopAllGameMonitors();
  passiveWatcher.stopPassiveWatchInterval();
  discordPresence.disconnect();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle app ready event
app.on('ready', () => {
  console.log('🎯 App ready event');
});

// Error handling
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  console.error('❌ Stack:', err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
