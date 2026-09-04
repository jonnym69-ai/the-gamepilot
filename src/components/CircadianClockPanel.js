import React, { useMemo } from 'react';
import { Moon, Sun, Sunrise, Sunset, Clock, Flame, Award } from 'lucide-react';
import { StatsAggregationService } from '../services/StatsAggregationService';
import './CircadianClockPanel.css';

export function CircadianClockPanel({ library = [] }) {
  const analysis = useMemo(() => {
    const sessions = StatsAggregationService.getNormalizedSessionHistory(library);
    if (!sessions || sessions.length === 0) return null;

    let totalMinutes = 0;
    let longestSittingMinutes = 0;
    let longestSittingGame = '';
    
    // Time-of-day buckets
    // Night: 00:00 - 05:59
    // Morning: 06:00 - 11:59
    // Afternoon: 12:00 - 17:59
    // Evening: 18:00 - 23:59
    const buckets = {
      night: { label: 'Night Owl', hours: '12am - 6am', minutes: 0, icon: Moon, color: '#8b5cf6' },
      morning: { label: 'Early Bird', hours: '6am - 12pm', minutes: 0, icon: Sunrise, color: '#f59e0b' },
      afternoon: { label: 'Day Tripper', hours: '12pm - 6pm', minutes: 0, icon: Sun, color: '#38bdf8' },
      evening: { label: 'Prime Timer', hours: '6pm - 12am', minutes: 0, icon: Sunset, color: '#ff6b35' }
    };

    let weekendMinutes = 0;
    let weekdayMinutes = 0;

    sessions.forEach((s) => {
      const duration = s.playtimeMinutes || 0;
      totalMinutes += duration;

      if (duration > longestSittingMinutes) {
        longestSittingMinutes = duration;
        longestSittingGame = s.gameName || 'Unknown Game';
      }

      const date = s.timestamp ? new Date(s.timestamp) : null;
      if (date && !isNaN(date.getTime())) {
        const hour = date.getHours();
        const day = date.getDay(); // 0 is Sunday, 6 is Saturday

        if (day === 0 || day === 6) {
          weekendMinutes += duration;
        } else {
          weekdayMinutes += duration;
        }

        if (hour >= 0 && hour < 6) {
          buckets.night.minutes += duration;
        } else if (hour >= 6 && hour < 12) {
          buckets.morning.minutes += duration;
        } else if (hour >= 12 && hour < 18) {
          buckets.afternoon.minutes += duration;
        } else {
          buckets.evening.minutes += duration;
        }
      }
    });

    if (totalMinutes === 0) return null;

    // Determine dominant circadian archetype
    let dominantKey = 'evening';
    let maxBucketMinutes = 0;
    Object.keys(buckets).forEach((key) => {
      if (buckets[key].minutes > maxBucketMinutes) {
        maxBucketMinutes = buckets[key].minutes;
        dominantKey = key;
      }
    });

    const dominantPercent = Math.round((maxBucketMinutes / totalMinutes) * 100);
    const weekendPercent = Math.round((weekendMinutes / totalMinutes) * 100);
    const archetype = buckets[dominantKey];

    let personalityTag = `${dominantPercent}% ${archetype.label}`;
    if (weekendPercent >= 65) {
      personalityTag = `Weekend Warrior (${weekendPercent}% Weekend Play)`;
    }

    return {
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      longestSittingHours: Math.round((longestSittingMinutes / 60) * 10) / 10,
      longestSittingGame,
      dominantArchetype: archetype,
      dominantPercent,
      personalityTag,
      weekendPercent,
      weekdayPercent: 100 - weekendPercent,
      buckets
    };
  }, [library]);

  if (!analysis) {
    return (
      <div className="circadian-empty">
        <Clock size={24} />
        <p>Log a few play sessions to calculate your circadian rhythm and peak gaming hours.</p>
      </div>
    );
  }

  const { totalHours, longestSittingHours, longestSittingGame, dominantArchetype, personalityTag, weekendPercent, weekdayPercent, buckets } = analysis;

  return (
    <div className="circadian-clock-panel">
      <div className="circadian-header">
        <div className="circadian-badge-wrap">
          <Clock size={20} className="circadian-icon" />
          <span className="circadian-eyebrow">Circadian Gaming Rhythm</span>
        </div>
        <h3 className="circadian-title">{personalityTag}</h3>
        <p className="circadian-subtitle">
          Your peak window is <strong>{dominantArchetype.label}</strong> ({dominantArchetype.hours}) comprising {analysis.dominantPercent}% of all recorded play.
        </p>
      </div>

      <div className="circadian-grid">
        {Object.entries(buckets).map(([key, b]) => {
          const Icon = b.icon;
          const percent = totalHours > 0 ? Math.round(((b.minutes / 60) / totalHours) * 100) : 0;
          return (
            <div key={key} className="circadian-card" style={{ '--accent-glow': b.color }}>
              <div className="circadian-card-header">
                <Icon size={18} style={{ color: b.color }} />
                <span className="circadian-card-time">{b.hours}</span>
              </div>
              <div className="circadian-card-name">{b.label}</div>
              <div className="circadian-card-stat">
                <span className="circadian-card-hours">{Math.round((b.minutes / 60) * 10) / 10}h</span>
                <span className="circadian-card-percent">{percent}%</span>
              </div>
              <div className="circadian-progress-track">
                <div
                  className="circadian-progress-fill"
                  style={{ width: `${percent}%`, backgroundColor: b.color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="circadian-insights-row">
        <div className="circadian-insight-box">
          <Flame size={18} className="insight-icon flame" />
          <div className="insight-content">
            <span className="insight-label">Longest Continuous Sitting</span>
            <strong className="insight-value">{longestSittingHours} hours</strong>
            <span className="insight-meta">on {longestSittingGame || 'your favorite title'}</span>
          </div>
        </div>

        <div className="circadian-insight-box">
          <Award size={18} className="insight-icon cadence" />
          <div className="insight-content">
            <span className="insight-label">Weekly Split</span>
            <strong className="insight-value">{weekendPercent}% Weekend · {weekdayPercent}% Weekday</strong>
            <span className="insight-meta">
              {weekendPercent > 55 ? 'You save your big adventures for the weekend' : 'Balanced daily gaming cadence'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CircadianClockPanel;
