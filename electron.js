const electron = require('electron');
const { app, BrowserWindow, ipcMain, shell, dialog, Menu, protocol } = electron;
const path = require('path');
const GameLauncher = require('./launchHandler');
const si = require('systeminformation');

// Make shell globally available
global.shell = shell;

// Initialize game launcher
const gameLauncher = new GameLauncher();
const activeGameMonitors = new Map();
const KNOWN_LAUNCHER_PROCESS_NAMES = new Set([
  'steam.exe',
  'epicgameslauncher.exe',
  'epicwebhelper.exe',
  'goggalaxy.exe',
  'galaxyclient.exe',
  'battle.net.exe',
  'eadesktop.exe',
  'origin.exe',
  'ubisoftconnect.exe',
  'upc.exe',
  'rockstargameslauncher.exe',
  'launcherpatcher.exe',
  'gamingservicesui.exe',
  'gamingservices.exe',
  'xboxpcapp.exe'
]);

const normalizeMatcherValue = (value = '') => String(value).toLowerCase().replace(/[^a-z0-9]/g, '');

const tokenizeMatcherValue = (value = '') => (
  String(value)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(token => token.length >= 3)
);

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
  const resolvedExecutablePath = `${game.executablePath || (!protocolExecutable ? rawExecutable : '') || ''}`.trim().toLowerCase();
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
    nameTokens: Array.from(new Set(tokenizeMatcherValue(gameName)))
  };
};

const getMonitorPayload = (monitor, extra = {}) => ({
  monitorId: monitor.monitorId,
  gameName: monitor.game.name,
  appid: typeof monitor.game.appid !== 'undefined' ? monitor.game.appid : null,
  platform: monitor.game.platform || null,
  ...extra
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
    matcher.resolvedExecutablePath
    && processPath
    && processPath === matcher.resolvedExecutablePath
  );
  const exactExecutableNameMatch = Boolean(
    matcher.executableName
    && processName
    && processName === matcher.executableName
  );
  const installDirMatch = Boolean(
    matcher.installDir
    && processPath
    && processPath.startsWith(matcher.installDir)
  );
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
    matcher.nameSlug
    && (
      normalizedProcessName.includes(matcher.nameSlug)
      || normalizedProcessPath.includes(matcher.nameSlug)
      || normalizedCommandLine.includes(matcher.nameSlug)
    )
  ) {
    return true;
  }

  if (!matcher.nameTokens.length) {
    return false;
  }

  return matcher.nameTokens.every(token => (
    processName.includes(token)
    || processPath.includes(token)
    || commandLine.includes(token)
  ));
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
    const matchingProcesses = processList.filter(processInfo => processMatchesMonitor(processInfo, monitor));

    if (matchingProcesses.length > 0) {
      monitor.trackedPids = new Set(
        matchingProcesses
          .map(({ pid }) => Number(pid))
          .filter(pid => Number.isFinite(pid) && pid > 0)
      );
      monitor.lastSeenAt = Date.now();

      if (!monitor.detectedAt) {
        monitor.detectedAt = monitor.lastSeenAt;
        sendMonitorEvent(monitor, 'game-started', {
          detectedProcesses: matchingProcesses
            .map(processInfo => processInfo.name)
            .filter(Boolean)
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
  Array.from(activeGameMonitors.keys()).forEach(monitorId => {
    stopGameMonitor(monitorId, { reason: 'app-shutdown' });
  });
};

// Enable hot reloading in development
try {
  require('electron-reloader')(module, {
    debug: true,
    watchRenderer: true,
    ignore: [/node_modules/, /build/]
  });
} catch (_) {
  console.log('Electron reloader not available in production');
}

const collectSystemInfo = async () => {
  const [cpu, graphics, memory, osInfo, disks, memModules] = await Promise.all([
    si.cpu(),
    si.graphics(),
    si.mem(),
    si.osInfo(),
    si.diskLayout(),
    si.memLayout()
  ]);

  const primaryGpu = graphics.controllers.find(controller => !controller.integrated) || graphics.controllers[0] || {};
  const normalizeDrive = (disk = {}) => {
    const type = disk.type || 'Unknown';
    const interfaceType = disk.interfaceType || '';
    const name = disk.name || disk.device || 'Unknown Drive';
    const vendor = disk.vendor || '';
    const model = disk.model || '';
    const isNVMe = /nvme/i.test(interfaceType) || /nvme/i.test(name) || /nvme/i.test(model) || /nvme/i.test(vendor);
    const isSSD = isNVMe || /ssd/i.test(type) || /ssd/i.test(interfaceType) || /ssd/i.test(name) || /ssd/i.test(model);

    return {
      type,
      size: disk.size ? Math.round(disk.size / (1024 ** 3)) : 0,
      name,
      model: model || name,
      vendor,
      interfaceType: interfaceType || 'Unknown',
      mount: disk.mount || disk.mountpoints?.[0] || '',
      isSSD,
      isNVMe,
      partitions: disk.mountpoints ? disk.mountpoints.map(mp => ({ mount: mp, size: 0, free: 0, usePercent: 0 })) : []
    };
  };

  const storage = Array.isArray(disks) ? disks.map(normalizeDrive) : [];

  const ramModules = Array.isArray(memModules) ? memModules.map(module => ({
    sizeGB: module.size ? Math.round(module.size / (1024 ** 3)) : 0,
    type: module.type || module.partNum || module.serialNum || '',
    clockSpeed: module.clockSpeed || module.frequency || module.minVoltage || 0,
    manufacturer: module.manufacturer || '',
    partNum: module.partNum || '',
    serialNum: module.serialNum || '',
    formFactor: module.formFactor || '',
    bank: module.bank || '',
    voltageConfigured: module.voltageConfigured || module.voltage || null
  })) : [];

  const detectedRamType = ramModules.find(m => m.type)?.type || memory.type || 'Unknown';
  const detectedRamSpeed = (() => {
    const moduleSpeeds = ramModules.map(m => m.clockSpeed).filter(Boolean);
    if (moduleSpeeds.length > 0) {
      return Math.round(moduleSpeeds.reduce((sum, speed) => sum + speed, 0) / moduleSpeeds.length);
    }
    return memory.clockSpeed || memory.speed || 0;
  })();

  const ramTotalGb = memory.total ? Math.round(memory.total / (1024 ** 3)) : 0;
  const ramFreeGb = memory.free ? Math.round(memory.free / (1024 ** 3)) : 0;

  return {
    cpu: {
      manufacturer: cpu.manufacturer,
      brand: cpu.brand,
      model: cpu.brand || cpu.brandRaw || cpu.family || 'Unknown CPU',
      name: cpu.brand || cpu.brandRaw || 'Unknown CPU',
      speed: cpu.speed,
      speedMax: cpu.speedMax,
      cores: cpu.cores,
      physicalCores: cpu.physicalCores,
      processors: cpu.processors,
      socket: cpu.socket,
      family: cpu.family,
      stepping: cpu.stepping
    },
    gpu: {
      model: primaryGpu.model || 'Unknown GPU',
      vendor: primaryGpu.vendor || primaryGpu.subVendor || 'Unknown',
      vram: primaryGpu.vram || 0,
      vramGB: primaryGpu.vram ? Math.round(primaryGpu.vram / 1024) : 0,
      bus: primaryGpu.bus || 'Unknown'
    },
    ram: {
      total: ramTotalGb,
      free: ramFreeGb,
      used: ramTotalGb && ramFreeGb ? ramTotalGb - ramFreeGb : 0,
      type: detectedRamType,
      speed: detectedRamSpeed,
      modules: ramModules
    },
    storage,
    os: {
      platform: osInfo.platform,
      distro: osInfo.distro,
      release: osInfo.release,
      arch: osInfo.arch,
      build: osInfo.build
    },
    lastUpdated: Date.now()
  };
};

ipcMain.handle('get-system-info', async () => {
  try {
    console.log('🖥️ Collecting system information for renderer request...');
    const info = await collectSystemInfo();
    return info;
  } catch (error) {
    console.error('❌ Failed to collect system info:', error);
    throw error;
  }
});

console.log('🔧 Electron starting...');
console.log('📦 Electron version:', process.versions.electron);
console.log('📦 Node version:', process.versions.node);
console.log('📦 App available:', !!app);
console.log('📦 BrowserWindow available:', !!BrowserWindow);

// Game launching IPC handlers
console.log('🔧 Setting up IPC handlers for game launching...');

ipcMain.on('launch-game', async (event, game) => {
  console.log('🚀 Launching game:', game.name, 'Platform:', game.platform);
  
  try {
    // Use the new GameLauncher class
    const result = await gameLauncher.launchGame(game);
    
    // Send result back to renderer
    event.reply('launch-game-result', result);
    console.log('✅ Launch result:', result);
    
  } catch (error) {
    console.error('❌ Launch error:', error);
    event.reply('launch-game-result', { 
      success: false, 
      message: error.message 
    });
  }
});

ipcMain.handle('start-game-monitor', async (event, payload = {}) => {
  const monitorId = payload?.monitorId;
  const game = payload?.game;

  if (!monitorId || !game?.name) {
    return {
      success: false,
      message: 'Missing monitor identifier or game metadata'
    };
  }

  stopGameMonitor(monitorId, { reason: 'restarted' });

  const baselinePids = new Set(
    (await getProcessList())
      .map(({ pid }) => Number(pid))
      .filter(pid => Number.isFinite(pid) && pid > 0)
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
    lastSeenAt: null
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
    monitorId
  };
});

ipcMain.handle('stop-game-monitor', async (event, payload = {}) => {
  const monitorId = payload?.monitorId;

  if (!monitorId) {
    return {
      success: false,
      message: 'Missing monitor identifier'
    };
  }

  const stopped = stopGameMonitor(monitorId, { reason: 'stopped-by-renderer' });

  return {
    success: true,
    stopped
  };
});

app.whenReady().then(() => {
  console.log('🚀 App ready, creating window...');
  
  // Register app:// protocol for local file access
  protocol.registerFileProtocol('app', (request, callback) => {
    const url = request.url.replace('app://', '');
    try {
      return callback(path.normalize(`${__dirname}/${url}`));
    } catch (error) {
      console.error('Failed to register protocol', error);
    }
  });

  createWindow();
}).catch(err => {
  console.error('❌ Error in app.whenReady():', err);
  console.error('❌ Error stack:', err.stack);
  process.exit(1);
});

function createWindow() {
  console.log('🏗️ Creating Electron window...');

  try {
    const mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      title: 'GamePilot',
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        webSecurity: false,  // Allow local CSS loading
        allowRunningInsecureContent: true,  // Allow mixed content
      },
      show: true,
    });

    console.log('📱 Window created successfully, ID:', mainWindow.id);

    mainWindow.loadURL(
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000'
        : `file://${path.join(__dirname, './build/index.html')}`
    );

    mainWindow.on('ready-to-show', () => {
      console.log('🎯 Window ready to show');
      mainWindow.show();
    });

    mainWindow.on('closed', () => {
      console.log('❌ Main window closed');
      stopAllGameMonitors();
    });

    // Set up application menu
    const template = [
      {
        label: 'File',
        submenu: [
          {
            label: 'Quit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => app.quit()
          }
        ]
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectall' }
        ]
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forcereload' },
          { role: 'toggledevtools' },
          { type: 'separator' },
          { role: 'resetzoom' },
          { role: 'zoomin' },
          { role: 'zoomout' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      },
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' },
          { role: 'close' }
        ]
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'About GamePilot',
            click: () => {
              dialog.showMessageBox(null, {
                type: 'info',
                title: 'About GamePilot',
                message: 'GamePilot',
                detail: 'A comprehensive PC gaming library manager\n\nCreated by Jonathan Morris\n\nVersion 1.0.0'
              });
            }
          }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

  } catch (error) {
    console.error('❌ Error creating window:', error);
    console.error('❌ Error stack:', error.stack);
    process.exit(1);
  }
}

// Handle window creation when app is activated (macOS)
app.on('activate', () => {
  console.log('🔄 App activate event');
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  console.log('❌ All windows closed');
  stopAllGameMonitors();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle app ready event
app.on('ready', () => {
  console.log('🎯 App ready event');
});

// Error handling
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  console.error('❌ Stack:', err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
