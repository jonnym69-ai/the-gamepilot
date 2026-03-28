import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import Home from './Home';
import Library from './Library';
import Stats from './Stats';
import Achievements from './Achievements';
import GamingLinks from './GamingLinks';
import Donate from './Donate';
import Settings from './Settings';
import Profile from './Profile';
import YearInReview from './YearInReview';
import ChallengeBoard from './ChallengeBoard';
import PerformanceCockpit from './PerformanceCockpit';
import { AchievementTracker } from './AchievementSystem';
import { gameBelongsToGenre, getGameGenres } from './GameGenreDatabase';
import { GamingIdentity } from './GamingIdentity';
import moodThemes from './themes/moodThemes.json';
import { ThemeProvider } from './ThemeContext';
import { KeyboardShortcuts } from './KeyboardShortcuts';
import { GameProcessMonitor } from './GameProcessMonitor';
import { OfflineManager } from './OfflineManager';
import { PlaytimeAutoLogger } from './services/PlaytimeAutoLogger';
import { ToastProvider } from './components/Toast';

const VALID_THEME_IDS = new Set([
  'light',
  'dark',
  ...moodThemes.map((themeConfig) => themeConfig?.id).filter(Boolean)
]);

const resolveThemeClassName = (themeId) => {
  const normalizedThemeId = typeof themeId === 'string' ? themeId.trim() : '';
  return VALID_THEME_IDS.has(normalizedThemeId) ? normalizedThemeId : 'dark';
};

// Xbox AUMID discovery function
const getXboxMap = () => {
  try {
    // Skip Xbox scanning in browser environment
    if (typeof window === 'undefined' || typeof window.require === 'undefined') {
      return {};
    }
    
    const cmd = `powershell "Get-StartApps | Where-Object { $_.AppID -like '*Microsoft*' -or $_.AppID -like '*Xbox*' } | ConvertTo-Json"`;
    const { execSync } = window.require('child_process');
    const output = execSync(cmd, { encoding: 'utf8' });
    const apps = JSON.parse(output);
    return apps.reduce((acc, app) => {
      acc[app.Name] = app.AppID;
      return acc;
    }, {});
  } catch (error) {
    console.log('Error getting Xbox app map:', error);
    return {};
  }
};

const readActiveGameSessions = () => {
  try {
    return JSON.parse(localStorage.getItem('activeGameSessions') || '{}');
  } catch (error) {
    console.error('Error reading active sessions:', error);
    return {};
  }
};

const getActiveSessionStartTime = (sessionEntry) => {
  if (!sessionEntry) {
    return null;
  }

  if (typeof sessionEntry === 'string') {
    return sessionEntry;
  }

  if (typeof sessionEntry === 'object' && sessionEntry.startTime) {
    return sessionEntry.startTime;
  }

  return null;
};

const createActiveSessionEntry = (game) => ({
  startTime: new Date().toISOString(),
  gameId: game?.appid || game?.name || null,
  metadata: {
    genres: Array.isArray(game?.genres) ? game.genres : [],
    mood: game?.mood || null,
    platform: game?.platform || null
  },
  paused: false
});

const normalizeTrackedNumber = (value) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0;
};

const normalizeLastPlayedValue = (lastPlayedValue) => {
  if (typeof lastPlayedValue === 'number' && Number.isFinite(lastPlayedValue)) {
    return lastPlayedValue;
  }

  if (typeof lastPlayedValue === 'string') {
    const parsedTimestamp = Date.parse(lastPlayedValue);
    return Number.isNaN(parsedTimestamp) ? null : parsedTimestamp;
  }

  return null;
};

const mergePlaytimeBucket = (existingBucket = {}, incomingBucket = {}) => ({
  ...(existingBucket || {}),
  ...(incomingBucket || {})
});

const normalizeGameLibraryEntry = (game) => {
  if (!game || typeof game !== 'object') {
    return null;
  }

  const resolvedTimePlayed = Math.max(
    normalizeTrackedNumber(game?.time_played),
    normalizeTrackedNumber(game?.playtime?.total)
  );

  return {
    ...game,
    time_played: resolvedTimePlayed,
    launch_count: normalizeTrackedNumber(game?.launch_count),
    last_played: normalizeLastPlayedValue(game?.last_played),
    playtime: {
      total: resolvedTimePlayed,
      daily: { ...(game?.playtime?.daily || {}) },
      weekly: { ...(game?.playtime?.weekly || {}) },
      monthly: { ...(game?.playtime?.monthly || {}) },
      yearly: { ...(game?.playtime?.yearly || {}) }
    }
  };
};

const normalizeLibraryData = (libraryData) => (
  Array.isArray(libraryData)
    ? libraryData.map(normalizeGameLibraryEntry).filter(Boolean)
    : []
);

const getMostRecentlyPlayedGame = (libraryData = []) => (
  normalizeLibraryData(libraryData).reduce((mostRecentGame, currentGame) => {
    const currentLastPlayed = normalizeLastPlayedValue(currentGame?.last_played) || 0;
    const mostRecentLastPlayed = normalizeLastPlayedValue(mostRecentGame?.last_played) || 0;

    return currentLastPlayed > mostRecentLastPlayed ? currentGame : mostRecentGame;
  }, null)
);

const mergeTrackedGameData = (existingGame, incomingGame) => {
  const normalizedExistingGame = normalizeGameLibraryEntry(existingGame) || {};
  const normalizedIncomingGame = normalizeGameLibraryEntry(incomingGame) || {};
  const resolvedTimePlayed = Math.max(
    normalizeTrackedNumber(normalizedExistingGame.time_played),
    normalizeTrackedNumber(normalizedIncomingGame.time_played)
  );
  const resolvedLaunchCount = Math.max(
    normalizeTrackedNumber(normalizedExistingGame.launch_count),
    normalizeTrackedNumber(normalizedIncomingGame.launch_count)
  );
  const incomingLastPlayed = normalizeLastPlayedValue(normalizedIncomingGame.last_played);
  const existingLastPlayed = normalizeLastPlayedValue(normalizedExistingGame.last_played);
  const resolvedLastPlayed = incomingLastPlayed !== null && existingLastPlayed !== null
    ? Math.max(incomingLastPlayed, existingLastPlayed)
    : incomingLastPlayed ?? existingLastPlayed;

  return normalizeGameLibraryEntry({
    ...normalizedExistingGame,
    ...normalizedIncomingGame,
    time_played: resolvedTimePlayed,
    launch_count: resolvedLaunchCount,
    last_played: resolvedLastPlayed,
    playtime: {
      total: resolvedTimePlayed,
      daily: mergePlaytimeBucket(normalizedExistingGame.playtime?.daily, normalizedIncomingGame.playtime?.daily),
      weekly: mergePlaytimeBucket(normalizedExistingGame.playtime?.weekly, normalizedIncomingGame.playtime?.weekly),
      monthly: mergePlaytimeBucket(normalizedExistingGame.playtime?.monthly, normalizedIncomingGame.playtime?.monthly),
      yearly: mergePlaytimeBucket(normalizedExistingGame.playtime?.yearly, normalizedIncomingGame.playtime?.yearly)
    }
  });
};

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ThemeProvider>
  );
}

function AppContent() {
  const [library, setLibrary] = useState([]);
  const [theme, setTheme] = useState(() => {
    // Get theme from localStorage or default to 'relaxed'
    const savedTheme = localStorage.getItem('gamepilot-theme');
    return savedTheme || 'relaxed';
  });
  const [loading, setLoading] = useState(false);
  const [filterMood, setFilterMood] = useState('');
  const [filterTime, setFilterTime] = useState('');
  const [filterGenre, setFilterGenre] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastPlayedGame, setLastPlayedGame] = useState(null);

  // Offline support state
  const [isOnline, setIsOnline] = useState(OfflineManager.isOnline);
  const [syncStatus, setSyncStatus] = useState(OfflineManager.getSyncStatus());

  // Memoization caches for performance
  const playtimeStatsCache = useRef(new Map());

  useEffect(() => {
    playtimeStatsCache.current.clear();
  }, [library]);

  // Listen for theme changes from navbar
  useEffect(() => {
    const handleThemeChange = (event) => {
      setTheme(event.detail);
    };

    window.addEventListener('themeChange', handleThemeChange);
    return () => window.removeEventListener('themeChange', handleThemeChange);
  }, []);

  // Offline status monitoring
  useEffect(() => {
    const unsubscribe = OfflineManager.onStatusChange((online) => {
      setIsOnline(online);
      setSyncStatus(OfflineManager.getSyncStatus());
    });

    return unsubscribe;
  }, []);

  // Periodic sync status updates
  useEffect(() => {
    const interval = setInterval(() => {
      setSyncStatus(OfflineManager.getSyncStatus());
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Initialize keyboard shortcuts
  useEffect(() => {
    // Register global shortcuts
    KeyboardShortcuts.register('Ctrl+K', () => {
      // Focus search input if we're on the library page
      const searchInput = document.querySelector('input[placeholder*="search"], input[placeholder*="Search"]');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    }, 'Focus search');

    KeyboardShortcuts.register('Ctrl+L', () => {
      // Navigate to Library
      window.location.hash = '#/library';
    }, 'Go to Library');

    KeyboardShortcuts.register('Ctrl+H', () => {
      // Navigate to Home
      window.location.hash = '#/';
    }, 'Go to Home');

    KeyboardShortcuts.register('Ctrl+P', () => {
      // Navigate to Profile
      window.location.hash = '#/profile';
    }, 'Go to Profile');

    KeyboardShortcuts.register('Ctrl+A', () => {
      // Navigate to Achievements
      window.location.hash = '#/achievements';
    }, 'Go to Achievements');

    KeyboardShortcuts.register('Ctrl+S', () => {
      // Navigate to Stats
      window.location.hash = '#/stats';
    }, 'Go to Stats');

    KeyboardShortcuts.register('Ctrl+T', () => {
      // Navigate to Settings
      window.location.hash = '#/settings';
    }, 'Go to Settings');

    KeyboardShortcuts.register('?', () => {
      KeyboardShortcuts.showHelp();
    }, 'Show keyboard shortcuts');

    // Cleanup function to unregister shortcuts
    return () => {
      KeyboardShortcuts.unregister('Ctrl+K');
      KeyboardShortcuts.unregister('Ctrl+L');
      KeyboardShortcuts.unregister('Ctrl+H');
      KeyboardShortcuts.unregister('Ctrl+P');
      KeyboardShortcuts.unregister('Ctrl+A');
      KeyboardShortcuts.unregister('Ctrl+S');
      KeyboardShortcuts.unregister('Ctrl+T');
      KeyboardShortcuts.unregister('?');
    };
  }, []);

  // Apply theme globally and save to localStorage
  useEffect(() => {
    const animationsEnabled = localStorage.getItem('animationsEnabled') !== 'false';

    // Clear any invalid cached theme
    const savedTheme = localStorage.getItem('gamepilot-theme');
    if (savedTheme && !VALID_THEME_IDS.has(savedTheme)) {
      localStorage.removeItem('gamepilot-theme');
      console.log(`Cleared invalid cached theme: ${savedTheme}`);
    }

    const themeClass = resolveThemeClassName(theme);
    const newBodyClass = `App ${themeClass}${animationsEnabled ? '' : ' no-animations'}`;

    if (theme !== themeClass) {
      setTheme(themeClass);
    }

    // Only update if the class has actually changed
    if (document.body.className !== newBodyClass) {
      console.log(`🎨 Applying theme: ${theme} -> ${themeClass} (body class: ${newBodyClass})`);
      document.body.className = newBodyClass;
      localStorage.setItem('gamepilot-theme', themeClass);
    }
  }, [theme]);

  // --- Utility Functions ---
  const saveLibrary = useCallback((libraryData) => {
    try {
      const normalizedLibraryData = normalizeLibraryData(libraryData);
      localStorage.setItem('gameLibrary', JSON.stringify(normalizedLibraryData));
    } catch (err) {
      console.error(' Error saving library:', err);
    }
  }, []);

  useEffect(() => {
    try {
      const storedLibrary = localStorage.getItem('gameLibrary');
      if (!storedLibrary) {
        return;
      }

      const parsedLibrary = JSON.parse(storedLibrary);
      if (!Array.isArray(parsedLibrary)) {
        return;
      }

      const normalizedLibrary = normalizeLibraryData(parsedLibrary);
      setLibrary(normalizedLibrary);

      const mostRecentlyPlayedGame = getMostRecentlyPlayedGame(normalizedLibrary);
      if (mostRecentlyPlayedGame) {
        setLastPlayedGame(mostRecentlyPlayedGame);
      }

      if (JSON.stringify(parsedLibrary) !== JSON.stringify(normalizedLibrary)) {
        localStorage.setItem('gameLibrary', JSON.stringify(normalizedLibrary));
      }
    } catch (error) {
      console.error('Error loading saved library:', error);
    }
  }, []);

  const assignMoodToGame = useCallback((gameName, genres = []) => {
    const name = gameName.toLowerCase();
    
    // Relaxed/Cozy games - de-stress, feel comforted, calm
    if (name.includes('stardew valley') || name.includes('animal crossing') || 
        name.includes('the sims') || name.includes('powerwash') ||
        name.includes('slime rancher') || name.includes('yonder') ||
        name.includes('a short hike') || name.includes('journey') ||
        name.includes('flower') || name.includes('gris') ||
        name.includes('abzu') || name.includes('firewatch') ||
        name.includes('unpacking') || name.includes('townscaper') ||
        name.includes('solitaire') || name.includes('mahjong') || 
        name.includes('match 3') || name.includes('bejeweled') ||
        name.includes('candy crush') || name.includes('plants vs zombies') ||
        name.includes('angry birds') || name.includes('cut the rope') ||
        name.includes('tetris') || name.includes('puzzloop') ||
        name.includes('peggle') || name.includes('zuma')) {
      return 'Relaxed';
    }
    
    // Social/Connected games - connect with friends, cooperate, compete
    if (name.includes('call of duty') || name.includes('counter-strike') || 
        name.includes('league of legends') || name.includes('dota') ||
        name.includes('overwatch') || name.includes('valorant') ||
        name.includes('rocket league') || name.includes('apex legends') ||
        name.includes('rainbow six') || name.includes('fifa') ||
        name.includes('nba 2k') || name.includes('madden') ||
        name.includes('cs:go') || name.includes('csgo') ||
        name.includes('team fortress') || name.includes('tf2') ||
        name.includes('among us') || name.includes('jackbox') ||
        name.includes('fall guys') || name.includes('party animals')) {
      return 'Social';
    }
    
    // Focused/Intense games - deep concentration, flow state, challenging mechanics
    if (name.includes('civilization') || name.includes('xcom') || 
        name.includes('chess') || name.includes('total war') ||
        name.includes('starcraft') || name.includes('age of empires') ||
        name.includes('company of heroes') || name.includes('warhammer') ||
        name.includes('endless legend') || name.includes('into the breach') ||
        name.includes('doom') || name.includes('resident evil') ||
        name.includes('dead space') || name.includes('bloodborne') ||
        name.includes('sekiro') || name.includes('dark souls') ||
        name.includes('hades') || name.includes('ultrakill') ||
        name.includes('devil may cry') || name.includes('bayonetta')) {
      return 'Focused';
    }
    
    // Creative/Expressive games - building, customization, artistic expression
    if (name.includes('minecraft') || name.includes('terraria') ||
        name.includes('roblox') || name.includes('garry\'s mod') ||
        name.includes('dreams') || name.includes('littlebigplanet') ||
        name.includes('super mario maker') || name.includes('trackmania') ||
        name.includes('noita') || name.includes('risk of rain')) {
      return 'Creative';
    }
    
    // Escapist/Immersive games - escape daily pressures, rich narratives, fantasy worlds
    if (name.includes('no man\'s sky') || name.includes('subnautica') ||
        name.includes('the legend of zelda') || name.includes('elder scrolls') ||
        name.includes('fallout') || name.includes('skyrim') ||
        name.includes('oblivion') || name.includes('morrowind') ||
        name.includes('breath of the wild') || name.includes('horizon') ||
        name.includes('her story') || name.includes('return of obra dinn') ||
        name.includes('outer wilds') || name.includes('witness') ||
        name.includes('portal') || name.includes('antichamber') ||
        name.includes('braid') || name.includes('limbo') ||
        name.includes('inside') || name.includes('somerville') ||
        name.includes('cyberpunk') || name.includes('the witcher') ||
        name.includes('dragon age') || name.includes('mass effect')) {
      return 'Escapist';
    }
    
    // Fallback to genre-based mapping
    const genreToMoodMap = {
      'Shooter': 'Social',
      'RPG': 'Escapist', 
      'Simulation': 'Relaxed',
      'Puzzle': 'Focused',
      'Racing': 'Focused',
      'Sports': 'Social',
      'Strategy': 'Focused',
      'Adventure': 'Escapist',
      'Indie': 'Creative',
      'Platformer': 'Relaxed',
      'Fighting': 'Social',
      'Stealth': 'Focused',
      'Horror': 'Escapist',
      'Management': 'Focused',
      'Casual': 'Relaxed'
    };
    
    // Use first genre to determine mood
    return genreToMoodMap[genres[0]] || 'Relaxed';
  }, []);

  // --- Scanning Functions ---
  const getActiveDrives = useCallback(() => {
    const fs = window.require('fs');
    const commonDrives = ['C', 'D', 'E', 'F'];
    const activeDrives = [];
    
    commonDrives.forEach(drive => {
      const testPath = `${drive}:\\`;
      try {
        if (fs.existsSync(testPath)) {
          activeDrives.push(drive);
        }
      } catch (err) {
        // Drive doesn't exist or is not accessible
      }
    });
    
    return activeDrives;
  }, []);

  const getSteamInstallPaths = useCallback(() => {
    try {
      const fs = window.require('fs');
      const path = window.require('path');
      const { execSync } = window.require('child_process');
      
      const paths = [];
      
      // Try to get Steam install path from registry
      let steamPath = '';
      try {
        const result = execSync('reg query "HKLM\\SOFTWARE\\Valve\\Steam" /v InstallPath', { encoding: 'utf8' });
        const match = result.match(/InstallPath\s+REG_SZ\s+(.+)/);
        if (match) {
          steamPath = match[1].trim();
        }
      } catch (err) {
        console.log('Could not read Steam path from registry');
      }
      
      // Add registry path if found
      if (steamPath && fs.existsSync(steamPath)) {
        const steamAppsPath = path.join(steamPath, 'steamapps');
        if (fs.existsSync(steamAppsPath) && !paths.includes(steamAppsPath)) {
          paths.push(steamAppsPath);
        }
      }
      
      // Check only active drives for Steam installations (optimized)
      const activeDrives = getActiveDrives();
      console.log(' Checking active drives for Steam:', activeDrives);
      
      activeDrives.forEach(drive => {
        const possiblePaths = [
          `${drive}:\\Program Files (x86)\\Steam\\steamapps`,
          `${drive}:\\Program Files\\Steam\\steamapps`,
          `${drive}:\\Steam\\steamapps`,
          `${drive}:\\Games\\Steam\\steamapps`
        ];
        
        possiblePaths.forEach(p => {
          console.log(` Checking path: ${p}`);
          const exists = fs.existsSync(p);
          console.log(` Path exists: ${exists}`);
          
          if (exists && !paths.includes(p)) {
            paths.push(p);
            console.log(` Added Steam path: ${p}`);
          }
        });
      });
      
      console.log(' Found Steam paths:', paths);
      return paths;
    } catch (err) {
      console.error('Error getting Steam paths:', err);
      return [];
    }
  }, [getActiveDrives]);

  const scanSteamLibrary = useCallback(() => {
    console.log(' Scanning Steam library...');
    try {
      const fs = window.require('fs');
      const path = window.require('path');
      
      let steamPaths = getSteamInstallPaths();
      console.log(' Initial Steam paths:', steamPaths);
      
      const games = [];
      
      // First pass: check for additional library paths
      const additionalPaths = [];
      steamPaths.forEach(steamPath => {
        if (fs.existsSync(steamPath)) {
          console.log(' Found Steam folder:', steamPath);
          
          // Check libraryfolders.vdf to find additional game locations
          const libraryFoldersPath = path.join(steamPath, 'libraryfolders.vdf');
          if (fs.existsSync(libraryFoldersPath)) {
            console.log(' Found libraryfolders.vdf, parsing for additional game locations...');
            try {
              const content = fs.readFileSync(libraryFoldersPath, 'utf8');
              console.log(' libraryfolders.vdf content:', content);
              
              // Parse libraryfolders.vdf for additional paths
              const pathMatches = content.match(/"path"\s+"([^"]+)"/g);
              if (pathMatches) {
                pathMatches.forEach(match => {
                  const pathMatch = match.match(/"path"\s+"([^"]+)"/);
                  if (pathMatch) {
                    const libraryPath = pathMatch[1].replace(/\\\\/g, '\\');
                    const libraryAppsPath = path.join(libraryPath, 'steamapps');
                    console.log(' Found additional library path:', libraryAppsPath);
                    
                    if (fs.existsSync(libraryAppsPath) && !steamPaths.includes(libraryAppsPath) && !additionalPaths.includes(libraryAppsPath)) {
                      console.log(' Adding additional Steam library path:', libraryAppsPath);
                      additionalPaths.push(libraryAppsPath);
                    }
                  }
                });
              }
            } catch (err) {
              console.error(' Error parsing libraryfolders.vdf:', err);
            }
          }
        }
      });
      
      // Combine all paths
      steamPaths = [...steamPaths, ...additionalPaths];
      console.log(' All Steam paths to scan:', steamPaths);
      
      // Second pass: scan all paths for games
      steamPaths.forEach(steamPath => {
        if (fs.existsSync(steamPath)) {
          console.log(' Scanning Steam folder:', steamPath);
          try {
            const files = fs.readdirSync(steamPath);
            console.log(' Steam folder contents:', files.slice(0, 10)); // Show first 10 files
            console.log(' Total files in Steam folder:', files.length);
            
            const acfFiles = files.filter(file => file.endsWith('.acf'));
            console.log(' Found .acf files:', acfFiles);
            
            files.forEach(file => {
              if (file.endsWith('.acf')) {
                try {
                  const content = fs.readFileSync(path.join(steamPath, file), 'utf8');
                  const nameMatch = content.match(/"name"\s+"([^"]+)"/);
                  const appIdMatch = content.match(/"appid"\s+"(\d+)"/);
                  
                  if (nameMatch && appIdMatch) {
                    const gameName = nameMatch[1];
                    const appId = appIdMatch[1];
                    
                    // Skip non-games (Steamworks Distribution, etc.)
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
                    
                    if (!skipGames.some(skipName => gameName.includes(skipName))) {
                      const detectedGenres = getGameGenres(gameName);
                      const selectedGenres = detectedGenres.length > 0 ? detectedGenres : ['Unknown'];
                      
                      games.push({
                        name: gameName,
                        platform: 'Steam',
                        appid: appId,
                        iconUrl: `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/capsule_231x87.jpg`,
                        icon: '',
                        mood: assignMoodToGame(gameName, selectedGenres),
                        genres: selectedGenres,
                        executable: `steam://run/${appId}`,
                      });
                      console.log(' Added Steam game:', gameName);
                    } else {
                      console.log(' Skipped non-game:', gameName);
                    }
                  }
                } catch (err) {
                  console.error(' Error parsing ACF file:', file, err);
                }
              }
            });
          } catch (err) {
            console.error(' Error scanning Steam folder:', steamPath, err);
          }
        }
      });
      
      console.log(' Found', games.length, 'Steam games');
      return games;
    } catch (err) {
      console.error(' Error scanning Steam library:', err);
      return [];
    }
  }, [getSteamInstallPaths, assignMoodToGame]);

  const scanEpicLibrary = useCallback(() => {
    console.log(' Scanning Epic Games library...');
    try {
      const fs = window.require('fs');
      const path = window.require('path');
      const { execSync } = window.require('child_process');
      
      const games = [];
      
      // Try to get Epic install path from registry
      let epicPath = '';
      try {
        const result = execSync('reg query "HKLM\\SOFTWARE\\Epic Games\\EpicGamesLauncher" /v AppDataPath', { encoding: 'utf8' });
        const match = result.match(/AppDataPath\s+REG_SZ\s+(.+)/);
        if (match) {
          epicPath = match[1].trim();
        }
      } catch (err) {
        console.log('Could not read Epic path from registry');
      }
      
      if (epicPath && fs.existsSync(epicPath)) {
        const manifestsPath = path.join(epicPath, 'Manifests');
        if (fs.existsSync(manifestsPath)) {
          const manifests = fs.readdirSync(manifestsPath).filter(file => file.endsWith('.item'));
          
          manifests.forEach(manifestFile => {
            try {
              const manifestPath = path.join(manifestsPath, manifestFile);
              const content = fs.readFileSync(manifestPath, 'utf8');
              const manifest = JSON.parse(content);
              
              if (manifest.DisplayName && manifest.InstallLocation) {
                const detectedGenres = getGameGenres(manifest.DisplayName);
                const selectedGenres = detectedGenres.length > 0 ? detectedGenres : ['Unknown'];
                
                games.push({
                  name: manifest.DisplayName,
                  platform: 'Epic',
                  iconUrl: '',
                  icon: '',
                  mood: assignMoodToGame(manifest.DisplayName, selectedGenres),
                  genres: selectedGenres,
                  launchId: manifest.CatalogItemId || manifest.AppName || '',
                  executable: `com.epicgames.launcher://apps/${manifest.CatalogItemId || manifest.AppName || ''}?action=launch&silent=true`,
                });
                console.log(' Added Epic game:', manifest.DisplayName);
              }
            } catch (err) {
              console.error(' Error parsing Epic manifest:', manifestFile, err);
            }
          });
        }
      }
      
      console.log(' Found', games.length, 'Epic games');
      return games;
    } catch (err) {
      console.error(' Error scanning Epic library:', err);
      return [];
    }
  }, [assignMoodToGame]);

  const scanGogLibrary = useCallback(() => {
    console.log(' Scanning GOG library...');
    try {
      const fs = window.require('fs');
      const path = window.require('path');
      
      const games = [];
      const gogPaths = [
        `${process.env.LOCALAPPDATA || process.env.localappdata}\\GOG.com\\Galaxy\\storage\\games`,
        `${process.env.LOCALAPPDATA || process.env.localappdata}\\GOG.com\\Galaxy\\storage\\plugins`,
        `${process.env.ProgramFiles || process.env.programfiles}\\GOG Galaxy`,
        `${process.env['ProgramFiles(x86)']}\\GOG Galaxy`,
        `C:\\GOG Games`,
        `D:\\GOG Games`
      ];
      
      gogPaths.forEach(gogPath => {
        if (fs.existsSync(gogPath)) {
          try {
            const files = fs.readdirSync(gogPath);
            files.forEach(file => {
              if (file.endsWith('.json')) {
                try {
                  const content = fs.readFileSync(path.join(gogPath, file), 'utf8');
                  const game = JSON.parse(content);
                  
                  if (game.name) {
                    const detectedGenres = getGameGenres(game.name);
                    const selectedGenres = detectedGenres.length > 0 ? detectedGenres : ['Unknown'];
                    
                    games.push({
                      name: game.name,
                      platform: 'GOG',
                      iconUrl: '',
                      icon: '',
                      mood: assignMoodToGame(game.name, selectedGenres),
                      genres: selectedGenres,
                      time_played: 0, // total minutes played
                      launch_count: 0, // total launches
                      last_played: null, // timestamp of last launch
                      playtime: {
                        total: 0, // total minutes
                        daily: {}, // { "2024-01-15": 45 }
                        weekly: {}, // { "2024-W03": 120 }
                        monthly: {}, // { "2024-01": 240 }
                        yearly: {} // { "2024": 240 }
                      }
                    });
                    console.log(' Added GOG game:', game.name);
                  }
                } catch (err) {
                  console.error(' Error parsing GOG file:', file, err);
                }
              }
            });
          } catch (err) {
            console.error(' Error reading GOG path:', gogPath, err);
          }
        }
      });
      
      console.log(' Found', games.length, 'GOG games');
      return games;
    } catch (err) {
      console.error(' Error scanning GOG library:', err);
      return [];
    }
  }, [assignMoodToGame]);

  const scanOriginLibrary = useCallback(() => {
    console.log(' Scanning Origin/EA App library...');
    try {
      const fs = window.require('fs');
      const path = window.require('path');
      
      const games = [];
      const originPaths = [
        `${process.env.ProgramData || process.env.programdata}\\Origin\\LocalContent`,
        `${process.env['ProgramFiles(x86)']}\\Origin Games`,
        `${process.env.ProgramFiles || process.env.programfiles}\\EA Games`,
        `${process.env['ProgramFiles(x86)']}\\EA Games`,
        `C:\\Games\\EA Games`,
        `D:\\Games\\EA Games`
      ];
      
      originPaths.forEach(originPath => {
        if (fs.existsSync(originPath)) {
          try {
            const folders = fs.readdirSync(originPath);
            folders.forEach(folder => {
              const gamePath = path.join(originPath, folder);
              if (fs.statSync(gamePath).isDirectory()) {
                const detectedGenres = getGameGenres(folder);
                const selectedGenres = detectedGenres.length > 0 ? detectedGenres : ['Unknown'];
                
                games.push({
                  name: folder,
                  platform: 'Origin',
                  iconUrl: '',
                  icon: '',
                  mood: assignMoodToGame(folder, selectedGenres),
                  genres: selectedGenres,
                  time_played: 0, // total minutes played
                  launch_count: 0, // total launches
                  last_played: null, // timestamp of last launch
                  playtime: {
                    total: 0, // total minutes
                    daily: {}, // { "2024-01-15": 45 }
                    weekly: {}, // { "2024-W03": 120 }
                    monthly: {}, // { "2024-01": 240 }
                    yearly: {} // { "2024": 240 }
                  }
                });
                console.log(' Added Origin game:', folder);
              }
            });
          } catch (err) {
            console.error(' Error reading Origin path:', originPath, err);
          }
        }
      });
      
      console.log(' Found', games.length, 'Origin games');
      return games;
    } catch (err) {
      console.error(' Error scanning Origin library:', err);
      return [];
    }
  }, [assignMoodToGame]);

  const scanUplayLibrary = useCallback(() => {
    console.log(' Scanning Ubisoft Connect library...');
    try {
      const fs = window.require('fs');
      const path = window.require('path');
      
      const games = [];
      const uplayPaths = [
        `${process.env.LOCALAPPDATA || process.env.localappdata}\\Ubisoft Game Launcher\\games`,
        `${process.env.LOCALAPPDATA || process.env.localappdata}\\Ubisoft Connect\\games`,
        `${process.env['ProgramFiles(x86)']}\\Ubisoft\\Ubisoft Game Launcher\\games`,
        `${process.env.ProgramFiles || process.env.programfiles}\\Ubisoft\\Ubisoft Game Launcher\\games`,
        `C:\\Games\\Ubisoft`,
        `D:\\Games\\Ubisoft`
      ];
      
      uplayPaths.forEach(uplayPath => {
        if (fs.existsSync(uplayPath)) {
          try {
            const folders = fs.readdirSync(uplayPath);
            folders.forEach(folder => {
              const gamePath = path.join(uplayPath, folder);
              if (fs.statSync(gamePath).isDirectory()) {
                const detectedGenres = getGameGenres(folder);
                const selectedGenres = detectedGenres.length > 0 ? detectedGenres : ['Unknown'];
                
                games.push({
                  name: folder,
                  platform: 'Uplay',
                  iconUrl: '',
                  icon: '',
                  mood: assignMoodToGame(folder, selectedGenres),
                  genres: selectedGenres,
                  time_played: 0, // total minutes played
                  launch_count: 0, // total launches
                  last_played: null, // timestamp of last launch
                  playtime: {
                    total: 0, // total minutes
                    daily: {}, // { "2024-01-15": 45 }
                    weekly: {}, // { "2024-W03": 120 }
                    monthly: {}, // { "2024-01": 240 }
                    yearly: {} // { "2024": 240 }
                  }
                });
                console.log(' Added Ubisoft game:', folder);
              }
            });
          } catch (err) {
            console.error(' Error reading Ubisoft path:', uplayPath, err);
          }
        }
      });
      
      console.log(' Found', games.length, 'Ubisoft games');
      return games;
    } catch (err) {
      console.error(' Error scanning Ubisoft library:', err);
      return [];
    }
  }, [assignMoodToGame]);

  const scanBattleNetLibrary = useCallback(() => {
    console.log(' Scanning Battle.net library...');
    try {
      const { execSync } = window.require('child_process');
      
      const games = [];
      
      // Look for Blizzard games in registry
      const blizzardGames = [
        { name: 'StarCraft II', registryKey: 'StarCraft II', code: 'S2' },
        { name: 'Heroes of the Storm', registryKey: 'Heroes of the Storm', code: 'Hero' },
        { name: 'World of Warcraft', registryKey: 'World of Warcraft', code: 'WoW' },
        { name: 'Diablo III', registryKey: 'Diablo III', code: 'D3' },
        { name: 'Diablo IV', registryKey: 'Diablo IV', code: 'D4' },
        { name: 'Overwatch 2', registryKey: 'Overwatch 2', code: 'Pro' },
        { name: 'Call of Duty', registryKey: 'Call of Duty', code: 'COD' },
      ];
      
      blizzardGames.forEach(game => {
        try {
          const result = execSync(`reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Blizzard Entertainment\\${game.registryKey}"`, { encoding: 'utf8' });
          if (result.includes('HKEY_LOCAL_MACHINE')) {
            const detectedGenres = getGameGenres(game.name);
            const selectedGenres = detectedGenres.length > 0 ? detectedGenres : ['Unknown'];
            
            games.push({
              name: game.name,
              platform: 'Battle.net',
              iconUrl: '',
              icon: '',
              mood: assignMoodToGame(game.name, selectedGenres),
              genres: selectedGenres,
              executable: `"C:\\Program Files (x86)\\Battle.net\\Battle.net.exe" --exec="launch ${game.code}"`,
              time_played: 0, // total minutes played
              launch_count: 0, // total launches
              last_played: null, // timestamp of last launch
              playtime: {
                total: 0, // total minutes
                daily: {}, // { "2024-01-15": 45 }
                weekly: {}, // { "2024-W03": 120 }
                monthly: {}, // { "2024-01": 240 }
                yearly: {} // { "2024": 240 }
              }
            });
            console.log(' Added Battle.net game:', game.name);
          }
        } catch (err) {
          console.log(` Game ${game.name} not found in registry`);
        }
      });
      
      console.log(' Found', games.length, 'Battle.net games');
      return games;
    } catch (err) {
      console.error(' Error scanning Battle.net library:', err);
      return [];
    }
  }, [assignMoodToGame]);

  const scanRockstarLibrary = useCallback(() => {
    console.log(' Scanning Rockstar Games library...');
    try {
      const fs = window.require('fs');
      
      const games = [];
      const rockstarPaths = [
        `C:\\Program Files (x86)\\Rockstar Games`,
        `C:\\Program Files\\Rockstar Games`,
        `D:\\Program Files (x86)\\Rockstar Games`,
        `D:\\Program Files\\Rockstar Games`,
        `C:\\Games\\Rockstar Games`,
        `D:\\Games\\Rockstar Games`
      ];
      
      rockstarPaths.forEach(rsgPath => {
        if (fs.existsSync(rsgPath)) {
          try {
            const folders = fs.readdirSync(rsgPath);
            folders.forEach(folder => {
              const gamePath = `${rsgPath}\\${folder}`;
              if (fs.statSync(gamePath).isDirectory() && !folder.includes('Social Club')) {
                const detectedGenres = getGameGenres(folder);
                const selectedGenres = detectedGenres.length > 0 ? detectedGenres : ['Unknown'];
                
                games.push({
                  name: folder,
                  platform: 'Rockstar',
                  iconUrl: '',
                  icon: '',
                  mood: assignMoodToGame(folder, selectedGenres),
                  genres: selectedGenres,
                  executable: `${gamePath}\\Launcher.exe`,
                  time_played: 0, // total minutes played
                  launch_count: 0, // total launches
                  last_played: null, // timestamp of last launch
                  playtime: {
                    total: 0, // total minutes
                    daily: {}, // { "2024-01-15": 45 }
                    weekly: {}, // { "2024-W03": 120 }
                    monthly: {}, // { "2024-01": 240 }
                    yearly: {} // { "2024": 240 }
                  }
                });
                console.log(' Added Rockstar game:', folder);
              }
            });
          } catch (err) {
            console.error(' Error reading Rockstar path:', rsgPath, err);
          }
        }
      });
      
      console.log(' Found', games.length, 'Rockstar games');
      return games;
    } catch (err) {
      console.error(' Error scanning Rockstar library:', err);
      return [];
    }
  }, [assignMoodToGame]);

const scanXboxLibrary = useCallback(() => {
    console.log(' Scanning Xbox library...');
    try {
      const fs = window.require('fs');
      
      // Get Xbox AUMID map using PowerShell
      const xboxAumidMap = getXboxMap();
      console.log('🔍 Found Xbox AUMID map:', Object.keys(xboxAumidMap).length, 'apps');
      
      const games = [];
      
      // Scan Xbox paths for game folders
      const xboxPaths = [
        `C:\\XboxGames`,
        `D:\\XboxGames`,
        `E:\\XboxGames`,
        `F:\\XboxGames`
      ];
      
      xboxPaths.forEach(xboxPath => {
        if (fs.existsSync(xboxPath)) {
          try {
            const folders = fs.readdirSync(xboxPath);
            folders.forEach(folder => {
              const gamePath = `${xboxPath}\\${folder}`;
              if (fs.statSync(gamePath).isDirectory() && !folder.includes('GameSave') && !folder.includes('Video')) {
                const detectedGenres = getGameGenres(folder);
                const selectedGenres = detectedGenres.length > 0 ? detectedGenres : ['Unknown'];
                
                // Find AUMID for this game
                let aumid = null;
                
                // Try exact name match first
                if (xboxAumidMap[folder]) {
                  aumid = xboxAumidMap[folder];
                } else {
                  // Try partial name match
                  for (const [appName, appId] of Object.entries(xboxAumidMap)) {
                    if (appName.toLowerCase().includes(folder.toLowerCase()) || 
                        folder.toLowerCase().includes(appName.toLowerCase())) {
                      aumid = appId;
                      break;
                    }
                  }
                }
                
                games.push({
                  name: folder,
                  platform: 'Xbox',
                  iconUrl: '',
                  icon: '',
                  mood: assignMoodToGame(folder, selectedGenres),
                  genres: selectedGenres,
                  aumid: aumid, // Add AUMID to game object
                  executable: aumid ? `shell:AppsFolder\\${aumid}` : `${gamePath}\\${folder}.exe`,
                  time_played: 0, // total minutes played
                  launch_count: 0, // total launches
                  last_played: null, // timestamp of last launch
                  playtime: {
                    total: 0, // total minutes
                    daily: {}, // { "2024-01-15": 45 }
                    weekly: {}, // { "2024-W03": 120 }
                    monthly: {}, // { "2024-01": 240 }
                    yearly: {} // { "2024": 240 }
                  }
                });
                console.log(' Added Xbox game:', folder, aumid ? `AUMID: ${aumid}` : 'No AUMID found');
              }
            });
          } catch (err) {
            console.error(' Error reading Xbox path:', xboxPath, err);
          }
        }
      });
      
      console.log(' Found', games.length, 'Xbox games');
      return games;
    } catch (err) {
      console.error(' Error scanning Xbox library:', err);
      return [];
    }
  }, [assignMoodToGame]);

  const scanPlaystationLibrary = useCallback(() => {
    console.log(' Scanning PlayStation library...');
    try {
      const fs = window.require('fs');
      const path = window.require('path');
      
      const games = [];
      const psPath = `${process.env.LOCALAPPDATA || process.env.localappdata}\\PlayStation`;
      
      if (fs.existsSync(psPath)) {
        try {
          const folders = fs.readdirSync(psPath);
          folders.forEach(folder => {
            const gamePath = path.join(psPath, folder);
            if (fs.statSync(gamePath).isDirectory() && !folder.includes('base')) {
              const detectedGenres = getGameGenres(folder);
              const selectedGenres = detectedGenres.length > 0 ? detectedGenres : ['Unknown'];
              
              games.push({
                name: folder,
                platform: 'PlayStation',
                iconUrl: '',
                icon: '',
                mood: assignMoodToGame(folder, selectedGenres),
                genres: selectedGenres,
                time_played: 0, // total minutes played
                launch_count: 0, // total launches
                last_played: null, // timestamp of last launch
                playtime: {
                  total: 0, // total minutes
                  daily: {}, // { "2024-01-15": 45 }
                  weekly: {}, // { "2024-W03": 120 }
                  monthly: {}, // { "2024-01": 240 }
                  yearly: {} // { "2024": 240 }
                },
              });
              console.log(' Added PlayStation game:', folder);
            }
          });
        } catch (err) {
          console.error(' Error reading PlayStation path:', psPath, err);
        }
      }
      
      console.log(' Found', games.length, 'PlayStation games');
      return games;
    } catch (err) {
      console.error(' Error scanning PlayStation library:', err);
      return [];
    }
  }, [assignMoodToGame]);

  const scanLocalLibrary = useCallback(async () => {
    setLoading(true);
    console.log('🔍 Starting local library scan...');
    
    try {
      // Scan all platforms
      const steamGames = scanSteamLibrary();
      const epicGames = scanEpicLibrary();
      const gogGames = scanGogLibrary();
      const originGames = scanOriginLibrary();
      const uplayGames = scanUplayLibrary();
      const battleNetGames = scanBattleNetLibrary();
      const rockstarGames = scanRockstarLibrary();
      const xboxGames = scanXboxLibrary();
      const playstationGames = scanPlaystationLibrary();
      
      const allGames = [...steamGames, ...epicGames, ...gogGames, ...originGames, ...uplayGames, ...battleNetGames, ...rockstarGames, ...xboxGames, ...playstationGames];
      
      const merged = mergeLibraryUpdates(library, allGames);
      setLibrary(merged);
      saveLibrary(merged);
      
      console.log(' Scan complete: Found', allGames.length, 'new games');
      console.log(' Total library size:', merged.length);
    } catch (err) {
      console.error(' Error during scan:', err);
    } finally {
      setLoading(false);
    }
  }, [scanSteamLibrary, scanEpicLibrary, scanGogLibrary, scanOriginLibrary, scanUplayLibrary, scanBattleNetLibrary, scanRockstarLibrary, scanXboxLibrary, scanPlaystationLibrary, library, saveLibrary]);

  const mergeLibraryUpdates = (currentLibrary, newGames) => {
    const merged = normalizeLibraryData(currentLibrary);
    
    newGames.forEach(newGame => {
      const normalizedGame = normalizeGameLibraryEntry(newGame);
      if (!normalizedGame) {
        return;
      }

      const existingIndex = merged.findIndex(g => g.name === normalizedGame.name);
      if (existingIndex >= 0) {
        merged[existingIndex] = mergeTrackedGameData(merged[existingIndex], normalizedGame);
      } else {
        merged.push(normalizedGame);
      }
    });
    
    return merged;
  };

  // --- Logic Functions ---
  const handleLaunchGame = useCallback(async (game) => {
    console.log('🎮 Launching game:', game.name, 'Platform:', game.platform);
    
    try {
      // Check if localStorage is available
      console.log(' Checking localStorage availability...');
      if (typeof Storage === 'undefined') {
        console.error(' localStorage not available');
        alert('localStorage not available - session tracking disabled');
      }
      
      // Get active sessions from localStorage
      console.log(' Getting active sessions from localStorage...');
      let activeSessions = {};
      try {
        const sessionsData = localStorage.getItem('activeGameSessions');
        console.log(' Raw sessions data:', sessionsData);
        activeSessions = JSON.parse(sessionsData || '{}');
        console.log(' Active sessions before launch:', activeSessions);
      } catch (storageError) {
        console.error(' Error reading active sessions:', storageError);
        activeSessions = {};
      }
      
      const existingSession = activeSessions[game.name];
      const existingStartTime = getActiveSessionStartTime(existingSession);
      const hadExistingSession = Boolean(existingStartTime);
      
      // Check if there's an active session for this game
      if (hadExistingSession) {
        // Don't end the session if launching the same game - just continue it
        console.log('ℹ️ Continuing existing session for:', game.name);
        if (typeof existingSession === 'string') {
          activeSessions[game.name] = {
            ...createActiveSessionEntry(game),
            startTime: existingStartTime
          };
          localStorage.setItem('activeGameSessions', JSON.stringify(activeSessions));
          console.log('💾 Migrated active session to tracked format:', activeSessions[game.name]);
        }
      } else {
        console.log('ℹ️ No active session found for:', game.name);
      }
      
      // Check if Electron APIs are available
      console.log('🔍 Checking Electron APIs...');
      const electron = window.require('electron');
      console.log('🔍 Electron object:', electron);
      
      if (!electron) {
        console.error('❌ Electron APIs not available');
        alert('Electron APIs not available - please restart the app');
        return;
      }
      
      const ipcRenderer = electron.ipcRenderer;
      console.log('🔍 IPC Renderer:', ipcRenderer);
      
      if (!ipcRenderer) {
        console.error(' IPC Renderer not available');
        alert('IPC Renderer not available - please restart the app');
        return;
      }
      
      // Set up a one-time listener for the result
      console.log(' Setting up IPC listener...');
      ipcRenderer.removeAllListeners('launch-game-result');
      ipcRenderer.once('launch-game-result', (event, result) => {
        console.log(' Received launch result:', result);
        console.log(' Event object:', event);
        
        if (result.success) {
          console.log(' Game launched successfully:', result.message);

          const launchTimestamp = Date.now();
          let launchedGame = {
            ...game,
            last_played: launchTimestamp,
            launch_count: (game.launch_count || 0) + 1
          };
          let libraryChanged = false;

          const updatedLibrary = library.map(existingGame => {
            const matchesGame = existingGame.name === game.name || (
              typeof existingGame.appid !== 'undefined'
              && typeof game.appid !== 'undefined'
              && String(existingGame.appid) === String(game.appid)
            );

            if (!matchesGame) {
              return existingGame;
            }

            libraryChanged = true;
            launchedGame = {
              ...existingGame,
              last_played: launchTimestamp,
              launch_count: (existingGame.launch_count || 0) + 1
            };

            return launchedGame;
          });

          if (libraryChanged) {
            setLibrary(updatedLibrary);
            saveLibrary(updatedLibrary);
          }

          setLastPlayedGame(launchedGame);

          const currentSessions = readActiveGameSessions();
          const currentSession = currentSessions[game.name];
          const currentSessionStart = getActiveSessionStartTime(currentSession);
          const normalizedSessionEntry = createActiveSessionEntry(launchedGame);
          if (!currentSessionStart) {
            PlaytimeAutoLogger.startSession(
              launchedGame.name,
              normalizedSessionEntry.gameId,
              normalizedSessionEntry.metadata
            );
          } else if (typeof currentSession === 'string') {
            currentSessions[game.name] = {
              ...normalizedSessionEntry,
              startTime: currentSessionStart
            };
            localStorage.setItem('activeGameSessions', JSON.stringify(currentSessions));
          } else {
            currentSessions[game.name] = {
              ...currentSession,
              gameId: currentSession.gameId || normalizedSessionEntry.gameId,
              metadata: {
                ...(currentSession.metadata || {}),
                ...normalizedSessionEntry.metadata
              }
            };
            localStorage.setItem('activeGameSessions', JSON.stringify(currentSessions));
          }

          GameProcessMonitor.stopMonitoringByGame(game.name);
          GameProcessMonitor.startMonitoring(launchedGame, {
            onGameClosed: (closedGame) => {
              if (typeof window.endSession === 'function') {
                window.endSession(closedGame.name);
              }
            },
            onMonitorTimeout: (timedOutGame, meta) => {
              console.warn(`⚠️ Monitor timeout for ${timedOutGame.name}${meta?.reason ? ` (${meta.reason})` : ''}`);
            }
          });

          try {
            AchievementTracker.trackPlatformUsage(game.platform);
            AchievementTracker.trackTimePlayed(30);

            if (game.genres && game.genres.length > 0) {
              AchievementTracker.trackGenreUsage(game.genres[0]);
            }

            const totalGames = libraryChanged ? updatedLibrary.length : library.length;
            const unlockedAchievements = AchievementTracker.getUnlockedAchievements();

            if (totalGames >= 1 && !unlockedAchievements.includes('first_game')) {
              AchievementTracker.unlockAchievement('first_game');
              console.log(' Achievement unlocked: First Steps!');
            }

            const platformStats = AchievementTracker.getPlatformStats();
            const uniquePlatforms = Object.keys(platformStats).length;
            if (uniquePlatforms >= 3 && !unlockedAchievements.includes('platform_diverse')) {
              AchievementTracker.unlockAchievement('platform_diverse');
              console.log(' Achievement unlocked: Platform Diverse!');
            }

            const timeStats = AchievementTracker.getTimeStats();
            if (timeStats.total >= 60 && !unlockedAchievements.includes('hour_1')) {
              AchievementTracker.unlockAchievement('hour_1');
              console.log(' Achievement unlocked: Quick Session!');
            }

            GamingIdentity.updateGamingIdentity();
            console.log(' Achievement tracking updated');
          } catch (error) {
            console.log('Error tracking achievements:', error);
          }
        } else {
          console.error(' Game launch failed:', result.message);
          if (!hadExistingSession) {
            const currentSessions = readActiveGameSessions();
            delete currentSessions[game.name];
            localStorage.setItem('activeGameSessions', JSON.stringify(currentSessions));
          }
          alert(result.message);
        }
      });
      
      console.log(' Sending IPC message...');
      console.log(' Game data:', game);
      console.log(' IPC channel: launch-game');
      
      // Send the launch request
      ipcRenderer.send('launch-game', game);
      console.log(' IPC message sent successfully');
      console.log(' Launch request submitted for:', game.name);
      
    } catch (error) {
      console.error('Launch error:', error);
      alert(`Failed to launch ${game.name}: ${error.message}`);
    }
  }, [library, saveLibrary]);

  const launchGame = useCallback((game) => {
    console.log(`Launching ${game.name}...`);
    // Logic to trigger electron shell open or steam protocol
  }, []);

  // Store Steam price data when available
  const updateGamePrice = useCallback(async (appid, priceData) => {
    if (!appid || !priceData) return;

    try {
      // Queue the operation through OfflineManager
      const result = await OfflineManager.queueOperation({
        type: 'updateGamePrice',
        data: { appid, priceData }
      });

      if (result.queued) {
        console.log('💾 Price update queued for offline sync:', appid);
        return { queued: true, id: result.id };
      }

      // If executed immediately (online), update the library
      const updatedLibrary = library.map(game => {
        if (game.appid === appid) {
          return {
            ...game,
            price: priceData.final_formatted,
            priceNumeric: priceData.final / 100,
            lastPriceUpdate: new Date().toISOString()
          };
        }
        return game;
      });

      setLibrary(updatedLibrary);
      saveLibrary(updatedLibrary);

      return result;
    } catch (error) {
      console.error('Error updating game price:', error);
      return { success: false, error: error.message };
    }
  }, [library, saveLibrary]);

const getPerfectPlay = useCallback((mood, selectedGenre, time) => {
    if (!library || library.length === 0) return [];
    
    let filtered = [...library];
    
    // Enhanced mood-to-genre mapping with better accuracy
    const moodGenreMapping = {
      'Relaxed': ['Puzzle', 'Simulation', 'Strategy', 'Casual', 'Adventure', 'Indie'],
      'Social': ['Action', 'Sports', 'Racing', 'Party', 'Multiplayer', 'Co-op'],
      'Focused': ['Strategy', 'Puzzle', 'RPG', 'Turn-Based', 'Tactical', 'Simulation'],
      'Creative': ['Sandbox', 'Building', 'Crafting', 'RPG', 'Simulation', 'Indie'],
      'Escapist': ['Action', 'Adventure', 'RPG', 'Fantasy', 'Sci-Fi', 'Open World']
    };
    
    // Enhanced keyword matching for mood detection
    const moodKeywords = {
      'Relaxed': ['casual', 'relaxing', 'chill', 'calm', 'zen', 'peaceful', 'cozy', 'puzzle', 'simulation', 'strategy'],
      'Social': ['multiplayer', 'co-op', 'party', 'social', 'friends', 'online', 'versus', 'competitive', 'team', 'pvp'],
      'Focused': ['strategy', 'puzzle', 'thinking', 'brain', 'logic', 'planning', 'tactical', 'turn-based', 'rpg'],
      'Creative': ['building', 'crafting', 'creation', 'design', 'art', 'music', 'sandbox', 'customization', 'mod'],
      'Escapist': ['action', 'adventure', 'fantasy', 'sci-fi', 'epic', 'heroic', 'quest', 'exploration', 'story']
    };
    
    // Score each game based on mood and genre compatibility
    const scoredGames = filtered.map(game => {
      let score = 0;
      let reasons = [];
      
      // Genre-based scoring (higher weight)
      if (mood && moodGenreMapping[mood]) {
        const preferredGenres = moodGenreMapping[mood];
        game.genres.forEach(genre => {
          if (preferredGenres.includes(genre)) {
            score += 10;
            reasons.push(`Genre match: ${genre}`);
          }
        });
      }
      
      // Keyword-based scoring (medium weight)
      if (mood && moodKeywords[mood]) {
        const keywords = moodKeywords[mood];
        const gameName = (game.name || '').toLowerCase();
        const gameDesc = (game.description || '').toLowerCase();
        
        keywords.forEach(keyword => {
          if (gameName.includes(keyword.toLowerCase())) {
            score += 5;
            reasons.push(`Name keyword: ${keyword}`);
          }
          if (gameDesc.includes(keyword.toLowerCase())) {
            score += 3;
            reasons.push(`Description keyword: ${keyword}`);
          }
        });
      }
      
      // Playtime bonus (games you've played might be good for similar moods)
      if (game.playtime_forever && game.playtime_forever > 60) {
        score += 2;
        reasons.push('Previously enjoyed');
      }
      
      return { ...game, score, reasons };
    });
    
    // Apply genre filter if specified
    if (selectedGenre && selectedGenre !== '') {
      filtered = scoredGames.filter(g => {
        return gameBelongsToGenre(g.name, selectedGenre);
      });
    } else {
      // If no specific genre, use scored games
      filtered = scoredGames;
    }
    
    // Sort by score (highest first)
    filtered.sort((a, b) => (b.score || 0) - (a.score || 0));
    
    // Apply time filter with better logic
    if (time && time === 'quick') {
      // For quick games, prioritize games with shorter average playtime
      filtered = filtered.filter(g => {
        // Games that are typically shorter: puzzle, casual, indie
        const quickGenres = ['Puzzle', 'Casual', 'Indie', 'Arcade'];
        return g.genres.some(genre => quickGenres.includes(genre)) || (g.playtime_forever || 0) < 300;
      }).slice(0, Math.min(10, filtered.length));
    } else if (time && time === 'medium') {
      filtered = filtered.slice(0, Math.min(20, filtered.length));
    } else if (time && time === 'long') {
      // For long games, prioritize RPG, strategy, adventure
      filtered = filtered.filter(g => {
        const longGenres = ['RPG', 'Strategy', 'Adventure', 'Simulation'];
        return g.genres.some(genre => longGenres.includes(genre)) || (g.playtime_forever || 0) > 600;
      }).slice(0, Math.min(15, filtered.length));
    }
    
    // If no games match filters, return top scored games
    if (filtered.length === 0) {
      filtered = scoredGames.slice(0, 5);
    }
    
    // Return up to 3 random games from top 10 scored games
    const topGames = filtered.slice(0, Math.min(10, filtered.length));
    return topGames;
  }, [library]);

  const getPlaytimeStats = useCallback((games, period = 'total') => {
    // Memoization cache key
    const cacheKey = `${games?.length || 0}-${period}-${games?.map(g => `${g?.name || ''}:${g?.time_played || g?.playtime?.total || 0}:${g?.last_played || 0}`).join(',')}`;
    
    // Check if we have a cached result (simple in-memory cache)
    if (playtimeStatsCache.current.has(cacheKey)) {
      return playtimeStatsCache.current.get(cacheKey);
    }
    
    // Extremely defensive - handle all possible undefined cases
    if (!games || !Array.isArray(games) || games.length === 0) {
      const result = { total: 0, games: [], mostPlayed: [] };
      playtimeStatsCache.current.set(cacheKey, result);
      return result;
    }
    
    try {
      let totalMinutes = 0;
      let gameStats = [];
      
      games.forEach(game => {
        if (!game) return;
        
        const playtime = game.playtime || { total: 0, daily: {}, weekly: {}, monthly: {}, yearly: {} };
        
        let gameMinutes = 0;
        
        if (period === 'total') {
          gameMinutes = playtime.total || 0;
        } else if (period === 'today') {
          const today = new Date().toISOString().split('T')[0];
          gameMinutes = playtime.daily?.[today] || 0;
        } else if (period === 'thisWeek') {
          const currentDate = new Date();
          const weekKey = `${currentDate.getFullYear()}-W${Math.floor((currentDate.getDate() - 1) / 7) + 1}`;
          gameMinutes = playtime.weekly?.[weekKey] || 0;
        } else if (period === 'thisMonth') {
          const currentDate = new Date();
          const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
          gameMinutes = playtime.monthly?.[monthKey] || 0;
        } else if (period === 'thisYear') {
          const yearKey = new Date().getFullYear().toString();
          gameMinutes = playtime.yearly?.[yearKey] || 0;
        }
        
        if (gameMinutes > 0) {
          totalMinutes += gameMinutes;
          gameStats.push({
            ...game,
            periodMinutes: gameMinutes,
            totalMinutes: playtime.total || 0
          });
        }
      });
      
      // Sort by period minutes for most played
      if (Array.isArray(gameStats)) {
        gameStats.sort((a, b) => (b?.periodMinutes || 0) - (a?.periodMinutes || 0));
      } else {
        gameStats = [];
      }
      
      const mostPlayed = Array.isArray(gameStats) ? gameStats.slice(0, 10) : [];
      
      const result = {
        total: totalMinutes || 0,
        games: Array.isArray(gameStats) ? gameStats : [],
        mostPlayed: mostPlayed
      };
      
      // Cache the result
      playtimeStatsCache.current.set(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error('Error in getPlaytimeStats:', error);
      const result = { total: 0, games: [], mostPlayed: [] };
      playtimeStatsCache.current.set(cacheKey, result);
      return result;
    }
  }, []);

  const getMostPlayedGames = useCallback((games, limit = 10, period = 'total') => {
    // Extremely defensive
    if (!games || !Array.isArray(games)) {
      return [];
    }
    
    try {
      const stats = getPlaytimeStats(games, period);
      if (!stats || !stats.mostPlayed || !Array.isArray(stats.mostPlayed)) {
        return [];
      }
      return stats.mostPlayed.slice(0, limit || 10);
    } catch (error) {
    }
  }, [getPlaytimeStats]);

  // --- Effects & Lifecycle ---
  // Session Management Functions
  const endSession = useCallback((gameName) => {
    const sessions = readActiveGameSessions();
    
    if (!sessions[gameName]) {
      GameProcessMonitor.stopMonitoringByGame(gameName);
      return;
    }
    
    const currentSessionEntry = sessions[gameName];
    const sessionStartValue = getActiveSessionStartTime(currentSessionEntry);
    if (!sessionStartValue) {
      delete sessions[gameName];
      localStorage.setItem('activeGameSessions', JSON.stringify(sessions));
      GameProcessMonitor.stopMonitoringByGame(gameName);
      return;
    }

    const trackedGame = library.find((game) => (
      game?.name === gameName
      || (
        game?.appid !== undefined
        && game?.appid !== null
        && String(game.appid) === String(gameName)
      )
    )) || null;

    if (typeof currentSessionEntry === 'string') {
      sessions[gameName] = {
        ...createActiveSessionEntry(trackedGame || { name: gameName }),
        startTime: sessionStartValue,
        gameId: trackedGame?.appid || gameName
      };
      localStorage.setItem('activeGameSessions', JSON.stringify(sessions));
    }

    const sessionStart = new Date(sessionStartValue);
    const fallbackSessionMinutes = Number.isNaN(sessionStart.getTime())
      ? 0
      : Math.max(0, Math.floor((Date.now() - sessionStart.getTime()) / (1000 * 60)));
    const endedSession = PlaytimeAutoLogger.endSession(gameName);
    const sessionMinutes = Math.max(0, Number(endedSession?.playtimeMinutes || fallbackSessionMinutes));
    const sessionEndTimestamp = endedSession?.endTime ? Date.parse(endedSession.endTime) : Date.now();
    const resolvedSessionEndTimestamp = Number.isNaN(sessionEndTimestamp) ? Date.now() : sessionEndTimestamp;
    const trackedGameId = endedSession?.gameId || trackedGame?.appid || null;

    if (!endedSession) {
      delete sessions[gameName];
      localStorage.setItem('activeGameSessions', JSON.stringify(sessions));
    }
    
    if (sessionMinutes > 0) {
      // Update game playtime
      let updatedLastPlayedGame = null;
      const updatedLibrary = library.map(g => {
        const matchesGame = g.name === gameName || (
          trackedGameId !== null
          && trackedGameId !== undefined
          && g.appid !== undefined
          && g.appid !== null
          && String(g.appid) === String(trackedGameId)
        );

        if (matchesGame) {
          const playtime = {
            total: g.playtime?.total || g.time_played || 0,
            daily: { ...(g.playtime?.daily || {}) },
            weekly: { ...(g.playtime?.weekly || {}) },
            monthly: { ...(g.playtime?.monthly || {}) },
            yearly: { ...(g.playtime?.yearly || {}) }
          };
          
          const currentDate = new Date();
          const dayKey = currentDate.toISOString().split('T')[0];
          const weekKey = `${currentDate.getFullYear()}-W${Math.floor((currentDate.getDate() - 1) / 7) + 1}`;
          const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
          const yearKey = currentDate.getFullYear().toString();
          
          playtime.total = (playtime.total || 0) + sessionMinutes;
          playtime.daily[dayKey] = (playtime.daily[dayKey] || 0) + sessionMinutes;
          playtime.weekly[weekKey] = (playtime.weekly[weekKey] || 0) + sessionMinutes;
          playtime.monthly[monthKey] = (playtime.monthly[monthKey] || 0) + sessionMinutes;
          playtime.yearly[yearKey] = (playtime.yearly[yearKey] || 0) + sessionMinutes;
          
          const updatedGame = {
            ...g,
            time_played: playtime.total,
            last_played: resolvedSessionEndTimestamp,
            playtime: playtime
          };

          updatedLastPlayedGame = updatedGame;
          
          return updatedGame;
        }
        return g;
      });
      
      setLibrary(updatedLibrary);
      saveLibrary(updatedLibrary);

      if (endedSession) {
        PlaytimeAutoLogger.autoSyncOnSessionEnd(gameName, updatedLibrary);
      }
      
      // Check for achievements after recording playtime
      setTimeout(() => {
        AchievementTracker.checkAndUnlockAchievements();
      }, 100);

      if (updatedLastPlayedGame) {
        setLastPlayedGame(updatedLastPlayedGame);
      }
    }
    
    // Remove the ended session
    GameProcessMonitor.stopMonitoringByGame(gameName);
  }, [library, saveLibrary]);
  
  const checkAndEndInactiveSessions = useCallback(async () => {
    const sessions = readActiveGameSessions();
    const activeGames = Object.keys(sessions);
    
    if (activeGames.length === 0) return;
    
    const now = new Date();
    
    for (const gameName of activeGames) {
      const game = library.find(g => g.name === gameName);
      if (!game) continue;
      
      const sessionStartValue = getActiveSessionStartTime(sessions[gameName]);
      if (!sessionStartValue) {
        continue;
      }

      const sessionStart = new Date(sessionStartValue);
      const minutesSinceStart = (now - sessionStart) / (1000 * 60);
      
      // End sessions that are older than 2 hours (reasonable gaming session length)
      if (minutesSinceStart > 120) {
        endSession(gameName);
      }
    }
  }, [library, endSession]);
  
  // Load active sessions on app start
  useEffect(() => {
    const saved = localStorage.getItem('activeGameSessions');
    if (saved) {
      try {
        const parsedSessions = JSON.parse(saved);
        const normalizedSessions = Object.entries(parsedSessions).reduce((acc, [gameName, sessionEntry]) => {
          const sessionStartTime = getActiveSessionStartTime(sessionEntry);
          if (!sessionStartTime) {
            return acc;
          }

          if (typeof sessionEntry === 'object' && sessionEntry !== null) {
            acc[gameName] = {
              ...sessionEntry,
              startTime: sessionStartTime,
              gameId: sessionEntry.gameId || gameName,
              metadata: sessionEntry.metadata || {},
              paused: Boolean(sessionEntry.paused)
            };
            return acc;
          }

          acc[gameName] = {
            startTime: sessionStartTime,
            gameId: gameName,
            metadata: {},
            paused: false
          };
          return acc;
        }, {});

        localStorage.setItem('activeGameSessions', JSON.stringify(normalizedSessions));
      } catch (error) {
        console.error('Error loading active sessions:', error);
      }
    }
  }, []);

  useEffect(() => {
    window.endSession = endSession;

    return () => {
      if (window.endSession === endSession) {
        delete window.endSession;
      }
    };
  }, [endSession]);

  useEffect(() => {
    return () => {
      GameProcessMonitor.stopAllMonitors();
    };
  }, []);
  
  // Auto-end sessions when app regains focus
  useEffect(() => {
    const handleFocus = () => {
      // Disabled auto-ending - user wants manual control
      // checkAndEndInactiveSessions();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [checkAndEndInactiveSessions]);

  // Compute theme class for App div
  const themeClass = resolveThemeClassName(theme);

  // --- Render ---
  return (
    <div className={`App ${themeClass}`}>
      {/* Offline Status Indicator */}
      {(!isOnline || syncStatus.queuedOperations > 0) && (
        <div className="offline-indicator" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: !isOnline ? '#dc3545' : '#ffc107',
          color: !isOnline ? 'white' : 'black',
          padding: '8px 16px',
          textAlign: 'center',
          fontSize: '14px',
          fontWeight: 'bold',
          zIndex: 1000,
          borderBottom: '2px solid rgba(0,0,0,0.1)'
        }}>
          {!isOnline ? (
            <span>📴 You're offline - Some features may be limited</span>
          ) : (
            <span>
              🔄 Syncing {syncStatus.queuedOperations} pending operation{syncStatus.queuedOperations !== 1 ? 's' : ''}...
            </span>
          )}
        </div>
      )}

      <HashRouter>
        <Routes>
        <Route path="/" element={
          <Home 
            library={library} 
            getPerfectPlay={getPerfectPlay} 
            launchGame={launchGame}
            onLaunchGame={handleLaunchGame}
            lastPlayedGame={lastPlayedGame}
            insights={[]}
            getPlaytimeStats={getPlaytimeStats}
            getMostPlayedGames={getMostPlayedGames}
            theme={theme}
            onScan={scanLocalLibrary}
            loading={loading}
            mood={filterMood}
            setMood={setFilterMood}
            time={filterTime}
            setTime={setFilterTime}
            selectedGenre={filterGenre}
            setSelectedGenre={setFilterGenre}
            activeSessions={readActiveGameSessions()}
            endSession={endSession}
          />
        } />
        <Route path="/library" element={
          <Library 
            library={library} 
            setLibrary={setLibrary} 
            theme={theme}
            filterMood={filterMood}
            setFilterMood={setFilterMood}
            filterGenre={filterGenre}
            setFilterGenre={setFilterGenre}
            filterPlatform={filterPlatform}
            setFilterPlatform={setFilterPlatform}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            scanLocalLibrary={scanLocalLibrary}
            onLaunchGame={handleLaunchGame}
            activeSessions={readActiveGameSessions()}
            endSession={endSession}
            onUpdatePrice={updateGamePrice}
          />} 
        />
        <Route path="/stats" element={<Stats library={library} theme={theme} />} />
        <Route path="/achievements" element={<Achievements theme={theme} />} />
        <Route path="/gaming-links" element={<GamingLinks theme={theme} />} />
        <Route path="/donate" element={<Donate theme={theme} />} />
        <Route path="/settings" element={<Settings theme={theme} setTheme={setTheme} />} />
        <Route path="/profile" element={<Profile theme={theme} getPlaytimeStats={getPlaytimeStats} getMostPlayedGames={getMostPlayedGames} library={library} activeSessions={readActiveGameSessions()} endSession={endSession} />} />
        <Route path="/year-in-review" element={<YearInReview theme={theme} library={library} />} />
        <Route path="/challenge-board" element={<ChallengeBoard theme={theme} library={library} onLaunchGame={handleLaunchGame} activeSessions={readActiveGameSessions()} endSession={endSession} />} />
        <Route path="/performance" element={<PerformanceCockpit theme={theme} library={library} />} />
      </Routes>
      </HashRouter>
    </div>
  );
}
