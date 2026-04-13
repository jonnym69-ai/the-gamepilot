const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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
    console.error('[Scanner] Command failed:', command, error.message);
    return '';
  }
};

const safeReadDir = (targetPath) => {
  try {
    return fs.readdirSync(targetPath);
  } catch (error) {
    console.error('[Scanner] Failed to read directory:', targetPath, error.message);
    return [];
  }
};

const safeReadJson = (targetPath) => {
  try {
    return JSON.parse(fs.readFileSync(targetPath, 'utf8'));
  } catch (error) {
    console.error('[Scanner] Failed to read JSON:', targetPath, error.message);
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
    console.error('[Scanner] Error checking game directory:', gamePath, error.message);
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
        console.error('[Scanner] Error walking:', entryPath, e.message);
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
      console.error('[Scanner] Failed to parse disk info:', error.message);
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
  getActiveDrives
};
