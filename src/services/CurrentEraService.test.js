// CurrentEraService.test.js
import CurrentEraService from './CurrentEraService';
import StorageService from './StorageService';
import { PlaytimeAutoLogger } from './PlaytimeAutoLogger';

jest.mock('./StorageService', () => {
  const store = new Map();
  return {
    __esModule: true,
    default: {
      _store: store,
      get: jest.fn((key, def) => (store.has(key) ? store.get(key) : def)),
      set: jest.fn((key, value) => {
        store.set(key, value);
        return true;
      }),
      remove: jest.fn((key) => {
        store.delete(key);
        return true;
      }),
    },
  };
});

jest.mock('./PlaytimeAutoLogger', () => ({
  PlaytimeAutoLogger: { getSessionHistory: jest.fn(() => []) },
}));

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.now();

const seedHistory = () =>
  StorageService.set('currentEraHistory', [
    {
      signature: 'The Saga Era|rpg|Skyrim',
      name: 'The Saga Era',
      genre: 'rpg',
      topGame: 'Skyrim',
      since: NOW - 60 * DAY_MS,
    },
    {
      signature: 'The Zomboid Era|survival|Project Zomboid',
      name: 'The Zomboid Era',
      genre: 'survival',
      topGame: 'Project Zomboid',
      since: NOW - 25 * DAY_MS,
    },
    // Current era — excluded from the archive.
    {
      signature: 'The Quiet Season|none|none',
      name: 'The Quiet Season',
      genre: null,
      topGame: null,
      since: NOW - 5 * DAY_MS,
    },
  ]);

beforeEach(() => {
  StorageService._store.clear();
  PlaytimeAutoLogger.getSessionHistory.mockReturnValue([]);
});

describe('CurrentEraService.getEraArchive', () => {
  test('returns past eras newest-first with date ranges and day counts', () => {
    seedHistory();
    const archive = CurrentEraService.getEraArchive();

    expect(archive).toHaveLength(2);
    expect(archive[0].name).toBe('The Zomboid Era');
    expect(archive[0].topGame).toBe('Project Zomboid');
    expect(archive[0].days).toBe(20);
    expect(archive[0].endedAt).toBe(NOW - 5 * DAY_MS);
    expect(archive[1].name).toBe('The Saga Era');
    expect(archive[1].days).toBe(35);
  });

  test('returns an empty list with fewer than two recorded eras', () => {
    StorageService.set('currentEraHistory', [
      { signature: 'x', name: 'The Saga Era', genre: 'rpg', topGame: 'Skyrim', since: NOW - 10 * DAY_MS },
    ]);
    expect(CurrentEraService.getEraArchive()).toEqual([]);
    expect(CurrentEraService.getEraArchive()).toEqual([]);
  });

  test('returns an empty list when no history exists', () => {
    expect(CurrentEraService.getEraArchive()).toEqual([]);
  });
});

describe('CurrentEraService.getCurrentEra imported-playtime estimate', () => {
  const importedLibrary = (games) => StorageService.set('library', games);

  test('estimates an era from imported playtime when no sessions are tracked', () => {
    importedLibrary([
      {
        name: 'Project Zomboid',
        importedPlaytimeMinutes: 4800,
        last_played: Date.now() - 2 * DAY_MS,
        genres: ['Survival'],
      },
    ]);

    const era = CurrentEraService.getCurrentEra();

    expect(era.estimated).toBe(true);
    expect(era.name).toBe('The Project Zomboid Era');
    expect(era.dayCount).toBeNull();
    expect(era.snapshot.estimated).toBe(true);
    expect(era.snapshot.rawSessionCount).toBe(0);
  });

  test('does not write estimated eras into era history', () => {
    importedLibrary([
      { name: 'Project Zomboid', importedPlaytimeMinutes: 4800, last_played: Date.now(), genres: ['Survival'] },
    ]);

    CurrentEraService.getCurrentEra();

    expect(StorageService.get('currentEraHistory', [])).toEqual([]);
    expect(CurrentEraService.getEraArchive()).toEqual([]);
  });

  test('real sessions take precedence over the imported estimate', () => {
    importedLibrary([
      { name: 'Project Zomboid', importedPlaytimeMinutes: 4800, last_played: Date.now(), genres: ['Survival'] },
    ]);
    PlaytimeAutoLogger.getSessionHistory.mockReturnValue([
      {
        sessionId: 's1',
        gameName: 'Hollow Knight',
        startTime: new Date(Date.now() - DAY_MS).toISOString(),
        playtimeMinutes: 180,
      },
    ]);
    StorageService.set('library', [
      { name: 'Project Zomboid', importedPlaytimeMinutes: 4800, last_played: Date.now(), genres: ['Survival'] },
      {
        name: 'Hollow Knight',
        importedPlaytimeMinutes: 2000,
        last_played: Date.now() - DAY_MS,
        genres: ['Metroidvania'],
      },
    ]);

    const era = CurrentEraService.getCurrentEra();

    expect(era.estimated).toBe(false);
    expect(era.snapshot.rawSessionCount).toBe(1);
  });

  test('falls back to a quiet season when imported playtime is all stale', () => {
    importedLibrary([
      {
        name: 'Project Zomboid',
        importedPlaytimeMinutes: 4800,
        last_played: Date.now() - 90 * DAY_MS,
        genres: ['Survival'],
      },
    ]);

    const era = CurrentEraService.getCurrentEra();

    expect(era.estimated).toBe(false);
    expect(era.snapshot.totalMinutes).toBe(0);
  });

  test('ignores imported playtime with no last-played date', () => {
    importedLibrary([{ name: 'Project Zomboid', importedPlaytimeMinutes: 4800, genres: ['Survival'] }]);

    const era = CurrentEraService.getCurrentEra();

    expect(era.estimated).toBe(false);
  });

  test('labels the estimated era tagline honestly without fake windowed hours', () => {
    importedLibrary([
      { name: 'Project Zomboid', importedPlaytimeMinutes: 4800, last_played: Date.now(), genres: ['Survival'] },
    ]);

    const tagline = CurrentEraService.getEraTagline();

    expect(tagline).toContain('estimated from imported playtime');
    expect(tagline).not.toMatch(/h in the last/);
  });
});

describe('CurrentEraService.getEraTransition', () => {
  test('describes the ended era and its successor from the last two history entries', () => {
    seedHistory();

    const transition = CurrentEraService.getEraTransition();

    expect(transition.endedEra.name).toBe('The Zomboid Era');
    expect(transition.endedEra.topGame).toBe('Project Zomboid');
    expect(transition.endedEra.days).toBe(20);
    expect(transition.newEra.name).toBe('The Quiet Season');
    expect(transition.transitionedAt).toBe(NOW - 5 * DAY_MS);
    expect(transition.signature).toContain('>');
  });

  test('returns null until at least one real transition is recorded', () => {
    expect(CurrentEraService.getEraTransition()).toBeNull();

    StorageService.set('currentEraHistory', [
      { signature: 'x', name: 'The Saga Era', genre: 'rpg', topGame: 'Skyrim', since: NOW - 10 * DAY_MS },
    ]);
    expect(CurrentEraService.getEraTransition()).toBeNull();
  });
});
