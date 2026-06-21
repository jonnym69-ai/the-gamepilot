import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import './App.css';
import Home from './Home';
import Library from './Library';
import Stats from './Stats';
import Settings from './Settings';
import Profile from './Profile';
import YearInReview from './YearInReview';
import Donate from './Donate';
import GamingLinks from './GamingLinks';
import LibraryIntelligence from './LibraryIntelligence';
import StartupQuestionnaire from './components/StartupQuestionnaire';
import Themes from './Themes';
import Habits from './Habits';
import Rewards from './Rewards';
import ThemeBuilder from './ThemeBuilder';
import Achievements from './Achievements';
import ExportHub from './ExportHub';
import ChallengeBoard from './ChallengeBoard';
import StorageManager from './StorageManager';
import PerformanceCockpit from './PerformanceCockpit';
import SwipeDeck from './SwipeDeck';
import Recommendations from './Recommendations';
import FreeGames from './FreeGames';
import moodThemes from './themes/moodThemes.json';
import { ThemeProvider } from './ThemeContext';
import { KeyboardShortcuts } from './KeyboardShortcuts';
import { OfflineManager } from './OfflineManager';
import ControllerSupport from './components/ControllerSupport';
import ErrorBoundary from './components/ErrorBoundary';
import { GameLaunchCoordinatorService } from './services/GameLaunchCoordinatorService';
import { LibraryScanCoordinatorService } from './services/LibraryScanCoordinatorService';
import {
  normalizeGameLibraryEntry,
  normalizeLibraryData,
  normalizeTrackedNumber,
  normalizeLastPlayedValue,
  getMostRecentlyPlayedGame
} from './services/LibraryDataService';
import { PlaytimeAutoLogger } from './services/PlaytimeAutoLogger';
import { PlaytimeEnrichmentService } from './services/PlaytimeEnrichmentService';
import { SteamGenreEnrichmentService } from './services/SteamGenreEnrichmentService';
import { ToastProvider, useToast } from './components/Toast';
import LevelUpToast from './components/LevelUpToast';
import WeeklySummaryToast from './components/WeeklySummaryToast';
import { DailyEngagementService } from './services/DailyEngagementService';
import { AchievementTracker } from './AchievementSystem';
import { EasterEggService } from './services/EasterEggService';
import { SeasonalRewardService } from './services/SeasonalRewardService';
import CalendarXPService from './services/CalendarXPService';
import { GameCurationService } from './services/GameCurationService';
import { GameRatingService } from './services/GameRatingService';
import { UserBehaviorProfile } from './services/UserBehaviorProfile';
import { HabitTrackerService } from './services/HabitTrackerService';
import StorageService from './services/StorageService';
import { assignMoodToGame as importedAssignMoodToGame } from './services/MoodAssignmentService';
import { resolveGameArtwork } from './services/GameArtworkService';
import CommandPalette from './components/CommandPalette';
import QuickLaunchHotbar from './components/QuickLaunchHotbar';
import AnimatedBackground from './components/AnimatedBackground';
import FirstRunWalkthrough, { shouldShowFirstRunWalkthrough } from './components/FirstRunWalkthrough';

// One-time migration: copy legacy 'gameLibrary' key to prefixed 'gamepilot-library'
StorageService.migrate();

const FAVORITES_STORAGE_KEY = 'favorites';
const STILL_PLAYING_PROMPT_DELAY_MS = 15 * 60 * 1000;

const VALID_THEME_IDS = new Set([
  'light',
  'dark',
  ...moodThemes.map((themeConfig) => themeConfig?.id).filter(Boolean)
]);

const resolveThemeClassName = (themeId) => {
  const normalizedThemeId = typeof themeId === 'string' ? themeId.trim() : '';
  return VALID_THEME_IDS.has(normalizedThemeId) ? normalizedThemeId : 'dark';
};


const getDateBucketKeys = (timestampValue) => {
  const date = new Date(normalizeLastPlayedValue(timestampValue) || Date.now());
  const year = date.getFullYear();
  const month = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  const daily = date.toISOString().split('T')[0];
  const weekStart = new Date(date);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekly = weekStart.toISOString().split('T')[0];
  return { daily, weekly, monthly: month, yearly: String(year) };
};

const incrementPlaytimeBucket = (bucket, key, minutes) => ({
  ...(bucket || {}),
  [key]: normalizeTrackedNumber(bucket?.[key]) + normalizeTrackedNumber(minutes)
});


const CONTROLLER_NAV_ROUTES = [
  '/',
  '/library',
  '/stats',
  '/profile',
  '/settings',
  '/gaming-links',
  '/donate',
  '/library-intelligence',
  '/habits',
  '/year-in-review',
  '/themes'
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
  const [filterMood, setFilterMood] = useState('');
  const [filterTime, setFilterTime] = useState('');
  const [filterGenre, setFilterGenre] = useState('');
  const [theme, setTheme] = useState(() => {
    // Get theme from localStorage or default to 'relaxed'
    const savedTheme = localStorage.getItem('gamepilot-theme');
    return savedTheme || 'relaxed';
  });
  const [loading, setLoading] = useState(false);
  const [lastPlayedGame, setLastPlayedGame] = useState(null);
  const [isOnline, setIsOnline] = useState(OfflineManager.isOnline);
  const [syncStatus, setSyncStatus] = useState(OfflineManager.getSyncStatus());
  const [activeSessions, setActiveSessions] = useState(() => PlaytimeAutoLogger.getActiveSessions());
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [showWeeklySummary, setShowWeeklySummary] = useState(false);
  const [weeklyStats, setWeeklyStats] = useState(null);
  const [previousLevel, setPreviousLevel] = useState(1);
  const [stillPlayingPrompt, setStillPlayingPrompt] = useState(null);
  const [stillPlayingDeadlines, setStillPlayingDeadlines] = useState({});
  const [showFirstRunWalkthrough, setShowFirstRunWalkthrough] = useState(() => shouldShowFirstRunWalkthrough());
  const [dynamicCoverBg, setDynamicCoverBg] = useState(() => StorageService.getString('dynamicCoverBg') === 'true');
  const [minimizeOnLaunch, setMinimizeOnLaunch] = useState(() => StorageService.getString('minimizeOnLaunch') === 'true');
  const { success: toastSuccess, error: toastError } = useToast();

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

      window.setTimeout(() => {
        if (event.defaultPrevented) {
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
      }, 0);
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

  // Refresh sync status when the app becomes active again
  useEffect(() => {
    const refreshSyncStatus = () => {
      setSyncStatus(OfflineManager.getSyncStatus());
    };

    window.addEventListener('focus', refreshSyncStatus);
    document.addEventListener('visibilitychange', refreshSyncStatus);

    return () => {
      window.removeEventListener('focus', refreshSyncStatus);
      document.removeEventListener('visibilitychange', refreshSyncStatus);
    };
  }, []);

  // Initialize keyboard shortcuts
  useEffect(() => {
    const focusSearchInput = () => {
      // Focus search input if we're on the library page
      const searchInput = document.querySelector('input[placeholder*="search" i], input[placeholder*="Search" i]');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    };

    KeyboardShortcuts.registerAction('focus_search', 'Ctrl+K', focusSearchInput, 'Focus search');

    KeyboardShortcuts.registerAction('go_library', 'Ctrl+L', () => {
      window.location.hash = '#/library';
    }, 'Go to Library');

    KeyboardShortcuts.registerAction('go_home', 'Ctrl+H', () => {
      window.location.hash = '#/';
    }, 'Go to Home');

    KeyboardShortcuts.registerAction('go_profile', 'Ctrl+P', () => {
      window.location.hash = '#/profile';
    }, 'Go to Profile');

    KeyboardShortcuts.registerAction('go_stats', 'Ctrl+S', () => {
      window.location.hash = '#/stats';
    }, 'Go to Stats');

    KeyboardShortcuts.registerAction('go_settings', 'Ctrl+T', () => {
      window.location.hash = '#/settings';
    }, 'Go to Settings');

    KeyboardShortcuts.registerAction('show_shortcuts', '?', () => {
      KeyboardShortcuts.showHelp();
    }, 'Show keyboard shortcuts');

    return () => {
      KeyboardShortcuts.unregisterAction('focus_search');
      KeyboardShortcuts.unregisterAction('go_library');
      KeyboardShortcuts.unregisterAction('go_home');
      KeyboardShortcuts.unregisterAction('go_profile');
      KeyboardShortcuts.unregisterAction('go_stats');
      KeyboardShortcuts.unregisterAction('go_settings');
      KeyboardShortcuts.unregisterAction('show_shortcuts');
    };
  }, []);

  // Listen for easter egg inputs
  useEffect(() => {
    const handleKeyDown = (e) => {
      const result = EasterEggService.handleKeyPress(e.key);
      if (result?.type === 'activated') {
        // Easter egg activated
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Check for level-up and weekly summary on app load
  useEffect(() => {
    const checkLevelUp = () => {
      const xpStats = AchievementTracker.getXPStats();
      const newLevel = xpStats.level || 1;
      if (newLevel > previousLevel) {
        setCurrentLevel(newLevel);
        setShowLevelUp(true);
      }
      setPreviousLevel(newLevel);
    };

    const checkWeeklySummary = () => {
      const dayOfWeek = new Date().getDay();
      const lastSummary = localStorage.getItem('lastWeeklySummary');
      const today = new Date().toISOString().split('T')[0];

      if (dayOfWeek === 0 && lastSummary !== today) {
        const stats = DailyEngagementService.getWeeklySummary();
        const timeStats = AchievementTracker.getTimeStats();
        
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

        let hoursThisWeek = 0;
        let hoursLastWeek = 0;
        let gamesPlayed = new Set();

        Object.entries(timeStats.daily || {}).forEach(([date, minutes]) => {
          if (date >= weekAgo.toISOString().split('T')[0]) {
            hoursThisWeek += minutes;
          } else if (date >= twoWeeksAgo.toISOString().split('T')[0]) {
            hoursLastWeek += minutes;
          }
        });

        library.forEach(game => {
          if (game.last_played) {
            const lastPlayed = new Date(game.last_played);
            if (lastPlayed >= weekAgo) {
              gamesPlayed.add(game.name);
            }
          }
        });

        const topGame = library.length > 0
          ? [...library].sort((a, b) => (b.time_played || 0) - (a.time_played || 0))[0]?.name
          : null;

        setWeeklyStats({
          hoursThisWeek: Math.round(hoursThisWeek / 60),
          hoursLastWeek: Math.round(hoursLastWeek / 60),
          gamesPlayed: gamesPlayed.size,
          topGame,
          streak: stats?.currentStreak || 0
        });
        setShowWeeklySummary(true);
        localStorage.setItem('lastWeeklySummary', today);
      }
    };

    checkLevelUp();
    checkWeeklySummary();

    // Auto-check calendar rewards on startup
    try {
      const birthdayReward = CalendarXPService.processBirthdayReward();
      if (birthdayReward.success) {
        // Birthday reward auto-claimed; XP already granted via AchievementTracker
        console.log('[CalendarXP]', birthdayReward.message);
      }
      const anniversaryReward = CalendarXPService.checkAnniversaryReward();
      if (anniversaryReward.success) {
        console.log('[CalendarXP]', anniversaryReward.message);
      }
      const christmasReward = CalendarXPService.processChristmasReward();
      if (christmasReward.success) {
        console.log('[CalendarXP]', christmasReward.message);
      }
    } catch (e) {
      console.warn('Calendar auto-reward check failed:', e);
    }
  }, [library, previousLevel]);

  // Apply theme globally and save to localStorage
  useEffect(() => {
    const animationsEnabled = localStorage.getItem('animationsEnabled') !== 'false';

    // Clear any invalid cached theme
    const savedTheme = localStorage.getItem('gamepilot-theme');
    if (savedTheme && !VALID_THEME_IDS.has(savedTheme)) {
      localStorage.removeItem('gamepilot-theme');
      // Cleared invalid cached theme
    }

    const themeClass = resolveThemeClassName(theme);
    const bigScreenMode = localStorage.getItem('gamepilot-bigScreenMode') === 'true';
    const newBodyClass = `App ${themeClass}${animationsEnabled ? '' : ' no-animations'}${bigScreenMode ? ' big-screen-mode' : ''}`;

    if (theme !== themeClass) {
      setTheme(themeClass);
    }

    // Only update if the class has actually changed
    if (document.body.className !== newBodyClass) {
      // Theme applied
      document.body.className = newBodyClass;
      localStorage.setItem('gamepilot-theme', themeClass);
    }
  }, [theme]);

  // React to big-screen mode toggle from ThemeContext
  useEffect(() => {
    const handleBigScreenToggle = () => {
      const animationsEnabled = localStorage.getItem('animationsEnabled') !== 'false';
      const themeClass = resolveThemeClassName(theme);
      const bigScreenMode = localStorage.getItem('gamepilot-bigScreenMode') === 'true';
      const newBodyClass = `App ${themeClass}${animationsEnabled ? '' : ' no-animations'}${bigScreenMode ? ' big-screen-mode' : ''}`;
      if (document.body.className !== newBodyClass) {
        document.body.className = newBodyClass;
      }
    };
    window.addEventListener('gamepilot:bigscreen-toggled', handleBigScreenToggle);
    return () => window.removeEventListener('gamepilot:bigscreen-toggled', handleBigScreenToggle);
  }, [theme]);

  // --- Utility Functions ---
  const saveLibrary = useCallback((libraryData) => {
    try {
      const normalizedLibraryData = normalizeLibraryData(libraryData);
      StorageService.set('library', normalizedLibraryData);
    } catch (err) {
      console.error(' Error saving library:', err);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const parsedLibrary = StorageService.get('library', null);
        if (!Array.isArray(parsedLibrary) || parsedLibrary.length === 0) {
          return;
        }

        let enrichedLibrary = PlaytimeEnrichmentService.enrichLibraryWithPlaytime(parsedLibrary);
        const curatedLibrary = GameCurationService.enrichLibrary(enrichedLibrary);
        let normalizedLibrary = normalizeLibraryData(curatedLibrary);
        setLibrary(normalizedLibrary);

        const mostRecentlyPlayedGame = getMostRecentlyPlayedGame(normalizedLibrary);
        if (mostRecentlyPlayedGame) {
          setLastPlayedGame(mostRecentlyPlayedGame);
        }

        // Background Steam genre enrichment for games with generic Story-driven fallback
        try {
          const genreEnriched = await SteamGenreEnrichmentService.runBackgroundEnrichment(normalizedLibrary);
          if (genreEnriched && JSON.stringify(genreEnriched) !== JSON.stringify(normalizedLibrary)) {
            const reNormalized = normalizeLibraryData(genreEnriched);
            setLibrary(reNormalized);
            StorageService.set('library', reNormalized);
          }
        } catch (genreErr) {
          console.warn('Steam genre enrichment skipped:', genreErr.message);
        }

        if (JSON.stringify(parsedLibrary) !== JSON.stringify(normalizedLibrary)) {
          StorageService.set('library', normalizedLibrary);
        }
      } catch (error) {
        console.error('Error loading saved library:', error);
      }
    })();
  }, []);

  // Use the canonical genre→mood system from MoodAssignmentService (no hardcoded game names)
  const assignMoodToGame = useCallback((gameName, genres = []) => {
    return importedAssignMoodToGame(gameName, genres);
  }, []);

  const getFallbackLibrary = useCallback(() => {
    // Attempt to load previously saved library from localStorage
    const stored = StorageService.get('library', []);
    return Array.isArray(stored) && stored.length > 0 ? stored : [];
  }, []);

  const scanLocalLibrary = useCallback(async () => {
    setLoading(true);

    try {
      const electronAvailable = typeof window.electronAPI !== 'undefined';
      if (!electronAvailable) {
        const fallbackLibrary = getFallbackLibrary();
        if (fallbackLibrary.length > 0) {
          setLibrary(fallbackLibrary);
          saveLibrary(fallbackLibrary);
          return;
        }
      }

      const { allGames = [], mergedLibrary = [], scanReport = null } = await LibraryScanCoordinatorService.scanAndMergeLibrary({
        currentLibrary: library,
        assignMoodToGame,
        manual: true
      });

      if (allGames.length === 0) {
        const fallbackLibrary = getFallbackLibrary();
        if (fallbackLibrary.length > 0) {
          const enrichedFallback = PlaytimeEnrichmentService.enrichLibraryWithPlaytime(fallbackLibrary);
          const curatedFallback = GameCurationService.enrichLibrary(enrichedFallback);
          setLibrary(curatedFallback);
          saveLibrary(curatedFallback);
          return;
        }
      }

      const enrichedMerged = PlaytimeEnrichmentService.enrichLibraryWithPlaytime(mergedLibrary);
      // Record newly discovered games for Recently Added tracking
      enrichedMerged.forEach((game) => GameCurationService.recordGameSeen(game.name));
      const curatedMerged = GameCurationService.enrichLibrary(enrichedMerged);
      setLibrary(curatedMerged);
      saveLibrary(curatedMerged);

      window.dispatchEvent(new CustomEvent('gamepilot:scan-complete', {
        detail: { scanReport, gameCount: curatedMerged.length }
      }));

    } catch (err) {
      console.error(' Error during scan:', err);
      console.error(' Detailed error stack:', err.stack);
    } finally {
      setLoading(false);
    }
  }, [library, saveLibrary, assignMoodToGame, getFallbackLibrary]);

  const handleLibraryUpdated = useCallback((updatedLibrary) => {
    const normalizedLibrary = normalizeLibraryData(updatedLibrary);
    setLibrary(normalizedLibrary);
    saveLibrary(normalizedLibrary);
  }, [saveLibrary]);

  const handleEndSession = useCallback((gameName) => {
    if (!gameName) {
      return null;
    }

    const sessionResult = PlaytimeAutoLogger.endSession(gameName);
    if (!sessionResult) {
      return null;
    }

    const endedGame = library.find((g) => g?.name === gameName);
    const genres = endedGame?.genres || [];
    try {
      HabitTrackerService.recordSession(gameName, sessionResult.playtimeMinutes || 0, genres);
    } catch (habitError) {
      console.error('Habit tracking failed during session end:', habitError);
    }

    let endedGameSnapshot = null;

    setLibrary((previousLibrary) => {
      const normalizedLibrary = normalizeLibraryData(previousLibrary);
      const updatedLibrary = normalizedLibrary.map((game) => {
        if (!game || game.name !== gameName) {
          return game;
        }

        endedGameSnapshot = game;

        const nextTimePlayed = normalizeTrackedNumber(game.time_played) + normalizeTrackedNumber(sessionResult.playtimeMinutes);
        const sessionEndTimestamp = normalizeLastPlayedValue(sessionResult.endTime) || Date.now();
        const bucketKeys = getDateBucketKeys(sessionEndTimestamp);
        const currentPlaytime = game.playtime || {};

        return normalizeGameLibraryEntry({
          ...game,
          time_played: nextTimePlayed,
          launch_count: normalizeTrackedNumber(game.launch_count),
          last_played: sessionEndTimestamp,
          playtime: {
            ...currentPlaytime,
            total: nextTimePlayed,
            daily: incrementPlaytimeBucket(currentPlaytime.daily, bucketKeys.daily, sessionResult.playtimeMinutes),
            weekly: incrementPlaytimeBucket(currentPlaytime.weekly, bucketKeys.weekly, sessionResult.playtimeMinutes),
            monthly: incrementPlaytimeBucket(currentPlaytime.monthly, bucketKeys.monthly, sessionResult.playtimeMinutes),
            yearly: incrementPlaytimeBucket(currentPlaytime.yearly, bucketKeys.yearly, sessionResult.playtimeMinutes)
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

    setActiveSessions(PlaytimeAutoLogger.getActiveSessions());

    if (minimizeOnLaunch && window.electronAPI?.restoreWindow) {
      window.electronAPI.restoreWindow().catch(() => {});
    }

    window.dispatchEvent(new CustomEvent('gamepilot:session-ended', {
      detail: {
        gameName,
        gameId: endedGameSnapshot?.appid || endedGameSnapshot?.name || gameName,
        mood: endedGameSnapshot?.mood || null,
        genre: Array.isArray(endedGameSnapshot?.genres)
          ? endedGameSnapshot.genres.find((genre) => genre && genre !== 'Unknown') || null
          : null,
        playtimeMinutes: normalizeTrackedNumber(sessionResult.playtimeMinutes),
        endTime: sessionResult.endTime || Date.now()
      }
    }));

    return sessionResult;
  }, [library, saveLibrary, minimizeOnLaunch]);

  useEffect(() => {
    window.endSession = handleEndSession;

    return () => {
      if (window.endSession === handleEndSession) {
        delete window.endSession;
      }
    };
  }, [handleEndSession]);

  // Startup recovery: end any stale active sessions left over from a previous
  // unclean exit (crash, kill, or system shutdown while GamePilot was running).
  useEffect(() => {
    const staleSessions = PlaytimeAutoLogger.getActiveSessions();
    const staleNames = Object.keys(staleSessions);
    if (staleNames.length > 0) {
      console.log('[SessionRecovery] Ending stale sessions from previous run:', staleNames);
      PlaytimeAutoLogger.endAllSessions();
      // Refresh local state so the UI doesn't show phantom active sessions
      setActiveSessions(PlaytimeAutoLogger.getActiveSessions());
    }
  }, []);

  // Guard window close while an active session is running.
  // In Electron this shows a native confirmation dialog.
  useEffect(() => {
    const onBeforeUnload = (e) => {
      const sessions = PlaytimeAutoLogger.getActiveSessions();
      const names = Object.keys(sessions);
      if (names.length > 0) {
        const label = names.length === 1 ? names[0] : `${names.length} games`;
        const message = `Active session in progress for ${label}. Close anyway?`;
        e.preventDefault();
        e.returnValue = message;
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  // Dynamic cover-art background: when enabled, use the last played game's
  // cover art as a subtle full-screen background with a dark overlay so UI
  // text stays readable across all themes.
  useEffect(() => {
    const root = document.documentElement;
    if (dynamicCoverBg && lastPlayedGame) {
      const coverUrl = resolveGameArtwork(lastPlayedGame, { surface: 'wide' });
      if (coverUrl) {
        root.style.setProperty('--dynamic-cover-image', `url(${coverUrl})`);
        document.body.classList.add('dynamic-cover-bg');
      } else {
        document.body.classList.remove('dynamic-cover-bg');
        root.style.removeProperty('--dynamic-cover-image');
      }
    } else {
      document.body.classList.remove('dynamic-cover-bg');
      root.style.removeProperty('--dynamic-cover-image');
    }
  }, [dynamicCoverBg, lastPlayedGame]);
  useEffect(() => {
    if (!window.electronAPI?.onSystemShutdown) return undefined;
    const unsubscribe = window.electronAPI.onSystemShutdown(() => {
      console.log('[Session] System shutdown imminent — ending all active sessions');
      PlaytimeAutoLogger.endAllSessions();
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const handleSessionEnded = (event) => {
      const detail = event?.detail;
      if (!detail?.gameName) return;
      const minutes = Number(detail?.playtimeMinutes) || 0;
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const timeString = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
      toastSuccess(`Session saved: +${timeString} to ${detail.gameName}`, 5000);
    };

    window.addEventListener('gamepilot:session-ended', handleSessionEnded);
    return () => window.removeEventListener('gamepilot:session-ended', handleSessionEnded);
  }, [toastSuccess]);

  useEffect(() => {
    setStillPlayingDeadlines((previousDeadlines) => {
      const nextDeadlines = {};

      Object.entries(activeSessions || {}).forEach(([gameName, session]) => {
        const existingDeadline = previousDeadlines[gameName];
        const sessionStart = session?.startTime ? new Date(session.startTime).getTime() : NaN;
        const baseDeadline = Number.isFinite(sessionStart)
          ? sessionStart + STILL_PLAYING_PROMPT_DELAY_MS
          : Date.now() + STILL_PLAYING_PROMPT_DELAY_MS;

        nextDeadlines[gameName] = typeof existingDeadline === 'number' ? existingDeadline : baseDeadline;
      });

      const previousKeys = Object.keys(previousDeadlines || {});
      const nextKeys = Object.keys(nextDeadlines);
      const didChange = previousKeys.length !== nextKeys.length
        || previousKeys.some((key) => previousDeadlines[key] !== nextDeadlines[key]);

      return didChange ? nextDeadlines : previousDeadlines;
    });
  }, [activeSessions]);

  useEffect(() => {
    if (stillPlayingPrompt) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      const now = Date.now();
      const nextPromptGame = Object.keys(activeSessions || {}).find((gameName) => {
        const deadline = stillPlayingDeadlines?.[gameName];
        return typeof deadline === 'number' && deadline <= now;
      });

      if (nextPromptGame) {
        setStillPlayingPrompt({ gameName: nextPromptGame });
      }
    }, 60 * 1000);

    const now = Date.now();
    const immediatePromptGame = Object.keys(activeSessions || {}).find((gameName) => {
      const deadline = stillPlayingDeadlines?.[gameName];
      return typeof deadline === 'number' && deadline <= now;
    });

    if (immediatePromptGame) {
      setStillPlayingPrompt({ gameName: immediatePromptGame });
    }

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeSessions, stillPlayingDeadlines, stillPlayingPrompt]);

  const handleStillPlayingContinue = useCallback(() => {
    if (!stillPlayingPrompt?.gameName) {
      setStillPlayingPrompt(null);
      return;
    }

    setStillPlayingDeadlines((previousDeadlines) => ({
      ...previousDeadlines,
      [stillPlayingPrompt.gameName]: Date.now() + STILL_PLAYING_PROMPT_DELAY_MS
    }));
    setStillPlayingPrompt(null);
  }, [stillPlayingPrompt]);

  const handleStillPlayingEndSession = useCallback(() => {
    if (!stillPlayingPrompt?.gameName) {
      setStillPlayingPrompt(null);
      return;
    }

    handleEndSession(stillPlayingPrompt.gameName);
    setStillPlayingDeadlines((previousDeadlines) => {
      const nextDeadlines = { ...(previousDeadlines || {}) };
      delete nextDeadlines[stillPlayingPrompt.gameName];
      return nextDeadlines;
    });
    setStillPlayingPrompt(null);
  }, [handleEndSession, stillPlayingPrompt]);

  const handleLaunchGame = useCallback(async (game) => {
    try {
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
        toastError(result.message);
      } else {
        setActiveSessions(PlaytimeAutoLogger.getActiveSessions());

        const seasonalReward = SeasonalRewardService.trackGamePlay(game);
        if (seasonalReward) {
          // Seasonal reward unlocked
        }

        if (minimizeOnLaunch && window.electronAPI?.minimizeWindow) {
          window.electronAPI.minimizeWindow().catch(() => {});
        }
      }
      
    } catch (error) {
      console.error('Launch error:', error);
      toastError(`Failed to launch ${game.name}: ${error.message}`);
    }
  }, [handleEndSession, library, saveLibrary, toastError, minimizeOnLaunch]);

  // Listen for launch requests from CommandPalette / QuickLaunchHotbar
  useEffect(() => {
    const onLaunchRequest = (e) => {
      const game = e?.detail;
      if (game) {
        handleLaunchGame(game);
      }
    };
    window.addEventListener('gamepilot:launch-game', onLaunchRequest);
    return () => window.removeEventListener('gamepilot:launch-game', onLaunchRequest);
  }, [handleLaunchGame]);

  const handleUpdateRating = useCallback((gameName, userRating, replayIntent, extra = {}) => {
    const updatedLibrary = normalizeLibraryData((library || []).map((game) => {
      if (!game || game.name !== gameName) {
        return game;
      }

      const gameId = String(game.appid || game.name || '');
      if (gameId) {
        GameRatingService.setRating(gameId, {
          value: typeof userRating === 'number' ? userRating : game.userRating,
          wouldReplay: extra?.wouldReplay,
          tags: extra?.tags
        });
      }

      return {
        ...game,
        userRating: typeof userRating === 'number' ? userRating : game.userRating,
        replayIntent: replayIntent ?? game.replayIntent,
        wouldReplay: extra?.wouldReplay ?? game.wouldReplay,
        userRatingTags: extra?.tags ?? game.userRatingTags
      };
    }));

    setLibrary(updatedLibrary);
    saveLibrary(updatedLibrary);

    if (typeof userRating === 'number' && userRating > 0) {
      const targetGame = (library || []).find((g) => g?.name === gameName);
      if (targetGame) {
        UserBehaviorProfile.trackRating({
          gameId: String(targetGame.appid || targetGame.name || ''),
          rating: userRating,
          wouldReplay: extra?.wouldReplay,
          tags: extra?.tags,
          mood: targetGame.mood || null,
          genres: Array.isArray(targetGame.genres) ? targetGame.genres : []
        });
      }
    }
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

  // --- Curation handlers ---
  const handleUpdateCollections = useCallback((gameName, collectionIds) => {
    GameCurationService.setGameCollections(gameName, collectionIds);
    setLibrary((prev) => {
      const updatedLibrary = normalizeLibraryData(prev.map((g) => (g.name === gameName ? GameCurationService.enrichGame(g) : g)));
      saveLibrary(updatedLibrary);
      return updatedLibrary;
    });
  }, [saveLibrary]);

  const handleToggleHidden = useCallback((gameName) => {
    const isHidden = GameCurationService.toggleHiddenGame(gameName);
    setLibrary((prev) => {
      const updatedLibrary = normalizeLibraryData(prev.map((g) => (g.name === gameName ? { ...g, isHidden } : g)));
      saveLibrary(updatedLibrary);
      return updatedLibrary;
    });
  }, [saveLibrary]);

  const handleUpdateCompletion = useCallback((gameName, status, note) => {
    GameCurationService.setGameCompletion(gameName, status, note);
    setLibrary((prev) => {
      const updatedLibrary = normalizeLibraryData(prev.map((g) => (g.name === gameName ? GameCurationService.enrichGame(g) : g)));
      saveLibrary(updatedLibrary);
      return updatedLibrary;
    });
  }, [saveLibrary]);

  const handleUpdateNotes = useCallback((gameName, text) => {
    GameCurationService.setGameNotes(gameName, text);
    setLibrary((prev) => {
      const updatedLibrary = normalizeLibraryData(prev.map((g) => (g.name === gameName ? GameCurationService.enrichGame(g) : g)));
      saveLibrary(updatedLibrary);
      return updatedLibrary;
    });
  }, [saveLibrary]);

  const handleUpdateCoverArt = useCallback((gameName, url) => {
    GameCurationService.setCoverArtOverride(gameName, url);
    setLibrary((prev) => {
      const updatedLibrary = normalizeLibraryData(prev.map((g) => (g.name === gameName ? GameCurationService.enrichGame(g) : g)));
      saveLibrary(updatedLibrary);
      return updatedLibrary;
    });
  }, [saveLibrary]);

  const handleAddSessionNote = useCallback((gameName, text) => {
    GameCurationService.addSessionNote(gameName, text);
    setLibrary((prev) => {
      const updatedLibrary = normalizeLibraryData(prev.map((g) => (g.name === gameName ? GameCurationService.enrichGame(g) : g)));
      saveLibrary(updatedLibrary);
      return updatedLibrary;
    });
  }, [saveLibrary]);

  return (
    <div className="App-container">
      <AnimatedBackground themeId={theme} />
      <ControllerSupport />
      <CommandPalette />
      <QuickLaunchHotbar library={library} />
      <FirstRunWalkthrough
        isOpen={showFirstRunWalkthrough}
        onClose={() => setShowFirstRunWalkthrough(false)}
        onOpenLibrary={() => navigate('/library')}
        onOpenSettings={() => navigate('/settings')}
        onStartScan={() => {
          navigate('/');
          window.setTimeout(() => {
            scanLocalLibrary();
          }, 0);
        }}
      />
      <LevelUpToast 
        show={showLevelUp} 
        level={currentLevel} 
        xpTotal={AchievementTracker.getXPStats().totalXP}
        onClose={() => setShowLevelUp(false)}
      />
      <WeeklySummaryToast 
        show={showWeeklySummary} 
        stats={weeklyStats}
        onClose={() => setShowWeeklySummary(false)}
      />
      {loading && (
        <div className="scan-overlay" role="status" aria-live="polite" aria-label="Scanning local game libraries">
          <div className="scan-overlay-card">
            <div className="scan-radar" aria-hidden="true">
              <span className="scan-radar-sweep" />
              <span className="scan-radar-dot dot-one" />
              <span className="scan-radar-dot dot-two" />
              <span className="scan-radar-dot dot-three" />
            </div>
            <p className="scan-overlay-eyebrow">Library scan in progress</p>
            <h2>Finding your games...</h2>
            <p>
              GamePilot is checking your local launchers and install folders. This can take around 30 seconds on larger libraries.
            </p>
            <div className="scan-overlay-progress">
              <span />
            </div>
            <p className="scan-overlay-note">Please keep GamePilot open while the scan finishes.</p>
          </div>
        </div>
      )}
      {stillPlayingPrompt?.gameName && activeSessions?.[stillPlayingPrompt.gameName] && (
        <div className="modal-overlay" onClick={handleStillPlayingContinue}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()} style={{ maxWidth: '520px', textAlign: 'center' }}>
            <h2 className={`modal-title ${theme}`}>Are you still playing?</h2>
            <p style={{ marginBottom: '18px', lineHeight: 1.6 }}>
              <strong>{stillPlayingPrompt.gameName}</strong> has been active for 15 minutes.
            </p>
            <p style={{ marginBottom: '24px', opacity: 0.8, lineHeight: 1.6 }}>
              Keep the session running if you are still playing, or end it now so your stats do not keep climbing by accident.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button onClick={handleStillPlayingContinue} className="getting-started-primary">Yes, still playing</button>
              <button onClick={handleStillPlayingEndSession} className="getting-started-secondary">End Session</button>
            </div>
          </div>
        </div>
      )}
      <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Home library={library} onLaunchGame={handleLaunchGame} onScan={scanLocalLibrary} lastPlayedGame={lastPlayedGame} isOnline={isOnline} syncStatus={syncStatus} activeSessions={activeSessions} endSession={handleEndSession} mood={filterMood} time={filterTime} selectedGenre={filterGenre} setMood={setFilterMood} setTime={setFilterTime} setSelectedGenre={setFilterGenre} theme={theme} loading={loading} />} />
        <Route path="/dashboard" element={<Home mode="dashboard" library={library} onLaunchGame={handleLaunchGame} onScan={scanLocalLibrary} lastPlayedGame={lastPlayedGame} isOnline={isOnline} syncStatus={syncStatus} activeSessions={activeSessions} endSession={handleEndSession} mood={filterMood} time={filterTime} selectedGenre={filterGenre} setMood={setFilterMood} setTime={setFilterTime} setSelectedGenre={setFilterGenre} theme={theme} loading={loading} />} />
        <Route path="/library" element={<Library library={library} setLibrary={setLibrary} onLibraryUpdated={handleLibraryUpdated} onLaunchGame={handleLaunchGame} onScan={scanLocalLibrary} onScanLibrary={scanLocalLibrary} scanLocalLibrary={scanLocalLibrary} onUpdateRating={handleUpdateRating} onToggleFavorite={handleToggleFavorite} onRemoveGames={handleRemoveGames} onUpdateCollections={handleUpdateCollections} onToggleHidden={handleToggleHidden} onUpdateCompletion={handleUpdateCompletion} onUpdateNotes={handleUpdateNotes} onUpdateCoverArt={handleUpdateCoverArt} onAddSessionNote={handleAddSessionNote} loading={loading} />} />
        <Route path="/stats" element={<Stats library={library} />} />
        <Route path="/themes" element={<Themes />} />
        <Route path="/habits" element={<Habits library={library} />} />
        <Route path="/rewards" element={<Rewards />} />
        <Route path="/theme-builder" element={<ThemeBuilder />} />
        <Route path="/settings" element={<Settings theme={theme} setTheme={setTheme} library={library} dynamicCoverBg={dynamicCoverBg} setDynamicCoverBg={setDynamicCoverBg} minimizeOnLaunch={minimizeOnLaunch} setMinimizeOnLaunch={setMinimizeOnLaunch} />} />
        <Route path="/profile" element={<Profile library={library} />} />
        <Route path="/year-in-review" element={<YearInReview library={library} />} />
        <Route path="/gaming-links" element={<GamingLinks theme={theme} />} />
        <Route path="/donate" element={<Donate theme={theme} />} />
        <Route path="/library-intelligence" element={<LibraryIntelligence library={library} onLaunchGame={handleLaunchGame} />} />
        <Route path="/achievements" element={<Achievements theme={theme} library={library} />} />
        <Route path="/export-hub" element={<ExportHub library={library} />} />
        <Route path="/challenge-board" element={<ChallengeBoard library={library} />} />
        <Route path="/storage-manager" element={<StorageManager library={library} onLaunchGame={handleLaunchGame} />} />
        <Route path="/performance-cockpit" element={<PerformanceCockpit library={library} />} />
        <Route path="/swipe-deck" element={<SwipeDeck library={library} onLaunchGame={handleLaunchGame} onUpdateRating={handleUpdateRating} />} />
        <Route path="/recommendations" element={<Recommendations library={library} onLaunchGame={handleLaunchGame} />} />
        <Route path="/free-games" element={<FreeGames />} />
        <Route path="/startup-questionnaire" element={<StartupQuestionnaire isOpen founderTier={false} onComplete={() => {}} onSkip={() => {}} />} />
      </Routes>
      </ErrorBoundary>
    </div>
  );
}
