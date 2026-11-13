// Passive-watch matching for emulated games — every emulated entry shares the
// emulator exe, so only a process whose command line names the specific ROM
// may count. Regression: one running emulator previously logged a session
// for every game on the platform.
const { buildWatchEntry, processMatchesWatchEntry } = require('./electron/passiveWatcher');

const scarface = buildWatchEntry({
  name: 'Scarface',
  platform: 'Emulated',
  executablePath: 'C:\\emu\\pcsx2-qt.exe',
  romPath: 'D:\\roms\\ps2\\Scarface - The World Is Yours (USA).iso',
  installDir: 'D:\\roms\\ps2',
});

const warriors = buildWatchEntry({
  name: 'The Warriors',
  platform: 'Emulated',
  executablePath: 'C:\\emu\\pcsx2-qt.exe',
  romPath: 'D:\\roms\\ps2\\The Warriors.iso',
  installDir: 'D:\\roms\\ps2',
});

const runningScarface = {
  pid: 1,
  name: 'pcsx2-qt.exe',
  path: 'c:\\emu\\pcsx2-qt.exe',
  command: '"C:\\emu\\pcsx2-qt.exe" "D:\\roms\\ps2\\Scarface - The World Is Yours (USA).iso"',
};

describe('emulated watch entries', () => {
  it('matches only the game whose ROM is running', () => {
    expect(processMatchesWatchEntry(runningScarface, scarface)).toBe(true);
    expect(processMatchesWatchEntry(runningScarface, warriors)).toBe(false);
  });

  it('does not match the bare emulator UI for any game', () => {
    const bare = { pid: 2, name: 'pcsx2-qt.exe', path: 'c:\\emu\\pcsx2-qt.exe', command: 'pcsx2-qt.exe' };
    expect(processMatchesWatchEntry(bare, scarface)).toBe(false);
    expect(processMatchesWatchEntry(bare, warriors)).toBe(false);
  });

  it('never matches an emulated entry missing its ROM path', () => {
    const noRom = buildWatchEntry({
      name: 'Mystery',
      platform: 'Emulated',
      executablePath: 'C:\\emu\\pcsx2-qt.exe',
    });
    expect(processMatchesWatchEntry(runningScarface, noRom)).toBe(false);
  });

  it('keeps path-based matching for regular games', () => {
    const hades = buildWatchEntry({
      name: 'Hades',
      platform: 'Steam',
      executablePath: 'C:\\games\\Hades.exe',
    });
    const proc = { pid: 3, name: 'hades.exe', path: 'c:\\games\\hades.exe', command: 'hades.exe' };
    expect(processMatchesWatchEntry(proc, hades)).toBe(true);
  });
});
