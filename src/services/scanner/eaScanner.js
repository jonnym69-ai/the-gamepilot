const fs = require('fs');
const path = require('path');
const {
  safeReadDir,
  safeReadJson,
  addUniquePath,
  isLikelyNonGameFolder,
  isProtectedSystemPath,
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
    paths.push(`${drive}:\\ProgramData\\Origin`);
    paths.push(`${drive}:\\ProgramData\\EA Desktop`);
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

const KNOWN_EA_EXECUTABLES = {
  'FIFA 20': 'FIFA20.exe',
  'FIFA 21': 'FIFA21.exe',
  'FIFA 22': 'FIFA22.exe',
  'FIFA 23': 'FIFA23.exe',
  'Skate': 'Skate.exe',
  'Battlefield 1': 'BF1.exe',
  'Battlefield 4': 'BF4.exe',
  'Battlefield V': 'BFV.exe',
  'Battlefield 2042': 'BF2042.exe',
  'Apex Legends': 'r5apex.exe',
  'The Sims 4': 'Game/bin/TS4.exe',
  'NHL 20': 'nhl20.exe',
  'NHL 21': 'nhl21.exe',
  'Madden NFL 20': 'madden20.exe',
  'Madden NFL 21': 'madden21.exe',
  'Star Wars Jedi: Fallen Order': 'StarWarsJediFallenOrder.exe',
  'Medal of Honor Above and Beyond': 'mohaab.exe'
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

const scanEALibrary = () => {
  const paths = getEAInstallPaths();
  const eaGames = [];
  const foundGames = new Set();

  paths.forEach((eaPath) => {
    if (!fs.existsSync(eaPath)) return;
    if (isProtectedSystemPath(eaPath) || isEASystemPath(eaPath) || isExcludedFromEA(eaPath)) return;

    safeReadDir(eaPath).forEach((folder) => {
      if (isLikelyNonGameFolder(folder)) return;
      if (isEASystemPath(folder)) return;
      if (isExcludedFromEA(folder)) return;
      const installDataPath = path.join(eaPath, folder);
      if (!fs.existsSync(installDataPath)) return;
      if (isProtectedSystemPath(installDataPath)) return;
      
      const isDir = fs.statSync(installDataPath).isDirectory();
      if (!isDir) return;

      const directExe = findBestExecutablePath(installDataPath, folder);
      if (directExe && !isEASystemPath(directExe) && !isExcludedFromEA(directExe)) {
        const displayName = folder.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
        if (isExcludedFromEA(displayName)) return;
        if (foundGames.has(displayName.toLowerCase())) return;
        foundGames.add(displayName.toLowerCase());
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
        return;
      }

      const mfstFile = safeReadDir(installDataPath).find((f) => f.endsWith('.mfst'));
      if (!mfstFile) return;

      const manifest = safeReadJson(path.join(installDataPath, mfstFile));
      if (!manifest || !manifest.installDir) return;

      const realInstallDir = manifest.installDir;
      const displayName = manifest.displayName || manifest.productName || folder;
      const titleId = manifest.productId || manifest.titleId || folder;
      if (isProtectedSystemPath(realInstallDir) || isExcludedFromEA(realInstallDir) || isExcludedFromEA(displayName) || isExcludedFromEA(titleId)) return;
      let resolvedExe = findBestExecutablePath(realInstallDir, path.basename(realInstallDir));
      if (!resolvedExe) {
        resolvedExe = findExecutableDeep(realInstallDir, 3);
        if (!resolvedExe) return;
      }
      
      if (isEASystemPath(resolvedExe) || isExcludedFromEA(resolvedExe)) return;
      if (foundGames.has(displayName.toLowerCase())) return;
      foundGames.add(displayName.toLowerCase());

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

module.exports = { scanEALibrary, getEAInstallPaths };
