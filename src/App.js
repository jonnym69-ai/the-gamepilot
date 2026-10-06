import { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { ThemeProvider } from './ThemeContext';
import ControllerSupport from './components/ControllerSupport';
import ErrorBoundary from './components/ErrorBoundary';
import RouteErrorBoundary from './components/RouteErrorBoundary';
import { normalizeLibraryData } from './services/LibraryDataService';
import TrayMenuService from './services/TrayMenuService';
import { ToastProvider, useToast } from './components/Toast';
import { RECOMMENDATION_OUTCOME } from './services/UserBehaviorProfile';
import StorageService from './services/StorageService';
import PeriodChampionService from './services/PeriodChampionService';
import { getSpeech } from './services/ChampionSpeechService';
import CommandPalette from './components/CommandPalette';
import QuickLaunchHotbar from './components/QuickLaunchHotbar';
import AnimatedBackground from './components/AnimatedBackground';
import useLibraryFilters from './hooks/useLibraryFilters';
import useTheme from './hooks/useTheme';
import useGlobalInput from './hooks/useGlobalInput';
import useLibraryCuration from './hooks/useLibraryCuration';
import useGamingStory from './hooks/useGamingStory';
import useDynamicBackdrop from './hooks/useDynamicBackdrop';
import useStillPlayingPrompt from './hooks/useStillPlayingPrompt';
import useSessionNotifications from './hooks/useSessionNotifications';
import useLibraryLoading from './hooks/useLibraryLoading';
import useLibraryScanner from './hooks/useLibraryScanner';
import useSeasonalFeatures from './hooks/useSeasonalFeatures';
import useSessionLifecycle from './hooks/useSessionLifecycle';
import useGameLaunching from './hooks/useGameLaunching';

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

const GamingLinks = lazy(() => import('./GamingLinks'));
const Themes = lazy(() => import('./Themes'));
const Habits = lazy(() => import('./Habits'));
const Achievements = lazy(() => import('./Achievements'));
const ExportHub = lazy(() => import('./ExportHub'));
const StorageManager = lazy(() => import('./StorageManager'));
const SwipeDeck = lazy(() => import('./SwipeDeck'));
const Recommendations = lazy(() => import('./Recommendations'));
const GameBarOverlay = lazy(() => import('./components/GameBarOverlay'));
const Rewards = lazy(() => import('./Rewards'));
const Feedback = lazy(() => import('./Feedback'));
const WishlistPage = lazy(() => import('./WishlistPage'));

// Conditionally-rendered UI components loaded on demand.
const BigScreenMode = lazy(() => import('./components/BigScreenMode'));
const GamingStoryCard = lazy(() => import('./components/GamingStoryCard'));
const GuidedTour = lazy(() => import('./components/GuidedTour'));
const SeasonalHideAndSeek = lazy(() => import('./components/SeasonalHideAndSeek'));

// One-time migration: copy legacy 'gameLibrary' key to prefixed 'gamepilot-library'
StorageService.migrate();

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
  const [library, setLibrary] = useState([]);
  const { filterMood, setFilterMood, filterTime, setFilterTime, filterGenre, setFilterGenre } = useLibraryFilters();
  const { theme, setTheme, bigScreenMode } = useTheme();
  const [lastPlayedGame, setLastPlayedGame] = useState(null);
  const [dynamicCoverBg, setDynamicCoverBg] = useState(() => StorageService.getString('dynamicCoverBg') === 'true');
  const [minimizeOnLaunch, setMinimizeOnLaunch] = useState(
    () => StorageService.getString('minimizeOnLaunch') !== 'false'
  );
  const { success: toastSuccess, roast: toastRoast } = useToast();

  // Memoization caches for performance
  const playtimeStatsCache = useRef(new Map());

  // --- Hook-based lifecycle ---

  // 1. Library loading + persistence
  const { hasLoadedLibrary, saveLibrary } = useLibraryLoading({ setLibrary, setLastPlayedGame });

  // 2. Curation (already extracted)
  // 3. Story + scanning
  const { gamingStory, showFirstStory, dismissStory } = useGamingStory();
  const { loading, scanLocalLibrary } = useLibraryScanner({
    library,
    setLibrary,
    saveLibrary,
    showFirstStory,
  });

  // 4. Session lifecycle
  const { activeSessions, handleEndSession, refreshActiveSessions, sessionStorageReady } = useSessionLifecycle({
    library,
    setLibrary,
    saveLibrary,
    setLastPlayedGame,
    minimizeOnLaunch,
    hasLoadedLibrary,
  });

  // 5. Seasonal features + game launching
  const { trackGamePlay } = useSeasonalFeatures({ library });
  const { handleLaunchGame } = useGameLaunching({
    library,
    setLibrary,
    saveLibrary,
    setLastPlayedGame,
    handleEndSession,
    refreshActiveSessions,
    minimizeOnLaunch,
    trackGamePlay,
  });

  // 6. Prompts + notifications
  const { stillPlayingPrompt, handleStillPlayingContinue, handleStillPlayingEndSession } = useStillPlayingPrompt({
    activeSessions,
    handleEndSession,
  });
  const { recommendationOutcomePrompt, submitRecommendationOutcome, disableRecommendationOutcomePrompts } =
    useSessionNotifications();

  // 7. Dynamic backdrop
  useDynamicBackdrop({ lastPlayedGame, dynamicCoverBg });

  // 8. Global input
  useGlobalInput();

  // --- Remaining App-level effects ---

  // Champion toast notifications
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

  // Clear playtime stats cache when library changes
  useEffect(() => {
    playtimeStatsCache.current.clear();
  }, [library]);

  // Update system tray menu when library changes
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

  // --- Library update handler (used by Library page) ---
  const handleLibraryUpdated = useCallback(
    (updatedLibrary) => {
      const normalizedLibrary = normalizeLibraryData(updatedLibrary);
      setLibrary(normalizedLibrary);
      saveLibrary(normalizedLibrary);
    },
    [saveLibrary, setLibrary]
  );
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
      {gamingStory && (
        <Suspense fallback={null}>
          <GamingStoryCard story={gamingStory} onContinue={dismissStory} />
        </Suspense>
      )}
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
              <button onClick={() => submitRecommendationOutcome(null)} className="clear-button">
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
          </Routes>
        </Suspense>
      </ErrorBoundary>
      {bigScreenMode && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}
      <Suspense fallback={null}>
        <SeasonalHideAndSeek />
      </Suspense>
      {!loading && (
        <Suspense fallback={null}>
          <GuidedTour />
        </Suspense>
      )}
    </div>
  );
}
