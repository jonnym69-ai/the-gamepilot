import GameCapturesService from './GameCapturesService';

const capture = (name, { titleHint = null, capturedAt = 0, kind = 'video' } = {}) => ({
  dir: 'C:\\Videos',
  name,
  filePath: `C:\\Videos\\${name}`,
  fileUrl: `file:///C:/Videos/${name}`,
  titleHint,
  capturedAt,
  kind,
});

const library = [{ name: 'Grand Theft Auto V Enhanced' }, { name: 'Project Zomboid' }, { name: 'ARK' }];

const session = (gameName, startTime, endTime) => ({ gameName, startTime, endTime });

describe('GameCapturesService attribution', () => {
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

  it('leaves unmatchable captures unattributed', () => {
    const cap = capture('2020-01-01 00-00-00.mp4', { capturedAt: new Date(2020, 0, 1).getTime() });
    const { byGame, unattributed } = GameCapturesService.attribute([cap], library, []);
    expect(byGame.size).toBe(0);
    expect(unattributed).toEqual([cap]);
  });
});
