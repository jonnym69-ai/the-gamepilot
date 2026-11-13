import { buildGameShareData, buildGameShareCaption } from './GameShareCard';

describe('buildGameShareData completion mapping', () => {
  it('maps curation statuses to display labels', () => {
    expect(buildGameShareData({ name: 'X', completionStatus: 'beaten' }).completionStatus).toBe('Beaten');
    expect(buildGameShareData({ name: 'X', completionStatus: '100%' }).completionStatus).toBe('100%');
    expect(buildGameShareData({ name: 'X', completionStatus: 'completed' }).completionStatus).toBe('Completed');
    expect(buildGameShareData({ name: 'X', completionStatus: 'playing' }).completionStatus).toBe('In Progress');
  });

  it('keeps legacy completed flag and playtime fallbacks', () => {
    expect(buildGameShareData({ name: 'X', completed: true }).completionStatus).toBe('Completed');
    expect(buildGameShareData({ name: 'X', time_played: 60 }).completionStatus).toBe('In Progress');
    expect(buildGameShareData({ name: 'X' }).completionStatus).toBe('Backlog');
  });

  it('carries beaten-session evidence through to the card data', () => {
    const data = buildGameShareData(
      { name: 'X', completionStatus: 'beaten' },
      { beatenSession: { minutes: 161, day: 'Nov 12' } }
    );
    expect(data.beatenSession).toEqual({ minutes: 161, day: 'Nov 12' });
  });
});

describe('buildGameShareCaption beaten lines', () => {
  it('leads with the finishing session when evidence exists', () => {
    const data = buildGameShareData(
      { name: 'Hades', completionStatus: 'beaten', time_played: 1200 },
      { beatenSession: { minutes: 161, day: 'Nov 12' } }
    );
    const caption = buildGameShareCaption(data);
    expect(caption).toContain('Hades');
    expect(caption).toContain('session');
    expect(caption).toContain('Nov 12');
  });

  it('returns a beaten line for beaten games without session evidence', () => {
    const data = buildGameShareData({ name: 'Hades', completionStatus: 'beaten', time_played: 1200 });
    const caption = buildGameShareCaption(data);
    expect(caption).toContain('Hades');
    expect(caption).toMatch(/✅/);
  });
});
