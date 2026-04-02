import { PLATFORM_COLORS, PLATFORM_ICONS } from '../constants/PlatformConstants';

const STEAM_VARIANTS = Object.freeze({
  library_card: 'capsule_231x87.jpg',
  recommendation_card: 'capsule_184x69.jpg',
  profile_icon: 'capsule_184x69.jpg',
  hero: 'header.jpg',
  wide: 'capsule_616x353.jpg'
});

const SURFACE_DIMENSIONS = Object.freeze({
  library_card: { width: 231, height: 87 },
  recommendation_card: { width: 184, height: 69 },
  profile_icon: { width: 64, height: 64 },
  hero: { width: 616, height: 353 },
  wide: { width: 616, height: 353 }
});

const resolvePlatform = (game = {}) => game.brandPlatform || game.platform || 'Unknown';

const resolveSteamAppId = (game = {}) => game.appid || game.app_id || game.steamAppId || null;

const getSteamArtworkUrl = (steamAppId, surface = 'library_card') => {
  if (!steamAppId) {
    return '';
  }

  const fileName = STEAM_VARIANTS[surface] || STEAM_VARIANTS.library_card;
  return `https://cdn.akamai.steamstatic.com/steam/apps/${steamAppId}/${fileName}`;
};

const normalizeCandidate = (candidate) => {
  if (typeof candidate !== 'string') {
    return '';
  }

  const normalized = candidate.trim();
  if (!normalized) {
    return '';
  }

  return normalized;
};

export const resolveGameArtwork = (game = {}, options = {}) => {
  const surface = options.surface || 'library_card';

  const candidates = [
    game.header_image,
    game.headerImage,
    game.image,
    game.thumbnail,
    game.capsule_image,
    game.capsuleImage,
    game.coverImage,
    game.iconUrl,
    game.icon,
    game.logo
  ].map(normalizeCandidate).filter(Boolean);

  if (candidates.length > 0) {
    return candidates[0];
  }

  const steamAppId = resolveSteamAppId(game);
  return getSteamArtworkUrl(steamAppId, surface);
};

export const getGameArtworkPlaceholder = (options = {}) => {
  const game = options.game || {};
  const surface = options.surface || 'library_card';
  const platform = options.platform || resolvePlatform(game);
  const icon = options.icon || PLATFORM_ICONS[platform] || PLATFORM_ICONS.Unknown || '?';
  const fallbackColor = PLATFORM_COLORS[platform] || PLATFORM_COLORS.Unknown || '#666666';
  const dimensions = SURFACE_DIMENSIONS[surface] || SURFACE_DIMENSIONS.library_card;
  const width = options.width || dimensions.width;
  const height = options.height || dimensions.height;
  const bgColor = fallbackColor.replace('#', '');

  return `https://placehold.co/${width}x${height}/${bgColor}/ffffff?text=${encodeURIComponent(icon)}`;
};

export const getArtworkForSurface = (game = {}, surface = 'library_card') => {
  const src = resolveGameArtwork(game, { surface });
  const placeholder = getGameArtworkPlaceholder({ game, surface });

  return {
    src,
    placeholder
  };
};
