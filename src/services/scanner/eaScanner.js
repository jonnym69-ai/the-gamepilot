const fs = require('fs');
const path = require('path');
const {
  runCommand,
  safeReadDir,
  safeReadJson,
  addUniquePath,
  isLikelyNonGameFolder,
  findBestExecutablePath,
  findExecutableDeep,
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

const getEAInstallPaths = () => {
  const paths = [];
  const explicitInstallRoots = [];

  getActiveDrives().forEach((drive) => {
    paths.push(`${drive}:\\ProgramData\\Origin\\LocalContent`);
    paths.push(`${drive}:\\ProgramData\\Origin`);
    paths.push(`${drive}:\\ProgramData\\EA Desktop\\InstallData`);
    paths.push(`${drive}:\\ProgramData\\EA Desktop`);
    paths.push(`${drive}:\\ProgramData\\Electronic Arts\\EA Desktop\\InstallData`);
    paths.push(`${drive}:\\ProgramData\\Electronic Arts\\EA Desktop`);
    paths.push(`${drive}:\\Users\\Public\\Documents\\EA Games`);
    paths.push(`${drive}:\\Program Files\\Origin Games`);
    paths.push(`${drive}:\\Program Files (x86)\\Origin Games`);
    paths.push(`${drive}:\\Program Files\\EA Games`);
    paths.push(`${drive}:\\Program Files (x86)\\EA Games`);
    paths.push(`${drive}:\\Games\\Origin`);
    paths.push(`${drive}:\\Games\\EA`);
    paths.push(`${drive}:\\Electronic Arts`);
    paths.push(`${drive}:\\Games\\Electronic Arts`);
  });

  explicitInstallRoots.forEach((installRoot) => {
    addUniquePath(paths, installRoot);
  });

  return paths;
};

const EA_EXCLUDED_TITLE_TOKENS = [
  'battle.net',
  'blizzard',
  'diablo',
  'warcraft',
  'overwatch',
  'starcraft',
  'hearthstone',
  'heroes of the storm',
  'call of duty'
];

const isExcludedFromEA = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  return EA_EXCLUDED_TITLE_TOKENS.some((token) => normalized.includes(token));
};

const EA_FOREIGN_LIBRARY_PATH_TOKENS = [
  '\\steamapps\\common\\',
  '\\epic games\\',
  '\\gog galaxy\\games\\',
  '\\gog games\\',
  '\\ubisoft\\',
  '\\ubisoft game launcher\\',
  '\\ubisoft connect\\',
  '\\battle.net\\',
  '\\riot games\\',
  '\\xboxgames\\'
];

const EA_TOOL_EXECUTABLE_TOKENS = [
  'worldbuilder',
  'editor',
  'dedicatedserver',
  'server',
  'config',
  'settings',
  'benchmark',
  'tool'
];

const isLikelyForeignLauncherPath = (filePath) => {
  const normalized = String(filePath || '').replace(/\//g, '\\').trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  return EA_FOREIGN_LIBRARY_PATH_TOKENS.some((token) => normalized.includes(token));
};

const isLikelyToolExecutable = (filePath) => {
  const fileName = path.basename(String(filePath || '')).toLowerCase().replace(/\.exe$/, '');
  if (!fileName) {
    return true;
  }

  return EA_TOOL_EXECUTABLE_TOKENS.some((token) => fileName === token || fileName.includes(token));
};

const EA_SYSTEM_FOLDER_PATTERNS = [
  'program files', 'program files (x86)', 'windows', 'users', 'documents and settings',
  'appdata', 'application data', 'local settings', 'programdata', 'perflogs',
  'system volume', 'recycle.bin', '$recycle.bin'
];

const isEASystemPath = (filePath) => {
  const normalized = filePath.toLowerCase();
  return EA_SYSTEM_FOLDER_PATTERNS.some(pattern => normalized.includes(pattern));
};

const EA_BLOCKED_PATH_PATTERNS = [
  '\\windows',
  '\\perflogs',
  '\\$recycle.bin',
  '\\system volume information'
];

const isBlockedEAPath = (filePath) => {
  const normalized = String(filePath || '').replace(/\//g, '\\').trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return EA_BLOCKED_PATH_PATTERNS.some((pattern) => (
    normalized === pattern.slice(1)
    || normalized.endsWith(pattern)
    || normalized.includes(`${pattern}\\`)
  ));
};

const isValidEAInstallDirectory = (installDir) => {
  if (!installDir || !fs.existsSync(installDir) || isBlockedEAPath(installDir) || isExcludedFromEA(installDir)) {
    return false;
  }

  try {
    return fs.statSync(installDir).isDirectory();
  } catch (error) {
    return false;
  }
};

const normalizeEADisplayName = (value) => String(value || '')
  .replace(/_/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const getEAInstallDataRoots = () => {
  const roots = [];
  getActiveDrives().forEach((drive) => {
    addUniquePath(roots, `${drive}:\\ProgramData\\EA Desktop\\InstallData`);
    addUniquePath(roots, `${drive}:\\ProgramData\\Electronic Arts\\EA Desktop\\InstallData`);
    addUniquePath(roots, `${drive}:\\ProgramData\\Origin\\LocalContent`);
  });
  return roots;
};

const getEACandidateInstallFolders = (displayName) => {
  const candidates = [];
  const folderName = normalizeEADisplayName(displayName);
  if (!folderName) {
    return candidates;
  }

  getActiveDrives().forEach((drive) => {
    addUniquePath(candidates, `${drive}:\\${folderName}`);
    addUniquePath(candidates, `${drive}:\\EA Games\\${folderName}`);
    addUniquePath(candidates, `${drive}:\\Games\\EA\\${folderName}`);
    addUniquePath(candidates, `${drive}:\\Games\\EA Games\\${folderName}`);
    addUniquePath(candidates, `${drive}:\\Electronic Arts\\${folderName}`);
    addUniquePath(candidates, `${drive}:\\Games\\Electronic Arts\\${folderName}`);
    addUniquePath(candidates, `${drive}:\\Program Files\\EA Games\\${folderName}`);
    addUniquePath(candidates, `${drive}:\\Program Files (x86)\\EA Games\\${folderName}`);
  });

  return candidates;
};

const resolveEAInstallDataFolder = (displayName) => {
  const folderName = normalizeEADisplayName(displayName);
  if (!folderName || isLikelyNonGameFolder(folderName) || isExcludedFromEA(folderName)) {
    return null;
  }

  for (const candidateInstallDir of getEACandidateInstallFolders(folderName)) {
    if (!isValidEAInstallDirectory(candidateInstallDir) || isLikelyForeignLauncherPath(candidateInstallDir)) {
      continue;
    }

    const executablePath = findBestExecutablePath(candidateInstallDir, folderName) || findExecutableDeep(candidateInstallDir, 2);
    if (!executablePath || isBlockedEAPath(executablePath) || isExcludedFromEA(executablePath) || isLikelyToolExecutable(executablePath)) {
      continue;
    }

    return {
      displayName: folderName,
      executablePath,
      installDir: candidateInstallDir,
      titleId: folderName
    };
  }

  return null;
};

const EA_REGISTRY_ROOTS = [
  'HKLM\\SOFTWARE\\WOW6432Node\\Electronic Arts\\Electronic Arts',
  'HKLM\\SOFTWARE\\Electronic Arts\\Electronic Arts',
  'HKLM\\SOFTWARE\\WOW6432Node\\Electronic Arts',
  'HKLM\\SOFTWARE\\Electronic Arts'
];

const EA_REGISTRY_SKIP_TOKENS = [
  'ea desktop',
  'ea core',
  'eadm',
  'origin',
  'electronic arts'
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

const getEARegistryGames = () => {
  const registryGames = [];
  const seenInstallDirs = new Set();

  EA_REGISTRY_ROOTS.forEach((registryRoot) => {
    parseRegistryInstallEntries(registryRoot, 'InstallPath').forEach(({ registryKey, installDir }) => {
      const gameName = registryKey.split('\\').pop() || '';
      const normalizedGameName = gameName.toLowerCase();

      if (!gameName || EA_REGISTRY_SKIP_TOKENS.some((token) => normalizedGameName === token || normalizedGameName.includes(`${token}\\`))) {
        return;
      }

      if (!isValidEAInstallDirectory(installDir) || isLikelyForeignLauncherPath(installDir) || isExcludedFromEA(gameName)) {
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

      if (!executablePath || isBlockedEAPath(executablePath) || isExcludedFromEA(executablePath) || isLikelyToolExecutable(executablePath)) {
        return;
      }

      seenInstallDirs.add(installDirKey);
      registryGames.push({
        name: normalizeEADisplayName(gameName),
        platform: 'EA',
        genres: getGameGenres(gameName) ?? ['Story-driven'],
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

const createEAGame = ({ displayName, executablePath, installDir, titleId }) => ({
  name: normalizeEADisplayName(displayName),
  platform: 'EA',
  genres: getGameGenres(displayName) ?? ['Story-driven'],
  executable: executablePath,
  executablePath,
  installDir,
  launchId: titleId,
  ...createTrackedDefaults()
});

const scanEALibrary = () => {
  const paths = getEAInstallPaths();
  const eaGames = [];
  const foundGames = new Set();
  const seenInstallDirs = new Set();

  const addGame = (candidate) => {
    const displayName = normalizeEADisplayName(candidate.displayName);
    const installDir = candidate.installDir;
    const executablePath = candidate.executablePath;
    const titleId = candidate.titleId || displayName;

    if (!displayName || isExcludedFromEA(displayName) || isExcludedFromEA(titleId)) return false;
    if (!isValidEAInstallDirectory(installDir) || isLikelyForeignLauncherPath(installDir) || seenInstallDirs.has(installDir.toLowerCase())) return false;
    if (!executablePath || isBlockedEAPath(executablePath) || isExcludedFromEA(executablePath) || isLikelyToolExecutable(executablePath)) return false;
    if (foundGames.has(displayName.toLowerCase())) return false;

    foundGames.add(displayName.toLowerCase());
    seenInstallDirs.add(installDir.toLowerCase());
    eaGames.push(createEAGame({ displayName, executablePath, installDir, titleId }));
    return true;
  };

  paths.forEach((eaPath) => {
    if (!fs.existsSync(eaPath)) return;
    if (isBlockedEAPath(eaPath) || isExcludedFromEA(eaPath)) return;

    safeReadDir(eaPath).forEach((folder) => {
      if (isLikelyNonGameFolder(folder)) return;
      if (isEASystemPath(folder)) return;
      if (isExcludedFromEA(folder)) return;
      const installDataPath = path.join(eaPath, folder);
      if (!fs.existsSync(installDataPath)) return;
      if (isBlockedEAPath(installDataPath)) return;
      if (seenInstallDirs.has(installDataPath.toLowerCase())) return;
      
      const isDir = fs.statSync(installDataPath).isDirectory();
      if (!isDir) return;

      const directExe = findBestExecutablePath(installDataPath, folder);
      if (directExe && !isBlockedEAPath(directExe) && !isExcludedFromEA(directExe)) {
        addGame({
          displayName: folder,
          executablePath: directExe,
          installDir: installDataPath,
          titleId: folder
        });
        return;
      }

      const mfstFile = safeReadDir(installDataPath).find((f) => f.endsWith('.mfst'));
      if (!mfstFile) return;

      const manifest = safeReadJson(path.join(installDataPath, mfstFile));
      if (!manifest || !manifest.installDir) return;

      const realInstallDir = manifest.installDir;
      const displayName = manifest.displayName || manifest.productName || folder;
      const titleId = manifest.productId || manifest.titleId || folder;
      if (!isValidEAInstallDirectory(realInstallDir)) return;
      let resolvedExe = findBestExecutablePath(realInstallDir, displayName) || findBestExecutablePath(realInstallDir, path.basename(realInstallDir));
      if (!resolvedExe) {
        resolvedExe = findExecutableDeep(realInstallDir, 3);
        if (!resolvedExe) return;
      }
      
      addGame({
        displayName,
        executablePath: resolvedExe,
        installDir: realInstallDir,
        titleId
      });
    });
  });

  getEAInstallDataRoots().forEach((installDataRoot) => {
    safeReadDir(installDataRoot).forEach((folder) => {
      const resolvedGame = resolveEAInstallDataFolder(folder);
      if (resolvedGame) {
        addGame(resolvedGame);
      }
    });
  });

  getEARegistryGames().forEach((game) => {
    addGame({
      displayName: game.name,
      executablePath: game.executablePath || game.executable,
      installDir: game.installDir,
      titleId: game.launchId || game.name
    });
  });

  return eaGames;
};

module.exports = { scanEALibrary, getEAInstallPaths };
