import { ACHIEVEMENTS, AchievementTracker } from './AchievementSystem';
import StorageService from './services/StorageService';

const catalog = Object.values(ACHIEVEMENTS).flat();

describe('AchievementSystem curated catalog', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('contains only unique, complete achievement definitions', () => {
    const ids = catalog.map((achievement) => achievement.id);
    const names = catalog.map((achievement) => achievement.name);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(names).size).toBe(names.length);
    catalog.forEach((achievement) => {
      expect(achievement.id).toBeTruthy();
      expect(achievement.name).toBeTruthy();
      expect(achievement.desc).toBeTruthy();
      expect(achievement.icon).toBeTruthy();
      expect(['COMMON', 'RARE', 'EPIC', 'LEGENDARY']).toContain(achievement.rarity);
    });
  });

  test('keeps permanent and rolling thresholds within the curated ranges', () => {
    expect(ACHIEVEMENTS.library.some(({ id }) => id === 'collector_500')).toBe(true);
    expect(ACHIEVEMENTS.library.some(({ id }) => id === 'collector_750')).toBe(false);
    expect(ACHIEVEMENTS.time.some(({ id }) => id === 'hour_500')).toBe(true);
    expect(ACHIEVEMENTS.time.some(({ id }) => id === 'hour_1000')).toBe(false);
    expect(ACHIEVEMENTS.sessions.map(({ id }) => id)).toEqual([
      'session_warrior_30',
      'session_warrior_1h',
      'session_warrior_2h',
      'session_warrior_4h'
    ]);
    expect(ACHIEVEMENTS.daily.some(({ id }) => id === 'daily_2hours')).toBe(true);
    expect(ACHIEVEMENTS.daily.some(({ id }) => id === 'daily_5hours')).toBe(false);
  });

  test('tracks lifetime mood progress and unlocks realistic mood milestones', () => {
    for (let index = 0; index < 5; index += 1) {
      AchievementTracker.logGameplayMood('Relaxed');
    }
    AchievementTracker.checkAndUnlockAchievements();

    expect(AchievementTracker.getLifetimeMoodStats().relaxed).toBe(5);
    expect(AchievementTracker.isAchievementUnlocked('relaxed_5')).toBe(true);
  });

  test('records longest sessions and unlocks only reached duration milestones', () => {
    AchievementTracker.recordSessionDurationAchievements(75);

    expect(AchievementTracker.getLongestSessionMinutes()).toBe(75);
    expect(AchievementTracker.isAchievementUnlocked('session_warrior_30')).toBe(true);
    expect(AchievementTracker.isAchievementUnlocked('session_warrior_1h')).toBe(true);
    expect(AchievementTracker.isAchievementUnlocked('session_warrior_2h')).toBe(false);
  });

  test('derives rating and completion achievements from the current library', () => {
    StorageService.set('library', [
      { name: 'Rated and finished', userRating: 8, completionStatus: 'completed' }
    ]);
    AchievementTracker.checkAndUnlockAchievements();

    expect(AchievementTracker.isAchievementUnlocked('rating_1')).toBe(true);
    expect(AchievementTracker.isAchievementUnlocked('completion_1')).toBe(true);
  });

  test('tracks retained recommendation feature achievements', () => {
    AchievementTracker.logGameplayFeature('perfect_play');
    AchievementTracker.checkAndUnlockAchievements();

    expect(AchievementTracker.isAchievementUnlocked('perfect_play_1')).toBe(true);
  });

  test('tracks theme achievements from unique games played', () => {
    const horrorGame = { name: 'Resident Evil', appid: 're1', genres: ['Action'], tags: ['survival horror', 'horror'] };
    const anotherHorror = { name: 'Amnesia', appid: 'am1', genres: ['Adventure'], tags: ['psychological horror'] };
    const thirdHorror = { name: 'Outlast', appid: 'ol1', genres: ['Action'], tags: ['horror'] };

    AchievementTracker.trackThemeUsage(horrorGame);
    AchievementTracker.trackThemeUsage(anotherHorror);
    AchievementTracker.trackThemeUsage(thirdHorror);
    AchievementTracker.checkAndUnlockAchievements();

    expect(AchievementTracker.getThemeUniqueCount('horror')).toBe(3);
    expect(AchievementTracker.isAchievementUnlocked('theme_horror_3')).toBe(true);
    expect(AchievementTracker.isAchievementUnlocked('theme_horror_5')).toBe(false);
  });

  test('does not double-count the same game for theme tracking', () => {
    const game = { name: 'Project Zomboid', appid: 'pz1', tags: ['zombies', 'survival'] };

    AchievementTracker.trackThemeUsage(game);
    AchievementTracker.trackThemeUsage(game);

    expect(AchievementTracker.getThemeUniqueCount('survival')).toBe(1);
  });

  test('tracks backlog dust-off milestones', () => {
    const sixMonthsAgo = Date.now() - (1000 * 60 * 60 * 24 * 200);
    const oldGame = { name: 'Stale Game', last_played: sixMonthsAgo };

    expect(AchievementTracker.checkDustOff(oldGame)).toBe(true);
    AchievementTracker.trackBacklogMilestone('dust_off');
    AchievementTracker.checkAndUnlockAchievements();

    expect(AchievementTracker.isAchievementUnlocked('dust_off_1')).toBe(true);
    expect(AchievementTracker.isAchievementUnlocked('dust_off_5')).toBe(false);
  });

  test('tracks backlog shelf-diver milestones', () => {
    const twoYearsAgo = Date.now() - (1000 * 60 * 60 * 24 * 730);
    const oldGame = { name: 'Ancient Game', dateAdded: twoYearsAgo };

    expect(AchievementTracker.checkShelfDiver(oldGame)).toBe(true);
    AchievementTracker.trackBacklogMilestone('shelf_diver');
    AchievementTracker.checkAndUnlockAchievements();

    expect(AchievementTracker.isAchievementUnlocked('shelf_diver_1')).toBe(true);
  });

  test('detects themes from genres as well as tags', () => {
    const fantasyGame = { name: 'Skyrim', genres: ['RPG'], tags: ['fantasy', 'open world'] };
    const themes = AchievementTracker.getThemesForGame(fantasyGame);
    expect(themes).toContain('fantasy');
  });
});
