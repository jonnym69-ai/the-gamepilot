const { ipcRenderer } = require('electron');

// When contextIsolation is false, we can expose directly to window
window.electronAPI = {
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  launchGame: (game) => ipcRenderer.invoke('launch-game', game),
  scanGameLibraries: () => ipcRenderer.invoke('scan-game-libraries'),
  getScanDebug: () => ipcRenderer.invoke('get-scan-debug'),
  openExternal: (url) => ipcRenderer.invoke('open-external-url', url),
  onLaunchGameResult: (callback) => ipcRenderer.on('launch-game-result', callback),
  // Process monitor stubs
  startGameMonitor: (payload) => ipcRenderer.invoke('start-game-monitor', payload),
  stopGameMonitor: (payload) => ipcRenderer.invoke('stop-game-monitor', payload),
  onGameStarted: (callback) => {
    const listener = (_event, data) => callback?.(data);
    ipcRenderer.on('game-started', listener);
    return () => ipcRenderer.removeListener('game-started', listener);
  },
  onGameClosed: (callback) => {
    const listener = (_event, data) => callback?.(data);
    ipcRenderer.on('game-closed', listener);
    return () => ipcRenderer.removeListener('game-closed', listener);
  },
  onGameMonitorTimeout: (callback) => {
    const listener = (_event, data) => callback?.(data);
    ipcRenderer.on('game-monitor-timeout', listener);
    return () => ipcRenderer.removeListener('game-monitor-timeout', listener);
  }
};
