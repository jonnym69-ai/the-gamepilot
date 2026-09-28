import React, { useState, useEffect, useCallback, useMemo } from 'react';
import NavBar from './NavBar';
import { UserBehaviorProfile } from './services/UserBehaviorProfile';
import { AchievementTracker } from './AchievementSystem';
import BuyRecommendationService from './services/BuyRecommendationService';
import { MOODS } from './constants/GenresMoods';
import WishlistService from './services/WishlistService';
import { HabitTrackerService } from './services/HabitTrackerService';
import CollapsibleSection from './components/CollapsibleSection';
import {
  ArrowRight,
  ChevronDown,
  Clock3,
  Library,
  ScanLine,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import HomeDailyOverview, { HOME_VIEWS, HomeViewNavigation } from './components/HomeDailyOverview';
import DailyDoodleTitle from './components/DailyDoodleTitle';
import DailyParadox from './components/DailyParadox';
import DiscoverHighlights from './components/DiscoverHighlights';
import { RecommendationEngine } from './services/RecommendationEngine';
import { BacklogCoachService } from './services/BacklogCoachService';
import { GamingIdentity } from './GamingIdentity';
import { getFamiliarityBias, setFamiliarityBias } from './services/RecommendationWeights';
import { RetentionQuestService } from './services/RetentionQuestService';
import { getGameArtworkPlaceholder, resolveGameArtwork, resolveGameArtworkBundle } from './services/GameArtworkService';
import { PLATFORM_ICONS, PLATFORM_COLORS } from './constants/PlatformConstants';
import { ProgressionUnlockService } from './services/ProgressionUnlockService';
import './Home.css';
import './LibraryValue.css';
import useRewardPresentation from './hooks/useRewardPresentation';
import HomeLayoutContent from './components/HomeLayoutContent';
import './RewardPresentation.css';
import HomeTodayTabs from './components/HomeTodayTabs';
import LazyImage from './components/LazyImage';
import WishlistSection from './components/WishlistSection';
import NostalgiaCard from './components/NostalgiaCard';
import PatchNotesBadge from './components/PatchNotesBadge';
import EnergyVibePicker from './components/EnergyVibePicker';
import LibrarianHubCarousel from './components/LibrarianHubCarousel';
import RecentlyPlayedShelf from './components/RecentlyPlayedShelf';
import WeeklyRecapNudge from './components/WeeklyRecapNudge';
import WeeklyDigestCard from './components/WeeklyDigestCard';
import MilestoneToast from './components/MilestoneToast';
import SmartNudgeCard from './components/SmartNudgeCard';
import { MilestoneService } from './services/MilestoneService';
import './components/EngagementWidgets.css';
import WelcomeBackCard from './components/WelcomeBackCard';
import { SessionService } from './services/SessionService';
import { WelcomeBackService } from './services/WelcomeBackService';
import StorageService from './services/StorageService';
import { HomeSection } from './components/HomeSectionPrimitives';
import {
  TuneYourNextPickSection,
  PerfectPlayResultSection,
  RecommendationResultsSection,
  SurpriseGameResultSection,
  RediscoverResultSection,
} from './components/RecommendationShelves';
import { HomeGuidedContent, HomeToolsContent } from './components/HomeOrchestrators';
import { LibraryTodaySection } from './components/LibraryTodaySection';
import {
  IdentitySnapshotCard,
  CurrentEraCard,
  WeeklyPlaySnapshot,
  BecauseYouAreSection,
  FamiliarOrFreshNudge,
  RecentSessionsSummary,
  CurrentChampionCard,
} from './components/IdentityWidgets';
import EraArchiveCard from './components/EraArchiveCard';
import ProGate from './components/ProGate';
import RivalryBanner from './components/RivalryBanner';
import StreakBadge from './components/StreakBadge';
import GettingStartedModal from './components/GettingStartedModal';
import {
  readGettingStartedPreferences,
  saveGettingStartedPreferences,
  formatPlaytime,
  formatLastPlayed,
} from './utils/homeHelpers';

// Use centralized platform constants
const platformIcons = PLATFORM_ICONS;
const platformColors = PLATFORM_COLORS;

const HOME_LAYOUT_PRESETS = Object.freeze({
  mission_control: {
    heroPadding: '40px 24px 32px',
    heroSubtitleSize: '1.35rem',
    sectionGap: '24px',
    cardGap: '16px',
    contentMaxWidth: 'none',
    heroDisplay: 'flex',
    widgetsDisplay: 'block',
    twoColumn: false,
  },
  focus_finder: {
    heroPadding: '20px 24px 16px',
    heroSubtitleSize: '1.05rem',
    sectionGap: '14px',
    cardGap: '10px',
    contentMaxWidth: '820px',
    heroDisplay: 'flex',
    widgetsDisplay: 'none',
    twoColumn: false,
  },
  dashboard_split: {
    heroPadding: '32px 24px 24px',
    heroSubtitleSize: '1.25rem',
    sectionGap: '20px',
    cardGap: '14px',
    contentMaxWidth: 'none',
    heroDisplay: 'flex',
    widgetsDisplay: 'block',
    twoColumn: true,
  },
  streamer_overlay: {
    heroPadding: '16px 24px 12px',
    heroSubtitleSize: '0.95rem',
    sectionGap: '12px',
    cardGap: '10px',
    contentMaxWidth: '900px',
    heroDisplay: 'flex',
    widgetsDisplay: 'none',
    twoColumn: false,
  },
  arcade_cabinet: {
    heroPadding: '48px 24px 36px',
    heroSubtitleSize: '1.5rem',
    sectionGap: '28px',
    cardGap: '20px',
    contentMaxWidth: 'none',
    heroDisplay: 'flex',
    widgetsDisplay: 'block',
    twoColumn: false,
  },
});

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
  endSession = () => {},
}) {
  const rewardPresentation = useRewardPresentation();
  const isDashboard = mode === 'dashboard';
  const [searchParams] = useSearchParams();
  const requestedView = searchParams.get('view');
  const homeView = HOME_VIEWS.includes(requestedView) ? requestedView : 'today';
  const [username, setUsername] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('Ready to find your perfect play?');
  const [profilePic, setProfilePic] = useState('');
  const [perfectPlayResult, setPerfectPlayResult] = useState(null);
  const [surpriseGameResult, setSurpriseGameResult] = useState(null);
  const [rediscoverGameResult, setRediscoverGameResult] = useState(null);
  const [homeFamiliarityBias, setHomeFamiliarityBias] = useState(() => getFamiliarityBias());
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
  const [streaks, setStreaks] = useState({ current: 0, longest: 0 });
  const [weeklyHabitStats, setWeeklyHabitStats] = useState({
    totalHours: 0,
    sessions: 0,
    daysPlayed: 0,
    uniqueGames: 0,
  });
  const [buyRecommendations, setBuyRecommendations] = useState(null);
  const [buyRecommendationsLoading, setBuyRecommendationsLoading] = useState(false);
  const [surpriseShelfIndex, setSurpriseShelfIndex] = useState(null);
  const [activeMilestones, setActiveMilestones] = useState([]);
  const [homeLayoutId, setHomeLayoutId] = useState(() => {
    try {
      const customization = ProgressionUnlockService.getRewardPresentationCustomization();
      return customization?.selectedHomeLayout || 'mission_control';
    } catch {
      return 'mission_control';
    }
  });
  const [surpriseCycling, setSurpriseCycling] = useState(false);
  const [welcomeBackData, setWelcomeBackData] = useState(null);
  const [welcomeBackVisible, setWelcomeBackVisible] = useState(false);

  useEffect(() => {
    const handlePresentationUpdate = () => {
      try {
        const customization = ProgressionUnlockService.getRewardPresentationCustomization();
        setHomeLayoutId(customization?.selectedHomeLayout || 'mission_control');
      } catch {
        // keep current layout
      }
    };
    window.addEventListener('gamepilot:reward-presentation-updated', handlePresentationUpdate);
    return () => window.removeEventListener('gamepilot:reward-presentation-updated', handlePresentationUpdate);
  }, []);

  const safeLibrary = useMemo(() => (Array.isArray(library) ? library : []), [library]);

  const recentGames = useMemo(() => {
    return safeLibrary
      .filter((game) => game.last_played && game.time_played > 0)
      .sort((a, b) => new Date(b.last_played) - new Date(a.last_played))
      .slice(0, 5);
  }, [safeLibrary]);

  const featuredGames = useMemo(() => {
    return safeLibrary
      .filter((game) => game.time_played > 120)
      .sort((a, b) => b.time_played - a.time_played)
      .slice(0, 5);
  }, [safeLibrary]);

  const topRatedGames = useMemo(() => {
    return safeLibrary
      .filter((game) => typeof game?.userRating === 'number' && game.userRating > 0)
      .sort((left, right) => {
        const ratingDiff = (right.userRating || 0) - (left.userRating || 0);
        if (ratingDiff !== 0) {
          return ratingDiff;
        }

        return (right.time_played || 0) - (left.time_played || 0);
      })
      .slice(0, 6);
  }, [safeLibrary]);

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
    const lastTs = StorageService.get('lastSessionTimestamp', null);
    const fresh = SessionService.isFreshSession(lastTs);
    SessionService.stampSession();

    if (
      fresh &&
      !SessionService.isWelcomeBackDismissed() &&
      !SessionService.isWelcomeBackOptedOut() &&
      safeLibrary.length >= 2
    ) {
      try {
        const data = WelcomeBackService.buildWelcomeBack(safeLibrary);
        if (data) {
          setWelcomeBackData(data);
          setWelcomeBackVisible(true);
        }
      } catch (e) {
        console.error('Home: failed to build welcome back card', e);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleQuestionnaireCompleted = () => {
      try {
        setPersonaSnapshot(UserBehaviorProfile.getPersonaSnapshot());
      } catch (e) {
        console.error('Home: failed to refresh persona snapshot after questionnaire', e);
      }
      const savedMessage =
        localStorage.getItem('gamepilot-welcomeMessage') ||
        localStorage.getItem('welcomeMessage') ||
        'Ready to find your perfect play?';
      setWelcomeMessage(savedMessage);
    };

    window.addEventListener('gamepilot:startup-questionnaire-completed', handleQuestionnaireCompleted);
    return () => window.removeEventListener('gamepilot:startup-questionnaire-completed', handleQuestionnaireCompleted);
  }, []);

  useEffect(() => {
    if (!isDashboard && !['discover', 'wishlist'].includes(homeView)) return undefined;
    let cancelled = false;
    setBuyRecommendationsLoading(true);
    const wishlist = WishlistService.getWishlist();
    const snapshot = BuyRecommendationService.getSnapshot(library, wishlist, { familiarityBias: homeFamiliarityBias });
    if (!cancelled) {
      setBuyRecommendations(snapshot);
      setBuyRecommendationsLoading(false);
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [library, homeFamiliarityBias, isDashboard, homeView]);

  useEffect(() => {
    const savedUsername =
      localStorage.getItem('gamepilot-profileUsername') || localStorage.getItem('profileUsername') || '';
    const savedMessage =
      localStorage.getItem('gamepilot-welcomeMessage') ||
      localStorage.getItem('welcomeMessage') ||
      'Ready to find your perfect play?';
    const savedProfilePic = localStorage.getItem('gamepilot-profilePic') || localStorage.getItem('profilePic') || '';
    setUsername(savedUsername);
    setWelcomeMessage(savedMessage);
    setProfilePic(savedProfilePic);
  }, []);

  const closeGettingStarted = useCallback(() => {
    const preferences = {
      ...readGettingStartedPreferences(),
      hasSeen: true,
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
      if (!detail?.gameName || detail.recommendationType) {
        return;
      }

      setSessionFeedbackPrompt({
        ...detail,
        promptKey: `${detail.gameId || detail.gameName}-${detail.endTime || Date.now()}`,
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
  };

  const handleGenreSelection = (nextGenre) => {
    setSelectedGenre(nextGenre);
  };

  const handleFamiliarityChange = (bias) => {
    setFamiliarityBias(bias);
    setHomeFamiliarityBias(bias);
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
        error:
          Array.isArray(library) && library.length > 0
            ? 'No games found matching your criteria. Try adjusting your filters!'
            : 'Scan your games first to generate recommendations.',
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
      result: perfectPlayResult || gamePilotPicksResult,
    });
  };

  const launchContinuePlaying = () => {
    handleTrackedLaunch(continuePlayingGame, {
      feature: 'continue_playing',
      result: continuePlayingResult,
    });
  };

  const launchRediscoverShelf = () => {
    handleTrackedLaunch(rediscoverShelfGame, {
      feature: 'rediscover',
      result: rediscoverGameResult,
    });
  };

  const launchFavoriteShelf = () => {
    onLaunchGame(favoriteShelfGame);
  };

  const handleSurpriseSearch = () => {
    clearResults();
    const result = RecommendationEngine.getSurpriseMeResult(library || [], recommendationMood, time || null);

    if (result?.primaryGame) {
      setSurpriseGameResult(result);
      trackRecommendationResult(result);
    } else {
      setSurpriseGameResult({
        error: 'No games available for surprise! Scan your games first.',
      });
    }
  };

  const handleRediscoverSearch = () => {
    clearResults();
    const result = RecommendationEngine.getRediscoverResult(library || [], recommendationMood, time || null, 3);

    if (result?.entries?.length > 0) {
      setRediscoverGameResult(result);
      trackRecommendationResult(result);
    } else {
      setRediscoverGameResult({
        error: 'Scan your games first to rediscover old favorites!',
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
        source,
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
      source,
    });
  };

  const handleTrackedLaunch = (game, options = {}) => {
    const { feature = null, result = null } = options;

    if (!game) {
      return;
    }

    if (feature) {
      try {
        AchievementTracker.logGameplayFeature(feature);
        AchievementTracker.checkAndUnlockAchievements();
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
      timeAvailable: result?.tracking?.timeAvailable ?? null,
    });

    setRecommendationFeedbackState((current) => ({
      ...current,
      [getRecommendationFeedbackKey(result, game)]: helpful,
    }));
  };

  const disableRecommendationFeedback = () => {
    UserBehaviorProfile.setFeedbackPromptEnabled('recommendation', false);
    setFeedbackPreferences((current) => ({
      ...current,
      recommendationPromptEnabled: false,
    }));
  };

  const enableRecommendationFeedback = () => {
    UserBehaviorProfile.setFeedbackPromptEnabled('recommendation', true);
    setFeedbackPreferences((current) => ({
      ...current,
      recommendationPromptEnabled: true,
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
      completed: sessionCompleted,
    });

    setSessionFeedbackPrompt(null);
    setSessionCompleted(false);
  };

  const disableSessionFeedback = () => {
    UserBehaviorProfile.setFeedbackPromptEnabled('session', false);
    setFeedbackPreferences((current) => ({
      ...current,
      sessionPromptEnabled: false,
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
          <button onClick={enableRecommendationFeedback} className="clear-button">
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
        <div style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '8px' }}>Was this a good recommendation?</div>
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
              fontWeight: yesSelected ? 700 : 500,
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
              fontWeight: noSelected ? 700 : 500,
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
          <p
            style={{
              color: submittedFeedback ? '#4CAF50' : '#F44336',
              fontSize: '0.78rem',
              marginTop: '8px',
              marginBottom: '0',
            }}
          >
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
    return MOODS;
  }, []);

  const availableGenres = React.useMemo(() => {
    const genres = new Set();
    if (library && Array.isArray(library)) {
      library.forEach((game) => {
        if (game.genres && Array.isArray(game.genres)) {
          game.genres.forEach((genre) => {
            if (genre !== 'Unknown') {
              genres.add(genre);
            }
          });
        }
      });
    }
    // If no games scanned yet, show common genre options (game types)
    return Array.from(genres).length > 0
      ? Array.from(genres).sort()
      : [
          'Action',
          'Adventure',
          'Indie',
          'Puzzle',
          'Racing',
          'RPG',
          'Shooter',
          'Simulation',
          'Strategy',
          'Platformer',
          'Horror',
          'Fighting',
          'Sports',
          'Roguelike',
          'Management',
          'Survival',
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
    marginLeft: '8px',
  };

  const recommendationMood =
    Array.isArray(library) && library.length > 0
      ? mood || RecommendationEngine.getMoodWithMostGames(library)
      : mood || null;
  const continuePlayingResult = React.useMemo(
    () => RecommendationEngine.getContinuePlayingResult(library, recommendationMood, time, lastPlayedGame),
    [lastPlayedGame, library, recommendationMood, time]
  );
  const continuePlayingEntry = continuePlayingResult?.primaryEntry || null;
  const continuePlayingGame = continuePlayingEntry?.game || continuePlayingResult?.primaryGame || null;
  const { artwork: continuePlayingArtwork, placeholder: continuePlayingPlaceholder } = resolveGameArtworkBundle(
    continuePlayingGame,
    { surface: 'portrait' }
  );
  const perfectPlayEntries = perfectPlayResult?.entries || [];
  // Auto-computed pick that powers "Your Library Today" when the user hasn't
  // run a manual Perfect Play search. It goes through scoreGameByBehavior,
  // which honours the Familiar/Fresh bias, so toggling the bias re-picks the
  // tonight shelf. Recomputes whenever the bias changes.
  const autoTonightResult = React.useMemo(() => {
    if ((!isDashboard && homeView !== 'discover') || !Array.isArray(library) || library.length === 0) return null;
    return RecommendationEngine.getPerfectPlayResult(
      library,
      recommendationMood,
      selectedGenre || null,
      time || null,
      4
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [library, recommendationMood, selectedGenre, time, homeFamiliarityBias, isDashboard, homeView]);
  const autoTonightEntries = autoTonightResult?.entries || [];
  const surpriseEntry = surpriseGameResult?.primaryEntry || null;
  const surpriseGame = surpriseEntry?.game || surpriseGameResult?.primaryGame || null;
  const { artwork: surpriseGameArtwork, placeholder: surpriseGamePlaceholder } = resolveGameArtworkBundle(
    surpriseGame,
    { surface: 'portrait' }
  );
  const rediscoverEntries = rediscoverGameResult?.entries || [];
  const backlogPlan = useMemo(() => {
    if ((!isDashboard && homeView !== 'discover') || !Array.isArray(library) || library.length === 0) return null;
    try {
      return BacklogCoachService.getBacklogPlan(library, 5);
    } catch {
      return null;
    }
  }, [library, isDashboard, homeView]);
  const backlogQueue = backlogPlan?.queue || [];
  const retentionSnapshot = useMemo(() => {
    if (!isDashboard && homeView !== 'discover') return { weeklyQuest: null, gamePilotPicks: null };
    try {
      return RetentionQuestService.getHomeRetentionSnapshot(library);
    } catch (e) {
      console.error('Home: failed to load retention snapshot', e);
      return { weeklyQuest: null, gamePilotPicks: null };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [library, retentionRefreshKey, isDashboard, homeView]);
  const weeklyQuest = retentionSnapshot?.weeklyQuest || {
    quests: [],
    primaryQuest: null,
    weeklyStats: null,
    completedCount: 0,
    totalCount: 0,
    label: 'This Week',
    periodKey: null,
  };
  const gamePilotPicksResult = retentionSnapshot?.gamePilotPicks || null;
  const gamePilotPickEntries = gamePilotPicksResult?.entries || [];
  const trackedRetentionPicksKeyRef = React.useRef('');
  const tonightPickEntry =
    perfectPlayEntries[0] ||
    (homeFamiliarityBias ? autoTonightEntries[0] : null) ||
    gamePilotPickEntries[0] ||
    autoTonightEntries[0] ||
    null;
  const tonightPickGame = tonightPickEntry?.game || null;
  const { artwork: tonightPickArtwork, placeholder: tonightPickPlaceholder } = resolveGameArtworkBundle(
    tonightPickGame,
    { surface: 'portrait' }
  );
  const rediscoverShelfEntry = rediscoverEntries[0] || null;
  const rediscoverShelfFallback = useMemo(() => {
    if (!Array.isArray(library) || library.length === 0) {
      return null;
    }

    const excludedKeys = new Set(
      [getHomeShelfGameKey(tonightPickGame), getHomeShelfGameKey(continuePlayingGame)].filter(Boolean)
    );

    const candidates = library.filter((game) => {
      const gameKey = getHomeShelfGameKey(game);
      return gameKey && !excludedKeys.has(gameKey);
    });

    if (candidates.length === 0) {
      return null;
    }

    const now = Date.now();
    const scored = candidates.map((game) => {
      const timePlayed = game.time_played || 0;
      const lastPlayed = game.last_played ? new Date(game.last_played).getTime() : 0;
      const daysSinceLastPlayed = lastPlayed > 0 ? Math.max(0, (now - lastPlayed) / (1000 * 60 * 60 * 24)) : 365;
      return { game, timePlayed, daysSinceLastPlayed };
    });

    const maxDays = Math.max(...scored.map((s) => s.daysSinceLastPlayed), 1);
    const maxPlaytime = Math.max(...scored.map((s) => s.timePlayed), 1);

    const ranked = scored
      .map(({ game, timePlayed, daysSinceLastPlayed }) => {
        const recencyScore = daysSinceLastPlayed / maxDays;
        const lowPlaytimeScore = 1 - Math.min(timePlayed / maxPlaytime, 1);
        const score = recencyScore * 0.5 + lowPlaytimeScore * 0.5;
        return { game, score };
      })
      .sort((a, b) => b.score - a.score);

    // Rotate the top pick daily so the same game doesn't sit on the shelf forever.
    const topPool = ranked.slice(0, Math.min(8, ranked.length));
    const daySeed = new Date().toISOString().slice(0, 10);
    const seedNumber = Array.from(daySeed).reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 0);
    const pickIndex = Math.abs(seedNumber) % topPool.length;

    return topPool[pickIndex]?.game || null;
  }, [continuePlayingGame, getHomeShelfGameKey, library, tonightPickGame]);
  const rediscoverShelfGame = rediscoverShelfEntry?.game || rediscoverShelfFallback || null;
  const { artwork: rediscoverShelfArtwork, placeholder: rediscoverShelfPlaceholder } = resolveGameArtworkBundle(
    rediscoverShelfGame,
    { surface: 'portrait' }
  );

  const favoriteShelfFallback = useMemo(() => {
    const excludedKeys = new Set(
      [
        getHomeShelfGameKey(tonightPickGame),
        getHomeShelfGameKey(continuePlayingGame),
        getHomeShelfGameKey(rediscoverShelfGame),
      ].filter(Boolean)
    );

    const fromFeatured = [...featuredGames, ...recentGames].find((game) => {
      const gameKey = getHomeShelfGameKey(game);
      return gameKey && !excludedKeys.has(gameKey);
    });

    if (fromFeatured) {
      return fromFeatured;
    }

    // Fall back to any library game not already used
    if (Array.isArray(library) && library.length > 0) {
      return (
        library.find((game) => {
          const gameKey = getHomeShelfGameKey(game);
          return gameKey && !excludedKeys.has(gameKey);
        }) || null
      );
    }

    return null;
  }, [
    continuePlayingGame,
    featuredGames,
    getHomeShelfGameKey,
    library,
    recentGames,
    rediscoverShelfGame,
    tonightPickGame,
  ]);
  const favoriteShelfGame = topRatedGames[0] || favoriteShelfFallback || null;
  const { artwork: favoriteShelfArtwork, placeholder: favoriteShelfPlaceholder } = resolveGameArtworkBundle(
    favoriteShelfGame,
    { surface: 'portrait' }
  );
  const homeShelfCards = [tonightPickGame, continuePlayingGame, rediscoverShelfGame, favoriteShelfGame].filter(
    Boolean
  ).length;
  const weeklyQuestSummary = 'Playstyle picks and shelves tuned to how you actually play.';
  const weeklyPlayDays = weeklyHabitStats.daysPlayed || weeklyQuest?.weeklyStats?.activeDays || 0;
  const weeklyPlaytimeHours = weeklyHabitStats.totalHours || weeklyQuest?.weeklyStats?.playtimeHours || 0;
  const recentLibraryActivity = recentGames.length;
  const similarToRecentResult = React.useMemo(() => {
    if (!Array.isArray(library) || library.length === 0 || recentGames.length === 0) return null;
    try {
      return RecommendationEngine.getSimilarToRecent(library, recentGames, 3);
    } catch (e) {
      console.warn('getSimilarToRecent failed:', e);
      return null;
    }
  }, [library, recentGames]);
  const similarToRecentEntries = similarToRecentResult?.entries || [];
  const similarToRecentReference = similarToRecentResult?.meta?.referenceGame || null;
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
      : null,
  ]
    .filter(Boolean)
    .slice(0, 3);

  useEffect(() => {
    if (!isDashboard) return;
    const recommendedIds = gamePilotPicksResult?.tracking?.recommendedGameIds || [];
    const nextTrackingKey =
      recommendedIds.length > 0 ? `${weeklyQuest?.periodKey || 'weekly'}:${recommendedIds.join('|')}` : '';

    if (!nextTrackingKey || trackedRetentionPicksKeyRef.current === nextTrackingKey) {
      return;
    }

    trackRecommendationResult(gamePilotPicksResult);
    trackedRetentionPicksKeyRef.current = nextTrackingKey;
  }, [gamePilotPicksResult, weeklyQuest?.periodKey, isDashboard]);

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

  const similarToRecentShelf =
    similarToRecentEntries.length > 0 && similarToRecentReference ? (
      <CollapsibleSection
        title={`Because you played ${similarToRecentReference}`}
        subtitle="Similar games from your backlog, matched by genre, theme, and tags."
        icon={<Sparkles size={18} />}
        className="home-similar-to-recent"
        defaultOpen
      >
        <div className="home-similar-grid">
          {similarToRecentEntries.map((entry, i) => {
            const game = entry?.game;
            if (!game) return null;
            const { artwork, placeholder } = resolveGameArtworkBundle(game, { surface: 'portrait' });
            const reasons = similarToRecentResult?.meta?.allReasons?.[i] || [];
            return (
              <div
                key={game.appid || game.name || i}
                className="home-shelf-card"
                onClick={() => {
                  onLaunchGame(game);
                  trackRecommendationLaunch(similarToRecentResult, game);
                }}
              >
                <div className="home-shelf-card-artwork">
                  {artwork ? (
                    <img src={artwork} alt={game.name} className="home-shelf-card-img" />
                  ) : (
                    <div className="home-shelf-card-placeholder">{placeholder || game.name}</div>
                  )}
                </div>
                <div className="home-shelf-card-body">
                  <div className="home-shelf-card-name">{game.name}</div>
                  {reasons.length > 0 && <div className="home-shelf-card-reason">{reasons[0]}</div>}
                  <div className="home-shelf-card-meta">
                    {game.time_played > 120
                      ? `${formatPlaytime(game.time_played)} played`
                      : game.time_played > 0
                        ? 'Barely touched'
                        : 'Unplayed in your backlog'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CollapsibleSection>
    ) : null;

  const handleHomeControllerInput = useCallback(
    (action) => {
      const itemsCount = recentGames.length + featuredGames.length;
      if (action === 'down' && selectedItemIndex < itemsCount - 1) {
        setSelectedItemIndex((prev) => prev + 1);
        return true;
      } else if (action === 'up' && selectedItemIndex > 0) {
        setSelectedItemIndex((prev) => prev - 1);
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
    },
    [selectedItemIndex, recentGames, featuredGames, onLaunchGame]
  );

  useEffect(() => {
    if (!isDashboard) return undefined;
    const handleGlobalControllerInput = (event) => {
      if (handleHomeControllerInput(event?.detail?.action)) {
        event.preventDefault();
      }
    };
    window.addEventListener('controllerInput', handleGlobalControllerInput);
    return () => window.removeEventListener('controllerInput', handleGlobalControllerInput);
  }, [handleHomeControllerInput, isDashboard]);

  const getGameCardClass = useCallback(
    (index) => {
      return `game-card fade-in ${selectedItemIndex === index ? 'selected' : ''}`;
    },
    [selectedItemIndex]
  );

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
      {
        name: 'PlayStation',
        icon: '🎮',
        games: libraryList.filter((game) => game.brandPlatform === 'PlayStation' || game.platform === 'PlayStation')
          .length,
      },
    ];

    const detectedLaunchers = launchers.filter((launcher) => launcher.games > 0);

    return {
      launchers,
      detectedLaunchers,
      detectedLauncherCount: detectedLaunchers.length,
      totalGames: libraryList.length,
    };
  }, [library]);

  const renderBuyRecommendations = () => {
    if (buyRecommendationsLoading) {
      return (
        <div className="discovery-skeleton-grid">
          {[1, 2, 3].map((n) => (
            <div key={n} className="discovery-skeleton-card" />
          ))}
        </div>
      );
    }

    if (!buyRecommendations?.enabled) {
      return (
        <div className="discovery-empty">
          <Sparkles size={28} />
          <p>Buy recommendations are off.</p>
          <span>Enable them in Settings to rank your wishlist by your local taste signals.</span>
        </div>
      );
    }

    const entries = buyRecommendations.entries || [];
    if (entries.length === 0) {
      return (
        <div className="discovery-empty">
          <Sparkles size={28} />
          <p>No buy recommendations yet.</p>
          <span>{buyRecommendations.message || 'Add games to your wishlist or import your Steam wishlist.'}</span>
        </div>
      );
    }

    return (
      <div className="discovery-grid">
        {entries.map((entry) => {
          const game = entry.game || {};
          const meta = entry.meta || {};
          const item = meta.wishlistItem || {};
          const price = item.currentPrice;
          const gameForArt = {
            ...game,
            appid: game.appid || game.app_id || game.steamAppId || item.steamAppID,
          };
          const artwork =
            resolveGameArtwork(gameForArt, { surface: 'wide' }) ||
            (item.thumb && /^https?:\/\//i.test(item.thumb) ? item.thumb : '');
          const artPlaceholder = getGameArtworkPlaceholder({ game: gameForArt, surface: 'wide' });
          return (
            <article key={entry.id || game.name} className="discovery-card">
              <div className="discovery-card-art">
                <LazyImage
                  src={artwork || artPlaceholder}
                  alt={game.name}
                  placeholder={artPlaceholder}
                  className="discovery-card-image"
                />
              </div>
              <div className="discovery-card-badge">
                <span>{meta.buyScore || 0}% match</span>
              </div>
              <h4>{game.name}</h4>
              <div className="discovery-card-meta">
                <span className="discovery-genres">{game.genres.slice(0, 2).join(' · ')}</span>
              </div>
              <div className="discovery-card-reasons">
                {(meta.buyReasons || []).slice(0, 2).map((reason, i) => (
                  <span key={i}>{reason}</span>
                ))}
              </div>
              <div className="discovery-card-price">
                {price ? (
                  <span className="discovery-price">{price.priceFormatted || `$${price.price}`}</span>
                ) : (
                  <span className="discovery-price">Price unavailable</span>
                )}
              </div>
              <div className="discovery-card-actions">
                <a
                  href={
                    game.appid
                      ? `https://store.steampowered.com/app/${game.appid}`
                      : `https://store.steampowered.com/search/?term=${encodeURIComponent(game.name)}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="discovery-link"
                >
                  View on Steam
                </a>
              </div>
            </article>
          );
        })}
      </div>
    );
  };

  // The single best buy recommendation, surfaced as a shelf inside Library Today.
  // Default to a daily-rotated pick, but allow the user to manually cycle
  // through all ranked wishlist entries.
  const buyEntries = useMemo(() => {
    return buyRecommendations?.enabled ? buyRecommendations.entries || [] : [];
  }, [buyRecommendations]);

  const [buyShelfIndex, setBuyShelfIndex] = useState(() => {
    const count = buyEntries.length;
    if (count <= 0) return 0;
    const daySeed = new Date().toISOString().slice(0, 10);
    const seedNumber = Array.from(daySeed).reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 0);
    return Math.abs(seedNumber) % count;
  });

  useEffect(() => {
    const count = buyEntries.length;
    setBuyShelfIndex((prev) => (count > 0 ? Math.min(prev, count - 1) : 0));
  }, [buyEntries.length]);

  const buyShelfEntry = useMemo(() => {
    if (buyEntries.length === 0) return null;
    return buyEntries[Math.max(0, Math.min(buyShelfIndex, buyEntries.length - 1))] || null;
  }, [buyEntries, buyShelfIndex]);

  const handleNextBuy = useCallback(() => {
    setBuyShelfIndex((prev) => (buyEntries.length > 0 ? (prev + 1) % buyEntries.length : 0));
  }, [buyEntries.length]);

  const handlePrevBuy = useCallback(() => {
    setBuyShelfIndex((prev) => (buyEntries.length > 0 ? (prev - 1 + buyEntries.length) % buyEntries.length : 0));
  }, [buyEntries.length]);

  // Random wishlist pick for the "Surprise me" shelf, drawn from all wishlist entries.
  const surpriseShelfEntries = React.useMemo(() => {
    return buyRecommendations?.enabled ? buyRecommendations.allEntries || [] : [];
  }, [buyRecommendations]);
  const surpriseShelfEntry = React.useMemo(() => {
    if (surpriseShelfEntries.length === 0) return null;
    if (surpriseShelfEntries.length === 1) return surpriseShelfEntries[0];
    const index =
      surpriseShelfIndex !== null
        ? Math.max(0, Math.min(surpriseShelfIndex, surpriseShelfEntries.length - 1))
        : Math.floor(Math.random() * surpriseShelfEntries.length);
    return surpriseShelfEntries[index] || null;
  }, [surpriseShelfEntries, surpriseShelfIndex]);
  const surpriseShelfGame = surpriseShelfEntry?.game || null;
  const surpriseShelfArtwork = React.useMemo(() => {
    if (!surpriseShelfEntry) return null;
    const game = surpriseShelfGame;
    const item = surpriseShelfEntry?.meta?.wishlistItem || {};
    const steamAppId = item.steamAppID || game?.appid || game?.app_id || game?.steamAppId || null;
    if (steamAppId) {
      return `https://cdn.cloudflare.steamstatic.com/steam/apps/${steamAppId}/library_600x900.jpg`;
    }
    if (item.thumb && /^https?:\/\//i.test(item.thumb)) {
      return item.thumb;
    }
    return resolveGameArtwork(game, { surface: 'portrait' });
  }, [surpriseShelfEntry, surpriseShelfGame]);
  const surpriseShelfPlaceholder = surpriseShelfGame
    ? getGameArtworkPlaceholder({ game: surpriseShelfGame, surface: 'portrait' })
    : null;

  const openSurpriseShelfOnSteam = useCallback(() => {
    const item = surpriseShelfEntry?.meta?.wishlistItem || {};
    const steamAppId = item.steamAppID || surpriseShelfGame?.appid || null;
    const steamUrl = steamAppId
      ? `https://store.steampowered.com/app/${steamAppId}`
      : `https://store.steampowered.com/search/?term=${encodeURIComponent(surpriseShelfGame?.name || '')}`;
    window.open(steamUrl, '_blank', 'noopener,noreferrer');
  }, [surpriseShelfEntry, surpriseShelfGame]);

  const launchSurpriseShelf = useCallback(() => {
    if (surpriseShelfEntries.length === 0) return;
    if (surpriseShelfEntries.length === 1) {
      setSurpriseShelfIndex(0);
      return;
    }
    setSurpriseCycling(true);
    let steps = 0;
    const maxSteps = 10;
    const interval = setInterval(() => {
      setSurpriseShelfIndex(Math.floor(Math.random() * surpriseShelfEntries.length));
      steps += 1;
      if (steps >= maxSteps) {
        clearInterval(interval);
        setSurpriseCycling(false);
      }
    }, 80);
  }, [surpriseShelfEntries]);

  const handleDismissWelcomeBack = useCallback(() => {
    SessionService.dismissWelcomeBack();
    setWelcomeBackVisible(false);
  }, []);

  // Check for milestones when library or sessions change
  useEffect(() => {
    if (!Array.isArray(library) || library.length === 0) return;
    const reached = MilestoneService.checkMilestones(library);
    if (reached.length > 0) {
      setActiveMilestones(reached);
    }
  }, [library]);

  const handleOptOutWelcomeBack = useCallback(() => {
    SessionService.setWelcomeBackOptedOut(true);
  }, []);

  const engagementSection = (
    <CollapsibleSection
      title="This week"
      subtitle="Streaks, rivalries, recaps and nudges from your library."
      icon={<Sparkles size={18} />}
      className="home-widgets-section"
      defaultOpen
    >
      <div className="home-engagement-widgets">
        {weeklyHabitStats.sessions === 0 && streaks.current === 0 && streaks.longest === 0 && (
          <p className="home-engagement-empty">
            Nothing to report yet — play a few games and streaks, rivalries and recaps will appear here.
          </p>
        )}
        <RivalryBanner />
        <StreakBadge />
        <NostalgiaCard library={library} />
        <PatchNotesBadge library={library} />
        <WeeklyRecapNudge />
        <WeeklyDigestCard library={library} />
        <SmartNudgeCard library={library} onLaunchGame={onLaunchGame} />
      </div>
    </CollapsibleSection>
  );

  const homeLayoutPreset = HOME_LAYOUT_PRESETS[homeLayoutId] || HOME_LAYOUT_PRESETS.mission_control;
  const homeLayoutClass = `home-layout-${homeLayoutId}`;

  const homeRootStyle = {
    '--home-hero-padding': homeLayoutPreset.heroPadding,
    '--home-hero-subtitle-size': homeLayoutPreset.heroSubtitleSize,
    '--home-section-gap': homeLayoutPreset.sectionGap,
    '--home-card-gap': homeLayoutPreset.cardGap,
    '--home-content-max-width': homeLayoutPreset.contentMaxWidth,
  };

  return (
    <div
      className={`home-page ${isDashboard ? '' : 'home-daily-page'} ${theme} ${homeLayoutClass} ${rewardPresentation.className}`}
      style={{ ...homeRootStyle, ...rewardPresentation.style }}
    >
      <NavBar />

      <MilestoneToast milestones={activeMilestones} onDismiss={() => setActiveMilestones([])} />

      {!isDashboard && (
        <HomeViewNavigation
          view={homeView}
          username={username}
          libraryCount={launcherSummary.totalGames}
          onScan={onScan}
          loading={loading}
        />
      )}
      {!isDashboard && homeView === 'today' && (
        <HomeDailyOverview
          library={library}
          onLaunchGame={onLaunchGame}
          activeSessions={activeSessions}
          endSession={endSession}
        />
      )}

      {/* Hero Section */}
      {isDashboard && (
        <div className="home-hero">
          <div className="home-welcome-grid">
            <div className="home-welcome-copy">
              <p className="home-welcome-eyebrow">
                <span className="home-welcome-dot" aria-hidden="true" />
                {username ? `Welcome back, ${username}` : 'Your personal gaming space'}
              </p>
              <h1 className="home-welcome-title">
                Less browsing.
                <span>More playing.</span>
              </h1>
              <p className="home-subtitle">Your games, your next favourite, your story. All together in one place.</p>

              <p className="home-hero-summary">
                {launcherSummary.totalGames > 0
                  ? `${launcherSummary.totalGames} game${launcherSummary.totalGames === 1 ? '' : 's'} across ${launcherSummary.detectedLauncherCount} platform${launcherSummary.detectedLauncherCount === 1 ? '' : 's'}. Pick up where you left off, or find something new.`
                  : 'Bring your installed games together and discover what deserves your next session.'}
              </p>

              {/* Scan Button */}
              <div className="home-welcome-actions">
                <button
                  onClick={() => {
                    if (onScan) {
                      onScan();
                    }
                  }}
                  disabled={loading}
                  className={`scan-button ${loading ? 'loading' : ''}`}
                >
                  <ScanLine size={18} aria-hidden="true" />
                  {loading ? <span>Scanning...</span> : <span>Scan Local Games</span>}
                </button>
                <Link to="/library" className="home-library-link">
                  Browse library <ArrowRight size={17} aria-hidden="true" />
                </Link>
              </div>

              <p className="scan-description">
                <ShieldCheck size={15} aria-hidden="true" />
                Local-first. No account needed. Your library stays yours.
              </p>
            </div>
            <div className="home-welcome-companion">
              <HomeTodayTabs
                library={library}
                onLaunchGame={onLaunchGame}
                username={username}
                welcomeMessage={username ? welcomeMessage : ''}
                profilePic={profilePic}
                themeId={theme}
              />
            </div>
          </div>

          <dl className="home-library-pulse" aria-label="Your library at a glance">
            <div>
              <dt>
                <Library size={16} aria-hidden="true" /> In your library
              </dt>
              <dd>
                {launcherSummary.totalGames.toLocaleString()}{' '}
                <span>{launcherSummary.totalGames === 1 ? 'game' : 'games'}</span>
              </dd>
            </div>
            <div>
              <dt>
                <Clock3 size={16} aria-hidden="true" /> Played this week
              </dt>
              <dd>
                {weeklyPlaytimeHours}
                <span> hours</span>
              </dd>
            </div>
            <div>
              <dt>
                <Sparkles size={16} aria-hidden="true" /> Your rotation
              </dt>
              <dd>
                {recentLibraryActivity}
                <span> recent {recentLibraryActivity === 1 ? 'game' : 'games'}</span>
              </dd>
            </div>
          </dl>

          {/* Launcher Status */}
          <details className="launcher-status">
            <summary className="launcher-status-header">
              <span className="launcher-status-title">Launcher overview</span>
              <span className="launcher-status-pill">
                <span>Detected</span>
                <strong>{launcherSummary.detectedLauncherCount}</strong>
                <ChevronDown size={16} aria-hidden="true" />
              </span>
            </summary>
            <p className="launcher-status-copy">
              {launcherSummary.totalGames > 0
                ? 'Showing the platforms currently represented in your merged library.'
                : 'After your first scan, this strip shows where your library lives.'}
            </p>
            <div className="launcher-grid">
              {launcherSummary.launchers.map((launcher) => (
                <div
                  key={launcher.name}
                  className={`launcher-badge ${launcher.games > 0 ? 'detected' : ''}`}
                  title={`${launcher.name}: ${launcher.games} game${launcher.games === 1 ? '' : 's'} in your library`}
                >
                  <span>{launcher.icon}</span>
                  <span>{launcher.name}</span>
                  {launcher.games > 0 && <span className="game-count">{launcher.games}</span>}
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {(isDashboard || homeView === 'activity') && welcomeBackVisible && welcomeBackData && (
        <WelcomeBackCard
          data={welcomeBackData}
          onLaunchGame={onLaunchGame}
          onDismiss={handleDismissWelcomeBack}
          onOptOut={handleOptOutWelcomeBack}
        />
      )}

      {isDashboard && engagementSection}

      {isDashboard ? (
        <HomeLayoutContent layoutId={homeLayoutId}>
          <LibrarianHubCarousel library={library} onLaunchGame={onLaunchGame} />

          {similarToRecentShelf}

          <CollapsibleSection
            title="Library Today"
            subtitle="Guided shelves and playstyle picks."
            badge={`${library?.length || 0} games`}
            icon={<Library size={18} />}
            className="home-guided-section home-library-section"
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
              surpriseShelfGame={surpriseShelfGame}
              surpriseShelfEntry={surpriseShelfEntry}
              surpriseShelfArtwork={surpriseShelfArtwork}
              surpriseShelfPlaceholder={surpriseShelfPlaceholder}
              surpriseCycling={surpriseCycling}
              platformIcons={platformIcons}
              onLaunchTonightPick={launchTonightPick}
              onLaunchContinuePlaying={launchContinuePlaying}
              onLaunchRediscover={launchRediscoverShelf}
              onLaunchFavorite={launchFavoriteShelf}
              onLaunchSurpriseShelf={launchSurpriseShelf}
              onViewSurpriseShelfStore={openSurpriseShelfOnSteam}
              formatLastPlayed={formatLastPlayed}
              formatPlaytime={formatPlaytime}
              familiarityBias={homeFamiliarityBias}
              onFamiliarityChange={handleFamiliarityChange}
              buyEntry={buyShelfEntry}
              buyEntryIndex={buyShelfIndex}
              buyEntryCount={buyEntries.length}
              onBuyNext={handleNextBuy}
              onBuyPrev={handlePrevBuy}
              libraryStoryItems={libraryStoryItems}
              shouldShowLegacyContinueSection={shouldShowLegacyContinueSection}
              continuePlayingMessage={continuePlayingResult?.message}
              continuePlayingEndSessionButton={renderEndSessionButton(continuePlayingGame?.name)}
              weeklyQuest={weeklyQuest}
              gamePilotPickEntries={gamePilotPickEntries}
              gamePilotPicksResult={gamePilotPicksResult}
              getGameCardClass={getGameCardClass}
              onLaunchGame={onLaunchGame}
              trackRecommendationLaunch={trackRecommendationLaunch}
              renderEndSessionButton={renderEndSessionButton}
              handleWeeklyQuestPinToggle={handleWeeklyQuestPinToggle}
            />
          </CollapsibleSection>

          <FamiliarOrFreshNudge
            library={library}
            onLaunchGame={onLaunchGame}
            formatPlaytime={formatPlaytime}
            formatLastPlayed={formatLastPlayed}
          />

          {Array.isArray(library) && library.length > 0 && (
            <EnergyVibePicker library={library} onLaunchGame={onLaunchGame} />
          )}

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
            title="Buy Next"
            subtitle="Your wishlist ranked by what you actually play."
            icon={<Sparkles size={18} />}
            className="home-buy-next-section"
            defaultOpen={false}
          >
            {renderBuyRecommendations()}
          </CollapsibleSection>

          <CollapsibleSection
            title="Wishlist"
            subtitle="Games you're tracking for a good deal."
            icon={<Library size={18} />}
            className="home-wishlist-section"
            defaultOpen={false}
          >
            <WishlistSection library={library} platformIcons={platformIcons} onLaunchGame={onLaunchGame} />
            <div className="home-wishlist-footer-link">
              <a href="#/wishlist" title="Open the full wishlist page with similar-game discovery">
                View full wishlist &rarr;
              </a>
            </div>
          </CollapsibleSection>
        </HomeLayoutContent>
      ) : (
        homeView !== 'today' && (
          <HomeLayoutContent layoutId={homeLayoutId} view={homeView}>
            <div className="home-discovery-highlights">
              <DiscoverHighlights library={library} onLaunchGame={onLaunchGame} activeSessions={activeSessions} />
            </div>
            <div className="home-persona-section">
              <LibrarianHubCarousel library={library} onLaunchGame={onLaunchGame} />
            </div>

            <div className="home-activity-section">
              <nav className="home-view-links" aria-label="Activity details">
                <Link to="/recent-activity">Session history</Link>
                <Link to="/stats">Stats</Link>
                <Link to="/habits">Habits</Link>
                <Link to="/year-in-review">Year in Review</Link>
              </nav>
              <RecentlyPlayedShelf library={library} onLaunchGame={onLaunchGame} />
              <RecentSessionsSummary />
              <WeeklyPlaySnapshot weeklyStats={weeklyHabitStats} streaks={streaks} />
              {engagementSection}
            </div>

            {similarToRecentShelf}

            <CollapsibleSection
              title="More ways to choose"
              subtitle="Energy, familiarity and fresh picks."
              className="home-discover-section"
            >
              {Array.isArray(library) && library.length > 0 && (
                <EnergyVibePicker library={library} onLaunchGame={onLaunchGame} />
              )}
              <FamiliarOrFreshNudge
                library={library}
                onLaunchGame={onLaunchGame}
                formatPlaytime={formatPlaytime}
                formatLastPlayed={formatLastPlayed}
              />
            </CollapsibleSection>

            <CollapsibleSection
              className="home-library-section"
              title="Library shelves"
              subtitle="Continue playing, favourites and rediscovery when you want more options."
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
                surpriseShelfGame={surpriseShelfGame}
                surpriseShelfEntry={surpriseShelfEntry}
                surpriseShelfArtwork={surpriseShelfArtwork}
                surpriseShelfPlaceholder={surpriseShelfPlaceholder}
                surpriseCycling={surpriseCycling}
                platformIcons={platformIcons}
                onLaunchTonightPick={launchTonightPick}
                onLaunchContinuePlaying={launchContinuePlaying}
                onLaunchRediscover={launchRediscoverShelf}
                onLaunchFavorite={launchFavoriteShelf}
                onLaunchSurpriseShelf={launchSurpriseShelf}
                onViewSurpriseShelfStore={openSurpriseShelfOnSteam}
                formatLastPlayed={formatLastPlayed}
                formatPlaytime={formatPlaytime}
                familiarityBias={homeFamiliarityBias}
                onFamiliarityChange={handleFamiliarityChange}
                buyEntry={buyShelfEntry}
                buyEntryIndex={buyShelfIndex}
                buyEntryCount={buyEntries.length}
                onBuyNext={handleNextBuy}
                onBuyPrev={handlePrevBuy}
              />
            </CollapsibleSection>

            <HomeSection
              className="home-persona-section"
              eyebrow="Who You Are"
              title="Your Gaming Persona"
              copy="Built from what you're playing right now — then roasted. This is what powers your recommendations."
              compact
            >
              <nav className="home-view-links" aria-label="Identity details">
                <Link to="/profile">Full profile</Link>
                <Link to="/achievements">Achievements</Link>
                <Link to="/rewards">Earned rewards</Link>
              </nav>
              <CurrentEraCard />
              <ProGate feature="era-archive" compact>
                <EraArchiveCard />
              </ProGate>
              <CurrentChampionCard library={safeLibrary} />
              <BecauseYouAreSection
                library={library}
                platformIcons={PLATFORM_ICONS}
                formatPlaytime={formatPlaytime}
                onLaunchGame={onLaunchGame}
                getGameCardClass={getGameCardClass}
              />
              <IdentitySnapshotCard persona={personaSnapshot} />
              <CollapsibleSection title="Doodle & Paradox" subtitle="Your daily extras.">
                <DailyDoodleTitle
                  username={username}
                  welcomeMessage={username ? welcomeMessage : ''}
                  profilePic={profilePic}
                  themeId={theme}
                />
                <DailyParadox />
              </CollapsibleSection>
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
              <RecommendationResultsSection
                hasResults={perfectPlayResult || surpriseGameResult || rediscoverGameResult}
              >
                <PerfectPlayResultSection
                  result={perfectPlayResult}
                  entries={perfectPlayEntries}
                  getGameCardClass={getGameCardClass}
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
                  platformIcons={platformIcons}
                  formatPlaytime={formatPlaytime}
                  handleTrackedLaunch={handleTrackedLaunch}
                  renderEndSessionButton={renderEndSessionButton}
                  renderRecommendationFeedback={renderRecommendationFeedback}
                  onClose={closeRediscoverResult}
                />
              </RecommendationResultsSection>
            </HomeSection>

            {backlogQueue.length > 0 && (
              <HomeSection
                className="home-backlog-section"
                eyebrow="Battle The Backlog"
                title="Your Backlog Plan"
                copy={backlogPlan?.message || 'Backlog games matched to how you actually play right now.'}
                compact
              >
                <div className="home-backlog-stats">
                  {backlogPlan?.summary && (
                    <div className="home-backlog-stat-bar">
                      <span className="home-backlog-stat-item">
                        <strong>{backlogPlan.summary.backlogCount}</strong> in backlog
                      </span>
                      <span className="home-backlog-stat-item">
                        <strong>~{backlogPlan.summary.hoursToClear}h</strong> to sample the pile
                      </span>
                      <span className="home-backlog-stat-item">
                        <strong>{backlogPlan.summary.clearedThisMonth}</strong> cleared this month
                      </span>
                    </div>
                  )}
                </div>
                <div className="home-backlog-games">
                  {backlogQueue.map((entry, i) => {
                    const game = entry?.game;
                    if (!game) return null;
                    const { artwork, placeholder } = resolveGameArtworkBundle(game, { surface: 'portrait' });
                    const reasons = entry?.reasons || [];
                    const isTonightPick = i === 0;
                    return (
                      <div
                        key={`${game.appid || game.name}-${i}`}
                        className={`home-backlog-game-card ${getGameCardClass(game)}${isTonightPick ? ' tonight-pick' : ''}`}
                        onClick={() => handleTrackedLaunch(game)}
                      >
                        {isTonightPick && <span className="home-backlog-tonight-badge">Tonight's backlog pick</span>}
                        <div className="home-backlog-game-artwork">
                          <LazyImage src={artwork} alt={game.name} placeholder={placeholder} />
                        </div>
                        <div className="home-backlog-game-info">
                          <span className="home-backlog-game-title">{game.name}</span>
                          {reasons.length > 0 && <span className="home-backlog-game-reason">{reasons[0]}</span>}
                          {entry?.estimatedMinutes && (
                            <span className="home-backlog-game-time">
                              ~{Math.round(entry.estimatedMinutes / 60)}h to finish
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </HomeSection>
            )}

            <CollapsibleSection
              title="Buy Next"
              subtitle="Purchase recommendations from your wishlist."
              className="home-buy-next-section"
              defaultOpen
            >
              {renderBuyRecommendations()}
            </CollapsibleSection>

            <HomeSection
              className="home-wishlist-section"
              eyebrow="Your Wishlist"
              title="Track What to Buy Next"
              copy="Add games you're considering. GamePilot ranks them by what you actually play and watches for price drops."
              compact
            >
              <WishlistSection library={library} platformIcons={platformIcons} onLaunchGame={onLaunchGame} />
              <div className="home-wishlist-footer-link">
                <a href="#/wishlist" title="Open the full wishlist page with similar-game discovery">
                  View full wishlist &rarr;
                </a>
              </div>
            </HomeSection>
          </HomeLayoutContent>
        )
      )}

      <GettingStartedModal
        isOpen={showGettingStarted}
        onClose={closeGettingStarted}
        onHidePermanently={hideGettingStartedPermanently}
        onScan={onScan}
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
            <label
              className="session-completed-toggle"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px',
                cursor: 'pointer',
                justifyContent: 'center',
              }}
            >
              <input
                type="checkbox"
                checked={sessionCompleted}
                onChange={(e) => setSessionCompleted(e.target.checked)}
              />
              <span>I completed this game 🏆</span>
            </label>
            <div
              style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '16px' }}
            >
              <button onClick={() => submitSessionFeedback(true)} className="action-button primary">
                👍 Good Session
              </button>
              <button onClick={() => submitSessionFeedback(false)} className="action-button secondary">
                👎 Not Really
              </button>
              <button
                onClick={() => {
                  setSessionFeedbackPrompt(null);
                  setSessionCompleted(false);
                }}
                className="clear-button"
              >
                Skip
              </button>
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

      {!isDashboard && (
        <footer className="home-view-links" aria-label="More GamePilot tools">
          <Link to="/dashboard">Full dashboard & challenges</Link>
          <Link to="/feedback">Feedback & support</Link>
        </footer>
      )}
      {isDashboard && (
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
            <p className="contact-note">Questions, feedback, or bug reports? We'd love to hear from you!</p>
          </div>
        </footer>
      )}
    </div>
  );
}

export default Home;
