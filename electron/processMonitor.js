/**
 * Active game process monitor.
 *
 * Tracks whether a launched game's process is still running by polling
 * the OS process list at a fixed interval. Emits game-started / game-closed
 * / game-monitor-timeout events back to the renderer that requested the monitor.
 */

const path = require('path');
const si = require('systeminformation');

const KNOWN_LAUNCHER_PROCESS_NAMES = new Set([
  'steam.exe',
  'steamservice.exe',
  'steamwebhelper.exe',
  'epicgameslauncher.exe',
  'epicwebhelper.exe',
  'goggalaxy.exe',
  'galaxyclient.exe',
  'galaxyclientservice.exe',
  'galaxycommunication.exe',
  'galaxyclient helper.exe',
  'galaxyclienthelper.exe',
  'battle.net.exe',
  'eadesktop.exe',
  'origin.exe',
  'ubisoftconnect.exe',
  'upc.exe',
  'rockstargameslauncher.exe',
  'launcherpatcher.exe',
  'riotclientservices.exe',
  'riotclientux.exe',
  'riotclientuxrender.exe',
  'gamingservicesui.exe',
  'gamingservices.exe',
  'xboxpcapp.exe',
  'xboxapp.exe',
  'xboxgamebar.exe',
]);

const activeGameMonitors = new Map();

const normalizeMatcherValue = (value = '') =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const tokenizeMatcherValue = (value = '') =>
  String(value)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3);

const getProcessList = async () => {
  try {
    const processes = await si.processes();
    return Array.isArray(processes?.list) ? processes.list : [];
  } catch (error) {
    console.error('❌ Failed to collect process list:', error);
    return [];
  }
};

const buildMonitorMatcher = (game = {}) => {
  const rawExecutable = `${game.executable || ''}`.trim();
  const normalizedExecutable = rawExecutable.toLowerCase();
  const protocolExecutable = /^[a-z]+:\/\//i.test(rawExecutable) || normalizedExecutable.startsWith('shell:');
  const resolvedExecutablePath = `${game.executablePath || (!protocolExecutable ? rawExecutable : '') || ''}`
    .trim()
    .toLowerCase();
  const installDir = `${game.installDir || game.path || ''}`.trim().toLowerCase();
  const launchId = `${game.launchId || game.epicAppName || ''}`.trim().toLowerCase();
  const aumid = `${game.aumid || ''}`.trim().toLowerCase();
  const appid = typeof game.appid !== 'undefined' && game.appid !== null ? String(game.appid).toLowerCase() : '';
  const gameName = `${game.name || ''}`.trim();

  return {
    resolvedExecutablePath,
    executableName: resolvedExecutablePath ? path.basename(resolvedExecutablePath).toLowerCase() : '',
    installDir,
    launchId,
    aumid,
    appid,
    nameSlug: normalizeMatcherValue(gameName),
    nameTokens: Array.from(new Set(tokenizeMatcherValue(gameName))),
  };
};

const getMonitorPayload = (monitor, extra = {}) => ({
  monitorId: monitor.monitorId,
  gameName: monitor.game.name,
  appid: typeof monitor.game.appid !== 'undefined' ? monitor.game.appid : null,
  platform: monitor.game.platform || null,
  ...extra,
});

const sendMonitorEvent = (monitor, channel, extra = {}) => {
  if (!monitor?.webContents || monitor.webContents.isDestroyed()) {
    return;
  }

  monitor.webContents.send(channel, getMonitorPayload(monitor, extra));
};

const processMatchesMonitor = (processInfo, monitor) => {
  const pid = Number(processInfo?.pid);
  if (!Number.isFinite(pid) || pid <= 0) {
    return false;
  }

  if (monitor.baselinePids.has(pid) && !monitor.trackedPids.has(pid)) {
    return false;
  }

  const processName = `${processInfo.name || ''}`.toLowerCase();
  const processPath = `${processInfo.path || ''}`.toLowerCase();
  const commandLine = `${processInfo.command || processInfo.params || ''}`.toLowerCase();
  const matcher = monitor.matcher;

  const exactExecutablePathMatch = Boolean(
    matcher.resolvedExecutablePath && processPath && processPath === matcher.resolvedExecutablePath
  );
  const exactExecutableNameMatch = Boolean(
    matcher.executableName && processName && processName === matcher.executableName
  );
  const installDirMatch = Boolean(matcher.installDir && processPath && processPath.startsWith(matcher.installDir));
  const appIdMatch = Boolean(matcher.appid && commandLine.includes(matcher.appid));
  const launchIdMatch = Boolean(matcher.launchId && commandLine.includes(matcher.launchId));
  const aumidMatch = Boolean(matcher.aumid && commandLine.includes(matcher.aumid));
  const knownLauncherProcess = KNOWN_LAUNCHER_PROCESS_NAMES.has(processName);

  if (exactExecutablePathMatch || exactExecutableNameMatch || installDirMatch) {
    return true;
  }

  if ((appIdMatch || launchIdMatch || aumidMatch) && !knownLauncherProcess) {
    return true;
  }

  if (knownLauncherProcess) {
    return false;
  }

  const normalizedProcessName = normalizeMatcherValue(processName);
  const normalizedProcessPath = normalizeMatcherValue(processPath);
  const normalizedCommandLine = normalizeMatcherValue(commandLine);

  if (
    matcher.nameSlug &&
    (normalizedProcessName.includes(matcher.nameSlug) ||
      normalizedProcessPath.includes(matcher.nameSlug) ||
      normalizedCommandLine.includes(matcher.nameSlug))
  ) {
    return true;
  }

  if (!matcher.nameTokens.length) {
    return false;
  }

  return matcher.nameTokens.every(
    (token) => processName.includes(token) || processPath.includes(token) || commandLine.includes(token)
  );
};

const stopGameMonitor = (monitorId, options = {}) => {
  if (!activeGameMonitors.has(monitorId)) {
    return false;
  }

  const monitor = activeGameMonitors.get(monitorId);
  activeGameMonitors.delete(monitorId);

  if (monitor.intervalId) {
    clearInterval(monitor.intervalId);
  }

  if (monitor.initialPollTimeoutId) {
    clearTimeout(monitor.initialPollTimeoutId);
  }

  if (options.emitClosed) {
    sendMonitorEvent(monitor, 'game-closed', { reason: options.reason || 'stopped' });
  } else if (options.emitTimeout) {
    sendMonitorEvent(monitor, 'game-monitor-timeout', { reason: options.reason || 'not-detected' });
  }

  return true;
};

const pollGameMonitor = async (monitorId) => {
  const monitor = activeGameMonitors.get(monitorId);
  if (!monitor || monitor.polling) {
    return;
  }

  monitor.polling = true;

  try {
    const processList = await getProcessList();
    const matchingProcesses = processList.filter((processInfo) => processMatchesMonitor(processInfo, monitor));

    if (matchingProcesses.length > 0) {
      monitor.trackedPids = new Set(
        matchingProcesses.map(({ pid }) => Number(pid)).filter((pid) => Number.isFinite(pid) && pid > 0)
      );
      monitor.lastSeenAt = Date.now();

      if (!monitor.detectedAt) {
        monitor.detectedAt = monitor.lastSeenAt;
        sendMonitorEvent(monitor, 'game-started', {
          detectedProcesses: matchingProcesses.map((processInfo) => processInfo.name).filter(Boolean),
        });
      }

      return;
    }

    if (monitor.detectedAt) {
      stopGameMonitor(monitorId, { emitClosed: true, reason: 'process-exit' });
      return;
    }

    if (Date.now() >= monitor.detectionDeadline) {
      stopGameMonitor(monitorId, { emitTimeout: true, reason: 'not-detected' });
    }
  } catch (error) {
    console.error(`❌ Error polling monitor for ${monitor?.game?.name || monitorId}:`, error);
    stopGameMonitor(monitorId, { emitTimeout: true, reason: 'monitor-error' });
  } finally {
    const currentMonitor = activeGameMonitors.get(monitorId);
    if (currentMonitor) {
      currentMonitor.polling = false;
    }
  }
};

const stopAllGameMonitors = () => {
  Array.from(activeGameMonitors.keys()).forEach((monitorId) => {
    stopGameMonitor(monitorId, { reason: 'app-shutdown' });
  });
};

function registerIpcHandlers(ipcMain) {
  ipcMain.handle('start-game-monitor', async (event, payload = {}) => {
    const monitorId = payload?.monitorId;
    const game = payload?.game;

    if (!monitorId || !game?.name) {
      return {
        success: false,
        message: 'Missing monitor identifier or game metadata',
      };
    }

    stopGameMonitor(monitorId, { reason: 'restarted' });

    const baselinePids = new Set(
      (await getProcessList()).map(({ pid }) => Number(pid)).filter((pid) => Number.isFinite(pid) && pid > 0)
    );

    const monitor = {
      monitorId,
      game,
      webContents: event.sender,
      matcher: buildMonitorMatcher(game),
      baselinePids,
      trackedPids: new Set(),
      createdAt: Date.now(),
      detectionDeadline: Date.now() + 120000,
      intervalId: null,
      initialPollTimeoutId: null,
      polling: false,
      detectedAt: null,
      lastSeenAt: null,
    };

    activeGameMonitors.set(monitorId, monitor);

    monitor.intervalId = setInterval(() => {
      pollGameMonitor(monitorId);
    }, 3000);

    monitor.initialPollTimeoutId = setTimeout(() => {
      pollGameMonitor(monitorId);
    }, 1500);

    return {
      success: true,
      monitorId,
    };
  });

  ipcMain.handle('stop-game-monitor', async (event, payload = {}) => {
    const monitorId = payload?.monitorId;

    if (!monitorId) {
      return {
        success: false,
        message: 'Missing monitor identifier',
      };
    }

    const stopped = stopGameMonitor(monitorId, { reason: 'stopped-by-renderer' });

    return {
      success: true,
      stopped,
    };
  });
}

module.exports = {
  KNOWN_LAUNCHER_PROCESS_NAMES,
  activeGameMonitors,
  normalizeMatcherValue,
  tokenizeMatcherValue,
  getProcessList,
  buildMonitorMatcher,
  stopGameMonitor,
  pollGameMonitor,
  stopAllGameMonitors,
  registerIpcHandlers,
};
