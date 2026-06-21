import React, { useMemo } from 'react';
import { StatsAggregationService } from '../services/StatsAggregationService';
import './TimeOfDayHeatmap.css';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => i);

const getIntensityColor = (value, max) => {
  if (max === 0 || value === 0) return 'rgba(255, 255, 255, 0.03)';
  const ratio = value / max;
  const alpha = Math.max(0.15, Math.min(1, ratio));
  return `rgba(139, 92, 246, ${alpha})`;
};

const TimeOfDayHeatmap = ({ library = [] }) => {
  const { grid, maxValue, totalMinutes } = useMemo(() => {
    const sessions = StatsAggregationService.getNormalizedSessionHistory(library);
    const grid = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
    let total = 0;

    sessions.forEach((session) => {
      if (!session.timestamp) return;
      const day = session.timestamp.getDay();
      const hour = session.timestamp.getHours();
      const minutes = session.playtimeMinutes || 0;
      grid[day][hour] += minutes;
      total += minutes;
    });

    const maxValue = Math.max(...grid.flat());
    return { grid, maxValue, totalMinutes: total };
  }, [library]);

  if (totalMinutes === 0) {
    return (
      <div className="time-of-day-empty">
        <span className="time-of-day-empty-icon">⏰</span>
        <p>No session data yet. Play some games to see your time-of-day heatmap.</p>
      </div>
    );
  }

  return (
    <div className="time-of-day-heatmap">
      <div className="time-of-day-header">
        <span className="time-of-day-total">
          {Math.round(totalMinutes / 60)}h tracked
        </span>
        <div className="time-of-day-legend">
          <span>Less</span>
          <div className="legend-gradient" />
          <span>More</span>
        </div>
      </div>

      <div className="time-of-day-grid">
        {/* Hour labels top */}
        <div className="time-of-day-corner" />
        {HOUR_LABELS.map((hour) => (
          <div key={`h-${hour}`} className="time-of-day-hour-label">
            {hour % 3 === 0 ? `${String(hour).padStart(2, '0')}:00` : ''}
          </div>
        ))}

        {/* Rows */}
        {DAY_LABELS.map((day, dayIndex) => (
          <React.Fragment key={day}>
            <div className="time-of-day-day-label">{day}</div>
            {HOUR_LABELS.map((hour) => {
              const value = grid[dayIndex][hour];
              const hours = Math.round(value / 60 * 10) / 10;
              return (
                <div
                  key={`${day}-${hour}`}
                  className="time-of-day-cell"
                  style={{ backgroundColor: getIntensityColor(value, maxValue) }}
                  title={`${day} ${String(hour).padStart(2, '0')}:00 — ${hours}h`}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default TimeOfDayHeatmap;
