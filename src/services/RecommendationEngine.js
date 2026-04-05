// RecommendationEngine.js - Provides game recommendations based on mood, genre, and time
import { GenreMoodMapper } from './GenreMoodMapper';
import { UserBehaviorProfile } from './UserBehaviorProfile';
import { PersonaPerformanceInsights } from './PersonaPerformanceInsights';
import { RecommendationExplainer } from './RecommendationExplainer';
import { mapGameGenresToValid, getMoodScoresForGame } from '../constants/GenresMoods';

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

const RECENTLY_RECOMMENDED_TTL_MS = 60 * 60 * 1000;

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
    let score = 50; // Base score

    const estimatedSessionMinutes = PersonaPerformanceInsights.estimateSessionMinutes(game);
    const profile = UserBehaviorProfile.getProfile();

    // Check if profile has meaningful data
    const hasProfileData = profile && (
      (profile.moodPreferences && Object.keys(profile.moodPreferences).length > 0) ||
      (profile.genrePreferences && Object.keys(profile.genrePreferences).length > 0) ||
      (profile.playstylePatterns && profile.playstylePatterns.avgSessionLength > 0)
    );

    // Mood completion rate bonus (0-30 points)
    if (mood && hasProfileData) {
      const moodRate = UserBehaviorProfile.getMoodCompletionRate(mood);
      if (moodRate > 70) {
        score += 30; // High success with this mood
      } else if (moodRate > 50) {
        score += 20;
      } else if (moodRate > 0) {
        score += 10;
      }
    }

    // Genre completion rate bonus (0-20 points)
    if (genre && hasProfileData) {
      const genreRate = UserBehaviorProfile.getGenreCompletionRate(genre);
      if (genreRate > 70) {
        score += 20; // High success with this genre
      } else if (genreRate > 50) {
        score += 12;
      } else if (genreRate > 0) {
        score += 6;
      }
    }

    // Session length match bonus (0-15 points)
    if (hasProfileData) {
      const avgSession = profile.playstylePatterns.avgSessionLength;
      if (avgSession > 0 && estimatedSessionMinutes) {
        const diff = Math.abs(estimatedSessionMinutes - avgSession) / 15;
        if (diff < 1) {
          score += 15; // Perfect session length match
        } else if (diff < 2) {
          score += 10;
        } else if (diff < 3) {
          score += 5;
        }
      }
    }

    // Persona alignment bonus (0-35 points)
    if (hasProfileData) {
      const personaAlignment = UserBehaviorProfile.getPersonaAlignmentScore({
        mood,
        genres: Array.isArray(game?.genres) ? game.genres : [],
        sessionMinutes: estimatedSessionMinutes
      });
      if (personaAlignment > 0) {
        score += Math.round(personaAlignment * 0.35);
      }
    }

    // Hardware readiness bonus/penalty (±25 points)
    const compatibility = PersonaPerformanceInsights.getCompatibility(game);
    if (compatibility) {
      score += PersonaPerformanceInsights.getHardwareScoreBonus(compatibility);
      if (!compatibility.canRun || compatibility.settingsLevel === 'cannot_run') {
        score -= 35; // Hard fail if machine cannot run it
      }
    }

    // Unplayed games bonus (0-10 points) - encourage discovery
    if (!game.time_played || game.time_played === 0) {
      score += 10;
    }

    // Recently played penalty (-15 points) - avoid repetition
    if (game.last_played) {
      const lastPlayedTimestamp = getLastPlayedTimestamp(game.last_played);
      const daysSincePlay = lastPlayedTimestamp > 0
        ? (Date.now() - lastPlayedTimestamp) / (1000 * 60 * 60 * 24)
        : Infinity;
      if (daysSincePlay < 7) {
        score -= 15; // Penalize recently played
      } else if (daysSincePlay < 14) {
        score -= 8;
      }
    }

    // Time availability match (0-10 points)
    if (timeAvailable && estimatedSessionMinutes) {
      if (estimatedSessionMinutes <= timeAvailable) {
        score += 10;
      } else if (estimatedSessionMinutes <= timeAvailable * 1.5) {
        score += 5;
      }
    }

    // Replay Intent Multiplier
    if (game.replayIntent) {
      switch (game.replayIntent) {
        case 'active':
          score += 25; // Currently playing -> highly recommend
          break;
        case 'soon':
          score += 15; // Planning to play soon
          break;
        case 'endless':
          score += 5; // Endless games are always decent fallbacks
          break;
        case 'finished':
          score -= 20; // Finished games usually aren't played again immediately
          break;
        case 'none':
        default:
          break;
      }
    }

    return Math.max(0, Math.min(100, score)); // Clamp 0-100
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

    return {
      game,
      mood: mood || game?.mood || null,
      genre: resolvedGenre,
      estimatedSessionMinutes: PersonaPerformanceInsights.estimateSessionMinutes(game) || null,
      explanation: RecommendationExplainer.getDetailedExplanation(
        game,
        mood,
        resolvedGenre,
        availableMinutes,
        recommendationType
      ),
      ...metadata
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
    if (typeof localStorage === 'undefined') {
      return { now, validRecent: [] };
    }

    try {
      const parsed = JSON.parse(localStorage.getItem('recentlyRecommended') || '[]');
      const validRecent = Array.isArray(parsed)
        ? parsed.filter((entry) => entry?.name && now - Number(entry.timestamp || 0) < RECENTLY_RECOMMENDED_TTL_MS)
        : [];
      return { now, validRecent };
    } catch (error) {
      return { now, validRecent: [] };
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
      localStorage.setItem('recentlyRecommended', JSON.stringify([...validRecent, ...newRecent]));
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

    recommendations.forEach((game) => {
      if (game && !seenGames.has(game.name)) {
        finalRecommendations.push(game);
        seenGames.add(game.name);
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
          score += Math.random() * 10;
          return { ...game, score };
        })
        .sort((left, right) => right.score - left.score);

      while (finalRecommendations.length < count && remainingGames.length > 0) {
        finalRecommendations.push(remainingGames.shift());
      }
    }

    return finalRecommendations.slice(0, count);
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

    const finalRecommendations = this.finalizeRecommendations(
      library,
      recommendations,
      count,
      validRecent,
      mood,
      selectedGenre,
      availableMinutes
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

  // Get Rediscover recommendation (least played games from mood)
  static getRediscoverRecommendation(library, mood, availableMinutes = null) {
    if (!GenreMoodMapper.isValidMood(mood)) {
      console.warn(`Invalid mood: ${mood}`);
      return null;
    }

    const games = GenreMoodMapper.getGamesForMoodAndTime(library, mood, availableMinutes);
    
    if (games.length === 0) {
      return null;
    }

    // Sort by play count (least played first)
    const sorted = games.sort((a, b) => {
      const aPlayCount = a.launch_count || 0;
      const bPlayCount = b.launch_count || 0;
      return aPlayCount - bPlayCount;
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
        // Get least played games that haven't been played recently
        const rediscoverGames = GenreMoodMapper.getGamesForMoodAndTime(library, mood, availableMinutes);
        const sorted = rediscoverGames.sort((a, b) => {
          const aPlayCount = a.launch_count || 0;
          const bPlayCount = b.launch_count || 0;
          const aLastPlayed = getLastPlayedTimestamp(a.last_played);
          const bLastPlayed = getLastPlayedTimestamp(b.last_played);
          
          // Primary sort: least played first
          if (aPlayCount !== bPlayCount) {
            return aPlayCount - bPlayCount;
          }
          
          // Secondary sort: least recently played (for games with same play count)
          return aLastPlayed - bLastPlayed;
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
