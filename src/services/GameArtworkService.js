import { PLATFORM_COLORS, PLATFORM_ICONS } from '../constants/PlatformConstants';

const STEAM_VARIANTS = Object.freeze({
  library_card: 'capsule_231x87.jpg',
  recommendation_card: 'capsule_616x353.jpg',
  profile_icon: 'capsule_184x69.jpg',
  hero: 'header.jpg',
  wide: 'capsule_616x353.jpg',
  // Steam desktop library vertical cover (same art Steam's library grid uses)
  portrait: 'library_600x900.jpg',
  bigscreen: 'library_600x900.jpg',
  library_portrait: 'library_600x900.jpg'
});

const PORTRAIT_SURFACES = new Set(['portrait', 'bigscreen', 'library_portrait']);

const SURFACE_DIMENSIONS = Object.freeze({
  library_card: { width: 231, height: 87 },
  recommendation_card: { width: 616, height: 353 },
  profile_icon: { width: 64, height: 64 },
  hero: { width: 616, height: 353 },
  wide: { width: 616, height: 353 },
  portrait: { width: 600, height: 900 },
  bigscreen: { width: 600, height: 900 },
  library_portrait: { width: 600, height: 900 }
});

const isLandscapeSteamAsset = (url = '') => {
  const value = String(url).toLowerCase();
  return (
    value.includes('header')
    || value.includes('capsule')
    || value.includes('616x353')
    || value.includes('460x215')
    || value.includes('231x87')
    || value.includes('184x69')
  );
};

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
  const preferPortrait = PORTRAIT_SURFACES.has(surface) || options.preferPortrait === true;
  const steamAppId = resolveSteamAppId(game);
  const coverOverride = normalizeCandidate(game.coverArtOverride);

  // Custom cover always wins.
  if (coverOverride) {
    return coverOverride;
  }

  // TV / library portrait surfaces should use Steam's vertical library art
  // instead of landscape headers/capsules (which look cropped in 2:3 frames).
  if (preferPortrait && steamAppId) {
    return getSteamArtworkUrl(steamAppId, 'portrait');
  }

  const candidates = [
    game.header_image,
    game.headerImage,
    game.image,
    game.thumbnail,
    game.capsule_image,
    game.capsuleImage,
    game.coverImage,
    game.library_capsule,
    game.libraryCapsule,
    game.iconUrl,
    game.icon,
    game.logo
  ].map(normalizeCandidate).filter(Boolean);

  if (preferPortrait) {
    const portraitCandidate = candidates.find((url) => !isLandscapeSteamAsset(url));
    if (portraitCandidate) {
      return portraitCandidate;
    }
  } else if (candidates.length > 0) {
    return candidates[0];
  }

  if (steamAppId) {
    return getSteamArtworkUrl(steamAppId, surface);
  }

  return candidates[0] || '';
};

const escapeSvgText = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

// Placeholder art is generated inline as an SVG data URI so blank tiles render
// with zero network calls — the app stays fully usable offline.
export const getGameArtworkPlaceholder = (options = {}) => {
  const game = options.game || {};
  const surface = options.surface || 'library_card';
  const platform = options.platform || resolvePlatform(game);
  const icon = options.icon || PLATFORM_ICONS[platform] || PLATFORM_ICONS.Unknown || '?';
  const fallbackColor = PLATFORM_COLORS[platform] || PLATFORM_COLORS.Unknown || '#666666';
  const dimensions = SURFACE_DIMENSIONS[surface] || SURFACE_DIMENSIONS.library_card;
  const width = options.width || dimensions.width;
  const height = options.height || dimensions.height;
  const fontSize = Math.max(12, Math.round(Math.min(width, height) * 0.42));

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img"><rect width="${width}" height="${height}" fill="${fallbackColor}"/><rect width="${width}" height="${height}" fill="rgba(0,0,0,0.28)"/><text x="50%" y="52%" fill="rgba(255,255,255,0.92)" font-family="'Segoe UI Emoji','Segoe UI',Arial,sans-serif" font-size="${fontSize}" text-anchor="middle" dominant-baseline="central">${escapeSvgText(icon)}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

// A game "misses" cover art when nothing can be resolved for it: no custom
// override, no stored image URL, and no Steam appid to build a CDN link from.
export const hasMissingCoverArt = (game) => {
  if (!game || typeof game !== 'object') {
    return true;
  }
  try {
    return !resolveGameArtwork(game);
  } catch {
    return true;
  }
};

// Reads a local image file and downscales it to a compact JPEG data URI so
// custom covers work fully offline without bloating local storage. Falls back
// to the raw data URI if canvas processing is unavailable.
export const fileToCoverDataUri = (file, { maxDimension = 600, quality = 0.82 } = {}) => new Promise((resolve, reject) => {
  if (!file || !/^image\//i.test(String(file.type || ''))) {
    reject(new Error('Please pick an image file.'));
    return;
  }

  const reader = new FileReader();
  reader.onerror = () => reject(new Error('Could not read the selected file.'));
  reader.onload = () => {
    const rawUri = String(reader.result || '');
    if (!rawUri.startsWith('data:')) {
      reject(new Error('Could not read the selected file.'));
      return;
    }

    const image = new Image();
    image.onerror = () => reject(new Error('Could not load the selected image.'));
    image.onload = () => {
      try {
        const longest = Math.max(image.naturalWidth || 0, image.naturalHeight || 0);
        const scale = longest > maxDimension ? maxDimension / longest : 1;
        const width = Math.max(1, Math.round((image.naturalWidth || maxDimension) * scale));
        const height = Math.max(1, Math.round((image.naturalHeight || maxDimension) * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) {
          resolve(rawUri);
          return;
        }
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch {
        resolve(rawUri);
      }
    };
    image.src = rawUri;
  };
  reader.readAsDataURL(file);
});

export const getArtworkForSurface = (game = {}, surface = 'library_card') => {
  const src = resolveGameArtwork(game, { surface });
  const placeholder = getGameArtworkPlaceholder({ game, surface });

  return {
    src,
    placeholder
  };
};

/**
 * One-call artwork bundle for game cards: primary artwork for the surface, an
 * optional fallback URL (e.g. landscape hero art when portrait cover art is
 * missing on the CDN), and the surface-matched placeholder. Consolidates the
 * resolve + fallback + placeholder boilerplate previously repeated across
 * Home.js and HomeDashboardSections.js. Returns nulls for a falsy game so
 * call sites don't need their own guards.
 */
export const resolveGameArtworkBundle = (game, { surface = 'portrait', fallbackSurface = null } = {}) => {
  if (!game) {
    return { artwork: null, fallbackSrc: undefined, placeholder: null };
  }
  const artwork = resolveGameArtwork(game, { surface }) || null;
  const fallbackArtwork = fallbackSurface ? resolveGameArtwork(game, { surface: fallbackSurface }) : null;

  return {
    artwork,
    fallbackSrc: fallbackArtwork && fallbackArtwork !== artwork ? fallbackArtwork : undefined,
    placeholder: getGameArtworkPlaceholder({ game, surface })
  };
};
