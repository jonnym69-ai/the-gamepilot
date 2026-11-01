/**
 * InterfacePreferencesService - Central store for user-controlled UI toggles.
 * All values persist via StorageService under a single key so import/export
 * of settings stays one cohesive object.
 */

import StorageService from './StorageService';

const STORAGE_KEY = 'interfacePreferences';

const DEFAULTS = Object.freeze({
  // Home section visibility
  showHomeShelves: true,
  // Visual density & motion
  compactMode: false,
  reducedMotion: false,
  // Theme flourishes
  showThemedPageTitles: true,
  // Theme ornamentation: 'plain' | 'balanced' | 'full'
  ornamentLevel: 'full',
  // Accent override (null = follow theme)
  accentOverride: null,
  // Up to 5 most recent custom accent hexes
  recentAccents: [],
  // Pinned game ids (string list) for Library quick row
  pinnedGameIds: [],
  // Quick-launch hotbar
  showQuickLaunchHotbar: true,
  quickLaunchCollapsed: false,
  // Playtime display unit: 'auto' | 'hours' | 'days'
  playtimeUnit: 'auto',
});

// Values applied to fresh installs as a calmer default ("Balanced" experience).
// Existing users keep whatever they have stored — only truly empty storage gets these.
const FRESH_INSTALL_DEFAULTS = Object.freeze({
  ornamentLevel: 'balanced',
  showThemedPageTitles: true,
});

// Full Balanced preset values (used by applyBalancedPreset).
const BALANCED_PRESET_VALUES = Object.freeze({
  showHomeShelves: true,
  compactMode: false,
  reducedMotion: false,
  showThemedPageTitles: true,
  ornamentLevel: 'balanced',
  showQuickLaunchHotbar: true,
});

// Drop stored keys that no longer exist so stale preferences from older
// versions never leak through getAll().
const pickKnownKeys = (stored) => {
  const clean = {};
  Object.keys(DEFAULTS).forEach((key) => {
    if (key in stored) clean[key] = stored[key];
  });
  return clean;
};

const ACCENT_HEX_RE = /^#[0-9a-fA-F]{6}$/;
const MAX_RECENT_ACCENTS = 5;

const isValidAccent = (value) => value === null || ACCENT_HEX_RE.test(String(value));

const hexToRgb = (hex) => ({
  r: parseInt(hex.slice(1, 3), 16),
  g: parseInt(hex.slice(3, 5), 16),
  b: parseInt(hex.slice(5, 7), 16),
});

const accentSoft = (hex) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, 0.18)`;
};

const accentStrong = (hex) => {
  const { r, g, b } = hexToRgb(hex);
  const darken = (c) =>
    Math.round(c * 0.88)
      .toString(16)
      .padStart(2, '0');
  return `#${darken(r)}${darken(g)}${darken(b)}`;
};

const listeners = new Set();

const readRaw = () => {
  const stored = StorageService.get(STORAGE_KEY, null);
  if (!stored || typeof stored !== 'object') {
    // Fresh install: start in a calmer default. Do NOT persist yet — wait for first
    // explicit user action (or banner pick) so the banner can still appear.
    return { ...DEFAULTS, ...FRESH_INSTALL_DEFAULTS };
  }
  return { ...DEFAULTS, ...pickKnownKeys(stored) };
};

let cache = readRaw();

const notify = () => {
  listeners.forEach((fn) => {
    try {
      fn(cache);
    } catch (_err) {
      /* ignore listener errors */
    }
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('gamepilot:interface-preferences-changed', { detail: cache }));
  }
};

const SECTION_CLASS_MAP = {
  showHomeShelves: 'hide-home-shelves',
  showThemedPageTitles: 'hide-themed-page-titles',
};

const applyBodyClasses = (prefs) => {
  if (typeof document === 'undefined') return;
  const body = document.body;
  body.classList.toggle('compact-mode', !!prefs.compactMode);
  body.classList.toggle('reduced-motion', !!prefs.reducedMotion);
  Object.entries(SECTION_CLASS_MAP).forEach(([key, cls]) => {
    body.classList.toggle(cls, prefs[key] === false);
  });
  ['ornament-plain', 'ornament-balanced', 'ornament-full'].forEach((cls) => body.classList.remove(cls));
  const level = ['plain', 'balanced', 'full'].includes(prefs.ornamentLevel) ? prefs.ornamentLevel : 'full';
  body.classList.add(`ornament-${level}`);
  const rootStyle = document.documentElement.style;
  if (isValidAccent(prefs.accentOverride) && prefs.accentOverride) {
    rootStyle.setProperty('--user-accent', prefs.accentOverride);
    rootStyle.setProperty('--user-accent-soft', accentSoft(prefs.accentOverride));
    rootStyle.setProperty('--user-accent-strong', accentStrong(prefs.accentOverride));
    body.classList.add('has-user-accent');
  } else {
    rootStyle.removeProperty('--user-accent');
    rootStyle.removeProperty('--user-accent-soft');
    rootStyle.removeProperty('--user-accent-strong');
    body.classList.remove('has-user-accent');
  }
};

applyBodyClasses(cache);

const InterfacePreferencesService = {
  DEFAULTS,

  getAll() {
    return { ...cache };
  },

  get(key) {
    return cache[key];
  },

  set(key, value) {
    if (!(key in DEFAULTS)) return;
    if (key === 'accentOverride' && !isValidAccent(value)) return;
    cache = { ...cache, [key]: value };
    StorageService.set(STORAGE_KEY, cache);
    applyBodyClasses(cache);
    notify();
  },

  update(partial = {}) {
    const clean = { ...partial };
    if ('accentOverride' in clean && !isValidAccent(clean.accentOverride)) {
      delete clean.accentOverride;
    }
    cache = { ...cache, ...clean };
    StorageService.set(STORAGE_KEY, cache);
    applyBodyClasses(cache);
    notify();
  },

  resetAll() {
    cache = { ...DEFAULTS };
    StorageService.set(STORAGE_KEY, cache);
    applyBodyClasses(cache);
    notify();
  },

  applyFocusHomePreset() {
    this.update({
      showHomeShelves: false,
      compactMode: true,
      reducedMotion: true,
      showThemedPageTitles: false,
    });
    StorageService.set('experienceMode', 'focus');
  },

  applyLibrarianPreset() {
    // Pure tool-mode: clean fonts, minimal flourish.
    this.update({
      showHomeShelves: true,
      compactMode: true,
      reducedMotion: false,
      showThemedPageTitles: false,
      ornamentLevel: 'plain',
      showQuickLaunchHotbar: true,
    });
    StorageService.set('experienceMode', 'librarian');
  },

  applyBalancedPreset() {
    // Tool-first with light flourishes.
    this.update({ ...BALANCED_PRESET_VALUES });
    StorageService.set('experienceMode', 'balanced');
  },

  applyFullPreset() {
    // Everything on: flourishes, themed titles.
    this.resetAll();
    StorageService.set('experienceMode', 'full');
  },

  getExperienceMode() {
    return StorageService.get('experienceMode', null);
  },

  subscribe(listener) {
    if (typeof listener !== 'function') return () => {};
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  setCustomAccent(hex) {
    const value = String(hex || '').toLowerCase();
    if (!ACCENT_HEX_RE.test(value)) return false;
    const recents = [value, ...(cache.recentAccents || []).filter((c) => String(c).toLowerCase() !== value)].slice(
      0,
      MAX_RECENT_ACCENTS
    );
    this.update({ accentOverride: value, recentAccents: recents });
    return true;
  },

  isPinned(gameKey) {
    const ids = (cache.pinnedGameIds || []).map(String);
    return ids.includes(String(gameKey));
  },

  pinGame(gameKey) {
    const key = String(gameKey);
    const ids = (cache.pinnedGameIds || []).map(String);
    if (!ids.includes(key)) {
      this.set('pinnedGameIds', [...ids, key]);
    }
  },

  unpinGame(gameKey) {
    const key = String(gameKey);
    const ids = (cache.pinnedGameIds || []).map(String);
    this.set(
      'pinnedGameIds',
      ids.filter((id) => id !== key)
    );
  },

  togglePin(gameKey) {
    if (this.isPinned(gameKey)) {
      this.unpinGame(gameKey);
    } else {
      this.pinGame(gameKey);
    }
  },
};

export default InterfacePreferencesService;
