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

const getAmazonInstallPaths = () => {
  const paths = [];

  // Amazon Games app data paths
  addUniquePath(paths, `${process.env.LOCALAPPDATA || process.env.localappdata}\\Amazon Games\\Data\\Games`);
  addUniquePath(paths, `${process.env.LOCALAPPDATA || process.env.localappdata}\\Amazon Games\\Library`);
  addUniquePath(paths, `${process.env.APPDATA || process.env.appdata}\\Amazon Games\\Data\\Games`);

  // Common install locations
  getActiveDrives().forEach((drive) => {
    addUniquePath(paths, `${drive}:\\Program Files\\Amazon Games\\Library`);
    addUniquePath(paths, `${drive}:\\Program Files (x86)\\Amazon Games\\Library`);
    addUniquePath(paths, `${drive}:\\Amazon Games\\Library`);
    addUniquePath(paths, `${drive}:\\Games\\Amazon`);
    addUniquePath(paths, `${drive}:\\Amazon Games`);
  });

  // Registry-based discovery
  const registryRoots = [
    'HKLM\\SOFTWARE\\WOW6432Node\\Amazon Games',
    'HKLM\\SOFTWARE\\Amazon Games',
    'HKCU\\SOFTWARE\\Amazon Games'
  ];

  registryRoots.forEach((root) => {
    const installPath = queryRegistryValue(root, 'InstallPath');
    if (installPath) {
      addUniquePath(paths, path.join(installPath, 'Library'));
      addUniquePath(paths, path.join(installPath, 'Data', 'Games'));
    }

    const libraryPath = queryRegistryValue(root, 'LibraryPath');
    if (libraryPath) {
      addUniquePath(paths, libraryPath);
    }
  });

  return paths;
};

const parseAmazonGameManifest = (manifestPath) => {
  try {
    const content = fs.readFileSync(manifestPath, 'utf8');
    // Amazon manifests are typically JSON
    const manifest = JSON.parse(content);
    return manifest;
  } catch (error) {
    // Fallback: try to parse as loose JSON or key-value pairs
    try {
      const content = fs.readFileSync(manifestPath, 'utf8');
      const lines = content.split(/\r?\n/);
      const manifest = {};
      lines.forEach((line) => {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.slice(0, colonIndex).trim().replace(/^["']|["']$/g, '');
          const value = line.slice(colonIndex + 1).trim().replace(/^["']|["']$/g, '');
          manifest[key] = value;
        }
      });
      return manifest;
    } catch (_) {
      return null;
    }
  }
};

const AMAZON_SKIP_TOKENS = [
  'amazon games app',
  'amazon games launcher',
  'twitch app',
  'twitch launcher',
  'setup',
  'installer',
  'redistributable'
];

const isExcludedAmazonTitle = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return true;
  return AMAZON_SKIP_TOKENS.some((token) => normalized === token || normalized.includes(token));
};

const scanAmazonLibrary = () => {
  const games = [];
  const installPaths = getAmazonInstallPaths();
  const seenInstallDirs = new Set();
  const seenGameNames = new Set();

  installPaths.forEach((libraryPath) => {
    if (!fs.existsSync(libraryPath)) return;

    safeReadDir(libraryPath).forEach((folder) => {
      if (isLikelyNonGameFolder(folder)) return;
      if (isExcludedAmazonTitle(folder)) return;

      const gamePath = path.join(libraryPath, folder);
      if (!fs.existsSync(gamePath)) return;
      if (!fs.statSync(gamePath).isDirectory()) return;

      const installDirKey = gamePath.toLowerCase();
      if (seenInstallDirs.has(installDirKey)) return;

      const displayName = folder.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
      if (isExcludedAmazonTitle(displayName)) return;
      if (seenGameNames.has(displayName.toLowerCase())) return;

      // Look for Amazon manifest files
      const manifestFiles = safeReadDir(gamePath).filter((f) =>
        f.toLowerCase().endsWith('.json') ||
        f.toLowerCase().endsWith('.manifest') ||
        f.toLowerCase().endsWith('.amz')
      );

      let launchId = folder;
      let executablePath = null;

      // Try to find executable
      executablePath = findBestExecutablePath(gamePath, folder);
      if (!executablePath) {
        executablePath = findExecutableDeep(gamePath, 3);
      }

      // Parse manifest for better metadata if available
      manifestFiles.forEach((manifestFile) => {
        const manifestPath = path.join(gamePath, manifestFile);
        const manifest = parseAmazonGameManifest(manifestPath);
        if (manifest) {
          if (manifest.id || manifest.gameId || manifest.productId) {
            launchId = manifest.id || manifest.gameId || manifest.productId;
          }
          if (manifest.name || manifest.title || manifest.displayName) {
            const manifestName = manifest.name || manifest.title || manifest.displayName;
            if (!isExcludedAmazonTitle(manifestName) && !seenGameNames.has(manifestName.toLowerCase())) {
              // Update display name from manifest
              // But we'll use the folder name for consistency
            }
          }
        }
      });

      seenInstallDirs.add(installDirKey);
      seenGameNames.add(displayName.toLowerCase());

      const detectedGenres = getGameGenres(displayName);

      games.push({
        name: displayName,
        platform: 'Amazon',
        genres: detectedGenres.length > 0 ? detectedGenres : [],
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

module.exports = { scanAmazonLibrary, getAmazonInstallPaths };
