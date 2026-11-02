import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Tag, CalendarClock } from 'lucide-react';
import WishlistService from '../services/WishlistService';
import ReleaseTrackerService, { WISHLIST_RELEASES_EVENT } from '../services/ReleaseTrackerService';
import SessionRepository from '../services/SessionRepository';
import CurrentEraService from '../services/CurrentEraService';
import './TodayStrip.css';

const formatWeekMinutes = (minutes) => {
  if (!minutes || minutes <= 0) return null;
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
};

const getWeekSummary = () => {
  try {
    const history = SessionRepository.getSessionHistory();
    if (!Array.isArray(history)) return null;
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weekSessions = history.filter((session) => {
      const ts = new Date(session.endTime || session.timestamp || 0).getTime();
      return Number.isFinite(ts) && ts >= weekAgo;
    });
    if (weekSessions.length === 0) return null;
    const totalMinutes = weekSessions.reduce(
      (sum, session) =>
        sum +
        Math.max(
          0,
          Math.round(
            Number(session.playtimeMinutes ?? session.playtime ?? session.duration ?? session.minutes ?? 0) || 0
          )
        ),
      0
    );
    return { sessions: weekSessions.length, totalMinutes };
  } catch {
    return null;
  }
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

// Next day-precision release within two weeks — the only kind worth a strip chip.
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

/**
 * A compact "today at a glance" strip for the Home Today view: this week's
 * play, the current era and wishlist price alerts. All local data — no
 * network calls.
 */
export default function TodayStrip() {
  const [wishlistAlerts, setWishlistAlerts] = useState(getWishlistAlerts);
  const [nextRelease, setNextRelease] = useState(() => getUpcomingRelease(ReleaseTrackerService.getSummary()));
  const week = useMemo(getWeekSummary, []);
  const era = useMemo(getEra, []);

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

  const weekTime = week ? formatWeekMinutes(week.totalMinutes) : null;

  return (
    <div className="today-strip" aria-label="Today at a glance">
      {week && (
        <Link to="/?view=activity" className="today-strip-item">
          <span>
            <strong>
              {week.sessions} session{week.sessions === 1 ? '' : 's'}
              {weekTime ? ` · ${weekTime}` : ''}
            </strong>
            This week
          </span>
        </Link>
      )}

      {era && (
        <Link to="/?view=identity" className="today-strip-item">
          <span>
            <strong>{era.name}</strong>
            {era.estimated ? 'Estimated from library' : `Day ${era.dayCount}`}
          </span>
        </Link>
      )}

      {nextRelease && (
        <Link
          to="/?view=wishlist"
          className="today-strip-item"
          aria-label={`${nextRelease.name} ${nextRelease.daysUntil <= 0 ? 'is out today' : `releases in ${nextRelease.daysUntil} days`}`}
        >
          <CalendarClock size={15} aria-hidden="true" />
          <span>
            <strong>{nextRelease.name}</strong>
            {nextRelease.daysUntil <= 0 ? 'Out today' : `In ${nextRelease.daysUntil} days`}
          </span>
        </Link>
      )}

      {wishlistAlerts > 0 && (
        <Link
          to="/wishlist"
          className="today-strip-item"
          aria-label={`${wishlistAlerts} wishlist price alert${wishlistAlerts === 1 ? '' : 's'}`}
        >
          <Tag size={15} aria-hidden="true" />
          <span>
            <strong>
              {wishlistAlerts} deal{wishlistAlerts === 1 ? '' : 's'}
            </strong>
            Wishlist alerts
          </span>
        </Link>
      )}
    </div>
  );
}
