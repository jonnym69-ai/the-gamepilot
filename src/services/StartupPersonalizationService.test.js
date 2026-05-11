import { StartupPersonalizationService } from './StartupPersonalizationService';
import { UserBehaviorProfile } from './UserBehaviorProfile';
import StorageService from './StorageService';

describe('StartupPersonalizationService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('defaults & getters', () => {
    test('returns defaults when no profile is stored', () => {
      const profile = StartupPersonalizationService.getProfile();
      expect(profile.completed).toBe(false);
      expect(profile.selectedMoods).toEqual([]);
      expect(profile.favoriteGenres).toEqual([]);
      expect(profile.sessionPreference).toBe('medium');
      expect(profile.playerVibe).toBe('Variety Seeker');
      expect(profile.personalizationStyle).toBe('Focused');
    });

    test('hasCompletedOnboarding is false initially', () => {
      expect(StartupPersonalizationService.hasCompletedOnboarding()).toBe(false);
    });

    test('exposes player vibes and personalization styles as arrays', () => {
      expect(StartupPersonalizationService.getPlayerVibes()).toContain('Comfort Seeker');
      expect(StartupPersonalizationService.getPersonalizationStyles()).toContain('Focused');
      expect(StartupPersonalizationService.getSessionOptions()).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: 'quick' })])
      );
    });
  });

  describe('saveProfile validation', () => {
    test('filters invalid moods and genres', () => {
      const saved = StartupPersonalizationService.saveProfile({
        selectedMoods: ['Focused', 'NotAMood', 'Relaxed'],
        favoriteGenres: ['Strategy', 'NotAGenre', 'RPG']
      });
      expect(saved.selectedMoods).toEqual(['Focused', 'Relaxed']);
      expect(saved.favoriteGenres).toEqual(['Strategy', 'RPG']);
    });

    test('deduplicates moods and genres', () => {
      const saved = StartupPersonalizationService.saveProfile({
        selectedMoods: ['Focused', 'Focused'],
        favoriteGenres: ['RPG', 'RPG']
      });
      expect(saved.selectedMoods).toEqual(['Focused']);
      expect(saved.favoriteGenres).toEqual(['RPG']);
    });

    test('rejects unknown sessionPreference / playerVibe / personalizationStyle', () => {
      const saved = StartupPersonalizationService.saveProfile({
        sessionPreference: 'eternity',
        playerVibe: 'NotAVibe',
        personalizationStyle: 'NotAStyle'
      });
      expect(saved.sessionPreference).toBe('medium');
      expect(saved.playerVibe).toBe('Variety Seeker');
      expect(saved.personalizationStyle).toBe('Focused');
    });
  });

  describe('completeOnboarding', () => {
    test('marks profile as completed and seeds behavior profile', () => {
      StartupPersonalizationService.completeOnboarding({
        selectedMoods: ['Focused', 'Relaxed'],
        favoriteGenres: ['Strategy', 'RPG'],
        sessionPreference: 'long',
        playerVibe: 'Story Hunter',
        personalizationStyle: 'Cozy'
      });

      expect(StartupPersonalizationService.hasCompletedOnboarding()).toBe(true);

      const behavior = UserBehaviorProfile.getProfile();
      expect(behavior.moodPreferences.Focused.seeded).toBe(true);
      expect(behavior.moodPreferences.Relaxed.seeded).toBe(true);
      expect(behavior.genrePreferences.Strategy.seeded).toBe(true);
      expect(behavior.playstylePatterns.avgSessionLength).toBeGreaterThanOrEqual(240);
      expect(behavior.onboardingSeed.selectedMoods).toEqual(['Focused', 'Relaxed']);
    });

    test('first-listed mood gets a higher seeded count than later moods', () => {
      StartupPersonalizationService.completeOnboarding({
        selectedMoods: ['Focused', 'Relaxed', 'Tactical'],
        favoriteGenres: ['Strategy', 'RPG', 'Roguelike'],
        sessionPreference: 'medium'
      });
      const behavior = UserBehaviorProfile.getProfile();
      expect(behavior.moodPreferences.Focused.count).toBeGreaterThanOrEqual(
        behavior.moodPreferences.Relaxed.count
      );
      expect(behavior.genrePreferences.Strategy.count).toBeGreaterThanOrEqual(
        behavior.genrePreferences.RPG.count
      );
    });

    test('sets identity defaults in storage', () => {
      StartupPersonalizationService.completeOnboarding({
        selectedMoods: ['Focused'],
        favoriteGenres: ['Strategy'],
        sessionPreference: 'medium',
        playerVibe: 'Challenge Chaser',
        personalizationStyle: 'Energetic'
      });

      expect(StorageService.getString('gamepilot_identity_style')).toBe('Energetic');
      expect(StorageService.getString('gamepilot_identity_vibe')).toBe('Challenge Chaser');
      expect(StorageService.getString('welcomeMessage')).toContain('Focused');
    });

    test('preserves an existing welcomeMessage rather than overwriting', () => {
      StorageService.setString('welcomeMessage', 'Custom hello');
      StartupPersonalizationService.completeOnboarding({
        selectedMoods: ['Focused'],
        favoriteGenres: ['Strategy'],
        sessionPreference: 'medium'
      });
      expect(StorageService.getString('welcomeMessage')).toBe('Custom hello');
    });

    test('founderEnhanced flag persists when set', () => {
      StartupPersonalizationService.completeOnboarding(
        { selectedMoods: ['Focused'], favoriteGenres: ['Strategy'] },
        { founderEnhanced: true }
      );
      expect(StartupPersonalizationService.getProfile().founderEnhanced).toBe(true);
    });
  });

  describe('skipOnboarding', () => {
    test('marks completed without seeding behavior profile', () => {
      StartupPersonalizationService.skipOnboarding();
      expect(StartupPersonalizationService.hasCompletedOnboarding()).toBe(true);
      const behavior = UserBehaviorProfile.getProfile();
      expect(behavior.moodPreferences).toEqual({});
      expect(behavior.genrePreferences).toEqual({});
    });
  });

  describe('getSeededRecommendationContext', () => {
    test('returns null when onboarding is incomplete', () => {
      expect(StartupPersonalizationService.getSeededRecommendationContext()).toBe(null);
    });

    test('returns the seeded context after completion', () => {
      StartupPersonalizationService.completeOnboarding({
        selectedMoods: ['Focused'],
        favoriteGenres: ['Strategy'],
        sessionPreference: 'long',
        playerVibe: 'Story Hunter',
        personalizationStyle: 'Cozy'
      });
      const ctx = StartupPersonalizationService.getSeededRecommendationContext();
      expect(ctx).toEqual({
        moods: ['Focused'],
        genres: ['Strategy'],
        sessionPreference: 'long',
        playerVibe: 'Story Hunter',
        personalizationStyle: 'Cozy',
        founderEnhanced: false
      });
    });
  });
});
