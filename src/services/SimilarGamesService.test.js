import SimilarGamesService from '../services/SimilarGamesService';

// Mock dependencies before importing anything that uses them.
jest.mock('../constants/GenresMoods', () => ({
  mapGameGenresToValid: (genres) => (Array.isArray(genres) ? genres.filter(Boolean) : []),
  getResolvedMood: (game) => game?.mood || null,
}));

jest.mock('../services/PlaytimeAutoLogger', () => ({
  PlaytimeAutoLogger: {
    getSessionHistory: jest.fn(() => []),
  },
}));

jest.mock('../services/WishlistService', () => ({
  __esModule: true,
  default: {
    getWishlist: jest.fn(() => []),
  },
}));

const mockStorageStore = new Map();
jest.mock('../services/StorageService', () => ({
  __esModule: true,
  default: {
    get: jest.fn((key, defaultValue) => (mockStorageStore.has(key) ? mockStorageStore.get(key) : defaultValue)),
    set: jest.fn((key, value) => mockStorageStore.set(key, value)),
    remove: jest.fn((key) => mockStorageStore.delete(key)),
  },
}));

describe('SimilarGamesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorageStore.clear();
    SimilarGamesService.clearCache();
  });

  describe('getSimilarRecommendations', () => {
    it('returns an empty result when mode is custom and no referenceGame is provided', async () => {
      const result = await SimilarGamesService.getSimilarRecommendations({
        mode: 'custom',
        library: [],
        referenceGame: null,
      });
      expect(result.ok).toBe(false);
      expect(result.entries).toEqual([]);
      expect(result.message).toMatch(/pick a game/i);
    });

    it('returns an empty result when mode is recent and library is empty', async () => {
      const result = await SimilarGamesService.getSimilarRecommendations({
        mode: 'recent',
        library: [],
      });
      expect(result.ok).toBe(false);
      expect(result.message).toMatch(/play a game/i);
    });

    it('returns an empty result when mode is recent and no game has been played', async () => {
      const result = await SimilarGamesService.getSimilarRecommendations({
        mode: 'recent',
        library: [{ name: 'Game A', last_played: null, time_played: 0 }],
      });
      expect(result.ok).toBe(false);
    });

    it('uses the most recently played game as reference in recent mode', async () => {
      const library = [
        { name: 'Old Game', last_played: '2024-01-01', time_played: 100, genres: ['Action'] },
        { name: 'Recent Game', last_played: '2025-01-01', time_played: 200, genres: ['RPG'] },
      ];
      // No electronAPI, so discovery returns []; wishlist is empty too.
      const result = await SimilarGamesService.getSimilarRecommendations({
        mode: 'recent',
        library,
        useCache: false,
      });
      // With no Steam data and no wishlist, entries will be empty but ok=true
      // because the taste profile was built successfully.
      expect(result.ok).toBe(true);
      expect(result.mode).toBe('recent');
      expect(result.referenceName).toBe('Recent Game');
    });

    it('returns an empty result when reference games have no genre or mood signal', async () => {
      const result = await SimilarGamesService.getSimilarRecommendations({
        mode: 'custom',
        library: [],
        referenceGame: { name: 'Unknown Game', genres: [] },
        useCache: false,
      });
      expect(result.ok).toBe(false);
      expect(result.message).toMatch(/not enough taste signal/i);
    });

    it('scores and returns wishlist items that match the reference taste', async () => {
      const WishlistService = require('../services/WishlistService').default;
      WishlistService.getWishlist.mockReturnValue([
        {
          name: 'Wishlist RPG',
          genres: ['RPG'],
          steamAppID: '12345',
          currentPrice: { price: 29.99, priceFormatted: '$29.99' },
        },
        {
          name: 'Wishlist Racing',
          genres: ['Racing'],
          steamAppID: '67890',
        },
      ]);

      const result = await SimilarGamesService.getSimilarRecommendations({
        mode: 'custom',
        library: [],
        referenceGame: { name: 'My RPG', genres: ['RPG'], mood: 'Focused' },
        useCache: false,
      });

      expect(result.ok).toBe(true);
      expect(result.entries.length).toBeGreaterThan(0);
      // The RPG wishlist item should rank higher than the Racing one
      const rpgEntry = result.entries.find((e) => e.name === 'Wishlist RPG');
      const racingEntry = result.entries.find((e) => e.name === 'Wishlist Racing');
      expect(rpgEntry).toBeDefined();
      expect(racingEntry).toBeDefined();
      expect(rpgEntry.score).toBeGreaterThan(racingEntry.score);
      expect(rpgEntry.source).toBe('wishlist');
    });

    it('skips wishlist items the user already owns', async () => {
      const WishlistService = require('../services/WishlistService').default;
      WishlistService.getWishlist.mockReturnValue([
        { name: 'Owned RPG', genres: ['RPG'], steamAppID: '111' },
        { name: 'New RPG', genres: ['RPG'], steamAppID: '222' },
      ]);

      const result = await SimilarGamesService.getSimilarRecommendations({
        mode: 'custom',
        library: [{ name: 'Owned RPG' }],
        referenceGame: { name: 'My RPG', genres: ['RPG'] },
        useCache: false,
      });

      const names = result.entries.map((e) => e.name);
      expect(names).not.toContain('Owned RPG');
      expect(names).toContain('New RPG');
    });

    it('deduplicates by name', async () => {
      const WishlistService = require('../services/WishlistService').default;
      WishlistService.getWishlist.mockReturnValue([
        { name: 'Duplicate Game', genres: ['RPG'], steamAppID: '999' },
        { name: 'Duplicate Game', genres: ['RPG'], steamAppID: '999' },
      ]);

      const result = await SimilarGamesService.getSimilarRecommendations({
        mode: 'custom',
        library: [],
        referenceGame: { name: 'My RPG', genres: ['RPG'] },
        useCache: false,
      });

      const matches = result.entries.filter((e) => e.name === 'Duplicate Game');
      expect(matches.length).toBe(1);
    });

    it('clamps display scores to 0-100', async () => {
      const WishlistService = require('../services/WishlistService').default;
      WishlistService.getWishlist.mockReturnValue([
        { name: 'Game A', genres: ['RPG', 'Action', 'Adventure'], steamAppID: '1' },
        { name: 'Game B', genres: ['RPG', 'Action'], steamAppID: '2' },
      ]);

      const result = await SimilarGamesService.getSimilarRecommendations({
        mode: 'custom',
        library: [],
        referenceGame: { name: 'My RPG', genres: ['RPG', 'Action', 'Adventure'] },
        useCache: false,
      });

      result.entries.forEach((entry) => {
        expect(entry.displayScore).toBeGreaterThanOrEqual(0);
        expect(entry.displayScore).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('getReferenceGames', () => {
    it('returns the custom reference game when mode is custom', () => {
      const ref = { name: 'Picked Game', genres: ['Action'] };
      const result = SimilarGamesService.getReferenceGames('custom', [], ref);
      expect(result).toEqual([ref]);
    });

    it('returns empty array for custom mode with no reference', () => {
      const result = SimilarGamesService.getReferenceGames('custom', [], null);
      expect(result).toEqual([]);
    });

    it('returns the most recently played game for recent mode', () => {
      const library = [
        { name: 'Old', last_played: '2024-01-01', time_played: 10 },
        { name: 'New', last_played: '2025-06-01', time_played: 50 },
      ];
      const result = SimilarGamesService.getReferenceGames('recent', library);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('New');
    });

    it('returns empty array for recent mode with no played games', () => {
      const result = SimilarGamesService.getReferenceGames('recent', []);
      expect(result).toEqual([]);
    });
  });

  describe('cache', () => {
    it('caches results and returns them on subsequent calls', async () => {
      const WishlistService = require('../services/WishlistService').default;
      WishlistService.getWishlist.mockReturnValue([{ name: 'Cached RPG', genres: ['RPG'], steamAppID: '555' }]);

      const first = await SimilarGamesService.getSimilarRecommendations({
        mode: 'custom',
        library: [],
        referenceGame: { name: 'My RPG', genres: ['RPG'] },
        useCache: true,
      });

      const second = await SimilarGamesService.getSimilarRecommendations({
        mode: 'custom',
        library: [],
        referenceGame: { name: 'My RPG', genres: ['RPG'] },
        useCache: true,
      });

      expect(first.ok).toBe(true);
      expect(second.ok).toBe(true);
      expect(second.cached).toBe(true);
    });

    it('clearCache removes cached data', async () => {
      const WishlistService = require('../services/WishlistService').default;
      WishlistService.getWishlist.mockReturnValue([{ name: 'Cache Test', genres: ['RPG'], steamAppID: '777' }]);

      await SimilarGamesService.getSimilarRecommendations({
        mode: 'custom',
        library: [],
        referenceGame: { name: 'My RPG', genres: ['RPG'] },
        useCache: true,
      });

      SimilarGamesService.clearCache();

      const result = await SimilarGamesService.getSimilarRecommendations({
        mode: 'custom',
        library: [],
        referenceGame: { name: 'My RPG', genres: ['RPG'] },
        useCache: true,
      });

      expect(result.cached).toBe(false);
    });
  });
});
