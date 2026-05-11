import StorageService from './StorageService';

describe('InterfacePreferencesService', () => {
  let InterfacePreferencesService;

  const loadFresh = () => {
    jest.resetModules();
    return require('./InterfacePreferencesService').default;
  };

  beforeEach(() => {
    localStorage.clear();
    document.body.className = '';
    document.documentElement.style.removeProperty('--user-accent');
    InterfacePreferencesService = loadFresh();
  });

  describe('fresh-install defaults', () => {
    test('applies Balanced-flavored defaults when no prefs are stored', () => {
      const all = InterfacePreferencesService.getAll();
      expect(all.ornamentLevel).toBe('balanced');
      expect(all.showHomeRetentionQuests).toBe(false);
      expect(all.showThemedPageTitles).toBe(true);
    });

    test('does NOT set experienceMode on fresh install (banner can still show)', () => {
      expect(InterfacePreferencesService.getExperienceMode()).toBe(null);
    });

    test('respects stored prefs for existing users', () => {
      StorageService.set('interfacePreferences', {
        ornamentLevel: 'full',
        showHomeRetentionQuests: true
      });
      const fresh = loadFresh();
      expect(fresh.get('ornamentLevel')).toBe('full');
      expect(fresh.get('showHomeRetentionQuests')).toBe(true);
    });
  });

  describe('set / update / reset', () => {
    test('set persists a single key', () => {
      InterfacePreferencesService.set('compactMode', true);
      expect(InterfacePreferencesService.get('compactMode')).toBe(true);
      const stored = StorageService.get('interfacePreferences');
      expect(stored.compactMode).toBe(true);
    });

    test('set ignores unknown keys', () => {
      InterfacePreferencesService.set('notARealKey', 'x');
      expect(InterfacePreferencesService.get('notARealKey')).toBeUndefined();
    });

    test('update merges multiple keys', () => {
      InterfacePreferencesService.update({ compactMode: true, reducedMotion: true });
      expect(InterfacePreferencesService.get('compactMode')).toBe(true);
      expect(InterfacePreferencesService.get('reducedMotion')).toBe(true);
    });

    test('resetAll restores DEFAULTS', () => {
      InterfacePreferencesService.set('compactMode', true);
      InterfacePreferencesService.resetAll();
      expect(InterfacePreferencesService.get('compactMode')).toBe(false);
      expect(InterfacePreferencesService.get('ornamentLevel')).toBe('full');
    });
  });

  describe('experience presets', () => {
    test('applyLibrarianPreset sets librarian mode and hides gamification', () => {
      InterfacePreferencesService.applyLibrarianPreset();
      expect(InterfacePreferencesService.getExperienceMode()).toBe('librarian');
      expect(InterfacePreferencesService.get('showDailyButton')).toBe(false);
      expect(InterfacePreferencesService.get('showStreakBadge')).toBe(false);
      expect(InterfacePreferencesService.get('ornamentLevel')).toBe('plain');
    });

    test('applyBalancedPreset hides retention quests but keeps streak', () => {
      InterfacePreferencesService.applyBalancedPreset();
      expect(InterfacePreferencesService.getExperienceMode()).toBe('balanced');
      expect(InterfacePreferencesService.get('showStreakBadge')).toBe(true);
      expect(InterfacePreferencesService.get('showHomeRetentionQuests')).toBe(false);
      expect(InterfacePreferencesService.get('ornamentLevel')).toBe('balanced');
    });

    test('applyFullPreset enables everything and sets full mode', () => {
      InterfacePreferencesService.applyLibrarianPreset();
      InterfacePreferencesService.applyFullPreset();
      expect(InterfacePreferencesService.getExperienceMode()).toBe('full');
      expect(InterfacePreferencesService.get('showHomeRetentionQuests')).toBe(true);
      expect(InterfacePreferencesService.get('ornamentLevel')).toBe('full');
    });
  });

  describe('body class side effects', () => {
    test('applies ornament class to body', () => {
      InterfacePreferencesService.set('ornamentLevel', 'plain');
      expect(document.body.classList.contains('ornament-plain')).toBe(true);
      expect(document.body.classList.contains('ornament-full')).toBe(false);
    });

    test('compactMode toggles body class', () => {
      InterfacePreferencesService.set('compactMode', true);
      expect(document.body.classList.contains('compact-mode')).toBe(true);
      InterfacePreferencesService.set('compactMode', false);
      expect(document.body.classList.contains('compact-mode')).toBe(false);
    });

    test('hidden home sections add their hide-* classes', () => {
      InterfacePreferencesService.set('showHomeRetentionQuests', false);
      expect(document.body.classList.contains('hide-home-retention-quests')).toBe(true);
    });

    test('accentOverride sets a CSS variable on the root', () => {
      InterfacePreferencesService.set('accentOverride', '#ff00aa');
      expect(document.documentElement.style.getPropertyValue('--user-accent')).toBe('#ff00aa');
      expect(document.body.classList.contains('has-user-accent')).toBe(true);

      InterfacePreferencesService.set('accentOverride', null);
      expect(document.documentElement.style.getPropertyValue('--user-accent')).toBe('');
      expect(document.body.classList.contains('has-user-accent')).toBe(false);
    });
  });

  describe('subscribe', () => {
    test('listeners fire on changes and unsubscribe works', () => {
      const fn = jest.fn();
      const unsub = InterfacePreferencesService.subscribe(fn);
      InterfacePreferencesService.set('compactMode', true);
      expect(fn).toHaveBeenCalledTimes(1);
      unsub();
      InterfacePreferencesService.set('compactMode', false);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('non-function listeners are ignored', () => {
      const unsub = InterfacePreferencesService.subscribe('not a function');
      expect(typeof unsub).toBe('function');
    });
  });
});
