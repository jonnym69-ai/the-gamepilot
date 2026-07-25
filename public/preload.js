const { contextBridge, ipcRenderer } = require('electron');

const electronAPI = {
  sessionStoreInitialize: (payload) => ipcRenderer.invoke('session-store-initialize', payload),
  sessionStoreSaveActive: (sessions) => ipcRenderer.invoke('session-store-save-active', sessions),
  sessionStoreSettle: (payload) => ipcRenderer.invoke('session-store-settle', payload),
  sessionStoreReplaceHistory: (history) => ipcRenderer.invoke('session-store-replace-history', history),
  sessionStoreClear: () => ipcRenderer.invoke('session-store-clear'),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  launchGame: (game) => ipcRenderer.invoke('launch-game', game),
  scanGameLibraries: (options = {}) => ipcRenderer.invoke('scan-game-libraries', options),
  getScanDebug: () => ipcRenderer.invoke('get-scan-debug'),
  getStartupLaunchSettings: () => ipcRenderer.invoke('get-startup-launch-settings'),
  setStartupLaunchEnabled: (enabled) => ipcRenderer.invoke('set-startup-launch-enabled', enabled),
  openExternal: (url) => ipcRenderer.invoke('open-external-url', url),
  hltbSearch: (query) => ipcRenderer.invoke('hltb-search', query),
  pcgwLookup: (query) => ipcRenderer.invoke('pcgw-lookup', query),
  steamAppReviews: (appid) => ipcRenderer.invoke('steam-appreviews', appid),
  steamGlobalAchievements: (appid) => ipcRenderer.invoke('steam-global-achievements', appid),
  steamPersonalAchievementsPreflight: (payload) => ipcRenderer.invoke('steam-personal-achievements-preflight', payload),
  steamNews: (payload) => ipcRenderer.invoke('steam-news', payload),
  steamWishlist: (steamId) => ipcRenderer.invoke('steam-wishlist', steamId),
  diskFolderSize: (payload) => ipcRenderer.invoke('disk-folder-size', payload),
  saveLocationStatus: (payload) => ipcRenderer.invoke('save-location-status', payload),
  openSaveLocation: (payload) => ipcRenderer.invoke('open-save-location', payload),
  chooseSaveBackupDestination: () => ipcRenderer.invoke('choose-save-backup-destination'),
  createSaveBackup: (payload) => ipcRenderer.invoke('create-save-backup', payload),
  previewSaveRestore: (payload) => ipcRenderer.invoke('preview-save-restore', payload),
  restoreSaveBackup: (payload) => ipcRenderer.invoke('restore-save-backup', payload),
  chooseEmulatorExecutable: () => ipcRenderer.invoke('choose-emulator-executable'),
  chooseRomFolder: () => ipcRenderer.invoke('choose-rom-folder'),
  scanEmulatorRoms: (payload) => ipcRenderer.invoke('scan-emulator-roms', payload),
  buildUninstallPlan: (game) => ipcRenderer.invoke('build-uninstall-plan', game),
  startUninstall: (payload) => ipcRenderer.invoke('start-uninstall', payload),
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
  },
  onSystemShutdown: (callback) => {
    const listener = () => callback?.();
    ipcRenderer.on('system-shutdown', listener);
    return () => ipcRenderer.removeListener('system-shutdown', listener);
  },
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  restoreWindow: () => ipcRenderer.invoke('restore-window')
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
