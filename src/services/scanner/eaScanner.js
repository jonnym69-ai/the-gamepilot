const fs = require('fs');
const path = require('path');
const {
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

const scanEALibrary = () => {
  const paths = getEAInstallPaths();
  const eaGames = [];

  paths.forEach((eaPath) => {
    if (!fs.existsSync(eaPath)) return;

    safeReadDir(eaPath).forEach((folder) => {
      if (isLikelyNonGameFolder(folder)) return;
      const installDataPath = path.join(eaPath, folder);
      if (!fs.existsSync(installDataPath) || !fs.statSync(installDataPath).isDirectory()) return;

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
        return;
      }

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

module.exports = { scanEALibrary, getEAInstallPaths };
