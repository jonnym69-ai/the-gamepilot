import StorageService from './StorageService';

const EPIC_FEED_URL = 'https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=en-US&country=US&allowCountries=US';
const EPIC_FREE_GAMES_URL = 'https://store.epicgames.com/free-games';
const STEAM_FEATURED_URL = 'https://store.steampowered.com/api/featuredcategories/';
const GOG_FREEBIES_URL = 'https://www.gog.com/games/ajax/filtered?priceRange=0,0&discounted=true&page=1';
const CACHE_KEY = 'freeGameRadarCacheV2';
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

const isMysteryGame = (element = {}) => {
  const title = String(element.title || '').toLowerCase();
  const slug = String(element.productSlug || '').toLowerCase();
  return title.includes('mystery') || slug.includes('mystery');
};

const normalizeEpicGames = (elements = []) => {
  return elements
    .filter((element) => {
      const price = element?.price?.totalPrice;
      const promotions = element?.promotions;
      if (!price || !promotions) return false;
      const isFree = price.discountPrice === 0;
      const hasFreePromo = promotions?.promotionalOffers?.some((group) =>
        group.promotionalOffers?.some((offer) => offer.discountSetting?.discountPercentage === 0)
      );
      return isFree || hasFreePromo;
    })
    .map((element) => {
      const offer = element?.promotions?.promotionalOffers?.[0]?.promotionalOffers?.[0] ||
        element?.promotions?.upcomingPromotionalOffers?.[0]?.promotionalOffers?.[0];
      const mysteryGame = isMysteryGame(element);

      return {
        id: `epic-${element.id}`,
        title: element.title,
        description: element.description,
        image: element.keyImages?.find((img) => img.type === 'DieselStoreFrontWide')?.url ||
          element.keyImages?.[0]?.url || '',
        url: !mysteryGame && element.productSlug
          ? `https://store.epicgames.com/p/${element.productSlug}`
          : EPIC_FREE_GAMES_URL,
        isMysteryGame: mysteryGame,
        startDate: offer?.startDate,
        endDate: offer?.endDate,
        source: 'Epic',
        platformIcon: '🎮'
      };
    });
};

const fetchEpicFreeGames = async () => {
  try {
    const response = await fetch(EPIC_FEED_URL);
    if (!response.ok) return [];
    const data = await response.json();
    const elements = data?.data?.Catalog?.searchStore?.elements || [];
    return normalizeEpicGames(elements);
  } catch {
    return [];
  }
};

const normalizeSteamFreeGame = (item, type = 'free-to-play') => {
  const id = item.id || item.appid || item.steam_appid;
  if (!id) return null;

  const discount = Number(item.discount_percent || item.discount || 0);
  const isFreeToKeep = discount >= 100 || item.is_free_weekend || item.is_free_to_keep;
  const endDate = item.discount_expiration
    ? new Date(item.discount_expiration * 1000).toISOString()
    : null;

  return {
    id: `steam-${id}`,
    title: item.name || 'Unknown Game',
    description: item?.short_description || (
      type === 'free-to-keep'
        ? 'Free to keep on Steam for a limited time'
        : type === 'free-weekend'
          ? 'Free to play this weekend on Steam'
          : 'Free to play on Steam'
    ),
    image: item?.small_capsule_image || item?.header_image || item?.large_capsule_image || '',
    url: `https://store.steampowered.com/app/${id}`,
    isMysteryGame: false,
    startDate: null,
    endDate,
    source: 'Steam',
    platformIcon: '☁️',
    type: isFreeToKeep ? 'free-to-keep' : type
  };
};

const fetchSteamFreeGames = async () => {
  try {
    const response = await fetch(STEAM_FEATURED_URL);
    if (!response.ok) return [];
    const data = await response.json();
    const results = [];

    // Permanently free-to-play games
    const freeGames = data?.freegames?.items || data?.free_games?.items || [];
    for (const item of freeGames) {
      const normalized = normalizeSteamFreeGame(item, 'free-to-play');
      if (normalized) results.push(normalized);
    }

    // Specials with 100% discount = free-to-keep or free weekend
    const specials = data?.specials?.items || [];
    for (const item of specials) {
      const discount = Number(item.discount_percent || item.discount || 0);
      const isFree = discount >= 100 || item.is_free_weekend || item.is_free_to_keep;
      if (!isFree) continue;
      const normalized = normalizeSteamFreeGame(
        item,
        item.is_free_weekend ? 'free-weekend' : 'free-to-keep'
      );
      if (normalized) results.push(normalized);
    }

    // Deduplicate by app id
    const seen = new Set();
    return results.filter((game) => {
      if (seen.has(game.id)) return false;
      seen.add(game.id);
      return true;
    });
  } catch {
    return [];
  }
};

const normalizeGOGProduct = (product) => {
  if (!product) return null;
  const price = product.price || {};
  const isFree = price.isFree === true || price.finalMoney?.amount === 0 || price.final === 0;
  if (!isFree) return null;

  const id = product.id || product.slug;
  if (!id) return null;

  return {
    id: `gog-${id}`,
    title: product.title || 'Unknown Game',
    description: product?.shortDescription || 'Currently free on GOG',
    image: product?.image || product?.coverHorizontal || product?.boxArt || '',
    url: product?.url || `https://www.gog.com/game/${product.slug || id}`,
    isMysteryGame: false,
    startDate: null,
    endDate: null,
    source: 'GOG',
    platformIcon: '🦎',
    type: 'free-to-keep'
  };
};

const fetchGOGFreeGames = async () => {
  try {
    const response = await fetch(GOG_FREEBIES_URL);
    if (!response.ok) return [];
    const data = await response.json();
    const products = data?.products || [];
    const results = [];
    for (const product of products) {
      const normalized = normalizeGOGProduct(product);
      if (normalized) results.push(normalized);
    }
    return results;
  } catch {
    return [];
  }
};

export const FreeGameRadar = {
  async getFreeGames({ forceRefresh = false } = {}) {
    const cached = StorageService.get(CACHE_KEY, null);
    const now = Date.now();

    if (!forceRefresh && cached && now - cached.timestamp < CACHE_TTL) {
      return cached.games;
    }

    const [epicGames, steamGames, gogGames] = await Promise.all([
      fetchEpicFreeGames(),
      fetchSteamFreeGames(),
      fetchGOGFreeGames()
    ]);

    const allGames = [
      ...epicGames,
      ...steamGames,
      ...gogGames
    ].sort((a, b) => {
      // Sort by end date (ending soonest first), then by source
      const endA = a.endDate ? new Date(a.endDate).getTime() : Infinity;
      const endB = b.endDate ? new Date(b.endDate).getTime() : Infinity;
      if (endA !== endB) return endA - endB;
      return a.source.localeCompare(b.source);
    });

    StorageService.set(CACHE_KEY, { timestamp: now, games: allGames });
    return allGames;
  },
};
