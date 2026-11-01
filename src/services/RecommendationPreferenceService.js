import StorageService from './StorageService';

const STORAGE_KEY = 'recommendationPreferencesV1';
const CHANGE_EVENT = 'gamepilot:recommendation-preferences-changed';

/**
 * Optional, explicit "set aside" reasons attached to a game by exact title.
 * A set-aside pauses recommendations until the user clears it — it never
 * implies dislike, never edits persona data, and never hides library entries.
 * Reasons stay broad on purpose; no timestamps or durations are stored.
 */
export const RECOMMENDATION_REASONS = Object.freeze([
  { value: 'waiting-friends', label: 'Waiting for friends' },
  { value: 'technical', label: 'Technical problem' },
  { value: 'refresher', label: 'Need a refresher' },
  { value: 'not-for-me', label: 'Not for me' },
]);

const ALLOWED_REASONS = new Set(RECOMMENDATION_REASONS.map((reason) => reason.value));

const normalizeName = (name) =>
  String(typeof name === 'string' ? name : '')
    .trim()
    .toLowerCase();

const isValidRecord = (record) =>
  record && typeof record === 'object' && normalizeName(record.name) && ALLOWED_REASONS.has(record.reason);

const readAll = () => {
  const stored = StorageService.get(STORAGE_KEY, []);
  return Array.isArray(stored) ? stored.filter(isValidRecord) : [];
};

const RecommendationPreferenceService = {
  RECOMMENDATION_REASONS,

  /** @returns {{name:string, reason:string}|null} the saved record for an exact normalized title match. */
  getPreference(gameName) {
    const key = normalizeName(gameName);
    if (!key) return null;
    return readAll().find((record) => normalizeName(record.name) === key) || null;
  },

  isSetAside(gameName) {
    return this.getPreference(gameName) !== null;
  },

  hasPreferences() {
    return readAll().length > 0;
  },

  /**
   * Save a preference. `reason` must be an allowed value, or ''/null to
   * clear an existing record. Returns true only after a successful write;
   * the change event fires only on success so listeners never observe a
   * state that failed to persist.
   */
  setPreference(gameName, reason) {
    const key = normalizeName(gameName);
    if (!key) return false;
    if (reason !== '' && reason !== null && !ALLOWED_REASONS.has(reason)) return false;

    const rest = readAll().filter((record) => normalizeName(record.name) !== key);
    const next = reason ? [...rest, { name: key, reason }] : rest;
    if (!StorageService.set(STORAGE_KEY, next)) return false;

    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new Event(CHANGE_EVENT));
    }
    return true;
  },
};

export default RecommendationPreferenceService;
export { CHANGE_EVENT };
