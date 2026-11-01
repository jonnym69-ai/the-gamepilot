import { GamingIdentity } from './GamingIdentity';
import { StatsAggregationService } from './services/StatsAggregationService';
import StorageService from './services/StorageService';

jest.mock('./services/StatsAggregationService', () => ({
  StatsAggregationService: {
    getDashboardData: jest.fn(),
  },
}));

describe('GamingIdentity', () => {
  beforeEach(() => {
    StorageService.clear();
    jest.clearAllMocks();

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
    expect(stats.librarySize).toBe(2);
  });

  test('calculateGamerLevel scales with total playtime', () => {
    expect(GamingIdentity.calculateGamerLevel({ totalPlayTime: 0 })).toBe(1);
    expect(GamingIdentity.calculateGamerLevel({ totalPlayTime: 6000 })).toBeGreaterThan(1);
    expect(GamingIdentity.calculateGamerLevel({ totalPlayTime: 60000 })).toBeGreaterThan(
      GamingIdentity.calculateGamerLevel({ totalPlayTime: 600 })
    );
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

  test('getAchievedBadges returns platform badges for platforms with 10+ launches', () => {
    StatsAggregationService.getDashboardData.mockReturnValue({
      periods: {
        all: {
          playtimeMinutes: 600,
          sessions: 30,
          platformCounts: { Steam: 25, Xbox: 3 },
          moodCounts: {},
          genreCounts: {},
          featureUsage: { counts: {} },
        },
      },
    });

    const badges = GamingIdentity.getAchievedBadges();

    expect(badges).toHaveLength(1);
    expect(badges[0].id).toBe('platform_Steam');
    expect(badges[0].name).toBe('Steam Fan');
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
