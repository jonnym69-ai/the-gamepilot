import StorageService from './StorageService';

const ENTITLEMENTS_STORAGE_KEY = 'storeEntitlements';
const REDEEMED_CODES_STORAGE_KEY = 'redeemedStoreCodes';

export const SUPPORTER_PRODUCT_ID = 'gamepilot_supporter';

export const SUPPORTER_FEATURES = Object.freeze([]);

const PRODUCT_CATALOG = Object.freeze({
  [SUPPORTER_PRODUCT_ID]: {
    id: SUPPORTER_PRODUCT_ID,
    name: 'GamePilot Supporter Recognition',
    description: 'Optional local recognition for people who choose to support GamePilot. It does not control feature access.',
    type: 'supporter-recognition',
    priceGBP: 0,
    priceUSD: 0,
    includes: SUPPORTER_FEATURES
  }
});

const STORE_UNLOCK_CODES = Object.freeze({
  'GP-PRO-FOUNDERS-2026': { productId: SUPPORTER_PRODUCT_ID }
});

const normalizeCode = (code) => String(code || '').trim().toUpperCase();

export class EntitlementService {
  static getCatalog() {
    return Object.values(PRODUCT_CATALOG).map((product) => ({
      ...product,
      unlocked: product.id === SUPPORTER_PRODUCT_ID ? this.isSupporter() : true
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

  static hasEntitlement(productId) {
    return Boolean(productId);
  }

  static unlockProduct(productId, source = 'manual', code = null) {
    if (productId !== SUPPORTER_PRODUCT_ID && !SUPPORTER_FEATURES.includes(productId)) {
      return { success: false, message: 'Supporter recognition not found.' };
    }

    const entitlements = this.getEntitlements();
    const unlockedAt = new Date().toISOString();
    entitlements[SUPPORTER_PRODUCT_ID] = {
      productId: SUPPORTER_PRODUCT_ID,
      source,
      code,
      unlockedAt: entitlements[SUPPORTER_PRODUCT_ID]?.unlockedAt || unlockedAt
    };
    StorageService.set(ENTITLEMENTS_STORAGE_KEY, entitlements);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gamepilot:entitlements-updated', {
        detail: { productId: SUPPORTER_PRODUCT_ID, productIds: [SUPPORTER_PRODUCT_ID, ...SUPPORTER_FEATURES], source, code }
      }));
    }

    return {
      success: true,
      product: PRODUCT_CATALOG[SUPPORTER_PRODUCT_ID],
      productIds: [SUPPORTER_PRODUCT_ID, ...SUPPORTER_FEATURES],
      message: 'GamePilot supporter recognition saved locally.'
    };
  }

  static redeemCode(code) {
    const normalizedCode = normalizeCode(code);
    if (!normalizedCode) {
      return { success: false, message: 'Please enter an unlock code.' };
    }

    const codeMeta = STORE_UNLOCK_CODES[normalizedCode];
    if (!codeMeta) {
      return { success: false, message: 'Invalid one-off unlock code.' };
    }

    const redeemedCodes = this.getRedeemedCodes();
    if (redeemedCodes.includes(normalizedCode)) {
      return { success: false, message: 'This one-off unlock code has already been redeemed.' };
    }

    const unlockResult = this.unlockProduct(codeMeta.productId, 'store-code', normalizedCode);
    if (!unlockResult.success) return unlockResult;

    StorageService.set(REDEEMED_CODES_STORAGE_KEY, [...redeemedCodes, normalizedCode]);
    return { ...unlockResult, code: normalizedCode };
  }
}

export default EntitlementService;
