import StorageService from './StorageService';

const EPIC_CACHE_KEY = 'epicFreeGameRadarCacheV1';
let epicInflight = null;

export const getEpicOfferState = (game, now = Date.now()) => {
  const start = Date.parse(game?.startDate);
  const end = Date.parse(game?.endDate);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end <= now) return 'expired';
  return start > now ? 'upcoming' : 'available';
};
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
    .filter((element) => element?.id && typeof element.title === 'string')
    .map((element) => {
      const groups = [
        ...(Array.isArray(element.promotions?.promotionalOffers) ? element.promotions.promotionalOffers : []),
        ...(Array.isArray(element.promotions?.upcomingPromotionalOffers)
          ? element.promotions.upcomingPromotionalOffers
          : []),
      ];
      const offer = groups
        .flatMap((group) => (Array.isArray(group?.promotionalOffers) ? group.promotionalOffers : []))
        .filter((item) => item?.discountSetting?.discountPercentage === 0 && getEpicOfferState(item) !== 'expired')
        .sort((a, b) => Date.parse(a.startDate) - Date.parse(b.startDate))[0];
      if (!offer) return null;
      const mysteryGame = isMysteryGame(element);
      const mappings = element.catalogNs?.mappings || element.offerMappings;
      const mapping = Array.isArray(mappings) ? mappings.find((item) => item?.pageSlug) : null;
      const slug = String(mapping?.pageSlug || element.productSlug || '').replace(/\/home$/, '');

      return {
        id: `epic-${element.id}`,
        title: element.title,
        description: element.description,
        image:
          element.keyImages?.find((img) => img.type === 'DieselStoreFrontWide')?.url ||
          element.keyImages?.[0]?.url ||
          '',
        url:
          !mysteryGame && /^[a-z0-9][a-z0-9-]*$/i.test(slug)
            ? `https://store.epicgames.com/p/${slug}`
            : EPIC_FREE_GAMES_URL,
        isMysteryGame: mysteryGame,
        startDate: offer?.startDate,
        endDate: offer?.endDate,
        source: 'Epic',
        platformIcon: '🎮',
      };
    })
    .filter(Boolean)
    .sort((a, b) => Date.parse(a.startDate) - Date.parse(b.startDate));
};

const fetchEpicFreeGames = async (forceRefresh) =>
  (await FreeGameRadar.getEpicRadar({ forceRefresh })).games.filter((game) => getEpicOfferState(game) === 'available');

const normalizeSteamFreeGame = (item, type = 'free-to-play') => {
  const id = item.id || item.appid || item.steam_appid;
  if (!id) return null;

  const discount = Number(item.discount_percent || item.discount || 0);
  const isFreeToKeep = discount >= 100 || item.is_free_weekend || item.is_free_to_keep;
  const endDate = item.discount_expiration ? new Date(item.discount_expiration * 1000).toISOString() : null;

  return {
    id: `steam-${id}`,
    title: item.name || 'Unknown Game',
    description:
      item?.short_description ||
      (type === 'free-to-keep'
        ? 'Free to keep on Steam for a limited time'
        : type === 'free-weekend'
          ? 'Free to play this weekend on Steam'
          : 'Free to play on Steam'),
    image: item?.small_capsule_image || item?.header_image || item?.large_capsule_image || '',
    url: `https://store.steampowered.com/app/${id}`,
    isMysteryGame: false,
    startDate: null,
    endDate,
    source: 'Steam',
    platformIcon: '☁️',
    type: isFreeToKeep ? 'free-to-keep' : type,
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
      const normalized = normalizeSteamFreeGame(item, item.is_free_weekend ? 'free-weekend' : 'free-to-keep');
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
    type: 'free-to-keep',
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
  async getEpicRadar({ forceRefresh = false } = {}) {
    const cached = StorageService.get(EPIC_CACHE_KEY, null);
    const validCache = Array.isArray(cached?.games) && Number.isFinite(cached?.checkedAt);
    const games = validCache ? cached.games.filter((game) => getEpicOfferState(game) !== 'expired') : [];
    const age = Date.now() - cached?.checkedAt;
    if (!forceRefresh && validCache && age >= 0 && age < CACHE_TTL) {
      return { games, checkedAt: cached.checkedAt, stale: false, error: '' };
    }
    if (epicInflight) return epicInflight;
    epicInflight = Promise.resolve()
      .then(async () => {
        const api = typeof window !== 'undefined' && window.electronAPI?.epicFreeGames;
        try {
          if (!api) throw new Error('Live Epic offers are available in the desktop app.');
          const result = await api();
          if (!result?.ok || !Array.isArray(result.elements)) throw new Error('Epic offers could not be refreshed.');
          const next = { games: normalizeEpicGames(result.elements), checkedAt: Date.now() };
          StorageService.set(EPIC_CACHE_KEY, next);
          return { ...next, stale: false, error: '' };
        } catch (error) {
          return { games, checkedAt: validCache ? cached.checkedAt : null, stale: true, error: error.message };
        }
      })
      .finally(() => {
        epicInflight = null;
      });
    return epicInflight;
  },

  async getFreeGames({ forceRefresh = false } = {}) {
    const cached = StorageService.get(CACHE_KEY, null);
    const now = Date.now();

    if (!forceRefresh && cached && now - cached.timestamp < CACHE_TTL) {
      return cached.games;
    }

    const [epicGames, steamGames, gogGames] = await Promise.all([
      fetchEpicFreeGames(forceRefresh),
      fetchSteamFreeGames(),
      fetchGOGFreeGames(),
    ]);

    const allGames = [...epicGames, ...steamGames, ...gogGames].sort((a, b) => {
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
