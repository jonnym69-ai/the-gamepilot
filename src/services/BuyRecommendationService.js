import StorageService from './StorageService';
import { RecommendationEngine } from './RecommendationEngine';

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

  static getSnapshot(library = [], wishlistItems = []) {
    const enabled = this.isEnabled();
    const ownedNames = new Set((library || []).map((game) => normalizeName(game.name || game.title)));
    const candidates = Array.isArray(wishlistItems) ? wishlistItems : [];
    const tasteProfile = buildTasteProfile(library || []);

    if (!enabled) {
      return {
        enabled,
        entries: [],
        candidateCount: candidates.length,
        message: 'Buy Recommendations are off. Enable them in Settings to rank wishlist ideas using local play history.'
      };
    }

    const entries = candidates
      .filter((item) => item?.name && !ownedNames.has(normalizeName(item.name)))
      .map((item) => {
        const gameLike = {
          name: item.name,
          title: item.name,
          appid: item.appid || item.key,
          platform: item.platform || 'Wishlist',
          genres: Array.isArray(item.genres) ? item.genres : [],
          time_played: 0
        };
        const genres = getGenres(gameLike);
        const genreMatches = genres.filter((genre) => tasteProfile.topGenres.includes(genre));
        const platformMatch = gameLike.platform && tasteProfile.topPlatforms.includes(gameLike.platform);
        const price = item.currentPrice?.price;
        const threshold = item.threshold;
        const historicalLow = item.historicalLow?.price;
        let buyScore = 45;
        buyScore += genreMatches.length * 12;
        if (platformMatch) buyScore += 8;
        if (typeof price === 'number' && typeof threshold === 'number' && price <= threshold) buyScore += 18;
        if (typeof price === 'number' && typeof historicalLow === 'number' && price <= historicalLow) buyScore += 12;
        if (item.notes) buyScore += 5;
        buyScore = Math.max(0, Math.min(100, buyScore));

        const reasons = [
          genreMatches.length > 0 ? `Matches your strongest local genre signals: ${genreMatches.join(', ')}` : null,
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

    return {
      enabled,
      entries,
      candidateCount: candidates.length,
      topGenres: tasteProfile.topGenres,
      topAnchors: tasteProfile.topAnchors,
      tracking: {
        recommendationType: 'buy-recommendation',
        recommendedGameIds: entries.map((entry) => getGameId(entry.game)).filter(Boolean)
      },
      message: entries.length > 0
        ? 'Local buy recommendations ranked from your wishlist, owned-library taste, and cached price context.'
        : 'Add games to Wishlist to let GamePilot rank what may be worth buying next.'
    };
  }
}

export default BuyRecommendationService;
