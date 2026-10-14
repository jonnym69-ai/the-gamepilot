import React from 'react';
import SessionRepository from '../services/SessionRepository';
import CurrentEraService from '../services/CurrentEraService';
import HabitTrackerService from '../services/HabitTrackerService';
import { formatPlaytime } from '../utils/formatPlaytime';
import './MonthlyRecapStrip.css';

const getSessionTs = (s) => {
  const raw = s?.endTime || s?.timestamp || s?.startTime || s?.date;
  if (!raw) return 0;
  const t = typeof raw === 'number' ? raw : new Date(raw).getTime();
  return Number.isFinite(t) ? t : 0;
};

const getSessionMinutes = (s) =>
  Math.max(0, Math.round(Number(s?.playtimeMinutes ?? s?.playtime ?? s?.duration ?? s?.minutes ?? 0) || 0));

const formatHours = formatPlaytime;

/**
 * Rolling monthly recap for Today — the current calendar month's totals from
 * locally recorded sessions only. Hides when the month has no sessions yet
 * (the "no data" state is handled by the story section's other cards).
 */
export default function MonthlyRecapStrip() {
  const recap = React.useMemo(() => {
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const monthName = now.toLocaleDateString(undefined, { month: 'long' });

      const sessions = (SessionRepository.getSessionHistory() || []).filter((s) => {
        const ts = getSessionTs(s);
        return ts >= monthStart && ts <= Date.now();
      });
      if (sessions.length === 0) return null;

      let totalMinutes = 0;
      const days = new Set();
      const byGame = new Map();
      let longestSession = { minutes: 0, name: null };

      sessions.forEach((s) => {
        const minutes = getSessionMinutes(s);
        totalMinutes += minutes;
        const ts = getSessionTs(s);
        if (ts) days.add(new Date(ts).toDateString());
        const name = s.gameName || s.gameId || 'Unknown';
        byGame.set(name, (byGame.get(name) || 0) + minutes);
        if (minutes > longestSession.minutes) longestSession = { minutes, name };
      });

      const topGame = [...byGame.entries()].sort((a, b) => b[1] - a[1])[0] || null;

      let eraName = null;
      try {
        const era = CurrentEraService.getCurrentEra();
        if (era?.snapshot?.totalMinutes > 0) eraName = era.name;
      } catch {
        /* ignore */
      }

      let streak = 0;
      try {
        streak = HabitTrackerService.getStreaks()?.current || 0;
      } catch {
        /* ignore */
      }

      return {
        monthName,
        totalMinutes,
        sessionCount: sessions.length,
        daysPlayed: days.size,
        topGame: topGame ? { name: topGame[0], minutes: topGame[1] } : null,
        longestSession: longestSession.minutes > 0 ? longestSession : null,
        eraName,
        streak,
      };
    } catch {
      return null;
    }
  }, []);

  if (!recap) return null;

  return (
    <div className="monthly-recap-strip" aria-label={`${recap.monthName} recap so far`}>
      <p className="monthly-recap-eyebrow">{recap.monthName} so far</p>
      <div className="monthly-recap-stats">
        <span className="monthly-recap-stat">
          <strong>{formatHours(recap.totalMinutes)}</strong> played
        </span>
        <span className="monthly-recap-stat">
          <strong>{recap.sessionCount}</strong> session{recap.sessionCount === 1 ? '' : 's'}
        </span>
        <span className="monthly-recap-stat">
          <strong>{recap.daysPlayed}</strong> day{recap.daysPlayed === 1 ? '' : 's'} in
        </span>
        {recap.streak > 0 && (
          <span className="monthly-recap-stat">
            <strong>{recap.streak}</strong>-day streak
          </span>
        )}
      </div>
      <p className="monthly-recap-detail">
        {recap.topGame && (
          <>
            Led by <strong>{recap.topGame.name}</strong> ({formatHours(recap.topGame.minutes)})
          </>
        )}
        {recap.longestSession && recap.longestSession.name !== recap.topGame?.name && (
          <>
            {recap.topGame ? ' · ' : ''}Longest sit: {recap.longestSession.name} (
            {formatHours(recap.longestSession.minutes)})
          </>
        )}
        {recap.eraName && <> · {recap.eraName}</>}
      </p>
    </div>
  );
}
