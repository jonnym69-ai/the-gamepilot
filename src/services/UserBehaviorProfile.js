/**
 * UserBehaviorProfile Service
 * Tracks and analyzes user gaming habits, preferences, and patterns
 * All data stored locally in localStorage
 */

import StorageService from './StorageService';
import { PersonaPerformanceInsights } from './PersonaPerformanceInsights';

const MOOD_PERSONA_IDENTITIES = {
  Relaxed: {
    label: 'Chill Voyager',
    description: 'Thrives on cozy loops, slow-build sims, and low-pressure adventures.'
  },
  Social: {
    label: 'Party Co-Pilot',
    description: 'Lights up in co-op lobbies and thrives on multiplayer chemistry.'
  },
  Creative: {
    label: 'Imagination Architect',
    description: 'Builds worlds from scratch and chases expressive sandboxes.'
  },
  Focused: {
    label: 'Precision Strategist',
    description: 'Finds flow in tight puzzles, tactical battles, and deliberate pacing.'
  },
  Competitive: {
    label: 'Arena Challenger',
    description: 'Thrives on ranked ladders, high-stakes matches, and competitive glory.'
  },
};

const GENRE_PERSONA_IDENTITIES = {
  Strategy: { label: 'Grand Tactician', description: 'Commands empires, plots turn-by-turn, and outthinks the AI.' },
  RPG: { label: 'Realm Wanderer', description: 'Chases epic quests, deep builds, and unforgettable party dynamics.' },
  Action: { label: 'Adrenaline Ace', description: 'Lives for reflex-driven spectacle and explosive set pieces.' },
  Shooter: { label: 'Sharpshooter', description: 'Calibrates aim, reads the map, and controls the arena.' },
  FPS: { label: 'Sharpshooter', description: 'Calibrates aim, reads the map, and controls the arena.' },
  Horror: { label: 'Dread Navigator', description: 'Survives the dark and comes back for the tension.' },
  Adventure: { label: 'Expedition Lead', description: 'Follows curiosity into unknown worlds and hidden paths.' },
  Simulation: { label: 'System Weaver', description: 'Tends complex worlds where every dial matters.' },
  Sports: { label: 'Pitch Champion', description: 'Competes on the court, field, or track with pure athletic drive.' },
  Racing: { label: 'Velocity Hunter', description: 'Chases the perfect racing line and the podium finish.' },
  Puzzle: { label: 'Pattern Breaker', description: 'Untangles logic grids and finds beauty in elegant solutions.' },
  Fighting: { label: 'Combo Sculptor', description: 'Masters frame data and turns every match into a duel.' },
  MOBA: { label: 'Lane Commander', description: 'Orchestrates team fights and reads the macro game.' },
  Indie: { label: 'Curator Scout', description: 'Digs deep for the unexpected gems outside the mainstream.' },
  Sandbox: { label: 'World Builder', description: 'Shapes open sandboxes into something entirely personal.' },
  Survival: { label: 'Wilderness Forged', description: 'Outlasts the elements and thrives where others retreat.' },
  'Visual Novel': { label: 'Narrative Connoisseur', description: 'Follows branching stories and savours every dialogue beat.' },
  Platformer: { label: 'Precision Jumper', description: 'Nails pixel-perfect leaps and finds flow in momentum.' },
  Management: { label: 'Empire Architect', description: 'Balances resources, staff, and growth with ruthless efficiency.' },
  Exploration: { label: 'Cartographer', description: 'Maps the uncharted and collects every hidden corner.' },
  MMO: { label: 'Realm Regular', description: 'Commits to shared worlds and the communities inside them.' },
  'Story-driven': { label: 'Narrative Voyager', description: 'Follows branching stories and savours every dialogue beat.' },
  Multiplayer: { label: 'Online Operative', description: 'Lives in shared lobbies and persistent online worlds.' },
  Casual: { label: 'Easygoing Explorer', description: 'Drops in for light, low-pressure sessions any time.' },
  Party: { label: 'Party Catalyst', description: 'Brings the couch-co-op chaos and group laughs.' },
  Stealth: { label: 'Shadow Operative', description: 'Favours patience, planning, and the quiet approach.' },
  Roguelike: { label: 'Run Chaser', description: 'Loves the one-more-run loop and earned mastery.' },
};

// Genre -> mood lean, used to infer a provisional mood from a scanned library
const GENRE_MOOD_MAP = Object.freeze({
  RPG: 'Focused',
  Adventure: 'Creative',
  Action: 'Focused',
  Horror: 'Focused',
  Survival: 'Creative',
  Exploration: 'Creative',
  'Story-driven': 'Creative',
  'Visual Novel': 'Creative',
  MMO: 'Social',
  Multiplayer: 'Social',
  MOBA: 'Competitive',
  Shooter: 'Competitive',
  FPS: 'Competitive',
  Fighting: 'Competitive',
  Sports: 'Competitive',
  Racing: 'Competitive',
  Party: 'Social',
  Strategy: 'Focused',
  Puzzle: 'Relaxed',
  Management: 'Relaxed',
  Platformer: 'Relaxed',
  Stealth: 'Focused',
  Roguelike: 'Focused',
  Simulation: 'Relaxed',
  Sandbox: 'Creative',
  Indie: 'Creative',
  Casual: 'Relaxed',
});

const SESSION_PATTERN_IDENTITIES = {
  '0-30': { label: 'Quick Bite Player', description: 'Prefers short, focused bursts over long marathons.' },
  '30-60': { label: 'Hour Blitz', description: 'Squeezes in satisfying hour-long play windows.' },
  '60-120': { label: 'Deep Diver', description: 'Commits to medium-length sessions that dig into the meat of a game.' },
  '120+': { label: 'Marathon Runner', description: 'Settles in for long, uninterrupted play marathons.' },
};

const TIME_OF_DAY_IDENTITIES = {
  'Late Night': { label: 'Midnight Forger', description: 'Burns midnight oil and games into the small hours.' },
  'Morning': { label: 'Dawn Patroller', description: 'Starts the day with a quick session before the world wakes.' },
  'Afternoon': { label: 'Day Shift Pilot', description: 'Claims the afternoon as prime gaming time.' },
  'Evening': { label: 'Twilight Commander', description: 'Winds down the day with focused evening play.' },
  'Night': { label: 'Night Owl', description: 'Gears up after dark when the house goes quiet.' },
};

const TIME_FILTER_MINUTES = Object.freeze({
  quick: 30,
  medium: 120,
  long: 240,
  weekend: 480
});

export class UserBehaviorProfile {
  static STORAGE_KEY = 'userBehaviorProfile';

  /**
   * Initialize or get user behavior profile
   */
  static getProfile() {
    const stored = StorageService.getString(this.STORAGE_KEY);
    if (stored) {
      try {
        return this.hydrateProfile(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse behavior profile:', e);
        return this.createEmptyProfile();
      }
    }
    return this.createEmptyProfile();
  }

  static hydrateProfile(profile = {}) {
    const defaults = this.createEmptyProfile();
    return {
      ...defaults,
      ...(profile || {}),
      moodPreferences: profile?.moodPreferences && typeof profile.moodPreferences === 'object' ? profile.moodPreferences : {},
      genrePreferences: profile?.genrePreferences && typeof profile.genrePreferences === 'object' ? profile.genrePreferences : {},
      timeSlotPreferences: profile?.timeSlotPreferences && typeof profile.timeSlotPreferences === 'object' ? profile.timeSlotPreferences : {},
      playstylePatterns: {
        ...defaults.playstylePatterns,
        ...(profile?.playstylePatterns || {}),
        preferredSessionLengths: profile?.playstylePatterns?.preferredSessionLengths && typeof profile.playstylePatterns.preferredSessionLengths === 'object'
          ? profile.playstylePatterns.preferredSessionLengths
          : {},
        peakPlayTimes: profile?.playstylePatterns?.peakPlayTimes && typeof profile.playstylePatterns.peakPlayTimes === 'object'
          ? profile.playstylePatterns.peakPlayTimes
          : {}
      },
      completionStats: {
        ...defaults.completionStats,
        ...(profile?.completionStats || {}),
        completedByMood: profile?.completionStats?.completedByMood && typeof profile.completionStats.completedByMood === 'object'
          ? profile.completionStats.completedByMood
          : {},
        completedByGenre: profile?.completionStats?.completedByGenre && typeof profile.completionStats.completedByGenre === 'object'
          ? profile.completionStats.completedByGenre
          : {}
      },
      ratingPreferences: {
        ...defaults.ratingPreferences,
        ...(profile?.ratingPreferences || {}),
        highRatedMoods: profile?.ratingPreferences?.highRatedMoods && typeof profile.ratingPreferences.highRatedMoods === 'object'
          ? profile.ratingPreferences.highRatedMoods
          : {},
        highRatedGenres: profile?.ratingPreferences?.highRatedGenres && typeof profile.ratingPreferences.highRatedGenres === 'object'
          ? profile.ratingPreferences.highRatedGenres
          : {},
        lowRatedMoods: profile?.ratingPreferences?.lowRatedMoods && typeof profile.ratingPreferences.lowRatedMoods === 'object'
          ? profile.ratingPreferences.lowRatedMoods
          : {},
        lowRatedGenres: profile?.ratingPreferences?.lowRatedGenres && typeof profile.ratingPreferences.lowRatedGenres === 'object'
          ? profile.ratingPreferences.lowRatedGenres
          : {},
        likedTags: profile?.ratingPreferences?.likedTags && typeof profile.ratingPreferences.likedTags === 'object'
          ? profile.ratingPreferences.likedTags
          : {},
        dislikedTags: profile?.ratingPreferences?.dislikedTags && typeof profile.ratingPreferences.dislikedTags === 'object'
          ? profile.ratingPreferences.dislikedTags
          : {},
        wouldReplayMoods: profile?.ratingPreferences?.wouldReplayMoods && typeof profile.ratingPreferences.wouldReplayMoods === 'object'
          ? profile.ratingPreferences.wouldReplayMoods
          : {},
        wouldReplayGenres: profile?.ratingPreferences?.wouldReplayGenres && typeof profile.ratingPreferences.wouldReplayGenres === 'object'
          ? profile.ratingPreferences.wouldReplayGenres
          : {}
      },
      feedbackPreferences: {
        ...defaults.feedbackPreferences,
        ...(profile?.feedbackPreferences || {})
      },
      selectionHistory: Array.isArray(profile?.selectionHistory) ? profile.selectionHistory : [],
      lastSyncedSessionTimestamp: profile?.lastSyncedSessionTimestamp || null
    };
  }

  /**
   * Create empty profile structure
   */
  static createEmptyProfile() {
    return {
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      moodPreferences: {}, // { mood: { count, avgPlaytime, completionRate } }
      genrePreferences: {}, // { genre: { count, avgPlaytime, completionRate } }
      timeSlotPreferences: {}, // { timeSlot: { count, avgPlaytime } }
      playstylePatterns: {
        avgSessionLength: 0, // minutes
        preferredSessionLengths: {}, // { '0-30': count, '30-60': count, '60-120': count, '120+': count }
        totalSessionsTracked: 0,
        peakPlayTimes: {} // { hour: count }
      },
      completionStats: {
        totalCompleted: 0,
        completedByMood: {}, // { mood: count }
        completedByGenre: {}, // { genre: count }
        averageCompletionTime: 0 // minutes
      },
      ratingPreferences: {
        highRatedMoods: {},
        highRatedGenres: {},
        lowRatedMoods: {},
        lowRatedGenres: {},
        likedTags: {},
        dislikedTags: {},
        wouldReplayMoods: {},
        wouldReplayGenres: {},
        ratedGameCount: 0
      },
      feedbackPreferences: {
        recommendationPromptEnabled: true,
        sessionPromptEnabled: true
      },
      selectionHistory: [], // { mood, genre, time, selectedGameId, timestamp, completed }
      lastSyncedSessionTimestamp: null
    };
  }

  /**
   * Track a mood/genre/time selection
   */
  static trackSelection(mood, genre, timeAvailable, selectedGameId = null, metadata = {}) {
    const profile = this.getProfile();
    const normalizedTimeAvailable = this.normalizeTimeAvailable(timeAvailable);
    
    // Track mood preference
    if (mood) {
      if (!profile.moodPreferences[mood]) {
        profile.moodPreferences[mood] = { count: 0, totalPlaytime: 0, completedCount: 0 };
      }
      profile.moodPreferences[mood].count += 1;
    }

    // Track genre preference
    if (genre) {
      if (!profile.genrePreferences[genre]) {
        profile.genrePreferences[genre] = { count: 0, totalPlaytime: 0, completedCount: 0 };
      }
      profile.genrePreferences[genre].count += 1;
    }

    // Track time slot preference
    const timeSlot = this.getTimeSlot(normalizedTimeAvailable);
    if (timeSlot) {
      if (!profile.timeSlotPreferences[timeSlot]) {
        profile.timeSlotPreferences[timeSlot] = { count: 0, totalPlaytime: 0 };
      }
      profile.timeSlotPreferences[timeSlot].count += 1;
    }

    // Add to selection history
    profile.selectionHistory.push({
      mood,
      genre,
      timeAvailable: normalizedTimeAvailable,
      rawTimeAvailable: timeAvailable,
      selectedGameId,
      timestamp: new Date().toISOString(),
      completed: false,
      ...metadata
    });

    // Keep only last 100 selections for performance
    if (profile.selectionHistory.length > 100) {
      profile.selectionHistory = profile.selectionHistory.slice(-100);
    }

    profile.lastUpdated = new Date().toISOString();
    this.saveProfile(profile);
    return profile;
  }

  static setFeedbackPromptEnabled(promptType, enabled) {
    const profile = this.getProfile();
    const preferenceKey = promptType === 'session' ? 'sessionPromptEnabled' : 'recommendationPromptEnabled';
    profile.feedbackPreferences = {
      ...(profile.feedbackPreferences || {}),
      [preferenceKey]: Boolean(enabled)
    };
    profile.lastUpdated = new Date().toISOString();
    this.saveProfile(profile);
    return profile.feedbackPreferences;
  }

  static getFeedbackPreferences() {
    const profile = this.getProfile();
    return {
      recommendationPromptEnabled: profile.feedbackPreferences?.recommendationPromptEnabled !== false,
      sessionPromptEnabled: profile.feedbackPreferences?.sessionPromptEnabled !== false
    };
  }

  static trackRecommendationFeedback(recommendationType, gameId, helpful, metadata = {}) {
    if (!recommendationType || !gameId || typeof helpful !== 'boolean') {
      return this.getProfile();
    }

    const profile = this.getProfile();
    const normalizedGameId = String(gameId);
    const historyMatch = [...profile.selectionHistory]
      .reverse()
      .find((entry) => {
        if (entry?.recommendationType !== recommendationType) {
          return false;
        }

        const selectedGameId = entry?.selectedGameId ? String(entry.selectedGameId) : null;
        const launchedGameId = entry?.launchedGameId ? String(entry.launchedGameId) : null;
        const recommendedGameIds = Array.isArray(entry?.recommendedGameIds)
          ? entry.recommendedGameIds.map((id) => String(id))
          : [];

        return selectedGameId === normalizedGameId
          || launchedGameId === normalizedGameId
          || recommendedGameIds.includes(normalizedGameId);
      });

    if (historyMatch) {
      historyMatch.recommendationHelpful = helpful;
      historyMatch.recommendationFeedbackAt = new Date().toISOString();
      Object.assign(historyMatch, metadata);
    }

    profile.lastUpdated = new Date().toISOString();
    this.saveProfile(profile);
    return profile;
  }

  static trackRecommendation(recommendationType, mood, genre, timeAvailable, recommendedGameIds = [], metadata = {}) {
    const normalizedRecommendedGameIds = Array.isArray(recommendedGameIds)
      ? recommendedGameIds.filter(Boolean)
      : [];

    return this.trackSelection(
      mood,
      genre,
      timeAvailable,
      null,
      {
        recommendationType,
        recommendedGameIds: normalizedRecommendedGameIds,
        ...metadata
      }
    );
  }

  static trackRecommendationLaunch(recommendationType, gameId, metadata = {}) {
    if (!gameId) {
      return this.getProfile();
    }

    const profile = this.getProfile();
    const normalizedGameId = String(gameId);

    for (let index = profile.selectionHistory.length - 1; index >= 0; index -= 1) {
      const entry = profile.selectionHistory[index];
      if (entry?.recommendationType !== recommendationType) {
        continue;
      }

      const recommendedGameIds = Array.isArray(entry?.recommendedGameIds)
        ? entry.recommendedGameIds.map((id) => String(id))
        : [];

      if (recommendedGameIds.length > 0 && !recommendedGameIds.includes(normalizedGameId)) {
        continue;
      }

      entry.selectedGameId = gameId;
      entry.launchedGameId = gameId;
      entry.launchedAt = new Date().toISOString();
      Object.assign(entry, metadata);
      profile.lastUpdated = new Date().toISOString();
      this.saveProfile(profile);
      return profile;
    }

    profile.selectionHistory.push({
      mood: metadata?.mood || null,
      genre: metadata?.genre || null,
      timeAvailable: this.normalizeTimeAvailable(metadata?.timeAvailable),
      rawTimeAvailable: metadata?.rawTimeAvailable ?? metadata?.timeAvailable ?? null,
      selectedGameId: gameId,
      timestamp: new Date().toISOString(),
      completed: false,
      recommendationType,
      recommendedGameIds: [gameId],
      launchedGameId: gameId,
      launchedAt: new Date().toISOString(),
      ...metadata,
      inferredFromLaunch: true
    });

    if (profile.selectionHistory.length > 100) {
      profile.selectionHistory = profile.selectionHistory.slice(-100);
    }

    profile.lastUpdated = new Date().toISOString();
    this.saveProfile(profile);
    return profile;
  }

  /**
   * Track game completion
   */
  static trackCompletion(gameName, mood, genre, playtimeMinutes, gameId = null) {
    const profile = this.getProfile();

    // Update mood completion
    if (mood && profile.moodPreferences[mood]) {
      profile.moodPreferences[mood].completedCount = (profile.moodPreferences[mood].completedCount || 0) + 1;
      profile.moodPreferences[mood].totalPlaytime = (profile.moodPreferences[mood].totalPlaytime || 0) + playtimeMinutes;
    }

    // Update genre completion
    if (genre && profile.genrePreferences[genre]) {
      profile.genrePreferences[genre].completedCount = (profile.genrePreferences[genre].completedCount || 0) + 1;
      profile.genrePreferences[genre].totalPlaytime = (profile.genrePreferences[genre].totalPlaytime || 0) + playtimeMinutes;
    }

    // Update completion stats
    profile.completionStats.totalCompleted += 1;
    if (mood) {
      profile.completionStats.completedByMood[mood] = (profile.completionStats.completedByMood[mood] || 0) + 1;
    }
    if (genre) {
      profile.completionStats.completedByGenre[genre] = (profile.completionStats.completedByGenre[genre] || 0) + 1;
    }

    // Update average completion time
    const totalCompleted = profile.completionStats.totalCompleted;
    profile.completionStats.averageCompletionTime = 
      (profile.completionStats.averageCompletionTime * (totalCompleted - 1) + playtimeMinutes) / totalCompleted;

    const normalizedGameId = gameId ? String(gameId) : null;
    const historyMatchesGame = (entry) => {
      const selectedGameId = entry?.selectedGameId ? String(entry.selectedGameId) : null;
      const launchedGameId = entry?.launchedGameId ? String(entry.launchedGameId) : null;
      const recommendedGameIds = Array.isArray(entry?.recommendedGameIds)
        ? entry.recommendedGameIds.map((id) => String(id))
        : [];

      if (normalizedGameId) {
        return selectedGameId === normalizedGameId
          || launchedGameId === normalizedGameId
          || recommendedGameIds.includes(normalizedGameId);
      }

      return selectedGameId === String(gameName) || launchedGameId === String(gameName);
    };

    const historyMatch = [...profile.selectionHistory]
      .reverse()
      .find((entry) => entry?.recommendationType && historyMatchesGame(entry))
      || [...profile.selectionHistory]
        .reverse()
        .find((entry) => historyMatchesGame(entry));

    if (historyMatch) {
      historyMatch.completed = true;
      historyMatch.completionTime = playtimeMinutes;
      historyMatch.completedAt = new Date().toISOString();
    }

    profile.lastUpdated = new Date().toISOString();
    this.saveProfile(profile);
    return profile;
  }

  /**
   * Track a local 0-10 rating + wouldReplay + tags to learn taste preferences
   */
  static trackRating({ gameId = null, rating = 0, wouldReplay = null, tags = [], mood = null, genres = [] } = {}) {
    const profile = this.getProfile();
    const normalizedGameId = gameId ? String(gameId) : null;
    const normalizedRating = Number(rating) || 0;

    if (!normalizedGameId || normalizedRating <= 0) {
      return profile;
    }

    const gameGenres = Array.isArray(genres) ? genres.filter(Boolean) : [];
    const normalizedMood = mood || null;

    const updateBucket = (bucket, key, weight) => {
      if (!key) return;
      bucket[key] = (bucket[key] || 0) + weight;
    };

    const normalized = normalizedRating / 10;
    if (normalized >= 0.7) {
      if (normalizedMood) updateBucket(profile.ratingPreferences.highRatedMoods, normalizedMood, normalized);
      gameGenres.forEach((genre) => updateBucket(profile.ratingPreferences.highRatedGenres, genre, normalized));
    } else if (normalized <= 0.4) {
      if (normalizedMood) updateBucket(profile.ratingPreferences.lowRatedMoods, normalizedMood, 1 - normalized);
      gameGenres.forEach((genre) => updateBucket(profile.ratingPreferences.lowRatedGenres, genre, 1 - normalized));
    }

    if (Array.isArray(tags)) {
      tags.forEach((tag) => {
        if (!tag) return;
        const weight = normalized >= 0.6 ? normalized : normalized <= 0.4 ? -(1 - normalized) : 0;
        if (weight > 0) {
          profile.ratingPreferences.likedTags[tag] = (profile.ratingPreferences.likedTags[tag] || 0) + weight;
        } else if (weight < 0) {
          profile.ratingPreferences.dislikedTags[tag] = (profile.ratingPreferences.dislikedTags[tag] || 0) + Math.abs(weight);
        }
      });
    }

    if (wouldReplay === true) {
      if (normalizedMood) updateBucket(profile.ratingPreferences.wouldReplayMoods, normalizedMood, 1);
      gameGenres.forEach((genre) => updateBucket(profile.ratingPreferences.wouldReplayGenres, genre, 1));
    }

    profile.ratingPreferences.ratedGameCount = (profile.ratingPreferences.ratedGameCount || 0) + 1;
    profile.lastUpdated = new Date().toISOString();
    this.saveProfile(profile);
    return profile;
  }

  static trackSessionFeedback(gameName, enjoyed, metadata = {}) {
    if (!gameName || typeof enjoyed !== 'boolean') {
      return this.getProfile();
    }

    const profile = this.getProfile();
    const resolvedMood = metadata?.mood || null;
    const resolvedGenre = metadata?.genre || null;
    const playtimeMinutes = Number(metadata?.playtimeMinutes) || 0;
    const normalizedGameId = metadata?.gameId ? String(metadata.gameId) : null;

    if (resolvedMood) {
      if (!profile.moodPreferences[resolvedMood]) {
        profile.moodPreferences[resolvedMood] = { count: 0, totalPlaytime: 0, completedCount: 0 };
      }
      profile.moodPreferences[resolvedMood].sessionFeedbackCount = (profile.moodPreferences[resolvedMood].sessionFeedbackCount || 0) + 1;
      profile.moodPreferences[resolvedMood].enjoyedSessionCount = (profile.moodPreferences[resolvedMood].enjoyedSessionCount || 0) + (enjoyed ? 1 : 0);
      if (playtimeMinutes > 0) {
        profile.moodPreferences[resolvedMood].totalPlaytime = (profile.moodPreferences[resolvedMood].totalPlaytime || 0) + playtimeMinutes;
      }
    }

    if (resolvedGenre) {
      if (!profile.genrePreferences[resolvedGenre]) {
        profile.genrePreferences[resolvedGenre] = { count: 0, totalPlaytime: 0, completedCount: 0 };
      }
      profile.genrePreferences[resolvedGenre].sessionFeedbackCount = (profile.genrePreferences[resolvedGenre].sessionFeedbackCount || 0) + 1;
      profile.genrePreferences[resolvedGenre].enjoyedSessionCount = (profile.genrePreferences[resolvedGenre].enjoyedSessionCount || 0) + (enjoyed ? 1 : 0);
      if (playtimeMinutes > 0) {
        profile.genrePreferences[resolvedGenre].totalPlaytime = (profile.genrePreferences[resolvedGenre].totalPlaytime || 0) + playtimeMinutes;
      }
    }

    const historyMatch = [...profile.selectionHistory]
      .reverse()
      .find((entry) => {
        const selectedGameId = entry?.selectedGameId ? String(entry.selectedGameId) : null;
        const launchedGameId = entry?.launchedGameId ? String(entry.launchedGameId) : null;
        const recommendedGameIds = Array.isArray(entry?.recommendedGameIds)
          ? entry.recommendedGameIds.map((id) => String(id))
          : [];

        if (normalizedGameId) {
          return selectedGameId === normalizedGameId
            || launchedGameId === normalizedGameId
            || recommendedGameIds.includes(normalizedGameId);
        }

        return selectedGameId === String(gameName) || launchedGameId === String(gameName);
      });

    if (historyMatch) {
      historyMatch.sessionEnjoyed = enjoyed;
      historyMatch.sessionFeedbackAt = new Date().toISOString();
      historyMatch.sessionPlaytimeMinutes = playtimeMinutes;
      Object.assign(historyMatch, metadata);
    }

    // If user marked game as completed during session feedback, track completion
    if (metadata?.completed) {
      this.trackCompletion(gameName, resolvedMood, resolvedGenre, playtimeMinutes, normalizedGameId);
    }

    profile.lastUpdated = new Date().toISOString();
    this.saveProfile(profile);
    return profile;
  }

  /**
   * Track session length
   */
  static trackSessionLength(playtimeMinutes) {
    const profile = this.getProfile();
    
    // Update average session length
    const totalSessions = profile.playstylePatterns.totalSessionsTracked;
    profile.playstylePatterns.avgSessionLength = 
      (profile.playstylePatterns.avgSessionLength * totalSessions + playtimeMinutes) / (totalSessions + 1);
    
    // Categorize session length
    const lengthCategory = this.getSessionLengthCategory(playtimeMinutes);
    if (!profile.playstylePatterns.preferredSessionLengths[lengthCategory]) {
      profile.playstylePatterns.preferredSessionLengths[lengthCategory] = 0;
    }
    profile.playstylePatterns.preferredSessionLengths[lengthCategory] += 1;
    
    // Track peak play times
    const hour = new Date().getHours();
    if (!profile.playstylePatterns.peakPlayTimes[hour]) {
      profile.playstylePatterns.peakPlayTimes[hour] = 0;
    }
    profile.playstylePatterns.peakPlayTimes[hour] += 1;
    
    profile.playstylePatterns.totalSessionsTracked += 1;
    profile.lastUpdated = new Date().toISOString();
    this.saveProfile(profile);
    return profile;
  }

  /**
   * Get liked and disliked game IDs from explicit feedback
   */
  static getGameFeedbackMap() {
    const profile = this.getProfile();
    const liked = new Set();
    const disliked = new Set();
    (profile.selectionHistory || []).forEach((entry) => {
      const gameId = entry?.selectedGameId || entry?.launchedGameId;
      if (!gameId) return;
      const id = String(gameId);
      if (entry.recommendationHelpful === true || entry.sessionEnjoyed === true) {
        liked.add(id);
        disliked.delete(id);
      } else if (entry.recommendationHelpful === false || entry.sessionEnjoyed === false) {
        disliked.add(id);
        liked.delete(id);
      }
    });
    return { liked, disliked };
  }

  static getLikedGames() {
    return this.getGameFeedbackMap().liked;
  }

  static getDislikedGames() {
    return this.getGameFeedbackMap().disliked;
  }

  /**
   * Get completion rate for mood
   */
  static getMoodCompletionRate(mood) {
    const profile = this.getProfile();
    const moodData = profile.moodPreferences[mood];
    if (!moodData || moodData.count === 0) return 0;
    if (moodData.sessionFeedbackCount > 0) {
      return Math.round(((moodData.enjoyedSessionCount || 0) / moodData.sessionFeedbackCount) * 100);
    }
    return Math.round((moodData.completedCount / moodData.count) * 100);
  }

  /**
   * Get completion rate for genre
   */
  static getGenreCompletionRate(genre) {
    const profile = this.getProfile();
    const genreData = profile.genrePreferences[genre];
    if (!genreData || genreData.count === 0) return 0;
    if (genreData.sessionFeedbackCount > 0) {
      return Math.round(((genreData.enjoyedSessionCount || 0) / genreData.sessionFeedbackCount) * 100);
    }
    return Math.round((genreData.completedCount / genreData.count) * 100);
  }

  /**
   * Summarize recommendation outcomes since a given timestamp. Reads the
   * existing selectionHistory and classifies each recommendation entry as
   * "accepted" (a recommended game was launched) or "ignored" (recommendations
   * were surfaced but none launched). Used by the story engine to narrate how
   * the user engaged with their recommendations.
   *
   * @param {number|Date|string|null} since - only include entries at/after this time
   * @returns {{ accepted: Array, ignored: Array, acceptedCount: number, ignoredCount: number }}
   */
  static getRecommendationOutcomes(since = null) {
    const profile = this.getProfile();
    const history = Array.isArray(profile.selectionHistory) ? profile.selectionHistory : [];
    const sinceMs = since ? new Date(since).getTime() : null;

    const accepted = [];
    const ignored = [];

    history.forEach((entry) => {
      if (!entry?.recommendationType) return;

      const entryTimeRaw = entry?.launchedAt || entry?.timestamp;
      const entryMs = entryTimeRaw ? new Date(entryTimeRaw).getTime() : null;
      if (sinceMs !== null && (entryMs === null || entryMs < sinceMs)) {
        return;
      }

      const recommendedGameIds = Array.isArray(entry?.recommendedGameIds)
        ? entry.recommendedGameIds.filter(Boolean)
        : [];
      const launchedGameId = entry?.launchedGameId || entry?.selectedGameId || null;

      if (launchedGameId) {
        accepted.push({
          recommendationType: entry.recommendationType,
          gameId: String(launchedGameId),
          mood: entry.mood || null,
          genre: entry.genre || null,
          at: entryTimeRaw || null
        });
      } else if (recommendedGameIds.length > 0) {
        ignored.push({
          recommendationType: entry.recommendationType,
          recommendedGameIds,
          mood: entry.mood || null,
          genre: entry.genre || null,
          at: entryTimeRaw || null
        });
      }
    });

    return {
      accepted,
      ignored,
      acceptedCount: accepted.length,
      ignoredCount: ignored.length
    };
  }

  /**
   * Get top moods by selection count
   */
  static getTopMoods(limit = 3) {
    const profile = this.getProfile();
    return Object.entries(profile.moodPreferences)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, limit)
      .map(([mood, data]) => ({
        mood,
        count: data.count,
        completionRate: this.getMoodCompletionRate(mood),
        avgPlaytime: Math.round(data.totalPlaytime / data.count)
      }));
  }

  /**
   * Get top genres by selection count
   */
  static getTopGenres(limit = 3) {
    const profile = this.getProfile();
    return Object.entries(profile.genrePreferences)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, limit)
      .map(([genre, data]) => ({
        genre,
        count: data.count,
        completionRate: this.getGenreCompletionRate(genre),
        avgPlaytime: Math.round(data.totalPlaytime / data.count)
      }));
  }

  /**
   * Get a score boost (0-100) based on how much a game's mood/genres/tags align
   * with games the user has rated highly or tagged as would-replay.
   */
  static getRatingPreferenceBoost(mood = null, genres = [], tags = []) {
    const profile = this.getProfile();
    const rp = profile.ratingPreferences;
    if (!rp || rp.ratedGameCount === 0) return 0;

    let boost = 0;
    const gameGenres = Array.isArray(genres) ? genres.filter(Boolean) : [];
    const gameTags = Array.isArray(tags) ? tags.filter(Boolean) : [];

    if (mood && rp.highRatedMoods[mood]) boost += rp.highRatedMoods[mood] * 6;
    gameGenres.forEach((genre) => {
      if (rp.highRatedGenres[genre]) boost += rp.highRatedGenres[genre] * 4;
      if (rp.wouldReplayGenres[genre]) boost += rp.wouldReplayGenres[genre] * 3;
      if (rp.lowRatedGenres[genre]) boost -= rp.lowRatedGenres[genre] * 6;
    });

    gameTags.forEach((tag) => {
      if (rp.likedTags[tag]) boost += rp.likedTags[tag] * 5;
      if (rp.dislikedTags[tag]) boost -= rp.dislikedTags[tag] * 5;
    });

    if (mood && rp.lowRatedMoods[mood]) boost -= rp.lowRatedMoods[mood] * 6;

    return Math.max(0, Math.min(100, boost));
  }

  /**
   * Build a provisional genre profile from the installed library.
   * Each game counts as 1 (ownership) and is amplified by hours played, so a
   * freshly scanned library still yields a meaningful dominant genre.
   */
  static getLibraryGenreProfile() {
    let library = [];
    try {
      library = StorageService.get('library', []);
    } catch (error) {
      library = [];
    }

    if (!Array.isArray(library) || library.length === 0) {
      return {
        totalGames: 0,
        topGenres: [],
        dominantGenre: null,
        secondaryGenre: null,
        inferredMood: null,
        hasPlaytime: false
      };
    }

    const weights = {};
    const genreHours = {};
    const genreGameCounts = {};
    let hasPlaytime = false;

    library.forEach((game) => {
      if (!game) return;
      const genres = Array.isArray(game.genres) ? game.genres : [];
      if (genres.length === 0) return;

      const minutes = Number(game.time_played || 0);
      const hours = minutes / 60;
      if (minutes > 0) hasPlaytime = true;
      // Ownership = 1; playtime amplifies but is capped so a single game can't dominate.
      const weight = 1 + Math.min(hours, 50) * 0.5;

      genres.forEach((rawGenre) => {
        const genre = typeof rawGenre === 'string' ? rawGenre.trim() : '';
        if (!genre) return;
        weights[genre] = (weights[genre] || 0) + weight;
        genreHours[genre] = (genreHours[genre] || 0) + hours;
        genreGameCounts[genre] = (genreGameCounts[genre] || 0) + 1;
      });
    });

    const ranked = Object.entries(weights)
      .map(([genre, weight]) => ({
        genre,
        weight: Math.round(weight * 10) / 10,
        hours: Math.round(genreHours[genre] || 0),
        gameCount: genreGameCounts[genre] || 0
      }))
      .sort((a, b) => b.weight - a.weight);

    const dominantGenre = ranked[0]?.genre || null;
    const secondaryGenre = ranked[1]?.genre || null;

    // Top played games overall — used to anchor the identity description
    const topGames = library
      .filter((g) => Number(g?.time_played || 0) > 0)
      .sort((a, b) => Number(b.time_played || 0) - Number(a.time_played || 0))
      .slice(0, 3)
      .map((g) => ({ name: g.name || g.title || 'Unknown', hours: Math.round(Number(g.time_played || 0) / 60) }));

    return {
      totalGames: library.length,
      topGenres: ranked.slice(0, 5),
      dominantGenre,
      dominantGenreData: ranked[0] || null,
      secondaryGenre,
      secondaryGenreData: ranked[1] || null,
      inferredMood: dominantGenre ? (GENRE_MOOD_MAP[dominantGenre] || null) : null,
      hasPlaytime,
      topGames
    };
  }

  /**
   * Get preferred session lengths
   */
  static getPreferredSessionLengths() {
    const profile = this.getProfile();
    return profile.playstylePatterns.preferredSessionLengths;
  }

  /**
   * Get peak play hours
   */
  static getPeakPlayHours(limit = 3) {
    const profile = this.getProfile();
    return Object.entries(profile.playstylePatterns.peakPlayTimes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([hour, count]) => ({
        hour: parseInt(hour),
        count,
        timeOfDay: this.getTimeOfDay(parseInt(hour))
      }));
  }

  /**
   * Get preferred session bucket (0-30, 30-60, 60-120, 120+)
   */
  static getPreferredSessionBucket() {
    const profile = this.getProfile();
    const entries = Object.entries(profile.playstylePatterns.preferredSessionLengths || {});
    if (entries.length === 0) {
      return { bucket: profile.onboardingSeed?.sessionPreference || null, count: 0 };
    }
    const [bucket, count] = entries.sort((a, b) => b[1] - a[1])[0];
    return { bucket, count };
  }

  /**
   * Build a lightweight persona snapshot for UI/recommendations
   */
  static getPersonaSnapshot() {
    const profile = this.getProfile();
    const topMoods = this.getTopMoods(3);
    const topGenres = this.getTopGenres(3);
    const topMood = topMoods[0] || null;
    const topGenre = topGenres[0] || null;
    const sessionPref = this.getPreferredSessionBucket();
    const peakHour = this.getPeakPlayHours(1)[0] || null;
    const onboardingSeed = profile.onboardingSeed || null;
    const seedMood = onboardingSeed?.selectedMoods?.[0] || null;
    const seedGenre = onboardingSeed?.favoriteGenres?.[0] || null;
    const overallCompletionRate = profile.selectionHistory.length > 0
      ? Math.round((profile.completionStats.totalCompleted / profile.selectionHistory.length) * 100)
      : 0;

    // Provisional signal inferred from the installed library (cold-start support)
    const libraryProfile = this.getLibraryGenreProfile();

    const hasHistory = topMoods.length > 0 || topGenres.length > 0;
    const hasSeed = Boolean(seedMood || seedGenre);
    const hasLibrarySignal = Boolean(libraryProfile.dominantGenre);

    // Resolve effective signals with priority: live history > onboarding seed > library
    const dominantMood = topMood?.mood || seedMood || libraryProfile.inferredMood || null;
    const dominantGenre = topGenre?.genre || seedGenre || libraryProfile.dominantGenre || null;

    let source = 'empty';
    if (hasHistory) source = 'history';
    else if (hasSeed) source = 'seed';
    else if (hasLibrarySignal) source = 'library';

    let confidence = 'none';
    if (source === 'history') {
      confidence = profile.selectionHistory.length >= 8 ? 'confirmed' : 'growing';
    } else if (source === 'seed' || source === 'library') {
      confidence = 'provisional';
    }

    // Build identity, falling back to inferred mood/genre when there's no live history
    const moodsForIdentity = topMoods.length > 0
      ? topMoods
      : (dominantMood ? [{ mood: dominantMood, completionRate: 0, count: hasSeed ? 1 : 0 }] : []);
    const genresForIdentity = topGenres.length > 0
      ? topGenres
      : (dominantGenre ? [{ genre: dominantGenre, count: 0, completionRate: 0 }] : []);

    const personaIdentity = this.buildPersonaIdentity(
      moodsForIdentity,
      genresForIdentity,
      sessionPref.bucket,
      peakHour?.timeOfDay || null,
      libraryProfile
    );

    const personaTags = [];
    if (personaIdentity) {
      personaTags.push(personaIdentity.label);
    }
    if (dominantMood) {
      personaTags.push(`${dominantMood} seeker`);
    }
    if (dominantGenre) {
      personaTags.push(`${dominantGenre} specialist`);
    }
    if (sessionPref.bucket) {
      const bucketLabel = {
        quick: 'Sprint Sessions',
        medium: 'Focused Runs',
        long: 'Extended Flights',
        weekend: 'Marathon Missions',
        '0-30': 'Sprint Sessions',
        '30-60': 'Focused Runs',
        '60-120': 'Extended Flights',
        '120+': 'Marathon Missions'
      }[sessionPref.bucket] || sessionPref.bucket;
      personaTags.push(bucketLabel);
    }
    if (peakHour?.timeOfDay) {
      personaTags.push(`${peakHour.timeOfDay} Gamer`);
    }

    const sessionPatternLabel = sessionPref.bucket
      ? (SESSION_PATTERN_IDENTITIES[sessionPref.bucket]?.label || sessionPref.bucket)
      : null;
    const timeOfDayLabel = peakHour?.timeOfDay
      ? (TIME_OF_DAY_IDENTITIES[peakHour.timeOfDay]?.label || peakHour.timeOfDay)
      : null;

    return {
      dominantMood,
      dominantMoodCompletion: topMood?.completionRate || 0,
      dominantGenre,
      dominantGenreCompletion: topGenre?.completionRate || 0,
      preferredSessionBucket: sessionPref.bucket,
      sessionPatternLabel,
      timeOfDayLabel,
      avgSessionLength: Math.round(profile.playstylePatterns.avgSessionLength) || 0,
      peakPlayWindow: peakHour ? peakHour.timeOfDay : null,
      peakPlayHour: peakHour ? peakHour.hour : null,
      overallCompletionRate,
      personaTags,
      personaIdentity,
      onboardingSeed,
      // Cold-start metadata: how this persona was derived and how confident we are
      source,
      confidence,
      inferredFromLibrary: source === 'library',
      totalLibraryGames: libraryProfile.totalGames,
      libraryTopGenres: libraryProfile.topGenres
    };
  }

  static getStartupInfluenceSummary() {
    const profile = this.getProfile();
    const onboardingSeed = profile.onboardingSeed || null;

    if (!onboardingSeed) {
      return {
        active: false,
        seedWeight: 0,
        liveSignalScore: 1,
        liveSignalCount: 0,
        label: 'Inactive',
        shortLabel: 'Inactive',
        description: 'Startup tuning is not currently contributing to recommendations.'
      };
    }

    const selectionHistory = Array.isArray(profile.selectionHistory) ? profile.selectionHistory : [];
    const liveSelectionCount = selectionHistory.length;
    const launchedCount = selectionHistory.filter((entry) => entry?.launchedGameId).length;
    const feedbackCount = selectionHistory.filter((entry) => typeof entry?.recommendationHelpful === 'boolean').length;
    const completedCount = Number(profile?.completionStats?.totalCompleted || 0);
    const liveSignalCount = liveSelectionCount + launchedCount + feedbackCount + completedCount;

    const liveSignalScore = Math.min(
      1,
      (Math.min(liveSelectionCount, 12) / 12) * 0.5
      + (Math.min(launchedCount, 8) / 8) * 0.2
      + (Math.min(feedbackCount, 6) / 6) * 0.1
      + (Math.min(completedCount, 6) / 6) * 0.2
    );

    const seedWeight = Math.max(0.08, Number((1 - liveSignalScore).toFixed(2)));

    if (seedWeight >= 0.67) {
      return {
        active: true,
        seedWeight,
        liveSignalScore,
        liveSignalCount,
        label: 'Startup tuning: strong',
        shortLabel: 'Strong',
        description: 'Your onboarding profile is still doing most of the recommendation steering while GamePilot learns from live play.'
      };
    }

    if (seedWeight >= 0.34) {
      return {
        active: true,
        seedWeight,
        liveSignalScore,
        liveSignalCount,
        label: 'Startup tuning: blending with live behavior',
        shortLabel: 'Blending',
        description: 'Your onboarding profile still contributes, but real play history is now sharing the wheel.'
      };
    }

    return {
      active: true,
      seedWeight,
      liveSignalScore,
      liveSignalCount,
      label: 'Startup tuning: mostly replaced by real play history',
      shortLabel: 'Mostly replaced',
      description: 'Your onboarding seed is now a light fallback because GamePilot has enough live behavior data to lead recommendations.'
    };
  }

  /**
   * Build persona identity metadata from actual play data and library composition.
   * When there is enough real playtime, the label is grounded in the dominant genre,
   * its game count, and total hours rather than a fixed mood archetype.
   */
  static buildPersonaIdentity(topMoods = [], topGenres = [], sessionBucket = null, peakTimeOfDay = null, libraryProfile = null) {
    const hasLibrary = libraryProfile && libraryProfile.totalGames > 0;
    const dominantGenreData = libraryProfile?.dominantGenreData || null;
    const hasPlaytime = libraryProfile?.hasPlaytime && dominantGenreData && dominantGenreData.hours > 0;
    const primary = topMoods[0];
    const secondary = topMoods[1];
    const primaryGenre = topGenres[0];

    let label;
    let description;
    let anchors = [];

    if (hasPlaytime) {
      // Grounded identity: "Strategy Main · 12 games · 240h"
      const genre = dominantGenreData.genre;
      const genreMeta = GENRE_PERSONA_IDENTITIES[genre] || { label: `${genre} Specialist` };
      label = `${genre} Main`;
      anchors.push(genre);
      if (primary) anchors.push(primary.mood);
      if (secondary) anchors.push(secondary.mood);

      const topGames = libraryProfile.topGames || [];
      const topGamesText = topGames.length > 0
        ? `Top games: ${topGames.map((g) => `${g.name} (${g.hours}h)`).join(', ')}.`
        : '';
      const secondaryText = libraryProfile?.secondaryGenre
        ? ` Also dips into ${libraryProfile.secondaryGenre}.`
        : '';

      description = `${genreMeta.label} — ${dominantGenreData.gameCount} ${genre} games, ${dominantGenreData.hours}h played.${secondaryText} ${topGamesText}`.trim();
    } else if (Array.isArray(topMoods) && topMoods.length > 0) {
      // Fallback to the original mood-driven identity when no real playtime exists
      const moodMeta = MOOD_PERSONA_IDENTITIES[primary.mood] || {
        label: `${primary.mood} Specialist`,
        description: `Primarily drawn to ${primary.mood.toLowerCase()} sessions.`
      };
      label = moodMeta.label;
      description = moodMeta.description;
      anchors = [primary.mood, secondary?.mood].filter(Boolean);

      if (primaryGenre) {
        const genreMeta = GENRE_PERSONA_IDENTITIES[primaryGenre.genre] || {
          label: `${primaryGenre.genre} Specialist`,
          description: `Frequently plays ${primaryGenre.genre.toLowerCase()} titles.`
        };
        // Use a clean genre-driven label instead of the bland mood · genre combo.
        label = genreMeta.label;
        description = `${moodMeta.description} Also ${genreMeta.description.toLowerCase()}`;
        anchors.push(primaryGenre.genre);
      }
    } else if (hasLibrary && libraryProfile.dominantGenre) {
      // Cold-start identity from library alone
      const genre = libraryProfile.dominantGenre;
      const genreMeta = GENRE_PERSONA_IDENTITIES[genre] || { label: `${genre} Specialist` };
      label = `${genre} Library`;
      description = `${genreMeta.label} — ${libraryProfile.totalGames} games in library, strongest in ${genre}.`;
      anchors.push(genre);
    } else {
      return null;
    }

    // Blend session pattern into description
    if (sessionBucket) {
      const sessionMeta = SESSION_PATTERN_IDENTITIES[sessionBucket] || null;
      if (sessionMeta) {
        description += ` Tends toward ${sessionMeta.label.toLowerCase()} sessions.`;
      }
    }

    if (peakTimeOfDay) {
      const timeMeta = TIME_OF_DAY_IDENTITIES[peakTimeOfDay] || null;
      if (timeMeta) {
        description += ` Often a ${timeMeta.label.toLowerCase()} (${peakTimeOfDay.toLowerCase()}).`;
      }
    }

    return {
      label,
      description,
      anchors,
      sessionPattern: sessionBucket,
      peakTimeOfDay,
      completionSignal: primary?.completionRate || 0,
      selectionWeight: primary?.count || 0
    };
  }

  /**
   * Calculate how well a game selection aligns with the player's persona traits (0-100)
   */
  static getPersonaAlignmentScore({ mood = null, genres = [], sessionMinutes = null }) {
    let score = 0;
    let factors = 0;

    if (mood) {
      score += this.getMoodCompletionRate(mood);
      factors += 1;
    }

    if (Array.isArray(genres) && genres.length > 0) {
      const genreRates = genres
        .map((genre) => this.getGenreCompletionRate(genre))
        .filter((rate) => rate > 0);
      if (genreRates.length > 0) {
        score += genreRates.reduce((acc, val) => acc + val, 0) / genreRates.length;
        factors += 1;
      }
    }

    if (sessionMinutes) {
      const profile = this.getProfile();
      const avgSession = profile.playstylePatterns.avgSessionLength;
      if (avgSession > 0) {
        const diff = Math.abs(avgSession - sessionMinutes);
        const sessionScore = Math.max(0, 100 - diff);
        score += sessionScore;
        factors += 1;
      }
    }

    if (factors === 0) {
      return 0;
    }

    return Math.round(score / factors);
  }

  /**
   * Get recommendation reasoning based on behavior
   */
  static getRecommendationReasoning(game, mood, genre) {
    const profile = this.getProfile();
    const reasons = [];
    const gameName = game?.name || 'this game';
    const estimatedSession = PersonaPerformanceInsights.estimateSessionMinutes(game);
    const avgSession = Math.round(profile.playstylePatterns.avgSessionLength || 0);

    // Check mood match — tie it to the specific game so it doesn't read identically for every title.
    if (mood) {
      const moodRate = this.getMoodCompletionRate(mood);
      if (moodRate > 70) {
        reasons.push(`You finish ${moodRate}% of your ${mood} games — ${gameName} sits in that lane`);
      } else if (moodRate > 50) {
        reasons.push(`${mood} is a comfortable lane for you, and ${gameName} fits there`);
      }
    }

    // Check genre match — reference the actual game name.
    if (genre) {
      const genreRate = this.getGenreCompletionRate(genre);
      if (genreRate > 70) {
        reasons.push(`You finish ${genreRate}% of your ${genre} games — ${gameName} carries that DNA`);
      } else if (genreRate > 50) {
        reasons.push(`${genre} tends to land well for you, and ${gameName} is in that space`);
      }
    }

    // Session-length comparison specific to this game instead of a global average stat.
    if (avgSession > 0 && estimatedSession > 0) {
      const diff = Math.abs(estimatedSession - avgSession);
      if (diff <= 15) {
        reasons.push(`${gameName}'s estimated ${estimatedSession} min session lines up with your ${avgSession} min average`);
      } else if (estimatedSession < avgSession) {
        reasons.push(`${gameName} is estimated at ${estimatedSession} min — a quick hit against your ${avgSession} min average`);
      } else {
        reasons.push(`${gameName} is estimated at ${estimatedSession} min — longer than your ${avgSession} min average, good when you have time`);
      }
    }

    return reasons.length > 0 ? reasons : [`${gameName} matched your current filters and library signals`];
  }

  /**
   * Helper: Get time slot from minutes
   */
  static normalizeTimeAvailable(timeAvailable) {
    if (typeof timeAvailable === 'number' && Number.isFinite(timeAvailable) && timeAvailable > 0) {
      return Math.round(timeAvailable);
    }

    if (typeof timeAvailable === 'string') {
      const presetMinutes = TIME_FILTER_MINUTES[timeAvailable];
      if (presetMinutes) {
        return presetMinutes;
      }

      const parsed = Number(timeAvailable);
      if (Number.isFinite(parsed) && parsed > 0) {
        return Math.round(parsed);
      }
    }

    return null;
  }

  static getTimeSlot(minutes) {
    if (!minutes) return null;
    if (minutes <= 30) return '0-30min';
    if (minutes <= 60) return '30-60min';
    if (minutes <= 120) return '1-2hours';
    return '2+hours';
  }

  /**
   * Helper: Get session length category
   */
  static getSessionLengthCategory(minutes) {
    if (minutes <= 30) return '0-30';
    if (minutes <= 60) return '30-60';
    if (minutes <= 120) return '60-120';
    return '120+';
  }

  /**
   * Helper: Get time of day description
   */
  static getTimeOfDay(hour) {
    if (hour < 5) return 'Late Night';
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    if (hour < 21) return 'Evening';
    return 'Night';
  }

  /**
   * Track a passive play session (any game launch/end, not just recommendation picks).
   * This is the primary learning signal — every session teaches the behavior profile
   * about mood/genre preferences, session length patterns, and peak play times.
   */
  static trackPassiveSession(gameName, playtimeMinutes, { mood = null, genres = [], gameId = null } = {}) {
    if (!playtimeMinutes || playtimeMinutes < 1) {
      return this.getProfile();
    }

    const profile = this.getProfile();

    // 1. Track session length patterns (avgSessionLength, preferred buckets, peak hours)
    const totalSessions = profile.playstylePatterns.totalSessionsTracked;
    profile.playstylePatterns.avgSessionLength =
      (profile.playstylePatterns.avgSessionLength * totalSessions + playtimeMinutes) / (totalSessions + 1);

    const lengthCategory = this.getSessionLengthCategory(playtimeMinutes);
    if (!profile.playstylePatterns.preferredSessionLengths[lengthCategory]) {
      profile.playstylePatterns.preferredSessionLengths[lengthCategory] = 0;
    }
    profile.playstylePatterns.preferredSessionLengths[lengthCategory] += 1;

    const hour = new Date().getHours();
    if (!profile.playstylePatterns.peakPlayTimes[hour]) {
      profile.playstylePatterns.peakPlayTimes[hour] = 0;
    }
    profile.playstylePatterns.peakPlayTimes[hour] += 1;

    profile.playstylePatterns.totalSessionsTracked += 1;

    // 2. Track mood preference from this session
    if (mood) {
      if (!profile.moodPreferences[mood]) {
        profile.moodPreferences[mood] = { count: 0, totalPlaytime: 0, completedCount: 0 };
      }
      profile.moodPreferences[mood].count += 1;
      profile.moodPreferences[mood].totalPlaytime = (profile.moodPreferences[mood].totalPlaytime || 0) + playtimeMinutes;
    }

    // 3. Track genre preferences from this session
    const validGenres = Array.isArray(genres) ? genres.filter(Boolean) : [];
    validGenres.forEach((genre) => {
      if (!profile.genrePreferences[genre]) {
        profile.genrePreferences[genre] = { count: 0, totalPlaytime: 0, completedCount: 0 };
      }
      profile.genrePreferences[genre].count += 1;
      profile.genrePreferences[genre].totalPlaytime = (profile.genrePreferences[genre].totalPlaytime || 0) + playtimeMinutes;
    });

    // 4. Track time slot preference
    const timeSlot = this.getTimeSlot(playtimeMinutes);
    if (timeSlot) {
      if (!profile.timeSlotPreferences[timeSlot]) {
        profile.timeSlotPreferences[timeSlot] = { count: 0, totalPlaytime: 0 };
      }
      profile.timeSlotPreferences[timeSlot].count += 1;
      profile.timeSlotPreferences[timeSlot].totalPlaytime = (profile.timeSlotPreferences[timeSlot].totalPlaytime || 0) + playtimeMinutes;
    }

    profile.lastUpdated = new Date().toISOString();
    profile.lastSyncedSessionTimestamp = new Date().toISOString();
    this.saveProfile(profile);
    return profile;
  }

  /**
   * Save profile to localStorage
   */
  static saveProfile(profile) {
    try {
      StorageService.setString(this.STORAGE_KEY, JSON.stringify(profile));
    } catch (e) {
      console.error('Failed to save behavior profile:', e);
    }
  }

  /**
   * Clear profile (for testing or reset)
   */
  static clearProfile() {
    StorageService.remove(this.STORAGE_KEY);
  }

  /**
   * Get profile summary for display
   */
  static getProfileSummary() {
    const profile = this.getProfile();
    return {
      totalSelectionsTracked: profile.selectionHistory.length,
      totalCompleted: profile.completionStats.totalCompleted,
      overallCompletionRate: profile.completionStats.totalCompleted > 0 
        ? Math.round((profile.completionStats.totalCompleted / profile.selectionHistory.length) * 100)
        : 0,
      topMoods: this.getTopMoods(3),
      topGenres: this.getTopGenres(3),
      avgSessionLength: Math.round(profile.playstylePatterns.avgSessionLength),
      peakPlayHours: this.getPeakPlayHours(3),
      createdAt: profile.createdAt,
      lastUpdated: profile.lastUpdated
    };
  }
}
