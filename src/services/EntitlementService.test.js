// EntitlementService.test.js
import EntitlementService, {
  FREE_FEATURES,
  PRO_FEATURES,
  PRO_PRODUCT_ID,
  SUPPORTER_PRODUCT_ID,
} from './EntitlementService';
import StorageService from './StorageService';

jest.mock('./StorageService', () => {
  const store = new Map();
  return {
    __esModule: true,
    default: {
      _store: store,
      get: jest.fn((key, def) => (store.has(key) ? store.get(key) : def)),
      set: jest.fn((key, value) => {
        store.set(key, value);
        return true;
      }),
      remove: jest.fn((key) => {
        store.delete(key);
        return true;
      }),
    },
  };
});

beforeEach(() => {
  StorageService._store.clear();
  global.__APP_EDITION__ = 'free';
  jest.restoreAllMocks();
});

afterEach(() => {
  global.__APP_EDITION__ = 'free';
});

describe('build-time editions', () => {
  test('only the three agreed capabilities belong to Pro', () => {
    expect(Object.keys(PRO_FEATURES).sort()).toEqual(['cinematic-export', 'recommendation-tuner', 'storage-manager']);
  });

  test.each(['free', 'pro'])('%s includes all Free features', (edition) => {
    global.__APP_EDITION__ = edition;
    expect(EntitlementService.getEdition()).toBe(edition);
    Object.keys(FREE_FEATURES).forEach((feature) => {
      expect(EntitlementService.hasFeature(feature)).toBe(true);
    });
    [
      'eras',
      'signature-titles',
      'save-backup',
      'share-cards',
      'year-in-review',
      'discord-presence',
      'big-screen-mode',
      'performance-cockpit',
      'habits-insights',
    ].forEach((feature) => {
      expect(EntitlementService.hasFeature(feature)).toBe(true);
    });
  });

  test.each(['free', 'pro'])('%s access comes from the build, not local entitlements', (edition) => {
    global.__APP_EDITION__ = edition;
    StorageService.set('storeEntitlements', { [PRO_PRODUCT_ID]: { source: 'local-code' } });
    StorageService.set('proLicense', { source: 'local-code' });
    expect(EntitlementService.isPro()).toBe(edition === 'pro');
    Object.keys(PRO_FEATURES).forEach((feature) => {
      expect(EntitlementService.hasFeature(feature)).toBe(edition === 'pro');
    });
    StorageService._store.clear();
    expect(EntitlementService.isPro()).toBe(edition === 'pro');
  });

  test.each(['', 'PRO', 'invalid', undefined])('unknown edition %s fails closed to Free', (edition) => {
    global.__APP_EDITION__ = edition;
    expect(EntitlementService.getEdition()).toBe('free');
    expect(EntitlementService.isPro()).toBe(false);
  });

  test.each(['free', 'pro'])('unknown features fail closed in %s', (edition) => {
    global.__APP_EDITION__ = edition;
    expect(EntitlementService.hasFeature('not-a-feature')).toBe(false);
    expect(EntitlementService.hasFeature('toString')).toBe(false);
    expect(EntitlementService.hasEntitlement(null)).toBe(false);
  });

  test('activation and deactivation APIs are removed', () => {
    expect(EntitlementService.activateLicense).toBeUndefined();
    expect(EntitlementService.deactivateLicense).toBeUndefined();
    expect(EntitlementService.unlockProduct(PRO_PRODUCT_ID).success).toBe(false);
    expect(EntitlementService.redeemCode('GP-PRO-TEST-2026').success).toBe(false);
  });

  test('switching Free to Pro to Free does not modify any saved data', () => {
    StorageService.set('library', [{ name: 'Project Zomboid', time_played: 2400 }]);
    StorageService.set('customRecommendationWeights', { unplayedBonus: 42 });
    StorageService.set('saveBackupHistoryV1', [{ backupPath: 'local-backup' }]);
    StorageService.set('storeEntitlements', { [SUPPORTER_PRODUCT_ID]: { source: 'store-code' } });
    const before = Array.from(StorageService._store.entries());
    ['free', 'pro', 'free'].forEach((edition) => {
      global.__APP_EDITION__ = edition;
      EntitlementService.getCatalog();
      Object.keys(PRO_FEATURES).forEach((feature) => EntitlementService.hasFeature(feature));
      expect(EntitlementService.isSupporter()).toBe(true);
      expect(Array.from(StorageService._store.entries())).toEqual(before);
    });
  });
});

describe('supporter recognition', () => {
  test('founder recognition remains independent of the edition', () => {
    const first = EntitlementService.redeemCode('GP-PRO-FOUNDERS-2026');
    expect(first.success).toBe(true);
    expect(EntitlementService.isSupporter()).toBe(true);
    expect(EntitlementService.isPro()).toBe(false);
    expect(EntitlementService.redeemCode('GP-PRO-FOUNDERS-2026').success).toBe(false);
  });

  test('recognizes legacy founders without granting Pro', () => {
    StorageService.set('userFounders', [{ code: 'legacy-recognition' }]);
    expect(EntitlementService.isSupporter()).toBe(true);
    expect(EntitlementService.isPro()).toBe(false);
  });

  test('emits a recognition update without including codes', () => {
    const listener = jest.fn();
    window.addEventListener('gamepilot:entitlements-updated', listener);
    EntitlementService.unlockProduct(SUPPORTER_PRODUCT_ID);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail).not.toHaveProperty('code');
    window.removeEventListener('gamepilot:entitlements-updated', listener);
  });
});
