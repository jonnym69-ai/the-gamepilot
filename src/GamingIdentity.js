// GamingIdentity.js - Enhanced Gaming Identity System
import { AchievementTracker } from './AchievementSystem';
import { StatsAggregationService } from './services/StatsAggregationService';
import { StartupPersonalizationService } from './services/StartupPersonalizationService';
import { UserBehaviorProfile } from './services/UserBehaviorProfile';
import { getEnhancedIdentity } from './services/GamingIdentityEnhancements';
import StorageService from './services/StorageService';

const IDENTITY_SNAPSHOTS_KEY = 'identitySnapshots';
const IDENTITY_REWARDS_KEY = 'identityRewards';

// Lightweight 500ms memoization to prevent duplicate expensive computations
// within a single React render cycle or rapid successive calls.
let _profileCache = null;
let _profileCacheTime = 0;
let _statsCache = null;
let _statsCacheTime = 0;
const CACHE_TTL_MS = 500;

export class GamingIdentity {
  static getProfile() {
    const now = Date.now();
    if (_profileCache && now - _profileCacheTime < CACHE_TTL_MS) {
      return _profileCache;
    }
    const stats = this.getGamingStats();
    const identity = this.getGamingIdentity(stats);
    
    // Get or set join date
    let joinDate = StorageService.getString('joinDate');
    if (!joinDate) {
      joinDate = new Date().toISOString();
      StorageService.setString('joinDate', joinDate);
    }

    const enhanced = getEnhancedIdentity();
    const behaviorPersona = UserBehaviorProfile.getPersonaSnapshot();

    const profile = {
      username: StorageService.getString('profileUsername', 'Gamer'),
      profilePic: StorageService.getString('profilePic', ''),
      welcomeMessage: StorageService.getString('welcomeMessage', 'Ready to find your perfect play?'),
      joinDate: joinDate,
      level: this.calculateGamerLevel(stats),
      title: this.getGamerTitle(stats),
      badges: this.getAchievedBadges(),
      stats: stats,
      identity: identity,
      streaks: enhanced.streaks,
      backlog: enhanced.backlog,
      milestones: enhanced.milestones,
      timeline: enhanced.timeline,
      seasonalTags: enhanced.seasonalTags,
      currentSeasonalTag: enhanced.currentSeasonalTag,
      archetype: enhanced.archetype,
      // Behavioral persona learned from actual play patterns
      persona: behaviorPersona
    };
    _profileCache = profile;
    _profileCacheTime = Date.now();
    return profile;
  }

  static calculateGamerLevel(_stats) {
    return AchievementTracker.getXPStats().level || 1;
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
      { name: 'Time Lord', requirement: () => stats.totalPlayTime >= 60000 }, // 1000+ hours (totalPlayTime is in minutes)
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
    const now = Date.now();
    if (_statsCache && now - _statsCacheTime < CACHE_TTL_MS) {
      return _statsCache;
    }
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
    
    const stats = {
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
    _statsCache = stats;
    _statsCacheTime = Date.now();
    return stats;
  }

  static getGamingIdentity(stats) {
    const behaviorPersona = UserBehaviorProfile.getPersonaSnapshot();
    const gamerType = this.determineGamerType(stats);
    const playStyle = this.determinePlayStyle(stats);
    const preferences = this.determinePreferences(stats);
    const habits = this.determineHabits(stats);

    // Mood persona is canonical; gamer type / archetype are secondary
    const personaLabel = behaviorPersona?.personaIdentity?.label || null;
    const dominantMood = behaviorPersona?.dominantMood || stats.favoriteMood || 'None';
    const dominantGenre = behaviorPersona?.dominantGenre || stats.favoriteGenre || null;

    const { GenreArchetypes } = require('./services/GamingIdentityEnhancements');
    const genreStats = dominantGenre && dominantGenre !== 'None' ? { [dominantGenre]: stats.totalPlayTime || 0 } : {};
    const archetype = GenreArchetypes.getArchetype(genreStats, stats);

    // Build description: lead with mood persona, then gamer type, then genre/archetype
    const descriptionParts = [personaLabel || `${habits.frequency} ${gamerType} gamer`];
    if (personaLabel) {
      descriptionParts.push(`— ${gamerType.toLowerCase()} playstyle`);
    }
    const playStyleLower = playStyle.toLowerCase();
    const sessionsSuffix = playStyleLower.endsWith('sessions') ? '' : ' sessions';
    descriptionParts.push(`with ${playStyleLower}${sessionsSuffix}`);
    if (archetype?.name && archetype.name !== 'Gamer') {
      descriptionParts.push(`• ${archetype.name}`);
    } else if (dominantGenre && dominantGenre !== 'None') {
      descriptionParts.push(`• ${dominantGenre} specialist`);
    }

    return {
      personality: personaLabel || gamerType,
      playStyle: playStyle,
      favoriteMood: dominantMood,
      favoriteGenre: dominantGenre,
      archetype: archetype?.name || null,
      description: descriptionParts.join(' '),
      preferences: preferences,
      habits: habits,
      signature: this.generateGamerSignature(stats, { personaLabel, gamerType, playStyle }),
      personaTags: behaviorPersona?.personaTags || []
    };
  }

  static determineGamerType(stats) {
    const { totalPlayTime, platformDiversity, favoriteMood } = stats;
    
    if (totalPlayTime > 500) return 'Hardcore';
    if (platformDiversity > 4) return 'Explorer';
    if (favoriteMood === 'Social') return 'Competitor';
    if (favoriteMood === 'Relaxed') return 'Casual';
    if (totalPlayTime > 100) return 'Dedicated';
    return 'Newcomer';
  }

  static determinePlayStyle(stats) {
    const { averageSessionTime, favoriteMood, mostUsedFeature } = stats;
    
    if (averageSessionTime > 120) return 'Marathon';
    if (averageSessionTime < 30) return 'Quick Sessions';
    if (mostUsedFeature === 'perfect_play' || mostUsedFeature === 'perfectPlay') return 'Strategic';
    if (favoriteMood === 'Escapist') return 'Explorer';
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
    const type = personality.personaLabel || personality.gamerType;
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

  // ---- Identity Snapshot History ----

  static saveIdentitySnapshot() {
    const profile = this.getProfile();
    const snapshots = StorageService.get(IDENTITY_SNAPSHOTS_KEY, []);
    const today = new Date().toISOString().split('T')[0];

    // Only save one snapshot per day
    if (snapshots.length > 0) {
      const last = snapshots[snapshots.length - 1];
      if (last.date.startsWith(today)) return snapshots;
    }

    snapshots.push({
      date: new Date().toISOString(),
      level: profile.level,
      title: profile.title,
      archetype: profile.identity?.archetype || null,
      favoriteMood: profile.identity?.favoriteMood || null,
      favoriteGenre: profile.identity?.favoriteGenre || null,
      playStyle: profile.identity?.playStyle || null,
      totalPlayTime: profile.stats?.totalPlayTime || 0,
      totalSessions: profile.stats?.totalSessions || 0,
      librarySize: profile.stats?.librarySize || 0
    });

    // Keep last 52 snapshots (roughly a year of weekly snapshots)
    const trimmed = snapshots.slice(-52);
    StorageService.set(IDENTITY_SNAPSHOTS_KEY, trimmed);
    return trimmed;
  }

  static getIdentitySnapshots() {
    return StorageService.get(IDENTITY_SNAPSHOTS_KEY, []);
  }

  // ---- Completion-Driven Identity Rewards ----

  static checkIdentityRewards() {
    const profile = this.getProfile();
    const unlocked = StorageService.get(IDENTITY_REWARDS_KEY, []);
    const newRewards = [];

    const rewardDefs = [
      { id: 'mood_master', name: 'Mood Master', icon: '🎭', requirement: () => profile.identity?.favoriteMood && profile.stats?.totalSessions >= 10 },
      { id: 'genre_specialist', name: 'Genre Specialist', icon: '🎯', requirement: () => profile.identity?.favoriteGenre && profile.stats?.totalPlayTime >= 300 },
      { id: 'archetype_unlocked', name: 'True Identity', icon: '🏆', requirement: () => profile.identity?.archetype !== null && profile.stats?.librarySize >= 5 },
      { id: 'marathon_runner', name: 'Marathon Runner', icon: '⏱️', requirement: () => profile.identity?.playStyle === 'Marathon' && profile.stats?.totalPlayTime >= 600 },
      { id: 'quick_session_king', name: 'Quick Session King', icon: '⚡', requirement: () => profile.identity?.playStyle === 'Quick Sessions' && profile.stats?.totalSessions >= 20 },
      { id: 'strategist', name: 'Strategist', icon: '♟️', requirement: () => profile.identity?.playStyle === 'Strategic' && profile.stats?.totalSessions >= 15 },
      { id: 'explorer', name: 'Explorer', icon: '🗺️', requirement: () => profile.identity?.playStyle === 'Explorer' && profile.stats?.librarySize >= 8 }
    ];

    for (const def of rewardDefs) {
      if (!unlocked.includes(def.id) && def.requirement()) {
        unlocked.push(def.id);
        newRewards.push(def);
      }
    }

    if (newRewards.length > 0) {
      StorageService.set(IDENTITY_REWARDS_KEY, unlocked);
    }

    return { unlocked, newRewards };
  }

  static getIdentityRewards() {
    const all = [
      { id: 'mood_master', name: 'Mood Master', icon: '🎭', desc: 'Found your signature mood after 10 sessions.' },
      { id: 'genre_specialist', name: 'Genre Specialist', icon: '🎯', desc: '5+ hours in your favorite genre.' },
      { id: 'archetype_unlocked', name: 'True Identity', icon: '🏆', desc: 'Discovered your archetype with 5+ games.' },
      { id: 'marathon_runner', name: 'Marathon Runner', icon: '⏱️', desc: '10+ hours as a marathon player.' },
      { id: 'quick_session_king', name: 'Quick Session King', icon: '⚡', desc: '20+ quick sessions logged.' },
      { id: 'strategist', name: 'Strategist', icon: '♟️', desc: '15+ strategic sessions played.' },
      { id: 'explorer', name: 'Explorer', icon: '🗺️', desc: '8+ games in your library as an explorer.' }
    ];
    const unlocked = StorageService.get(IDENTITY_REWARDS_KEY, []);
    return all.map((r) => ({ ...r, unlocked: unlocked.includes(r.id) }));
  }
}
