/**
 * RivalryService — detects when two games are "competing" for the user's time
 * and generates roasts about it. A rivalry is defined as two games both played
 * in the same time period (week/month) with meaningful session counts.
 *
 * All local, no backend. Built on SessionRepository.
 */

import SessionRepository from './SessionRepository';
import StorageService from './StorageService';

const RIVALRY_KEY = 'gamepilot-rivalries';
const LAST_TOAST_KEY = 'gamepilot-rivalry-last-toast';

// ---------------------------------------------------------------------------
// Period helpers
// ---------------------------------------------------------------------------

const getWeekStart = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
};

const getWeekKey = (date = new Date()) => {
  const d = getWeekStart(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ---------------------------------------------------------------------------
// Aggregate playtime per game within a period
// ---------------------------------------------------------------------------

const aggregateGamePlaytime = (history, periodStartMs) => {
  const totals = {};

  history.forEach((session) => {
    const sessionDate = session.endTime ? new Date(session.endTime) : (session.startTime ? new Date(session.startTime) : null);
    if (!sessionDate || Number.isNaN(sessionDate.getTime())) return;
    if (sessionDate.getTime() < periodStartMs) return;

    const name = String(session.gameName || '').trim();
    if (!name) return;

    if (!totals[name]) {
      totals[name] = { name, minutes: 0, sessions: 0 };
    }
    totals[name].minutes += Number(session.playtimeMinutes) || 0;
    totals[name].sessions += 1;
  });

  return Object.values(totals).sort((a, b) => b.minutes - a.minutes);
};

// ---------------------------------------------------------------------------
// Rivalry detection
// ---------------------------------------------------------------------------

const MIN_SESSIONS_PER_GAME = 2;
const MIN_GAMES_FOR_RIVALRY = 2;

/**
 * Detect rivalries for the current week.
 * Returns array of rivalries sorted by competitiveness (closest hour margin first).
 */
export const detectRivalries = (history = null) => {
  const sessions = history || SessionRepository.getSessionHistory();
  if (!Array.isArray(sessions) || sessions.length === 0) return [];

  const weekStart = getWeekStart();
  const weekStartMs = weekStart.getTime();
  const totals = aggregateGamePlaytime(sessions, weekStartMs);

  // Need at least 2 games with enough sessions this week
  const eligible = totals.filter((g) => g.sessions >= MIN_SESSIONS_PER_GAME);
  if (eligible.length < MIN_GAMES_FOR_RIVALRY) return [];

  // Find the top 2 games by playtime
  const [top, second] = eligible;
  if (!top || !second) return [];

  const marginMinutes = top.minutes - second.minutes;
  const totalMinutes = top.minutes + second.minutes;

  // Only call it a rivalry if the margin is reasonable (not a blowout)
  // Margin should be less than 50% of the leader's playtime
  if (top.minutes > 0 && marginMinutes / top.minutes > 0.5) return [];

  return [{
    gameA: top.name,
    gameB: second.name,
    gameAMinutes: top.minutes,
    gameBMinutes: second.minutes,
    marginMinutes,
    totalMinutes,
    weekKey: getWeekKey(),
    winner: top.minutes > second.minutes ? top.name : second.name,
    rounds: countRivalryRounds(top.name, second.name)
  }];
};

/**
 * Count how many consecutive weeks both games have appeared in the top 2.
 */
const countRivalryRounds = (gameA, gameB) => {
  const stored = getStoredRivalries();
  let rounds = 1;

  // Check stored history for consecutive weeks
  const sorted = stored
    .filter((r) =>
      (r.gameA === gameA && r.gameB === gameB) ||
      (r.gameA === gameB && r.gameB === gameA)
    )
    .sort((a, b) => b.weekKey.localeCompare(a.weekKey));

  const currentWeek = getWeekKey();
  let expectedWeek = currentWeek;

  for (const r of sorted) {
    if (r.weekKey === expectedWeek) {
      // Skip current week (already counted as round 1)
      if (expectedWeek === currentWeek) {
        expectedWeek = getPreviousWeekKey(expectedWeek);
        continue;
      }
      rounds += 1;
      expectedWeek = getPreviousWeekKey(expectedWeek);
    } else {
      break;
    }
  }

  return rounds;
};

const getPreviousWeekKey = (weekKey) => {
  const [y, m, d] = weekKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 7);
  return getWeekKey(date);
};

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

const getStoredRivalries = () => {
  try {
    const raw = StorageService.getString(RIVALRY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveStoredRivalries = (rivalries) => {
  StorageService.setString(RIVALRY_KEY, JSON.stringify(rivalries.slice(-100)));
};

/**
 * Persist current week's rivalry for history tracking.
 */
export const recordRivalry = (rivalry) => {
  if (!rivalry) return;
  const stored = getStoredRivalries();
  const existingIdx = stored.findIndex(
    (r) => r.weekKey === rivalry.weekKey &&
      ((r.gameA === rivalry.gameA && r.gameB === rivalry.gameB) ||
       (r.gameA === rivalry.gameB && r.gameB === rivalry.gameA))
  );
  if (existingIdx >= 0) {
    stored[existingIdx] = { ...stored[existingIdx], ...rivalry };
  } else {
    stored.push(rivalry);
  }
  saveStoredRivalries(stored);
};

// ---------------------------------------------------------------------------
// Toast generation
// ---------------------------------------------------------------------------

const formatHours = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

/**
 * Generate a rivalry toast message.
 * Returns null if no active rivalry or if already toasted today.
 */
export const generateRivalryToast = () => {
  const rivalries = detectRivalries();
  if (rivalries.length === 0) return null;

  const rivalry = rivalries[0];

  // Record for history
  recordRivalry(rivalry);

  // Throttle: only one rivalry toast per day
  const lastToast = StorageService.getString(LAST_TOAST_KEY);
  const today = new Date().toISOString().split('T')[0];
  if (lastToast === today) return null;
  StorageService.setString(LAST_TOAST_KEY, today);

  const leader = rivalry.gameAMinutes >= rivalry.gameBMinutes ? rivalry.gameA : rivalry.gameB;
  const trailer = rivalry.gameAMinutes >= rivalry.gameBMinutes ? rivalry.gameB : rivalry.gameA;
  const leaderMin = Math.max(rivalry.gameAMinutes, rivalry.gameBMinutes);
  const trailerMin = Math.min(rivalry.gameAMinutes, rivalry.gameBMinutes);
  const margin = formatHours(leaderMin - trailerMin);
  const rounds = rivalry.rounds;

  const messages = [
    `${rivalry.gameA} vs ${rivalry.gameB}: Round ${rounds}. ${leader} is winning by ${margin} this week.`,
    `${leader} and ${trailer} are fighting for your attention. ${leader} leads by ${margin}. Your call.`,
    `Two games enter, one leaves. ${leader} vs ${trailer} — ${leader} up by ${margin} this week.`,
    rounds > 2
      ? `${rivalry.gameA} vs ${rivalry.gameB}: Round ${rounds}. This is getting personal. ${leader} leads by ${margin}.`
      : `${rivalry.gameA} vs ${rivalry.gameB}: ${leader} leads by ${margin}. The throne is contested.`
  ];

  return {
    message: messages[Math.floor(Date.now() / 1000) % messages.length],
    rivalry
  };
};

/**
 * Get the current active rivalry for display (Home banner).
 */
export const getActiveRivalry = () => {
  const rivalries = detectRivalries();
  if (rivalries.length === 0) return null;
  recordRivalry(rivalries[0]);
  return rivalries[0];
};

/**
 * Get rivalry history for Profile page.
 */
export const getRivalryHistory = () => {
  return getStoredRivalries().sort((a, b) => b.weekKey.localeCompare(a.weekKey));
};

const RivalryService = {
  detectRivalries,
  generateRivalryToast,
  getActiveRivalry,
  getRivalryHistory,
  recordRivalry
};

export default RivalryService;
