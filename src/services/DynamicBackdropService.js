import StorageService from './StorageService';

const CACHE_PREFIX = 'dynamicBackdrop-';
const MAX_CACHE_SIZE = 30;

const clamp = (value, min = 0, max = 255) => Math.max(min, Math.min(max, value));

const hexToRgb = (hex) => {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substr(0, 2), 16);
  const g = parseInt(clean.substr(2, 2), 16);
  const b = parseInt(clean.substr(4, 2), 16);
  return { r: clamp(r), g: clamp(g), b: clamp(b) };
};

const rgbToHex = (r, g, b) => {
  const toHex = (n) => n.toString(16).padStart(2, '0');
  return `#${toHex(clamp(r))}${toHex(clamp(g))}${toHex(clamp(b))}`;
};

const rgbToHsl = (r, g, b) => {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
    case g: h = ((b - r) / d + 2) / 6; break;
    case b: h = ((r - g) / d + 4) / 6; break;
    default: break;
  }
  return { h: h * 360, s, l };
};

const hslToRgb = (h, s, l) => {
  h /= 360;
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  if (s === 0) {
    const val = l * 255;
    return { r: val, g: val, b: val };
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: clamp(hue2rgb(p, q, h + 1 / 3) * 255),
    g: clamp(hue2rgb(p, q, h) * 255),
    b: clamp(hue2rgb(p, q, h - 1 / 3) * 255)
  };
};

const adjustHsl = (hex, { h: dh = 0, s: ds = 0, l: dl = 0 }) => {
  const { r, g, b } = hexToRgb(hex);
  const hsl = rgbToHsl(r, g, b);
  hsl.h = (hsl.h + dh + 360) % 360;
  hsl.s = clamp(hsl.s + ds, 0, 1);
  hsl.l = clamp(hsl.l + dl, 0, 1);
  const next = hslToRgb(hsl.h, hsl.s, hsl.l);
  return rgbToHex(next.r, next.g, next.b);
};

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('Failed to load image'));
  img.src = src;
});

const getPixelBuckets = (data, bucketCount = 8) => {
  const buckets = [];
  for (let i = 0; i < bucketCount; i += 1) {
    buckets.push({ r: 0, g: 0, b: 0, count: 0 });
  }
  const step = 4;
  for (let i = 0; i < data.length; i += step * 8) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 128) continue;
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const bucketIndex = Math.min(bucketCount - 1, Math.floor(luminance * bucketCount));
    buckets[bucketIndex].r += r;
    buckets[bucketIndex].g += g;
    buckets[bucketIndex].b += b;
    buckets[bucketIndex].count += 1;
  }
  return buckets
    .filter((b) => b.count > 0)
    .map((b) => ({
      r: Math.round(b.r / b.count),
      g: Math.round(b.g / b.count),
      b: Math.round(b.b / b.count),
      count: b.count
    }));
};

const extractPaletteFromImage = async (imageUrl) => {
  if (!imageUrl) return null;
  try {
    const img = await loadImage(imageUrl);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const width = 64;
    const height = Math.round((img.naturalHeight / img.naturalWidth) * width) || 64;
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);
    const data = ctx.getImageData(0, 0, width, height).data;
    const buckets = getPixelBuckets(data);
    if (buckets.length === 0) return null;
    const sorted = buckets.sort((a, b) => b.count - a.count);
    const dominant = sorted[0];
    const secondary = sorted[Math.min(1, sorted.length - 1)];
    const accent = sorted[Math.min(2, sorted.length - 1)];
    return {
      dominant: rgbToHex(dominant.r, dominant.g, dominant.b),
      secondary: rgbToHex(secondary.r, secondary.g, secondary.b),
      accent: rgbToHex(accent.r, accent.g, accent.b),
      dark: rgbToHex(dominant.r * 0.3, dominant.g * 0.3, dominant.b * 0.3),
      light: rgbToHex(
        clamp(dominant.r + 80),
        clamp(dominant.g + 80),
        clamp(dominant.b + 80)
      )
    };
  } catch (error) {
    return null;
  }
};

const getCacheKey = (imageUrl) => `${CACHE_PREFIX}${imageUrl}`;

const pruneCache = () => {
  const keys = StorageService.keys()
    .filter((key) => key.startsWith('dynamicBackdrop-'));
  if (keys.length <= MAX_CACHE_SIZE) return;
  const sorted = keys.map((key) => {
    const entry = StorageService.get(key, null);
    return { key, ts: entry?.cachedAt || 0 };
  }).sort((a, b) => a.ts - b.ts);
  const toRemove = sorted.slice(0, sorted.length - MAX_CACHE_SIZE);
  toRemove.forEach((item) => StorageService.remove(item.key));
};

const getCachedPalette = (imageUrl) => {
  const key = getCacheKey(imageUrl);
  const entry = StorageService.get(key, null);
  if (!entry || !entry.palette) return null;
  return entry.palette;
};

const setCachedPalette = (imageUrl, palette) => {
  const key = getCacheKey(imageUrl);
  StorageService.set(key, { palette, cachedAt: Date.now() });
  pruneCache();
};

const DynamicBackdropService = {
  /**
   * Get palette for an image URL, using cache or extracting fresh.
   */
  async getPalette(imageUrl) {
    if (!imageUrl) return null;
    const cached = getCachedPalette(imageUrl);
    if (cached) return cached;
    const palette = await extractPaletteFromImage(imageUrl);
    if (palette) setCachedPalette(imageUrl, palette);
    return palette;
  },

  /**
   * Generate CSS for dynamic backdrop effects.
   */
  generateBackdropCSS(palette, options = {}) {
    if (!palette) return null;
    const {
      mode = 'gradient',
      intensity = 50,
      animationSpeed = 20,
      blur = 0,
      vignette = 40,
      overlayOpacity = 55
    } = options;

    const i = intensity / 100;
    const base = palette.dominant;
    const secondary = palette.secondary;
    const accent = palette.accent;
    const dark = palette.dark;
    const light = palette.light;
    const overlay = Math.round((overlayOpacity / 100) * 255).toString(16).padStart(2, '0');
    const speed = Math.max(3, 60 - animationSpeed);

    const common = {
      '--backdrop-base': base,
      '--backdrop-secondary': secondary,
      '--backdrop-accent': accent,
      '--backdrop-dark': dark,
      '--backdrop-light': light,
      '--backdrop-overlay': `#000000${overlay}`,
      '--backdrop-blur': `${blur}px`,
      '--backdrop-vignette': vignette / 100,
      '--backdrop-animation-speed': `${speed}s`
    };

    if (mode === 'gradient') {
      return {
        ...common,
        '--dynamic-backdrop': `radial-gradient(ellipse at 20% 20%, ${adjustHsl(base, { l: 0.15 * i })} 0%, transparent 50%),
          radial-gradient(ellipse at 80% 80%, ${adjustHsl(secondary, { l: 0.1 * i })} 0%, transparent 50%),
          radial-gradient(ellipse at 50% 50%, ${adjustHsl(accent, { l: -0.1 * i })} 0%, transparent 70%),
          linear-gradient(135deg, ${dark} 0%, ${base} 50%, ${dark} 100%)`,
        '--dynamic-backdrop-size': '200% 200%'
      };
    }

    if (mode === 'mesh') {
      return {
        ...common,
        '--dynamic-backdrop': `
          radial-gradient(at 20% 30%, ${adjustHsl(base, { l: 0.2 * i })} 0%, transparent 40%),
          radial-gradient(at 80% 20%, ${adjustHsl(accent, { l: 0.1 * i })} 0%, transparent 40%),
          radial-gradient(at 40% 80%, ${adjustHsl(secondary, { l: 0.15 * i })} 0%, transparent 40%),
          radial-gradient(at 80% 80%, ${adjustHsl(base, { h: 20, l: 0.1 * i })} 0%, transparent 40%),
          linear-gradient(180deg, ${dark} 0%, ${adjustHsl(dark, { l: 0.05 })} 100%)`
      };
    }

    if (mode === 'aurora') {
      return {
        ...common,
        '--dynamic-backdrop': `
          linear-gradient(125deg, ${dark} 0%, ${adjustHsl(base, { l: -0.05 })} 40%, ${adjustHsl(secondary, { h: -30, l: 0.1 * i })} 60%, ${adjustHsl(accent, { h: 30, l: 0.1 * i })} 80%, ${dark} 100%)`,
        '--dynamic-backdrop-size': '400% 400%'
      };
    }

    if (mode === 'cover') {
      return {
        ...common,
        '--dynamic-backdrop': `linear-gradient(${adjustHsl(dark, { l: 0.1 })} 0%, ${dark} 100%)`
      };
    }

    return common;
  },

  getSettings() {
    return StorageService.get('dynamicBackdropSettings', {
      enabled: false,
      mode: 'gradient',
      intensity: 50,
      animationSpeed: 20,
      blur: 0,
      vignette: 40,
      overlayOpacity: 55,
      source: 'lastPlayed'
    });
  },

  saveSettings(settings) {
    StorageService.set('dynamicBackdropSettings', settings);
  }
};

export default DynamicBackdropService;
export {
  adjustHsl,
  rgbToHsl,
  hslToRgb,
  hexToRgb,
  rgbToHex
};
