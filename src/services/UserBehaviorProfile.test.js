import { UserBehaviorProfile } from './UserBehaviorProfile';
import StorageService from './StorageService';

describe('UserBehaviorProfile', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getProfile / hydration', () => {
    test('returns an empty profile when no data is stored', () => {
      const profile = UserBehaviorProfile.getProfile();
      expect(profile.moodPreferences).toEqual({});
      expect(profile.genrePreferences).toEqual({});
      expect(profile.playstylePatterns.avgSessionLength).toBe(0);
      expect(profile.completionStats.totalCompleted).toBe(0);
      expect(profile.selectionHistory).toEqual([]);
    });

    test('hydrates a partial stored profile with defaults', () => {
      StorageService.setString(
        UserBehaviorProfile.STORAGE_KEY,
        JSON.stringify({ moodPreferences: { Focused: { count: 5 } } })
      );
      const profile = UserBehaviorProfile.getProfile();
      expect(profile.moodPreferences.Focused.count).toBe(5);
      expect(profile.genrePreferences).toEqual({});
      expect(profile.playstylePatterns).toBeDefined();
      expect(profile.completionStats).toBeDefined();
    });

    test('recovers gracefully from corrupt JSON', () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      StorageService.setString(UserBehaviorProfile.STORAGE_KEY, '{not-json');
      const profile = UserBehaviorProfile.getProfile();
      expect(profile.moodPreferences).toEqual({});
      expect(profile.selectionHistory).toEqual([]);
      expect(errorSpy).toHaveBeenCalledTimes(1);
      errorSpy.mockRestore();
    });

    test('coerces non-array selectionHistory to empty array', () => {
      StorageService.setString(
        UserBehaviorProfile.STORAGE_KEY,
        JSON.stringify({ selectionHistory: 'oops' })
      );
      expect(UserBehaviorProfile.getProfile().selectionHistory).toEqual([]);
    });
  });

  describe('trackSelection', () => {
    test('increments mood and genre counts and appends to history', () => {
      UserBehaviorProfile.trackSelection('Focused', 'Strategy', 120, 'game-1');
      const profile = UserBehaviorProfile.getProfile();
      expect(profile.moodPreferences.Focused.count).toBe(1);
      expect(profile.genrePreferences.Strategy.count).toBe(1);
      expect(profile.selectionHistory).toHaveLength(1);
      expect(profile.selectionHistory[0]).toMatchObject({
        mood: 'Focused', genre: 'Strategy', selectedGameId: 'game-1', timeAvailable: 120
      });
    });

    test('tracks time slot based on normalized minutes', () => {
      UserBehaviorProfile.trackSelection('Relaxed', 'Casual', 20);
      UserBehaviorProfile.trackSelection('Relaxed', 'Casual', 90);
      UserBehaviorProfile.trackSelection('Relaxed', 'Casual', 400);
      const profile = UserBehaviorProfile.getProfile();
      expect(profile.timeSlotPreferences['0-30min'].count).toBe(1);
      expect(profile.timeSlotPreferences['1-2hours'].count).toBe(1);
      expect(profile.timeSlotPreferences['2+hours'].count).toBe(1);
    });

    test('resolves string time presets via normalizeTimeAvailable', () => {
      UserBehaviorProfile.trackSelection('Focused', 'Strategy', 'long');
      const profile = UserBehaviorProfile.getProfile();
      expect(profile.selectionHistory[0].timeAvailable).toBe(240);
      expect(profile.timeSlotPreferences['2+hours'].count).toBe(1);
    });

    test('caps selection history at 100 entries', () => {
      for (let i = 0; i < 120; i += 1) {
        UserBehaviorProfile.trackSelection('Focused', 'Strategy', 60, `game-${i}`);
      }
      const profile = UserBehaviorProfile.getProfile();
      expect(profile.selectionHistory).toHaveLength(100);
      expect(profile.selectionHistory[0].selectedGameId).toBe('game-20');
      expect(profile.selectionHistory[99].selectedGameId).toBe('game-119');
    });

    test('skips mood/genre tracking when only one is provided', () => {
      UserBehaviorProfile.trackSelection(null, 'Strategy', 60);
      const profile = UserBehaviorProfile.getProfile();
      expect(profile.moodPreferences).toEqual({});
      expect(profile.genrePreferences.Strategy.count).toBe(1);
    });
  });

  describe('trackCompletion', () => {
    test('updates completion counts and average time', () => {
      UserBehaviorProfile.trackSelection('Focused', 'Strategy', 120, 'abc');
      UserBehaviorProfile.trackCompletion('Game A', 'Focused', 'Strategy', 90, 'abc');
      const profile = UserBehaviorProfile.getProfile();
      expect(profile.completionStats.totalCompleted).toBe(1);
      expect(profile.completionStats.completedByMood.Focused).toBe(1);
      expect(profile.completionStats.completedByGenre.Strategy).toBe(1);
      expect(profile.completionStats.averageCompletionTime).toBe(90);
      expect(profile.moodPreferences.Focused.completedCount).toBe(1);
    });

    test('running average across multiple completions', () => {
      UserBehaviorProfile.trackSelection('Focused', 'Strategy', 60, 'a');
      UserBehaviorProfile.trackSelection('Focused', 'Strategy', 60, 'b');
      UserBehaviorProfile.trackCompletion('A', 'Focused', 'Strategy', 30, 'a');
      UserBehaviorProfile.trackCompletion('B', 'Focused', 'Strategy', 90, 'b');
      expect(UserBehaviorProfile.getProfile().completionStats.averageCompletionTime).toBe(60);
    });

    test('marks the matching selection history entry as completed', () => {
      UserBehaviorProfile.trackSelection('Focused', 'Strategy', 120, 'game-x');
      UserBehaviorProfile.trackCompletion('Game X', 'Focused', 'Strategy', 45, 'game-x');
      const entry = UserBehaviorProfile.getProfile().selectionHistory[0];
      expect(entry.completed).toBe(true);
      expect(entry.completionTime).toBe(45);
    });
  });

  describe('completion rates', () => {
    test('mood rate uses session feedback when present', () => {
      UserBehaviorProfile.trackSelection('Relaxed', 'Casual', 30);
      UserBehaviorProfile.trackSessionFeedback('Game', true, { mood: 'Relaxed' });
      UserBehaviorProfile.trackSessionFeedback('Game', false, { mood: 'Relaxed' });
      expect(UserBehaviorProfile.getMoodCompletionRate('Relaxed')).toBe(50);
    });

    test('session feedback contributes without a prior manual selection', () => {
      UserBehaviorProfile.trackSessionFeedback('Game', true, { mood: 'Focused', genre: 'Strategy' });
      expect(UserBehaviorProfile.getMoodCompletionRate('Focused')).toBe(100);
      expect(UserBehaviorProfile.getGenreCompletionRate('Strategy')).toBe(100);
    });

    test('mood rate falls back to completedCount / count', () => {
      UserBehaviorProfile.trackSelection('Focused', 'Strategy', 60, 'a');
      UserBehaviorProfile.trackSelection('Focused', 'Strategy', 60, 'b');
      UserBehaviorProfile.trackCompletion('A', 'Focused', 'Strategy', 30, 'a');
      expect(UserBehaviorProfile.getMoodCompletionRate('Focused')).toBe(50);
    });

    test('returns 0 for an unknown mood', () => {
      expect(UserBehaviorProfile.getMoodCompletionRate('NotAMood')).toBe(0);
    });

    test('genre rate mirrors mood rate logic', () => {
      UserBehaviorProfile.trackSelection('Focused', 'Strategy', 60, 'a');
      UserBehaviorProfile.trackSelection('Focused', 'Strategy', 60, 'b');
      UserBehaviorProfile.trackCompletion('A', 'Focused', 'Strategy', 30, 'a');
      expect(UserBehaviorProfile.getGenreCompletionRate('Strategy')).toBe(50);
    });
  });

  describe('top moods / genres', () => {
    test('top moods sorted by selection count', () => {
      UserBehaviorProfile.trackSelection('Focused', 'Strategy', 60);
      UserBehaviorProfile.trackSelection('Focused', 'Strategy', 60);
      UserBehaviorProfile.trackSelection('Relaxed', 'Casual', 30);
      const top = UserBehaviorProfile.getTopMoods(2);
      expect(top[0].mood).toBe('Focused');
      expect(top[0].count).toBe(2);
      expect(top[1].mood).toBe('Relaxed');
    });

    test('top genres respect limit', () => {
      UserBehaviorProfile.trackSelection('Focused', 'Strategy', 60);
      UserBehaviorProfile.trackSelection('Focused', 'Strategy', 60);
      UserBehaviorProfile.trackSelection('Focused', 'RPG', 60);
      const top = UserBehaviorProfile.getTopGenres(1);
      expect(top).toHaveLength(1);
      expect(top[0].genre).toBe('Strategy');
    });
  });

  describe('session length tracking', () => {
    test('updates running average', () => {
      UserBehaviorProfile.trackSessionLength(30);
      UserBehaviorProfile.trackSessionLength(90);
      const profile = UserBehaviorProfile.getProfile();
      expect(profile.playstylePatterns.totalSessionsTracked).toBe(2);
      expect(profile.playstylePatterns.avgSessionLength).toBe(60);
    });

    test('categorizes session length into correct bucket', () => {
      UserBehaviorProfile.trackSessionLength(15);
      UserBehaviorProfile.trackSessionLength(45);
      UserBehaviorProfile.trackSessionLength(90);
      UserBehaviorProfile.trackSessionLength(200);
      const buckets = UserBehaviorProfile.getPreferredSessionLengths();
      expect(buckets['0-30']).toBe(1);
      expect(buckets['30-60']).toBe(1);
      expect(buckets['60-120']).toBe(1);
      expect(buckets['120+']).toBe(1);
    });

    test('increments peak play time for current hour', () => {
      const spy = jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14);
      UserBehaviorProfile.trackSessionLength(60);
      UserBehaviorProfile.trackSessionLength(60);
      expect(UserBehaviorProfile.getProfile().playstylePatterns.peakPlayTimes[14]).toBe(2);
      spy.mockRestore();
    });
  });

  describe('helpers', () => {
    test('getSessionLengthCategory boundaries', () => {
      expect(UserBehaviorProfile.getSessionLengthCategory(30)).toBe('0-30');
      expect(UserBehaviorProfile.getSessionLengthCategory(31)).toBe('30-60');
      expect(UserBehaviorProfile.getSessionLengthCategory(60)).toBe('30-60');
      expect(UserBehaviorProfile.getSessionLengthCategory(61)).toBe('60-120');
      expect(UserBehaviorProfile.getSessionLengthCategory(120)).toBe('60-120');
      expect(UserBehaviorProfile.getSessionLengthCategory(121)).toBe('120+');
    });

    test('getTimeSlot returns null for non-positive input', () => {
      expect(UserBehaviorProfile.getTimeSlot(0)).toBe(null);
      expect(UserBehaviorProfile.getTimeSlot(null)).toBe(null);
    });

    test('getTimeOfDay maps hour to descriptor', () => {
      expect(UserBehaviorProfile.getTimeOfDay(2)).toBe('Late Night');
      expect(UserBehaviorProfile.getTimeOfDay(9)).toBe('Morning');
      expect(UserBehaviorProfile.getTimeOfDay(14)).toBe('Afternoon');
      expect(UserBehaviorProfile.getTimeOfDay(19)).toBe('Evening');
      expect(UserBehaviorProfile.getTimeOfDay(23)).toBe('Night');
    });

    test('normalizeTimeAvailable handles strings, numbers, and garbage', () => {
      expect(UserBehaviorProfile.normalizeTimeAvailable(60)).toBe(60);
      expect(UserBehaviorProfile.normalizeTimeAvailable('quick')).toBe(30);
      expect(UserBehaviorProfile.normalizeTimeAvailable('weekend')).toBe(480);
      expect(UserBehaviorProfile.normalizeTimeAvailable('120')).toBe(120);
      expect(UserBehaviorProfile.normalizeTimeAvailable('garbage')).toBe(null);
      expect(UserBehaviorProfile.normalizeTimeAvailable(-5)).toBe(null);
      expect(UserBehaviorProfile.normalizeTimeAvailable(undefined)).toBe(null);
    });
  });

  describe('recommendation attribution', () => {
    test('trackRecommendationLaunch attaches to matching entry without inserting new', () => {
      UserBehaviorProfile.trackRecommendation('perfect-play', 'Focused', 'Strategy', 60, ['game-1', 'game-2']);
      UserBehaviorProfile.trackRecommendationLaunch('perfect-play', 'game-2');
      const profile = UserBehaviorProfile.getProfile();
      expect(profile.selectionHistory).toHaveLength(1);
      expect(profile.selectionHistory[0].launchedGameId).toBe('game-2');
    });

    test('trackRecommendationLaunch creates an inferred entry when no match', () => {
      UserBehaviorProfile.trackRecommendationLaunch('perfect-play', 'game-9', { mood: 'Focused' });
      const profile = UserBehaviorProfile.getProfile();
      expect(profile.selectionHistory).toHaveLength(1);
      expect(profile.selectionHistory[0].inferredFromLaunch).toBe(true);
    });

    test('trackRecommendationFeedback marks helpful flag on matching entry', () => {
      UserBehaviorProfile.trackRecommendation('perfect-play', 'Focused', 'Strategy', 60, ['game-1']);
      UserBehaviorProfile.trackRecommendationFeedback('perfect-play', 'game-1', true);
      const entry = UserBehaviorProfile.getProfile().selectionHistory[0];
      expect(entry.recommendationHelpful).toBe(true);
    });

    test('prompts once after a meaningful recommended session', () => {
      UserBehaviorProfile.trackRecommendationLaunch('perfect-play', 'game-1', { source: 'recommendations-page' });

      expect(UserBehaviorProfile.recordRecommendationSession('game-1', 'Game 1', { playtimeMinutes: 9 })).toBeNull();
      const prompt = UserBehaviorProfile.recordRecommendationSession('game-1', 'Game 1', { playtimeMinutes: 20 });
      expect(prompt).toMatchObject({ recommendationType: 'perfect-play', launchedGameId: 'game-1' });
      expect(UserBehaviorProfile.recordRecommendationSession('game-1', 'Game 1', { playtimeMinutes: 30 })).toBeNull();
    });

    test('stores Great pick as a positive learning signal', () => {
      UserBehaviorProfile.trackRecommendationLaunch('perfect-play', 'game-1');
      UserBehaviorProfile.trackRecommendationOutcome('game-1', 'great-pick', { gameName: 'Game 1' });

      expect(UserBehaviorProfile.getRecommendationOutcomeSignal('game-1', 'Game 1')).toMatchObject({
        adjustment: 24,
        suppress: false,
        outcome: 'great-pick'
      });
    });

    test('suppresses Not now and Not for me outcomes', () => {
      UserBehaviorProfile.trackRecommendationLaunch('perfect-play', 'later');
      UserBehaviorProfile.trackRecommendationOutcome('later', 'not-now', { gameName: 'Later' });
      expect(UserBehaviorProfile.shouldSuppressRecommendation('later', 'Later')).toBe(true);

      UserBehaviorProfile.trackRecommendationLaunch('perfect-play', 'never');
      UserBehaviorProfile.trackRecommendationOutcome('never', 'not-for-me', { gameName: 'Never' });
      expect(UserBehaviorProfile.shouldSuppressRecommendation('never', 'Never')).toBe(true);
    });

    test('trackRecommendationFeedback no-ops on invalid args', () => {
      UserBehaviorProfile.trackRecommendationLaunch('seed', 'seed-game');
      const before = JSON.stringify(UserBehaviorProfile.getProfile());
      UserBehaviorProfile.trackRecommendationFeedback(null, 'game-1', true);
      UserBehaviorProfile.trackRecommendationFeedback('perfect-play', null, true);
      UserBehaviorProfile.trackRecommendationFeedback('perfect-play', 'game-1', 'maybe');
      const after = JSON.stringify(UserBehaviorProfile.getProfile());
      expect(after).toBe(before);
    });
  });

  describe('persona alignment', () => {
    test('returns 0 when no factors are provided', () => {
      expect(UserBehaviorProfile.getPersonaAlignmentScore({})).toBe(0);
    });

    test('combines mood, genre, and session signals into an average', () => {
      UserBehaviorProfile.trackSelection('Focused', 'Strategy', 60, 'a');
      UserBehaviorProfile.trackCompletion('A', 'Focused', 'Strategy', 30, 'a');
      UserBehaviorProfile.trackSessionLength(60);
      const score = UserBehaviorProfile.getPersonaAlignmentScore({
        mood: 'Focused',
        genres: ['Strategy'],
        sessionMinutes: 60
      });
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('startup influence summary', () => {
    test('returns inactive when no onboarding seed exists', () => {
      const summary = UserBehaviorProfile.getStartupInfluenceSummary();
      expect(summary.active).toBe(false);
      expect(summary.seedWeight).toBe(0);
    });

    test('seed weight decays as live signals accumulate', () => {
      // Seed manually
      const profile = UserBehaviorProfile.getProfile();
      profile.onboardingSeed = { selectedMoods: ['Focused'], favoriteGenres: ['Strategy'] };
      UserBehaviorProfile.saveProfile(profile);
      const fresh = UserBehaviorProfile.getStartupInfluenceSummary();
      expect(fresh.active).toBe(true);
      expect(fresh.seedWeight).toBeGreaterThan(0.5);

      for (let i = 0; i < 20; i += 1) {
        UserBehaviorProfile.trackSelection('Focused', 'Strategy', 60, `g-${i}`);
        UserBehaviorProfile.trackRecommendationLaunch('perfect-play', `g-${i}`);
      }
      const after = UserBehaviorProfile.getStartupInfluenceSummary();
      expect(after.seedWeight).toBeLessThan(fresh.seedWeight);
    });
  });
});
