import StorageService from './StorageService';

const EPIC_FEED_URL = 'https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=en-US&country=US&allowCountries=US';
const EPIC_FREE_GAMES_URL = 'https://store.epicgames.com/free-games';
const CACHE_KEY = 'freeGameRadarCache';
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
        id: element.id,
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
  const response = await fetch(EPIC_FEED_URL);
  if (!response.ok) {
    throw new Error('Failed to fetch Epic free games');
  }
  const data = await response.json();
  const elements = data?.data?.Catalog?.searchStore?.elements || [];
  return normalizeEpicGames(elements);
};

export const FreeGameRadar = {
  async getFreeGames({ forceRefresh = false } = {}) {
    const cached = StorageService.get(CACHE_KEY, null);
    const now = Date.now();

    if (!forceRefresh && cached && now - cached.timestamp < CACHE_TTL) {
      return cached.games;
    }

    const epicGames = await fetchEpicFreeGames();
    const games = epicGames.sort((a, b) => new Date(a.endDate || 0) - new Date(b.endDate || 0));

    StorageService.set(CACHE_KEY, { timestamp: now, games });
    return games;
  },
};
