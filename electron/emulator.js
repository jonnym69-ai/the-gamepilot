const { dialog } = require('electron');
const fs = require('fs');
const path = require('path');

function registerIpcHandlers(ipcMain) {
  ipcMain.handle('choose-emulator-executable', async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Choose emulator executable',
        properties: ['openFile'],
        filters: [
          { name: 'Executable Files', extensions: ['exe', 'bat', 'cmd'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      return result.canceled ? null : result.filePaths?.[0] || null;
    } catch (error) {
      console.error('❌ Failed to choose emulator executable:', error);
      return null;
    }
  });

  ipcMain.handle('choose-rom-folder', async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Choose ROM folder',
        properties: ['openDirectory'],
      });

      return result.canceled ? null : result.filePaths?.[0] || null;
    } catch (error) {
      console.error('❌ Failed to choose ROM folder:', error);
      return null;
    }
  });

  ipcMain.handle('scan-emulator-roms', async (_event, payload = {}) => {
    const romFolder = String(payload?.romFolder || '').trim();
    const extensions = new Set(
      (Array.isArray(payload?.extensions) ? payload.extensions : [])
        .map((extension) =>
          String(extension || '')
            .replace(/^\./, '')
            .trim()
            .toLowerCase()
        )
        .filter(Boolean)
    );

    if (!romFolder || !fs.existsSync(romFolder)) {
      return [];
    }

    const roms = [];
    const maxFiles = 5000;

    const scanDirectory = (currentPath, depth = 0) => {
      if (depth > 3 || roms.length >= maxFiles) {
        return;
      }

      let entries = [];
      try {
        entries = fs.readdirSync(currentPath, { withFileTypes: true });
      } catch (error) {
        return;
      }

      entries.forEach((entry) => {
        if (roms.length >= maxFiles) {
          return;
        }

        const entryPath = path.join(currentPath, entry.name);
        if (entry.isDirectory()) {
          scanDirectory(entryPath, depth + 1);
          return;
        }

        if (!entry.isFile()) {
          return;
        }

        const extension = path.extname(entry.name).replace(/^\./, '').toLowerCase();
        if (extensions.size > 0 && !extensions.has(extension)) {
          return;
        }

        roms.push({
          name: entry.name,
          fileName: entry.name,
          path: entryPath,
          extension,
        });
      });
    };

    scanDirectory(romFolder);
    return roms;
  });
}

module.exports = { registerIpcHandlers };
