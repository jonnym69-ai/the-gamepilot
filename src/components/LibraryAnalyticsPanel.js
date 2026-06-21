import React, { useMemo } from 'react';
import { BarChart3, Brain, Clock, Flame, Target, TrendingUp, Zap, AlertTriangle, CheckCircle, Info, Lightbulb, Star } from 'lucide-react';
import { LibraryAnalyticsService } from '../services/LibraryAnalyticsService';
import './LibraryAnalyticsPanel.css';

const formatHours = (minutes) => {
  if (!minutes || minutes <= 0) return '0h';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const InsightCard = ({ insight }) => {
  const iconMap = {
    warning: <AlertTriangle size={18} />,
    success: <CheckCircle size={18} />,
    tip: <Lightbulb size={18} />,
    info: <Info size={18} />
  };
  const typeClass = `insight-${insight.type}`;
  return (
    <div className={`analytics-insight-card ${typeClass}`}>
      <div className="insight-icon">{iconMap[insight.type] || <Info size={18} />}</div>
      <div className="insight-content">
        <strong>{insight.title}</strong>
        <p>{insight.text}</p>
      </div>
    </div>
  );
};

const MiniBar = ({ value, max, color = 'var(--accent-color)' }) => {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="analytics-mini-bar">
      <div className="analytics-mini-bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
};

const HourHeatmap = ({ distribution }) => {
  const maxVal = Math.max(...distribution.map((d) => d.minutes), 1);
  return (
    <div className="analytics-heatmap">
      <div className="heatmap-grid">
        {distribution.map((d) => (
          <div
            key={d.hour}
            className="heatmap-cell"
            title={`${d.hour}:00 — ${formatHours(d.minutes)}`}
            style={{ opacity: Math.max(0.15, d.minutes / maxVal) }}
          >
            <span className="heatmap-label">{d.hour}</span>
          </div>
        ))}
      </div>
      <div className="heatmap-legend">
        <span>Quiet</span>
        <div className="heatmap-gradient" />
        <span>Peak</span>
      </div>
    </div>
  );
};

const LibraryAnalyticsPanel = ({ library = [] }) => {
  const analytics = useMemo(() => LibraryAnalyticsService.getFullAnalytics(library), [library]);

  if (!analytics) {
    return (
      <div className="library-analytics-panel">
        <div className="analytics-empty">
          <Brain size={32} />
          <p>Add games and play sessions to unlock analytics.</p>
        </div>
      </div>
    );
  }

  const { playPatterns, backlog, matrix, diversity, insights } = analytics;

  return (
    <div className="library-analytics-panel">
      <div className="analytics-header">
        <BarChart3 size={22} />
        <h2>Library Analytics</h2>
        <span className="analytics-badge">Power Tools</span>
      </div>

      {/* Insights Feed */}
      {insights && insights.length > 0 && (
        <div className="analytics-section">
          <h3><Zap size={16} /> Power Insights</h3>
          <div className="insights-grid">
            {insights.map((insight, i) => (
              <InsightCard key={i} insight={insight} />
            ))}
          </div>
        </div>
      )}

      {/* Diversity Score */}
      {diversity && (
        <div className="analytics-section">
          <h3><TrendingUp size={16} /> Library Diversity</h3>
          <div className="diversity-card">
            <div className="diversity-score-ring">
              <span className="diversity-score-value">{diversity.score}</span>
              <span className="diversity-score-label">/ 100</span>
            </div>
            <div className="diversity-breakdown">
              <div className="diversity-metric">
                <span>Genres</span>
                <strong>{diversity.genreCount}</strong>
                <MiniBar value={diversity.genreDiversity} max={100} />
              </div>
              <div className="diversity-metric">
                <span>Platforms</span>
                <strong>{diversity.platformCount}</strong>
                <MiniBar value={diversity.platformDiversity} max={100} />
              </div>
              <div className="diversity-metric">
                <span>Moods</span>
                <strong>{diversity.moodCount}</strong>
                <MiniBar value={diversity.moodDiversity} max={100} />
              </div>
              <div className="diversity-metric">
                <span>Avg Rating</span>
                <strong>{diversity.avgRating || '—'}</strong>
                <MiniBar value={(diversity.avgRating || 0) * 10} max={100} color="#f59e0b" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Play Patterns */}
      {playPatterns && (
        <div className="analytics-section">
          <h3><Clock size={16} /> Play Patterns</h3>
          <div className="pattern-grid">
            <div className="pattern-stat">
              <Flame size={18} />
              <span className="pattern-value">{playPatterns.currentStreak}</span>
              <span className="pattern-label">Day Streak</span>
            </div>
            <div className="pattern-stat">
              <TrendingUp size={18} />
              <span className="pattern-value">{playPatterns.longestStreak}</span>
              <span className="pattern-label">Best Streak</span>
            </div>
            <div className="pattern-stat">
              <Clock size={18} />
              <span className="pattern-value">{playPatterns.avgSessionLength}m</span>
              <span className="pattern-label">Avg Session</span>
            </div>
            <div className="pattern-stat">
              <Target size={18} />
              <span className="pattern-value">{playPatterns.peakHour}:00</span>
              <span className="pattern-label">Peak Hour</span>
            </div>
          </div>
          <HourHeatmap distribution={playPatterns.hourDistribution} />
        </div>
      )}

      {/* Backlog Optimizer */}
      {backlog && (
        <div className="analytics-section">
          <h3><Target size={16} /> Backlog Optimizer</h3>
          <div className="backlog-summary">
            <span>{backlog.totalBacklog} games</span>
            <span>~{Math.round(backlog.estimatedTotalHours)}h remaining</span>
          </div>
          {backlog.quickWins.length > 0 && (
            <div className="backlog-subsection">
              <h4><Zap size={14} /> Quick Wins (near completion)</h4>
              <div className="backlog-list">
                {backlog.quickWins.map(({ game, completionPct, remainingHours }) => (
                  <div key={game.name} className="backlog-item quick-win">
                    <span className="backlog-name">{game.name}</span>
                    <span className="backlog-pct">{completionPct}% done</span>
                    <span className="backlog-remaining">{remainingHours !== null ? `~${Math.round(remainingHours)}h left` : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {backlog.topPicks.length > 0 && (
            <div className="backlog-subsection">
              <h4><Star size={14} /> Top Optimized Picks</h4>
              <div className="backlog-list">
                {backlog.topPicks.map(({ game, score, completionPct }) => (
                  <div key={game.name} className="backlog-item">
                    <span className="backlog-name">{game.name}</span>
                    <span className="backlog-score">Score {score}</span>
                    <span className="backlog-pct">{completionPct}% done</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Genre/Mood Matrix */}
      {matrix && matrix.topGenre && (
        <div className="analytics-section">
          <h3><Brain size={16} /> Genre Performance</h3>
          <div className="genre-performance-grid">
            {matrix.bestCompletionGenre && (
              <div className="genre-card best">
                <CheckCircle size={16} />
                <strong>{matrix.bestCompletionGenre.name}</strong>
                <span>{matrix.bestCompletionGenre.completionRate}% completion</span>
              </div>
            )}
            {matrix.worstCompletionGenre && (
              <div className="genre-card worst">
                <AlertTriangle size={16} />
                <strong>{matrix.worstCompletionGenre.name}</strong>
                <span>{matrix.worstCompletionGenre.completionRate}% completion</span>
              </div>
            )}
            {matrix.topGenre && (
              <div className="genre-card top">
                <TrendingUp size={16} />
                <strong>{matrix.topGenre.name}</strong>
                <span>{Math.round(matrix.topGenre.hours)}h played</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LibraryAnalyticsPanel;
