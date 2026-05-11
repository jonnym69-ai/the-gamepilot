import React, { useMemo, useState } from 'react';
import { StatsAggregationService } from '../services/StatsAggregationService';
import { getDateKey } from '../services/DateKeyService';
import './PlaytimeHeatmap.css';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const RANGE_OPTIONS = [
  { id: '3m', label: '3 months', days: 90 },
  { id: '6m', label: '6 months', days: 182 },
  { id: '12m', label: '12 months', days: 364 }
];

const PlaytimeHeatmap = ({ library = [] }) => {
  const [rangeId, setRangeId] = useState('3m');
  const range = RANGE_OPTIONS.find((r) => r.id === rangeId) || RANGE_OPTIONS[0];

  const daily = useMemo(() => {
    const sessions = StatsAggregationService.getNormalizedSessionHistory(library);
    const map = sessions.reduce((accumulator, session) => {
      const dateKey = getDateKey(session.timestamp);
      if (!dateKey) return accumulator;
      accumulator[dateKey] = (accumulator[dateKey] || 0) + (session.playtimeMinutes || 0);
      return accumulator;
    }, {});
    return {
      map,
      totalMinutes: sessions.reduce((sum, s) => sum + (s.playtimeMinutes || 0), 0)
    };
  }, [library]);

  const { heatmapData, activeDays, totalHours, monthMarkers } = useMemo(() => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (range.days - 1));

    const weeks = [];
    let currentWeek = [];

    const startDayOfWeek = startDate.getDay();
    for (let i = 0; i < startDayOfWeek; i++) {
      currentWeek.push(null);
    }

    const rangeDateKeys = new Set();
    for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
      const dateStr = getDateKey(d);
      rangeDateKeys.add(dateStr);
      const minutes = daily.map[dateStr] || 0;
      currentWeek.push({ date: dateStr, minutes, hours: minutes / 60 });
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push(null);
      weeks.push(currentWeek);
    }

    // Build month markers: first week whose first non-null day lands in a new month.
    const markers = [];
    let lastMonth = -1;
    weeks.forEach((week, idx) => {
      const firstReal = week.find((d) => d && d.date);
      if (!firstReal) return;
      const month = new Date(firstReal.date).getMonth();
      if (month !== lastMonth) {
        markers.push({ weekIndex: idx, label: MONTH_LABELS[month] });
        lastMonth = month;
      }
    });

    // Count only days that actually fall in the visible range.
    let activeInRange = 0;
    let minutesInRange = 0;
    rangeDateKeys.forEach((key) => {
      const m = daily.map[key] || 0;
      if (m > 0) activeInRange += 1;
      minutesInRange += m;
    });

    return {
      heatmapData: weeks,
      activeDays: activeInRange,
      totalHours: Math.round(minutesInRange / 60),
      monthMarkers: markers
    };
  }, [daily, range.days]);

  const getColor = (minutes) => {
    if (!minutes || minutes === 0) return 'level-0';
    const hours = minutes / 60;
    if (hours < 0.5) return 'level-1';
    if (hours < 1) return 'level-2';
    if (hours < 2) return 'level-3';
    if (hours < 4) return 'level-4';
    return 'level-5';
  };

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="playtime-heatmap">
      <div className="heatmap-header">
        <h3>Playtime Activity</h3>
        <div className="heatmap-header-actions">
          <div className="heatmap-range" role="group" aria-label="Heatmap range">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`heatmap-range-btn ${rangeId === opt.id ? 'is-active' : ''}`}
                onClick={() => setRangeId(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
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
      </div>

      <div className={`heatmap-container range-${rangeId}`}>
        <div className="heatmap-days">
          <span className="heatmap-month-spacer" aria-hidden="true"></span>
          {days.map((day, i) => (
            (i % 2 === 1) ? <span key={day}>{day}</span> : <span key={day}></span>
          ))}
        </div>
        <div className="heatmap-grid-wrapper">
          <div className="heatmap-months" aria-hidden="true">
            {monthMarkers.map((marker) => (
              <span
                key={`${marker.weekIndex}-${marker.label}`}
                className="heatmap-month-label"
                style={{ gridColumnStart: marker.weekIndex + 1 }}
              >
                {marker.label}
              </span>
            ))}
          </div>
          <div
            className="heatmap-grid"
            style={{ gridTemplateColumns: `repeat(${heatmapData.length}, minmax(0, 1fr))` }}
          >
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
      </div>

      <div className="heatmap-stats">
        <div className="stat">
          <span className="stat-value">{activeDays}</span>
          <span className="stat-label">Days Active</span>
        </div>
        <div className="stat">
          <span className="stat-value">{totalHours}h</span>
          <span className="stat-label">Total Time</span>
        </div>
      </div>
    </div>
  );
};

export default PlaytimeHeatmap;
