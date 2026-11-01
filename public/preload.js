const { contextBridge, ipcRenderer } = require('electron');

const electronAPI = {
  platform: process.platform,
  sessionStoreInitialize: (payload) => ipcRenderer.invoke('session-store-initialize', payload),
  sessionStoreSaveActive: (sessions) => ipcRenderer.invoke('session-store-save-active', sessions),
  sessionStoreSettle: (payload) => ipcRenderer.invoke('session-store-settle', payload),
  sessionStoreReplaceHistory: (history, options) => ipcRenderer.invoke('session-store-replace-history', history, options),
  sessionStoreGetSnapshot: () => ipcRenderer.invoke('session-store-get-snapshot'),
  sessionStoreListBackups: () => ipcRenderer.invoke('session-store-list-backups'),
  sessionStoreRestoreBackup: (fileName) => ipcRenderer.invoke('session-store-restore-backup', fileName),
  sessionStoreClear: () => ipcRenderer.invoke('session-store-clear'),
  updaterCheck: () => ipcRenderer.invoke('updater-check'),
  updaterDownload: () => ipcRenderer.invoke('updater-download'),
  updaterInstall: () => ipcRenderer.invoke('updater-install'),
  updaterGetState: () => ipcRenderer.invoke('updater-get-state'),
  onUpdaterStatus: (callback) => {
    const listener = (_event, data) => callback?.(data);
    ipcRenderer.on('updater-status', listener);
    return () => ipcRenderer.removeListener('updater-status', listener);
  },
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  launchGame: (game) => ipcRenderer.invoke('launch-game', game),
  scanGameLibraries: (options = {}) => ipcRenderer.invoke('scan-game-libraries', options),
  getScanDebug: () => ipcRenderer.invoke('get-scan-debug'),
  getStartupLaunchSettings: () => ipcRenderer.invoke('get-startup-launch-settings'),
  setStartupLaunchEnabled: (enabled) => ipcRenderer.invoke('set-startup-launch-enabled', enabled),
  openExternal: (url) => ipcRenderer.invoke('open-external-url', url),
  openSteamLibrary: (appid) => ipcRenderer.invoke('open-steam-library', appid),
  hltbSearch: (query) => ipcRenderer.invoke('hltb-search', query),
  pcgwLookup: (query) => ipcRenderer.invoke('pcgw-lookup', query),
  steamAppReviews: (appid) => ipcRenderer.invoke('steam-appreviews', appid),
  steamGlobalAchievements: (appid) => ipcRenderer.invoke('steam-global-achievements', appid),
  steamPlayerAchievements: (payload) => ipcRenderer.invoke('steam-player-achievements', payload),
  steamPersonalAchievementsPreflight: (payload) => ipcRenderer.invoke('steam-personal-achievements-preflight', payload),
  steamNews: (payload) => ipcRenderer.invoke('steam-news', payload),
  steamSpotlight: (appid) => ipcRenderer.invoke('steam-spotlight', appid),
  steamStoreDetails: (appid) => ipcRenderer.invoke('steam-store-details', appid),
  steamPlayerCount: (appid) => ipcRenderer.invoke('steam-player-count', appid),
  steamMostPlayed: () => ipcRenderer.invoke('steam-most-played'),
  steamAppNames: (appids) => ipcRenderer.invoke('steam-app-names', appids),
  steamOwnedLibrary: (steamId) => ipcRenderer.invoke('steam-owned-library', steamId),
  steamInstall: (appid) => ipcRenderer.invoke('steam-install', appid),
  gogOpenInGalaxy: (productId) => ipcRenderer.invoke('gog-open-galaxy', productId),
  gogUninstalled: (names) => ipcRenderer.invoke('gog-uninstalled', names),
  epicFreeGames: () => ipcRenderer.invoke('epic-free-games'),
  epicAuthStart: () => ipcRenderer.invoke('epic-auth-start'),
  epicAuthStatus: () => ipcRenderer.invoke('epic-auth-status'),
  epicAuthDisconnect: () => ipcRenderer.invoke('epic-auth-disconnect'),
  epicOwnedLibrary: () => ipcRenderer.invoke('epic-owned-library'),
  epicOpenApp: (appName) => ipcRenderer.invoke('epic-open-app', appName),
  giveawayFeed: () => ipcRenderer.invoke('giveaway-feed'),
  storeFreeGames: () => ipcRenderer.invoke('store-free-games'),
  itchOwnedGames: (apiKey) => ipcRenderer.invoke('itch-owned-games', apiKey),
  steamWishlist: (steamId) => ipcRenderer.invoke('steam-wishlist', steamId),
  steamFriends: (steamId) => ipcRenderer.invoke('steam-friends', steamId),
  steamProfile: (steamId) => ipcRenderer.invoke('steam-profile', steamId),
  igdbLookup: (name) => ipcRenderer.invoke('igdb-lookup', name),
  steamMoreLike: (appid) => ipcRenderer.invoke('steam-morelike', appid),
  diskFolderSize: (payload) => ipcRenderer.invoke('disk-folder-size', payload),
  saveLocationStatus: (payload) => ipcRenderer.invoke('save-location-status', payload),
  openSaveLocation: (payload) => ipcRenderer.invoke('open-save-location', payload),
  chooseSaveBackupDestination: () => ipcRenderer.invoke('choose-save-backup-destination'),
  createSaveBackup: (payload) => ipcRenderer.invoke('create-save-backup', payload),
  previewSaveRestore: (payload) => ipcRenderer.invoke('preview-save-restore', payload),
  restoreSaveBackup: (payload) => ipcRenderer.invoke('restore-save-backup', payload),
  pickExecutable: () => ipcRenderer.invoke('pick-executable'),
  chooseEmulatorExecutable: () => ipcRenderer.invoke('choose-emulator-executable'),
  chooseRomFolder: () => ipcRenderer.invoke('choose-rom-folder'),
  scanEmulatorRoms: (payload) => ipcRenderer.invoke('scan-emulator-roms', payload),
  detectEmulators: () => ipcRenderer.invoke('detect-emulators'),
  emulatorBiosCheck: (payload) => ipcRenderer.invoke('emulator-bios-check', payload),
  emulatorSavePaths: (payload) => ipcRenderer.invoke('emulator-save-paths', payload),
  raGameList: (payload) => ipcRenderer.invoke('ra-game-list', payload),
  raGameProgress: (payload) => ipcRenderer.invoke('ra-game-progress', payload),
  buildUninstallPlan: (game) => ipcRenderer.invoke('build-uninstall-plan', game),
  startUninstall: (payload) => ipcRenderer.invoke('start-uninstall', payload),
  storageCleanerScan: () => ipcRenderer.invoke('storage-cleaner-scan'),
  storageCleanerClean: (ids) => ipcRenderer.invoke('storage-cleaner-clean', { ids }),
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
  restoreWindow: () => ipcRenderer.invoke('restore-window'),
  discordStartGamePresence: (game) => ipcRenderer.invoke('discord-start-game-presence', game),
  discordStopGamePresence: () => ipcRenderer.invoke('discord-stop-game-presence'),
  discordSetIdlePresence: () => ipcRenderer.invoke('discord-set-idle-presence'),
  discordDisconnect: () => ipcRenderer.invoke('discord-disconnect'),
  updateTrayMenu: (games) => ipcRenderer.invoke('update-tray-menu', games),
  updateWatchlist: (games) => ipcRenderer.invoke('update-watchlist', games),
  onPassiveSessionStarted: (callback) => {
    const listener = (_event, data) => callback?.(data);
    ipcRenderer.on('passive-session-started', listener);
    return () => ipcRenderer.removeListener('passive-session-started', listener);
  },
  onPassiveSessionEnded: (callback) => {
    const listener = (_event, data) => callback?.(data);
    ipcRenderer.on('passive-session-ended', listener);
    return () => ipcRenderer.removeListener('passive-session-ended', listener);
  },
  steamRun: (appid) => ipcRenderer.invoke('steam-run', appid),
  gogLaunch: (productId) => ipcRenderer.invoke('gog-launch', productId),
  gogStoreDetails: (productId) => ipcRenderer.invoke('gog-store-details', productId),
  installWatchSet: (entries) => ipcRenderer.invoke('install-watch-set', entries),
  onGameInstalled: (callback) => {
    const listener = (_event, data) => callback?.(data);
    ipcRenderer.on('gamepilot:game-installed', listener);
    return () => ipcRenderer.removeListener('gamepilot:game-installed', listener);
  },
  openGameBarOverlay: () => ipcRenderer.invoke('open-gamebar-overlay'),
  discordWebhookPost: (payload) => ipcRenderer.invoke('discord-webhook-post', payload),
  youtubeStatus: () => ipcRenderer.invoke('youtube-status'),
  youtubeSetKey: (key) => ipcRenderer.invoke('youtube-set-key', key),
  youtubeClearKey: () => ipcRenderer.invoke('youtube-clear-key'),
  youtubeSearch: (request) => ipcRenderer.invoke('youtube-search', request)
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
