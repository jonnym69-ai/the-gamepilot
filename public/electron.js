const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const si = require('systeminformation');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;

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

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
