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
  jest.restoreAllMocks();
});

describe('single-edition build', () => {
  test('the catalogue still names the formerly-Pro capabilities', () => {
    expect(Object.keys(PRO_FEATURES).sort()).toEqual([
      'cinematic-export',
      'era-archive',
      'pro-themes',
      'recommendation-tuner',
      'storage-manager',
      'year-over-year',
    ]);
  });

  test.each(['free', 'pro', 'standard', '', 'invalid', undefined])(
    'every feature is unlocked regardless of the build stamp %s',
    (edition) => {
      global.__APP_EDITION__ = edition;
      expect(EntitlementService.getEdition()).toBe('pro');
      expect(EntitlementService.isPro()).toBe(true);
      expect(EntitlementService.getEditionName()).toBe('GamePilot');
      [...Object.keys(FREE_FEATURES), ...Object.keys(PRO_FEATURES)].forEach((feature) => {
        expect(EntitlementService.hasFeature(feature)).toBe(true);
      });
    }
  );

  test('access is unconditional — stored entitlements neither grant nor revoke it', () => {
    expect(EntitlementService.isPro()).toBe(true);
    StorageService.set('storeEntitlements', { [PRO_PRODUCT_ID]: { source: 'local-code' } });
    StorageService.set('proLicense', { source: 'local-code' });
    expect(EntitlementService.isPro()).toBe(true);
    Object.keys(PRO_FEATURES).forEach((feature) => {
      expect(EntitlementService.hasFeature(feature)).toBe(true);
    });
    StorageService._store.clear();
    expect(EntitlementService.isPro()).toBe(true);
    expect(EntitlementService.hasEntitlement(PRO_PRODUCT_ID)).toBe(true);
  });

  test('unknown features fail closed', () => {
    expect(EntitlementService.hasFeature('not-a-feature')).toBe(false);
    expect(EntitlementService.hasFeature('toString')).toBe(false);
    expect(EntitlementService.hasEntitlement(null)).toBe(false);
  });

  test('activation and deactivation APIs remain absent; Pro codes are rejected', () => {
    expect(EntitlementService.activateLicense).toBeUndefined();
    expect(EntitlementService.deactivateLicense).toBeUndefined();
    expect(EntitlementService.unlockProduct(PRO_PRODUCT_ID).success).toBe(false);
    expect(EntitlementService.redeemCode('GP-PRO-TEST-2026').success).toBe(false);
  });

  test('entitlement reads never modify saved data', () => {
    StorageService.set('library', [{ name: 'Project Zomboid', time_played: 2400 }]);
    StorageService.set('customRecommendationWeights', { unplayedBonus: 42 });
    StorageService.set('saveBackupHistoryV1', [{ backupPath: 'local-backup' }]);
    StorageService.set('storeEntitlements', { [SUPPORTER_PRODUCT_ID]: { source: 'store-code' } });
    const before = Array.from(StorageService._store.entries());
    EntitlementService.getCatalog();
    Object.keys(PRO_FEATURES).forEach((feature) => EntitlementService.hasFeature(feature));
    expect(EntitlementService.isSupporter()).toBe(true);
    expect(Array.from(StorageService._store.entries())).toEqual(before);
  });
});

describe('supporter recognition (dormant plumbing)', () => {
  test('founder codes still record recognition without affecting edition access', () => {
    const first = EntitlementService.redeemCode('GP-PRO-FOUNDERS-2026');
    expect(first.success).toBe(true);
    expect(EntitlementService.isSupporter()).toBe(true);
    expect(EntitlementService.isPro()).toBe(true);
    expect(EntitlementService.redeemCode('GP-PRO-FOUNDERS-2026').success).toBe(false);
  });

  test('recognizes legacy founders', () => {
    StorageService.set('userFounders', [{ code: 'legacy-recognition' }]);
    expect(EntitlementService.isSupporter()).toBe(true);
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
