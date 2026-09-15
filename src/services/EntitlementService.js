import StorageService from './StorageService';

const ENTITLEMENTS_STORAGE_KEY = 'storeEntitlements';
const REDEEMED_CODES_STORAGE_KEY = 'redeemedStoreCodes';

export const SUPPORTER_PRODUCT_ID = 'gamepilot_supporter';
export const PRO_PRODUCT_ID = 'gamepilot_pro';
export const SUPPORTER_FEATURES = Object.freeze([]);

export const FREE_FEATURES = Object.freeze({
  library: { label: 'Library management and launching' },
  tracking: { label: 'Playtime, stats and timeline' },
  recommendations: { label: 'Personalised recommendations' },
  eras: { label: 'Current era and day counter' },
  'signature-titles': { label: 'Game-earned titles and persona' },
  rewards: { label: 'XP, achievements and earned rewards' },
  wishlist: { label: 'Wishlist and price alerts' },
  'save-backup': { label: 'Manual save backup and restore' },
  'data-export': { label: 'Data backup, import and CSV export' },
  'share-cards': { label: 'Basic share cards' },
  'discord-presence': { label: 'Discord Rich Presence' },
  'year-in-review': { label: 'Year in Review' },
  'habits-insights': { label: 'Habits and goals' },
  'performance-cockpit': { label: 'Performance Cockpit' },
  'big-screen-mode': { label: 'Big Screen Mode and Game Bar' },
  'uninstall-planner': { label: 'Individual game uninstall and save-safety tools' },
  customisation: { label: 'Themes, Gaming Links and accessibility controls' },
});

export const PRO_FEATURES = Object.freeze({
  'cinematic-export': {
    label: 'Cinematic exports',
    description: 'Create cinematic posters, square cards and wide banners with theme and background controls.',
  },
  'storage-manager': {
    label: 'Library Reclaimer',
    description: 'Compare installed game sizes and last-played dates to choose what to remove.',
  },
  'recommendation-tuner': {
    label: 'Advanced recommendation tuner',
    description: 'Edit detailed scoring weights for mood, time fit, discovery and replay preferences.',
  },
  'era-archive': {
    label: 'Era archive',
    description: 'Every era you have lived through, dated and ranked — not just the current one.',
  },
  'year-over-year': {
    label: 'Year-over-year history',
    description: 'Compare this year with the same stretch last year — hours, sessions, games and your top title.',
  },
  'pro-themes': {
    label: 'Pro theme collection',
    description: 'Exclusive themes only available in GamePilot Pro.',
  },
});

const PRODUCT_CATALOG = Object.freeze({
  [SUPPORTER_PRODUCT_ID]: {
    id: SUPPORTER_PRODUCT_ID,
    name: 'GamePilot Supporter Recognition',
    description: 'Optional local supporter recognition. It does not control edition access.',
    type: 'supporter-recognition',
    includes: SUPPORTER_FEATURES,
  },
  [PRO_PRODUCT_ID]: {
    id: PRO_PRODUCT_ID,
    name: 'GamePilot Pro',
    description:
      'A separate edition with cinematic exports, Library Reclaimer, advanced recommendation controls, the era archive, year-over-year history and exclusive themes.',
    type: 'edition',
    includes: Object.keys(PRO_FEATURES),
  },
});

const STORE_UNLOCK_CODES = Object.freeze({
  'GP-PRO-FOUNDERS-2026': { productId: SUPPORTER_PRODUCT_ID },
});

const normalizeCode = (code) =>
  String(code || '')
    .trim()
    .toUpperCase();
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

export class EntitlementService {
  static getEdition() {
    return typeof __APP_EDITION__ !== 'undefined' && __APP_EDITION__ === 'pro' ? 'pro' : 'free';
  }

  static getEditionName() {
    return this.isPro() ? 'GamePilot Pro' : 'GamePilot Free';
  }

  static isPro() {
    return this.getEdition() === 'pro';
  }

  static hasFeature(featureKey) {
    return hasOwn(FREE_FEATURES, featureKey) || (hasOwn(PRO_FEATURES, featureKey) && this.isPro());
  }

  static hasEntitlement(productId) {
    if (productId === PRO_PRODUCT_ID) return this.isPro();
    if (productId === SUPPORTER_PRODUCT_ID) return this.isSupporter();
    return this.hasFeature(productId);
  }

  static getCatalog() {
    return Object.values(PRODUCT_CATALOG).map((product) => ({
      ...product,
      unlocked: this.hasEntitlement(product.id),
    }));
  }

  static getEntitlements() {
    const stored = StorageService.get(ENTITLEMENTS_STORAGE_KEY, {});
    return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
  }

  static getRedeemedCodes() {
    const stored = StorageService.get(REDEEMED_CODES_STORAGE_KEY, []);
    return Array.isArray(stored) ? stored : [];
  }

  static isSupporter() {
    if (this.getEntitlements()[SUPPORTER_PRODUCT_ID]) return true;
    const legacyFounders = StorageService.get('userFounders', []);
    return Array.isArray(legacyFounders) && legacyFounders.some((founder) => Boolean(founder?.code));
  }

  static unlockProduct(productId, source = 'manual', code = null) {
    if (productId !== SUPPORTER_PRODUCT_ID) {
      return { success: false, message: 'Supporter recognition not found. Pro requires the Pro edition installer.' };
    }

    const entitlements = this.getEntitlements();
    const next = {
      ...entitlements,
      [SUPPORTER_PRODUCT_ID]: {
        productId,
        source,
        code,
        unlockedAt: entitlements[productId]?.unlockedAt || new Date().toISOString(),
      },
    };
    if (!StorageService.set(ENTITLEMENTS_STORAGE_KEY, next)) {
      return { success: false, message: 'Could not save supporter recognition on this device.' };
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('gamepilot:entitlements-updated', {
          detail: { productId, productIds: [productId], source },
        })
      );
    }
    return {
      success: true,
      product: PRODUCT_CATALOG[SUPPORTER_PRODUCT_ID],
      productIds: [SUPPORTER_PRODUCT_ID],
      message: 'GamePilot supporter recognition saved locally.',
    };
  }

  static redeemCode(code) {
    const normalizedCode = normalizeCode(code);
    if (!normalizedCode) return { success: false, message: 'Please enter a supporter code.' };
    const codeMeta = hasOwn(STORE_UNLOCK_CODES, normalizedCode) ? STORE_UNLOCK_CODES[normalizedCode] : null;
    if (!codeMeta) return { success: false, message: 'Invalid supporter code.' };

    const redeemedCodes = this.getRedeemedCodes();
    if (redeemedCodes.includes(normalizedCode)) {
      return { success: false, message: 'This supporter code has already been redeemed.' };
    }
    const result = this.unlockProduct(codeMeta.productId, 'store-code', normalizedCode);
    if (!result.success) return result;
    StorageService.set(REDEEMED_CODES_STORAGE_KEY, [...redeemedCodes, normalizedCode]);
    return result;
  }
}

export default EntitlementService;
