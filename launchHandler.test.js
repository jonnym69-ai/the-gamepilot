// Emulator launch argument construction — the template is tokenized before
// placeholder substitution so paths with spaces stay single arguments, and
// the ROM is appended when a template/bare exe never mentions it.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const GameLauncher = require('./launchHandler');

jest.mock('child_process', () => ({
  ...jest.requireActual('child_process'),
  spawn: jest.fn(),
}));

// Deterministic self-heal: no real emulator installs leak into tests.
jest.mock('./electron/emulator', () => ({
  detectInstalledEmulators: jest.fn(() => []),
}));

const { detectInstalledEmulators } = require('./electron/emulator');

// Skip the constructor — it touches electron.shell. launchEmulated is pure.
const launcher = Object.create(GameLauncher.prototype);

const EMULATOR = 'C:\\emu\\pcsx2-qt.exe';
const ROM = 'D:\\roms\\ps2\\Scarface - The World Is Yours (USA).iso';

const lastSpawn = () => {
  const [exe, args] = spawn.mock.calls[spawn.mock.calls.length - 1];
  return { exe, args };
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(fs, 'existsSync').mockReturnValue(true);
  spawn.mockReturnValue({ unref: jest.fn() });
  detectInstalledEmulators.mockReturnValue([]);
});

describe('looksLikeInstaller', () => {
  const { looksLikeInstaller } = require('./launchHandler');
  it('flags installer-style filenames', () => {
    expect(looksLikeInstaller('E:\\PCSX2-v2.6.3-windows-x64-installer.exe')).toBe(true);
    expect(looksLikeInstaller('C:\\dl\\dolphin-setup.exe')).toBe(true);
    expect(looksLikeInstaller('C:\\dl\\RetroArch_Setup.exe')).toBe(true);
    expect(looksLikeInstaller('C:\\dl\\duckstation-windows-x64-release-installer.exe')).toBe(true);
  });
  it('accepts real emulator executables', () => {
    expect(looksLikeInstaller('C:\\Program Files\\PCSX2\\pcsx2-qt.exe')).toBe(false);
    expect(looksLikeInstaller('C:\\emu\\Dolphin.exe')).toBe(false);
    expect(looksLikeInstaller('C:\\emu\\retroarch.exe')).toBe(false);
  });
});

describe('launchEmulated', () => {
  it('refuses to run an installer and explains how to fix the profile', async () => {
    const result = await launcher.launchEmulated({
      name: 'Scarface',
      emulator: 'pcsx2',
      emulatorPath: 'E:\\PCSX2-v2.6.3-windows-x64-installer.exe',
      romPath: ROM,
    });
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/installer/i);
    expect(result.message).toMatch(/pcsx2-qt\.exe/);
    expect(spawn).not.toHaveBeenCalled();
  });

  it('self-heals an installer path when a real install is detected', async () => {
    const healed = 'C:\\Program Files\\PCSX2\\pcsx2-qt.exe';
    detectInstalledEmulators.mockReturnValue([
      { key: 'pcsx2', name: 'PCSX2', emulatorPath: healed, platforms: ['PlayStation 2'] },
    ]);
    const result = await launcher.launchEmulated({
      name: 'Scarface',
      emulator: 'pcsx2',
      emulatorPath: 'E:\\PCSX2-v2.6.3-windows-x64-installer.exe',
      romPath: ROM,
    });
    expect(result.success).toBe(true);
    const { exe, args } = lastSpawn();
    expect(exe).toBe(healed);
    expect(args).toEqual([ROM]);
    expect(result.metadata.emulatorPath).toBe(healed);
  });

  it('self-heals a missing emulator path via the entry console platform', async () => {
    const healed = 'C:\\Program Files\\PCSX2\\pcsx2-qt.exe';
    fs.existsSync.mockImplementation((p) => p === healed || p === ROM);
    detectInstalledEmulators.mockReturnValue([
      { key: 'pcsx2', name: 'PCSX2', emulatorPath: healed, platforms: ['PlayStation 2'] },
    ]);
    const result = await launcher.launchEmulated({
      name: 'Scarface',
      consolePlatform: 'PlayStation 2',
      emulatorPath: 'E:\\gone\\pcsx2-qt.exe',
      romPath: ROM,
    });
    expect(result.success).toBe(true);
    expect(lastSpawn().exe).toBe(healed);
  });

  it('still fails when the stored path is dead and nothing is installed', async () => {
    fs.existsSync.mockImplementation((p) => p === ROM);
    const result = await launcher.launchEmulated({
      name: 'Scarface',
      emulator: 'pcsx2',
      emulatorPath: 'E:\\gone\\pcsx2-qt.exe',
      romPath: ROM,
    });
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/not found/i);
    expect(spawn).not.toHaveBeenCalled();
  });

  it('skips detected entries that are themselves installers', async () => {
    detectInstalledEmulators.mockReturnValue([
      {
        key: 'pcsx2',
        name: 'PCSX2',
        emulatorPath: 'C:\\dl\\PCSX2-v2.6.3-installer.exe',
        platforms: ['PlayStation 2'],
      },
    ]);
    const result = await launcher.launchEmulated({
      name: 'Scarface',
      emulator: 'pcsx2',
      emulatorPath: 'E:\\PCSX2-v2.6.3-windows-x64-installer.exe',
      romPath: ROM,
    });
    expect(result.success).toBe(false);
    expect(spawn).not.toHaveBeenCalled();
  });

  it('falls back to the emulator path when the template itself hardcodes an installer', async () => {
    const result = await launcher.launchEmulated({
      name: 'Scarface',
      emulatorPath: EMULATOR,
      romPath: ROM,
      executable: '"E:\\PCSX2-v2.6.3-windows-x64-installer.exe" "{rom}"',
    });
    expect(result.success).toBe(true);
    const { exe, args } = lastSpawn();
    expect(exe).toBe(EMULATOR);
    expect(args).toEqual([ROM]);
  });

  it('starts the emulator in its own folder so it finds its config (no first-run wizard)', async () => {
    await launcher.launchEmulated({ name: 'Scarface', emulatorPath: EMULATOR, romPath: ROM });
    const options = spawn.mock.calls[spawn.mock.calls.length - 1][2];
    expect(options.cwd).toBe(path.dirname(EMULATOR));
    expect(options.detached).toBe(true);
  });

  it('returns the spawned PID so the process monitor can track it directly', async () => {
    spawn.mockReturnValue({ unref: jest.fn(), pid: 31337 });
    const result = await launcher.launchEmulated({ name: 'Scarface', emulatorPath: EMULATOR, romPath: ROM });
    expect(result.success).toBe(true);
    expect(result.metadata.pid).toBe(31337);
  });

  it('passes a spaced ROM path to the emulator as a single argument', async () => {
    const result = await launcher.launchEmulated({
      name: 'Scarface',
      emulatorPath: EMULATOR,
      romPath: ROM,
      executable: '"{emulator}" "{rom}"',
    });
    expect(result.success).toBe(true);
    const { exe, args } = lastSpawn();
    expect(exe).toBe(EMULATOR);
    expect(args).toEqual([ROM]);
  });

  it('keeps the ROM together even with an unquoted template', async () => {
    const result = await launcher.launchEmulated({
      name: 'Scarface',
      emulatorPath: EMULATOR,
      romPath: ROM,
      executable: '{emulator} {rom}',
    });
    expect(result.success).toBe(true);
    expect(lastSpawn().args).toEqual([ROM]);
  });

  it('appends the ROM when the stored command is a bare emulator exe', async () => {
    const result = await launcher.launchEmulated({
      name: 'Scarface',
      emulatorPath: EMULATOR,
      romPath: ROM,
      executable: EMULATOR,
    });
    expect(result.success).toBe(true);
    const { exe, args } = lastSpawn();
    expect(exe).toBe(EMULATOR);
    expect(args).toEqual([ROM]);
  });

  it('preserves template flags alongside the ROM', async () => {
    const result = await launcher.launchEmulated({
      name: 'Scarface',
      emulatorPath: EMULATOR,
      romPath: ROM,
      executable: '"{emulator}" --fullscreen "{rom}"',
    });
    expect(result.success).toBe(true);
    expect(lastSpawn().args).toEqual(['--fullscreen', ROM]);
  });

  it('does not duplicate the ROM when the template already places it', async () => {
    await launcher.launchEmulated({
      name: 'Scarface',
      emulatorPath: EMULATOR,
      romPath: ROM,
      executable: '"{emulator}" --iso={rom}',
    });
    const { args } = lastSpawn();
    expect(args).toEqual([`--iso=${ROM}`]);
  });

  it('fails cleanly when the emulator is missing', async () => {
    fs.existsSync.mockImplementation((p) => p !== EMULATOR);
    const result = await launcher.launchEmulated({
      name: 'Scarface',
      emulatorPath: EMULATOR,
      romPath: ROM,
    });
    expect(result.success).toBe(false);
    expect(spawn).not.toHaveBeenCalled();
  });
});

describe('launchGame dispatch', () => {
  const game = {
    name: 'Scarface',
    emulatorPath: EMULATOR,
    romPath: ROM,
    executable: '"{emulator}" "{rom}"',
    source: 'emulator',
    launchType: 'emulator',
  };

  it.each(['Emulated', 'PlayStation 2', 'PS2'])('routes platform "%s" to the emulator path', async (platform) => {
    const result = await launcher.launchGame({ ...game, platform });
    expect(result.success).toBe(true);
    const { exe, args } = lastSpawn();
    expect(exe).toBe(EMULATOR);
    expect(args).toEqual([ROM]);
  });
});
