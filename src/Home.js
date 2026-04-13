import React, { useState, useEffect, useCallback, useMemo } from 'react';
import NavBar from './NavBar';
import SurpriseSlotMachine from './components/SurpriseSlotMachine';
import { AchievementTracker } from './AchievementSystem';
import { UserBehaviorProfile } from './services/UserBehaviorProfile';
import { RecommendationEngine } from './services/RecommendationEngine';
import { ProgressionUnlockService } from './services/ProgressionUnlockService';
import { RetentionQuestService } from './services/RetentionQuestService';
import { getGameArtworkPlaceholder, resolveGameArtwork } from './services/GameArtworkService';
import { KeyboardShortcuts } from './KeyboardShortcuts';
import { PLATFORM_ICONS, PLATFORM_COLORS } from './constants/PlatformConstants';
import './Home.css';
import './LibraryValue.css';
import DailyDoodleTitle from './components/DailyDoodleTitle';
import {
  HomeGuidedContent,
  HomeSection,
  HomeToolsContent,
} from './components/HomeDashboardSections';

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

  const shortcutHints = [
    { label: 'Search', key: KeyboardShortcuts.getShortcutForAction('focus_search') || 'Ctrl+K' },
    { label: 'Library', key: KeyboardShortcuts.getShortcutForAction('go_library') || 'Ctrl+L' },
    { label: 'Stats', key: KeyboardShortcuts.getShortcutForAction('go_stats') || 'Ctrl+S' },
    { label: 'Settings', key: KeyboardShortcuts.getShortcutForAction('go_settings') || 'Ctrl+T' },
    { label: 'Exports', key: KeyboardShortcuts.getShortcutForAction('go_exports') || 'Ctrl+E' },
    { label: 'Shortcut Help', key: KeyboardShortcuts.getShortcutForAction('show_shortcuts') || '?' }
  ];

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button
          onClick={onClose}
          className="modal-close"
        >
          ×
        </button>
        <h2 className={`modal-title ${theme}`}>Welcome to GamePilot! 🎮</h2>
        <p style={{ marginBottom: '30px' }}>Your comprehensive PC gaming library manager with advanced features.</p>
        <div className="getting-started-steps">
          <h1 className={`stats-title ${theme}`}>Getting Started</h1>
          <ol>
            <li><strong>🔍 Scan Your Games:</strong> Click "Scan Local Games" to discover your Steam, Epic, Game Pass, Rockstar, Battle.net, EA, Ubisoft, and GOG games</li>
            <li><strong>🎯 Find Perfect Play:</strong> Use mood, genre, and time filters to get personalized game recommendations</li>
            <li><strong>🎲 Quick Actions:</strong> Use "Surprise Me" for random games or "Rediscover" to find old favorites</li>
            <li><strong>📚 Manage Library:</strong> Browse, filter, sort, and manage your entire game collection</li>
            <li><strong>💰 Track Library Value:</strong> View your collection's worth in multiple currencies - open games in GameModal for accurate Steam pricing</li>
            <li><strong>📈 Track Progress:</strong> View detailed stats, achievements, and gaming sessions</li>
            <li><strong>📤 Export & Share:</strong> Export your library data in multiple formats</li>
          </ol>
        </div>
        <div className="advanced-features">
          <h3>Advanced Features:</h3>
          <ul>
            <li><strong>🎨 Theme System:</strong> Multiple themes including mood-based themes</li>
            <li><strong>⌨️ Keyboard Shortcuts:</strong> Quick access to common actions</li>
            <li><strong>🔄 Bulk Operations:</strong> Select and manage multiple games at once</li>
            <li><strong>📊 Advanced Filtering:</strong> Filter by playtime, completion status, platforms, and more</li>
            <li><strong>🏅 Achievement System:</strong> Unlock achievements and earn XP</li>
            <li><strong>💾 Offline Support:</strong> Works even when you're offline</li>
            <li><strong>🔔 Notifications:</strong> Get notified about achievements and game launches</li>
            <li><strong>📱 Responsive Design:</strong> Works on desktop and tablet devices</li>
          </ul>
        </div>
        <div className="support-section">
          <h3>Support GamePilot:</h3>
          <p>Love GamePilot? Support development on Patreon for optional XP multipliers and founder recognition.</p>
          <ul>
            <li><strong>💎 Patreon Supporter Achievement:</strong> Founder recognition in GamePilot</li>
            <li><strong>⚡ XP Multipliers:</strong> 2x, 3x, 4x, or 5x progression boosts depending on tier</li>
            <li><strong>🌟 Founder Status:</strong> Special recognition in community</li>
            <li><strong>🏆 Achievement System:</strong> Complete challenges and earn XP</li>
            <li><strong>💰 Currency System:</strong> Multi-currency price tracking</li>
            <li><strong>🎮 Library Value:</strong> Track your collection's worth</li>
          </ul>
          <p style={{ fontSize: '14px', marginTop: '15px' }}>
            <strong>How to Unlock:</strong> Visit Settings → Support GamePilot → Enter your Patreon activation code
          </p>
          <p style={{ fontSize: '12px', marginTop: '10px', color: '#636e72' }}>
            <strong>🏆 Achievement System:</strong> Unlock achievements by playing games, using different moods/genres, and completing daily/weekly challenges. Earn XP to level up your profile and unlock progression rewards across the app.
          </p>
        </div>
        <div className="tips-section">
          <h1 className={`library-title ${theme}`}>Quick Tips</h1>
          <ul>
            {shortcutHints.map((shortcutHint) => (
              <li key={shortcutHint.label}>Use <strong>{shortcutHint.key}</strong> for {shortcutHint.label.toLowerCase()}</li>
            ))}
            <li>Try different <strong>moods</strong> to get varied recommendations</li>
            <li>Enable <strong>bulk mode</strong> to manage multiple games efficiently</li>
            <li>Check your <strong>achievements</strong> regularly for new goals</li>
            <li>Export your library regularly as a <strong>backup</strong></li>
          </ul>
        </div>
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
  const [username, setUsername] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('Ready to find your perfect play?');
  const [profilePic, setProfilePic] = useState('');
  const [perfectPlayResult, setPerfectPlayResult] = useState(null);
  const [surpriseGameResult, setSurpriseGameResult] = useState(null);
  const [rediscoverGameResult, setRediscoverGameResult] = useState(null);
  const [showSlotMachine, setShowSlotMachine] = useState(false);
  const [slotMachineGames, setSlotMachineGames] = useState([]);
  const [showGettingStarted, setShowGettingStarted] = useState(() => {
    const preferences = readGettingStartedPreferences();
    return !preferences.hasSeen && !preferences.hidden;
  });
  const [retentionRefreshKey, setRetentionRefreshKey] = useState(0);
  const [selectedItemIndex, setSelectedItemIndex] = useState(-1);
  const [feedbackPreferences, setFeedbackPreferences] = useState(() => UserBehaviorProfile.getFeedbackPreferences());
  const [recommendationFeedbackState, setRecommendationFeedbackState] = useState({});
  const [sessionFeedbackPrompt, setSessionFeedbackPrompt] = useState(null);

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

  const recommendations = useMemo(() => {
    return library
      .filter(game => game.time_played === 0 || !game.time_played)
      .sort(() => Math.random() - 0.5)
      .slice(0, 5);
  }, [library]);

  const getHomeShelfGameKey = useCallback((game) => {
    if (!game) {
      return null;
    }

    return game.appid || game.name || null;
  }, []);

  const allRecommendations = useMemo(() => {
    return library
      .filter(game => game.time_played === 0 || !game.time_played)
      .sort(() => Math.random() - 0.5);
  }, [library]);

  useEffect(() => {
    // Check and unlock achievements when component mounts
    AchievementTracker.checkAndResetTimeBasedAchievements();
    AchievementTracker.checkTimeBasedAchievements();
    setRetentionRefreshKey((current) => current + 1);
  }, [library]);

  useEffect(() => {
    const savedUsername = localStorage.getItem('profileUsername') || '';
    const savedMessage = localStorage.getItem('welcomeMessage') || 'Ready to find your perfect play?';
    const savedProfilePic = localStorage.getItem('profilePic') || '';
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
      AchievementTracker.logGameplayMood(nextMood);
      syncAchievementsSafely();
    }
  };

  const handleGenreSelection = (nextGenre) => {
    setSelectedGenre(nextGenre);
    if (nextGenre) {
      AchievementTracker.logGameplayGenre(nextGenre);
      syncAchievementsSafely();
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
      result: tonightPickEntry === continuePlayingEntry ? continuePlayingResult : (perfectPlayResult || gamePilotPicksResult)
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

    if (result?.games?.length > 0) {
      setSlotMachineGames(result.games.slice(0, 10));
      setShowSlotMachine(true);
    } else if (result?.primaryGame) {
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

  const syncAchievementsSafely = () => {
    try {
      AchievementTracker.checkAndUnlockAchievements();
      setRetentionRefreshKey((current) => current + 1);
    } catch (error) {
      console.error('Home: Failed to sync achievements', error);
    }
  };

  const handleTrackedLaunch = (game, options = {}) => {
    const { feature = null, result = null } = options;

    if (!game) {
      return;
    }

    if (feature) {
      try {
        AchievementTracker.logGameplayFeature(feature);
        syncAchievementsSafely();
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
      return;
    }

    UserBehaviorProfile.trackSessionFeedback(sessionFeedbackPrompt.gameName, enjoyed, {
      gameId: sessionFeedbackPrompt.gameId,
      mood: sessionFeedbackPrompt.mood,
      genre: sessionFeedbackPrompt.genre,
      playtimeMinutes: sessionFeedbackPrompt.playtimeMinutes,
      endTime: sessionFeedbackPrompt.endTime
    });

    setSessionFeedbackPrompt(null);
  };

  const disableSessionFeedback = () => {
    UserBehaviorProfile.setFeedbackPromptEnabled('session', false);
    setFeedbackPreferences((current) => ({
      ...current,
      sessionPromptEnabled: false
    }));
    setSessionFeedbackPrompt(null);
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
    // Always show all 8 moods regardless of library content
    // This ensures users can select any mood even if no games currently have that mood
    return ['Relaxed', 'Social', 'Focused', 'Creative', 'Escapist', 'Tactical', 'Sporty', 'Competitive'];
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

  const rewardPresentationCustomization = ProgressionUnlockService.getRewardPresentationCustomization();
  const homeLayoutRewards = ProgressionUnlockService.getHomeLayoutVariants();
  const recommendationPackRewards = ProgressionUnlockService.getRecommendationPacks();
  const selectedHomeLayout = homeLayoutRewards.find((layout) => layout.id === rewardPresentationCustomization.selectedHomeLayout) || homeLayoutRewards[0] || null;
  const selectedRecommendationPack = recommendationPackRewards.find((pack) => pack.id === rewardPresentationCustomization.selectedRecommendationPack) || recommendationPackRewards[0] || null;
  const homeRewardPresentationStyle = {
    '--reward-pack-accent': selectedRecommendationPack?.accentColor || '#ff6b35',
    '--reward-pack-secondary': selectedRecommendationPack?.secondaryColor || '#f093fb',
    '--reward-pack-preview': selectedRecommendationPack?.preview || 'linear-gradient(135deg, rgba(255, 107, 53, 0.28), rgba(240, 147, 251, 0.2))'
  };
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
  const retentionSnapshot = React.useMemo(() => (
    RetentionQuestService.getHomeRetentionSnapshot(library, retentionRefreshKey)
  ), [library, retentionRefreshKey]);
  const weeklyQuest = retentionSnapshot?.weeklyQuest || {
    quests: [],
    primaryQuest: null,
    weeklyStats: null,
    completedCount: 0,
    totalCount: 0,
    label: 'This Week',
    periodKey: null
  };
  const gamePilotPicksResult = retentionSnapshot?.gamePilotPicks || null;
  const gamePilotPickEntries = gamePilotPicksResult?.entries || [];
  const trackedRetentionPicksKeyRef = React.useRef('');
  const tonightPickEntry = perfectPlayEntries[0] || gamePilotPickEntries[0] || continuePlayingEntry || null;
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

    return library
      .filter((game) => {
        const gameKey = getHomeShelfGameKey(game);
        return gameKey && !excludedKeys.has(gameKey) && (game.time_played || 0) > 0;
      })
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

    return [...featuredGames, ...recentGames]
      .find((game) => {
        const gameKey = getHomeShelfGameKey(game);
        return gameKey && !excludedKeys.has(gameKey);
      }) || null;
  }, [continuePlayingGame, featuredGames, getHomeShelfGameKey, recentGames, rediscoverShelfGame, tonightPickGame]);
  const favoriteShelfGame = topRatedGames[0] || favoriteShelfFallback || null;
  const favoriteShelfArtwork = favoriteShelfGame ? resolveGameArtwork(favoriteShelfGame, { surface: 'recommendation_card' }) : null;
  const favoriteShelfPlaceholder = favoriteShelfGame ? getGameArtworkPlaceholder({ game: favoriteShelfGame, surface: 'recommendation_card' }) : null;
  const homeShelfCards = [tonightPickGame, continuePlayingGame, rediscoverShelfGame, favoriteShelfGame].filter(Boolean).length;
  const weeklyQuestSummary = weeklyQuest?.primaryQuest?.title || weeklyQuest?.label || 'A few thoughtful picks are ready for you.';
  const weeklyPlayDays = weeklyQuest?.weeklyStats?.activeDays || 0;
  const weeklyPlaytimeHours = weeklyQuest?.weeklyStats?.playtimeHours || 0;
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
      ? `${weeklyQuest.periodKey || 'weekly'}:${recommendedIds.join('|')}`
      : '';

    if (!nextTrackingKey || trackedRetentionPicksKeyRef.current === nextTrackingKey) {
      return;
    }

    trackRecommendationResult(gamePilotPicksResult);
    trackedRetentionPicksKeyRef.current = nextTrackingKey;
  }, [gamePilotPicksResult, weeklyQuest.periodKey]);

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
    const itemsCount = recentGames.length + featuredGames.length + (false ? allRecommendations.length : recommendations.length);
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
      } else {
        const recIndex = selectedItemIndex - recentGames.length - featuredGames.length;
        gameToLaunch = false ? allRecommendations[recIndex] : recommendations[recIndex];
      }
      if (gameToLaunch) {
        onLaunchGame(gameToLaunch);
        return true;
      }
    }
    return false;
  }, [selectedItemIndex, recentGames, featuredGames, recommendations, allRecommendations, onLaunchGame]);

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

  return (
    <div
      className={`home-page ${theme} home-layout-${selectedHomeLayout?.id || 'mission_control'} recommendation-pack-${selectedRecommendationPack?.id || 'classic_glow'}`}
      style={homeRewardPresentationStyle}
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

        <div className="home-reward-strip">
          <div className="home-reward-pill">
            <span>Home Layout</span>
            <strong>{selectedHomeLayout?.name || 'Mission Control'}</strong>
          </div>
          <div className="home-reward-pill is-pack">
            <span>Recommendation Pack</span>
            <strong>{selectedRecommendationPack?.name || 'Classic Glow'}</strong>
          </div>
        </div>
        
        {/* Scan Button */}
        <button 
          onClick={() => {
            if (onScan) {
              onScan();
            } else {
              console.error('❌ onScan is not defined!');
            }
          }} 
          disabled={loading} 
          className={`scan-button ${loading ? 'loading' : ''}`}
        >
          {loading ? (
            <span>🔄 Scanning...</span>
          ) : (
            <span>🎮 Scan Local Games</span>
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
                🎯 Launcher Overview
              </h4>
              <p className="launcher-status-copy">
                {launcherSummary.totalGames > 0
                  ? `Showing the platforms currently represented in your merged library, not just the latest scan pass.`
                  : 'After your first scan, this strip becomes a quick read on where your library currently lives.'}
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
                  title={`${launcher.name}: ${launcher.games} game${launcher.games === 1 ? '' : 's'} currently represented in your library`}
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

      <HomeSection
        className="home-tools-section"
        eyebrow="Shape The Shelf"
        title="Refine what GamePilot shows you"
        copy="When you want more control, use these tools to steer by mood, energy, genre, and session length."
        compact
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
      </HomeSection>

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
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
              <button onClick={() => submitSessionFeedback(true)} className="action-button primary">👍 Good Session</button>
              <button onClick={() => submitSessionFeedback(false)} className="action-button secondary">👎 Not Really</button>
              <button onClick={() => setSessionFeedbackPrompt(null)} className="clear-button">Skip</button>
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
            <a href="https://twitter.com/Moz_Makes_stuff" target="_blank" rel="noopener noreferrer" className="contact-link">
              🐦 Twitter: @Moz_Makes_stuff
            </a>
          </div>
          <p className="contact-note">
            Questions, feedback, or bug reports? We'd love to hear from you!
          </p>
        </div>
      </footer>

      {showSlotMachine && (
        <SurpriseSlotMachine
          games={slotMachineGames}
          onComplete={(selectedGame) => {
            setShowSlotMachine(false);
            const result = {
              primaryGame: selectedGame,
              games: slotMachineGames,
              message: 'A wildcard pick to shake up your rotation!'
            };
            setSurpriseGameResult(result);
            trackRecommendationResult(result);
          }}
        />
      )}
    </div>
  );
}

export default Home;
