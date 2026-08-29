/**
 * SessionRoastService — generates contextual, personality-driven roast toasts
 * when a game session ends. Uses the persona archetype's contextRoasts plus
 * situational modifiers (time of day, session length, repeat plays, etc.).
 *
 * All local, no backend. Built on top of GamingPersonaService.
 */

import GamingPersonaService from './GamingPersonaService';
import SessionRepository from './SessionRepository';

const pickRandom = (arr, seed) => {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const idx = Math.abs(seed) % arr.length;
  return arr[idx];
};

const getHourFromDate = (dateInput) => {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return null;
  return d.getHours();
};

const isWeekend = (dateInput) => {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return false;
  const day = d.getDay();
  return day === 0 || day === 6;
};

const formatHours = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

// ---------------------------------------------------------------------------
// Situational modifiers — short one-liners prepended or appended to the roast
// ---------------------------------------------------------------------------

const MODIFIERS = {
  lateNight: (hour) => {
    if (hour === null) return null;
    if (hour >= 1 && hour <= 4) return pickRandom([
      `${hour}am. Again.`,
      'The sun will be up soon. That is not a concern.',
      'Sleep is just a loading screen.',
      'Night owls unite. Separately. In the dark. Like now.'
    ], hour);
    if (hour >= 0 && hour <= 5) return pickRandom([
      'Midnight oil: burned.',
      'The early birds can wait. The late birds are playing.',
      '2am is still technically today. Technically.'
    ], hour);
    return null;
  },

  longSession: (minutes) => {
    if (minutes >= 360) return pickRandom([
      '6+ hours. That is not a session. That is a lifestyle.',
      'Somewhere, a responsible adult is worried about you.',
      'The game called. It wants to see other people.',
      'Marathon complete. Your back will file a complaint tomorrow.'
    ], Math.floor(minutes));
    if (minutes >= 240) return pickRandom([
      '4 hours. Bold choice.',
      'A solid sitting. Your chair knows you well.',
      'Time flies when you are ignoring responsibilities.'
    ], Math.floor(minutes));
    return null;
  },

  shortSession: (minutes) => {
    if (minutes > 0 && minutes < 10) return pickRandom([
      `${minutes} minutes. Did you even load in?`,
      'A drive-by session. In and out. Respect.',
      'Quick check. The game is fine. You are fine. Everything is fine.',
      'That was less a session and more a cameo appearance.'
    ], minutes);
    if (minutes >= 10 && minutes < 20) return pickRandom([
      'A snack-sized session.',
      'Just enough to remember the controls.',
      'In and out in under 20. Efficiency.'
    ], minutes);
    return null;
  },

  weekend: (isWeekendSession) => {
    if (!isWeekendSession) return null;
    return pickRandom([
      'Weekend well spent.',
      'Saturday: optimized.',
      'The backlog is weeping with joy.',
      'This is what weekends are for.'
    ], Date.now() % 4);
  },

  repeatGame: (sessionCountToday) => {
    if (sessionCountToday >= 4) return pickRandom([
      `${sessionCountToday} sessions today. This is a relationship.`,
      'Back again? The game has stopped asking where you have been.',
      'At this point, the game should be paying rent.',
      `${sessionCountToday} times today. The game knows your order.`
    ], sessionCountToday);
    if (sessionCountToday === 3) return pickRandom([
      'Third session today. The game is starting to take this personally.',
      'Back again? This is becoming a pattern. A beautiful, unhealthy pattern.'
    ], sessionCountToday);
    return null;
  },

  streak: (currentStreak) => {
    if (currentStreak >= 30) return pickRandom([
      `${currentStreak}-day streak. This is no longer gaming. This is devotion.`,
      'A month. You have gamed every day for a month. The streak has a life of its own.'
    ], currentStreak);
    if (currentStreak >= 14) return pickRandom([
      `${currentStreak} days straight. The streak is now the boss of you.`,
      'Two weeks. You and the games have an understanding.'
    ], currentStreak);
    if (currentStreak >= 7) return pickRandom([
      `${currentStreak}-day streak. Commitment recognized.`,
      'A full week. The games are starting to expect you.'
    ], currentStreak);
    return null;
  }
};

// ---------------------------------------------------------------------------
// Count sessions for the same game today
// ---------------------------------------------------------------------------

const countSessionsToday = (gameName, history) => {
  if (!gameName || !Array.isArray(history)) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();
  return history.filter((s) => {
    const sDate = s.endTime ? new Date(s.endTime) : (s.startTime ? new Date(s.startTime) : null);
    if (!sDate || Number.isNaN(sDate.getTime())) return false;
    return sDate.getTime() >= todayMs && s.gameName === gameName;
  }).length;
};

const getCurrentStreak = () => {
  try {
    const stored = localStorage.getItem('gamepilot_gamingStreaks');
    if (!stored) return 0;
    const parsed = JSON.parse(stored);
    return Number(parsed?.currentStreak) || 0;
  } catch {
    return 0;
  }
};

// ---------------------------------------------------------------------------
// Main API
// ---------------------------------------------------------------------------

/**
 * Generate a session-end roast toast message.
 * @param {Object} sessionDetail - { gameName, playtimeMinutes, startTime, endTime, ... }
 * @returns {Object|null} { message, personaLabel } or null if not enough data
 */
export const generateSessionRoast = (sessionDetail) => {
  if (!sessionDetail?.gameName) return null;
  const minutes = Number(sessionDetail?.playtimeMinutes) || 0;
  if (minutes <= 0) return null;

  const endTime = sessionDetail.endTime ? new Date(sessionDetail.endTime) : new Date();
  const hour = getHourFromDate(endTime);
  const weekend = isWeekend(endTime);

  // Get persona and game-specific roast
  let personaRoast = null;
  let personaLabel = null;
  try {
    const identity = GamingPersonaService.getPublicIdentity();
    personaLabel = identity?.label || null;

    // Try game-specific roast using the persona's contextRoasts
    const persona = GamingPersonaService.getPersona();
    const primary = persona?.primaryPersona;
    if (primary && Array.isArray(primary.contextRoasts) && primary.contextRoasts.length > 0) {
      const library = JSON.parse(localStorage.getItem('library') || '[]');
      const game = library.find((g) =>
        (g.name || g.title || '') === sessionDetail.gameName
      ) || { name: sessionDetail.gameName };
      const gameMinutes = Math.max(
        Number(game.time_played || 0),
        Number(game.playtime?.total || 0),
        minutes
      );
      personaRoast = GamingPersonaService.getGameSpecificRoast(
        { ...game, time_played: gameMinutes },
        { seed: Math.floor(Date.now() / 1000) % 1000 }
      );
    }
    if (!personaRoast) {
      personaRoast = identity?.roast || primary?.roast || null;
    }
  } catch {
    // Persona not available — continue with modifiers only
  }

  // Gather situational modifiers
  const history = SessionRepository.getSessionHistory();
  const sessionsToday = countSessionsToday(sessionDetail.gameName, history);
  const streak = getCurrentStreak();

  const modifiers = [
    MODIFIERS.lateNight(hour),
    MODIFIERS.longSession(minutes),
    MODIFIERS.shortSession(minutes),
    MODIFIERS.weekend(weekend),
    MODIFIERS.repeatGame(sessionsToday),
    MODIFIERS.streak(streak)
  ].filter(Boolean);

  // Build the message: modifier + persona roast + time summary
  const timeString = formatHours(minutes);
  const timeSummary = `+${timeString} to ${sessionDetail.gameName}`;

  // Pick at most 2 modifiers to keep it punchy
  const selectedModifiers = modifiers.slice(0, 2);
  const modifierText = selectedModifiers.length > 0
    ? selectedModifiers.join(' ')
    : null;

  // Compose: prefer persona roast as the main line, modifiers as flavor
  let message;
  if (personaRoast && modifierText) {
    message = `${modifierText} ${personaRoast}`;
  } else if (personaRoast) {
    message = personaRoast;
  } else if (modifierText) {
    message = `${modifierText} ${timeSummary}`;
  } else {
    message = `Session saved: ${timeSummary}`;
  }

  return {
    message,
    personaLabel,
    timeSummary
  };
};

const SessionRoastService = { generateSessionRoast };
export default SessionRoastService;
