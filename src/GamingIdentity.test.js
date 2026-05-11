import { GamingIdentity } from './GamingIdentity';
import { AchievementTracker } from './AchievementSystem';
import { StatsAggregationService } from './services/StatsAggregationService';
import StorageService from './services/StorageService';

jest.mock('./AchievementSystem', () => ({
  AchievementTracker: {
    getUnlockedAchievements: jest.fn(),
    getWeeklyMoodBadge: jest.fn(),
    getPlatformStats: jest.fn(),
    getFeatureStats: jest.fn(),
    getMoodStats: jest.fn(),
    getGenreStats: jest.fn(),
    getTimeStats: jest.fn()
  }
}));

jest.mock('./services/StatsAggregationService', () => ({
  StatsAggregationService: {
    getDashboardData: jest.fn()
  }
}));

describe('GamingIdentity', () => {
  beforeEach(() => {
    StorageService.clear();
    jest.clearAllMocks();

    AchievementTracker.getUnlockedAchievements.mockReturnValue([]);
    AchievementTracker.getWeeklyMoodBadge.mockReturnValue(null);
    AchievementTracker.getPlatformStats.mockReturnValue({});
    AchievementTracker.getFeatureStats.mockReturnValue({});
    AchievementTracker.getMoodStats.mockReturnValue({});
    AchievementTracker.getGenreStats.mockReturnValue({});
    AchievementTracker.getTimeStats.mockReturnValue({ total: 0, sessions: 0 });

    StatsAggregationService.getDashboardData.mockReturnValue({
      periods: {
        all: {
          playtimeMinutes: 0,
          sessions: 0,
          platformCounts: {},
          moodCounts: {},
          genreCounts: {},
          featureUsage: { counts: {} }
        }
      }
    });
  });

  test('getGamingStats reads canonical all-time dashboard snapshot', () => {
    StorageService.set('library', [
      { name: 'Game A' },
      { name: 'Game B' }
    ]);

    AchievementTracker.getUnlockedAchievements.mockReturnValue(['a1', 'a2']);
    StatsAggregationService.getDashboardData.mockReturnValue({
      periods: {
        all: {
          playtimeMinutes: 180,
          sessions: 6,
          platformCounts: { Steam: 4, Xbox: 2 },
          moodCounts: { Relaxed: 3 },
          genreCounts: { RPG: 2 },
          featureUsage: { counts: { perfect_play: 5 } }
        }
      }
    });

    const stats = GamingIdentity.getGamingStats();

    expect(stats.totalPlayTime).toBe(180);
    expect(stats.totalSessions).toBe(6);
    expect(stats.averageSessionTime).toBe(30);
    expect(stats.favoritePlatform).toBe('Steam');
    expect(stats.favoriteMood).toBe('Relaxed');
    expect(stats.favoriteGenre).toBe('RPG');
    expect(stats.mostUsedFeature).toBe('perfect_play');
    expect(stats.achievementProgress.unlocked).toBe(2);
    expect(stats.librarySize).toBe(2);
  });

  test('calculateGamerLevel scales with playtime, achievements, and library size', () => {
    const level = GamingIdentity.calculateGamerLevel({
      totalPlayTime: 6000,
      achievementProgress: { unlocked: 8 },
      librarySize: 30
    });

    expect(level).toBeGreaterThan(1);
  });

  test('determineGamerType classifies hardcore players by total playtime', () => {
    const gamerType = GamingIdentity.determineGamerType({
      totalPlayTime: 5000,
      platformDiversity: 2,
      favoriteMood: 'Focused'
    });

    expect(gamerType).toBe('Hardcore');
  });

  test('getProfile returns current identity shape and persists joinDate', () => {
    const profile = GamingIdentity.getProfile();

    expect(profile).toEqual(expect.objectContaining({
      username: expect.any(String),
      level: expect.any(Number),
      title: expect.any(String),
      stats: expect.any(Object),
      identity: expect.any(Object),
      joinDate: expect.any(String)
    }));
    expect(StorageService.getString('joinDate')).toBeTruthy();
  });

  test('resetJoinDate stores and returns an ISO timestamp', () => {
    const resetValue = GamingIdentity.resetJoinDate();

    expect(typeof resetValue).toBe('string');
    expect(new Date(resetValue).toString()).not.toBe('Invalid Date');
    expect(StorageService.getString('joinDate')).toBe(resetValue);
  });
});
