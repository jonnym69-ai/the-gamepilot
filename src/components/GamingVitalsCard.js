import React, { useMemo } from 'react';
import { Activity } from 'lucide-react';
import SessionRepository from '../services/SessionRepository';
import GamingVitalsService from '../services/GamingVitalsService';
import { formatPlaytime } from '../utils/formatPlaytime';
import './GamingVitalsCard.css';

const hourLabel = (h) => {
  if (h == null) return null;
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}${h < 12 ? 'am' : 'pm'}`;
};

// The "sleep tracker" readout — what your session telemetry says about this
// week's rhythm. Descriptive, not judgemental: it mirrors your pattern.
export default function GamingVitalsCard() {
  const vitals = useMemo(() => GamingVitalsService.getVitals(SessionRepository.getSessionHistory()), []);
  if (!vitals || vitals.totalSessions < 3) return null;

  const { today, week, weeklyNorm, typicalStartHour, streak, daysSinceLast } = vitals;
  const totalBand = week.bands.deep + week.bands.steady + week.bands.hop || 1;
  const seg = (n) => `${Math.max(0, (n / totalBand) * 100)}%`;

  return (
    <section className="gaming-vitals" aria-label="Gaming vitals">
      <header className="gaming-vitals-head">
        <Activity size={15} aria-hidden="true" />
        <h3>Gaming vitals</h3>
        <span className="gaming-vitals-focus">{week.focusLabel}</span>
      </header>

      <div className="gaming-vitals-stats">
        <div className="gaming-vitals-stat">
          <strong>
            {today.played ? `${today.sessions} session${today.sessions === 1 ? '' : 's'}` : 'Rest day so far'}
          </strong>
          <span>
            {today.played
              ? `${formatPlaytime(today.minutes)} tonight`
              : daysSinceLast === 1
                ? 'last played yesterday'
                : `last played ${daysSinceLast}d ago`}
          </span>
        </div>
        <div className="gaming-vitals-stat">
          <strong>
            {week.days} evening{week.days === 1 ? '' : 's'}
          </strong>
          <span>
            {formatPlaytime(week.minutes)} this week · usual {weeklyNorm}
          </span>
        </div>
        {streak > 1 && (
          <div className="gaming-vitals-stat">
            <strong>{streak}-day streak</strong>
            <span>consecutive days played</span>
          </div>
        )}
        {typicalStartHour != null && (
          <div className="gaming-vitals-stat">
            <strong>~{hourLabel(typicalStartHour)}</strong>
            <span>your usual start time</span>
          </div>
        )}
      </div>

      {totalBand > 0 && (
        <div
          className="gaming-vitals-depth"
          aria-label={`Session depth this week: ${week.bands.deep} deep, ${week.bands.steady} steady, ${week.bands.hop} hops`}
        >
          <div className="gaming-vitals-bar">
            <span className="gaming-vitals-seg gaming-vitals-seg-deep" style={{ width: seg(week.bands.deep) }} />
            <span className="gaming-vitals-seg gaming-vitals-seg-steady" style={{ width: seg(week.bands.steady) }} />
            <span className="gaming-vitals-seg gaming-vitals-seg-hop" style={{ width: seg(week.bands.hop) }} />
          </div>
          <div className="gaming-vitals-legend">
            <span>
              <i className="gaming-vitals-seg-deep" /> Deep 90m+ ×{week.bands.deep}
            </span>
            <span>
              <i className="gaming-vitals-seg-steady" /> Steady ×{week.bands.steady}
            </span>
            <span>
              <i className="gaming-vitals-seg-hop" /> Hop &lt;15m ×{week.bands.hop}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
