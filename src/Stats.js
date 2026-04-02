import React, { useCallback, useEffect, useState } from 'react';
import NavBar from './NavBar';
import { AchievementTracker, AchievementStats } from './AchievementSystem';
import { Trophy, Star, TrendingUp, Calendar, Award, User, Sparkles, RefreshCcw } from 'lucide-react';
import { formatPrice } from './CurrencyConverter';
import { PieChart, BarChart } from './components/StatsCharts';
import { UserBehaviorProfile } from './services/UserBehaviorProfile';
import { PersonaPerformanceInsights } from './services/PersonaPerformanceInsights';
import { StatsAggregationService } from './services/StatsAggregationService';
import { getEmptyLibraryFallback } from './services/EmptyLibraryFallbackData';
import StatsBackbonePanel from './components/StatsBackbonePanel';
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
  const [achievementData, setAchievementData] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [libraryStats, setLibraryStats] = useState(null);
  const [personaData, setPersonaData] = useState(null);
  const [hardwareSynergy, setHardwareSynergy] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('all');

  const calculateAchievementData = useCallback(() => {
    const unlockedAchievements = AchievementTracker.getUnlockedAchievements();
    const timeCounters = AchievementTracker.getAllTimeCounters();
    const xpStats = AchievementTracker.getXPStats();
    const completionStats = AchievementStats.getCompletionRate(unlockedAchievements);

    return {
      unlocked: unlockedAchievements,
      totalAchievements: completionStats.total,
      completionPercentage: Math.round(completionStats.completion),
      timeCounters,
      xpStats
    };
  }, []);

  const calculateDashboardData = useCallback(() => StatsAggregationService.getDashboardData(library), [library]);

  const calculateLibraryStats = useCallback(() => {
    const totalValue = library.reduce((total, game) => {
      let gamePrice = 0;
      
      if (game.priceNumeric) {
        gamePrice = game.priceNumeric;
      } else if (game.price) {
        const priceMatch = game.price.toString().match(/[\d.]+/);
        gamePrice = priceMatch ? parseFloat(priceMatch[0]) : 0;
      } else {
        const storedPrices = JSON.parse(localStorage.getItem('gamePrices') || '{}');
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
      return (game.priceNumeric || game.price || 
        (JSON.parse(localStorage.getItem('gamePrices') || '{}')[game.appid]?.priceNumeric)
      );
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

  const calculatePersonaData = useCallback(() => {
    const snapshot = UserBehaviorProfile.getPersonaSnapshot();
    const profile = UserBehaviorProfile.getProfile();
    const moodCompletion = Object.entries(profile.moodPreferences || {})
      .map(([mood, data]) => ({
        label: mood,
        completion: data.count ? Math.round((data.completedCount / data.count) * 100) : 0,
        count: data.count
      }))
      .sort((a, b) => b.completion - a.completion)
      .slice(0, 6);

    const genreCompletion = Object.entries(profile.genrePreferences || {})
      .map(([genre, data]) => ({
        label: genre,
        completion: data.count ? Math.round((data.completedCount / data.count) * 100) : 0,
        count: data.count
      }))
      .sort((a, b) => b.completion - a.completion)
      .slice(0, 6);

    const sessionBuckets = profile.playstylePatterns?.preferredSessionLengths || {};
    const preferredBucket = Object.entries(sessionBuckets)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || snapshot?.preferredSessionBucket;

    return {
      snapshot,
      moodCompletion,
      genreCompletion,
      preferredBucket,
      overallCompletion: snapshot?.overallCompletionRate || 0
    };
  }, []);

  const calculateHardwareSynergy = useCallback((personaSnapshot) => {
    if (!personaSnapshot || !library.length) {
      return [];
    }

    return library
      .map((game) => {
        if (!game) return null;
        const compatibility = PersonaPerformanceInsights.getCompatibility(game);
        if (!compatibility || !compatibility.canRun || compatibility.settingsLevel === 'cannot_run') {
          return null;
        }

        const alignment = UserBehaviorProfile.getPersonaAlignmentScore({
          mood: personaSnapshot.dominantMood,
          genres: PersonaPerformanceInsights.extractGenres(game, personaSnapshot.dominantGenre),
          sessionMinutes: PersonaPerformanceInsights.estimateSessionMinutes(game)
        });

        if (!alignment) {
          return null;
        }

        const hardwareMatch = PersonaPerformanceInsights.getHardwareMatchContribution(compatibility) || 0;
        const compositeScore = alignment * 0.6 + hardwareMatch * 0.4;

        return {
          id: game.appid || game.app_id || game.steamAppId || game.name,
          name: game.name || 'Unknown Game',
          alignment,
          hardwareMatch,
          compatibility,
          compositeScore
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.compositeScore - a.compositeScore)
      .slice(0, 5);
  }, [library]);

  const refreshStats = useCallback(() => {
    const achievementSnapshot = calculateAchievementData();
    const dashboardSnapshot = calculateDashboardData();
    const personaSnapshot = calculatePersonaData();
    const librarySnapshot = calculateLibraryStats();
    const synergy = calculateHardwareSynergy(personaSnapshot.snapshot);

    setAchievementData(achievementSnapshot);
    setDashboardData(dashboardSnapshot);
    setPersonaData(personaSnapshot);
    setLibraryStats(librarySnapshot);
    setHardwareSynergy(synergy);
    setLastRefresh(Date.now());
  }, [
    calculateAchievementData,
    calculateDashboardData,
    calculatePersonaData,
    calculateLibraryStats,
    calculateHardwareSynergy
  ]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  useEffect(() => {
    const handleFocus = () => refreshStats();
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshStats]);

  const isLoading = !achievementData || !dashboardData || !libraryStats || !personaData;

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

  const getPerformanceLabel = (level) => {
    const labels = {
      ultra: 'Ultra',
      high: 'High',
      low: 'Low'
    };
    return labels[level] || level;
  };

  const getPerformanceColor = (level) => {
    const colors = {
      ultra: '#4caf50',
      high: '#2196f3',
      low: '#ff9800'
    };
    return colors[level] || '#666';
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

  return (
    <div className={`App ${theme}`}>
      <NavBar />

      <div className="stats-page">
        <div className="stats-header">
          <h1 className="stats-title">📊 Gaming Analytics Dashboard</h1>
          <p className="stats-subtitle">
            Achievement Progress: {achievementData.completionPercentage}%
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

        <div className="stats-section">
          <h2><Trophy size={24} /> Achievement Statistics</h2>
          <div className="stats-grid">
            <div className="stat-card achievement-card">
              <div className="stat-icon">
                <Award size={32} />
              </div>
              <div className="stat-content">
                <h3>{achievementData.unlocked.length}</h3>
                <p>Achievements Unlocked</p>
              </div>
            </div>

            <div className="stat-card achievement-card">
              <div className="stat-icon">
                <TrendingUp size={32} />
              </div>
              <div className="stat-content">
                <h3>{achievementData.completionPercentage}%</h3>
                <p>Completion Rate</p>
              </div>
            </div>

            <div className="stat-card level-card">
              <div className="stat-icon">
                <Star size={32} />
              </div>
              <div className="stat-content">
                <h3>Level {achievementData.xpStats.level}</h3>
                <p>{achievementData.xpStats.xpProgress}/{achievementData.xpStats.xpToNextLevel} XP</p>
              </div>
            </div>
          </div>
        </div>

        <div className="stats-section">
          <h2><Calendar size={24} /> Time-Based Achievement Counters</h2>
          <div className="counters-grid">
            <div className="counter-stat-card">
              <div className="counter-header">
                <span className="counter-icon">📅</span>
                <span className="counter-period">Today</span>
              </div>
              <div className="counter-number">{achievementData.timeCounters.daily.count}</div>
              <div className="counter-label">Achievements</div>
            </div>

            <div className="counter-stat-card">
              <div className="counter-header">
                <span className="counter-icon">📊</span>
                <span className="counter-period">This Week</span>
              </div>
              <div className="counter-number">{achievementData.timeCounters.weekly.count}</div>
              <div className="counter-label">Achievements</div>
            </div>

            <div className="counter-stat-card">
              <div className="counter-header">
                <span className="counter-icon">📈</span>
                <span className="counter-period">This Month</span>
              </div>
              <div className="counter-number">{achievementData.timeCounters.monthly.count}</div>
              <div className="counter-label">Achievements</div>
            </div>

            <div className="counter-stat-card">
              <div className="counter-header">
                <span className="counter-icon">🏆</span>
                <span className="counter-period">{achievementData.timeCounters.yearly.year}</span>
              </div>
              <div className="counter-number">{achievementData.timeCounters.yearly.count}</div>
              <div className="counter-label">Achievements</div>
            </div>
          </div>
        </div>

        <StatsBackbonePanel
          dashboardData={dashboardData}
          selectedPeriod={selectedPeriod}
          onSelectPeriod={setSelectedPeriod}
        />

        {personaData.snapshot && (
          <div className="stats-section persona-insights">
            <h2><User size={24} /> Flight Persona Snapshot</h2>
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
                  <span>Completion Confidence</span>
                  <div className="persona-progress-bar">
                    <div
                      className="persona-progress-fill"
                      style={{ width: `${personaData.overallCompletion}%` }}
                    />
                  </div>
                  <small>{personaData.overallCompletion}% of tracked sessions close out successfully</small>
                </div>
              </div>

              <div className="persona-card heatmap-card">
                <div className="persona-header">
                  <div>
                    <p className="persona-label">Momentum Heatmap</p>
                    <h3>Mood &amp; Genre Win Rates</h3>
                  </div>
                  <Sparkles size={20} />
                </div>
                <div className="heatmap-grid">
                  {personaData.moodCompletion.length > 0 && (
                    <div className="heatmap-column">
                      <h4>Moods</h4>
                      {personaData.moodCompletion.map((item) => (
                        <div key={item.label} className="heatmap-row">
                          <span>{item.label}</span>
                          <div className="heatmap-bar">
                            <div style={{ width: `${item.completion}%` }} />
                          </div>
                          <span className="heatmap-value">{item.completion}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {personaData.genreCompletion.length > 0 && (
                    <div className="heatmap-column">
                      <h4>Genres</h4>
                      {personaData.genreCompletion.map((item) => (
                        <div key={item.label} className="heatmap-row">
                          <span>{item.label}</span>
                          <div className="heatmap-bar">
                            <div style={{ width: `${item.completion}%` }} />
                          </div>
                          <span className="heatmap-value">{item.completion}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {personaData.snapshot && hardwareSynergy.length > 0 && (
          <div className="stats-section hardware-synergy">
            <h2><Sparkles size={24} /> Rig + Persona Ready Queue</h2>
            <p className="section-subtitle">Games that match your identity and run smoothly on this hardware.</p>
            <div className="synergy-list">
              {hardwareSynergy.map((item) => (
                <div key={item.id} className="synergy-card">
                  <div className="synergy-header">
                    <h3>{item.name}</h3>
                    <span
                      className="synergy-badge"
                      style={{ background: getPerformanceColor(item.compatibility.settingsLevel) }}
                    >
                      {getPerformanceLabel(item.compatibility.settingsLevel)}
                    </span>
                  </div>
                  <div className="synergy-metrics">
                    <div>
                      <span>Persona Alignment</span>
                      <strong>{item.alignment}%</strong>
                    </div>
                    <div>
                      <span>Hardware Match</span>
                      <strong>{item.hardwareMatch}%</strong>
                    </div>
                  </div>
                  <p className="synergy-detail">
                    {PersonaPerformanceInsights.describeCompatibility(item.compatibility)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="stats-section">
          <h2><Trophy size={24} /> Library Statistics</h2>
          <div className="stats-grid">
            <div className="stat-card library-card">
              <div className="stat-icon">
                <Trophy size={32} />
              </div>
              <div className="stat-content">
                <h3>{libraryStats.totalGames}</h3>
                <p>Total Games</p>
              </div>
            </div>

            <div className="stat-card library-card">
              <div className="stat-icon">
                <Award size={32} />
              </div>
              <div className="stat-content">
                <h3>{libraryStats.uniquePlatforms}</h3>
                <p>Unique Platforms</p>
              </div>
            </div>

            <div className="stat-card library-card">
              <div className="stat-icon">
                <Star size={32} />
              </div>
              <div className="stat-content">
                <h3>{libraryStats.uniqueGenres}</h3>
                <p>Unique Genres</p>
              </div>
            </div>
          </div>
        </div>

        <div className="stats-section">
          <h2>📊 Library Breakdown</h2>
          <p className="section-subtitle">Your owned collection by platform, genre, and mood.</p>

          <div className="charts-grid">
            {libraryStats.totalGames > 0 && Object.keys(libraryStats.platformCounts).length > 0 && (
              <PieChart 
                data={libraryStats.platformCounts}
                title="🎮 Platform Distribution"
              />
            )}

            {libraryStats.totalGames > 0 && Object.keys(libraryStats.genreCounts).length > 0 && (
              <BarChart 
                data={libraryStats.genreCounts}
                title="🎨 Genre Distribution"
              />
            )}

            {libraryStats.totalGames > 0 && Object.keys(libraryStats.moodCounts).length > 0 && (
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
        </div>

        {library.length === 0 && achievementData.unlocked.length === 0 && (dashboardData?.totalSessionsRecorded || 0) === 0 && (
          <div className="empty-state">
            <h2>{getEmptyLibraryFallback('Stats').message}</h2>
            <p>Start building your game library and unlocking achievements to see detailed analytics!</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Stats;