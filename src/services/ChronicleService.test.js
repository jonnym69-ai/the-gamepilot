import { buildChronicle } from './ChronicleService';

// Local-time fixture dates so month buckets / late-night hours are stable
// regardless of the test machine's timezone.
const at = (year, month, day, hour = 20, minute = 0) => new Date(year, month, day, hour, minute);

const session = (name, start, minutes, overrides = {}) => ({
  gameName: name,
  playtimeMinutes: minutes,
  startTime: start.toISOString(),
  endTime: new Date(start.getTime() + minutes * 60000).toISOString(),
  ...overrides,
});

// Mirrors the target sample: July = sampling month (12 games), August =
// consolidation around Project Zomboid (~90% of 113h), September = one world
// (139h of Zomboid only, with the record 13.5h sitting on the 11th).
const buildSampleSessions = () => [
  // --- July (12 distinct games) ---
  session('Mark of the Deep', at(2026, 6, 13, 20, 0), 14),
  session('Project Zomboid', at(2026, 6, 13, 20, 18), 90),
  session('Red Dead Redemption 2', at(2026, 6, 14, 19, 0), 200),
  session('Red Dead Redemption 2', at(2026, 6, 15, 19, 0), 200),
  session('Red Dead Redemption 2', at(2026, 6, 15, 22, 0), 182),
  session('Terraria', at(2026, 6, 14, 21, 30), 180),
  session('Terraria', at(2026, 6, 16, 18, 0), 180),
  session('Rust', at(2026, 6, 15, 21, 0), 70),
  session('DayZ', at(2026, 6, 15, 23, 0), 50),
  session('Sekiro: Shadows Die Twice', at(2026, 6, 16, 12, 0), 45),
  session('Hades', at(2026, 6, 16, 13, 0), 30),
  session('Stardew Valley', at(2026, 6, 16, 14, 0), 35),
  session('Balatro', at(2026, 6, 16, 15, 0), 25),
  session('Celeste', at(2026, 6, 16, 16, 0), 40),
  session('Doom Eternal', at(2026, 6, 16, 20, 0), 55), // last July session, ends 20:55
  // --- August (~113h, ~90% Zomboid) ---
  session('Project Zomboid', at(2026, 7, 2, 20, 0), 300), // gap from Jul 16 ~16 days
  session('Project Zomboid', at(2026, 7, 5, 19, 0), 240),
  session('Project Zomboid', at(2026, 7, 9, 20, 0), 600),
  session('Project Zomboid', at(2026, 7, 12, 20, 0), 600),
  session('Project Zomboid', at(2026, 7, 14, 20, 0), 600),
  session('Project Zomboid', at(2026, 7, 18, 20, 0), 600),
  session('Project Zomboid', at(2026, 7, 22, 20, 0), 600),
  session('Project Zomboid', at(2026, 7, 26, 20, 0), 600),
  session('Project Zomboid', at(2026, 7, 28, 20, 0), 600),
  session('Project Zomboid', at(2026, 7, 30, 20, 0), 600),
  session('Project Zomboid', at(2026, 7, 31, 20, 0), 780), // → Zomboid total 6120
  session('Terraria', at(2026, 7, 11, 15, 0), 360),
  session('Stardew Valley', at(2026, 7, 16, 15, 0), 300), // others total 660
  // --- September (139h, single game; record sitting on the 11th) ---
  session('Project Zomboid', at(2026, 8, 2, 20, 0), 600),
  session('Project Zomboid', at(2026, 8, 5, 20, 0), 600),
  session('Project Zomboid', at(2026, 8, 8, 20, 0), 600),
  session('Project Zomboid', at(2026, 8, 11, 2, 30), 180), // late night
  session('Project Zomboid', at(2026, 8, 11, 14, 0), 810), // longest on record (13.5h)
  session('Project Zomboid', at(2026, 8, 13, 20, 0), 600),
  session('Project Zomboid', at(2026, 8, 15, 20, 0), 600),
  session('Project Zomboid', at(2026, 8, 18, 20, 0), 600),
  session('Project Zomboid', at(2026, 8, 20, 20, 0), 600),
  session('Project Zomboid', at(2026, 8, 22, 1, 0), 240), // late night
  session('Project Zomboid', at(2026, 8, 22, 20, 0), 510),
  session('Project Zomboid', at(2026, 8, 24, 20, 0), 600),
  session('Project Zomboid', at(2026, 8, 25, 20, 0), 600),
  session('Project Zomboid', at(2026, 8, 27, 20, 0), 600),
  session('Project Zomboid', at(2026, 8, 30, 22, 0), 600), // → total 8340
];

const libraryWithImports = [
  { name: 'Project Zomboid', importedPlaytimeMinutes: 9000, genres: ['Survival', 'RPG'], artwork: 'zomboid.jpg' },
  { name: 'Terraria', playtimeForever: 3600, genres: ['Sandbox', 'Survival'] },
  { name: 'The Witcher 3', totalPlaytime: 2400, genres: ['RPG'] },
  { name: 'Genreless App', importedPlaytimeMinutes: 600 },
];

const stripGeneratedAt = (chronicle) => {
  const { generatedAt, ...rest } = chronicle;
  return rest;
};

describe('buildChronicle', () => {
  it('computes the headline facts', () => {
    const { facts } = buildChronicle(buildSampleSessions(), []);

    expect(facts.firstSession).toEqual({
      gameName: 'Mark of the Deep',
      displayName: 'Mark of the Deep',
      startedAt: at(2026, 6, 13, 20, 0).getTime(),
      minutes: 14,
    });
    expect(facts.totalSessions).toBe(43);
    expect(facts.totalMinutes).toBe(1396 + 6780 + 8340);
    expect(facts.gameCount).toBe(12);
    expect(facts.daySpan).toBe(Math.round((at(2026, 8, 30, 22, 0) - at(2026, 6, 13, 20, 0)) / 86400000));
    expect(facts.lateNightCount).toBe(2);
    expect(facts.biggestGapDays).toBe(16);
    expect(facts.longestSession).toEqual({
      gameName: 'Project Zomboid',
      displayName: 'Project Zomboid',
      startedAt: at(2026, 8, 11, 14, 0).getTime(),
      minutes: 810,
    });
    expect(facts.lastSessionAt).toBe(at(2026, 8, 30, 22, 0).getTime());
  });

  it('aggregates per month with dominant share', () => {
    const { facts } = buildChronicle(buildSampleSessions(), []);
    const [july, august, september] = facts.perMonth;

    expect(july.month).toBe('2026-07');
    expect(july.label).toBe('July');
    expect(july.minutes).toBe(1396);
    expect(july.sessions).toBe(15);
    expect(july.gameCount).toBe(12);
    expect(july.dominantGame.name).toBe('Red Dead Redemption 2');
    expect(july.dominantGame.minutes).toBe(582);
    expect(july.isSingleGame).toBe(false);

    expect(august.month).toBe('2026-08');
    expect(august.minutes).toBe(6780);
    expect(august.dominantGame.name).toBe('Project Zomboid');
    expect(august.dominantGame.share).toBeCloseTo(6120 / 6780, 5);

    expect(september.month).toBe('2026-09');
    expect(september.isSingleGame).toBe(true);
    expect(september.dominantGame.share).toBe(1);
    expect(september.lateNightCount).toBe(2);
    expect(july.receipts).toHaveLength(15);
    expect(july.receipts[0]).toEqual({
      gameName: 'Mark of the Deep',
      displayName: 'Mark of the Deep',
      startMs: at(2026, 6, 13, 20, 0).getTime(),
      endMs: at(2026, 6, 13, 20, 14).getTime(),
      minutes: 14,
    });
  });

  it('writes one chapter per month, oldest first, with game-led titles', () => {
    const { chapters } = buildChronicle(buildSampleSessions(), [], { now: at(2026, 8, 30, 23).getTime() });
    expect(chapters.map((c) => c.key)).toEqual(['2026-07', '2026-08', '2026-09']);
    expect(chapters[0].title).toBe('Chapter One — The Record Begins');
    expect(chapters[1].title).toBe('Chapter Two — The Project Zomboid Month');
    expect(chapters[2].title).toBe('Chapter Three — Project Zomboid and Nothing Else');
    expect(chapters[0].subtitle).toBe('July 2026 · 13th–16th');
    expect(chapters[2].isCurrent).toBe(true);
    expect(chapters[0].isCurrent).toBe(false);
  });

  it('mirrors the sample prose for the opening chapter', () => {
    const { chapters } = buildChronicle(buildSampleSessions(), []);
    const july = chapters[0];
    expect(july.paragraphs[0]).toContain('chronicle opens on July 13th, 2026');
    expect(july.paragraphs[0]).toContain('fourteen minutes of Mark of the Deep');
    expect(july.paragraphs[0]).toContain('Eighteen minutes later, Project Zomboid launched for the first time');
    expect(july.paragraphs[0]).toContain('It has barely stopped since.');
    expect(july.paragraphs[1]).toContain('July was the sampling month — twelve different games passed through');
    expect(july.paragraphs[1]).toContain('Red Dead Redemption 2');
    expect(july.paragraphs[1]).toContain('a single recorded session each for');
    expect(july.paragraphs.every((p) => p.length < 700)).toBe(true);
  });

  it('writes the consolidation and one-world chapters with the longest sitting', () => {
    const { chapters } = buildChronicle(buildSampleSessions(), [], { now: at(2026, 8, 30, 23).getTime() });
    const august = chapters[1];
    expect(august.paragraphs[0]).toContain('The record had gone quiet for sixteen days');
    expect(august.paragraphs[0]).toContain('The consolidation came next.');
    expect(august.paragraphs[0]).toContain(
      'August: 113 hours, nine of every ten recorded minutes inside Project Zomboid'
    );

    const september = chapters[2];
    expect(september.paragraphs[0]).toContain('139 hours of Project Zomboid and not one recorded minute anywhere else');
    expect(september.paragraphs[1]).toContain(
      'On September 11th, 2026 came the longest sitting on record — thirteen and a half hours without leaving Project Zomboid'
    );
    expect(september.paragraphs[1]).toContain('Two sessions began between midnight and 5am');
    expect(september.paragraphs[september.paragraphs.length - 1]).toBe('This chapter is still being written.');
  });

  it('builds the prologue only from imported totals and marks it a reconstruction', () => {
    const { prologue } = buildChronicle(buildSampleSessions(), libraryWithImports);
    expect(prologue.exists).toBe(true);
    expect(prologue.isReconstruction).toBe(true);
    expect(prologue.text).toContain('Project Zomboid');
    expect(prologue.text).toContain('Terraria');
    expect(prologue.text).toContain('Survival and RPG');
  });

  it('reports genreLean only when genre data covers most imported minutes', () => {
    const { facts } = buildChronicle([], libraryWithImports);
    expect(facts.importedTotals.genreLean).toEqual(['Survival', 'RPG']);
    expect(facts.importedTotals.totalMinutes).toBe(15600);
    expect(facts.importedTotals.topGames[0]).toMatchObject({ name: 'Project Zomboid', minutes: 9000 });

    const sparseGenres = [
      { name: 'Known', importedPlaytimeMinutes: 100, genres: ['RPG'] },
      { name: 'Unknown One', importedPlaytimeMinutes: 500 },
      { name: 'Unknown Two', importedPlaytimeMinutes: 500 },
    ];
    const lean = buildChronicle([], sparseGenres).facts.importedTotals.genreLean;
    expect(lean).toBeNull();
  });

  it('omits the prologue when the library has no imported minutes', () => {
    const { prologue } = buildChronicle(buildSampleSessions(), [
      { name: 'Hades', genres: ['Action'] },
      { name: 'Zero', importedPlaytimeMinutes: 0 },
    ]);
    expect(prologue.exists).toBe(false);
    expect(prologue.isReconstruction).toBe(true);
    expect(prologue.text).toBeNull();
  });

  it('returns empty chapters for empty sessions and degrades gracefully when everything is empty', () => {
    const chronicle = buildChronicle([], []);
    expect(chronicle.chapters).toEqual([]);
    expect(chronicle.prologue.exists).toBe(false);
    expect(chronicle.facts.totalSessions).toBe(0);
    expect(chronicle.facts.firstSession).toBeNull();
    expect(chronicle.facts.longestSession).toBeNull();
    expect(chronicle.facts.perMonth).toEqual([]);
    expect(chronicle.generatedAt).toBeTruthy();

    expect(buildChronicle(undefined, undefined).chapters).toEqual([]);
    expect(buildChronicle(null, null).facts.totalSessions).toBe(0);
  });

  it('never fabricates: a two-session history emits no records or flourishes', () => {
    const sessions = [
      session('Mark of the Deep', at(2026, 6, 13, 20, 0), 14),
      session('Project Zomboid', at(2026, 6, 13, 20, 18), 18),
    ];
    const { chapters } = buildChronicle(sessions, [], { now: at(2026, 6, 13, 22).getTime() });
    expect(chapters).toHaveLength(1);
    const all = chapters[0].paragraphs.join(' ');
    expect(all).not.toContain('longest sitting');
    expect(all).not.toContain('barely stopped');
    expect(all).not.toContain('sampling month');
    expect(all).not.toContain('consolidation');
    expect(all).toContain('The chronicle opens on July 13th, 2026');
    expect(all).toContain('This chapter is still being written.');
  });

  it('survives a month whose sessions all lack a game name', () => {
    const sessions = [session('', at(2026, 6, 10, 20, 0), 30), session(null, at(2026, 6, 11, 20, 0), 45)];
    const { chapters, facts } = buildChronicle(sessions, []);
    expect(chapters).toHaveLength(1);
    expect(chapters[0].dominantGame).toBeNull();
    expect(chapters[0].paragraphs.join(' ')).toContain('July');
    expect(facts.gameCount).toBe(0);
  });

  it('keeps launcher/non-game titles out of the prose while preserving recorded totals', () => {
    // Real-data bug: "59 minutes in GOG GALAXY" appeared in the others list —
    // launcher processes are sessions but not games.
    const sessions = [
      session('Hades', at(2026, 6, 10, 20, 0), 90),
      session('Celeste', at(2026, 6, 10, 21, 40), 45),
      session('GOG GALAXY', at(2026, 6, 12, 20, 0), 240), // most minutes, not a game
      session('Hades', at(2026, 6, 13, 20, 0), 60),
      session('Steamworks Common Redistributables', at(2026, 6, 14, 20, 0), 30),
      session('GOG GALAXY', at(2026, 7, 5, 20, 0), 30), // a month of launchers only
      session('Epic Games Launcher', at(2026, 7, 6, 20, 0), 20),
    ];
    const { facts, chapters } = buildChronicle(sessions, []);
    const all = chapters.map((chapter) => chapter.paragraphs.join(' ')).join(' ');

    expect(all).not.toContain('GOG');
    expect(all).not.toContain('Steamworks');
    expect(all).not.toContain('Epic Games Launcher');

    const july = facts.perMonth[0];
    expect(july.dominantGame.name).toBe('Hades'); // next real game, not GOG's 240 min
    expect(july.gameCount).toBe(2);
    expect(july.varietyCount).toBe(2);
    expect(july.minutes).toBe(465); // recorded time stays honest
    expect(july.sessions).toBe(5);
    expect(facts.gameCount).toBe(2);

    // The launcher session remains the factual longest — but is never narrated.
    expect(facts.longestSession.gameName).toBe('GOG GALAXY');
    expect(all).not.toContain('longest sitting');

    // An all-launcher month still renders, just without game names.
    const august = chapters[1];
    expect(august.dominantGame).toBeNull();
    expect(august.paragraphs.join(' ')).toContain('August');
  });

  it('joins three or more names with middle dots when a title contains a comma', () => {
    const sessions = [
      session('Project Zomboid', at(2026, 6, 10, 20, 0), 300),
      session('Project Zomboid', at(2026, 6, 11, 20, 0), 300),
      session('Celeste', at(2026, 6, 12, 20, 0), 30),
      session('Hades', at(2026, 6, 13, 20, 0), 30),
      session('Lock, Stock & Two Smoking Barrels', at(2026, 6, 14, 20, 0), 30),
    ];
    const { chapters } = buildChronicle(sessions, []);
    const all = chapters[0].paragraphs.join(' ');
    expect(all).toContain('Celeste · Hades and Lock, Stock & Two Smoking Barrels');

    const plainSessions = [
      session('Project Zomboid', at(2026, 6, 10, 20, 0), 300),
      session('Project Zomboid', at(2026, 6, 11, 20, 0), 300),
      session('Balatro', at(2026, 6, 12, 20, 0), 30),
      session('Celeste', at(2026, 6, 13, 20, 0), 30),
      session('Hades', at(2026, 6, 14, 20, 0), 30),
    ];
    const plain = buildChronicle(plainSessions, []).chapters[0].paragraphs.join(' ');
    expect(plain).toContain('Balatro, Celeste and Hades');
    expect(plain).not.toContain('·');
  });

  it('renders sort-name titles in reader form while raw names stay the match key', () => {
    const sessions = [
      session('Matrix, The Path of Neo', at(2026, 6, 10, 20, 0), 300),
      session('Matrix, The Path of Neo', at(2026, 6, 11, 20, 0), 300),
      session('Witcher 3, The', at(2026, 6, 12, 20, 0), 30),
      session('Lord of the Rings, The The Two Towers', at(2026, 6, 13, 20, 0), 30),
    ];
    const { chapters } = buildChronicle(sessions, []);
    const all = chapters[0].paragraphs.join(' ');
    expect(all).toContain('The Matrix: Path of Neo');
    expect(all).toContain('The Witcher 3');
    expect(all).toContain('The Lord of the Rings: The Two Towers');
    expect(all).not.toContain('Matrix, The');
    // The raw stored name is still the match/group key.
    expect(chapters[0].dominantGame.name).toBe('Matrix, The Path of Neo');
    expect(chapters[0].dominantGame.displayName).toBe('The Matrix: Path of Neo');
  });

  it('says "a single recorded session for" when exactly one other game appears', () => {
    const singular = [
      session('Project Zomboid', at(2026, 6, 10, 20, 0), 300),
      session('Project Zomboid', at(2026, 6, 11, 20, 0), 300),
      session('Hades', at(2026, 6, 12, 20, 0), 180),
      session('Celeste', at(2026, 6, 13, 20, 0), 30),
    ];
    const one = buildChronicle(singular, []).chapters[0].paragraphs.join(' ');
    expect(one).toContain('a single recorded session for Celeste.');
    expect(one).not.toContain('each for');

    const plural = [...singular, session('Balatro', at(2026, 6, 14, 20, 0), 30)];
    const two = buildChronicle(plural, []).chapters[0].paragraphs.join(' ');
    expect(two).toContain('a single recorded session each for Balatro and Celeste.');
  });

  it('weaves journal entries, completions and era transitions into their monthly chapters', () => {
    const history = [
      session('Hades', at(2026, 6, 1, 20), 120),
      session('Project Zomboid', at(2026, 7, 2, 20), 600, { note: 'The base finally feels like home.' }),
      session('Project Zomboid', at(2026, 7, 5, 20), 300),
      session('Terraria', at(2026, 7, 6, 20), 60),
    ];
    const eraHistory = [
      { name: 'The Hades Era', topGame: 'Hades', since: at(2026, 6, 1, 19).getTime() },
      { name: 'The Hades Era', topGame: 'Hades', since: at(2026, 6, 1, 19, 30).getTime() },
      { name: 'The Project Zomboid Era', topGame: 'Project Zomboid', since: at(2026, 7, 2, 19).getTime() },
    ];
    const library = [
      {
        name: 'Project Zomboid',
        completionHistory: [{ status: 'beaten', timestamp: at(2026, 7, 5, 22).getTime() }],
      },
    ];
    const now = at(2026, 7, 31, 20).getTime();
    const { chapters, facts } = buildChronicle(history, library, { eraHistory, now });

    expect(chapters).toHaveLength(2);
    expect(chapters[1].title).toBe('Chapter Two — Finishing Project Zomboid');
    const august = chapters[1].paragraphs.join(' ');
    expect(august).toContain('On August 2nd, 2026, The Project Zomboid Era began.');
    expect(august).toContain('you marked Project Zomboid beaten after two recorded sessions.');
    expect(chapters[1].paragraphs[0]).toContain('August moved between Project Zomboid and Terraria.');
    expect(chapters[1].journalEntries).toEqual([
      expect.objectContaining({ text: 'The base finally feels like home.', displayName: 'Project Zomboid' }),
    ]);
    expect(august).not.toContain('The base finally feels like home.');
    expect(
      facts.narrativeEvents.filter((event) => event.type === 'era' && event.name === 'The Hades Era')
    ).toHaveLength(1);

    const eraOnly = buildChronicle(history, [], { eraHistory, now });
    expect(eraOnly.chapters[1].title).toBe('Chapter Two — The Project Zomboid Era');
  });

  it('does not call an old final month the current chapter', () => {
    const { chapters } = buildChronicle(buildSampleSessions(), [], { now: at(2026, 9, 15, 20).getTime() });
    const last = chapters[chapters.length - 1];
    expect(last.isCurrent).toBe(false);
    expect(last.paragraphs).not.toContain('This chapter is still being written.');
  });

  it('is deterministic for identical input', () => {
    const first = stripGeneratedAt(buildChronicle(buildSampleSessions(), libraryWithImports));
    const second = stripGeneratedAt(buildChronicle(buildSampleSessions(), libraryWithImports));
    expect(second).toEqual(first);
  });
});
