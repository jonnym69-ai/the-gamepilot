import RetroAchievementsService, { RA_CONSOLE_IDS } from './RetroAchievementsService';
import StorageService from './StorageService';

const CATALOG = [
  { id: 319, title: 'Chrono Trigger', consoleId: 3, achievements: 44 },
  { id: 108, title: 'Final Fantasy III', consoleId: 3, achievements: 67 },
  { id: 9999, title: 'Chrono Cross', consoleId: 12, achievements: 52 },
];

const emuGame = (name, brandPlatform = 'SNES') => ({
  name,
  source: 'emulator',
  launchType: 'emulator',
  brandPlatform,
});

const configureRa = ({ enabled = true, username = 'rauser', apiKey = 'abcdef1234567890' } = {}) => {
  StorageService.setString('retroAchievementsEnabled', String(enabled));
  StorageService.setString('retroAchievementsUsername', username);
  StorageService.setString('retroAchievementsApiKey', apiKey);
};

describe('RetroAchievementsService', () => {
  beforeEach(() => {
    window.electronAPI = undefined;
    StorageService.remove?.('retroAchievementsEnabled');
    StorageService.remove?.('retroAchievementsUsername');
    StorageService.remove?.('retroAchievementsApiKey');
  });

  describe('title matching', () => {
    it('matches exact normalized titles ignoring punctuation/case', () => {
      const match = RetroAchievementsService.matchTitle(CATALOG, 'chrono trigger');
      expect(match?.id).toBe(319);
    });

    it('matches prefix titles', () => {
      const match = RetroAchievementsService.matchTitle(CATALOG, 'Chrono');
      expect(match?.id).toBe(319);
    });

    it('returns null when nothing matches', () => {
      expect(RetroAchievementsService.matchTitle(CATALOG, 'Secret of Mana')).toBeNull();
    });
  });

  describe('console mapping', () => {
    it('maps supported consoles to RA console ids', () => {
      expect(RetroAchievementsService.consoleIdFor(emuGame('X', 'SNES'))).toBe(3);
      expect(RetroAchievementsService.consoleIdFor(emuGame('X', 'PlayStation'))).toBe(12);
    });

    it('returns null for consoles RA does not cover', () => {
      expect(RetroAchievementsService.consoleIdFor(emuGame('X', 'Nintendo 3DS'))).toBeNull();
      expect(RetroAchievementsService.consoleIdFor(emuGame('X', 'GameCube'))).toBeNull();
    });

    it('only tracks emulated games', () => {
      expect(RetroAchievementsService.canTrack(emuGame('X'))).toBe(true);
      expect(RetroAchievementsService.canTrack({ name: 'X', source: 'steam' })).toBe(false);
      expect(RetroAchievementsService.canTrack(emuGame('X', 'Wii'))).toBe(false);
    });
  });

  describe('enrichEmulatedGames', () => {
    it('attaches catalog match + progress when enabled', async () => {
      configureRa();
      window.electronAPI = {
        raGameList: jest.fn().mockResolvedValue({ ok: true, games: CATALOG }),
        raGameProgress: jest.fn().mockResolvedValue({
          ok: true,
          progress: {
            gameId: 319,
            title: 'Chrono Trigger',
            total: 44,
            earned: 12,
            earnedHardcore: 10,
            completion: '27%',
            completionHardcore: '23%',
          },
        }),
      };

      const games = [emuGame('Chrono Trigger'), emuGame('Secret of Mana'), { name: 'Steam Game', source: 'steam' }];
      await RetroAchievementsService.enrichEmulatedGames(games);

      expect(games[0].raGameId).toBe(319);
      expect(games[0].raProgress).toMatchObject({ earned: 12, total: 44 });
      expect(games[1].raGameId).toBeUndefined();
      expect(games[2].raGameId).toBeUndefined();
      expect(window.electronAPI.raGameList).toHaveBeenCalledTimes(1);
      expect(window.electronAPI.raGameProgress).toHaveBeenCalledWith(
        expect.objectContaining({ gameId: 319, username: 'rauser' })
      );
    });

    it('does nothing when disabled', async () => {
      configureRa({ enabled: false });
      window.electronAPI = { raGameList: jest.fn() };
      const games = [emuGame('Chrono Trigger')];
      await RetroAchievementsService.enrichEmulatedGames(games);
      expect(games[0].raGameId).toBeUndefined();
      expect(window.electronAPI.raGameList).not.toHaveBeenCalled();
    });

    it('does nothing without credentials', async () => {
      configureRa({ username: '', apiKey: '' });
      window.electronAPI = { raGameList: jest.fn() };
      const games = [emuGame('Chrono Trigger')];
      await RetroAchievementsService.enrichEmulatedGames(games);
      expect(window.electronAPI.raGameList).not.toHaveBeenCalled();
    });
  });

  it('exports console ids used by the emulator scan', () => {
    expect(RA_CONSOLE_IDS.NES).toBe(7);
    expect(RA_CONSOLE_IDS.PSP).toBe(41);
  });
});
