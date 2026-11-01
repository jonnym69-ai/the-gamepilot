import StorageService from './StorageService';
import { RecommendationEngine, isGameUnplayed } from './RecommendationEngine';
import { getGameGenres } from '../GameGenreDatabase';
import { GamingIdentity } from '../GamingIdentity';
import { UserBehaviorProfile } from './UserBehaviorProfile';
import { GameRatingService } from './GameRatingService';
import { getFamiliarityBias } from './RecommendationWeights';
import { GamingPersonaService } from './GamingPersonaService';

const SETTINGS_KEY = 'buyRecommendationsEnabled';
const MAX_RESULTS = 3;

const normalizeName = (value) =>
  String(value || '')
    .trim()
    .toLowerCase();

const getGameId = (game = {}) => String(game.appid || game.steam_appid || game.appId || game.name || game.title || '');

const getPlaytime = (game = {}) => Number(game.time_played || game.playtime || game.playtimeMinutes || 0);

const getRating = (game = {}) => Number(game.userRating || game.rating || game.score || 0);

const getGenres = (game = {}) =>
  Array.isArray(game.genres) ? game.genres.filter((genre) => genre && genre !== 'Unknown') : [];

const buildTasteProfile = (library = []) => {
  const genreScores = new Map();
  const anchors = [];

  library.forEach((game) => {
    const playtime = getPlaytime(game);
    const rating = getRating(game);
    const weight = Math.max(1, Math.min(20, Math.round(playtime / 60) + rating));

    if (playtime <= 0 && rating <= 0) return;

    getGenres(game).forEach((genre) => {
      genreScores.set(genre, (genreScores.get(genre) || 0) + weight);
    });

    anchors.push({
      name: game.name || game.title || 'Played game',
      weight,
      genres: getGenres(game),
      platform: game.platform || null,
    });
  });

  const topGenres = [...genreScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre]) => genre);
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
  } catch {
    /* identity optional */
  }

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
  } catch {
    /* behavior profile optional */
  }

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
  } catch {
    /* ratings optional */
  }

  return {
    topGenres,
    topAnchors,
    signatureGames,
    tasteClusters,
    genreCompletionRates,
    topRatedGenres,
    familiarityProfiles,
  };
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
    const maxPrice = filters && typeof filters.maxPrice === 'number' && filters.maxPrice > 0 ? filters.maxPrice : null;
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
    const availableGenres = [...new Set(unowned.flatMap((item) => resolveItemGenres(item)))].sort();

    if (!enabled) {
      return {
        enabled,
        entries: [],
        candidateCount: candidates.length,
        availableGenres,
        appliedFilters: { genre: genreFilter, maxPrice },
        message:
          'Buy Recommendations are off. Enable them in Settings to rank wishlist ideas using local play history.',
      };
    }

    let filteredOutCount = 0;

    // Hoist invariant lookups out of the per-candidate loop for performance.
    // These calls hit localStorage / session history and were previously
    // re-executed for every wishlist item.
    let cachedFocus = null;
    try {
      cachedFocus = RecommendationEngine.getCurrentPlayFocus();
    } catch {
      cachedFocus = null;
    }
    let cachedPersona = null;
    try {
      cachedPersona = GamingIdentity.getProfile().gamingPersona?.primaryPersona || null;
    } catch {
      cachedPersona = null;
    }
    let cachedRecentIdentity = null;
    try {
      cachedRecentIdentity = GamingPersonaService.getPublicIdentity({ windowDays: 14 });
    } catch {
      cachedRecentIdentity = null;
    }

    // Unplayed owned games power both the per-entry "you already own this
    // space" line and the backlog fallback when nothing on the wishlist earns
    // a strong recommendation.
    const unplayedLibrary = (library || []).filter((game) => game && isGameUnplayed(game));

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
          time_played: 0,
        };
        const genres = getGenres(gameLike);
        const genreMatches = genres.filter((genre) => tasteProfile.topGenres.includes(genre));
        const threshold = item.threshold;
        const historicalLow = item.historicalLow?.price;
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
              familiarityReason = `Squarely in the genres you already know — ${familiarMatches.join(', ')}.`;
            }
          } else if (familiarityBias === 'fresh') {
            // Fresh: matches genres from unexplored library games, OR genres
            // not in the familiar profile (expanding horizons).
            const freshMatches = itemGenres.filter((g) => fp.freshGenres.includes(g));
            const novelMatches = itemGenres.filter((g) => !fp.familiarGenres.includes(g));
            if (freshMatches.length > 0 || novelMatches.length > 0) {
              familiarityMatch = true;
              const freshList = freshMatches.length > 0 ? freshMatches : novelMatches;
              familiarityReason = `A step outside your usual genres — ${freshList.join(', ')}.`;
            }
          }
        }

        // Taste cluster match: does this game's name/genres match any of the
        // player's emergent taste clusters (e.g. Souls-like, Survival Architect)?
        const matchedClusters = (tasteProfile.tasteClusters || []).filter((cluster) => {
          if (!cluster || !Array.isArray(cluster.gameNames)) return false;
          // Check if the wishlist item's name matches any game in the cluster,
          // or if its genres overlap with the cluster's games' genres.
          return (
            cluster.gameNames.some((n) => normalizeName(n) === normalizeName(item.name)) ||
            itemGenres.some((g) => {
              const clusterGenres = cluster.gameNames
                .map((n) => {
                  const sig = (tasteProfile.signatureGames || []).find((s) => s.name === n);
                  return sig?.genres || [];
                })
                .flat();
              return clusterGenres.includes(g);
            })
          );
        });

        // Genre completion rate: does the user actually *finish* games in this genre?
        const completionBoostGenres = genreMatches.filter((g) => (tasteProfile.genreCompletionRates || {})[g] >= 60);

        // Top-rated genre overlap: genres where the user's highest-rated games cluster
        const ratedGenreMatches = genres.filter((g) => (tasteProfile.topRatedGenres || []).includes(g));

        // Signature game genre overlap: does this game share genres with the
        // player's signature games?
        const sigGenres = new Set((tasteProfile.signatureGames || []).flatMap((s) => s.genres || []));
        const signatureGenreMatches = genres.filter((g) => sigGenres.has(g));

        let buyScore = 35; // lower base to create more differentiation
        buyScore += genreMatches.length * 10;
        buyScore += signatureGenreMatches.length * 8; // games sharing genres with your signature titles
        if (underBudget) buyScore += 8;
        if (typeof price === 'number' && typeof threshold === 'number' && price <= threshold) buyScore += 18;
        if (typeof price === 'number' && typeof historicalLow === 'number' && price <= historicalLow) buyScore += 12;
        if (item.notes) buyScore += 5;
        // Identity-driven boosts
        if (matchedClusters.length > 0) buyScore += 15; // strong: matches an emergent taste pattern
        if (completionBoostGenres.length > 0) buyScore += 10; // you finish games in this genre
        if (ratedGenreMatches.length > 0) buyScore += 8; // you rate games in this genre highly
        if (familiarityMatch) buyScore += 28; // strong preference for familiar/fresh genre matches

        // Current play focus boost — if the user is on a streak with a game,
        // wishlist items sharing those genres are more relevant right now.
        let focusReason = null;
        try {
          const focus = cachedFocus;
          if (focus?.active && focus.genres.length > 0) {
            const focusGenreMatches = genres.filter((g) =>
              focus.genres.some((fg) => fg.toLowerCase() === String(g).toLowerCase())
            );
            if (focusGenreMatches.length > 0) {
              buyScore += Math.min(10, focusGenreMatches.length * 5);
              focusReason = `Same lane as your current ${focus.primary?.name || 'rotation'} run.`;
            }
          }
        } catch {
          /* focus optional */
        }

        // Memeish gaming persona affinity boost — sourced from the canonical
        // GamingPersonaService affinity map so buy recs stay in lockstep with
        // the persona/roast shown everywhere else in the app.
        let personaReason = null;
        try {
          const persona = cachedPersona;
          if (persona) {
            const affinityGenres = GamingPersonaService.getAffinityGenres(persona.id);
            const personaMatches = genres.filter((g) => affinityGenres.includes(g));
            if (personaMatches.length > 0) {
              buyScore += Math.min(12, personaMatches.length * 6);
              personaReason = `Fits your ${persona.label.toLowerCase()} tastes.`;
            }
          }
        } catch {
          /* persona optional */
        }

        // Recent play focus genre boost — separate from the current-streak
        // reason above, this reflects the *persona's* recent-window read of
        // the player's taste (last 14 days), keeping buy recs aligned with
        // whatever "Recent" identity view the player sees on their profile.
        try {
          const recentIdentity = cachedRecentIdentity;
          const recentGenres = recentIdentity?.affinityGenres || [];
          const recentMatches = genres.filter(
            (g) => recentGenres.includes(g) && !(tasteProfile.topGenres || []).includes(g)
          );
          if (recentMatches.length > 0) {
            buyScore += Math.min(8, recentMatches.length * 4);
          }
        } catch {
          /* recent identity optional */
        }

        // buyScore stays unclamped: it orders the shortlist internally and is
        // never surfaced as a percentage.
        buyScore = Math.max(0, buyScore);

        const priceFormatted =
          item.currentPrice?.priceFormatted || (typeof price === 'number' ? `$${price.toFixed(2)}` : null);

        const priceAlert = typeof price === 'number' && typeof threshold === 'number' && price <= threshold;
        const atHistoricalLow =
          typeof price === 'number' && typeof historicalLow === 'number' && price <= historicalLow;
        const topGenreMatches = genreMatches.filter(
          (genre) => genre === tasteProfile.topGenres[0] || genre === tasteProfile.topGenres[1]
        );

        // Strong evidence: signals that actually argue for the purchase.
        const evidence = [];
        if (matchedClusters.length > 0) evidence.push('cluster');
        if (signatureGenreMatches.length > 0) evidence.push('signature-genre');
        if (completionBoostGenres.length > 0) evidence.push('finish-rate');
        if (topGenreMatches.length > 0) evidence.push('top-genre');
        if (priceAlert) evidence.push('price-alert');
        if (atHistoricalLow) evidence.push('historical-low');
        if (focusReason) evidence.push('focus');
        const conviction = evidence.length >= 2 ? 'strong' : 'weak';

        // An unplayed owned game in the same space is the honest counterpoint.
        const ownedAlternative = unplayedLibrary.reduce((best, owned) => {
          const shared = getGenres(owned).filter((genre) => genres.includes(genre));
          if (shared.length === 0) return best;
          if (!best || shared.length > best.sharedGenres.length) {
            return {
              name: owned.name || owned.title || 'A library game',
              appid: owned.appid ?? null,
              sharedGenres: shared,
              game: owned,
            };
          }
          return best;
        }, null);

        // Reasons are emitted in priority order so the first one can headline
        // the card; `primary: false` entries stay available for the wishlist
        // list but never lead.
        const reasonStack = [
          atHistoricalLow && priceFormatted
            ? { primary: true, text: `It's ${priceFormatted} — the lowest price we've seen for it.` }
            : priceAlert && priceFormatted
              ? { primary: true, text: `It's ${priceFormatted} — below your $${threshold.toFixed(2)} alert.` }
              : null,
          matchedClusters.length > 0
            ? {
                primary: true,
                text: `Fits the same groove as ${matchedClusters[0].gameNames.slice(0, 2).join(' and ')}.`,
              }
            : null,
          completionBoostGenres.length > 0
            ? {
                primary: true,
                text: `You actually finish ${completionBoostGenres[0]} games — ${tasteProfile.genreCompletionRates[completionBoostGenres[0]]}% of the time.`,
              }
            : null,
          signatureGenreMatches.length > 0
            ? {
                primary: true,
                text: `Shares ${signatureGenreMatches.slice(0, 2).join(' and ')} with your most-played games.`,
              }
            : null,
          focusReason ? { primary: true, text: focusReason } : null,
          topGenreMatches.length > 0
            ? { primary: true, text: `Sits right in your ${topGenreMatches.join(' / ')} lane.` }
            : null,
          genreMatches.length > topGenreMatches.length
            ? {
                primary: false,
                text: `Also touches ${genreMatches.filter((genre) => !topGenreMatches.includes(genre)).join(', ')}.`,
              }
            : null,
          familiarityReason ? { primary: true, text: familiarityReason } : null,
          personaReason ? { primary: true, text: personaReason } : null,
          ratedGenreMatches.length > 0
            ? { primary: false, text: `Your highest-rated games lean ${ratedGenreMatches[0]}.` }
            : null,
          underBudget ? { primary: false, text: `Inside your $${maxPrice} budget.` } : null,
          item.notes ? { primary: false, text: 'You left a note on it.' } : null,
        ].filter(Boolean);

        const primaryReason =
          (reasonStack.find((reason) => reason.primary) || {}).text ||
          "It's on your wishlist and nothing argues against it.";
        const reasons = reasonStack.map((reason) => reason.text);
        if (reasons.length === 0) {
          reasons.push(primaryReason);
        }

        const entry = RecommendationEngine.buildRecommendationEntry(
          gameLike,
          'buy-recommendation',
          null,
          genreMatches[0] || genres[0] || tasteProfile.topGenres[0] || null,
          null,
          {
            buyScore,
            buyReasons: reasons,
            primaryReason,
            evidence,
            conviction,
            ownedAlternative,
            wishlistItem: item,
          }
        );

        if (entry) {
          entry.explanation = {
            ...(typeof entry.explanation === 'object' && entry.explanation ? entry.explanation : {}),
            reasons,
            previewReasons: reasons.slice(0, 3),
            fullExplanation: reasons.join('\n'),
            summary: primaryReason,
          };
        }

        return entry;
      })
      .filter(Boolean)
      .sort((left, right) => Number(right.meta?.buyScore || 0) - Number(left.meta?.buyScore || 0));

    // Diversity pass: penalize entries whose primary genre is already
    // represented by a higher-ranked pick. This prevents the top 3 from
    // all being the same genre, giving the user a more varied shortlist.
    // It applies to the raw (unclamped) score, so it actually differentiates.
    const DIVERSITY_PENALTY = 8;
    const seenGenres = new Set();
    const diversified = entries.map((entry) => {
      const primaryGenre = entry.genre || entry.game?.genres?.[0] || null;
      let adjustedScore = entry.meta?.buyScore || 0;
      if (primaryGenre && seenGenres.has(primaryGenre)) {
        adjustedScore = Math.max(0, adjustedScore - DIVERSITY_PENALTY);
        return {
          ...entry,
          meta: {
            ...entry.meta,
            buyScore: adjustedScore,
          },
        };
      }
      if (primaryGenre) seenGenres.add(primaryGenre);
      return entry;
    });

    // Strong picks surface before weak ones, then raw score breaks ties.
    const allEntries = diversified.sort((left, right) => {
      const leftStrong = left.meta?.conviction === 'strong' ? 1 : 0;
      const rightStrong = right.meta?.conviction === 'strong' ? 1 : 0;
      if (leftStrong !== rightStrong) return rightStrong - leftStrong;
      return Number(right.meta?.buyScore || 0) - Number(left.meta?.buyScore || 0);
    });
    const finalEntries = allEntries.slice(0, MAX_RESULTS);
    const strongCount = allEntries.filter((entry) => entry.meta?.conviction === 'strong').length;

    // When nothing on the wishlist earns a strong pick, point at the unplayed
    // owned game closest to the player's top genres instead.
    let backlogFallback = null;
    if (strongCount === 0 && unplayedLibrary.length > 0) {
      const topGenres = tasteProfile.topGenres || [];
      let best = null;
      unplayedLibrary.forEach((game) => {
        const shared = getGenres(game).filter((genre) => topGenres.includes(genre));
        if (shared.length === 0) return;
        const weight = shared.reduce((sum, genre) => sum + (topGenres.length - topGenres.indexOf(genre)), 0);
        if (!best || weight > best.weight) {
          best = { game, sharedGenres: shared, weight };
        }
      });
      if (best) {
        backlogFallback = {
          game: best.game,
          sharedGenres: best.sharedGenres,
          reason: `Unplayed, and it sits right in your ${best.sharedGenres.slice(0, 2).join(' / ')} lane.`,
        };
      }
    }

    const hasActiveFilter = Boolean(genreFilter || maxPrice);

    return {
      enabled,
      entries: finalEntries,
      allEntries,
      strongCount,
      backlogFallback,
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
        recommendedGameIds: entries.map((entry) => getGameId(entry.game)).filter(Boolean),
      },
      message:
        finalEntries.length > 0
          ? strongCount === 0
            ? 'Nothing on your wishlist is calling yet — you might not be ready to buy.'
            : 'Ranked from your wishlist and what you actually play.'
          : hasActiveFilter
            ? 'No wishlist games match these filters. Try a different genre or a higher price.'
            : backlogFallback
              ? 'Nothing on your wishlist is calling yet — you might not be ready to buy.'
              : 'Add games to Wishlist to let GamePilot rank what may be worth buying next.',
    };
  }
}

export default BuyRecommendationService;
