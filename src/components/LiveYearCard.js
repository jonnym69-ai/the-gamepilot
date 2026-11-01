import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, EyeOff } from 'lucide-react';
import SessionRepository from '../services/SessionRepository';
import StorageService from '../services/StorageService';
import { formatPlaytime } from '../utils/formatPlaytime';
import './LiveYearCard.css';

const HIDDEN_KEY = 'liveYearCounterHiddenV1';
const DAY_MS = 24 * 60 * 60 * 1000;

const getSessionTs = (s) => {
  const raw = s?.endTime || s?.timestamp || s?.startTime || s?.date;
  if (!raw) return 0;
  const t = typeof raw === 'number' ? raw : new Date(raw).getTime();
  return Number.isFinite(t) ? t : 0;
};

const getSessionMinutes = (s) =>
  Math.max(0, Math.round(Number(s?.playtimeMinutes ?? s?.playtime ?? s?.duration ?? s?.minutes ?? 0) || 0));

/**
 * Aggregate the current calendar year plus a pace comparison against prior
 * tracked years. Exported for tests. Returns null when the year has no
 * recorded minutes (nothing worth counting yet).
 */
export const buildYearRecap = (sessions, now = new Date()) => {
  const year = now.getFullYear();
  const yearStart = new Date(year, 0, 1).getTime();
  const yearEnd = new Date(year + 1, 0, 1).getTime();
  const dayOfYear = Math.max(1, Math.floor((now.getTime() - yearStart) / DAY_MS) + 1);
  const daysInYear = Math.round((yearEnd - yearStart) / DAY_MS);

  let totalMinutes = 0;
  let sessionCount = 0;
  const days = new Set();
  const games = new Set();
  const byGame = new Map();
  const priorYearMinutes = {};

  (Array.isArray(sessions) ? sessions : []).forEach((s) => {
    const ts = getSessionTs(s);
    if (!ts || ts >= yearEnd) return;
    const sessionYear = new Date(ts).getFullYear();
    const minutes = getSessionMinutes(s);
    if (sessionYear === year) {
      sessionCount += 1;
      if (minutes <= 0) return;
      totalMinutes += minutes;
      days.add(new Date(ts).toDateString());
      const name = s.gameName || s.gameId || 'Unknown';
      games.add(name);
      byGame.set(name, (byGame.get(name) || 0) + minutes);
    } else if (sessionYear < year && minutes > 0) {
      priorYearMinutes[sessionYear] = (priorYearMinutes[sessionYear] || 0) + minutes;
    }
  });

  if (totalMinutes <= 0) return null;

  const topGame = [...byGame.entries()].sort((a, b) => b[1] - a[1])[0] || null;

  // Pace check: project the current rate across the full year and compare with
  // the best prior year that has tracked sessions. Only surfaces when ahead —
  // trailing years simply get no pace line rather than a judgement.
  const projected = totalMinutes * (daysInYear / dayOfYear);
  const bestPrior = Object.entries(priorYearMinutes).sort((a, b) => b[1] - a[1])[0] || null;
  const onBestPace = bestPrior ? projected > bestPrior[1] : false;

  return {
    year,
    totalMinutes,
    sessionCount,
    gamesPlayed: games.size,
    daysIn: days.size,
    topGame: topGame ? { name: topGame[0], minutes: topGame[1] } : null,
    onBestPace,
  };
};

/**
 * Live "your year so far" counter for Today — locally recorded sessions only.
 * Dismissible per calendar year: hiding it in October brings it back in
 * January when the counter itself resets.
 */
export default function LiveYearCard() {
  const [hiddenYear, setHiddenYear] = React.useState(() => StorageService.getString(HIDDEN_KEY));

  const recap = React.useMemo(() => {
    try {
      return buildYearRecap(SessionRepository.getSessionHistory());
    } catch {
      return null;
    }
  }, []);

  if (!recap || hiddenYear === String(recap.year)) return null;

  const handleHide = () => {
    StorageService.setString(HIDDEN_KEY, String(recap.year));
    setHiddenYear(String(recap.year));
  };

  return (
    <div className="live-year-card" aria-label={`${recap.year} so far`}>
      <div className="live-year-card-head">
        <p className="live-year-eyebrow">{recap.year} so far</p>
        <button
          type="button"
          className="live-year-hide"
          onClick={handleHide}
          aria-label={`Hide the ${recap.year} counter until next year`}
          title="Hide until next year"
        >
          <EyeOff size={14} aria-hidden="true" />
        </button>
      </div>
      <div className="live-year-stats">
        <span className="live-year-stat">
          <strong>{formatPlaytime(recap.totalMinutes)}</strong> played
        </span>
        <span className="live-year-stat">
          <strong>{recap.sessionCount}</strong> session{recap.sessionCount === 1 ? '' : 's'}
        </span>
        <span className="live-year-stat">
          <strong>{recap.gamesPlayed}</strong> game{recap.gamesPlayed === 1 ? '' : 's'}
        </span>
        <span className="live-year-stat">
          <strong>{recap.daysIn}</strong> day{recap.daysIn === 1 ? '' : 's'} in
        </span>
      </div>
      <p className="live-year-detail">
        {recap.topGame && (
          <>
            Led by <strong>{recap.topGame.name}</strong> ({formatPlaytime(recap.topGame.minutes)})
          </>
        )}
        {recap.onBestPace && <> · on pace for your biggest year yet</>}
        {' · '}
        <Link to="/gaming-life" className="live-year-link">
          See your gaming life <ArrowRight size={13} aria-hidden="true" />
        </Link>
      </p>
    </div>
  );
}
