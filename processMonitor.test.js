// Emulated-game process matching — the emulator exe is shared across every
// ROM, so a session may only attach when the specific ROM is on the process
// command line.
const { buildMonitorMatcher, processMatchesMonitor } = require('./electron/processMonitor');

const monitorFor = (game) => ({
  matcher: buildMonitorMatcher(game),
  baselinePids: new Set(),
  trackedPids: new Set(),
});

const pcsx2Process = (command = '') => ({
  pid: 4242,
  name: 'pcsx2-qt.exe',
  path: 'c:\\emu\\pcsx2-qt.exe',
  command,
});

const game = {
  name: 'Scarface',
  platform: 'Emulated',
  executablePath: 'C:\\emu\\pcsx2-qt.exe',
  romPath: 'D:\\roms\\ps2\\Scarface - The World Is Yours (USA).iso',
};

describe('emulated process matching', () => {
  it('matches the emulator process running this ROM', () => {
    const proc = pcsx2Process('"C:\\emu\\pcsx2-qt.exe" "D:\\roms\\ps2\\Scarface - The World Is Yours (USA).iso"');
    expect(processMatchesMonitor(proc, monitorFor(game))).toBe(true);
  });

  it('does not match the emulator running a different ROM', () => {
    const proc = pcsx2Process('"C:\\emu\\pcsx2-qt.exe" "D:\\roms\\ps2\\God of War II.iso"');
    expect(processMatchesMonitor(proc, monitorFor(game))).toBe(false);
  });

  it('does not match the bare emulator UI', () => {
    expect(processMatchesMonitor(pcsx2Process('"C:\\emu\\pcsx2-qt.exe"'), monitorFor(game))).toBe(false);
  });

  it('matches on the ROM filename when the full path is not on the command line', () => {
    const proc = pcsx2Process('pcsx2-qt.exe --batch "scarface - the world is yours (usa).iso"');
    expect(processMatchesMonitor(proc, monitorFor(game))).toBe(true);
  });

  it('keeps normal exe-name matching for non-emulated games', () => {
    const steamGame = { name: 'Hades', executablePath: 'C:\\games\\Hades.exe' };
    const proc = { pid: 7, name: 'hades.exe', path: 'c:\\games\\hades.exe', command: 'hades.exe' };
    expect(processMatchesMonitor(proc, monitorFor(steamGame))).toBe(true);
  });
});

// Direct spawns (emulators) already exist when the monitor snapshots its
// baseline PIDs — the regression behind "GamePilot can't detect Scarface's
// process": the real process was excluded as "pre-existing" and the monitor
// timed out after two minutes.
describe('baseline PID handling', () => {
  const romProc = pcsx2Process('"C:\\emu\\pcsx2-qt.exe" "D:\\roms\\ps2\\Scarface - The World Is Yours (USA).iso"');

  it('still matches a ROM process that was already running at baseline', () => {
    const monitor = { ...monitorFor(game), baselinePids: new Set([4242]) };
    expect(processMatchesMonitor(romProc, monitor)).toBe(true);
  });

  it('matches a seeded (spawned) PID even when nothing else would', () => {
    const monitor = { ...monitorFor(game), baselinePids: new Set([4242]), trackedPids: new Set([4242]) };
    // Command line absent — e.g. a process list that lacks CommandLine access.
    expect(processMatchesMonitor(pcsx2Process(''), monitor)).toBe(true);
  });

  it('still excludes pre-existing processes for non-emulated games', () => {
    const steamGame = { name: 'Hades', executablePath: 'C:\\games\\Hades.exe' };
    const proc = { pid: 7, name: 'hades.exe', path: 'c:\\games\\hades.exe', command: 'hades.exe' };
    const monitor = { ...monitorFor(steamGame), baselinePids: new Set([7]) };
    expect(processMatchesMonitor(proc, monitor)).toBe(false);
  });
});
