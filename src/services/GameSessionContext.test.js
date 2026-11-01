import { getGameSessionContext } from './GameSessionContext';

const now = Date.parse('2026-10-27T12:00:00Z');
const game = { id: 'steam:1', name: 'Example' };
const row = (sessionId, date, minutes, extra = {}) => ({
  sessionId,
  gameId: 'steam:1',
  gameName: 'Example',
  timestamp: `${date}T12:00:00Z`,
  playtimeMinutes: minutes,
  ...extra,
});

test('orders actual sessions and describes their median and distinct months', () => {
  const history = [
    row('a', '2026-08-01', 20),
    row('b', '2026-10-01', 40),
    row('c', '2026-09-01', 900),
    row('d', '2026-10-02', 60),
  ];
  expect(getGameSessionContext(game, history, now)).toMatchObject({
    sessionCount: 4,
    lastSessionAt: Date.parse('2026-10-02T12:00:00Z'),
    medianMinutes: 50,
    activeMonths: 3,
    sampleCount: 4,
  });
});

test('ignores future, invalid and conflicting-ID rows and dedupes settled sessions', () => {
  const valid = row('a', '2026-10-01', 20);
  const history = [
    valid,
    valid,
    row('b', '2026-10-02', 40, { gameId: 'epic:2' }),
    row('c', '2027-01-01', 40),
    row('d', '2026-10-03', Infinity),
    row('e', '2026-10-03', 0),
    row('f', '2026-10-03', 40, { timestamp: 'invalid' }),
    row('g', '2026-10-04', 30, { gameId: null, gameName: ' example ' }),
  ];
  expect(getGameSessionContext(game, history, now)).toMatchObject({
    sessionCount: 2,
    medianMinutes: null,
    sampleCount: 2,
  });
});

test('does not manufacture sessions from imported hours', () => {
  expect(getGameSessionContext({ ...game, playtimeForever: 99999 }, [], now)).toMatchObject({
    sessionCount: 0,
    lastSessionAt: null,
    medianMinutes: null,
    activeMonths: 0,
  });
});

test('merges journal and manual notes by date, without duplicate identical entries', () => {
  const at = Date.parse('2026-10-01T12:00:00Z');
  const context = getGameSessionContext(
    {
      ...game,
      sessionNotes: [
        { timestamp: at, text: 'Continue at town' },
        { timestamp: now, text: 'Next goal' },
      ],
    },
    [row('a', '2026-10-01', 20, { note: 'Continue at town' })],
    now
  );
  expect(context.notes).toEqual([
    { at: now, text: 'Next goal' },
    { at, text: 'Continue at town' },
  ]);
});

test('median is limited to the latest ten valid sessions', () => {
  const history = Array.from({ length: 11 }, (_, index) =>
    row(String(index), `2026-10-${String(index + 1).padStart(2, '0')}`, index === 0 ? 900 : 30)
  );
  expect(getGameSessionContext(game, history, now)).toMatchObject({
    sessionCount: 11,
    sampleCount: 10,
    medianMinutes: 30,
  });
});
