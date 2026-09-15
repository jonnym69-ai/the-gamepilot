import React, { useMemo } from 'react';
import { StatsAggregationService } from '../services/StatsAggregationService';
import PeriodComparisonService from '../services/PeriodComparisonService';
import './YearComparisonCard.css';

const formatDelta = (value) => {
  if (value === null || value === undefined) return '—';
  if (value === 0) return '±0%';
  return `${value > 0 ? '+' : ''}${value}%`;
};

const METRICS = [
  { key: 'hours', label: 'Hours' },
  { key: 'sessions', label: 'Sessions' },
  { key: 'activeDays', label: 'Days played' },
  { key: 'games', label: 'Different games' },
];

export default function YearComparisonCard({ library = [] }) {
  const comparison = useMemo(() => {
    try {
      const sessions = StatsAggregationService.getNormalizedSessionHistory(library);
      return PeriodComparisonService.buildYearOverYear(sessions);
    } catch {
      return null;
    }
  }, [library]);

  if (!comparison) {
    return (
      <div className="year-comparison-empty">
        <p>Not enough tracked history yet — this comparison appears once sessions span more than one period.</p>
      </div>
    );
  }

  const { current, previous, deltas, currentYear, previousYear, daysIntoYear } = comparison;
  const hasPrevious = previous.sessions > 0;

  return (
    <div className="year-comparison">
      <p className="year-comparison-caption">
        First {daysIntoYear} days of {currentYear} vs the same stretch of {previousYear}.
      </p>
      <div className="year-comparison-grid">
        {METRICS.map(({ key, label }) => (
          <div key={key} className="year-comparison-row">
            <span className="year-comparison-label">{label}</span>
            <span className="year-comparison-value">{key === 'hours' ? `${current.hours}h` : current[key]}</span>
            <span className="year-comparison-value is-previous">
              {hasPrevious ? (key === 'hours' ? `${previous.hours}h` : previous[key]) : '—'}
            </span>
            <span
              className={`year-comparison-delta ${
                deltas[key] === null ? '' : deltas[key] > 0 ? 'is-up' : deltas[key] < 0 ? 'is-down' : ''
              }`}
            >
              {formatDelta(deltas[key])}
            </span>
          </div>
        ))}
      </div>
      <div className="year-comparison-headers" aria-hidden="true">
        <span />
        <span>{currentYear}</span>
        <span>{previousYear}</span>
        <span>Δ</span>
      </div>
      {(current.topGame || previous.topGame) && (
        <div className="year-comparison-topgames">
          <p>
            <strong>{currentYear}:</strong> led by{' '}
            {current.topGame ? `${current.topGame.name} (${current.topGame.hours}h)` : 'nothing yet'}
          </p>
          {hasPrevious && previous.topGame && (
            <p>
              <strong>{previousYear}:</strong> led by {previous.topGame.name} ({previous.topGame.hours}h)
            </p>
          )}
          {!hasPrevious && <p className="year-comparison-note">No tracked sessions from {previousYear} to compare.</p>}
        </div>
      )}
    </div>
  );
}
