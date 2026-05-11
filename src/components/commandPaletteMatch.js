import { getCanonicalGameKey } from '../services/LibraryDataService';

const stripToCanonical = (value) => String(value || '')
  .toLowerCase()
  .replace(/[\u2122\u00ae\u00a9]/g, '')
  .replace(/[^a-z0-9]+/g, '');

/**
 * Scored match for a CommandPalette entry.
 *
 * Returns 0 when no match (filtered out), otherwise a score where higher
 * is better. Scoring tiers:
 *   1000  game canonical key starts with the canonical query
 *    600  every query token is a word-prefix in the haystack
 *    300  every query token appears as a substring (legacy behaviour)
 *
 * Lives in its own module (no React/router imports) so it can be unit
 * tested without dragging the whole palette into Jest.
 */
export const scoreCommandMatch = (cmd, query) => {
  if (!query) return 1;
  const trimmedQuery = String(query).trim();
  if (!trimmedQuery) return 1;

  const haystack = `${cmd?.label || ''} ${cmd?.keywords || ''}`.toLowerCase();
  const tokens = trimmedQuery.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 1;

  // Tier 1: canonical-key prefix match for games. Handles trademark
  // symbols, casing, punctuation, and cross-launcher dedup variants.
  if (cmd?.game) {
    const canonicalGameKey = getCanonicalGameKey(cmd.game);
    const canonicalQuery = stripToCanonical(trimmedQuery);
    if (canonicalGameKey && canonicalQuery && canonicalGameKey.startsWith(canonicalQuery)) {
      return 1000;
    }
  }

  // Tier 2: every token is a word-prefix somewhere in the haystack.
  const wordPrefixMatches = tokens.every((token) => {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:^|[^a-z0-9])${escaped}`, 'i').test(haystack);
  });
  if (wordPrefixMatches) return 600;

  // Tier 3: every token appears as a substring (legacy fallback).
  const substringMatches = tokens.every((token) => haystack.includes(token));
  if (substringMatches) return 300;

  return 0;
};
