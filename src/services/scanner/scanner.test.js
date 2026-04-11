const {
  isLikelyNonGameFolder,
  isLikelyGameExecutable,
  safeReadDir,
  createTrackedDefaults,
  addGameIfUnique
} = require('./scannerUtils');

describe('Scanner Utils', () => {
  describe('isLikelyNonGameFolder', () => {
    test('returns true for launcher folders', () => {
      expect(isLikelyNonGameFolder('Launcher')).toBe(true);
      expect(isLikelyNonGameFolder('Rockstar Games Launcher')).toBe(true);
      expect(isLikelyNonGameFolder('Social Club')).toBe(true);
    });

    test('returns true for redistributable folders', () => {
      expect(isLikelyNonGameFolder('CommonRedist')).toBe(true);
      expect(isLikelyNonGameFolder('redistributables')).toBe(true);
      expect(isLikelyNonGameFolder('vcredist')).toBe(true);
    });

    test('returns false for game folders', () => {
      expect(isLikelyNonGameFolder('Elden Ring')).toBe(false);
      expect(isLikelyNonGameFolder('GTA V')).toBe(false);
      expect(isLikelyNonGameFolder('FIFA 24')).toBe(false);
    });
  });

  describe('isLikelyGameExecutable', () => {
    test('returns false for launcher executables', () => {
      expect(isLikelyGameExecutable('launcher.exe', 'Game')).toBe(false);
      expect(isLikelyGameExecutable('updater.exe', 'Game')).toBe(false);
      expect(isLikelyGameExecutable('SocialClub.exe', 'Game')).toBe(false);
    });

    test('returns true for game executables', () => {
      expect(isLikelyGameExecutable('eldenring.exe', 'Elden Ring')).toBe(true);
      expect(isLikelyGameExecutable('GTAV.exe', 'GTA V')).toBe(true);
      expect(isLikelyGameExecutable('FIFA24.exe', 'FIFA 24')).toBe(true);
    });

    test('returns false for non-exe files', () => {
      expect(isLikelyGameExecutable('readme.txt', 'Game')).toBe(false);
      expect(isLikelyGameExecutable('config.json', 'Game')).toBe(false);
    });
  });

  describe('createTrackedDefaults', () => {
    test('creates valid tracked defaults object', () => {
      const defaults = createTrackedDefaults();
      expect(defaults).toHaveProperty('time_played', 0);
      expect(defaults).toHaveProperty('launch_count', 0);
      expect(defaults).toHaveProperty('last_played', null);
      expect(defaults).toHaveProperty('playtime');
      expect(defaults.playtime).toHaveProperty('total', 0);
      expect(defaults.playtime).toHaveProperty('daily');
      expect(defaults.playtime).toHaveProperty('weekly');
      expect(defaults.playtime).toHaveProperty('monthly');
      expect(defaults.playtime).toHaveProperty('yearly');
    });
  });

  describe('addGameIfUnique', () => {
    test('adds game when not duplicate', () => {
      const games = [];
      const game = { name: 'Elden Ring', platform: 'Steam', appid: '1245620' };
      addGameIfUnique(games, game);
      expect(games).toHaveLength(1);
      expect(games[0].name).toBe('Elden Ring');
    });

    test('skips duplicate by platform + name', () => {
      const games = [{ name: 'Elden Ring', platform: 'Steam' }];
      addGameIfUnique(games, { name: 'Elden Ring', platform: 'Steam' });
      expect(games).toHaveLength(1);
    });

    test('skips game without name or platform', () => {
      const games = [];
      addGameIfUnique(games, { name: '', platform: 'Steam' });
      addGameIfUnique(games, { name: 'Game', platform: '' });
      addGameIfUnique(games, {});
      expect(games).toHaveLength(0);
    });
  });

  describe('safeReadDir', () => {
    test('returns array for existing directory', () => {
      const result = safeReadDir(__dirname);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    test('returns empty array for non-existing directory', () => {
      const result = safeReadDir('/non/existent/path');
      expect(result).toEqual([]);
    });
  });
});
