/**
 * RecommendationExplainer Service
 * Generates human-readable explanations for why games are recommended
 */

import { UserBehaviorProfile } from './UserBehaviorProfile';
import { PersonaPerformanceInsights } from './PersonaPerformanceInsights';
import { StartupPersonalizationService } from './StartupPersonalizationService';
import { GamingIdentity } from '../GamingIdentity';

export class RecommendationExplainer {
  /**
   * Generate explanation for a recommended game
   */
  static explainRecommendation(game, mood, genre, timeAvailable, recommendationType = 'perfect-play') {
    const reasons = [];
    const profile = UserBehaviorProfile.getProfile();
    const personaSnapshot = UserBehaviorProfile.getPersonaSnapshot();
    const startupSeed = StartupPersonalizationService.getSeededRecommendationContext();
    const startupInfluence = UserBehaviorProfile.getStartupInfluenceSummary();
    const compatibility = PersonaPerformanceInsights.getCompatibility(game);
    const normalizedTimeAvailable = UserBehaviorProfile.normalizeTimeAvailable(timeAvailable);

    // Get base reasoning from behavior profile
    const behaviorReasons = UserBehaviorProfile.getRecommendationReasoning(game, mood, genre);
    reasons.push(...behaviorReasons);

    // Persona identity reasoning
    const personaReason = this.getPersonaReasoning(personaSnapshot, mood, genre);
    if (personaReason) {
      reasons.push(personaReason);
    }

    // Gaming Identity reasoning
    const identityReason = this.getIdentityReasoning(game, mood, genre);
    if (identityReason) {
      reasons.push(identityReason);
    }

    const startupReason = this.getStartupSeedReasoning(game, mood, genre, startupSeed, normalizedTimeAvailable, startupInfluence);
    if (startupReason) {
      reasons.push(startupReason);
    }

    reasons.push(...this.getLocalSignalReasoning(game, recommendationType));

    // Hardware readiness reasoning
    const hardwareReason = PersonaPerformanceInsights.describeCompatibility(compatibility);
    if (hardwareReason) {
      reasons.push(hardwareReason);
    }

    // Add type-specific reasoning
    switch (recommendationType) {
      case 'perfect-play':
        reasons.push(this.getPerfectPlayReasoning(game, mood, genre, normalizedTimeAvailable, profile));
        break;
      case 'surprise-me':
        reasons.push(this.getSurpriseMeReasoning(game, profile));
        break;
      case 'rediscover':
        reasons.push(this.getRediscoverReasoning(game, profile));
        break;
      case 'continue-playing':
        reasons.push(this.getContinuePlayingReasoning(game, profile));
        break;
      case 'favorite-anchor':
        reasons.push(this.getFavoriteAnchorReasoning(game));
        break;
      default:
        break;
    }

    const uniqueReasons = [...new Set(reasons.filter(Boolean))];

    return {
      game: game.name,
      recommendationType,
      reasons: uniqueReasons,
      confidence: this.calculateConfidence(game, mood, genre, profile, compatibility, personaSnapshot),
      matchScore: this.calculateMatchScore(game, mood, genre, profile, compatibility, personaSnapshot),
      personaIdentity: personaSnapshot?.personaIdentity || null,
      startupSeed,
      startupInfluence,
      hardwareSummary: compatibility ? {
        settingsLevel: compatibility.settingsLevel,
        fps: compatibility.estimatedFPS,
        bottlenecks: compatibility.bottlenecks || []
      } : null
    };
  }

  static getPersonaReasoning(personaSnapshot, mood, genre) {
    if (!personaSnapshot || !personaSnapshot.personaIdentity) {
      return null;
    }

    const { personaIdentity } = personaSnapshot;
    const anchors = personaIdentity.anchors?.filter(Boolean) || [];
    const anchorText = anchors.length ? anchors.join(' + ') : null;
    if (anchorText && mood && anchors.includes(mood)) {
      return `${personaIdentity.label} pick — ${anchorText} moods are your comfort zone`;
    }

    if (anchorText && genre) {
      return `${personaIdentity.label} thrives when ${genre} adventures appear`;
    }

    return `${personaIdentity.label}: ${personaIdentity.description}`;
  }

  static getIdentityReasoning(game, mood, genre) {
    try {
      const identity = GamingIdentity.getProfile();
      if (!identity?.identity) return null;

      const id = identity.identity;
      const gameGenres = Array.isArray(game?.genres) ? game.genres : [];
      const reasons = [];

      if (mood && id.favoriteMood && mood === id.favoriteMood) {
        reasons.push(`Matches your signature ${id.favoriteMood} mood`);
      }

      if (genre && id.favoriteGenre && genre === id.favoriteGenre) {
        reasons.push(`Fits your ${id.favoriteGenre} specialty`);
      } else if (id.favoriteGenre && gameGenres.includes(id.favoriteGenre)) {
        reasons.push(`From your favorite genre: ${id.favoriteGenre}`);
      }

      if (id.playStyle) {
        const estimated = PersonaPerformanceInsights.estimateSessionMinutes(game);
        if (id.playStyle === 'Marathon' && estimated > 120) {
          reasons.push('Suits your marathon playstyle');
        } else if (id.playStyle === 'Quick Sessions' && estimated <= 60) {
          reasons.push('Perfect for your quick-session habit');
        } else if (id.playStyle === 'Strategic' && estimated >= 60 && estimated <= 180) {
          reasons.push('Matches your strategic session pace');
        }
      }

      if (id.archetype) {
        reasons.push(`Aligned with your ${id.archetype} identity`);
      }

      return reasons.length > 0 ? reasons[0] : null;
    } catch {
      return null;
    }
  }

  static getStartupSeedReasoning(game, mood, genre, startupSeed, timeAvailable, startupInfluence) {
    if (!startupSeed || !startupInfluence?.active) {
      return null;
    }

    const gameGenres = Array.isArray(game?.genres) ? game.genres : [];
    const startupMoods = Array.isArray(startupSeed.moods) ? startupSeed.moods : [];
    const startupGenres = Array.isArray(startupSeed.genres) ? startupSeed.genres : [];
    const estimatedSessionMinutes = PersonaPerformanceInsights.estimateSessionMinutes(game);
    const reasons = [];

    if (mood && startupMoods.includes(mood)) {
      reasons.push(`${mood} was part of your startup tuning`);
    }

    if (genre && startupGenres.includes(genre)) {
      reasons.push(`${genre} was one of your first-picked genres`);
    }

    const overlappingGenre = startupGenres.find((seedGenre) => gameGenres.includes(seedGenre));
    if (!genre && overlappingGenre) {
      reasons.push(`Matches your onboarding taste for ${overlappingGenre}`);
    }

    const seededSessionMinutes = UserBehaviorProfile.normalizeTimeAvailable(startupSeed.sessionPreference);
    if (seededSessionMinutes && estimatedSessionMinutes) {
      const diff = Math.abs(seededSessionMinutes - estimatedSessionMinutes);
      if (diff <= 30) {
        reasons.push(`Lands close to your ${this.formatDuration(seededSessionMinutes)} startup session preference`);
      }
    } else if (timeAvailable && startupSeed.sessionPreference === timeAvailable) {
      reasons.push(`Aligned with your startup session preference`);
    }

    if (startupSeed.playerVibe) {
      reasons.push(`Fits your ${startupSeed.playerVibe.toLowerCase()} profile`);
    }

    return reasons.length > 0
      ? `${startupInfluence.shortLabel} startup seed: ${reasons.slice(0, 2).join(' • ')}`
      : null;
  }

  static getLocalSignalReasoning(game, recommendationType) {
    const reasons = [];
    const playtimeMinutes = Number(game?.time_played || 0);
    const launchCount = Number(game?.launch_count || game?.launchCount || 0);
    const userRating = Number(game?.userRating || 0);
    const lastPlayedTime = game?.last_played ? new Date(game.last_played).getTime() : 0;

    if (userRating > 0) {
      reasons.push(`You rated this ${userRating}/10, so it stays close to your taste profile`);
    }

    if (playtimeMinutes > 0) {
      reasons.push(`Your local history already has ${this.formatDuration(playtimeMinutes)} logged here`);
    } else if (recommendationType === 'perfect-play' || recommendationType === 'surprise-me') {
      reasons.push('Unplayed in your local history, so it adds discovery without repeating recent sessions');
    }

    if (launchCount > 1) {
      reasons.push(`You have launched it ${launchCount} times, which makes it a proven library signal`);
    }

    if (Number.isFinite(lastPlayedTime) && lastPlayedTime > 0) {
      const daysSince = Math.max(0, Math.floor((Date.now() - lastPlayedTime) / (1000 * 60 * 60 * 24)));
      if (daysSince <= 7) {
        reasons.push('Recently active in your library, so it is easy to resume');
      } else if (daysSince >= 30) {
        reasons.push(`Last played ${daysSince} days ago, making it a strong rediscovery candidate`);
      }
    }

    return reasons.slice(0, 3);
  }

  /**
   * Get Perfect Play specific reasoning
   */
  static getPerfectPlayReasoning(game, mood, genre, timeAvailable, profile) {
    const reasons = [];
    const estimatedSessionMinutes = PersonaPerformanceInsights.estimateSessionMinutes(game);

    // Time match
    if (timeAvailable && estimatedSessionMinutes) {
      if (estimatedSessionMinutes <= timeAvailable) {
        reasons.push(`Fits within your ${this.formatDuration(timeAvailable)} time window (estimated ${this.formatDuration(estimatedSessionMinutes)})`);
      } else if (estimatedSessionMinutes <= timeAvailable * 1.5) {
        reasons.push(`Close to your ${this.formatDuration(timeAvailable)} session target (estimated ${this.formatDuration(estimatedSessionMinutes)})`);
      }
    }

    // Mood match with completion data
    if (mood) {
      const moodData = profile.moodPreferences[mood];
      if (moodData && moodData.count > 0) {
        const completionRate = Math.round((moodData.completedCount / moodData.count) * 100);
        if (completionRate > 70) {
          reasons.push(`You consistently complete ${mood} games (${completionRate}% success rate)`);
        }
      }
    }

    // Genre match with completion data
    if (genre) {
      const genreData = profile.genrePreferences[genre];
      if (genreData && genreData.count > 0) {
        const completionRate = Math.round((genreData.completedCount / genreData.count) * 100);
        if (completionRate > 60) {
          reasons.push(`Strong match with your ${genre} preferences (${completionRate}% completion)`);
        }
      }
    }

    return reasons.join(' • ');
  }

  /**
   * Get Surprise Me specific reasoning
   */
  static getSurpriseMeReasoning(game, profile) {
    const reasons = [];
    const estimatedSessionMinutes = PersonaPerformanceInsights.estimateSessionMinutes(game);

    // Check if it matches user's typical playstyle
    const avgSession = Math.round(profile.playstylePatterns.avgSessionLength);
    if (avgSession > 0 && estimatedSessionMinutes) {
      if (Math.abs(estimatedSessionMinutes - avgSession) <= 30) {
        reasons.push(`Matches your typical session length`);
      }
    }

    // Check if it's from a genre they play
    if (game.genres && game.genres.length > 0) {
      const playedGenres = Object.keys(profile.genrePreferences);
      const matchedGenre = game.genres.find(g => playedGenres.includes(g));
      if (matchedGenre) {
        reasons.push(`From a genre you enjoy (${matchedGenre})`);
      }
    }

    if (reasons.length === 0) {
      reasons.push(`Randomly selected from your library`);
    }

    return reasons.join(' • ');
  }

  /**
   * Get Rediscover specific reasoning
   */
  static getRediscoverReasoning(game, profile) {
    const reasons = [];

    // Check if they've played it before
    if (game.time_played && game.time_played > 0) {
      reasons.push(`You've spent ${Math.round(game.time_played / 60)} hours on this game`);
    }

    // Check if it's from a genre they complete
    if (game.genres && game.genres.length > 0) {
      const topGenres = UserBehaviorProfile.getTopGenres(5);
      const matchedGenre = topGenres.find(tg => game.genres.includes(tg.genre));
      if (matchedGenre) {
        reasons.push(`From your favorite genre (${matchedGenre.genre})`);
      }
    }

    if (reasons.length === 0) {
      reasons.push(`Time to revisit this gem`);
    }

    return reasons.join(' • ');
  }

  /**
   * Get Continue Playing specific reasoning
   */
  static getContinuePlayingReasoning(game, profile) {
    const reasons = [];

    if (game.time_played && game.time_played > 0) {
      reasons.push(`You've already invested ${Math.round(game.time_played / 60)} hours`);
    }

    if (!game.completed) {
      reasons.push(`Game not yet completed - pick up where you left off`);
    }

    return reasons.join(' • ');
  }

  static getFavoriteAnchorReasoning(game) {
    const rating = Number(game?.userRating || 0);
    if (rating > 0) {
      return `Kept close because your own ${rating}/10 rating is one of the clearest local taste signals`;
    }

    if (game?.time_played > 0) {
      return `Kept close because your local play history shows this is already part of your identity`;
    }

    return 'Kept close as a personal anchor pick from your library shelf';
  }

  /**
   * Calculate confidence score (0-100)
   */
  static calculateConfidence(game, mood, genre, profile, compatibility, personaSnapshot) {
    let confidence = 50; // Base confidence

    // Mood match bonus
    if (mood) {
      const moodData = profile.moodPreferences[mood];
      if (moodData && moodData.count > 5) {
        const completionRate = moodData.completedCount / moodData.count;
        confidence += completionRate * 30;
      }
    }

    // Genre match bonus
    if (genre) {
      const genreData = profile.genrePreferences[genre];
      if (genreData && genreData.count > 5) {
        const completionRate = genreData.completedCount / genreData.count;
        confidence += completionRate * 20;
      }
    }

    // Prior playtime bonus
    if (game.time_played && game.time_played > 0) {
      confidence += 10;
    }

    const personaAlignment = UserBehaviorProfile.getPersonaAlignmentScore({
      mood,
      genres: game?.genres || [],
      sessionMinutes: PersonaPerformanceInsights.estimateSessionMinutes(game)
    });
    if (personaAlignment > 0) {
      confidence += Math.min(15, personaAlignment * 0.15);
    }

    confidence += PersonaPerformanceInsights.getHardwareConfidenceBoost(compatibility);

    if (personaSnapshot?.personaIdentity && personaSnapshot.personaIdentity.completionSignal > 0) {
      confidence += Math.min(10, personaSnapshot.personaIdentity.completionSignal * 0.1);
    }

    return Math.min(confidence, 100);
  }

  /**
   * Calculate match score (0-100) based on how well game matches user profile
   */
  static calculateMatchScore(game, mood, genre, profile, compatibility, personaSnapshot) {
    let score = 0;
    let factors = 0;
    const estimatedSessionMinutes = PersonaPerformanceInsights.estimateSessionMinutes(game);

    // Mood match
    if (mood) {
      const moodData = profile.moodPreferences[mood];
      if (moodData && moodData.count > 0) {
        score += (moodData.completedCount / moodData.count) * 100;
        factors++;
      }
    }

    // Genre match
    if (genre) {
      const genreData = profile.genrePreferences[genre];
      if (genreData && genreData.count > 0) {
        score += (genreData.completedCount / genreData.count) * 100;
        factors++;
      }
    }

    // Session length match
    const avgSession = profile.playstylePatterns.avgSessionLength;
    if (avgSession > 0 && estimatedSessionMinutes) {
      const lengthMatch = Math.max(0, 100 - Math.abs(estimatedSessionMinutes - avgSession) * (100 / 180));
      score += lengthMatch;
      factors++;
    }

    const personaAlignment = UserBehaviorProfile.getPersonaAlignmentScore({
      mood,
      genres: game?.genres || [],
      sessionMinutes: PersonaPerformanceInsights.estimateSessionMinutes(game)
    });
    if (personaAlignment > 0) {
      score += personaAlignment;
      factors++;
    }

    const hardwareMatch = PersonaPerformanceInsights.getHardwareMatchContribution(compatibility);
    if (hardwareMatch) {
      score += hardwareMatch;
      factors++;
    }

    if (personaSnapshot?.personaIdentity?.anchors?.length) {
      score += 80;
      factors++;
    }

    return factors > 0 ? Math.round(score / factors) : 50;
  }

  static formatDuration(minutes) {
    if (!minutes || !Number.isFinite(minutes)) {
      return 'any time';
    }

    if (minutes < 60) {
      return `${Math.round(minutes)} min`;
    }

    const hours = minutes / 60;
    if (Number.isInteger(hours)) {
      return `${hours}h`;
    }

    return `${hours.toFixed(1)}h`;
  }

  /**
   * Get detailed explanation for display
   */
  static getDetailedExplanation(game, mood, genre, timeAvailable, recommendationType = 'perfect-play') {
    const explanation = this.explainRecommendation(game, mood, genre, timeAvailable, recommendationType);
    
    return {
      ...explanation,
      summary: `${explanation.confidence}% confident match - ${explanation.reasons[0] || 'Recommended for you'}`,
      fullExplanation: explanation.reasons.join('\n')
    };
  }
}
