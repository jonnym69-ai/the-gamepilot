/**
 * ManualGamesService — user-added external (DRM-free / launcher-less) games.
 *
 * Entries persist under `manualGamesV1` and are merged into the regular
 * library by mergeIntoLibrary(), so they flow through the same launch,
 * process-monitor, playtime and curation paths as scanned games. The store
 * is the source of truth: removing an entry removes it from the merged
 * library on the next merge.
 *
 * Canonical-key dedupe rules mirror LibraryDataService's conservative merge
 * (alphanumeric lowercase). A manual entry whose name already exists in the
 * library under another platform is skipped — the owned entry wins.
 */

import StorageService from './StorageService';
import { isNonGameTitle } from './gameClassification';
import { getGameGenres } from '../GameGenreDatabase';

const STORAGE_KEY = 'manualGamesV1';
export const MANUAL_GAMES_CHANGED_EVENT = 'gamepilot:manual-games-changed';

const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// Mirrors LibraryDataService.getCanonicalGameKey — kept local so this service
// stays usable when that module is partially mocked in tests.
const canonicalKey = (name) => {
  const stripped = String(name || '')
    .replace(/[™®©]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
  return stripped.length > 0 ? stripped : null;
};

const baseName = (filePath) => {
  const normalized = String(filePath || '').replace(/\\/g, '/');
  return normalized.slice(normalized.lastIndexOf('/') + 1);
};

const dirName = (filePath) => {
  const normalized = String(filePath || '');
  const index = Math.max(normalized.lastIndexOf('/'), normalized.lastIndexOf('\\'));
  return index > 0 ? normalized.slice(0, index) : '';
};

// "cool_game-v2.exe" -> "Cool Game V2". First letter of each word is
// capitalized; internal caps are preserved so abbreviations (CS2) survive.
export const deriveGameName = (filePath) => {
  const stem = baseName(filePath).replace(/\.[^.]+$/, '');
  const spaced = stem
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return spaced
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const isValidEntry = (entry) =>
  entry &&
  typeof entry === 'object' &&
  entry.source === 'manual' &&
  entry.platform === 'Manual' &&
  typeof entry.id === 'string' &&
  entry.id.startsWith('manual-') &&
  typeof entry.name === 'string' &&
  entry.name.trim().length > 0 &&
  typeof entry.exePath === 'string' &&
  entry.exePath.trim().length > 0;

const notifyChanged = () => {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent(MANUAL_GAMES_CHANGED_EVENT));
  }
};

class ManualGamesService {
  static list() {
    try {
      const stored = StorageService.get(STORAGE_KEY, []);
      return Array.isArray(stored) ? stored.filter(isValidEntry) : [];
    } catch {
      return [];
    }
  }

  static getEntryById(id) {
    return this.list().find((entry) => entry.id === id) || null;
  }

  /**
   * Register an executable as a manual game. Returns the stored entry, the
   * existing entry when the same exePath was already added, or null when the
   * pick is unusable (no path, or a launcher/non-game title that the library
   * normalizer would silently drop).
   */
  static add({ exePath, name } = {}) {
    const cleanPath = String(exePath || '').trim();
    if (!cleanPath) return null;

    const existing = this.list().find((entry) => entry.exePath === cleanPath);
    if (existing) return existing;

    // Check the raw stem too: "Battle.net.exe" cleans to "Battle Net", which
    // no longer matches the "battle.net" non-game token — the raw form does.
    const rawStem = baseName(cleanPath).replace(/\.[^.]+$/, '');
    const resolvedName = String(name || '').trim() || deriveGameName(cleanPath);
    if (!resolvedName || isNonGameTitle(resolvedName) || isNonGameTitle(rawStem)) return null;

    const entry = {
      id: `manual-${slugify(resolvedName) || 'game'}-${Date.now()}`,
      name: resolvedName,
      exePath: cleanPath,
      platform: 'Manual',
      addedAt: Date.now(),
      playtimeMinutes: 0,
      source: 'manual',
    };

    const entries = [...this.list(), entry];
    StorageService.set(STORAGE_KEY, entries);
    notifyChanged();
    return entry;
  }

  /** Remove by entry id, exe path, or display name. Returns true when removed. */
  static remove(identifier) {
    const needle = String(identifier || '').trim();
    if (!needle) return false;
    const entries = this.list();
    const next = entries.filter((entry) => entry.id !== needle && entry.exePath !== needle && entry.name !== needle);
    if (next.length === entries.length) return false;
    StorageService.set(STORAGE_KEY, next);
    notifyChanged();
    return true;
  }

  /** Library-shaped view of a manual entry: launch + monitor fields included. */
  static toLibraryGame(entry) {
    return {
      name: entry.name,
      platform: 'Manual',
      source: 'manual',
      manualId: entry.id,
      exePath: entry.exePath,
      executablePath: entry.exePath,
      installDir: dirName(entry.exePath),
      addedAt: entry.addedAt,
      playtimeMinutes: entry.playtimeMinutes || 0,
      time_played: entry.playtimeMinutes || 0,
      launch_count: 0,
      last_played: null,
      genres: getGameGenres(entry.name),
    };
  }

  /**
   * Reconcile a library array against the manual store: drops manual entries
   * whose record was removed, appends records not yet present (skipping names
   * already owned on another platform). Existing manual entries keep their
   * library copy untouched so playtime recorded there is preserved.
   */
  static mergeIntoLibrary(library) {
    const entries = this.list();
    const byId = new Map(entries.map((entry) => [entry.id, entry]));
    const kept = (Array.isArray(library) ? library : []).filter((game) => {
      if (game?.source !== 'manual') return true;
      return Boolean(game?.manualId) && byId.has(game.manualId);
    });

    const presentIds = new Set(kept.map((game) => game?.manualId).filter(Boolean));
    const presentKeys = new Set(kept.map((game) => canonicalKey(game?.name)).filter(Boolean));
    entries.forEach((entry) => {
      if (presentIds.has(entry.id)) return;
      const key = canonicalKey(entry.name);
      if (key && presentKeys.has(key)) return; // already owned on another platform
      kept.push(this.toLibraryGame(entry));
      if (key) presentKeys.add(key);
    });
    return kept;
  }
}

export default ManualGamesService;
