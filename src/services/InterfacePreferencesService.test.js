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
      expect(all.showThemedPageTitles).toBe(true);
    });

    test('does NOT set experienceMode on fresh install (banner can still show)', () => {
      expect(InterfacePreferencesService.getExperienceMode()).toBe(null);
    });

    test('respects stored prefs for existing users', () => {
      StorageService.set('interfacePreferences', {
        ornamentLevel: 'full',
      });
      const fresh = loadFresh();
      expect(fresh.get('ornamentLevel')).toBe('full');
    });

    test('drops stored keys that no longer exist', () => {
      StorageService.set('interfacePreferences', {
        ornamentLevel: 'full',
        showStreakBadge: false,
      });
      const fresh = loadFresh();
      expect(fresh.get('ornamentLevel')).toBe('full');
      expect(fresh.getAll().showStreakBadge).toBeUndefined();
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
    test('applyLibrarianPreset sets librarian mode and minimal flourish', () => {
      InterfacePreferencesService.applyLibrarianPreset();
      expect(InterfacePreferencesService.getExperienceMode()).toBe('librarian');
      expect(InterfacePreferencesService.get('ornamentLevel')).toBe('plain');
      expect(InterfacePreferencesService.get('showThemedPageTitles')).toBe(false);
    });

    test('applyBalancedPreset keeps shelves and balanced ornament', () => {
      InterfacePreferencesService.applyBalancedPreset();
      expect(InterfacePreferencesService.getExperienceMode()).toBe('balanced');
      expect(InterfacePreferencesService.get('showHomeShelves')).toBe(true);
      expect(InterfacePreferencesService.get('ornamentLevel')).toBe('balanced');
    });

    test('applyFullPreset enables everything and sets full mode', () => {
      InterfacePreferencesService.applyLibrarianPreset();
      InterfacePreferencesService.applyFullPreset();
      expect(InterfacePreferencesService.getExperienceMode()).toBe('full');
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
      InterfacePreferencesService.set('showHomeShelves', false);
      expect(document.body.classList.contains('hide-home-shelves')).toBe(true);
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

  describe('accent override', () => {
    test('rejects non-hex accent values', () => {
      InterfacePreferencesService.set('accentOverride', 'red');
      InterfacePreferencesService.set('accentOverride', '#fff');
      InterfacePreferencesService.set('accentOverride', 'rgba(1,2,3,0.5)');
      expect(InterfacePreferencesService.get('accentOverride')).toBe(null);
      expect(document.body.classList.contains('has-user-accent')).toBe(false);
    });

    test('accepts #rrggbb and null', () => {
      InterfacePreferencesService.set('accentOverride', '#14b8a6');
      expect(InterfacePreferencesService.get('accentOverride')).toBe('#14b8a6');
      InterfacePreferencesService.set('accentOverride', null);
      expect(InterfacePreferencesService.get('accentOverride')).toBe(null);
    });

    test('update() drops an invalid accentOverride but keeps other keys', () => {
      InterfacePreferencesService.update({ accentOverride: 'blue', compactMode: true });
      expect(InterfacePreferencesService.get('accentOverride')).toBe(null);
      expect(InterfacePreferencesService.get('compactMode')).toBe(true);
    });

    test('sets derived soft and strong CSS variables', () => {
      InterfacePreferencesService.set('accentOverride', '#ff00aa');
      const root = document.documentElement.style;
      expect(root.getPropertyValue('--user-accent-soft')).toBe('rgba(255, 0, 170, 0.18)');
      expect(root.getPropertyValue('--user-accent-strong')).toBe('#e00096');

      InterfacePreferencesService.set('accentOverride', null);
      expect(root.getPropertyValue('--user-accent-soft')).toBe('');
      expect(root.getPropertyValue('--user-accent-strong')).toBe('');
    });

    test('setCustomAccent validates, normalizes, and records recents', () => {
      expect(InterfacePreferencesService.setCustomAccent('not-a-color')).toBe(false);
      expect(InterfacePreferencesService.get('accentOverride')).toBe(null);

      expect(InterfacePreferencesService.setCustomAccent('#AABBCC')).toBe(true);
      expect(InterfacePreferencesService.get('accentOverride')).toBe('#aabbcc');
      expect(InterfacePreferencesService.get('recentAccents')).toEqual(['#aabbcc']);
    });

    test('recentAccents dedupes and caps at 5', () => {
      ['#111111', '#222222', '#333333', '#444444', '#555555', '#666666'].forEach((hex) =>
        InterfacePreferencesService.setCustomAccent(hex)
      );
      expect(InterfacePreferencesService.get('recentAccents')).toEqual([
        '#666666',
        '#555555',
        '#444444',
        '#333333',
        '#222222',
      ]);

      InterfacePreferencesService.setCustomAccent('#333333');
      expect(InterfacePreferencesService.get('recentAccents')[0]).toBe('#333333');
      expect(InterfacePreferencesService.get('recentAccents').filter((c) => c === '#333333')).toHaveLength(1);
    });

    test('preset accents set via set() do not touch recentAccents', () => {
      InterfacePreferencesService.set('accentOverride', '#10b981');
      expect(InterfacePreferencesService.get('recentAccents')).toEqual([]);
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
