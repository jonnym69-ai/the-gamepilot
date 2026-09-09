/**
 * Discord Rich Presence IPC handlers.
 */

const discordPresence = require('../discordPresence');

function registerIpcHandlers(ipcMain) {
  ipcMain.handle('discord-start-game-presence', async (_event, game = {}) => {
    try {
      discordPresence.startGamePresence(game);
      return { success: true };
    } catch (error) {
      return { success: false, message: String(error?.message || error) };
    }
  });

  ipcMain.handle('discord-stop-game-presence', async () => {
    try {
      discordPresence.stopGamePresence();
      return { success: true };
    } catch (error) {
      return { success: false, message: String(error?.message || error) };
    }
  });

  ipcMain.handle('discord-set-idle-presence', async () => {
    try {
      discordPresence.setIdlePresence();
      return { success: true };
    } catch (error) {
      return { success: false, message: String(error?.message || error) };
    }
  });

  ipcMain.handle('discord-disconnect', async () => {
    try {
      discordPresence.disconnect();
      return { success: true };
    } catch (error) {
      return { success: false, message: String(error?.message || error) };
    }
  });
}

module.exports = { registerIpcHandlers, discordPresence };
