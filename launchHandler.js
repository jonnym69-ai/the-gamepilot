// GamePilot Master Launch Handler
// Implements proper URI protocols for all platforms
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Registry access for Windows
const { execSync } = require('child_process');

class GameLauncher {
  constructor() {
    this.shell = require('electron').shell;
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
    console.log(`🚀 Launching ${game.name} (${game.platform})`);
    
    try {
      switch (game.platform) {
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
          
        default:
          return { success: false, message: `Unsupported platform: ${game.platform}` };
      }
    } catch (error) {
      console.error(`Launch error for ${game.name}:`, error);
      return { success: false, message: error.message };
    }
  }

  // Steam launch (already working)
  async launchSteam(game) {
    if (!game.appid) {
      return { success: false, message: 'Steam game missing AppID' };
    }
    
    const steamUrl = `steam://run/${game.appid}`;
    console.log('🚂 Steam URL:', steamUrl);
    await this.shell.openExternal(steamUrl);
    return { success: true, message: `Launched ${game.name}` };
  }

  // Epic Games launch - Protocol-First with manifest parsing
  async launchEpic(game) {
    console.log('🎮 Epic game data:', game);
    
    // Protocol-First: Try to get manifest data for precise launch URI
    const manifestData = this.getEpicManifestData(game);
    
    if (manifestData && manifestData.launchUri) {
      console.log('🎮 Using Epic manifest-based launch URI:', manifestData.launchUri);
      await this.shell.openExternal(manifestData.launchUri);
      return { success: true, message: `Launched ${game.name} via manifest` };
    }
    
    // Fallback to launchId if available
    if (game.launchId) {
      const epicUrl = `com.epicgames.launcher://apps/${game.launchId}?action=launch&silent=true`;
      console.log('🎮 Using Epic launchId fallback:', epicUrl);
      await this.shell.openExternal(epicUrl);
      return { success: true, message: `Launched ${game.name} via launchId` };
    }
    
    // Final fallback to Epic launcher
    console.log('🎮 Opening Epic Launcher (final fallback)');
    await this.shell.openExternal('com.epicgames.launcher://');
    return { success: true, message: 'Epic Launcher opened - please launch game manually' };
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
        return { success: true, message: `Launched ${game.name} via AUMID` };
      } catch (error) {
        console.error('❌ Xbox launch failed:', error);
        return { success: false, message: `Failed to launch ${game.name}: ${error.message}` };
      }
    }
    
    return { success: false, message: `Xbox AUMID not found for ${game.name}` };
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
              resolve({ success: false, message: `Failed to launch ${game.name}: ${error.message}` });
            } else {
              console.log('✅ Battle.net game launched successfully');
              resolve({ success: true, message: `Launched ${game.name}` });
            }
          });
        });
      } else {
        console.log('❌ No game code found for Battle.net game');
      }
    }
    
    // Fallback to Battle.net URI
    console.log('⚔️ Falling back to Battle.net URI');
    await this.shell.openExternal('battlenet://');
    return { success: true, message: 'Battle.net opened - please launch game manually' };
  }

  // GOG launch
  async launchGOG(game) {
    console.log('🌌 GOG game data:', game);
    
    if (game.launchId) {
      const gogUrl = `goggalaxy://openGame/${game.launchId}`;
      console.log('🌌 GOG URL:', gogUrl);
      await this.shell.openExternal(gogUrl);
      return { success: true, message: `Launched ${game.name}` };
    }
    
    // Fallback
    await this.shell.openExternal('goggalaxy://');
    return { success: true, message: 'GOG Galaxy opened - please launch game manually' };
  }

  // Rockstar launch
  async launchRockstar(game) {
    console.log('🪨 Rockstar game data:', game);
    
    const rockstarUrl = 'rockstar://';
    console.log('🪨 Rockstar URL:', rockstarUrl);
    await this.shell.openExternal(rockstarUrl);
    return { success: true, message: `Rockstar Launcher opened - please launch ${game.name} manually` };
  }

  // Origin launch
  async launchOrigin(game) {
    console.log('🎪 Origin game data:', game);
    
    if (game.launchId) {
      const originUrl = `origin://launch/${game.launchId}`;
      console.log('🎪 Origin URL:', originUrl);
      await this.shell.openExternal(originUrl);
      return { success: true, message: `Launched ${game.name}` };
    }
    
    // Fallback
    await this.shell.openExternal('origin://');
    return { success: true, message: 'Origin opened - please launch game manually' };
  }

  // Uplay launch
  async launchUplay(game) {
    console.log('🔷 Uplay game data:', game);
    
    if (game.launchId) {
      const uplayUrl = `uplay://launch/${game.launchId}/0`;
      console.log('🔷 Uplay URL:', uplayUrl);
      await this.shell.openExternal(uplayUrl);
      return { success: true, message: `Launched ${game.name}` };
    }
    
    // Fallback
    await this.shell.openExternal('uplay://');
    return { success: true, message: 'Uplay opened - please launch game manually' };
  }

  async launchBSG(game) {
    console.log('🐻 BSG game data:', game);

    const localAppDataPrograms = process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, 'Programs')
      : null;

    const executableCandidates = [
      game.executablePath,
      game.executable,
      game.installDir ? path.join(game.installDir, 'EscapeFromTarkov.exe') : null,
      game.installDir ? path.join(game.installDir, 'EscapeFromTarkov_BE.exe') : null,
      game.installDir ? path.join(game.installDir, 'EscapeFromTarkov_Arena.exe') : null
    ].filter(Boolean);

    for (const executablePath of executableCandidates) {
      if (!fs.existsSync(executablePath)) {
        continue;
      }

      exec(`"${executablePath}"`, () => {});
      return { success: true, message: `Launched ${game.name}` };
    }

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

      await this.shell.openExternal(`file://${launcherPath}`);
      return { success: true, message: 'BSG Launcher opened - please launch game manually' };
    }

    return { success: false, message: 'BSG Launcher not found - please install Escape from Tarkov' };
  }
}

module.exports = GameLauncher;
