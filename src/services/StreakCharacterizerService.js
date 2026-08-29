/**
 * StreakCharacterizerService — characterizes the user's current gaming streak
 * by genre, session pattern, and timing. Turns "12 day streak" into
 * "12-day indie streak" with a roast line.
 *
 * Built on top of GamingIdentityEnhancements (GamingStreaks) and
 * SessionRepository for session history analysis.
 */

import SessionRepository from './SessionRepository';
import StorageService from './StorageService';

const STREAK_CHAR_KEY = 'gamepilot-streak-characterization';
const LAST_MILESTONE_KEY = 'gamepilot-streak-last-milestone';

const MILESTONES = [3, 7, 14, 30, 50, 100];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getStreakData = () => {
  try {
    const raw = StorageService.getString('gamepilot_gamingStreaks');
    return raw ? JSON.parse(raw) : { currentStreak: 0, longestStreak: 0, lastSessionDate: null };
  } catch {
    return { currentStreak: 0, longestStreak: 0, lastSessionDate: null };
  }
};

const getRecentSessions = (days) => {
  const history = SessionRepository.getSessionHistory();
  if (!Array.isArray(history) || history.length === 0) return [];

  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffMs = cutoff.getTime();

  return history.filter((s) => {
    const d = s.endTime ? new Date(s.endTime) : (s.startTime ? new Date(s.startTime) : null);
    return d && !Number.isNaN(d.getTime()) && d.getTime() >= cutoffMs;
  });
};

const aggregateGenres = (sessions) => {
  const counts = {};
  sessions.forEach((s) => {
    const genres = s.metadata?.genres || s.metadata?.gameGenres || [];
    if (Array.isArray(genres)) {
      genres.forEach((g) => {
        const key = String(g).toLowerCase();
        counts[key] = (counts[key] || 0) + 1;
      });
    }
  });
  return counts;
};

const aggregateGames = (sessions) => {
  const counts = {};
  sessions.forEach((s) => {
    const name = String(s.gameName || '').trim();
    if (name) counts[name] = (counts[name] || 0) + 1;
  });
  return counts;
};

const getPeakHour = (sessions) => {
  const hours = {};
  sessions.forEach((s) => {
    const d = s.endTime ? new Date(s.endTime) : (s.startTime ? new Date(s.startTime) : null);
    if (d && !Number.isNaN(d.getTime())) {
      const h = d.getHours();
      hours[h] = (hours[h] || 0) + 1;
    }
  });
  const entries = Object.entries(hours);
  if (entries.length === 0) return null;
  entries.sort(([, a], [, b]) => b - a);
  return Number(entries[0][0]);
};

const isLateNightSessions = (sessions) => {
  let lateCount = 0;
  sessions.forEach((s) => {
    const d = s.endTime ? new Date(s.endTime) : (s.startTime ? new Date(s.startTime) : null);
    if (d && !Number.isNaN(d.getTime())) {
      const h = d.getHours();
      if (h >= 0 && h <= 4) lateCount++;
    }
  });
  return lateCount > sessions.length * 0.5;
};

const isWeekendHeavy = (sessions) => {
  let weekendCount = 0;
  sessions.forEach((s) => {
    const d = s.endTime ? new Date(s.endTime) : (s.startTime ? new Date(s.startTime) : null);
    if (d && !Number.isNaN(d.getTime())) {
      const day = d.getDay();
      if (day === 0 || day === 6) weekendCount++;
    }
  });
  return weekendCount > sessions.length * 0.6;
};

const getUniqueGameCount = (sessions) => {
  const games = new Set();
  sessions.forEach((s) => {
    if (s.gameName) games.add(s.gameName);
  });
  return games.size;
};

const getTopGenre = (genreCounts) => {
  const entries = Object.entries(genreCounts);
  if (entries.length === 0) return null;
  entries.sort(([, a], [, b]) => b - a);
  return entries[0][0];
};

// ---------------------------------------------------------------------------
// Characterization
// ---------------------------------------------------------------------------

/**
 * Characterize the current streak by analyzing recent sessions.
 * Returns { days, type, label, roast } or null if no active streak.
 */
export const characterizeCurrentStreak = () => {
  const streakData = getStreakData();
  const days = Number(streakData.currentStreak) || 0;
  if (days < 2) return null;

  const sessions = getRecentSessions(Math.max(days, 7));
  if (sessions.length === 0) {
    return {
      days,
      type: 'generic',
      label: `${days}-day streak`,
      roast: `${days} days straight. The games are starting to expect you.`
    };
  }

  const genreCounts = aggregateGenres(sessions);
  const gameCounts = aggregateGames(sessions);
  const peakHour = getPeakHour(sessions);
  const uniqueGames = getUniqueGameCount(sessions);
  const lateNight = isLateNightSessions(sessions);
  const weekendHeavy = isWeekendHeavy(sessions);
  const topGenre = getTopGenre(genreCounts);
  const topGameEntries = Object.entries(gameCounts).sort(([, a], [, b]) => b - a);
  const topGame = topGameEntries[0]?.[0] || null;
  const topGameSessions = topGameEntries[0]?.[1] || 0;

  // Determine streak type
  let type = 'generic';
  let label = `${days}-day streak`;
  let roast = `${days} days straight. The games are starting to expect you.`;

  // Late-night streak
  if (lateNight && days >= 3) {
    type = 'late-night';
    label = `${days}-day late-night streak`;
    roast = days >= 14
      ? `${days} days, every session after midnight. Sleep filed a restraining order.`
      : `${days} days, every session after midnight. Sleep is temporary. Gaming is forever.`;
  }
  // Genre monopoly
  else if (topGenre && genreCounts[topGenre] >= sessions.length * 0.6) {
    type = 'genre-monopoly';
    const genreDisplay = topGenre.charAt(0).toUpperCase() + topGenre.slice(1);
    label = `${days}-day ${genreDisplay} streak`;
    roast = days >= 14
      ? `Nothing but ${genreDisplay} for ${days} days. ${genreDisplay} has consumed you.`
      : `Nothing but ${genreDisplay} for ${days} days. Variety is overrated, apparently.`;
  }
  // Single-game obsession
  else if (topGame && topGameSessions >= sessions.length * 0.7 && uniqueGames > 1) {
    type = 'single-game';
    label = `${days}-day ${topGame} streak`;
    roast = days >= 14
      ? `${days} days of ${topGame}. This is no longer gaming. This is a relationship.`
      : `${days} days, mostly ${topGame}. The other games are taking it personally.`;
  }
  // Variety streak
  else if (uniqueGames >= days * 0.7 && uniqueGames >= 5) {
    type = 'variety';
    label = `${days}-day variety streak`;
    roast = days >= 14
      ? `${days} days, ${uniqueGames} different games. Commitment issues confirmed.`
      : `${days} days, ${uniqueGames} different games. You are dating your library.`;
  }
  // Weekend warrior
  else if (weekendHeavy && days >= 7) {
    type = 'weekend';
    label = `${days}-day weekend streak`;
    roast = `Every session on weekends. ${days} days of treating weekdays as a loading screen.`;
  }

  return { days, type, label, roast, topGenre, uniqueGames, peakHour };
};

// ---------------------------------------------------------------------------
// Milestone toast — fires when a streak hits 3, 7, 14, 30, 50, 100 days
// ---------------------------------------------------------------------------

/**
 * Check if the current streak just crossed a milestone.
 * Returns { message, days, label } or null.
 * Throttled: only fires once per milestone per streak.
 */
export const checkStreakMilestone = () => {
  const char = characterizeCurrentStreak();
  if (!char) return null;

  const { days, label, roast } = char;

  // Find the highest milestone the streak has reached
  const reachedMilestone = MILESTONES.filter((m) => days >= m).pop();
  if (!reachedMilestone) return null;

  // Check if we already toasted this milestone for this streak
  const lastMilestoned = StorageService.getString(LAST_MILESTONE_KEY);
  const milestoneKey = `${reachedMilestone}:${days}`;

  // If the streak reset and started over, we allow re-firing
  // by checking if the last milestone key starts with the same milestone number
  if (lastMilestoned) {
    const [lastMilestone] = lastMilestoned.split(':');
    if (Number(lastMilestone) === reachedMilestone && lastMilestoned === milestoneKey) {
      return null;
    }
    // If we already toasted a higher milestone, don't toast a lower one
    if (Number(lastMilestone) > reachedMilestone) return null;
  }

  StorageService.setString(LAST_MILESTONE_KEY, milestoneKey);

  // Build milestone-specific message
  let message;
  if (reachedMilestone === 100) {
    message = `100-day streak. This is no longer gaming. This is devotion. ${roast}`;
  } else if (reachedMilestone === 50) {
    message = `50 days. You and the games have an understanding. ${roast}`;
  } else if (reachedMilestone === 30) {
    message = `A full month. ${roast}`;
  } else if (reachedMilestone === 14) {
    message = `Two weeks straight. ${roast}`;
  } else if (reachedMilestone === 7) {
    message = `${label}! ${roast}`;
  } else {
    message = `${label}. ${roast}`;
  }

  return { message, days, label, milestone: reachedMilestone };
};

/**
 * Get stored characterization for display (Home badge).
 */
export const getStoredStreakCharacterization = () => {
  try {
    const raw = StorageService.getString(STREAK_CHAR_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/**
 * Update and store the current streak characterization.
 */
export const updateStreakCharacterization = () => {
  const char = characterizeCurrentStreak();
  if (char) {
    StorageService.setString(STREAK_CHAR_KEY, JSON.stringify(char));
  }
  return char;
};

const StreakCharacterizerService = {
  characterizeCurrentStreak,
  checkStreakMilestone,
  getStoredStreakCharacterization,
  updateStreakCharacterization
};

export default StreakCharacterizerService;
