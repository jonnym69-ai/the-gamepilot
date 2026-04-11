import React, { useMemo } from 'react';
import { AchievementTracker } from '../AchievementSystem';
import './PlaytimeHeatmap.css';

const PlaytimeHeatmap = ({ library = [] }) => {
  const heatmapData = useMemo(() => {
    const timeStats = AchievementTracker.getTimeStats();
    const daily = timeStats.daily || {};
    
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364);

    const weeks = [];
    let currentWeek = [];
    
    const startDayOfWeek = startDate.getDay();
    for (let i = 0; i < startDayOfWeek; i++) {
      currentWeek.push(null);
    }

    for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const minutes = daily[dateStr] || 0;
      
      currentWeek.push({
        date: dateStr,
        minutes,
        hours: minutes / 60
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }, [library]);

  const getColor = (minutes) => {
    if (!minutes || minutes === 0) return 'level-0';
    const hours = minutes / 60;
    if (hours < 0.5) return 'level-1';
    if (hours < 1) return 'level-2';
    if (hours < 2) return 'level-3';
    if (hours < 4) return 'level-4';
    return 'level-5';
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="playtime-heatmap">
      <div className="heatmap-header">
        <h3>Playtime Activity</h3>
        <div className="heatmap-legend">
          <span>Less</span>
          <div className="legend-cells">
            <div className="cell level-0"></div>
            <div className="cell level-1"></div>
            <div className="cell level-2"></div>
            <div className="cell level-3"></div>
            <div className="cell level-4"></div>
            <div className="cell level-5"></div>
          </div>
          <span>More</span>
        </div>
      </div>

      <div className="heatmap-container">
        <div className="heatmap-days">
          {days.map((day, i) => (
            (i % 2 === 1) ? <span key={day}>{day}</span> : <span key={day}></span>
          ))}
        </div>
        <div className="heatmap-grid">
          {heatmapData.map((week, weekIndex) => (
            <div key={weekIndex} className="heatmap-week">
              {week.map((day, dayIndex) => (
                <div
                  key={dayIndex}
                  className={`heatmap-cell ${day ? getColor(day.minutes) : 'empty'}`}
                  title={day ? `${day.date}: ${day.hours.toFixed(1)} hours` : ''}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="heatmap-stats">
        <div className="stat">
          <span className="stat-value">{Object.keys(AchievementTracker.getTimeStats().daily || {}).length}</span>
          <span className="stat-label">Days Active</span>
        </div>
        <div className="stat">
          <span className="stat-value">{Math.round(AchievementTracker.getTimeStats().total / 60)}h</span>
          <span className="stat-label">Total Time</span>
        </div>
      </div>
    </div>
  );
};

export default PlaytimeHeatmap;
