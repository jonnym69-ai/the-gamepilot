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
  ipcMain.handle('session-store-replace-history', async (_event, history = []) =>
    sessionDatabase.replaceHistory(history)
  );
  ipcMain.handle('session-store-clear', async () => sessionDatabase.clear());
}

module.exports = { registerIpcHandlers };
