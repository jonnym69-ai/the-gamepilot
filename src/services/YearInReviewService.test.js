import { YearInReviewService } from './YearInReviewService';
import { StatsAggregationService } from './StatsAggregationService';
import SessionRepository from './SessionRepository';
import CurrentEraService from './CurrentEraService';
import { findLibraryGame } from './PeriodChampionService';

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
