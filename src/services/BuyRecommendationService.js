import StorageService from './StorageService';
import { RecommendationEngine } from './RecommendationEngine';
import { getGameGenres } from '../GameGenreDatabase';
import { GamingIdentity } from '../GamingIdentity';
import { UserBehaviorProfile } from './UserBehaviorProfile';
import { GameRatingService } from './GameRatingService';
import { getFamiliarityBias } from './RecommendationWeights';

const SETTINGS_KEY = 'buyRecommendationsEnabled';
const MAX_RESULTS = 3;

const normalizeName = (value) => String(value || '').trim().toLowerCase();

const getGameId = (game = {}) => String(
  game.appid
    || game.steam_appid
    || game.appId
    || game.name
    || game.title
    || ''
);

const getPlaytime = (game = {}) => Number(game.time_played || game.playtime || game.playtimeMinutes || 0);

const getRating = (game = {}) => Number(game.userRating || game.rating || game.score || 0);

const scoreBuyReason = (reason, gameName) => {
  if (!reason || !gameName) return 0;
  let score = 0;
  const lower = reason.toLowerCase();
  const gameNameLower = String(gameName).toLowerCase();

  // Mentions the actual game -> very distinctive.
  if (lower.includes(gameNameLower)) score += 4;

  // Concrete value signals -> distinctive.
  if (/threshold|historical low|budget|alert/i.test(lower)) score += 3;
  if (/fits your .* pattern/i.test(lower)) score += 2;
  if (/finish \d+%/i.test(lower)) score += 2;
  if (/signature games/i.test(lower)) score += 1;
  if (/familiar genre profile|fresh pick/i.test(lower)) score += 1;

  // Generic boilerplate that repeats across every card -> deprioritize.
  if (/chosen .* filter/i.test(lower)) score -= 1;
  if (/strongest local genre signals/i.test(lower)) score -= 2;
  if (/launcher.*you already use/i.test(lower)) score -= 2;

  return score;
};

const prioritizeBuyReasons = (reasons, gameName) => {
  if (!Array.isArray(reasons) || reasons.length === 0) return reasons;

  const daySeed = new Date().toISOString().slice(0, 10);
  const baseSeed = String(gameName).split('').reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 0)
    + daySeed.split('').reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 0);

  const scored = reasons.map((reason, index) => ({
    reason,
    index,
    score: scoreBuyReason(reason, gameName)
  }));

  const groups = [];
  scored.forEach((item) => {
    const last = groups[groups.length - 1];
    if (last && last[0].score === item.score) {
      last.push(item);
    } else {
      groups.push([item]);
    }
  });

  groups.sort((a, b) => b[0].score - a[0].score);

  const rotated = groups.flatMap((group, groupIndex) => {
    if (group.length <= 1) return group;
    const offset = Math.abs(baseSeed + groupIndex) % group.length;
    return [...group.slice(offset), ...group.slice(0, offset)];
  });

  rotated.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    return a.index - b.index;
  });

  return rotated.map((item) => item.reason);
};

const getGenres = (game = {}) => Array.isArray(game.genres)
  ? game.genres.filter((genre) => genre && genre !== 'Unknown')
  : [];

const buildTasteProfile = (library = []) => {
  const genreScores = new Map();
  const platformScores = new Map();
  const anchors = [];

  library.forEach((game) => {
    const playtime = getPlaytime(game);
    const rating = getRating(game);
    const weight = Math.max(1, Math.min(20, Math.round(playtime / 60) + rating));

    if (playtime <= 0 && rating <= 0) return;

    getGenres(game).forEach((genre) => {
      genreScores.set(genre, (genreScores.get(genre) || 0) + weight);
    });

    if (game.platform) {
      platformScores.set(game.platform, (platformScores.get(game.platform) || 0) + Math.max(1, Math.round(weight / 2)));
    }

    anchors.push({
      name: game.name || game.title || 'Played game',
      weight,
      genres: getGenres(game),
      platform: game.platform || null
    });
  });

  const topGenres = [...genreScores.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([genre]) => genre);
  const topPlatforms = [...platformScores.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([platform]) => platform);
  const topAnchors = anchors.sort((a, b) => b.weight - a.weight).slice(0, 3);

  // Pull signature games + taste clusters from the full identity stack
  let signatureGames = [];
  let tasteClusters = [];
  let genreCompletionRates = {};
  let topRatedGenres = [];
  let familiarityProfiles = null;
  try {
    const identity = GamingIdentity.getProfile();
    signatureGames = identity?.signatureGames || [];
    tasteClusters = identity?.tasteClusters || [];
    familiarityProfiles = GamingIdentity.getFamiliarityProfiles();
  } catch { /* identity optional */ }

  // Pull genre completion rates from behavioral profile — these tell us not
  // just what the user *plays* but what they *finish* and *enjoy*.
  try {
    const behaviorProfile = UserBehaviorProfile.getProfile();
    const genrePrefs = behaviorProfile?.genrePreferences || {};
    Object.entries(genrePrefs).forEach(([genre, data]) => {
      if (data?.count > 0) {
        genreCompletionRates[genre] = Math.round((data.completedCount / data.count) * 100);
      }
    });
  } catch { /* behavior profile optional */ }

  // Derive top-rated genres from GameRatingService — genres where the user's
  // highest-rated games cluster.
  try {
    const allRatings = GameRatingService.getAllRatings();
    const genreRatingScores = new Map();
    const lib = StorageService.get('library', []);
    Object.entries(allRatings).forEach(([gameId, rating]) => {
      if (!rating?.value || rating.value <= 0) return;
      const game = lib.find((g) => String(g.appid || g.name) === gameId);
      if (!game) return;
      getGenres(game).forEach((genre) => {
        genreRatingScores.set(genre, (genreRatingScores.get(genre) || 0) + rating.value);
      });
    });
    topRatedGenres = [...genreRatingScores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genre]) => genre);
  } catch { /* ratings optional */ }

  return { topGenres, topPlatforms, topAnchors, signatureGames, tasteClusters, genreCompletionRates, topRatedGenres, familiarityProfiles };
};

class BuyRecommendationService {
  static isEnabled() {
    const raw = StorageService.getString(SETTINGS_KEY);
    if (raw === null || raw === undefined || raw === '') return false;
    return raw === 'true' || raw === true;
  }

  static setEnabled(enabled) {
    StorageService.setString(SETTINGS_KEY, String(Boolean(enabled)));
  }

  static getSnapshot(library = [], wishlistItems = [], filters = {}) {
    const enabled = this.isEnabled();
    const ownedNames = new Set((library || []).map((game) => normalizeName(game.name || game.title)));
    const candidates = Array.isArray(wishlistItems) ? wishlistItems : [];
    const tasteProfile = buildTasteProfile(library || []);

    // Genre + Price filters. Mood is deliberately excluded: it depends on
    // experiencing a game, which is unknowable for something you don't own.
    const genreFilter = filters && filters.genre ? String(filters.genre) : null;
    const maxPrice = filters && typeof filters.maxPrice === 'number' && filters.maxPrice > 0
      ? filters.maxPrice
      : null;
    const familiarityBias = filters && filters.familiarityBias ? filters.familiarityBias : getFamiliarityBias();

    // Resolve genres once per candidate so we can both filter and rank.
    const resolveItemGenres = (item) => {
      let itemGenres = Array.isArray(item.genres) ? item.genres.filter(Boolean) : [];
      if (itemGenres.length === 0) {
        try {
          itemGenres = getGameGenres(item.name) || [];
        } catch {
          itemGenres = [];
        }
      }
      return itemGenres;
    };

    const unowned = candidates.filter((item) => item?.name && !ownedNames.has(normalizeName(item.name)));

    // Build the list of genres actually present in the wishlist for the UI.
    const availableGenres = [...new Set(
      unowned.flatMap((item) => resolveItemGenres(item))
    )].sort();

    if (!enabled) {
      return {
        enabled,
        entries: [],
        candidateCount: candidates.length,
        availableGenres,
        appliedFilters: { genre: genreFilter, maxPrice },
        message: 'Buy Recommendations are off. Enable them in Settings to rank wishlist ideas using local play history.'
      };
    }

    let filteredOutCount = 0;
    const entries = unowned
      .map((item) => {
        const itemGenres = resolveItemGenres(item);
        const price = item.currentPrice?.price;

        // Apply hard filters first.
        if (genreFilter && !itemGenres.some((g) => g.toLowerCase() === genreFilter.toLowerCase())) {
          filteredOutCount += 1;
          return null;
        }
        if (maxPrice && typeof price === 'number' && price > maxPrice) {
          filteredOutCount += 1;
          return null;
        }

        const gameLike = {
          name: item.name,
          title: item.name,
          appid: item.appid || item.key,
          platform: item.platform || 'Wishlist',
          genres: itemGenres,
          time_played: 0
        };
        const genres = getGenres(gameLike);
        const genreMatches = genres.filter((genre) => tasteProfile.topGenres.includes(genre));
        const platformMatch = gameLike.platform && tasteProfile.topPlatforms.includes(gameLike.platform);
        const threshold = item.threshold;
        const historicalLow = item.historicalLow?.price;
        const matchesGenreFilter = genreFilter && itemGenres.some((g) => g.toLowerCase() === genreFilter.toLowerCase());
        const underBudget = maxPrice && typeof price === 'number' && price <= maxPrice;

        // --- New identity-driven signals ---
        // Familiarity bias: compare wishlist item against familiar or fresh
        // genre profiles depending on user's selection.
        let familiarityMatch = false;
        let familiarityReason = null;
        if (familiarityBias && tasteProfile.familiarityProfiles) {
          const fp = tasteProfile.familiarityProfiles;
          if (familiarityBias === 'familiar') {
            const familiarMatches = itemGenres.filter((g) => fp.familiarGenres.includes(g));
            if (familiarMatches.length > 0) {
              familiarityMatch = true;
              familiarityReason = `Matches your familiar genre profile: ${familiarMatches.join(', ')}`;
            }
          } else if (familiarityBias === 'fresh') {
            // Fresh: matches genres from unexplored library games, OR genres
            // not in the familiar profile (expanding horizons).
            const freshMatches = itemGenres.filter((g) => fp.freshGenres.includes(g));
            const novelMatches = itemGenres.filter((g) => !fp.familiarGenres.includes(g));
            if (freshMatches.length > 0 || novelMatches.length > 0) {
              familiarityMatch = true;
              const reasonParts = [];
              if (freshMatches.length > 0) reasonParts.push(`matches your unexplored library genres: ${freshMatches.join(', ')}`);
              if (novelMatches.length > 0 && freshMatches.length === 0) reasonParts.push(`genres outside your comfort zone: ${novelMatches.join(', ')}`);
              familiarityReason = `Fresh pick — ${reasonParts.join('; ')}`;
            }
          }
        }

        // Taste cluster match: does this game's name/genres match any of the
        // player's emergent taste clusters (e.g. Souls-like, Survival Architect)?
        const matchedClusters = (tasteProfile.tasteClusters || []).filter((cluster) => {
          if (!cluster || !Array.isArray(cluster.gameNames)) return false;
          // Check if the wishlist item's name matches any game in the cluster,
          // or if its genres overlap with the cluster's games' genres.
          return cluster.gameNames.some((n) => normalizeName(n) === normalizeName(item.name))
            || itemGenres.some((g) => {
              const clusterGenres = cluster.gameNames
                .map((n) => {
                  const sig = (tasteProfile.signatureGames || []).find((s) => s.name === n);
                  return sig?.genres || [];
                })
                .flat();
              return clusterGenres.includes(g);
            });
        });

        // Genre completion rate: does the user actually *finish* games in this genre?
        const completionBoostGenres = genreMatches.filter((g) =>
          (tasteProfile.genreCompletionRates || {})[g] >= 60
        );

        // Top-rated genre overlap: genres where the user's highest-rated games cluster
        const ratedGenreMatches = genres.filter((g) =>
          (tasteProfile.topRatedGenres || []).includes(g)
        );

        // Signature game genre overlap: does this game share genres with the
        // player's signature games?
        const sigGenres = new Set((tasteProfile.signatureGames || []).flatMap((s) => s.genres || []));
        const signatureGenreMatches = genres.filter((g) => sigGenres.has(g));

        let buyScore = 35; // lower base to create more differentiation
        buyScore += genreMatches.length * 10;
        buyScore += signatureGenreMatches.length * 8; // games sharing genres with your signature titles
        if (platformMatch) buyScore += 6;
        if (matchesGenreFilter) buyScore += 10;
        if (underBudget) buyScore += 8;
        if (typeof price === 'number' && typeof threshold === 'number' && price <= threshold) buyScore += 18;
        if (typeof price === 'number' && typeof historicalLow === 'number' && price <= historicalLow) buyScore += 12;
        if (item.notes) buyScore += 5;
        // Identity-driven boosts
        if (matchedClusters.length > 0) buyScore += 15; // strong: matches an emergent taste pattern
        if (completionBoostGenres.length > 0) buyScore += 10; // you finish games in this genre
        if (ratedGenreMatches.length > 0) buyScore += 8; // you rate games in this genre highly
        if (familiarityMatch) buyScore += 28; // strong preference for familiar/fresh genre matches
        buyScore = Math.max(0, Math.min(100, buyScore));

        const gameName = item.name;
        const priceFormatted = item.currentPrice?.priceFormatted || (typeof price === 'number' ? `$${price.toFixed(2)}` : null);

        const rawReasons = [
          matchesGenreFilter ? `Matches your chosen ${genreFilter} filter` : null,
          typeof price === 'number' && typeof threshold === 'number' && price <= threshold && priceFormatted
            ? `${gameName} is ${priceFormatted}, under your ${threshold.toFixed(2)} alert`
            : null,
          typeof price === 'number' && typeof historicalLow === 'number' && price <= historicalLow && priceFormatted
            ? `${gameName} is at its recorded historical low (${priceFormatted})`
            : null,
          underBudget ? `${gameName} fits inside your $${maxPrice} budget` : null,
          matchedClusters.length > 0
            ? `${gameName} fits your ${matchedClusters[0].label} pattern (${matchedClusters[0].gameNames.slice(0, 2).join(', ')})`
            : null,
          completionBoostGenres.length > 0
            ? `You finish ${completionBoostGenres[0]} games ${tasteProfile.genreCompletionRates[completionBoostGenres[0]]}% of the time — ${gameName} is in that space`
            : null,
          signatureGenreMatches.length > 0
            ? `${gameName} shares ${signatureGenreMatches.join(', ')} DNA with your signature games`
            : null,
          familiarityReason ? `${gameName}: ${familiarityReason}` : null,
          ratedGenreMatches.length > 0
            ? `${gameName} overlaps with your highly-rated ${ratedGenreMatches[0]} games`
            : null,
          genreMatches.length > 0
            ? `${gameName} matches your strongest local genre signals: ${genreMatches.join(', ')}`
            : null,
          platformMatch ? `${gameName} is on ${gameLike.platform}, a launcher you use often` : null,
          item.notes ? `You left a note for ${gameName}` : null
        ].filter(Boolean);

        const reasons = prioritizeBuyReasons(rawReasons, gameName).slice(0, 4);

        const entry = RecommendationEngine.buildRecommendationEntry(
          gameLike,
          'buy-recommendation',
          null,
          genreMatches[0] || genres[0] || tasteProfile.topGenres[0] || null,
          null,
          {
            buyScore,
            buyReasons: reasons.length > 0 ? reasons : ['Ranked from your local wishlist and play-history signals.'],
            wishlistItem: item
          }
        );

        if (entry && reasons.length > 0) {
          entry.explanation = {
            ...entry.explanation,
            reasons,
            previewReasons: reasons.slice(0, 3),
            fullExplanation: reasons.join('\n'),
            summary: `${entry.explanation.confidence}% confident match - ${reasons[0]}`
          };
        }

        return entry;
      })
      .filter(Boolean)
      .sort((left, right) => Number(right.meta?.buyScore || 0) - Number(left.meta?.buyScore || 0));

    // Diversity pass: penalize entries whose primary genre is already
    // represented by a higher-ranked pick. This prevents the top 3 from
    // all being the same genre, giving the user a more varied shortlist.
    const DIVERSITY_PENALTY = 8;
    const seenGenres = new Set();
    const diversified = entries.map((entry) => {
      const primaryGenre = entry.genre
        || entry.game?.genres?.[0]
        || null;
      let adjustedScore = entry.meta?.buyScore || 0;
      if (primaryGenre && seenGenres.has(primaryGenre)) {
        adjustedScore = Math.max(0, adjustedScore - DIVERSITY_PENALTY);
        return {
          ...entry,
          meta: {
            ...entry.meta,
            buyScore: adjustedScore,
            buyReasons: [
              ...(entry.meta?.buyReasons || []),
              `Similar to a higher-ranked pick — adjusted for variety.`
            ].slice(0, 5)
          }
        };
      }
      if (primaryGenre) seenGenres.add(primaryGenre);
      return entry;
    });

    const allEntries = diversified
      .sort((left, right) => Number(right.meta?.buyScore || 0) - Number(left.meta?.buyScore || 0));
    const finalEntries = allEntries.slice(0, MAX_RESULTS);

    const hasActiveFilter = Boolean(genreFilter || maxPrice);

    return {
      enabled,
      entries: finalEntries,
      allEntries,
      candidateCount: candidates.length,
      availableGenres,
      appliedFilters: { genre: genreFilter, maxPrice },
      filteredOutCount,
      topGenres: tasteProfile.topGenres,
      topAnchors: tasteProfile.topAnchors,
      tasteClusters: tasteProfile.tasteClusters || [],
      signatureGames: tasteProfile.signatureGames || [],
      familiarityBias: getFamiliarityBias(),
      familiarityProfiles: tasteProfile.familiarityProfiles || null,
      tracking: {
        recommendationType: 'buy-recommendation',
        recommendedGameIds: entries.map((entry) => getGameId(entry.game)).filter(Boolean)
      },
      message: entries.length > 0
        ? 'Local buy recommendations ranked from your wishlist, owned-library taste, and cached price context.'
        : (hasActiveFilter
          ? 'No wishlist games match these filters. Try a different genre or a higher price.'
          : 'Add games to Wishlist to let GamePilot rank what may be worth buying next.')
    };
  }
}

export default BuyRecommendationService;
