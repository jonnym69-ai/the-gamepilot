import StorageService from './StorageService';
import { RecommendationEngine } from './RecommendationEngine';
import { getGameGenres } from '../GameGenreDatabase';

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

  return { topGenres, topPlatforms, topAnchors };
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
        let buyScore = 45;
        buyScore += genreMatches.length * 12;
        if (platformMatch) buyScore += 8;
        if (matchesGenreFilter) buyScore += 10;
        if (underBudget) buyScore += 8;
        if (typeof price === 'number' && typeof threshold === 'number' && price <= threshold) buyScore += 18;
        if (typeof price === 'number' && typeof historicalLow === 'number' && price <= historicalLow) buyScore += 12;
        if (item.notes) buyScore += 5;
        buyScore = Math.max(0, Math.min(100, buyScore));

        const reasons = [
          matchesGenreFilter ? `Matches your chosen genre filter: ${genreFilter}` : null,
          genreMatches.length > 0 ? `Matches your strongest local genre signals: ${genreMatches.join(', ')}` : null,
          underBudget ? `Within your $${maxPrice} budget at its current cached price.` : null,
          platformMatch ? `Fits a launcher/platform you already use often: ${gameLike.platform}` : null,
          typeof price === 'number' && typeof threshold === 'number' && price <= threshold ? 'Current cached price is at or below your wishlist threshold.' : null,
          typeof price === 'number' && typeof historicalLow === 'number' && price <= historicalLow ? 'Cached price is at or below the recorded historical low.' : null,
          item.notes ? 'You already added notes to this wishlist item.' : null
        ].filter(Boolean);

        return RecommendationEngine.buildRecommendationEntry(
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
      })
      .filter(Boolean)
      .sort((left, right) => Number(right.buyScore || 0) - Number(left.buyScore || 0))
      .slice(0, MAX_RESULTS);

    const hasActiveFilter = Boolean(genreFilter || maxPrice);

    return {
      enabled,
      entries,
      candidateCount: candidates.length,
      availableGenres,
      appliedFilters: { genre: genreFilter, maxPrice },
      filteredOutCount,
      topGenres: tasteProfile.topGenres,
      topAnchors: tasteProfile.topAnchors,
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
