import React, { useMemo } from 'react';
import { Clock, TrendingUp, Calendar, Zap, Gamepad2, Star } from 'lucide-react';
import { PieChart, BarChart } from './StatsCharts';
import { StatsAggregationService } from '../services/StatsAggregationService';
import '../styles/StatsBackbonePanel.css';

const FEATURE_METADATA = Object.freeze({
  perfectPlay: { icon: '✨', label: 'Perfect Play' },
  surpriseMe: { icon: '🎲', label: 'Surprise Me' },
  rediscover: { icon: '🔄', label: 'Rediscover' },
  continuePlaying: { icon: '▶️', label: 'Continue Playing' },
  share: { icon: '📤', label: 'Share' }
});

const getTopEntry = (distribution = {}) => Object.entries(distribution)
  .sort((left, right) => right[1] - left[1])[0] || [null, 0];

const formatPlaytime = (minutes = 0) => {
  const safeMinutes = Math.max(0, Math.round(Number(minutes) || 0));
  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;

  if (hours > 0 && remainder > 0) {
    return `${hours}h ${remainder}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${remainder}m`;
};

const formatSessionTimestamp = (timestamp) => {
  if (!timestamp) {
    return 'Unknown time';
  }

  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

const formatQuestTimestamp = (timestamp) => {
  if (!timestamp) {
    return 'Just now';
  }

  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

const buildTimelineChart = (timeline = {}) => Object.fromEntries(
  Object.entries(timeline)
    .filter(([, value]) => Number(value) > 0)
    .map(([label, value]) => [label, Number((Number(value) / 60).toFixed(1))])
);

const getTimelineTitle = (periodKey) => {
  switch (periodKey) {
    case 'daily':
      return '🕒 Today by Time Block (hours)';
    case 'weekly':
      return '📅 This Week by Day (hours)';
    case 'monthly':
      return '🗓️ This Month by Week (hours)';
    case 'yearly':
      return '📆 This Year by Month (hours)';
    case 'all':
      return '🌍 Lifetime Trend (hours)';
    default:
      return '📈 Playtime Trend (hours)';
  }
};

function StatsBackbonePanel({ dashboardData, selectedPeriod, onSelectPeriod }) {
  const periodOptions = useMemo(() => StatsAggregationService.getPeriodOptions(), []);
  const snapshot = dashboardData?.periods?.[selectedPeriod] || dashboardData?.periods?.all;

  const timelineData = useMemo(() => buildTimelineChart(snapshot?.timeline || {}), [snapshot]);
  const featureCards = useMemo(() => StatsAggregationService.getFeatureKeys()
    .map((key) => ({
      key,
      value: snapshot?.featureUsage?.counts?.[key] || 0,
      ...FEATURE_METADATA[key]
    }))
    .filter((item) => item.value > 0), [snapshot]);

  if (!snapshot) {
    return null;
  }

  const totalSessionsRecorded = dashboardData?.totalSessionsRecorded || 0;
  const topPlatform = getTopEntry(snapshot.platformCounts);
  const topMood = getTopEntry(snapshot.moodCounts);
  const topGenre = getTopEntry(snapshot.genreCounts);
  const topGames = snapshot.topGames || [];
  const recentSessions = snapshot.recentSessions || [];
  const recentQuests = snapshot.questUsage?.recent || [];
  const recentUnlocks = snapshot.achievementUsage?.recent || [];
  const hasSessionData = snapshot.sessions > 0;
  const favoriteFeatureKey = snapshot.featureUsage?.favoriteFeature;
  const favoriteFeature = favoriteFeatureKey ? FEATURE_METADATA[favoriteFeatureKey]?.label || favoriteFeatureKey : null;
  const questCounts = snapshot.questUsage?.periodCounts || { daily: 0, weekly: 0, monthly: 0, yearly: 0 };

  return (
    <>
      <div className="stats-section stats-backbone-section">
        <div className="stats-section-header">
          <div>
            <h2><Clock size={24} /> Session Analytics</h2>
            <p className="section-subtitle">
              {snapshot.rangeLabel} · {totalSessionsRecorded} completed sessions tracked locally
            </p>
          </div>
          <div className="stats-period-selector" role="tablist" aria-label="Stats period selector">
            {periodOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                className={`stats-period-button ${selectedPeriod === option.key ? 'active' : ''}`}
                onClick={() => onSelectPeriod(option.key)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card activity-card">
            <div className="stat-icon">
              <Clock size={32} />
            </div>
            <div className="stat-content">
              <h3>{formatPlaytime(snapshot.playtimeMinutes)}</h3>
              <p>Total Playtime</p>
            </div>
          </div>

          <div className="stat-card activity-card">
            <div className="stat-icon">
              <TrendingUp size={32} />
            </div>
            <div className="stat-content">
              <h3>{snapshot.sessions}</h3>
              <p>Completed Sessions</p>
            </div>
          </div>

          <div className="stat-card activity-card">
            <div className="stat-icon">
              <Gamepad2 size={32} />
            </div>
            <div className="stat-content">
              <h3>{snapshot.uniqueGames}</h3>
              <p>Unique Games Played</p>
            </div>
          </div>

          <div className="stat-card activity-card">
            <div className="stat-icon">
              <Calendar size={32} />
            </div>
            <div className="stat-content">
              <h3>{snapshot.activeDays}</h3>
              <p>Active Days</p>
            </div>
          </div>

          <div className="stat-card activity-card">
            <div className="stat-icon">
              <Star size={32} />
            </div>
            <div className="stat-content">
              <h3>{formatPlaytime(snapshot.avgSessionMinutes)}</h3>
              <p>Average Session · Longest {formatPlaytime(snapshot.longestSessionMinutes)}</p>
            </div>
          </div>

          <div className="stat-card activity-card">
            <div className="stat-icon">
              <Zap size={32} />
            </div>
            <div className="stat-content">
              <h3>{snapshot.streak?.current || 0}</h3>
              <p>Current Streak · Best {snapshot.streak?.best || 0}</p>
            </div>
          </div>

          <div className="stat-card activity-card">
            <div className="stat-icon">
              <Star size={32} />
            </div>
            <div className="stat-content">
              <h3>{snapshot.questUsage?.totalCompleted || 0}</h3>
              <p>Quests Completed</p>
            </div>
          </div>

          <div className="stat-card activity-card">
            <div className="stat-icon">
              <TrendingUp size={32} />
            </div>
            <div className="stat-content">
              <h3>{snapshot.achievementUsage?.totalUnlocked || 0}</h3>
              <p>Achievement Unlocks</p>
            </div>
          </div>
        </div>
      </div>

      <div className="stats-section">
        <div className="stats-section-header">
          <div>
            <h2>📈 Session Breakdown</h2>
            <p className="section-subtitle">
              Canonical rollups built from completed session history for {snapshot.label.toLowerCase()}.
            </p>
          </div>
        </div>

        {hasSessionData ? (
          <>
            <div className="charts-grid">
              <BarChart data={timelineData} title={getTimelineTitle(snapshot.key)} />
              <PieChart data={snapshot.platformCounts} title="🎮 Platforms Played" />
              <BarChart data={snapshot.genreCounts} title="🎨 Genres Played" />
              <PieChart data={snapshot.moodCounts} title="😌 Mood Mix" />
            </div>

            <div className="analytics-row">
              <div className="analytics-card">
                <h3>🏆 Most Played Platform</h3>
                <div className="top-category">
                  <div className="category-name">{topPlatform[0] || '—'}</div>
                  <div className="category-count">{topPlatform[1] || 0} sessions</div>
                </div>
              </div>

              <div className="analytics-card">
                <h3>😌 Dominant Mood</h3>
                <div className="top-category">
                  <div className="category-name">{topMood[0] || '—'}</div>
                  <div className="category-count">{topMood[1] || 0} sessions</div>
                </div>
              </div>

              <div className="analytics-card">
                <h3>🎮 Top Genre</h3>
                <div className="top-category">
                  <div className="category-name">{topGenre[0] || '—'}</div>
                  <div className="category-count">{topGenre[1] || 0} sessions</div>
                </div>
              </div>

              <div className="analytics-card">
                <h3>⚡ Favorite Feature</h3>
                <div className="top-category">
                  <div className="category-name">{favoriteFeature || 'No feature usage yet'}</div>
                  <div className="category-count">{snapshot.featureUsage?.totalUses || 0} tracked uses</div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="analytics-card stats-empty-panel">
            <h3>No completed sessions in this window yet</h3>
            <p>Finish a session to populate the {snapshot.label.toLowerCase()} view.</p>
          </div>
        )}
      </div>

      {featureCards.length > 0 && (
        <div className="stats-section">
          <div className="stats-section-header">
            <div>
              <h2><Zap size={24} /> Feature Usage</h2>
              <p className="section-subtitle">
                {snapshot.featureUsage?.totalUses || 0} feature interactions in {snapshot.label.toLowerCase()}.
              </p>
            </div>
          </div>

          <div className="stats-grid">
            {featureCards.map((feature) => (
              <div key={feature.key} className="stat-card feature-card">
                <div className="stat-icon">{feature.icon}</div>
                <div className="stat-content">
                  <h3>{feature.value}</h3>
                  <p>{feature.label} Uses</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="stats-section">
        <div className="stats-section-header">
          <div>
            <h2><Star size={24} /> Quest Momentum</h2>
            <p className="section-subtitle">
              {snapshot.questUsage?.totalCompleted || 0} rotating quests completed in {snapshot.label.toLowerCase()}.
            </p>
          </div>
        </div>

        <div className="analytics-row">
          <div className="analytics-card">
            <h3>🌅 Daily</h3>
            <div className="top-category">
              <div className="category-name">{questCounts.daily}</div>
              <div className="category-count">daily quests completed</div>
            </div>
          </div>

          <div className="analytics-card">
            <h3>📅 Weekly</h3>
            <div className="top-category">
              <div className="category-name">{questCounts.weekly}</div>
              <div className="category-count">weekly quests completed</div>
            </div>
          </div>

          <div className="analytics-card">
            <h3>📆 Monthly</h3>
            <div className="top-category">
              <div className="category-name">{questCounts.monthly}</div>
              <div className="category-count">monthly quests completed</div>
            </div>
          </div>

          <div className="analytics-card">
            <h3>🎊 Yearly</h3>
            <div className="top-category">
              <div className="category-name">{questCounts.yearly}</div>
              <div className="category-count">yearly quests completed</div>
            </div>
          </div>
        </div>
      </div>

      {topGames.length > 0 && (
        <div className="stats-section">
          <div className="stats-section-header">
            <div>
              <h2><Gamepad2 size={24} /> Most Played Games</h2>
              <p className="section-subtitle">Leaders for {snapshot.rangeLabel} ranked by total playtime.</p>
            </div>
          </div>

          <div className="most-played-list">
            {topGames.map((game, index) => (
              <div key={game.id} className="most-played-item">
                <div className="rank-badge">{index + 1}</div>
                <div className="game-info">
                  <h4>{game.name}</h4>
                  <p>{game.platform} · Last played {formatSessionTimestamp(game.lastPlayed)}</p>
                </div>
                <div className="game-stats">
                  <div className="stat">
                    <span className="stat-label">Sessions:</span>
                    <span className="stat-value">{game.sessions}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Playtime:</span>
                    <span className="stat-value">{formatPlaytime(game.totalPlaytime)}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Avg:</span>
                    <span className="stat-value">{formatPlaytime(game.avgSessionMinutes)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentSessions.length > 0 && (
        <div className="stats-section">
          <div className="stats-section-header">
            <div>
              <h2>🕘 Recent Sessions</h2>
              <p className="section-subtitle">Latest completed sessions captured for this selected window.</p>
            </div>
          </div>

          <div className="recent-sessions-list">
            {recentSessions.map((session) => (
              <div key={session.id} className="recent-session-item">
                <div className="recent-session-main">
                  <h4>{session.gameName}</h4>
                  <p>{session.platform} · {formatSessionTimestamp(session.timestamp)}</p>
                </div>
                <div className="recent-session-tags">
                  <span className="recent-session-tag">{formatPlaytime(session.playtimeMinutes)}</span>
                  {session.genre && session.genre !== 'Unknown' && (
                    <span className="recent-session-tag">{session.genre}</span>
                  )}
                  {session.mood && session.mood !== 'Unknown' && (
                    <span className="recent-session-tag">{session.mood}</span>
                  )}
                  {session.launchMethod && (
                    <span className="recent-session-tag">{session.launchMethod}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentQuests.length > 0 && (
        <div className="stats-section">
          <div className="stats-section-header">
            <div>
              <h2>🏁 Recent Quest Completions</h2>
              <p className="section-subtitle">Latest rotating challenges completed in this selected window.</p>
            </div>
          </div>

          <div className="recent-sessions-list">
            {recentQuests.map((quest, index) => (
              <div key={`${quest.achievementId}-${quest.completedAt}-${index}`} className="recent-session-item">
                <div className="recent-session-main">
                  <h4>{quest.icon || '🏆'} {quest.name}</h4>
                  <p>{quest.period} quest · {formatQuestTimestamp(quest.completedAt)}</p>
                </div>
                <div className="recent-session-tags">
                  {quest.rarity && (
                    <span className="recent-session-tag">{quest.rarity}</span>
                  )}
                  {quest.metric && (
                    <span className="recent-session-tag">{quest.metric}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentUnlocks.length > 0 && (
        <div className="stats-section">
          <div className="stats-section-header">
            <div>
              <h2>🏆 Recent Achievement Unlocks</h2>
              <p className="section-subtitle">Latest unlocks recorded in this selected window.</p>
            </div>
          </div>

          <div className="recent-sessions-list">
            {recentUnlocks.map((achievement, index) => (
              <div key={`${achievement.id}-${achievement.unlockedAt}-${index}`} className="recent-session-item">
                <div className="recent-session-main">
                  <h4>{achievement.icon || '🏆'} {achievement.name}</h4>
                  <p>{formatQuestTimestamp(achievement.unlockedAt)}</p>
                </div>
                <div className="recent-session-tags">
                  {achievement.rarity && (
                    <span className="recent-session-tag">{achievement.rarity}</span>
                  )}
                  {Number.isFinite(achievement.xp) && (
                    <span className="recent-session-tag">{achievement.xp} XP</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export default StatsBackbonePanel;
