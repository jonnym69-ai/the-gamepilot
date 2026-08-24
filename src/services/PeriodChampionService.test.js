// PeriodChampionService.test.js
import PeriodChampionService from './PeriodChampionService';
import SessionRepository from './SessionRepository';
import StorageService from './StorageService';
import GamingPersonaService from './GamingPersonaService';
import { resolveGameArtworkBundle } from './GameArtworkService';

// Mock SessionRepository so tests can inject synthetic sessions.
jest.mock('./SessionRepository', () => ({
  __esModule: true,
  default: {
    getSessionHistory: jest.fn(() => []),
  },
}));

// Mock StorageService with an in-memory store defined inside the factory
// (jest.mock is hoisted, so outer variables aren't initialized yet).
jest.mock('./StorageService', () => {
  const store = new Map();
  return {
    __esModule: true,
    default: {
      _store: store,
      get: jest.fn((key, def) => (store.has(key) ? store.get(key) : def)),
      set: jest.fn((key, value) => { store.set(key, value); return true; }),
      remove: jest.fn((key) => { store.delete(key); return true; }),
    },
  };
});

// Mock GameArtworkService to avoid heavy artwork resolution.
jest.mock('./GameArtworkService', () => ({
  __esModule: true,
  resolveGameArtworkBundle: jest.fn(() => ({ artwork: 'portrait.png', fallbackSrc: 'cover.png', placeholder: null })),
}));

// Mock GamingPersonaService to keep tests deterministic and fast.
jest.mock('./GamingPersonaService', () => ({
  __esModule: true,
  default: {
    getPersona: jest.fn(() => ({
      primaryPersona: {
        label: 'The Doomsday Prepper who replays everything',
        archetypeLabel: 'Comfort Replay Junkie',
        theme: { id: 'doomsday_prepper', label: 'Doomsday Prepper', shortName: 'zombie survival' },
        roast: 'Stockpiling hours like canned goods.',
      },
      summaryRoast: 'Stockpiling hours like canned goods.',
    })),
    getGameSpecificRoast: jest.fn(() => 'Project Zomboid called — they want their spokesperson back.'),
  },
}));

// CRA's jest config sets resetMocks: true, which wipes all mock
// implementations before every test. Re-establish them here so each
// test starts with working mocks without having to re-set them individually.
beforeEach(() => {
  StorageService.get.mockImplementation((key, def) => (StorageService._store.has(key) ? StorageService._store.get(key) : def));
  StorageService.set.mockImplementation((key, value) => { StorageService._store.set(key, value); return true; });
  StorageService.remove.mockImplementation((key) => { StorageService._store.delete(key); return true; });
  SessionRepository.getSessionHistory.mockReturnValue([]);
  resolveGameArtworkBundle.mockReturnValue({ artwork: 'portrait.png', fallbackSrc: 'cover.png', placeholder: 'placeholder.png' });
  GamingPersonaService.getPersona.mockReturnValue({
    primaryPersona: {
      label: 'The Doomsday Prepper who replays everything',
      archetypeLabel: 'Comfort Replay Junkie',
      theme: { id: 'doomsday_prepper', label: 'Doomsday Prepper', shortName: 'zombie survival' },
      roast: 'Stockpiling hours like canned goods.',
    },
    summaryRoast: 'Stockpiling hours like canned goods.',
  });
  GamingPersonaService.getGameSpecificRoast.mockReturnValue('Project Zomboid called — they want their spokesperson back.');
});

const makeSession = (gameName, minutes, daysAgo, from = new Date('2026-08-20T12:00:00Z')) => ({
  sessionId: `${gameName}-${daysAgo}-${Math.random()}`,
  gameName,
  playtimeMinutes: minutes,
  endTime: new Date(from.getTime() - daysAgo * 86400000).toISOString(),
});

describe('PeriodChampionService calendar helpers', () => {
  test('getWeekKey rolls back to Sunday', () => {
    // 2026-08-19 is a Wednesday; Sunday start is 2026-08-16.
    expect(PeriodChampionService.getWeekKey('2026-08-19T15:00:00Z')).toBe('2026-08-16');
  });

  test('getMonthKey returns YYYY-MM', () => {
    expect(PeriodChampionService.getMonthKey('2026-08-19T15:00:00Z')).toBe('2026-08');
  });

  test('getYearKey returns YYYY', () => {
    expect(PeriodChampionService.getYearKey('2026-08-19T15:00:00Z')).toBe('2026');
  });

  test('getPeriodKey returns null for invalid date', () => {
    expect(PeriodChampionService.getPeriodKey('not-a-date', 'week')).toBeNull();
  });

  test('getPeriodBounds week is 7 days', () => {
    const { start, end } = PeriodChampionService.getPeriodBounds('2026-08-16', 'week');
    const dayDiff = Math.round((end - start) / 86400000);
    expect(dayDiff).toBe(7);
  });

  test('getPeriodBounds month spans the month', () => {
    const { start, end } = PeriodChampionService.getPeriodBounds('2026-02', 'month');
    const dayDiff = Math.round((end - start) / 86400000);
    expect(dayDiff).toBe(28); // 2026 is not a leap year
  });

  test('getPeriodBounds year spans 365/366 days', () => {
    const { start, end } = PeriodChampionService.getPeriodBounds('2026', 'year');
    const dayDiff = Math.round((end - start) / 86400000);
    expect(dayDiff).toBe(365);
  });
});

describe('PeriodChampionService live champion', () => {
  beforeEach(() => {
    StorageService._store.clear();
    SessionRepository.getSessionHistory.mockReset();
  });

  test('returns null when no sessions exist', () => {
    SessionRepository.getSessionHistory.mockReturnValue([]);
    const champ = PeriodChampionService.getLiveChampion('week', { now: new Date('2026-08-20T12:00:00Z') });
    expect(champ).toBeNull();
  });

  test('returns the most-played game in the current week', () => {
    // Reference now: 2026-08-20 (Wednesday). Week starts 2026-08-16.
    const now = new Date('2026-08-20T12:00:00Z');
    SessionRepository.getSessionHistory.mockReturnValue([
      makeSession('Project Zomboid', 60 * 23, 1), // 23h, 1 day ago (in week)
      makeSession('Rust', 60 * 5, 2), // 5h, 2 days ago (in week)
      makeSession('Old Game', 60 * 100, 30), // 100h but 30 days ago (out of week)
    ]);
    const champ = PeriodChampionService.getLiveChampion('week', { now });
    expect(champ).not.toBeNull();
    expect(champ.game.name).toBe('Project Zomboid');
    expect(champ.minutes).toBe(1380);
    expect(champ.runnerUp.name).toBe('Rust');
    expect(champ.runnerUp.minutes).toBe(300);
    expect(champ.lockedAt).toBeNull();
    expect(champ.personaSnapshot).not.toBeNull();
    expect(champ.personaSnapshot.label).toBe('The Doomsday Prepper who replays everything');
  });

  test('ignores sessions with zero minutes', () => {
    const now = new Date('2026-08-20T12:00:00Z');
    SessionRepository.getSessionHistory.mockReturnValue([
      makeSession('Ghost', 0, 1),
    ]);
    expect(PeriodChampionService.getLiveChampion('week', { now })).toBeNull();
  });

  test('month champion aggregates across the calendar month', () => {
    const now = new Date('2026-08-20T12:00:00Z');
    SessionRepository.getSessionHistory.mockReturnValue([
      makeSession('Project Zomboid', 60 * 10, 5),
      makeSession('Project Zomboid', 60 * 15, 10),
      makeSession('Rust', 60 * 3, 15),
      makeSession('July Game', 60 * 200, 40), // July, out of August
    ]);
    const champ = PeriodChampionService.getLiveChampion('month', { now });
    expect(champ.game.name).toBe('Project Zomboid');
    expect(champ.minutes).toBe(1500);
    expect(champ.sessionCount).toBe(2);
    expect(champ.longestSessionMinutes).toBe(900);
    expect(champ.longestSessionAt).toBe(makeSession('Project Zomboid', 900, 10).endTime);
    expect(champ.totalPeriodMinutes).toBe(1680);
    expect(champ.totalPeriodSessions).toBe(3);
    expect(champ.periodGameCount).toBe(2);
  });

  test('builds a historical champion from supplied sessions without storing it', () => {
    const sessions = [
      { gameName: 'Project Zomboid', playtimeMinutes: 180, timestamp: new Date('2026-03-04T12:00:00Z') },
      { gameName: 'Project Zomboid', playtimeMinutes: 240, timestamp: new Date('2026-03-12T12:00:00Z') },
      { gameName: 'Rust', playtimeMinutes: 120, timestamp: new Date('2026-03-18T12:00:00Z') },
    ];
    const champion = PeriodChampionService.getChampionForPeriod('month', '2026-03', { sessions });
    expect(champion.game.name).toBe('Project Zomboid');
    expect(champion.minutes).toBe(420);
    expect(champion.sessionCount).toBe(2);
    expect(champion.longestSessionMinutes).toBe(240);
    expect(champion.totalPeriodMinutes).toBe(540);
    expect(champion.totalPeriodSessions).toBe(3);
    expect(champion.periodGameCount).toBe(2);
    expect(champion.personaSnapshot).toBeNull();
    expect(StorageService._store.has('champions-month')).toBe(false);
  });
});

describe('PeriodChampionService locking', () => {
  beforeEach(() => {
    StorageService._store.clear();
    SessionRepository.getSessionHistory.mockReset();
  });

  test('lockPeriod refuses to lock a period that has not ended', () => {
    const now = new Date('2026-08-20T12:00:00Z');
    const currentWeekKey = PeriodChampionService.getCurrentPeriodKey('week', now);
    SessionRepository.getSessionHistory.mockReturnValue([makeSession('Project Zomboid', 600, 1)]);
    const result = PeriodChampionService.lockPeriod('week', currentWeekKey, { now });
    expect(result).toBeNull();
  });

  test('lockPeriod snapshots a past period and writes to storage', () => {
    const now = new Date('2026-08-20T12:00:00Z');
    // Lock the previous week (2026-08-09 to 2026-08-15).
    const prevWeekKey = '2026-08-09';
    SessionRepository.getSessionHistory.mockReturnValue([
      makeSession('Project Zomboid', 60 * 20, 6), // 6 days ago, in prev week
      makeSession('Rust', 60 * 4, 8),
    ]);
    const champion = PeriodChampionService.lockPeriod('week', prevWeekKey, { now });
    expect(champion).not.toBeNull();
    expect(champion.game.name).toBe('Project Zomboid');
    expect(champion.lockedAt).not.toBeNull();
    expect(champion.periodKey).toBe('2026-08-09');
    // Storage was written.
    expect(StorageService.set).toHaveBeenCalled();
    const locked = PeriodChampionService.getLockedChampions('week');
    expect(locked).toHaveLength(1);
    expect(locked[0].periodKey).toBe('2026-08-09');
  });

  test('lockPeriod is idempotent (second call returns null)', () => {
    const now = new Date('2026-08-20T12:00:00Z');
    const prevWeekKey = '2026-08-09';
    SessionRepository.getSessionHistory.mockReturnValue([makeSession('Project Zomboid', 600, 6)]);
    const first = PeriodChampionService.lockPeriod('week', prevWeekKey, { now });
    const second = PeriodChampionService.lockPeriod('week', prevWeekKey, { now });
    expect(first).not.toBeNull();
    expect(second).toBeNull();
  });

  test('lockPeriod returns null for an empty period (no sessions)', () => {
    const now = new Date('2026-08-20T12:00:00Z');
    const prevWeekKey = '2026-08-09';
    SessionRepository.getSessionHistory.mockReturnValue([]);
    expect(PeriodChampionService.lockPeriod('week', prevWeekKey, { now })).toBeNull();
    // Empty periods are NOT written to storage.
    expect(PeriodChampionService.getLockedChampions('week')).toHaveLength(0);
  });

  test('lockChampionsIfNeeded walks back and locks past periods', () => {
    const now = new Date('2026-08-20T12:00:00Z');
    // Sessions in the previous 3 weeks.
    SessionRepository.getSessionHistory.mockReturnValue([
      makeSession('Project Zomboid', 60 * 20, 6),  // prev week (2026-08-09)
      makeSession('Rust', 60 * 10, 13),            // 2 weeks ago (2026-08-02)
      makeSession('Stardew Valley', 60 * 8, 20),   // 3 weeks ago (2026-07-26)
    ]);
    const newlyLocked = PeriodChampionService.lockChampionsIfNeeded({ now, lookback: { week: 4, month: 0, year: 0 } });
    expect(newlyLocked.length).toBe(3);
    const locked = PeriodChampionService.getLockedChampions('week');
    expect(locked).toHaveLength(3);
    const keys = locked.map((c) => c.periodKey).sort();
    expect(keys).toEqual(['2026-07-26', '2026-08-02', '2026-08-09']);
  });

  test('lockChampionsIfNeeded does not re-lock already-locked periods', () => {
    const now = new Date('2026-08-20T12:00:00Z');
    SessionRepository.getSessionHistory.mockReturnValue([
      makeSession('Project Zomboid', 60 * 20, 6),
    ]);
    PeriodChampionService.lockChampionsIfNeeded({ now, lookback: { week: 2, month: 0, year: 0 } });
    const secondPass = PeriodChampionService.lockChampionsIfNeeded({ now, lookback: { week: 2, month: 0, year: 0 } });
    expect(secondPass).toEqual([]);
  });
});

describe('PeriodChampionService getAllChampions', () => {
  beforeEach(() => {
    StorageService._store.clear();
    SessionRepository.getSessionHistory.mockReset();
  });

  test('combines locked past with live current, sorted most-recent-first', () => {
    const now = new Date('2026-08-20T12:00:00Z');
    // Lock a past week manually.
    SessionRepository.getSessionHistory.mockReturnValue([makeSession('Old Game', 600, 6)]);
    PeriodChampionService.lockPeriod('week', '2026-08-09', { now });
    // Now add a live session in the current week.
    SessionRepository.getSessionHistory.mockReturnValue([
      makeSession('Old Game', 600, 6),
      makeSession('Project Zomboid', 1200, 1),
    ]);
    const all = PeriodChampionService.getAllChampions('week', { now });
    expect(all).toHaveLength(2);
    // Current week (2026-08-16) should sort first.
    expect(all[0].periodKey).toBe('2026-08-16');
    expect(all[0].game.name).toBe('Project Zomboid');
    expect(all[0].lockedAt).toBeNull(); // live
    expect(all[1].periodKey).toBe('2026-08-09');
    expect(all[1].lockedAt).not.toBeNull(); // locked
  });

  test('does not duplicate a period that is both locked and current', () => {
    const now = new Date('2026-08-20T12:00:00Z');
    const currentKey = PeriodChampionService.getCurrentPeriodKey('week', now);
    // Manually write a locked entry for the current period (edge case: locked early).
    StorageService._store.set('champions-week', [{
      period: 'week',
      periodKey: currentKey,
      lockedAt: '2026-08-17T00:00:00Z',
      game: { name: 'Early Lock', artwork: null, platform: null, appId: null },
      minutes: 100,
      sessionCount: 1,
      runnerUp: null,
      totalPeriodMinutes: 100,
      personaSnapshot: null,
    }]);
    SessionRepository.getSessionHistory.mockReturnValue([makeSession('Project Zomboid', 9999, 1)]);
    const all = PeriodChampionService.getAllChampions('week', { now });
    expect(all).toHaveLength(1);
    expect(all[0].game.name).toBe('Early Lock');
  });
});

describe('PeriodChampionService artwork hydration', () => {
  beforeEach(() => {
    StorageService._store.clear();
  });

  test('rehydrates a locked champion portrait from the current library', () => {
    StorageService._store.set('champions-week', [{
      period: 'week', periodKey: '2026-08-09', lockedAt: 'x',
      game: { name: 'Project Zomboid', portrait: null, platform: null, appId: null },
      minutes: 1200, sessionCount: 4, runnerUp: null, totalPeriodMinutes: 1200, personaSnapshot: null,
    }]);
    const library = [{ name: 'Project Zomboid™', appid: '108600', platform: 'Steam' }];
    const [champion] = PeriodChampionService.getLockedChampions('week', { library });
    expect(champion.game.portrait).toBe('portrait.png');
    expect(champion.game.portraitFallback).toBe('cover.png');
    expect(champion.game.placeholder).toBe('placeholder.png');
    expect(champion.game.appId).toBe('108600');
    expect(StorageService._store.get('champions-week')[0].game.portrait).toBe('portrait.png');
  });

  test('migrates the legacy nested artwork bundle', () => {
    const champion = {
      game: {
        name: 'Legacy Game',
        artwork: { artwork: 'legacy-portrait.png', fallbackSrc: 'legacy-cover.png', placeholder: 'legacy-placeholder.png' },
      },
    };
    resolveGameArtworkBundle.mockReturnValue(null);
    const hydrated = PeriodChampionService._internal.hydrateChampionArtwork(champion, []);
    expect(hydrated.game.portrait).toBe('legacy-portrait.png');
    expect(hydrated.game.portraitFallback).toBe('legacy-cover.png');
    expect(hydrated.game.placeholder).toBe('legacy-placeholder.png');
  });

  test('backfills detailed metrics for an existing locked champion', () => {
    const champion = {
      period: 'month',
      periodKey: '2026-03',
      game: { name: 'Project Zomboid' },
      minutes: 420,
      sessionCount: 2,
    };
    const sessions = [
      { gameName: 'Project Zomboid', playtimeMinutes: 180, timestamp: new Date('2026-03-04T12:00:00Z') },
      { gameName: 'Project Zomboid', playtimeMinutes: 240, timestamp: new Date('2026-03-12T12:00:00Z') },
      { gameName: 'Rust', playtimeMinutes: 120, timestamp: new Date('2026-03-18T12:00:00Z') },
    ];
    const hydrated = PeriodChampionService._internal.hydrateChampionMetrics(champion, sessions);
    expect(hydrated.longestSessionMinutes).toBe(240);
    expect(hydrated.totalPeriodMinutes).toBe(540);
    expect(hydrated.totalPeriodSessions).toBe(3);
    expect(hydrated.periodGameCount).toBe(2);
    expect(hydrated.runnerUp).toEqual({ name: 'Rust', minutes: 120 });
  });
});

describe('PeriodChampionService getFullTimeline', () => {
  beforeEach(() => {
    StorageService._store.clear();
    SessionRepository.getSessionHistory.mockReset();
  });

  test('merges week, month, and year champions', () => {
    const now = new Date('2026-08-20T12:00:00Z');
    // Seed a locked week, locked month, locked year.
    StorageService._store.set('champions-week', [{
      period: 'week', periodKey: '2026-08-09', lockedAt: 'x',
      game: { name: 'Weekly Game', artwork: null, platform: null, appId: null },
      minutes: 100, sessionCount: 1, runnerUp: null, totalPeriodMinutes: 100, personaSnapshot: null,
    }]);
    StorageService._store.set('champions-month', [{
      period: 'month', periodKey: '2026-07', lockedAt: 'x',
      game: { name: 'Monthly Game', artwork: null, platform: null, appId: null },
      minutes: 500, sessionCount: 5, runnerUp: null, totalPeriodMinutes: 500, personaSnapshot: null,
    }]);
    StorageService._store.set('champions-year', [{
      period: 'year', periodKey: '2025', lockedAt: 'x',
      game: { name: 'Yearly Game', artwork: null, platform: null, appId: null },
      minutes: 5000, sessionCount: 50, runnerUp: null, totalPeriodMinutes: 5000, personaSnapshot: null,
    }]);
    const timeline = PeriodChampionService.getFullTimeline({ now });
    expect(timeline).toHaveLength(3);
    // Sorted most-recent-first by periodKey string: 2026-08-09 > 2026-07 > 2025.
    expect(timeline[0].periodKey).toBe('2026-08-09');
    expect(timeline[1].periodKey).toBe('2026-07');
    expect(timeline[2].periodKey).toBe('2025');
  });
});

describe('PeriodChampionService clearAll', () => {
  test('removes all champion storage keys', () => {
    StorageService._store.set('champions-week', [{ periodKey: 'x' }]);
    StorageService._store.set('champions-month', [{ periodKey: 'y' }]);
    StorageService._store.set('champions-year', [{ periodKey: 'z' }]);
    PeriodChampionService.clearAll();
    expect(StorageService._store.has('champions-week')).toBe(false);
    expect(StorageService._store.has('champions-month')).toBe(false);
    expect(StorageService._store.has('champions-year')).toBe(false);
  });
});


