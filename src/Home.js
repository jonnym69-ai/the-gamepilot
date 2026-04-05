import React, { useState, useEffect, useCallback, useMemo } from 'react';
import NavBar from './NavBar';
import LazyImage from './components/LazyImage';
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

function RecommendationReasoning({ entry }) {
  const explanation = entry?.explanation;

  if (!explanation) {
    return null;
  }

  const confidence = Number(explanation.confidence || 0);
  const matchScore = Number(explanation.matchScore || 0);
  const reasons = Array.isArray(explanation.reasons) && explanation.reasons.length > 0
    ? explanation.reasons
    : ['Recommended for you'];

  return (
    <>
      <div className="recommendation-badge-container">
        <div className="confidence-badge" title={`${confidence}% confident match`}>
          {confidence}%
        </div>
        <div className="match-score" title={`${matchScore}/100 match score`}>
          ⭐ {matchScore}
        </div>
      </div>
      <div className="recommendation-reasoning">
        <details className="reasoning-details">
          <summary>Why this game?</summary>
          <div className="reasoning-content">
            {reasons.map((reason, index) => (
              <div key={`${entry?.game?.appid || entry?.game?.name || 'recommendation'}-${index}`} className="reasoning-item">
                <span className="reason-bullet">✓</span>
                <span className="reason-text">{reason}</span>
              </div>
            ))}
          </div>
        </details>
      </div>
    </>
  );
}

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
          <h4 className="launcher-status-title">
            🎯 Detected Launchers & Brands:
          </h4>
          <div className="launcher-grid">
            {(() => {
              const libraryList = library || [];
              const launchers = [
                { name: 'Steam', icon: '🚂', games: libraryList.filter(g => g.platform === 'Steam').length },
                { name: 'Epic Games', icon: '🎮', games: libraryList.filter(g => g.platform === 'Epic').length },
                { name: 'Xbox', icon: '🎯', games: libraryList.filter(g => g.platform === 'Xbox').length },
                { name: 'Rockstar', icon: '🪨', games: libraryList.filter(g => g.platform === 'Rockstar').length },
                { name: 'Battle.net', icon: '⚔️', games: libraryList.filter(g => g.platform === 'Battle.net').length },
                { name: 'EA', icon: '🎪', games: libraryList.filter(g => g.platform === 'EA').length },
                { name: 'Ubisoft', icon: '🔷', games: libraryList.filter(g => g.platform === 'Ubisoft').length },
                { name: 'GOG', icon: '🌌', games: libraryList.filter(g => g.platform === 'GOG').length },
                { name: 'Riot Games', icon: '👊', games: libraryList.filter(g => g.platform === 'Riot').length },
                { name: 'Battlestate Games', icon: '🔫', games: libraryList.filter(g => g.platform === 'BSG').length },
                { name: 'PlayStation', icon: '🎮', games: libraryList.filter(g => g.brandPlatform === 'PlayStation' || g.platform === 'PlayStation').length }
              ];
              return launchers.map(launcher => (
                <div
                  key={launcher.name}
                  className={`launcher-badge ${launcher.games > 0 ? 'detected' : ''}`}
                  title={`${launcher.name}: ${launcher.games} games found`}
                >
                  <span>{launcher.icon}</span>
                  <span>{launcher.name}</span>
                  {launcher.games > 0 && (
                    <span className="game-count">
                      {launcher.games}
                    </span>
                  )}
                </div>
              ));
            })()}
          </div>
        </div>
      </div>

      {/* Continue Playing Section */}
      {continuePlayingGame && (
        <div className="results-section">
          <div className="result-card">
            <h3 className="result-title">
              ▶️ Continue Playing
            </h3>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
              <div className="game-card" style={{ maxWidth: '280px', padding: '15px' }}>
                <div className="game-card-image-wrapper">
                  {continuePlayingArtwork ? (
                    <LazyImage 
                      src={continuePlayingArtwork} 
                      alt={continuePlayingGame.name}
                      placeholder={continuePlayingPlaceholder}
                      className="game-image"
                    />
                  ) : (
                    <div className="game-placeholder">
                      <div className="platform-icon">
                        {platformIcons[continuePlayingGame.platform] || '❓'}
                      </div>
                    </div>
                  )}
                </div>
                <h4 className="game-name">
                  {continuePlayingGame.name}
                </h4>
                <p className="game-platform">
                  {continuePlayingGame.platform}
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text)', opacity: 0.6, margin: '4px 0' }}>
                  Last played: {formatLastPlayed(continuePlayingGame.last_played)}
                </p>
                <div className="game-info">
                  <span className="game-genre">
                    {continuePlayingGame.genres && continuePlayingGame.genres.length > 0 ? continuePlayingGame.genres.filter(g => g !== 'Unknown')[0] || 'Indie' : 'Indie'}
                  </span>
                  {formatPlaytime(continuePlayingGame.time_played) && (
                    <span className="game-playtime">
                      {formatPlaytime(continuePlayingGame.time_played)}
                    </span>
                  )}
                </div>
                <RecommendationReasoning entry={continuePlayingEntry} />
                <div className="game-actions">
                  <button 
                    onClick={() => {
                      handleTrackedLaunch(continuePlayingGame, {
                        feature: 'continue_playing',
                        result: continuePlayingResult
                      });
                    }}
                    className="launch-button"
                  >
                    🚀 Launch
                  </button>
                  {renderEndSessionButton(continuePlayingGame.name)}
                </div>
                <div style={{ textAlign: 'center', marginTop: '15px' }}>
                  <p style={{ color: 'var(--text)', opacity: 0.6, fontSize: '0.85rem', marginBottom: '10px' }}>
                    {continuePlayingResult?.message || 'Pick up where you left off!'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {(weeklyQuest.primaryQuest || gamePilotPickEntries.length > 0) && (
        <div className="retention-section">
          <div className="retention-grid">
            <div className="retention-panel weekly-quest-panel">
              <div className="retention-panel-header">
                <div>
                  <p className="retention-eyebrow">Weekly Focus</p>
                  <h3 className="retention-title">🧭 This Week&apos;s Quest</h3>
                </div>
                <div className="retention-summary-badge">
                  {weeklyQuest.completedCount} of {weeklyQuest.totalCount || 0} done
                </div>
              </div>

              <p className="retention-panel-copy">
                Keep your momentum going with one featured goal and a few bonus targets.
              </p>

              <div className="retention-meta-strip">
                <span>{weeklyQuest.label || 'This Week'}</span>
                <span>{weeklyQuest.weeklyStats?.activeDays || 0} play days</span>
                <span>{weeklyQuest.weeklyStats?.playtimeHours || 0}h logged</span>
              </div>

              {weeklyQuest.primaryQuest ? (
                <div className={`weekly-quest-feature ${weeklyQuest.primaryQuest.completed ? 'is-complete' : ''}`}>
                  <div className="weekly-quest-feature-header">
                    <span className="weekly-quest-rarity">{weeklyQuest.primaryQuest.rarity}</span>
                    <span className="weekly-quest-xp">+{weeklyQuest.primaryQuest.xpReward} XP</span>
                  </div>
                  <h4 className="weekly-quest-feature-title">
                    <span>{weeklyQuest.primaryQuest.icon}</span>
                    <span>{weeklyQuest.primaryQuest.name}</span>
                  </h4>
                  <p className="weekly-quest-feature-desc">{weeklyQuest.primaryQuest.desc}</p>
                  <p className="weekly-quest-feature-requirement">{weeklyQuest.primaryQuest.requirementLabel}</p>
                  <div className="weekly-quest-progress-meta">
                    <span>{weeklyQuest.primaryQuest.progressLabel}</span>
                    <span>
                      {weeklyQuest.primaryQuest.completed
                        ? (weeklyQuest.primaryQuest.permanentlyUnlocked ? 'Completed this week' : 'Unlocked now')
                        : weeklyQuest.primaryQuest.remainingLabel}
                    </span>
                  </div>
                  <div className="weekly-quest-progress-bar">
                    <span style={{ width: `${weeklyQuest.primaryQuest.progressPercent}%` }} />
                  </div>
                  <div className="weekly-quest-feature-actions">
                    <button
                      onClick={() => handleWeeklyQuestPinToggle(weeklyQuest.primaryQuest)}
                      className={`weekly-quest-pin-button ${weeklyQuest.primaryQuest.isPinned ? 'is-active' : ''}`}
                    >
                      {weeklyQuest.primaryQuest.isPinned ? 'Focused Goal' : 'Focus This'}
                    </button>
                    <span className={`weekly-quest-status ${weeklyQuest.primaryQuest.completed ? 'is-complete' : ''}`}>
                      {weeklyQuest.primaryQuest.completed ? 'Completed' : 'In Progress'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="retention-empty-state">
                  Your weekly lineup will show up as soon as fresh goals are ready.
                </div>
              )}

              {weeklyQuest.quests.length > 0 && (
                <div className="weekly-quest-list">
                  {weeklyQuest.quests.map((quest) => (
                    <div
                      key={quest.id}
                      className={`weekly-quest-card ${quest.isPinned ? 'is-pinned' : ''} ${quest.completed ? 'is-complete' : ''}`}
                    >
                      <div className="weekly-quest-card-top">
                        <div>
                          <p className="weekly-quest-card-metric">{quest.metricTitle}</p>
                          <h4 className="weekly-quest-card-title">
                            <span>{quest.icon}</span>
                            <span>{quest.name}</span>
                          </h4>
                        </div>
                        <button
                          onClick={() => handleWeeklyQuestPinToggle(quest)}
                          className={`weekly-quest-card-pin ${quest.isPinned ? 'is-active' : ''}`}
                        >
                          {quest.isPinned ? 'Focused' : 'Focus'}
                        </button>
                      </div>
                      <p className="weekly-quest-card-desc">{quest.desc}</p>
                      <p className="weekly-quest-card-requirement">{quest.requirementLabel}</p>
                      <div className="weekly-quest-progress-meta">
                        <span>{quest.progressLabel}</span>
                        <span>
                          {quest.completed
                            ? (quest.permanentlyUnlocked ? 'Completed this week' : 'Unlocked now')
                            : quest.remainingLabel}
                        </span>
                      </div>
                      <div className="weekly-quest-progress-bar">
                        <span style={{ width: `${quest.progressPercent}%` }} />
                      </div>
                      <div className="weekly-quest-card-footer">
                        <span className="weekly-quest-card-reward">+{quest.xpReward} XP</span>
                        <span className={`weekly-quest-status ${quest.completed ? 'is-complete' : ''}`}>
                          {quest.completed ? 'Complete' : 'In Progress'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {gamePilotPickEntries.length > 0 && (
              <div className="retention-panel retention-picks-panel">
                <div className="retention-panel-header">
                  <div>
                    <p className="retention-eyebrow">Picked for You</p>
                    <h3 className="retention-title">✨ GamePilot Picks</h3>
                  </div>
                  <div className="retention-summary-badge">
                    {gamePilotPicksResult?.usedFallback ? 'Fresh mix' : 'Dialed in'}
                  </div>
                </div>
                <p className="retention-panel-copy">
                  {gamePilotPicksResult?.message || 'A short list tuned to what you have been into lately.'}
                </p>
                <div className="retention-picks-grid">
                  {gamePilotPickEntries.map((entry, index) => {
                    const game = entry?.game;
                    if (!game) {
                      return null;
                    }

                    const gameArtwork = resolveGameArtwork(game, { surface: 'recommendation_card' });
                    const gamePlaceholder = getGameArtworkPlaceholder({ game, surface: 'recommendation_card' });

                    return (
                      <div key={game.appid || game.name || index} className={getGameCardClass(index)}>
                        <span className="retention-pick-label">Pick {index + 1}</span>
                        <RecommendationReasoning entry={entry} />
                        <div className="game-card-image-wrapper">
                          {gameArtwork ? (
                            <LazyImage
                              src={gameArtwork}
                              alt={game.name}
                              placeholder={gamePlaceholder}
                              className="game-image"
                            />
                          ) : (
                            <div className="game-placeholder">
                              <div className="platform-icon">
                                {platformIcons[game.platform] || '❓'}
                              </div>
                            </div>
                          )}
                        </div>
                        <h4 className="game-name">
                          {game.name}
                        </h4>
                        <p className="game-platform">
                          {game.platform}
                        </p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text)', opacity: 0.6, margin: '4px 0' }}>
                          Last played: {formatLastPlayed(game.last_played)}
                        </p>
                        <div className="game-info">
                          <span className="game-genre">
                            {game.genres && game.genres.length > 0 ? game.genres.filter(genre => genre !== 'Unknown')[0] || 'Indie' : 'Indie'}
                          </span>
                          {formatPlaytime(game.time_played) && (
                            <span className="game-playtime">
                              {formatPlaytime(game.time_played)}
                            </span>
                          )}
                        </div>
                        <div className="game-actions">
                          <button
                            onClick={() => {
                              trackRecommendationLaunch(gamePilotPicksResult, game);
                              onLaunchGame(game);
                            }}
                            className="launch-button"
                          >
                            🚀 Launch
                          </button>
                          {renderEndSessionButton(game.name)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="home-content">
        <div className="perfect-play-section">
          <h2 className="perfect-play-title">
            🎯 Find Your Perfect Play
          </h2>
          <p className="perfect-play-subtitle">
            Tell us what you're in the mood for and we'll find the perfect game
          </p>
          <div className="filter-grid">
            <div className="filter-card">
              <label className="filter-label">
                😌 Mood
              </label>
              <select 
                value={mood} 
                onChange={(event) => {
                  setMood(event.target.value);
                  if (event.target.value) {
                    AchievementTracker.logGameplayMood(event.target.value);
                    syncAchievementsSafely();
                  }
                }}
                className="filter-select"
              >
                <option value="">Any Mood</option>
                {availableMoods.map((moodOption) => (
                  <option key={moodOption} value={moodOption}>
                    {moodOption}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-card">
              <label className="filter-label">
                🎮 Genre
              </label>
              <select 
                value={selectedGenre} 
                onChange={(event) => {
                  setSelectedGenre(event.target.value);
                  if (event.target.value) {
                    AchievementTracker.logGameplayGenre(event.target.value);
                    syncAchievementsSafely();
                  }
                }}
                className="filter-select"
              >
                <option value="">Any Genre</option>
                {availableGenres.map((genreOption) => (
                  <option key={genreOption} value={genreOption}>
                    {genreOption}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-card">
              <label className="filter-label">
                ⏰ Time Available
              </label>
              <select 
                value={time} 
                onChange={(event) => {
                  setTime(event.target.value);
                }}
                className="filter-select"
              >
                <option value="">Any Time</option>
                <option value="quick">⚡ Quick (15-30 min)</option>
                <option value="medium">⏰ Medium (1-2 hours)</option>
                <option value="long">🌙 Long (2+ hours)</option>
                <option value="weekend">📅 Weekend Session</option>
              </select>
            </div>
          </div>

          <div className="action-buttons">
            <button 
              onClick={() => {
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
              }}
              className="action-button primary"
            >
              🎯 Find Perfect Play
            </button>
            <button 
              onClick={() => {
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
              }}
              className="action-button accent"
            >
              🎲 Surprise Me
            </button>
            <button 
              onClick={() => {
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
              }}
              className="action-button secondary"
            >
              🔄 Rediscover Games
            </button>
          </div>
        </div>

        {(perfectPlayResult || surpriseGameResult || rediscoverGameResult) && (
          <div className="results-section">
            {perfectPlayResult && (
              <div className={`result-card ${perfectPlayResult.error ? 'error' : ''}`}>
                <h3 className="result-title">
                  🎯 Perfect Play Result
                </h3>
                {perfectPlayResult.error ? (
                  <p className="result-error">
                    {perfectPlayResult.error}
                  </p>
                ) : (
                  <div>
                    <div className="game-grid">
                      {perfectPlayEntries.map((entry, index) => {
                        const game = entry?.game;
                        if (!game) {
                          return null;
                        }

                        const gameArtwork = resolveGameArtwork(game, { surface: 'recommendation_card' });
                        const gamePlaceholder = getGameArtworkPlaceholder({ game, surface: 'recommendation_card' });

                        return (
                          <div key={game.appid || `perfect-${index}`} className={getGameCardClass(index)}>
                            <RecommendationReasoning entry={entry} />
                            <div className="game-card-image-wrapper">
                              {gameArtwork ? (
                                <LazyImage 
                                  src={gameArtwork} 
                                  alt={game.name}
                                  placeholder={gamePlaceholder}
                                  className="game-image"
                                />
                              ) : (
                                <div className="game-placeholder">
                                  <div className="platform-icon">
                                    {platformIcons[game.platform] || '❓'}
                                  </div>
                                </div>
                              )}
                            </div>
                            <h4 className="game-name">
                              {game.name}
                            </h4>
                            <p className="game-platform">
                              {game.platform}
                            </p>
                            <div className="game-info">
                              <span className="game-genre">
                                {game.genres && game.genres.length > 0 ? game.genres.filter(g => g !== 'Unknown')[0] || 'Indie' : 'Indie'}
                              </span>
                              {formatPlaytime(game.time_played) && (
                              <span className="game-playtime">
                                {formatPlaytime(game.time_played)}
                              </span>
                            )}
                            </div>
                            <div className="game-actions">
                              <button 
                                onClick={() => {
                                  handleTrackedLaunch(game, {
                                    feature: 'perfect_play',
                                    result: perfectPlayResult
                                  });
                                }}
                                className="game-launch-button primary"
                              >
                                🎮 Launch
                              </button>
                              {renderEndSessionButton(game.name)}
                            </div>
                            {renderRecommendationFeedback(entry, perfectPlayResult)}
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ textAlign: 'center', marginTop: '20px' }}>
                      <p style={{ color: 'var(--text)', opacity: 0.6, fontSize: '0.9rem', marginBottom: '15px' }}>
                        {perfectPlayResult.message || 'Hand-picked based on your current filters and play style.'}
                      </p>
                      <button 
                        onClick={() => setPerfectPlayResult(null)}
                        className="clear-button"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {surpriseGameResult && (
              <div className={`result-card surprise ${surpriseGameResult.error ? 'error' : ''}`}>
                <h3 className="result-title">
                  🎲 Surprise Game
                </h3>
                {surpriseGameResult.error ? (
                  <p className="result-error">
                    {surpriseGameResult.error}
                  </p>
                ) : surpriseGame ? (
                  <div style={{ textAlign: 'center' }}>
                    <RecommendationReasoning entry={surpriseEntry} />
                    <div className="game-card-image-wrapper">
                      {surpriseGameArtwork ? (
                        <LazyImage 
                          src={surpriseGameArtwork} 
                          alt={surpriseGame.name}
                          placeholder={surpriseGamePlaceholder}
                          className="game-image"
                        />
                      ) : (
                        <div className="game-placeholder">
                          <div className="platform-icon">
                            {platformIcons[surpriseGame.platform] || '❓'}
                          </div>
                        </div>
                      )}
                    </div>
                    <h4 className="game-name">
                      {surpriseGame.name}
                    </h4>
                    <p className="game-platform">
                      {surpriseGame.platform}
                    </p>
                    <p className="game-description">
                      {surpriseGameResult.message || 'A wildcard pick to shake up your rotation.'}
                    </p>
                    <div className="game-actions">
                      <button 
                        onClick={() => {
                          handleTrackedLaunch(surpriseGame, {
                            feature: 'surprise',
                            result: surpriseGameResult
                          });
                        }}
                        className="game-launch-button accent"
                      >
                        🎮 Launch Game
                      </button>
                      {renderEndSessionButton(surpriseGame.name)}
                      <button 
                        onClick={() => setSurpriseGameResult(null)}
                        className="clear-button"
                      >
                        Clear
                      </button>
                    </div>
                    {renderRecommendationFeedback(surpriseEntry, surpriseGameResult)}
                  </div>
                ) : null}
              </div>
            )}
            {rediscoverGameResult && (
              <div className={`result-card rediscover ${rediscoverGameResult.error ? 'error' : ''}`}>
                <h3 className="result-title">
                  🔄 Rediscover Games
                </h3>
                {rediscoverGameResult.error ? (
                  <p className="result-error">
                    {rediscoverGameResult.error}
                  </p>
                ) : (
                  <div>
                    <div className="rediscover-header">
                      <p className="rediscover-message">
                        {rediscoverGameResult.message || 'A few overlooked favorites worth another run.'}
                      </p>
                      <button 
                        onClick={() => setRediscoverGameResult(null)}
                        className="close-button"
                      >
                        ✖️ Close
                      </button>
                    </div>
                    <div className="game-grid">
                      {rediscoverEntries.map((entry, index) => {
                        const game = entry?.game;
                        if (!game) {
                          return null;
                        }

                        return (
                          <div key={game.appid || game.name || index} className={getGameCardClass(index)}>
                            <RecommendationReasoning entry={entry} />
                            {game.iconUrl ? (
                              <LazyImage 
                                src={game.iconUrl} 
                                alt={game.name}
                                placeholder={`https://placehold.co/184x69/${platformColors[game.platform]?.replace('#', '') || '666666'}/fff?text=${encodeURIComponent(platformIcons[game.platform] || '❓')}`}
                                className="game-image"
                              />
                            ) : (
                              <div className="game-placeholder">
                                <div className="platform-icon">
                                  {platformIcons[game.platform] || '❓'}
                                </div>
                              </div>
                            )}
                            <h4 className="game-name" style={{ fontSize: '0.9rem' }}>
                              {game.name}
                            </h4>
                            <p className="game-platform">
                              {game.platform}
                            </p>
                            <div className="game-actions">
                              <button 
                                onClick={() => {
                                  handleTrackedLaunch(game, {
                                    feature: 'rediscover',
                                    result: rediscoverGameResult
                                  });
                                }}
                                className="game-launch-button secondary"
                              >
                                🎮 Launch
                              </button>
                              {renderEndSessionButton(game.name)}
                            </div>
                            {renderRecommendationFeedback(entry, rediscoverGameResult)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {topRatedGames.length > 0 && (
          <div className="results-section">
            <div className="result-card">
              <h3 className="result-title">
                ⭐ Your Top Rated Games
              </h3>
              <p style={{ color: 'var(--text)', opacity: 0.7, marginBottom: '18px' }}>
                Your own favourites, kept separate from Perfect Play so recommendations can stay focused on discovery.
              </p>
              <div className="game-grid">
                {topRatedGames.map((game, index) => {
                  const gameArtwork = resolveGameArtwork(game, { surface: 'recommendation_card' });
                  const gamePlaceholder = getGameArtworkPlaceholder({ game, surface: 'recommendation_card' });

                  return (
                    <div key={game.appid || game.name || `top-rated-${index}`} className={getGameCardClass(index)}>
                      <div className="recommendation-badge-container">
                        <div className="match-score" title={`Rated ${game.userRating}/10`}>
                          ⭐ {game.userRating}/10
                        </div>
                      </div>
                      <div className="game-card-image-wrapper">
                        {gameArtwork ? (
                          <LazyImage
                            src={gameArtwork}
                            alt={game.name}
                            placeholder={gamePlaceholder}
                            className="game-image"
                          />
                        ) : (
                          <div className="game-placeholder">
                            <div className="platform-icon">
                              {platformIcons[game.platform] || '❓'}
                            </div>
                          </div>
                        )}
                      </div>
                      <h4 className="game-name">{game.name}</h4>
                      <p className="game-platform">{game.platform}</p>
                      <div className="game-info">
                        <span className="game-genre">
                          {game.genres && game.genres.length > 0 ? game.genres.filter(g => g !== 'Unknown')[0] || 'Indie' : 'Indie'}
                        </span>
                        {formatPlaytime(game.time_played) && (
                          <span className="game-playtime">
                            {formatPlaytime(game.time_played)}
                          </span>
                        )}
                      </div>
                      <div className="game-actions">
                        <button
                          onClick={() => onLaunchGame(game)}
                          className="game-launch-button primary"
                        >
                          🎮 Launch
                        </button>
                        {renderEndSessionButton(game.name)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="getting-started-section">
          <button 
            onClick={() => setShowGettingStarted(true)}
            className="getting-started-button"
            title="Open the getting started guide and shortcut overview"
          >
            📖 Getting Started Guide
          </button>
        </div>
      </div>

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
    </div>
  );
}

export default Home;
