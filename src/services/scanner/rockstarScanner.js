const fs = require('fs');
const path = require('path');
const {
  runCommand,
  safeReadDir,
  isLikelyNonGameFolder,
  findBestExecutablePath,
  findExecutableDeep,
  collectNestedGameDirectories,
  createTrackedDefaults,
  getActiveDrives
} = require('./scannerUtils');

let getGameGenres;
try {
  getGameGenres = require('../../GameGenreDatabase.js').getGameGenres;
} catch (error) {
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
    return ['Story-driven'];
  };
}

const getRockstarInstallPaths = () => {
  const paths = [];
  getActiveDrives().forEach((drive) => {
    paths.push(`${drive}:\\Program Files\\Rockstar Games`);
    paths.push(`${drive}:\\Program Files (x86)\\Rockstar Games`);
    paths.push(`${drive}:\\Rockstar Games`);
    paths.push(`${drive}:\\Games\\Rockstar Games`);
    paths.push(`${drive}:\\Games\\Rockstar`);
  });
  paths.push(`${process.env.LOCALAPPDATA || ''}\\Rockstar Games`);
  
  // Also check specific known Rockstar game locations
  getActiveDrives().forEach((drive) => {
    paths.push(`${drive}:\\Red Dead Redemption 2`);
    paths.push(`${drive}:\\RDR 2`);
    paths.push(`${drive}:\\Games\\Red Dead Redemption 2`);
  });
  
  return paths.filter(Boolean);
};

const SYSTEM_FOLDER_PATTERNS = [
  'program files', 'program files (x86)', 'windows', 'users', 'documents and settings',
  'appdata', 'application data', 'local settings', 'programdata', 'perflogs',
  'system volume', 'recycle.bin', '$recycle.bin'
];

const isSystemPath = (filePath) => {
  const normalized = filePath.toLowerCase();
  return SYSTEM_FOLDER_PATTERNS.some(pattern => normalized.includes(pattern));
};

const ROCKSTAR_BLOCKED_PATH_PATTERNS = [
  '\\windows',
  '\\perflogs',
  '\\$recycle.bin',
  '\\system volume information'
];

const isBlockedRockstarPath = (filePath) => {
  const normalized = String(filePath || '').replace(/\//g, '\\').trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return ROCKSTAR_BLOCKED_PATH_PATTERNS.some((pattern) => (
    normalized === pattern.slice(1)
    || normalized.endsWith(pattern)
    || normalized.includes(`${pattern}\\`)
  ));
};

const ROCKSTAR_REGISTRY_ROOTS = [
  'HKLM\\SOFTWARE\\WOW6432Node\\Rockstar Games',
  'HKLM\\SOFTWARE\\Rockstar Games'
];

const ROCKSTAR_REGISTRY_SKIP_TOKENS = [
  'launcher',
  'social club'
];

const parseRegistryInstallEntries = (registryRoot, valueName) => {
  const output = runCommand(`reg query "${registryRoot}" /s /v ${valueName}`);
  if (!output || !output.includes('HKEY_')) {
    return [];
  }

  const entries = [];
  let currentKey = '';
  output.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }

    if (trimmed.startsWith('HKEY_')) {
      currentKey = trimmed;
      return;
    }

    const match = trimmed.match(new RegExp(`^${valueName}\\s+REG_\\w+\\s+(.+)$`, 'i'));
    if (match && currentKey) {
      entries.push({
        registryKey: currentKey,
        installDir: match[1].trim()
      });
    }
  });

  return entries;
};

const getRockstarRegistryGames = () => {
  const registryGames = [];
  const seenInstallDirs = new Set();

  ROCKSTAR_REGISTRY_ROOTS.forEach((registryRoot) => {
    parseRegistryInstallEntries(registryRoot, 'InstallFolder').forEach(({ registryKey, installDir }) => {
      const gameName = registryKey.split('\\').pop() || '';
      const normalizedGameName = gameName.toLowerCase();

      if (!gameName || ROCKSTAR_REGISTRY_SKIP_TOKENS.some((token) => normalizedGameName.includes(token))) {
        return;
      }

      if (!installDir || !fs.existsSync(installDir) || isBlockedRockstarPath(installDir)) {
        return;
      }

      const installDirKey = installDir.toLowerCase();
      if (seenInstallDirs.has(installDirKey)) {
        return;
      }

      let executablePath = findBestExecutablePath(installDir, gameName);
      if (!executablePath) {
        executablePath = findExecutableDeep(installDir, 4);
      }

      if (!executablePath || isBlockedRockstarPath(executablePath)) {
        return;
      }

      seenInstallDirs.add(installDirKey);
      registryGames.push({
        name: gameName.replace(/_/g, ' ').replace(/\s+/g, ' ').trim(),
        platform: 'Rockstar',
        genres: getGameGenres(gameName).length > 0 ? getGameGenres(gameName) : ['Story-driven'],
        iconUrl: '',
        icon: '',
        executable: executablePath,
        executablePath,
        installDir,
        launchId: gameName,
        ...createTrackedDefaults()
      });
    });
  });

  return registryGames;
};

const scanRockstarLibrary = () => {
  const rockstarPaths = getRockstarInstallPaths();
  const rockstarGames = getRockstarRegistryGames();
  const seenInstallDirs = new Set(rockstarGames.map((game) => game.installDir.toLowerCase()));

  rockstarPaths.forEach((rockstarPath) => {
    if (!fs.existsSync(rockstarPath)) return;
    if (isBlockedRockstarPath(rockstarPath)) return;

    const rockstarContents = safeReadDir(rockstarPath);
    rockstarContents.forEach((folder) => {
      if (isLikelyNonGameFolder(folder)) return;
      if (folder.toLowerCase().includes('launcher') || folder.toLowerCase().includes('social club')) return;
      if (isSystemPath(folder)) return;

      const gamePath = path.join(rockstarPath, folder);
      try {
        if (isBlockedRockstarPath(gamePath)) return;
        if (!fs.statSync(gamePath).isDirectory()) return;
        if (seenInstallDirs.has(gamePath.toLowerCase())) return;

        let executablePath = findBestExecutablePath(gamePath, folder);
        if (!executablePath) {
          const deeperDirs = collectNestedGameDirectories(gamePath, 1);
          for (const subDir of deeperDirs) {
            executablePath = findBestExecutablePath(subDir, path.basename(subDir));
            if (executablePath) break;
          }
        }
        if (!executablePath) {
          executablePath = findExecutableDeep(gamePath, 3);
        }
        if (executablePath && !isBlockedRockstarPath(executablePath)) {
          seenInstallDirs.add(gamePath.toLowerCase());
          rockstarGames.push({
            name: folder.replace(/_/g, ' ').replace(/\s+/g, ' ').trim(),
            platform: 'Rockstar',
            genres: getGameGenres(folder).length > 0 ? getGameGenres(folder) : ['Story-driven'],
            iconUrl: '',
            icon: '',
            executable: executablePath,
            executablePath: executablePath,
            installDir: gamePath,
            launchId: folder,
            ...createTrackedDefaults()
          });
        }
      } catch (error) {
        console.error('[Scanner] Error scanning Rockstar game:', folder, error.message);
      }
    });
  });

  return rockstarGames;
};

module.exports = { scanRockstarLibrary, getRockstarInstallPaths };
