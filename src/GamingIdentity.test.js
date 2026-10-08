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
    getTimeStats: jest.fn(),
    getXPStats: jest.fn(),
    getPatreonBoostProfile: jest.fn(() => ({ multiplier: 1, tier: null, code: null })),
  },
  ACHIEVEMENTS: jest.requireActual('./AchievementSystem').ACHIEVEMENTS,
}));

jest.mock('./services/StatsAggregationService', () => ({
  StatsAggregationService: {
    getDashboardData: jest.fn(),
  },
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
    AchievementTracker.getXPStats.mockReturnValue({ level: 1, xp: 0, nextLevelXP: 100 });
    AchievementTracker.getPatreonBoostProfile.mockReturnValue({ multiplier: 1, tier: null, code: null });

    StatsAggregationService.getDashboardData.mockReturnValue({
      periods: {
        all: {
          playtimeMinutes: 0,
          sessions: 0,
          platformCounts: {},
          moodCounts: {},
          genreCounts: {},
          featureUsage: { counts: {} },
        },
      },
    });
  });

  test('getGamingStats reads canonical all-time dashboard snapshot', () => {
    StorageService.set('library', [{ name: 'Game A' }, { name: 'Game B' }]);

    AchievementTracker.getUnlockedAchievements.mockReturnValue(['a1', 'a2']);
    StatsAggregationService.getDashboardData.mockReturnValue({
      periods: {
        all: {
          playtimeMinutes: 180,
          sessions: 6,
          platformCounts: { Steam: 4, Xbox: 2 },
          moodCounts: { Relaxed: 3 },
          genreCounts: { RPG: 2 },
          featureUsage: { counts: { perfect_play: 5 } },
        },
      },
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
    AchievementTracker.getXPStats.mockReturnValue({ level: 5, xp: 450, nextLevelXP: 1000 });
    const level = GamingIdentity.calculateGamerLevel({
      totalPlayTime: 6000,
      achievementProgress: { unlocked: 8 },
      librarySize: 30,
    });

    expect(level).toBeGreaterThan(1);
  });

  test('determineGamerType classifies hardcore players by total playtime', () => {
    const gamerType = GamingIdentity.determineGamerType({
      totalPlayTime: 5000,
      platformDiversity: 2,
      favoriteMood: 'Focused',
    });

    expect(gamerType).toBe('Hardcore');
  });

  test('getProfile returns current identity shape and persists joinDate', () => {
    const profile = GamingIdentity.getProfile();

    expect(profile).toEqual(
      expect.objectContaining({
        username: expect.any(String),
        level: expect.any(Number),
        title: expect.any(String),
        stats: expect.any(Object),
        identity: expect.any(Object),
        joinDate: expect.any(String),
      })
    );
    expect(StorageService.getString('joinDate')).toBeTruthy();
  });

  test('resetJoinDate stores and returns an ISO timestamp', () => {
    const resetValue = GamingIdentity.resetJoinDate();

    expect(typeof resetValue).toBe('string');
    expect(new Date(resetValue).toString()).not.toBe('Invalid Date');
    expect(StorageService.getString('joinDate')).toBe(resetValue);
  });

  test('getAchievedBadges resolves real names and icons from the achievement catalog', () => {
    AchievementTracker.getUnlockedAchievements.mockReturnValue(['hour_100', 'collector_5']);

    const badges = GamingIdentity.getAchievedBadges();
    const byId = Object.fromEntries(badges.map((badge) => [badge.id, badge]));

    expect(byId.hour_100.name).toBe('Hundred Hours');
    expect(byId.hour_100.icon).toBe('💯');
    expect(byId.collector_5.name).toBe('Small Shelf');
    expect(byId.collector_5.icon).toBe('📚');
  });

  test('getAchievedBadges humanizes unknown IDs instead of repeating "Achievement"', () => {
    AchievementTracker.getUnlockedAchievements.mockReturnValue(['quest_streak_7']);

    const badges = GamingIdentity.getAchievedBadges();

    expect(badges[0].name).toBe('Quest Streak 7');
    expect(badges[0].icon).toBe('🏆');
  });

  test('detectTasteClusters does not label survival sandbox games as narrative RPGs', () => {
    const clusters = GamingIdentity.detectTasteClusters([
      { name: 'Rust', genres: ['Action', 'Adventure', 'Indie', 'RPG', 'Massively Multiplayer'] },
      { name: 'Terraria', genres: ['Action', 'Adventure', 'Indie', 'RPG', 'Sandbox'] },
      { name: 'Project Zomboid', genres: ['Indie', 'RPG', 'Early Access'] },
    ]);

    expect(clusters.find((cluster) => cluster.id === 'story-rpg')).toBeUndefined();
  });

  test('detectTasteClusters still groups genuine story RPGs', () => {
    const clusters = GamingIdentity.detectTasteClusters([
      { name: 'The Witcher 3', genres: ['RPG'] },
      { name: "Baldur's Gate 3", genres: ['RPG', 'Adventure'] },
    ]);

    expect(clusters.find((cluster) => cluster.id === 'story-rpg')).toEqual(
      expect.objectContaining({ label: 'Narrative RPG Voyager', matchCount: 2 })
    );
  });
});
