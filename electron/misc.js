/**
 * Miscellaneous IPC handlers: external URL opening and window controls.
 */

const { shell, dialog } = require('electron');
const { httpsRequest } = require('./net');

function registerIpcHandlers(ipcMain, deps) {
  const { getMainWindow } = deps;

  // File picker for manually adding DRM-free / external games to the library.
  // Windows shortcuts (.lnk/.url) resolve to the real target at launch time;
  // other platforms accept any file.
  ipcMain.handle('pick-executable', async () => {
    try {
      const filters =
        process.platform === 'win32'
          ? [
              { name: 'Games & Executables', extensions: ['exe', 'lnk', 'url', 'bat', 'cmd'] },
              { name: 'All Files', extensions: ['*'] },
            ]
          : process.platform === 'darwin'
            ? [
                { name: 'Applications', extensions: ['app'] },
                { name: 'All Files', extensions: ['*'] },
              ]
            : [{ name: 'All Files', extensions: ['*'] }];

      const mainWindow = getMainWindow();
      const options = {
        title: 'Add a game to your library',
        properties: ['openFile'],
        filters,
      };
      const result =
        mainWindow && !mainWindow.isDestroyed()
          ? await dialog.showOpenDialog(mainWindow, options)
          : await dialog.showOpenDialog(options);

      const filePath = result.canceled ? null : result.filePaths?.[0] || null;
      return { ok: Boolean(filePath), filePath };
    } catch (error) {
      console.error('❌ Failed to pick executable:', error);
      return { ok: false, filePath: null };
    }
  });

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

  ipcMain.handle('gog-open-galaxy', async (_event, productId) => {
    if (typeof productId !== 'string' || !/^[1-9]\d{0,14}$/.test(productId)) {
      return false;
    }
    try {
      await shell.openExternal(`goggalaxy://openGameView/${productId}`);
      return true;
    } catch {
      return false;
    }
  });

  // Launch an installed GOG game through Galaxy — the same URI the library
  // scanner stores as an installed GOG game's executable.
  ipcMain.handle('gog-launch', async (_event, productId) => {
    if (typeof productId !== 'string' || !/^[1-9]\d{0,14}$/.test(productId)) {
      return false;
    }
    try {
      await shell.openExternal(`goggalaxy://openGameById/${productId}`);
      return true;
    } catch {
      return false;
    }
  });

  // Launch an installed Steam game (used by the install-complete prompt —
  // steam://run* URIs deliberately stay out of the open-external-url allowlist).
  ipcMain.handle('steam-run', async (_event, appid) => {
    if (typeof appid !== 'string' || !/^[1-9]\d{0,9}$/.test(appid) || Number(appid) > 4294967295) {
      return false;
    }
    try {
      await shell.openExternal(`steam://rungameid/${appid}`);
      return true;
    } catch {
      return false;
    }
  });

  // Public GOG product info for the owned-game detail modal. No auth — the
  // same catalog endpoint GOG Galaxy and Playnite read.
  ipcMain.handle('gog-store-details', async (_event, productId) => {
    if (typeof productId !== 'string' || !/^[1-9]\d{0,14}$/.test(productId)) {
      return { ok: false, error: 'invalid-product-id' };
    }
    try {
      const response = await httpsRequest(
        `https://api.gog.com/products/${productId}?expand=description,screenshots`,
        null,
        { Accept: 'application/json' }
      );
      if (response.statusCode !== 200) return { ok: false, error: 'gog-store-unavailable' };
      const data = JSON.parse(response.body);
      const screenshots = (Array.isArray(data?.screenshots) ? data.screenshots : [])
        .map((shot) =>
          typeof shot?.formatter_template_url === 'string'
            ? shot.formatter_template_url.replace('{formatter}', 'ggvgt')
            : null
        )
        .filter((url) => typeof url === 'string' && /^https:\/\//.test(url))
        .slice(0, 6);
      const images = data?.images || {};
      const hero = [images.background, images.logo2x, images.icon].find(
        (url) => typeof url === 'string' && /^https:/.test(url.startsWith('//') ? `https:${url}` : url)
      );
      return {
        ok: true,
        data: {
          name: typeof data?.title === 'string' ? data.title : '',
          lead: typeof data?.description?.lead === 'string' ? data.description.lead : '',
          description: typeof data?.description?.full === 'string' ? data.description.full : '',
          hero: hero ? (hero.startsWith('//') ? `https:${hero}` : hero) : null,
          screenshots,
          storeUrl: typeof data?.links?.product_card === 'string' ? data.links.product_card : null,
          releaseDate: typeof data?.release_date === 'string' ? data.release_date : null,
        },
      };
    } catch {
      return { ok: false, error: 'gog-store-unavailable' };
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
