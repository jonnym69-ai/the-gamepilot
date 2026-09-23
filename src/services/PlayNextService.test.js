// PlayNextService.test.js
import PlayNextService from './PlayNextService';
import { PlaytimeAutoLogger } from './PlaytimeAutoLogger';
import { RecommendationEngine } from './RecommendationEngine';
import CurrentEraService from './CurrentEraService';

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

jest.mock('./RecommendationEngine', () => ({
  RecommendationEngine: { getPerfectPlayResult: jest.fn(() => null) },
}));

jest.mock('./CurrentEraService', () => {
  const getCurrentEra = jest.fn(() => null);
  return { __esModule: true, default: { getCurrentEra }, CurrentEraService: { getCurrentEra } };
});

const NOW = Date.now();
const HOURS = 60 * 60 * 1000;
const DAYS = 24 * HOURS;

const library = [
  { name: 'Project Zomboid', appid: 'pz1', platform: 'steam' },
  { name: 'Terraria', appid: 't2', platform: 'steam' },
  { name: 'Hades', appid: 'h3', platform: 'steam' },
];

const sessionAt = (msAgo, gameName) => ({
  gameName,
  endTime: new Date(NOW - msAgo).toISOString(),
  playtimeMinutes: 120,
});

const entry = (name, explanation = 'Fits your taste.', minutes = 90) => ({
  game: library.find((g) => g.name === name),
  explanation,
  estimatedSessionMinutes: minutes,
});

beforeEach(() => {
  jest.clearAllMocks();
  PlaytimeAutoLogger.getSessionHistory.mockReturnValue([]);
  RecommendationEngine.getPerfectPlayResult.mockReturnValue(null);
  CurrentEraService.getCurrentEra.mockReturnValue(null);
});

describe('PlayNextService.getPlayNext', () => {
  test('returns null for an empty library', () => {
    expect(PlayNextService.getPlayNext([])).toBeNull();
    expect(PlayNextService.getPlayNext(null)).toBeNull();
  });

  test('resumes the last-played game within the window', () => {
    PlaytimeAutoLogger.getSessionHistory.mockReturnValue([sessionAt(5 * HOURS, 'Project Zomboid')]);
    RecommendationEngine.getPerfectPlayResult.mockReturnValue({ entries: [entry('Terraria'), entry('Hades')] });

    const result = PlayNextService.getPlayNext(library);

    expect(result.mode).toBe('resume');
    expect(result.primary.game.name).toBe('Project Zomboid');
    expect(result.primary.reason).toContain('keep the run going');
    // Resume game excluded from alternates, engine picks preserved.
    expect(result.alternates.map((a) => a.game.name)).toEqual(['Terraria', 'Hades']);
  });

  test('uses the era line when the run dominates the current era', () => {
    PlaytimeAutoLogger.getSessionHistory.mockReturnValue([sessionAt(3 * HOURS, 'Project Zomboid')]);
    CurrentEraService.getCurrentEra.mockReturnValue({
      gameDominated: true,
      topGame: 'Project Zomboid',
      dayCount: 34,
      name: 'The Zomboid Era',
    });

    const result = PlayNextService.getPlayNext(library);

    expect(result.mode).toBe('resume');
    expect(result.primary.reason).toBe("Day 34 of The Zomboid Era. The run isn't over.");
  });

  test('falls through to a pick when the last session is stale', () => {
    PlaytimeAutoLogger.getSessionHistory.mockReturnValue([sessionAt(10 * DAYS, 'Project Zomboid')]);
    RecommendationEngine.getPerfectPlayResult.mockReturnValue({ entries: [entry('Terraria')] });

    const result = PlayNextService.getPlayNext(library);

    expect(result.mode).toBe('pick');
    expect(result.primary.game.name).toBe('Terraria');
    expect(result.primary.reason).toBe('Fits your taste.');
    expect(result.primary.detail).toBe('~90m typical session');
  });

  test('picks when there is no session history at all', () => {
    RecommendationEngine.getPerfectPlayResult.mockReturnValue({ entries: [entry('Hades'), entry('Terraria')] });

    const result = PlayNextService.getPlayNext(library);

    expect(result.mode).toBe('pick');
    expect(result.primary.game.name).toBe('Hades');
    expect(result.alternates).toHaveLength(1);
  });

  test.each([
    [{ summary: 'A familiar survival pick.', fullExplanation: 'Long explanation' }, 'A familiar survival pick.'],
    [{ fullExplanation: 'A fit for your recent sessions.' }, 'A fit for your recent sessions.'],
    [{ reasons: [] }, 'A strong fit for how you play right now.'],
  ])('converts structured engine explanations to renderable text', (explanation, expected) => {
    RecommendationEngine.getPerfectPlayResult.mockReturnValue({ entries: [entry('Hades', explanation)] });
    expect(PlayNextService.getPlayNext(library).primary.reason).toBe(expected);
  });

  test('returns null when nothing is resumable and the engine has no picks', () => {
    PlaytimeAutoLogger.getSessionHistory.mockReturnValue([sessionAt(10 * DAYS, 'Not Installed')]);
    expect(PlayNextService.getPlayNext(library)).toBeNull();
  });
});
