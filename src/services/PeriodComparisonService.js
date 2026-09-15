// PeriodComparisonService.js
// Year-over-year comparison for the Pro "Year in Contrast" card: the current
// year-to-date versus the same stretch of last year. Pure functions over
// normalized sessions ({ timestamp: Date, playtimeMinutes, gameName }) so the
// maths is testable without storage or the DOM.

const DAY_MS = 24 * 60 * 60 * 1000;

const dateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const getMinutes = (session) => {
  const raw = Number(session?.playtimeMinutes ?? session?.duration ?? 0);
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
};

const summarizeWindow = (sessions, from, to) => {
  const minutesByGame = new Map();
  const days = new Set();
  let minutes = 0;
  let count = 0;

  sessions.forEach((session) => {
    const ts =
      session?.timestamp instanceof Date ? session.timestamp.getTime() : new Date(session?.timestamp).getTime();
    if (!Number.isFinite(ts) || ts < from.getTime() || ts > to.getTime()) return;
    const mins = getMinutes(session);
    if (mins <= 0) return;

    minutes += mins;
    count += 1;
    days.add(dateKey(new Date(ts)));

    const name = session.gameName || session.gameId || 'Unknown';
    minutesByGame.set(name, (minutesByGame.get(name) || 0) + mins);
  });

  const topEntry = [...minutesByGame.entries()].sort((a, b) => b[1] - a[1])[0] || null;

  return {
    minutes,
    hours: Math.round((minutes / 60) * 10) / 10,
    sessions: count,
    activeDays: days.size,
    games: minutesByGame.size,
    topGame: topEntry ? { name: topEntry[0], hours: Math.round((topEntry[1] / 60) * 10) / 10 } : null,
  };
};

const percentDelta = (current, previous) => {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
};

export class PeriodComparisonService {
  /**
   * Compare year-to-date with the same calendar stretch of the previous year.
   * Returns null when there is no usable data at all.
   */
  static buildYearOverYear(normalizedSessions, now = new Date()) {
    const sessions = Array.isArray(normalizedSessions) ? normalizedSessions : [];

    const currentYear = now.getFullYear();
    const currentStart = new Date(currentYear, 0, 1);
    const previousStart = new Date(currentYear - 1, 0, 1);
    // Same stretch last year: Jan 1 → today's month/day, clamped for leap years.
    const previousEnd = new Date(currentYear - 1, now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const current = summarizeWindow(sessions, currentStart, now);
    const previous = summarizeWindow(sessions, previousStart, previousEnd);

    if (current.sessions === 0 && previous.sessions === 0) return null;

    return {
      currentYear,
      previousYear: currentYear - 1,
      daysIntoYear: Math.floor((now - currentStart) / DAY_MS) + 1,
      current,
      previous,
      deltas: {
        hours: percentDelta(current.minutes, previous.minutes),
        sessions: percentDelta(current.sessions, previous.sessions),
        activeDays: percentDelta(current.activeDays, previous.activeDays),
        games: percentDelta(current.games, previous.games),
      },
    };
  }
}

export default PeriodComparisonService;
