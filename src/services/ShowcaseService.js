import StorageService from './StorageService';
import { getTopPlayedGames } from './gameClassification';

/**
 * Profile "Showcase" — up to six games pinned on the profile's secondary
 * column. Manual picks are stored as an ordered array of game names; when no
 * picks exist the showcase auto-fills with the library's most-played games so
 * the card is never blank for libraries that have playtime data.
 */

export const SHOWCASE_STORAGE_KEY = 'profileShowcaseV1';
export const SHOWCASE_LIMIT = 6;

const readRaw = () => {
  const stored = StorageService.get(SHOWCASE_STORAGE_KEY);
  if (!Array.isArray(stored)) return null;
  return stored
    .filter((name) => typeof name === 'string')
    .map((name) => name.trim())
    .filter(Boolean);
};

const dedupeNames = (names) => {
  const seen = new Set();
  const result = [];
  for (const name of names || []) {
    if (typeof name !== 'string') continue;
    const value = name.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
};

export const getShowcaseNames = () => readRaw();

export const hasCustomShowcase = () => {
  const names = readRaw();
  return Array.isArray(names) && names.length > 0;
};

export const setShowcaseNames = (names) => {
  const deduped = dedupeNames(names).slice(0, SHOWCASE_LIMIT);
  if (deduped.length === 0) {
    StorageService.remove(SHOWCASE_STORAGE_KEY);
    return [];
  }
  StorageService.set(SHOWCASE_STORAGE_KEY, deduped);
  return deduped;
};

export const resetShowcase = () => {
  StorageService.remove(SHOWCASE_STORAGE_KEY);
};

// Auto picks: the library's top-played games, capped at the showcase limit.
const getAutoShowcaseGames = (library) =>
  getTopPlayedGames(library, SHOWCASE_LIMIT)
    .map((entry) => entry.game)
    .slice(0, SHOWCASE_LIMIT);

// Resolve stored names back to live library entries, preserving pick order.
// Names that no longer exist in the library are dropped silently.
const getCustomShowcaseGames = (library) => {
  const names = readRaw();
  if (!Array.isArray(names) || names.length === 0) return [];
  const byName = new Map();
  (Array.isArray(library) ? library : []).forEach((game) => {
    if (game && game.name && !byName.has(game.name)) byName.set(game.name, game);
  });
  return names.map((name) => byName.get(name)).filter(Boolean);
};

/**
 * Resolve what the showcase should render for the given library.
 * @returns {{ games: Array, mode: 'custom'|'auto' }}
 */
export const getShowcaseGames = (library) => {
  const games = Array.isArray(library) ? library : [];
  const custom = getCustomShowcaseGames(games);
  if (custom.length > 0) return { games: custom, mode: 'custom' };
  return { games: getAutoShowcaseGames(games), mode: 'auto' };
};

const ShowcaseService = {
  SHOWCASE_STORAGE_KEY,
  SHOWCASE_LIMIT,
  getShowcaseNames,
  hasCustomShowcase,
  setShowcaseNames,
  resetShowcase,
  getShowcaseGames,
};

export default ShowcaseService;
