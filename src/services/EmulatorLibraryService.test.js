import EmulatorLibraryService from './EmulatorLibraryService';
import StorageService from './StorageService';

const makeProfile = (overrides = {}) => ({
  id: 'emu_test',
  name: 'TestEmu',
  consolePlatform: 'SNES',
  emulatorPath: 'C:\\Emu\\test.exe',
  romFolder: 'C:\\Roms\\snes',
  extensions: ['smc', 'sfc', 'chd', 'cue', 'bin', 'iso'],
  launchTemplate: '"{emulator}" "{rom}"',
  ...overrides,
});

const rom = (name, dir = 'C:\\Roms\\snes') => ({
  name,
  fileName: name,
  path: `${dir}\\${name}`,
  extension: name.split('.').pop().toLowerCase(),
});

describe('EmulatorLibraryService', () => {
  beforeEach(() => {
    window.electronAPI = undefined;
    StorageService.remove?.('emulatorProfiles');
  });

  describe('region/version deduplication', () => {
    const scanWith = async (roms, profile = makeProfile()) => {
      window.electronAPI = { scanEmulatorRoms: jest.fn().mockResolvedValue(roms) };
      return EmulatorLibraryService.scanProfile(profile);
    };

    it('collapses regional variants to the preferred (USA) entry', async () => {
      const games = await scanWith([
        rom('Chrono Trigger (Europe).smc'),
        rom('Chrono Trigger (Japan).smc'),
        rom('Chrono Trigger (USA).smc'),
      ]);
      expect(games).toHaveLength(1);
      expect(games[0].name).toBe('Chrono Trigger');
      expect(games[0].region).toBe('usa');
      expect(games[0].romPath).toContain('USA');
    });

    it('prefers a tagged region over an untagged dump', async () => {
      const games = await scanWith([rom('Earthbound.smc'), rom('Earthbound (USA).smc')]);
      expect(games).toHaveLength(1);
      expect(games[0].romPath).toContain('(USA)');
    });

    it('keeps multi-disc entries separate', async () => {
      const games = await scanWith(
        [rom('FFVII (USA) (Disc 1).chd'), rom('FFVII (USA) (Disc 2).chd')],
        makeProfile({ consolePlatform: 'PlayStation' })
      );
      expect(games).toHaveLength(2);
    });

    it('prefers the .cue launcher over the .bin payload for the same stem', async () => {
      const games = await scanWith(
        [rom('Ridge Racer (USA).bin'), rom('Ridge Racer (USA).cue')],
        makeProfile({ consolePlatform: 'PlayStation' })
      );
      expect(games).toHaveLength(1);
      expect(games[0].romPath).toContain('.cue');
    });

    it('does not collapse genuinely different games sharing a prefix', async () => {
      const games = await scanWith([rom('Mega Man (USA).nes'), rom('Mega Man 2 (USA).nes')]);
      expect(games).toHaveLength(2);
    });
  });

  describe('libretro thumbnail art', () => {
    it('builds a Named_Boxarts URL from the raw stem, sanitizing unsafe chars', () => {
      const game = EmulatorLibraryService.createGameFromRom(makeProfile(), rom('Secret of Mana (USA).smc'));
      expect(game.coverImage).toBe(
        'https://thumbnails.libretro.com/Nintendo%20-%20Super%20Nintendo%20Entertainment%20System/Named_Boxarts/Secret%20of%20Mana%20(USA).png'
      );
    });

    it('replaces characters libretro forbids in filenames', () => {
      const game = EmulatorLibraryService.createGameFromRom(
        makeProfile({ consolePlatform: 'Sega Genesis' }),
        rom('Dungeons & Dragons - Warriors of the Eternal Sun (USA).md')
      );
      expect(game.coverImage).toContain('Dungeons%20_%20Dragons');
      expect(game.coverImage).toContain('Sega%20-%20Mega%20Drive%20-%20Genesis');
    });

    it('leaves coverImage empty for consoles without a libretro catalog', () => {
      const game = EmulatorLibraryService.createGameFromRom(
        makeProfile({ consolePlatform: 'Mystery Console' }),
        rom('Whatever (USA).zip')
      );
      expect(game.coverImage).toBe('');
    });
  });

  describe('game shape', () => {
    it('preserves the emulator launch contract', () => {
      const game = EmulatorLibraryService.createGameFromRom(makeProfile(), rom('Test Game (USA).smc'));
      expect(game).toMatchObject({
        platform: 'Emulated',
        brandPlatform: 'SNES',
        source: 'emulator',
        launchType: 'emulator',
        emulator: 'TestEmu',
        emulatorProfileId: 'emu_test',
        executablePath: 'C:\\Emu\\test.exe',
        executable: '"{emulator}" "{rom}"',
      });
      expect(game.launchId).toBe('emu_test:' + game.romPath);
      expect(game.genres.length).toBeGreaterThan(0);
    });
  });
});
