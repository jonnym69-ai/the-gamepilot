import React from 'react';
import { TrendingUp, Clock, Calendar, Moon, Sunrise, RotateCcw, Gamepad2 } from 'lucide-react';
import { ShareCardWatermark } from './ShareCardWatermark';
import './HabitsShareCard.css';

export const HABITS_SHARE_CARD_SIZE_PX = 1080;

export function HabitsShareCard({ insights = {}, username = 'Pilot', periodLabel = 'All Time' }) {
  const h = insights || {};

  return (
    <div className="habits-share-card" style={{ width: HABITS_SHARE_CARD_SIZE_PX, height: HABITS_SHARE_CARD_SIZE_PX }}>
      <div className="habits-share-card-glow" aria-hidden="true" />
      <Gamepad2 className="habits-share-watermark" size={320} aria-hidden="true" />

      <div className="habits-share-card-header">
        <span className="habits-share-card-brand">GAMEPILOT</span>
        <span className="habits-share-card-tag">Play Habits</span>
      </div>

      <div className="habits-share-card-body">
        <div className="habits-share-card-hero">
          <TrendingUp size={48} className="habits-share-card-icon" />
          <div>
            <span className="habits-share-card-eyebrow">{username || 'Pilot'} · {periodLabel}</span>
            <h2 className="habits-share-card-title">Deeper Play Habits</h2>
          </div>
        </div>

        <div className="habits-share-card-grid">
          {h.longestSession && (
            <div className="habits-share-card-stat featured">
              <div className="habits-share-card-stat-label">
                <Clock size={18} />
                Longest Session
              </div>
              <strong>{h.longestSession.gameName}</strong>
              <span>{h.longestSession.playtimeMinutes} min</span>
            </div>
          )}

          {h.busiestDay && (
            <div className="habits-share-card-stat">
              <div className="habits-share-card-stat-label">
                <Calendar size={18} />
                Most Active Day
              </div>
              <strong>{h.busiestDay.dateLabel}</strong>
              <span>{h.busiestDay.playtimeMinutes} min · {h.busiestDay.sessions} sessions</span>
            </div>
          )}

          {h.mostReturnedTo && (
            <div className="habits-share-card-stat">
              <div className="habits-share-card-stat-label">
                <RotateCcw size={18} />
                Most Returned To
              </div>
              <strong>{h.mostReturnedTo.name}</strong>
              <span>{h.mostReturnedTo.sessions} sessions · {h.mostReturnedTo.totalPlaytime} min</span>
            </div>
          )}

          <div className="habits-share-card-stat">
            <div className="habits-share-card-stat-label">
              <Moon size={18} />
              Late-night Runs
            </div>
            <strong>{h.lateNightSessions || 0}</strong>
            <span>sessions after dark</span>
          </div>

          <div className="habits-share-card-stat">
            <div className="habits-share-card-stat-label">
              <Sunrise size={18} />
              Weekend Sessions
            </div>
            <strong>{h.weekendSessions || 0}</strong>
            <span>sessions on weekends</span>
          </div>

          <div className="habits-share-card-stat">
            <div className="habits-share-card-stat-label">
              <RotateCcw size={18} />
              Repeat Games
            </div>
            <strong>{h.repeatGames || 0}</strong>
            <span>games replayed</span>
          </div>
        </div>
      </div>

      <ShareCardWatermark />
    </div>
  );
}
