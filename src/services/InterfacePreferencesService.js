/**
 * InterfacePreferencesService - Central store for user-controlled UI toggles.
 * All values persist via StorageService under a single key so import/export
 * of settings stays one cohesive object.
 */

import StorageService from './StorageService';

const STORAGE_KEY = 'interfacePreferences';

const DEFAULTS = Object.freeze({
  // Navbar
  showDailyButton: true,
  showStreakBadge: true,
  // Home section visibility
  showHomeRewardStrip: true,
  showHomeCheckinPill: true,
  showHomeDailyMissions: true,
  showHomeRetentionQuests: true,
  showHomeBacklogRescue: true,
  showHomeContinuePlaying: true,
  showHomeRecommendations: true,
  showHomeShelves: true,
  showHomeLauncherSummary: true,
  showHomeHeroSummary: true,
  // Visual density & motion
  compactMode: false,
  reducedMotion: false,
  // Theme flourishes
  showThemedPageTitles: true,
  // Theme ornamentation: 'plain' | 'balanced' | 'full'
  ornamentLevel: 'full',
  // Accent override (null = follow theme)
  accentOverride: null,
  // Pinned game ids (string list) for Library quick row
  pinnedGameIds: [],
  // Quick-launch hotbar
  showQuickLaunchHotbar: true,
  quickLaunchCollapsed: false
});

// Values applied to fresh installs as a calmer default ("Balanced" experience).
// Existing users keep whatever they have stored — only truly empty storage gets these.
const FRESH_INSTALL_DEFAULTS = Object.freeze({
  showHomeRetentionQuests: false,
  ornamentLevel: 'balanced',
  showThemedPageTitles: true
});

// Full Balanced preset values (used by applyBalancedPreset).
const BALANCED_PRESET_VALUES = Object.freeze({
  showDailyButton: true,
  showStreakBadge: true,
  showHomeRewardStrip: true,
  showHomeCheckinPill: true,
  showHomeDailyMissions: true,
  showHomeRetentionQuests: false,
  showHomeBacklogRescue: true,
  showHomeShelves: true,
  showHomeLauncherSummary: true,
  showHomeRecommendations: true,
  showHomeContinuePlaying: true,
  showHomeHeroSummary: true,
  compactMode: false,
  reducedMotion: false,
  showThemedPageTitles: true,
  ornamentLevel: 'balanced',
  showQuickLaunchHotbar: true
});

const listeners = new Set();

const readRaw = () => {
  const stored = StorageService.get(STORAGE_KEY, null);
  if (!stored || typeof stored !== 'object') {
    // Fresh install: start in a calmer default. Do NOT persist yet — wait for first
    // explicit user action (or banner pick) so the banner can still appear.
    return { ...DEFAULTS, ...FRESH_INSTALL_DEFAULTS };
  }
  return { ...DEFAULTS, ...stored };
};

let cache = readRaw();

const notify = () => {
  listeners.forEach((fn) => {
    try { fn(cache); } catch (_err) { /* ignore listener errors */ }
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('gamepilot:interface-preferences-changed', { detail: cache }));
  }
};

const SECTION_CLASS_MAP = {
  showHomeRewardStrip: 'hide-home-reward-strip',
  showHomeCheckinPill: 'hide-home-checkin-pill',
  showHomeDailyMissions: 'hide-home-daily-missions',
  showHomeRetentionQuests: 'hide-home-retention-quests',
  showHomeBacklogRescue: 'hide-home-backlog-rescue',
  showHomeContinuePlaying: 'hide-home-continue-playing',
  showHomeRecommendations: 'hide-home-recommendations',
  showHomeShelves: 'hide-home-shelves',
  showHomeLauncherSummary: 'hide-home-launcher-summary',
  showHomeHeroSummary: 'hide-home-hero-summary',
  showThemedPageTitles: 'hide-themed-page-titles'
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
  if (prefs.accentOverride && typeof prefs.accentOverride === 'string') {
    document.documentElement.style.setProperty('--user-accent', prefs.accentOverride);
    body.classList.add('has-user-accent');
  } else {
    document.documentElement.style.removeProperty('--user-accent');
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
    cache = { ...cache, [key]: value };
    StorageService.set(STORAGE_KEY, cache);
    applyBodyClasses(cache);
    notify();
  },

  update(partial = {}) {
    cache = { ...cache, ...partial };
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
      showHomeRewardStrip: false,
      showHomeCheckinPill: false,
      showHomeDailyMissions: false,
      showHomeRetentionQuests: false,
      showHomeBacklogRescue: false,
      showHomeShelves: false,
      showHomeLauncherSummary: false,
      showHomeRecommendations: true,
      showHomeContinuePlaying: true,
      showHomeHeroSummary: false,
      compactMode: true,
      reducedMotion: true,
      showThemedPageTitles: false
    });
    StorageService.set('experienceMode', 'focus');
  },

  applyLibrarianPreset() {
    // Pure tool-mode: no gamification surfaces, clean fonts, minimal flourish.
    this.update({
      showDailyButton: false,
      showStreakBadge: false,
      showHomeRewardStrip: false,
      showHomeCheckinPill: false,
      showHomeDailyMissions: false,
      showHomeRetentionQuests: false,
      showHomeBacklogRescue: false,
      showHomeShelves: true,
      showHomeLauncherSummary: true,
      showHomeRecommendations: true,
      showHomeContinuePlaying: true,
      showHomeHeroSummary: true,
      compactMode: true,
      reducedMotion: false,
      showThemedPageTitles: false,
      ornamentLevel: 'plain',
      showQuickLaunchHotbar: true
    });
    StorageService.set('experienceMode', 'librarian');
  },

  applyBalancedPreset() {
    // Tool-first with light gamification: streak visible, retention hidden.
    this.update({ ...BALANCED_PRESET_VALUES });
    StorageService.set('experienceMode', 'balanced');
  },

  applyFullPreset() {
    // Everything on: full gamification, flourishes, themed titles.
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
  }
};

export default InterfacePreferencesService;
