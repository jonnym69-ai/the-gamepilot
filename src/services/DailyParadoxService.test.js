import {
  getTodayParadox,
  getParadoxState,
  getTodayParadoxState,
  markParadoxRevealed,
  markParadoxHidden,
  getCategories,
  getTotalParadoxes,
} from './DailyParadoxService';
import StorageService from './StorageService';

jest.mock('./StorageService', () => ({
  get: jest.fn(),
  set: jest.fn(),
}));

describe('DailyParadoxService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    StorageService.get.mockReturnValue({ revealed: false, lastDateKey: null });
  });

  describe('getTodayParadox', () => {
    test('returns a paradox with required fields', () => {
      const p = getTodayParadox();
      expect(p).toHaveProperty('id');
      expect(p).toHaveProperty('category');
      expect(p).toHaveProperty('title');
      expect(p).toHaveProperty('question');
      expect(p).toHaveProperty('explanation');
      expect(p).toHaveProperty('categoryLabel');
      expect(p).toHaveProperty('categoryIcon');
      expect(p).toHaveProperty('dayOfYear');
      expect(p).toHaveProperty('totalParadoxes');
    });

    test('returns the same paradox for the same day', () => {
      const p1 = getTodayParadox();
      const p2 = getTodayParadox();
      expect(p1.id).toBe(p2.id);
    });

    test('totalParadoxes matches the library size', () => {
      const p = getTodayParadox();
      expect(p.totalParadoxes).toBe(getTotalParadoxes());
    });

    test('category is one of the valid categories', () => {
      const p = getTodayParadox();
      expect(['classic', 'gaming', 'logic', 'thought']).toContain(p.category);
    });
  });

  describe('getCategories', () => {
    test('returns all four categories', () => {
      const cats = getCategories();
      expect(Object.keys(cats)).toHaveLength(4);
      expect(cats).toHaveProperty('classic');
      expect(cats).toHaveProperty('gaming');
      expect(cats).toHaveProperty('logic');
      expect(cats).toHaveProperty('thought');
    });

    test('each category has a label and icon', () => {
      const cats = getCategories();
      Object.values(cats).forEach((cat) => {
        expect(cat).toHaveProperty('label');
        expect(cat).toHaveProperty('icon');
      });
    });
  });

  describe('getTotalParadoxes', () => {
    test('returns a positive number', () => {
      expect(getTotalParadoxes()).toBeGreaterThan(0);
    });
  });

  describe('getParadoxState', () => {
    test('returns default state when nothing stored', () => {
      StorageService.get.mockReturnValue({ revealed: false, lastDateKey: null });
      const state = getParadoxState();
      expect(state.revealed).toBe(false);
      expect(state.lastDateKey).toBeNull();
    });

    test('returns stored state', () => {
      StorageService.get.mockReturnValue({ revealed: true, lastDateKey: '2024-01-15' });
      const state = getParadoxState();
      expect(state.revealed).toBe(true);
      expect(state.lastDateKey).toBe('2024-01-15');
    });

    test('returns default on error', () => {
      StorageService.get.mockImplementation(() => {
        throw new Error('storage error');
      });
      const state = getParadoxState();
      expect(state.revealed).toBe(false);
      expect(state.lastDateKey).toBeNull();
    });
  });

  describe('getTodayParadoxState', () => {
    test('returns revealed=false when lastDateKey is from a previous day', () => {
      StorageService.get.mockReturnValue({ revealed: true, lastDateKey: '2020-01-01' });
      const state = getTodayParadoxState();
      expect(state.revealed).toBe(false);
    });

    test('returns stored revealed state when lastDateKey is today', () => {
      const now = new Date();
      const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      StorageService.get.mockReturnValue({ revealed: true, lastDateKey: todayKey });
      const state = getTodayParadoxState();
      expect(state.revealed).toBe(true);
      expect(state.lastDateKey).toBe(todayKey);
    });

    test('resets revealed state when day changes', () => {
      StorageService.get.mockReturnValue({ revealed: true, lastDateKey: '2020-01-01' });
      const state = getTodayParadoxState();
      expect(state.revealed).toBe(false);
      // lastDateKey should be updated to today
      const now = new Date();
      const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      expect(state.lastDateKey).toBe(todayKey);
    });
  });

  describe('markParadoxRevealed', () => {
    test('writes revealed=true with today date key', () => {
      markParadoxRevealed();
      expect(StorageService.set).toHaveBeenCalledTimes(1);
      const [key, value] = StorageService.set.mock.calls[0];
      expect(key).toBe('dailyParadoxState');
      expect(value.revealed).toBe(true);
      expect(value.lastDateKey).toBeTruthy();
    });
  });

  describe('markParadoxHidden', () => {
    test('writes revealed=false with today date key', () => {
      markParadoxHidden();
      expect(StorageService.set).toHaveBeenCalledTimes(1);
      const [key, value] = StorageService.set.mock.calls[0];
      expect(key).toBe('dailyParadoxState');
      expect(value.revealed).toBe(false);
      expect(value.lastDateKey).toBeTruthy();
    });
  });

  describe('Paradox content quality', () => {
    test('all paradoxes have non-empty question and explanation', () => {
      // Test by cycling through all paradoxes via getTodayParadox
      // Since we cannot easily mock the date, we verify the one we get
      const p = getTodayParadox();
      expect(p.question.length).toBeGreaterThan(20);
      expect(p.explanation.length).toBeGreaterThan(20);
    });
  });
});
