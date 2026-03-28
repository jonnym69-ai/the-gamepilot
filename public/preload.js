const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electronAPI', {
    getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
    launchGame: (game) => ipcRenderer.send('launch-game', game),
    onLaunchGameResult: (callback) => ipcRenderer.on('launch-game-result', callback)
  }
);
