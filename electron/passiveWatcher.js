/**
 * Passive game watcher.
 *
 * Detects library games launched outside GamePilot (any launcher) and emits
 * session events so playtime gets tracked regardless of launch source.
 */

const {
  KNOWN_LAUNCHER_PROCESS_NAMES,
  getProcessList,
  buildMonitorMatcher,
  activeGameMonitors,
} = require('./processMonitor');

const PASSIVE_WATCH_POLL_MS = 30000;
const PASSIVE_WATCH_MISS_TOLERANCE = 2;
let passiveWatchlist = [];
let passiveWatchInterval = null;
const passiveSessions = new Map();

const NON_GAME_WATCH_TITLES = new Set([
  'gog galaxy',
  'epic games launcher',
  'ubisoft connect',
  'battle.net',
  'ea app',
  'origin',
  'riot client',
  'rockstar games launcher',
  'rockstar social club',
  'xbox game bar',
  'amazon games',
  'itch',
  'playnite',
  'steamworks common redistributables',
]);

const buildWatchEntry = (game = {}) => {
  const matcher = buildMonitorMatcher(game);
  return {
    gameName: game.name,
    appid: typeof game.appid !== 'undefined' ? game.appid : null,
    platform: game.platform || null,
    resolvedExecutablePath: matcher.resolvedExecutablePath,
    installDir: matcher.installDir,
    executableName: matcher.executableName,
  };
};

const GENERIC_EXECUTABLE_NAMES = new Set([
  'game.exe',
  'launcher.exe',
  'start.exe',
  'run.exe',
  'play.exe',
  'main.exe',
  'client.exe',
  'app.exe',
  'setup.exe',
  'win64.exe',
  'win32.exe',
]);

const processMatchesWatchEntry = (processInfo, entry) => {
  const processName = `${processInfo?.name || ''}`.toLowerCase();
  const processPath = `${processInfo?.path || ''}`.toLowerCase();
  const commandLine = `${processInfo?.command || processInfo?.params || ''}`.toLowerCase();

  if (KNOWN_LAUNCHER_PROCESS_NAMES.has(processName)) {
    return false;
  }

  if (entry.resolvedExecutablePath && processPath && processPath === entry.resolvedExecutablePath) {
    return true;
  }

  if (entry.installDir && processPath && processPath.startsWith(entry.installDir)) {
    return true;
  }

  // Linux/Steam Deck: Proton wraps games, so the real exe appears in the
  // command line (e.g. "proton .../common/Game/game.exe") while the process
  // name is just "proton" or "pressure-vessel". Match installDir or exe name
  // in the command line, excluding the wrapper binaries themselves.
  if (process.platform === 'linux' && commandLine) {
    const isWrapper = ['proton', 'pressure-vessel', 'steam-runtime', 'wineserver', 'wine64', 'wine'].some(
      (w) => processName === w || processName.startsWith(`${w}.`)
    );
    if (
      entry.installDir &&
      commandLine.includes(entry.installDir) &&
      (isWrapper || processPath.startsWith(entry.installDir))
    ) {
      return true;
    }
  }

  // Name-only match is a fallback: require a distinctive name and, when an
  // installDir exists, that the process actually lives under it.
  if (
    entry.executableName &&
    processName &&
    processName === entry.executableName &&
    entry.executableName.length >= 6 &&
    !GENERIC_EXECUTABLE_NAMES.has(entry.executableName)
  ) {
    if (!entry.installDir || (processPath && processPath.startsWith(entry.installDir))) {
      return true;
    }
  }

  return false;
};

const sendPassiveSessionEvent = (channel, payload, getMainWindow) => {
  const mainWindow = getMainWindow();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
};

const isCoveredByActiveMonitor = (entry) => {
  for (const monitor of activeGameMonitors.values()) {
    const monitoredName = `${monitor?.game?.name || ''}`.toLowerCase();
    const monitoredAppId = typeof monitor?.game?.appid !== 'undefined' ? String(monitor.game.appid) : null;
    if (monitoredName && monitoredName === `${entry.gameName || ''}`.toLowerCase()) {
      return true;
    }
    if (monitoredAppId && entry.appid !== null && monitoredAppId === String(entry.appid)) {
      return true;
    }
  }
  return false;
};

const pollPassiveWatch = async (getMainWindow) => {
  if (passiveWatchlist.length === 0) return;

  let processList;
  try {
    processList = await getProcessList();
  } catch {
    return;
  }
  if (!Array.isArray(processList) || processList.length === 0) return;

  const seenKeys = new Set();

  for (const entry of passiveWatchlist) {
    if (!entry.gameName) continue;
    const key = entry.gameName;
    const running = processList.some((proc) => processMatchesWatchEntry(proc, entry));

    if (running) {
      seenKeys.add(key);
      const existing = passiveSessions.get(key);
      if (existing) {
        existing.missedPolls = 0;
        existing.lastSeenAt = Date.now();
      } else if (!isCoveredByActiveMonitor(entry)) {
        const session = {
          gameName: entry.gameName,
          appid: entry.appid,
          platform: entry.platform,
          startedAt: Date.now(),
          lastSeenAt: Date.now(),
          missedPolls: 0,
        };
        passiveSessions.set(key, session);
        sendPassiveSessionEvent(
          'passive-session-started',
          {
            gameName: session.gameName,
            appid: session.appid,
            platform: session.platform,
            startedAt: session.startedAt,
            source: 'passive-watch',
          },
          getMainWindow
        );
      }
    }
  }

  for (const [key, session] of Array.from(passiveSessions.entries())) {
    if (seenKeys.has(key)) continue;
    session.missedPolls += 1;
    if (session.missedPolls >= PASSIVE_WATCH_MISS_TOLERANCE) {
      passiveSessions.delete(key);
      sendPassiveSessionEvent(
        'passive-session-ended',
        {
          gameName: session.gameName,
          appid: session.appid,
          platform: session.platform,
          startedAt: session.startedAt,
          endedAt: Date.now(),
          source: 'passive-watch',
        },
        getMainWindow
      );
    }
  }
};

const startPassiveWatchInterval = (getMainWindow) => {
  if (passiveWatchInterval) return;
  passiveWatchInterval = setInterval(() => {
    pollPassiveWatch(getMainWindow).catch(() => {});
  }, PASSIVE_WATCH_POLL_MS);
};

const stopPassiveWatchInterval = () => {
  if (passiveWatchInterval) {
    clearInterval(passiveWatchInterval);
    passiveWatchInterval = null;
  }
};

function registerIpcHandlers(ipcMain, deps) {
  const { getMainWindow } = deps;

  ipcMain.handle('update-watchlist', async (_event, games = []) => {
    try {
      passiveWatchlist = (Array.isArray(games) ? games : [])
        .filter((game) => game && game.name && !NON_GAME_WATCH_TITLES.has(String(game.name).trim().toLowerCase()))
        .map(buildWatchEntry)
        .filter((entry) => entry.resolvedExecutablePath || entry.installDir || entry.executableName);
      startPassiveWatchInterval(getMainWindow);
      return { success: true, count: passiveWatchlist.length };
    } catch (error) {
      return { success: false, message: error.message };
    }
  });
}

module.exports = {
  registerIpcHandlers,
  stopPassiveWatchInterval,
  NON_GAME_WATCH_TITLES,
};
