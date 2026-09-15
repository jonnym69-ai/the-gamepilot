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
