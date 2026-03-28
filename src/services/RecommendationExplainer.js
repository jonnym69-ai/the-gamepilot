/**
 * RecommendationExplainer Service
 * Generates human-readable explanations for why games are recommended
 */

import { UserBehaviorProfile } from './UserBehaviorProfile';
import { PersonaPerformanceInsights } from './PersonaPerformanceInsights';

export class RecommendationExplainer {
  /**
   * Generate explanation for a recommended game
   */
  static explainRecommendation(game, mood, genre, timeAvailable, recommendationType = 'perfect-play') {
    const reasons = [];
    const profile = UserBehaviorProfile.getProfile();
    const personaSnapshot = UserBehaviorProfile.getPersonaSnapshot();
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
      default:
        break;
    }

    return {
      game: game.name,
      recommendationType,
      reasons: reasons.filter(Boolean),
      confidence: this.calculateConfidence(game, mood, genre, profile, compatibility, personaSnapshot),
      matchScore: this.calculateMatchScore(game, mood, genre, profile, compatibility, personaSnapshot),
      personaIdentity: personaSnapshot?.personaIdentity || null,
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
