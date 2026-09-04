/**
 * SmartNudgeService - Generates gentle, non-naggy reminders about dormant games.
 *
 * Finds games the user used to play but hasn't touched in a while, and surfaces
 * a single nudge on the Home page. Only shows one nudge per day, and only if
 * there's a genuinely interesting candidate (not just "you haven't played
 * something you played once for 5 minutes").
 */

import StorageService from './StorageService';

const SEEN_KEY = 'smartNudgeLastShown';
const DISMISS_KEY = 'smartNudgeDismissed';

const DAYS_THRESHOLD = 14;
const MIN_PLAYTIME_MINUTES = 60; // Only nudge about games they actually played

/**
 * Find the best dormant game to nudge about.
 * Returns null if no good candidate exists.
 */
function findDormantNudge(library = []) {
  if (!Array.isArray(library) || library.length === 0) return null;

  const now = Date.now();
  const candidates = [];

  for (const game of library) {
    if (!game?.name || !game?.last_played) continue;
    const playtime = Number(game.time_played) || 0;
    if (playtime < MIN_PLAYTIME_MINUTES) continue;

    const lastPlayed = new Date(game.last_played).getTime();
    if (Number.isNaN(lastPlayed)) continue;

    const daysSince = Math.floor((now - lastPlayed) / (1000 * 60 * 60 * 24));
    if (daysSince < DAYS_THRESHOLD) continue;

    // Don't nudge about hidden games
    if (game.isHidden) continue;

    // Don't nudge about completed/abandoned games
    const status = game.completionStatus;
    if (status === 'completed' || status === '100%' || status === 'abandoned') continue;

    candidates.push({ game, daysSince, playtime });
  }

  if (candidates.length === 0) return null;

  // Score: prefer games with more playtime and longer dormancy
  candidates.sort((a, b) => {
    const aScore = a.playtime * 0.4 + a.daysSince * 0.6;
    const bScore = b.playtime * 0.4 + b.daysSince * 0.6;
    return bScore - aScore;
  });

  // Rotate the top pick daily so the same game isn't always shown
  const topPool = candidates.slice(0, Math.min(5, candidates.length));
  const daySeed = new Date().toISOString().slice(0, 10);
  const seedNumber = Array.from(daySeed).reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 0);
  const pickIndex = Math.abs(seedNumber) % topPool.length;

  const picked = topPool[pickIndex];
  const game = picked.game;
  const hours = Math.floor(picked.playtime / 60);
  const mins = picked.playtime % 60;

  let timeStr;
  if (hours > 0) {
    timeStr = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  } else {
    timeStr = `${mins}m`;
  }

  let timeAgoStr;
  const days = picked.daysSince;
  if (days < 30) timeAgoStr = `${days} days`;
  else if (days < 60) timeAgoStr = 'about a month';
  else if (days < 365) timeAgoStr = `${Math.floor(days / 30)} months`;
  else timeAgoStr = `${Math.floor(days / 365)} year${Math.floor(days / 365) > 1 ? 's' : ''}`;

  return {
    game,
    daysSince: days,
    timeStr,
    timeAgoStr,
    message: `You spent ${timeStr} in ${game.name} but haven't touched it in ${timeAgoStr}.`,
  };
}

function getDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

/**
 * Get today's nudge if one should be shown.
 * Returns null if already shown today, dismissed, or no candidate.
 */
function getNudge(library = []) {
  const dismissed = StorageService.get(DISMISS_KEY, false);
  if (dismissed) return null;

  const lastShown = StorageService.getString(SEEN_KEY, '');
  const todayKey = getDayKey();
  if (lastShown === todayKey) return null;

  const nudge = findDormantNudge(library);
  if (!nudge) return null;

  return nudge;
}

/**
 * Mark today's nudge as shown (so it doesn't reappear on re-renders).
 */
function markShown() {
  StorageService.setString(SEEN_KEY, getDayKey());
}

/**
 * Permanently dismiss smart nudges.
 */
function dismiss() {
  StorageService.set(DISMISS_KEY, true);
}

/**
 * Re-enable smart nudges after dismissal.
 */
function reEnable() {
  StorageService.set(DISMISS_KEY, false);
}

export const SmartNudgeService = {
  getNudge,
  markShown,
  dismiss,
  reEnable,
};

export default SmartNudgeService;
