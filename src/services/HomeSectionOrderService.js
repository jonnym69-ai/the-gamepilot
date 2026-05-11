// HomeSectionOrderService.js - Local-first persistence for the Home page section order.
import StorageService from './StorageService';

const STORAGE_KEY = 'homeSectionOrderV2';

export const HOME_SECTION_IDS = Object.freeze({
  DAILY_LOOP: 'dailyLoop',
  GUIDED_RIGHT_NOW: 'guidedRightNow',
  SESSION_FIT: 'sessionFit',
  SHAPE_THE_SHELF: 'shapeTheShelf',
  COLLECTION_SHELF: 'collectionShelf',
  BUY_RECOMMENDATIONS: 'buyRecommendations',
  WISHLIST: 'wishlist'
});

export const HOME_SECTION_LABELS = Object.freeze({
  [HOME_SECTION_IDS.DAILY_LOOP]: 'Daily Loop',
  [HOME_SECTION_IDS.GUIDED_RIGHT_NOW]: 'Guided Right Now',
  [HOME_SECTION_IDS.SESSION_FIT]: 'Session Fit (HowLongToBeat)',
  [HOME_SECTION_IDS.SHAPE_THE_SHELF]: 'Shape The Shelf',
  [HOME_SECTION_IDS.COLLECTION_SHELF]: 'Collection Shelf',
  [HOME_SECTION_IDS.BUY_RECOMMENDATIONS]: 'Buy Recommendations',
  [HOME_SECTION_IDS.WISHLIST]: 'Wishlist'
});

export const DEFAULT_HOME_SECTION_ORDER = Object.freeze([
  HOME_SECTION_IDS.GUIDED_RIGHT_NOW,
  HOME_SECTION_IDS.DAILY_LOOP,
  HOME_SECTION_IDS.SESSION_FIT,
  HOME_SECTION_IDS.COLLECTION_SHELF,
  HOME_SECTION_IDS.WISHLIST,
  HOME_SECTION_IDS.BUY_RECOMMENDATIONS,
  HOME_SECTION_IDS.SHAPE_THE_SHELF
]);

const VALID_IDS = new Set(DEFAULT_HOME_SECTION_ORDER);

const sanitizeOrder = (raw) => {
  if (!Array.isArray(raw)) {
    return [...DEFAULT_HOME_SECTION_ORDER];
  }

  const seen = new Set();
  const sanitized = [];

  raw.forEach((id) => {
    if (typeof id === 'string' && VALID_IDS.has(id) && !seen.has(id)) {
      sanitized.push(id);
      seen.add(id);
    }
  });

  // Append any default sections missing from saved order so new sections always appear.
  DEFAULT_HOME_SECTION_ORDER.forEach((id) => {
    if (!seen.has(id)) {
      sanitized.push(id);
    }
  });

  return sanitized;
};

export const HomeSectionOrderService = {
  getOrder() {
    try {
      return sanitizeOrder(StorageService.get(STORAGE_KEY, null));
    } catch (error) {
      console.warn('HomeSectionOrderService.getOrder failed', error);
      return [...DEFAULT_HOME_SECTION_ORDER];
    }
  },

  setOrder(order) {
    const sanitized = sanitizeOrder(order);
    try {
      StorageService.set(STORAGE_KEY, sanitized);
    } catch (error) {
      console.warn('HomeSectionOrderService.setOrder failed', error);
    }
    return sanitized;
  },

  reset() {
    try {
      StorageService.remove(STORAGE_KEY);
    } catch (error) {
      console.warn('HomeSectionOrderService.reset failed', error);
    }
    return [...DEFAULT_HOME_SECTION_ORDER];
  },

  isDefaultOrder(order) {
    if (!Array.isArray(order) || order.length !== DEFAULT_HOME_SECTION_ORDER.length) {
      return false;
    }
    return order.every((id, index) => id === DEFAULT_HOME_SECTION_ORDER[index]);
  }
};

export default HomeSectionOrderService;
