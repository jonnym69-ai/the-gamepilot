import { PersonaPerformanceInsights } from './PersonaPerformanceInsights';
import { GameRequirements } from './GameRequirements';

jest.mock('./HardwareDetector', () => ({
  HardwareDetector: {
    getDefaultSystemInfo: jest.fn(() => ({
      cpu: { brand: 'Default CPU', cores: 4 },
      gpu: { model: 'Default GPU' },
      ram: { total: 8 },
      storage: [{ name: 'C:', type: 'SSD', isSSD: true, isNVMe: false }],
      lastUpdated: '2024-01-01T00:00:00.000Z'
    }))
  }
}));

jest.mock('./GameRequirements', () => ({
  GameRequirements: {
    checkGameCompatibility: jest.fn(),
    getSettingsLabel: jest.fn(() => ({ text: 'High', emoji: '⚡' }))
  }
}));

describe('PersonaPerformanceInsights', () => {
  beforeEach(() => {
    localStorage.clear();
    PersonaPerformanceInsights.cachedSystemInfo = null;
    PersonaPerformanceInsights.compatibilityCache.clear();
    GameRequirements.checkGameCompatibility.mockReset();
    GameRequirements.checkGameCompatibility.mockReturnValue({
      canRun: true,
      settingsLevel: 'high',
      estimatedFPS: 60,
      bottlenecks: []
    });
    GameRequirements.getSettingsLabel.mockReset();
    GameRequirements.getSettingsLabel.mockReturnValue({ text: 'High', emoji: 'X' });
  });

  describe('estimateSessionMinutes', () => {
    test('returns null when game has no usable signals', () => {
      expect(PersonaPerformanceInsights.estimateSessionMinutes({})).toBe(null);
      expect(PersonaPerformanceInsights.estimateSessionMinutes(null)).toBe(null);
    });

    test('uses explicit estimated_session_minutes when provided', () => {
      expect(PersonaPerformanceInsights.estimateSessionMinutes({ estimated_session_minutes: 47 })).toBe(47);
    });

    test('clamps minimum to 10 minutes', () => {
      expect(PersonaPerformanceInsights.estimateSessionMinutes({ estimated_session_minutes: 5 })).toBe(10);
    });

    test('derives average from time_played / launch_count when both exist', () => {
      expect(
        PersonaPerformanceInsights.estimateSessionMinutes({ time_played: 600, launch_count: 10 })
      ).toBe(60);
    });

    test('falls back to time_played alone when no launch_count', () => {
      expect(
        PersonaPerformanceInsights.estimateSessionMinutes({ time_played: 75 })
      ).toBe(75);
    });
  });

  describe('hardware bonuses', () => {
    test('settings level maps to expected score bonuses', () => {
      expect(PersonaPerformanceInsights.getHardwareScoreBonus({ settingsLevel: 'ultra' })).toBe(18);
      expect(PersonaPerformanceInsights.getHardwareScoreBonus({ settingsLevel: 'high' })).toBe(12);
      expect(PersonaPerformanceInsights.getHardwareScoreBonus({ settingsLevel: 'low' })).toBe(6);
      expect(PersonaPerformanceInsights.getHardwareScoreBonus({ settingsLevel: 'cannot_run' })).toBe(-25);
      expect(PersonaPerformanceInsights.getHardwareScoreBonus({ settingsLevel: 'unknown' })).toBe(0);
      expect(PersonaPerformanceInsights.getHardwareScoreBonus(null)).toBe(0);
    });

    test('confidence boost has its own scale, with cannot_run as a hard penalty', () => {
      expect(PersonaPerformanceInsights.getHardwareConfidenceBoost({ settingsLevel: 'ultra' })).toBe(15);
      expect(PersonaPerformanceInsights.getHardwareConfidenceBoost({ settingsLevel: 'cannot_run' })).toBe(-30);
      expect(PersonaPerformanceInsights.getHardwareConfidenceBoost(null)).toBe(0);
    });

    test('match contribution maps levels to 0-100 contribution', () => {
      expect(PersonaPerformanceInsights.getHardwareMatchContribution({ settingsLevel: 'ultra' })).toBe(95);
      expect(PersonaPerformanceInsights.getHardwareMatchContribution({ settingsLevel: 'high' })).toBe(80);
      expect(PersonaPerformanceInsights.getHardwareMatchContribution({ settingsLevel: 'low' })).toBe(60);
      expect(PersonaPerformanceInsights.getHardwareMatchContribution({ settingsLevel: 'cannot_run' })).toBe(10);
      expect(PersonaPerformanceInsights.getHardwareMatchContribution({ settingsLevel: 'whatever' })).toBe(50);
      expect(PersonaPerformanceInsights.getHardwareMatchContribution(null)).toBe(0);
    });
  });

  describe('compatibility cache', () => {
    test('caches compatibility result by game + system signature', () => {
      const game = { appid: '1', name: 'Game' };
      PersonaPerformanceInsights.getCompatibility(game);
      PersonaPerformanceInsights.getCompatibility(game);
      expect(GameRequirements.checkGameCompatibility).toHaveBeenCalledTimes(1);
    });

    test('invalidates cache when system info signature changes', () => {
      const game = { appid: '1', name: 'Game' };
      PersonaPerformanceInsights.getCompatibility(game);

      PersonaPerformanceInsights.setSystemInfo({
        cpu: { brand: 'New CPU', cores: 8 },
        gpu: { model: 'New GPU' },
        ram: { total: 16 },
        storage: [],
        lastUpdated: '2024-02-01T00:00:00.000Z'
      });

      PersonaPerformanceInsights.getCompatibility(game);
      expect(GameRequirements.checkGameCompatibility).toHaveBeenCalledTimes(2);
    });

    test('does not invalidate cache when setSystemInfo is called with the same signature', () => {
      const sameInfo = {
        cpu: { brand: 'Default CPU', cores: 4 },
        gpu: { model: 'Default GPU' },
        ram: { total: 8 },
        storage: [{ name: 'C:', type: 'SSD', isSSD: true, isNVMe: false }],
        lastUpdated: '2024-01-01T00:00:00.000Z'
      };
      PersonaPerformanceInsights.setSystemInfo(sameInfo);
      const game = { appid: '1', name: 'Game' };
      PersonaPerformanceInsights.getCompatibility(game);
      PersonaPerformanceInsights.setSystemInfo(sameInfo);
      PersonaPerformanceInsights.getCompatibility(game);
      expect(GameRequirements.checkGameCompatibility).toHaveBeenCalledTimes(1);
    });
  });

  describe('describeCompatibility', () => {
    test('returns null when given null', () => {
      expect(PersonaPerformanceInsights.describeCompatibility(null)).toBe(null);
    });

    test('does not throw when getSettingsLabel returns undefined (unknown level)', () => {
      GameRequirements.getSettingsLabel.mockReturnValue(undefined);
      const desc = PersonaPerformanceInsights.describeCompatibility({
        settingsLevel: 'mystery',
        estimatedFPS: 42,
        bottlenecks: []
      });
      expect(typeof desc).toBe('string');
      expect(desc).toMatch(/mystery/);
      expect(desc).toMatch(/42/);
    });

    test('produces a string mentioning settings, FPS, and bottleneck', () => {
      const desc = PersonaPerformanceInsights.describeCompatibility({
        settingsLevel: 'high',
        estimatedFPS: 75,
        bottlenecks: [{ component: 'GPU' }]
      });
      expect(desc).toMatch(/High/);
      expect(desc).toMatch(/75/);
      expect(desc).toMatch(/GPU/);
    });
  });

  describe('extractGenres', () => {
    test('returns a copy of the genres array', () => {
      const game = { genres: ['RPG', 'Strategy'] };
      const result = PersonaPerformanceInsights.extractGenres(game);
      expect(result).toEqual(['RPG', 'Strategy']);
      expect(result).not.toBe(game.genres);
    });

    test('appends fallback genre when not already present', () => {
      expect(PersonaPerformanceInsights.extractGenres({ genres: ['RPG'] }, 'Strategy')).toEqual(['RPG', 'Strategy']);
      expect(PersonaPerformanceInsights.extractGenres({ genres: ['RPG'] }, 'RPG')).toEqual(['RPG']);
    });

    test('handles missing genres safely', () => {
      expect(PersonaPerformanceInsights.extractGenres({}, 'Action')).toEqual(['Action']);
      expect(PersonaPerformanceInsights.extractGenres({})).toEqual([]);
    });
  });
});
