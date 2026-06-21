const fs = require('fs');
const path = require('path');
const {
  runCommand,
  safeReadDir,
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
    if (!gameName) return [];
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
    return [];
  };
}

const queryRegistryValue = (registryKey, valueName) => {
  const output = runCommand(`reg query "${registryKey}" /v ${valueName}`);
  if (!output) return '';
  const match = output.match(new RegExp(`${valueName}\\s+REG_\\w+\\s+(.+)`));
  return match ? match[1].trim() : '';
};

const getItchInstallPaths = () => {
  const paths = [];

  // itch.io app data paths — butler database and game installs
  addUniquePath(paths, `${process.env.LOCALAPPDATA || process.env.localappdata}\\itch\\apps`);
  addUniquePath(paths, `${process.env.APPDATA || process.env.appdata}\\itch\\apps`);
  addUniquePath(paths, `${process.env.LOCALAPPDATA || process.env.localappdata}\\itch.io\\apps`);
  addUniquePath(paths, `${process.env.APPDATA || process.env.appdata}\\itch.io\\apps`);

  // itch butler database location (contains install records)
  addUniquePath(paths, `${process.env.LOCALAPPDATA || process.env.localappdata}\\itch\\db`);
  addUniquePath(paths, `${process.env.APPDATA || process.env.appdata}\\itch\\db`);

  // Common install locations
  getActiveDrives().forEach((drive) => {
    addUniquePath(paths, `${drive}:\\Program Files\\itch\\apps`);
    addUniquePath(paths, `${drive}:\\Program Files (x86)\\itch\\apps`);
    addUniquePath(paths, `${drive}:\\itch\\apps`);
    addUniquePath(paths, `${drive}:\\Games\\itch.io`);
    addUniquePath(paths, `${drive}:\\Games\\itch`);
  });

  // Registry-based discovery
  const registryRoots = [
    'HKLM\\SOFTWARE\\WOW6432Node\\itch.io',
    'HKLM\\SOFTWARE\\itch.io',
    'HKCU\\SOFTWARE\\itch.io',
    'HKLM\\SOFTWARE\\WOW6432Node\\itch',
    'HKLM\\SOFTWARE\\itch',
    'HKCU\\SOFTWARE\\itch'
  ];

  registryRoots.forEach((root) => {
    const installPath = queryRegistryValue(root, 'InstallPath');
    if (installPath) {
      addUniquePath(paths, path.join(installPath, 'apps'));
    }

    const libraryPath = queryRegistryValue(root, 'LibraryPath');
    if (libraryPath) {
      addUniquePath(paths, libraryPath);
    }
  });

  return paths;
};

const ITCH_SKIP_TOKENS = [
  'itch setup',
  'itch installer',
  'butler',
  'itch launcher',
  'itch.io launcher'
];

const isExcludedItchTitle = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return true;
  return ITCH_SKIP_TOKENS.some((token) => normalized === token || normalized.includes(token));
};

const scanItchLibrary = () => {
  const games = [];
  const installPaths = getItchInstallPaths();
  const seenInstallDirs = new Set();
  const seenGameNames = new Set();

  installPaths.forEach((libraryPath) => {
    if (!fs.existsSync(libraryPath)) return;

    safeReadDir(libraryPath).forEach((folder) => {
      if (isLikelyNonGameFolder(folder)) return;
      if (isExcludedItchTitle(folder)) return;

      const gamePath = path.join(libraryPath, folder);
      if (!fs.existsSync(gamePath)) return;
      if (!fs.statSync(gamePath).isDirectory()) return;

      const installDirKey = gamePath.toLowerCase();
      if (seenInstallDirs.has(installDirKey)) return;

      const displayName = folder.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
      if (isExcludedItchTitle(displayName)) return;
      if (seenGameNames.has(displayName.toLowerCase())) return;

      // itch.io games typically have an .itch folder with receipt.json for metadata
      let launchId = folder;
      let executablePath = null;

      // Check for .itch receipt
      const itchDir = path.join(gamePath, '.itch');
      if (fs.existsSync(itchDir) && fs.statSync(itchDir).isDirectory()) {
        const receiptPath = path.join(itchDir, 'receipt.json');
        if (fs.existsSync(receiptPath)) {
          try {
            const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
            if (receipt?.game?.title) {
              const receiptName = receipt.game.title.trim();
              if (!isExcludedItchTitle(receiptName) && !seenGameNames.has(receiptName.toLowerCase())) {
                // Use receipt title as display name if available
                // but keep folder for uniqueness tracking
              }
            }
            if (receipt?.game?.id) {
              launchId = String(receipt.game.id);
            }
          } catch (_) {
            // Ignore malformed receipt
          }
        }
      }

      // Try to find executable
      executablePath = findBestExecutablePath(gamePath, folder);
      if (!executablePath) {
        executablePath = findExecutableDeep(gamePath, 3);
      }

      seenInstallDirs.add(installDirKey);
      seenGameNames.add(displayName.toLowerCase());

      const detectedGenres = getGameGenres(displayName);

      games.push({
        name: displayName,
        platform: 'Itch.io',
        genres: detectedGenres.length > 0 ? detectedGenres : ['Indie'],
        iconUrl: '',
        icon: '',
        executable: executablePath || null,
        executablePath: executablePath || null,
        installDir: gamePath,
        launchId,
        ...createTrackedDefaults()
      });
    });
  });

  return games;
};

module.exports = { scanItchLibrary, getItchInstallPaths };
