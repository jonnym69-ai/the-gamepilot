/**
 * MilestoneService - Detects and tracks celebratory milestones.
 *
 * Checks library + session data for thresholds like total hours, game count,
 * session count, completion count, and streak lengths. Each milestone is
 * shown only once — the seen set is persisted in localStorage.
 */

import StorageService from './StorageService';
import { PlaytimeAutoLogger } from './PlaytimeAutoLogger';

const SEEN_KEY = 'milestonesSeenV1';

const MILESTONE_DEFS = [
  // Library size milestones
  { id: 'games-10', type: 'library', threshold: 10, label: '10 games in your library', icon: '🎮' },
  { id: 'games-25', type: 'library', threshold: 25, label: '25 games in your library', icon: '🎮' },
  { id: 'games-50', type: 'library', threshold: 50, label: '50 games in your library', icon: '🎮' },
  { id: 'games-100', type: 'library', threshold: 100, label: '100 games in your library', icon: '🎮' },
  { id: 'games-250', type: 'library', threshold: 250, label: '250 games in your library', icon: '🎮' },
  { id: 'games-500', type: 'library', threshold: 500, label: '500 games in your library', icon: '🎮' },

  // Total hours played
  { id: 'hours-1', type: 'hours', threshold: 1, label: 'Your first hour logged', icon: '⏱️' },
  { id: 'hours-10', type: 'hours', threshold: 10, label: '10 hours logged', icon: '⏱️' },
  { id: 'hours-50', type: 'hours', threshold: 50, label: '50 hours logged', icon: '⏱️' },
  { id: 'hours-100', type: 'hours', threshold: 100, label: '100 hours logged', icon: '⏱️' },
  { id: 'hours-250', type: 'hours', threshold: 250, label: '250 hours logged', icon: '⏱️' },
  { id: 'hours-500', type: 'hours', threshold: 500, label: '500 hours logged', icon: '⏱️' },
  { id: 'hours-1000', type: 'hours', threshold: 1000, label: '1,000 hours logged', icon: '⏱️' },

  // Session count
  { id: 'sessions-10', type: 'sessions', threshold: 10, label: '10 sessions tracked', icon: '🎯' },
  { id: 'sessions-50', type: 'sessions', threshold: 50, label: '50 sessions tracked', icon: '🎯' },
  { id: 'sessions-100', type: 'sessions', threshold: 100, label: '100 sessions tracked', icon: '🎯' },
  { id: 'sessions-250', type: 'sessions', threshold: 250, label: '250 sessions tracked', icon: '🎯' },

  // Completion milestones
  { id: 'completed-1', type: 'completed', threshold: 1, label: 'Your first completed game', icon: '🏆' },
  { id: 'completed-5', type: 'completed', threshold: 5, label: '5 games completed', icon: '🏆' },
  { id: 'completed-10', type: 'completed', threshold: 10, label: '10 games completed', icon: '🏆' },
  { id: 'completed-25', type: 'completed', threshold: 25, label: '25 games completed', icon: '🏆' },
  { id: 'completed-50', type: 'completed', threshold: 50, label: '50 games completed', icon: '🏆' },
];

const getSeenSet = () => {
  const seen = StorageService.get(SEEN_KEY, {});
  return new Set(Object.keys(seen).filter((k) => seen[k]));
};

const markSeen = (milestoneId) => {
  const seen = StorageService.get(SEEN_KEY, {});
  seen[milestoneId] = true;
  StorageService.set(SEEN_KEY, seen);
};

const getCompletedCount = (library) => {
  if (!Array.isArray(library)) return 0;
  return library.filter((g) => {
    const status = g?.completionStatus;
    return status === 'completed' || status === '100%' || status === 'beaten';
  }).length;
};

/**
 * Check for any newly-reached milestones.
 * Returns an array of milestone objects that have been reached but not yet seen.
 * Each returned milestone is automatically marked as seen.
 */
function checkMilestones(library = []) {
  const seen = getSeenSet();
  const reached = [];

  const gameCount = Array.isArray(library) ? library.length : 0;
  const completedCount = getCompletedCount(library);

  let totalMinutes = 0;
  let sessionCount = 0;

  try {
    const history = PlaytimeAutoLogger.getSessionHistory();
    sessionCount = Array.isArray(history) ? history.length : 0;
    totalMinutes = (Array.isArray(history) ? history : []).reduce((sum, s) => {
      const mins = Number(s?.playtimeMinutes ?? s?.playtime ?? s?.duration ?? s?.minutes ?? 0);
      return sum + (Number.isFinite(mins) ? Math.max(0, mins) : 0);
    }, 0);
  } catch {
    // session history optional
  }

  // Also count imported playtime from library
  if (Array.isArray(library)) {
    library.forEach((g) => {
      const imported = Number(g?.importedPlaytimeMinutes) || 0;
      if (imported > 0) totalMinutes += imported;
    });
  }

  const totalHours = Math.floor(totalMinutes / 60);

  const currentValue = {
    library: gameCount,
    hours: totalHours,
    sessions: sessionCount,
    completed: completedCount,
  };

  for (const def of MILESTONE_DEFS) {
    if (seen.has(def.id)) continue;
    const value = currentValue[def.type] || 0;
    if (value >= def.threshold) {
      reached.push(def);
      markSeen(def.id);
    }
  }

  return reached;
}

/**
 * Get all milestones (for potential display in stats/settings).
 */
function getAllMilestones() {
  const seen = getSeenSet();
  return MILESTONE_DEFS.map((def) => ({ ...def, seen: seen.has(def.id) }));
}

export const MilestoneService = {
  checkMilestones,
  getAllMilestones,
};

export default MilestoneService;
