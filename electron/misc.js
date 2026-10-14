/**
 * Miscellaneous IPC handlers: external URL opening and window controls.
 */

const { shell } = require('electron');

function registerIpcHandlers(ipcMain, deps) {
  const { getMainWindow } = deps;

  ipcMain.handle('open-external-url', async (_event, url) => {
    try {
      if (typeof url !== 'string' || url.length > 4096) {
        return false;
      }

      const parsedUrl = new URL(url);
      const allowedProtocols = new Set(['https:', 'http:', 'file:']);
      if (!allowedProtocols.has(parsedUrl.protocol)) {
        console.warn('Blocked unsupported external URL protocol:', parsedUrl.protocol);
        return false;
      }

      await shell.openExternal(parsedUrl.toString());
      return true;
    } catch (error) {
      console.error('❌ Failed to open external URL:', error);
      return false;
    }
  });

  ipcMain.handle('open-steam-library', async (_event, appid) => {
    if (typeof appid !== 'string' || !/^[1-9]\d{0,9}$/.test(appid) || Number(appid) > 4294967295) {
      return false;
    }
    try {
      await shell.openExternal(`steam://nav/games/details/${appid}`);
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle('steam-install', async (_event, appid) => {
    if (typeof appid !== 'string' || !/^[1-9]\d{0,9}$/.test(appid) || Number(appid) > 4294967295) {
      return false;
    }
    try {
      await shell.openExternal(`steam://install/${appid}`);
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle('minimize-window', async () => {
    const mainWindow = getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.minimize();
    }
    return { ok: true };
  });

  ipcMain.handle('restore-window', async () => {
    const mainWindow = getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
    return { ok: true };
  });
}

module.exports = { registerIpcHandlers };
