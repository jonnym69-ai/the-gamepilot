const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  isLikelyNonGameFolder,
  isProtectedSystemPath,
  isLikelyGameExecutable,
  safeReadDir,
  createTrackedDefaults,
  addGameIfUnique,
  parseVdf,
  getSteamPlaytimeMap
} = require('./scannerUtils');
const { getSupportedScanPlatforms } = require('../../../nativeLibraryScanner');
const { isLaunchPlatformSupported } = require('../../../launchHandler');

describe('Scanner Utils', () => {
  describe('platform support', () => {
    test('uses a Steam-only scanner path for the Linux beta', () => {
      expect(getSupportedScanPlatforms('linux')).toEqual(['steam']);
    });

    test('keeps the full launcher scan on Windows', () => {
      expect(getSupportedScanPlatforms('win32')).toEqual(expect.arrayContaining(['steam', 'epic', 'gog', 'xbox']));
    });

    test('limits Linux launching to Steam during beta', () => {
      expect(isLaunchPlatformSupported('Steam', 'linux')).toBe(true);
      expect(isLaunchPlatformSupported('Epic', 'linux')).toBe(false);
      expect(isLaunchPlatformSupported('Xbox', 'linux')).toBe(false);
      expect(isLaunchPlatformSupported('Epic', 'win32')).toBe(true);
    });
  });

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

  describe('isProtectedSystemPath', () => {
    test('returns true for drive roots and Windows system paths', () => {
      expect(isProtectedSystemPath('C:\\')).toBe(true);
      expect(isProtectedSystemPath('D:\\')).toBe(true);
      expect(isProtectedSystemPath('C:\\Windows')).toBe(true);
      expect(isProtectedSystemPath('C:\\Users\\User')).toBe(true);
      expect(isProtectedSystemPath('C:\\Program Files (x86)')).toBe(true);
    });

    test('returns false for plausible game install locations', () => {
      expect(isProtectedSystemPath('D:\\Games\\Elden Ring')).toBe(false);
      expect(isProtectedSystemPath('E:\\SteamLibrary\\steamapps\\common\\Hades')).toBe(false);
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

  const SAMPLE_LOCALCONFIG = `
"UserLocalConfigStore"
{
	"Software"
	{
		"Valve"
		{
			"Steam"
			{
				"apps"
				{
					"292030"
					{
						"LastPlayed"		"1700000000"
						"Playtime2wks"		"0"
						"Playtime"		"12345"
						"cloud"
						{
							"last_sync_state"		"2"
						}
					}
					"570"
					{
						"LastPlayed"		"1690000000"
						"Playtime"		"6000"
					}
					"9999"
					{
						"Playtime2wks"		"0"
					}
				}
			}
		}
	}
}
`;

  describe('parseVdf', () => {
    test('parses nested KeyValues including blocks within app entries', () => {
      const parsed = parseVdf(SAMPLE_LOCALCONFIG);
      const apps = parsed.UserLocalConfigStore.Software.Valve.Steam.apps;
      expect(apps['292030'].Playtime).toBe('12345');
      expect(apps['292030'].LastPlayed).toBe('1700000000');
      expect(apps['292030'].cloud.last_sync_state).toBe('2');
      expect(apps['570'].Playtime).toBe('6000');
    });
  });

  describe('getSteamPlaytimeMap', () => {
    let tmpRoot;
    let steamApps;

    beforeAll(() => {
      tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gp-steam-test-'));
      const steamRoot = path.join(tmpRoot, 'Steam');
      steamApps = path.join(steamRoot, 'steamapps');
      const configDir = path.join(steamRoot, 'userdata', '123456', 'config');
      fs.mkdirSync(steamApps, { recursive: true });
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(path.join(configDir, 'localconfig.vdf'), SAMPLE_LOCALCONFIG);
    });

    afterAll(() => {
      if (tmpRoot) fs.rmSync(tmpRoot, { recursive: true, force: true });
    });

    test('reads playtime (minutes) and converts LastPlayed seconds to ms', () => {
      const map = getSteamPlaytimeMap([steamApps]);
      expect(map['292030']).toEqual({ minutes: 12345, lastPlayedMs: 1700000000000 });
      expect(map['570']).toEqual({ minutes: 6000, lastPlayedMs: 1690000000000 });
    });

    test('skips apps with no playtime and no last-played', () => {
      const map = getSteamPlaytimeMap([steamApps]);
      expect(map['9999']).toBeUndefined();
    });

    test('returns empty map when no userdata exists', () => {
      expect(getSteamPlaytimeMap([])).toEqual({});
      expect(getSteamPlaytimeMap(['/non/existent/steamapps'])).toEqual({});
    });
  });
});
