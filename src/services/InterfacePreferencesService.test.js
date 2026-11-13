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

  describe('secondary accent override', () => {
    test('sets --user-accent-secondary only when a primary accent is active', () => {
      const root = document.documentElement.style;
      InterfacePreferencesService.set('accentSecondaryOverride', '#38bdf8');
      expect(root.getPropertyValue('--user-accent-secondary')).toBe('');

      InterfacePreferencesService.set('accentOverride', '#8b5cf6');
      expect(root.getPropertyValue('--user-accent-secondary')).toBe('#38bdf8');
      expect(root.getPropertyValue('--user-accent-secondary-soft')).toBe('rgba(56, 189, 248, 0.18)');
    });

    test('rejects non-hex secondary values', () => {
      InterfacePreferencesService.set('accentOverride', '#8b5cf6');
      InterfacePreferencesService.set('accentSecondaryOverride', 'blue');
      expect(InterfacePreferencesService.get('accentSecondaryOverride')).toBe(null);
      expect(document.documentElement.style.getPropertyValue('--user-accent-secondary')).toBe('');
    });

    test('clears with null and when the primary accent is removed', () => {
      const root = document.documentElement.style;
      InterfacePreferencesService.set('accentOverride', '#8b5cf6');
      InterfacePreferencesService.set('accentSecondaryOverride', '#38bdf8');
      InterfacePreferencesService.set('accentSecondaryOverride', null);
      expect(root.getPropertyValue('--user-accent-secondary')).toBe('');

      InterfacePreferencesService.set('accentSecondaryOverride', '#38bdf8');
      InterfacePreferencesService.set('accentOverride', null);
      expect(root.getPropertyValue('--user-accent-secondary')).toBe('');
      expect(document.body.classList.contains('has-user-accent')).toBe(false);
    });

    test('update() drops an invalid secondary but keeps other keys', () => {
      InterfacePreferencesService.update({ accentSecondaryOverride: 'red', accentOverride: '#8b5cf6' });
      expect(InterfacePreferencesService.get('accentSecondaryOverride')).toBe(null);
      expect(InterfacePreferencesService.get('accentOverride')).toBe('#8b5cf6');
    });

    test('setCustomAccentSecondary validates, normalizes, and records recents', () => {
      expect(InterfacePreferencesService.setCustomAccentSecondary('nah')).toBe(false);
      expect(InterfacePreferencesService.setCustomAccentSecondary('#A1B2C3')).toBe(true);
      expect(InterfacePreferencesService.get('accentSecondaryOverride')).toBe('#a1b2c3');
      expect(InterfacePreferencesService.get('recentAccents')[0]).toBe('#a1b2c3');
    });
  });

  describe('accent reach tints', () => {
    const TINT_VARS = [
      '--border-primary',
      '--border-secondary',
      '--border-color',
      '--text-primary',
      '--text-color',
      '--text-secondary',
      '--text-muted',
    ];

    beforeEach(() => {
      TINT_VARS.forEach((v) => document.documentElement.style.removeProperty(v));
      document.body.classList.remove('tint-headers');
    });

    test('tinted borders blend the accent into theme-owned border vars and restore cleanly', () => {
      const root = document.documentElement.style;
      // Simulate a theme-owned inline slot.
      root.setProperty('--border-primary', '#2a2a3a');
      InterfacePreferencesService.set('accentOverride', '#8b5cf6');
      InterfacePreferencesService.set('accentTintBorders', true);

      const mixed = root.getPropertyValue('--border-primary');
      expect(mixed).toContain('color-mix(in srgb, #8b5cf6 24%');
      expect(mixed).toContain('#2a2a3a');
      // Untouched groups stay theme-owned.
      expect(root.getPropertyValue('--text-primary')).toBe('');

      InterfacePreferencesService.set('accentTintBorders', false);
      expect(root.getPropertyValue('--border-primary')).toBe('#2a2a3a');
    });

    test('tinted text mixes body and muted text vars', () => {
      const root = document.documentElement.style;
      root.setProperty('--text-secondary', 'rgba(255,255,255,0.8)');
      InterfacePreferencesService.set('accentOverride', '#ff6b35');
      InterfacePreferencesService.set('accentTintText', true);

      expect(root.getPropertyValue('--text-primary')).toContain('color-mix(in srgb, #ff6b35 10%');
      expect(root.getPropertyValue('--text-secondary')).toContain('color-mix(in srgb, #ff6b35 18%');
      expect(root.getPropertyValue('--text-secondary')).toContain('rgba(255,255,255,0.8)');

      InterfacePreferencesService.set('accentOverride', null);
      expect(root.getPropertyValue('--text-secondary')).toBe('rgba(255,255,255,0.8)');
    });

    test('secondary accent drives the tint when set', () => {
      const root = document.documentElement.style;
      root.setProperty('--border-primary', '#2a2a3a');
      InterfacePreferencesService.set('accentOverride', '#8b5cf6');
      InterfacePreferencesService.set('accentSecondaryOverride', '#d946ef');
      InterfacePreferencesService.set('accentTintBorders', true);
      expect(root.getPropertyValue('--border-primary')).toContain('color-mix(in srgb, #d946ef 24%');
    });

    test('tinted headers toggles a body class only while an accent is active', () => {
      InterfacePreferencesService.set('accentTintHeaders', true);
      expect(document.body.classList.contains('tint-headers')).toBe(false);

      InterfacePreferencesService.set('accentOverride', '#8b5cf6');
      expect(document.body.classList.contains('tint-headers')).toBe(true);

      InterfacePreferencesService.set('accentOverride', null);
      expect(document.body.classList.contains('tint-headers')).toBe(false);
    });

    test('theme changes recapture the new base values instead of restoring stale ones', () => {
      const root = document.documentElement.style;
      root.setProperty('--border-primary', '#2a2a3a');
      InterfacePreferencesService.set('accentOverride', '#8b5cf6');
      InterfacePreferencesService.set('accentTintBorders', true);
      expect(root.getPropertyValue('--border-primary')).toContain('#2a2a3a');

      // Theme switch rewrites the slot, then fires themeChange.
      root.setProperty('--border-primary', '#445566');
      window.dispatchEvent(new CustomEvent('themeChange'));

      const remixed = root.getPropertyValue('--border-primary');
      expect(remixed).toContain('color-mix(in srgb, #8b5cf6 24%');
      expect(remixed).toContain('#445566');
      expect(remixed).not.toContain('#2a2a3a');
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
