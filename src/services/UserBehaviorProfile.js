/**
 * UserBehaviorProfile Service
 * Tracks and analyzes user gaming habits, preferences, and patterns
 * All data stored locally in localStorage
 */

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
  Escapist: {
    label: 'Story Diver',
    description: 'Loses hours to expansive narratives and atmospheric journeys.'
  },
  Tactical: {
    label: 'Battle Planner',
    description: 'Enjoys calculating every move and optimizing combat loadouts.'
  },
  Sporty: {
    label: 'Momentum Driver',
    description: 'Chases competitive seasons, bracket runs, and tight scorelines.'
  },
  Competitive: {
    label: 'Clutch Specialist',
    description: 'Lives for head-to-head showdowns and outplaying the meta.'
  }
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
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse behavior profile:', e);
        return this.createEmptyProfile();
      }
    }
    return this.createEmptyProfile();
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
      selectionHistory: [] // { mood, genre, time, selectedGameId, timestamp, completed }
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
   * Get completion rate for mood
   */
  static getMoodCompletionRate(mood) {
    const profile = this.getProfile();
    const moodData = profile.moodPreferences[mood];
    if (!moodData || moodData.count === 0) return 0;
    return Math.round((moodData.completedCount / moodData.count) * 100);
  }

  /**
   * Get completion rate for genre
   */
  static getGenreCompletionRate(genre) {
    const profile = this.getProfile();
    const genreData = profile.genrePreferences[genre];
    if (!genreData || genreData.count === 0) return 0;
    return Math.round((genreData.completedCount / genreData.count) * 100);
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
        completionRate: Math.round((data.completedCount / data.count) * 100),
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
        completionRate: Math.round((data.completedCount / data.count) * 100),
        avgPlaytime: Math.round(data.totalPlaytime / data.count)
      }));
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
      return { bucket: null, count: 0 };
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
    const topMood = topMoods[0] || null;
    const topGenre = this.getTopGenres(1)[0] || null;
    const sessionPref = this.getPreferredSessionBucket();
    const peakHour = this.getPeakPlayHours(1)[0] || null;
    const overallCompletionRate = profile.selectionHistory.length > 0
      ? Math.round((profile.completionStats.totalCompleted / profile.selectionHistory.length) * 100)
      : 0;
    const personaIdentity = this.buildPersonaIdentity(topMoods);

    const personaTags = [];
    if (personaIdentity) {
      personaTags.push(personaIdentity.label);
    }
    if (topMood) {
      personaTags.push(`${topMood.mood} seeker`);
    }
    if (topGenre) {
      personaTags.push(`${topGenre.genre} specialist`);
    }
    if (sessionPref.bucket) {
      const bucketLabel = {
        '0-30': 'Sprint Sessions',
        '30-60': 'Focused Runs',
        '60-120': 'Extended Flights',
        '120+': 'Marathon Missions'
      }[sessionPref.bucket] || sessionPref.bucket;
      personaTags.push(bucketLabel);
    }

    return {
      dominantMood: topMood?.mood || null,
      dominantMoodCompletion: topMood?.completionRate || 0,
      dominantGenre: topGenre?.genre || null,
      dominantGenreCompletion: topGenre?.completionRate || 0,
      preferredSessionBucket: sessionPref.bucket,
      avgSessionLength: Math.round(profile.playstylePatterns.avgSessionLength) || 0,
      peakPlayWindow: peakHour ? peakHour.timeOfDay : null,
      peakPlayHour: peakHour ? peakHour.hour : null,
      overallCompletionRate,
      personaTags,
      personaIdentity
    };
  }

  /**
   * Build persona identity metadata from the top moods
   */
  static buildPersonaIdentity(topMoods = []) {
    if (!Array.isArray(topMoods) || topMoods.length === 0) {
      return null;
    }

    const primary = topMoods[0];
    const secondary = topMoods[1];
    const identityMeta = MOOD_PERSONA_IDENTITIES[primary.mood] || {
      label: `${primary.mood} Specialist`,
      description: `Primarily drawn to ${primary.mood.toLowerCase()} sessions.`
    };

    return {
      label: identityMeta.label,
      description: identityMeta.description,
      anchors: [primary.mood, secondary?.mood].filter(Boolean),
      completionSignal: primary.completionRate,
      selectionWeight: primary.count
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

    // Check mood match
    if (mood) {
      const moodRate = this.getMoodCompletionRate(mood);
      if (moodRate > 70) {
        reasons.push(`You complete ${moodRate}% of ${mood} games - high success rate with this mood`);
      } else if (moodRate > 50) {
        reasons.push(`You have a ${moodRate}% completion rate with ${mood} games`);
      }
    }

    // Check genre match
    if (genre) {
      const genreRate = this.getGenreCompletionRate(genre);
      if (genreRate > 70) {
        reasons.push(`You complete ${genreRate}% of ${genre} games - strong preference`);
      } else if (genreRate > 50) {
        reasons.push(`You have a ${genreRate}% completion rate with ${genre} games`);
      }
    }

    // Check playtime match
    const avgSession = Math.round(profile.playstylePatterns.avgSessionLength);
    if (avgSession > 0) {
      reasons.push(`Matches your average session length of ${avgSession} minutes`);
    }

    // Check peak hours
    const peakHours = this.getPeakPlayHours(1);
    if (peakHours.length > 0) {
      reasons.push(`Recommended during your peak gaming time (${peakHours[0].timeOfDay})`);
    }

    return reasons.length > 0 ? reasons : ['Recommended based on your gaming profile'];
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
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    if (hour < 21) return 'Evening';
    return 'Night';
  }

  /**
   * Save profile to localStorage
   */
  static saveProfile(profile) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(profile));
    } catch (e) {
      console.error('Failed to save behavior profile:', e);
    }
  }

  /**
   * Clear profile (for testing or reset)
   */
  static clearProfile() {
    localStorage.removeItem(this.STORAGE_KEY);
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
