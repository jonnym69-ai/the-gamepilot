// PeriodChampionService.js
// Tracks the most-played game per calendar week / month / year, with a
// permanent locked log of past champions and a live leader for the current
// period. Champions are persona-voiced: each entry freezes the user's persona
// label and a roast line at lock time so the log is an honest time capsule.
//
// Period definitions (calendar, Sunday-start weeks to match App.js buckets):
//   week  -> key `YYYY-MM-DD` (the Sunday starting the week)
//   month -> key `YYYY-MM`
//   year  -> key `YYYY`
//
// Storage:
//   gamepilot-champions-week  -> array of locked weekly champions
//   gamepilot-champions-month -> array of locked monthly champions
//   gamepilot-champions-year  -> array of locked yearly champions

import StorageService from './StorageService';
import SessionRepository from './SessionRepository';
import GamingPersonaService from './GamingPersonaService';
import { resolveGameArtworkBundle } from './GameArtworkService';
import { generateAndStoreSpeech } from './ChampionSpeechService';

const STORAGE_KEYS = {
  week: 'champions-week',
  month: 'champions-month',
  year: 'champions-year',
};

const VALID_PERIODS = new Set(['week', 'month', 'year']);

// ---------------------------------------------------------------------------
// Calendar helpers (Sunday-start weeks, matching getDateBucketKeys in App.js)
// ---------------------------------------------------------------------------

const isValidDate = (value) => {
  if (value === null || value === undefined) return false;
  const d = value instanceof Date ? value : new Date(value);
  return !Number.isNaN(d.getTime());
};

const toDate = (value) => (value instanceof Date ? value : new Date(value));

const formatLocalDateKey = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Sunday-start week key: the local date of the Sunday that begins the week.
const getWeekKey = (dateInput) => {
  const d = toDate(dateInput);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // roll back to Sunday
  return formatLocalDateKey(d); // YYYY-MM-DD in local time
};

const getMonthKey = (dateInput) => {
  const d = toDate(dateInput);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const getYearKey = (dateInput) => String(toDate(dateInput).getFullYear());

const getPeriodKey = (dateInput, period) => {
  if (!isValidDate(dateInput)) return null;
  if (period === 'week') return getWeekKey(dateInput);
  if (period === 'month') return getMonthKey(dateInput);
  if (period === 'year') return getYearKey(dateInput);
  return null;
};

// Inclusive start, exclusive end of a period (end = start of next period).
// Week keys are local YYYY-MM-DD strings; interpret as local midnight to
// stay consistent with getWeekKey (which uses local date math).
const getPeriodBounds = (periodKey, period) => {
  if (period === 'week') {
    const [y, m, d] = periodKey.split('-').map(Number);
    const start = new Date(y, m - 1, d, 0, 0, 0, 0);
    const end = new Date(y, m - 1, d + 7, 0, 0, 0, 0);
    return { start, end };
  }
  if (period === 'month') {
    const [y, m] = periodKey.split('-').map(Number);
    const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
    const end = new Date(y, m, 1, 0, 0, 0, 0);
    return { start, end };
  }
  if (period === 'year') {
    const y = Number(periodKey);
    return { start: new Date(y, 0, 1, 0, 0, 0, 0), end: new Date(y + 1, 0, 1, 0, 0, 0, 0) };
  }
  return null;
};

const getCurrentPeriodKey = (period, now = new Date()) => getPeriodKey(now, period);

// ---------------------------------------------------------------------------
// Session aggregation
// ---------------------------------------------------------------------------

const getSessionTimestampMs = (entry) => {
  const raw = entry?.endTime || entry?.timestamp || entry?.ended_at || entry?.startTime || entry?.date || null;
  if (!raw) return 0;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const parsed = new Date(raw).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const getSessionMinutes = (entry) => Math.max(0, Math.round(Number(
  entry?.playtimeMinutes ?? entry?.playtime ?? entry?.duration ?? entry?.minutes ?? 0
) || 0));

const getGameKey = (entry) => {
  const name = String(entry?.gameName || entry?.gameId || '').trim().toLowerCase();
  return name || null;
};

// Aggregate sessions within a period into per-game minute totals.
// Returns an array of { gameKey, gameName, minutes, sessionCount, appId } sorted desc.
const aggregateSessionsForPeriod = (sessions, periodStartMs, periodEndMs) => {
  if (!Array.isArray(sessions) || sessions.length === 0) return [];
  const byGame = new Map();
  for (const session of sessions) {
    if (!session || typeof session !== 'object') continue;
    const ts = getSessionTimestampMs(session);
    if (!ts || ts < periodStartMs || ts >= periodEndMs) continue;
    const minutes = getSessionMinutes(session);
    if (minutes <= 0) continue;
    const key = getGameKey(session);
    if (!key) continue;
    const name = String(session.gameName || session.gameId || 'Unknown').trim() || 'Unknown';
    const appId = session.appId || session.steamAppId || session.appid || session.gameId || null;
    const existing = byGame.get(key) || {
      gameKey: key,
      gameName: name,
      minutes: 0,
      sessionCount: 0,
      appId: null,
      longestSessionMinutes: 0,
      longestSessionAt: null,
    };
    existing.minutes += minutes;
    existing.sessionCount += 1;
    if (minutes > existing.longestSessionMinutes) {
      existing.longestSessionMinutes = minutes;
      existing.longestSessionAt = new Date(ts).toISOString();
    }
    // Prefer a non-numeric gameName if we first keyed by id.
    if (existing.gameName === 'Unknown' && name !== 'Unknown') existing.gameName = name;
    // Keep the first non-null appId we see.
    if (!existing.appId && appId) existing.appId = String(appId);
    byGame.set(key, existing);
  }
  return [...byGame.values()].sort((a, b) => b.minutes - a.minutes || a.gameName.localeCompare(b.gameName));
};

// ---------------------------------------------------------------------------
// Library lookup for artwork / platform
// ---------------------------------------------------------------------------

// Normalize a game name for fuzzy matching: lowercase, strip punctuation,
// collapse whitespace. Handles cases where session gameName differs from
// library name by colons, trademarks, dashes, etc.
// e.g. "Project Zomboid™" → "project zomboid", "Rust: Console Edition" → "rust console edition"
const normalizeNameForMatch = (name) =>
  String(name || '')
    .toLowerCase()
    .replace(/[\s\-_:.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();

const findLibraryGame = (library, gameName) => {
  if (!Array.isArray(library) || !gameName) return null;
  const needle = normalizeNameForMatch(gameName);
  if (!needle) return null;
  // Try exact normalized match first, then substring containment as a
  // fallback (handles "Project Zomboid" vs "Project Zomboid (Steam)").
  let match = library.find((g) => {
    const candidate = normalizeNameForMatch(g?.name || g?.title || g?.gameName);
    return candidate && candidate === needle;
  }) || null;
  if (!match) {
    match = library.find((g) => {
      const candidate = normalizeNameForMatch(g?.name || g?.title || g?.gameName);
      return candidate && (candidate.includes(needle) || needle.includes(candidate));
    }) || null;
  }
  return match;
};

// ---------------------------------------------------------------------------
// Persona snapshot for a champion
// ---------------------------------------------------------------------------

const buildPersonaSnapshot = (gameForRoast) => {
  try {
    const persona = GamingPersonaService.getPersona();
    const primary = persona?.primaryPersona;
    if (!primary) return null;
    let roastLine = null;
    if (gameForRoast) {
      try {
        roastLine = GamingPersonaService.getGameSpecificRoast(gameForRoast);
      } catch { /* fall through to summary roast */ }
    }
    if (!roastLine) roastLine = persona.summaryRoast || primary.roast || null;
    return {
      label: primary.label,
      archetypeLabel: primary.archetypeLabel,
      theme: primary.theme ? {
        id: primary.theme.id,
        label: primary.theme.label,
        shortName: primary.theme.shortName,
      } : null,
      roastLine,
    };
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// Champion assembly
// ---------------------------------------------------------------------------

const buildChampion = (period, periodKey, aggregate, library, options = {}) => {
  if (!aggregate || aggregate.minutes <= 0) return null;
  const libGame = findLibraryGame(library, aggregate.gameName);
  // If library lookup failed, try resolving artwork from the session's appId.
  // This covers non-Steam shortcuts and manually tracked games that have a
  // Steam appId but aren't in the scanned library.
  const fallbackGame = libGame ? null : (aggregate.appId ? { appid: aggregate.appId, name: aggregate.gameName } : null);
  const artworkBundle = libGame
    ? resolveGameArtworkBundle(libGame, { surface: 'portrait', fallbackSurface: 'library_card' })
    : (fallbackGame ? resolveGameArtworkBundle(fallbackGame, { surface: 'portrait', fallbackSurface: 'library_card' }) : null);
  const platform = libGame?.platform || libGame?.source || null;
  const appId = libGame?.appid || libGame?.app_id || libGame?.appId || libGame?.steamAppId || aggregate.appId || null;

  // Build a lightweight game object for the persona roast.
  const gameForRoast = {
    name: aggregate.gameName,
    time_played: aggregate.minutes,
    genres: libGame?.genres || [],
  };

  const personaSnapshot = options.includePersona === false ? null : buildPersonaSnapshot(gameForRoast);

  return {
    period,
    periodKey,
    lockedAt: options.lockedAt || null,
    game: {
      name: aggregate.gameName,
      portrait: artworkBundle?.artwork || null,
      portraitFallback: artworkBundle?.fallbackSrc || null,
      placeholder: artworkBundle?.placeholder || null,
      platform,
      appId,
    },
    minutes: aggregate.minutes,
    sessionCount: aggregate.sessionCount,
    longestSessionMinutes: aggregate.longestSessionMinutes || 0,
    longestSessionAt: aggregate.longestSessionAt || null,
    runnerUp: options.runnerUp || null,
    totalPeriodMinutes: options.totalPeriodMinutes || aggregate.minutes,
    totalPeriodSessions: options.totalPeriodSessions || aggregate.sessionCount,
    periodGameCount: options.periodGameCount || 1,
    personaSnapshot,
  };
};

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

const readLocked = (period) => {
  if (!VALID_PERIODS.has(period)) return [];
  const raw = StorageService.get(STORAGE_KEYS[period], []);
  return Array.isArray(raw) ? raw : [];
};

const writeLocked = (period, champions) => {
  if (!VALID_PERIODS.has(period)) return false;
  return StorageService.set(STORAGE_KEYS[period], champions);
};

const hydrateChampionArtwork = (champion, library = []) => {
  if (!champion?.game) return champion;
  const libGame = findLibraryGame(library, champion.game.name);
  const fallbackGame = libGame ? null : (champion.game.appId ? {
    appid: champion.game.appId,
    name: champion.game.name,
  } : null);
  const bundle = libGame
    ? resolveGameArtworkBundle(libGame, { surface: 'portrait', fallbackSurface: 'library_card' })
    : (fallbackGame ? resolveGameArtworkBundle(fallbackGame, { surface: 'portrait', fallbackSurface: 'library_card' }) : null);
  const legacyBundle = champion.game.artwork && typeof champion.game.artwork === 'object'
    ? champion.game.artwork
    : null;
  const legacyUrl = typeof champion.game.artwork === 'string' ? champion.game.artwork : null;
  const portrait = bundle?.artwork
    || champion.game.portrait
    || legacyBundle?.artwork
    || legacyBundle?.portrait
    || legacyBundle?.cover
    || legacyUrl
    || null;
  const portraitFallback = bundle?.fallbackSrc
    || champion.game.portraitFallback
    || legacyBundle?.fallbackSrc
    || null;
  const placeholder = bundle?.placeholder
    || champion.game.placeholder
    || legacyBundle?.placeholder
    || null;
  return {
    ...champion,
    game: {
      ...champion.game,
      portrait,
      portraitFallback,
      placeholder,
      platform: champion.game.platform || libGame?.platform || libGame?.source || null,
      appId: champion.game.appId || libGame?.appid || libGame?.app_id || libGame?.appId || libGame?.steamAppId || null,
    },
  };
};

const hydrateChampionMetrics = (champion, sessions = []) => {
  if (!champion?.period || !champion?.periodKey || !champion?.game?.name) return champion;
  const bounds = getPeriodBounds(champion.periodKey, champion.period);
  if (!bounds) return champion;
  const aggregates = aggregateSessionsForPeriod(sessions, bounds.start.getTime(), bounds.end.getTime());
  if (aggregates.length === 0) return champion;
  const championName = normalizeNameForMatch(champion.game.name);
  const aggregate = aggregates.find((entry) => normalizeNameForMatch(entry.gameName) === championName);
  if (!aggregate) return champion;
  const runnerUp = aggregates.find((entry) => normalizeNameForMatch(entry.gameName) !== championName) || null;
  return {
    ...champion,
    minutes: aggregate.minutes,
    sessionCount: aggregate.sessionCount,
    longestSessionMinutes: aggregate.longestSessionMinutes || 0,
    longestSessionAt: aggregate.longestSessionAt || null,
    runnerUp: runnerUp ? { name: runnerUp.gameName, minutes: runnerUp.minutes } : null,
    totalPeriodMinutes: aggregates.reduce((sum, entry) => sum + entry.minutes, 0),
    totalPeriodSessions: aggregates.reduce((sum, entry) => sum + entry.sessionCount, 0),
    periodGameCount: aggregates.length,
  };
};

const hydrateLocked = (period, library = []) => {
  const locked = readLocked(period);
  const sessions = SessionRepository.getSessionHistory();
  const hydrated = locked.map((champion) => hydrateChampionMetrics(
    hydrateChampionArtwork(champion, library),
    sessions
  ));
  if (JSON.stringify(hydrated) !== JSON.stringify(locked)) writeLocked(period, hydrated);
  return hydrated;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const PeriodChampionService = {
  // Pure helpers exposed for tests / UI
  getPeriodKey,
  getCurrentPeriodKey,
  getPeriodBounds,
  getWeekKey,
  getMonthKey,
  getYearKey,

  getChampionForPeriod(period, periodKey, { library = [], sessions = null, includePersona = false } = {}) {
    if (!VALID_PERIODS.has(period) || !periodKey) return null;
    const bounds = getPeriodBounds(periodKey, period);
    if (!bounds) return null;
    const sourceSessions = Array.isArray(sessions) ? sessions : SessionRepository.getSessionHistory();
    const aggregates = aggregateSessionsForPeriod(sourceSessions, bounds.start.getTime(), bounds.end.getTime());
    if (aggregates.length === 0) return null;
    const runnerUp = aggregates[1]
      ? { name: aggregates[1].gameName, minutes: aggregates[1].minutes }
      : null;
    return buildChampion(period, periodKey, aggregates[0], library, {
      runnerUp,
      totalPeriodMinutes: aggregates.reduce((sum, entry) => sum + entry.minutes, 0),
      totalPeriodSessions: aggregates.reduce((sum, entry) => sum + entry.sessionCount, 0),
      periodGameCount: aggregates.length,
      includePersona,
    });
  },

  /**
   * Compute the live (in-progress) champion for the current period.
   * Returns a champion object with lockedAt=null, or null if no sessions yet.
   */
  getLiveChampion(period, { library = [], now = new Date() } = {}) {
    if (!VALID_PERIODS.has(period)) return null;
    const periodKey = getCurrentPeriodKey(period, now);
    if (!periodKey) return null;
    const bounds = getPeriodBounds(periodKey, period);
    if (!bounds) return null;
    const sessions = SessionRepository.getSessionHistory();
    const aggregates = aggregateSessionsForPeriod(
      sessions,
      bounds.start.getTime(),
      bounds.end.getTime()
    );
    if (aggregates.length === 0) return null;
    const totalPeriodMinutes = aggregates.reduce((sum, a) => sum + a.minutes, 0);
    const totalPeriodSessions = aggregates.reduce((sum, a) => sum + a.sessionCount, 0);
    const runnerUp = aggregates[1]
      ? { name: aggregates[1].gameName, minutes: aggregates[1].minutes }
      : null;
    return buildChampion(period, periodKey, aggregates[0], library, {
      runnerUp,
      totalPeriodMinutes,
      totalPeriodSessions,
      periodGameCount: aggregates.length,
      freezePersona: false,
    });
  },

  /**
   * Read all locked champions for a period, sorted most-recent-first.
   */
  getLockedChampions(period, { library = [] } = {}) {
    const locked = hydrateLocked(period, library);
    return [...locked].sort((a, b) => String(b.periodKey).localeCompare(String(a.periodKey)));
  },

  /**
   * Read all champions for a period: locked past + live current (if any).
   * The live current period is appended only if it isn't already locked.
   * Sorted most-recent-first.
   */
  getAllChampions(period, { library = [], now = new Date() } = {}) {
    if (!VALID_PERIODS.has(period)) return [];
    const locked = hydrateLocked(period, library);
    const currentKey = getCurrentPeriodKey(period, now);
    const hasCurrentLocked = locked.some((c) => c.periodKey === currentKey);
    let live = null;
    if (!hasCurrentLocked) {
      try { live = this.getLiveChampion(period, { library, now }); }
      catch { live = null; }
    }
    const all = live ? [...locked, live] : [...locked];
    return all.sort((a, b) => String(b.periodKey).localeCompare(String(a.periodKey)));
  },

  /**
   * Get the most recent locked champion for a period (last completed period),
   * or null if none locked yet.
   */
  getLastLockedChampion(period, { library = [] } = {}) {
    const locked = this.getLockedChampions(period, { library });
    // Exclude the current period in case it was locked early.
    const currentKey = getCurrentPeriodKey(period);
    const past = locked.filter((c) => c.periodKey !== currentKey);
    return past[0] || null;
  },

  /**
   * Lock a specific period if it has ended and isn't already locked.
   * Returns the locked champion, or null if nothing to lock / already locked.
   */
  lockPeriod(period, periodKey, { library = [], now = new Date() } = {}) {
    if (!VALID_PERIODS.has(period) || !periodKey) return null;
    const bounds = getPeriodBounds(periodKey, period);
    if (!bounds) return null;
    // Only lock periods that have ended.
    if (bounds.end.getTime() > now.getTime()) return null;

    const locked = readLocked(period);
    if (locked.some((c) => c.periodKey === periodKey)) return null; // already locked

    const sessions = SessionRepository.getSessionHistory();
    const aggregates = aggregateSessionsForPeriod(
      sessions,
      bounds.start.getTime(),
      bounds.end.getTime()
    );
    if (aggregates.length === 0) return null; // empty period — skip silently

    const totalPeriodMinutes = aggregates.reduce((sum, a) => sum + a.minutes, 0);
    const totalPeriodSessions = aggregates.reduce((sum, a) => sum + a.sessionCount, 0);
    const runnerUp = aggregates[1]
      ? { name: aggregates[1].gameName, minutes: aggregates[1].minutes }
      : null;
    const champion = buildChampion(period, periodKey, aggregates[0], library, {
      runnerUp,
      totalPeriodMinutes,
      totalPeriodSessions,
      periodGameCount: aggregates.length,
      lockedAt: now.toISOString(),
      freezePersona: true,
    });
    if (!champion) return null;

    // Generate an acceptance speech for the newly crowned champion
    try { generateAndStoreSpeech(champion, library); } catch { /* non-critical */ }

    locked.push(champion);
    writeLocked(period, locked);
    return champion;
  },

  /**
   * Auto-lock any past periods that haven't been locked yet.
   * Walks back a bounded number of periods from now. Returns an array of
   * newly locked champions (any period).
   */
  lockChampionsIfNeeded({ library = [], now = new Date(), lookback = { week: 12, month: 12, year: 2 } } = {}) {
    const newlyLocked = [];
    const periods = ['week', 'month', 'year'];
    for (const period of periods) {
      const maxBack = Number(lookback?.[period]);
      if (!Number.isFinite(maxBack) || maxBack <= 0) continue; // skip this period
      const locked = readLocked(period);
      const lockedKeys = new Set(locked.map((c) => c.periodKey));

      // Walk backward from the current period.
      let cursor = new Date(now);
      for (let i = 0; i < maxBack; i += 1) {
        // Step to the start of the period for `cursor`, then back one period.
        if (period === 'week') {
          cursor.setDate(cursor.getDate() - 7);
        } else if (period === 'month') {
          cursor.setMonth(cursor.getMonth() - 1);
        } else {
          cursor.setFullYear(cursor.getFullYear() - 1);
        }
        const key = getPeriodKey(cursor, period);
        if (!key || lockedKeys.has(key)) continue;
        const bounds = getPeriodBounds(key, period);
        if (!bounds || bounds.end.getTime() > now.getTime()) continue; // not ended yet
        const champion = this.lockPeriod(period, key, { library, now });
        if (champion) newlyLocked.push(champion);
      }
    }
    return newlyLocked;
  },

  /**
   * Get a single combined timeline across all periods, sorted most-recent-first.
   * Each entry is tagged with its period type.
   */
  getFullTimeline({ library = [], now = new Date() } = {}) {
    const weeks = this.getAllChampions('week', { library, now });
    const months = this.getAllChampions('month', { library, now });
    const years = this.getAllChampions('year', { library, now });
    return [
      ...weeks,
      ...months,
      ...years,
    ].sort((a, b) => String(b.periodKey).localeCompare(String(a.periodKey)));
  },

  /**
   * Clear all locked champions (for tests / reset). Does not touch sessions.
   */
  clearAll() {
    Object.values(STORAGE_KEYS).forEach((key) => StorageService.remove(key));
  },

  // Exposed for tests
  _internal: {
    STORAGE_KEYS,
    aggregateSessionsForPeriod,
    buildChampion,
    buildPersonaSnapshot,
    findLibraryGame,
    hydrateChampionArtwork,
    hydrateChampionMetrics,
  },
};

export default PeriodChampionService;
