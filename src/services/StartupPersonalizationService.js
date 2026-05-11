import { GENRES, MOODS } from '../constants/GenresMoods';
import { UserBehaviorProfile } from './UserBehaviorProfile';
import StorageService from './StorageService';

const STORAGE_KEY = 'gamepilotStartupPersonalization';
const SESSION_BUCKET_TO_MINUTES = Object.freeze({
  quick: 30,
  medium: 120,
  long: 240,
  weekend: 480
});

const PLAYER_VIBES = Object.freeze([
  'Comfort Seeker',
  'Challenge Chaser',
  'Story Hunter',
  'Experimenter',
  'Completionist',
  'Variety Seeker'
]);

const PERSONALIZATION_STYLES = Object.freeze([
  'Cozy',
  'Focused',
  'Energetic',
  'Prestige',
  'Minimal'
]);

export class StartupPersonalizationService {
  static getPlayerVibes() {
    return [...PLAYER_VIBES];
  }

  static getPersonalizationStyles() {
    return [...PERSONALIZATION_STYLES];
  }

  static getSessionOptions() {
    return [
      {
        id: 'quick',
        label: 'Quick sessions',
        description: 'Usually 15-30 minute bursts.'
      },
      {
        id: 'medium',
        label: 'Medium sessions',
        description: 'Usually 1-2 hour sessions.'
      },
      {
        id: 'long',
        label: 'Long sessions',
        description: 'Usually 3-4 hour play windows.'
      },
      {
        id: 'weekend',
        label: 'Deep-dive sessions',
        description: 'Big weekend or marathon sessions.'
      }
    ];
  }

  static getDefaults() {
    return {
      completed: false,
      completedAt: null,
      selectedMoods: [],
      favoriteGenres: [],
      sessionPreference: 'medium',
      playerVibe: 'Variety Seeker',
      personalizationStyle: 'Focused',
      founderEnhanced: false
    };
  }

  static getProfile() {
    try {
      const parsed = StorageService.get(STORAGE_KEY, {});
      const defaults = this.getDefaults();
      return {
        ...defaults,
        ...(parsed || {}),
        selectedMoods: Array.isArray(parsed?.selectedMoods) ? parsed.selectedMoods.filter((mood) => MOODS.includes(mood)) : [],
        favoriteGenres: Array.isArray(parsed?.favoriteGenres) ? parsed.favoriteGenres.filter((genre) => GENRES.includes(genre)) : []
      };
    } catch (_error) {
      return this.getDefaults();
    }
  }

  static hasCompletedOnboarding() {
    return Boolean(this.getProfile().completed);
  }

  static saveProfile(profile = {}) {
    const defaults = this.getDefaults();
    const normalized = {
      ...defaults,
      ...(profile || {}),
      selectedMoods: Array.isArray(profile?.selectedMoods)
        ? profile.selectedMoods.filter((mood, index, arr) => MOODS.includes(mood) && arr.indexOf(mood) === index)
        : [],
      favoriteGenres: Array.isArray(profile?.favoriteGenres)
        ? profile.favoriteGenres.filter((genre, index, arr) => GENRES.includes(genre) && arr.indexOf(genre) === index)
        : [],
      sessionPreference: SESSION_BUCKET_TO_MINUTES[profile?.sessionPreference] ? profile.sessionPreference : defaults.sessionPreference,
      playerVibe: PLAYER_VIBES.includes(profile?.playerVibe) ? profile.playerVibe : defaults.playerVibe,
      personalizationStyle: PERSONALIZATION_STYLES.includes(profile?.personalizationStyle) ? profile.personalizationStyle : defaults.personalizationStyle,
      completed: Boolean(profile?.completed),
      completedAt: profile?.completedAt || null,
      founderEnhanced: Boolean(profile?.founderEnhanced)
    };

    StorageService.set(STORAGE_KEY, normalized);
    return normalized;
  }

  static completeOnboarding(profile = {}, { founderEnhanced = false } = {}) {
    const saved = this.saveProfile({
      ...profile,
      founderEnhanced,
      completed: true,
      completedAt: new Date().toISOString()
    });
    this.seedBehaviorProfile(saved);
    this.applyIdentityDefaults(saved);
    return saved;
  }

  static skipOnboarding() {
    const existing = this.getProfile();
    return this.saveProfile({
      ...existing,
      completed: true,
      completedAt: existing.completedAt || new Date().toISOString()
    });
  }

  static updateOnboardingProfile(profile = {}) {
    const existing = this.getProfile();
    const saved = this.saveProfile({
      ...existing,
      ...profile,
      completed: true,
      completedAt: existing.completedAt || new Date().toISOString(),
      founderEnhanced: Boolean(profile?.founderEnhanced ?? existing.founderEnhanced)
    });

    this.seedBehaviorProfile(saved);
    this.applyIdentityDefaults(saved);
    return saved;
  }

  static seedBehaviorProfile(personalizationProfile = {}) {
    const profile = UserBehaviorProfile.getProfile();
    const selectedMoods = Array.isArray(personalizationProfile.selectedMoods) ? personalizationProfile.selectedMoods : [];
    const favoriteGenres = Array.isArray(personalizationProfile.favoriteGenres) ? personalizationProfile.favoriteGenres : [];
    const sessionPreference = personalizationProfile.sessionPreference || 'medium';
    const sessionMinutes = SESSION_BUCKET_TO_MINUTES[sessionPreference] || 120;
    const sessionBucket = UserBehaviorProfile.getSessionLengthCategory(sessionMinutes);

    selectedMoods.forEach((mood, index) => {
      const existing = profile.moodPreferences[mood] || { count: 0, totalPlaytime: 0, completedCount: 0 };
      profile.moodPreferences[mood] = {
        ...existing,
        count: Math.max(existing.count || 0, 3 - Math.min(index, 2)),
        totalPlaytime: Math.max(existing.totalPlaytime || 0, sessionMinutes),
        seeded: true
      };
    });

    favoriteGenres.forEach((genre, index) => {
      const existing = profile.genrePreferences[genre] || { count: 0, totalPlaytime: 0, completedCount: 0 };
      profile.genrePreferences[genre] = {
        ...existing,
        count: Math.max(existing.count || 0, 4 - Math.min(index, 3)),
        totalPlaytime: Math.max(existing.totalPlaytime || 0, sessionMinutes),
        seeded: true
      };
    });

    profile.playstylePatterns = {
      ...(profile.playstylePatterns || {}),
      avgSessionLength: Math.max(Number(profile.playstylePatterns?.avgSessionLength || 0), sessionMinutes),
      preferredSessionLengths: {
        ...(profile.playstylePatterns?.preferredSessionLengths || {}),
        [sessionBucket]: Math.max(Number(profile.playstylePatterns?.preferredSessionLengths?.[sessionBucket] || 0), 3)
      }
    };

    profile.onboardingSeed = {
      selectedMoods,
      favoriteGenres,
      sessionPreference,
      playerVibe: personalizationProfile.playerVibe || null,
      personalizationStyle: personalizationProfile.personalizationStyle || null,
      founderEnhanced: Boolean(personalizationProfile.founderEnhanced),
      seededAt: new Date().toISOString()
    };
    profile.lastUpdated = new Date().toISOString();
    UserBehaviorProfile.saveProfile(profile);
    return profile;
  }

  static applyIdentityDefaults(personalizationProfile = {}) {
    const style = personalizationProfile.personalizationStyle || 'Focused';
    const vibe = personalizationProfile.playerVibe || 'Variety Seeker';
    const selectedMoods = Array.isArray(personalizationProfile.selectedMoods) ? personalizationProfile.selectedMoods : [];
    const favoriteGenres = Array.isArray(personalizationProfile.favoriteGenres) ? personalizationProfile.favoriteGenres : [];

    if (!StorageService.getString('welcomeMessage')) {
      const leadMood = selectedMoods[0] || 'Focused';
      StorageService.setString('welcomeMessage', `${style} cockpit ready • ${leadMood} vibes • ${vibe}`);
    }

    StorageService.setString('gamepilot_identity_style', style);
    StorageService.setString('gamepilot_identity_vibe', vibe);
    if (selectedMoods.length > 0) {
      StorageService.set('gamepilot_seed_moods', selectedMoods);
    }
    if (favoriteGenres.length > 0) {
      StorageService.set('gamepilot_seed_genres', favoriteGenres);
    }
  }

  static getSeededRecommendationContext() {
    const profile = this.getProfile();
    if (!profile.completed) {
      return null;
    }

    return {
      moods: profile.selectedMoods,
      genres: profile.favoriteGenres,
      sessionPreference: profile.sessionPreference,
      playerVibe: profile.playerVibe,
      personalizationStyle: profile.personalizationStyle,
      founderEnhanced: profile.founderEnhanced
    };
  }
}
