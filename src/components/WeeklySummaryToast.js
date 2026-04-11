import React, { useEffect, useState } from 'react';
import { TrendingUp, Clock, Trophy, Flame, X } from 'lucide-react';
import './WeeklySummaryToast.css';

const WeeklySummaryToast = ({ show, stats, onClose }) => {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (show) {
      setExiting(false);
      const timer = setTimeout(() => {
        setExiting(true);
        setTimeout(onClose, 500);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show || !stats) return null;

  const { hoursThisWeek, hoursLastWeek, gamesPlayed, topGame, streak } = stats;
  const percentChange = hoursLastWeek > 0 
    ? Math.round(((hoursThisWeek - hoursLastWeek) / hoursLastWeek) * 100)
    : 100;

  return (
    <div className={`weekly-summary-toast ${exiting ? 'exiting' : ''}`}>
      <button className="toast-close" onClick={() => { setExiting(true); setTimeout(onClose, 500); }}>
        <X size={18} />
      </button>
      
      <div className="toast-header">
        <TrendingUp className="header-icon" />
        <h3>Weekly Summary</h3>
      </div>

      <div className="toast-stats">
        <div className="stat-row">
          <Clock size={18} className="stat-icon" />
          <span className="stat-label">Playtime</span>
          <span className="stat-value">{hoursThisWeek}h this week</span>
          {percentChange !== 0 && (
            <span className={`stat-change ${percentChange > 0 ? 'up' : 'down'}`}>
              {percentChange > 0 ? '+' : ''}{percentChange}%
            </span>
          )}
        </div>

        <div className="stat-row">
          <Trophy size={18} className="stat-icon" />
          <span className="stat-label">Games Played</span>
          <span className="stat-value">{gamesPlayed} games</span>
        </div>

        {topGame && (
          <div className="stat-row">
            <Flame size={18} className="stat-icon top-game" />
            <span className="stat-label">Top Game</span>
            <span className="stat-value">{topGame}</span>
          </div>
        )}

        {streak > 0 && (
          <div className="stat-row streak-row">
            <span className="streak-badge">{streak} day streak!</span>
          </div>
        )}
      </div>

      <div className="toast-footer">
        <span>Keep it up, gamer! See you next week.</span>
      </div>
    </div>
  );
};

export default WeeklySummaryToast;
