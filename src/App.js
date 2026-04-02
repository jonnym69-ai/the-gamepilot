import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
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
import moodThemes from './themes/moodThemes.json';
import { ThemeProvider } from './ThemeContext';
import { KeyboardShortcuts } from './KeyboardShortcuts';
import { OfflineManager } from './OfflineManager';
import ControllerSupport from './components/ControllerSupport';
import { GameLaunchCoordinatorService } from './services/GameLaunchCoordinatorService';
import { LibraryScanCoordinatorService } from './services/LibraryScanCoordinatorService';
import { PlaytimeAutoLogger } from './services/PlaytimeAutoLogger';
import { ToastProvider } from './components/Toast';

const FAVORITES_STORAGE_KEY = 'favorites';

const VALID_THEME_IDS = new Set([
  'light',
  'dark',
  ...moodThemes.map((themeConfig) => themeConfig?.id).filter(Boolean)
]);

const resolveThemeClassName = (themeId) => {
  const normalizedThemeId = typeof themeId === 'string' ? themeId.trim() : '';
  return VALID_THEME_IDS.has(normalizedThemeId) ? normalizedThemeId : 'dark';
};


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
    userRating: game?.userRating !== undefined && game?.userRating !== null ? Number(game.userRating) : null,
    replayIntent: game?.replayIntent || null,
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

const CONTROLLER_NAV_ROUTES = [
  '/',
  '/library',
  '/stats',
  '/achievements',
  '/year-in-review',
  '/challenge-board',
  '/performance',
  '/gaming-links',
  '/profile',
  '/settings'
];


export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <HashRouter>
          <AppContent />
        </HashRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [library, setLibrary] = useState([]);
  const [theme, setTheme] = useState(() => {
    // Get theme from localStorage or default to 'relaxed'
    const savedTheme = localStorage.getItem('gamepilot-theme');
    return savedTheme || 'relaxed';
  });
  const [loading, setLoading] = useState(false);
  const [lastPlayedGame, setLastPlayedGame] = useState(null);
  const [isOnline, setIsOnline] = useState(OfflineManager.isOnline);
  const [syncStatus, setSyncStatus] = useState(OfflineManager.getSyncStatus());

  // Memoization caches for performance
  const playtimeStatsCache = useRef(new Map());

  useEffect(() => {
    playtimeStatsCache.current.clear();
  }, [library]);

  useEffect(() => {
    const currentPath = location.pathname || '/';

    const handleGlobalControllerNavigation = (event) => {
      const action = event?.detail?.action;
      if (!action) {
        return;
      }

      if (action === 'scroll_down') {
        window.scrollBy({ top: 220, behavior: 'smooth' });
        return;
      }

      if (action === 'scroll_up') {
        window.scrollBy({ top: -220, behavior: 'smooth' });
        return;
      }

      if (currentPath === '/library') {
        return;
      }

      const currentRouteIndex = Math.max(0, CONTROLLER_NAV_ROUTES.indexOf(currentPath));

      if (action === 'page_next') {
        const nextRoute = CONTROLLER_NAV_ROUTES[(currentRouteIndex + 1) % CONTROLLER_NAV_ROUTES.length];
        navigate(nextRoute);
        return;
      }

      if (action === 'page_previous') {
        const previousRoute = CONTROLLER_NAV_ROUTES[(currentRouteIndex - 1 + CONTROLLER_NAV_ROUTES.length) % CONTROLLER_NAV_ROUTES.length];
        navigate(previousRoute);
      }
    };

    window.addEventListener('controllerInput', handleGlobalControllerNavigation);
    return () => window.removeEventListener('controllerInput', handleGlobalControllerNavigation);
  }, [location.pathname, navigate]);

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

  const getFallbackLibrary = useCallback(() => {
    // Attempt to load previously saved library from localStorage
    console.log('Attempting to load fallback library data from localStorage...');
    const savedLibrary = localStorage.getItem('gameLibrary');
    if (savedLibrary) {
      try {
        const parsedLibrary = JSON.parse(savedLibrary);
        if (Array.isArray(parsedLibrary) && parsedLibrary.length > 0) {
          console.log('✅ Loaded saved library with', parsedLibrary.length, 'games.');
          return parsedLibrary;
        }
      } catch (e) {
        console.error('Failed to parse saved library:', e);
      }
    }
    console.log('❌ No valid saved library found, returning empty array.');
    return [];
  }, []);

  const scanLocalLibrary = useCallback(async () => {
    setLoading(true);
    console.log(' Starting local library scan...');
    
    try {
      // Check if Electron APIs are available
      const electronAvailable = typeof window.electronAPI !== 'undefined';
      if (!electronAvailable) {
        console.error('⚠️ Electron APIs not available, scanning may fail. Please restart the app.');
        // Load fallback library if available
        const fallbackLibrary = getFallbackLibrary();
        if (fallbackLibrary.length > 0) {
          console.log('✅ Fallback library loaded with', fallbackLibrary.length, 'games.');
          setLibrary(fallbackLibrary);
          saveLibrary(fallbackLibrary);
          return;
        } else {
          console.log('❌ No fallback library available, proceeding with scan attempt.');
        }
      }
      
      // Phase A: Unify scan orchestration
      // We now strictly rely on the LibraryScanCoordinatorService
      // which safely handles IPC to the native main-process scanner.
      // Renderer-side fallback scanners have been removed.
      
      console.log('Initiating library scan with current library size:', library.length);
      const { allGames = [], mergedLibrary = [], scanReport = null } = await LibraryScanCoordinatorService.scanAndMergeLibrary({
        currentLibrary: library,
        assignMoodToGame
      });

      if (scanReport) {
        console.log('📋 Scan Report:', scanReport);
      } else {
        console.log('📋 No scan report returned, check for errors in main process.');
      }

      // Fallback for production if no games are detected
      if (allGames.length === 0) {
        console.log('⚠️ No games detected, attempting fallback scan...');
        // Check if we're in production mode
        const isProduction = process.env.NODE_ENV === 'production';
        if (isProduction) {
          console.log('⚠️ Production mode detected, using fallback data if available.');
          // Use a fallback library if available or mock data for testing
          const fallbackLibrary = getFallbackLibrary();
          if (fallbackLibrary.length > 0) {
            console.log('✅ Fallback library loaded with', fallbackLibrary.length, 'games.');
            setLibrary(fallbackLibrary);
            saveLibrary(fallbackLibrary);
            return;
          } else {
            console.log('❌ No fallback library available.');
          }
        }
      }

      const platformCounts = allGames.reduce((acc, g) => {
        const key = g.platform || 'Unknown';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
      console.log('📊 Platform counts this scan:', platformCounts);

      const existingKeys = new Set((library || []).map(g => `${g.platform || 'Unknown'}::${g.name || ''}::${g.appid || ''}`));
      const newlyDiscovered = allGames.filter(g => !existingKeys.has(`${g.platform || 'Unknown'}::${g.name || ''}::${g.appid || ''}`));
      const sampleNew = newlyDiscovered.slice(0, 25).map(g => `${g.platform || 'Unknown'}: ${g.name || 'Unknown'}`);
      console.log(`🆕 New games detected this scan: ${newlyDiscovered.length}`);
      if (sampleNew.length > 0) {
        console.log('🆕 Sample new titles:', sampleNew);
        if (newlyDiscovered.length > sampleNew.length) {
          console.log(`…and ${newlyDiscovered.length - sampleNew.length} more`);
        }
      } else {
        console.log('🆕 No new games detected, total games scanned:', allGames.length);
      }

      setLibrary(mergedLibrary);
      saveLibrary(mergedLibrary);

      console.log(' Scan complete: Scanned', allGames.length, 'games across platforms');
      console.log(' Total library size:', mergedLibrary.length);
      
    } catch (err) {
      console.error(' Error during scan:', err);
      console.error(' Detailed error stack:', err.stack);
    } finally {
      setLoading(false);
    }
  }, [library, saveLibrary, assignMoodToGame, getFallbackLibrary]);

  const handleEndSession = useCallback((gameName) => {
    if (!gameName) {
      return null;
    }

    const sessionResult = PlaytimeAutoLogger.endSession(gameName);
    if (!sessionResult) {
      return null;
    }

    setLibrary((previousLibrary) => {
      const normalizedLibrary = normalizeLibraryData(previousLibrary);
      const updatedLibrary = normalizedLibrary.map((game) => {
        if (!game || game.name !== gameName) {
          return game;
        }

        const nextTimePlayed = normalizeTrackedNumber(game.time_played) + normalizeTrackedNumber(sessionResult.playtimeMinutes);
        const sessionEndTimestamp = normalizeLastPlayedValue(sessionResult.endTime) || Date.now();

        return normalizeGameLibraryEntry({
          ...game,
          time_played: nextTimePlayed,
          launch_count: normalizeTrackedNumber(game.launch_count),
          last_played: sessionEndTimestamp,
          playtime: {
            ...(game.playtime || {}),
            total: nextTimePlayed,
            daily: { ...(game.playtime?.daily || {}) },
            weekly: { ...(game.playtime?.weekly || {}) },
            monthly: { ...(game.playtime?.monthly || {}) },
            yearly: { ...(game.playtime?.yearly || {}) }
          }
        });
      });

      saveLibrary(updatedLibrary);
      const mostRecentlyPlayedGame = getMostRecentlyPlayedGame(updatedLibrary);
      if (mostRecentlyPlayedGame) {
        setLastPlayedGame(mostRecentlyPlayedGame);
      }

      PlaytimeAutoLogger.autoSyncOnSessionEnd(gameName, updatedLibrary);
      return updatedLibrary;
    });

    return sessionResult;
  }, [saveLibrary]);

  useEffect(() => {
    window.endSession = handleEndSession;

    return () => {
      if (window.endSession === handleEndSession) {
        delete window.endSession;
      }
    };
  }, [handleEndSession]);

  const handleLaunchGame = useCallback(async (game) => {
    console.log('🎮 Launching game:', game.name, 'Platform:', game.platform);
    
    try {
      // Check if Electron APIs are available
      const electronAvailable = typeof window.electronAPI !== 'undefined';
      if (!electronAvailable) {
        throw new Error('Electron APIs not available - please restart the app');
      }
      
      const result = await GameLaunchCoordinatorService.launchGame({
        game,
        library,
        onLibraryUpdated: (updatedLibrary) => {
          setLibrary(updatedLibrary);
          saveLibrary(updatedLibrary);
        },
        onLastPlayedGameUpdated: (launchedGame) => {
          setLastPlayedGame(launchedGame);
        },
        onEndSession: (gameName) => {
          handleEndSession(gameName);
        }
      });
      
      if (!result.success) {
        console.error(' Game launch failed:', result.message);
        alert(result.message);
      } else {
        console.log(' Game launched successfully:', result.result?.message || 'Launched');
      }
      
      console.log(' Launch request submitted for:', game.name);
      
    } catch (error) {
      console.error('Launch error:', error);
      alert(`Failed to launch ${game.name}: ${error.message}`);
    }
  }, [handleEndSession, library, saveLibrary]);

  const handleUpdateRating = useCallback((gameName, userRating, replayIntent) => {
    const updatedLibrary = normalizeLibraryData((library || []).map((game) => {
      if (!game || game.name !== gameName) {
        return game;
      }

      return {
        ...game,
        userRating: typeof userRating === 'number' ? userRating : game.userRating,
        replayIntent: replayIntent ?? game.replayIntent
      };
    }));

    setLibrary(updatedLibrary);
    saveLibrary(updatedLibrary);
  }, [library, saveLibrary]);

  const handleToggleFavorite = useCallback((favoriteKey) => {
    if (!favoriteKey) {
      return;
    }

    try {
      const currentFavorites = JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) || '[]');
      const normalizedFavorites = Array.isArray(currentFavorites) ? currentFavorites : [];
      const nextFavorites = normalizedFavorites.includes(favoriteKey)
        ? normalizedFavorites.filter((entry) => entry !== favoriteKey)
        : [...normalizedFavorites, favoriteKey];
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(nextFavorites));
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  }, []);

  const handleRemoveGames = useCallback((gameIds = []) => {
    const normalizedIds = Array.isArray(gameIds) ? gameIds.map((id) => String(id)).filter(Boolean) : [];
    if (normalizedIds.length === 0) {
      return;
    }

    const removalSet = new Set(normalizedIds);
    const updatedLibrary = normalizeLibraryData((library || []).filter((game) => !removalSet.has(String(game?.appid || game?.name))));
    setLibrary(updatedLibrary);
    saveLibrary(updatedLibrary);
  }, [library, saveLibrary]);

  return (
    <div className="App-container">
      <ControllerSupport />
      <Routes>
        <Route path="/" element={<Home library={library} onLaunchGame={handleLaunchGame} onScan={scanLocalLibrary} lastPlayedGame={lastPlayedGame} isOnline={isOnline} syncStatus={syncStatus} />} />
        <Route path="/library" element={<Library library={library} onLaunchGame={handleLaunchGame} onScan={scanLocalLibrary} onUpdateRating={handleUpdateRating} onToggleFavorite={handleToggleFavorite} onRemoveGames={handleRemoveGames} loading={loading} />} />
        <Route path="/stats" element={<Stats library={library} />} />
        <Route path="/achievements" element={<Achievements library={library} />} />
        <Route path="/links" element={<GamingLinks />} />
        <Route path="/gaming-links" element={<GamingLinks />} />
        <Route path="/donate" element={<Donate />} />
        <Route path="/settings" element={<Settings theme={theme} setTheme={setTheme} />} />
        <Route path="/profile" element={<Profile library={library} />} />
        <Route path="/year-in-review" element={<YearInReview library={library} />} />
        <Route path="/challenge-board" element={<ChallengeBoard library={library} />} />
        <Route path="/performance-cockpit" element={<PerformanceCockpit library={library} />} />
        <Route path="/performance" element={<PerformanceCockpit library={library} />} />
      </Routes>
    </div>
  );
}
