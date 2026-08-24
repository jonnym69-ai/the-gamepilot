// Achievements.js - Achievement Display Component
import React, { useState, useEffect } from 'react';
import { Trophy, Star, Target, Clock, Gamepad2, Award, Zap, Crown, Medal } from 'lucide-react';
import { ACHIEVEMENTS, AchievementTracker } from './AchievementSystem';
import { RollingAchievementsTracker } from './services/RollingAchievementsTracker';
import NavBar from './NavBar';
import StorageService from './services/StorageService';
import SessionRepository from './services/SessionRepository';
import './Achievements.css';

const getSessionStartTimestamp = (sessionEntry) => {
  if (!sessionEntry) {
    return null;
  }

  const rawStartTime = typeof sessionEntry === 'string'
    ? sessionEntry
    : sessionEntry.startTime;

  if (!rawStartTime) {
    return null;
  }

  const parsedStartTime = typeof rawStartTime === 'number'
    ? rawStartTime
    : Date.parse(rawStartTime);

  return Number.isNaN(parsedStartTime) ? null : parsedStartTime;
};

function Achievements({ theme }) {
  const [unlockedAchievements, setUnlockedAchievements] = useState([]);
  const [allAchievements, setAllAchievements] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [recentlyUnlocked, setRecentlyUnlocked] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [recentUnlocks, setRecentUnlocks] = useState([]);
  const [unlockFilter, setUnlockFilter] = useState('all');
  const [sortBy, setSortBy] = useState('default');
  const [activeAssignments, setActiveAssignments] = useState({
    daily: [],
    weekly: [],
    monthly: [],
    yearly: []
  });

  const achievementCatalog = React.useMemo(() => (
    Object.entries(ACHIEVEMENTS).flatMap(([category, definitions]) =>
      (Array.isArray(definitions) ? definitions : []).map(definition => ({ ...definition, category }))
    )
  ), []);

  const getRarityColor = (rarity) => {
    const colors = {
      'COMMON': '#808080',
      'RARE': '#0066cc',
      'EPIC': '#9933cc',
      'LEGENDARY': '#ff6600'
    };
    return colors[rarity] || '#808080';
  };

  const periodLabels = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    yearly: 'Yearly'
  };

  const periodSubtitles = {
    daily: 'Today\'s rotating quests and achievement assignments.',
    weekly: 'Current weekly objectives tied to your tracked local play.',
    monthly: 'Month-long goals built from your actual local usage.',
    yearly: 'Longer-term assignments that feed your recap and momentum.'
  };

  const formatProgressValue = (snapshot = {}) => {
    const current = Number(snapshot.current || 0);
    const target = Number(snapshot.target || 0);
    const metric = snapshot.metric || 'progress';
    if (metric === 'playtime') {
      return `${(current / 60).toFixed(1)}h / ${(target / 60).toFixed(1)}h`;
    }
    return `${current} / ${target}`;
  };

  // Progress hints for locked achievements
  const getProgressHint = (achievementId, progress) => {
    const definition = AchievementTracker.getAchievementById(achievementId);
    const description = definition?.description || definition?.desc;
    const hint = description || 'Keep playing to make progress on this achievement.';

    return progress > 0 ? `${hint} Progress: ${Math.round(progress)}%.` : hint;
  };


  // Load recent unlocks when achievements change
  useEffect(() => {
    const recent = AchievementTracker.getRecentlyUnlocked() || [];
    setRecentUnlocks(recent.slice(0, 5));
  }, [unlockedAchievements]);

  // Load rolling achievements data
  useEffect(() => {
    const loadRollingStats = () => {
      const activeRollingDefs = ['daily', 'weekly', 'monthly', 'yearly'].reduce((acc, period) => {
        const activeDefs = AchievementTracker.getActivePeriodAchievementDefinitions(period);
        const fallbackDefs = ACHIEVEMENTS[period] || [];
        const sourceDefs = Array.isArray(activeDefs) && activeDefs.length > 0 ? activeDefs : fallbackDefs;
        acc[period] = sourceDefs.map(def => ({ ...def, category: period }));
        return acc;
      }, {});

      setActiveAssignments(
        Object.entries(activeRollingDefs).reduce((acc, [period, defs]) => {
          acc[period] = defs.map((definition) => {
            const progressSnapshot = RollingAchievementsTracker.getAchievementProgressSnapshot(definition.id);
            return {
              ...definition,
              progressSnapshot,
              progressPercent: Math.min(Number(progressSnapshot?.progressPercent || 0), 100),
              completed: Boolean(progressSnapshot?.unlocked || AchievementTracker.isTimeBasedAchievementUnlocked(period, definition.id))
            };
          });
          return acc;
        }, { daily: [], weekly: [], monthly: [], yearly: [] })
      );
    };

    loadRollingStats();
    const interval = setInterval(loadRollingStats, 30000); // Update every 30 seconds (optimized from 10s)
    
    // Listen for rolling achievements updates
    const handleRollingAchievementsUpdate = () => {
      setTimeout(loadRollingStats, 500); // Small delay to ensure data is saved
    };
    
    window.addEventListener('rollingAchievementsUpdated', handleRollingAchievementsUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('rollingAchievementsUpdated', handleRollingAchievementsUpdate);
    };
  }, []);

  const getRewardIcon = (achievementId, category) => {
    const categoryIcons = {
      library: <Gamepad2 size={16} />,
      time: <Clock size={16} />,
      mood: <Star size={16} />,
      features: <Zap size={16} />,
      genres: <Target size={16} />,
      uniqueGames: <Gamepad2 size={16} />,
      sessions: <Clock size={16} />,
      engagement: <Award size={16} />,
      quests: <Medal size={16} />,
      themes: <Crown size={16} />,
      backlog: <Trophy size={16} />,
      daily: <Clock size={16} />,
      weekly: <Clock size={16} />,
      monthly: <Clock size={16} />,
      yearly: <Clock size={16} />
    };
    return categoryIcons[category] || <Trophy size={16} />;
  };

  const getRewardPoints = (achievementId) => {
    const definition = achievementCatalog.find(a => a.id === achievementId);
    const rarity = definition?.rarity || 'COMMON';
    const rarityPoints = { COMMON: 50, RARE: 150, EPIC: 400, LEGENDARY: 1000 };
    return rarityPoints[rarity] || 50;
  };

  const loadAchievements = React.useCallback(() => {
    try {
      // Get unlocked achievements
      const unlocked = AchievementTracker.getUnlockedAchievements();
      setUnlockedAchievements(unlocked);

      const activeRollingDefs = ['daily', 'weekly', 'monthly', 'yearly'].reduce((acc, period) => {
        const activeDefs = AchievementTracker.getActivePeriodAchievementDefinitions(period);
        const fallbackDefs = ACHIEVEMENTS[period] || [];
        const sourceDefs = Array.isArray(activeDefs) && activeDefs.length > 0 ? activeDefs : fallbackDefs;
        acc[period] = sourceDefs.map(def => ({ ...def, category: period }));
        return acc;
      }, {});

      const staticAchievements = achievementCatalog.filter(({ category }) => !['daily', 'weekly', 'monthly', 'yearly'].includes(category));

      setAllAchievements([
        ...staticAchievements,
        ...activeRollingDefs.daily,
        ...activeRollingDefs.weekly,
        ...activeRollingDefs.monthly,
        ...activeRollingDefs.yearly
      ]);
    } catch (error) {
      console.error('Error setting achievements:', error);
      setAllAchievements([]);
    }
  }, [achievementCatalog]);

  useEffect(() => {
    // Load previously notified achievements
    try {
      // Notified achievements are tracked in localStorage only
      StorageService.get('notifiedAchievements', []);
    } catch (error) {
      console.error('Error loading notified achievements:', error);
      StorageService.set('notifiedAchievements', []);
    }
    
    let notificationTimeout = null;

    const checkRecentUnlocks = () => {
      const recent = AchievementTracker.getRecentlyUnlocked();
      if (recent && recent.length > 0) {
        // Get current notified achievements from localStorage to avoid stale state
        const savedNotified = StorageService.get('notifiedAchievements', []);
        const notifiedSet = new Set(savedNotified);
        
        // Find the first achievement that hasn't been notified about yet
        const newAchievement = recent.find(achievement => !notifiedSet.has(achievement.id));
        
        if (newAchievement) {
          setRecentlyUnlocked(newAchievement);
          
          // Mark this achievement as notified
          const updatedNotified = [...savedNotified, newAchievement.id];
          StorageService.set('notifiedAchievements', updatedNotified);
          
          // Auto-hide notification after 5 seconds
          if (notificationTimeout) {
            window.clearTimeout(notificationTimeout);
          }
          notificationTimeout = window.setTimeout(() => {
            setRecentlyUnlocked(null);
          }, 5000);
        }
      }
    };

    const refreshAchievements = () => {
      AchievementTracker.checkAndResetTimeBasedAchievements();
      AchievementTracker.checkAndUnlockAchievements();
      loadAchievements();
      checkRecentUnlocks();
    };

    const handleRefresh = () => {
      window.setTimeout(refreshAchievements, 250);
    };

    refreshAchievements();

    window.addEventListener('gameSessionStarted', handleRefresh);
    window.addEventListener('gameSessionEnded', handleRefresh);
    window.addEventListener('rollingAchievementsUpdated', handleRefresh);
    window.addEventListener('focus', handleRefresh);

    return () => {
      if (notificationTimeout) {
        window.clearTimeout(notificationTimeout);
      }
      window.removeEventListener('gameSessionStarted', handleRefresh);
      window.removeEventListener('gameSessionEnded', handleRefresh);
      window.removeEventListener('rollingAchievementsUpdated', handleRefresh);
      window.removeEventListener('focus', handleRefresh);
    };
  }, [loadAchievements]);

  const getAchievementProgress = (achievement) => {
    const id = achievement?.id || '';
    const stats = AchievementTracker.getGamingStats() || {};
    const unlocked = unlockedAchievements.includes(id);
    const toPercent = (current, target) => {
      const numericCurrent = Number(current) || 0;
      const numericTarget = Number(target) || 0;
      return numericTarget > 0
        ? Math.min(Math.max((numericCurrent / numericTarget) * 100, 0), 100)
        : 0;
    };

    if (unlocked) return 100;

    if (/^(daily|weekly|monthly|yearly)_/.test(id)) {
      try {
        return Math.min(Math.max(Number(RollingAchievementsTracker.getAchievementProgressSnapshot(id)?.progressPercent) || 0, 0), 100);
      } catch (error) {
        console.error('Error calculating rolling achievement progress:', error);
        return 0;
      }
    }

    if (id === 'first_game') {
      return (Number(AchievementTracker.getLaunchRewardStats()?.launches) || 0) > 0 ? 100 : 0;
    }

    let match = id.match(/^collector_(\d+)$/);
    if (match) return toPercent(stats.librarySize, match[1]);

    match = id.match(/^hour_(\d+)$/);
    if (match) {
      let totalPlayTime = Number(stats.totalPlayTime) || 0;
      try {
        const activeSessions = SessionRepository.getActiveSessions() || {};
        const currentTime = Date.now();
        Object.values(activeSessions).forEach((sessionData) => {
          const startedAt = getSessionStartTimestamp(sessionData);
          if (startedAt !== null) {
            totalPlayTime += Math.max(Math.floor((currentTime - startedAt) / 60000), 0);
          }
        });
      } catch (error) {
        console.error('Error calculating active session time:', error);
      }
      return toPercent(totalPlayTime, Number(match[1]) * 60);
    }

    match = id.match(/^session_(\d+)$/);
    if (match) return toPercent(stats.totalSessions, match[1]);

    match = id.match(/^unique_game_(\d+)$/);
    if (match) return toPercent(stats.uniqueGamesPlayed, match[1]);

    const moodStats = typeof AchievementTracker.getLifetimeMoodStats === 'function'
      ? AchievementTracker.getLifetimeMoodStats() || {}
      : {};
    match = id.match(/^(relaxed|social|creative|focused|competitive)_(\d+)$/);
    if (match) return toPercent(moodStats[match[1]], match[2]);

    if (id === 'mood_explorer') {
      const moods = ['relaxed', 'social', 'creative', 'focused', 'competitive'];
      return toPercent(moods.filter((mood) => (Number(moodStats[mood]) || 0) > 0).length, moods.length);
    }

    match = id.match(/^quest_total_(\d+)$/);
    if (match) {
      const questStats = AchievementTracker.getQuestCompletionStats() || {};
      return toPercent(questStats.totalCompleted, match[1]);
    }

    const genreStats = AchievementTracker.getGenreStats() || {};
    match = id.match(/^genre_sessions_(\d+)$/);
    if (match) {
      const longestGenreRun = Math.max(0, ...Object.values(genreStats).map(value => Number(value) || 0));
      return toPercent(longestGenreRun, match[1]);
    }

    match = id.match(/^session_warrior_(30|1h|2h|4h)$/);
    if (match) {
      const targets = { '30': 30, '1h': 60, '2h': 120, '4h': 240 };
      let longestSessionMinutes = Number(StorageService.get('longestSessionMinutes', 0)) || 0;
      if (typeof AchievementTracker.getLongestSessionMinutes === 'function') {
        try {
          longestSessionMinutes = Math.max(
            longestSessionMinutes,
            Number(AchievementTracker.getLongestSessionMinutes()) || 0
          );
        } catch (error) {
          console.error('Error reading longest session duration:', error);
        }
      }
      return toPercent(longestSessionMinutes, targets[match[1]]);
    }

    const library = StorageService.get('library', []);
    const safeLibrary = Array.isArray(library) ? library : [];
    match = id.match(/^rating_(\d+)$/);
    if (match) {
      return toPercent(safeLibrary.filter(game => (Number(game?.userRating) || 0) > 0).length, match[1]);
    }

    match = id.match(/^completion_(\d+)$/);
    if (match) {
      const completedStatuses = new Set(['beaten', 'completed', '100%']);
      return toPercent(
        safeLibrary.filter(game => completedStatuses.has(String(game?.completionStatus || '').toLowerCase())).length,
        match[1]
      );
    }

    if (id === 'variety_3' || id === 'variety_5') {
      return toPercent(Object.keys(genreStats).length, Number(id.split('_')[1]));
    }

    if (id === 'platform_diverse') {
      return toPercent(stats.platformDiversity, 3);
    }

    if (achievement?.category === 'features') {
      match = id.match(/^(.+)_(\d+)$/);
      if (match) {
        const featureStats = AchievementTracker.getFeatureStats() || {};
        return toPercent(featureStats[match[1]], match[2]);
      }
    }

    // Theme achievements — unique games per theme
    if (achievement?.category === 'themes') {
      match = id.match(/^theme_(.+)_(\d+)$/);
      if (match) {
        return toPercent(AchievementTracker.getThemeUniqueCount(match[1]), match[2]);
      }
    }

    // Backlog achievements
    if (achievement?.category === 'backlog') {
      const backlogStats = AchievementTracker.getBacklogStats() || {};
      if (id.startsWith('dust_off_')) {
        return toPercent(backlogStats.dust_off || 0, Number(id.match(/_(\d+)$/)?.[1]) || 1);
      }
      if (id.startsWith('shelf_diver_')) {
        return toPercent(backlogStats.shelf_diver || 0, Number(id.match(/_(\d+)$/)?.[1]) || 1);
      }
      if (id.startsWith('finish_started_')) {
        return toPercent(backlogStats.finish_started || 0, Number(id.match(/_(\d+)$/)?.[1]) || 1);
      }
    }

    return 0;
  };


  const closeToUnlocking = allAchievements
    .filter((achievement) => !unlockedAchievements.includes(achievement.id))
    .map((achievement) => ({ achievement, progress: getAchievementProgress(achievement) }))
    .filter(({ progress }) => progress > 0 && progress < 100)
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 6);

  // Apply filter, sort, then paginate
  const rarityWeight = { COMMON: 0, RARE: 1, EPIC: 2, LEGENDARY: 3 };
  const filteredAchievements = (() => {
    let result = selectedCategory === 'all'
      ? allAchievements
      : allAchievements.filter(a => a.category === selectedCategory);

    if (unlockFilter === 'unlocked') {
      result = result.filter(a => unlockedAchievements.includes(a.id));
    } else if (unlockFilter === 'locked') {
      result = result.filter(a => !unlockedAchievements.includes(a.id));
    }

    if (sortBy === 'progress') {
      result = [...result].sort((a, b) => getAchievementProgress(b) - getAchievementProgress(a));
    } else if (sortBy === 'rarity') {
      result = [...result].sort((a, b) => (rarityWeight[b.rarity] || 0) - (rarityWeight[a.rarity] || 0));
    } else if (sortBy === 'name') {
      result = [...result].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return result;
  })();

  // Pagination logic
  const totalPages = Math.ceil(filteredAchievements.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAchievements = filteredAchievements.slice(startIndex, startIndex + itemsPerPage);

  const categories = [
    { id: 'all', name: 'All', icon: '🏆' },
    { id: 'library', name: 'Library', icon: '📚' },
    { id: 'time', name: 'Time', icon: '⏱️' },
    { id: 'mood', name: 'Mood', icon: '😌' },
    { id: 'features', name: 'Features', icon: '✨' },
    { id: 'genres', name: 'Genres', icon: '🎭' },
    { id: 'uniqueGames', name: 'Unique Games', icon: '🧭' },
    { id: 'sessions', name: 'Sessions', icon: '🎮' },
    { id: 'engagement', name: 'Engagement', icon: '⭐' },
    { id: 'quests', name: 'Quests', icon: '🧭' },
    { id: 'themes', name: 'Themes', icon: '🌌' },
    { id: 'backlog', name: 'Backlog', icon: '📦' },
    { id: 'daily', name: 'Daily', icon: '📅' },
    { id: 'weekly', name: 'Weekly', icon: '📆' },
    { id: 'monthly', name: 'Monthly', icon: '🗓️' },
    { id: 'yearly', name: 'Yearly', icon: '🎊' }
  ];

  const visibleAchievementIds = new Set(allAchievements.map(achievement => achievement.id));
  const unlockedCount = unlockedAchievements.filter(id => visibleAchievementIds.has(id)).length;
  const totalCount = allAchievements.length;

  return (
    <div className={`App ${theme}`}>
      <NavBar />
      <div className="achievements-container">
        <div className="achievements-header">
          <h1>🏆 Achievements</h1>
          <div className="achievement-summary">
            <div className="summary-item">
              <div className="summary-number">{unlockedCount}</div>
              <div className="summary-label">Unlocked</div>
            </div>
            <div className="summary-item">
              <div className="summary-number">{totalCount}</div>
              <div className="summary-label">Total</div>
            </div>
            <div className="summary-item">
              <div className="summary-number">{recentUnlocks.length}</div>
              <div className="summary-label">Recent</div>
            </div>
          </div>
        </div>

        {closeToUnlocking.length > 0 && (
          <div className="close-to-unlocking-section">
            <div className="close-to-unlocking-header">
              <h2>🎯 Close to Unlocking</h2>
              <p>The achievements your recent play has pushed closest to the finish line.</p>
            </div>
            <div className="close-to-unlocking-grid">
              {closeToUnlocking.map(({ achievement, progress }) => (
                <div key={achievement.id} className="close-to-unlocking-card">
                  <div className="close-to-unlocking-icon">{achievement.icon}</div>
                  <div className="close-to-unlocking-body">
                    <div className="close-to-unlocking-name">{achievement.name}</div>
                    <div className="close-to-unlocking-desc">{achievement.desc}</div>
                    <div className="progress-bar close-to-unlocking-bar">
                      <div className="progress-fill" style={{ width: `${progress}%` }} />
                      <span className="progress-text">{Math.round(progress)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="category-tabs">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => {
                setSelectedCategory(category.id);
                setCurrentPage(1);
              }}
              className={`category-tab ${selectedCategory === category.id ? 'active' : ''}`}
            >
              <span className="category-icon">{category.icon}</span>
              <span className="category-name">{category.name}</span>
            </button>
          ))}
        </div>

        <div className="achievement-controls">
          <div className="filter-group">
            <button
              onClick={() => setUnlockFilter('all')}
              className={`filter-btn ${unlockFilter === 'all' ? 'active' : ''}`}
            >All</button>
            <button
              onClick={() => setUnlockFilter('unlocked')}
              className={`filter-btn ${unlockFilter === 'unlocked' ? 'active' : ''}`}
            >Unlocked</button>
            <button
              onClick={() => setUnlockFilter('locked')}
              className={`filter-btn ${unlockFilter === 'locked' ? 'active' : ''}`}
            >Locked</button>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="default">Sort: Default</option>
            <option value="progress">Sort: Progress</option>
            <option value="rarity">Sort: Rarity</option>
            <option value="name">Sort: Name</option>
          </select>
        </div>

        <div className="achievements-grid">
          {paginatedAchievements.map(achievement => {
            const isUnlocked = unlockedAchievements.includes(achievement.id);
            const progress = getAchievementProgress(achievement);
            const rarityColor = getRarityColor(achievement.rarity);
            
            return (
              <div
                key={achievement.id}
                className={`achievement-card ${isUnlocked ? 'unlocked' : 'locked'} rarity-${(achievement.rarity || 'COMMON').toLowerCase()}`}
                style={{ borderLeftColor: rarityColor }}
              >
                <div className="achievement-icon">
                  <span className="icon-emoji">{achievement.icon}</span>
                  {isUnlocked && <div className="unlock-badge">✓</div>}
                </div>
                
                <div className="achievement-info">
                  <div className="achievement-title-row">
                    <h3 className="achievement-name">{achievement.name}</h3>
                    <span className="rarity-badge" style={{ color: rarityColor, borderColor: rarityColor }}>
                      {achievement.rarity || 'COMMON'}
                    </span>
                  </div>
                  <p className="achievement-desc">{achievement.desc}</p>
                  
                  {/* Progress hint for locked achievements */}
                  {!isUnlocked && (
                    <div className="progress-hint">
                      <div className="hint-icon">💡</div>
                      <div className="hint-text">{getProgressHint(achievement.id, progress)}</div>
                    </div>
                  )}
                  
                  {/* Reward display */}
                  <div className="achievement-rewards">
                    <div className="reward-badge">
                      {getRewardIcon(achievement.id, achievement.category)}
                      <span className="reward-points">+{getRewardPoints(achievement.id)} pts</span>
                    </div>
                  </div>
                  
                  {!isUnlocked && (progress > 0 || achievement.category === 'time') && (
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ width: `${progress}%` }}
                      ></div>
                      <span className="progress-text">{Math.round(progress)}%</span>
                    </div>
                  )}
                  
                  {isUnlocked && (
                    <div className="unlocked-date">
                      <Trophy size={12} />
                      <span>Unlocked - Reward Earned!</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="rolling-achievements-section">
          <h2 className="rolling-title">🎯 Active Assignments</h2>
          <p className="rolling-subtitle">Live daily, weekly, monthly, and yearly quest progress built from your local tracked activity.</p>
          <div className="rolling-grid">
            {Object.entries(activeAssignments).map(([period, assignments]) => (
              <div key={period} className="rolling-card">
                <div className="rolling-header">
                  <h3>{periodLabels[period]}</h3>
                  <span className="rolling-date">{periodSubtitles[period]}</span>
                </div>
                <div className="rolling-stats">
                  {assignments.length > 0 ? assignments.map((assignment) => (
                    <div key={assignment.id} className="stat-row" style={{ display: 'block', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                        <span className="stat-label" style={{ fontWeight: 600 }}>{assignment.icon} {assignment.name}</span>
                        <span className="stat-value">{assignment.completed ? 'Complete' : formatProgressValue(assignment.progressSnapshot)}</span>
                      </div>
                      <div style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: '4px' }}>{assignment.desc}</div>
                      <div className="progress-bar" style={{ marginTop: '8px' }}>
                        <div
                          className="progress-fill"
                          style={{ width: `${assignment.completed ? 100 : assignment.progressPercent}%` }}
                        ></div>
                        <span className="progress-text">{Math.round(assignment.completed ? 100 : assignment.progressPercent)}%</span>
                      </div>
                    </div>
                  )) : (
                    <div className="stat-row">
                      <span className="stat-label">No active assignments yet</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="pagination-controls">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="pagination-button"
            >
              Previous
            </button>
            
            <span className="pagination-info">
              Page {currentPage} of {totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="pagination-button"
            >
              Next
            </button>
          </div>
        )}

        {recentlyUnlocked && (
          <div className="achievement-notification">
            <div className="notification-content">
              <div className="notification-icon">🎉</div>
              <div className="notification-text">
                <strong>Achievement Unlocked!</strong>
                <p>{recentlyUnlocked.name}</p>
                <div className="notification-meta">
                  <span className="notification-rarity" style={{ color: getRarityColor(recentlyUnlocked.rarity) }}>
                    {recentlyUnlocked.rarity || 'Unlocked'}
                  </span>
                  <span className="notification-points">+{getRewardPoints(recentlyUnlocked.id)} pts</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Achievements;
