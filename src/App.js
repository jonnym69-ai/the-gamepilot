import { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import './App.css';
import { ThemeProvider } from './ThemeContext';
import ControllerSupport from './components/ControllerSupport';
import ErrorBoundary from './components/ErrorBoundary';
import RouteErrorBoundary from './components/RouteErrorBoundary';
import { GameLaunchCoordinatorService } from './services/GameLaunchCoordinatorService';
import { LibraryScanCoordinatorService } from './services/LibraryScanCoordinatorService';
import {
  normalizeGameLibraryEntry,
  normalizeLibraryData,
  normalizeTrackedNumber,
  normalizeLastPlayedValue,
  getMostRecentlyPlayedGame,
} from './services/LibraryDataService';
import { PlaytimeAutoLogger } from './services/PlaytimeAutoLogger';
import SessionRepository from './services/SessionRepository';
import { PlaytimeEnrichmentService } from './services/PlaytimeEnrichmentService';
import { SteamGenreEnrichmentService } from './services/SteamGenreEnrichmentService';
import TrayMenuService from './services/TrayMenuService';
import { ToastProvider, useToast } from './components/Toast';
import { AchievementTracker } from './AchievementSystem';
import SeasonalHideAndSeek from './components/SeasonalHideAndSeek';
import { SeasonalRewardService } from './services/SeasonalRewardService';
import GuidedTour from './components/GuidedTour';
import CalendarXPService from './services/CalendarXPService';
import { GameCurationService } from './services/GameCurationService';
import { getResolvedMood } from './constants/GenresMoods';
import { RECOMMENDATION_OUTCOME, UserBehaviorProfile } from './services/UserBehaviorProfile';
import { HabitTrackerService } from './services/HabitTrackerService';
import StorageService from './services/StorageService';
import PeriodChampionService from './services/PeriodChampionService';
import { generateSessionRoast } from './services/SessionRoastService';
import { generateRivalryToast } from './services/RivalryService';
import { checkStreakMilestone, updateStreakCharacterization } from './services/StreakCharacterizerService';
import { storeSnapshot, checkIdentityShiftToast } from './services/IdentityShiftService';
import { getSpeech } from './services/ChampionSpeechService';
import WishlistService from './services/WishlistService';
import { assignMoodToGame as importedAssignMoodToGame } from './services/MoodAssignmentService';
import { resolveGameArtwork } from './services/GameArtworkService';
import DynamicBackdropService from './services/DynamicBackdropService';
import CommandPalette from './components/CommandPalette';
import BigScreenMode from './components/BigScreenMode';
import QuickLaunchHotbar from './components/QuickLaunchHotbar';
import AnimatedBackground from './components/AnimatedBackground';
import GamingStoryCard from './components/GamingStoryCard';
import { GamingStoryService } from './services/GamingStoryService';
import useLibraryFilters from './hooks/useLibraryFilters';
import useTheme from './hooks/useTheme';
import useGlobalInput from './hooks/useGlobalInput';
import useLibraryCuration from './hooks/useLibraryCuration';

// Core pages loaded eagerly.
const Home = lazy(() => import('./Home'));
const Library = lazy(() => import('./Library'));

// Secondary pages loaded on demand.
const Stats = lazy(() => import('./Stats'));
const RecentActivity = lazy(() => import('./RecentActivity'));
const Settings = lazy(() => import('./Settings'));
const Profile = lazy(() => import('./Profile'));
const YearInReview = lazy(() => import('./YearInReview'));
const Timeline = lazy(() => import('./Timeline'));
const Donate = lazy(() => import('./Donate'));
const GamingLinks = lazy(() => import('./GamingLinks'));
const StartupQuestionnaire = lazy(() => import('./components/StartupQuestionnaire'));
const Themes = lazy(() => import('./Themes'));
const Habits = lazy(() => import('./Habits'));
const Achievements = lazy(() => import('./Achievements'));
const ExportHub = lazy(() => import('./ExportHub'));
const StorageManager = lazy(() => import('./StorageManager'));
const PerformanceCockpit = lazy(() => import('./PerformanceCockpit'));
const SwipeDeck = lazy(() => import('./SwipeDeck'));
const Recommendations = lazy(() => import('./Recommendations'));
const GameBarOverlay = lazy(() => import('./components/GameBarOverlay'));
const Rewards = lazy(() => import('./Rewards'));
const Feedback = lazy(() => import('./Feedback'));
const WishlistPage = lazy(() => import('./WishlistPage'));

// One-time migration: copy legacy 'gameLibrary' key to prefixed 'gamepilot-library'
StorageService.migrate();

const STILL_PLAYING_PROMPT_DELAY_MS = 15 * 60 * 1000;

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
  [key]: normalizeTrackedNumber(bucket?.[key]) + normalizeTrackedNumber(minutes),
});

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

function StartupQuestionnaireRoute() {
  const navigate = useNavigate();
  return (
    <StartupQuestionnaire isOpen founderTier={false} onComplete={() => navigate('/')} onSkip={() => navigate('/')} />
  );
}

function AppContent() {
  const [library, setLibrary] = useState([]);
  const { filterMood, setFilterMood, filterTime, setFilterTime, filterGenre, setFilterGenre } = useLibraryFilters();
  const { theme, setTheme, bigScreenMode } = useTheme();
  const [loading, setLoading] = useState(false);
  const [lastPlayedGame, setLastPlayedGame] = useState(null);
  const [activeSessions, setActiveSessions] = useState([]);
  const [hasLoadedLibrary, setHasLoadedLibrary] = useState(false);
  const [stillPlayingPrompt, setStillPlayingPrompt] = useState(null);
  const [recommendationOutcomePrompt, setRecommendationOutcomePrompt] = useState(null);
  const [stillPlayingDeadlines, setStillPlayingDeadlines] = useState({});
  const [gamingStory, setGamingStory] = useState(null);
  const [dynamicCoverBg, setDynamicCoverBg] = useState(() => StorageService.getString('dynamicCoverBg') === 'true');
  const [minimizeOnLaunch, setMinimizeOnLaunch] = useState(
    () => StorageService.getString('minimizeOnLaunch') === 'true'
  );
  const { success: toastSuccess, error: toastError, info: toastInfo, roast: toastRoast } = useToast();

  // Memoization caches for performance
  const playtimeStatsCache = useRef(new Map());
  const sessionRecoveryCompleted = useRef(false);
  const launchesInProgress = useRef(new Set());
  const [sessionStorageReady, setSessionStorageReady] = useState(false);

  useEffect(() => {
    SessionRepository.initialize()
      .then(() => setSessionStorageReady(true))
      .catch(() => setSessionStorageReady(true));
  }, []);

  useEffect(() => {
    if (!sessionStorageReady) return;
    try {
      const newlyLocked = PeriodChampionService.lockChampionsIfNeeded({ library });
      if (Array.isArray(newlyLocked) && newlyLocked.length > 0) {
        const personalityEnabled = StorageService.getString('personalityToastsEnabled', 'true') === 'true';
        if (personalityEnabled) {
          newlyLocked.forEach((champion) => {
            const speech = getSpeech(champion.period, champion.periodKey);
            if (speech?.speech) {
              const periodLabel =
                champion.period === 'week' ? 'Weekly' : champion.period === 'month' ? 'Monthly' : 'Yearly';
              setTimeout(
                () => toastRoast(`${periodLabel} Champion: ${champion.game.name}. "${speech.speech}"`, 7000),
                1000
              );
            }
          });
        }
      }
    } catch {
      /* non-critical */
    }
  }, [library, sessionStorageReady, toastRoast]);

  useEffect(() => {
    playtimeStatsCache.current.clear();
  }, [library]);

  useEffect(() => {
    if (Array.isArray(library) && library.length > 0) {
      TrayMenuService.updateMenu(library);
    }
  }, [library]);

  // Keep the main-process passive watcher in sync with the library so games
  // launched outside GamePilot (Epic, Ubisoft, shortcuts, etc.) still get
  // session-tracked. Debounced — library churn during scans is frequent.
  useEffect(() => {
    const api = window.electronAPI;
    if (!api || typeof api.updateWatchlist !== 'function') return;
    const timer = window.setTimeout(() => {
      api.updateWatchlist(Array.isArray(library) ? library : []).catch(() => {});
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [library]);

  useGlobalInput();

  // Process calendar rewards in the background (rechecks whenever the library changes).
  useEffect(() => {
    try {
      CalendarXPService.processBirthdayReward();
      CalendarXPService.checkAnniversaryReward();
      CalendarXPService.processChristmasReward();
    } catch (e) {
      console.warn('Calendar auto-reward check failed:', e);
    }
  }, [library]);

  // --- Utility Functions ---
  const saveLibrary = useCallback((libraryData) => {
    try {
      const normalizedLibraryData = normalizeLibraryData(libraryData);
      StorageService.set('library', normalizedLibraryData);
      WishlistService.removeOwnedItems(normalizedLibraryData);
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

        WishlistService.removeOwnedItems(normalizedLibrary);
      } catch (error) {
        console.error('Error loading saved library:', error);
      } finally {
        setHasLoadedLibrary(true);
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

      const {
        allGames = [],
        mergedLibrary = [],
        scanReport = null,
      } = await LibraryScanCoordinatorService.scanAndMergeLibrary({
        currentLibrary: library,
        assignMoodToGame,
        manual: true,
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

      const story = GamingStoryService.updateStory(curatedMerged);
      if (story && GamingStoryService.shouldShowFirstStory()) {
        setGamingStory(story);
        GamingStoryService.markFirstStoryShown();
      }

      window.dispatchEvent(
        new CustomEvent('gamepilot:scan-complete', {
          detail: { scanReport, gameCount: curatedMerged.length },
        })
      );

      const scanErrors = Number(scanReport?.summary?.errorPlatformCount || 0);
      if (curatedMerged.length === 0) {
        toastError('Scan completed, but no games were found. Open the scan report for launcher details.');
      } else if (scanErrors > 0) {
        toastError(
          `Found ${curatedMerged.length} games, but ${scanErrors} launcher scan${scanErrors === 1 ? '' : 's'} reported an error.`
        );
      } else {
        toastSuccess(`Library scan complete: ${curatedMerged.length} games found.`);
      }
    } catch (err) {
      console.error(' Error during scan:', err);
      console.error(' Detailed error stack:', err.stack);
      toastError(`Library scan failed: ${err?.message || 'Unknown scanner error'}`);
    } finally {
      setLoading(false);
    }
  }, [library, saveLibrary, assignMoodToGame, getFallbackLibrary, toastError, toastSuccess]);

  const handleLibraryUpdated = useCallback(
    (updatedLibrary) => {
      const normalizedLibrary = normalizeLibraryData(updatedLibrary);
      setLibrary(normalizedLibrary);
      saveLibrary(normalizedLibrary);
    },
    [saveLibrary]
  );

  const handleEndSession = useCallback(
    (gameName, sessionMetadata = {}) => {
      if (!gameName) {
        return null;
      }

      const sessionResult = PlaytimeAutoLogger.endSession(gameName, sessionMetadata);
      if (!sessionResult) {
        return null;
      }

      const endedGame = library.find((g) => g?.name === gameName);
      const genres = endedGame?.genres || [];
      try {
        HabitTrackerService.recordSession(
          gameName,
          sessionResult.playtimeMinutes || 0,
          genres,
          getResolvedMood(endedGame)
        );
      } catch (habitError) {
        console.error('Habit tracking failed during session end:', habitError);
      }

      AchievementTracker.recordSessionDurationAchievements(sessionResult.playtimeMinutes || 0);
      AchievementTracker.checkAndUnlockAchievements();

      let endedGameSnapshot = null;

      setLibrary((previousLibrary) => {
        const normalizedLibrary = normalizeLibraryData(previousLibrary);
        const updatedLibrary = normalizedLibrary.map((game) => {
          if (!game || game.name !== gameName) {
            return game;
          }

          endedGameSnapshot = game;

          const nextTimePlayed =
            normalizeTrackedNumber(game.time_played) + normalizeTrackedNumber(sessionResult.playtimeMinutes);
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
              monthly: incrementPlaytimeBucket(
                currentPlaytime.monthly,
                bucketKeys.monthly,
                sessionResult.playtimeMinutes
              ),
              yearly: incrementPlaytimeBucket(currentPlaytime.yearly, bucketKeys.yearly, sessionResult.playtimeMinutes),
            },
          });
        });

        saveLibrary(updatedLibrary);
        const mostRecentlyPlayedGame = getMostRecentlyPlayedGame(updatedLibrary);
        if (mostRecentlyPlayedGame) {
          setLastPlayedGame(mostRecentlyPlayedGame);
        }

        return updatedLibrary;
      });

      setActiveSessions(PlaytimeAutoLogger.getActiveSessions());

      if (minimizeOnLaunch && window.electronAPI?.restoreWindow) {
        window.electronAPI.restoreWindow().catch(() => {});
      }

      const endedGameId = endedGameSnapshot?.appid || endedGameSnapshot?.name || gameName;
      const recommendationLaunch = UserBehaviorProfile.getLatestRecommendationLaunch(endedGameId, gameName);

      window.dispatchEvent(
        new CustomEvent('gamepilot:session-ended', {
          detail: {
            gameName,
            gameId: endedGameId,
            mood: endedGameSnapshot?.mood || null,
            genre: Array.isArray(endedGameSnapshot?.genres)
              ? endedGameSnapshot.genres.find((genre) => genre && genre !== 'Unknown') || null
              : null,
            playtimeMinutes: normalizeTrackedNumber(sessionResult.playtimeMinutes),
            endTime: sessionResult.endTime || Date.now(),
            recommendationType: recommendationLaunch?.recommendationType || null,
            recommendationSource: recommendationLaunch?.source || null,
            recoveredSession: Boolean(sessionMetadata.recoveredSession),
            shutdownSession: Boolean(sessionMetadata.shutdownSession),
          },
        })
      );

      return sessionResult;
    },
    [library, saveLibrary, minimizeOnLaunch]
  );

  useEffect(() => {
    window.endSession = handleEndSession;

    return () => {
      if (window.endSession === handleEndSession) {
        delete window.endSession;
      }
    };
  }, [handleEndSession]);

  // Startup recovery: settle interrupted sessions at their last confirmed heartbeat.
  useEffect(() => {
    if (!hasLoadedLibrary || !sessionStorageReady || sessionRecoveryCompleted.current) {
      return;
    }

    sessionRecoveryCompleted.current = true;
    const interruptedSessions = PlaytimeAutoLogger.getActiveSessions();
    Object.entries(interruptedSessions).forEach(([gameName, session]) => {
      const recoveredEndTime = session.lastConfirmedAt || session.startTime;
      handleEndSession(gameName, {
        recoveredSession: true,
        recoveredEndTime,
        endTimeOverride: recoveredEndTime,
      });
    });
    setActiveSessions(PlaytimeAutoLogger.getActiveSessions());
  }, [handleEndSession, hasLoadedLibrary, sessionStorageReady]);

  useEffect(() => {
    if (!hasLoadedLibrary) {
      return undefined;
    }

    const heartbeat = () => {
      const confirmedSessions = PlaytimeAutoLogger.confirmActiveSessions();
      setActiveSessions(confirmedSessions);
    };
    const intervalId = window.setInterval(heartbeat, 60 * 1000);
    return () => window.clearInterval(intervalId);
  }, [hasLoadedLibrary]);

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

  // Animated dynamic backdrop extracted from the last played cover art.
  useEffect(() => {
    const settings = DynamicBackdropService.getSettings();
    const root = document.documentElement;
    if (!settings.enabled || !lastPlayedGame) {
      document.body.classList.remove('dynamic-backdrop-active');
      root.style.removeProperty('--dynamic-backdrop');
      return undefined;
    }
    let active = true;
    const coverUrl = resolveGameArtwork(lastPlayedGame, { surface: 'wide' });
    DynamicBackdropService.getPalette(coverUrl).then((palette) => {
      if (!active || !palette) return;
      const css = DynamicBackdropService.generateBackdropCSS(palette, settings);
      if (!css) return;
      Object.entries(css).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });
      document.body.classList.add('dynamic-backdrop-active');
    });
    return () => {
      active = false;
      document.body.classList.remove('dynamic-backdrop-active');
      root.style.removeProperty('--dynamic-backdrop');
    };
  }, [lastPlayedGame]);
  useEffect(() => {
    if (!window.electronAPI?.onSystemShutdown) return undefined;
    const unsubscribe = window.electronAPI.onSystemShutdown(() => {
      console.warn('[Session] System shutdown imminent — ending all active sessions');
      Object.keys(PlaytimeAutoLogger.getActiveSessions()).forEach((gameName) => {
        handleEndSession(gameName, { shutdownSession: true });
      });
    });
    return unsubscribe;
  }, [handleEndSession]);

  useEffect(() => {
    const handleSessionEnded = (event) => {
      const detail = event?.detail;
      if (!detail?.gameName) return;
      const minutes = Number(detail?.playtimeMinutes) || 0;
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const timeString = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

      // Generate personality-driven roast toast for real sessions
      const personalityEnabled = StorageService.getString('personalityToastsEnabled', 'true') === 'true';
      if (personalityEnabled && !detail?.recoveredSession && !detail?.shutdownSession && minutes > 0) {
        try {
          const roast = generateSessionRoast(detail);
          if (roast?.message) {
            toastRoast(roast.message, 6000);
          } else {
            toastSuccess(`Session saved: +${timeString} to ${detail.gameName}`, 5000);
          }
        } catch {
          toastSuccess(`Session saved: +${timeString} to ${detail.gameName}`, 5000);
        }
      } else {
        toastSuccess(`Session saved: +${timeString} to ${detail.gameName}`, 5000);
      }

      // Check for active rivalry (throttled to once per day inside the service)
      if (personalityEnabled && !detail?.recoveredSession && !detail?.shutdownSession) {
        try {
          const rivalryToast = generateRivalryToast();
          if (rivalryToast?.message) {
            setTimeout(() => toastRoast(rivalryToast.message, 6000), 1500);
          }
        } catch {
          /* non-critical */
        }

        // Check for streak milestone (throttled inside the service)
        try {
          updateStreakCharacterization();
          const milestone = checkStreakMilestone();
          if (milestone?.message) {
            setTimeout(() => toastRoast(milestone.message, 6000), 3000);
          }
        } catch {
          /* non-critical */
        }

        // Store persona snapshot and check for identity shift (throttled per quarter)
        try {
          storeSnapshot();
          const shift = checkIdentityShiftToast();
          if (shift?.message) {
            setTimeout(() => toastRoast(shift.message, 7000), 4500);
          }
        } catch {
          /* non-critical */
        }
      }
      const feedbackPreferences = UserBehaviorProfile.getFeedbackPreferences();
      if (
        detail.recommendationType &&
        feedbackPreferences.sessionPromptEnabled &&
        !detail.recoveredSession &&
        !detail.shutdownSession
      ) {
        const recommendationSession = UserBehaviorProfile.recordRecommendationSession(
          detail.gameId,
          detail.gameName,
          detail
        );
        if (recommendationSession) {
          setRecommendationOutcomePrompt({ ...detail, recommendationSession });
        }
      }
    };

    window.addEventListener('gamepilot:session-ended', handleSessionEnded);
    return () => window.removeEventListener('gamepilot:session-ended', handleSessionEnded);
  }, [toastSuccess, toastRoast]);

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
      const didChange =
        previousKeys.length !== nextKeys.length ||
        previousKeys.some((key) => previousDeadlines[key] !== nextDeadlines[key]);

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
      [stillPlayingPrompt.gameName]: Date.now() + STILL_PLAYING_PROMPT_DELAY_MS,
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

  const submitRecommendationOutcome = useCallback(
    (outcome) => {
      if (!recommendationOutcomePrompt || !Object.values(RECOMMENDATION_OUTCOME).includes(outcome)) {
        setRecommendationOutcomePrompt(null);
        return;
      }

      const metadata = {
        gameName: recommendationOutcomePrompt.gameName,
        mood: recommendationOutcomePrompt.mood,
        genre: recommendationOutcomePrompt.genre,
        playtimeMinutes: recommendationOutcomePrompt.playtimeMinutes,
        recommendationType: recommendationOutcomePrompt.recommendationType,
        source: recommendationOutcomePrompt.recommendationSource || 'recommendation',
      };
      UserBehaviorProfile.trackRecommendationOutcome(recommendationOutcomePrompt.gameId, outcome, metadata);
      if (outcome !== RECOMMENDATION_OUTCOME.NOT_NOW) {
        UserBehaviorProfile.trackSessionFeedback(
          recommendationOutcomePrompt.gameName,
          outcome === RECOMMENDATION_OUTCOME.GREAT_PICK,
          { ...metadata, gameId: recommendationOutcomePrompt.gameId }
        );
      }

      const message =
        outcome === RECOMMENDATION_OUTCOME.GREAT_PICK
          ? 'Great — GamePilot will favor picks like this.'
          : outcome === RECOMMENDATION_OUTCOME.NOT_NOW
            ? 'Got it — this game will stay out of recommendations for a while.'
            : 'Understood — GamePilot will stop recommending this game.';
      toastInfo(message, 5000);
      setRecommendationOutcomePrompt(null);
    },
    [recommendationOutcomePrompt, toastInfo]
  );

  const disableRecommendationOutcomePrompts = useCallback(() => {
    UserBehaviorProfile.setFeedbackPromptEnabled('session', false);
    setRecommendationOutcomePrompt(null);
  }, []);

  useEffect(() => {
    if (!stillPlayingPrompt) return undefined;

    const handleEscape = (event) => {
      if (event.key === 'Escape') handleStillPlayingContinue();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [handleStillPlayingContinue, stillPlayingPrompt]);

  // Passive watcher session events: games detected running outside GamePilot.
  useEffect(() => {
    const api = window.electronAPI;
    if (!api || typeof api.onPassiveSessionStarted !== 'function') return undefined;

    const unsubscribeStarted = api.onPassiveSessionStarted((payload) => {
      const gameName = payload?.gameName;
      if (!gameName) return;
      const game = (library || []).find((g) => g?.name === gameName);
      PlaytimeAutoLogger.startSession(gameName, payload?.appid || game?.appid || null, {
        source: 'passive-watch',
        platform: payload?.platform || game?.platform || 'Unknown',
        genres: game?.genres || [],
        gameGenres: game?.genres || [],
      });
      setActiveSessions(PlaytimeAutoLogger.getActiveSessions());
      toastInfo(`${gameName} detected running — session tracking started.`);
    });

    const unsubscribeEnded = api.onPassiveSessionEnded((payload) => {
      const gameName = payload?.gameName;
      if (!gameName) return;
      handleEndSession(gameName, {
        source: 'passive-watch',
        platform: payload?.platform || 'Unknown',
      });
    });

    return () => {
      if (typeof unsubscribeStarted === 'function') unsubscribeStarted();
      if (typeof unsubscribeEnded === 'function') unsubscribeEnded();
    };
  }, [library, handleEndSession, toastInfo]);

  const handleLaunchGame = useCallback(
    async (game) => {
      const gameKey = String(game?.appid || game?.name || '').trim();
      if (!gameKey) {
        toastError('This game is missing the information needed to launch it.');
        return;
      }
      if (launchesInProgress.current.has(gameKey)) {
        toastInfo(`${game.name || 'This game'} is already being launched.`);
        return;
      }

      launchesInProgress.current.add(gameKey);
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
          },
        });

        if (!result.success) {
          console.error(' Game launch failed:', result.message);
          toastError(result.message);
        } else {
          setActiveSessions(PlaytimeAutoLogger.getActiveSessions());
          toastSuccess(`${game.name} launched. Session tracking is active.`);

          // Record the play for seasonal reward tracking (reward toast is shown elsewhere).
          SeasonalRewardService.trackGamePlay(game);

          if (minimizeOnLaunch && window.electronAPI?.minimizeWindow) {
            window.electronAPI.minimizeWindow().catch(() => {});
          }
        }
      } catch (error) {
        console.error('Launch error:', error);
        toastError(`Failed to launch ${game.name}: ${error.message}`);
      } finally {
        launchesInProgress.current.delete(gameKey);
      }
    },
    [handleEndSession, library, minimizeOnLaunch, saveLibrary, toastError, toastInfo, toastSuccess]
  );

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

  const {
    handleUpdateRating,
    handleToggleFavorite,
    handleRemoveGames,
    handleUpdateCollections,
    handleToggleHidden,
    handleUpdateCompletion,
    handleUpdateNotes,
    handleUpdateCoverArt,
    handleUpdateMood,
    handleAddSessionNote,
    handleTogglePlayedElsewhere,
  } = useLibraryCuration({ library, setLibrary, saveLibrary, toastSuccess });

  return (
    <div className="App-container">
      <AnimatedBackground themeId={theme} />
      <ControllerSupport />
      <CommandPalette />
      <QuickLaunchHotbar library={library} />
      {gamingStory && <GamingStoryCard story={gamingStory} onContinue={() => setGamingStory(null)} />}
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
              GamePilot is checking your local launchers and install folders. This can take around 30 seconds on larger
              libraries.
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
          <div
            className="modal-content"
            onClick={(event) => event.stopPropagation()}
            style={{ maxWidth: '520px', textAlign: 'center' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="still-playing-title"
            aria-describedby="still-playing-description"
          >
            <h2 id="still-playing-title" className={`modal-title ${theme}`}>
              Are you still playing?
            </h2>
            <p id="still-playing-description" style={{ marginBottom: '18px', lineHeight: 1.6 }}>
              <strong>{stillPlayingPrompt.gameName}</strong> has been active for 15 minutes.
            </p>
            <p style={{ marginBottom: '24px', opacity: 0.8, lineHeight: 1.6 }}>
              Keep the session running if you are still playing, or end it now so your stats do not keep climbing by
              accident.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button onClick={handleStillPlayingContinue} className="getting-started-primary">
                Yes, still playing
              </button>
              <button onClick={handleStillPlayingEndSession} className="getting-started-secondary">
                End Session
              </button>
            </div>
          </div>
        </div>
      )}
      {recommendationOutcomePrompt && (
        <div className="modal-overlay">
          <div
            className="modal-content"
            style={{ maxWidth: '560px', textAlign: 'center' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="recommendation-outcome-title"
            aria-describedby="recommendation-outcome-description"
          >
            <h2 id="recommendation-outcome-title" className={`modal-title ${theme}`}>
              Did this recommendation land?
            </h2>
            <p id="recommendation-outcome-description" style={{ marginBottom: '12px', lineHeight: 1.6 }}>
              You played <strong>{recommendationOutcomePrompt.gameName}</strong> for{' '}
              {Math.round(recommendationOutcomePrompt.playtimeMinutes || 0)} minutes after finding it through GamePilot.
            </p>
            <p style={{ marginBottom: '22px', opacity: 0.78, lineHeight: 1.6 }}>
              Your answer will tune every recommendation surface, not just this one.
            </p>
            <div
              style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}
            >
              <button
                onClick={() => submitRecommendationOutcome(RECOMMENDATION_OUTCOME.GREAT_PICK)}
                className="getting-started-primary"
              >
                Great pick
              </button>
              <button
                onClick={() => submitRecommendationOutcome(RECOMMENDATION_OUTCOME.NOT_NOW)}
                className="getting-started-secondary"
              >
                Not now
              </button>
              <button
                onClick={() => submitRecommendationOutcome(RECOMMENDATION_OUTCOME.NOT_FOR_ME)}
                className="getting-started-secondary"
              >
                Not for me
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button onClick={() => setRecommendationOutcomePrompt(null)} className="clear-button">
                Skip
              </button>
              <button onClick={disableRecommendationOutcomePrompts} className="clear-button">
                Do not ask again
              </button>
            </div>
          </div>
        </div>
      )}
      <ErrorBoundary>
        <Suspense
          fallback={
            <div className="page-loading-fallback" role="status" aria-live="polite">
              <span className="page-loading-mark" aria-hidden="true">
                GP
              </span>
              <span className="page-loading-spinner" aria-hidden="true" />
              <span className="page-loading-label">Preparing your next view</span>
            </div>
          }
        >
          <Routes>
            <Route
              path="/"
              element={
                <RouteErrorBoundary>
                  <Home
                    library={library}
                    onLaunchGame={handleLaunchGame}
                    onScan={scanLocalLibrary}
                    lastPlayedGame={lastPlayedGame}
                    activeSessions={activeSessions}
                    endSession={handleEndSession}
                    mood={filterMood}
                    time={filterTime}
                    selectedGenre={filterGenre}
                    setMood={setFilterMood}
                    setTime={setFilterTime}
                    setSelectedGenre={setFilterGenre}
                    theme={theme}
                    loading={loading}
                  />
                </RouteErrorBoundary>
              }
            />
            <Route
              path="/dashboard"
              element={
                <RouteErrorBoundary>
                  <Home
                    mode="dashboard"
                    library={library}
                    onLaunchGame={handleLaunchGame}
                    onScan={scanLocalLibrary}
                    lastPlayedGame={lastPlayedGame}
                    activeSessions={activeSessions}
                    endSession={handleEndSession}
                    mood={filterMood}
                    time={filterTime}
                    selectedGenre={filterGenre}
                    setMood={setFilterMood}
                    setTime={setFilterTime}
                    setSelectedGenre={setFilterGenre}
                    theme={theme}
                    loading={loading}
                  />
                </RouteErrorBoundary>
              }
            />
            <Route
              path="/library"
              element={
                <RouteErrorBoundary>
                  <Library
                    library={library}
                    setLibrary={setLibrary}
                    onLibraryUpdated={handleLibraryUpdated}
                    onLaunchGame={handleLaunchGame}
                    onScan={scanLocalLibrary}
                    onScanLibrary={scanLocalLibrary}
                    scanLocalLibrary={scanLocalLibrary}
                    onUpdateRating={handleUpdateRating}
                    onToggleFavorite={handleToggleFavorite}
                    onRemoveGames={handleRemoveGames}
                    onUpdateCollections={handleUpdateCollections}
                    onToggleHidden={handleToggleHidden}
                    onUpdateCompletion={handleUpdateCompletion}
                    onUpdateNotes={handleUpdateNotes}
                    onUpdateCoverArt={handleUpdateCoverArt}
                    onUpdateMood={handleUpdateMood}
                    onAddSessionNote={handleAddSessionNote}
                    onTogglePlayedElsewhere={handleTogglePlayedElsewhere}
                    loading={loading}
                  />
                </RouteErrorBoundary>
              }
            />
            <Route
              path="/stats"
              element={
                <RouteErrorBoundary>
                  <Stats library={library} />
                </RouteErrorBoundary>
              }
            />
            <Route
              path="/recent-activity"
              element={
                <RouteErrorBoundary>
                  <RecentActivity />
                </RouteErrorBoundary>
              }
            />
            <Route path="/gaming-dna" element={<Navigate to="/profile" replace />} />
            <Route
              path="/themes"
              element={
                <RouteErrorBoundary>
                  <Themes />
                </RouteErrorBoundary>
              }
            />
            <Route
              path="/habits"
              element={
                <RouteErrorBoundary>
                  <Habits library={library} />
                </RouteErrorBoundary>
              }
            />
            <Route
              path="/settings"
              element={
                <RouteErrorBoundary>
                  <Settings
                    theme={theme}
                    setTheme={setTheme}
                    library={library}
                    dynamicCoverBg={dynamicCoverBg}
                    setDynamicCoverBg={setDynamicCoverBg}
                    minimizeOnLaunch={minimizeOnLaunch}
                    setMinimizeOnLaunch={setMinimizeOnLaunch}
                  />
                </RouteErrorBoundary>
              }
            />
            <Route
              path="/profile"
              element={
                <RouteErrorBoundary>
                  <Profile library={library} />
                </RouteErrorBoundary>
              }
            />
            <Route
              path="/year-in-review"
              element={
                <RouteErrorBoundary>
                  <YearInReview library={library} />
                </RouteErrorBoundary>
              }
            />
            <Route
              path="/timeline"
              element={
                <RouteErrorBoundary>
                  <Timeline library={library} />
                </RouteErrorBoundary>
              }
            />
            <Route
              path="/gaming-links"
              element={
                <RouteErrorBoundary>
                  <GamingLinks theme={theme} library={library} onUpdateCoverArt={handleUpdateCoverArt} />
                </RouteErrorBoundary>
              }
            />
            <Route
              path="/donate"
              element={
                <RouteErrorBoundary>
                  <Donate theme={theme} />
                </RouteErrorBoundary>
              }
            />
            <Route path="/library-intelligence" element={<Navigate to="/recommendations" replace />} />
            <Route
              path="/achievements"
              element={
                <RouteErrorBoundary>
                  <Achievements theme={theme} />
                </RouteErrorBoundary>
              }
            />
            <Route
              path="/export-hub"
              element={
                <RouteErrorBoundary>
                  <ExportHub library={library} />
                </RouteErrorBoundary>
              }
            />
            <Route
              path="/storage-manager"
              element={
                <RouteErrorBoundary>
                  <StorageManager library={library} onLaunchGame={handleLaunchGame} />
                </RouteErrorBoundary>
              }
            />
            <Route
              path="/performance-cockpit"
              element={
                <RouteErrorBoundary>
                  <PerformanceCockpit library={library} />
                </RouteErrorBoundary>
              }
            />
            <Route
              path="/swipe-deck"
              element={
                <RouteErrorBoundary>
                  <SwipeDeck library={library} onLaunchGame={handleLaunchGame} onUpdateRating={handleUpdateRating} />
                </RouteErrorBoundary>
              }
            />
            <Route
              path="/recommendations"
              element={
                <RouteErrorBoundary>
                  <Recommendations library={library} onLaunchGame={handleLaunchGame} />
                </RouteErrorBoundary>
              }
            />
            <Route
              path="/wishlist"
              element={
                <RouteErrorBoundary>
                  <WishlistPage library={library} onLaunchGame={handleLaunchGame} />
                </RouteErrorBoundary>
              }
            />
            <Route path="/gamebar" element={<GameBarOverlay />} />
            <Route
              path="/rewards"
              element={
                <RouteErrorBoundary>
                  <Rewards />
                </RouteErrorBoundary>
              }
            />
            <Route
              path="/feedback"
              element={
                <RouteErrorBoundary>
                  <Feedback />
                </RouteErrorBoundary>
              }
            />
            <Route path="/startup-questionnaire" element={<StartupQuestionnaireRoute />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
      {bigScreenMode && (
        <BigScreenMode
          library={library}
          onLaunchGame={handleLaunchGame}
          activeSessions={activeSessions}
          onEndSession={handleEndSession}
          lastPlayedGame={lastPlayedGame}
          onUpdateRating={handleUpdateRating}
          onToggleFavorite={handleToggleFavorite}
          onUpdateCollections={handleUpdateCollections}
          onToggleHidden={handleToggleHidden}
          onUpdateCompletion={handleUpdateCompletion}
          onUpdateNotes={handleUpdateNotes}
          onUpdateCoverArt={handleUpdateCoverArt}
          onUpdateMood={handleUpdateMood}
          onAddSessionNote={handleAddSessionNote}
          onTogglePlayedElsewhere={handleTogglePlayedElsewhere}
        />
      )}
      <SeasonalHideAndSeek />
      {!loading && <GuidedTour />}
    </div>
  );
}
