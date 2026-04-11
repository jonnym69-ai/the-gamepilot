const fs = require('fs');
const path = require('path');
const {
  safeReadDir,
  addUniquePath,
  queryRegistryValue,
  isLikelyNonGameFolder,
  createTrackedDefaults,
  addGameIfUnique,
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
    console.error('[Scanner] Failed to parse libraryfolders.vdf:', error.message);
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

  steamPaths.forEach((steamPath) => {
    if (!fs.existsSync(steamPath)) return;

    const files = safeReadDir(steamPath);
    const acfFiles = files.filter((fileName) => fileName.endsWith('.acf'));

    acfFiles.forEach((acfFile) => {
      try {
        const content = fs.readFileSync(path.join(steamPath, acfFile), 'utf8');
        const nameMatch = content.match(/"name"\s+"([^"]+)"/);
        const appIdMatch = content.match(/"appid"\s+"(\d+)"/);

        if (!nameMatch || !appIdMatch) return;

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
          return;
        }

        const detectedGenres = getGameGenres(gameName);
        const gamePath = path.join(steamPath, 'common', gameName);

        addGameIfUnique(games, {
          name: gameName,
          platform: 'Steam',
          appid: appId,
          genres: detectedGenres.length > 0 ? detectedGenres : ['Story-driven'],
          iconUrl: `https://steamcdn-a.akamaihd.net/steam/apps/${appId}/header.jpg`,
          icon: '',
          executablePath: gamePath,
          installDir: gamePath,
          launchId: appId,
          ...createTrackedDefaults()
        });
      } catch (error) {
        console.error('[Scanner] Error parsing ACF file:', acfFile, error.message);
      }
    });
  });

  return games;
};

module.exports = { scanSteamLibrary, getSteamInstallPaths };
