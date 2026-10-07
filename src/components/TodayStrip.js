import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarCheck, Flame, Tag } from 'lucide-react';
import CalendarXPService from '../services/CalendarXPService';
import WishlistService from '../services/WishlistService';
import SessionRepository from '../services/SessionRepository';
import CurrentEraService from '../services/CurrentEraService';
import { SeasonalHideAndSeekService } from '../services/SeasonalHideAndSeekService';
import { getTodayParadox } from '../services/DailyParadoxService';
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

const getCalendarStatus = () => {
  try {
    return CalendarXPService.getFullCalendarStatus();
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

const getParadox = () => {
  try {
    return getTodayParadox();
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

/**
 * A compact "today at a glance" strip for the Home Today view: check-in
 * streak, this week's play, current era, the active hide-and-seek event and a
 * teaser for the daily paradox. All local data — no network calls.
 */
export default function TodayStrip() {
  const [calendar, setCalendar] = useState(getCalendarStatus);
  const [wishlistAlerts, setWishlistAlerts] = useState(getWishlistAlerts);
  const week = useMemo(getWeekSummary, []);
  const era = useMemo(getEra, []);
  const hunt = useMemo(() => SeasonalHideAndSeekService.getActiveProgress(), []);
  const paradox = useMemo(getParadox, []);

  useEffect(() => {
    const refresh = () => setWishlistAlerts(getWishlistAlerts());
    window.addEventListener('gamepilot:wishlist-alerts', refresh);
    return () => window.removeEventListener('gamepilot:wishlist-alerts', refresh);
  }, []);

  const handleCheckin = useCallback(() => {
    const result = CalendarXPService.processDailyCheckin();
    if (result?.success || result?.alreadyCheckedIn) {
      setCalendar(getCalendarStatus());
    }
  }, []);

  const streak = calendar?.streak?.currentStreak || 0;
  const canCheckIn = calendar?.canCheckIn !== false;
  const weekTime = week ? formatWeekMinutes(week.totalMinutes) : null;

  return (
    <div className="today-strip" aria-label="Today at a glance">
      {canCheckIn ? (
        <button type="button" className="today-strip-item today-strip-checkin" onClick={handleCheckin}>
          <CalendarCheck size={15} aria-hidden="true" />
          <span>
            <strong>Check in</strong>
            {streak > 0 ? `Day ${streak} streak` : 'Start your streak'}
          </span>
        </button>
      ) : (
        <div className="today-strip-item">
          <Flame size={15} aria-hidden="true" />
          <span>
            <strong>Checked in</strong>
            {streak > 0 ? `Day ${streak} streak` : 'See you tomorrow'}
          </span>
        </div>
      )}

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

      {hunt && (
        <Link
          to="/rewards"
          className="today-strip-item"
          aria-label={`${hunt.name}: ${hunt.completed ? 'complete' : `${hunt.found.length} of ${hunt.totalItems} found`}`}
        >
          <span aria-hidden="true">{hunt.icon}</span>
          <span>
            <strong>{hunt.completed ? 'Complete!' : `${hunt.found.length} / ${hunt.totalItems}`}</strong>
            {hunt.name}
          </span>
        </Link>
      )}

      {paradox && (
        <Link to="/?view=identity" className="today-strip-teaser">
          <span aria-hidden="true">{paradox.categoryIcon}</span> Today's paradox: {paradox.title}{' '}
          <ArrowRight size={13} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
