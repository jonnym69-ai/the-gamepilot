import React from 'react';
import { Zap, Brain, Target, TrendingUp, Clock, Gamepad2 } from 'lucide-react';
import { ShareCardWatermark } from './ShareCardWatermark';
import './PowerStatsShareCard.css';

export const POWER_STATS_SHARE_CARD_SIZE_PX = 1080;

export function PowerStatsShareCard({ analytics = {}, username = 'Pilot' }) {
  const { diversity, playPatterns, insights, backlog, genreMatrix } = analytics || {};

  return (
    <div className="power-stats-share-card" style={{ width: POWER_STATS_SHARE_CARD_SIZE_PX, height: POWER_STATS_SHARE_CARD_SIZE_PX }}>
      <div className="power-stats-share-card-glow" aria-hidden="true" />
      <Gamepad2 className="power-stats-share-watermark" size={320} aria-hidden="true" />

      <div className="power-stats-share-card-header">
        <span className="power-stats-share-card-brand">GAMEPILOT</span>
        <span className="power-stats-share-card-tag">Power Stats</span>
      </div>

      <div className="power-stats-share-card-body">
        <div className="power-stats-share-card-hero">
          <Zap size={48} className="power-stats-share-card-icon" />
          <div>
            <span className="power-stats-share-card-eyebrow">{username || 'Pilot'} · Power Stats</span>
            <h2 className="power-stats-share-card-title">⚡ Power Stats</h2>
          </div>
        </div>

        {diversity && (
          <div className="power-stats-share-card-score">
            <strong>{diversity.score}</strong>
            <span>Library Diversity Score</span>
          </div>
        )}

        {playPatterns && (
          <div className="power-stats-share-card-grid">
            <div className="power-stats-share-card-stat">
              <Clock size={18} />
              <strong>{playPatterns.avgSessionLength} min</strong>
              <span>Avg Session</span>
            </div>
            <div className="power-stats-share-card-stat">
              <TrendingUp size={18} />
              <strong>{playPatterns.peakDay}</strong>
              <span>Peak Day</span>
            </div>
            <div className="power-stats-share-card-stat">
              <Zap size={18} />
              <strong>{playPatterns.currentStreak} days</strong>
              <span>Current Streak</span>
            </div>
            <div className="power-stats-share-card-stat">
              <Brain size={18} />
              <strong>{playPatterns.totalSessions}</strong>
              <span>Total Sessions</span>
            </div>
          </div>
        )}

        {insights?.length > 0 && (
          <div className="power-stats-share-card-insights">
            {insights.slice(0, 3).map((insight, i) => (
              <div key={i} className="power-stats-share-card-insight">
                <span>{insight.text}</span>
              </div>
            ))}
          </div>
        )}

        {backlog?.quickWins?.length > 0 && (
          <div className="power-stats-share-card-subsection">
            <div className="power-stats-share-card-subtitle"><Target size={14} /> Quick Wins</div>
            <div className="power-stats-share-card-list">
              {backlog.quickWins.slice(0, 3).map((item, i) => (
                <div key={i} className="power-stats-share-card-item">
                  <span>{item.game?.name || 'Unknown'}</span>
                  <strong>{Math.round(item.completionPct)}%</strong>
                </div>
              ))}
            </div>
          </div>
        )}

        {genreMatrix?.topGenres?.length > 0 && (
          <div className="power-stats-share-card-subsection">
            <div className="power-stats-share-card-subtitle"><TrendingUp size={14} /> Top Genres</div>
            <div className="power-stats-share-card-list">
              {genreMatrix.topGenres.slice(0, 3).map((g, i) => (
                <div key={i} className="power-stats-share-card-item">
                  <span>{g.genre}</span>
                  <strong>{Math.round(g.avgCompletion)}% avg</strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <ShareCardWatermark />
    </div>
  );
}
