/**
 * BacklogCoachService.js - Combines backlog awareness with current habits.
 *
 * The missing link between "what does your backlog say about you" and
 * "recommending the right game at the right time": a short queue of backlog
 * games ordered by fit with the user's CURRENT rotation (persona), their real
 * weekly pace (tracked playtime), and shelf age — plus progress tracking so
 * clearing the pile feels like a plan instead of guilt.
 *
 * Backlog membership: a game is backlog until it has been MEANINGFULLY
 * SAMPLED (3+ hours played or 5+ sessions) or beaten/finished. Sampling
 * counts as progress — most backlog games get a fair shot, not a completion.
 */

import StorageService from './StorageService';
import { PlaytimeAutoLogger } from './PlaytimeAutoLogger';
import GamingPersonaService, { PERSONA_AFFINITY_GENRES } from './GamingPersonaService';
import { RecommendationEngine } from './RecommendationEngine';
import { getBlendedPlaytimeMinutes, isGameCompleted, isNonGameTitle } from './gameClassification';
import { getCanonicalGameKey } from './LibraryDataService';
import HabitTrackerService from './HabitTrackerService';

// "Meaningfully sampled" thresholds — a game leaves the backlog when either
// is crossed, whichever comes first.
const SAMPLED_MINUTES = 180;
const SAMPLED_SESSIONS = 5;

const BACKLOG_SNAPSHOT_KEY = 'backlogCoachSnapshot';
const BACKLOG_EVENTS_KEY = 'backlogCoachClearEvents';

const getGameKey = (game) => getCanonicalGameKey(game)
  || String(game?.appid || game?.name || '').trim().toLowerCase()
  || null;

const getShelfAgeDays = (game) => {
  const added = game?.dateAdded || game?.addedAt || game?.firstSeen;
  if (!added) return 0;
  const ts = new Date(added).getTime();
  return Number.isFinite(ts) ? Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24)) : 0;
};

// Time-to-finish in minutes from local HLTB-style data (hours fields).
const getTimeToFinishMinutes = (game) => {
  const hours = Number(game?.hltb?.mainStory ?? game?.playtimeEstimate ?? 0) || 0;
  return hours > 0 ? Math.round(hours * 60) : null;
};

export class BacklogCoachService {
  static getSessionCountByGame() {
    const counts = {};
    try {
      (PlaytimeAutoLogger.getSessionHistory() || []).forEach((session) => {
        if (isNonGameTitle(session?.gameName)) return;
        const key = getGameKey({ name: session?.gameName });
        if (!key) return;
        counts[key] = (counts[key] || 0) + 1;
      });
    } catch { /* session history optional */ }
    return counts;
  }

  static isBacklogGame(game, sessionCounts = {}) {
    if (!game || isNonGameTitle(game)) return false;
    if (isGameCompleted(game)) return false;
    try {
      const completedGames = StorageService.get('completedGames', []);
      if (Array.isArray(completedGames) && completedGames.some((cg) => (cg?.name || cg) === game.name)) return false;
    } catch { /* completed list optional */ }
    if (getBlendedPlaytimeMinutes(game) >= SAMPLED_MINUTES) return false;
    const sessions = sessionCounts[getGameKey(game)] || 0;
    if (sessions >= SAMPLED_SESSIONS) return false;
    return true;
  }

  // The user's actual current pace: this week's tracked minutes, falling back
  // to this month's weekly average. Zero when nothing is tracked — time
  // realism scoring is skipped in that case.
  static getCurrentPace() {
    try {
      const weekly = HabitTrackerService.getWeeklyStats(0);
      if (weekly?.totalMinutes > 0) return { weeklyMinutes: weekly.totalMinutes, source: 'week' };
      const monthly = HabitTrackerService.getMonthlyStats(0);
      if (monthly?.totalMinutes > 0) return { weeklyMinutes: monthly.totalMinutes / 4.3, source: 'month' };
    } catch { /* habit data optional */ }
    return { weeklyMinutes: 0, source: null };
  }

  static scoreGame(game, ctx) {
    const genres = (Array.isArray(game?.genres) ? game.genres : []).map((g) => String(g).toLowerCase());
    let score = 0;
    const reasons = [];

    // Current-rotation taste (persona affinity — reflects what you're into NOW)
    const affinityMatches = ctx.affinityGenres.filter((ag) => {
      const needle = String(ag).toLowerCase();
      return genres.some((g) => g === needle || g.includes(needle) || needle.includes(g));
    }).length;
    if (affinityMatches > 0) {
      score += Math.min(16, affinityMatches * 8);
      reasons.push("Matches what you're into right now");
    }

    if (ctx.recentGenre && genres.some((g) => g === ctx.recentGenre || g.includes(ctx.recentGenre) || ctx.recentGenre.includes(g))) {
      score += 10;
      reasons.push(`In step with your current ${ctx.recentGenre} phase`);
    }

    // Focus adjacency — games you're actively replaying pull similar backlog up
    const focusOverlap = genres.filter((g) => ctx.focusGenres.some((fg) => String(fg).toLowerCase() === g)).length;
    if (focusOverlap > 0) {
      score += Math.min(12, focusOverlap * 5);
      reasons.push("Adjacent to what you're playing right now");
    }

    // Time realism — estimated length vs the user's real weekly pace
    const estimatedMinutes = getTimeToFinishMinutes(game);
    let weeksToClear = null;
    if (estimatedMinutes && ctx.weeklyMinutes > 0) {
      weeksToClear = estimatedMinutes / ctx.weeklyMinutes;
      if (weeksToClear <= 1) {
        score += 20;
        reasons.push('Clearable in about a week at your current pace');
      } else if (weeksToClear <= 2) {
        score += 12;
        reasons.push('~2 weeks at your current pace');
      } else if (weeksToClear <= 4) {
        score += 4;
        reasons.push(`~${Math.ceil(weeksToClear)} weeks at your current pace`);
      } else {
        score -= 8;
        reasons.push(`A ~${Math.max(1, Math.round(weeksToClear / 4.3))}-month commitment at your current pace`);
      }
    }

    // Shelf age — the longer it sits, the more it deserves surfacing
    const shelfDays = getShelfAgeDays(game);
    if (shelfDays > 0) {
      score += Math.min(15, Math.floor(shelfDays / 30) * 3);
      if (shelfDays > 90) reasons.push(`Sitting unplayed for ${Math.floor(shelfDays / 30)} months`);
    }

    // Don't nag about the same game nightly
    if (ctx.validRecent?.some((entry) => entry.name === game.name)) {
      score -= 30;
    }

    if (reasons.length === 0) reasons.push('Unplayed and fits your library taste');
    return { game, score, reasons, estimatedMinutes, weeksToClear, shelfDays };
  }

  // Snapshot-diff progress: games that were backlog and no longer are (but
  // are still in the library, i.e. not uninstalled) count as cleared.
  static syncProgress(library, backlog) {
    const snapshot = StorageService.get(BACKLOG_SNAPSHOT_KEY, null);
    const events = StorageService.get(BACKLOG_EVENTS_KEY, []);
    const libraryKeys = new Set(library.map(getGameKey).filter(Boolean));
    const now = Date.now();

    const currentKeys = new Set(backlog.map(getGameKey).filter(Boolean));

    if (!snapshot || typeof snapshot !== 'object') {
      const seeded = {};
      backlog.forEach((g) => {
        const key = getGameKey(g);
        if (key) seeded[key] = { name: g.name, since: now };
      });
      StorageService.set(BACKLOG_SNAPSHOT_KEY, seeded);
      return { clearedTotal: 0, clearedThisMonth: 0, events: [] };
    }

    const newEvents = [];
    Object.entries(snapshot).forEach(([key, info]) => {
      if (currentKeys.has(key)) return; // still backlog
      if (!libraryKeys.has(key)) return; // uninstalled — not progress
      newEvents.push({ key, name: info?.name || key, clearedAt: now });
    });

    const nextSnapshot = {};
    backlog.forEach((g) => {
      const key = getGameKey(g);
      if (key) nextSnapshot[key] = snapshot[key] || { name: g.name, since: now };
    });
    StorageService.set(BACKLOG_SNAPSHOT_KEY, nextSnapshot);

    let allEvents = Array.isArray(events) ? events : [];
    if (newEvents.length > 0) {
      allEvents = [...allEvents, ...newEvents];
      StorageService.set(BACKLOG_EVENTS_KEY, allEvents);
    }

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const clearedThisMonth = allEvents.filter((e) => Number(e?.clearedAt) >= monthStart.getTime()).length;
    return { clearedTotal: allEvents.length, clearedThisMonth, events: allEvents.slice(-10) };
  }

  static getBacklogPlan(library, count = 5) {
    if (!Array.isArray(library) || library.length === 0) return null;

    const sessionCounts = this.getSessionCountByGame();
    const backlog = library.filter((game) => this.isBacklogGame(game, sessionCounts));
    if (backlog.length === 0) return null;

    const progress = this.syncProgress(library, backlog);
    const pace = this.getCurrentPace();

    let affinityGenres = [];
    let recentGenre = null;
    try {
      const persona = GamingPersonaService.getPersona();
      const personaId = persona?.primaryPersona?.id || null;
      affinityGenres = personaId ? (PERSONA_AFFINITY_GENRES[personaId] || []) : [];
      recentGenre = persona?.signals?.dominantGenre
        ? String(persona.signals.dominantGenre).toLowerCase()
        : null;
    } catch { /* persona optional */ }

    let focusGenres = [];
    try {
      const focus = RecommendationEngine.getCurrentPlayFocus();
      focusGenres = focus?.active ? (focus.genres || []) : [];
    } catch { /* focus optional */ }

    let validRecent = [];
    let now = Date.now();
    try {
      const state = RecommendationEngine.getRecentRecommendationState();
      validRecent = state?.validRecent || [];
      now = state?.now || now;
    } catch { /* recency guard optional */ }

    const scored = backlog
      .map((game) => this.scoreGame(game, { affinityGenres, recentGenre, focusGenres, weeklyMinutes: pace.weeklyMinutes, validRecent }))
      .sort((a, b) => b.score - a.score);

    const queue = scored.slice(0, count);
    try {
      RecommendationEngine.persistRecentRecommendations(queue.map((entry) => entry.game), validRecent, now);
    } catch { /* recency guard optional */ }

    // "Hours to clear" under the sampled definition: each backlog game needs
    // at most its remaining-to-sampled minutes, capped by its real estimated
    // length when known (a 2h game takes 2h, not 3h).
    const minutesToSample = backlog.reduce((total, game) => {
      const played = getBlendedPlaytimeMinutes(game);
      const remainingToSample = Math.max(0, SAMPLED_MINUTES - played);
      const estimate = getTimeToFinishMinutes(game);
      return total + (estimate !== null ? Math.min(estimate, remainingToSample) : remainingToSample);
    }, 0);
    const hoursToClear = Math.round(minutesToSample / 60);

    const tonightPick = queue[0] || null;
    const messages = [
      `${backlog.length} game${backlog.length === 1 ? '' : 's'} in your backlog — about ${hoursToClear}h to give them all a fair shot.`
    ];
    if (progress.clearedThisMonth > 0) {
      messages.push(`${progress.clearedThisMonth} cleared this month.`);
    }
    if (tonightPick) {
      messages.push(`Tonight's pick: ${tonightPick.game.name} — ${tonightPick.reasons[0].charAt(0).toLowerCase()}${tonightPick.reasons[0].slice(1)}.`);
    }

    return {
      queue,
      tonightPick,
      summary: {
        backlogCount: backlog.length,
        hoursToClear,
        clearedThisMonth: progress.clearedThisMonth,
        clearedTotal: progress.clearedTotal,
        sampledMinutes: SAMPLED_MINUTES,
        sampledSessions: SAMPLED_SESSIONS
      },
      recentCleared: progress.events,
      message: messages.join(' ')
    };
  }
}

export default BacklogCoachService;
