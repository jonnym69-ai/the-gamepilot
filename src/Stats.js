import React, { useCallback, useEffect, useMemo, useState } from 'react';
import NavBar from './NavBar';
import { AchievementTracker } from './AchievementSystem';
import { Trophy, Star, TrendingUp, Award, User, RefreshCcw, Calendar, BarChart3, PieChart as PieChartIcon, Medal, Zap } from 'lucide-react';
import { formatPrice } from './CurrencyConverter';
import { PieChart, BarChart } from './components/StatsCharts';
import EmptyState from './components/EmptyState';
import { UserBehaviorProfile } from './services/UserBehaviorProfile';
import { StatsAggregationService } from './services/StatsAggregationService';
import { MilestoneService } from './services/MilestoneService';
import StorageService from './services/StorageService';
import { DailyEngagementService } from './services/DailyEngagementService';
import { getEmptyLibraryFallback } from './services/EmptyLibraryFallbackData';
import { HabitTrackerService } from './services/HabitTrackerService';
import StatsBackbonePanel from './components/StatsBackbonePanel';
import PlaytimeHeatmap from './components/PlaytimeHeatmap';
import TimeOfDayHeatmap from './components/TimeOfDayHeatmap';
import CollapsibleSection from './components/CollapsibleSection';
import PowerStatsDeepDive from './components/PowerStatsDeepDive';
import { LibraryAnalyticsService } from './services/LibraryAnalyticsService';
import AdvancedAnalyticsDashboard from './components/AdvancedAnalyticsDashboard';
import EntitlementService from './services/EntitlementService';
import './Stats.css';

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return 'never';
  const diffMs = Date.now() - timestamp;
  const diffSeconds = Math.floor(diffMs / 1000);
  if (diffSeconds < 5) return 'just now';
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleString();
};

function Stats({ library = [], getPlayStyleInsights, theme = 'dark', currency = 'USD' }) {
  const [progressionData, setProgressionData] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [libraryStats, setLibraryStats] = useState(null);
  const [personaData, setPersonaData] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const hasPowerTools = EntitlementService.hasEntitlement('power_tools') || EntitlementService.hasEntitlement('gamepilot_pro');
  const analytics = useMemo(() => (hasPowerTools ? LibraryAnalyticsService.getFullAnalytics(library) : null), [library, hasPowerTools]);

  const calculateProgressionData = useCallback((dashboardSnapshot = null) => {
    const unlockedAchievements = [];
    const xpStats = AchievementTracker.getXPStats();
    const periods = dashboardSnapshot?.periods || {};
    const currentYear = new Date().getFullYear();

    const timeCounters = {
      daily: {
        count: Number(periods?.daily?.questUsage?.totalCompleted || 0),
        day: new Date().toLocaleDateString()
      },
      weekly: {
        count: Number(periods?.weekly?.questUsage?.totalCompleted || 0),
        week: periods?.weekly?.rangeLabel || 'This Week'
      },
      monthly: {
        count: Number(periods?.monthly?.questUsage?.totalCompleted || 0),
        month: periods?.monthly?.rangeLabel || 'This Month'
      },
      yearly: {
        count: Number(periods?.yearly?.questUsage?.totalCompleted || 0),
        year: currentYear
      }
    };

    const unlockCounters = {
      daily: Number(periods?.daily?.achievementUsage?.totalUnlocked || 0),
      weekly: Number(periods?.weekly?.achievementUsage?.totalUnlocked || 0),
      monthly: Number(periods?.monthly?.achievementUsage?.totalUnlocked || 0),
      yearly: Number(periods?.yearly?.achievementUsage?.totalUnlocked || 0),
      all: Number(periods?.all?.achievementUsage?.totalUnlocked || unlockedAchievements.length || 0)
    };

    return {
      unlocked: unlockedAchievements,
      timeCounters,
      unlockCounters,
      xpStats
    };
  }, []);

  const calculateDashboardData = useCallback(() => StatsAggregationService.getDashboardData(library), [library]);

  const calculateLibraryStats = useCallback(() => {
    let storedPrices = {};
    try {
      storedPrices = StorageService.get('gamePrices', {});
    } catch (e) {
      storedPrices = {};
    }

    const totalValue = library.reduce((total, game) => {
      let gamePrice = 0;
      
      if (game.priceNumeric) {
        gamePrice = game.priceNumeric;
      } else if (game.price) {
        const priceMatch = game.price.toString().match(/[\d.]+/);
        gamePrice = priceMatch ? parseFloat(priceMatch[0]) : 0;
      } else {
        const storedPrice = storedPrices[game.appid];
        if (storedPrice && storedPrice.priceNumeric) {
          gamePrice = storedPrice.priceNumeric;
        } else {
          gamePrice = 15;
        }
      }
      
      return total + gamePrice;
    }, 0);

    const pricedGames = Array.isArray(library) ? library.filter(game => {
      if (game.priceNumeric || game.price) return true;
      return storedPrices[game.appid]?.priceNumeric;
    }).length : 0;

    // Platform distribution
    const platformCounts = {};
    library.forEach(game => {
      const platform = game.platform || 'Unknown';
      platformCounts[platform] = (platformCounts[platform] || 0) + 1;
    });

    // Mood distribution
    const moodCounts = {};
    library.forEach(game => {
      const mood = game.mood || 'Unknown';
      moodCounts[mood] = (moodCounts[mood] || 0) + 1;
    });

    // Genre distribution (CORRECTED SYNTAX BLOCK)
    const genreCounts = {};
    library.forEach(game => {
      if (game.genres && Array.isArray(game.genres)) {
        game.genres.forEach(genre => {
          if (genre && genre !== 'Unknown') {
            genreCounts[genre] = (genreCounts[genre] || 0) + 1;
          }
        });
      }
    });

    const mostCommonPlatform = Object.keys(platformCounts).reduce((a, b) =>
      platformCounts[a] > platformCounts[b] ? a : b, 'Unknown');

    const mostCommonMood = Object.keys(moodCounts).reduce((a, b) =>
      moodCounts[a] > moodCounts[b] ? a : b, 'Unknown');

    const mostCommonGenre = Object.keys(genreCounts).reduce((a, b) =>
      genreCounts[a] > genreCounts[b] ? a : b, 'Unknown');

    return {
      totalGames: library.length,
      totalValue,
      pricedGames,
      formattedValue: formatPrice(totalValue, currency),
      platformCounts,
      moodCounts,
      genreCounts,
      mostCommonPlatform,
      mostCommonMood,
      mostCommonGenre,
      uniquePlatforms: Object.keys(platformCounts).length,
      uniqueMoods: Object.keys(moodCounts).length,
      uniqueGenres: Object.keys(genreCounts).length
    };
  }, [library, currency]);

  const calculatePersonaData = useCallback((dashboardSnapshot = null) => {
    const snapshot = UserBehaviorProfile.getPersonaSnapshot();
    const allPeriodStats = dashboardSnapshot?.periods?.all || {};
    const moodUsage = Object.entries(allPeriodStats.moodCounts || {})
      .map(([mood, data]) => ({
        label: mood,
        count: Number(data || 0)
      }))
      .filter((entry) => entry.label && entry.label !== 'Unknown' && entry.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const genreUsage = Object.entries(allPeriodStats.genreCounts || {})
      .map(([genre, data]) => ({
        label: genre,
        count: Number(data || 0)
      }))
      .filter((entry) => entry.label && entry.label !== 'Unknown' && entry.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const profile = UserBehaviorProfile.getProfile();
    const sessionBuckets = profile.playstylePatterns?.preferredSessionLengths || {};
    const preferredBucket = Object.entries(sessionBuckets)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || snapshot?.preferredSessionBucket;

    return {
      snapshot,
      moodUsage,
      genreUsage,
      preferredBucket
    };
  }, []);

  const refreshStats = useCallback(() => {
    const dashboardSnapshot = calculateDashboardData();
    const achievementSnapshot = calculateProgressionData(dashboardSnapshot);
    const personaSnapshot = calculatePersonaData(dashboardSnapshot);
    const librarySnapshot = calculateLibraryStats();

    setProgressionData(achievementSnapshot);
    setDashboardData(dashboardSnapshot);
    setPersonaData(personaSnapshot);
    setLibraryStats(librarySnapshot);
    setLastRefresh(Date.now());
  }, [
    calculateProgressionData,
    calculateDashboardData,
    calculatePersonaData,
    calculateLibraryStats
  ]);

  const scheduleRefresh = useCallback((delay = 0) => {
    if (typeof window === 'undefined') {
      refreshStats();
      return () => {};
    }

    let timeoutId = null;
    timeoutId = window.setTimeout(() => {
      refreshStats();
    }, delay);

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [refreshStats]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  // Refresh when the page regains focus
  useEffect(() => {
    const handleFocus = () => {
      scheduleRefresh();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [scheduleRefresh]);

  // Listen for game session events to trigger immediate refresh
  useEffect(() => {
    const cleanupCallbacks = [];

    const handleGameSession = () => {
      cleanupCallbacks.push(scheduleRefresh(1000));
    };

    const handleRollingAchievementsUpdate = () => {
      cleanupCallbacks.push(scheduleRefresh(500));
    };

    window.addEventListener('gameSessionEnded', handleGameSession);
    window.addEventListener('gameSessionStarted', handleGameSession);
    window.addEventListener('rollingAchievementsUpdated', handleRollingAchievementsUpdate);

    return () => {
      window.removeEventListener('gameSessionEnded', handleGameSession);
      window.removeEventListener('gameSessionStarted', handleGameSession);
      window.removeEventListener('rollingAchievementsUpdated', handleRollingAchievementsUpdate);
      cleanupCallbacks.forEach((cleanup) => cleanup());
    };
  }, [scheduleRefresh]);

  const engagement = DailyEngagementService.getStatus();
  const currentStreak = Number(engagement?.currentStreak || 0);
  const bestStreak = Number(engagement?.longestStreak || 0);
  const habitProgress = HabitTrackerService.getHabitXP();

  const isLoading = !progressionData || !dashboardData || !libraryStats || !personaData;

  const formatSessionBucket = (bucket) => {
    if (!bucket) return 'Flexible sessions';
    const labels = {
      '0-30': 'Sprint Sessions',
      '30-60': 'Focused Runs',
      '60-120': 'Extended Flights',
      '120+': 'Marathon Missions'
    };
    return labels[bucket] || bucket;
  };

  if (isLoading) {
    return (
      <div className={`App ${theme}`}>
        <NavBar />
        <div className="stats-page">
          <div className="stats-loading-card">
            <p>Loading your stats...</p>
          </div>
        </div>
      </div>
    );
  }

  const allTimeStats = dashboardData?.periods?.all || {};
  const totalFeatureUses = Number(allTimeStats?.featureUsage?.totalUses || 0);
  const favoriteFeature = allTimeStats?.featureUsage?.favoriteFeature || '—';
  const selectedStats = dashboardData?.periods?.[selectedPeriod] || allTimeStats;
  const habitInsights = selectedStats?.habitInsights || {};

  return (
    <div className={`App ${theme}`}>
      <NavBar />

      <div className="stats-page">
        <div className="stats-header">
          <h1 className="stats-title">📊 Gaming Analytics Dashboard</h1>
          <p className="stats-subtitle">
            Local-first insights from your tracked sessions, moods, genres, features, and play habits.
          </p>
          <div className="stats-header-actions">
            <button className="stats-refresh-button" onClick={refreshStats}>
              <RefreshCcw size={16} />
              <span>Refresh stats</span>
            </button>
            {lastRefresh && (
              <span className="stats-last-refresh">Updated {formatRelativeTime(lastRefresh)}</span>
            )}
          </div>
        </div>

        <CollapsibleSection
          title="Playtime Heatmap"
          subtitle="Visual calendar of your gaming activity."
          icon={<Calendar size={18} />}
          className="stats-section stats-hero-heatmap"
        >
          <PlaytimeHeatmap library={library} />
        </CollapsibleSection>

        <CollapsibleSection
          title="Time of Day Heatmap"
          subtitle="7×24 grid showing when you play most across the week."
          icon={<BarChart3 size={18} />}
          className="stats-section"
        >
          <TimeOfDayHeatmap library={library} />
        </CollapsibleSection>

        <CollapsibleSection
          title="Progression & Habits"
          subtitle="XP and level progress, earned through your gaming habits."
          badge={`Lv ${progressionData.xpStats.level}`}
          icon={<Trophy size={18} />}
          className="stats-section"
          defaultOpen
        >
          <div className="stats-grid">
            <div className="stat-card achievement-card">
              <div className="stat-icon">
                <Award size={24} />
              </div>
              <div className="stat-content">
                <h3>{habitProgress.activeDays}</h3>
                <p>Active Days</p>
              </div>
            </div>

            <div className="stat-card achievement-card">
              <div className="stat-icon">
                <TrendingUp size={24} />
              </div>
              <div className="stat-content">
                <h3>{habitProgress.totalSessions}</h3>
                <p>Sessions Tracked</p>
              </div>
            </div>

            <div className="stat-card achievement-card">
              <div className="stat-icon">
                <Trophy size={24} />
              </div>
              <div className="stat-content">
                <h3>{habitProgress.totalCompletions}</h3>
                <p>Games Completed</p>
              </div>
            </div>

            <div className="stat-card level-card">
              <div className="stat-icon">
                <Star size={24} />
              </div>
              <div className="stat-content">
                <h3>Level {progressionData.xpStats.level}</h3>
                <p>{progressionData.xpStats.xpProgress}/{progressionData.xpStats.xpToNextLevel} XP</p>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Stats Backbone"
          subtitle="Deep-dive analytics across periods."
          icon={<BarChart3 size={18} />}
          className="stats-section"
        >
          <StatsBackbonePanel
            dashboardData={dashboardData}
            selectedPeriod={selectedPeriod}
            onSelectPeriod={setSelectedPeriod}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title="Deeper Play Habits"
          subtitle={`Period-aware insights for ${selectedStats?.rangeLabel || 'this range'}.`}
          icon={<TrendingUp size={18} />}
          className="stats-section stats-habit-insights"
        >
          <div className="habit-insights-grid">
            <div className="habit-insight-card habit-insight-featured">
              <span>Longest session</span>
              <strong>{habitInsights.longestSession?.gameName || '—'}</strong>
              <p>
                {habitInsights.longestSession
                  ? `${habitInsights.longestSession.playtimeMinutes} min${habitInsights.longestSession.dateLabel ? ` · ${habitInsights.longestSession.dateLabel}` : ''}`
                  : 'Finish a tracked session to reveal your biggest single sitting.'}
              </p>
            </div>
            <div className="habit-insight-card">
              <span>Busiest day</span>
              <strong>{habitInsights.busiestDay?.dateLabel || '—'}</strong>
              <p>
                {habitInsights.busiestDay
                  ? `${habitInsights.busiestDay.playtimeMinutes} min · ${habitInsights.busiestDay.sessions} sessions`
                  : 'Your most active day will appear here.'}
              </p>
            </div>
            <div className="habit-insight-card">
              <span>Most returned to</span>
              <strong>{habitInsights.mostReturnedTo?.name || '—'}</strong>
              <p>
                {habitInsights.mostReturnedTo
                  ? `${habitInsights.mostReturnedTo.sessions} sessions · ${habitInsights.mostReturnedTo.totalPlaytime} min`
                  : 'The game you keep returning to will appear here.'}
              </p>
            </div>
            <div className="habit-insight-card">
              <span>Late-night runs</span>
              <strong>{habitInsights.lateNightSessions || 0}</strong>
              <p>{habitInsights.lateNightPlaytimeMinutes || 0} minutes played after-hours.</p>
            </div>
            <div className="habit-insight-card">
              <span>Weekend play</span>
              <strong>{habitInsights.weekendSessions || 0}</strong>
              <p>{habitInsights.weekendPlaytimeMinutes || 0} minutes logged on weekends.</p>
            </div>
            <div className="habit-insight-card">
              <span>Repeat games</span>
              <strong>{habitInsights.repeatGames || 0}</strong>
              <p>Games with more than one tracked session in this period.</p>
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Flight Persona Snapshot"
          subtitle="Your gaming identity and playstyle traits."
          icon={<User size={18} />}
          className="stats-section persona-insights"
        >
          {personaData.snapshot ? (
            <div className="persona-grid">
              <div className="persona-card">
                <div className="persona-header">
                  <div>
                    <p className="persona-label">Identity</p>
                    <h3>{personaData.snapshot.personaIdentity?.label || 'Calibrating Persona'}</h3>
                  </div>
                  {personaData.snapshot.personaIdentity?.anchors?.length > 0 && (
                    <span className="persona-anchors">
                      {personaData.snapshot.personaIdentity.anchors.join(' + ')}
                    </span>
                  )}
                </div>
                <p className="persona-description">
                  {personaData.snapshot.personaIdentity?.description || 'Play a few sessions to let GamePilot map your habits locally.'}
                </p>
                <div className="persona-meta-grid">
                  <div>
                    <span>Dominant Mood</span>
                    <strong>{personaData.snapshot.dominantMood || '—'}</strong>
                  </div>
                  <div>
                    <span>Preferred Sessions</span>
                    <strong>{formatSessionBucket(personaData.preferredBucket)}</strong>
                  </div>
                  <div>
                    <span>Avg Session Length</span>
                    <strong>{personaData.snapshot.avgSessionLength ? `${personaData.snapshot.avgSessionLength} min` : '—'}</strong>
                  </div>
                  <div>
                    <span>Peak Play Window</span>
                    <strong>{personaData.snapshot.peakPlayWindow || 'Anytime'}</strong>
                  </div>
                </div>
                <div className="persona-progress">
                  <span>Activity Streak</span>
                  <div className="persona-progress-bar">
                    <div
                      className="persona-progress-fill"
                      style={{ width: `${Math.min(bestStreak > 0 ? Math.round((currentStreak / bestStreak) * 100) : 0, 100)}%` }}
                    />
                  </div>
                  <small>{currentStreak} current active days • {bestStreak} best streak</small>
                </div>
              </div>

              <div className="persona-card heatmap-card">
                <div className="persona-header">
                  <div>
                    <p className="persona-label">Local Usage Snapshot</p>
                    <h3>Mood, Genre &amp; Feature Usage</h3>
                  </div>
                  ✨
                </div>
                <div className="heatmap-grid">
                  {personaData.moodUsage.length > 0 && (
                    <div className="heatmap-column">
                      <h4>Moods</h4>
                      {personaData.moodUsage.map((item) => (
                        <div key={item.label} className="heatmap-row">
                          <span>{item.label}</span>
                          <div className="heatmap-bar">
                            <div style={{ width: `${Math.min(item.count * 10, 100)}%` }} />
                          </div>
                          <span className="heatmap-value">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {personaData.genreUsage.length > 0 && (
                    <div className="heatmap-column">
                      <h4>Genres</h4>
                      {personaData.genreUsage.map((item) => (
                        <div key={item.label} className="heatmap-row">
                          <span>{item.label}</span>
                          <div className="heatmap-bar">
                            <div style={{ width: `${Math.min(item.count * 10, 100)}%` }} />
                          </div>
                          <span className="heatmap-value">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="heatmap-column">
                    <h4>Usage</h4>
                    <div className="heatmap-row">
                      <span>Games Played</span>
                      <span className="heatmap-value">{allTimeStats.uniqueGames || 0}</span>
                    </div>
                    <div className="heatmap-row">
                      <span>Sessions</span>
                      <span className="heatmap-value">{allTimeStats.sessions || 0}</span>
                    </div>
                    <div className="heatmap-row">
                      <span>Session days</span>
                      <span className="heatmap-value">{allTimeStats.activeDays || 0}</span>
                    </div>
                    <div className="heatmap-row">
                      <span>Feature Uses</span>
                      <span className="heatmap-value">{totalFeatureUses}</span>
                    </div>
                    <div className="heatmap-row">
                      <span>Top Feature</span>
                      <span className="heatmap-value">{favoriteFeature}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              icon="🧭"
              title="Your persona will appear after a few sessions"
              description="GamePilot builds this locally from your play habits, moods, genres, and session length patterns once there is enough signal to read from."
              compact
            />
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="Library Breakdown"
          subtitle="Your collection by platform, genre, and mood."
          badge={`${libraryStats.totalGames} games`}
          icon={<PieChartIcon size={18} />}
          className="stats-section"
        >
          {libraryStats.totalGames > 0 ? (
            <>
              <div className="charts-grid">
                {Object.keys(libraryStats.platformCounts).length > 0 && (
                  <PieChart 
                    data={libraryStats.platformCounts}
                    title="🎮 Platform Distribution"
                  />
                )}

                {Object.keys(libraryStats.genreCounts).length > 0 && (
                  <BarChart 
                    data={libraryStats.genreCounts}
                    title="🎨 Genre Distribution"
                  />
                )}

                {Object.keys(libraryStats.moodCounts).length > 0 && (
                  <PieChart 
                    data={libraryStats.moodCounts}
                    title="😌 Mood Distribution"
                  />
                )}
              </div>

              <div className="analytics-row">
                <div className="analytics-card">
                  <h3>🏆 Most Popular Platform</h3>
                  <div className="top-category">
                    <div className="category-name">{libraryStats.mostCommonPlatform}</div>
                    <div className="category-count">
                      {libraryStats.platformCounts[libraryStats.mostCommonPlatform] || 0} games
                    </div>
                  </div>
                </div>

                <div className="analytics-card">
                  <h3>😌 Most Common Mood</h3>
                  <div className="top-category">
                    <div className="category-name">{libraryStats.mostCommonMood}</div>
                    <div className="category-count">
                      {libraryStats.moodCounts[libraryStats.mostCommonMood] || 0} games
                    </div>
                  </div>
                </div>

                <div className="analytics-card">
                  <h3>🎮 Most Common Genre</h3>
                  <div className="top-category">
                    <div className="category-name">{libraryStats.mostCommonGenre}</div>
                    <div className="category-count">
                      {libraryStats.genreCounts[libraryStats.mostCommonGenre] || 0} games
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              icon="📚"
              title="Your library breakdown will appear here"
              description="Scan some games and GamePilot will map your collection by platform, genre, mood, and other library signals."
              compact
            />
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="Milestones & Prestige"
          subtitle="Track your major XP milestones and prestige progress."
          icon={<Medal size={18} />}
          className="stats-section"
        >
          <div className="milestones-container" style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '15px',
            marginTop: '20px'
          }}>
            {MilestoneService.getAllMilestones().map((milestone) => (
              <div 
                key={milestone.id}
                className={`milestone-card ${milestone.achieved ? 'achieved' : ''}`}
                style={{
                  padding: '15px',
                  borderRadius: '12px',
                  background: milestone.achieved 
                    ? 'linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(255,140,0,0.15) 100%)'
                    : 'var(--card-bg)',
                  border: `2px solid ${milestone.achieved ? '#ffd700' : 'var(--border-color)'}`,
                  opacity: milestone.achieved ? 1 : 0.7,
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>{milestone.icon}</div>
                <h3 style={{ margin: '0 0 5px 0', fontSize: '1rem' }}>{milestone.name}</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.8 }}>{milestone.description}</p>
                <div style={{ marginTop: '10px' }}>
                  <div style={{ 
                    height: '6px', 
                    background: 'rgba(255,255,255,0.1)', 
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${milestone.progressPercent}%`,
                      height: '100%',
                      background: milestone.achieved ? '#ffd700' : 'var(--accent-primary)',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                  <p style={{ margin: '5px 0 0 0', fontSize: '0.75rem', opacity: 0.6 }}>
                    {milestone.achieved 
                      ? `Achieved! (${milestone.xp.toLocaleString()} XP)` 
                      : `${milestone.xpRemaining.toLocaleString()} XP remaining`}
                  </p>
                </div>
                {milestone.achieved && (
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: '#ffd700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px'
                  }}>✓</div>
                )}
              </div>
            ))}
          </div>
          
          {/* Prestige Status */}
          {(() => {
            const prestige = MilestoneService.getPrestigeStatus();
            return prestige.prestigeLevel > 0 ? (
              <div className="prestige-banner" style={{
                marginTop: '25px',
                padding: '20px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)',
                border: '2px solid rgba(147, 51, 234, 0.5)',
                display: 'flex',
                alignItems: 'center',
                gap: '20px'
              }}>
                <div style={{ fontSize: '3rem' }}>✨</div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 5px 0' }}>Prestige Level {prestige.prestigeLevel}</h3>
                  <p style={{ margin: 0, opacity: 0.8 }}>
                    {prestige.xpMultiplier}% XP bonus active • {prestige.exclusiveRewards.length} exclusive rewards unlocked
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#a855f7' }}>
                    +{prestige.xpMultiplier}%
                  </div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>XP Boost</div>
                </div>
              </div>
            ) : null;
          })()}
        </CollapsibleSection>

        {/* Power Tools — Deep Stats */}
        {hasPowerTools && analytics && (
          <CollapsibleSection
            title="Power Stats Deep-Dive"
            subtitle="Advanced library analytics, diversity scores, and backlog intelligence."
            badge="Power Tools"
            icon={<Zap size={18} />}
            className="stats-section power-tools-deep-stats"
          >
            <PowerStatsDeepDive analytics={analytics} />
          </CollapsibleSection>
        )}

        {/* Advanced Analytics Dashboard */}
        {hasPowerTools && (
          <CollapsibleSection
            title="Advanced Analytics Dashboard"
            subtitle="Developer, publisher, price tier, value-per-hour, completion, and genre evolution breakdowns."
            badge="Pro"
            icon={<BarChart3 size={18} />}
            className="stats-section advanced-analytics-section"
            defaultOpen={false}
          >
            <AdvancedAnalyticsDashboard
              library={library}
              username={StorageService.getString('profileUsername', '') || 'Gamer'}
              isPro={hasPowerTools}
            />
          </CollapsibleSection>
        )}

        {library.length === 0 && habitProgress.totalSessions === 0 && (dashboardData?.totalSessionsRecorded || 0) === 0 && (
          <EmptyState
            icon="📈"
            title={getEmptyLibraryFallback('Stats').message}
            description="Start building your game library and logging a few sessions to unlock richer analytics, streaks, usage insights, and habit trends."
          />
        )}
      </div>
    </div>
  );
}

export default Stats;