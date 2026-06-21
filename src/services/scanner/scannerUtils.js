const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SHELL_COMMAND_TIMEOUT_MS = 4000;
const SCANNER_DEBUG = process.env.GAMEPILOT_SCANNER_DEBUG === 'true';

const scannerDebug = (...args) => {
  if (SCANNER_DEBUG) {
    console.log(...args);
  }
};

const runCommand = (command) => {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: SHELL_COMMAND_TIMEOUT_MS,
      windowsHide: true
    });
  } catch (error) {
    scannerDebug('[Scanner] Command failed:', command, error.message);
    return '';
  }
};

const safeReadDir = (targetPath) => {
  try {
    return fs.readdirSync(targetPath);
  } catch (error) {
    scannerDebug('[Scanner] Failed to read directory:', targetPath, error.message);
    return [];
  }
};

const safeReadJson = (targetPath) => {
  try {
    return JSON.parse(fs.readFileSync(targetPath, 'utf8'));
  } catch (error) {
    scannerDebug('[Scanner] Failed to read JSON:', targetPath, error.message);
    return null;
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

const queryRegistryValue = (registryKey, valueName) => {
  const output = runCommand(`reg query "${registryKey}" /v ${valueName}`);
  if (!output) return '';
  const match = output.match(new RegExp(`${valueName}\\s+REG_\\w+\\s+(.+)`));
  return match ? match[1].trim() : '';
};

const NON_GAME_FOLDER_TOKENS = [
  'launcher', 'launchers', 'social club', 'rockstar games launcher',
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
  } catch (error) {
    scannerDebug('[Scanner] Error checking game directory:', gamePath, error.message);
    return false;
  }
};

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
      } catch (e) {
        scannerDebug('[Scanner] Error walking:', entryPath, e.message);
      }
    });
  };

  walk(rootDir, maxDepth);
  return bestExe;
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
        console.error('[Scanner] Error collecting nested directories:', entryPath, error.message);
      }
    });
  };
  visit(rootPath, depth);
  return directories;
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

const addGameIfUnique = (games, game) => {
  if (!game?.name || !game?.platform) {
    return;
  }
  const exists = games.some((existingGame) => (
    existingGame.platform === game.platform
    && (
      (existingGame.appid && game.appid && String(existingGame.appid) === String(game.appid))
      || (existingGame.launchId && game.launchId && String(existingGame.launchId) === String(game.launchId))
      || (existingGame.aumid && game.aumid && String(existingGame.aumid) === String(game.aumid))
      || (existingGame.installDir && game.installDir && existingGame.installDir.toLowerCase() === game.installDir.toLowerCase())
      || existingGame.name.toLowerCase() === game.name.toLowerCase()
    )
  ));
  if (!exists) {
    games.push(game);
  }
};

// --- Steam playtime (localconfig.vdf) ---------------------------------------

/**
 * Minimal brace-aware VDF (Valve KeyValues) parser. Sufficient for reading
 * localconfig.vdf. Returns a nested plain object.
 */
const parseVdf = (text) => {
  let i = 0;
  const n = text.length;

  const skipWhitespace = () => {
    while (i < n) {
      const char = text[i];
      if (char === ' ' || char === '\t' || char === '\r' || char === '\n') {
        i += 1;
        continue;
      }
      // Skip // line comments
      if (char === '/' && text[i + 1] === '/') {
        while (i < n && text[i] !== '\n') i += 1;
        continue;
      }
      break;
    }
  };

  const parseString = () => {
    i += 1; // skip opening quote
    let value = '';
    while (i < n) {
      const char = text[i];
      if (char === '\\') {
        const next = text[i + 1];
        if (next === 'n') value += '\n';
        else if (next === 't') value += '\t';
        else value += next; // handles \\ and \"
        i += 2;
        continue;
      }
      if (char === '"') {
        i += 1;
        break;
      }
      value += char;
      i += 1;
    }
    return value;
  };

  const parseObject = () => {
    i += 1; // skip {
    const obj = {};
    while (i < n) {
      skipWhitespace();
      if (i >= n || text[i] === '}') {
        i += 1;
        break;
      }
      if (text[i] !== '"') {
        i += 1;
        continue;
      }
      const key = parseString();
      skipWhitespace();
      if (i < n && text[i] === '{') {
        obj[key] = parseObject();
      } else if (i < n && text[i] === '"') {
        obj[key] = parseString();
      } else {
        obj[key] = '';
      }
    }
    return obj;
  };

  const root = {};
  while (i < n) {
    skipWhitespace();
    if (i >= n) break;
    if (text[i] !== '"') {
      i += 1;
      continue;
    }
    const key = parseString();
    skipWhitespace();
    if (i < n && text[i] === '{') {
      root[key] = parseObject();
    } else if (i < n && text[i] === '"') {
      root[key] = parseString();
    } else {
      root[key] = '';
    }
  }
  return root;
};

const getCaseInsensitive = (obj, key) => {
  if (!obj || typeof obj !== 'object') return undefined;
  if (obj[key] !== undefined) return obj[key];
  const lowerKey = key.toLowerCase();
  for (const objectKey of Object.keys(obj)) {
    if (objectKey.toLowerCase() === lowerKey) return obj[objectKey];
  }
  return undefined;
};

/**
 * Reads real Steam playtime from each Steam account's localconfig.vdf.
 * No API key required — this is local data Steam already stores.
 *
 * @param {string[]} steamAppsPaths - Array of `...\\steamapps` paths (the
 *   Steam root is their parent directory, which contains `userdata`).
 * @returns {Object<string, {minutes:number, lastPlayedMs:(number|null)}>}
 *   Map keyed by Steam appid, aggregated across accounts (max wins).
 */
const getSteamPlaytimeMap = (steamAppsPaths = []) => {
  const playtimeMap = {};

  // Derive unique Steam roots (parent of steamapps) that hold a userdata dir.
  const roots = [];
  (Array.isArray(steamAppsPaths) ? steamAppsPaths : []).forEach((steamAppsPath) => {
    if (!steamAppsPath) return;
    const root = path.dirname(steamAppsPath);
    if (root && !roots.includes(root)) roots.push(root);
  });

  roots.forEach((root) => {
    const userdataPath = path.join(root, 'userdata');
    if (!fs.existsSync(userdataPath)) return;

    safeReadDir(userdataPath).forEach((accountId) => {
      const configPath = path.join(userdataPath, accountId, 'config', 'localconfig.vdf');
      if (!fs.existsSync(configPath)) return;

      let parsed;
      try {
        parsed = parseVdf(fs.readFileSync(configPath, 'utf8'));
      } catch (error) {
        scannerDebug('[Scanner] Failed to parse localconfig.vdf:', configPath, error.message);
        return;
      }

      const store = getCaseInsensitive(parsed, 'UserLocalConfigStore');
      const software = getCaseInsensitive(store, 'Software');
      const valve = getCaseInsensitive(software, 'Valve');
      const steam = getCaseInsensitive(valve, 'Steam');
      const apps = getCaseInsensitive(steam, 'apps');
      if (!apps || typeof apps !== 'object') return;

      Object.keys(apps).forEach((appId) => {
        const entry = apps[appId];
        if (!entry || typeof entry !== 'object') return;

        const minutes = parseInt(getCaseInsensitive(entry, 'Playtime'), 10) || 0;
        const lastPlayedSeconds = parseInt(getCaseInsensitive(entry, 'LastPlayed'), 10) || 0;
        if (minutes <= 0 && lastPlayedSeconds <= 0) return;

        const lastPlayedMs = lastPlayedSeconds > 0 ? lastPlayedSeconds * 1000 : null;
        const existing = playtimeMap[appId];
        if (!existing) {
          playtimeMap[appId] = { minutes, lastPlayedMs };
        } else {
          playtimeMap[appId] = {
            minutes: Math.max(existing.minutes, minutes),
            lastPlayedMs: Math.max(existing.lastPlayedMs || 0, lastPlayedMs || 0) || null
          };
        }
      });
    });
  });

  return playtimeMap;
};

const getActiveDrives = () => {
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
      scannerDebug('[Scanner] Failed to parse disk info:', error.message);
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

  return activeDrives;
};

module.exports = {
  runCommand,
  safeReadDir,
  safeReadJson,
  sanitizeScannedGameName,
  normalizeScannerToken,
  addUniquePath,
  queryRegistryValue,
  isLikelyNonGameFolder,
  isProtectedSystemPath,
  isLikelyGameExecutable,
  findPreferredExecutable,
  findBestExecutablePath,
  looksLikeInstalledGameDirectory,
  findExecutableDeep,
  collectNestedGameDirectories,
  createTrackedDefaults,
  addGameIfUnique,
  getActiveDrives,
  parseVdf,
  getSteamPlaytimeMap
};
