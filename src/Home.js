import React, { useState, useEffect, useCallback, useMemo } from 'react';
import NavBar from './NavBar';
import { UserBehaviorProfile } from './services/UserBehaviorProfile';
import { DiscoveryService } from './services/DiscoveryService';
import { HabitTrackerService } from './services/HabitTrackerService';
import CollapsibleSection from './components/CollapsibleSection';
import { Library, SlidersHorizontal, Sparkles } from 'lucide-react';
import { RecommendationEngine } from './services/RecommendationEngine';
import { GamingIdentity } from './GamingIdentity';
import { RetentionQuestService } from './services/RetentionQuestService';
import EntitlementService from './services/EntitlementService';
import { getGameArtworkPlaceholder, resolveGameArtwork } from './services/GameArtworkService';
import { KeyboardShortcuts } from './KeyboardShortcuts';
import { PLATFORM_ICONS, PLATFORM_COLORS } from './constants/PlatformConstants';
import './Home.css';
import './LibraryValue.css';
import DailyDoodleTitle from './components/DailyDoodleTitle';
import WishlistSection from './components/WishlistSection';
import NostalgiaCard from './components/NostalgiaCard';
import PatchNotesBadge from './components/PatchNotesBadge';
import LibrarianHubCarousel from './components/LibrarianHubCarousel';
import {
  HomeGuidedContent,
  HomeSection,
  HomeToolsContent,
  LibraryTodaySection,
  TuneYourNextPickSection,
  PerfectPlayResultSection,
  RecommendationResultsSection,
  SurpriseGameResultSection,
  RediscoverResultSection,
  IdentitySnapshotCard,
  WeeklyPlaySnapshot,
  HabitGoalsMiniCard,
  BecauseYouAreSection,
} from './components/HomeDashboardSections';
import {
  DashboardWidgetGrid,
  MiniStatsWidget,
  MiniQuestWidget,
  MiniNextUpWidget,
  MiniBacklogWidget,
} from './components/DashboardWidgets';

const GETTING_STARTED_PREFERENCE_KEY = 'gettingStartedPreferences';

const readGettingStartedPreferences = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(GETTING_STARTED_PREFERENCE_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : { hasSeen: false, hidden: false };
  } catch (error) {
    return { hasSeen: false, hidden: false };
  }
};

const saveGettingStartedPreferences = (preferences = {}) => {
  localStorage.setItem(GETTING_STARTED_PREFERENCE_KEY, JSON.stringify({
    hasSeen: Boolean(preferences.hasSeen),
    hidden: Boolean(preferences.hidden)
  }));
};

// Use centralized platform constants
const platformIcons = PLATFORM_ICONS;
const platformColors = PLATFORM_COLORS;

// Helper function to format playtime accurately
const formatPlaytime = (minutes) => {
  if (!minutes || minutes <= 0) return null;
  
  if (minutes < 60) {
    return `${Math.round(minutes)}m played`;
  } else if (minutes < 120) {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m played` : `${hours}h played`;
  } else {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m played`;
  }
};

// ... (rest of the code remains the same)

function GettingStartedModal({ isOpen, onClose, onHidePermanently, theme }) {
  if (!isOpen) return null;

  const searchShortcut = KeyboardShortcuts.getShortcutForAction('focus_search') || 'Ctrl+K';

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '520px' }}>
        <button
          onClick={onClose}
          className="modal-close"
        >
          ×
        </button>
        <h2 className={`modal-title ${theme}`}>Welcome to GamePilot</h2>
        <p style={{ marginBottom: '24px', opacity: 0.85, lineHeight: 1.6 }}>
          Your personal gaming mission control. Three steps to get started:
        </p>
        <div className="getting-started-steps" style={{ textAlign: 'left', marginBottom: '24px' }}>
          <ol style={{ paddingLeft: '20px', margin: 0 }}>
            <li style={{ marginBottom: '12px', lineHeight: 1.5 }}>
              <strong>Scan your games</strong> — Auto-detects Steam, Epic, Xbox, GOG, and more
            </li>
            <li style={{ marginBottom: '12px', lineHeight: 1.5 }}>
              <strong>Launch & play</strong> — Click any game to start. Playtime tracks automatically
            </li>
            <li style={{ lineHeight: 1.5 }}>
              <strong>Find your next game</strong> — Use mood and time filters for recommendations
            </li>
          </ol>
        </div>
        <p style={{ fontSize: '0.85rem', opacity: 0.6, marginBottom: '24px' }}>
          Tip: Press <strong>{searchShortcut}</strong> anytime to search your library
        </p>
        <div className="getting-started-actions">
          <button onClick={onClose} className="getting-started-primary">Let's Go</button>
          <button onClick={onHidePermanently} className="getting-started-secondary">Don't show again</button>
        </div>
      </div>
    </div>
  );
}

const formatLastPlayed = (lastPlayedTimestamp) => {
  if (!lastPlayedTimestamp) return 'Never played';

  const lastPlayedDate = new Date(lastPlayedTimestamp);
  const now = new Date();
  const diffMs = now - lastPlayedDate;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
};

function Home({
  mode = 'home',
  onScan,
  setMood = () => {},
  setTime = () => {},
  setSelectedGenre = () => {},
  mood = '',
  time = '',
  selectedGenre = '',
  onLaunchGame,
  lastPlayedGame,
  loading,
  library,
  theme = 'dark',
  activeSessions = {},
  endSession = () => {}
}) {
  const isDashboard = mode === 'dashboard';
  const [username, setUsername] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('Ready to find your perfect play?');
  const [profilePic, setProfilePic] = useState('');
  const [perfectPlayResult, setPerfectPlayResult] = useState(null);
  const [surpriseGameResult, setSurpriseGameResult] = useState(null);
  const [rediscoverGameResult, setRediscoverGameResult] = useState(null);
  const [showGettingStarted, setShowGettingStarted] = useState(() => {
    const preferences = readGettingStartedPreferences();
    return !preferences.hasSeen && !preferences.hidden;
  });
  const [retentionRefreshKey, setRetentionRefreshKey] = useState(0);
  const [selectedItemIndex, setSelectedItemIndex] = useState(-1);
  const [feedbackPreferences, setFeedbackPreferences] = useState(() => UserBehaviorProfile.getFeedbackPreferences());
  const [recommendationFeedbackState, setRecommendationFeedbackState] = useState({});
  const [sessionFeedbackPrompt, setSessionFeedbackPrompt] = useState(null);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [personaSnapshot, setPersonaSnapshot] = useState(null);
  const [goalProgress, setGoalProgress] = useState({ weekly: [], monthly: [] });
  const [streaks, setStreaks] = useState({ current: 0, longest: 0 });
  const [weeklyHabitStats, setWeeklyHabitStats] = useState({ totalHours: 0, sessions: 0, daysPlayed: 0, uniqueGames: 0 });
  const [discoveryRecommendations, setDiscoveryRecommendations] = useState([]);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [wishlistVersion, setWishlistVersion] = useState(0);

  const recentGames = useMemo(() => {
    return library
      .filter(game => game.last_played && game.time_played > 0)
      .sort((a, b) => new Date(b.last_played) - new Date(a.last_played))
      .slice(0, 5);
  }, [library]);

  const featuredGames = useMemo(() => {
    return library
      .filter(game => game.time_played > 120)
      .sort((a, b) => b.time_played - a.time_played)
      .slice(0, 5);
  }, [library]);

  const topRatedGames = useMemo(() => {
    if (!Array.isArray(library)) {
      return [];
    }

    return library
      .filter((game) => typeof game?.userRating === 'number' && game.userRating > 0)
      .sort((left, right) => {
        const ratingDiff = (right.userRating || 0) - (left.userRating || 0);
        if (ratingDiff !== 0) {
          return ratingDiff;
        }

        return (right.time_played || 0) - (left.time_played || 0);
      })
      .slice(0, 6);
  }, [library]);

  const getHomeShelfGameKey = useCallback((game) => {
    if (!game) {
      return null;
    }

    return game.appid || game.name || null;
  }, []);

  useEffect(() => {
    // Compute identity, habits, and insights surfaces
    try {
      setPersonaSnapshot(UserBehaviorProfile.getPersonaSnapshot());
    } catch (e) {
      console.error('Home: failed to load persona snapshot', e);
    }
    try {
      setGoalProgress(HabitTrackerService.getGoalProgress());
    } catch (e) {
      console.error('Home: failed to load goal progress', e);
    }
    try {
      setStreaks(HabitTrackerService.getStreaks());
    } catch (e) {
      console.error('Home: failed to load streaks', e);
    }
    try {
      setWeeklyHabitStats(HabitTrackerService.getWeeklyStats(0));
    } catch (e) {
      console.error('Home: failed to load weekly stats', e);
    }
    try {
      GamingIdentity.saveIdentitySnapshot();
      GamingIdentity.checkIdentityRewards();
    } catch {
      // Non-critical identity tracking
    }
    setRetentionRefreshKey((current) => current + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    setDiscoveryLoading(true);
    DiscoveryService.getRecommendations({ limit: 6 })
      .then((recs) => {
        if (!cancelled) setDiscoveryRecommendations(recs);
      })
      .catch(() => {
        if (!cancelled) setDiscoveryRecommendations([]);
      })
      .finally(() => {
        if (!cancelled) setDiscoveryLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const savedUsername = localStorage.getItem('gamepilot-profileUsername') || localStorage.getItem('profileUsername') || '';
    const savedMessage = localStorage.getItem('gamepilot-welcomeMessage') || localStorage.getItem('welcomeMessage') || 'Ready to find your perfect play?';
    const savedProfilePic = localStorage.getItem('gamepilot-profilePic') || localStorage.getItem('profilePic') || '';
    setUsername(savedUsername);
    setWelcomeMessage(savedMessage);
    setProfilePic(savedProfilePic);
  }, []);

  const closeGettingStarted = useCallback(() => {
    const preferences = {
      ...readGettingStartedPreferences(),
      hasSeen: true
    };
    saveGettingStartedPreferences(preferences);
    setShowGettingStarted(false);
  }, []);

  const hideGettingStartedPermanently = useCallback(() => {
    saveGettingStartedPreferences({ hasSeen: true, hidden: true });
    setShowGettingStarted(false);
  }, []);

  useEffect(() => {
    const handleSessionEnded = (event) => {
      if (!feedbackPreferences.sessionPromptEnabled) {
        return;
      }

      const detail = event?.detail;
      if (!detail?.gameName) {
        return;
      }

      setSessionFeedbackPrompt({
        ...detail,
        promptKey: `${detail.gameId || detail.gameName}-${detail.endTime || Date.now()}`
      });
    };

    window.addEventListener('gamepilot:session-ended', handleSessionEnded);
    return () => window.removeEventListener('gamepilot:session-ended', handleSessionEnded);
  }, [feedbackPreferences.sessionPromptEnabled]);

  // Helper to clear other results when a new feature is used
  const clearResults = () => {
    setPerfectPlayResult(null);
    setSurpriseGameResult(null);
    setRediscoverGameResult(null);
  };

  const handleMoodSelection = (nextMood) => {
    setMood(nextMood);
    if (nextMood) {
    }
  };

  const handleGenreSelection = (nextGenre) => {
    setSelectedGenre(nextGenre);
    if (nextGenre) {
    }
  };

  const handlePerfectPlaySearch = () => {
    clearResults();
    const result = RecommendationEngine.getPerfectPlayResult(
      library || [],
      mood || null,
      selectedGenre || null,
      time || null,
      3
    );

    if (result?.entries?.length > 0) {
      setPerfectPlayResult(result);
      trackRecommendationResult(result);
    } else {
      setPerfectPlayResult({
        error: Array.isArray(library) && library.length > 0
          ? 'No games found matching your criteria. Try adjusting your filters!'
          : 'Scan your games first to generate recommendations.'
      });
    }
  };

  const clearPerfectPlayResult = () => {
    setPerfectPlayResult(null);
  };

  const clearSurpriseResult = () => {
    setSurpriseGameResult(null);
  };

  const closeRediscoverResult = () => {
    setRediscoverGameResult(null);
  };

  const openGettingStartedGuide = () => {
    setShowGettingStarted(true);
  };

  const launchTonightPick = () => {
    handleTrackedLaunch(tonightPickGame, {
      feature: 'home_tonight_pick',
      result: perfectPlayResult || gamePilotPicksResult
    });
  };

  const launchContinuePlaying = () => {
    handleTrackedLaunch(continuePlayingGame, {
      feature: 'continue_playing',
      result: continuePlayingResult
    });
  };

  const launchRediscoverShelf = () => {
    handleTrackedLaunch(rediscoverShelfGame, {
      feature: 'rediscover',
      result: rediscoverGameResult
    });
  };

  const launchFavoriteShelf = () => {
    onLaunchGame(favoriteShelfGame);
  };

  const handleSurpriseSearch = () => {
    clearResults();
    const result = RecommendationEngine.getSurpriseMeResult(
      library || [],
      recommendationMood,
      time || null
    );

    if (result?.primaryGame) {
      setSurpriseGameResult(result);
      trackRecommendationResult(result);
    } else {
      setSurpriseGameResult({
        error: 'No games available for surprise! Scan your games first.'
      });
    }
  };

  const handleRediscoverSearch = () => {
    clearResults();
    const result = RecommendationEngine.getRediscoverResult(
      library || [],
      recommendationMood,
      time || null,
      3
    );

    if (result?.entries?.length > 0) {
      setRediscoverGameResult(result);
      trackRecommendationResult(result);
    } else {
      setRediscoverGameResult({
        error: 'Scan your games first to rediscover old favorites!'
      });
    }
  };

  const trackRecommendationResult = (result) => {
    const tracking = result?.tracking;
    if (!tracking || !Array.isArray(tracking.recommendedGameIds) || tracking.recommendedGameIds.length === 0) {
      return;
    }
    const source = result?.source || 'recommendation-engine';

    UserBehaviorProfile.trackRecommendation(
      tracking.recommendationType,
      tracking.mood,
      tracking.genre,
      tracking.timeAvailable ?? tracking.rawTimeAvailable ?? null,
      tracking.recommendedGameIds,
      {
        rawTimeAvailable: tracking.rawTimeAvailable ?? null,
        usedFallback: Boolean(result?.usedFallback),
        source
      }
    );
  };

  const trackRecommendationLaunch = (result, game) => {
    const tracking = result?.tracking;
    const gameId = game?.appid || game?.name || null;
    const source = result?.source || 'recommendation-engine';

    if (!tracking?.recommendationType || !gameId) {
      return;
    }

    UserBehaviorProfile.trackRecommendationLaunch(tracking.recommendationType, gameId, {
      mood: tracking.mood || game?.mood || null,
      genre: tracking.genre || RecommendationEngine.getPrimaryGenre(game) || null,
      timeAvailable: tracking.timeAvailable ?? null,
      rawTimeAvailable: tracking.rawTimeAvailable ?? null,
      recommendedGameIds: tracking.recommendedGameIds || [gameId],
      source
    });
  };

  const handleTrackedLaunch = (game, options = {}) => {
    const { feature = null, result = null } = options;

    if (!game) {
      return;
    }

    if (feature) {
      try {
      } catch (error) {
        console.error(`Home: Failed to log gameplay feature "${feature}"`, error);
      }
    }

    try {
      trackRecommendationLaunch(result, game);
    } catch (error) {
      console.error(`Home: Failed to track recommendation launch for ${game?.name || 'unknown game'}`, error);
    }

    onLaunchGame(game);
  };

  const getRecommendationFeedbackKey = (result, game) => {
    const recommendationType = result?.tracking?.recommendationType || 'recommendation';
    const gameId = game?.appid || game?.name || 'unknown-game';
    return `${recommendationType}:${gameId}`;
  };

  const submitRecommendationFeedback = (result, game, helpful) => {
    const recommendationType = result?.tracking?.recommendationType;
    const gameId = game?.appid || game?.name || null;

    if (!recommendationType || !gameId || typeof helpful !== 'boolean') {
      return;
    }

    UserBehaviorProfile.trackRecommendationFeedback(recommendationType, gameId, helpful, {
      mood: result?.tracking?.mood || game?.mood || null,
      genre: result?.tracking?.genre || RecommendationEngine.getPrimaryGenre(game) || null,
      timeAvailable: result?.tracking?.timeAvailable ?? null
    });

    setRecommendationFeedbackState((current) => ({
      ...current,
      [getRecommendationFeedbackKey(result, game)]: helpful
    }));
  };

  const disableRecommendationFeedback = () => {
    UserBehaviorProfile.setFeedbackPromptEnabled('recommendation', false);
    setFeedbackPreferences((current) => ({
      ...current,
      recommendationPromptEnabled: false
    }));
  };

  const enableRecommendationFeedback = () => {
    UserBehaviorProfile.setFeedbackPromptEnabled('recommendation', true);
    setFeedbackPreferences((current) => ({
      ...current,
      recommendationPromptEnabled: true
    }));
  };

  const submitSessionFeedback = (enjoyed) => {
    if (!sessionFeedbackPrompt || typeof enjoyed !== 'boolean') {
      setSessionFeedbackPrompt(null);
      setSessionCompleted(false);
      return;
    }

    UserBehaviorProfile.trackSessionFeedback(sessionFeedbackPrompt.gameName, enjoyed, {
      gameId: sessionFeedbackPrompt.gameId,
      mood: sessionFeedbackPrompt.mood,
      genre: sessionFeedbackPrompt.genre,
      playtimeMinutes: sessionFeedbackPrompt.playtimeMinutes,
      endTime: sessionFeedbackPrompt.endTime,
      completed: sessionCompleted
    });

    setSessionFeedbackPrompt(null);
    setSessionCompleted(false);
  };

  const disableSessionFeedback = () => {
    UserBehaviorProfile.setFeedbackPromptEnabled('session', false);
    setFeedbackPreferences((current) => ({
      ...current,
      sessionPromptEnabled: false
    }));
    setSessionFeedbackPrompt(null);
    setSessionCompleted(false);
  };

  const renderRecommendationFeedback = (entry, result) => {
    const game = entry?.game;
    if (!game || !result?.tracking?.recommendationType) {
      return null;
    }

    if (!feedbackPreferences.recommendationPromptEnabled) {
      return (
        <div style={{ marginTop: '12px', textAlign: 'center' }}>
          <button
            onClick={enableRecommendationFeedback}
            className="clear-button"
          >
            Re-enable recommendation feedback
          </button>
        </div>
      );
    }

    const feedbackKey = getRecommendationFeedbackKey(result, game);
    const submittedFeedback = recommendationFeedbackState[feedbackKey];
    const yesSelected = submittedFeedback === true;
    const noSelected = submittedFeedback === false;

    return (
      <div style={{ marginTop: '12px', textAlign: 'center' }}>
        <div style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '8px' }}>
          Was this a good recommendation?
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => submitRecommendationFeedback(result, game, true)}
            className="clear-button"
            title="Tell GamePilot this recommendation landed well so future picks improve"
            style={{
              opacity: yesSelected ? 1 : 0.75,
              background: yesSelected ? 'rgba(76, 175, 80, 0.2)' : undefined,
              borderColor: yesSelected ? '#4CAF50' : undefined,
              color: yesSelected ? '#4CAF50' : undefined,
              transform: yesSelected ? 'translateY(-1px)' : undefined,
              fontWeight: yesSelected ? 700 : 500
            }}
          >
            {yesSelected ? '✅ Liked' : '👍 Yes'}
          </button>
          <button
            onClick={() => submitRecommendationFeedback(result, game, false)}
            className="clear-button"
            title="Tell GamePilot this recommendation missed so it can tune future suggestions"
            style={{
              opacity: noSelected ? 1 : 0.75,
              background: noSelected ? 'rgba(244, 67, 54, 0.2)' : undefined,
              borderColor: noSelected ? '#F44336' : undefined,
              color: noSelected ? '#F44336' : undefined,
              transform: noSelected ? 'translateY(-1px)' : undefined,
              fontWeight: noSelected ? 700 : 500
            }}
          >
            {noSelected ? '✅ Saved' : '👎 No'}
          </button>
          <button
            onClick={disableRecommendationFeedback}
            className="clear-button"
            title="Hide recommendation feedback prompts if you do not want to train suggestions this way"
          >
            Hide this
          </button>
        </div>
        {typeof submittedFeedback === 'boolean' && (
          <p style={{ color: submittedFeedback ? '#4CAF50' : '#F44336', fontSize: '0.78rem', marginTop: '8px', marginBottom: '0' }}>
            Feedback saved. GamePilot will use this to improve future picks.
          </p>
        )}
        <p style={{ color: 'var(--text)', opacity: 0.65, fontSize: '0.75rem', marginTop: '8px' }}>
          Hiding this will reduce one of the signals GamePilot can use to improve recommendations.
        </p>
      </div>
    );
  };

  // Get available filter options from library
  const availableMoods = React.useMemo(() => {
    // Always show all 5 moods regardless of library content
    // This ensures users can select any mood even if no games currently have that mood
    return ['Relaxed', 'Social', 'Focused', 'Creative', 'Escapist'];
  }, []);

  const availableGenres = React.useMemo(() => {
    const genres = new Set();
    if (library && Array.isArray(library)) {
      library.forEach(game => {
        if (game.genres && Array.isArray(game.genres)) {
          game.genres.forEach(genre => {
            if (genre !== 'Unknown') {
              genres.add(genre);
            }
          });
        }
      });
    }
    // If no games scanned yet, show common genre options (game types)
    return Array.from(genres).length > 0 ? Array.from(genres).sort() : [
      'Action', 'Adventure', 'Indie', 'Puzzle', 'Racing', 'RPG', 'Shooter', 'Simulation', 'Strategy', 'Platformer',
      'Horror', 'Fighting', 'Sports', 'Roguelike', 'Management', 'Survival'
    ];
  }, [library]);

  const endSessionButtonStyle = {
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '8px 16px',
    cursor: 'pointer',
    fontWeight: 'bold',
    marginLeft: '8px'
  };

  const recommendationMood = Array.isArray(library) && library.length > 0
    ? (mood || RecommendationEngine.getMoodWithMostGames(library))
    : (mood || null);
  const continuePlayingResult = React.useMemo(() => (
    RecommendationEngine.getContinuePlayingResult(library, recommendationMood, time, lastPlayedGame)
  ), [lastPlayedGame, library, recommendationMood, time]);
  const continuePlayingEntry = continuePlayingResult?.primaryEntry || null;
  const continuePlayingGame = continuePlayingEntry?.game || continuePlayingResult?.primaryGame || null;
  const continuePlayingArtwork = continuePlayingGame ? resolveGameArtwork(continuePlayingGame, { surface: 'recommendation_card' }) : null;
  const continuePlayingPlaceholder = continuePlayingGame ? getGameArtworkPlaceholder({ game: continuePlayingGame, surface: 'recommendation_card' }) : null;
  const perfectPlayEntries = perfectPlayResult?.entries || [];
  const surpriseEntry = surpriseGameResult?.primaryEntry || null;
  const surpriseGame = surpriseEntry?.game || surpriseGameResult?.primaryGame || null;
  const surpriseGameArtwork = surpriseGame ? resolveGameArtwork(surpriseGame, { surface: 'recommendation_card' }) : null;
  const surpriseGamePlaceholder = surpriseGame ? getGameArtworkPlaceholder({ game: surpriseGame, surface: 'recommendation_card' }) : null;
  const rediscoverEntries = rediscoverGameResult?.entries || [];
  const retentionSnapshot = useMemo(() => {
    try {
      return RetentionQuestService.getHomeRetentionSnapshot(library);
    } catch (e) {
      console.error('Home: failed to load retention snapshot', e);
      return { weeklyQuest: null, gamePilotPicks: null };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [library, retentionRefreshKey]);
  const hasWidgetPack = EntitlementService.hasEntitlement('widget_pack') || EntitlementService.hasEntitlement('gamepilot_pro');
  const weeklyQuest = hasWidgetPack ? (retentionSnapshot?.weeklyQuest || {
    quests: [],
    primaryQuest: null,
    weeklyStats: null,
    completedCount: 0,
    totalCount: 0,
    label: 'This Week',
    periodKey: null
  }) : null;
  const gamePilotPicksResult = hasWidgetPack ? retentionSnapshot?.gamePilotPicks || null : null;
  const gamePilotPickEntries = gamePilotPicksResult?.entries || [];
  const trackedRetentionPicksKeyRef = React.useRef('');
  const tonightPickEntry = perfectPlayEntries[0] || gamePilotPickEntries[0] || null;
  const tonightPickGame = tonightPickEntry?.game || null;
  const tonightPickArtwork = tonightPickGame ? resolveGameArtwork(tonightPickGame, { surface: 'recommendation_card' }) : null;
  const tonightPickPlaceholder = tonightPickGame ? getGameArtworkPlaceholder({ game: tonightPickGame, surface: 'recommendation_card' }) : null;
  const rediscoverShelfEntry = rediscoverEntries[0] || null;
  const rediscoverShelfFallback = useMemo(() => {
    if (!Array.isArray(library) || library.length === 0) {
      return null;
    }

    const excludedKeys = new Set([
      getHomeShelfGameKey(tonightPickGame),
      getHomeShelfGameKey(continuePlayingGame)
    ].filter(Boolean));

    const candidates = library.filter((game) => {
      const gameKey = getHomeShelfGameKey(game);
      return gameKey && !excludedKeys.has(gameKey);
    });

    // Prefer games with some playtime, sorted by least recently played first
    const withPlaytime = candidates.filter((g) => (g.time_played || 0) > 0);
    const pool = withPlaytime.length > 0 ? withPlaytime : candidates;

    return pool
      .sort((left, right) => {
        const leftLastPlayed = left.last_played ? new Date(left.last_played).getTime() : 0;
        const rightLastPlayed = right.last_played ? new Date(right.last_played).getTime() : 0;
        if (leftLastPlayed !== rightLastPlayed) {
          return leftLastPlayed - rightLastPlayed;
        }
        return (right.time_played || 0) - (left.time_played || 0);
      })[0] || null;
  }, [continuePlayingGame, getHomeShelfGameKey, library, tonightPickGame]);
  const rediscoverShelfGame = rediscoverShelfEntry?.game || rediscoverShelfFallback || null;
  const rediscoverShelfArtwork = rediscoverShelfGame ? resolveGameArtwork(rediscoverShelfGame, { surface: 'recommendation_card' }) : null;
  const rediscoverShelfPlaceholder = rediscoverShelfGame ? getGameArtworkPlaceholder({ game: rediscoverShelfGame, surface: 'recommendation_card' }) : null;
  const favoriteShelfFallback = useMemo(() => {
    const excludedKeys = new Set([
      getHomeShelfGameKey(tonightPickGame),
      getHomeShelfGameKey(continuePlayingGame),
      getHomeShelfGameKey(rediscoverShelfGame)
    ].filter(Boolean));

    const fromFeatured = [...featuredGames, ...recentGames]
      .find((game) => {
        const gameKey = getHomeShelfGameKey(game);
        return gameKey && !excludedKeys.has(gameKey);
      });

    if (fromFeatured) {
      return fromFeatured;
    }

    // Fall back to any library game not already used
    if (Array.isArray(library) && library.length > 0) {
      return library.find((game) => {
        const gameKey = getHomeShelfGameKey(game);
        return gameKey && !excludedKeys.has(gameKey);
      }) || null;
    }

    return null;
  }, [continuePlayingGame, featuredGames, getHomeShelfGameKey, library, recentGames, rediscoverShelfGame, tonightPickGame]);
  const favoriteShelfGame = topRatedGames[0] || favoriteShelfFallback || null;
  const favoriteShelfArtwork = favoriteShelfGame ? resolveGameArtwork(favoriteShelfGame, { surface: 'recommendation_card' }) : null;
  const favoriteShelfPlaceholder = favoriteShelfGame ? getGameArtworkPlaceholder({ game: favoriteShelfGame, surface: 'recommendation_card' }) : null;
  const homeShelfCards = [tonightPickGame, continuePlayingGame, rediscoverShelfGame, favoriteShelfGame].filter(Boolean).length;
  const weeklyQuestSummary = weeklyQuest?.primaryQuest?.title || weeklyQuest?.label || 'A few thoughtful picks are ready for you.';
  const weeklyPlayDays = weeklyHabitStats.daysPlayed || weeklyQuest?.weeklyStats?.activeDays || 0;
  const weeklyPlaytimeHours = weeklyHabitStats.totalHours || weeklyQuest?.weeklyStats?.playtimeHours || 0;
  const recentLibraryActivity = recentGames.length;
  const shouldShowLegacyContinueSection = continuePlayingGame && homeShelfCards === 0;
  const shouldShowLegacyTopRatedSection = topRatedGames.length > 0 && !favoriteShelfGame;
  const storyLeadGame = recentGames[0] || featuredGames[0] || favoriteShelfGame || tonightPickGame || null;
  const storyMood = mood || recommendationMood || 'your current mood';
  const storyGenre = storyLeadGame?.genres?.find((genre) => genre && genre !== 'Unknown') || null;
  const libraryStoryItems = [
    recentGames.length > 0
      ? `You have revisited ${recentGames.length} game${recentGames.length === 1 ? '' : 's'} recently${recentGames[0]?.name ? `, with ${recentGames[0].name} freshest in rotation.` : '.'}`
      : null,
    weeklyPlaytimeHours > 0
      ? `You have logged ${weeklyPlaytimeHours} hour${weeklyPlaytimeHours === 1 ? '' : 's'} this week across ${weeklyPlayDays} play day${weeklyPlayDays === 1 ? '' : 's'}.`
      : null,
    storyGenre
      ? `Your library is currently surfacing strong ${storyGenre.toLowerCase()} energy, which pairs well with ${storyMood.toLowerCase()}.`
      : null,
    favoriteShelfGame?.name
      ? typeof favoriteShelfGame?.userRating === 'number' && favoriteShelfGame.userRating > 0
        ? `${favoriteShelfGame.name} is still one of your clearest personal favourites, which helps keep recommendations grounded in your actual taste.`
        : `${favoriteShelfGame.name} is carrying a lot of your recent library identity, so it stays close as a dependable anchor pick.`
      : null
  ].filter(Boolean).slice(0, 3);

  useEffect(() => {
    const recommendedIds = gamePilotPicksResult?.tracking?.recommendedGameIds || [];
    const nextTrackingKey = recommendedIds.length > 0
      ? `${weeklyQuest?.periodKey || 'weekly'}:${recommendedIds.join('|')}`
      : '';

    if (!nextTrackingKey || trackedRetentionPicksKeyRef.current === nextTrackingKey) {
      return;
    }

    trackRecommendationResult(gamePilotPicksResult);
    trackedRetentionPicksKeyRef.current = nextTrackingKey;
  }, [gamePilotPicksResult, weeklyQuest?.periodKey]);

  const handleWeeklyQuestPinToggle = (quest) => {
    if (!quest?.id) {
      return;
    }

    if (quest.isPinned) {
      RetentionQuestService.clearWeeklyQuestPin();
    } else {
      RetentionQuestService.pinWeeklyQuest(quest.id);
    }

    setRetentionRefreshKey((current) => current + 1);
  };

  const renderEndSessionButton = (gameName) => {
    if (!gameName || !activeSessions[gameName]) {
      return null;
    }

    return (
      <button
        onClick={(event) => {
          event.stopPropagation();
          endSession(gameName);
        }}
        style={endSessionButtonStyle}
        title="End the active tracked session for this game"
      >
        🛑 End Session
      </button>
    );
  };

  const handleHomeControllerInput = useCallback((action) => {
    const itemsCount = recentGames.length + featuredGames.length;
    if (action === 'down' && selectedItemIndex < itemsCount - 1) {
      setSelectedItemIndex(prev => prev + 1);
      return true;
    } else if (action === 'up' && selectedItemIndex > 0) {
      setSelectedItemIndex(prev => prev - 1);
      return true;
    } else if (action === 'confirm' && selectedItemIndex >= 0) {
      let gameToLaunch;
      if (selectedItemIndex < recentGames.length) {
        gameToLaunch = recentGames[selectedItemIndex];
      } else if (selectedItemIndex < recentGames.length + featuredGames.length) {
        gameToLaunch = featuredGames[selectedItemIndex - recentGames.length];
      }
      if (gameToLaunch) {
        onLaunchGame(gameToLaunch);
        return true;
      }
    }
    return false;
  }, [selectedItemIndex, recentGames, featuredGames, onLaunchGame]);

  useEffect(() => {
    const handleGlobalControllerInput = (event) => {
      if (handleHomeControllerInput(event?.detail?.action)) {
        event.preventDefault();
      }
    };
    window.addEventListener('controllerInput', handleGlobalControllerInput);
    return () => window.removeEventListener('controllerInput', handleGlobalControllerInput);
  }, [handleHomeControllerInput]);

  const getGameCardClass = useCallback((index) => {
    return `game-card fade-in ${selectedItemIndex === index ? 'selected' : ''}`;
  }, [selectedItemIndex]);

  const launcherSummary = useMemo(() => {
    const libraryList = Array.isArray(library) ? library : [];
    const launchers = [
      { name: 'Steam', icon: '🚂', games: libraryList.filter((game) => game.platform === 'Steam').length },
      { name: 'Epic Games', icon: '🎮', games: libraryList.filter((game) => game.platform === 'Epic').length },
      { name: 'Xbox', icon: '🎯', games: libraryList.filter((game) => game.platform === 'Xbox').length },
      { name: 'Rockstar', icon: '🪨', games: libraryList.filter((game) => game.platform === 'Rockstar').length },
      { name: 'Battle.net', icon: '⚔️', games: libraryList.filter((game) => game.platform === 'Battle.net').length },
      { name: 'EA', icon: '🎪', games: libraryList.filter((game) => game.platform === 'EA').length },
      { name: 'Ubisoft', icon: '🔷', games: libraryList.filter((game) => game.platform === 'Ubisoft').length },
      { name: 'GOG', icon: '🌌', games: libraryList.filter((game) => game.platform === 'GOG').length },
      { name: 'Riot Games', icon: '👊', games: libraryList.filter((game) => game.platform === 'Riot').length },
      { name: 'Battlestate Games', icon: '🔫', games: libraryList.filter((game) => game.platform === 'BSG').length },
      { name: 'Amazon Games', icon: '📦', games: libraryList.filter((game) => game.platform === 'Amazon').length },
      { name: 'Itch.io', icon: '🎲', games: libraryList.filter((game) => game.platform === 'Itch.io').length },
      { name: 'PlayStation', icon: '🎮', games: libraryList.filter((game) => game.brandPlatform === 'PlayStation' || game.platform === 'PlayStation').length }
    ];

    const detectedLaunchers = launchers.filter((launcher) => launcher.games > 0);

    return {
      launchers,
      detectedLaunchers,
      detectedLauncherCount: detectedLaunchers.length,
      totalGames: libraryList.length
    };
  }, [library]);

  const renderDiscoveryContent = () => (
    <>
      {discoveryLoading ? (
        <div className="discovery-skeleton-grid">
          {[1, 2, 3].map((n) => (
            <div key={n} className="discovery-skeleton-card" />
          ))}
        </div>
      ) : discoveryRecommendations.length > 0 ? (
        <div className="discovery-grid">
          <div className="discovery-header">
            <span>Matched to {personaSnapshot?.personaIdentity?.label || 'your playstyle'}</span>
            <button
              className="discovery-refresh-btn"
              disabled={discoveryLoading}
              onClick={() => {
                setDiscoveryLoading(true);
                DiscoveryService.clearCache();
                DiscoveryService.getRecommendations({ limit: 6, forceRefresh: true })
                  .then((recs) => setDiscoveryRecommendations(recs))
                  .catch(() => setDiscoveryRecommendations([]))
                  .finally(() => setDiscoveryLoading(false));
              }}
              title="Refresh recommendations"
            >
              {discoveryLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          <div className="discovery-cards" key={wishlistVersion}>
            {discoveryRecommendations.map((game) => (
              <article key={game.id} className="discovery-card">
                <div className="discovery-card-badge">
                  <span>{personaSnapshot?.source === 'empty' ? (game.matchReasons?.[0] || 'Popular') : `${game.matchScore}% match`}</span>
                </div>
                <h4>{game.name}</h4>
                <div className="discovery-card-meta">
                  <span className="discovery-genres">{game.genres.slice(0, 2).join(' · ')}</span>
                  <span className="discovery-rating">{game.rating}%</span>
                </div>
                <div className="discovery-card-reasons">
                  {game.matchReasons.slice(0, 2).map((reason, i) => (
                    <span key={i}>{reason}</span>
                  ))}
                </div>
                <div className="discovery-card-price">
                  {game.priceFormatted.original && (
                    <span className="discovery-original">{game.priceFormatted.original}</span>
                  )}
                  <span className="discovery-price">{game.priceFormatted.display}</span>
                  {game.priceFormatted.discount > 0 && (
                    <span className="discovery-discount">-{game.priceFormatted.discount}%</span>
                  )}
                </div>
                <div className="discovery-card-actions">
                  <a
                    href={`https://store.steampowered.com/search/?term=${encodeURIComponent(game.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="discovery-link"
                  >
                    View on Steam
                  </a>
                  <button
                    className="discovery-wishlist-btn"
                    onClick={() => {
                      if (DiscoveryService.isInWishlist(game.id)) {
                        DiscoveryService.removeFromWishlist(game.id);
                      } else {
                        DiscoveryService.addToWishlist(game);
                      }
                      setWishlistVersion((v) => v + 1);
                    }}
                  >
                    {DiscoveryService.isInWishlist(game.id) ? 'Saved' : 'Wishlist'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <div className="discovery-empty">
          <Sparkles size={28} />
          <p>No recommendations yet.</p>
          <span>Play a few sessions and we’ll surface games that match your vibe.</span>
        </div>
      )}
    </>
  );

  return (
    <div
      className={`home-page ${theme}`}
    >
      <NavBar />
      
      {/* Hero Section */}
      <div className="home-hero">
        <DailyDoodleTitle
          username={username}
          welcomeMessage={username ? welcomeMessage : ''}
          profilePic={profilePic}
          themeId={theme}
        />
        <p className="home-subtitle">
          {username ? 'Your personalized gaming mission control' : 'Your Smart Gaming Library Manager'}
        </p>

        <p className="home-hero-summary">
          {launcherSummary.totalGames > 0
            ? `${launcherSummary.totalGames} game${launcherSummary.totalGames === 1 ? '' : 's'} tracked across ${launcherSummary.detectedLauncherCount} platform${launcherSummary.detectedLauncherCount === 1 ? '' : 's'} in your current library.`
            : 'Scan your local installs to build a cleaner launcher overview and unlock guided Home picks.'}
        </p>

        {/* Scan Button */}
        <button 
          onClick={() => {
            if (onScan) {
              onScan();
            }
          }} 
          disabled={loading} 
          className={`scan-button ${loading ? 'loading' : ''}`}
        >
          {loading ? (
            <span>Scanning...</span>
          ) : (
            <span>Scan Local Games</span>
          )}
        </button>
        
        <p className="scan-description">
          Automatically finds Steam, Epic, Game Pass, Rockstar, Battle.net, EA, Ubisoft, and GOG games
        </p>
        
        {/* Launcher Status */}
        <div className="launcher-status">
          <div className="launcher-status-header">
            <div>
              <h4 className="launcher-status-title">
                Launcher Overview
              </h4>
              <p className="launcher-status-copy">
                {launcherSummary.totalGames > 0
                  ? `Showing the platforms currently represented in your merged library.`
                  : 'After your first scan, this strip shows where your library lives.'}
              </p>
            </div>
            <div className="launcher-status-pill">
              <span>Detected</span>
              <strong>{launcherSummary.detectedLauncherCount}</strong>
            </div>
          </div>
          <div className="launcher-grid">
            {launcherSummary.launchers.map((launcher) => (
                <div
                  key={launcher.name}
                  className={`launcher-badge ${launcher.games > 0 ? 'detected' : ''}`}
                  title={`${launcher.name}: ${launcher.games} game${launcher.games === 1 ? '' : 's'} in your library`}
                >
                  <span>{launcher.icon}</span>
                  <span>{launcher.name}</span>
                  {launcher.games > 0 && (
                    <span className="game-count">
                      {launcher.games}
                    </span>
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>

      {isDashboard ? (
        <>
          <NostalgiaCard library={library} />
          <PatchNotesBadge library={library} />

          <LibrarianHubCarousel library={library} onLaunchGame={onLaunchGame} />

          <CollapsibleSection
            title="Library Today"
            subtitle="Guided shelves, picks, and your weekly story."
            badge={`${library?.length || 0} games`}
            icon={<Library size={18} />}
            className="home-guided-section"
            defaultOpen
          >
            <HomeGuidedContent
              libraryCount={library?.length || 0}
              homeShelfCards={homeShelfCards}
              weeklyQuestSummary={weeklyQuestSummary}
              weeklyPlayDays={weeklyPlayDays}
              weeklyPlaytimeHours={weeklyPlaytimeHours}
              recentLibraryActivity={recentLibraryActivity}
              tonightPickGame={tonightPickGame}
              tonightPickEntry={tonightPickEntry}
              tonightPickArtwork={tonightPickArtwork}
              tonightPickPlaceholder={tonightPickPlaceholder}
              continuePlayingGame={continuePlayingGame}
              continuePlayingEntry={continuePlayingEntry}
              continuePlayingArtwork={continuePlayingArtwork}
              continuePlayingPlaceholder={continuePlayingPlaceholder}
              rediscoverShelfGame={rediscoverShelfGame}
              rediscoverShelfEntry={rediscoverShelfEntry}
              rediscoverShelfArtwork={rediscoverShelfArtwork}
              rediscoverShelfPlaceholder={rediscoverShelfPlaceholder}
              favoriteShelfGame={favoriteShelfGame}
              favoriteShelfArtwork={favoriteShelfArtwork}
              favoriteShelfPlaceholder={favoriteShelfPlaceholder}
              platformIcons={platformIcons}
              onLaunchTonightPick={launchTonightPick}
              onLaunchContinuePlaying={launchContinuePlaying}
              onLaunchRediscover={launchRediscoverShelf}
              onLaunchFavorite={launchFavoriteShelf}
              formatLastPlayed={formatLastPlayed}
              formatPlaytime={formatPlaytime}
              libraryStoryItems={libraryStoryItems}
              shouldShowLegacyContinueSection={shouldShowLegacyContinueSection}
              continuePlayingMessage={continuePlayingResult?.message}
              continuePlayingEndSessionButton={renderEndSessionButton(continuePlayingGame?.name)}
              weeklyQuest={weeklyQuest}
              gamePilotPickEntries={gamePilotPickEntries}
              gamePilotPicksResult={gamePilotPicksResult}
              getGameCardClass={getGameCardClass}
              resolveGameArtwork={resolveGameArtwork}
              getGameArtworkPlaceholder={getGameArtworkPlaceholder}
              onLaunchGame={onLaunchGame}
              trackRecommendationLaunch={trackRecommendationLaunch}
              renderEndSessionButton={renderEndSessionButton}
              handleWeeklyQuestPinToggle={handleWeeklyQuestPinToggle}
            />
          </CollapsibleSection>

          <CollapsibleSection
            title="Identity & Habits"
            subtitle="Your gaming persona, weekly progress, and active goals."
            icon={<Library size={18} />}
            className="home-identity-section"
            defaultOpen={false}
          >
            <IdentitySnapshotCard persona={personaSnapshot} />
            <BecauseYouAreSection
              library={library}
              resolveGameArtwork={resolveGameArtwork}
              getGameArtworkPlaceholder={getGameArtworkPlaceholder}
              platformIcons={PLATFORM_ICONS}
              formatPlaytime={formatPlaytime}
              onLaunchGame={onLaunchGame}
              getGameCardClass={getGameCardClass}
            />
            <WeeklyPlaySnapshot weeklyStats={weeklyHabitStats} streaks={streaks} />
            <HabitGoalsMiniCard goalProgress={goalProgress} />
          </CollapsibleSection>

          <CollapsibleSection
            title="Tools & Recommendations"
            subtitle="Mood filters, Perfect Play, Surprise Me, and Rediscover."
            icon={<SlidersHorizontal size={18} />}
            className="home-tools-section"
          >
            <HomeToolsContent
              libraryCount={library?.length || 0}
              mood={mood}
              selectedGenre={selectedGenre}
              time={time}
              availableMoods={availableMoods}
              availableGenres={availableGenres}
              onSelectVibe={handleMoodSelection}
              onMoodChange={handleMoodSelection}
              onGenreChange={handleGenreSelection}
              onTimeChange={setTime}
              onFindGamesForMood={handlePerfectPlaySearch}
              onFindPerfectPlay={handlePerfectPlaySearch}
              onSurpriseMe={handleSurpriseSearch}
              onRediscover={handleRediscoverSearch}
              perfectPlayResult={perfectPlayResult}
              perfectPlayEntries={perfectPlayEntries}
              surpriseGameResult={surpriseGameResult}
              surpriseGame={surpriseGame}
              surpriseEntry={surpriseEntry}
              surpriseGameArtwork={surpriseGameArtwork}
              surpriseGamePlaceholder={surpriseGamePlaceholder}
              rediscoverGameResult={rediscoverGameResult}
              rediscoverEntries={rediscoverEntries}
              topRatedGames={topRatedGames}
              shouldShowLegacyTopRatedSection={shouldShowLegacyTopRatedSection}
              getGameCardClass={getGameCardClass}
              resolveGameArtwork={resolveGameArtwork}
              getGameArtworkPlaceholder={getGameArtworkPlaceholder}
              platformColors={platformColors}
              platformIcons={platformIcons}
              formatPlaytime={formatPlaytime}
              handleTrackedLaunch={handleTrackedLaunch}
              renderEndSessionButton={renderEndSessionButton}
              renderRecommendationFeedback={renderRecommendationFeedback}
              onClearPerfectPlay={clearPerfectPlayResult}
              onClearSurprise={clearSurpriseResult}
              onCloseRediscover={closeRediscoverResult}
              onLaunchGame={onLaunchGame}
              onOpenGettingStarted={openGettingStartedGuide}
            />
          </CollapsibleSection>

          <CollapsibleSection
            title="Discover Games"
            subtitle="Games that match your vibe, pulled from Steam and beyond."
            icon={<Sparkles size={18} />}
            className="home-discovery-section"
            defaultOpen={false}
          >
            {renderDiscoveryContent()}
          </CollapsibleSection>

          <CollapsibleSection
            title="Wishlist"
            subtitle="Games you're tracking for a good deal."
            icon={<Library size={18} />}
            className="home-wishlist-section"
            defaultOpen={false}
          >
            <WishlistSection library={library} platformIcons={platformIcons} onLaunchGame={onLaunchGame} />
          </CollapsibleSection>
        </>
      ) : (
        <>
          <LibrarianHubCarousel library={library} onLaunchGame={onLaunchGame} />

          <HomeSection
            eyebrow="Your Library"
            title="Library Today"
            copy="Start with a few thoughtful shelves instead of a blank choice."
          >
            <LibraryTodaySection
              homeShelfCards={homeShelfCards}
              weeklyQuestSummary={weeklyQuestSummary}
              weeklyPlayDays={weeklyPlayDays}
              weeklyPlaytimeHours={weeklyPlaytimeHours}
              recentLibraryActivity={recentLibraryActivity}
              tonightPickGame={tonightPickGame}
              tonightPickEntry={tonightPickEntry}
              tonightPickArtwork={tonightPickArtwork}
              tonightPickPlaceholder={tonightPickPlaceholder}
              continuePlayingGame={continuePlayingGame}
              continuePlayingEntry={continuePlayingEntry}
              continuePlayingArtwork={continuePlayingArtwork}
              continuePlayingPlaceholder={continuePlayingPlaceholder}
              rediscoverShelfGame={rediscoverShelfGame}
              rediscoverShelfEntry={rediscoverShelfEntry}
              rediscoverShelfArtwork={rediscoverShelfArtwork}
              rediscoverShelfPlaceholder={rediscoverShelfPlaceholder}
              favoriteShelfGame={favoriteShelfGame}
              favoriteShelfArtwork={favoriteShelfArtwork}
              favoriteShelfPlaceholder={favoriteShelfPlaceholder}
              platformIcons={platformIcons}
              onLaunchTonightPick={launchTonightPick}
              onLaunchContinuePlaying={launchContinuePlaying}
              onLaunchRediscover={launchRediscoverShelf}
              onLaunchFavorite={launchFavoriteShelf}
              formatLastPlayed={formatLastPlayed}
              formatPlaytime={formatPlaytime}
            />
          </HomeSection>

          <HomeSection
            eyebrow="Who You Are"
            title="Your Gaming Identity"
            copy="GamePilot learns your patterns and turns them into a living profile."
            compact
          >
            <IdentitySnapshotCard persona={personaSnapshot} />
            <WeeklyPlaySnapshot weeklyStats={weeklyHabitStats} streaks={streaks} />
            <HabitGoalsMiniCard goalProgress={goalProgress} />
          </HomeSection>

          <HomeSection
            className="home-tools-section"
            eyebrow="Find Your Next Game"
            title="Perfect Play"
            copy="Match mood, genre, and session length to find the right game right now."
            compact
          >
            <TuneYourNextPickSection
              mood={mood}
              selectedGenre={selectedGenre}
              time={time}
              availableMoods={availableMoods}
              availableGenres={availableGenres}
              onMoodChange={handleMoodSelection}
              onGenreChange={handleGenreSelection}
              onTimeChange={setTime}
              onFindPerfectPlay={handlePerfectPlaySearch}
              onSurpriseMe={handleSurpriseSearch}
              onRediscover={handleRediscoverSearch}
            />
            <RecommendationResultsSection hasResults={perfectPlayResult || surpriseGameResult || rediscoverGameResult}>
              <PerfectPlayResultSection
                result={perfectPlayResult}
                entries={perfectPlayEntries}
                getGameCardClass={getGameCardClass}
                resolveGameArtwork={resolveGameArtwork}
                getGameArtworkPlaceholder={getGameArtworkPlaceholder}
                platformIcons={platformIcons}
                formatPlaytime={formatPlaytime}
                handleTrackedLaunch={handleTrackedLaunch}
                renderEndSessionButton={renderEndSessionButton}
                renderRecommendationFeedback={renderRecommendationFeedback}
                onClear={clearPerfectPlayResult}
              />
              <SurpriseGameResultSection
                result={surpriseGameResult}
                game={surpriseGame}
                entry={surpriseEntry}
                artwork={surpriseGameArtwork}
                placeholder={surpriseGamePlaceholder}
                platformIcons={platformIcons}
                formatPlaytime={formatPlaytime}
                handleTrackedLaunch={handleTrackedLaunch}
                renderEndSessionButton={renderEndSessionButton}
                renderRecommendationFeedback={renderRecommendationFeedback}
                onClear={clearSurpriseResult}
              />
              <RediscoverResultSection
                result={rediscoverGameResult}
                entries={rediscoverEntries}
                getGameCardClass={getGameCardClass}
                resolveGameArtwork={resolveGameArtwork}
                getGameArtworkPlaceholder={getGameArtworkPlaceholder}
                platformIcons={platformIcons}
                formatPlaytime={formatPlaytime}
                handleTrackedLaunch={handleTrackedLaunch}
                renderEndSessionButton={renderEndSessionButton}
                renderRecommendationFeedback={renderRecommendationFeedback}
                onClose={closeRediscoverResult}
              />
            </RecommendationResultsSection>
          </HomeSection>

          <HomeSection
            className="home-discovery-section"
            eyebrow="Discover"
            title="Games to Buy"
            copy="Persona-matched picks from Steam and beyond."
            compact
          >
            {renderDiscoveryContent()}
          </HomeSection>

          {hasWidgetPack && (
            <HomeSection
              className="home-widgets-section"
              eyebrow="Widgets"
              title="At a Glance"
              copy="Quick stats and updates from your library."
              compact
            >
              <DashboardWidgetGrid>
                <MiniStatsWidget
                  weeklyPlayDays={weeklyPlayDays}
                  weeklyPlaytimeHours={weeklyPlaytimeHours}
                  libraryCount={library?.length || 0}
                />
                <MiniQuestWidget
                  weeklyQuest={weeklyQuest}
                  handleWeeklyQuestPinToggle={handleWeeklyQuestPinToggle}
                />
                <MiniNextUpWidget
                  game={tonightPickGame}
                  entry={tonightPickEntry}
                  artwork={tonightPickArtwork}
                  placeholder={tonightPickPlaceholder}
                  platformIcons={platformIcons}
                  onLaunch={launchTonightPick}
                />
                <MiniBacklogWidget
                  libraryCount={library?.length || 0}
                  completedCount={library?.filter(g => g?.status === 'completed' || g?.completed).length || 0}
                />
              </DashboardWidgetGrid>
            </HomeSection>
          )}
        </>
      )}

      <GettingStartedModal 
        isOpen={showGettingStarted} 
        onClose={closeGettingStarted}
        onHidePermanently={hideGettingStartedPermanently}
        theme={theme}
      />

      {sessionFeedbackPrompt && feedbackPreferences.sessionPromptEnabled && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className={`modal-title ${theme}`}>How was that session?</h2>
            <p style={{ marginBottom: '16px' }}>
              Did you enjoy playing <strong>{sessionFeedbackPrompt.gameName}</strong>?
            </p>
            <p style={{ fontSize: '0.9rem', opacity: 0.75, marginBottom: '20px' }}>
              This helps GamePilot learn which recommendations actually land well for you.
            </p>
            <label className="session-completed-toggle" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', cursor: 'pointer', justifyContent: 'center' }}>
              <input
                type="checkbox"
                checked={sessionCompleted}
                onChange={(e) => setSessionCompleted(e.target.checked)}
              />
              <span>I completed this game 🏆</span>
            </label>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
              <button onClick={() => submitSessionFeedback(true)} className="action-button primary">👍 Good Session</button>
              <button onClick={() => submitSessionFeedback(false)} className="action-button secondary">👎 Not Really</button>
              <button onClick={() => { setSessionFeedbackPrompt(null); setSessionCompleted(false); }} className="clear-button">Skip</button>
            </div>
            <button onClick={disableSessionFeedback} className="clear-button">
              Hide this feature
            </button>
            <p style={{ color: 'var(--text)', opacity: 0.6, fontSize: '0.8rem', marginTop: '12px' }}>
              Turning this off removes a learning signal that can improve future recommendations.
            </p>
          </div>
        </div>
      )}

      <footer className="contact-footer">
        <div className="contact-content">
          <h4>Contact GamePilot</h4>
          <div className="contact-links">
            <a href="mailto:gamepilot91@hotmail.com" className="contact-link">
              📧 Email: gamepilot91@hotmail.com
            </a>
            <a href="https://x.com/Mozog91" target="_blank" rel="noopener noreferrer" className="contact-link">
              🐦 Twitter: @Mozog91
            </a>
          </div>
          <p className="contact-note">
            Questions, feedback, or bug reports? We'd love to hear from you!
          </p>
        </div>
      </footer>

    </div>
  );
}

export default Home;
