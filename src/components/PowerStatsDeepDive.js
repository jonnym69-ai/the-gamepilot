import React from 'react';
import { Zap, Brain, Target, TrendingUp, Clock } from 'lucide-react';
import './PowerStatsDeepDive.css';

function MiniBar({ value, max = 100, color = 'var(--accent-color, #ff6b35)' }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="psd-mini-bar-track">
      <div className="psd-mini-bar-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

export default function PowerStatsDeepDive({ analytics }) {
  if (!analytics) return null;
  const { diversity, playPatterns, backlog, insights, genreMatrix } = analytics;

  return (
    <div className="power-stats-deep-dive">
      {/* Power Insights */}
      {insights?.length > 0 && (
        <div className="psd-section">
          <h4 className="psd-section-title"><Zap size={16} /> Power Insights</h4>
          <div className="psd-insights">
            {insights.slice(0, 3).map((insight, i) => (
              <div key={i} className={`psd-insight-card ${insight.type}`}>
                <span className="psd-insight-text">{insight.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Library Diversity */}
      {diversity && (
        <div className="psd-section">
          <h4 className="psd-section-title"><Brain size={16} /> Library Diversity Score: {diversity.score}/100</h4>
          <div className="psd-diversity-grid">
            <div className="psd-diversity-metric">
              <span>Genre</span>
              <MiniBar value={diversity.genreScore} />
              <strong>{diversity.genreScore}</strong>
            </div>
            <div className="psd-diversity-metric">
              <span>Platform</span>
              <MiniBar value={diversity.platformScore} />
              <strong>{diversity.platformScore}</strong>
            </div>
            <div className="psd-diversity-metric">
              <span>Mood</span>
              <MiniBar value={diversity.moodScore} />
              <strong>{diversity.moodScore}</strong>
            </div>
            <div className="psd-diversity-metric">
              <span>Rating</span>
              <MiniBar value={diversity.ratingScore} />
              <strong>{diversity.ratingScore}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Play Patterns */}
      {playPatterns && (
        <div className="psd-section">
          <h4 className="psd-section-title"><Clock size={16} /> Play Patterns</h4>
          <div className="psd-pattern-grid">
            <div className="psd-pattern-stat">
              <span>Avg Session</span>
              <strong>{playPatterns.avgSessionLength} min</strong>
            </div>
            <div className="psd-pattern-stat">
              <span>Peak Hour</span>
              <strong>{playPatterns.peakHour}:00</strong>
            </div>
            <div className="psd-pattern-stat">
              <span>Peak Day</span>
              <strong>{playPatterns.peakDay}</strong>
            </div>
            <div className="psd-pattern-stat">
              <span>Current Streak</span>
              <strong>{playPatterns.currentStreak} days</strong>
            </div>
            <div className="psd-pattern-stat">
              <span>Best Streak</span>
              <strong>{playPatterns.bestStreak} days</strong>
            </div>
            <div className="psd-pattern-stat">
              <span>Total Sessions</span>
              <strong>{playPatterns.totalSessions}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Backlog Quick Picks */}
      {backlog?.quickWins?.length > 0 && (
        <div className="psd-section">
          <h4 className="psd-section-title"><Target size={16} /> Backlog Quick Wins</h4>
          <div className="psd-backlog-list">
            {backlog.quickWins.slice(0, 3).map((item, i) => (
              <div key={i} className="psd-backlog-item">
                <span className="psd-backlog-name">{item.name}</span>
                <span className="psd-backlog-pct">{Math.round(item.completionPct)}% done</span>
                <span className="psd-backlog-remaining">~{item.estimatedRemainingHours}h left</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Genre Performance */}
      {genreMatrix?.topGenres?.length > 0 && (
        <div className="psd-section">
          <h4 className="psd-section-title"><TrendingUp size={16} /> Genre Performance</h4>
          <div className="psd-genre-grid">
            {genreMatrix.topGenres.slice(0, 4).map((g, i) => (
              <div key={i} className="psd-genre-card">
                <strong>{g.genre}</strong>
                <span>{Math.round(g.avgCompletion)}% avg completion</span>
                <span>{Math.round(g.totalHours)}h played</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
