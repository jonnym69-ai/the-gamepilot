/**
 * System tray manager.
 *
 * Creates the tray icon and context menu, and handles tray-related
 * IPC handlers (update-tray-menu, get-tray-menu).
 */

const { app, Menu, Tray } = require('electron');
const fs = require('fs');
const path = require('path');

let tray = null;
let cachedTrayGames = [];

function createTray(deps = {}) {
  const { getMainWindow, createWindow, createGameBarOverlayWindow, gameLauncher } = deps;

  if (process.platform === 'darwin') {
    // Tray is optional on macOS; focus on Windows for now.
    return;
  }

  const iconFile = process.platform === 'linux' ? 'gamepilotlogo.png' : 'gamepilot.ico.ico';
  const iconPath = path.join(__dirname, '..', 'public', iconFile);
  const fallbackIcon = path.join(__dirname, '..', 'public', 'favicon.ico');

  try {
    tray = new Tray(fs.existsSync(iconPath) ? iconPath : fallbackIcon);
    tray.setToolTip('GamePilot');
    tray.setContextMenu(buildTrayMenu([], { createWindow, createGameBarOverlayWindow, gameLauncher }));

    tray.on('click', () => {
      const mainWindow = getMainWindow();
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
        }
        mainWindow.focus();
      } else {
        createWindow();
      }
    });
  } catch (error) {
    tray = null;
    console.warn('[Tray] System tray is unavailable:', error.message);
  }
}

function buildTrayMenu(games = [], deps = {}) {
  const { createWindow, createGameBarOverlayWindow, gameLauncher } = deps;

  const gameItems =
    Array.isArray(games) && games.length > 0
      ? games.map((game) => ({
          label: game.name,
          click: () => {
            gameLauncher.launch(game).catch(() => {});
          },
        }))
      : [{ label: 'No recent games yet', enabled: false }];

  return Menu.buildFromTemplate([
    { label: 'Open GamePilot', click: () => createWindow() },
    { label: 'Open Game Bar Overlay', click: () => createGameBarOverlayWindow() },
    { type: 'separator' },
    { label: 'Continue Playing', enabled: false },
    ...gameItems,
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => app.quit(),
    },
  ]);
}

function registerIpcHandlers(ipcMain, deps = {}) {
  const { createWindow, createGameBarOverlayWindow, gameLauncher } = deps;

  ipcMain.handle('open-gamebar-overlay', () => {
    createGameBarOverlayWindow();
    return { ok: true };
  });

  ipcMain.handle('update-tray-menu', async (_event, games = []) => {
    cachedTrayGames = games;
    if (tray && !tray.isDestroyed()) {
      tray.setContextMenu(buildTrayMenu(games, { createWindow, createGameBarOverlayWindow, gameLauncher }));
    }
    return { ok: true };
  });

  ipcMain.handle('get-tray-menu', async () => cachedTrayGames);
}

module.exports = {
  createTray,
  registerIpcHandlers,
};
