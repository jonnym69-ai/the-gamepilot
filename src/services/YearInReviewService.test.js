import { YearInReviewService } from './YearInReviewService';
import { StatsAggregationService } from './StatsAggregationService';
import SessionRepository from './SessionRepository';
import CurrentEraService from './CurrentEraService';
import { findLibraryGame } from './PeriodChampionService';
import SteamAchievementsService from './SteamAchievementsService';
import SteamPublicService from './SteamPublicService';
import { GameCurationService } from './GameCurationService';

jest.mock('./StatsAggregationService', () => ({
  StatsAggregationService: { getNormalizedSessionHistory: jest.fn(() => []) },
}));
jest.mock('./UserBehaviorProfile', () => ({
  UserBehaviorProfile: {
    getSessionLengthCategory: jest.fn(() => '30-60'),
    getTimeOfDay: jest.fn(() => 'Evening'),
  },
}));
jest.mock('./DateKeyService', () => ({
  getDateKey: jest.fn((date) => date.toISOString().slice(0, 10)),
}));
jest.mock('./GamingPersonaService', () => ({
  __esModule: true,
  default: { getPersona: jest.fn(() => ({})) },
}));
jest.mock('./PeriodChampionService', () => ({
  __esModule: true,
  default: { getChampionForPeriod: jest.fn(() => null) },
  findLibraryGame: jest.fn(() => null),
}));
jest.mock('./SessionRepository', () => ({
  __esModule: true,
  default: { getSessionHistory: jest.fn(() => []) },
}));
jest.mock('./CurrentEraService', () => ({
  __esModule: true,
  default: { getCurrentEra: jest.fn(() => ({ history: [] })) },
}));
jest.mock('./SteamAchievementsService');
jest.mock('./SteamPublicService');
jest.mock('./GameCurationService');

const session = ({ game, genre = 'RPG', mood = 'Cozy', minutes = 60, year = 2024, month = 0, day = 10 }) => ({
  gameName: game,
  gameId: game,
  platform: 'Steam',
  mood,
  genres: [genre],
  primaryGenre: genre,
  coverUrl: '',
  playtimeMinutes: minutes,
  timestamp: new Date(year, month, day, 20, 0, 0),
});

beforeEach(() => {
  jest.clearAllMocks();
  StatsAggregationService.getNormalizedSessionHistory.mockReturnValue([]);
  SessionRepository.getSessionHistory.mockReturnValue([]);
  CurrentEraService.getCurrentEra.mockReturnValue({ history: [] });
  SteamAchievementsService.getCachedForGame.mockReturnValue(null);
  SteamPublicService.appIdOf.mockImplementation((game) => game?.appid || '');
  findLibraryGame.mockImplementation(() => null);
  GameCurationService.getAllCompletions.mockReturnValue({});
  GameCurationService.getCompletionHistory.mockReturnValue({});
});

describe('YearInReviewService eras', () => {
  test('merges adjacent months sharing a dominant signature into one stretch', () => {
    StatsAggregationService.getNormalizedSessionHistory.mockReturnValue([
      session({ game: 'Stardew Valley', month: 0, day: 5 }),
      session({ game: 'Stardew Valley', month: 0, day: 12 }),
      session({ game: 'Stardew Valley', month: 1, day: 3 }),
      session({ game: 'Celeste', genre: 'Platformer', mood: 'Determined', month: 2 }),
    ]);

    const snapshot = YearInReviewService.getYearSnapshot([], 2024);

    expect(snapshot.eras.stretches).toHaveLength(2);
    expect(snapshot.eras.stretches[0].monthLabel).toBe('Jan–Feb');
    expect(snapshot.eras.stretches[0].monthCount).toBe(2);
    expect(snapshot.eras.stretches[0].topGame).toBe('Stardew Valley');
    expect(snapshot.eras.stretches[1].monthLabel).toBe('Mar');
    expect(snapshot.eras.stretches[1].topGame).toBe('Celeste');
  });

  test('months with no sessions break a stretch even when signatures match', () => {
    StatsAggregationService.getNormalizedSessionHistory.mockReturnValue([
      session({ game: 'Stardew Valley', month: 0 }),
      session({ game: 'Stardew Valley', month: 2 }), // February is empty
    ]);

    const snapshot = YearInReviewService.getYearSnapshot([], 2024);

    expect(snapshot.eras.stretches).toHaveLength(2);
    expect(snapshot.eras.stretches[0].monthLabel).toBe('Jan');
    expect(snapshot.eras.stretches[1].monthLabel).toBe('Mar');
  });

  test('dominant signature is weighted by minutes played', () => {
    StatsAggregationService.getNormalizedSessionHistory.mockReturnValue([
      session({ game: 'Light RPG', genre: 'RPG', mood: 'Cozy', minutes: 5, month: 3 }),
      session({ game: 'Heavy Shooter', genre: 'Shooter', mood: 'Intense', minutes: 300, month: 3 }),
    ]);

    const snapshot = YearInReviewService.getYearSnapshot([], 2024);

    expect(snapshot.eras.stretches).toHaveLength(1);
    expect(snapshot.eras.stretches[0].dominantGenre).toBe('Shooter');
    expect(snapshot.eras.stretches[0].dominantMood).toBe('Intense');
    expect(snapshot.eras.stretches[0].topGame).toBe('Heavy Shooter');
  });

  test('a year with no sessions produces no eras', () => {
    StatsAggregationService.getNormalizedSessionHistory.mockReturnValue([
      session({ game: 'Old Game', year: 2023, month: 5 }),
    ]);

    const snapshot = YearInReviewService.getYearSnapshot([], 2024);

    expect(snapshot.hasData).toBe(false);
    expect(snapshot.eras.stretches).toEqual([]);
  });

  test('imported-only playtime produces no eras — imported totals are undated', () => {
    StatsAggregationService.getNormalizedSessionHistory.mockReturnValue([]);
    const importedOnlyLibrary = [{ name: 'Steam Game', importedPlaytimeMinutes: 12000, playtimeSource: 'steam' }];

    const snapshot = YearInReviewService.getYearSnapshot(importedOnlyLibrary, 2024);

    expect(snapshot.hasData).toBe(false);
    expect(snapshot.eras.stretches).toEqual([]);
  });

  test('includes recorded currentEraHistory entries that fall inside the year', () => {
    StatsAggregationService.getNormalizedSessionHistory.mockReturnValue([
      session({ game: 'Stardew Valley', month: 0 }),
    ]);
    CurrentEraService.getCurrentEra.mockReturnValue({
      history: [
        { signature: 'b', name: 'The Old Era', genre: 'rts', topGame: 'AoE II', since: Date.UTC(2023, 6, 1) },
        { signature: 'a', name: 'The Saga Era', genre: 'rpg', topGame: 'Skyrim', since: Date.UTC(2024, 2, 15) },
      ],
    });

    const snapshot = YearInReviewService.getYearSnapshot([], 2024);

    expect(snapshot.eras.recorded).toHaveLength(1);
    expect(snapshot.eras.recorded[0].name).toBe('The Saga Era');
    expect(snapshot.eras.recorded[0].isCurrent).toBe(true);
  });
});

describe('YearInReviewService journal notes', () => {
  test('collects the year’s session notes, oldest first', () => {
    StatsAggregationService.getNormalizedSessionHistory.mockReturnValue([
      session({ game: 'Stardew Valley', month: 0 }),
    ]);
    SessionRepository.getSessionHistory.mockReturnValue([
      {
        gameName: 'Stardew Valley',
        endTime: new Date(2024, 0, 10).toISOString(),
        playtimeMinutes: 60,
        note: 'good farm day',
      },
      { gameName: 'Celeste', endTime: new Date(2024, 5, 2).toISOString(), playtimeMinutes: 40, note: 'summited' },
      { gameName: 'No Note', endTime: new Date(2024, 2, 1).toISOString(), playtimeMinutes: 30 },
      { gameName: 'Old Note', endTime: new Date(2023, 0, 1).toISOString(), playtimeMinutes: 30, note: 'last year' },
    ]);

    const snapshot = YearInReviewService.getYearSnapshot([], 2024);

    expect(snapshot.journalNotes).toHaveLength(2);
    expect(snapshot.journalNotes[0].gameName).toBe('Stardew Valley');
    expect(snapshot.journalNotes[0].note).toBe('good farm day');
    expect(snapshot.journalNotes[1].note).toBe('summited');
  });
});

describe('YearInReviewService story paragraphs', () => {
  const paragraphIds = (snapshot) => snapshot.story.paragraphs.map((paragraph) => paragraph.id);
  const paragraphText = (snapshot, id) =>
    snapshot.story.paragraphs.find((paragraph) => paragraph.id === id)?.text || '';

  test('a dominant single-game year emits opener/dominant/eras but no season lines', () => {
    StatsAggregationService.getNormalizedSessionHistory.mockReturnValue([
      session({ game: 'Project Zomboid', genre: 'Survival', mood: 'Intense', minutes: 400, month: 6, day: 14 }),
      session({ game: 'Project Zomboid', genre: 'Survival', mood: 'Intense', minutes: 500, month: 7 }),
      session({ game: 'Project Zomboid', genre: 'Survival', mood: 'Intense', minutes: 300, month: 8 }),
    ]);

    const snapshot = YearInReviewService.getYearSnapshot([], 2024);
    const ids = paragraphIds(snapshot);

    expect(ids).toContain('opener');
    expect(ids).toContain('dominant');
    expect(ids).toContain('era-0');
    expect(ids).toContain('closer');
    expect(ids).not.toContain('seasons');
    expect(paragraphText(snapshot, 'dominant')).toMatch(/took 100% of your year/);
  });

  test('a mid-year tracking start is called out in the opener', () => {
    StatsAggregationService.getNormalizedSessionHistory.mockReturnValue([
      session({ game: 'Project Zomboid', month: 6, day: 14 }),
      session({ game: 'Celeste', month: 8 }),
    ]);

    const snapshot = YearInReviewService.getYearSnapshot([], 2024);

    expect(paragraphText(snapshot, 'opener')).toMatch(/Your year started on \d+ Jul with Project Zomboid\./);
    expect(paragraphText(snapshot, 'opener')).toMatch(/story of your second half/);
  });

  test('newcomers are games whose first ever session falls in this year', () => {
    StatsAggregationService.getNormalizedSessionHistory.mockReturnValue([
      session({ game: 'Old Faithful', year: 2023, month: 5 }),
      session({ game: 'Old Faithful', month: 0, minutes: 100 }),
      session({ game: 'Terraria', month: 1, day: 2, minutes: 60 }),
      session({ game: 'Terraria', month: 1, day: 9, minutes: 60 }),
      session({ game: 'Terraria', month: 1, day: 16, minutes: 60 }),
      session({ game: 'Rust', month: 2, minutes: 30 }),
    ]);

    const snapshot = YearInReviewService.getYearSnapshot([], 2024);
    const newcomers = paragraphText(snapshot, 'newcomers');

    expect(newcomers).toMatch(/picked up 2 new games this year/);
    expect(newcomers).toMatch(/Terraria stuck \(3 sessions\)/);
    expect(newcomers).toMatch(/Rust didn't \(1\)/);

    // Multi-game year keeps per-season lines and collapses quiet seasons.
    const seasons = paragraphText(snapshot, 'seasons');
    expect(seasons).toMatch(/Winter: \d+h/);
    expect(seasons).toMatch(/Summer and autumn had no tracked sessions\./);
  });

  test('an empty year produces no paragraphs', () => {
    StatsAggregationService.getNormalizedSessionHistory.mockReturnValue([
      session({ game: 'Old Game', year: 2023, month: 5 }),
    ]);

    const snapshot = YearInReviewService.getYearSnapshot([], 2024);

    expect(snapshot.hasData).toBe(false);
    expect(snapshot.story.paragraphs).toEqual([]);
  });
});

describe('YearInReviewService story covers', () => {
  test('game-naming paragraphs carry the session cover art', () => {
    StatsAggregationService.getNormalizedSessionHistory.mockReturnValue([
      { ...session({ game: 'Hades', month: 1 }), coverUrl: 'https://img/hades.jpg' },
      { ...session({ game: 'Hades', month: 2 }), coverUrl: 'https://img/hades.jpg' },
    ]);

    const snapshot = YearInReviewService.getYearSnapshot([], 2024);
    const opener = snapshot.story.paragraphs.find((p) => p.id === 'opener');
    const dominant = snapshot.story.paragraphs.find((p) => p.id === 'dominant');

    expect(opener.covers?.[0]?.portrait).toBe('https://img/hades.jpg');
    expect(dominant.covers?.[0]?.portrait).toBe('https://img/hades.jpg');
    expect(opener.covers?.[0]?.name).toBe('Hades');
  });

  test('library games resolve a real artwork bundle ahead of session coverUrl', () => {
    findLibraryGame.mockReturnValue({ name: 'Hades', appid: '1145360', platform: 'Steam' });
    StatsAggregationService.getNormalizedSessionHistory.mockReturnValue([
      { ...session({ game: 'Hades', month: 1 }), coverUrl: 'https://img/session.jpg' },
      session({ game: 'Hades', month: 2 }),
    ]);

    const snapshot = YearInReviewService.getYearSnapshot(
      [{ name: 'Hades', appid: '1145360', platform: 'Steam' }],
      2024
    );
    const opener = snapshot.story.paragraphs.find((p) => p.id === 'opener');

    expect(opener.covers?.[0]?.portrait).toContain('library_600x900');
  });

  test('paragraphs without a named game carry no cover', () => {
    StatsAggregationService.getNormalizedSessionHistory.mockReturnValue([
      session({ game: 'Hades', month: 1 }),
      session({ game: 'Hades', month: 2 }),
    ]);

    const snapshot = YearInReviewService.getYearSnapshot([], 2024);
    const rhythm = snapshot.story.paragraphs.find((p) => p.id === 'rhythm');

    expect(rhythm.covers).toBeUndefined();
  });

  test('non-library games resolve artwork from the session appid stub', () => {
    findLibraryGame.mockReturnValue(null);
    StatsAggregationService.getNormalizedSessionHistory.mockReturnValue([
      { ...session({ game: 'Mark of the Deep', month: 6 }), gameId: 1234567 },
      session({ game: 'Hades', month: 7 }),
    ]);

    const snapshot = YearInReviewService.getYearSnapshot([], 2024);
    const opener = snapshot.story.paragraphs.find((p) => p.id === 'opener');

    expect(opener.covers?.[0]?.name).toBe('Mark of the Deep');
    expect(opener.covers?.[0]?.portrait).toContain('1234567');
  });

  test('newcomer paragraph carries covers for the named games', () => {
    findLibraryGame.mockReturnValue(null);
    StatsAggregationService.getNormalizedSessionHistory.mockReturnValue([
      session({ game: 'Terraria', month: 1, day: 2, minutes: 60 }),
      session({ game: 'Terraria', month: 1, day: 9, minutes: 60 }),
      session({ game: 'Terraria', month: 1, day: 16, minutes: 60 }),
      session({ game: 'Rust', month: 2, minutes: 30 }),
    ]);

    const snapshot = YearInReviewService.getYearSnapshot([], 2024);
    const newcomers = snapshot.story.paragraphs.find((p) => p.id === 'newcomers');

    expect(newcomers.covers?.map((cover) => cover.name)).toEqual(['Terraria', 'Rust']);
  });
});

describe('YearInReviewService milestones', () => {
  test('finished keeps one entry per game at the highest status reached in the year', () => {
    StatsAggregationService.getNormalizedSessionHistory.mockReturnValue([
      session({ game: 'Celeste', month: 3, day: 4 }),
      session({ game: 'Stardew Valley', month: 5, day: 1 }),
    ]);
    GameCurationService.getAllCompletions.mockReturnValue({
      Celeste: {
        status: 'completed',
        history: [
          { status: 'beaten', previousStatus: 'playing', timestamp: Date.UTC(2024, 2, 10), note: '' },
          { status: 'completed', previousStatus: 'beaten', timestamp: Date.UTC(2024, 3, 5), note: '' },
        ],
      },
      'Stardew Valley': {
        status: 'beaten',
        history: [
          { status: '100%', previousStatus: 'beaten', timestamp: Date.UTC(2023, 11, 30), note: '' },
          { status: 'beaten', previousStatus: 'playing', timestamp: Date.UTC(2024, 5, 1), note: '' },
        ],
      },
      'Ancient Game': {
        status: 'beaten',
        history: [{ status: 'beaten', previousStatus: 'playing', timestamp: Date.UTC(2023, 6, 1), note: '' }],
      },
    });

    const snapshot = YearInReviewService.getYearSnapshot([], 2024);
    const finished = snapshot.milestones.finished;

    expect(finished).toHaveLength(2);
    expect(finished[0].name).toBe('Celeste');
    expect(finished[0].status).toBe('completed');
    expect(finished[0].at).toBe(Date.UTC(2024, 3, 5));
    // The '100%' entry happened last year — 2024's highest status is 'beaten'.
    expect(finished[1].name).toBe('Stardew Valley');
    expect(finished[1].status).toBe('beaten');
    expect(finished[1].at).toBe(Date.UTC(2024, 5, 1));
    expect(snapshot.milestones.hasAny).toBe(true);
  });

  test('a Steam finish maps the detection note to the session that held the unlock', () => {
    const unlockMs = new Date(2024, 5, 1, 21, 0, 0).getTime();
    StatsAggregationService.getNormalizedSessionHistory.mockReturnValue([
      { ...session({ game: 'Stardew Valley', minutes: 90 }), timestamp: new Date(unlockMs) },
    ]);
    findLibraryGame.mockReturnValue({ name: 'Stardew Valley', appid: '413150' });
    SteamAchievementsService.getCachedForGame.mockReturnValue({
      ok: true,
      achievements: [{ apiname: 'A1', name: 'Farm Finale', achieved: true, unlockTime: unlockMs / 1000 }],
    });
    GameCurationService.getAllCompletions.mockReturnValue({
      'Stardew Valley': {
        status: 'beaten',
        history: [
          {
            status: 'beaten',
            previousStatus: 'playing',
            timestamp: unlockMs + 60000,
            note: 'Detected via Steam achievement "Farm Finale"',
          },
        ],
      },
    });

    const snapshot = YearInReviewService.getYearSnapshot([{ name: 'Stardew Valley', appid: '413150' }], 2024);
    const entry = snapshot.milestones.finished[0];

    expect(entry.finishingSession).toEqual({ unlockMs, endTime: unlockMs, minutes: 90 });
  });

  test('a non-Steam finish uses the last session ending within 24h before it', () => {
    const finishAt = new Date(2024, 5, 2, 12, 0, 0).getTime();
    StatsAggregationService.getNormalizedSessionHistory.mockReturnValue([
      { ...session({ game: 'Celeste', minutes: 60 }), timestamp: new Date(2024, 5, 1, 20, 0, 0) },
      { ...session({ game: 'Celeste', minutes: 30 }), timestamp: new Date(2024, 4, 1, 20, 0, 0) },
    ]);
    GameCurationService.getAllCompletions.mockReturnValue({
      Celeste: {
        status: 'beaten',
        history: [{ status: 'beaten', previousStatus: 'playing', timestamp: finishAt, note: '' }],
      },
    });

    const snapshot = YearInReviewService.getYearSnapshot([], 2024);
    const entry = snapshot.milestones.finished[0];

    expect(entry.finishingSession).toEqual({ endTime: new Date(2024, 5, 1, 20, 0, 0).getTime(), minutes: 60 });
  });

  test('comebacks flag a return after a 60+ day gap and ignore shorter gaps', () => {
    StatsAggregationService.getNormalizedSessionHistory.mockReturnValue([
      session({ game: 'Factorio', month: 0, day: 5 }),
      session({ game: 'Factorio', month: 5, day: 20 }),
      session({ game: 'Factorio', month: 6, day: 25 }),
      session({ game: 'Slay the Spire', month: 0, day: 10 }),
      session({ game: 'Slay the Spire', month: 1, day: 15 }),
    ]);

    const snapshot = YearInReviewService.getYearSnapshot([], 2024);
    const comebacks = snapshot.milestones.comebacks;

    expect(comebacks).toHaveLength(1);
    expect(comebacks[0].name).toBe('Factorio');
    expect(comebacks[0].gapDays).toBeGreaterThanOrEqual(60);
    expect(comebacks[0].returnedAt).toBe(new Date(2024, 5, 20, 20, 0, 0).getTime());
  });

  test('a comeback can span the new-year boundary', () => {
    StatsAggregationService.getNormalizedSessionHistory.mockReturnValue([
      session({ game: 'Factorio', year: 2023, month: 10, day: 1 }),
      session({ game: 'Factorio', year: 2024, month: 1, day: 15 }),
    ]);

    const snapshot = YearInReviewService.getYearSnapshot([], 2024);

    expect(snapshot.milestones.comebacks).toHaveLength(1);
    expect(snapshot.milestones.comebacks[0].name).toBe('Factorio');
    expect(snapshot.milestones.comebacks[0].gapDays).toBeGreaterThanOrEqual(60);
  });

  test('firsts only include games never played before this year', () => {
    StatsAggregationService.getNormalizedSessionHistory.mockReturnValue([
      session({ game: 'Old Faithful', year: 2023, month: 5 }),
      session({ game: 'Old Faithful', year: 2024, month: 0, minutes: 100 }),
      session({ game: 'Terraria', year: 2024, month: 1, minutes: 200 }),
    ]);

    const snapshot = YearInReviewService.getYearSnapshot([], 2024);

    expect(snapshot.milestones.firstsCount).toBe(1);
    expect(snapshot.milestones.firsts[0].name).toBe('Terraria');
    expect(snapshot.milestones.firsts[0].playtimeMinutes).toBe(200);
    expect(snapshot.milestones.firsts[0].firstPlayedAt).toBe(new Date(2024, 1, 10, 20, 0, 0).getTime());
  });

  test('records compute the longest streak across a month boundary, the biggest month and busiest day', () => {
    const noon = (month, day, minutes = 60) => ({
      ...session({ game: 'Daily Game', minutes }),
      timestamp: new Date(2024, month, day, 12, 0, 0),
    });
    StatsAggregationService.getNormalizedSessionHistory.mockReturnValue([
      noon(0, 30),
      noon(0, 31),
      noon(1, 1, 120),
      noon(1, 1, 120),
      noon(1, 2, 120),
      noon(5, 10),
      noon(5, 12),
    ]);

    const snapshot = YearInReviewService.getYearSnapshot([], 2024);
    const records = snapshot.milestones.records;

    expect(records.longestStreakDays.days).toBe(4);
    expect(records.biggestMonth).toEqual({ label: 'February', minutes: 360 });
    expect(records.mostSessionsDay.count).toBe(2);
  });

  test('achievements stay null while no Steam game has cached data', () => {
    StatsAggregationService.getNormalizedSessionHistory.mockReturnValue([session({ game: 'Hades' })]);
    SteamAchievementsService.getCachedForGame.mockReturnValue(null);

    const snapshot = YearInReviewService.getYearSnapshot([{ name: 'Hades', appid: '1145360' }], 2024);

    expect(snapshot.milestones.achievements).toBeNull();
  });

  test('achievements count in-year unlocks, games, the rarest unlock and the busiest day', () => {
    const firstUnlock = new Date(2024, 3, 10, 12, 0, 0).getTime();
    const secondUnlock = new Date(2024, 3, 10, 18, 0, 0).getTime();
    const lastYearUnlock = new Date(2023, 3, 10, 12, 0, 0).getTime();
    StatsAggregationService.getNormalizedSessionHistory.mockReturnValue([session({ game: 'Hades' })]);
    SteamAchievementsService.getCachedForGame.mockImplementation((appid) =>
      String(appid) === '1145360'
        ? {
            ok: true,
            achievements: [
              { apiname: 'A1', name: 'Rare One', achieved: true, unlockTime: firstUnlock / 1000, percent: 2.5 },
              { apiname: 'A2', name: 'Common One', achieved: true, unlockTime: secondUnlock / 1000, percent: 40 },
              { apiname: 'A3', name: 'Old One', achieved: true, unlockTime: lastYearUnlock / 1000, percent: 1 },
              { apiname: 'A4', name: 'Locked', achieved: false, unlockTime: 0 },
            ],
          }
        : null
    );

    const snapshot = YearInReviewService.getYearSnapshot([{ name: 'Hades', appid: '1145360' }], 2024);
    const achievements = snapshot.milestones.achievements;

    expect(achievements.unlockedThisYear).toBe(2);
    expect(achievements.gamesWithUnlocks).toBe(1);
    expect(achievements.rarest).toMatchObject({ name: 'Rare One', gameName: 'Hades', percent: 2.5 });
    expect(achievements.busiestDay.count).toBe(2);
  });
});
