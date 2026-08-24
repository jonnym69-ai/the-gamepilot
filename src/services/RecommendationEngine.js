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
import { GamingPersonaService, PERSONA_AFFINITY_GENRES } from './GamingPersonaService';
import { PlaytimeAutoLogger } from './PlaytimeAutoLogger';
import { getBlendedPlaytimeMinutes, isGameUnplayed, NEGLIGIBLE_PLAYTIME_MINUTES } from './gameClassification';
const PERSONA_GENRE_MAP = PERSONA_AFFINITY_GENRES;

export { getBlendedPlaytimeMinutes, isGameUnplayed, NEGLIGIBLE_PLAYTIME_MINUTES };

const CURRENT_FOCUS_CACHE_TTL_MS = 60 * 1000;
let _currentFocusCache = null;
let _currentFocusCacheAt = 0;

const normalizeGameKey = (value) => String(value || '').trim().toLowerCase();

const getSessionDayKey = (session) => {
  const raw = session?.endTime || session?.timestamp || session?.startTime || session?.date;
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

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

const getShelfAgeDays = (game) => {
  const added = game?.dateAdded || game?.addedAt || game?.firstSeen;
  const ts = getLastPlayedTimestamp(added);
  if (!ts) return 0;
  return Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24));
};

export class RecommendationEngine {
  /**
   * Detect continuous/recent play focus from session history.
   * A "focus" game is one the player returned to across multiple recent days.
   * Used to keep recs fresh with current habits without discarding lifetime taste.
   */
  static getCurrentPlayFocus(options = {}) {
    const windowDays = Number(options.windowDays) > 0 ? Number(options.windowDays) : 14;
    const minDistinctDays = Number(options.minDistinctDays) > 0 ? Number(options.minDistinctDays) : 3;
    const now = Date.now();
    if (
      _currentFocusCache
      && now - _currentFocusCacheAt < CURRENT_FOCUS_CACHE_TTL_MS
      && _currentFocusCache.windowDays === windowDays
    ) {
      return _currentFocusCache.value;
    }

    const cutoff = now - windowDays * 24 * 60 * 60 * 1000;
    const byGame = new Map();

    try {
      const history = PlaytimeAutoLogger.getSessionHistory() || [];
      history.forEach((session) => {
        const tsRaw = session?.endTime || session?.timestamp || session?.startTime;
        const ts = tsRaw ? new Date(tsRaw).getTime() : 0;
        if (!ts || ts < cutoff) return;
        const name = String(session.gameName || session.name || '').trim();
        if (!name) return;
        const key = normalizeGameKey(session.gameId || name);
        const day = getSessionDayKey(session);
        const minutes = Math.max(0, Number(session.playtimeMinutes) || 0);
        const entry = byGame.get(key) || {
          key,
          name,
          gameId: session.gameId || null,
          minutes: 0,
          sessions: 0,
          days: new Set(),
          lastPlayed: 0,
          genres: Array.isArray(session.metadata?.genres) ? session.metadata.genres : []
        };
        entry.minutes += minutes;
        entry.sessions += 1;
        if (day) entry.days.add(day);
        entry.lastPlayed = Math.max(entry.lastPlayed, ts);
        if ((!entry.genres || entry.genres.length === 0) && Array.isArray(session.genres)) {
          entry.genres = session.genres;
        }
        byGame.set(key, entry);
      });
    } catch {
      // session history optional
    }

    const focusGames = Array.from(byGame.values())
      .map((entry) => ({
        ...entry,
        distinctDays: entry.days.size,
        days: undefined
      }))
      .filter((entry) => entry.distinctDays >= minDistinctDays || (entry.sessions >= 4 && entry.minutes >= 90))
      .sort((a, b) => {
        if (b.distinctDays !== a.distinctDays) return b.distinctDays - a.distinctDays;
        if (b.minutes !== a.minutes) return b.minutes - a.minutes;
        return b.lastPlayed - a.lastPlayed;
      })
      .slice(0, 5);

    const focusGenres = {};
    focusGames.forEach((game) => {
      (game.genres || []).forEach((g) => {
        const genre = String(g || '').trim();
        if (!genre) return;
        focusGenres[genre] = (focusGenres[genre] || 0) + game.minutes;
      });
    });

    const value = {
      windowDays,
      games: focusGames,
      primary: focusGames[0] || null,
      genres: Object.entries(focusGenres)
        .sort((a, b) => b[1] - a[1])
        .map(([genre]) => genre)
        .slice(0, 5),
      active: focusGames.length > 0
    };

    _currentFocusCache = { windowDays, value };
    _currentFocusCacheAt = now;
    return value;
  }

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

    // Continuous play focus — games played across multiple recent days are
    // the player's current habit, not stale noise.  Detect once per cache TTL.
    const focus = this.getCurrentPlayFocus();
    const gameKey = normalizeGameKey(game?.appid || game?.name || game?.title);
    const focusHit = focus.active
      ? focus.games.find(
          (f) =>
            normalizeGameKey(f.gameId || f.name) === gameKey ||
            normalizeGameKey(f.name) === normalizeGameKey(game?.name || game?.title)
        )
      : null;

    // Persona alignment bonus (skip if this game is already a focus hit —
    // focus boost below will outweigh it and we avoid double-counting)
    if (hasProfileData && !focusHit) {
      const personaAlignment = UserBehaviorProfile.getPersonaAlignmentScore({
        mood,
        genres: Array.isArray(game?.genres) ? game.genres : [],
        sessionMinutes: estimatedSessionMinutes,
      });
      if (personaAlignment > 0) {
        score += Math.round(personaAlignment * w.personaAlignmentMultiplier);
      }
    }

    // Focus boost — keep current rotation warm so daily/continuous play surfaces
    if (focusHit) {
      score += Math.min(22, 10 + focusHit.distinctDays * 3);
    } else if (focus.active && focus.genres.length > 0) {
      const gameGenresForFocus = Array.isArray(game?.genres)
        ? game.genres.map((g) => String(g))
        : [];
      const related = gameGenresForFocus.filter((g) =>
        focus.genres.some((fg) => fg.toLowerCase() === String(g).toLowerCase())
      );
      if (related.length > 0) {
        score += Math.min(12, related.length * 5);
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

        // Roast-persona affinity bonus (canonical map shared with Home / explainers)
        const personaId = id.gamingPersona?.primaryPersona?.id
          || (() => { try { return GamingPersonaService.getPrimaryPersona()?.id; } catch { return null; } })();
        if (personaId) {
          const affinityGenres = PERSONA_GENRE_MAP[personaId] || GamingPersonaService.getAffinityGenres(personaId);
          const normalizedGameGenres = gameGenres.map((g) => String(g).toLowerCase());
          const matchCount = affinityGenres.filter((ag) => {
            const needle = String(ag).toLowerCase();
            return normalizedGameGenres.some((g) => g === needle || g.includes(needle) || needle.includes(g));
          }).length;
          if (matchCount > 0) {
            score += Math.min(w.gamingPersonaMatchBonus || 16, matchCount * 8);
          } else if (GamingPersonaService.gameMatchesPersona(game, personaId)) {
            score += Math.round((w.gamingPersonaMatchBonus || 16) * 0.5);
          }
        }
      }
    } catch {
      // Identity data optional; ignore errors
    }

    // Hardware readiness removed from core scoring to keep the main bundle
    // lightweight. Compatibility checks remain available in Performance Cockpit.

    // Unplayed games bonus - encourage discovery (uses blended playtime)
    if (isGameUnplayed(game)) {
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
      const outcomeSignal = UserBehaviorProfile.getRecommendationOutcomeSignal(gameId, game?.name);
      score += outcomeSignal.adjustment;

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
      ? library.filter((game) => !isGameUnplayed(game))
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
    const gameId = String(game?.appid || game?.name || '');
    const outcomeSignal = UserBehaviorProfile.getRecommendationOutcomeSignal(gameId, game?.name);
    if (outcomeSignal.suppress) return null;
    const baseExplanation = RecommendationExplainer.getDetailedExplanation(
      game,
      mood,
      resolvedGenre,
      availableMinutes,
      recommendationType
    );

    return {
      game,
      mood: mood || game?.mood || null,
      genre: resolvedGenre,
      estimatedSessionMinutes: PersonaPerformanceInsights.estimateSessionMinutes(game) || null,
      isExploration,
      explanation: outcomeSignal.reason && outcomeSignal.adjustment > 0
        ? [baseExplanation, `${outcomeSignal.reason}.`].filter(Boolean).join(' ')
        : baseExplanation,
      meta: { ...metadata, learnedReason: outcomeSignal.reason }
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
      const minutes = getBlendedPlaytimeMinutes(game);
      if (!minutes) return;
      mapGameGenresToValid(game?.genres).forEach((genre) => {
        genreMinutes[genre] = (genreMinutes[genre] || 0) + minutes;
        if (genreMinutes[genre] > maxMinutes) maxMinutes = genreMinutes[genre];
      });
    });

    const seenNames = new Set(finalRecommendations.map((g) => g?.name).filter(Boolean));
    const recentNames = new Set(validRecent.map((e) => e?.name).filter(Boolean));

    const isUnrunnable = (game) => {
      if (!w.explorationRequireRunnable) return false;
      const compat = game?.compatibility || game?.hardwareCompatibility;
      if (!compat) return false;
      if (compat === 'cannot_run') return true;
      if (compat.settingsLevel === 'cannot_run') return true;
      if (compat.canRun === false) return true;
      return false;
    };

    const candidates = library
      .filter((game) => {
        if (!game || seenNames.has(game.name) || recentNames.has(game.name) || isUnrunnable(game)) return false;
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
        const unplayed = isGameUnplayed(game) ? w.explorationUnplayedBonus : 0;
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
        ? `A few ${effectiveMood.toLowerCase()} picks from your library that deserve another run.`
        : REDISCOVER_MESSAGES[Math.floor(Math.random() * REDISCOVER_MESSAGES.length)]
    });
  }

  /**
   * Identity Picks — recommendations driven primarily by the user's gaming
   * identity (favorite genre, favorite mood, archetype, and emergent taste
   * clusters) rather than an ad-hoc mood/time filter. This is the core of the
   * "identity loop": identity shapes the picks the user sees.
   *
   * @param {Array} library - the user's game library
   * @param {object} [identity] - optional pre-fetched GamingIdentity profile
   * @param {number} [count] - number of picks to return
   */
  static getIdentityPicks(library, identity = null, count = 5) {
    if (!Array.isArray(library) || library.length === 0) {
      return null;
    }

    const profile = identity || GamingIdentity.getProfile();
    const favoriteGenre = profile?.identity?.favoriteGenre && profile.identity.favoriteGenre !== 'None'
      ? profile.identity.favoriteGenre
      : null;
    const favoriteMood = profile?.identity?.favoriteMood && profile.identity.favoriteMood !== 'None'
      ? profile.identity.favoriteMood
      : null;
    const archetype = profile?.identity?.archetype || profile?.archetype?.name || null;
    const tasteClusters = Array.isArray(profile?.tasteClusters) ? profile.tasteClusters : [];

    // Build a set of game names that belong to the user's taste clusters so we
    // can boost games from those emergent taste groups.
    const clusterGameNames = new Set(
      tasteClusters.flatMap((cluster) => (Array.isArray(cluster?.gameNames) ? cluster.gameNames : []))
        .map((name) => String(name || '').toLowerCase())
    );

    const scored = library
      .map((game) => {
        if (!game) return null;

        const normalizedGenres = mapGameGenresToValid(game?.genres);
        let score = this.scoreGameByBehavior(game, favoriteMood, favoriteGenre || this.getPrimaryGenre(game), null);
        const reasons = [];

        if (favoriteGenre && normalizedGenres.includes(favoriteGenre)) {
          score += 30;
          reasons.push(`Matches your favorite genre **${favoriteGenre}**`);
        }

        if (favoriteMood && Number(getMoodScoresForGame(game?.genres)?.[favoriteMood] || 0) > 0) {
          score += 22;
          reasons.push(`Fits your **${favoriteMood}** mood`);
        }

        const gameNameLower = String(game?.name || '').toLowerCase();
        if (clusterGameNames.has(gameNameLower)) {
          score += 26;
          const owningCluster = tasteClusters.find((cluster) => (
            Array.isArray(cluster?.gameNames)
            && cluster.gameNames.some((name) => String(name || '').toLowerCase() === gameNameLower)
          ));
          if (owningCluster?.label) {
            reasons.push(`Part of your **${owningCluster.label}** taste`);
          }
        }

        return { game, score, reasons };
      })
      .filter(Boolean)
      .sort((left, right) => right.score - left.score)
      .slice(0, count);

    if (scored.length === 0) {
      return null;
    }

    const reasonByName = new Map(
      scored.map((entry) => [String(entry.game?.name || '').toLowerCase(), entry.reasons])
    );

    const identityDescriptor = archetype
      ? `your **${archetype}** identity`
      : (favoriteGenre ? `your love of **${favoriteGenre}**` : 'your gaming identity');

    return this.buildRecommendationPayload('identity-picks', scored.map((entry) => entry.game), {
      mood: favoriteMood || null,
      genre: favoriteGenre || null,
      message: `Picked for ${identityDescriptor}.`,
      entryContextResolver: (game) => {
        const identityReasons = reasonByName.get(String(game?.name || '').toLowerCase()) || [];
        return {
          metadata: {
            identityReasons,
            favoriteGenre,
            favoriteMood,
            archetype
          }
        };
      }
    });
  }

  /**
   * Wishlist Identity Picks — rank the user's wishlist by how well each item
   * matches their gaming identity (favorite genre / mood / taste clusters),
   * with a bonus for active price drops. This fuses the identity loop with the
   * wishlist so "what to buy next" is grounded in who the player actually is.
   *
   * @param {Array} wishlist - wishlist items (from WishlistService.getWishlist)
   * @param {object} [identity] - optional pre-fetched GamingIdentity profile
   * @param {number} [count] - number of picks to return
   */
  static getWishlistIdentityPicks(wishlist, identity = null, count = 3) {
    if (!Array.isArray(wishlist) || wishlist.length === 0) {
      return null;
    }

    const profile = identity || GamingIdentity.getProfile();
    const favoriteGenre = profile?.identity?.favoriteGenre && profile.identity.favoriteGenre !== 'None'
      ? profile.identity.favoriteGenre
      : null;
    const favoriteMood = profile?.identity?.favoriteMood && profile.identity.favoriteMood !== 'None'
      ? profile.identity.favoriteMood
      : null;
    const tasteClusters = Array.isArray(profile?.tasteClusters) ? profile.tasteClusters : [];
    const clusterGameNames = new Set(
      tasteClusters.flatMap((cluster) => (Array.isArray(cluster?.gameNames) ? cluster.gameNames : []))
        .map((name) => String(name || '').toLowerCase())
    );

    const scored = wishlist
      .map((item) => {
        if (!item) return null;

        const normalizedGenres = mapGameGenresToValid(item?.genres);
        let score = 0;
        const reasons = [];

        if (favoriteGenre && normalizedGenres.includes(favoriteGenre)) {
          score += 30;
          reasons.push(`Matches your favorite genre **${favoriteGenre}**`);
        }

        if (favoriteMood && Number(getMoodScoresForGame(item?.genres)?.[favoriteMood] || 0) > 0) {
          score += 20;
          reasons.push(`Fits your **${favoriteMood}** mood`);
        }

        const itemNameLower = String(item?.name || '').toLowerCase();
        if (clusterGameNames.has(itemNameLower)) {
          score += 24;
          const owningCluster = tasteClusters.find((cluster) => (
            Array.isArray(cluster?.gameNames)
            && cluster.gameNames.some((name) => String(name || '').toLowerCase() === itemNameLower)
          ));
          if (owningCluster?.label) {
            reasons.push(`Part of your **${owningCluster.label}** taste`);
          }
        }

        // Price signals — reward active drops and historical lows.
        const currentPrice = Number(item?.currentPrice?.price);
        const threshold = Number(item?.threshold);
        const historicalLow = Number(item?.historicalLow?.price);
        let priceStatus = null;
        if (Number.isFinite(currentPrice) && Number.isFinite(threshold) && currentPrice <= threshold) {
          score += 18;
          priceStatus = 'below-threshold';
          reasons.push('Now below your price threshold');
        } else if (Number.isFinite(currentPrice) && Number.isFinite(historicalLow) && currentPrice <= historicalLow) {
          score += 14;
          priceStatus = 'historical-low';
          reasons.push('At its historical low price');
        }

        return { item, score, reasons, priceStatus };
      })
      .filter(Boolean)
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, count);

    if (scored.length === 0) {
      return null;
    }

    const identityDescriptor = favoriteGenre
      ? `your love of **${favoriteGenre}**`
      : 'your gaming identity';

    return {
      recommendationType: 'wishlist-identity',
      message: `Wishlist games picked for ${identityDescriptor}.`,
      items: scored.map((entry) => ({
        ...entry.item,
        identityReasons: entry.reasons,
        identityScore: entry.score,
        priceStatus: entry.priceStatus
      }))
    };
  }

  /**
   * Backlog Buster — the core "battle the backlog" recommendation path.
   * Surfaces unplayed games from the user's library that match their taste,
   * time budget, and current play focus. This is the differentiator: nobody
   * else solves "I own 200 games and don't know what to play next."
   *
   * Scoring priorities for unplayed games:
   *   1. Taste alignment (favorite genre, mood, archetype, signature overlap)
   *   2. Time fit (can you finish it in the time you have?)
   *   3. Shelf age (older unplayed = higher priority to surface)
   *   4. Current play focus genre adjacency (keep recs fresh with habits)
   *   5. Exploration novelty (gentle nudge toward unfamiliar genres)
   *
   * @param {Array} library - the user's game library
   * @param {string|null} [mood] - optional mood filter
   * @param {string|null} [timeConstraint] - quick|medium|long|weekend or minutes
   * @param {number} [count] - number of picks (default 5)
   */
  static getBacklogBusterResult(library, mood = null, timeConstraint = null, count = 5) {
    if (!Array.isArray(library) || library.length === 0) {
      return null;
    }

    const { now, validRecent } = this.getRecentRecommendationState();
    const normalizedTimeConstraint = this.normalizeTimeConstraint(timeConstraint);
    const availableMinutes = normalizedTimeConstraint?.availableMinutes
      || (typeof timeConstraint === 'number' && timeConstraint > 0 ? timeConstraint : null);

    const unplayedGames = library.filter((game) => isGameUnplayed(game));

    if (unplayedGames.length === 0) {
      return null;
    }

    const focus = this.getCurrentPlayFocus();
    const focusGenres = focus.active ? focus.genres : [];

    let sigGenres = new Set();
    try {
      const sigGames = GamingIdentity.getSignatureGames(3);
      sigGenres = new Set(sigGames.flatMap((s) => s.genres || []));
    } catch { /* optional */ }

    let profile = null;
    let favoriteGenre = null;
    let favoriteMood = null;
    let personaId = null;
    try {
      profile = GamingIdentity.getProfile();
      favoriteGenre = profile?.identity?.favoriteGenre && profile.identity.favoriteGenre !== 'None'
        ? profile.identity.favoriteGenre : null;
      favoriteMood = profile?.identity?.favoriteMood && profile.identity.favoriteMood !== 'None'
        ? profile.identity.favoriteMood : null;
      personaId = profile?.identity?.gamingPersona?.primaryPersona?.id || null;
    } catch { /* optional */ }

    const scored = unplayedGames
      .map((game) => {
        if (!game) return null;
        const gameGenres = Array.isArray(game?.genres) ? game.genres : [];
        const normalizedGenres = mapGameGenresToValid(gameGenres);
        const effectiveMood = mood || (favoriteMood && Number(getMoodScoresForGame(gameGenres)?.[favoriteMood] || 0) > 0 ? favoriteMood : null);
        const effectiveGenre = this.getPrimaryGenre(game, favoriteGenre ? [favoriteGenre] : []) || normalizedGenres[0] || null;

        let score = this.scoreGameByBehavior(game, effectiveMood, effectiveGenre, availableMinutes);

        // Strong unplayed boost — this is the backlog buster, so unplayed is the point
        score += 25;

        // Taste alignment bonuses
        if (favoriteGenre && normalizedGenres.includes(favoriteGenre)) {
          score += 20;
        }
        if (effectiveMood && Number(getMoodScoresForGame(gameGenres)?.[effectiveMood] || 0) > 0) {
          score += 15;
        }

        // Signature game genre overlap — anchored to actual most-played taste
        if (sigGenres.size > 0) {
          const sigOverlap = normalizedGenres.filter((g) => sigGenres.has(g)).length;
          if (sigOverlap > 0) {
            score += Math.min(18, sigOverlap * 7);
          }
        }

        // Persona affinity
        if (personaId) {
          const affinityGenres = PERSONA_GENRE_MAP[personaId] || [];
          const normalizedGameGenres = normalizedGenres.map((g) => String(g).toLowerCase());
          const matchCount = affinityGenres.filter((ag) => {
            const needle = String(ag).toLowerCase();
            return normalizedGameGenres.some((g) => g === needle || g.includes(needle) || needle.includes(g));
          }).length;
          if (matchCount > 0) {
            score += Math.min(16, matchCount * 8);
          }
        }

        // Shelf age bonus — the longer it's been sitting unplayed, the more we surface it
        const shelfDays = getShelfAgeDays(game);
        if (shelfDays > 0) {
          score += Math.min(15, Math.floor(shelfDays / 30) * 3);
        }

        // Focus genre adjacency — if the user is currently playing RPGs, unplayed RPGs get a boost
        if (focusGenres.length > 0) {
          const focusOverlap = normalizedGenres.filter((g) =>
            focusGenres.some((fg) => fg.toLowerCase() === String(g).toLowerCase())
          ).length;
          if (focusOverlap > 0) {
            score += Math.min(12, focusOverlap * 5);
          }
        }

        // Time fit — if we know the estimated session length, reward games that fit
        const estimatedMinutes = PersonaPerformanceInsights.estimateSessionMinutes(game);
        if (availableMinutes && estimatedMinutes) {
          if (estimatedMinutes <= availableMinutes) {
            score += 12;
          } else if (estimatedMinutes <= availableMinutes * 1.5) {
            score += 6;
          }
        }

        // Recently recommended penalty
        if (validRecent.some((entry) => entry.name === game.name)) {
          score -= 30;
        }

        // Small randomization for variety
        score += (Math.random() * 8) - 4;

        const reasons = [];
        if (favoriteGenre && normalizedGenres.includes(favoriteGenre)) {
          reasons.push(`Matches your favorite genre: ${favoriteGenre}`);
        }
        if (sigGenres.size > 0 && normalizedGenres.some((g) => sigGenres.has(g))) {
          reasons.push('Shares genres with your most-played games');
        }
        if (focusGenres.length > 0 && normalizedGenres.some((g) =>
          focusGenres.some((fg) => fg.toLowerCase() === String(g).toLowerCase())
        )) {
          reasons.push("Adjacent to what you're playing right now");
        }
        if (shelfDays > 90) {
          reasons.push(`Sitting unplayed for ${Math.floor(shelfDays / 30)} months`);
        }
        if (availableMinutes && estimatedMinutes && estimatedMinutes <= availableMinutes) {
          reasons.push(`Fits in your ${Math.floor(availableMinutes / 60)}h ${availableMinutes % 60}m window`);
        }
        if (reasons.length === 0) {
          reasons.push('Unplayed and matches your taste profile');
        }

        return { game, score, reasons, estimatedMinutes, shelfDays };
      })
      .filter(Boolean)
      .sort((left, right) => right.score - left.score);

    if (scored.length === 0) {
      return null;
    }

    const topPicks = scored.slice(0, count);
    const matchLookup = new Map(
      topPicks.map((entry) => [String(entry.game?.appid || entry.game?.name || ''), entry])
    );

    const totalUnplayed = unplayedGames.length;
    const totalLibrary = library.length;
    const backlogPercentage = totalLibrary > 0 ? Math.round((totalUnplayed / totalLibrary) * 100) : 0;

    const messages = [];
    if (totalUnplayed > 0) {
      const backlogNote = backlogPercentage > 50 ? ` — that's ${backlogPercentage}% of your backlog!` : '.';
      messages.push(`You have ${totalUnplayed} unplayed game${totalUnplayed !== 1 ? 's' : ''} in your library${backlogNote}`);
    }
    if (topPicks[0]?.shelfDays > 180) {
      messages.push(`Your top pick has been sitting unplayed for ${Math.floor(topPicks[0].shelfDays / 30)} months — time to change that.`);
    }

    this.persistRecentRecommendations(topPicks.map((e) => e.game), validRecent, now);

    return this.buildRecommendationPayload('backlog-buster', topPicks.map((entry) => entry.game), {
      mood: mood || favoriteMood || null,
      genre: favoriteGenre || null,
      timeConstraint,
      availableMinutes,
      message: messages.join(' '),
      backlogStats: {
        totalUnplayed,
        totalLibrary,
        backlogPercentage
      },
      entryContextResolver: (game) => {
        const match = matchLookup.get(String(game?.appid || game?.name || ''));
        return {
          mood: mood || favoriteMood || game?.mood || null,
          genre: this.getPrimaryGenre(game, favoriteGenre ? [favoriteGenre] : []) || null,
          metadata: {
            score: match?.score || 0,
            backlogReasons: match?.reasons || [],
            shelfDays: match?.shelfDays || 0,
            estimatedMinutes: match?.estimatedMinutes || null
          }
        };
      }
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

  // ─────────────────────────────────────────────────────────────────────
  // "Because you played X" — find games in the backlog that are similar
  // to recently played games by genre, mood, theme, and tag overlap.
  // This is the recommendation that directly serves backlog paralysis:
  // "you enjoyed RDR2, here's something similar you haven't touched."
  // ─────────────────────────────────────────────────────────────────────

  // Lightweight theme detection — mirrors GamingPersonaService's approach
  // but self-contained so RecommendationEngine doesn't need a new import.
  static _THEME_TAGS = [
    { id: 'zombies', tags: ['zombies', 'post-apocalyptic', 'survival'] },
    { id: 'horror', tags: ['survival horror', 'psychological horror', 'horror', 'gore'] },
    { id: 'souls', tags: ['souls-like', 'soulslike', 'punishing', 'difficult'] },
    { id: 'cyberpunk', tags: ['cyberpunk', 'dystopian', 'hacking', 'neon'] },
    { id: 'space', tags: ['space sim', 'spaceships', 'space', 'sci-fi'] },
    { id: 'fantasy', tags: ['dark fantasy', 'dungeon crawler', 'fantasy', 'magic', 'dragons', 'medieval'] },
    { id: 'competitive', tags: ['moba', 'battle royale', 'hero shooter', 'esports', 'competitive'] },
    { id: 'roguelike', tags: ['roguelike', 'roguelite', 'deckbuilding', 'procedural generation'] },
    { id: 'shooter', tags: ['tactical', 'military', 'fps', 'shooter', 'war'] },
    { id: 'cozy', tags: ['farming', 'cozy', 'fishing', 'wholesome', 'life sim', 'relaxing'] },
    { id: 'strategy', tags: ['grand strategy', '4x', 'turn-based strategy', 'real time strategy', 'strategy', 'tactics'] },
    { id: 'racing', tags: ['racing', 'driving', 'automobile', 'motorsport'] },
    { id: 'open_world', tags: ['open world', 'sandbox', 'exploration'] },
    { id: 'rpg', tags: ['rpg', 'role-playing', 'jrpg', 'action rpg'] },
    { id: 'stealth', tags: ['stealth', 'assassin', 'thief'] },
    { id: 'western', tags: ['western', 'cowboy', 'frontier'] }
  ];

  static _detectGameThemes(game) {
    if (!game) return [];
    const haystack = [
      ...(Array.isArray(game.tags) ? game.tags : []),
      ...(Array.isArray(game.steamTags) ? game.steamTags : []),
      ...(Array.isArray(game.genres) ? game.genres : [])
    ].filter(Boolean).map((s) => String(s).toLowerCase());
    if (haystack.length === 0) return [];
    const matched = [];
    this._THEME_TAGS.forEach((theme) => {
      if (theme.tags.some((needle) => haystack.some((h) => h === needle || h.includes(needle)))) {
        matched.push(theme.id);
      }
    });
    return matched;
  }

  static _getGameTags(game) {
    if (!game) return [];
    const tags = game.tags || game.tag || game.steamTags || [];
    if (Array.isArray(tags)) return tags.filter(Boolean).map((t) => String(t).toLowerCase());
    if (typeof tags === 'string') return [tags.toLowerCase()];
    return [];
  }

  /**
   * Find games in the library similar to recently played games.
   * @param {Array} library - full library
   * @param {Array} recentGames - recently played games (sorted by last_played desc)
   * @param {number} count - how many recommendations to return
   * @returns {Object|null} recommendation payload with entries + reference game
   */
  static getSimilarToRecent(library, recentGames = [], count = 3, recommendationType = 'similar-to-recent') {
    if (!Array.isArray(library) || library.length === 0) return null;
    if (!Array.isArray(recentGames) || recentGames.length === 0) return null;

    // Build a "taste profile" from the recent games
    const recentNames = new Set();
    const recentGenres = new Set();
    const recentMoods = new Set();
    const recentThemes = new Set();
    const recentTags = new Set();

    recentGames.slice(0, 5).forEach((game) => {
      if (!game) return;
      recentNames.add(game.name);
      mapGameGenresToValid(game?.genres).forEach((g) => recentGenres.add(g));
      if (game?.mood) recentMoods.add(game.mood);
      this._detectGameThemes(game).forEach((t) => recentThemes.add(t));
      this._getGameTags(game).forEach((t) => recentTags.add(t));
    });

    if (recentGenres.size === 0 && recentThemes.size === 0 && recentTags.size === 0) {
      return null; // not enough signal from recent games
    }

    const recentlyRecommendedNames = new Set(
      this.getRecentRecommendationState().validRecent.map((entry) => normalizeGameKey(entry.name))
    );

    // Score the rest of the library
    const scored = library
      .filter((game) => game
        && !game.hidden
        && !game.isHidden
        && !recentNames.has(game.name)
        && !UserBehaviorProfile.shouldSuppressRecommendation(game.appid || game.name, game.name))
      .map((game) => {
        const gameGenres = mapGameGenresToValid(game?.genres);
        const gameThemes = this._detectGameThemes(game);
        const gameTags = this._getGameTags(game);
        const gameMood = game?.mood || null;

        let score = 0;
        const reasons = [];
        if (recentlyRecommendedNames.has(normalizeGameKey(game.name))) score -= 30;
        const outcomeSignal = UserBehaviorProfile.getRecommendationOutcomeSignal(game.appid || game.name, game.name);
        score += outcomeSignal.adjustment;
        if (outcomeSignal.reason && outcomeSignal.adjustment > 0) reasons.push(outcomeSignal.reason);

        // Genre overlap — strongest signal
        const sharedGenres = gameGenres.filter((g) => recentGenres.has(g));
        if (sharedGenres.length > 0) {
          score += sharedGenres.length * 22;
          reasons.push(`Shares ${sharedGenres.length > 1 ? 'genres' : 'genre'} with ${recentGames[0]?.name || 'your recent games'}`);
        }

        // Theme overlap — zombies, space, fantasy, etc.
        const sharedThemes = gameThemes.filter((t) => recentThemes.has(t));
        if (sharedThemes.length > 0) {
          score += sharedThemes.length * 18;
          reasons.push(`Similar themes to ${recentGames[0]?.name || 'what you have been playing'}`);
        }

        // Mood overlap
        if (gameMood && recentMoods.has(gameMood)) {
          score += 15;
          reasons.push(`Same ${gameMood} mood`);
        }

        // Tag overlap — more granular than genres
        const sharedTags = gameTags.filter((t) => recentTags.has(t));
        if (sharedTags.length > 0) {
          score += Math.min(sharedTags.length * 6, 24);
        }

        // Backlog boost — strongly prefer unplayed or underplayed games.
        // The whole point of this shelf is "you liked X, here's something
        // similar you haven't touched" — so under 2h gets a big boost.
        const playedMinutes = getBlendedPlaytimeMinutes(game);
        if (playedMinutes < NEGLIGIBLE_PLAYTIME_MINUTES) {
          score += 40;
          reasons.push('Unplayed in your backlog');
        } else if (playedMinutes < 120) {
          score += 30;
          reasons.push('Barely touched in your backlog');
        } else if (playedMinutes < 600) {
          score += 5;
        }

        // Penalty for games played a lot — likely already finished or abandoned
        if (playedMinutes > 600) {
          score -= 15;
        }
        if (playedMinutes > 2000) {
          score -= 20;
        }

        // User rating boost
        if (typeof game.userRating === 'number' && game.userRating >= 7) {
          score += 8;
        }

        // Small randomness to break ties and keep it fresh
        score += Math.random() * 5;

        return { game, score, reasons, sharedGenres, sharedThemes };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) return null;

    const topPicks = scored.slice(0, count).map((entry) => entry.game);
    const referenceGame = recentGames[0] || null;
    const primaryReason = scored[0]?.reasons?.[0] || `Similar to ${referenceGame?.name || 'your recent games'}`;

    return this.buildRecommendationPayload(recommendationType, topPicks, {
      mood: referenceGame?.mood || null,
      genre: this.getPrimaryGenre(referenceGame),
      message: primaryReason,
      usedFallback: false,
      meta: {
        referenceGame: referenceGame?.name || null,
        referenceGameId: referenceGame?.appid || referenceGame?.name || null,
        allReasons: scored.slice(0, count).map((e) => e.reasons)
      }
    });
  }

  static getSimilarToGame(library, referenceGame, count = 6) {
    if (!referenceGame) return null;
    return this.getSimilarToRecent(library, [referenceGame], count, 'similar-to-game');
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
      .filter((game) => !isGameUnplayed(game));

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
          .filter((game) => !isGameUnplayed(game));
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
