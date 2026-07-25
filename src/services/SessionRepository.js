import StorageService from './StorageService';

const ACTIVE_SESSIONS_KEY = 'activeGameSessions';
const SESSION_HISTORY_KEY = 'sessionHistory';

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const clone = (value) => JSON.parse(JSON.stringify(value));

class SessionRepository {
  static cache = {
    activeSessions: StorageService.get(ACTIVE_SESSIONS_KEY, {}),
    sessionHistory: StorageService.get(SESSION_HISTORY_KEY, [])
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
        this.persistFallback();
        this.initialized = true;
        window.dispatchEvent(new CustomEvent('gamepilot:session-storage-ready', { detail: this.getSnapshot() }));
        return this.getSnapshot();
      })
      .catch((error) => {
        console.error('SQLite session storage initialization failed; using local fallback:', error);
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

  static settleSession(entry, activeSessions) {
    const history = this.getSessionHistory();
    if (!entry?.sessionId || history.some((existing) => existing?.sessionId === entry.sessionId)) {
      return false;
    }

    history.push(clone(entry));
    this.cache.sessionHistory = history;
    this.cache.activeSessions = isPlainObject(activeSessions) ? clone(activeSessions) : {};
    this.persistFallback();
    this.api?.sessionStoreSettle?.({ entry, activeSessions: this.cache.activeSessions }).catch((error) => {
      console.error('Failed to settle session in SQLite:', error);
    });
    return true;
  }

  static replaceHistory(history) {
    this.cache.sessionHistory = Array.isArray(history) ? clone(history) : [];
    StorageService.set(SESSION_HISTORY_KEY, this.cache.sessionHistory);
    this.api?.sessionStoreReplaceHistory?.(this.cache.sessionHistory).catch((error) => {
      console.error('Failed to replace SQLite session history:', error);
    });
    return true;
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
