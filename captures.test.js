// Game Bar capture filename parsing — the trailing timestamp is the only
// reliable part; a title prefix is optional, and unrelated files in the
// Videos folder must never be picked up.
const { parseCaptureFileName } = require('./electron/captures');

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

  it('ignores files without a trailing timestamp', () => {
    expect(parseCaptureFileName('PZ BAKING GUIDE.mov')).toBeNull();
    expect(parseCaptureFileName('jim scene.mov')).toBeNull();
    expect(parseCaptureFileName('random notes.txt')).toBeNull();
    expect(parseCaptureFileName('clip.mp4')).toBeNull();
  });
});
