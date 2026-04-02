const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

const parseYamlScalar = (content, key) => {
  const match = String(content || '').match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  if (!match) return '';
  return match[1].trim().replace(/^['"]|['"]$/g, '');
};

const findDirectoryByNameHints = (rootPath, hints = []) => {
  if (!rootPath || !fs.existsSync(rootPath)) {
    return '';
  }

  const normalizedHints = hints
    .map((hint) => normalizeScannerToken(String(hint || '').trim()))
    .filter(Boolean);

  for (const folder of safeReadDir(rootPath)) {
    const folderPath = path.join(rootPath, folder);
    try {
      if (!fs.statSync(folderPath).isDirectory()) {
        continue;
      }

      const normalizedFolder = normalizeScannerToken(folder);
      if (normalizedHints.some((hint) => normalizedFolder.includes(hint) || hint.includes(normalizedFolder))) {
        return folderPath;
      }
    } catch (error) {
    }
  }

  return '';
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

const NON_GAME_FOLDER_TOKENS = [
  'launcher', 'launchers', 'social club', 'rockstar games launcher',
  'commonredist', 'redistributables', 'redistributable', 'installer',
  'installers', 'prerequisite', 'prerequisites', 'prereq', 'support',
  'tools', 'tool', 'cache', 'logs', 'log', 'updater', 'updates',
  'runtime', 'service', 'services', 'setup', 'uninstall', 'uninstaller',
  'bonus content', 'soundtrack', 'artbook', 'directx', 'vcredist', 'dotnet',
  'engine', 'sdk', 'launcherdata', 'anticheat', 'easyanticheat', 'eac', 'beclient',
  'games', 'game', 'battleye', 'battlEye', 'escapefromtarkov_data', 'eft_data', 'data'
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
        } catch (error) {
          return false;
        }
      });

    if (nestedDirectories.some((entryPath) => findPreferredExecutable(entryPath, path.basename(entryPath)))) {
      return true;
    }

    return false;
  } catch (error) {
    return false;
  }
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
    console.log(`[Scanner] Found active drive: ${drive}:`);
  });
  console.log('[Scanner] Active drives found:', activeDrives);
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
  console.log('[Scanner] Steam paths found:', steamPaths);

  steamPaths.forEach((steamPath) => {
    console.log('[Scanner] Checking Steam path:', steamPath);
    if (!fs.existsSync(steamPath)) {
      console.log('[Scanner] Path does not exist:', steamPath);
      return;
    }
    
    const files = safeReadDir(steamPath);
    console.log('[Scanner] Files in path:', files.length);
    
    const acfFiles = files.filter((fileName) => fileName.endsWith('.acf'));
    console.log('[Scanner] ACF files found:', acfFiles.length);
    
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
          console.log('[Scanner] Skipping non-game:', gameName);
          return;
        }

        games.push({
          name: gameName,
          platform: 'Steam',
          appid: appId,
          iconUrl: `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/capsule_231x87.jpg`,
          icon: '',
          executable: `steam://run/${appId}`,
          ...createTrackedDefaults()
        });
        console.log('[Scanner] Added Steam game:', gameName);
      } catch (error) {
        console.error('[Scanner] Error parsing ACF:', acfFile, error);
      }
    });
  });

  console.log('[Scanner] Steam scan complete. Found', games.length, 'games');
  return games;
};


const scanEpicLibrary = () => {
  const games = [];
  const paths = [];

  [
    queryRegistryValue('HKLM\\SOFTWARE\\Epic Games\\EpicGamesLauncher', 'AppDataPath'),
    queryRegistryValue('HKLM\\SOFTWARE\\WOW6432Node\\Epic Games\\EpicGamesLauncher', 'AppDataPath'),
    queryRegistryValue('HKCU\\SOFTWARE\\Epic Games\\EpicGamesLauncher', 'AppDataPath')
  ].filter(Boolean).forEach((appDataPath) => {
    addUniquePath(paths, path.join(appDataPath, 'Manifests'));
  });

  // Common fallbacks if registry fails
  getActiveDrives().forEach((drive) => {
    addUniquePath(paths, `${drive}:\\ProgramData\\Epic\\EpicGamesLauncher\\Data\\Manifests`);
  });

  paths.forEach((manifestsPath) => {
    safeReadDir(manifestsPath)
      .filter((fileName) => fileName.endsWith('.item'))
      .forEach((manifestFile) => {
        try {
          const content = fs.readFileSync(path.join(manifestsPath, manifestFile), 'utf8');
          const manifest = JSON.parse(content);
          if (!manifest?.DisplayName) return;

          games.push({
            name: manifest.DisplayName,
            platform: 'Epic',
            iconUrl: '',
            icon: '',
            launchId: manifest.CatalogItemId || manifest.AppName || '',
            executable: `com.epicgames.launcher://apps/${manifest.CatalogItemId || manifest.AppName || ''}?action=launch&silent=true`,
            ...createTrackedDefaults()
          });
        } catch (error) {
          // Ignore malformed Epic manifest
        }
      });
  });

  return games;
};

const scanFolderLibraries = (platform, paths, executableBuilder = null) => {
  const games = [];

  const maybeAddGame = (gamePath, folder) => {
    if (isLikelyNonGameFolder(folder)) return;

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
        games.push({
          name: extraMetadata.name || folder,
          platform,
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

    if (!installDir) {
      installDir = knownBattleNetRoots
        .map((rootPath) => findDirectoryByNameHints(rootPath, [game.name, game.registryKey, game.code, ...(game.aliases || [])]))
        .find(Boolean) || '';
    }

    if (!foundRegistry && !installDir && !knownBattleNetRoots.some((rootPath) => fs.existsSync(path.join(rootPath, game.registryKey)))) {
      return;
    }

    addGameIfUnique(games, {
      name: game.name,
      platform: 'Battle.net',
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

        addGameIfUnique(games, {
          name: matchedKnownGame?.name || folder,
          platform: 'Battle.net',
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
  });

  explicitInstallRoots.forEach((installRoot) => {
    addUniquePath(paths, installRoot);
  });

  return scanFolderLibraries('EA', paths, (gamePath, folder) => ({
    executable: findPreferredExecutable(gamePath, folder),
    installDir: gamePath,
    launchId: folder
  })).filter((game) => looksLikeInstalledGameDirectory(game.installDir, game.name));
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
        const isKnown = knownPsGames.some(kg => folder.includes(kg) || kg.includes(folder));
        const gameName = isKnown ? knownPsGames.find(kg => folder.includes(kg) || kg.includes(folder)) || folder : folder;

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

const scanBSGLibrary = () => {
  const games = [];
  const bsgPaths = [];
  
  getActiveDrives().forEach((drive) => {
    addUniquePath(bsgPaths, `${drive}:\\Battlestate Games`);
  });

  bsgPaths.forEach((rootPath) => {
    if (!fs.existsSync(rootPath)) return;

    safeReadDir(rootPath).forEach((folder) => {
      const gamePath = path.join(rootPath, folder);
      try {
        if (!fs.statSync(gamePath).isDirectory() || isLikelyNonGameFolder(folder) || folder.toLowerCase().includes('bsglauncher')) {
          return;
        }

        games.push({
          name: folder === 'EFT' ? 'Escape from Tarkov' : folder === 'EFT Arena' ? 'Escape from Tarkov: Arena' : folder,
          platform: 'BSG',
          iconUrl: '',
          icon: '',
          executable: `${gamePath}\\EscapeFromTarkov.exe`, // Approximation, usually launched via BsgLauncher.exe though
          executablePath: findPreferredExecutable(gamePath, folder),
          installDir: gamePath,
          ...createTrackedDefaults()
        });
      } catch (error) {}
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
        if (folder.toLowerCase() === 'valorant') {
          executable = `"${rootPath}\\Riot Client\\RiotClientServices.exe" --launch-product=valorant --launch-patchline=live`;
        } else if (folder.toLowerCase() === 'league of legends') {
          executable = `"${rootPath}\\Riot Client\\RiotClientServices.exe" --launch-product=league_of_legends --launch-patchline=live`;
        } else if (folder.toLowerCase() === 'legends of runeterra') {
          executable = `"${rootPath}\\Riot Client\\RiotClientServices.exe" --launch-product=bacon --launch-patchline=live`;
        } else {
          executable = `"${rootPath}\\Riot Client\\RiotClientServices.exe"`;
        }

        games.push({
          name: folder,
          platform: 'Riot',
          iconUrl: '',
          icon: '',
          executable,
          installDir: gamePath,
          ...createTrackedDefaults()
        });
      } catch (error) {}
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
      } catch (error) {}
    });
  });

  return games;
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

const scanAllLibraries = () => {
  const activeDrives = getActiveDrives();

  // Dynamically generate GOG paths
  const gogPaths = [
    `${process.env.LOCALAPPDATA || process.env.localappdata}\\GOG.com\\Galaxy\\storage\\games`
  ];
  activeDrives.forEach((drive) => {
    gogPaths.push(`${drive}:\\GOG Games`);
    gogPaths.push(`${drive}:\\Games\\GOG`);
    gogPaths.push(`${drive}:\\Program Files\\GOG Galaxy\\Games`);
    gogPaths.push(`${drive}:\\Program Files (x86)\\GOG Galaxy\\Games`);
  });

  // Dynamically generate Origin/EA paths
  const originPaths = [
    `${process.env.ProgramData || process.env.programdata}\\Origin\\LocalContent`,
    `${process.env['ProgramFiles(x86)']}\\Origin Games`,
    `${process.env.ProgramFiles || process.env.programfiles}\\EA Games`,
    `${process.env['ProgramFiles(x86)']}\\EA Games`,
    // EA App paths
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

  // Dynamically generate Uplay paths
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

  console.log('[Scanner] Resolving Ubisoft install roots...');
  getUbisoftInstallRoots().forEach((rootPath) => {
    addUniquePath(uplayPaths, rootPath);
    addUniquePath(uplayPaths, path.join(rootPath, 'games'));
  });

  // Dynamically generate Rockstar paths
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

  console.log('[Scanner] Starting scanAllLibraries...');
  console.log('[Scanner] Active drives:', activeDrives);
  console.log('[Scanner] GOG paths:', gogPaths);
  console.log('[Scanner] Origin paths:', originPaths);
  console.log('[Scanner] Uplay paths:', uplayPaths);
  console.log('[Scanner] Rockstar paths:', rockstarPaths);

  const steamGames = scanSteamLibrary();
  console.log('[Scanner] Steam found:', steamGames.length, 'games');
  
  const epicGames = scanEpicLibrary();
  console.log('[Scanner] Epic found:', epicGames.length, 'games');
  
  const gogGames = scanFolderLibraries('GOG', gogPaths);
  console.log('[Scanner] GOG found:', gogGames.length, 'games');
  
  const uplayGames = scanFolderLibraries('Uplay', uplayPaths, (gamePath, folder) => ({
    executable: findBestExecutablePath(gamePath, folder) || findPreferredExecutable(gamePath, folder),
    installDir: gamePath,
    launchId: folder,
    name: folder.replace(/_/g, ' ').replace(/\s+/g, ' ').trim()
  })).filter((game) => looksLikeInstalledGameDirectory(game.installDir, game.name));
  const rockstarGames = scanFolderLibraries('Rockstar', rockstarPaths, (gamePath, folder) => ({
    executable: path.join(gamePath, 'Launcher.exe'),
    installDir: gamePath,
    launchId: folder
  }));
  const eaGames = scanEALibrary();
  const playstationGames = scanPlaystationLibrary();
  const battleNetGames = scanBattleNetLibrary();
  const xboxGames = scanXboxLibrary();
  const bsgGames = scanBSGLibrary();
  const riotGames = scanRiotLibrary();
  const curseForgeGames = scanCurseForgeLibrary();

  console.log(`[Scanner] Epic found: ${epicGames.length} games`);
  console.log(`[Scanner] GOG found: ${gogGames.length} games`);
  console.log(`[Scanner] EA found: ${eaGames.length} games`);
  console.log(`[Scanner] Uplay found: ${uplayGames.length} games`);
  console.log(`[Scanner] Battle.net found: ${battleNetGames.length} games`);
  console.log(`[Scanner] Rockstar found: ${rockstarGames.length} games`);
  console.log(`[Scanner] Xbox found: ${xboxGames.length} games`);
  console.log(`[Scanner] PlayStation found: ${playstationGames.length} games`);
  console.log(`[Scanner] BSG found: ${bsgGames.length} games`);
  console.log(`[Scanner] Riot found: ${riotGames.length} games`);
  console.log(`[Scanner] CurseForge found: ${curseForgeGames.length} games`);

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
    ...curseForgeGames
  ];

  console.log('[Scanner] Total games before dedupe:', games.length);
  const deduped = dedupeGames(games);
  console.log('[Scanner] Total games after dedupe:', deduped.length);
  
  // Store debug info globally so we can access it from renderer
  global.lastScanDebug = {
    activeDrives,
    paths: {
      gog: gogPaths,
      origin: originPaths,
      uplay: uplayPaths,
      rockstar: rockstarPaths
    },
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
      curseForge: curseForgeGames.length
    }
  };
  
  return deduped;
};

module.exports = {
  scanAllLibraries
};
