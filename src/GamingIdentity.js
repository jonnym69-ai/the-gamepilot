// GamingIdentity.js - Enhanced Gaming Identity System
import { AchievementTracker } from './AchievementSystem';
import { StatsAggregationService } from './services/StatsAggregationService';
import { StartupPersonalizationService } from './services/StartupPersonalizationService';
import StorageService from './services/StorageService';

export class GamingIdentity {
  static getProfile() {
    const stats = this.getGamingStats();
    const identity = this.getGamingIdentity(stats);
    
    // Get or set join date
    let joinDate = StorageService.getString('joinDate');
    if (!joinDate) {
      joinDate = new Date().toISOString();
      StorageService.setString('joinDate', joinDate);
    }

    return {
      username: StorageService.getString('profileUsername', 'Gamer'),
      profilePic: StorageService.getString('profilePic', ''),
      welcomeMessage: StorageService.getString('welcomeMessage', 'Ready to find your perfect play?'),
      joinDate: joinDate,
      level: this.calculateGamerLevel(stats),
      title: this.getGamerTitle(stats),
      badges: this.getAchievedBadges(),
      stats: stats,
      identity: identity
    };
  }

  static calculateGamerLevel(stats) {
    const timeScore = Math.floor(stats.totalPlayTime / 60); // 1 point per hour
    const achievementScore = stats.achievementProgress?.unlocked * 10 || 0; // 10 points per achievement
    const libraryScore = stats.librarySize || 0; // 1 point per game
    
    const totalScore = timeScore + achievementScore + libraryScore;
    
    // Level thresholds (every 100 points = 1 level)
    return Math.floor(totalScore / 100) + 1;
  }

  static getGamerTitle(stats) {
    const level = this.calculateGamerLevel(stats);
    const platformStats = AchievementTracker.getPlatformStats();
    
    const titles = [
      { name: 'Newbie', requirement: () => level >= 1 },
      { name: 'Casual Gamer', requirement: () => level >= 3 },
      { name: 'Dedicated Player', requirement: () => level >= 5 },
      { name: 'Game Enthusiast', requirement: () => level >= 10 },
      { name: 'Hardcore Gamer', requirement: () => level >= 15 },
      { name: 'Gaming Legend', requirement: () => level >= 20 },
      { name: 'Platform Master', requirement: () => Object.keys(platformStats).length >= 5 },
      { name: 'Time Lord', requirement: () => stats.totalPlayTime >= 1000 }, // 1000+ hours
      { name: 'Achievement Hunter', requirement: () => stats.achievementProgress?.unlocked >= 20 },
      { name: 'Game Master', requirement: () => level >= 25 }
    ];
    
    // Find highest title achieved
    for (let i = titles.length - 1; i >= 0; i--) {
      if (titles[i].requirement()) {
        return titles[i].name;
      }
    }
    
    return 'Newbie';
  }

  static getAchievedBadges() {
    const achievements = AchievementTracker.getUnlockedAchievements();
    const badges = [];
    
    // Achievement badges
    achievements.forEach(achievementId => {
      badges.push({
        id: achievementId,
        type: 'achievement',
        icon: this.getAchievementIcon(achievementId),
        name: this.getAchievementName(achievementId),
        date: StorageService.getString(`achievement_${achievementId}_date`, new Date().toISOString())
      });
    });
    
    // Weekly mood badges
    const weeklyBadge = AchievementTracker.getWeeklyMoodBadge();
    if (weeklyBadge) {
      badges.push({
        id: 'weekly_mood',
        type: 'weekly',
        icon: '🏆',
        name: weeklyBadge.badge,
        description: `Most used mood: ${weeklyBadge.mood}`,
        date: new Date().toISOString()
      });
    }
    
    // Platform badges
    const platformStats = AchievementTracker.getPlatformStats();
    Object.entries(platformStats).forEach(([platform, count]) => {
      if (count >= 10) {
        badges.push({
          id: `platform_${platform}`,
          type: 'platform',
          icon: this.getPlatformIcon(platform),
          name: `${platform} Fan`,
          description: `${count} launches on ${platform}`,
          date: new Date().toISOString()
        });
      }
    });
    
    return badges.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  static getGamingStats() {
    const library = StorageService.get('library', []);
    const librarySize = library.length;
    const dashboardData = StatsAggregationService.getDashboardData(library);
    const allTimeSnapshot = dashboardData?.periods?.all;
    const onboardingSeed = StartupPersonalizationService.getSeededRecommendationContext();
    const legacyTimeStats = AchievementTracker.getTimeStats();
    const platformStats = Object.keys(allTimeSnapshot?.platformCounts || {}).length > 0
      ? allTimeSnapshot.platformCounts
      : AchievementTracker.getPlatformStats();
    const featureStats = Object.keys(allTimeSnapshot?.featureUsage?.counts || {}).length > 0
      ? allTimeSnapshot.featureUsage.counts
      : AchievementTracker.getFeatureStats();
    const moodStats = Object.keys(allTimeSnapshot?.moodCounts || {}).length > 0
      ? allTimeSnapshot.moodCounts
      : AchievementTracker.getMoodStats();
    const genreStats = Object.keys(allTimeSnapshot?.genreCounts || {}).length > 0
      ? allTimeSnapshot.genreCounts
      : AchievementTracker.getGenreStats();
    const totalPlayTime = Number(allTimeSnapshot?.playtimeMinutes || legacyTimeStats.total || 0);
    const totalSessions = Number(allTimeSnapshot?.sessions || legacyTimeStats.sessions || 0);
    
    return {
      totalPlayTime,
      totalSessions,
      averageSessionTime: totalSessions > 0 ? Math.round(totalPlayTime / totalSessions) : 0,
      favoritePlatform: this.getFavoritePlatform(platformStats),
      mostUsedFeature: this.getMostUsedFeature(featureStats),
      favoriteMood: this.getFavoriteMood(moodStats) !== 'None' ? this.getFavoriteMood(moodStats) : (onboardingSeed?.moods?.[0] || 'None'),
      favoriteGenre: this.getFavoriteGenre(genreStats) !== 'None' ? this.getFavoriteGenre(genreStats) : (onboardingSeed?.genres?.[0] || 'None'),
      platformDiversity: Object.keys(platformStats).length,
      achievementProgress: {
        unlocked: AchievementTracker.getUnlockedAchievements().length,
        total: this.getTotalAchievements()
      },
      librarySize: librarySize,
      onboardingSeed
    };
  }

  static getGamingIdentity(stats) {
    // Gaming personality analysis
    const gamerType = this.determineGamerType(stats);
    const playStyle = this.determinePlayStyle(stats);
    const preferences = this.determinePreferences(stats);
    const habits = this.determineHabits(stats);
    
    return {
      personality: gamerType,
      playStyle: playStyle,
      favoriteMood: stats.favoriteMood || 'None',
      description: `${habits.frequency} ${gamerType} gamer with ${playStyle.toLowerCase()} sessions${stats.onboardingSeed?.playerVibe ? ` • seeded by ${stats.onboardingSeed.playerVibe.toLowerCase()}` : ''}`,
      preferences: preferences,
      habits: habits,
      signature: this.generateGamerSignature(stats, { type: gamerType, playStyle })
    };
  }

  static determineGamerType(stats) {
    const { totalPlayTime, platformDiversity, favoriteMood } = stats;
    
    if (totalPlayTime > 500) return 'Hardcore';
    if (platformDiversity > 4) return 'Explorer';
    if (favoriteMood === 'Competitive') return 'Competitor';
    if (favoriteMood === 'Relaxed') return 'Casual';
    if (totalPlayTime > 100) return 'Dedicated';
    return 'Newcomer';
  }

  static determinePlayStyle(stats) {
    const { averageSessionTime, favoriteMood, mostUsedFeature } = stats;
    
    if (averageSessionTime > 120) return 'Marathon';
    if (averageSessionTime < 30) return 'Quick Sessions';
    if (mostUsedFeature === 'perfect_play' || mostUsedFeature === 'perfectPlay') return 'Strategic';
    if (favoriteMood === 'Adventurous') return 'Explorer';
    return 'Balanced';
  }

  static determinePreferences(stats) {
    return {
      sessionLength: stats.averageSessionTime > 60 ? 'Long' : 'Short',
      platformVariety: stats.platformDiversity > 3 ? 'Diverse' : 'Focused',
      moodStability: stats.favoriteMood ? 'Consistent' : 'Varied',
      achievementFocus: stats.achievementProgress.unlocked > 10 ? 'Achievement Hunter' : 'Casual'
    };
  }

  static determineHabits(stats) {
    const { totalSessions, totalPlayTime } = stats;
    const sessionsPerWeek = Math.round((totalSessions / 30) * 7); // Assuming 30 days of data
    
    return {
      frequency: sessionsPerWeek > 7 ? 'Daily' : sessionsPerWeek > 3 ? 'Regular' : 'Occasional',
      consistency: totalPlayTime > 0 ? 'Consistent' : 'New',
      engagement: stats.achievementProgress.unlocked > 5 ? 'Highly Engaged' : 'Developing'
    };
  }

  static generateGamerSignature(stats, personality) {
    const title = this.getGamerTitle(stats);
    const level = this.calculateGamerLevel(stats);
    const type = personality.type;
    const platform = stats.favoritePlatform;
    
    return `${title} • Level ${level} • ${type} • ${platform} Gamer`;
  }

  // Helper functions
  static getAchievementIcon(achievementId) {
    const icons = {
      'first_game': '🎮',
      'collector_5': '📚',
      'hour_1': '⏱️',
      'relaxed_5': '😌',
      'perfect_play_1': '✨',
      'platform_diverse': '🔄'
    };
    return icons[achievementId] || '🏆';
  }

  static getAchievementName(achievementId) {
    const names = {
      'first_game': 'First Steps',
      'collector_5': 'Collector',
      'hour_1': 'Quick Session',
      'relaxed_5': 'Chill Master',
      'perfect_play_1': 'Perfect Start',
      'platform_diverse': 'Platform Diverse'
    };
    return names[achievementId] || 'Achievement';
  }

  static getPlatformIcon(platform) {
    const icons = {
      'Steam': '🚂', 'Epic': '🎮', 'GOG': '🌌', 'EA': '🎪',
      'Uplay': '🔷', 'Battle.net': '⚔️', 'Xbox': '🎯',
      'PlayStation': '🎮', 'Rockstar': '🪨', 'BSG': '🔫', 'Riot': '👊', 'Manual': '📝'
    };
    return icons[platform] || '❓';
  }

  static getFavoritePlatform(platformStats) {
    const entries = Object.entries(platformStats);
    if (entries.length === 0) return 'None';
    return entries.sort(([,a], [,b]) => b - a)[0][0];
  }

  static getMostUsedFeature(featureStats) {
    const entries = Object.entries(featureStats);
    if (entries.length === 0) return 'None';
    return entries.sort(([,a], [,b]) => b - a)[0][0];
  }

  static getFavoriteMood(moodStats) {
    const entries = Object.entries(moodStats || {});
    if (entries.length === 0) return 'None';

    if (typeof entries[0][1] === 'number') {
      return entries.sort(([,a], [,b]) => b - a)[0][0];
    }

    const moodCounts = {};
    entries.forEach(([, moods]) => {
      Object.entries(moods || {}).forEach(([mood, count]) => {
        moodCounts[mood] = (moodCounts[mood] || 0) + Number(count || 0);
      });
    });

    const aggregatedEntries = Object.entries(moodCounts);
    if (aggregatedEntries.length === 0) return 'None';
    return aggregatedEntries.sort(([,a], [,b]) => b - a)[0][0];
  }

  static getFavoriteGenre(genreStats) {
    const entries = Object.entries(genreStats);
    if (entries.length === 0) return 'None';
    return entries.sort(([,a], [,b]) => b - a)[0][0];
  }

  static getTotalAchievements() {
    // Count total achievements from AchievementSystem
    return 50; // Approximate total number of achievements
  }

  static updateGamingIdentity() {
    // Update level and title when achievements are unlocked
    const profile = this.getProfile();
    StorageService.setString('gamerLevel', profile.level);
    StorageService.setString('gamerTitle', profile.title);
    StorageService.setString('gamerType', this.determineGamerType(profile.stats));
  }

  static resetJoinDate() {
    // Reset join date to current date (for testing or correction)
    const currentDate = new Date().toISOString();
    StorageService.setString('joinDate', currentDate);
    return currentDate;
  }

  static getJoinDateFormatted() {
    const joinDate = StorageService.getString('joinDate');
    if (!joinDate) return 'Unknown';
    
    const date = new Date(joinDate);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
}
