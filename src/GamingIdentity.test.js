import { GamingIdentity } from './GamingIdentity';

// Mock localStorage for testing
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock Date for consistent testing
const mockDate = new Date('2024-01-01T00:00:00Z');
global.Date = jest.fn(() => mockDate);
Date.now = jest.fn(() => mockDate.getTime());
mockDate.toISOString = jest.fn(() => '2024-01-01T00:00:00.000Z');

describe('GamingIdentity', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Reset localStorage mock
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
  });

  describe('getProfile', () => {
    test('should return default profile when no stats exist', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const profile = GamingIdentity.getProfile();

      expect(profile).toEqual({
        level: 1,
        title: 'Casual Gamer',
        xp: 0,
        totalGames: 0,
        totalPlaytime: 0,
        favoriteGenre: 'Unknown',
        gamerType: 'Casual',
        joinDate: expect.any(String),
        achievements: [],
        stats: {
          totalGames: 0,
          totalPlaytime: 0,
          favoriteGenre: 'Unknown',
          averageSession: 0,
          longestSession: 0,
          mostPlayedDay: 'Unknown',
          joinDate: expect.any(String)
        }
      });
    });

    test('should return profile with existing stats', () => {
      const mockStats = {
        totalGames: 50,
        totalPlaytime: 1200,
        favoriteGenre: 'Action',
        averageSession: 45,
        longestSession: 180,
        mostPlayedDay: 'Saturday'
      };

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'gamingStats') return JSON.stringify(mockStats);
        if (key === 'joinDate') return '2023-01-01T00:00:00.000Z';
        return null;
      });

      const profile = GamingIdentity.getProfile();

      expect(profile.level).toBeGreaterThan(1);
      expect(profile.stats).toEqual(mockStats);
    });
  });

  describe('calculateLevel', () => {
    test('should calculate correct level based on XP', () => {
      expect(GamingIdentity.calculateLevel(0)).toBe(1);
      expect(GamingIdentity.calculateLevel(100)).toBe(2);
      expect(GamingIdentity.calculateLevel(500)).toBe(4);
      expect(GamingIdentity.calculateLevel(1000)).toBe(6);
    });
  });

  describe('calculateXP', () => {
    test('should calculate XP based on playtime and achievements', () => {
      const mockStats = {
        totalPlaytime: 100, // 100 minutes = 100 XP
        achievements: ['first_game', 'genre_explorer'] // 50 XP each
      };

      const xp = GamingIdentity.calculateXP(mockStats);
      expect(xp).toBe(200); // 100 + 50 + 50
    });
  });

  describe('getLevelTitle', () => {
    test('should return correct title for each level', () => {
      expect(GamingIdentity.getLevelTitle(1)).toBe('Casual Gamer');
      expect(GamingIdentity.getLevelTitle(5)).toBe('Dedicated Player');
      expect(GamingIdentity.getLevelTitle(10)).toBe('Gaming Enthusiast');
      expect(GamingIdentity.getLevelTitle(25)).toBe('Gaming Legend');
    });
  });

  describe('determineGamerType', () => {
    test('should determine gamer type based on stats', () => {
      const casualStats = { totalGames: 10, totalPlaytime: 50, favoriteGenre: 'Puzzle' };
      expect(GamingIdentity.determineGamerType(casualStats)).toBe('Casual');

      const hardcoreStats = { totalGames: 200, totalPlaytime: 5000, favoriteGenre: 'RPG' };
      expect(GamingIdentity.determineGamerType(hardcoreStats)).toBe('Hardcore');
    });
  });

  describe('resetJoinDate', () => {
    test('should reset join date to current date', () => {
      const result = GamingIdentity.resetJoinDate();

      expect(localStorageMock.setItem).toHaveBeenCalledWith('joinDate', '2024-01-01T00:00:00.000Z');
      expect(result).toBe('2024-01-01T00:00:00.000Z');
    });
  });
});
