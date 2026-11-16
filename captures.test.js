// Game Bar capture filename parsing — the trailing timestamp is the only
// reliable part; a title prefix is optional, and unrelated files in the
// Videos folder must never be picked up.
const { parseCaptureFileName, parseSteamShotName } = require('./electron/captures');

describe('parseCaptureFileName', () => {
  it('parses a titled Game Bar clip', () => {
    const parsed = parseCaptureFileName('Grand Theft Auto V Enhanced 2026-11-13 22-45-12.mp4');
    expect(parsed.titleHint).toBe('Grand Theft Auto V Enhanced');
    expect(parsed.kind).toBe('video');
    expect(parsed.capturedAt).toBe(new Date(2026, 10, 13, 22, 45, 12).getTime());
  });

  it('parses an anonymous Game Bar clip (no title)', () => {
    const parsed = parseCaptureFileName('2026-11-03 23-59-25.mp4');
    expect(parsed.titleHint).toBeNull();
    expect(parsed.kind).toBe('video');
  });

  it('parses screenshots', () => {
    const parsed = parseCaptureFileName('Project Zomboid 2026-10-15 20-01-44.png');
    expect(parsed.titleHint).toBe('Project Zomboid');
    expect(parsed.kind).toBe('image');
  });

  it('parses ShadowPlay-style game folders file names', () => {
    const parsed = parseCaptureFileName('Fortnite 2026-09-01 18-30-00.png');
    expect(parsed.titleHint).toBe('Fortnite');
    expect(parsed.capturedAt).toBe(new Date(2026, 8, 1, 18, 30, 0).getTime());
  });

  it('parses Game Bar underscore timestamps (day-first unambiguous)', () => {
    const parsed = parseCaptureFileName('HoboRPG 15_11_2026 15_48_50.png');
    expect(parsed.titleHint).toBe('HoboRPG');
    expect(parsed.kind).toBe('image');
    expect(parsed.capturedAt).toBe(new Date(2026, 10, 15, 15, 48, 50).getTime());
  });

  it('parses Game Bar underscore timestamps (month-first unambiguous)', () => {
    const parsed = parseCaptureFileName('Fortnite 11_15_2026 09_30_00.mp4');
    expect(parsed.titleHint).toBe('Fortnite');
    expect(parsed.kind).toBe('video');
    expect(parsed.capturedAt).toBe(new Date(2026, 10, 15, 9, 30, 0).getTime());
  });

  it('uses the file mtime to resolve ambiguous day/month order', () => {
    // 05_06 could be May 6 or June 5 — mtime in June picks the day-first read.
    const mtime = new Date(2026, 5, 5, 12, 0, 0).getTime();
    const parsed = parseCaptureFileName('SomeGame 05_06_2026 12_00_00.png', mtime);
    expect(parsed.capturedAt).toBe(new Date(2026, 5, 5, 12, 0, 0).getTime());
    const mtimeMay = new Date(2026, 4, 6, 12, 0, 0).getTime();
    expect(parseCaptureFileName('SomeGame 05_06_2026 12_00_00.png', mtimeMay).capturedAt).toBe(
      new Date(2026, 4, 6, 12, 0, 0).getTime()
    );
  });

  it('rejects invalid dates in the underscore format', () => {
    expect(parseCaptureFileName('Game 31_02_2026 10_00_00.png')).toBeNull();
    expect(parseCaptureFileName('Game 99_99_2026 10_00_00.png')).toBeNull();
  });

  it('parses Windows Screenshots filenames with a compact timestamp', () => {
    const parsed = parseCaptureFileName('Screenshot 2026-09-11 164730.png');
    expect(parsed).toEqual({
      titleHint: null,
      capturedAt: new Date(2026, 8, 11, 16, 47, 30).getTime(),
      kind: 'image',
    });
  });

  it('ignores files without a trailing timestamp', () => {
    expect(parseCaptureFileName('PZ BAKING GUIDE.mov')).toBeNull();
    expect(parseCaptureFileName('jim scene.mov')).toBeNull();
    expect(parseCaptureFileName('random notes.txt')).toBeNull();
    expect(parseCaptureFileName('clip.mp4')).toBeNull();
  });
});

describe('parseSteamShotName', () => {
  it('parses Steam F12 screenshot names', () => {
    expect(parseSteamShotName('20260816163851_1.jpg')).toEqual({
      capturedAt: new Date(2026, 7, 16, 16, 38, 51).getTime(),
    });
    expect(parseSteamShotName('20261115093000_2.png')).toEqual({
      capturedAt: new Date(2026, 10, 15, 9, 30, 0).getTime(),
    });
  });

  it('rejects non-Steam names', () => {
    expect(parseSteamShotName('Screenshot 2026-09-11 164730.png')).toBeNull();
    expect(parseSteamShotName('2026-11-15 15-29-44.mp4')).toBeNull();
    expect(parseSteamShotName('photo.jpg')).toBeNull();
  });
});
