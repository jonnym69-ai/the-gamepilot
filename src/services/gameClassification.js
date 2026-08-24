/**
 * gameClassification.js - Single source of truth for game classification logic.
 *
 * Centralises "what counts as played / unplayed" so every surface (Stats,
 * Persona, Smart Collections, Year in Review, Share Cards) agrees on the
 * same answer.
 */

export const NEGLIGIBLE_PLAYTIME_MINUTES = 5;
const MAX_UNPLAYED_LAUNCHES = 10;

const toMinutes = (raw) => {
  if (raw === null || raw === undefined) return 0;
  const num = Number(raw);
  return Number.isFinite(num) ? Math.max(0, num) : 0;
};

export const getBlendedPlaytimeMinutes = (game) => {
  if (!game) return 0;
  return Math.max(
    0,
    toMinutes(game.time_played),
    toMinutes(game.playtime?.total),
    toMinutes(game.playtime?.minutes),
    toMinutes(game.playtimeMinutes),
    toMinutes(game.importedPlaytimeMinutes),
    toMinutes(game.playtimeForever),
    toMinutes(game.totalPlaytime)
  );
};

export const isGameUnplayed = (game) => {
  if (!game) return true;
  if (game.playedElsewhere) return false;
  if (getBlendedPlaytimeMinutes(game) >= NEGLIGIBLE_PLAYTIME_MINUTES) return false;
  if (Number(game.launch_count || 0) > MAX_UNPLAYED_LAUNCHES) return false;
  return true;
};

export const isGameCompleted = (game) => {
  if (!game) return false;
  const COMPLETED_STATUSES = ['finished', 'beaten', 'completed', '100%'];
  return Boolean(
    game.completed
    || COMPLETED_STATUSES.includes(game.completionStatus)
    || COMPLETED_STATUSES.includes(game.replayIntent)
  );
};

// Launcher/utility apps that scans can pick up as if they were games (e.g. the
// GOG Galaxy client registering as an installed program, then getting tracked
// as a "played game"). They must never count toward library stats, personas,
// or session surfaces. Exact matches, plus prefix matches for versioned names
// like "GOG Galaxy 2.0".
const NON_GAME_TITLE_TOKENS = [
  'gog galaxy', 'epic games launcher', 'ubisoft connect', 'battle.net',
  'ea app', 'riot client', 'rockstar games launcher', 'rockstar social club',
  'xbox game bar', 'xbox accessories', 'amazon games', 'playnite',
  'steamworks common redistributables'
];

export const isNonGameTitle = (gameOrName) => {
  const raw = typeof gameOrName === 'string'
    ? gameOrName
    : (gameOrName?.name || gameOrName?.title || gameOrName?.gameName || '');
  const name = String(raw).trim().toLowerCase();
  if (!name) return false;
  return NON_GAME_TITLE_TOKENS.some((token) => name === token || name.startsWith(`${token} `));
};
