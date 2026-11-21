import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, CalendarClock, Tag } from 'lucide-react';
import SessionRepository from '../services/SessionRepository';
import GamingVitalsService from '../services/GamingVitalsService';
import CurrentEraService from '../services/CurrentEraService';
import WishlistService from '../services/WishlistService';
import ReleaseTrackerService, { WISHLIST_RELEASES_EVENT } from '../services/ReleaseTrackerService';
import { formatPlaytime } from '../utils/formatPlaytime';
import './GamingVitalsCard.css';

const hourLabel = (h) => {
  if (h == null) return null;
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}${h < 12 ? 'am' : 'pm'}`;
};

const getEra = () => {
  try {
    const era = CurrentEraService.getCurrentEra();
    if (!era || !era.snapshot?.totalMinutes) return null;
    return era;
  } catch {
    return null;
  }
};

const getWishlistAlerts = () => {
  try {
    if (!WishlistService.isEnabled()) return 0;
    const summary = WishlistService.getAlertSummary();
    return Number(summary?.count) || 0;
  } catch {
    return 0;
  }
};

// Next day-precision release within two weeks — the only kind worth a chip.
const getUpcomingRelease = (summary) => {
  const next = summary?.nextRelease;
  if (!next || next.precision !== 'day' || !next.releaseAt) return null;
  const days =
    next.daysUntil !== null && next.daysUntil !== undefined
      ? next.daysUntil
      : Math.round((new Date(next.releaseAt) - Date.now()) / (24 * 60 * 60 * 1000));
  if (days > 14) return null;
  return { ...next, daysUntil: days };
};

// The "sleep tracker" readout — what your session telemetry says about this
// week's rhythm — plus the at-a-glance chips that used to live in the Today
// strip: current era, upcoming wishlist releases and deal alerts. Descriptive,
// not judgemental: it mirrors your pattern.
export default function GamingVitalsCard() {
  const vitals = useMemo(() => GamingVitalsService.getVitals(SessionRepository.getSessionHistory()), []);
  const era = useMemo(getEra, []);
  const [wishlistAlerts, setWishlistAlerts] = useState(getWishlistAlerts);
  const [nextRelease, setNextRelease] = useState(() => getUpcomingRelease(ReleaseTrackerService.getSummary()));

  useEffect(() => {
    const refresh = () => setWishlistAlerts(getWishlistAlerts());
    window.addEventListener('gamepilot:wishlist-alerts', refresh);
    const refreshReleases = () => setNextRelease(getUpcomingRelease(ReleaseTrackerService.getSummary()));
    window.addEventListener(WISHLIST_RELEASES_EVENT, refreshReleases);
    return () => {
      window.removeEventListener('gamepilot:wishlist-alerts', refresh);
      window.removeEventListener(WISHLIST_RELEASES_EVENT, refreshReleases);
    };
  }, []);

  const hasVitals = Boolean(vitals && vitals.totalSessions >= 3);
  if (!hasVitals && !era && !nextRelease && wishlistAlerts <= 0) return null;

  const { today, week, weeklyNorm, typicalStartHour, streak, daysSinceLast } = vitals || {};
  const totalBand = hasVitals ? week.bands.deep + week.bands.steady + week.bands.hop || 1 : 0;
  const seg = (n) => `${Math.max(0, (n / totalBand) * 100)}%`;

  return (
    <section className="gaming-vitals" aria-label="Gaming vitals">
      <header className="gaming-vitals-head">
        <Activity size={15} aria-hidden="true" />
        <h3>Gaming vitals</h3>
        {hasVitals && <span className="gaming-vitals-focus">{week.focusLabel}</span>}
      </header>

      {hasVitals && (
        <>
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
                <span
                  className="gaming-vitals-seg gaming-vitals-seg-steady"
                  style={{ width: seg(week.bands.steady) }}
                />
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
        </>
      )}

      {(era || nextRelease || wishlistAlerts > 0) && (
        <div className="gaming-vitals-foot">
          {era && (
            <Link to="/?view=identity" className="gaming-vitals-chip">
              <span>
                <strong>{era.name}</strong>
                <span className="gaming-vitals-chip-meta">
                  {[era.estimated ? 'Estimated era' : `Day ${era.dayCount || 1}`, era.flavor]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
            </Link>
          )}

          {nextRelease && (
            <Link
              to="/?view=wishlist"
              className="gaming-vitals-chip"
              aria-label={`${nextRelease.name} ${nextRelease.daysUntil <= 0 ? 'is out today' : `releases in ${nextRelease.daysUntil} days`}`}
            >
              <CalendarClock size={15} aria-hidden="true" />
              <span>
                <strong>{nextRelease.name}</strong>
                <span className="gaming-vitals-chip-meta">
                  {nextRelease.daysUntil <= 0 ? 'Out today' : `In ${nextRelease.daysUntil} days`}
                </span>
              </span>
            </Link>
          )}

          {wishlistAlerts > 0 && (
            <Link
              to="/wishlist"
              className="gaming-vitals-chip"
              aria-label={`${wishlistAlerts} wishlist price alert${wishlistAlerts === 1 ? '' : 's'}`}
            >
              <Tag size={15} aria-hidden="true" />
              <span>
                <strong>
                  {wishlistAlerts} deal{wishlistAlerts === 1 ? '' : 's'}
                </strong>
                <span className="gaming-vitals-chip-meta">Wishlist alerts</span>
              </span>
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
