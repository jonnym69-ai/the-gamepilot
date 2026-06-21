// GamePilot Master Launch Handler
// Implements proper URI protocols for all platforms
const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Registry access for Windows
const { execSync } = require('child_process');

const parseShellCommand = (command = '') => {
  const args = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < command.length; i++) {
    const char = command[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ' ' && !inQuotes) {
      if (current.length > 0) {
        args.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current.length > 0) {
    args.push(current);
  }

  return args;
};

const LAUNCH_MODES = Object.freeze({
  DIRECT: 'direct',
  PROTOCOL: 'protocol',
  LAUNCHER_OPENED: 'launcher_opened',
  MANUAL_REQUIRED: 'manual_required'
});

const createLaunchResult = (success, mode, message, metadata = {}) => ({
  success,
  mode: LAUNCH_MODES[mode] || mode || 'unknown',
  message,
  metadata,
  timestamp: Date.now()
});

class GameLauncher {
  constructor() {
    this.shell = require('electron').shell;
  }

  normalizePlatform(platform) {
    const normalizedPlatform = String(platform || '').trim();
    if (!normalizedPlatform) {
      return 'Unknown';
    }

    const lowerPlatform = normalizedPlatform.toLowerCase();
    const compactPlatform = lowerPlatform.replace(/[^a-z0-9]+/g, '');

    if (lowerPlatform === 'origin' || lowerPlatform === 'ea app' || compactPlatform === 'eaapp') return 'EA';
    if (lowerPlatform === 'uplay' || lowerPlatform === 'ubisoft connect' || compactPlatform === 'ubisoftconnect') return 'Ubisoft';
    if (lowerPlatform === 'battlenet' || compactPlatform === 'battlenet') return 'Battle.net';
    if (lowerPlatform === 'riot games' || compactPlatform === 'riotgames' || compactPlatform === 'riotclient') return 'Riot';
    if (lowerPlatform === 'battlestate games' || compactPlatform === 'battlestategames') return 'BSG';
    if (compactPlatform === 'curseforge' || compactPlatform === 'curseforgeapp' || compactPlatform === 'overwolfcurseforge') return 'CurseForge';
    if (lowerPlatform === 'playstation brand') return 'PlayStation';
    if (compactPlatform === 'amazon' || compactPlatform === 'amazonapp' || compactPlatform === 'amazongames') return 'Amazon';
    if (compactPlatform === 'itch' || compactPlatform === 'itchio' || lowerPlatform === 'itch.io') return 'Itch.io';
    if (compactPlatform === 'emulated' || compactPlatform === 'emulator' || compactPlatform === 'emulation') return 'Emulated';

    return normalizedPlatform;
  }

  extractRiotLaunchArgs(game = {}) {
    const executableCommand = typeof game.executable === 'string' ? game.executable.trim() : '';
    const launchProductMatch = executableCommand.match(/--launch-product=([^\s"]+)/i);
    const launchPatchlineMatch = executableCommand.match(/--launch-patchline=([^\s"]+)/i);

    const args = [];
    const launchProduct = launchProductMatch?.[1] || game.launchId || '';
    const launchPatchline = launchPatchlineMatch?.[1] || 'live';

    if (launchProduct) {
      args.push(`--launch-product=${launchProduct}`);
      args.push(`--launch-patchline=${launchPatchline}`);
    }

    return args;
  }

  getRiotClientCandidates(game = {}) {
    return [
      game.installDir ? path.join(game.installDir, '..', 'Riot Client', 'RiotClientServices.exe') : null,
      game.installDir ? path.join(game.installDir, 'Riot Client', 'RiotClientServices.exe') : null,
      path.join(process.env.LOCALAPPDATA || '', 'Riot Games', 'Riot Client', 'RiotClientServices.exe'),
      path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Riot Games', 'Riot Client', 'RiotClientServices.exe'),
      path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Riot Games', 'Riot Client', 'RiotClientServices.exe')
    ].filter(Boolean);
  }

  // Helper to query Windows Registry
  queryRegistry(key, value = null) {
    try {
      const command = value 
        ? `reg query "${key}" /v "${value}"`
        : `reg query "${key}"`;
      const result = execSync(command, { encoding: 'utf8' });
      return result;
    } catch (error) {
      console.log(`Registry query failed for ${key}:`, error.message);
      return null;
    }
  }

  // Get Xbox AUMID using PowerShell - Protocol-First approach
  getXboxPackageInfo(gameName) {
    try {
      console.log(`🔍 Searching for Xbox AUMID for: ${gameName}`);
      
      // Use PowerShell to get all installed apps with their AUMIDs
      const psCommand = `Get-StartApps | Where-Object { $_.AppID -like "*Microsoft*" -or $_.AppID -like "*Xbox*" } | Select-Object Name, AppID`;
      
      const result = execSync(psCommand, { encoding: 'utf8' });
      const lines = result.split('\n');
      
      console.log(`🔍 Found ${lines.length - 2} Xbox/Microsoft apps`);
      
      for (const line of lines) {
        if (line.includes('Age of Empires IV') || 
            line.includes('Age of Empires II') ||
            line.includes('Halo') ||
            line.includes('Forza') ||
            line.includes('Gears') ||
            line.includes('Sea of Thieves')) {
          
          // Extract AUMID from PowerShell output
          const match = line.match(/([A-Za-z0-9._-]+Microsoft\.[A-Za-z0-9._-]+!App)/);
          if (match) {
            const aumid = match[1];
            console.log(`✅ Found Xbox AUMID: ${aumid}`);
            return aumid;
          }
        }
      }
      
      // Fallback to common Xbox game AUMIDs
      const xboxGameAUMIDs = {
        'Age of Empires IV': 'Microsoft.Cardinal_8wekyb3d8bbwe!App',
        'Age of Empires II: Definitive Edition': 'Microsoft.AgeofEmpiresIIDE_8wekyb3d8bbwe!App',
        'Halo Infinite': 'Microsoft.Halo_8wekyb3d8bbwe!App',
        'Forza Horizon 5': 'Microsoft.SunriseBaseGame_8wekyb3d8bbwe!App',
        'Gears 5': 'Microsoft.Gears5_8wekyb3d8bbwe!App',
        'Sea of Thieves': 'Microsoft.SeaofThieves_8wekyb3d8bbwe!App'
      };

      const fallbackAumid = xboxGameAUMIDs[gameName];
      if (fallbackAumid) {
        console.log(`🔄 Using fallback AUMID: ${fallbackAumid}`);
        return fallbackAumid;
      }
      
      console.log('❌ No Xbox AUMID found for:', gameName);
      return null;
    } catch (error) {
      console.log('Error getting Xbox AUMID:', error);
      return null;
    }
  }

  // Get Epic manifest data - Protocol-First approach
  getEpicManifestData(game) {
    try {
      const epicManifestPath = path.join('C:\\ProgramData\\Epic\\EpicGamesLauncher\\Data\\Manifests');
      
      if (fs.existsSync(epicManifestPath)) {
        const manifestFiles = fs.readdirSync(epicManifestPath).filter(file => file.endsWith('.item'));
        
        console.log(`🔍 Searching through ${manifestFiles.length} Epic manifest files...`);
        
        for (const manifestFile of manifestFiles) {
          const manifestPath = path.join(epicManifestPath, manifestFile);
          const manifestContent = fs.readFileSync(manifestPath, 'utf8');
          
          // Look for game name match in manifest
          if (manifestContent.toLowerCase().includes(game.name.toLowerCase()) || 
              manifestContent.includes(game.launchId)) {
            
            console.log(`📄 Found matching manifest: ${manifestFile}`);
            
            // Parse manifest for launch information
            const lines = manifestContent.split('\n');
            let launchUrl = '';
            let appName = '';
            
            for (const line of lines) {
              if (line.includes('"LaunchExecutable":')) {
                const executable = line.split('"')[3];
                console.log(`🎮 Found LaunchExecutable: ${executable}`);
              }
              if (line.includes('"AppName":')) {
                appName = line.split('"')[3];
                console.log(`🎮 Found AppName: ${appName}`);
              }
              if (line.includes('"LaunchURL":')) {
                launchUrl = line.split('"')[3];
                console.log(`🎮 Found LaunchURL: ${launchUrl}`);
              }
            }
            
            // Construct the Epic launch URI
            if (appName) {
              return {
                launchUri: `com.epicgames.launcher://apps/${appName}?action=launch&silent=true`,
                appName: appName
              };
            }
          }
        }
      }
      
      console.log('❌ No matching Epic manifest found');
      return null;
    } catch (error) {
      console.log('Error reading Epic manifest:', error);
      return null;
    }
  }

  // Main launch method
  async launchGame(game) {
    const normalizedPlatform = this.normalizePlatform(game?.platform);
    console.log(`🚀 Launching ${game.name} (${normalizedPlatform})`);
    
    try {
      switch (normalizedPlatform) {
        case 'Steam':
          return this.launchSteam(game);
          
        case 'Epic':
          return this.launchEpic(game);
          
        case 'Xbox':
          return this.launchXbox(game);
          
        case 'Battle.net':
          return this.launchBattleNet(game);
          
        case 'GOG':
          return this.launchGOG(game);
          
        case 'Rockstar':
          return this.launchRockstar(game);
          
        case 'Origin':
        case 'EA':
          return this.launchOrigin(game);
          
        case 'Uplay':
        case 'Ubisoft':
          return this.launchUplay(game);

        case 'BSG':
          return this.launchBSG(game);
        
        case 'Riot':
          return this.launchRiot(game);
        
        case 'CurseForge':
          return this.launchCurseForge(game);

        case 'Amazon':
          return this.launchAmazon(game);

        case 'Itch.io':
          return this.launchItch(game);

        case 'Emulated':
          return this.launchEmulated(game);

        default:
          return createLaunchResult(false, 'unknown', `Unsupported platform: ${game.platform}`);
      }
    } catch (error) {
      console.error(`Launch error for ${game.name}:`, error);
      return createLaunchResult(false, 'unknown', error.message);
    }
  }

  // Steam launch (already working)
  async launchSteam(game) {
    if (!game.appid) {
      return createLaunchResult(false, 'unknown', 'Steam game missing AppID');
    }

    const steamUrl = `steam://run/${game.appid}`;
    console.log('🚂 Steam URL:', steamUrl);
    await this.shell.openExternal(steamUrl);
    return createLaunchResult(true, 'protocol', `Launched ${game.name}`, { launchUrl: steamUrl });
  }

  // Epic Games launch - Protocol-First with manifest parsing
  async launchEpic(game) {
    console.log('🎮 Epic game data:', game);
    
    // Protocol-First: Try to get manifest data for precise launch URI
    const manifestData = this.getEpicManifestData(game);
    
    if (manifestData && manifestData.launchUri) {
      console.log('🎮 Using Epic manifest-based launch URI:', manifestData.launchUri);
      await this.shell.openExternal(manifestData.launchUri);
      return createLaunchResult(true, 'protocol', `Launched ${game.name} via manifest`, { launchUrl: manifestData.launchUri });
    }

    // Fallback to launchId if available
    if (game.launchId) {
      const epicUrl = `com.epicgames.launcher://apps/${game.launchId}?action=launch&silent=true`;
      console.log('🎮 Using Epic launchId fallback:', epicUrl);
      await this.shell.openExternal(epicUrl);
      return createLaunchResult(true, 'protocol', `Launched ${game.name} via launchId`, { launchUrl: epicUrl });
    }

    // Final fallback to Epic launcher
    console.log('🎮 Opening Epic Launcher (final fallback)');
    await this.shell.openExternal('com.epicgames.launcher://');
    return createLaunchResult(true, 'launcher_opened', 'Epic Launcher opened - please launch game manually');
  }

  // Xbox launch - Use AUMID from game object
  async launchXbox(game) {
    console.log('🎯 Xbox game data:', game);
    
    // Use AUMID from game object (already discovered during scanning)
    const aumid = game.aumid;
    
    if (aumid) {
      // Protocol-First: Use shell:AppsFolder protocol with AUMID
      const launchUrl = `shell:appsFolder\\${aumid}`;
      console.log(`🎯 Xbox launch URL: ${launchUrl}`);
      
      try {
        await this.shell.openExternal(launchUrl);
        console.log('✅ Xbox game launched successfully via AUMID');
        return createLaunchResult(true, 'protocol', `Launched ${game.name} via AUMID`, { aumid });
      } catch (error) {
        console.error('❌ Xbox launch failed:', error);
        return createLaunchResult(false, 'unknown', `Failed to launch ${game.name}: ${error.message}`);
      }
    }

    return createLaunchResult(false, 'unknown', `Xbox AUMID not found for ${game.name}`);
  }

  // Battle.net launch - Protocol-First with --exec argument
  async launchBattleNet(game) {
    console.log('⚔️ Battle.net game data:', game);
    
    // Check common Battle.net installation paths
    const battleNetPaths = [
      'C:\\Program Files (x86)\\Battle.net\\Battle.net.exe',
      'C:\\Program Files\\Battle.net\\Battle.net.exe'
    ];
    
    let battleNetExe = null;
    for (const path of battleNetPaths) {
      if (fs.existsSync(path)) {
        battleNetExe = path;
        console.log(`⚔️ Found Battle.net at: ${battleNetExe}`);
        break;
      }
    }
    
    if (battleNetExe) {
      // Get the game code from the game object
      const gameCode = game.code || game.launchId;
      
      if (gameCode) {
        // Protocol-First: Use --exec="launch [code]" argument
        const command = `"${battleNetExe}" --exec="launch ${gameCode}"`;
        console.log(`⚔️ Battle.net command: ${command}`);
        
        return new Promise((resolve) => {
          exec(command, (error) => {
            if (error) {
              console.error('❌ Battle.net launch failed:', error);
              resolve(createLaunchResult(false, 'unknown', `Failed to launch ${game.name}: ${error.message}`));
            } else {
              console.log('✅ Battle.net game launched successfully');
              resolve(createLaunchResult(true, 'direct', `Launched ${game.name}`, { gameCode }));
            }
          });
        });
      }
      console.log('❌ No game code found for Battle.net game');
    }

    // Fallback to Battle.net URI
    console.log('⚔️ Falling back to Battle.net URI');
    await this.shell.openExternal('battlenet://');
    return createLaunchResult(true, 'launcher_opened', 'Battle.net opened - please launch game manually');
  }

  // GOG launch
  async launchGOG(game) {
    console.log('🌌 GOG game data:', game);

    const executablePath = typeof game.executablePath === 'string' ? game.executablePath.trim() : '';
    if (executablePath && fs.existsSync(executablePath)) {
      console.log('🌌 Launching GOG game executable directly:', executablePath);
      return new Promise((resolve) => {
        exec(`start "" "${executablePath}"`, { shell: true }, (error) => {
          if (error) {
            console.error('❌ Direct GOG executable launch failed:', error);
            resolve(createLaunchResult(false, 'unknown', `Failed to launch ${game.name}: ${error.message}`));
          } else {
            resolve(createLaunchResult(true, 'direct', `Launched ${game.name}`, { executablePath }));
          }
        });
      });
    }

    if (game.launchId) {
      const gogUrl = `goggalaxy://openGame/${game.launchId}`;
      console.log('🌌 GOG URL:', gogUrl);
      await this.shell.openExternal(gogUrl);
      return createLaunchResult(true, 'protocol', `Launched ${game.name}`, { launchUrl: gogUrl });
    }

    if (game.appid) {
      const gogUrl = `goggalaxy://openGameById/${game.appid}`;
      console.log('🌌 GOG AppID URL:', gogUrl);
      await this.shell.openExternal(gogUrl);
      return createLaunchResult(true, 'protocol', `Launched ${game.name}`, { launchUrl: gogUrl });
    }

    const localAppData = process.env.LOCALAPPDATA || '';
    const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    const galaxyCandidates = [
      path.join(localAppData, 'GOG.com', 'Galaxy', 'GalaxyClient.exe'),
      path.join(programFiles, 'GOG Galaxy', 'GalaxyClient.exe'),
      path.join(programFilesX86, 'GOG Galaxy', 'GalaxyClient.exe')
    ].filter(Boolean);

    const galaxyClientPath = galaxyCandidates.find((candidate) => fs.existsSync(candidate));
    if (galaxyClientPath) {
      console.log('🌌 Opening GOG Galaxy client directly:', galaxyClientPath);
      return new Promise((resolve) => {
        exec(`start "" "${galaxyClientPath}"`, { shell: true }, (error) => {
          if (error) {
            console.error('❌ GOG Galaxy client launch failed:', error);
            resolve(createLaunchResult(false, 'unknown', `Failed to open GOG Galaxy: ${error.message}`));
          } else {
            resolve(createLaunchResult(true, 'launcher_opened', 'GOG Galaxy opened - please launch game manually'));
          }
        });
      });
    }

    // Fallback
    await this.shell.openExternal('goggalaxy://');
    return createLaunchResult(true, 'launcher_opened', 'GOG Galaxy opened - please launch game manually');
  }

  // Rockstar launch
  async launchRockstar(game) {
    console.log('🪨 Rockstar game data:', game);
    
    const rockstarUrl = 'rockstar://';
    console.log('🪨 Rockstar URL:', rockstarUrl);
    await this.shell.openExternal(rockstarUrl);
    return createLaunchResult(true, 'launcher_opened', `Rockstar Launcher opened - please launch ${game.name} manually`);
  }

  // Origin launch
  async launchOrigin(game) {
    console.log('🎪 Origin game data:', game);
    
    if (game.launchId) {
      const originUrl = `origin://launch/${game.launchId}`;
      console.log('🎪 Origin URL:', originUrl);
      await this.shell.openExternal(originUrl);
      return createLaunchResult(true, 'protocol', `Launched ${game.name}`, { launchUrl: originUrl });
    }

    // Fallback
    await this.shell.openExternal('origin://');
    return createLaunchResult(true, 'launcher_opened', 'Origin opened - please launch game manually');
  }

  // Uplay / Ubisoft Connect launch
  async launchUplay(game) {
    console.log('🔷 Ubisoft game data:', game);

    // Prefer the scanned executable. Ubisoft launch IDs discovered from folder names
    // are not stable Ubisoft product IDs and can route Windows to the Store.
    if (game.executablePath && fs.existsSync(game.executablePath)) {
      console.log('🔷 Launching Ubisoft executable:', game.executablePath);
      const { spawn } = require('child_process');
      const child = spawn(game.executablePath, { detached: true, stdio: 'ignore' });
      child.unref();
      return createLaunchResult(true, 'direct', `Launched ${game.name} (direct)`, { executablePath: game.executablePath });
    }

    // Final fallback: open Ubisoft Connect client
    const connectPaths = [
      path.join(process.env.LOCALAPPDATA || '', 'Ubisoft Connect', 'UbisoftConnect.exe'),
      path.join(process.env.LOCALAPPDATA || '', 'Ubisoft Game Launcher', 'Uplay.exe'),
      path.join(process.env['ProgramFiles(x86)'] || '', 'Ubisoft/Ubisoft Connect/UbisoftConnect.exe'),
      path.join(process.env['ProgramFiles(x86)'] || '', 'Ubisoft/Ubisoft Game Launcher/Uplay.exe')
    ];

    for (const connectPath of connectPaths) {
      if (fs.existsSync(connectPath)) {
        console.log('🔷 Opening Ubisoft Connect client:', connectPath);
        const { spawn } = require('child_process');
        const child = spawn(connectPath, { detached: true, stdio: 'ignore' });
        child.unref();
        return createLaunchResult(true, 'launcher_opened', 'Ubisoft Connect opened — please launch game manually');
      }
    }

    return createLaunchResult(false, 'unknown', 'Ubisoft Connect executable not found for launch');
  }

  async launchBSG(game) {
    console.log('🐻 BSG game data:', game);

    const localAppDataPrograms = process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, 'Programs')
      : null;

    // Prefer the official launcher first so BattlEye-protected games initialize correctly.
    const launcherCandidates = [
      game.installDir ? path.join(game.installDir, 'BsgLauncher.exe') : null,
      game.installDir ? path.join(game.installDir, 'Launcher', 'BsgLauncher.exe') : null,
      game.installDir ? path.join(game.installDir, 'BsgLauncher', 'BsgLauncher.exe') : null,
      game.installDir ? path.join(game.installDir, '..', 'BsgLauncher', 'BsgLauncher.exe') : null,
      game.installDir ? path.join(game.installDir, '..', 'Launcher', 'BsgLauncher.exe') : null,
      'C:\\Battlestate Games\\BsgLauncher\\BsgLauncher.exe',
      'D:\\Battlestate Games\\BsgLauncher\\BsgLauncher.exe',
      'E:\\Battlestate Games\\BsgLauncher\\BsgLauncher.exe',
      'C:\\Program Files\\BsgLauncher\\BsgLauncher.exe',
      'C:\\Program Files (x86)\\BsgLauncher\\BsgLauncher.exe',
      localAppDataPrograms ? path.join(localAppDataPrograms, 'BsgLauncher', 'BsgLauncher.exe') : null,
      localAppDataPrograms ? path.join(localAppDataPrograms, 'Battlestate Games', 'BsgLauncher', 'BsgLauncher.exe') : null
    ].filter(Boolean);

    for (const launcherPath of launcherCandidates) {
      if (!fs.existsSync(launcherPath)) {
        continue;
      }

      return new Promise((resolve) => {
        exec(`"${launcherPath}"`, (error) => {
          if (error) {
            console.error('❌ BSG launcher failed:', error);
            resolve(createLaunchResult(false, 'unknown', `Failed to open BSG Launcher: ${error.message}`));
            return;
          }

          resolve(createLaunchResult(true, 'launcher_opened', 'BSG Launcher opened - launch Escape from Tarkov from the launcher to satisfy BattlEye'));
        });
      });
    }

    // Only fall back to direct executables if no launcher is installed.
    const executableCandidates = [
      game.installDir ? path.join(game.installDir, 'EscapeFromTarkov_BE.exe') : null,
      game.installDir ? path.join(game.installDir, 'EscapeFromTarkov.exe') : null,
      game.installDir ? path.join(game.installDir, 'EscapeFromTarkov_Arena.exe') : null
    ].filter(Boolean);

    for (const executablePath of executableCandidates) {
      if (!fs.existsSync(executablePath)) {
        continue;
      }

      exec(`"${executablePath}"`, () => {});
      return createLaunchResult(true, 'direct', `Launched ${game.name}`, { executablePath });
    }

    return createLaunchResult(false, 'unknown', 'BSG Launcher not found - please install Escape from Tarkov');
  }

  async launchRiot(game) {
    console.log('👊 Riot game data:', game);

    const riotClientCandidates = this.getRiotClientCandidates(game);
    const riotLaunchArgs = this.extractRiotLaunchArgs(game);
    const riotClientPath = riotClientCandidates.find((candidate) => candidate && fs.existsSync(candidate));

    if (riotClientPath) {
      console.log('👊 Launching Riot client:', riotClientPath, 'Args:', riotLaunchArgs);
      return new Promise((resolve) => {
        const riotCommand = `start "" "${riotClientPath}"${riotLaunchArgs.length ? ` ${riotLaunchArgs.join(' ')}` : ''}`;
        exec(riotCommand, { shell: true }, (error) => {
          if (error) {
            console.error('❌ Riot client launch failed:', error);
            resolve(createLaunchResult(false, 'unknown', `Failed to launch ${game.name}: ${error.message}`));
            return;
          }

          const mode = riotLaunchArgs.length > 0 ? 'direct' : 'launcher_opened';
          const message = riotLaunchArgs.length > 0 ? `Launched ${game.name}` : 'Riot Client opened - please launch the game manually';
          resolve(createLaunchResult(true, mode, message, { riotClientPath, riotLaunchArgs }));
        });
      });
    }

    if (game.executablePath && fs.existsSync(game.executablePath)) {
      console.log('👊 Launching Riot executable path:', game.executablePath);
      return new Promise((resolve) => {
        const executableCommand = `start "" "${game.executablePath}"${riotLaunchArgs.length ? ` ${riotLaunchArgs.join(' ')}` : ''}`;
        exec(executableCommand, { shell: true }, (error) => {
          if (error) {
            console.error('❌ Riot executable launch failed:', error);
            resolve(createLaunchResult(false, 'unknown', `Failed to launch ${game.name}: ${error.message}`));
            return;
          }

          resolve(createLaunchResult(true, 'direct', `Launched ${game.name}`, { executablePath: game.executablePath, riotLaunchArgs }));
        });
      });
    }

    if (game.executable) {
      console.log('👊 Falling back to raw Riot command:', game.executable);
      return new Promise((resolve) => {
        exec(game.executable, { shell: true }, (error) => {
          if (error) {
            console.error('❌ Riot raw command fallback failed:', error);
            resolve(createLaunchResult(false, 'unknown', `Failed to launch ${game.name}: ${error.message}`));
            return;
          }

          resolve(createLaunchResult(true, 'direct', `Launched ${game.name}`, { command: game.executable }));
        });
      });
    }

    return createLaunchResult(false, 'unknown', 'Riot Client not found for launch');
  }

  async launchCurseForge(game) {
    console.log('⛏️ CurseForge game data:', game);

    if (typeof game.executable === 'string' && game.executable.startsWith('curseforge://')) {
      console.log('⛏️ Opening CurseForge protocol:', game.executable);
      await this.shell.openExternal(game.executable);
      return createLaunchResult(true, 'protocol', `Launched ${game.name}`, { launchUrl: game.executable });
    }

    if (game.launchId) {
      const launchUrl = `curseforge://launch/${game.launchId}`;
      console.log('⛏️ Opening CurseForge launch URL:', launchUrl);
      await this.shell.openExternal(launchUrl);
      return createLaunchResult(true, 'protocol', `Launched ${game.name}`, { launchUrl });
    }

    if (game.executablePath && fs.existsSync(game.executablePath)) {
      console.log('⛏️ Launching CurseForge executable path:', game.executablePath);
      exec(`start "" "${game.executablePath}"`, { shell: true }, () => {});
      return createLaunchResult(true, 'direct', `Launched ${game.name}`, { executablePath: game.executablePath });
    }

    const curseForgeCandidates = [
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'CurseForge', 'CurseForge.exe'),
      path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Overwolf', 'CurseForge', 'CurseForge.exe'),
      path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Overwolf', 'CurseForge', 'CurseForge.exe')
    ];

    const curseForgePath = curseForgeCandidates.find((candidate) => candidate && fs.existsSync(candidate));
    if (curseForgePath) {
      console.log('⛏️ Opening CurseForge client:', curseForgePath);
      exec(`start "" "${curseForgePath}"`, { shell: true }, () => {});
      return createLaunchResult(true, 'launcher_opened', 'CurseForge opened - please launch the instance manually');
    }

    return createLaunchResult(false, 'unknown', 'CurseForge launcher not found for launch');
  }

  async launchAmazon(game) {
    console.log('📦 Amazon game data:', game);

    if (game.executablePath && fs.existsSync(game.executablePath)) {
      console.log('📦 Launching Amazon game executable directly:', game.executablePath);
      return new Promise((resolve) => {
        exec(`start "" "${game.executablePath}"`, { shell: true }, (error) => {
          if (error) {
            console.error('❌ Direct Amazon executable launch failed:', error);
            resolve(createLaunchResult(false, 'unknown', `Failed to launch ${game.name}: ${error.message}`));
          } else {
            resolve(createLaunchResult(true, 'direct', `Launched ${game.name}`, { executablePath: game.executablePath }));
          }
        });
      });
    }

    const amazonAppCandidates = [
      path.join(process.env.LOCALAPPDATA || '', 'Amazon Games', 'App', 'Amazon Games.exe'),
      path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Amazon Games', 'Amazon Games.exe'),
      path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Amazon Games', 'Amazon Games.exe')
    ];

    const amazonAppPath = amazonAppCandidates.find((candidate) => candidate && fs.existsSync(candidate));
    if (amazonAppPath) {
      console.log('📦 Opening Amazon Games app:', amazonAppPath);
      exec(`start "" "${amazonAppPath}"`, { shell: true }, () => {});
      return createLaunchResult(true, 'launcher_opened', 'Amazon Games opened - please launch the game manually');
    }

    return createLaunchResult(false, 'unknown', 'Amazon Games app not found for launch');
  }

  async launchItch(game) {
    console.log('🎲 Itch.io game data:', game);

    if (game.executablePath && fs.existsSync(game.executablePath)) {
      console.log('🎲 Launching itch.io game executable directly:', game.executablePath);
      return new Promise((resolve) => {
        exec(`start "" "${game.executablePath}"`, { shell: true }, (error) => {
          if (error) {
            console.error('❌ Direct itch.io executable launch failed:', error);
            resolve(createLaunchResult(false, 'unknown', `Failed to launch ${game.name}: ${error.message}`));
          } else {
            resolve(createLaunchResult(true, 'direct', `Launched ${game.name}`, { executablePath: game.executablePath }));
          }
        });
      });
    }

    const itchAppCandidates = [
      path.join(process.env.LOCALAPPDATA || '', 'itch', 'itch.exe'),
      path.join(process.env.LOCALAPPDATA || '', 'itch.io', 'itch.exe'),
      path.join(process.env.ProgramFiles || 'C:\\Program Files', 'itch', 'itch.exe'),
      path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'itch', 'itch.exe')
    ];

    const itchAppPath = itchAppCandidates.find((candidate) => candidate && fs.existsSync(candidate));
    if (itchAppPath) {
      console.log('🎲 Opening itch.io app:', itchAppPath);
      exec(`start "" "${itchAppPath}"`, { shell: true }, () => {});
      return createLaunchResult(true, 'launcher_opened', 'itch.io opened - please launch the game manually');
    }

    return createLaunchResult(false, 'unknown', 'itch.io app not found for launch');
  }

  async launchEmulated(game) {
    console.log('🕹️ Emulated game data:', game);

    const emulatorPath = String(game.emulatorPath || game.executablePath || '').trim();
    const romPath = String(game.romPath || '').trim();
    const launchTemplate = String(game.executable || game.launchTemplate || '"{emulator}" "{rom}"').trim();

    if (!emulatorPath || !fs.existsSync(emulatorPath)) {
      return createLaunchResult(false, 'unknown', `Emulator executable not found for ${game.name}`);
    }

    if (!romPath || !fs.existsSync(romPath)) {
      return createLaunchResult(false, 'unknown', `ROM file not found for ${game.name}`);
    }

    const command = launchTemplate
      .replace(/\{emulator\}/g, emulatorPath)
      .replace(/\{rom\}/g, romPath);

    const args = parseShellCommand(command);
    const exe = args.shift();

    if (!exe || !fs.existsSync(exe)) {
      return createLaunchResult(false, 'unknown', `Emulator executable not found for ${game.name}`);
    }

    try {
      const child = spawn(exe, args, { detached: true, stdio: 'ignore' });
      child.unref();
      return createLaunchResult(true, 'direct', `Launched ${game.name} via ${game.emulator || 'emulator'}`, { emulatorPath, romPath });
    } catch (error) {
      console.error('❌ Emulator launch failed:', error);
      return createLaunchResult(false, 'unknown', `Failed to launch ${game.name}: ${error.message}`);
    }
  }
}

module.exports = GameLauncher;
