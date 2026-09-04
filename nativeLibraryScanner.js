const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SCANNER_DEBUG = process.env.GAMEPILOT_SCANNER_DEBUG === 'true';

const scannerDebug = (...args) => {
  if (SCANNER_DEBUG) {
    console.log(...args);
  }
};

// Import modular scanners - handle both dev and production paths.
// Each scanner is loaded INDEPENDENTLY so that one failing require cannot
// null out all the others. Previously a single failure forced a fallback to
// the legacy Steam scanner, which dropped imported Steam playtime in packaged
// builds. Resolution is __dirname-based so it works inside an asar too.
const loadScannerExport = (moduleBaseName, exportName) => {
  const candidates = [
    path.join(__dirname, 'src', 'services', 'scanner', moduleBaseName),
    path.join(__dirname, moduleBaseName),
    `./src/services/scanner/${moduleBaseName}`,
    `./${moduleBaseName}`
  ];
  for (const candidate of candidates) {
    try {
      const mod = require(candidate);
      if (mod && typeof mod[exportName] === 'function') {
        return mod[exportName];
      }
    } catch (error) {
      // try next candidate
    }
  }
  console.error(`[Scanner] Failed to load modular scanner '${moduleBaseName}' (export ${exportName}).`);
  return null;
};

const scanSteamLibraryNew = loadScannerExport('steamScanner', 'scanSteamLibrary');
const scanEALibraryNew = loadScannerExport('eaScanner', 'scanEALibrary');
const scanRockstarLibraryNew = loadScannerExport('rockstarScanner', 'scanRockstarLibrary');
const scanAmazonLibraryNew = loadScannerExport('amazonScanner', 'scanAmazonLibrary');
const scanItchLibraryNew = loadScannerExport('itchScanner', 'scanItchLibrary');

// Steam playtime reader (localconfig.vdf) - shared util, dev/prod paths.
// Resolve via absolute __dirname so it works both in dev and inside an
// asar-packaged build. Each candidate is logged on failure so a broken
// packaged build is diagnosable instead of silently dropping Steam playtime.
let getSteamPlaytimeMap;
const STEAM_PLAYTIME_REQUIRE_CANDIDATES = [
  path.join(__dirname, 'src', 'services', 'scanner', 'scannerUtils'),
  path.join(__dirname, 'scannerUtils'),
  './src/services/scanner/scannerUtils',
  './scannerUtils'
];

for (const candidate of STEAM_PLAYTIME_REQUIRE_CANDIDATES) {
  try {
    ({ getSteamPlaytimeMap } = require(candidate));
    if (typeof getSteamPlaytimeMap === 'function') {
      console.log('[Scanner] Steam playtime reader loaded from:', candidate);
      break;
    }
  } catch (error) {
    console.warn('[Scanner] Could not load Steam playtime reader from', candidate, '-', error.message);
  }
}

if (typeof getSteamPlaytimeMap !== 'function') {
  console.error('[Scanner] Steam playtime reader unavailable — imported Steam playtime will be empty. Ensure scannerUtils is bundled.');
  getSteamPlaytimeMap = () => ({});
}

// GOG Galaxy playtime reader (galaxy-2.0.db) - shared util, dev/prod paths.
let getGogGalaxyPlaytimeMap;
let applyGogGalaxyPlaytime;
const GOG_GALAXY_PLAYTIME_REQUIRE_CANDIDATES = [
  path.join(__dirname, 'src', 'services', 'scanner', 'scannerUtils'),
  path.join(__dirname, 'scannerUtils'),
  './src/services/scanner/scannerUtils',
  './scannerUtils'
];

for (const candidate of GOG_GALAXY_PLAYTIME_REQUIRE_CANDIDATES) {
  try {
    ({ getGogGalaxyPlaytimeMap, applyGogGalaxyPlaytime } = require(candidate));
    if (typeof getGogGalaxyPlaytimeMap === 'function' && typeof applyGogGalaxyPlaytime === 'function') {
      console.log('[Scanner] GOG Galaxy playtime reader loaded from:', candidate);
      break;
    }
  } catch (error) {
    console.warn('[Scanner] Could not load GOG Galaxy playtime reader from', candidate, '-', error.message);
  }
}

if (typeof getGogGalaxyPlaytimeMap !== 'function') {
  console.warn('[Scanner] GOG Galaxy playtime reader unavailable. Install GOG Galaxy and connect platforms to import historical playtime.');
  getGogGalaxyPlaytimeMap = async () => ({});
  applyGogGalaxyPlaytime = (games) => games;
}

// Import genre database for game classification
// Handle both development and production paths
let getGameGenres;
try {
  // Try development path first
  getGameGenres = require('./src/GameGenreDatabase.js').getGameGenres;
} catch (error) {
  try {
    // Try production path (when bundled in app.asar)
    getGameGenres = require('./GameGenreDatabase.js').getGameGenres;
  } catch (prodError) {
    console.log('[Scanner] GameGenreDatabase not found, using fallback genres');
    // Fallback function if genre database is not available
    getGameGenres = (gameName) => {
      if (!gameName) return ['Story-driven'];
      
      const name = gameName.toLowerCase();
      if (name.includes('shooter') || name.includes('fps') || name.includes('tarkov')) return ['Shooter'];
      if (name.includes('rpg') || name.includes('witcher') || name.includes('elder')) return ['RPG'];
      if (name.includes('strategy') || name.includes('civilization') || name.includes('age of empires')) return ['Strategy'];
      if (name.includes('action') || name.includes('far cry') || name.includes('resident evil')) return ['Action'];
      if (name.includes('adventure') || name.includes('tomb raider') || name.includes('zelda')) return ['Adventure'];
      if (name.includes('simulation') || name.includes('sims') || name.includes('cities')) return ['Simulation'];
      if (name.includes('racing') || name.includes('need for speed') || name.includes('forza')) return ['Racing'];
      if (name.includes('sports') || name.includes('fifa') || name.includes('nba')) return ['Sports'];
      if (name.includes('puzzle') || name.includes('tetris') || name.includes('candy')) return ['Puzzle'];
      if (name.includes('platformer') || name.includes('mario') || name.includes('sonic')) return ['Platformer'];
      if (name.includes('horror') || name.includes('outlast') || name.includes('amnesia')) return ['Horror'];
      if (name.includes('indie') || name.includes('stardew') || name.includes('hollow')) return ['Indie'];
      
      return ['Story-driven']; // Default fallback
    };
  }
}

const scannerRuntimeCache = {
  activeDrives: null,
  battleNetInstallRoots: null,
  eaInstallRoots: null,
  ubisoftInstallRoots: null,
  ubisoftRegistryInstallRoots: null,
  rockstarRegistryInstallRoots: null
};

const createTrackedDefaults = () => ({
  time_played: 0,
  launch_count: 0,
  last_played: null,
  playtime: {
    total: 0,
    daily: {},
    weekly: {},
    monthly: {},
    yearly: {}
  }
});

const SHELL_COMMAND_TIMEOUT_MS = 4000;

const runCommand = (command) => {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: SHELL_COMMAND_TIMEOUT_MS,
      windowsHide: true
    });
  } catch (error) {
    return '';
  }
};

const sanitizeScannedGameName = (value) => String(value || '')
  .replace(/Ôäó/g, '™')
  .replace(/┬«/g, '®')
  .replace(/┬®/g, '©')
  .replace(/ÔÇÖ/g, '’')
  .replace(/ÔÇ£|ÔÇØ/g, '"')
  .replace(/ÔÇô|ÔÇö/g, '-')
  .replace(/\s+/g, ' ')
  .trim();

const BATTLE_NET_FOLDER_HINTS = [
  'world of warcraft',
  'wow',
  'diablo',
  'overwatch',
  'starcraft',
  'warcraft',
  'heroes of the storm',
  'hearthstone',
  'call of duty'
];

const isLikelyBattleNetGameDirectory = (gamePath, folderName, knownGames = []) => {
  const normalizedFolder = String(folderName || '').toLowerCase();
  const matchesKnownGame = knownGames.some((game) => {
    const normalizedGameName = String(game?.name || '').toLowerCase();
    const normalizedRegistryKey = String(game?.registryKey || '').toLowerCase();
    const normalizedCode = String(game?.code || '').toLowerCase();
    return (
      (normalizedGameName && (normalizedFolder.includes(normalizedGameName) || normalizedGameName.includes(normalizedFolder)))
      || (normalizedRegistryKey && (normalizedFolder.includes(normalizedRegistryKey) || normalizedRegistryKey.includes(normalizedFolder)))
      || (normalizedCode && normalizedFolder.includes(normalizedCode))
    );
  });

  if (matchesKnownGame) {
    return looksLikeInstalledGameDirectory(gamePath, folderName);
  }

  const hasBattleNetHint = BATTLE_NET_FOLDER_HINTS.some((hint) => normalizedFolder.includes(hint));
  if (!hasBattleNetHint) {
    return false;
  }

  return looksLikeInstalledGameDirectory(gamePath, folderName);
};

const safeReadDir = (targetPath) => {
  try {
    return fs.readdirSync(targetPath);
  } catch (error) {
    return [];
  }
};

const safeReadJson = (targetPath) => {
  try {
    return JSON.parse(fs.readFileSync(targetPath, 'utf8'));
  } catch (error) {
    return null;
  }
};

const normalizeScannerToken = (value) => String(value || '')
  .toLowerCase()
  .replace(/iii/g, '3')
  .replace(/ii/g, '2')
  .replace(/iv/g, '4')
  .replace(/[^a-z0-9]/g, '');

const addUniquePath = (paths, candidatePath) => {
  if (!candidatePath || typeof candidatePath !== 'string') return;
  const normalizedPath = candidatePath.trim();
  if (!normalizedPath || !fs.existsSync(normalizedPath)) return;
  if (!paths.includes(normalizedPath)) paths.push(normalizedPath);
};

const addUniqueValues = (target, values = []) => {
  values.forEach((value) => addUniquePath(target, value));
};

const queryRegistryValue = (registryKey, valueName) => {
  const output = runCommand(`reg query "${registryKey}" /v ${valueName}`);
  if (!output) return '';
  const match = output.match(new RegExp(`${valueName}\\s+REG_\\w+\\s+(.+)`));
  return match ? match[1].trim() : '';
};

const parseRegistryBlocks = (output) => {
  if (!output) return [];

  return String(output)
    .split(/\r?\n\r?\n+/)
    .map((block) => block.trim())
    .filter(Boolean);
};

const parseRegistryValueFromBlock = (block, valueName) => {
  if (!block) return '';
  const match = String(block).match(new RegExp(`^\\s*${valueName}\\s+REG_\\w+\\s+(.+)$`, 'mi'));
  return match ? match[1].trim() : '';
};

const parseYamlScalar = (content, key) => {
  const match = String(content || '').match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  if (!match) return '';
  return match[1].trim().replace(/^['"]|['"]$/g, '');
};

const collectNestedGameDirectories = (rootPath, depth = 2) => {
  const directories = [];

  const visit = (currentPath, remainingDepth) => {
    if (!currentPath || !fs.existsSync(currentPath) || remainingDepth < 0) {
      return;
    }

    safeReadDir(currentPath).forEach((entry) => {
      const entryPath = path.join(currentPath, entry);
      try {
        if (!fs.statSync(entryPath).isDirectory()) {
          return;
        }

        directories.push(entryPath);
        if (remainingDepth > 0) {
          visit(entryPath, remainingDepth - 1);
        }
      } catch (error) {
      }
    });
  };

  visit(rootPath, depth);
  return directories;
};

const addGameIfUnique = (games, game) => {
  if (!game?.name || !game?.platform) {
    return;
  }
  const normalizedGame = {
    ...game,
    name: sanitizeScannedGameName(game.name)
  };
  if (!normalizedGame.name || isLikelyNonGameFolder(normalizedGame.name)) {
    return;
  }
  const exists = games.some((existingGame) => (
    existingGame.platform === normalizedGame.platform
    && (
      (existingGame.appid && normalizedGame.appid && String(existingGame.appid) === String(normalizedGame.appid))
      || (existingGame.launchId && normalizedGame.launchId && String(existingGame.launchId) === String(normalizedGame.launchId))
      || (existingGame.aumid && normalizedGame.aumid && String(existingGame.aumid) === String(normalizedGame.aumid))
      || (existingGame.installDir && normalizedGame.installDir && existingGame.installDir.toLowerCase() === normalizedGame.installDir.toLowerCase())
      || existingGame.name.toLowerCase() === normalizedGame.name.toLowerCase()
    )
  ));

  if (!exists) {
    games.push(normalizedGame);
  }
};

const NON_GAME_FOLDER_TOKENS = [
  'launcher', 'launchers', 'social club', 'rockstar games launcher',
  'gog galaxy', 'galaxyclient', 'ubisoft connect', 'ubisoftconnect', 'riot client',
  'commonredist', 'redistributables', 'redistributable', 'installer',
  'installers', 'prerequisite', 'prerequisites', 'prereq', 'support',
  'tools', 'tool', 'cache', 'logs', 'log', 'updater', 'updates',
  'runtime', 'service', 'services', 'setup', 'uninstall', 'uninstaller',
  'bonus content', 'soundtrack', 'artbook', 'directx', 'vcredist', 'dotnet',
  'engine', 'sdk', 'launcherdata', 'anticheat', 'easyanticheat', 'eac', 'beclient',
  'games', 'game', 'battleye', 'battlEye', 'escapefromtarkov_data', 'eft_data', 'data',
  'program files', 'program files (x86)', 'windows', 'users', 'documents and settings',
  'appdata', 'application data', 'local settings', 'programdata', 'perflogs',
  'system volume information', 'recycle.bin', '$recycle.bin'
];

const SYSTEM_PATH_PATTERNS = [
  '\\windows',
  '\\users',
  '\\program files',
  '\\program files (x86)',
  '\\programdata',
  '\\perflogs',
  '\\appdata',
  '\\documents and settings',
  '\\$recycle.bin',
  '\\system volume information'
];

const isLikelyNonGameFolder = (folderName) => {
  const normalized = String(folderName || '').trim().toLowerCase();
  if (!normalized || normalized.length < 2) return true;
  return NON_GAME_FOLDER_TOKENS.some((token) => (
    normalized === token ||
    normalized.startsWith(`${token} `) ||
    normalized.includes(` ${token}`) ||
    normalized.includes(`_${token}`) ||
    normalized.includes(`-${token}`)
  ));
};

const normalizePathForScanner = (targetPath) => String(targetPath || '')
  .replace(/\//g, '\\')
  .trim()
  .toLowerCase();

const isDriveRootPath = (targetPath) => /^[a-z]:\\?$/i.test(String(targetPath || '').trim());

const isProtectedSystemPath = (targetPath) => {
  const normalizedPath = normalizePathForScanner(targetPath);
  if (!normalizedPath) {
    return true;
  }

  if (isDriveRootPath(normalizedPath)) {
    return true;
  }

  return SYSTEM_PATH_PATTERNS.some((pattern) => (
    normalizedPath === pattern.slice(1)
    || normalizedPath.endsWith(pattern)
    || normalizedPath.includes(`${pattern}\\`)
  ));
};

const NON_GAME_EXECUTABLE_TOKENS = [
  'launcher', 'updater', 'crashreport', 'unins', 'uninstall', 'setup', 'install',
  'redistributable', 'support', 'helper', 'service', 'eadesktop', 'origin',
  'ubisoftconnect', 'upc', 'rockstarlauncher', 'socialclub', 'battle.net',
  'galaxyclient', 'goggalaxy', 'riotclientservices', 'battleye', 'beclient', 'anticheat'
];

const isLikelyGameExecutable = (fileName, folderName = '') => {
  const normalizedFile = String(fileName || '').toLowerCase();
  const normalizedFolder = String(folderName || '').toLowerCase();
  if (!normalizedFile.endsWith('.exe')) return false;
  if (NON_GAME_EXECUTABLE_TOKENS.some((token) => normalizedFile.includes(token))) {
    return false;
  }
  if (!normalizedFolder) {
    return true;
  }
  const normalizedFileStem = normalizedFile.replace(/\.exe$/, '').replace(/[^a-z0-9]/g, '');
  const normalizedFolderStem = normalizedFolder.replace(/[^a-z0-9]/g, '');
  if (!normalizedFileStem || !normalizedFolderStem) {
    return false;
  }

  return normalizedFileStem.includes(normalizedFolderStem)
    || normalizedFolderStem.includes(normalizedFileStem)
    || normalizedFileStem.startsWith(normalizedFolderStem.slice(0, Math.min(normalizedFolderStem.length, 8)))
    || normalizedFolderStem.startsWith(normalizedFileStem.slice(0, Math.min(normalizedFileStem.length, 8)));
};

const findPreferredExecutable = (gamePath, folderName) => {
  const files = safeReadDir(gamePath)
    .filter((fileName) => isLikelyGameExecutable(fileName, folderName))
    .sort((a, b) => a.localeCompare(b));

  if (files.length === 0) {
    return null;
  }

  return path.join(gamePath, files[0]);
};

const findBestExecutablePath = (gamePath, folderName) => {
  const directExecutablePath = findPreferredExecutable(gamePath, folderName);
  if (directExecutablePath) {
    return directExecutablePath;
  }

  const nestedDirectories = safeReadDir(gamePath)
    .map((entry) => path.join(gamePath, entry))
    .filter((entryPath) => {
      try {
        return fs.statSync(entryPath).isDirectory();
      } catch (error) {
        return false;
      }
    });

  for (const nestedDirectory of nestedDirectories) {
    const nestedExecutablePath = findPreferredExecutable(nestedDirectory, path.basename(nestedDirectory));
    if (nestedExecutablePath) {
      return nestedExecutablePath;
    }
  }

  return null;
};

/**
 * Decide if a directory reasonably looks like a standalone installed game folder
 * by checking for likely executables in itself or immediate subfolders and
 * ruling out common non-game folders.
 */
const looksLikeInstalledGameDirectory = (gamePath, folderName) => {
  if (!gamePath || !fs.existsSync(gamePath)) {
    return false;
  }

  if (isProtectedSystemPath(gamePath)) {
    return false;
  }

  if (isLikelyNonGameFolder(folderName || path.basename(gamePath))) {
    return false;
  }

  try {
    if (!fs.statSync(gamePath).isDirectory()) {
      return false;
    }

    const detectedExecutablePath = findBestExecutablePath(gamePath, folderName || path.basename(gamePath));
    if (detectedExecutablePath) {
      return true;
    }

    const nestedDirectories = safeReadDir(gamePath)
      .map((entry) => path.join(gamePath, entry))
      .filter((entryPath) => {
        try {
          return fs.statSync(entryPath).isDirectory();
        } catch (_) {
          return false;
        }
      });

    if (nestedDirectories.some((entryPath) => findPreferredExecutable(entryPath, path.basename(entryPath)))) {
      return true;
    }

    return false;
  } catch (_) {
    return false;
  }
};

/**
 * Deep scan up to a given depth under rootDir for the largest plausible game executable.
 * Excludes known launcher/updater executables using isLikelyGameExecutable + NON_GAME_EXECUTABLE_TOKENS.
 */
const findExecutableDeep = (rootDir, maxDepth = 3) => {
  if (!rootDir || !fs.existsSync(rootDir)) return null;
  let bestExe = null;
  let bestSize = 0;

  const walk = (dir, depth) => {
    if (depth < 0) return;
    safeReadDir(dir).forEach((entry) => {
      const entryPath = path.join(dir, entry);
      try {
        const stats = fs.statSync(entryPath);
        if (stats.isDirectory()) {
          walk(entryPath, depth - 1);
        } else if (stats.isFile() && entry.toLowerCase().endsWith('.exe') && isLikelyGameExecutable(entry, path.basename(dir))) {
          if (stats.size > bestSize) {
            bestSize = stats.size;
            bestExe = entryPath;
          }
        }
      } catch (e) {}
    });
  };

  walk(rootDir, maxDepth);
  return bestExe;
};

const getActiveDrives = () => {
  if (Array.isArray(scannerRuntimeCache.activeDrives)) {
    return scannerRuntimeCache.activeDrives;
  }

  const logicalDiskOutput = runCommand('powershell -NoProfile -Command "Get-CimInstance Win32_LogicalDisk | Select-Object DeviceID,DriveType | ConvertTo-Json -Compress"');
  let activeDrives = [];

  if (logicalDiskOutput) {
    try {
      const parsedDisks = JSON.parse(logicalDiskOutput);
      const diskList = Array.isArray(parsedDisks) ? parsedDisks : [parsedDisks];
      activeDrives = diskList
        .filter((disk) => {
          const driveType = Number(disk?.DriveType);
          return [2, 3, 4].includes(driveType);
        })
        .map((disk) => String(disk?.DeviceID || '').replace(':', '').trim().toUpperCase())
        .filter(Boolean)
        .filter((drive, index, list) => list.indexOf(drive) === index)
        .filter((drive) => {
          try {
            return fs.existsSync(`${drive}:\\`);
          } catch (error) {
            return false;
          }
        });
    } catch (error) {
      activeDrives = [];
    }
  }

  if (activeDrives.length === 0) {
    const commonDrives = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    activeDrives = commonDrives.filter((drive) => {
      try {
        return fs.existsSync(`${drive}:\\`);
      } catch (error) {
        return false;
      }
    });
  }

  activeDrives.forEach((drive) => {
    scannerDebug(`[Scanner] Found active drive: ${drive}:`);
  });
  scannerDebug('[Scanner] Active drives found:', activeDrives);
  scannerRuntimeCache.activeDrives = activeDrives;
  return activeDrives;
};

const getXboxMap = () => {
  try {
    const output = runCommand(`powershell "Get-StartApps | Where-Object { $_.AppID -like '*Microsoft*' -or $_.AppID -like '*Xbox*' } | ConvertTo-Json"`);
    if (!output) {
      return {};
    }

    const apps = JSON.parse(output);
    const list = Array.isArray(apps) ? apps : [apps];
    return list.reduce((acc, app) => {
      if (app?.Name && app?.AppID) {
        acc[app.Name] = app.AppID;
      }
      return acc;
    }, {});
  } catch (error) {
    return {};
  }
};

const getSteamLibraryFolderPaths = (steamAppsPath) => {
  const discoveredPaths = [];
  const libraryFoldersPath = path.join(steamAppsPath, 'libraryfolders.vdf');
  if (!fs.existsSync(libraryFoldersPath)) return discoveredPaths;

  try {
    const content = fs.readFileSync(libraryFoldersPath, 'utf8');
    const pathMatches = content.matchAll(/"path"\s+"([^"]+)"/g);
    for (const match of pathMatches) {
      const steamLibraryRoot = String(match[1] || '').replace(/\\\\/g, '\\').trim();
      if (steamLibraryRoot) {
        addUniquePath(discoveredPaths, path.join(steamLibraryRoot, 'steamapps'));
      }
    }
  } catch (error) {
    // Ignore malformed libraryfolders.vdf
  }
  return discoveredPaths;
};

const getSteamInstallPaths = () => {
  const paths = [];

  [
    queryRegistryValue('HKLM\\SOFTWARE\\Valve\\Steam', 'InstallPath'),
    queryRegistryValue('HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam', 'InstallPath'),
    queryRegistryValue('HKCU\\SOFTWARE\\Valve\\Steam', 'InstallPath'),
    queryRegistryValue('HKCU\\SOFTWARE\\Valve\\Steam', 'SteamPath')
  ].filter(Boolean).forEach((installPath) => {
    addUniquePath(paths, path.join(installPath, 'steamapps'));
  });

  // Check known defaults
  getActiveDrives().forEach((drive) => {
    [
      `${drive}:\\Program Files (x86)\\Steam\\steamapps`,
      `${drive}:\\Program Files\\Steam\\steamapps`,
      `${drive}:\\Steam\\steamapps`,
      `${drive}:\\Games\\Steam\\steamapps`,
      `${drive}:\\SteamLibrary\\steamapps`
    ].forEach((candidatePath) => {
      addUniquePath(paths, candidatePath);
    });
  });

  // Extract from libraryfolders.vdf if present in any discovered path
  const extraPaths = [];
  paths.forEach((steamPath) => {
    getSteamLibraryFolderPaths(steamPath).forEach((extraPath) => {
      addUniquePath(extraPaths, extraPath);
    });
  });
  
  extraPaths.forEach((extraPath) => addUniquePath(paths, extraPath));

  return paths;
};

const scanSteamLibrary = () => {
  const games = [];
  const steamPaths = getSteamInstallPaths();
  const playtimeMap = getSteamPlaytimeMap(steamPaths);
  scannerDebug('[Scanner] Steam paths found:', steamPaths);

  steamPaths.forEach((steamPath) => {
    scannerDebug('[Scanner] Checking Steam path:', steamPath);
    if (!fs.existsSync(steamPath)) {
      scannerDebug('[Scanner] Path does not exist:', steamPath);
      return;
    }
    
    const files = safeReadDir(steamPath);
    scannerDebug('[Scanner] Files in path:', files.length);
    
    const acfFiles = files.filter((fileName) => fileName.endsWith('.acf'));
    scannerDebug('[Scanner] ACF files found:', acfFiles.length);
    
    acfFiles.forEach((acfFile) => {
      try {
        const content = fs.readFileSync(path.join(steamPath, acfFile), 'utf8');
        const nameMatch = content.match(/"name"\s+"([^"]+)"/);
        const appIdMatch = content.match(/"appid"\s+"(\d+)"/);

        if (!nameMatch || !appIdMatch) {
          return;
        }

        const gameName = nameMatch[1];
        const appId = appIdMatch[1];
        const skipGames = [
          'Steamworks Common Redistributables',
          'Steamworks Shared',
          'Steamworks Distribution',
          'Steam Linux Runtime',
          'SteamVR',
          'Steamworks SDK Redist',
          'Proton Experimental',
          'Proton-GE',
          'Steamworks SDK Redistributables'
        ];

        if (skipGames.some((skipName) => gameName.includes(skipName)) || isLikelyNonGameFolder(gameName)) {
          scannerDebug('[Scanner] Skipping non-game:', gameName);
          return;
        }

        // Get genres from database for better Perfect Play recommendations
        const detectedGenres = getGameGenres(gameName);
        const installDirMatch = content.match(/"installdir"\s+"([^"]+)"/);
        const sizeOnDiskMatch = content.match(/"SizeOnDisk"\s+"(\d+)"/);
        const installDirName = installDirMatch ? installDirMatch[1] : gameName;
        const gamePath = path.join(steamPath, 'common', installDirName);
        const installSize = sizeOnDiskMatch ? Number(sizeOnDiskMatch[1]) || null : null;

        const tracked = createTrackedDefaults();
        const playtime = playtimeMap[appId];
        if (playtime) {
          tracked.time_played = playtime.minutes;
          tracked.playtime.total = playtime.minutes;
          tracked.last_played = playtime.lastPlayedMs;
          tracked.importedPlaytimeMinutes = playtime.minutes;
          tracked.playtimeSource = 'steam';
        }

        games.push({
          name: gameName,
          platform: 'Steam',
          appid: appId,
          genres: detectedGenres.length > 0 ? detectedGenres : ['Story-driven'],
          iconUrl: `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/capsule_231x87.jpg`,
          icon: '',
          executable: `steam://run/${appId}`,
          installDir: gamePath,
          installSize,
          ...tracked
        });
        scannerDebug('[Scanner] Added Steam game:', gameName);
      } catch (error) {
        console.error('[Scanner] Error parsing ACF:', acfFile, error);
      }
    });
  });

  scannerDebug('[Scanner] Steam scan complete. Found', games.length, 'games');
  return games;
};

const scanGOGLibrary = () => {
  const games = [];
  const seenGameKeys = new Set();
  const fallbackPaths = [];

  const addGogGame = (game) => {
    if (!game?.name) {
      return;
    }

    const uniqueKey = [
      game.platform || 'GOG',
      game.appid || game.launchId || game.installDir || game.name
    ].join('::').toLowerCase();

    if (seenGameKeys.has(uniqueKey)) {
      return;
    }

    const detectedGenres = getGameGenres(game.name);
    seenGameKeys.add(uniqueKey);
    games.push({
      platform: 'GOG',
      iconUrl: '',
      icon: '',
      genres: detectedGenres.length > 0 ? detectedGenres : ['Story-driven'],
      ...createTrackedDefaults(),
      ...game
    });
  };

  [
    `${process.env.LOCALAPPDATA || process.env.localappdata}\\GOG.com\\Galaxy\\storage\\games`,
    `${process.env.LOCALAPPDATA || process.env.localappdata}\\GOG\\Games`,
    `${process.env.ProgramFiles || 'C:\\Program Files'}\\GOG Galaxy\\Games`,
    `${process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'}\\GOG Galaxy\\Games`
  ].filter(Boolean).forEach((candidatePath) => addUniquePath(fallbackPaths, candidatePath));

  getActiveDrives().forEach((drive) => {
    addUniquePath(fallbackPaths, `${drive}:\\GOG Games`);
    addUniquePath(fallbackPaths, `${drive}:\\Games\\GOG`);
    addUniquePath(fallbackPaths, `${drive}:\\Program Files\\GOG Galaxy\\Games`);
    addUniquePath(fallbackPaths, `${drive}:\\Program Files (x86)\\GOG Galaxy\\Games`);
  });

  const registryRoots = [
    'HKLM\\SOFTWARE\\WOW6432Node\\GOG.com\\Games',
    'HKLM\\SOFTWARE\\GOG.com\\Games',
    'HKCU\\SOFTWARE\\GOG.com\\Games',
    'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall'
  ];

  registryRoots.forEach((registryRoot) => {
    const output = runCommand(`reg query "${registryRoot}" /s`);
    parseRegistryBlocks(output).forEach((block) => {
      const lines = String(block).split(/\r?\n/).filter(Boolean);
      const registryKey = lines[0]?.trim() || '';
      const publisher = parseRegistryValueFromBlock(block, 'Publisher');
      const displayName = parseRegistryValueFromBlock(block, 'DisplayName');
      const installLocation = parseRegistryValueFromBlock(block, 'InstallLocation');
      const pathValue = parseRegistryValueFromBlock(block, 'path');
      const exeValue = parseRegistryValueFromBlock(block, 'exe');
      const gameId = parseRegistryValueFromBlock(block, 'gameID') || parseRegistryValueFromBlock(block, 'gameid');

      const isNativeGogGameKey = /\\GOG\.com\\Games\\/i.test(registryKey);
      const isGogUninstallEntry = /gog/i.test(publisher) || /gog/i.test(registryKey);
      if (!isNativeGogGameKey && !isGogUninstallEntry) {
        return;
      }

      const resolvedInstallDir = [installLocation, pathValue]
        .map((candidate) => String(candidate || '').trim().replace(/^"|"$/g, ''))
        .find((candidate) => candidate && fs.existsSync(candidate));

      const resolvedName = displayName || path.basename(resolvedInstallDir || '') || '';
      if (!resolvedName || isLikelyNonGameFolder(resolvedName)) {
        // Launcher client apps (e.g. GOG Galaxy itself) register uninstall
        // entries here too. Bail before the install dir is added to fallback
        // scan paths so the client folder is never treated as a game library.
        return;
      }

      if (resolvedInstallDir) {
        addUniquePath(fallbackPaths, resolvedInstallDir);
      }

      const resolvedExecutablePath = [
        exeValue,
        resolvedInstallDir ? findBestExecutablePath(resolvedInstallDir, path.basename(resolvedInstallDir)) : null
      ]
        .map((candidate) => String(candidate || '').trim().replace(/^"|"$/g, ''))
        .find((candidate) => candidate && fs.existsSync(candidate));

      addGogGame({
        name: resolvedName,
        launchId: gameId || '',
        appid: gameId || '',
        executable: resolvedExecutablePath || (gameId ? `goggalaxy://openGameById/${gameId}` : null),
        executablePath: resolvedExecutablePath || null,
        installDir: resolvedInstallDir || null
      });
    });
  });

  scanFolderLibraries('GOG', fallbackPaths).forEach((game) => {
    addGogGame(game);
  });

  return games;
};

const getEpicManifestPaths = () => {
  const paths = [];

  addUniqueValues(paths, [
    `${process.env.ProgramData || 'C:\\ProgramData'}\\Epic\\EpicGamesLauncher\\Data\\Manifests`,
    `${process.env.ProgramData || 'C:\\ProgramData'}\\Epic\\UnrealEngineLauncher\\LauncherInstalled.dat`
  ]);

  getActiveDrives().forEach((drive) => {
    addUniqueValues(paths, [
      `${drive}:\\ProgramData\\Epic\\EpicGamesLauncher\\Data\\Manifests`,
      `${drive}:\\Epic Games\\Launcher\\Portal\\Data\\Manifests`,
      `${drive}:\\Games\\Epic Games\\Launcher\\Portal\\Data\\Manifests`
    ]);
  });

  return paths.filter((entry) => String(entry).toLowerCase().endsWith('manifests'));
};

const getEpicLogPaths = () => {
  const paths = [];

  addUniqueValues(paths, [
    `${process.env.LOCALAPPDATA || process.env.localappdata || 'C:\\Users\\Public\\AppData\\Local'}\\EpicGamesLauncher\\Saved\\Logs`
  ]);

  return paths.filter((entry) => String(entry).toLowerCase().endsWith('logs') && fs.existsSync(entry));
};

const parseEpicLogTimestamp = (line) => {
  const match = line.match(/\[(\d{4})\.(\d{2})\.(\d{2})-(\d{2})\.(\d{2})\.(\d{2}):\d+\]/);
  if (!match) return null;
  const [year, month, day, hour, minute, second] = match.slice(1);
  try {
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`).getTime();
  } catch {
    return null;
  }
};

const isLikelyEpicLaunchLine = (line, appName) => {
  if (!appName || !line) return false;
  const lowerLine = line.toLowerCase();
  const lowerAppName = appName.toLowerCase();
  if (!lowerLine.includes(lowerAppName)) return false;
  return (
    lowerLine.includes('launch') ||
    lowerLine.includes('starting app') ||
    lowerLine.includes('running app') ||
    lowerLine.includes('execute app') ||
    lowerLine.includes('app launch') ||
    lowerLine.includes('begin launch')
  );
};

const getEpicLaunchHistory = (appNames = []) => {
  const history = new Map();
  const normalizedAppNames = appNames.filter(Boolean).map((name) => String(name).trim());
  normalizedAppNames.forEach((appName) => {
    history.set(appName, { launchCount: 0, lastPlayedMs: null });
  });

  const logPaths = getEpicLogPaths();
  logPaths.forEach((logsPath) => {
    safeReadDir(logsPath)
      .filter((fileName) => fileName.endsWith('.log'))
      .forEach((logFile) => {
        try {
          const content = fs.readFileSync(path.join(logsPath, logFile), 'utf8');
          const lines = content.split(/\r?\n/);
          lines.forEach((line) => {
            const timestamp = parseEpicLogTimestamp(line);
            if (!timestamp) return;

            normalizedAppNames.forEach((appName) => {
              if (isLikelyEpicLaunchLine(line, appName)) {
                const entry = history.get(appName);
                entry.launchCount += 1;
                if (timestamp > (entry.lastPlayedMs || 0)) {
                  entry.lastPlayedMs = timestamp;
                }
              }
            });
          });
        } catch (error) {
          // Ignore unreadable log files
        }
      });
  });

  return history;
};

const scanEpicLibrary = () => {
  const rawGames = [];
  const paths = getEpicManifestPaths();

  paths.forEach((manifestsPath) => {
    safeReadDir(manifestsPath)
      .filter((fileName) => fileName.endsWith('.item'))
      .forEach((manifestFile) => {
        try {
          const content = fs.readFileSync(path.join(manifestsPath, manifestFile), 'utf8');
          const manifest = JSON.parse(content);
          if (!manifest?.DisplayName) return;

          const appName = manifest.AppName || manifest.CatalogItemId || '';
          const detectedGenres = getGameGenres(manifest.DisplayName);
          const installLocation = manifest.InstallLocation ? String(manifest.InstallLocation).trim() : '';
          const installSize = typeof manifest.InstallSize === 'number' && manifest.InstallSize > 0
            ? manifest.InstallSize
            : null;
          const launchId = manifest.CatalogItemId || manifest.AppName || '';
          const mainGameAppName = manifest.MainGameAppName ? String(manifest.MainGameAppName).trim() : null;
          const launchExecutable = manifest.LaunchExecutable ? String(manifest.LaunchExecutable).trim() : null;
          const launchCommand = manifest.LaunchCommand ? String(manifest.LaunchCommand).trim() : null;

          rawGames.push({
            appName,
            manifest: {
              name: manifest.DisplayName,
              platform: 'Epic',
              appid: manifest.CatalogItemId || manifest.AppName || null,
              genres: detectedGenres.length > 0 ? detectedGenres : ['Story-driven'],
              iconUrl: '',
              icon: '',
              launchId,
              executable: `com.epicgames.launcher://apps/${launchId}?action=launch&silent=true`,
              installDir: installLocation || undefined,
              installSize,
              launchExecutable: launchExecutable || undefined,
              launchCommand: launchCommand || undefined,
              mainGameAppName: mainGameAppName || undefined
            }
          });
        } catch (error) {
          // Ignore malformed Epic manifest
        }
      });
  });

  const appNames = rawGames.map((entry) => entry.appName).filter(Boolean);
  const launchHistory = getEpicLaunchHistory(appNames);

  return rawGames.map((entry) => {
    const history = launchHistory.get(entry.appName);
    const tracked = createTrackedDefaults();
    if (history && history.lastPlayedMs) {
      tracked.last_played = history.lastPlayedMs;
      tracked.launch_count = history.launchCount || 0;
    }
    return { ...entry.manifest, ...tracked };
  });
};

const scanUbisoftLibrary = () => {
  const games = [];
  const uplayPaths = [
    `${process.env.LOCALAPPDATA || process.env.localappdata}\\Ubisoft Game Launcher\\games`,
    `${process.env.LOCALAPPDATA || process.env.localappdata}\\Ubisoft Connect\\games`,
    `${process.env.ProgramData || process.env.programdata}\\Ubisoft\\Ubisoft Game Launcher\\games`,
    `${process.env.ProgramData || process.env.programdata}\\Ubisoft Connect\\games`,
    `${process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'}\\Ubisoft\\Ubisoft Game Launcher\\games`,
    `${process.env.ProgramFiles || process.env.programfiles}\\Ubisoft\\Ubisoft Game Launcher\\games`,
    `${process.env.ProgramFiles || process.env.programfiles}\\Ubisoft\\games`,
    `${process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'}\\Ubisoft\\games`
  ];

  // Add drive-specific paths
  const activeDrives = getActiveDrives();
  activeDrives.forEach((drive) => {
    uplayPaths.push(`${drive}:\\Ubisoft`);
    uplayPaths.push(`${drive}:\\Games\\Ubisoft`);
    uplayPaths.push(`${drive}:\\Ubisoft Game Launcher\\games`);
    uplayPaths.push(`${drive}:\\Ubisoft Connect\\games`);
    uplayPaths.push(`${drive}:\\Games\\Ubisoft Connect`);
  });

  // Also check the main Ubisoft installation folder directly (for games like Far Cry 6)
  const mainUbisoftPaths = [
    `${process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'}\\Ubisoft`,
    `${process.env.ProgramFiles || process.env.programfiles}\\Ubisoft`
  ];

  uplayPaths.push(...mainUbisoftPaths);

  uplayPaths.forEach((basePath) => {
    if (!fs.existsSync(basePath)) return;

    safeReadDir(basePath).forEach((folder) => {
      if (isLikelyNonGameFolder(folder)) return;

      const gamePath = path.join(basePath, folder);
      if (!fs.existsSync(gamePath) || !fs.statSync(gamePath).isDirectory()) return;

      // Ubisoft games often have executables in subfolders like 'bin', 'bin_plus', etc.
      const executableSubfolders = ['bin', 'bin_plus', 'Bin', 'BinPlus', 'support', 'Support'];
      let foundExecutable = null;

      // First try direct executable in game folder
      const directExecutables = safeReadDir(gamePath).filter(file => 
        file.toLowerCase().endsWith('.exe') && 
        (file.toLowerCase().includes(folder.toLowerCase().replace(/\s+/g, '')) ||
         file.toLowerCase().includes('launcher') ||
         file.toLowerCase().includes('game'))
      );

      if (directExecutables.length > 0) {
        foundExecutable = path.join(gamePath, directExecutables[0]);
      } else {
        // Try subfolders
        for (const subfolder of executableSubfolders) {
          const subfolderPath = path.join(gamePath, subfolder);
          if (fs.existsSync(subfolderPath) && fs.statSync(subfolderPath).isDirectory()) {
            const subfolderExecutables = safeReadDir(subfolderPath).filter(file => 
              file.toLowerCase().endsWith('.exe')
            );
            if (subfolderExecutables.length > 0) {
              foundExecutable = path.join(subfolderPath, subfolderExecutables[0]);
              break;
            }
          }
        }
      }

      if (foundExecutable) {
        // Get genres from database for better Perfect Play recommendations
        const gameName = folder.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
        const detectedGenres = getGameGenres(gameName);
        
        games.push({
          name: gameName,
          platform: 'Uplay',
          genres: detectedGenres.length > 0 ? detectedGenres : ['Story-driven'],
          iconUrl: '',
          icon: '',
          executable: foundExecutable,
          executablePath: foundExecutable,
          installDir: gamePath,
          launchId: folder,
          ...createTrackedDefaults()
        });
        console.log('[Scanner] Added Ubisoft game:', gameName);
      }
    });
  });

  return games;
};

const scanFolderLibraries = (platform, paths, executableBuilder = null) => {
  const games = [];

  const maybeAddGame = (gamePath, folder) => {
    if (isLikelyNonGameFolder(folder)) return;
    if (isProtectedSystemPath(gamePath)) return;

    try {
      if (!fs.statSync(gamePath).isDirectory()) return;

      if (platform === 'EA') {
        const eaSkipFolders = ['EA Desktop', 'EA Core', 'Setup', 'Cache', 'Logs', 'Data', 'Temp'];
        if (eaSkipFolders.some(skip => folder.toLowerCase().includes(skip.toLowerCase()))) {
          return;
        }
      }

      const folderFiles = safeReadDir(gamePath);
      const hasExecutable = folderFiles.some(file =>
        file.toLowerCase().endsWith('.exe') ||
        file.toLowerCase().endsWith('.lnk') ||
        file.toLowerCase().includes('launch') ||
        file.toLowerCase().includes('run')
      );

      const detectedExecutablePath = findBestExecutablePath(gamePath, folder);
      const looksInstalled = looksLikeInstalledGameDirectory(gamePath, folder);

      const builtExecutableMeta = typeof executableBuilder === 'function'
        ? executableBuilder(gamePath, folder)
        : null;
      const builtExecutable = builtExecutableMeta && typeof builtExecutableMeta === 'object'
        ? builtExecutableMeta.executable
        : builtExecutableMeta;
      const extraMetadata = builtExecutableMeta && typeof builtExecutableMeta === 'object'
        ? builtExecutableMeta
        : {};
      const builtExecutablePath = builtExecutable?.startsWith('file://')
        ? builtExecutable.replace('file://', '')
        : builtExecutable;
      const builderExists = builtExecutablePath ? fs.existsSync(builtExecutablePath) : false;

      if (hasExecutable || builderExists || detectedExecutablePath || looksInstalled) {
        // Get genres from database for better Perfect Play recommendations
        const gameName = extraMetadata.name || folder;
        const detectedGenres = getGameGenres(gameName);
        
        games.push({
          name: gameName,
          platform,
          genres: detectedGenres.length > 0 ? detectedGenres : ['Story-driven'],
          iconUrl: '',
          icon: '',
          executable: builderExists ? builtExecutable : (detectedExecutablePath || builtExecutable || null),
          executablePath: detectedExecutablePath || (builderExists ? builtExecutablePath : null),
          installDir: gamePath,
          ...extraMetadata,
          ...createTrackedDefaults()
        });
      }
    } catch (error) {
    }
  };

  paths.forEach((rootPath) => {
    if (!fs.existsSync(rootPath)) return;
    if (isProtectedSystemPath(rootPath)) return;

    const rootFolderName = path.basename(rootPath);
    if (!isLikelyNonGameFolder(rootFolderName) && looksLikeInstalledGameDirectory(rootPath, rootFolderName)) {
      maybeAddGame(rootPath, rootFolderName);
    }

    safeReadDir(rootPath).forEach((folder) => {
      const gamePath = path.join(rootPath, folder);
      maybeAddGame(gamePath, folder);
    });
  });

  return games;
};

const scanBattleNetLibrary = () => {
  const games = [];
  const blizzardGames = [
    { name: 'StarCraft II', registryKey: 'StarCraft II', code: 'S2' },
    { name: 'Heroes of the Storm', registryKey: 'Heroes of the Storm', code: 'Hero' },
    { name: 'World of Warcraft', registryKey: 'World of Warcraft', code: 'WoW' },
    { name: 'Diablo III', registryKey: 'Diablo III', code: 'D3', aliases: ['Diablo 3'] },
    { name: 'Diablo IV', registryKey: 'Diablo IV', code: 'D4' },
    { name: 'Overwatch 2', registryKey: 'Overwatch 2', code: 'Pro' },
    { name: 'Call of Duty', registryKey: 'Call of Duty', code: 'COD' },
    { name: 'Warcraft III', registryKey: 'Warcraft III', code: 'W3' },
    { name: 'Warcraft I & II: Remastered', registryKey: 'Warcraft I & II Remastered', code: 'W1' },
    { name: 'Diablo II: Resurrected', registryKey: 'Diablo II Resurrected', code: 'OSI' },
    { name: 'Diablo Immortal', registryKey: 'Diablo Immortal', code: 'ANBS' }
  ];

  const knownBattleNetRoots = [];
  addUniqueValues(knownBattleNetRoots, [
    `${process.env.ProgramData || 'C:\\ProgramData'}\\Battle.net\\Agent`,
    `${process.env.ProgramData || 'C:\\ProgramData'}\\Battle.net`,
    `${process.env.ProgramFiles || 'C:\\Program Files'}\\Battle.net`,
    `${process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'}\\Battle.net`,
    `${process.env.Public || 'C:\\Users\\Public'}\\Games\\Battle.net`,
    `${process.env.Public || 'C:\\Users\\Public'}\\Games\\Blizzard`,
    `${process.env.ProgramFiles || 'C:\\Program Files'}\\Blizzard`,
    `${process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'}\\Blizzard`
  ]);

  getActiveDrives().forEach((drive) => {
    addUniqueValues(knownBattleNetRoots, [
      `${drive}:\\Battle.net`,
      `${drive}:\\Games\\Battle.net`,
      `${drive}:\\Blizzard`,
      `${drive}:\\Games\\Blizzard`,
      `${drive}:\\Diablo III`,
      `${drive}:\\Games\\Diablo III`,
      `${drive}:\\Diablo 3`,
      `${drive}:\\Games\\Diablo 3`,
      `${drive}:\\Program Files\\Battle.net`,
      `${drive}:\\Program Files (x86)\\Battle.net`
    ]);
  });

  blizzardGames.forEach((game) => {
    const registryLocations = [
      `HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Blizzard Entertainment\\${game.registryKey}`,
      `HKEY_LOCAL_MACHINE\\SOFTWARE\\Blizzard Entertainment\\${game.registryKey}`,
      `HKEY_CURRENT_USER\\SOFTWARE\\Blizzard Entertainment\\${game.registryKey}`
    ];

    let installDir = '';
    const foundRegistry = registryLocations.some((registryLocation) => {
      const registryOutput = runCommand(`reg query "${registryLocation}"`);
      if (!registryOutput.includes('HKEY_')) {
        return false;
      }
      installDir = queryRegistryValue(registryLocation, 'InstallPath') || queryRegistryValue(registryLocation, 'GamePath') || '';
      return true;
    });

    if (!installDir) {
      installDir = knownBattleNetRoots.find((rootPath) => {
        const normalizedRootName = normalizeScannerToken(path.basename(rootPath));
        return [game.name, game.registryKey, ...(game.aliases || [])].some((candidate) => {
          const normalizedCandidate = normalizeScannerToken(candidate);
          return normalizedRootName && (normalizedRootName.includes(normalizedCandidate) || normalizedCandidate.includes(normalizedRootName));
        });
      }) || '';
    }

    if (!foundRegistry && !installDir && !knownBattleNetRoots.some((rootPath) => fs.existsSync(path.join(rootPath, game.registryKey)))) {
      return;
    }

    // Get genres from database for better Perfect Play recommendations
    const detectedGenres = getGameGenres(game.name);
    
    addGameIfUnique(games, {
      name: game.name,
      platform: 'Battle.net',
      genres: detectedGenres.length > 0 ? detectedGenres : ['Story-driven'],
      iconUrl: '',
      icon: '',
      code: game.code,
      launchId: game.code,
      installDir: installDir || null,
      executablePath: installDir ? findPreferredExecutable(installDir, game.name) : null,
      executable: `"C:\\Program Files (x86)\\Battle.net\\Battle.net.exe" --exec="launch ${game.code}"`,
      ...createTrackedDefaults()
    });
  });

  knownBattleNetRoots.forEach((rootPath) => {
    collectNestedGameDirectories(rootPath, 2).forEach((folderPath) => {
      const folder = path.basename(folderPath);
      if (isLikelyNonGameFolder(folder) || !isLikelyBattleNetGameDirectory(folderPath, folder, blizzardGames)) {
        return;
      }

      try {
        if (!fs.statSync(folderPath).isDirectory()) {
          return;
        }

        const matchedKnownGame = blizzardGames.find((game) => (
          [game.name, game.registryKey, ...(game.aliases || [])].some((candidate) => {
            const normalizedCandidate = normalizeScannerToken(candidate);
            const normalizedFolder = normalizeScannerToken(folder);
            return normalizedFolder.includes(normalizedCandidate) || normalizedCandidate.includes(normalizedFolder);
          })
        ));

        // Get genres from database for better Perfect Play recommendations
        const gameName = matchedKnownGame?.name || folder;
        const detectedGenres = getGameGenres(gameName);
        
        addGameIfUnique(games, {
          name: gameName,
          platform: 'Battle.net',
          genres: detectedGenres.length > 0 ? detectedGenres : ['Story-driven'],
          iconUrl: '',
          icon: '',
          code: matchedKnownGame?.code || null,
          launchId: matchedKnownGame?.code || null,
          installDir: folderPath,
          executablePath: findPreferredExecutable(folderPath, folder),
          executable: matchedKnownGame?.code
            ? `"C:\\Program Files (x86)\\Battle.net\\Battle.net.exe" --exec="launch ${matchedKnownGame.code}"`
            : null,
          ...createTrackedDefaults()
        });
      } catch (error) {
      }
    });
  });

  return games;
};

const getUbisoftInstallRoots = () => {
  if (Array.isArray(scannerRuntimeCache.ubisoftInstallRoots)) {
    return scannerRuntimeCache.ubisoftInstallRoots;
  }

  const roots = [];
  const settingsCandidates = [
    `${process.env.LOCALAPPDATA || process.env.localappdata || ''}\\Ubisoft Game Launcher\\settings.yml`,
    `${process.env.LOCALAPPDATA || process.env.localappdata || ''}\\Ubisoft Connect\\settings.yml`
  ];

  settingsCandidates.forEach((settingsPath) => {
    if (!fs.existsSync(settingsPath)) {
      return;
    }

    try {
      const settingsContent = fs.readFileSync(settingsPath, 'utf8');
      const gameInstallPath = parseYamlScalar(settingsContent, 'game_installation_path');
      const installerCachePath = parseYamlScalar(settingsContent, 'installer_cache_path');
      addUniqueValues(roots, [gameInstallPath, installerCachePath]);
    } catch (error) {
    }
  });

  scannerRuntimeCache.ubisoftInstallRoots = roots;
  return roots;
};

const scanXboxLibrary = () => {
  const games = [];
  const xboxAumidMap = getXboxMap();
  const paths = [];

  getActiveDrives().forEach((drive) => {
    paths.push(`${drive}:\\XboxGames`);
    paths.push(`${drive}:\\Program Files\\ModifiableWindowsApps`);
    paths.push(`${drive}:\\ModifiableWindowsApps`);
  });

  paths.forEach((rootPath) => {
    if (!fs.existsSync(rootPath)) {
      return;
    }

    safeReadDir(rootPath).forEach((folder) => {
      const gamePath = path.join(rootPath, folder);
      try {
        if (!fs.statSync(gamePath).isDirectory() || folder.includes('GameSave') || folder.includes('Video') || isLikelyNonGameFolder(folder)) {
          return;
        }

        let aumid = xboxAumidMap[folder] || null;
        if (!aumid) {
          Object.entries(xboxAumidMap).some(([appName, appId]) => {
            if (appName.toLowerCase().includes(folder.toLowerCase()) || folder.toLowerCase().includes(appName.toLowerCase())) {
              aumid = appId;
              return true;
            }
            return false;
          });
        }

        games.push({
          name: folder,
          platform: 'Xbox',
          iconUrl: '',
          icon: '',
          aumid,
          executable: aumid ? `shell:AppsFolder\\${aumid}` : (findPreferredExecutable(gamePath, folder) || `${gamePath}\\${folder}.exe`),
          executablePath: findPreferredExecutable(gamePath, folder),
          installDir: gamePath,
          ...createTrackedDefaults()
        });
      } catch (error) {
        // Ignore inaccessible folders.
      }
    });
  });

  return games;
};

const scanEALibrary = () => {
  const paths = [
    `${process.env.ProgramData || 'C:\\ProgramData'}\\Origin\\LocalContent`,
    `${process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'}\\Origin Games`,
    `${process.env.ProgramFiles || 'C:\\Program Files'}\\EA Games`,
    `${process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'}\\EA Games`,
    `${process.env.ProgramData || 'C:\\ProgramData'}\\EA Desktop\\InstallData`,
    `${process.env.ProgramData || 'C:\\ProgramData'}\\Electronic Arts\\EA Desktop`,
    `${process.env.LOCALAPPDATA || process.env.localappdata || 'C:\\Users\\Public\\AppData\\Local'}\\Electronic Arts`,
    `${process.env.LOCALAPPDATA || process.env.localappdata || 'C:\\Users\\Public\\AppData\\Local'}\\EA Desktop`,
    `${process.env.ProgramFiles || 'C:\\Program Files'}\\Electronic Arts`,
    `${process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'}\\Electronic Arts`
  ];
  const explicitInstallRoots = [];

  addUniqueValues(explicitInstallRoots, [
    queryRegistryValue('HKLM\\SOFTWARE\\WOW6432Node\\Electronic Arts\\EA Desktop', 'Install Dir'),
    queryRegistryValue('HKLM\\SOFTWARE\\Electronic Arts\\EA Desktop', 'Install Dir'),
    queryRegistryValue('HKLM\\SOFTWARE\\WOW6432Node\\Origin', 'ClientPath'),
    queryRegistryValue('HKLM\\SOFTWARE\\Origin', 'ClientPath')
  ]);

  getActiveDrives().forEach((drive) => {
    paths.push(`${drive}:\\Games\\EA Games`);
    paths.push(`${drive}:\\Origin Games`);
    paths.push(`${drive}:\\EA Games`);
    paths.push(`${drive}:\\Games\\Origin`);
    paths.push(`${drive}:\\Games\\EA`);
    paths.push(`${drive}:\\Electronic Arts`);
    paths.push(`${drive}:\\Games\\Electronic Arts`);
    paths.push(`${drive}:\\Electronic Arts\\EA Desktop`);
    paths.push(`${drive}:\\Games\\Electronic Arts\\EA Desktop`);
  });

  explicitInstallRoots.forEach((installRoot) => {
    addUniquePath(paths, installRoot);
  });

  // EA Desktop stores manifests in InstallData.  Each sub-folder holds a *.mfst JSON file with an `installDir`.
  const eaGames = [];
  paths.forEach((eaPath) => {
    if (!fs.existsSync(eaPath)) return;

    safeReadDir(eaPath).forEach((folder) => {
      if (isLikelyNonGameFolder(folder)) return;
      const installDataPath = path.join(eaPath, folder);
      if (!fs.existsSync(installDataPath) || !fs.statSync(installDataPath).isDirectory()) return;

      // 1. Try executables directly in InstallData folder (Origin-era layout)
      const directExe = findBestExecutablePath(installDataPath, folder);
      if (directExe) {
        const displayName = folder.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
        eaGames.push({
          name: displayName,
          platform: 'EA',
          genres: getGameGenres(displayName) ?? ['Story-driven'],
          executable: directExe,
          executablePath: directExe,
          installDir: installDataPath,
          launchId: folder,
          ...createTrackedDefaults()
        });
        return; // done with this folder
      }

      // 2. EA App layout – read manifest to find real installDir
      const mfstFile = safeReadDir(installDataPath).find((f) => f.endsWith('.mfst'));
      if (!mfstFile) return;

      const manifest = safeReadJson(path.join(installDataPath, mfstFile));
      if (!manifest || !manifest.installDir) return;

      const realInstallDir = manifest.installDir;
      const displayName = manifest.displayName || manifest.productName || folder;
      const titleId = manifest.productId || manifest.titleId || folder;
      let resolvedExe = findBestExecutablePath(realInstallDir, path.basename(realInstallDir));
      if (!resolvedExe) {
        resolvedExe = findExecutableDeep(realInstallDir, 3);
        if (!resolvedExe) return;
      }

      eaGames.push({
        name: displayName,
        platform: 'EA',
        genres: getGameGenres(displayName) ?? ['Story-driven'],
        executable: resolvedExe,
        executablePath: resolvedExe,
        installDir: realInstallDir,
        launchId: titleId,
        ...createTrackedDefaults()
      });
    });
  });

  return eaGames;
};

const scanPlaystationLibrary = () => {
  const games = [];
  const paths = [
    `${process.env.LOCALAPPDATA || process.env.localappdata}\\PlayStation`,
    `${process.env.ProgramFiles || 'C:\\Program Files'}\\PlayStation PC LLC`,
    `${process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'}\\PlayStation PC LLC`
  ];

  getActiveDrives().forEach((drive) => {
    paths.push(`${drive}:\\Games\\PlayStation`);
  });

  const knownPsGames = [
    'God of War',
    'Marvel\'s Spider-Man Remastered',
    'Marvel\'s Spider-Man: Miles Morales',
    'Horizon Zero Dawn Complete Edition',
    'Days Gone',
    'Returnal',
    'The Last of Us Part I',
    'Uncharted: Legacy of Thieves Collection',
    'Ratchet & Clank: Rift Apart',
    'Sackboy: A Rift Apart',
    'Ghost of Tsushima Director\'s Cut',
    'HELLDIVERS 2'
  ];

  paths.forEach((rootPath) => {
    if (!fs.existsSync(rootPath)) return;

    safeReadDir(rootPath).forEach((folder) => {
      if (folder.toLowerCase().includes('base') || isLikelyNonGameFolder(folder)) return;

      const gamePath = path.join(rootPath, folder);
      try {
        if (!fs.statSync(gamePath).isDirectory()) return;

        // Check if it matches a known PS game or looks like a game
        const isKnown = knownPsGames.some((knownGame) => folder.includes(knownGame) || knownGame.includes(folder));
        const gameName = isKnown ? knownPsGames.find((knownGame) => folder.includes(knownGame) || knownGame.includes(folder)) || folder : folder;

        games.push({
          name: gameName,
          platform: 'PlayStation',
          iconUrl: '',
          icon: '',
          executable: null,
          ...createTrackedDefaults()
        });
      } catch (error) {
        // Ignore inaccessible folders
      }
    });
  });

  return games;
};

const scanRiotLibrary = () => {
  const games = [];
  const riotPaths = [];

  addUniqueValues(riotPaths, [
    `${process.env.LOCALAPPDATA || process.env.localappdata || ''}\\Riot Games`,
    `${process.env.ProgramFiles || 'C:\\Program Files'}\\Riot Games`,
    `${process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'}\\Riot Games`
  ]);

  getActiveDrives().forEach((drive) => {
    addUniquePath(riotPaths, `${drive}:\\Riot Games`);
    addUniquePath(riotPaths, `${drive}:\\Games\\Riot Games`);
  });

  riotPaths.forEach((rootPath) => {
    if (!fs.existsSync(rootPath)) return;

    safeReadDir(rootPath).forEach((folder) => {
      const gamePath = path.join(rootPath, folder);
      try {
        if (!fs.statSync(gamePath).isDirectory() || isLikelyNonGameFolder(folder) || folder.toLowerCase().includes('riot client')) {
          return;
        }

        let executable = '';
        let launchId = '';
        const normalizedFolder = folder.toLowerCase();

        if (normalizedFolder === 'valorant') {
          launchId = 'valorant';
          executable = `"${rootPath}\\Riot Client\\RiotClientServices.exe" --launch-product=valorant --launch-patchline=live`;
        } else if (normalizedFolder === 'league of legends') {
          launchId = 'league_of_legends';
          executable = `"${rootPath}\\Riot Client\\RiotClientServices.exe" --launch-product=league_of_legends --launch-patchline=live`;
        } else if (normalizedFolder === 'legends of runeterra') {
          launchId = 'bacon';
          executable = `"${rootPath}\\Riot Client\\RiotClientServices.exe" --launch-product=bacon --launch-patchline=live`;
        } else if (normalizedFolder === 'teamfight tactics') {
          launchId = 'tft';
          executable = `"${rootPath}\\Riot Client\\RiotClientServices.exe" --launch-product=tft --launch-patchline=live`;
        } else {
          launchId = normalizedFolder.replace(/\s+/g, '_');
          executable = `"${rootPath}\\Riot Client\\RiotClientServices.exe"`;
        }

        const alreadyExists = games.some((game) => game.launchId === launchId);
        if (alreadyExists) return;

        games.push({
          name: folder,
          platform: 'Riot',
          iconUrl: '',
          icon: '',
          executable,
          launchId,
          installDir: gamePath,
          ...createTrackedDefaults()
        });
      } catch (error) {
      }
    });
  });

  return games;
};

const scanCurseForgeLibrary = () => {
  const games = [];
  const instancePaths = [];

  addUniqueValues(instancePaths, [
    `${process.env.USERPROFILE || process.env.userprofile || ''}\\curseforge\\minecraft\\Instances`,
    `${process.env.USERPROFILE || process.env.userprofile || ''}\\CurseForge\\Minecraft\\Instances`,
    `${process.env.USERPROFILE || process.env.userprofile || ''}\\curseforge\\Instances`,
    `${process.env.USERPROFILE || process.env.userprofile || ''}\\Documents\\Curse\\Minecraft\\Instances`
  ]);

  instancePaths.forEach((instancesPath) => {
    safeReadDir(instancesPath).forEach((folder) => {
      const gamePath = path.join(instancesPath, folder);
      try {
        if (!fs.statSync(gamePath).isDirectory()) return;

        const minecraftInstance = safeReadJson(path.join(gamePath, 'minecraftinstance.json'));
        const instanceName = minecraftInstance?.name || minecraftInstance?.baseModLoader?.name || folder;
        const modpackId = minecraftInstance?.installedModpack?.thumbnailID || minecraftInstance?.projectID || 0;

        games.push({
          name: `Minecraft: ${instanceName}`,
          platform: 'CurseForge',
          iconUrl: '',
          icon: '',
          executable: `curseforge://core/PlayMinecraft?modpackId=${modpackId}`,
          installDir: gamePath,
          ...createTrackedDefaults()
        });
      } catch (error) {
      }
    });
  });

  return games;
};

const normalizeCapabilityState = (game = {}) => {
  const executable = String(game?.executable || '').trim();
  const executablePath = String(game?.executablePath || '').trim();
  const normalizedExecutable = executable.toLowerCase();
  const hasProtocolLaunch = /^[a-z]+:\/\//i.test(executable) || normalizedExecutable.startsWith('shell:');
  const hasLaunchId = Boolean(game?.launchId || game?.appid || game?.aumid || game?.code);
  const hasExecutablePath = Boolean(executablePath && fs.existsSync(executablePath));
  const hasInstallDir = Boolean(game?.installDir && fs.existsSync(game.installDir));

  let launchCapability = 'unverified';
  if (hasExecutablePath) {
    launchCapability = 'direct';
  } else if (hasProtocolLaunch || hasLaunchId) {
    launchCapability = 'launcher';
  } else if (hasInstallDir) {
    launchCapability = 'manual';
  }

  return {
    launchCapability,
    hasExecutablePath,
    hasInstallDir,
    hasLaunchId,
    hasProtocolLaunch,
    isLaunchReady: launchCapability === 'direct' || launchCapability === 'launcher'
  };
};

const enrichGameWithCollectionTrust = (game = {}) => ({
  ...game,
  collectionTrust: {
    sourcePlatform: game.platform || 'Unknown',
    hasName: Boolean(game.name),
    hasInstallDir: Boolean(game.installDir),
    hasExecutable: Boolean(game.executable || game.executablePath),
    status: 'detected'
  },
  capabilities: normalizeCapabilityState(game)
});

const buildPlatformStatusMap = (platformEntries = []) => {
  return platformEntries.reduce((accumulator, entry) => {
    const games = Array.isArray(entry?.games) ? entry.games : [];
    const debugPaths = Array.isArray(entry?.paths) ? entry.paths : [];
    const readyCount = games.filter((game) => game?.capabilities?.isLaunchReady).length;

    accumulator[entry.platform] = {
      key: entry.key,
      displayName: entry.platform,
      scanStatus: entry.error ? 'error' : (games.length > 0 ? 'found' : 'empty'),
      gameCount: games.length,
      launchReadyCount: readyCount,
      launchFallbackCount: games.length - readyCount,
      pathCount: debugPaths.length,
      paths: debugPaths,
      error: entry.error || null,
      lastScanAt: Date.now()
    };

    return accumulator;
  }, {});
};

const dedupeGames = (games) => {
  const seen = new Set();
  return games.filter((game) => {
    const key = [
      game.platform || 'Unknown',
      game.appid || '',
      game.launchId || game.code || game.aumid || '',
      game.installDir || '',
      game.name || ''
    ].join('::').toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const filterCrossPlatformDuplicates = (games) => {
  const platformPriority = {
    'Steam': 1,
    'Epic': 2,
    'GOG': 3,
    'Xbox': 4,
    'Battle.net': 5,
    'EA': 6,
    'Uplay': 7,
    'Rockstar': 8,
    'PlayStation': 9,
    'BSG': 10,
    'Riot': 11,
    'CurseForge': 12,
    'Amazon': 13,
    'Itch.io': 14
  };

  const gamesByName = new Map();

  games.forEach((game) => {
    const normalizedName = (game.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!normalizedName) return;

    const existing = gamesByName.get(normalizedName);
    const currentPriority = platformPriority[game.platform] || 99;
    const existingPriority = existing ? (platformPriority[existing.platform] || 99) : 99;

    if (!existing || currentPriority < existingPriority) {
      gamesByName.set(normalizedName, game);
    }
  });

  return games.filter((game) => {
    const normalizedName = (game.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const bestVersion = gamesByName.get(normalizedName);
    return bestVersion === game;
  });
};

const getBSGRegistryCandidates = () => {
  const candidates = [];
  const registryRoots = [
    'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall'
  ];

  registryRoots.forEach((registryRoot) => {
    const output = runCommand(`reg query "${registryRoot}" /s`);
    parseRegistryBlocks(output).forEach((block) => {
      const displayName = parseRegistryValueFromBlock(block, 'DisplayName');
      const publisher = parseRegistryValueFromBlock(block, 'Publisher');
      const installLocation = parseRegistryValueFromBlock(block, 'InstallLocation');
      const uninstallString = parseRegistryValueFromBlock(block, 'UninstallString');
      const normalizedBlock = `${displayName} ${publisher} ${installLocation} ${uninstallString}`.toLowerCase();

      if (!normalizedBlock.includes('battlestate') && !normalizedBlock.includes('tarkov')) {
        return;
      }

      [installLocation, uninstallString]
        .map((candidate) => String(candidate || '').trim().replace(/^"|"$/g, ''))
        .map((candidate) => candidate.endsWith('.exe') ? path.dirname(candidate) : candidate)
        .forEach((candidate) => addUniquePath(candidates, candidate));
    });
  });

  return candidates;
};

const findBSGLauncherPath = (installDir = '') => {
  const localAppDataPrograms = process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, 'Programs')
    : null;
  const launcherCandidates = [
    installDir ? path.join(installDir, 'BsgLauncher.exe') : null,
    installDir ? path.join(installDir, 'Launcher', 'BsgLauncher.exe') : null,
    installDir ? path.join(installDir, 'BsgLauncher', 'BsgLauncher.exe') : null,
    installDir ? path.join(installDir, '..', 'BsgLauncher', 'BsgLauncher.exe') : null,
    installDir ? path.join(installDir, '..', 'Launcher', 'BsgLauncher.exe') : null,
    'C:\\Battlestate Games\\BsgLauncher\\BsgLauncher.exe',
    'D:\\Battlestate Games\\BsgLauncher\\BsgLauncher.exe',
    'E:\\Battlestate Games\\BsgLauncher\\BsgLauncher.exe',
    'C:\\Program Files\\BsgLauncher\\BsgLauncher.exe',
    'C:\\Program Files (x86)\\BsgLauncher\\BsgLauncher.exe',
    localAppDataPrograms ? path.join(localAppDataPrograms, 'BsgLauncher', 'BsgLauncher.exe') : null,
    localAppDataPrograms ? path.join(localAppDataPrograms, 'Battlestate Games', 'BsgLauncher', 'BsgLauncher.exe') : null
  ].filter(Boolean);

  return launcherCandidates.find((candidate) => fs.existsSync(candidate)) || null;
};

const resolveTarkovInstallCandidate = (candidatePath) => {
  if (!candidatePath || !fs.existsSync(candidatePath)) {
    return null;
  }

  const directTarkovExe = path.join(candidatePath, 'EscapeFromTarkov.exe');
  const directBattleEyeExe = path.join(candidatePath, 'EscapeFromTarkov_BE.exe');
  const directArenaExe = path.join(candidatePath, 'EscapeFromTarkov_Arena.exe');
  if (fs.existsSync(directTarkovExe) || fs.existsSync(directBattleEyeExe) || fs.existsSync(directArenaExe)) {
    return candidatePath;
  }

  const childFolders = safeReadDir(candidatePath)
    .map((entry) => path.join(candidatePath, entry))
    .filter((entryPath) => {
      try {
        return fs.statSync(entryPath).isDirectory();
      } catch (error) {
        return false;
      }
    });

  return childFolders.find((childPath) => (
    fs.existsSync(path.join(childPath, 'EscapeFromTarkov.exe'))
    || fs.existsSync(path.join(childPath, 'EscapeFromTarkov_BE.exe'))
    || fs.existsSync(path.join(childPath, 'EscapeFromTarkov_Arena.exe'))
  )) || null;
};

const createBSGGame = (name, installDir, launcherPath) => {
  const detectedGenres = getGameGenres(name);
  const executablePath = findBSGLauncherPath(installDir) || launcherPath || path.join(installDir, 'EscapeFromTarkov_BE.exe');

  return {
    name,
    platform: 'BSG',
    brandPlatform: 'BSG',
    appid: normalizeScannerToken(name),
    launchId: normalizeScannerToken(name),
    genres: detectedGenres.length > 0 ? detectedGenres : ['Shooter'],
    iconUrl: '',
    icon: '',
    executable: executablePath,
    executablePath,
    installDir,
    ...createTrackedDefaults()
  };
};

const scanBSGLibrary = () => {
  const games = [];
  const candidateRoots = [];

  getBSGRegistryCandidates().forEach((candidate) => addUniquePath(candidateRoots, candidate));
  getActiveDrives().forEach((drive) => {
    [
      `${drive}:\\Battlestate Games`,
      `${drive}:\\Battlestate Games\\EFT`,
      `${drive}:\\Battlestate Games\\Escape from Tarkov`,
      `${drive}:\\Games\\Battlestate Games`,
      `${drive}:\\Games\\Escape from Tarkov`,
      `${drive}:\\Program Files\\Battlestate Games`,
      `${drive}:\\Program Files (x86)\\Battlestate Games`
    ].forEach((candidate) => addUniquePath(candidateRoots, candidate));
  });

  const launcherPath = findBSGLauncherPath();
  if (launcherPath) {
    addUniquePath(candidateRoots, path.dirname(launcherPath));
    addUniquePath(candidateRoots, path.join(path.dirname(launcherPath), '..'));
  }

  candidateRoots.forEach((candidateRoot) => {
    const installDir = resolveTarkovInstallCandidate(candidateRoot);
    if (!installDir) {
      return;
    }

    const hasArenaExecutable = fs.existsSync(path.join(installDir, 'EscapeFromTarkov_Arena.exe'));
    addGameIfUnique(games, createBSGGame(hasArenaExecutable ? 'Escape from Tarkov: Arena' : 'Escape from Tarkov', installDir, launcherPath));
  });

  return games;
};

const getSupportedScanPlatforms = (platform = process.platform) => platform === 'win32'
  ? ['steam', 'epic', 'gog', 'ea', 'uplay', 'battleNet', 'rockstar', 'xbox', 'playstation', 'bsg', 'riot', 'curseForge', 'amazon', 'itch']
  : ['steam'];

const safeRunPlatformScanner = (label, scanner) => {
  if (typeof scanner !== 'function') {
    console.warn(`[Scanner] ${label} scanner is unavailable.`);
    return [];
  }

  try {
    const result = scanner();
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error(`[Scanner] ${label} scan failed:`, error?.message || error);
    return [];
  }
};

const scanAllLibraries = async () => {
  scannerDebug('[Scanner] Starting scanAllLibraries...');

  if (getSupportedScanPlatforms().length === 1) {
    const steamGames = safeRunPlatformScanner('Steam', scanSteamLibraryNew || scanSteamLibrary)
      .map((game) => enrichGameWithCollectionTrust(game));
    const deduped = dedupeGames(filterCrossPlatformDuplicates(steamGames));
    global.lastScanDebug = {
      summary: {
        totalGamesBeforeDedupe: steamGames.length,
        totalGamesAfterCrossPlatformDedupe: deduped.length,
        totalGamesAfterDedupe: deduped.length,
        scannedPlatformCount: 1,
        successfulPlatformCount: deduped.length > 0 ? 1 : 0,
        emptyPlatformCount: deduped.length > 0 ? 0 : 1,
        errorPlatformCount: 0,
        lastScanAt: Date.now(),
      },
      activeDrives: [],
      paths: {},
      platformStatus: {
        steam: {
          platform: 'Steam',
          scanStatus: deduped.length > 0 ? 'found' : 'empty',
          gameCount: deduped.length,
        },
      },
      platformCounts: { steam: deduped.length },
      linuxBeta: true,
    };
    return deduped;
  }

  scannerDebug('[Scanner] Testing getGameGenres function...');
  try {
    const testGenres = getGameGenres('Escape from Tarkov');
    scannerDebug('[Scanner] getGameGenres test result:', testGenres);
  } catch (error) {
    scannerDebug('[Scanner] getGameGenres test failed:', error.message);
  }

  const activeDrives = getActiveDrives();

  const gogPaths = [
    `${process.env.LOCALAPPDATA || process.env.localappdata}\\GOG.com\\Galaxy\\storage\\games`
  ];
  activeDrives.forEach((drive) => {
    gogPaths.push(`${drive}:\\GOG Games`);
    gogPaths.push(`${drive}:\\Games\\GOG`);
    gogPaths.push(`${drive}:\\Program Files\\GOG Galaxy\\Games`);
    gogPaths.push(`${drive}:\\Program Files (x86)\\GOG Galaxy\\Games`);
  });

  const originPaths = [
    `${process.env.ProgramData || process.env.programdata}\\Origin\\LocalContent`,
    `${process.env['ProgramFiles(x86)']}\\Origin Games`,
    `${process.env.ProgramFiles || process.env.programfiles}\\EA Games`,
    `${process.env['ProgramFiles(x86)']}\\EA Games`,
    `${process.env.LOCALAPPDATA || process.env.localappdata}\\Electronic Arts\\EA Desktop`,
    `${process.env.ProgramFiles || process.env.programfiles}\\Electronic Arts\\EA Desktop`,
    `${process.env['ProgramFiles(x86)']}\\Electronic Arts\\EA Desktop`,
    `${process.env.ProgramData || process.env.programdata}\\Electronic Arts\\EA Desktop`
  ];
  activeDrives.forEach((drive) => {
    originPaths.push(`${drive}:\\Origin Games`);
    originPaths.push(`${drive}:\\Games\\Origin Games`);
    originPaths.push(`${drive}:\\EA Games`);
    originPaths.push(`${drive}:\\Games\\EA Games`);
    originPaths.push(`${drive}:\\Electronic Arts`);
    originPaths.push(`${drive}:\\Games\\Electronic Arts`);
    originPaths.push(`${drive}:\\Electronic Arts\\EA Desktop`);
    originPaths.push(`${drive}:\\Games\\Electronic Arts\\EA Desktop`);
  });

  const uplayPaths = [
    `${process.env.LOCALAPPDATA || process.env.localappdata}\\Ubisoft Game Launcher\\games`,
    `${process.env.LOCALAPPDATA || process.env.localappdata}\\Ubisoft Connect\\games`,
    `${process.env.ProgramData || process.env.programdata}\\Ubisoft\\Ubisoft Game Launcher\\games`,
    `${process.env.ProgramData || process.env.programdata}\\Ubisoft Connect\\games`,
    `${process.env['ProgramFiles(x86)']}\\Ubisoft\\Ubisoft Game Launcher\\games`,
    `${process.env.ProgramFiles || process.env.programfiles}\\Ubisoft\\Ubisoft Game Launcher\\games`,
    `${process.env.ProgramFiles || process.env.programfiles}\\Ubisoft\\games`,
    `${process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'}\\Ubisoft\\games`
  ];
  activeDrives.forEach((drive) => {
    uplayPaths.push(`${drive}:\\Ubisoft`);
    uplayPaths.push(`${drive}:\\Games\\Ubisoft`);
    uplayPaths.push(`${drive}:\\Ubisoft Game Launcher\\games`);
    uplayPaths.push(`${drive}:\\Ubisoft Connect\\games`);
    uplayPaths.push(`${drive}:\\Games\\Ubisoft Connect`);
  });

  scannerDebug('[Scanner] Resolving Ubisoft install roots...');
  getUbisoftInstallRoots().forEach((rootPath) => {
    addUniquePath(uplayPaths, rootPath);
    addUniquePath(uplayPaths, path.join(rootPath, 'games'));
  });

  const rockstarPaths = [
    `${process.env.ProgramFiles || process.env.programfiles}\\Rockstar Games`,
    `${process.env['ProgramFiles(x86)']}\\Rockstar Games`,
    `${process.env.ProgramData || process.env.programdata}\\Rockstar Games`,
    `${process.env.LOCALAPPDATA || process.env.localappdata}\\Rockstar Games`
  ];
  activeDrives.forEach((drive) => {
    rockstarPaths.push(`${drive}:\\Program Files\\Rockstar Games`);
    rockstarPaths.push(`${drive}:\\Program Files (x86)\\Rockstar Games`);
    rockstarPaths.push(`${drive}:\\Rockstar Games`);
    rockstarPaths.push(`${drive}:\\Games\\Rockstar Games`);
    rockstarPaths.push(`${drive}:\\Games\\Rockstar`);
  });

  scannerDebug('[Scanner] Active drives:', activeDrives);
  scannerDebug('[Scanner] GOG paths:', gogPaths);
  scannerDebug('[Scanner] Origin paths:', originPaths);
  scannerDebug('[Scanner] Uplay paths:', uplayPaths);
  scannerDebug('[Scanner] Rockstar paths:', rockstarPaths);

  const steamGames = safeRunPlatformScanner('Steam', scanSteamLibraryNew || scanSteamLibrary);
  scannerDebug('[Scanner] Steam found:', steamGames.length, 'games');
  
  const epicGames = safeRunPlatformScanner('Epic', scanEpicLibrary);
  scannerDebug('[Scanner] Epic found:', epicGames.length, 'games');
  
  const gogGames = safeRunPlatformScanner('GOG', scanGOGLibrary);
  scannerDebug('[Scanner] GOG found:', gogGames.length, 'games');
  
  const uplayGames = safeRunPlatformScanner('Uplay', scanUbisoftLibrary);
  const rockstarGames = safeRunPlatformScanner('Rockstar', scanRockstarLibraryNew);
  scannerDebug('[Scanner] Rockstar found:', rockstarGames.length, 'games');
  
  const eaGames = safeRunPlatformScanner('EA', scanEALibraryNew || scanEALibrary);
  scannerDebug(`[Scanner] EA found: ${eaGames.length} games`);

  const playstationGames = safeRunPlatformScanner('PlayStation', scanPlaystationLibrary);
  const battleNetGames = safeRunPlatformScanner('Battle.net', scanBattleNetLibrary);
  const xboxGames = safeRunPlatformScanner('Xbox', scanXboxLibrary);
  const bsgGames = safeRunPlatformScanner('BSG', scanBSGLibrary);
  const riotGames = safeRunPlatformScanner('Riot', scanRiotLibrary);
  const curseForgeGames = safeRunPlatformScanner('CurseForge', scanCurseForgeLibrary);
  const amazonGames = safeRunPlatformScanner('Amazon', scanAmazonLibraryNew);
  scannerDebug(`[Scanner] Amazon found: ${amazonGames.length} games`);
  const itchGames = safeRunPlatformScanner('Itch.io', scanItchLibraryNew);
  scannerDebug(`[Scanner] Itch.io found: ${itchGames.length} games`);

  const platformEntries = [
    { key: 'steam', platform: 'Steam', games: steamGames, paths: [] },
    { key: 'epic', platform: 'Epic', games: epicGames, paths: [] },
    { key: 'gog', platform: 'GOG', games: gogGames, paths: gogPaths },
    { key: 'ea', platform: 'EA', games: eaGames, paths: originPaths },
    { key: 'uplay', platform: 'Uplay', games: uplayGames, paths: uplayPaths },
    { key: 'battleNet', platform: 'Battle.net', games: battleNetGames, paths: [] },
    { key: 'rockstar', platform: 'Rockstar', games: rockstarGames, paths: rockstarPaths },
    { key: 'xbox', platform: 'Xbox', games: xboxGames, paths: [] },
    { key: 'playstation', platform: 'PlayStation', games: playstationGames, paths: [] },
    { key: 'bsg', platform: 'BSG', games: bsgGames, paths: [] },
    { key: 'riot', platform: 'Riot', games: riotGames, paths: [] },
    { key: 'curseForge', platform: 'CurseForge', games: curseForgeGames, paths: [] },
    { key: 'amazon', platform: 'Amazon', games: amazonGames, paths: [] },
    { key: 'itch', platform: 'Itch.io', games: itchGames, paths: [] }
  ];

  const games = [
    ...steamGames,
    ...epicGames,
    ...gogGames,
    ...eaGames,
    ...uplayGames,
    ...battleNetGames,
    ...rockstarGames,
    ...xboxGames,
    ...playstationGames,
    ...bsgGames,
    ...riotGames,
    ...curseForgeGames,
    ...amazonGames,
    ...itchGames
  ].map((game) => enrichGameWithCollectionTrust(game));

  scannerDebug('[Scanner] Total games before dedupe:', games.length);
  
  // First filter cross-platform duplicates (prefer Epic/Steam over Rockstar)
  const crossPlatformFiltered = filterCrossPlatformDuplicates(games);
  scannerDebug('[Scanner] After cross-platform dedupe:', crossPlatformFiltered.length);
  
  // Then dedupe within same platform
  const deduped = dedupeGames(crossPlatformFiltered);
  scannerDebug('[Scanner] Total games after dedupe:', deduped.length);

  // Apply GOG Galaxy playtime for any platforms the user has connected in GOG Galaxy
  try {
    const gogPlaytimeMap = await getGogGalaxyPlaytimeMap();
    const enriched = applyGogGalaxyPlaytime(deduped, gogPlaytimeMap);
    const gogEnrichedCount = enriched.filter((g) => g.playtimeSource === 'gog-galaxy').length;
    if (gogEnrichedCount > 0) {
      console.log(`[Scanner] GOG Galaxy playtime applied to ${gogEnrichedCount} games`);
    }
  } catch (error) {
    console.warn('[Scanner] GOG Galaxy playtime enrichment failed:', error.message);
  }

  // Store debug info globally so we can access it from renderer
  const platformStatus = buildPlatformStatusMap(platformEntries);
  const successfulPlatformCount = Object.values(platformStatus).filter((entry) => entry.scanStatus === 'found').length;
  const emptyPlatformCount = Object.values(platformStatus).filter((entry) => entry.scanStatus === 'empty').length;
  const errorPlatformCount = Object.values(platformStatus).filter((entry) => entry.scanStatus === 'error').length;

  global.lastScanDebug = {
    summary: {
      totalGamesBeforeDedupe: games.length,
      totalGamesAfterCrossPlatformDedupe: crossPlatformFiltered.length,
      totalGamesAfterDedupe: deduped.length,
      scannedPlatformCount: platformEntries.length,
      successfulPlatformCount,
      emptyPlatformCount,
      errorPlatformCount,
      lastScanAt: Date.now()
    },
    activeDrives,
    paths: {
      gog: gogPaths,
      origin: originPaths,
      uplay: uplayPaths,
      rockstar: rockstarPaths
    },
    platformStatus,
    platformCounts: {
      steam: steamGames.length,
      epic: epicGames.length,
      gog: gogGames.length,
      ea: eaGames.length,
      uplay: uplayGames.length,
      battleNet: battleNetGames.length,
      rockstar: rockstarGames.length,
      xbox: xboxGames.length,
      playstation: playstationGames.length,
      bsg: bsgGames.length,
      riot: riotGames.length,
      curseForge: curseForgeGames.length,
      amazon: amazonGames.length,
      itch: itchGames.length
    }
  };
  
  return deduped;
};

module.exports = {
  scanAllLibraries,
  getSupportedScanPlatforms
};
