// LabsService
// -----------------------------------------------------------------------------
// GamePilot 1.7 "Focus" build: the app's core purpose is beating choice
// paralysis — "what should I play next" and "what should I buy next" — driven
// by a learned gaming identity. A large number of secondary/experimental
// features accumulated over time and buried that core.
//
// This service exposes a single user preference: whether to show "Labs"
// (experimental / non-core) features in the navigation. It is OFF by default so
// a fresh install presents only the focused core experience. Nothing is
// deleted — flipping the toggle restores every advanced screen.
//
// The preference is stored locally (local-first) and broadcast via a custom
// event so the navbar and settings stay in sync without a global store.
// -----------------------------------------------------------------------------

const STORAGE_KEY = 'gamepilot.labsEnabledV1';
const CHANGE_EVENT = 'gamepilot:labs-changed';

const isBrowser = () => typeof window !== 'undefined' && !!window.localStorage;

const LabsService = {
  STORAGE_KEY,
  CHANGE_EVENT,

  isEnabled() {
    if (!isBrowser()) return false;
    try {
      return window.localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  },

  setEnabled(enabled) {
    if (!isBrowser()) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
      window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { enabled: !!enabled } }));
    } catch {
      /* ignore storage failures — labs simply stays at its current value */
    }
  },

  toggle() {
    const next = !this.isEnabled();
    this.setEnabled(next);
    return next;
  },

  // Subscribe to changes. Returns an unsubscribe function.
  subscribe(callback) {
    if (!isBrowser() || typeof callback !== 'function') return () => {};
    const handler = (event) => callback(event?.detail?.enabled ?? this.isEnabled());
    window.addEventListener(CHANGE_EVENT, handler);
    return () => window.removeEventListener(CHANGE_EVENT, handler);
  }
};

export default LabsService;
