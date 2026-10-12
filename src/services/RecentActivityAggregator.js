/**
 * RecentActivityAggregator
 *
 * Filters session history to the last X days and computes detailed breakdowns:
 * - Overview stats (total playtime, sessions, averages, unique games, top game, busiest day)
 * - Per-day timeline (playtime per day, with per-game segments)
 * - Per-game breakdown (sessions, total minutes, avg, first/last played)
 * - Genre breakdown
 * - Platform breakdown
 * - Time-of-day breakdown
 * - Session length distribution
 * - Mood breakdown
 *
 * All data comes from PlaytimeAutoLogger.getSessionHistory() — no new storage.
 */

import { PlaytimeAutoLogger } from './PlaytimeAutoLogger';

const SESSION_LENGTH_BUCKETS = [
  { label: 'Short (<30m)', min: 0, max: 30 },
  { label: 'Medium (30m–2h)', min: 30, max: 120 },
  { label: 'Long (2h+)', min: 120, max: Infinity },
];

const TIME_OF_DAY_BUCKETS = [
  { label: 'Morning (6–12)', start: 6, end: 12 },
  { label: 'Afternoon (12–18)', start: 12, end: 18 },
  { label: 'Evening (18–24)', start: 18, end: 24 },
  { label: 'Night (0–6)', start: 0, end: 6 },
];

/**
 * Get the start of a day (midnight) for a Date, respecting local timezone.
 */
const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Format minutes into a human-readable duration string.
 */
export const formatDuration = (minutes) => {
  if (!minutes || minutes <= 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

/**
 * Get the timestamp for a session, handling legacy field aliases.
 */
const getSessionTimestamp = (session) => {
  if (!session) return null;
  const ts = session.endTime || session.timestamp || session.ended_at || session.startTime || session.date;
  if (!ts) return null;
  const date = new Date(ts);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * Get the start time for a session, handling legacy field aliases.
 */
const getSessionStartTime = (session) => {
  if (!session) return null;
  const ts = session.startTime || session.timestamp || session.endTime || session.date;
  if (!ts) return null;
  const date = new Date(ts);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * Get the playtime minutes for a session, handling legacy field aliases.
 */
const getPlaytimeMinutes = (session) => {
  if (!session) return 0;
  const minutes = session.playtimeMinutes ?? session.playtime ?? session.duration ?? session.minutes ?? 0;
  const parsed = Number(minutes);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

/**
 * Get the game name for a session.
 */
const getGameName = (session) => session?.gameName || session?.game || 'Unknown';

/**
 * Get the platform for a session.
 */
const getPlatform = (session) => session?.platform || session?.source || 'Unknown';

/**
 * Get the genres for a session (always returns an array).
 */
const getGenres = (session) => {
  if (Array.isArray(session?.genres)) return session.genres.filter(Boolean);
  if (typeof session?.genres === 'string')
    return session.genres
      .split(',')
      .map((g) => g.trim())
      .filter(Boolean);
  return [];
};

/**
 * Get the mood for a session, falling back to genre-derived mood.
 */
const getMood = (session) => session?.mood || null;

/**
 * Filter sessions to those that ended within the last `days` days.
 * Sessions are filtered by their end timestamp (or start timestamp as fallback).
 * Deduplicates by sessionId to avoid double-counting.
 */
const filterSessionsByDays = (allSessions, days) => {
  const now = startOfDay(new Date());
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days + 1);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const seenIds = new Set();
  const filtered = [];

  for (const session of allSessions) {
    if (!session) continue;

    // Deduplicate by sessionId
    const sid = session.sessionId || session.id;
    if (sid) {
      if (seenIds.has(sid)) continue;
      seenIds.add(sid);
    }

    const ts = getSessionTimestamp(session);
    if (!ts) continue;

    // Only include sessions that ended on or after the cutoff date
    if (ts >= cutoff && ts < tomorrow) {
      filtered.push(session);
    }
  }

  return filtered;
};

/**
 * Get the date key (YYYY-MM-DD) for a session timestamp, in local timezone.
 */
const getDateKey = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Build an array of date keys for the last `days` days (oldest first, today last).
 */
const buildDateRange = (days) => {
  const dates = [];
  const today = startOfDay(new Date());
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(getDateKey(d));
  }
  return dates;
};

/**
 * Aggregate sessions into a comprehensive breakdown for the last X days.
 *
 * @param {number} days - Number of days to look back (default 30)
 * @returns {object} Aggregated data with all breakdowns
 */
export const buildRecentActivityBreakdown = (days = 30) => {
  const allSessions = PlaytimeAutoLogger.getSessionHistory();
  const sessions = filterSessionsByDays(allSessions, days);
  const dateRange = buildDateRange(days);

  // --- Overview stats ---
  let totalPlaytimeMinutes = 0;
  let totalSessions = 0;
  const uniqueGameNames = new Set();
  const gameStats = {}; // gameName -> { sessions, totalMinutes, firstPlayed, lastPlayed }
  const dailyStats = {}; // dateKey -> { totalMinutes, sessions, games: { gameName: minutes } }
  const genreCounts = {};
  const platformCounts = {};
  const moodCounts = {};
  const timeOfDayCounts = { 'Morning (6–12)': 0, 'Afternoon (12–18)': 0, 'Evening (18–24)': 0, 'Night (0–6)': 0 };
  const sessionLengthCounts = { 'Short (<30m)': 0, 'Medium (30m–2h)': 0, 'Long (2h+)': 0 };

  // Initialize daily stats with all dates in range (so empty days show up)
  dateRange.forEach((dateKey) => {
    dailyStats[dateKey] = { totalMinutes: 0, sessions: 0, games: {} };
  });

  for (const session of sessions) {
    const minutes = getPlaytimeMinutes(session);
    const gameName = getGameName(session);
    const ts = getSessionTimestamp(session);
    const startTs = getSessionStartTime(session);
    const dateKey = ts ? getDateKey(ts) : null;
    const platform = getPlatform(session);
    const genres = getGenres(session);
    const mood = getMood(session);

    totalPlaytimeMinutes += minutes;
    totalSessions += 1;
    uniqueGameNames.add(gameName);

    // Per-game stats
    if (!gameStats[gameName]) {
      gameStats[gameName] = {
        name: gameName,
        sessions: 0,
        totalMinutes: 0,
        firstPlayed: ts,
        lastPlayed: ts,
      };
    }
    const gs = gameStats[gameName];
    gs.sessions += 1;
    gs.totalMinutes += minutes;
    if (ts) {
      if (!gs.firstPlayed || ts < gs.firstPlayed) gs.firstPlayed = ts;
      if (!gs.lastPlayed || ts > gs.lastPlayed) gs.lastPlayed = ts;
    }

    // Per-day stats
    if (dateKey && dailyStats[dateKey]) {
      dailyStats[dateKey].totalMinutes += minutes;
      dailyStats[dateKey].sessions += 1;
      dailyStats[dateKey].games[gameName] = (dailyStats[dateKey].games[gameName] || 0) + minutes;
    }

    // Genre breakdown
    genres.forEach((genre) => {
      genreCounts[genre] = (genreCounts[genre] || 0) + minutes;
    });

    // Platform breakdown
    platformCounts[platform] = (platformCounts[platform] || 0) + minutes;

    // Mood breakdown
    if (mood) {
      moodCounts[mood] = (moodCounts[mood] || 0) + minutes;
    }

    // Time of day (based on start hour)
    if (startTs) {
      const startHour = startTs.getHours();
      for (const bucket of TIME_OF_DAY_BUCKETS) {
        if (startHour >= bucket.start && startHour < bucket.end) {
          timeOfDayCounts[bucket.label] += minutes;
          break;
        }
      }
    }

    // Session length distribution
    for (const bucket of SESSION_LENGTH_BUCKETS) {
      if (minutes >= bucket.min && minutes < bucket.max) {
        sessionLengthCounts[bucket.label] += 1;
        break;
      }
    }
  }

  // --- Derived stats ---
  const avgSessionMinutes = totalSessions > 0 ? Math.round(totalPlaytimeMinutes / totalSessions) : 0;
  const uniqueGames = uniqueGameNames.size;

  // Top game by total minutes
  const sortedGames = Object.values(gameStats).sort((a, b) => b.totalMinutes - a.totalMinutes);
  const topGame = sortedGames[0] || null;

  // Busiest day by total minutes
  const sortedDays = dateRange
    .map((dateKey) => ({
      dateKey,
      ...dailyStats[dateKey],
    }))
    .sort((a, b) => b.totalMinutes - a.totalMinutes);
  const busiestDay = sortedDays[0] || null;

  // Per-day timeline (oldest first, for charting)
  const dailyTimeline = dateRange.map((dateKey) => ({
    dateKey,
    label: new Date(dateKey).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    totalMinutes: dailyStats[dateKey].totalMinutes,
    sessions: dailyStats[dateKey].sessions,
    games: dailyStats[dateKey].games,
  }));

  // Per-game breakdown (sorted by total minutes descending)
  const perGameBreakdown = sortedGames.map((gs) => ({
    ...gs,
    avgSessionMinutes: gs.sessions > 0 ? Math.round(gs.totalMinutes / gs.sessions) : 0,
    firstPlayedLabel: gs.firstPlayed
      ? new Date(gs.firstPlayed).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      : '—',
    lastPlayedLabel: gs.lastPlayed
      ? new Date(gs.lastPlayed).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      : '—',
  }));

  // Active days (days with at least 1 session)
  const activeDays = dateRange.filter((dateKey) => dailyStats[dateKey].sessions > 0).length;

  return {
    days,
    dateRange,
    overview: {
      totalPlaytimeMinutes,
      totalPlaytimeLabel: formatDuration(totalPlaytimeMinutes),
      totalSessions,
      avgSessionMinutes,
      avgSessionLabel: formatDuration(avgSessionMinutes),
      uniqueGames,
      activeDays,
      topGame: topGame
        ? { name: topGame.name, totalMinutes: topGame.totalMinutes, totalLabel: formatDuration(topGame.totalMinutes) }
        : null,
      busiestDay: busiestDay
        ? {
            dateKey: busiestDay.dateKey,
            label: new Date(busiestDay.dateKey).toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            }),
            totalMinutes: busiestDay.totalMinutes,
            totalLabel: formatDuration(busiestDay.totalMinutes),
            sessions: busiestDay.sessions,
          }
        : null,
    },
    dailyTimeline,
    perGameBreakdown,
    genreCounts,
    platformCounts,
    moodCounts,
    timeOfDayCounts,
    sessionLengthCounts,
    hasData: totalSessions > 0,
  };
};
