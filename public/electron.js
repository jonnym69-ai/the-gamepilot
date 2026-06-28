const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { spawn, exec } = require('child_process');
const si = require('systeminformation');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
const activeMonitors = new Map();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'GamePilot',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  if (isDev) {
    // Load from dev server
    mainWindow.loadURL('http://localhost:3000');
  } else {
    // Load from built files
    mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
  }
}

// IPC Handler for game launching
ipcMain.on('launch-game', (event, game) => {
  try {
    console.log(`[Electron] Launching game: ${game.name} (${game.platform})`);
    
    let launchCommand = '';
    let success = false;

    switch (game.platform) {
      case 'Steam':
        if (game.appid) {
          launchCommand = `steam://run/${game.appid}`;
          shell.openExternal(launchCommand);
          success = true;
        }
        break;

      case 'Epic':
        if (game.launchId) {
          // Epic Games protocol - launchId should be in format: Namespace/AppName/Label
          // Don't encode the launchId, Epic needs it raw
          launchCommand = `com.epicgames.launcher://apps/${game.launchId}?action=launch&silent=true`;
          shell.openExternal(launchCommand);
          success = true;
        } else if (game.appid) {
          // Fallback to appid
          launchCommand = `com.epicgames.launcher://apps/${game.appid}?action=launch&silent=true`;
          shell.openExternal(launchCommand);
          success = true;
        }
        break;

      case 'GOG':
        if (game.executablePath) {
          spawn(game.executablePath, { detached: true });
          success = true;
        } else if (game.appid) {
          launchCommand = `goggalaxy://openGameById/${game.appid}`;
          shell.openExternal(launchCommand);
          success = true;
        }
        break;

      case 'Battle.net':
        if (game.code) {
          launchCommand = `"C:\\Program Files (x86)\\Battle.net\\Battle.net.exe" --exec="launch ${game.code}"`;
          exec(launchCommand, { shell: true });
          success = true;
        }
        break;

      case 'Rockstar':
        if (game.launchId) {
          launchCommand = `rockstargames://launch/${game.launchId}`;
          shell.openExternal(launchCommand);
          success = true;
        }
        break;

      case 'Xbox':
        // Xbox Game Pass games use shell:AppsFolder to launch directly
        if (game.aumid) {
          // Use shell:AppsFolder with AUMID to launch the game directly
          launchCommand = `shell:AppsFolder\\${game.aumid}`;
          exec(`start ${launchCommand}`, { shell: true }, (error) => {
            if (error) {
              console.error('[Electron] Xbox AUMID launch error:', error);
              // Fallback to opening Xbox Gaming App
              exec('start shell:AppsFolder\\Microsoft.GamingApp_8wekyb3d8bbwe!Microsoft.Xbox.App', { shell: true });
            }
          });
          success = true;
        } else if (game.launchId) {
          // Try with launchId
          launchCommand = `shell:AppsFolder\\${game.launchId}`;
          exec(`start ${launchCommand}`, { shell: true }, (error) => {
            if (error) {
              console.error('[Electron] Xbox launchId error:', error);
              exec('start shell:AppsFolder\\Microsoft.GamingApp_8wekyb3d8bbwe!Microsoft.Xbox.App', { shell: true });
            }
          });
          success = true;
        } else {
          // Last resort: open Xbox Gaming App directly
          exec('start shell:AppsFolder\\Microsoft.GamingApp_8wekyb3d8bbwe!Microsoft.Xbox.App', { shell: true }, (error) => {
            if (error) {
              console.error('[Electron] Xbox Gaming App not found:', error);
            }
          });
          success = true;
        }
        break;

      case 'Ubisoft':
        if (game.launchId) {
          launchCommand = `uplay://launch/${game.launchId}`;
          shell.openExternal(launchCommand);
          success = true;
        }
        break;

      case 'Riot':
        // Riot Games uses command line args through RiotClientServices.exe
        if (game.executable) {
          // The executable field contains the full command with args
          exec(game.executable, { shell: true });
          success = true;
        } else if (game.executablePath) {
          spawn(game.executablePath, { detached: true });
          success = true;
        } else {
          // Fallback: open Riot Client
          const riotClientPath = path.join(process.env.LOCALAPPDATA || '', 'Riot Games', 'Riot Client', 'RiotClientServices.exe');
          if (fs.existsSync(riotClientPath)) {
            spawn(riotClientPath, { detached: true });
            success = true;
          }
        }
        break;

      case 'CurseForge':
        // CurseForge uses the Overwolf launcher
        if (game.launchId) {
          launchCommand = `curseforge://launch/${game.launchId}`;
          shell.openExternal(launchCommand);
          success = true;
        } else if (game.executable && game.executable.startsWith('curseforge://')) {
          // Scanner may provide the full CurseForge protocol URL in the executable field
          shell.openExternal(game.executable);
          success = true;
        } else if (game.executablePath) {
          spawn(game.executablePath, { detached: true });
          success = true;
        } else {
          // Fallback: try to find CurseForge in Program Files
          const curseForgePaths = [
            'C:\\Program Files (x86)\\Overwolf\\CurseForge',
            'C:\\Program Files\\Overwolf\\CurseForge',
            path.join(process.env.LOCALAPPDATA || '', 'Programs', 'CurseForge')
          ];
          for (const cfPath of curseForgePaths) {
            if (fs.existsSync(cfPath)) {
              // Open CurseForge app
              exec(`start "" "${cfPath}"`, { shell: true });
              success = true;
              break;
            }
          }
        }
        break;

      default:
        if (game.executablePath) {
          spawn(game.executablePath, { detached: true });
          success = true;
        }
    }

    console.log(`[Electron] Launch command: ${launchCommand || 'executable'}`);
    event.reply('launch-game-result', { success, gameName: game.name });
  } catch (error) {
    console.error(`[Electron] Launch error: ${error.message}`);
    event.reply('launch-game-result', { success: false, error: error.message });
  }
});

// IPC Handler for scanning game libraries
ipcMain.handle('scan-game-libraries', async () => {
  try {
    console.log('[Electron] Starting game library scan...');
    // Import and run the native scanner
    const { scanAllLibraries } = require('../nativeLibraryScanner.js');
    console.log('[Electron] Imported scanAllLibraries function');
    
    const games = scanAllLibraries();
    console.log(`[Electron] Scan complete: found ${games.length} games`);
    console.log('[Electron] Game sample:', games.slice(0, 3));
    
    const result = { games };
    console.log('[Electron] Returning result with games array');
    return result;
  } catch (error) {
    console.error('[Electron] Library scan error:', error);
    console.error('[Electron] Error stack:', error.stack);
    return { games: [] };
  }
});

// IPC Handler for starting game process monitoring
ipcMain.handle('start-game-monitor', async (event, { monitorId, game }) => {
  try {
    console.log(`[Electron] Starting monitor ${monitorId} for ${game.name}`);
    
    if (!game.executable && !game.executablePath) {
      return { success: false, message: 'No executable path provided' };
    }

    const exeName = game.executable 
      ? path.basename(game.executable) 
      : path.basename(game.executablePath);
    
    activeMonitors.set(monitorId, {
      gameName: game.name,
      exeName: exeName.toLowerCase(),
      startTime: Date.now()
    });

    return { success: true, monitorId };
  } catch (error) {
    console.error('[Electron] Start monitor error:', error);
    return { success: false, message: error.message };
  }
});

// IPC Handler for stopping game process monitoring
ipcMain.handle('stop-game-monitor', async (event, { monitorId }) => {
  try {
    const monitor = activeMonitors.get(monitorId);
    if (monitor) {
      console.log(`[Electron] Stopping monitor ${monitorId} for ${monitor.gameName}`);
      activeMonitors.delete(monitorId);
    }
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// Poll for game process status every 5 seconds
setInterval(async () => {
  if (activeMonitors.size === 0 || !mainWindow) return;

  try {
    const processes = await si.processes();
    const runningGames = [];

    for (const [monitorId, monitor] of activeMonitors) {
      const found = processes.list.find(p => 
        p.name && p.name.toLowerCase().includes(monitor.exeName.replace('.exe', ''))
      );
      
      if (found) {
        runningGames.push({ monitorId, gameName: monitor.gameName, pid: found.pid });
      }
    }

    // Check for games that closed
    const closedGames = [];
    for (const [monitorId, monitor] of activeMonitors) {
      if (!runningGames.find(g => g.monitorId === monitorId)) {
        closedGames.push({ monitorId, gameName: monitor.gameName });
      }
    }

    // Notify about closed games
    for (const closed of closedGames) {
      console.log(`[Electron] Game closed detected: ${closed.gameName}`);
      mainWindow.webContents.send('game-closed', { 
        gameName: closed.gameName, 
        monitorId: closed.monitorId 
      });
      activeMonitors.delete(closed.monitorId);
    }

    // Notify about started games
    for (const running of runningGames) {
      mainWindow.webContents.send('game-started', { 
        gameName: running.gameName, 
        monitorId: running.monitorId,
        pid: running.pid
      });
    }
  } catch (error) {
    console.error('[Electron] Process poll error:', error);
  }
}, 5000);

// IPC Handler for getting system hardware info
ipcMain.handle('get-system-info', async () => {
  try {
    console.log('[Electron] Getting system hardware info...');
    
    const [cpu, gpu, mem, memLayout, disk, fsSize, os] = await Promise.all([
      si.cpu(),
      si.graphics(),
      si.mem(),
      si.memLayout(),
      si.diskLayout(),
      si.fsSize(),
      si.osInfo()
    ]);

    // Get RAM type and speed from first memory module
    console.log('[Electron] Memory layout:', memLayout);
    const ramModule = memLayout[0] || {};
    const ramType = ramModule.type || 'DDR4';
    const ramSpeed = ramModule.clockSpeed || 0;
    console.log('[Electron] RAM Module:', { type: ramType, speed: ramSpeed, raw: ramModule });

    // Get all storage drives with filesystem info
    console.log('[Electron] Disk layout:', disk);
    console.log('[Electron] Filesystem sizes:', fsSize);
    
    // Map each physical disk to its filesystem partitions
    const allDrives = disk.map(d => {
      const isNVMe = (d.interfaceType || '').toLowerCase().includes('nvme');
      const isSSD = (d.type || '').toLowerCase().includes('ssd') || isNVMe;
      
      let driveType = 'HDD';
      if (isNVMe) driveType = 'NVMe SSD';
      else if (isSSD) driveType = 'SATA SSD';
      
      const driveName = d.name || d.device || d.interfaceType || 'Unknown Drive';
      const physicalSize = Math.round((d.size || 0) / 1024 / 1024 / 1024);
      
      // Find all partitions on this disk
      const partitions = fsSize.filter(fs => {
        // Match by device name or just include all for now
        return fs.fs && fs.mount;
      });
      
      return {
        name: driveName,
        type: driveType,
        isNVMe,
        isSSD,
        size: physicalSize,
        partitions: partitions.map(p => ({
          mount: p.mount,
          size: Math.round((p.size || 0) / 1024 / 1024 / 1024),
          used: Math.round((p.used || 0) / 1024 / 1024 / 1024),
          free: Math.round((p.available || 0) / 1024 / 1024 / 1024),
          usePercent: Math.round((p.use || 0))
        }))
      };
    });
    
    // Sort drives by priority: NVMe SSD > SSD > HDD
    allDrives.sort((a, b) => {
      if (a.isNVMe && !b.isNVMe) return -1;
      if (!a.isNVMe && b.isNVMe) return 1;
      if (a.isSSD && !b.isSSD) return -1;
      if (!a.isSSD && b.isSSD) return 1;
      return 0;
    });
    
    console.log('[Electron] All drives:', allDrives);

    const systemInfo = {
      cpu: {
        manufacturer: cpu.manufacturer,
        brand: cpu.brand,
        model: `${cpu.manufacturer} ${cpu.brand}`,
        cores: cpu.cores,
        physicalCores: cpu.physicalCores,
        speed: cpu.speed,
        speedMax: cpu.speedMax || cpu.speed
      },
      gpu: {
        model: gpu.controllers[0]?.model || 'Unknown GPU',
        vendor: gpu.controllers[0]?.vendor || 'Unknown',
        vram: gpu.controllers[0]?.vram || 0,
        vramGB: Math.round((gpu.controllers[0]?.vram || 0) / 1024)
      },
      ram: {
        total: Math.round(mem.total / 1024 / 1024 / 1024),
        free: Math.round(mem.free / 1024 / 1024 / 1024),
        used: Math.round(mem.used / 1024 / 1024 / 1024),
        type: ramType,
        speed: ramSpeed
      },
      storage: allDrives,
      os: {
        platform: os.platform,
        distro: os.distro,
        release: os.release,
        arch: os.arch
      },
      lastUpdated: Date.now()
    };

    console.log('[Electron] System info retrieved successfully');
    return systemInfo;
  } catch (error) {
    console.error('[Electron] Error getting system info:', error);
    throw error;
  }
});

// Helper: fetch a URL via https and return parsed JSON
const fetchJson = (url) => new Promise((resolve, reject) => {
  https.get(url, { headers: { 'Accept': 'application/json' } }, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      } catch (err) {
        reject(new Error('Invalid JSON response'));
      }
    });
  }).on('error', reject);
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchSteamWishlist = async (steamId) => {
  const url = `https://store.steampowered.com/wishlist/profiles/${encodeURIComponent(steamId)}/wishlistdata/?p=0`;
  const raw = await fetchJson(url);
  if (!raw || typeof raw !== 'object') return [];
  return Object.entries(raw).map(([appid, item]) => ({
    appid: String(appid),
    name: item?.name || ''
  })).filter((item) => item.name);
};

const enrichWishlistItems = async (items) => {
  const enriched = [];
  const batchSize = 5;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const appids = batch.map((item) => item.appid).join(',');
    try {
      const details = await fetchJson(`https://store.steampowered.com/api/appdetails?appids=${appids}`);
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
      console.warn('[Electron] Failed to enrich wishlist batch:', err.message);
      for (const item of batch) {
        enriched.push({ appid: item.appid, name: item.name, genres: [], image: null, isFree: false });
      }
    }
    if (i + batchSize < items.length) await sleep(500);
  }
  return enriched;
};

// IPC Handler for importing a Steam wishlist
ipcMain.handle('steam-wishlist', async (event, steamId) => {
  try {
    if (!steamId || typeof steamId !== 'string') {
      return { success: false, error: 'A valid Steam ID is required.', items: [] };
    }
    console.log('[Electron] Fetching Steam wishlist for', steamId);
    const items = await fetchSteamWishlist(steamId);
    if (items.length === 0) {
      return { success: true, count: 0, items: [], error: null };
    }
    const enriched = await enrichWishlistItems(items);
    return { success: true, count: enriched.length, items: enriched, error: null };
  } catch (err) {
    console.error('[Electron] Steam wishlist error:', err.message);
    return { success: false, error: err.message || 'Could not fetch Steam wishlist.', items: [] };
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
