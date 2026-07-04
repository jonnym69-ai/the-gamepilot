// RecommendationEngine.js - Provides game recommendations based on mood, genre, and time
import { GenreMoodMapper } from './GenreMoodMapper';
import { StartupPersonalizationService } from './StartupPersonalizationService';
import { UserBehaviorProfile } from './UserBehaviorProfile';
import { PersonaPerformanceInsights } from './PersonaPerformanceInsights';
import { RecommendationExplainer } from './RecommendationExplainer';
import { getActiveRecommendationWeights, getFamiliarityBias } from './RecommendationWeights';
import { mapGameGenresToValid, getMoodScoresForGame } from '../constants/GenresMoods';
import { GamingIdentity } from '../GamingIdentity';
import { RecommendationTuningService } from './RecommendationTuningService';
import { GameRatingService } from './GameRatingService';
import StorageService from './StorageService';

const PERFECT_PLAY_TIME_FILTERS = Object.freeze({
  quick: {
    availableMinutes: 30,
    targetGenres: ['Puzzle', 'Indie', 'Platformer', 'Roguelike']
  },
  medium: {
    availableMinutes: 120,
    targetGenres: ['Adventure', 'Shooter', 'Fighting', 'Sports', 'Racing']
  },
  long: {
    availableMinutes: 240,
    targetGenres: ['RPG', 'Strategy', 'Management', 'Survival', 'Simulation', 'Horror']
  },
  weekend: {
    availableMinutes: 480,
    targetGenres: ['RPG', 'Strategy', 'Management', 'Survival', 'Adventure', 'Horror']
  }
});

const DEFAULT_RECENTLY_RECOMMENDED_TTL_MS = 60 * 60 * 1000;

const REDISCOVER_MESSAGES = Object.freeze([
  "Haven't played these in a while!",
  "Don't forget about these games!",
  "Time to revisit these classics!",
  "These need some love again!",
  "Remember these gems?"
]);

const getLastPlayedTimestamp = (lastPlayedValue) => {
  if (typeof lastPlayedValue === 'number' && Number.isFinite(lastPlayedValue)) {
    return lastPlayedValue;
  }

  if (typeof lastPlayedValue === 'string') {
    const parsedTimestamp = Date.parse(lastPlayedValue);
    return Number.isNaN(parsedTimestamp) ? 0 : parsedTimestamp;
  }

  return 0;
};

export class RecommendationEngine {
  /**
   * Score a game based on user behavior profile
   * Higher score = better recommendation
   */
  static scoreGameByBehavior(game, mood, genre, timeAvailable = null) {
    const w = getActiveRecommendationWeights();
    let score = w.base;

    const estimatedSessionMinutes = PersonaPerformanceInsights.estimateSessionMinutes(game);
    const profile = UserBehaviorProfile.getProfile();
    const startupSeed = StartupPersonalizationService.getSeededRecommendationContext();
    const startupInfluence = UserBehaviorProfile.getStartupInfluenceSummary();
    const normalizedGenres = mapGameGenresToValid(game?.genres);

    // Check if profile has meaningful data
    const hasProfileData = profile && (
      (profile.moodPreferences && Object.keys(profile.moodPreferences).length > 0) ||
      (profile.genrePreferences && Object.keys(profile.genrePreferences).length > 0) ||
      (profile.playstylePatterns && profile.playstylePatterns.avgSessionLength > 0)
    );

    // Mood completion rate bonus
    if (mood && hasProfileData) {
      const moodRate = UserBehaviorProfile.getMoodCompletionRate(mood);
      if (moodRate > w.moodHighRateThreshold) {
        score += w.moodHighRateBonus;
      } else if (moodRate > w.moodMediumRateThreshold) {
        score += w.moodMediumRateBonus;
      } else if (moodRate > 0) {
        score += w.moodLowRateBonus;
      }
    }

    // Genre completion rate bonus
    if (genre && hasProfileData) {
      const genreRate = UserBehaviorProfile.getGenreCompletionRate(genre);
      if (genreRate > w.genreHighRateThreshold) {
        score += w.genreHighRateBonus;
      } else if (genreRate > w.genreMediumRateThreshold) {
        score += w.genreMediumRateBonus;
      } else if (genreRate > 0) {
        score += w.genreLowRateBonus;
      }
    }

    // Session length match bonus
    if (hasProfileData) {
      const avgSession = profile.playstylePatterns.avgSessionLength;
      if (avgSession > 0 && estimatedSessionMinutes) {
        const diff = Math.abs(estimatedSessionMinutes - avgSession) / w.sessionMatchDiffDivisor;
        if (diff < 1) {
          score += w.sessionPerfectMatchBonus;
        } else if (diff < 2) {
          score += w.sessionCloseMatchBonus;
        } else if (diff < 3) {
          score += w.sessionNearMatchBonus;
        }
      }
    }

    if (startupSeed) {
      const seedMultiplier = startupInfluence?.active ? startupInfluence.seedWeight : 1;

      if (mood && Array.isArray(startupSeed.moods) && startupSeed.moods.includes(mood)) {
        const seedMoodBonus = hasProfileData ? w.seedMoodMatchWithProfile : w.seedMoodMatchWithoutProfile;
        score += Math.round(seedMoodBonus * seedMultiplier);
      }

      if (genre && Array.isArray(startupSeed.genres) && startupSeed.genres.includes(genre)) {
        const seedGenreBonus = hasProfileData ? w.seedGenreMatchWithProfile : w.seedGenreMatchWithoutProfile;
        score += Math.round(seedGenreBonus * seedMultiplier);
      }

      if (Array.isArray(startupSeed.genres) && startupSeed.genres.some((seedGenre) => normalizedGenres.includes(seedGenre))) {
        const seedOverlapBonus = hasProfileData ? w.seedGenreOverlapWithProfile : w.seedGenreOverlapWithoutProfile;
        score += Math.round(seedOverlapBonus * seedMultiplier);
      }

      const preferredMinutes = this.getAvailableMinutes(startupSeed.sessionPreference);
      if (!hasProfileData && preferredMinutes && estimatedSessionMinutes) {
        const seedDiff = Math.abs(preferredMinutes - estimatedSessionMinutes);
        if (seedDiff <= w.seedSessionCloseMaxDiffMin) {
          score += Math.round(w.seedSessionCloseBonus * seedMultiplier);
        } else if (seedDiff <= w.seedSessionNearMaxDiffMin) {
          score += Math.round(w.seedSessionNearBonus * seedMultiplier);
        }
      }
    }

    // Persona alignment bonus
    if (hasProfileData) {
      const personaAlignment = UserBehaviorProfile.getPersonaAlignmentScore({
        mood,
        genres: Array.isArray(game?.genres) ? game.genres : [],
        sessionMinutes: estimatedSessionMinutes
      });
      if (personaAlignment > 0) {
        score += Math.round(personaAlignment * w.personaAlignmentMultiplier);
      }
    }

    // Gaming Identity archetype & preference bonuses
    try {
      const identity = GamingIdentity.getProfile();
      if (identity?.identity) {
        const id = identity.identity;

        // Favorite mood match bonus
        if (mood && id.favoriteMood && mood === id.favoriteMood) {
          score += w.identityFavoriteMoodBonus || 15;
        }

        // Favorite genre match bonus
        const gameGenres = Array.isArray(game?.genres) ? game.genres : [];
        if (id.favoriteGenre && gameGenres.includes(id.favoriteGenre)) {
          score += w.identityFavoriteGenreBonus || 15;
        }

        // Playstyle session-length bonus
        if (id.playStyle && estimatedSessionMinutes) {
          const playStyle = id.playStyle;
          if (playStyle === 'Marathon' && estimatedSessionMinutes > 120) {
            score += w.identityPlaystyleMatchBonus || 10;
          } else if (playStyle === 'Quick Sessions' && estimatedSessionMinutes <= 60) {
            score += w.identityPlaystyleMatchBonus || 10;
          } else if (playStyle === 'Strategic' && estimatedSessionMinutes >= 60 && estimatedSessionMinutes <= 180) {
            score += w.identityPlaystyleMatchBonus || 10;
          } else if (playStyle === 'Explorer' && gameGenres.some((g) => ['Adventure', 'RPG', 'Survival', 'Simulation'].includes(g))) {
            score += w.identityPlaystyleMatchBonus || 10;
          } else if (playStyle === 'Balanced') {
            score += Math.round((w.identityPlaystyleMatchBonus || 10) / 2);
          }
        }

        // Archetype-genre affinity bonus
        if (id.archetype) {
          const archetypeGenreMap = {
            'RPG Connoisseur': ['RPG'],
            'Strategy Sage': ['Strategy', 'Management'],
            'Shooter Specialist': ['Shooter', 'FPS', 'Action'],
            'Adventure Seeker': ['Adventure', 'Exploration'],
            'Puzzle Master': ['Puzzle', 'Logic'],
            'Indie Explorer': ['Indie'],
            'Horror Enthusiast': ['Horror'],
            'Sports Fanatic': ['Sports', 'Racing'],
            'Sandbox Architect': ['Simulation', 'Sandbox', 'Survival'],
            'MOBA Strategist': ['MOBA', 'Strategy'],
            'Fighting Veteran': ['Fighting'],
            'MMO Devotee': ['MMO', 'RPG'],
            'Narrative Lover': ['Adventure', 'RPG', 'Visual Novel'],
            'Completionist': ['RPG', 'Adventure', 'Platformer']
          };
          const affinityGenres = archetypeGenreMap[id.archetype] || [];
          if (affinityGenres.some((ag) => gameGenres.includes(ag))) {
            score += w.identityArchetypeMatchBonus || 12;
          }
        }
      }
    } catch {
      // Identity data optional; ignore errors
    }

    // Hardware readiness removed from core scoring to keep the main bundle
    // lightweight. Compatibility checks remain available in Performance Cockpit.

    // Unplayed games bonus - encourage discovery
    if (!game.time_played || game.time_played === 0) {
      score += w.unplayedBonus;
    }

    // Recently played penalty - avoid repetition
    if (game.last_played) {
      const lastPlayedTimestamp = getLastPlayedTimestamp(game.last_played);
      const daysSincePlay = lastPlayedTimestamp > 0
        ? (Date.now() - lastPlayedTimestamp) / (1000 * 60 * 60 * 24)
        : Infinity;
      if (daysSincePlay < 7) {
        score -= w.recentlyPlayedWeekPenalty;
      } else if (daysSincePlay < 14) {
        score -= w.recentlyPlayedFortnightPenalty;
      }
    }

    // Time availability match
    if (timeAvailable && estimatedSessionMinutes) {
      if (estimatedSessionMinutes <= timeAvailable) {
        score += w.timeAvailabilityFitBonus;
      } else if (estimatedSessionMinutes <= timeAvailable * w.timeAvailabilityAlmostFitMultiplier) {
        score += w.timeAvailabilityAlmostFitBonus;
      }
    }

    // Replay Intent
    if (game.replayIntent) {
      switch (game.replayIntent) {
        case 'active':
          score += w.replayIntentActiveBonus;
          break;
        case 'soon':
          score += w.replayIntentSoonBonus;
          break;
        case 'endless':
          score += w.replayIntentEndlessBonus;
          break;
        case 'finished':
          score -= w.replayIntentFinishedPenalty;
          break;
        case 'none':
        default:
          break;
      }
    }

    // Explicit feedback from the user (thumbs up/down on specific games)
    const gameId = String(game?.appid || game?.name || '');
    if (gameId) {
      const { liked, disliked } = UserBehaviorProfile.getGameFeedbackMap();
      if (disliked.has(gameId)) {
        score -= w.dislikedGamePenalty;
      } else if (liked.has(gameId)) {
        score += w.likedGameBonus;
      }

      const rating = GameRatingService.getRating(gameId);
      if (rating && typeof rating.value === 'number' && rating.value > 0) {
        const normalized = rating.value / 10;
        if (normalized >= 0.8) {
          score += w.highRatedGameBonus || 18;
        } else if (normalized >= 0.6) {
          score += w.likedGameBonus || 12;
        } else if (normalized <= 0.3) {
          score -= w.lowRatedGamePenalty || 25;
        }
        if (rating.wouldReplay === true) {
          score += w.wouldReplayBonus || 12;
        } else if (rating.wouldReplay === false) {
          score -= w.wouldReplayPenalty || 8;
        }
      }

      const gameGenres = mapGameGenresToValid(game?.genres);
      const gameTags = Array.isArray(rating?.tags) ? rating.tags.filter(Boolean) : [];
      const ratingBoost = UserBehaviorProfile.getRatingPreferenceBoost(game?.mood || null, gameGenres, gameTags);
      score += Math.round(ratingBoost * (w.ratingPreferenceMultiplier || 0.25));
    }

    // Signature game genre overlap — games sharing genres with the player's
    // most-played/rated titles get a taste-anchored boost.
    try {
      const sigGames = GamingIdentity.getSignatureGames(3);
      if (sigGames.length > 0) {
        const sigGenres = new Set(sigGames.flatMap((s) => s.genres || []));
        const gameGenreList = Array.isArray(game?.genres) ? game.genres : [];
        const sigOverlap = gameGenreList.filter((g) => sigGenres.has(g)).length;
        if (sigOverlap > 0) {
          score += Math.min(15, sigOverlap * 6);
        }
      }
    } catch { /* signature games optional */ }

    // Familiarity bias — adjusts score based on whether the user wants
    // familiar (comfort zone) or fresh (new territory) picks.
    const familiarityBias = getFamiliarityBias();
    if (familiarityBias) {
      const classification = GamingIdentity.classifyFamiliarity(game);
      if (familiarityBias === 'familiar' && classification.label === 'familiar') {
        score += w.familiarityFamiliarBonus || 12;
      } else if (familiarityBias === 'fresh' && classification.label === 'fresh') {
        score += w.familiarityFreshBonus || 12;
      }
      // Apply a mild penalty to the opposite side so the bias actually shifts rankings
      if (familiarityBias === 'familiar' && classification.label === 'fresh') {
        score -= Math.round((w.familiarityFreshBonus || 12) * 0.5);
      } else if (familiarityBias === 'fresh' && classification.label === 'familiar') {
        score -= Math.round((w.familiarityFamiliarBonus || 12) * 0.5);
      }
    }

    return Math.max(w.scoreMin, Math.min(w.scoreMax, score));
  }

  static normalizeTimeConstraint(timeConstraint) {
    if (typeof timeConstraint === 'number' && timeConstraint > 0) {
      return {
        key: null,
        availableMinutes: timeConstraint,
        targetGenres: []
      };
    }

    if (typeof timeConstraint !== 'string' || !timeConstraint) {
      return null;
    }

    const preset = PERFECT_PLAY_TIME_FILTERS[timeConstraint];
    if (!preset) {
      return null;
    }

    return {
      key: timeConstraint,
      availableMinutes: preset.availableMinutes,
      targetGenres: Array.isArray(preset.targetGenres) ? preset.targetGenres : []
    };
  }

  static getPrimaryGenre(game, preferredGenres = []) {
    const gameGenres = Array.isArray(game?.genres)
      ? game.genres.filter((genre) => genre && genre !== 'Unknown')
      : [];

    return preferredGenres.find((genre) => gameGenres.includes(genre)) || gameGenres[0] || null;
  }

  static getAvailableMinutes(timeConstraint) {
    const normalizedTimeConstraint = this.normalizeTimeConstraint(timeConstraint);
    return normalizedTimeConstraint?.availableMinutes
      || (typeof timeConstraint === 'number' && timeConstraint > 0 ? timeConstraint : null);
  }

  static normalizeSelectionList(values = [], validator = () => true) {
    if (!Array.isArray(values)) {
      return [];
    }

    const seen = new Set();

    return values.filter((value) => {
      if (!validator(value) || seen.has(value)) {
        return false;
      }

      seen.add(value);
      return true;
    });
  }

  static normalizePerfectPlaySelections(selectedMoods = [], selectedGenres = []) {
    return {
      validMoods: this.normalizeSelectionList(selectedMoods, (mood) => GenreMoodMapper.isValidMood(mood)),
      validGenres: this.normalizeSelectionList(selectedGenres, (genre) => GenreMoodMapper.isValidGenre(genre))
    };
  }

  static dedupeGames(games = []) {
    const seen = new Set();

    return games.filter((game) => {
      if (!game) {
        return false;
      }

      const key = String(game.appid || game.name || '');
      if (!key || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }

  static getPlayedGames(library = []) {
    return Array.isArray(library)
      ? library.filter((game) => (
        Number(game?.time_played || 0) > 0
        || Number(game?.launch_count || 0) > 0
        || getLastPlayedTimestamp(game?.last_played) > 0
      ))
      : [];
  }

  static getFallbackRediscoverGames(library, count = 3) {
    const previouslyPlayedGames = this.getPlayedGames(library);
    const candidatePool = previouslyPlayedGames.length > 0 ? previouslyPlayedGames : (Array.isArray(library) ? library : []);

    return [...candidatePool]
      .sort((left, right) => {
        const leftLastPlayed = getLastPlayedTimestamp(left?.last_played);
        const rightLastPlayed = getLastPlayedTimestamp(right?.last_played);

        if (leftLastPlayed !== rightLastPlayed) {
          return leftLastPlayed - rightLastPlayed;
        }

        return Number(left?.launch_count || 0) - Number(right?.launch_count || 0);
      })
      .slice(0, count);
  }

  static buildRecommendationEntry(game, recommendationType, mood = null, genre = null, availableMinutes = null, metadata = {}) {
    if (!game) {
      return null;
    }

    const resolvedGenre = genre || this.getPrimaryGenre(game);
    const isExploration = !!game?._isExplorationPick;

    return {
      game,
      mood: mood || game?.mood || null,
      genre: resolvedGenre,
      estimatedSessionMinutes: PersonaPerformanceInsights.estimateSessionMinutes(game) || null,
      isExploration,
      explanation: RecommendationExplainer.getDetailedExplanation(
        game,
        mood,
        resolvedGenre,
        availableMinutes,
        recommendationType
      ),
      meta: { ...metadata }
    };
  }

  static buildRecommendationPayload(recommendationType, games = [], options = {}) {
    const {
      mood = null,
      genre = null,
      timeConstraint = null,
      availableMinutes = null,
      message = null,
      entryContextResolver = null,
      ...metadata
    } = options;
    const entries = this.dedupeGames(games)
      .map((game) => {
        const entryContext = typeof entryContextResolver === 'function'
          ? entryContextResolver(game) || {}
          : {};

        return this.buildRecommendationEntry(
          game,
          recommendationType,
          entryContext.mood ?? mood,
          entryContext.genre ?? genre,
          entryContext.availableMinutes ?? availableMinutes,
          entryContext.metadata || {}
        );
      })
      .filter(Boolean);
    const recommendedGameIds = entries
      .map((entry) => entry?.game?.appid || entry?.game?.name)
      .filter(Boolean);

    return {
      recommendationType,
      entries,
      games: entries.map((entry) => entry.game),
      primaryEntry: entries[0] || null,
      primaryGame: entries[0]?.game || null,
      message,
      tracking: {
        recommendationType,
        mood: mood || null,
        genre: genre || null,
        timeAvailable: availableMinutes || null,
        rawTimeAvailable: timeConstraint ?? availableMinutes ?? null,
        recommendedGameIds
      },
      ...metadata
    };
  }

  static getRecentRecommendationState() {
    const now = Date.now();
    const tuning = RecommendationTuningService.getTuning();
    const fatigueWindowMs = Math.max(
      0,
      (Number(tuning.fatigueWindowHours) || 1) * 60 * 60 * 1000
    );
    const ttlMs = fatigueWindowMs > 0 ? fatigueWindowMs : DEFAULT_RECENTLY_RECOMMENDED_TTL_MS;

    if (typeof localStorage === 'undefined') {
      return { now, validRecent: [], ttlMs };
    }

    try {
      const parsed = StorageService.get('recentlyRecommended', []);
      const validRecent = Array.isArray(parsed)
        ? parsed.filter((entry) => entry?.name && now - Number(entry.timestamp || 0) < ttlMs)
        : [];
      return { now, validRecent, ttlMs };
    } catch (error) {
      return { now, validRecent: [], ttlMs };
    }
  }

  static persistRecentRecommendations(games, validRecent, now) {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      const newRecent = games.map((game) => ({
        name: game.name,
        timestamp: now
      }));
      StorageService.set('recentlyRecommended', [...validRecent, ...newRecent]);
    } catch (error) {
      console.warn('RecommendationEngine: failed to persist recent recommendations', error);
    }
  }

  static getTimeRecommendationCandidates(library, timeConstraint) {
    if (!timeConstraint) {
      return [];
    }

    const minimumScore = timeConstraint.targetGenres.length > 0 ? 30 : 15;

    return library
      .map((game) => {
        const estimatedSessionMinutes = PersonaPerformanceInsights.estimateSessionMinutes(game);
        const gameGenres = Array.isArray(game?.genres) ? game.genres : [];
        let timeScore = 0;

        if (timeConstraint.targetGenres.some((genre) => gameGenres.includes(genre))) {
          timeScore += 60;
        }

        if (estimatedSessionMinutes && timeConstraint.availableMinutes) {
          if (estimatedSessionMinutes <= timeConstraint.availableMinutes) {
            timeScore += 40;
          } else if (estimatedSessionMinutes <= timeConstraint.availableMinutes * 1.5) {
            timeScore += 20;
          } else {
            timeScore += Math.max(0, 10 - Math.round((estimatedSessionMinutes - timeConstraint.availableMinutes) / 30));
          }
        } else if (!estimatedSessionMinutes) {
          timeScore += timeConstraint.key === 'weekend' ? 20 : 10;
        }

        return {
          ...game,
          estimated_session_minutes: estimatedSessionMinutes || game?.estimated_session_minutes || null,
          timeScore
        };
      })
      .filter((game) => game.timeScore >= minimumScore)
      .sort((left, right) => right.timeScore - left.timeScore);
  }

  static pickBucketRecommendation(games, scorer, validRecent) {
    if (!Array.isArray(games) || games.length === 0) {
      return null;
    }

    const scoredGames = games
      .map((game) => {
        let score = Number(scorer(game) || 0);
        if (validRecent.some((entry) => entry.name === game.name)) {
          score -= 40;
        }
        score += (Math.random() * 10) - 5;
        return { ...game, score };
      })
      .sort((left, right) => right.score - left.score);

    const topGames = scoredGames.slice(0, 3);
    return topGames.length > 0
      ? topGames[Math.floor(Math.random() * topGames.length)]
      : null;
  }

  static finalizeRecommendations(library, recommendations, count, validRecent, mood, selectedGenre, availableMinutes) {
    const finalRecommendations = [];
    const seenGames = new Set();
    const tuning = RecommendationTuningService.getTuning();
    const diversity = Number(tuning.diversity) || 0;
    const selectedGenres = new Set();
    const selectedMoods = new Set();

    const applyDiversityPenalty = (game) => {
      if (diversity <= 0) return 0;
      const gameGenres = mapGameGenresToValid(game?.genres);
      const gameMood = game?.mood || null;
      const genreOverlap = gameGenres.filter((g) => selectedGenres.has(g)).length;
      const moodOverlap = gameMood && selectedMoods.has(gameMood) ? 1 : 0;
      return Math.round((genreOverlap * 8 + moodOverlap * 6) * diversity);
    };

    recommendations.forEach((game) => {
      if (game && !seenGames.has(game.name)) {
        finalRecommendations.push({ ...game, scorePenalty: applyDiversityPenalty(game) });
        seenGames.add(game.name);
        mapGameGenresToValid(game?.genres).forEach((g) => selectedGenres.add(g));
        if (game?.mood) selectedMoods.add(game.mood);
      }
    });

    if (finalRecommendations.length < count) {
      const fallbackGenre = selectedGenre || null;
      const remainingGames = library
        .filter((game) => !seenGames.has(game.name))
        .map((game) => {
          let score = this.scoreGameByBehavior(game, mood, fallbackGenre || this.getPrimaryGenre(game), availableMinutes);
          if (validRecent.some((entry) => entry.name === game.name)) {
            score -= 20;
          }
          score -= applyDiversityPenalty(game);
          score += Math.random() * 10;
          return { ...game, score };
        })
        .sort((left, right) => right.score - left.score);

      while (finalRecommendations.length < count && remainingGames.length > 0) {
        const next = remainingGames.shift();
        finalRecommendations.push(next);
        seenGames.add(next.name);
        mapGameGenresToValid(next?.genres).forEach((g) => selectedGenres.add(g));
        if (next?.mood) selectedMoods.add(next.mood);
      }
    }

    return finalRecommendations.slice(0, count);
  }

  /**
   * Replace the LAST slot of a multi-pick recommendation with a game from a
   * genre the user barely touches (or has never played).  This is the
   * "exploration slot" — a small, predictable surprise that breaks filter
   * bubbles without randomising the whole result set.
   *
   * Only activates when:
   *   - explorationSlotEnabled weight is truthy
   *   - the caller asked for >= explorationMinPicks results
   *   - the result list is already full enough to have a last slot
   *
   * Returns a new array (does not mutate the input).
   */
  static injectExplorationPick(finalRecommendations, library, validRecent, mood, availableMinutes, count) {
    const w = getActiveRecommendationWeights();
    const tuning = RecommendationTuningService.getTuning();
    const explorationEnabled = tuning.explorationEnabled && w.explorationSlotEnabled;
    if (!explorationEnabled || count < w.explorationMinPicks || finalRecommendations.length < w.explorationMinPicks) {
      return finalRecommendations;
    }

    // Build per-genre familiarity from library playtime
    const genreMinutes = {};
    let maxMinutes = 0;
    library.forEach((game) => {
      const minutes = Number(game?.time_played) || 0;
      if (!minutes) return;
      mapGameGenresToValid(game?.genres).forEach((genre) => {
        genreMinutes[genre] = (genreMinutes[genre] || 0) + minutes;
        if (genreMinutes[genre] > maxMinutes) maxMinutes = genreMinutes[genre];
      });
    });

    const seenNames = new Set(finalRecommendations.map((g) => g?.name).filter(Boolean));
    const recentNames = new Set(validRecent.map((e) => e?.name).filter(Boolean));

    const candidates = library
      .filter((game) => {
        if (!game || seenNames.has(game.name) || recentNames.has(game.name)) return false;
        return true;
      })
      .map((game) => {
        const genres = mapGameGenresToValid(game?.genres);
        // Use the LEAST-familiar genre on the game — a multi-genre title with
        // one rare angle (e.g. "Action + Puzzle" for a heavy-Action user)
        // should still surface as exploration on its Puzzle side.
        let novelGenre = genres[0] || null;
        let minFamiliarity = 1;
        if (maxMinutes > 0) {
          genres.forEach((g) => {
            const fam = (genreMinutes[g] || 0) / maxMinutes;
            if (fam < minFamiliarity) {
              minFamiliarity = fam;
              novelGenre = g;
            }
          });
        } else {
          minFamiliarity = 0;
        }
        const novelty = (1 - minFamiliarity) * w.explorationGenreNoveltyWeight;
        const unplayed = (!game?.time_played || game.time_played === 0) ? w.explorationUnplayedBonus : 0;
        const base = this.scoreGameByBehavior(game, mood, novelGenre, availableMinutes);
        const score = base + novelty + unplayed;
        return { game, score, novelGenre, familiarity: minFamiliarity };
      })
      .sort((left, right) => right.score - left.score);

    if (candidates.length === 0) {
      return finalRecommendations;
    }

    const result = finalRecommendations.slice();
    // Shallow-clone so we never mutate the library entry; tag with a flag
    // that buildRecommendationEntry promotes to entry.isExploration for UI.
    result[count - 1] = { ...candidates[0].game, _isExplorationPick: true };
    return result;
  }

  static getPerfectPlayRecommendations(library, mood = null, selectedGenre = null, timeConstraint = null, count = 3) {
    if (!Array.isArray(library) || library.length === 0) {
      return [];
    }

    const { now, validRecent } = this.getRecentRecommendationState();
    const normalizedTimeConstraint = this.normalizeTimeConstraint(timeConstraint);
    const availableMinutes = normalizedTimeConstraint?.availableMinutes
      || (typeof timeConstraint === 'number' && timeConstraint > 0 ? timeConstraint : null);
    const moodGenres = mood && GenreMoodMapper.isValidMood(mood)
      ? GenreMoodMapper.getGenresForMood(mood)
      : [];
    const targetGenres = selectedGenre ? [selectedGenre] : moodGenres;
    const recommendations = [];

    if (mood && GenreMoodMapper.isValidMood(mood)) {
      const moodGames = GenreMoodMapper.getGamesForMood(library, mood)
        .filter((game) => {
          if (!selectedGenre) {
            return true;
          }

          const normalizedGenres = mapGameGenresToValid(game?.genres);
          return normalizedGenres.includes(selectedGenre);
        });
      recommendations.push(this.pickBucketRecommendation(
        moodGames,
        (game) => {
          const normalizedGenres = mapGameGenresToValid(game?.genres);
          let score = this.scoreGameByBehavior(game, mood, this.getPrimaryGenre(game, selectedGenre ? [selectedGenre] : moodGenres), availableMinutes);
          if (Number(getMoodScoresForGame(game?.genres)?.[mood] || 0) > 0) {
            score += 18;
          }
          if (selectedGenre && normalizedGenres.includes(selectedGenre)) {
            score += 24;
          }
          return score;
        },
        validRecent
      ));
    }

    if (targetGenres.length > 0) {
      const genreGames = library.filter((game) => (
        mapGameGenresToValid(game?.genres).some((genre) => targetGenres.includes(genre))
      ));
      recommendations.push(this.pickBucketRecommendation(
        genreGames,
        (game) => {
          const normalizedGenres = mapGameGenresToValid(game?.genres);
          let score = this.scoreGameByBehavior(game, mood, this.getPrimaryGenre(game, targetGenres) || selectedGenre, availableMinutes);
          if (mood && Number(getMoodScoresForGame(game?.genres)?.[mood] || 0) > 0) {
            score += selectedGenre ? 24 : 16;
          }
          if (selectedGenre && normalizedGenres.includes(selectedGenre)) {
            score += 28;
          }
          return score;
        },
        validRecent
      ));
    }

    if (normalizedTimeConstraint) {
      const timeGames = this.getTimeRecommendationCandidates(library, normalizedTimeConstraint);
      recommendations.push(this.pickBucketRecommendation(
        timeGames,
        (game) => {
          let score = this.scoreGameByBehavior(
            game,
            mood,
            this.getPrimaryGenre(game, targetGenres.length > 0 ? targetGenres : normalizedTimeConstraint.targetGenres),
            normalizedTimeConstraint.availableMinutes
          );
          if (mood && game.mood === mood) {
            score += 15;
          }
          return score + Number(game.timeScore || 0);
        },
        validRecent
      ));
    }

    let finalRecommendations = this.finalizeRecommendations(
      library,
      recommendations,
      count,
      validRecent,
      mood,
      selectedGenre,
      availableMinutes
    );
    finalRecommendations = this.injectExplorationPick(
      finalRecommendations,
      library,
      validRecent,
      mood,
      availableMinutes,
      count
    );
    this.persistRecentRecommendations(finalRecommendations, validRecent, now);
    return finalRecommendations;
  }

  static getPerfectPlayResult(library, mood = null, selectedGenre = null, timeConstraint = null, count = 3) {
    const availableMinutes = this.getAvailableMinutes(timeConstraint);
    const games = this.getPerfectPlayRecommendations(library, mood, selectedGenre, timeConstraint, count);

    return this.buildRecommendationPayload('perfect-play', games, {
      mood,
      genre: selectedGenre,
      timeConstraint,
      availableMinutes
    });
  }

  static getPerfectPlaySelectionMatches(library, selectedMoods = [], selectedGenres = [], timeConstraint = null) {
    if (!Array.isArray(library) || library.length === 0) {
      return [];
    }

    const { validMoods, validGenres } = this.normalizePerfectPlaySelections(selectedMoods, selectedGenres);
    if (validMoods.length === 0 && validGenres.length === 0) {
      return [];
    }

    const availableMinutes = this.getAvailableMinutes(timeConstraint);
    const moodGenreLookup = validMoods.reduce((accumulator, mood) => {
      accumulator[mood] = GenreMoodMapper.getGenresForMood(mood);
      return accumulator;
    }, {});

    return library
      .map((game) => {
        const normalizedGenres = GenreMoodMapper.cleanGameGenres(game);
        if (normalizedGenres.length === 0) {
          return null;
        }

        const moodScores = getMoodScoresForGame(game?.genres);

        const matchedMoods = validMoods.filter((mood) => (
          Number(moodScores?.[mood] || 0) > 0 || (moodGenreLookup[mood] || []).some((genre) => normalizedGenres.includes(genre))
        ));
        const matchedGenres = validGenres.filter((genre) => normalizedGenres.includes(genre));

        if (validMoods.length > 0 && matchedMoods.length === 0) {
          return null;
        }

        if (validGenres.length > 0 && matchedGenres.length === 0) {
          return null;
        }

        const estimatedSessionMinutes = PersonaPerformanceInsights.estimateSessionMinutes(game) || null;
        if (availableMinutes && estimatedSessionMinutes && estimatedSessionMinutes > availableMinutes) {
          return null;
        }

        const preferredGenres = matchedGenres.length > 0
          ? matchedGenres
          : matchedMoods.flatMap((mood) => moodGenreLookup[mood] || []);
        const effectiveMood = matchedMoods[0] || game?.mood || null;
        const effectiveGenre = this.getPrimaryGenre(game, preferredGenres)
          || matchedGenres[0]
          || validGenres[0]
          || this.getPrimaryGenre(game);
        const behaviorScore = this.scoreGameByBehavior(game, effectiveMood, effectiveGenre, availableMinutes);
        const intersectionBonus = matchedMoods.length > 0 && matchedGenres.length > 0 ? 24 : 0;
        const matchScore = (matchedMoods.length * 14) + (matchedGenres.length * 18) + intersectionBonus;
        const exactMoodBonus = effectiveMood && game?.mood === effectiveMood ? 8 : 0;
        const timeFitBonus = availableMinutes && estimatedSessionMinutes && estimatedSessionMinutes <= availableMinutes ? 6 : 0;

        return {
          game,
          score: behaviorScore + matchScore + exactMoodBonus + timeFitBonus,
          matchedMoods,
          matchedGenres,
          effectiveMood,
          effectiveGenre,
          estimatedSessionMinutes
        };
      })
      .filter(Boolean)
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        if (right.matchedMoods.length !== left.matchedMoods.length) {
          return right.matchedMoods.length - left.matchedMoods.length;
        }

        if (right.matchedGenres.length !== left.matchedGenres.length) {
          return right.matchedGenres.length - left.matchedGenres.length;
        }

        const leftLastPlayed = getLastPlayedTimestamp(left.game?.last_played);
        const rightLastPlayed = getLastPlayedTimestamp(right.game?.last_played);
        if (leftLastPlayed !== rightLastPlayed) {
          return leftLastPlayed - rightLastPlayed;
        }

        return Number(left.game?.launch_count || 0) - Number(right.game?.launch_count || 0);
      });
  }

  static getPerfectPlaySelectionResult(library, selectedMoods = [], selectedGenres = [], timeConstraint = null, count = 10) {
    const availableMinutes = this.getAvailableMinutes(timeConstraint);
    const { validMoods, validGenres } = this.normalizePerfectPlaySelections(selectedMoods, selectedGenres);
    const rankedMatches = this.getPerfectPlaySelectionMatches(library, validMoods, validGenres, timeConstraint);
    const topMatches = rankedMatches.slice(0, count);
    const matchLookup = new Map(
      topMatches.map((entry) => [String(entry.game?.appid || entry.game?.name || ''), entry])
    );

    return this.buildRecommendationPayload('perfect-play', topMatches.map((entry) => entry.game), {
      mood: validMoods[0] || null,
      genre: validGenres[0] || null,
      timeConstraint,
      availableMinutes,
      selectedMoods: validMoods,
      selectedGenres: validGenres,
      totalMatches: rankedMatches.length,
      entryContextResolver: (game) => {
        const match = matchLookup.get(String(game?.appid || game?.name || ''));

        return {
          mood: match?.effectiveMood || validMoods[0] || game?.mood || null,
          genre: match?.effectiveGenre || this.getPrimaryGenre(game, validGenres),
          metadata: {
            score: match?.score || 0,
            matchedMoods: match?.matchedMoods || [],
            matchedGenres: match?.matchedGenres || []
          }
        };
      }
    });
  }

  static getSurpriseMeResult(library, mood = null, timeConstraint = null) {
    if (!Array.isArray(library) || library.length === 0) {
      return null;
    }

    const availableMinutes = this.getAvailableMinutes(timeConstraint);
    const effectiveMood = mood && GenreMoodMapper.isValidMood(mood)
      ? mood
      : this.getMoodWithMostGames(library);
    const recommendedGame = effectiveMood
      ? this.getSurpriseMeRecommendation(library, effectiveMood, availableMinutes)
      : null;
    const selectedGame = recommendedGame || library[Math.floor(Math.random() * library.length)] || null;

    if (!selectedGame) {
      return null;
    }

    return this.buildRecommendationPayload('surprise-me', [selectedGame], {
      mood: effectiveMood || selectedGame?.mood || null,
      genre: this.getPrimaryGenre(selectedGame),
      timeConstraint,
      availableMinutes,
      usedFallback: !recommendedGame
    });
  }

  static getRediscoverResult(library, mood = null, timeConstraint = null, count = 3) {
    if (!Array.isArray(library) || library.length === 0) {
      return null;
    }

    const availableMinutes = this.getAvailableMinutes(timeConstraint);
    const effectiveMood = mood && GenreMoodMapper.isValidMood(mood)
      ? mood
      : this.getMoodWithMostGames(library);
    const engineRediscoverGames = effectiveMood
      ? this.dedupeGames(this.getRecommendations(
        library,
        effectiveMood,
        'rediscover',
        availableMinutes,
        count
      ))
      : [];
    const rediscoverGames = engineRediscoverGames.length > 0
      ? engineRediscoverGames.slice(0, count)
      : this.getFallbackRediscoverGames(library, count);

    if (rediscoverGames.length === 0) {
      return null;
    }

    return this.buildRecommendationPayload('rediscover', rediscoverGames, {
      mood: effectiveMood || null,
      timeConstraint,
      availableMinutes,
      usedFallback: engineRediscoverGames.length === 0,
      message: effectiveMood
        ? `A few ${effectiveMood.toLowerCase()} picks from your backlog that deserve another run.`
        : REDISCOVER_MESSAGES[Math.floor(Math.random() * REDISCOVER_MESSAGES.length)]
    });
  }

  static getContinuePlayingResult(library, mood = null, timeConstraint = null, lastPlayedGame = null) {
    const availableMinutes = this.getAvailableMinutes(timeConstraint);

    if (lastPlayedGame) {
      return this.buildRecommendationPayload('continue-playing', [lastPlayedGame], {
        mood: mood || lastPlayedGame?.mood || null,
        genre: this.getPrimaryGenre(lastPlayedGame),
        timeConstraint,
        availableMinutes,
        message: 'Pick up where you left off!',
        usedFallback: false
      });
    }

    const playedGames = this.getPlayedGames(library);
    if (playedGames.length === 0) {
      return null;
    }

    const effectiveMood = mood && GenreMoodMapper.isValidMood(mood)
      ? mood
      : this.getMoodWithMostGames(playedGames);
    const recommendedGame = effectiveMood
      ? this.getContinuePlayingRecommendation(playedGames, effectiveMood, availableMinutes)
      : null;
    const selectedGame = recommendedGame
      || [...playedGames].sort((left, right) => getLastPlayedTimestamp(right?.last_played) - getLastPlayedTimestamp(left?.last_played))[0]
      || null;

    if (!selectedGame) {
      return null;
    }

    return this.buildRecommendationPayload('continue-playing', [selectedGame], {
      mood: effectiveMood || selectedGame?.mood || null,
      genre: this.getPrimaryGenre(selectedGame),
      timeConstraint,
      availableMinutes,
      message: 'Pick up where you left off!',
      usedFallback: !recommendedGame
    });
  }

  // Get Perfect Play recommendation
  static getPerfectPlayRecommendation(library, mood, availableMinutes = null) {
    if (!GenreMoodMapper.isValidMood(mood)) {
      console.warn(`Invalid mood: ${mood}`);
      return null;
    }

    return this.getPerfectPlayRecommendations(library, mood, null, availableMinutes, 1)[0] || null;
  }

  // Get Surprise Me recommendation (random from mood games)
  static getSurpriseMeRecommendation(library, mood, availableMinutes = null) {
    if (!GenreMoodMapper.isValidMood(mood)) {
      console.warn(`Invalid mood: ${mood}`);
      return null;
    }

    const games = GenreMoodMapper.getGamesForMoodAndTime(library, mood, availableMinutes);
    
    if (games.length === 0) {
      return null;
    }

    // Return random game
    return games[Math.floor(Math.random() * games.length)];
  }

  // Get Rediscover recommendation (least recently played games from mood)
  static getRediscoverRecommendation(library, mood, availableMinutes = null) {
    if (!GenreMoodMapper.isValidMood(mood)) {
      console.warn(`Invalid mood: ${mood}`);
      return null;
    }

    const games = GenreMoodMapper.getGamesForMoodAndTime(library, mood, availableMinutes)
      .filter((game) => (
        Number(game?.time_played || 0) > 0
        || Number(game?.launch_count || 0) > 0
        || getLastPlayedTimestamp(game?.last_played) > 0
      ));

    if (games.length === 0) {
      return null;
    }

    // Sort by last played (least recent first)
    const sorted = games.sort((a, b) => {
      const aLastPlayed = getLastPlayedTimestamp(a.last_played);
      const bLastPlayed = getLastPlayedTimestamp(b.last_played);
      if (aLastPlayed !== bLastPlayed) return aLastPlayed - bLastPlayed;
      return (a.launch_count || 0) - (b.launch_count || 0);
    });

    return sorted[0];
  }

  // Get Continue Playing recommendation (most recently played from mood)
  static getContinuePlayingRecommendation(library, mood, availableMinutes = null) {
    if (!GenreMoodMapper.isValidMood(mood)) {
      console.warn(`Invalid mood: ${mood}`);
      return null;
    }

    const games = GenreMoodMapper.getGamesForMoodAndTime(library, mood, availableMinutes);
    
    if (games.length === 0) {
      return null;
    }

    // Sort by last played (most recent first)
    const sorted = games.sort((a, b) => {
      const aLastPlayed = getLastPlayedTimestamp(a.last_played);
      const bLastPlayed = getLastPlayedTimestamp(b.last_played);
      return bLastPlayed - aLastPlayed; // Most recent first
    });

    return sorted[0];
  }

  // Get multiple recommendations for a feature
  static getRecommendations(library, mood, featureType, availableMinutes = null, count = 5) {
    const recommendations = [];

    switch (featureType) {
      case 'perfectPlay':
        recommendations.push(...this.getPerfectPlayRecommendations(library, mood, null, availableMinutes, count));
        break;
      case 'surpriseMe':
        // Get random games
        const surpriseGames = GenreMoodMapper.getGamesForMoodAndTime(library, mood, availableMinutes);
        for (let i = 0; i < Math.min(count, surpriseGames.length); i++) {
          const randomIndex = Math.floor(Math.random() * surpriseGames.length);
          recommendations.push(surpriseGames[randomIndex]);
        }
        break;
      case 'rediscover':
        // Get played games that haven't been played recently
        const rediscoverGames = GenreMoodMapper.getGamesForMoodAndTime(library, mood, availableMinutes)
          .filter((game) => (
            Number(game?.time_played || 0) > 0
            || Number(game?.launch_count || 0) > 0
            || getLastPlayedTimestamp(game?.last_played) > 0
          ));
        const sorted = rediscoverGames.sort((a, b) => {
          const aPlayCount = a.launch_count || 0;
          const bPlayCount = b.launch_count || 0;
          const aLastPlayed = getLastPlayedTimestamp(a.last_played);
          const bLastPlayed = getLastPlayedTimestamp(b.last_played);

          // Primary sort: least recently played first
          if (aLastPlayed !== bLastPlayed) {
            return aLastPlayed - bLastPlayed;
          }

          // Secondary sort: least played (for games played at the same time)
          return aPlayCount - bPlayCount;
        });
        recommendations.push(...sorted.slice(0, count));
        break;
      case 'continuePlaying':
        // Get most recently played games
        const continueGames = GenreMoodMapper.getGamesForMoodAndTime(library, mood, availableMinutes);
        const sortedByRecent = continueGames.sort((a, b) => {
          const aLastPlayed = getLastPlayedTimestamp(a.last_played);
          const bLastPlayed = getLastPlayedTimestamp(b.last_played);
          return bLastPlayed - aLastPlayed;
        });
        recommendations.push(...sortedByRecent.slice(0, count));
        break;
      default:
        console.warn(`Unknown feature type: ${featureType}`);
    }

    return recommendations;
  }

  // Get available moods for library
  static getAvailableMoods(library) {
    const moods = GenreMoodMapper.getAllMoods();
    
    // Filter to only moods that have games in the library
    return moods.filter(mood => {
      const games = GenreMoodMapper.getGamesForMood(library, mood);
      return games.length > 0;
    });
  }

  // Get mood with most games
  static getMoodWithMostGames(library) {
    const moods = this.getAvailableMoods(library);
    
    if (moods.length === 0) {
      return null;
    }

    let maxMood = moods[0];
    let maxCount = GenreMoodMapper.getGamesForMood(library, moods[0]).length;

    for (const mood of moods) {
      const count = GenreMoodMapper.getGamesForMood(library, mood).length;
      if (count > maxCount) {
        maxCount = count;
        maxMood = mood;
      }
    }

    return maxMood;
  }

  // Get game count for mood
  static getGameCountForMood(library, mood) {
    return GenreMoodMapper.getGamesForMood(library, mood).length;
  }

  // Validate library genres and clean invalid ones
  static validateAndCleanLibraryGenres(library) {
    return library.map(game => ({
      ...game,
      genres: GenreMoodMapper.cleanGameGenres(game)
    }));
  }

  // Get genre statistics for mood
  static getGenreStatsForMood(library, mood) {
    return GenreMoodMapper.getGenreDistributionForMood(library, mood);
  }
}
