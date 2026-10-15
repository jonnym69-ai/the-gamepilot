import PCGamingWikiService from './PCGamingWikiService';
import SaveBackupService from './SaveBackupService';

jest.mock('./PCGamingWikiService', () => ({
  __esModule: true,
  default: { lookup: jest.fn() },
}));

const emulatorGame = {
  name: 'Chrono Trigger',
  source: 'emulator',
  launchType: 'emulator',
  brandPlatform: 'SNES',
  emulatorPath: 'C:\\RetroArch\\retroarch.exe',
  romPath: 'C:\\Roms\\snes\\Chrono Trigger (USA).smc',
};

const saveLocations = [
  {
    id: 'emulator-save-c:\\retroarch\\saves',
    type: 'save',
    source: 'emulator',
    label: 'RetroArch saves (SRAM)',
    rawPath: 'C:\\RetroArch\\saves',
    resolvedPath: 'C:\\RetroArch\\saves',
    exists: true,
    canOpen: true,
  },
  {
    id: 'emulator-state-c:\\retroarch\\states',
    type: 'state',
    source: 'emulator',
    label: 'RetroArch savestates',
    rawPath: 'C:\\RetroArch\\states',
    resolvedPath: 'C:\\RetroArch\\states',
    exists: false,
    canOpen: false,
  },
];

describe('SaveBackupService emulator plans', () => {
  beforeEach(() => {
    window.electronAPI = undefined;
    jest.clearAllMocks();
  });

  it('resolves save/state dirs from the emulator instead of PCGamingWiki', async () => {
    window.electronAPI = {
      emulatorSavePaths: jest.fn().mockResolvedValue({ locations: saveLocations, note: '' }),
      saveLocationStatus: jest.fn(),
      chooseSaveBackupDestination: jest.fn(),
      createSaveBackup: jest.fn(),
    };

    const plan = await SaveBackupService.buildPlan(emulatorGame);

    expect(PCGamingWikiService.lookup).not.toHaveBeenCalled();
    expect(window.electronAPI.emulatorSavePaths).toHaveBeenCalledWith(
      expect.objectContaining({ emulatorPath: emulatorGame.emulatorPath })
    );
    expect(plan.source).toBe('emulator');
    expect(plan.locations).toHaveLength(2);
    expect(plan.readyCount).toBe(1);
    expect(plan.missingCount).toBe(1);
  });

  it('backs up only existing locations through the shared save pipeline', async () => {
    window.electronAPI = {
      emulatorSavePaths: jest.fn().mockResolvedValue({ locations: saveLocations }),
      createSaveBackup: jest.fn().mockResolvedValue({ ok: true, manifest: null }),
    };

    const result = await SaveBackupService.createBackup(emulatorGame, 'D:\\Backups', saveLocations);
    expect(window.electronAPI.createSaveBackup).toHaveBeenCalledWith({
      game: emulatorGame,
      destinationRoot: 'D:\\Backups',
      locations: [saveLocations[0]],
    });
    expect(result.ok).toBe(true);
  });

  it('fails gracefully when the emulator bridge is missing', async () => {
    const plan = await SaveBackupService.buildPlan(emulatorGame);
    expect(plan.source).toBe('emulator');
    expect(plan.locations).toHaveLength(0);
    expect(plan.note).toMatch(/desktop app/i);
  });
});
