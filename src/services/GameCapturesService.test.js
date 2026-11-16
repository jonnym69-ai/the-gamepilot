import GameCapturesService from './GameCapturesService';

const capture = (name, { titleHint = null, capturedAt = 0, kind = 'video', source = 'gameplay-recorder' } = {}) => ({
  dir: 'C:\\Videos',
  name,
  filePath: `C:\\Videos\\${name}`,
  fileUrl: `file:///C:/Videos/${name}`,
  titleHint,
  capturedAt,
  kind,
  source,
});

const library = [{ name: 'Grand Theft Auto V Enhanced' }, { name: 'Project Zomboid' }, { name: 'ARK' }];

const session = (gameName, startTime, endTime) => ({ gameName, startTime, endTime });

describe('GameCapturesService attribution', () => {
  beforeEach(() => localStorage.clear());

  it('attributes a titled capture to the library game', () => {
    const cap = capture('Grand Theft Auto V Enhanced 2026-11-13 22-45-12.mp4', {
      titleHint: 'Grand Theft Auto V Enhanced',
      capturedAt: Date.now(),
    });
    expect(GameCapturesService.matchByTitle(cap, library)?.name).toBe('Grand Theft Auto V Enhanced');
  });

  it('matches titles loosely (punctuation/case differences)', () => {
    const cap = capture('x', { titleHint: 'grand theft auto v enhanced', capturedAt: 1 });
    expect(GameCapturesService.matchByTitle(cap, library)?.name).toBe('Grand Theft Auto V Enhanced');
  });

  it('matches the recorder process-name prefix to the game exe stem', () => {
    const lib = [
      { name: 'Hobo: Tough Life', executablePath: 'A:\\SteamLibrary\\steamapps\\common\\Hobo\\HoboRPG.exe' },
      { name: 'Project Zomboid' },
    ];
    const cap = capture('HoboRPG 15_11_2026 15_48_50.png', { titleHint: 'HoboRPG', capturedAt: 1 });
    expect(GameCapturesService.matchByTitle(cap, lib)?.name).toBe('Hobo: Tough Life');
  });

  it('leaves a hint matching neither name nor exe unattributed', () => {
    const lib = [
      { name: 'Hobo: Tough Life', executablePath: 'A:\\SteamLibrary\\steamapps\\common\\Hobo\\HoboRPG.exe' },
    ];
    const cap = capture('notepad 15_11_2026 15_48_50.png', { titleHint: 'notepad', capturedAt: 1 });
    expect(GameCapturesService.matchByTitle(cap, lib)).toBeNull();
  });

  it('attributes an anonymous capture to the session that was live then', () => {
    const start = new Date(2026, 10, 3, 23, 0, 0).getTime();
    const end = new Date(2026, 10, 4, 0, 30, 0).getTime();
    const cap = capture('2026-11-03 23-59-25.mp4', { capturedAt: new Date(2026, 10, 3, 23, 59, 25).getTime() });
    const hit = GameCapturesService.matchBySession(cap, [session('Project Zomboid', start, end)]);
    expect(hit?.gameName).toBe('Project Zomboid');
  });

  it('uses the grace window for saves just after session end', () => {
    const start = new Date(2026, 10, 3, 22, 0, 0).getTime();
    const end = new Date(2026, 10, 3, 23, 0, 0).getTime();
    const justAfter = new Date(2026, 10, 3, 23, 10, 0).getTime();
    const cap = capture('clip.mp4', { capturedAt: justAfter });
    expect(GameCapturesService.matchBySession(cap, [session('ARK', start, end)])?.gameName).toBe('ARK');
    const tooLate = new Date(2026, 10, 3, 23, 30, 0).getTime();
    expect(
      GameCapturesService.matchBySession(capture('clip2.mp4', { capturedAt: tooLate }), [session('ARK', start, end)])
    ).toBeNull();
  });

  it('prefers title attribution over session attribution', () => {
    const start = new Date(2026, 10, 3, 23, 0, 0).getTime();
    const end = new Date(2026, 10, 4, 0, 30, 0).getTime();
    // Zomboid session was live, but the file is titled GTA — title wins.
    const cap = capture('Grand Theft Auto V Enhanced 2026-11-03 23-59-25.mp4', {
      titleHint: 'Grand Theft Auto V Enhanced',
      capturedAt: new Date(2026, 10, 3, 23, 59, 25).getTime(),
    });
    const { byGame, unattributed } = GameCapturesService.attribute([cap], library, [
      session('Project Zomboid', start, end),
    ]);
    expect(byGame.get('Grand Theft Auto V Enhanced')).toEqual([cap]);
    expect(byGame.has('Project Zomboid')).toBe(false);
    expect(unattributed).toEqual([]);
  });

  it('withinSessionWindow reports session coverage for any source', () => {
    const start = new Date(2026, 10, 15, 14, 0, 0).getTime();
    const end = new Date(2026, 10, 15, 17, 0, 0).getTime();
    const sessions = [session('Hobo: Tough Life', start, end)];
    const inside = capture('Screenshot x.png', {
      capturedAt: new Date(2026, 10, 15, 15, 48, 0).getTime(),
      source: 'windows-screenshots',
    });
    const outside = capture('Screenshot y.png', {
      capturedAt: new Date(2026, 10, 15, 20, 0, 0).getTime(),
      source: 'windows-screenshots',
    });
    expect(GameCapturesService.withinSessionWindow(inside, sessions)).toBe(true);
    expect(GameCapturesService.withinSessionWindow(outside, sessions)).toBe(false);
    expect(GameCapturesService.withinSessionWindow({ ...inside, capturedAt: 0 }, sessions)).toBe(false);
  });

  it('does not session-attribute generic Windows screenshots', () => {
    const start = new Date(2026, 10, 3, 23, 0, 0).getTime();
    const end = new Date(2026, 10, 4, 0, 30, 0).getTime();
    const cap = {
      ...capture('Screenshot 2026-11-03 235925.png', {
        capturedAt: new Date(2026, 10, 3, 23, 59, 25).getTime(),
        kind: 'image',
      }),
      source: 'windows-screenshots',
    };
    expect(GameCapturesService.matchBySession(cap, [session('Project Zomboid', start, end)])).toBeNull();
  });

  it('uses an explicit user assignment before other attribution rules', () => {
    const cap = {
      ...capture('Screenshot 2026-11-03 235925.png', {
        capturedAt: new Date(2026, 10, 3, 23, 59, 25).getTime(),
        kind: 'image',
      }),
      source: 'windows-screenshots',
    };
    GameCapturesService.assign(cap, 'Project Zomboid');
    const { byGame, unattributed } = GameCapturesService.attribute([cap], library, []);
    expect(byGame.get('Project Zomboid')).toEqual([cap]);
    expect(unattributed).toEqual([]);
  });

  it('attributes Steam screenshots by appid, ahead of session matching', () => {
    const start = new Date(2026, 10, 15, 15, 0, 0).getTime();
    const end = new Date(2026, 10, 15, 17, 0, 0).getTime();
    const lib = [{ name: 'Project Zomboid', appid: '108600' }, { name: 'ARK' }];
    const cap = {
      ...capture('20261115163000_1.jpg', { capturedAt: new Date(2026, 10, 15, 16, 30, 0).getTime(), kind: 'image' }),
      source: 'steam',
      steamAppId: '108600',
    };
    // An ARK session was live, but the appid folder is the stronger truth.
    const { byGame, unattributed } = GameCapturesService.attribute([cap], lib, [session('ARK', start, end)]);
    expect(byGame.get('Project Zomboid')).toEqual([cap]);
    expect(byGame.has('ARK')).toBe(false);
    expect(unattributed).toEqual([]);
  });

  it('still session-matches Steam shots whose game is not in the library', () => {
    const start = new Date(2026, 10, 15, 15, 0, 0).getTime();
    const end = new Date(2026, 10, 15, 17, 0, 0).getTime();
    const cap = {
      ...capture('20261115163000_1.jpg', { capturedAt: new Date(2026, 10, 15, 16, 30, 0).getTime(), kind: 'image' }),
      source: 'steam',
      steamAppId: '999999',
    };
    const { byGame } = GameCapturesService.attribute(cap ? [cap] : [], library, [session('ARK', start, end)]);
    expect(byGame.get('ARK')).toEqual([cap]);
  });

  it('leaves unmatchable captures unattributed', () => {
    const cap = capture('2020-01-01 00-00-00.mp4', { capturedAt: new Date(2020, 0, 1).getTime() });
    const { byGame, unattributed } = GameCapturesService.attribute([cap], library, []);
    expect(byGame.size).toBe(0);
    expect(unattributed).toEqual([cap]);
  });
});
