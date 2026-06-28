const electron = require('electron');
const { app, BrowserWindow, ipcMain, shell, dialog, Menu, protocol, powerMonitor } = electron;
const fs = require('fs');
const path = require('path');
const GameLauncher = require('./launchHandler');
const si = require('systeminformation');

 const APP_DISPLAY_NAME = 'GamePilot';
 app.setName(APP_DISPLAY_NAME);
 app.setPath('userData', path.join(app.getPath('appData'), APP_DISPLAY_NAME));

// Make shell globally available
global.shell = shell;

// Initialize game launcher
const gameLauncher = new GameLauncher();
const activeGameMonitors = new Map();
let mainWindow = null;
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
const APP_PREFERENCES_FILE = 'preferences.json';

const isStartupLaunchSupported = () => process.platform === 'win32';

const getPreferencesFilePath = () => path.join(app.getPath('userData'), APP_PREFERENCES_FILE);

const readAppPreferences = () => {
  try {
    const preferencesPath = getPreferencesFilePath();
    if (!fs.existsSync(preferencesPath)) {
      return {};
    }

    const rawPreferences = fs.readFileSync(preferencesPath, 'utf8');
    const parsedPreferences = JSON.parse(rawPreferences);
    return parsedPreferences && typeof parsedPreferences === 'object' ? parsedPreferences : {};
  } catch (error) {
    console.error('❌ Failed to read app preferences:', error);
    return {};
  }
};

const writeAppPreferences = (preferences = {}) => {
  try {
    const preferencesPath = getPreferencesFilePath();
    fs.writeFileSync(preferencesPath, JSON.stringify(preferences, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('❌ Failed to write app preferences:', error);
    return false;
  }
};

const getStartupLaunchPreference = () => Boolean(readAppPreferences().launchOnStartup);

const applyStartupLaunchPreference = (enabled) => {
  if (!isStartupLaunchSupported()) {
    return {
      success: false,
      supported: false,
      enabled: false
    };
  }

  try {
    app.setLoginItemSettings({
      openAtLogin: Boolean(enabled),
      openAsHidden: false
    });

    const loginItemSettings = app.getLoginItemSettings();

    return {
      success: true,
      supported: true,
      enabled: Boolean(loginItemSettings.openAtLogin)
    };
  } catch (error) {
    console.error('❌ Failed to apply startup launch preference:', error);
    return {
      success: false,
      supported: true,
      enabled: false,
      message: error.message
    };
  }
};

const getStartupLaunchSettings = () => {
  if (!isStartupLaunchSupported()) {
    return {
      supported: false,
      enabled: false,
      persisted: false,
      isPackaged: app.isPackaged
    };
  }

  const storedEnabled = getStartupLaunchPreference();
  const loginItemSettings = app.getLoginItemSettings();

  return {
    supported: true,
    enabled: Boolean(loginItemSettings.openAtLogin),
    persisted: storedEnabled,
    isPackaged: app.isPackaged
  };
};

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

// Enable hot reloading only for the explicit dev-server workflow.
if (process.env.ELECTRON_ENABLE_RELOADER === 'true') {
  try {
    require('electron-reloader')(module, {
      debug: false,
      watchRenderer: false,
      ignore: [/node_modules/, /build/, /dist/, /backups/, /gamepilot-source.*\.zip$/]
    });
  } catch (_) {
    console.log('Electron reloader not available in production');
  }
}

const collectSystemInfo = async () => {
  const [cpu, graphics, memory, osInfo, disks, memModules, fsSizes, blockDevs] = await Promise.all([
    si.cpu(),
    si.graphics(),
    si.mem(),
    si.osInfo(),
    si.diskLayout(),
    si.memLayout(),
    si.fsSize(),
    si.blockDevices()
  ]);

  const primaryGpu = graphics.controllers.find(controller => !controller.integrated) || graphics.controllers[0] || {};

  // Build a lookup from mount/fs path -> filesystem stats
  const fsMap = new Map();
  if (Array.isArray(fsSizes)) {
    for (const fs of fsSizes) {
      if (fs && fs.fs) {
        const key = fs.fs.toLowerCase();
        fsMap.set(key, fs);
        fsMap.set(key.replace(/\\/g, ''), fs); // also store without backslashes
      }
    }
  }

  // Build drive letter -> drive type mapping using blockDevices + diskLayout correlation.
  // blockDevices physical is a numeric index (e.g. "0"), while diskLayout device is
  // "\\.\\PHYSICALDRIVE0". We extract the numeric index for robust matching.
  const driveTypeMap = {};
  const getDiskIndex = (str) => {
    const m = String(str || '').match(/(\d+)/);
    return m ? parseInt(m[1], 10) : null;
  };

  if (Array.isArray(blockDevs) && Array.isArray(disks)) {
    for (const bd of blockDevs) {
      if (!bd || !bd.mount || bd.physical == null) continue;
      const mountUpper = bd.mount.toUpperCase();
      // Skip entries without a simple drive-letter mount (e.g. recovery partitions)
      if (!/^[A-Z]:$/.test(mountUpper)) continue;

      const bdIndex = getDiskIndex(bd.physical);
      const physicalDisk = disks.find(d => {
        if (!d.device) return false;
        const dIndex = getDiskIndex(d.device);
        return dIndex !== null && bdIndex !== null && dIndex === bdIndex;
      });

      if (physicalDisk) {
        const diskInterface = physicalDisk.interfaceType || '';
        const diskName = physicalDisk.name || physicalDisk.model || '';
        const diskModel = physicalDisk.model || '';
        const isNVMe = /nvme/i.test(diskInterface) || /nvme/i.test(diskName) || /nvme/i.test(diskModel);
        const isSSD = isNVMe || /ssd/i.test(physicalDisk.type || '') || /ssd/i.test(diskInterface) || /ssd/i.test(diskName);

        driveTypeMap[mountUpper] = {
          type: isNVMe ? 'NVMe' : isSSD ? 'SSD' : 'HDD',
          isNVMe,
          isSSD,
          name: physicalDisk.name || physicalDisk.model || 'Unknown Drive',
          model: physicalDisk.model || physicalDisk.name || '',
          size: physicalDisk.size ? Math.round(physicalDisk.size / (1024 ** 3)) : 0
        };
      }
    }
  }

  // Fallback: match fsSize logical drives to diskLayout physical disks by total
  // capacity so we can still report NVMe / SSD / HDD when blockDevices fails.
  if (Array.isArray(fsSizes) && Array.isArray(disks)) {
    for (const fs of fsSizes) {
      if (!fs || !fs.fs || !/^[A-Z]:$/i.test(fs.fs)) continue;
      const letter = fs.fs.toUpperCase();
      if (driveTypeMap[letter]) continue; // already resolved above

      const fsSizeBytes = fs.size || 0;
      const fsSizeGB = Math.round(fsSizeBytes / (1024 ** 3));

      let bestDisk = null;
      let bestDiff = Infinity;
      for (const disk of disks) {
        const diskSizeGB = disk.size ? Math.round(disk.size / (1024 ** 3)) : 0;
        // A partition can never be larger than its parent disk, so disqualify
        // physical disks that are smaller than the logical drive.
        if (diskSizeGB < fsSizeGB) continue;
        const diff = Math.abs(diskSizeGB - fsSizeGB);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestDisk = disk;
        }
      }

      if (bestDisk) {
        const diskInterface = bestDisk.interfaceType || '';
        const diskName = bestDisk.name || bestDisk.model || '';
        const diskModel = bestDisk.model || '';
        const isNVMe = /nvme/i.test(diskInterface) || /nvme/i.test(diskName) || /nvme/i.test(diskModel);
        const isSSD = isNVMe || /ssd/i.test(bestDisk.type || '') || /ssd/i.test(diskInterface) || /ssd/i.test(diskName);

        driveTypeMap[letter] = {
          type: isNVMe ? 'NVMe' : isSSD ? 'SSD' : 'HDD',
          isNVMe,
          isSSD,
          name: bestDisk.name || bestDisk.model || 'Unknown Drive',
          model: bestDisk.model || bestDisk.name || '',
          size: bestDisk.size ? Math.round(bestDisk.size / (1024 ** 3)) : 0
        };
      } else {
        // Last resort: unknown but keep the letter so the mapper doesn’t bail
        driveTypeMap[letter] = {
          type: 'Unknown',
          isNVMe: false,
          isSSD: false,
          name: fs.fs,
          model: fs.fs,
          size: fsSizeGB
        };
      }
    }
  }

  const normalizeDrive = (disk = {}) => {
    const type = disk.type || 'Unknown';
    const interfaceType = disk.interfaceType || '';
    const name = disk.name || disk.device || 'Unknown Drive';
    const vendor = disk.vendor || '';
    const model = disk.model || '';
    const isNVMe = /nvme/i.test(interfaceType) || /nvme/i.test(name) || /nvme/i.test(model) || /nvme/i.test(vendor);
    const isSSD = isNVMe || /ssd/i.test(type) || /ssd/i.test(interfaceType) || /ssd/i.test(name) || /ssd/i.test(model);

    // Try to find mount points for this physical disk via driveTypeMap keys
    // that match the physical device from blockDevices correlation.
    // If we can't, fall back to any fsSize mount that isn't already claimed.
    const ownedMounts = new Set();
    if (Array.isArray(blockDevs)) {
      for (const bd of blockDevs) {
        const bdIndex = getDiskIndex(bd?.physical);
        const diskIndex = getDiskIndex(disk.device);
        if (bdIndex !== null && diskIndex !== null && bdIndex === diskIndex) {
          if (bd.mount && /^[A-Z]:$/i.test(bd.mount)) {
            ownedMounts.add(bd.mount.toUpperCase());
          }
        }
      }
    }

    const partitions = [];
    for (const mp of ownedMounts) {
      const fsStat = fsMap.get(mp.toLowerCase()) || fsMap.get(mp.toLowerCase().replace(/\\/g, '')) || null;
      partitions.push({
        mount: mp,
        size: fsStat ? Math.round(fsStat.size / (1024 ** 3)) : 0,
        free: fsStat ? Math.round(fsStat.available / (1024 ** 3)) : 0,
        used: fsStat ? Math.round(fsStat.used / (1024 ** 3)) : 0,
        usePercent: fsStat ? Math.round(fsStat.use) : 0
      });
    }

    return {
      type,
      size: disk.size ? Math.round(disk.size / (1024 ** 3)) : 0,
      name,
      model: model || name,
      vendor,
      interfaceType: interfaceType || 'Unknown',
      mount: Array.from(ownedMounts)[0] || '',
      isSSD,
      isNVMe,
      partitions
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
    driveTypeMap,
    logicalDrives: Array.isArray(fsSizes) ? fsSizes.map(fs => ({
      mount: fs.fs,
      fsType: fs.type,
      sizeGB: fs.size ? Math.round(fs.size / (1024 ** 3)) : 0,
      usedGB: fs.used ? Math.round(fs.used / (1024 ** 3)) : 0,
      freeGB: fs.available ? Math.round(fs.available / (1024 ** 3)) : 0,
      usePercent: Math.round(fs.use || 0)
    })).filter(d => /^[A-Z]:$/i.test(d.mount)) : [],
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

ipcMain.handle('launch-game', async (_event, game) => {
  console.log('🚀 Launching game via invoke:', game.name, 'Platform:', game.platform);

  try {
    return await gameLauncher.launchGame(game);
  } catch (error) {
    console.error('❌ Launch error:', error);
    return {
      success: false,
      message: error.message
    };
  }
});

ipcMain.handle('scan-game-libraries', async (_event, options = {}) => {
  try {
    if (!options || options.manual !== true) {
      console.warn('[Electron] Ignoring non-manual library scan request');
      return { games: [], debug: { skipped: true, reason: 'manual-scan-required' } };
    }

    console.log('[Electron] Starting game library scan...');
    const { scanAllLibraries } = require('./nativeLibraryScanner');
    const games = scanAllLibraries();
    const debug = global.lastScanDebug || null;
    console.log(`[Electron] Scan complete: found ${games.length} games`);
    return { games, debug };
  } catch (error) {
    console.error('[Electron] Library scan error:', error);
    return {
      games: [],
      debug: {
        error: error?.message || 'Unknown scan error'
      }
    };
  }
});

ipcMain.handle('get-scan-debug', async () => global.lastScanDebug || null);

// ---------------------------------------------------------------------------
// HowLongToBeat unofficial search bridge.
// HLTB has no official API. As of 2025 their search moved to a two-step flow:
//   1) GET /api/bleed/init?t=<timestamp>  → {token, hpKey, hpVal}
//   2) POST /api/bleed  (headers x-auth-token, x-hp-key, x-hp-val)
//                       (body includes the search payload + [hpKey]: hpVal)
// All requests are server-side (Electron main) to avoid CORS, and every step
// fails gracefully so the renderer can fall back to "unknown".
//
// We use electron.net (Chromium network stack) instead of Node https because
// HLTB's CDN blocks raw Node TLS fingerprints with 403.
// ---------------------------------------------------------------------------
let cachedHltbBleed = { token: null, hpKey: null, hpVal: null, expires: 0 };

const HLTB_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36';
const HLTB_DEBUG = process.env.GAMEPILOT_HLTB_DEBUG === 'true';

const hltbDebug = (...args) => {
  if (HLTB_DEBUG) {
    console.log(...args);
  }
};

const sanitizeHltbQuery = (value) => String(value || '')
  .replace(/Ôäó/g, '™')
  .replace(/┬«/g, '®')
  .replace(/┬®/g, '©')
  .replace(/ÔÇÖ/g, '’')
  .replace(/ÔÇ£|ÔÇØ/g, '"')
  .replace(/ÔÇô|ÔÇö/g, '-')
  .replace(/\s+/g, ' ')
  .trim();

const httpsRequest = (url, body = null, headers = {}) => new Promise((resolve, reject) => {
  let req;
  try {
    req = electron.net.request({ method: body ? 'POST' : 'GET', url });
  } catch (err) {
    return reject(err);
  }

  const chunks = [];
  req.on('response', (res) => {
    res.on('data', (chunk) => chunks.push(chunk));
    res.on('end', () => {
      const data = Buffer.concat(chunks).toString('utf8');
      resolve({ status: res.statusCode, headers: res.headers, body: data });
    });
    res.on('error', (err) => reject(err));
  });
  req.on('error', (err) => reject(err));

  const timer = setTimeout(() => {
    try { req.abort(); } catch {}
    reject(new Error('httpsRequest timeout'));
  }, 8000);
  req.on('close', () => clearTimeout(timer));

  if (headers) {
    Object.entries(headers).forEach(([k, v]) => req.setHeader(k, v));
  }

  if (body) req.write(body);
  req.end();
});

// Step 1: fetch the rotating auth token + hpKey/hpVal pair from HLTB.
const fetchHltbBleedInit = async () => {
  const now = Date.now();
  if (cachedHltbBleed.token && cachedHltbBleed.hpKey && cachedHltbBleed.hpVal && cachedHltbBleed.expires > now) {
    return { token: cachedHltbBleed.token, hpKey: cachedHltbBleed.hpKey, hpVal: cachedHltbBleed.hpVal };
  }

  const init = await httpsRequest(
    `https://howlongtobeat.com/api/bleed/init?t=${now}`,
    null,
    {
      'User-Agent': HLTB_UA,
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://howlongtobeat.com/',
      'Origin': 'https://howlongtobeat.com'
    }
  );
  if (init.status !== 200) {
    throw new Error(`HLTB bleed/init HTTP ${init.status}`);
  }
  let parsed;
  try { parsed = JSON.parse(init.body); } catch { throw new Error('HLTB bleed/init parse failed'); }
  if (!parsed || !parsed.token || !parsed.hpKey || !parsed.hpVal) {
    throw new Error('HLTB bleed/init missing fields');
  }
  cachedHltbBleed = { token: parsed.token, hpKey: parsed.hpKey, hpVal: parsed.hpVal, expires: now + 60 * 60 * 1000 };
  hltbDebug(`[HLTB] bleed/init ok — hpKey=${parsed.hpKey}`);
  return { token: parsed.token, hpKey: parsed.hpKey, hpVal: parsed.hpVal };
};

ipcMain.handle('hltb-search', async (_event, query) => {
  const cleanedQuery = sanitizeHltbQuery(query);
  if (!cleanedQuery || typeof cleanedQuery !== 'string') {
    return { ok: false, error: 'invalid-query' };
  }
  hltbDebug(`[HLTB main] search request: "${cleanedQuery}"`);
  try {
    const { token, hpKey, hpVal } = await fetchHltbBleedInit();
    // Strip trademark symbols and punctuation from each term so HLTB's
    // search engine isn't tripped up by trailing colons or ™ symbols.
    const rawTerms = cleanedQuery.trim().split(/\s+/);
    const cleanTerms = rawTerms.map((t) =>
      t.replace(/[\u00ae\u2122\u00a9:;,.!?&\-–—]/g, '')
    ).filter(Boolean);
    const payloadBody = {
      searchType: 'games',
      searchTerms: cleanTerms.length ? cleanTerms : rawTerms,
      searchPage: 1,
      size: 20,
      searchOptions: {
        games: {
          userId: 0, platform: '', sortCategory: 'popular',
          rangeCategory: 'main', rangeTime: { min: null, max: null },
          gameplay: { perspective: '', flow: '', genre: '', difficulty: '' },
          rangeYear: { min: '', max: '' },
          modifier: ''
        },
        users: { sortCategory: 'postcount' },
        lists: { sortCategory: 'follows' },
        filter: '', sort: 0, randomizer: 0
      },
      useCache: true,
      [hpKey]: hpVal
    };
    const payload = JSON.stringify(payloadBody);
    const res = await httpsRequest(
      'https://howlongtobeat.com/api/bleed',
      payload,
      {
        'User-Agent': HLTB_UA,
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin': 'https://howlongtobeat.com',
        'Referer': 'https://howlongtobeat.com/',
        'x-auth-token': token,
        'x-hp-key': hpKey,
        'x-hp-val': hpVal
      }
    );

    if (res.status !== 200) {
      // Invalidate cached bleed init so next call re-fetches.
      cachedHltbBleed = { token: null, hpKey: null, hpVal: null, expires: 0 };
      console.warn(`[HLTB] POST /api/bleed -> ${res.status}; body: ${res.body?.slice(0, 200)?.replace(/\s+/g, ' ')}`);
      return { ok: false, error: `http-${res.status}` };
    }
    let parsed;
    try { parsed = JSON.parse(res.body); } catch { return { ok: false, error: 'parse' }; }
    const data = parsed && Array.isArray(parsed.data) ? parsed.data : [];
    const results = data.map((g) => ({
      id: g.game_id,
      name: g.game_name,
      alias: g.game_alias || '',
      imageUrl: g.game_image ? `https://howlongtobeat.com/games/${g.game_image}` : null,
      // HLTB delivers seconds.
      mainSeconds: g.comp_main || 0,
      mainExtraSeconds: g.comp_plus || 0,
      completionistSeconds: g.comp_100 || 0,
      allStylesSeconds: g.comp_all || 0,
      releaseYear: g.release_world || null,
      reviewScore: g.review_score || null
    }));
    hltbDebug(`[HLTB] found ${results.length} result(s) for "${cleanedQuery}"`);
    return { ok: true, results };
  } catch (error) {
    console.warn('[HLTB] search failed:', error.message);
    return { ok: false, error: error.message || 'unknown' };
  }
});

// ---------------------------------------------------------------------------
// PCGamingWiki MediaWiki bridge.
// Public, anonymous, no API key required. We use opensearch to find a page
// title from the user's game name, then `action=parse` (prop=wikitext) to pull
// the page source. The renderer extracts save/config/controller bits locally.
// ---------------------------------------------------------------------------
const PCGW_HOST = 'www.pcgamingwiki.com';
const PCGW_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 GamePilot/1.4 (+local-first librarian app)';

const pcgwApiGet = async (params) => {
  const qs = new URLSearchParams({ format: 'json', ...params }).toString();
  const res = await httpsRequest(
    `https://${PCGW_HOST}/w/api.php?${qs}`,
    null,
    {
      'User-Agent': PCGW_UA,
      'Accept': 'application/json'
    }
  );
  if (res.status !== 200) throw new Error(`pcgw-http-${res.status}`);
  return JSON.parse(res.body);
};

// Strip trademark symbols, edition suffixes, year/platform parentheticals so
// PCGW's opensearch is more likely to land on the canonical page.
const normalizePcgwTitle = (raw) => {
  if (!raw) return '';
  let t = String(raw)
    .replace(/[\u00ae\u2122\u00a9]/g, '')
    .replace(/\s*\((?:steam|epic|gog|origin|ea app|ubisoft|xbox|microsoft store|pc|windows|\d{4})\)\s*/gi, ' ')
    .replace(/[:\-\u2013\u2014]\s*(?:game of the year(?:\s+edition)?|goty(?:\s+edition)?|definitive edition|complete edition|deluxe edition|gold edition|ultimate edition|enhanced edition|legendary edition|director'?s cut|anniversary edition|remastered(?:\s+edition)?|remaster|hd|hd remaster|standard edition|special edition)\s*$/gi, '')
    .replace(/\s+remastered\s*$/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return t;
};

const buildPageUrl = (pageTitle) =>
  `https://${PCGW_HOST}/wiki/${encodeURIComponent(pageTitle.replace(/ /g, '_'))}`;

// Resolve a page title via the Cargo Infobox_game table using a Steam AppID.
// Returns the canonical page title or null.
const pcgwResolveBySteamAppId = async (appid) => {
  if (!appid) return null;
  try {
    const data = await pcgwApiGet({
      action: 'cargoquery',
      tables: 'Infobox_game',
      fields: 'Infobox_game._pageName=PageName',
      where: `Infobox_game.Steam_AppID HOLDS "${String(appid).replace(/"/g, '')}"`,
      limit: '1'
    });
    const row = data?.cargoquery?.[0]?.title;
    const page = row?.PageName || row?.pageName || row?.['Page Name'];
    return page || null;
  } catch (err) {
    console.warn('[PCGW] cargo Steam_AppID lookup failed:', err.message);
    return null;
  }
};

// opensearch wrapper that returns { titles, urls }.
const pcgwOpenSearch = async (query) => {
  const search = await pcgwApiGet({
    action: 'opensearch',
    search: query,
    limit: '5',
    namespace: '0'
  });
  const titles = Array.isArray(search) && Array.isArray(search[1]) ? search[1] : [];
  const urls = Array.isArray(search) && Array.isArray(search[3]) ? search[3] : [];
  return { titles, urls };
};

const pcgwFetchWikitext = async (pageTitle) => {
  const parse = await pcgwApiGet({
    action: 'parse',
    page: pageTitle,
    prop: 'wikitext',
    redirects: '1'
  });
  return parse?.parse?.wikitext?.['*'] || '';
};

ipcMain.handle('pcgw-lookup', async (_event, payload) => {
  // Accept either a string (legacy) or { name, appid }.
  const name = typeof payload === 'string' ? payload : payload?.name;
  const appid = typeof payload === 'object' && payload ? payload.appid : null;
  if (!name || typeof name !== 'string') {
    return { ok: false, error: 'invalid-query' };
  }

  try {
    // Tier 1: Steam AppID -> canonical page title via Cargo. Skips title noise.
    if (appid) {
      const direct = await pcgwResolveBySteamAppId(appid);
      if (direct) {
        const wikitext = await pcgwFetchWikitext(direct);
        if (wikitext) {
          return { ok: true, pageTitle: direct, pageUrl: buildPageUrl(direct), wikitext, matchedVia: 'steam-appid' };
        }
      }
    }

    // Tier 2: opensearch with normalized title.
    // Tier 3: fall back to raw title if normalized produced nothing useful.
    const normalized = normalizePcgwTitle(name);
    const candidates = [];
    if (normalized) candidates.push({ q: normalized, via: 'normalized' });
    if (!normalized || normalized.toLowerCase() !== name.trim().toLowerCase()) {
      candidates.push({ q: name.trim(), via: 'raw' });
    }

    let chosen = null;
    let chosenVia = '';
    let chosenUrl = '';
    for (const cand of candidates) {
      const { titles, urls } = await pcgwOpenSearch(cand.q);
      if (titles.length === 0) continue;
      const target = cand.q.toLowerCase();
      let bestIdx = 0;
      for (let i = 0; i < titles.length; i++) {
        if (titles[i].toLowerCase() === target) { bestIdx = i; break; }
      }
      chosen = titles[bestIdx];
      chosenUrl = urls[bestIdx] || buildPageUrl(chosen);
      chosenVia = cand.via;
      break;
    }

    if (!chosen) return { ok: false, error: 'no-page' };

    const wikitext = await pcgwFetchWikitext(chosen);
    if (!wikitext) {
      return { ok: false, error: 'no-wikitext', pageTitle: chosen, pageUrl: chosenUrl };
    }
    return { ok: true, pageTitle: chosen, pageUrl: chosenUrl, wikitext, matchedVia: chosenVia };
  } catch (error) {
    console.warn('[PCGW] lookup failed:', error.message);
    return { ok: false, error: error.message || 'unknown' };
  }
});

// ---------------------------------------------------------------------------
// Steam public-data bridge (anonymous, no API key required).
// Two endpoints power the "Steam Snapshot" panel in GameModal:
//   - store.steampowered.com/appreviews/<appid>?json=1   (review summary)
//   - api.steampowered.com/.../GetGlobalAchievementPercentagesForApp
// Each call is fire-and-forget, fails gracefully, and the renderer caches the
// merged snapshot for 7 days.
// ---------------------------------------------------------------------------
const steamHttpsGet = async (hostname, pathname) => {
  const res = await httpsRequest(
    `https://${hostname}${pathname}`,
    null,
    {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) GamePilot/1.4',
      'Accept': 'application/json'
    }
  );
  if (res.status !== 200) throw new Error(`steam-http-${res.status}`);
  return JSON.parse(res.body);
};

ipcMain.handle('steam-appreviews', async (_event, appid) => {
  const id = String(appid || '').replace(/[^0-9]/g, '');
  if (!id) return { ok: false, error: 'invalid-appid' };
  try {
    // num_per_page=0 keeps the response tiny — we only want query_summary.
    const data = await steamHttpsGet(
      'store.steampowered.com',
      `/appreviews/${id}?json=1&num_per_page=0&purchase_type=all&language=all`
    );
    if (!data || data.success !== 1 || !data.query_summary) {
      return { ok: false, error: 'no-summary' };
    }
    return { ok: true, summary: data.query_summary };
  } catch (error) {
    console.warn('[SteamSnapshot] appreviews failed:', error.message);
    return { ok: false, error: error.message || 'unknown' };
  }
});

ipcMain.handle('steam-global-achievements', async (_event, appid) => {
  const id = String(appid || '').replace(/[^0-9]/g, '');
  if (!id) return { ok: false, error: 'invalid-appid' };
  try {
    const data = await steamHttpsGet(
      'api.steampowered.com',
      `/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v0002/?gameid=${id}&format=json`
    );
    const list = data?.achievementpercentages?.achievements;
    if (!Array.isArray(list)) return { ok: false, error: 'no-data' };
    // Normalise to a smaller shape; Steam returns {name, percent} already but
    // percent is a float string in older payloads.
    const achievements = list
      .map((a) => ({ name: String(a.name || ''), percent: Number(a.percent) || 0 }))
      .filter((a) => a.name);
    return { ok: true, achievements };
  } catch (error) {
    console.warn('[SteamSnapshot] global-achievements failed:', error.message);
    return { ok: false, error: error.message || 'unknown' };
  }
});

ipcMain.handle('steam-personal-achievements-preflight', async (_event, payload = {}) => {
  const apiKey = String(payload?.apiKey || '').trim().replace(/[^A-Fa-f0-9]/g, '');
  const steamId = String(payload?.steamId || '').trim().replace(/[^0-9]/g, '');
  const games = Array.isArray(payload?.games) ? payload.games : [];
  if (!apiKey || apiKey.length < 20) return { ok: false, error: 'missing-api-key' };
  if (!steamId || steamId.length < 16) return { ok: false, error: 'missing-steamid' };

  const sampleGames = games
    .map((game) => ({
      appid: String(game?.appid || '').replace(/[^0-9]/g, ''),
      name: String(game?.name || game?.title || '').trim()
    }))
    .filter((game) => game.appid)
    .slice(0, 5);

  try {
    const playerData = await steamHttpsGet(
      'api.steampowered.com',
      `/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${steamId}&format=json`
    );
    const player = playerData?.response?.players?.[0];
    if (!player) return { ok: false, error: 'steam-profile-not-found' };

    const sampleResults = [];
    for (const game of sampleGames) {
      try {
        const data = await steamHttpsGet(
          'api.steampowered.com',
          `/ISteamUserStats/GetPlayerAchievements/v0001/?key=${apiKey}&steamid=${steamId}&appid=${game.appid}&l=en&format=json`
        );
        const achievements = data?.playerstats?.achievements;
        const list = Array.isArray(achievements) ? achievements : [];
        const unlocked = list.filter((achievement) => Number(achievement?.achieved || 0) > 0).length;
        sampleResults.push({
          appid: game.appid,
          name: game.name || `Steam App ${game.appid}`,
          ok: true,
          total: list.length,
          unlocked,
          locked: Math.max(0, list.length - unlocked),
          sampleOnly: true
        });
      } catch (error) {
        sampleResults.push({
          appid: game.appid,
          name: game.name || `Steam App ${game.appid}`,
          ok: false,
          error: error.message || 'achievement-preflight-failed',
          sampleOnly: true
        });
      }
    }

    return {
      ok: true,
      personaName: player.personaname || 'Steam profile',
      profileState: Number(player.profilestate || 0),
      communityVisibilityState: Number(player.communityvisibilitystate || 0),
      sampleCount: sampleResults.length,
      results: sampleResults,
      message: 'Preflight only. GamePilot did not import or merge Steam unlock data.'
    };
  } catch (error) {
    console.warn('[SteamPersonalAchievements] preflight failed:', error.message);
    return { ok: false, error: error.message || 'steam-personal-preflight-failed' };
  }
});

// ---------------------------------------------------------------------------
// Steam News bridge (anonymous). Pulls recent announcements / patch notes
// for a Steam appid via api.steampowered.com/ISteamNews/GetNewsForApp/v0002/.
// Used by SteamNewsService on the renderer to render "Updated since you last
// played" badges and the patch-notes list inside GameModal.
// ---------------------------------------------------------------------------
ipcMain.handle('steam-news', async (_event, payload) => {
  const appid = String(payload?.appid || '').replace(/[^0-9]/g, '');
  if (!appid) return { ok: false, error: 'invalid-appid' };
  const count = Math.max(1, Math.min(20, Number(payload?.count) || 5));
  const maxLen = 600; // keep the renderer cache light; we only show previews
  try {
    const data = await steamHttpsGet(
      'api.steampowered.com',
      `/ISteamNews/GetNewsForApp/v0002/?appid=${appid}&count=${count}&maxlength=${maxLen}&format=json`
    );
    const items = data?.appnews?.newsitems;
    if (!Array.isArray(items)) return { ok: false, error: 'no-data' };
    return { ok: true, items };
  } catch (error) {
    console.warn('[SteamNews] news failed:', error.message);
    return { ok: false, error: error.message || 'unknown' };
  }
});

// ---------------------------------------------------------------------------
// Steam Wishlist Import (anonymous, no API key).
// Fetches the public wishlist from store.steampowered.com and enriches each
// item with genres/header_image via appdetails. All data is returned to the
// renderer and stored locally; GamePilot does not send the wishlist to any
// third-party server.
//
// Steam sometimes serves the direct JSON endpoint a bot-challenge / login page,
// so we use a hidden BrowserWindow (real Chromium) as the primary fetch path.
// That shares the same session/cookies as the main app and is far less likely
// to be blocked.
// ---------------------------------------------------------------------------
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parseWishlistFromHtml = (html) => {
  // Steam's wishlist HTML embeds the data in g_rgWishlistData (object or array)
  const match = html.match(/g_rgWishlistData\s*=\s*(\{.*?\}|\[.*?\]);/s);
  if (!match) return null;
  try {
    const raw = JSON.parse(match[1]);
    if (Array.isArray(raw)) {
      return raw.map((item) => ({
        appid: String(item?.appid || item?.id || ''),
        name: item?.name || ''
      })).filter((item) => item.name && item.appid);
    }
    if (!raw || typeof raw !== 'object') return null;
    return Object.entries(raw).map(([appid, item]) => ({
      appid: String(appid),
      name: item?.name || ''
    })).filter((item) => item.name);
  } catch {
    return null;
  }
};

const fetchSteamWishlistViaWindow = async (steamId) => {
  const cleanId = String(steamId || '').replace(/[^0-9]/g, '');
  if (!cleanId) return [];
  const url = `https://store.steampowered.com/wishlist/profiles/${cleanId}/`;

  return new Promise((resolve, reject) => {
    const win = new BrowserWindow({
      width: 1200,
      height: 800,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true
      }
    });

    const timeout = setTimeout(() => {
      try { win.destroy(); } catch {}
      reject(new Error('Steam wishlist page took too long to load.'));
    }, 30_000);

    const finish = (items) => {
      clearTimeout(timeout);
      try { win.destroy(); } catch {}
      resolve(items);
    };

    const fail = (err) => {
      clearTimeout(timeout);
      try { win.destroy(); } catch {}
      reject(err);
    };

    const extractWishlist = () => win.webContents.executeJavaScript(`
      (function() {
        if (typeof g_rgWishlistData !== 'undefined' && g_rgWishlistData) {
          return g_rgWishlistData;
        }
        const scripts = Array.from(document.querySelectorAll('script'));
        for (const s of scripts) {
          const m = s.textContent.match(/g_rgWishlistData\\s*=\\s*({.*?}|\\[.*?\\]);/s);
          if (m) {
            try { return JSON.parse(m[1]); } catch (e) {}
          }
        }
        return null;
      })()
    `);

    win.webContents.on('did-finish-load', async () => {
      try {
        const pageUrl = win.webContents.getURL();
        const pageTitle = await win.webContents.executeJavaScript('document.title');
        console.log('[SteamWishlist] BrowserWindow loaded:', pageUrl, '-', pageTitle);

        // Steam loads wishlist data dynamically; give it a few seconds
        for (let attempt = 0; attempt < 6; attempt++) {
          await sleep(1000);
          const data = await extractWishlist();
          if (data && typeof data === 'object') {
            console.log('[SteamWishlist] Found wishlist data after', attempt + 1, 'attempt(s)');
            if (Array.isArray(data)) {
              return finish(data.map((item) => ({
                appid: String(item?.appid || item?.id || ''),
                name: item?.name || ''
              })).filter((item) => item.name && item.appid));
            }
            return finish(Object.entries(data).map(([appid, item]) => ({
              appid: String(appid),
              name: item?.name || ''
            })).filter((item) => item.name));
          }
        }

        // Try parsing the full HTML source as a last resort
        const fullHtml = await win.webContents.executeJavaScript(`
          document.documentElement ? document.documentElement.outerHTML : ''
        `);
        const fromHtml = parseWishlistFromHtml(fullHtml);
        if (fromHtml && fromHtml.length > 0) {
          console.log('[SteamWishlist] Parsed wishlist from full HTML source');
          return finish(fromHtml);
        }

        const htmlSnippet = fullHtml ? fullHtml.slice(0, 800) : '';
        console.warn('[SteamWishlist] No g_rgWishlistData found. Page snippet:', htmlSnippet.replace(/\s+/g, ' '));
        fail(new Error('Steam wishlist page loaded but no wishlist data was found. Make sure your wishlist is public and not empty.'));
      } catch (err) {
        fail(err);
      }
    });

    win.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
      fail(new Error(`Failed to load Steam wishlist page: ${errorDescription} (${errorCode})`));
    });

    win.loadURL(url, {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'
    });
  });
};

const fetchSteamWishlistDirect = async (steamId) => {
  const cleanId = String(steamId || '').replace(/[^0-9]/g, '');
  if (!cleanId) return [];
  const baseUrl = `https://store.steampowered.com/wishlist/profiles/${cleanId}/wishlistdata/`;
  const res = await httpsRequest(`${baseUrl}?p=0`, null, {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 GamePilot/1.4',
    'Accept': 'application/json, text/html',
    'Referer': `https://store.steampowered.com/wishlist/profiles/${cleanId}/`
  });
  if (res.status !== 200) throw new Error(`steam-wishlist-http-${res.status}`);
  const body = res.body || '';
  if (body.trim().startsWith('<')) {
    const fromHtml = parseWishlistFromHtml(body);
    if (fromHtml) return fromHtml;
    const isPrivate = /private|sign in|login|agecheck|denied|not available/i.test(body);
    throw new Error(isPrivate
      ? 'Steam returned a web page instead of the wishlist. Make sure your Steam profile and wishlist are public.'
      : 'Steam returned an unexpected HTML page. The wishlist may be private or temporarily unavailable.');
  }
  const raw = JSON.parse(body);
  if (!raw || typeof raw !== 'object') return [];
  return Object.entries(raw).map(([appid, item]) => ({
    appid: String(appid),
    name: item?.name || ''
  })).filter((item) => item.name);
};

const fetchSteamWishlist = async (steamId) => {
  try {
    const items = await fetchSteamWishlistViaWindow(steamId);
    console.log('[SteamWishlist] BrowserWindow fetch returned', items.length, 'item(s)');
    return items;
  } catch (windowErr) {
    console.warn('[SteamWishlist] BrowserWindow fetch failed:', windowErr.message);
    console.log('[SteamWishlist] Falling back to direct fetch');
    return fetchSteamWishlistDirect(steamId);
  }
};

const enrichWishlistItems = async (items) => {
  const enriched = [];
  const batchSize = 5;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const appids = batch.map((item) => item.appid).join(',');
    try {
      const details = await steamHttpsGet(
        'store.steampowered.com',
        `/api/appdetails?appids=${appids}`
      );
      for (const item of batch) {
        const info = details?.[item.appid]?.data;
        enriched.push({
          appid: item.appid,
          name: item.name,
          genres: Array.isArray(info?.genres) ? info.genres.map((g) => g.description) : [],
          image: info?.header_image || null,
          isFree: info?.is_free || false
        });
      }
    } catch (err) {
      console.warn('[SteamWishlist] Failed to enrich wishlist batch:', err.message);
      for (const item of batch) {
        enriched.push({ appid: item.appid, name: item.name, genres: [], image: null, isFree: false });
      }
    }
    if (i + batchSize < items.length) await sleep(500);
  }
  return enriched;
};

ipcMain.handle('steam-wishlist', async (_event, steamId) => {
  try {
    const cleanId = String(steamId || '').replace(/[^0-9]/g, '');
    if (!cleanId) {
      return { success: false, error: 'A valid Steam64 ID is required.', items: [] };
    }
    console.log('[SteamWishlist] Fetching wishlist for', cleanId);
    const items = await fetchSteamWishlist(cleanId);
    if (items.length === 0) {
      return { success: true, count: 0, items: [], error: null };
    }
    const enriched = await enrichWishlistItems(items);
    console.log(`[SteamWishlist] Enriched ${enriched.length} item(s)`);
    return { success: true, count: enriched.length, items: enriched, error: null };
  } catch (err) {
    console.error('[SteamWishlist] Error:', err.message);
    return { success: false, error: err.message || 'Could not fetch Steam wishlist.', items: [] };
  }
});

// ---------------------------------------------------------------------------
// Disk Usage & Uninstall Coach
//
// disk-folder-size: recursively walks a directory and returns total bytes +
// file count. Hard-bounded by depth (16), file count (250k), and elapsed time
// (45s) so a corrupt junction loop or absurdly large folder can never hang
// the renderer. Symbolic links / reparse points are skipped — we never follow
// junctions, which on Windows are how Steam/Epic share library folders and
// could otherwise double-count or loop forever.
//
// start-uninstall: dispatches the right *official* uninstall handoff per
// platform. GamePilot NEVER deletes files itself. The launcher's own
// uninstaller does the work. If we can't identify the platform, we fall back
// to opening Programs & Features (appwiz.cpl) and the install folder so the
// user can decide.
// ---------------------------------------------------------------------------
const { exec: childExec } = require('child_process');

const MAX_DISK_WALK_DEPTH = 16;
const MAX_DISK_WALK_FILES = 250_000;
const MAX_DISK_WALK_MS = 45_000;
const MAX_SAVE_BACKUP_DEPTH = 32;
const MAX_SAVE_BACKUP_FILES = 100_000;
const MAX_SAVE_BACKUP_MS = 120_000;

async function walkFolderSize(rootPath) {
  const startedAt = Date.now();
  let bytes = 0;
  let files = 0;
  let dirs = 0;
  let truncated = false;
  const seenInodes = new Set(); // Defence against hardlink double-counting on NTFS

  const visit = async (dir, depth) => {
    if (truncated) return;
    if (depth > MAX_DISK_WALK_DEPTH) { truncated = true; return; }
    if (Date.now() - startedAt > MAX_DISK_WALK_MS) { truncated = true; return; }
    if (files > MAX_DISK_WALK_FILES) { truncated = true; return; }

    let entries;
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      return; // permission denied / vanished folder — silently skip
    }
    dirs += 1;

    for (const entry of entries) {
      if (truncated) return;
      // Skip symlinks/junctions: prevents loops and avoids counting
      // cross-library shared content twice.
      if (entry.isSymbolicLink && entry.isSymbolicLink()) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await visit(full, depth + 1);
      } else if (entry.isFile()) {
        try {
          const stat = await fs.promises.lstat(full);
          if (stat.isSymbolicLink()) continue;
          // Hardlink dedupe: only count first occurrence.
          if (stat.nlink && stat.nlink > 1) {
            const key = `${stat.dev}:${stat.ino}`;
            if (seenInodes.has(key)) continue;
            seenInodes.add(key);
          }
          bytes += stat.size;
          files += 1;
        } catch {
          // file vanished or no access — skip
        }
      }
    }
  };

  await visit(rootPath, 0);
  return { bytes, files, dirs, truncated, durationMs: Date.now() - startedAt };
}

const resolveSaveLocationPath = (rawPath, game = {}) => {
  let value = String(rawPath || '').trim();
  if (!value) return { resolvedPath: '', unresolvedTokens: [] };

  const envMap = {
    USERPROFILE: process.env.USERPROFILE || app.getPath('home'),
    APPDATA: process.env.APPDATA || path.join(app.getPath('home'), 'AppData', 'Roaming'),
    LOCALAPPDATA: process.env.LOCALAPPDATA || path.join(app.getPath('home'), 'AppData', 'Local'),
    PROGRAMDATA: process.env.PROGRAMDATA || 'C:\\ProgramData',
    PUBLIC: process.env.PUBLIC || 'C:\\Users\\Public',
    DOCUMENTS: app.getPath('documents'),
    SAVEDGAMES: path.join(app.getPath('home'), 'Saved Games')
  };

  Object.entries(envMap).forEach(([token, replacement]) => {
    value = value.replace(new RegExp(`%${token}%`, 'gi'), replacement);
  });

  value = value
    .replace(/<user-profile>/gi, envMap.USERPROFILE)
    .replace(/<userprofile>/gi, envMap.USERPROFILE)
    .replace(/<documents>/gi, envMap.DOCUMENTS)
    .replace(/<saved-games>/gi, envMap.SAVEDGAMES)
    .replace(/<savedgames>/gi, envMap.SAVEDGAMES)
    .replace(/<path-to-game>/gi, game.installDir || game.path || '')
    .replace(/<game-folder>/gi, game.installDir || game.path || '')
    .replace(/^~(?=\\|\/)/, envMap.USERPROFILE)
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');

  const unresolvedTokens = Array.from(new Set(value.match(/<[^>]+>/g) || []));
  return {
    resolvedPath: path.normalize(value),
    unresolvedTokens
  };
};

const getSaveLocationStatus = async (candidate = {}, game = {}) => {
  const rawPath = candidate.path || candidate.rawPath || '';
  const resolved = resolveSaveLocationPath(rawPath, game);
  const base = {
    ...candidate,
    rawPath,
    resolvedPath: resolved.resolvedPath,
    unresolvedTokens: resolved.unresolvedTokens,
    exists: false,
    isDirectory: false,
    isFile: false,
    canOpen: false,
    bytes: 0,
    files: 0,
    dirs: 0,
    truncated: false
  };

  if (!resolved.resolvedPath || resolved.unresolvedTokens.length > 0) {
    return { ...base, error: resolved.unresolvedTokens.length > 0 ? 'unresolved-tokens' : 'invalid-path' };
  }

  try {
    const stat = await fs.promises.stat(resolved.resolvedPath);
    if (stat.isDirectory()) {
      const size = await walkFolderSize(resolved.resolvedPath);
      return { ...base, exists: true, isDirectory: true, canOpen: true, ...size };
    }
    if (stat.isFile()) {
      return { ...base, exists: true, isFile: true, canOpen: true, bytes: stat.size, files: 1 };
    }
    return { ...base, exists: true, canOpen: true };
  } catch (err) {
    return { ...base, error: 'not-found' };
  }
};

ipcMain.handle('save-location-status', async (_event, payload = {}) => {
  const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];
  const game = payload?.game || {};
  try {
    const locations = [];
    for (const candidate of candidates.slice(0, 10)) {
      locations.push(await getSaveLocationStatus(candidate, game));
    }
    return { ok: true, locations };
  } catch (err) {
    return { ok: false, error: err.message || 'save-location-status-failed', locations: [] };
  }
});

ipcMain.handle('open-save-location', async (_event, payload = {}) => {
  const rawPath = payload?.path || payload?.rawPath || '';
  const game = payload?.game || {};
  const resolved = resolveSaveLocationPath(rawPath, game);
  if (!resolved.resolvedPath || resolved.unresolvedTokens.length > 0) {
    return { ok: false, error: 'unresolved-path', resolvedPath: resolved.resolvedPath, unresolvedTokens: resolved.unresolvedTokens };
  }
  try {
    const result = await shell.openPath(resolved.resolvedPath);
    return result ? { ok: false, error: result, resolvedPath: resolved.resolvedPath } : { ok: true, resolvedPath: resolved.resolvedPath };
  } catch (err) {
    return { ok: false, error: err.message || 'open-save-location-failed', resolvedPath: resolved.resolvedPath };
  }
});

const sanitizeBackupSegment = (value, fallback = 'backup') => {
  const cleaned = String(value || '')
    .replace(/[<>:"/\\|?*]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return cleaned || fallback;
};

const copySavePath = async (sourcePath, destinationPath, summary, depth = 0, startedAt = Date.now()) => {
  if (summary.truncated) return;
  if (depth > MAX_SAVE_BACKUP_DEPTH) { summary.truncated = true; return; }
  if (Date.now() - startedAt > MAX_SAVE_BACKUP_MS) { summary.truncated = true; return; }
  if (summary.files >= MAX_SAVE_BACKUP_FILES) { summary.truncated = true; return; }

  const stat = await fs.promises.lstat(sourcePath);
  if (stat.isSymbolicLink()) return;

  if (stat.isDirectory()) {
    await fs.promises.mkdir(destinationPath, { recursive: true });
    summary.dirs += 1;
    const entries = await fs.promises.readdir(sourcePath, { withFileTypes: true });
    for (const entry of entries) {
      if (summary.truncated) return;
      if (entry.isSymbolicLink && entry.isSymbolicLink()) continue;
      await copySavePath(
        path.join(sourcePath, entry.name),
        path.join(destinationPath, entry.name),
        summary,
        depth + 1,
        startedAt
      );
    }
    return;
  }

  if (stat.isFile()) {
    await fs.promises.mkdir(path.dirname(destinationPath), { recursive: true });
    await fs.promises.copyFile(sourcePath, destinationPath, fs.constants.COPYFILE_EXCL);
    summary.files += 1;
    summary.bytes += stat.size;
  }
};

ipcMain.handle('choose-save-backup-destination', async () => {
  try {
    const result = await dialog.showOpenDialog({
      title: 'Choose GamePilot save backup folder',
      properties: ['openDirectory', 'createDirectory']
    });
    if (result.canceled || !result.filePaths?.[0]) {
      return { ok: false, canceled: true };
    }
    return { ok: true, path: result.filePaths[0] };
  } catch (err) {
    return { ok: false, error: err.message || 'choose-destination-failed' };
  }
});

ipcMain.handle('create-save-backup', async (_event, payload = {}) => {
  const game = payload?.game || {};
  const destinationRoot = String(payload?.destinationRoot || '').trim();
  const requestedLocations = Array.isArray(payload?.locations) ? payload.locations : [];
  if (!destinationRoot) return { ok: false, error: 'missing-destination' };
  if (requestedLocations.length === 0) return { ok: false, error: 'missing-locations' };

  try {
    const destinationStat = await fs.promises.stat(destinationRoot);
    if (!destinationStat.isDirectory()) return { ok: false, error: 'destination-not-folder' };

    const validLocations = [];
    for (const location of requestedLocations.slice(0, 10)) {
      const status = await getSaveLocationStatus({ ...location, path: location.resolvedPath || location.rawPath || location.path }, game);
      if (status.exists && status.canOpen && status.resolvedPath) {
        validLocations.push(status);
      }
    }

    if (validLocations.length === 0) {
      return { ok: false, error: 'no-existing-locations' };
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const gameName = sanitizeBackupSegment(game.name || game.title || 'Unknown Game', 'Unknown Game');
    const backupRoot = path.join(destinationRoot, 'GamePilot Save Backups', `${gameName} - ${timestamp}`);
    const normalizedBackupRoot = path.normalize(backupRoot).toLowerCase();
    const unsafeSource = validLocations.find((location) => {
      const sourcePath = path.normalize(location.resolvedPath).toLowerCase();
      return normalizedBackupRoot === sourcePath || normalizedBackupRoot.startsWith(`${sourcePath}${path.sep}`);
    });
    if (unsafeSource) {
      return { ok: false, error: 'destination-inside-source', sourcePath: unsafeSource.resolvedPath };
    }
    await fs.promises.mkdir(backupRoot, { recursive: true });

    const copiedLocations = [];
    const totals = { bytes: 0, files: 0, dirs: 0, truncated: false };

    for (const [index, location] of validLocations.entries()) {
      const folderName = `${index + 1} - ${sanitizeBackupSegment(location.type || location.label || 'location')}`;
      const destinationPath = path.join(backupRoot, folderName);
      const summary = { bytes: 0, files: 0, dirs: 0, truncated: false };
      await copySavePath(location.resolvedPath, destinationPath, summary);
      totals.bytes += summary.bytes;
      totals.files += summary.files;
      totals.dirs += summary.dirs;
      totals.truncated = totals.truncated || summary.truncated;
      copiedLocations.push({
        label: location.label || location.type || 'Location',
        type: location.type || 'unknown',
        source: location.source || 'pcgamingwiki',
        rawPath: location.rawPath || location.path || '',
        resolvedPath: location.resolvedPath,
        backupPath: destinationPath,
        relativeBackupPath: folderName,
        ...summary
      });
    }

    const manifest = {
      version: 1,
      kind: 'gamepilot-save-backup',
      createdAt: Date.now(),
      game: {
        name: game.name || game.title || 'Unknown Game',
        appid: game.appid || game.steam_appid || game.appId || null,
        platform: game.platform || null
      },
      restoreSupported: false,
      locations: copiedLocations,
      totals
    };
    const manifestPath = path.join(backupRoot, 'manifest.json');
    await fs.promises.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

    return { ok: true, backupPath: backupRoot, manifestPath, manifest };
  } catch (err) {
    return { ok: false, error: err.message || 'create-save-backup-failed' };
  }
});

const getBackupPathSummary = async (targetPath) => {
  const base = {
    path: targetPath,
    exists: false,
    isDirectory: false,
    isFile: false,
    bytes: 0,
    files: 0,
    dirs: 0,
    truncated: false
  };

  try {
    const stat = await fs.promises.stat(targetPath);
    if (stat.isDirectory()) {
      const size = await walkFolderSize(targetPath);
      return { ...base, exists: true, isDirectory: true, ...size };
    }
    if (stat.isFile()) {
      return { ...base, exists: true, isFile: true, bytes: stat.size, files: 1 };
    }
    return { ...base, exists: true };
  } catch (err) {
    return { ...base, error: 'not-found' };
  }
};

const isPathInside = (childPath, parentPath) => {
  const normalizedChild = path.resolve(childPath || '');
  const normalizedParent = path.resolve(parentPath || '');
  const relative = path.relative(normalizedParent, normalizedChild);
  return Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative);
};

const copyRestorePath = async (sourcePath, destinationPath, summary, depth = 0, startedAt = Date.now()) => {
  if (summary.truncated) return;
  if (depth > MAX_SAVE_BACKUP_DEPTH) { summary.truncated = true; return; }
  if (Date.now() - startedAt > MAX_SAVE_BACKUP_MS) { summary.truncated = true; return; }
  if (summary.files >= MAX_SAVE_BACKUP_FILES) { summary.truncated = true; return; }

  const stat = await fs.promises.lstat(sourcePath);
  if (stat.isSymbolicLink()) return;

  if (stat.isDirectory()) {
    await fs.promises.mkdir(destinationPath, { recursive: true });
    summary.dirs += 1;
    const entries = await fs.promises.readdir(sourcePath, { withFileTypes: true });
    for (const entry of entries) {
      if (summary.truncated) return;
      if (entry.isSymbolicLink && entry.isSymbolicLink()) continue;
      await copyRestorePath(
        path.join(sourcePath, entry.name),
        path.join(destinationPath, entry.name),
        summary,
        depth + 1,
        startedAt
      );
    }
    return;
  }

  if (stat.isFile()) {
    await fs.promises.mkdir(path.dirname(destinationPath), { recursive: true });
    await fs.promises.copyFile(sourcePath, destinationPath);
    summary.files += 1;
    summary.bytes += stat.size;
  }
};

ipcMain.handle('preview-save-restore', async (_event, payload = {}) => {
  const manifestPath = String(payload?.manifestPath || '').trim();
  const game = payload?.game || {};
  if (!manifestPath) return { ok: false, error: 'missing-manifest' };

  try {
    const rawManifest = await fs.promises.readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(rawManifest);
    if (manifest?.kind !== 'gamepilot-save-backup' || !Array.isArray(manifest.locations)) {
      return { ok: false, error: 'invalid-manifest' };
    }

    const comparisons = [];
    for (const location of manifest.locations.slice(0, 10)) {
      const backupSummary = await getBackupPathSummary(location.backupPath);
      const liveSummary = await getSaveLocationStatus({
        label: location.label,
        type: location.type,
        source: location.source,
        path: location.resolvedPath
      }, game);

      comparisons.push({
        label: location.label || location.type || 'Location',
        type: location.type || 'unknown',
        backupPath: location.backupPath || '',
        targetPath: location.resolvedPath || '',
        backupExists: backupSummary.exists,
        targetExists: liveSummary.exists,
        backupBytes: backupSummary.bytes,
        backupFiles: backupSummary.files,
        targetBytes: liveSummary.bytes,
        targetFiles: liveSummary.files,
        wouldOverwrite: Boolean(liveSummary.exists),
        backupTruncated: Boolean(backupSummary.truncated),
        targetTruncated: Boolean(liveSummary.truncated),
        safeToRestore: false
      });
    }

    return {
      ok: true,
      restoreSupported: false,
      manifestPath,
      backupPath: path.dirname(manifestPath),
      manifest,
      comparisons,
      message: 'Restore preflight only. GamePilot did not copy or overwrite any live save files.'
    };
  } catch (err) {
    return { ok: false, error: err.message || 'preview-save-restore-failed' };
  }
});

ipcMain.handle('restore-save-backup', async (_event, payload = {}) => {
  const manifestPath = String(payload?.manifestPath || '').trim();
  const game = payload?.game || {};
  const confirmation = String(payload?.confirmation || '').trim();
  const expectedConfirmation = String(game?.name || game?.title || 'RESTORE').trim();

  if (!expectedConfirmation || confirmation !== expectedConfirmation) return { ok: false, error: 'confirmation-mismatch' };

  try {
    const rawManifest = await fs.promises.readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(rawManifest);
    if (manifest?.kind !== 'gamepilot-save-backup' || !Array.isArray(manifest.locations)) {
      return { ok: false, error: 'invalid-manifest' };
    }

    const manifestRoot = path.dirname(manifestPath);
    const manifestRootStat = await fs.promises.stat(manifestRoot);
    if (!manifestRootStat.isDirectory()) return { ok: false, error: 'invalid-manifest-root' };

    const restoredLocations = [];
    const totals = { bytes: 0, files: 0, dirs: 0, truncated: false };
    const startedAt = Date.now();

    for (const location of manifest.locations.slice(0, 10)) {
      const backupPath = path.resolve(location.backupPath || path.join(manifestRoot, location.relativeBackupPath || ''));
      const targetPath = path.resolve(location.resolvedPath || '');
      if (!backupPath || !targetPath) return { ok: false, error: 'invalid-restore-location' };
      if (!isPathInside(backupPath, manifestRoot)) return { ok: false, error: 'backup-outside-manifest-root', backupPath };
      if (isPathInside(targetPath, manifestRoot) || targetPath === manifestRoot) return { ok: false, error: 'target-inside-backup-root', targetPath };

      const backupSummary = await getBackupPathSummary(backupPath);
      if (!backupSummary.exists) return { ok: false, error: 'missing-backup-location', backupPath };

      const summary = { bytes: 0, files: 0, dirs: 0, truncated: false };
      await copyRestorePath(backupPath, targetPath, summary, 0, startedAt);
      totals.bytes += summary.bytes;
      totals.files += summary.files;
      totals.dirs += summary.dirs;
      totals.truncated = totals.truncated || summary.truncated;
      restoredLocations.push({
        label: location.label || location.type || 'Location',
        type: location.type || 'unknown',
        backupPath,
        targetPath,
        ...summary
      });
    }

    const receipt = {
      version: 1,
      kind: 'gamepilot-save-restore-receipt',
      restoredAt: Date.now(),
      sourceManifestPath: manifestPath,
      game: manifest.game || {
        name: game.name || game.title || 'Unknown Game',
        appid: game.appid || game.steam_appid || game.appId || null,
        platform: game.platform || null
      },
      locations: restoredLocations,
      totals
    };
    const receiptPath = path.join(manifestRoot, `restore-receipt-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    await fs.promises.writeFile(receiptPath, JSON.stringify(receipt, null, 2), 'utf8');

    return {
      ok: true,
      manifestPath,
      backupPath: manifestRoot,
      receiptPath,
      receipt,
      message: `Restored ${totals.files} file${totals.files === 1 ? '' : 's'} without deleting unknown live files.`
    };
  } catch (err) {
    return { ok: false, error: err.message || 'restore-save-backup-failed' };
  }
});

ipcMain.handle('choose-emulator-executable', async () => {
  try {
    const result = await dialog.showOpenDialog({
      title: 'Choose emulator executable',
      properties: ['openFile'],
      filters: [
        { name: 'Executable Files', extensions: ['exe', 'bat', 'cmd'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    return result.canceled ? null : result.filePaths?.[0] || null;
  } catch (error) {
    console.error('❌ Failed to choose emulator executable:', error);
    return null;
  }
});

ipcMain.handle('choose-rom-folder', async () => {
  try {
    const result = await dialog.showOpenDialog({
      title: 'Choose ROM folder',
      properties: ['openDirectory']
    });

    return result.canceled ? null : result.filePaths?.[0] || null;
  } catch (error) {
    console.error('❌ Failed to choose ROM folder:', error);
    return null;
  }
});

ipcMain.handle('scan-emulator-roms', async (_event, payload = {}) => {
  const romFolder = String(payload?.romFolder || '').trim();
  const extensions = new Set((Array.isArray(payload?.extensions) ? payload.extensions : [])
    .map((extension) => String(extension || '').replace(/^\./, '').trim().toLowerCase())
    .filter(Boolean));

  if (!romFolder || !fs.existsSync(romFolder)) {
    return [];
  }

  const roms = [];
  const maxFiles = 5000;

  const scanDirectory = (currentPath, depth = 0) => {
    if (depth > 3 || roms.length >= maxFiles) {
      return;
    }

    let entries = [];
    try {
      entries = fs.readdirSync(currentPath, { withFileTypes: true });
    } catch (error) {
      return;
    }

    entries.forEach((entry) => {
      if (roms.length >= maxFiles) {
        return;
      }

      const entryPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        scanDirectory(entryPath, depth + 1);
        return;
      }

      if (!entry.isFile()) {
        return;
      }

      const extension = path.extname(entry.name).replace(/^\./, '').toLowerCase();
      if (extensions.size > 0 && !extensions.has(extension)) {
        return;
      }

      roms.push({
        name: entry.name,
        fileName: entry.name,
        path: entryPath,
        extension
      });
    });
  };

  scanDirectory(romFolder);
  return roms;
});

ipcMain.handle('disk-folder-size', async (_event, payload) => {
  const target = String(payload?.path || '').trim();
  if (!target) return { ok: false, error: 'invalid-path' };
  try {
    const stat = await fs.promises.stat(target);
    if (!stat.isDirectory()) {
      // For a single executable just return its file size.
      return { ok: true, bytes: stat.size, files: 1, dirs: 0, truncated: false, durationMs: 0 };
    }
  } catch (err) {
    return { ok: false, error: 'not-found' };
  }
  try {
    const result = await walkFolderSize(target);
    return { ok: true, ...result };
  } catch (err) {
    return { ok: false, error: err.message || 'walk-failed' };
  }
});

// Build the safest possible uninstall plan per platform. We always prefer
// the launcher's own deeplink because it leaves cloud saves, registry, and
// per-launcher metadata in a clean state. Programs & Features is the
// universal fallback for anything we can't identify.
function buildUninstallPlan(game) {
  const platform = String(game?.platform || '').toLowerCase();
  const appid = String(game?.appid || '').trim();
  const launchId = String(game?.launchId || '').trim();
  const installDir = String(game?.installDir || '').trim();

  if (platform === 'steam' && appid) {
    return {
      method: 'deeplink',
      url: `steam://uninstall/${appid}`,
      label: 'Steam',
      message: 'Steam will open its built-in uninstall confirmation. Cloud saves and Steam Workshop subscriptions are preserved.'
    };
  }
  if ((platform === 'epic' || platform === 'epic games') && launchId) {
    return {
      method: 'deeplink',
      url: `com.epicgames.launcher://apps/${launchId}?action=uninstall`,
      label: 'Epic Games Launcher',
      message: 'Epic Games Launcher will open the uninstall confirmation. Cloud saves are preserved on your Epic account.'
    };
  }
  if (platform === 'gog' || platform === 'gog galaxy') {
    if (appid) {
      return {
        method: 'deeplink',
        url: `goggalaxy://openGameView/${appid}`,
        label: 'GOG Galaxy',
        message: 'GOG Galaxy will open this game. Use the “⋮ → Manage Installation → Uninstall” option to remove it cleanly.'
      };
    }
  }
  if (platform === 'ea' || platform === 'origin') {
    return {
      method: 'cmd',
      cmd: 'appwiz.cpl',
      label: 'EA / Programs & Features',
      message: 'EA App handles uninstalls through Windows Programs & Features. The list will open — find the title and select Uninstall.'
    };
  }
  if (platform === 'ubisoft' || platform === 'uplay' || platform === 'ubisoft connect') {
    return {
      method: 'cmd',
      cmd: 'appwiz.cpl',
      label: 'Ubisoft / Programs & Features',
      message: 'Open Ubisoft Connect → Library → Game → ⋮ → Uninstall, or remove it from Programs & Features.'
    };
  }
  if (platform === 'battle.net' || platform === 'blizzard') {
    return {
      method: 'cmd',
      cmd: 'appwiz.cpl',
      label: 'Battle.net / Programs & Features',
      message: 'Use Battle.net → Game → ⚙ Settings (cog) → Uninstall, or remove via Programs & Features.'
    };
  }
  if (platform === 'xbox' || platform === 'microsoft store' || platform === 'microsoft') {
    return {
      method: 'deeplink',
      url: 'ms-settings:appsfeatures',
      label: 'Apps & Features',
      message: 'Windows opens Apps & Features. Locate the game and choose Uninstall — the Xbox app does not own the package directly.'
    };
  }
  if (platform === 'rockstar' || platform === 'rockstar games') {
    return {
      method: 'cmd',
      cmd: 'appwiz.cpl',
      label: 'Rockstar / Programs & Features',
      message: 'Rockstar Games Launcher uninstalls go through Programs & Features.'
    };
  }
  if (platform === 'curseforge' && installDir) {
    return {
      method: 'open-folder',
      target: installDir,
      label: 'CurseForge instance folder',
      message: 'CurseForge instances are uninstalled inside CurseForge itself (… → Delete Profile). Opening the folder lets you verify what’s on disk first.'
    };
  }
  if (installDir) {
    return {
      method: 'manual',
      target: installDir,
      cmd: 'appwiz.cpl',
      label: 'Manual',
      message: 'GamePilot will open both Programs & Features and the install folder so you can choose how to remove it. GamePilot never deletes files itself.'
    };
  }
  return {
    method: 'cmd',
    cmd: 'appwiz.cpl',
    label: 'Programs & Features',
    message: 'GamePilot couldn’t identify a launcher-specific uninstall path. Programs & Features will open so you can find and remove the title.'
  };
}

ipcMain.handle('build-uninstall-plan', async (_event, game) => {
  try {
    return { ok: true, plan: buildUninstallPlan(game) };
  } catch (err) {
    return { ok: false, error: err.message || 'plan-failed' };
  }
});

ipcMain.handle('start-uninstall', async (_event, payload) => {
  const game = payload?.game || payload;
  const plan = buildUninstallPlan(game);
  try {
    if (plan.method === 'deeplink') {
      await shell.openExternal(plan.url);
    } else if (plan.method === 'cmd') {
      childExec(plan.cmd);
    } else if (plan.method === 'open-folder') {
      await shell.openPath(plan.target);
    } else if (plan.method === 'manual') {
      // Belt and braces: open both — user picks whichever path actually works.
      childExec(plan.cmd);
      if (plan.target) await shell.openPath(plan.target);
    }
    return { ok: true, plan };
  } catch (err) {
    console.warn('[Uninstall] dispatch failed:', err.message);
    return { ok: false, error: err.message || 'dispatch-failed', plan };
  }
});

ipcMain.handle('open-external-url', async (_event, url) => {
  try {
    await shell.openExternal(url);
    return true;
  } catch (error) {
    console.error('❌ Failed to open external URL:', error);
    return false;
  }
});

ipcMain.handle('get-startup-launch-settings', async () => getStartupLaunchSettings());

ipcMain.handle('set-startup-launch-enabled', async (_event, enabled) => {
  if (!isStartupLaunchSupported()) {
    return {
      success: false,
      supported: false,
      enabled: false,
      persisted: false,
      isPackaged: app.isPackaged
    };
  }

  const nextEnabled = Boolean(enabled);
  const applyResult = applyStartupLaunchPreference(nextEnabled);
  if (!applyResult.success) {
    return {
      ...applyResult,
      persisted: getStartupLaunchPreference(),
      isPackaged: app.isPackaged
    };
  }

  const preferences = readAppPreferences();
  const writeSucceeded = writeAppPreferences({
    ...preferences,
    launchOnStartup: applyResult.enabled
  });

  return {
    success: writeSucceeded,
    supported: true,
    enabled: applyResult.enabled,
    persisted: applyResult.enabled,
    isPackaged: app.isPackaged,
    message: writeSucceeded ? null : 'Unable to persist startup preference'
  };
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

ipcMain.handle('minimize-window', async () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.minimize();
  }
  return { ok: true };
});

ipcMain.handle('restore-window', async () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  }
  return { ok: true };
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
  applyStartupLaunchPreference(getStartupLaunchPreference());
  
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
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      title: 'GamePilot',
      webPreferences: {
        preload: path.join(__dirname, 'public', 'preload.js'),
        nodeIntegration: true,
        contextIsolation: false,
      },
      show: true,
    });

    console.log('📱 Window created successfully, ID:', mainWindow.id);

    mainWindow.loadURL(
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000'
        : `file://${path.join(__dirname, './build/index.html')}`
    );

    mainWindow.webContents.on('console-message', (_event, _level, message) => {
      if (typeof message === 'string' && message.includes('[PERF]')) {
        console.log(message);
      }
    });

    mainWindow.on('ready-to-show', () => {
      console.log('🎯 Window ready to show');
      mainWindow.show();
    });

    mainWindow.on('closed', () => {
      console.log('❌ Main window closed');
      stopAllGameMonitors();
      mainWindow = null;
    });

    // Notify renderer when the system is shutting down so it can end
    // active sessions before the process is killed.
    powerMonitor.on('shutdown', () => {
      console.log('⚡ System shutdown imminent — notifying renderer to end sessions');
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('system-shutdown');
      }
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
