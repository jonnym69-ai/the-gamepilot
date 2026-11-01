/**
 * Session database IPC handlers.
 * Bridges the renderer to the main-process SessionDatabase instance.
 */

function registerIpcHandlers(ipcMain, deps) {
  const { sessionDatabase } = deps;

  ipcMain.handle('session-store-initialize', async (_event, payload = {}) =>
    sessionDatabase.initializeFromLegacy(payload)
  );
  ipcMain.handle('session-store-save-active', async (_event, sessions = {}) =>
    sessionDatabase.saveActiveSessions(sessions)
  );
  ipcMain.handle('session-store-settle', async (_event, payload = {}) => {
    if (!payload?.entry || !payload?.activeSessions) {
      throw new Error('Invalid session settlement payload');
    }
    return sessionDatabase.settleSession(payload.entry, payload.activeSessions);
  });
  ipcMain.handle('session-store-replace-history', async (_event, history = [], options = {}) =>
    sessionDatabase.replaceHistory(history, { force: Boolean(options?.force) })
  );
  ipcMain.handle('session-store-get-snapshot', async () => {
    await sessionDatabase.readyPromise;
    return sessionDatabase.getSnapshot();
  });
  ipcMain.handle('session-store-list-backups', async () => sessionDatabase.listBackups());
  ipcMain.handle('session-store-restore-backup', async (_event, fileName) =>
    sessionDatabase.restoreBackup(typeof fileName === 'string' ? fileName : '')
  );
  ipcMain.handle('session-store-clear', async () => sessionDatabase.clear());
}

module.exports = { registerIpcHandlers };
