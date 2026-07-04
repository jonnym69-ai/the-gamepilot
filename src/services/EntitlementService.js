import StorageService from './StorageService';

const ENTITLEMENTS_STORAGE_KEY = 'storeEntitlements';
const REDEEMED_CODES_STORAGE_KEY = 'redeemedStoreCodes';

const PRODUCT_CATALOG = Object.freeze({
  gamepilot_starter: {
    id: 'gamepilot_starter',
    name: 'GamePilot Starter',
    description: 'Essential presentation pack — layouts and premium themes to get started.',
    type: 'bundle',
    priceGBP: 3.99,
    priceUSD: 4.99,
    includes: ['layout_pack', 'premium_theme_pack']
  },
  gamepilot_builder: {
    id: 'gamepilot_builder',
    name: 'GamePilot Builder',
    description: 'Everything in Starter plus the Advanced Theme Builder for full cockpit control.',
    type: 'bundle',
    priceGBP: 5.99,
    priceUSD: 7.99,
    includes: ['gamepilot_starter', 'advanced_theme_builder']
  },
  gamepilot_pro: {
    id: 'gamepilot_pro',
    name: 'GamePilot Pro',
    description: 'Permanent supporter upgrade for advanced customization, layouts, widgets, and future Pro tools.',
    type: 'bundle',
    priceGBP: 9.99,
    priceUSD: 12.99,
    includes: ['gamepilot_builder', 'widget_pack', 'power_tools']
  },
  advanced_theme_builder: {
    id: 'advanced_theme_builder',
    name: 'Advanced Theme Builder',
    description: 'Unlocks advanced theme controls, extra polish options, and future builder upgrades.',
    type: 'feature',
    priceGBP: 2.99,
    priceUSD: 3.99,
    includes: []
  },
  layout_pack: {
    id: 'layout_pack',
    name: 'Layout Pack',
    description: 'Permanent access to premium layout and presentation packs as they are added.',
    type: 'pack',
    priceGBP: 1.99,
    priceUSD: 2.99,
    includes: []
  },
  widget_pack: {
    id: 'widget_pack',
    name: 'Widget Pack',
    description: 'Permanent access to premium dashboard, backlog, and play-next widgets as they are added.',
    type: 'pack',
    priceGBP: 2.99,
    priceUSD: 3.99,
    includes: []
  },
  power_tools: {
    id: 'power_tools',
    name: 'Power Tools',
    description: 'Permanent access to advanced library management tools as they are added.',
    type: 'pack',
    priceGBP: 3.99,
    priceUSD: 4.99,
    includes: []
  },
  premium_theme_pack: {
    id: 'premium_theme_pack',
    name: 'Premium Theme Pack',
    description: 'Permanent access to premium theme drops bundled as store unlocks.',
    type: 'pack',
    priceGBP: 1.99,
    priceUSD: 2.99,
    includes: []
  }
});

const STORE_UNLOCK_CODES = Object.freeze({
  'GP-STARTER-2026': { productId: 'gamepilot_starter' },
  'GP-BUILDER-2026': { productId: 'gamepilot_builder' },
  'GP-PRO-FOUNDERS-2026': { productId: 'gamepilot_pro' },
  'GP-THEME-BUILDER-2026': { productId: 'advanced_theme_builder' },
  'GP-LAYOUT-PACK-2026': { productId: 'layout_pack' },
  'GP-WIDGET-PACK-2026': { productId: 'widget_pack' },
  'GP-POWER-TOOLS-2026': { productId: 'power_tools' },
  'GP-THEME-PACK-2026': { productId: 'premium_theme_pack' }
});

const normalizeCode = (code) => String(code || '').trim().toUpperCase();

const expandProductIds = (productId, visited = new Set()) => {
  if (!productId || visited.has(productId)) {
    return [];
  }

  const product = PRODUCT_CATALOG[productId];
  if (!product) {
    return [];
  }

  visited.add(productId);
  return [
    productId,
    ...product.includes.flatMap((includedProductId) => expandProductIds(includedProductId, visited))
  ];
};

export class EntitlementService {
  static getCatalog() {
    return Object.values(PRODUCT_CATALOG).map((product) => ({
      ...product,
      unlocked: this.hasEntitlement(product.id)
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

  static hasEntitlement(productId) {
    // All features are free; payment gates removed
    return true;
  }

  static unlockProduct(productId, source = 'manual', code = null) {
    const product = PRODUCT_CATALOG[productId];
    if (!product) {
      return { success: false, message: 'Unlock product not found.' };
    }

    const entitlements = this.getEntitlements();
    const unlockedAt = new Date().toISOString();
    const productIds = expandProductIds(productId);

    productIds.forEach((id) => {
      entitlements[id] = {
        productId: id,
        source,
        code,
        unlockedAt: entitlements[id]?.unlockedAt || unlockedAt
      };
    });

    StorageService.set(ENTITLEMENTS_STORAGE_KEY, entitlements);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gamepilot:entitlements-updated', {
        detail: { productId, productIds, source, code }
      }));
    }

    return {
      success: true,
      product,
      productIds,
      message: `${product.name} unlocked permanently.`
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
    if (!unlockResult.success) {
      return unlockResult;
    }

    StorageService.set(REDEEMED_CODES_STORAGE_KEY, [...redeemedCodes, normalizedCode]);

    return {
      ...unlockResult,
      code: normalizedCode
    };
  }
}

export default EntitlementService;
