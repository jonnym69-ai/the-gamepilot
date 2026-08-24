import StorageService from './StorageService';

const ACTIVE_SESSIONS_KEY = 'activeGameSessions';
const SESSION_HISTORY_KEY = 'sessionHistory';

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const clone = (value) => JSON.parse(JSON.stringify(value));

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

/**
 * Collapse duplicate / near-duplicate session rows that can accumulate from
 * legacy localStorage + SQLite dual-writes, recovery re-settles, or missing
 * sessionIds. Prefer the richest entry per logical session.
 */
const dedupeSessionHistory = (history = []) => {
  if (!Array.isArray(history) || history.length === 0) return [];

  const bySessionId = new Map();
  const withoutId = [];

  history.forEach((entry) => {
    if (!entry || typeof entry !== 'object') return;
    const sessionId = entry.sessionId ? String(entry.sessionId) : '';
    if (sessionId) {
      const existing = bySessionId.get(sessionId);
      if (!existing) {
        bySessionId.set(sessionId, entry);
        return;
      }
      // Keep the longer / more complete record for the same id.
      const existingMin = getSessionMinutes(existing);
      const nextMin = getSessionMinutes(entry);
      bySessionId.set(sessionId, nextMin >= existingMin ? entry : existing);
      return;
    }
    withoutId.push(entry);
  });

  // Fuzzy-merge rows that lack sessionId (or survived with different ids but
  // are clearly the same sit-down): same game within 2 minutes, similar length.
  const merged = [...bySessionId.values(), ...withoutId];
  merged.sort((a, b) => getSessionTimestampMs(a) - getSessionTimestampMs(b));

  const result = [];
  const FUZZY_WINDOW_MS = 2 * 60 * 1000;

  merged.forEach((entry) => {
    const gameKey = String(entry.gameName || entry.gameId || '').trim().toLowerCase();
    const ts = getSessionTimestampMs(entry);
    const minutes = getSessionMinutes(entry);

    const entrySessionId = entry?.sessionId ? String(entry.sessionId) : '';
    const duplicateIndex = result.findIndex((kept) => {
      const keptKey = String(kept.gameName || kept.gameId || '').trim().toLowerCase();
      if (!gameKey || keptKey !== gameKey) return false;
      // Skip fuzzy merge when BOTH entries have unique sessionIds — they are
      // distinct sessions, not legacy duplicates missing an identifier.
      const keptSessionId = kept?.sessionId ? String(kept.sessionId) : '';
      if (entrySessionId && keptSessionId && entrySessionId !== keptSessionId) return false;
      const keptTs = getSessionTimestampMs(kept);
      if (!ts || !keptTs || Math.abs(ts - keptTs) > FUZZY_WINDOW_MS) return false;
      const keptMin = getSessionMinutes(kept);
      // Same-ish duration, or one is a 0-minute ghost of the other.
      return Math.abs(keptMin - minutes) <= 2 || keptMin === 0 || minutes === 0;
    });

    if (duplicateIndex === -1) {
      result.push(entry);
      return;
    }

    const kept = result[duplicateIndex];
    const keptMin = getSessionMinutes(kept);
    const keptTs = getSessionTimestampMs(kept);
    const entryTs = getSessionTimestampMs(entry);
    // Preserve the EARLIER timestamp so the fuzzy window doesn't slide
    // forward and collapse distinct sessions into one (sliding-window bug).
    const mergedTimestamp = keptTs <= entryTs ? keptTs : entryTs;
    const tsField = entry?.endTime ? 'endTime' : 'timestamp';
    result[duplicateIndex] = minutes >= keptMin
      ? { ...kept, ...entry, playtimeMinutes: Math.max(keptMin, minutes), sessionId: entry.sessionId || kept.sessionId, [tsField]: new Date(mergedTimestamp).toISOString() }
      : { ...entry, ...kept, playtimeMinutes: Math.max(keptMin, minutes), sessionId: kept.sessionId || entry.sessionId, [tsField]: new Date(mergedTimestamp).toISOString() };
  });

  return result;
};

class SessionRepository {
  static cache = {
    activeSessions: StorageService.get(ACTIVE_SESSIONS_KEY, {}),
    sessionHistory: dedupeSessionHistory(StorageService.get(SESSION_HISTORY_KEY, []))
  };

  static initialized = false;
  static initializing = null;

  static get api() {
    return typeof window !== 'undefined' ? window.electronAPI : null;
  }

  static async initialize() {
    if (this.initialized) return this.getSnapshot();
    if (this.initializing) return this.initializing;

    const legacyPayload = {
      activeSessions: isPlainObject(this.cache.activeSessions) ? this.cache.activeSessions : {},
      sessionHistory: Array.isArray(this.cache.sessionHistory) ? this.cache.sessionHistory : []
    };

    if (!this.api?.sessionStoreInitialize) {
      this.initialized = true;
      return this.getSnapshot();
    }

    this.initializing = this.api.sessionStoreInitialize(legacyPayload)
      .then((snapshot) => {
        this.cache = {
          activeSessions: isPlainObject(snapshot?.activeSessions) ? snapshot.activeSessions : {},
          sessionHistory: Array.isArray(snapshot?.sessionHistory) ? snapshot.sessionHistory : []
        };
        // Collapse any pre-SQLite duplicate rows so stats/persona stop showing
        // inflated session counts from testing/migration noise.
        this.sanitizeHistory();
        this.persistFallback();
        this.initialized = true;
        window.dispatchEvent(new CustomEvent('gamepilot:session-storage-ready', { detail: this.getSnapshot() }));
        return this.getSnapshot();
      })
      .catch((error) => {
        console.error('SQLite session storage initialization failed; using local fallback:', error);
        this.sanitizeHistory();
        this.initialized = true;
        return this.getSnapshot();
      })
      .finally(() => {
        this.initializing = null;
      });

    return this.initializing;
  }

  static getSnapshot() {
    return clone({
      activeSessions: isPlainObject(this.cache.activeSessions) ? this.cache.activeSessions : {},
      sessionHistory: Array.isArray(this.cache.sessionHistory) ? this.cache.sessionHistory : []
    });
  }

  static persistFallback() {
    StorageService.set(ACTIVE_SESSIONS_KEY, this.cache.activeSessions);
    StorageService.set(SESSION_HISTORY_KEY, this.cache.sessionHistory);
  }

  static getActiveSessions() {
    return clone(isPlainObject(this.cache.activeSessions) ? this.cache.activeSessions : {});
  }

  static saveActiveSessions(sessions) {
    this.cache.activeSessions = isPlainObject(sessions) ? clone(sessions) : {};
    StorageService.set(ACTIVE_SESSIONS_KEY, this.cache.activeSessions);
    this.api?.sessionStoreSaveActive?.(this.cache.activeSessions).catch((error) => {
      console.error('Failed to persist active sessions to SQLite:', error);
    });
    return true;
  }

  static getSessionHistory() {
    return clone(Array.isArray(this.cache.sessionHistory) ? this.cache.sessionHistory : []);
  }

  static dedupeSessionHistory(history = []) {
    return dedupeSessionHistory(history);
  }

  static settleSession(entry, activeSessions) {
    const history = this.getSessionHistory();
    if (!entry?.sessionId || history.some((existing) => existing?.sessionId === entry.sessionId)) {
      return false;
    }

    history.push(clone(entry));
    this.cache.sessionHistory = this.dedupeSessionHistory(history);
    this.cache.activeSessions = isPlainObject(activeSessions) ? clone(activeSessions) : {};
    this.persistFallback();
    this.api?.sessionStoreSettle?.({ entry, activeSessions: this.cache.activeSessions }).catch((error) => {
      console.error('Failed to settle session in SQLite:', error);
    });
    return true;
  }

  static replaceHistory(history) {
    this.cache.sessionHistory = this.dedupeSessionHistory(Array.isArray(history) ? history : []);
    StorageService.set(SESSION_HISTORY_KEY, this.cache.sessionHistory);
    this.api?.sessionStoreReplaceHistory?.(this.cache.sessionHistory).catch((error) => {
      console.error('Failed to replace SQLite session history:', error);
    });
    return true;
  }

  /**
   * One-shot cleanup for inflated pre-SQLite histories. Safe to call on boot.
   * Returns { before, after, removed }.
   */
  static sanitizeHistory() {
    const before = Array.isArray(this.cache.sessionHistory) ? this.cache.sessionHistory.length : 0;
    const cleaned = this.dedupeSessionHistory(this.cache.sessionHistory);
    const after = cleaned.length;
    if (after !== before) {
      this.cache.sessionHistory = cleaned;
      this.persistFallback();
      this.api?.sessionStoreReplaceHistory?.(this.cache.sessionHistory).catch((error) => {
        console.error('Failed to persist sanitized session history:', error);
      });
    }
    return { before, after, removed: Math.max(0, before - after) };
  }

  static clear() {
    this.cache = { activeSessions: {}, sessionHistory: [] };
    StorageService.remove(ACTIVE_SESSIONS_KEY);
    StorageService.remove(SESSION_HISTORY_KEY);
    this.api?.sessionStoreClear?.().catch((error) => {
      console.error('Failed to clear SQLite session storage:', error);
    });
  }
}

export default SessionRepository;
