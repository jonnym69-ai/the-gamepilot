/**
 * SmartCollectionsService - Auto-curated librarian collections
 *
 * Generates intelligent game collections based on behavioral patterns,
 * session history, and library state. These are "living shelves" that
 * update as the user's gaming habits evolve.
 *
 * Collections are computed on-demand from canonical sources:
 * - UserBehaviorProfile (mood/genre/session preferences)
 * - StatsAggregationService (session history, playtime)
 * - GameCurationService (completion status, notes, date added)
 * - RecommendationEngine (scoring for relevance)
 */

import { UserBehaviorProfile } from './UserBehaviorProfile';
import { StatsAggregationService } from './StatsAggregationService';
import { GameCurationService } from './GameCurationService';
import { RecommendationEngine, isGameUnplayed } from './RecommendationEngine';
import { PersonaPerformanceInsights } from './PersonaPerformanceInsights';
import StorageService from './StorageService';

const SMART_COLLECTIONS_STORAGE_KEY = 'smartCollectionsDismissed';

const getDismissedCollections = () => {
  try {
    return new Set(StorageService.get(SMART_COLLECTIONS_STORAGE_KEY, []));
  } catch {
    return new Set();
  }
};

const setDismissedCollections = (set) => {
  try {
    StorageService.set(SMART_COLLECTIONS_STORAGE_KEY, Array.from(set));
  } catch {
    // ignore
  }
};

const getGameKey = (game) => game?.appid || game?.app_id || game?.steamAppId || game?.name;

const getLastPlayedTimestamp = (game) => {
  const val = game?.last_played;
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string') {
    const p = Date.parse(val);
    return Number.isNaN(p) ? 0 : p;
  }
  return 0;
};

const daysSince = (timestamp) => {
  if (!timestamp) return Infinity;
  return (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
};

const getGenreList = (game) => {
  return Array.isArray(game?.genres) ? game.genres.filter(Boolean) : [];
};

export class SmartCollectionsService {
  /**
   * Build all smart collections for a given library.
   */
  static buildAllCollections(library = []) {
    if (!Array.isArray(library) || library.length === 0) {
      return [];
    }

    const enrichedLibrary = GameCurationService.enrichLibrary(library);
    const sessionHistory = StatsAggregationService.getNormalizedSessionHistory(library);
    const profile = UserBehaviorProfile.getProfile();
    const persona = UserBehaviorProfile.getPersonaSnapshot();
    const dismissed = getDismissedCollections();

    const builders = [
      this.buildFavorites,
      this.buildTopRated,
      this.buildContinueThis,
      this.buildBacklogRediscovery,
      this.buildComfortPicks,
      this.buildHiddenGems,
      this.buildDeepDives,
      this.buildOneMoreRun,
      this.buildQuickFix,
      this.buildMoodMatch,
      this.buildGenreGaps,
      this.buildAbandonedEarly,
      this.buildRecentlyCompleted
    ];

    const collections = builders
      .map((builder) => builder.call(this, enrichedLibrary, sessionHistory, profile, persona))
      .filter(Boolean)
      .filter((col) => col.games.length > 0)
      .filter((col) => !dismissed.has(col.id))
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

    return collections;
  }

  /**
   * Dismiss a smart collection so it stops appearing.
   */
  static dismissCollection(collectionId) {
    const dismissed = getDismissedCollections();
    dismissed.add(collectionId);
    setDismissedCollections(dismissed);
  }

  /**
   * Reset dismissed collections.
   */
  static resetDismissed() {
    setDismissedCollections(new Set());
  }

  // ---------- Collection Builders ----------

  /** User-marked favourite games */
  static buildFavorites(library) {
    const favoriteKeys = new Set(StorageService.get('favorites', []));
    if (favoriteKeys.size === 0) return null;

    const games = library
      .filter((g) => favoriteKeys.has(getGameKey(g)))
      .slice(0, 12);

    if (games.length === 0) return null;

    return {
      id: 'favorites',
      title: 'Your Favourites',
      subtitle: 'Games you have marked as favourites',
      icon: 'heart',
      color: '#f472b6',
      games,
      relevanceScore: 92,
      actionLabel: 'Play',
      insight: `${games.length} favourite game${games.length !== 1 ? 's' : ''} ready to go.`
    };
  }

  /** Top user-rated games */
  static buildTopRated(library) {
    const games = library
      .filter((g) => typeof g?.userRating === 'number' && g.userRating >= 7)
      .sort((a, b) => b.userRating - a.userRating)
      .slice(0, 12);

    if (games.length === 0) return null;

    return {
      id: 'top-rated',
      title: 'Top Rated',
      subtitle: 'Your highest-rated games',
      icon: 'trophy',
      color: '#facc15',
      games,
      relevanceScore: 91,
      actionLabel: 'Play',
      insight: `Your top-rated picks — ${games.length} game${games.length !== 1 ? 's' : ''} rated 7+.`
    };
  }

  /** Games you started but abandoned — have playtime but long gap since last play */
  static buildContinueThis(library, sessionHistory, profile, persona) {
    const games = library
      .filter((g) => {
        const hasPlaytime = Number(g?.time_played || 0) > 0;
        const lastPlayed = getLastPlayedTimestamp(g);
        const days = daysSince(lastPlayed);
        const completion = GameCurationService.getGameCompletion(g.name);
        const isComplete = ['finished', 'beaten', 'completed', '100%'].includes(completion.status);
        return hasPlaytime && days > 14 && days < 180 && !isComplete;
      })
      .sort((a, b) => daysSince(getLastPlayedTimestamp(a)) - daysSince(getLastPlayedTimestamp(b)))
      .slice(0, 12);

    if (games.length === 0) return null;

    return {
      id: 'continue-this',
      title: 'Continue This',
      subtitle: 'Games you started but left behind',
      icon: 'play-circle',
      color: '#3dd9ff',
      games,
      relevanceScore: 95,
      actionLabel: 'Resume',
      insight: `You have ${games.length} game${games.length !== 1 ? 's' : ''} waiting to be finished.`
    };
  }

  /** Games owned but never launched — backlog candidates */
  static buildBacklogRediscovery(library, sessionHistory, profile, persona) {
    const dominantGenre = persona?.dominantGenre;
    const dominantMood = persona?.dominantMood;

    const games = library
      .filter((g) => isGameUnplayed(g))
      .map((g) => {
        const score = RecommendationEngine.scoreGameByBehavior(
          g,
          dominantMood,
          dominantGenre,
          null
        );
        return { ...g, _smartScore: score };
      })
      .sort((a, b) => b._smartScore - a._smartScore)
      .slice(0, 12);

    if (games.length === 0) return null;

    return {
      id: 'backlog-rediscovery',
      title: 'Backlog Rediscovery',
      subtitle: 'Owned, never played — ranked by your taste',
      icon: 'archive',
      color: '#a78bfa',
      games,
      relevanceScore: 90,
      actionLabel: 'Try it',
      insight: `${games.length} unplayed game${games.length !== 1 ? 's' : ''} in your library.`
    };
  }

  /** Games you keep returning to — high session count */
  static buildComfortPicks(library, sessionHistory, profile, persona) {
    const games = library
      .filter((g) => (g?.launch_count || 0) >= 3 || (g?.sessionCount || 0) >= 3)
      .map((g) => {
        const sessions = sessionHistory.filter(
          (s) => String(s.gameName).toLowerCase() === String(g.name).toLowerCase()
        ).length;
        return { ...g, _sessionCount: Math.max(g?.launch_count || 0, sessions) };
      })
      .sort((a, b) => b._sessionCount - a._sessionCount)
      .slice(0, 10);

    if (games.length === 0) return null;

    return {
      id: 'comfort-picks',
      title: 'Comfort Picks',
      subtitle: 'Games you keep coming back to',
      icon: 'heart',
      color: '#f472b6',
      games,
      relevanceScore: 88,
      actionLabel: 'Play',
      insight: 'Your reliable favorites — always a good time.'
    };
  }

  /** Short masterpieces — high completion rate, low total playtime */
  static buildHiddenGems(library, sessionHistory, profile, persona) {
    const games = library
      .filter((g) => {
        const completion = GameCurationService.getGameCompletion(g.name);
        const isComplete = ['finished', 'beaten', 'completed', '100%'].includes(completion.status);
        const timePlayed = Number(g?.time_played || 0);
        const estimated = PersonaPerformanceInsights.estimateSessionMinutes(g);
        return isComplete && timePlayed > 0 && timePlayed <= 360 && estimated && estimated <= 240;
      })
      .sort((a, b) => Number(a?.time_played || 0) - Number(b?.time_played || 0))
      .slice(0, 10);

    if (games.length === 0) return null;

    return {
      id: 'hidden-gems',
      title: 'Hidden Gems',
      subtitle: 'Short masterpieces you finished',
      icon: 'gem',
      color: '#34d399',
      games,
      relevanceScore: 82,
      actionLabel: 'Replay',
      insight: `${games.length} tight experience${games.length !== 1 ? 's' : ''} worth revisiting.`
    };
  }

  /** Long single-session games — RPGs, strategy, immersive sims */
  static buildDeepDives(library, sessionHistory, profile, persona) {
    const games = library
      .filter((g) => {
        const gameSessions = sessionHistory.filter(
          (s) => String(s.gameName).toLowerCase() === String(g.name).toLowerCase()
        );
        const longestSession = gameSessions.reduce(
          (max, s) => Math.max(max, s.playtimeMinutes || 0),
          0
        );
        return longestSession >= 180;
      })
      .sort((a, b) => {
        const aSessions = sessionHistory.filter(
          (s) => String(s.gameName).toLowerCase() === String(a.name).toLowerCase()
        );
        const bSessions = sessionHistory.filter(
          (s) => String(s.gameName).toLowerCase() === String(b.name).toLowerCase()
        );
        const aMax = aSessions.reduce((max, s) => Math.max(max, s.playtimeMinutes || 0), 0);
        const bMax = bSessions.reduce((max, s) => Math.max(max, s.playtimeMinutes || 0), 0);
        return bMax - aMax;
      })
      .slice(0, 10);

    if (games.length === 0) return null;

    return {
      id: 'deep-dives',
      title: 'Deep Dives',
      subtitle: 'Games that swallowed your whole evening',
      icon: 'compass',
      color: '#818cf8',
      games,
      relevanceScore: 80,
      actionLabel: 'Dive in',
      insight: 'These games command long, focused sessions.'
    };
  }

  /** High session count, short individual sessions — roguelikes, arcade */
  static buildOneMoreRun(library, sessionHistory, profile, persona) {
    const games = library
      .filter((g) => {
        const gameSessions = sessionHistory.filter(
          (s) => String(s.gameName).toLowerCase() === String(g.name).toLowerCase()
        );
        const sessionCount = Math.max(g?.launch_count || 0, gameSessions.length);
        const avgSession =
          gameSessions.length > 0
            ? gameSessions.reduce((sum, s) => sum + (s.playtimeMinutes || 0), 0) /
              gameSessions.length
            : Number(g?.time_played || 0) / Math.max(g?.launch_count || 1, 1);
        return sessionCount >= 5 && avgSession > 0 && avgSession <= 60;
      })
      .sort((a, b) => (b?.launch_count || 0) - (a?.launch_count || 0))
      .slice(0, 10);

    if (games.length === 0) return null;

    return {
      id: 'one-more-run',
      title: 'One More Run',
      subtitle: 'Quick hits you cannot stop playing',
      icon: 'repeat',
      color: '#fbbf24',
      games,
      relevanceScore: 85,
      actionLabel: 'Run',
      insight: 'Addictive loop games — perfect for short breaks.'
    };
  }

  /** Short games matching current time/mood context */
  static buildQuickFix(library, sessionHistory, profile, persona) {
    const avgSession = profile?.playstylePatterns?.avgSessionLength || 0;
    const targetMinutes = avgSession > 0 ? Math.min(avgSession, 60) : 60;

    const games = library
      .filter((g) => {
        const estimated = PersonaPerformanceInsights.estimateSessionMinutes(g);
        const completion = GameCurationService.getGameCompletion(g.name);
        const isComplete = ['finished', 'beaten', 'completed', '100%'].includes(completion.status);
        return estimated && estimated <= targetMinutes + 15 && !isComplete;
      })
      .map((g) => {
        const score = RecommendationEngine.scoreGameByBehavior(
          g,
          persona?.dominantMood,
          persona?.dominantGenre,
          targetMinutes
        );
        return { ...g, _smartScore: score };
      })
      .sort((a, b) => b._smartScore - a._smartScore)
      .slice(0, 10);

    if (games.length === 0) return null;

    return {
      id: 'quick-fix',
      title: 'Quick Fix',
      subtitle: `Fits your average ${Math.round(targetMinutes)}-minute session`,
      icon: 'zap',
      color: '#22d3ee',
      games,
      relevanceScore: 84,
      actionLabel: 'Jump in',
      insight: 'Low-commitment picks that match your typical session length.'
    };
  }

  /** Games matching your dominant mood */
  static buildMoodMatch(library, sessionHistory, profile, persona) {
    const mood = persona?.dominantMood;
    if (!mood) return null;

    const games = library
      .filter((g) => {
        const gameMood = g?.mood;
        const genres = getGenreList(g);
        return (
          gameMood === mood ||
          (genres.length > 0 && RecommendationEngine.scoreGameByBehavior(g, mood, null, null) > 50)
        );
      })
      .map((g) => {
        const score = RecommendationEngine.scoreGameByBehavior(g, mood, null, null);
        return { ...g, _smartScore: score };
      })
      .sort((a, b) => b._smartScore - a._smartScore)
      .slice(0, 10);

    if (games.length === 0) return null;

    return {
      id: 'mood-match',
      title: `${mood} Match`,
      subtitle: `Games that fit your ${mood.toLowerCase()} vibe`,
      icon: 'smile',
      color: '#c084fc',
      games,
      relevanceScore: 86,
      actionLabel: 'Match',
      insight: `Curated for your current ${mood.toLowerCase()} preference.`
    };
  }

  /** Genres you own zero of — discovery prompts */
  static buildGenreGaps(library, sessionHistory, profile, persona) {
    const knownGenres = [
      'Action', 'Adventure', 'RPG', 'Strategy', 'Simulation', 'Sports', 'Racing',
      'Puzzle', 'Platformer', 'Shooter', 'Fighting', 'Horror', 'Survival',
      'Roguelike', 'Indie', 'MMO', 'Visual Novel', 'Management'
    ];

    const ownedGenres = new Set();
    library.forEach((g) => {
      getGenreList(g).forEach((genre) => ownedGenres.add(genre));
    });

    const gaps = knownGenres.filter((g) => !ownedGenres.has(g));
    if (gaps.length === 0) return null;

    // We cannot show games the user does not own, so this is a "suggestion" collection
    return {
      id: 'genre-gaps',
      title: 'Genre Gaps',
      subtitle: 'Genres missing from your library',
      icon: 'search',
      color: '#94a3b8',
      games: [], // No games to display — purely informational
      gaps,
      relevanceScore: 60,
      actionLabel: 'Explore',
      insight: `You don't own any ${gaps.slice(0, 3).join(', ')} games yet.`,
      isInsightOnly: true
    };
  }

  /** Games abandoned early — low playtime relative to estimated */
  static buildAbandonedEarly(library, sessionHistory, profile, persona) {
    const games = library
      .filter((g) => {
        const timePlayed = Number(g?.time_played || 0);
        const estimated = PersonaPerformanceInsights.estimateSessionMinutes(g);
        const completion = GameCurationService.getGameCompletion(g.name);
        const isComplete = ['finished', 'beaten', 'completed', '100%'].includes(completion.status);
        const isAbandoned = completion.status === 'abandoned';
        const ratio = estimated > 0 ? timePlayed / estimated : 1;
        return (ratio < 0.3 && timePlayed > 10 && !isComplete) || isAbandoned;
      })
      .sort((a, b) => {
        const aTime = Number(a?.time_played || 0);
        const bTime = Number(b?.time_played || 0);
        return aTime - bTime;
      })
      .slice(0, 8);

    if (games.length === 0) return null;

    return {
      id: 'abandoned-early',
      title: 'Abandoned Early',
      subtitle: 'Games you gave up on — maybe give them another shot?',
      icon: 'alert-circle',
      color: '#fb923c',
      games,
      relevanceScore: 72,
      actionLabel: 'Retry',
      insight: `${games.length} game${games.length !== 1 ? 's' : ''} with untapped potential.`
    };
  }

  /** Recently marked as completed */
  static buildRecentlyCompleted(library, sessionHistory, profile, persona) {
    const games = library
      .filter((g) => {
        const completion = GameCurationService.getGameCompletion(g.name);
        const isComplete = ['finished', 'beaten', 'completed', '100%'].includes(completion.status);
        if (!isComplete || !completion.history?.length) return false;
        const lastComplete = completion.history
          .filter((h) => ['finished', 'beaten', 'completed', '100%'].includes(h.status))
          .pop();
        return lastComplete && daysSince(lastComplete.timestamp) < 30;
      })
      .sort((a, b) => {
        const aHist = GameCurationService.getGameCompletion(a.name).history;
        const bHist = GameCurationService.getGameCompletion(b.name).history;
        const aLast = aHist.filter((h) => ['finished', 'beaten', 'completed', '100%'].includes(h.status)).pop();
        const bLast = bHist.filter((h) => ['finished', 'beaten', 'completed', '100%'].includes(h.status)).pop();
        return (bLast?.timestamp || 0) - (aLast?.timestamp || 0);
      })
      .slice(0, 8);

    if (games.length === 0) return null;

    return {
      id: 'recently-completed',
      title: 'Recently Completed',
      subtitle: 'Victories you can be proud of',
      icon: 'trophy',
      color: '#facc15',
      games,
      relevanceScore: 75,
      actionLabel: 'Celebrate',
      insight: 'Fresh completions — your backlog is shrinking!'
    };
  }

  // ---------- Utility ----------

  static getCollectionById(library, collectionId) {
    const all = this.buildAllCollections(library);
    return all.find((c) => c.id === collectionId) || null;
  }

  static getGamesForCollection(library, collectionId) {
    const col = this.getCollectionById(library, collectionId);
    return col?.games || [];
  }
}
