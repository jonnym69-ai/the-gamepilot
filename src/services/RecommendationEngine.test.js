import { RecommendationEngine } from './RecommendationEngine';
import { UserBehaviorProfile } from './UserBehaviorProfile';
import { StartupPersonalizationService } from './StartupPersonalizationService';
import { PersonaPerformanceInsights } from './PersonaPerformanceInsights';
import StorageService from './StorageService';
import { invalidateRecommendationWeightsCache } from './RecommendationWeights';

jest.mock('./PersonaPerformanceInsights', () => ({
  PersonaPerformanceInsights: {
    estimateSessionMinutes: jest.fn(() => null)
  }
}));

jest.mock('./RecommendationExplainer', () => ({
  RecommendationExplainer: {
    getDetailedExplanation: jest.fn(() => 'mock-explanation')
  }
}));

jest.mock('../GamingIdentity', () => ({
  GamingIdentity: {
    getProfile: jest.fn(() => null),
    getSignatureGames: jest.fn(() => []),
    classifyFamiliarity: jest.fn(() => ({ label: 'neutral' }))
  }
}));

jest.mock('./GamingPersonaService', () => ({
  GamingPersonaService: {
    getPersona: jest.fn(() => ({ primaryPersona: null, summaryRoast: null })),
    getPrimaryPersona: jest.fn(() => null),
    getAffinityGenres: jest.fn(() => []),
    gameMatchesPersona: jest.fn(() => false)
  },
  PERSONA_AFFINITY_GENRES: {}
}));

const baseGame = (overrides = {}) => ({
  appid: '1',
  name: 'Game',
  genres: ['Strategy'],
  time_played: 0,
  launch_count: 0,
  last_played: null,
  ...overrides
});

describe('RecommendationEngine', () => {
  beforeEach(() => {
    localStorage.clear();
    PersonaPerformanceInsights.estimateSessionMinutes.mockReturnValue(null);
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    Math.random.mockRestore?.();
  });

  describe('scoreGameByBehavior', () => {
    test('returns base 50 for an empty profile and unplayed unknown game', () => {
      const score = RecommendationEngine.scoreGameByBehavior(baseGame(), null, null, null);
      // Base 50 + 10 unplayed bonus = 60
      expect(score).toBe(60);
    });

    test('clamps result to 0-100', () => {
      const score = RecommendationEngine.scoreGameByBehavior(baseGame(), null, null, null);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    test('penalizes recently played games', () => {
      const recent = baseGame({ last_played: Date.now() - 1000 * 60 * 60 * 24 * 2, time_played: 100 });
      const old = baseGame({ last_played: Date.now() - 1000 * 60 * 60 * 24 * 30, time_played: 100 });
      const recentScore = RecommendationEngine.scoreGameByBehavior(recent, null, null, null);
      const oldScore = RecommendationEngine.scoreGameByBehavior(old, null, null, null);
      expect(recentScore).toBeLessThan(oldScore);
    });

    test('rewards games matching session length when profile data exists', () => {
      // Seed avg session length
      UserBehaviorProfile.trackSessionLength(60);
      UserBehaviorProfile.trackSelection('Focused', 'Strategy', 60, 'a');
      PersonaPerformanceInsights.estimateSessionMinutes.mockReturnValue(60);
      const matching = RecommendationEngine.scoreGameByBehavior(baseGame(), 'Focused', 'Strategy', null);
      PersonaPerformanceInsights.estimateSessionMinutes.mockReturnValue(360);
      const mismatched = RecommendationEngine.scoreGameByBehavior(baseGame(), 'Focused', 'Strategy', null);
      expect(matching).toBeGreaterThan(mismatched);
    });

    test('replay intent active is preferred over finished', () => {
      const active = RecommendationEngine.scoreGameByBehavior(baseGame({ replayIntent: 'active' }), null, null, null);
      const finished = RecommendationEngine.scoreGameByBehavior(baseGame({ replayIntent: 'finished' }), null, null, null);
      expect(active).toBeGreaterThan(finished);
    });

    test('startup seed gives more weight when no live profile data exists', () => {
      StartupPersonalizationService.completeOnboarding({
        selectedMoods: ['Focused'],
        favoriteGenres: ['Strategy'],
        sessionPreference: 'medium'
      });
      const seeded = RecommendationEngine.scoreGameByBehavior(baseGame(), 'Focused', 'Strategy', null);
      const unseeded = RecommendationEngine.scoreGameByBehavior(baseGame({ genres: ['Casual'] }), 'Relaxed', 'Casual', null);
      expect(seeded).toBeGreaterThan(unseeded);
    });

    test('time-availability bonus when game fits in window', () => {
      PersonaPerformanceInsights.estimateSessionMinutes.mockReturnValue(45);
      const fits = RecommendationEngine.scoreGameByBehavior(baseGame(), null, null, 60);
      PersonaPerformanceInsights.estimateSessionMinutes.mockReturnValue(120);
      const tight = RecommendationEngine.scoreGameByBehavior(baseGame(), null, null, 60);
      expect(fits).toBeGreaterThan(tight);
    });
  });

  describe('normalizeTimeConstraint', () => {
    test('returns null for invalid input', () => {
      expect(RecommendationEngine.normalizeTimeConstraint(null)).toBe(null);
      expect(RecommendationEngine.normalizeTimeConstraint('nope')).toBe(null);
      expect(RecommendationEngine.normalizeTimeConstraint(0)).toBe(null);
    });

    test('numeric input becomes a free-form constraint', () => {
      expect(RecommendationEngine.normalizeTimeConstraint(75)).toEqual({
        key: null,
        availableMinutes: 75,
        targetGenres: []
      });
    });

    test('preset keys resolve to known buckets with target genres', () => {
      expect(RecommendationEngine.normalizeTimeConstraint('quick').availableMinutes).toBe(30);
      expect(RecommendationEngine.normalizeTimeConstraint('medium').availableMinutes).toBe(120);
      expect(RecommendationEngine.normalizeTimeConstraint('long').availableMinutes).toBe(240);
      expect(RecommendationEngine.normalizeTimeConstraint('weekend').availableMinutes).toBe(480);
      expect(RecommendationEngine.normalizeTimeConstraint('weekend').targetGenres).toEqual(
        expect.arrayContaining(['RPG'])
      );
    });
  });

  describe('getAvailableMinutes', () => {
    test('returns minutes from preset string', () => {
      expect(RecommendationEngine.getAvailableMinutes('long')).toBe(240);
    });

    test('returns numeric input as-is', () => {
      expect(RecommendationEngine.getAvailableMinutes(75)).toBe(75);
    });

    test('returns null for invalid input', () => {
      expect(RecommendationEngine.getAvailableMinutes(null)).toBe(null);
      expect(RecommendationEngine.getAvailableMinutes('garbage')).toBe(null);
      expect(RecommendationEngine.getAvailableMinutes(-1)).toBe(null);
    });
  });

  describe('normalizeSelectionList / normalizePerfectPlaySelections', () => {
    test('filters by validator and dedupes', () => {
      const result = RecommendationEngine.normalizeSelectionList(
        ['a', 'b', 'a', 'c'],
        (v) => v !== 'b'
      );
      expect(result).toEqual(['a', 'c']);
    });

    test('returns [] for non-array input', () => {
      expect(RecommendationEngine.normalizeSelectionList('oops')).toEqual([]);
    });

    test('normalizePerfectPlaySelections filters invalid moods/genres', () => {
      const { validMoods, validGenres } = RecommendationEngine.normalizePerfectPlaySelections(
        ['Focused', 'NotAMood', 'Focused'],
        ['Strategy', 'NotAGenre', 'RPG']
      );
      expect(validMoods).toEqual(['Focused']);
      expect(validGenres).toEqual(['Strategy', 'RPG']);
    });
  });

  describe('dedupeGames', () => {
    test('drops null entries and duplicate ids/names', () => {
      const result = RecommendationEngine.dedupeGames([
        { appid: '1', name: 'A' },
        null,
        { appid: '1', name: 'A duplicate by appid' },
        { name: 'B' },
        { name: 'B' }
      ]);
      expect(result).toHaveLength(2);
      expect(result[0].appid).toBe('1');
      expect(result[1].name).toBe('B');
    });
  });

  describe('getPrimaryGenre', () => {
    test('prefers a genre from preferredGenres list', () => {
      const game = { genres: ['Action', 'Strategy', 'RPG'] };
      expect(RecommendationEngine.getPrimaryGenre(game, ['RPG'])).toBe('RPG');
    });

    test('falls back to first valid genre when no preferences match', () => {
      expect(RecommendationEngine.getPrimaryGenre({ genres: ['Action', 'RPG'] }, ['Strategy'])).toBe('Action');
    });

    test('skips Unknown genres', () => {
      expect(RecommendationEngine.getPrimaryGenre({ genres: ['Unknown', 'RPG'] })).toBe('RPG');
    });

    test('returns null for empty/missing genres', () => {
      expect(RecommendationEngine.getPrimaryGenre({})).toBe(null);
      expect(RecommendationEngine.getPrimaryGenre({ genres: [] })).toBe(null);
    });
  });

  describe('getPlayedGames', () => {
    test('returns games with any signal of being played', () => {
      const library = [
        baseGame({ appid: '1', time_played: 60 }),
        baseGame({ appid: '2', launch_count: 15 }),
        baseGame({ appid: '3', time_played: 10 }),
        baseGame({ appid: '4' })
      ];
      const played = RecommendationEngine.getPlayedGames(library);
      expect(played.map((g) => g.appid)).toEqual(['1', '2', '3']);
    });

    test('returns [] for non-array input', () => {
      expect(RecommendationEngine.getPlayedGames(null)).toEqual([]);
    });
  });

  describe('getFallbackRediscoverGames', () => {
    test('prefers least-recently-played among played games', () => {
      const library = [
        baseGame({ appid: '1', time_played: 50, last_played: 1_700_000_000_000 }),
        baseGame({ appid: '2', time_played: 50, last_played: 1_600_000_000_000 }),
        baseGame({ appid: '3', time_played: 50, last_played: 1_650_000_000_000 })
      ];
      const result = RecommendationEngine.getFallbackRediscoverGames(library, 2);
      expect(result.map((g) => g.appid)).toEqual(['2', '3']);
    });

    test('falls back to entire library when nothing has been played', () => {
      const library = [baseGame({ appid: '1' }), baseGame({ appid: '2' })];
      expect(RecommendationEngine.getFallbackRediscoverGames(library, 5)).toHaveLength(2);
    });
  });

  describe('recently-recommended state', () => {
    test('persists and reads back recent recommendations', () => {
      const games = [{ name: 'Alpha' }, { name: 'Beta' }];
      RecommendationEngine.persistRecentRecommendations(games, [], Date.now());
      const { validRecent } = RecommendationEngine.getRecentRecommendationState();
      expect(validRecent.map((e) => e.name)).toEqual(expect.arrayContaining(['Alpha', 'Beta']));
    });

    test('drops entries older than the TTL', () => {
      const ancient = Date.now() - 1000 * 60 * 60 * 5; // 5 hours ago
      RecommendationEngine.persistRecentRecommendations(
        [{ name: 'StaleGame' }],
        [],
        ancient
      );
      const { validRecent } = RecommendationEngine.getRecentRecommendationState();
      expect(validRecent.find((e) => e.name === 'StaleGame')).toBeUndefined();
    });
  });

  describe('end-to-end recommendation results', () => {
    const sampleLibrary = () => [
      baseGame({ appid: '1', name: 'Strategy Hit', genres: ['Strategy'] }),
      baseGame({ appid: '2', name: 'RPG Epic', genres: ['RPG'] }),
      baseGame({ appid: '3', name: 'Casual Cozy', genres: ['Casual'] }),
      baseGame({ appid: '4', name: 'Roguelike Rush', genres: ['Roguelike'] })
    ];

    test('getPerfectPlayResult returns a payload with entries', () => {
      const payload = RecommendationEngine.getPerfectPlayResult(sampleLibrary(), 'Focused', 'Strategy', 'medium', 2);
      expect(payload.recommendationType).toBe('perfect-play');
      expect(payload.entries.length).toBeGreaterThan(0);
      expect(payload.tracking.recommendedGameIds.length).toBeGreaterThan(0);
    });

    test('getSurpriseMeResult returns null for empty library', () => {
      expect(RecommendationEngine.getSurpriseMeResult([])).toBe(null);
    });

    test('getRediscoverResult uses fallback when no engine matches', () => {
      const library = [baseGame({ appid: '1', name: 'Untyped', genres: [], time_played: 60, launch_count: 1 })];
      const result = RecommendationEngine.getRediscoverResult(library, null, null, 1);
      expect(result).not.toBe(null);
      expect(result.entries).toHaveLength(1);
    });

    test('getContinuePlayingResult returns the lastPlayedGame when provided', () => {
      const game = baseGame({ appid: '99', name: 'Resume Me' });
      const result = RecommendationEngine.getContinuePlayingResult([], null, null, game);
      expect(result.entries[0].game.name).toBe('Resume Me');
      expect(result.usedFallback).toBe(false);
    });

    test('getContinuePlayingResult returns null when nothing has been played', () => {
      expect(RecommendationEngine.getContinuePlayingResult([baseGame()], null, null, null)).toBe(null);
    });
  });

  describe('experience-mode tuning (RecommendationWeights integration)', () => {
    const setMode = (mode) => {
      if (mode === null) {
        localStorage.removeItem('gamepilot-experienceMode');
      } else {
        StorageService.set('experienceMode', mode);
      }
      invalidateRecommendationWeightsCache();
    };

    afterEach(() => {
      setMode(null);
    });

    test('Librarian penalizes a recently-played game more than Full does', () => {
      const recent = baseGame({
        last_played: Date.now() - 1000 * 60 * 60 * 24 * 2,
        time_played: 100
      });

      setMode('librarian');
      const librarianScore = RecommendationEngine.scoreGameByBehavior(recent, null, null, null);

      setMode('full');
      const fullScore = RecommendationEngine.scoreGameByBehavior(recent, null, null, null);

      expect(librarianScore).toBeLessThan(fullScore);
    });

    test('Full rewards an unplayed game more than Librarian does', () => {
      const unplayed = baseGame({ time_played: 0, last_played: null });

      setMode('full');
      const fullScore = RecommendationEngine.scoreGameByBehavior(unplayed, null, null, null);

      setMode('librarian');
      const librarianScore = RecommendationEngine.scoreGameByBehavior(unplayed, null, null, null);

      expect(fullScore).toBeGreaterThan(librarianScore);
    });

    test('Balanced mode produces the same score as the unset default', () => {
      const game = baseGame({ time_played: 50, last_played: Date.now() - 1000 * 60 * 60 * 24 * 30 });

      setMode(null);
      const defaultScore = RecommendationEngine.scoreGameByBehavior(game, null, null, null);

      setMode('balanced');
      const balancedScore = RecommendationEngine.scoreGameByBehavior(game, null, null, null);

      expect(balancedScore).toBe(defaultScore);
    });

    test('Full boosts active replay intent more than Librarian', () => {
      const active = baseGame({ replayIntent: 'active' });

      setMode('full');
      const fullScore = RecommendationEngine.scoreGameByBehavior(active, null, null, null);

      setMode('librarian');
      const librarianScore = RecommendationEngine.scoreGameByBehavior(active, null, null, null);

      expect(fullScore).toBeGreaterThan(librarianScore);
    });
  });

  describe('getSimilarToGame', () => {
    test('returns matching backlog games and excludes the reference game', () => {
      const reference = baseGame({
        appid: 'reference',
        name: 'Zombie Survival',
        genres: ['Survival', 'Action'],
        tags: ['Zombies', 'Open World'],
        mood: 'Focused',
        time_played: 1200
      });
      const closeMatch = baseGame({
        appid: 'match',
        name: 'Backlog Survivor',
        genres: ['Survival', 'Action'],
        tags: ['Zombies'],
        mood: 'Focused',
        time_played: 0
      });
      const weakMatch = baseGame({
        appid: 'weak',
        name: 'Quiet Puzzle',
        genres: ['Puzzle'],
        tags: ['Relaxing'],
        mood: 'Relaxed',
        time_played: 0
      });

      const result = RecommendationEngine.getSimilarToGame([reference, weakMatch, closeMatch], reference, 4);

      expect(result.recommendationType).toBe('similar-to-game');
      expect(result.games.map((game) => game.name)).not.toContain(reference.name);
      expect(result.primaryGame.name).toBe(closeMatch.name);
      expect(result.meta.referenceGame).toBe(reference.name);
    });

    test('returns null without a reference game', () => {
      expect(RecommendationEngine.getSimilarToGame([baseGame()], null)).toBeNull();
    });

    test('excludes games marked Not for me', () => {
      const reference = baseGame({ appid: 'reference', name: 'Reference', genres: ['Strategy'], time_played: 500 });
      const rejected = baseGame({ appid: 'rejected', name: 'Rejected', genres: ['Strategy'], time_played: 0 });
      const alternative = baseGame({ appid: 'alternative', name: 'Alternative', genres: ['Strategy'], time_played: 0 });
      UserBehaviorProfile.trackRecommendationLaunch('similar-to-game', rejected.appid);
      UserBehaviorProfile.trackRecommendationOutcome(rejected.appid, 'not-for-me', { gameName: rejected.name });

      const result = RecommendationEngine.getSimilarToGame([reference, rejected, alternative], reference, 3);

      expect(result.games.map((game) => game.name)).toEqual(['Alternative']);
    });
  });

  describe('exploration slot (injectExplorationPick)', () => {
    const setMode = (mode) => {
      if (mode === null) {
        localStorage.removeItem('gamepilot-experienceMode');
      } else {
        StorageService.set('experienceMode', mode);
      }
      invalidateRecommendationWeightsCache();
    };

    afterEach(() => {
      setMode(null);
    });

    const library = () => [
      // Played games get replayIntent so they rank above unplayed games in the
      // fallback pipeline, leaving the unplayed novel-genre games as pure
      // exploration candidates rather than top-scoring fallback picks.
      baseGame({ appid: '1', name: 'RPG Heavy', genres: ['RPG'], time_played: 600, last_played: Date.now() - 1000 * 60 * 60 * 24 * 30, replayIntent: 'active' }),
      baseGame({ appid: '2', name: 'RPG Lite',  genres: ['RPG'], time_played: 120, last_played: Date.now() - 1000 * 60 * 60 * 24 * 10, replayIntent: 'active' }),
      baseGame({ appid: '3', name: 'Strategy X', genres: ['Strategy'], time_played: 300, last_played: Date.now() - 1000 * 60 * 60 * 24 * 5, replayIntent: 'active' }),
      baseGame({ appid: '4', name: 'Puzzle Surprise', genres: ['Puzzle'], time_played: 0, last_played: null }),
      baseGame({ appid: '5', name: 'Action Unplayed', genres: ['Action'], time_played: 0, last_played: null }),
    ];

    test('swaps the last slot with an unplayed game from an under-played genre when enabled', () => {
      setMode('full');
      const lib = library();
      const result = RecommendationEngine.getPerfectPlayRecommendations(lib, null, null, null, 3);
      expect(result).toHaveLength(3);
      // The last pick should be from a genre with near-zero playtime (Puzzle or Action)
      const last = result[2];
      expect(['Puzzle Surprise', 'Action Unplayed']).toContain(last.name);
      expect(last.time_played).toBe(0);
    });

    test('does NOT inject an exploration pick when count < explorationMinPicks (3)', () => {
      setMode('full');
      const lib = library();
      const result = RecommendationEngine.getPerfectPlayRecommendations(lib, null, null, null, 2);
      expect(result).toHaveLength(2);
      // Both should be the highest-scoring existing picks, no swap forced
      const names = result.map((g) => g.name);
      // Since all 5 are available, top 2 should come from the weighted scoring
      // without the exploration swap altering the second slot.
      expect(names).not.toContain('Puzzle Surprise');
      expect(names).not.toContain('Action Unplayed');
    });

    test('does NOT inject an exploration pick in Librarian mode (disabled)', () => {
      setMode('librarian');
      const lib = library();
      const result = RecommendationEngine.getPerfectPlayRecommendations(lib, null, null, null, 3);
      expect(result).toHaveLength(3);
      const names = result.map((g) => g.name);
      // Librarian disables exploration; all 3 should be from the standard pipeline
      expect(names).not.toContain('Puzzle Surprise');
      expect(names).not.toContain('Action Unplayed');
    });

    test('exploration pick is not a recently-recommended duplicate', () => {
      setMode('full');
      const lib = library();
      // Seed recent recommendations so "Puzzle Surprise" is excluded
      RecommendationEngine.getPerfectPlayRecommendations(lib, null, null, null, 3);
      const result = RecommendationEngine.getPerfectPlayRecommendations(lib, null, null, null, 3);
      const names = result.map((g) => g.name);
      // No duplicate names in the final 3
      expect(new Set(names).size).toBe(3);
    });

    test('exploration pick is flagged as entry.isExploration in the result payload', () => {
      setMode('full');
      const lib = library();
      const payload = RecommendationEngine.getPerfectPlayResult(lib, null, null, null, 3);
      expect(payload.entries).toHaveLength(3);
      expect(payload.entries[0].isExploration).toBe(false);
      expect(payload.entries[1].isExploration).toBe(false);
      expect(payload.entries[2].isExploration).toBe(true);
      // Underlying library object must NOT be mutated
      expect(lib.find((g) => g.name === payload.entries[2].game.name)._isExplorationPick).toBeUndefined();
    });

    test('no entries are flagged as exploration when the slot is disabled (Librarian)', () => {
      setMode('librarian');
      const lib = library();
      const payload = RecommendationEngine.getPerfectPlayResult(lib, null, null, null, 3);
      payload.entries.forEach((entry) => {
        expect(entry.isExploration).toBe(false);
      });
    });

    test('multi-genre game surfaces via its LEAST-familiar genre, not genres[0]', () => {
      setMode('full');
      // User has played huge amounts of Action. A new title that is
      // "Action + Puzzle" should still register as exploration on the Puzzle side.
      const lib = [
        baseGame({ appid: '1', name: 'Action Grind', genres: ['Action'], time_played: 5000, last_played: Date.now(), replayIntent: 'active' }),
        baseGame({ appid: '2', name: 'Action Lite',  genres: ['Action'], time_played: 800,  last_played: Date.now(), replayIntent: 'active' }),
        baseGame({ appid: '3', name: 'Action More',  genres: ['Action'], time_played: 600,  last_played: Date.now(), replayIntent: 'active' }),
        // Action listed FIRST — under the old genres[0] logic this would score
        // as fully familiar (Action). Under the fix, the Puzzle angle wins.
        baseGame({ appid: '4', name: 'Hybrid Discovery', genres: ['Action', 'Puzzle'], time_played: 0, last_played: null }),
      ];
      const result = RecommendationEngine.getPerfectPlayRecommendations(lib, null, null, null, 3);
      expect(result[2].name).toBe('Hybrid Discovery');
    });

    test('does not inject an unrunnable game as the exploration pick', () => {
      setMode('full');
      const lib = [
        baseGame({ appid: '1', name: 'RPG Heavy', genres: ['RPG'], time_played: 600, last_played: Date.now() - 1000 * 60 * 60 * 24 * 30, replayIntent: 'active' }),
        baseGame({ appid: '2', name: 'RPG Lite',  genres: ['RPG'], time_played: 120, last_played: Date.now() - 1000 * 60 * 60 * 24 * 10, replayIntent: 'active' }),
        baseGame({ appid: '3', name: 'Strategy X', genres: ['Strategy'], time_played: 300, last_played: Date.now() - 1000 * 60 * 60 * 24 * 5, replayIntent: 'active' }),
        baseGame({ appid: '4', name: 'Puzzle Surprise', genres: ['Puzzle'], time_played: 0, last_played: null, hardwareCompatibility: 'cannot_run' }),
        baseGame({ appid: '5', name: 'Action Unplayed', genres: ['Action'], time_played: 0, last_played: null, hardwareCompatibility: 'cannot_run' }),
      ];
      const result = RecommendationEngine.getPerfectPlayRecommendations(lib, null, null, null, 3);
      const names = result.map((g) => g.name);
      expect(result).toHaveLength(3);
      expect(names).not.toContain('Puzzle Surprise');
      expect(names).not.toContain('Action Unplayed');
    });

  });
});
