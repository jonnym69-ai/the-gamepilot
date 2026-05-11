/**
 * MilestoneService - Tracks major XP milestones, prestige system, and calendar events
 * Integrates with ProgressionUnlockService and AchievementTracker
 */

import { ProgressionUnlockService } from './ProgressionUnlockService';
import StorageService from './StorageService';

const MILESTONE_STORAGE_KEY = 'gamepilot_milestones';
const PRESTIGE_STORAGE_KEY = 'gamepilot_prestige';

// Major XP Milestones
const MILESTONE_DEFINITIONS = [
  { id: 'first_steps', name: 'First Steps', xp: 100, icon: '👣', description: 'Earn your first 100 XP' },
  { id: 'rising_star', name: 'Rising Star', xp: 500, icon: '⭐', description: 'Reach 500 XP' },
  { id: 'dedicated_gamer', name: 'Dedicated Gamer', xp: 1000, icon: '🎮', description: 'Reach 1,000 XP' },
  { id: 'seasoned_player', name: 'Seasoned Player', xp: 2500, icon: '🏆', description: 'Reach 2,500 XP' },
  { id: 'veteran', name: 'Veteran', xp: 5000, icon: '🎖️', description: 'Reach 5,000 XP' },
  { id: 'elite', name: 'Elite Gamer', xp: 10000, icon: '👑', description: 'Reach 10,000 XP' },
  { id: 'legend', name: 'Legend', xp: 25000, icon: '🐉', description: 'Reach 25,000 XP' },
  { id: 'immortal', name: 'Immortal', xp: 50000, icon: '☄️', description: 'Reach 50,000 XP' },
  { id: 'mythic', name: 'Mythic', xp: 100000, icon: '🌟', description: 'Reach 100,000 XP' }
];

// Prestige system constants
const PRESTIGE_BONUS_PERCENT = 5; // 5% bonus per prestige level
const MAX_PRESTIGE_LEVEL = 10;

class MilestoneService {
  /**
   * Get milestone data from storage
   */
  static getMilestoneData() {
    try {
      const stored = StorageService.getString(MILESTONE_STORAGE_KEY);
      return stored ? JSON.parse(stored) : { achieved: [], lastCheckXP: 0 };
    } catch (error) {
      console.error('Error reading milestone data:', error);
      return { achieved: [], lastCheckXP: 0 };
    }
  }

  /**
   * Save milestone data to storage
   */
  static saveMilestoneData(data) {
    try {
      StorageService.setString(MILESTONE_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving milestone data:', error);
    }
  }

  /**
   * Get prestige data from storage
   */
  static getPrestigeData() {
    try {
      const stored = StorageService.getString(PRESTIGE_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      return {
        prestigeLevel: 0,
        totalPrestiges: 0,
        prestigeHistory: [],
        permanentBonuses: {
          xpMultiplier: 0,
          themeAccess: [],
          exclusiveRewards: []
        }
      };
    } catch (error) {
      console.error('Error reading prestige data:', error);
      return {
        prestigeLevel: 0,
        totalPrestiges: 0,
        prestigeHistory: [],
        permanentBonuses: { xpMultiplier: 0, themeAccess: [], exclusiveRewards: [] }
      };
    }
  }

  /**
   * Save prestige data to storage
   */
  static savePrestigeData(data) {
    try {
      StorageService.setString(PRESTIGE_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving prestige data:', error);
    }
  }

  /**
   * Check for newly achieved milestones
   * @returns {Array} Newly achieved milestones
   */
  static checkMilestones() {
    const currentXP = ProgressionUnlockService.getTotalXP();
    const data = this.getMilestoneData();
    const newlyAchieved = [];

    // Check each milestone
    for (const milestone of MILESTONE_DEFINITIONS) {
      const alreadyAchieved = data.achieved.some(a => a.id === milestone.id);
      
      if (!alreadyAchieved && currentXP >= milestone.xp) {
        const achievement = {
          ...milestone,
          achievedAt: new Date().toISOString(),
          xpAtAchievement: currentXP
        };
        data.achieved.push(achievement);
        newlyAchieved.push(achievement);
      }
    }

    data.lastCheckXP = currentXP;
    this.saveMilestoneData(data);

    return newlyAchieved;
  }

  /**
   * Get all milestones with achievement status
   */
  static getAllMilestones() {
    const currentXP = ProgressionUnlockService.getTotalXP();
    const data = this.getMilestoneData();
    const achievedIds = new Set(data.achieved.map(a => a.id));

    return MILESTONE_DEFINITIONS.map(milestone => ({
      ...milestone,
      achieved: achievedIds.has(milestone.id),
      achievedAt: data.achieved.find(a => a.id === milestone.id)?.achievedAt || null,
      progressPercent: Math.min(100, (currentXP / milestone.xp) * 100),
      xpRemaining: Math.max(0, milestone.xp - currentXP)
    }));
  }

  /**
   * Get next milestone to achieve
   */
  static getNextMilestone() {
    const currentXP = ProgressionUnlockService.getTotalXP();
    const data = this.getMilestoneData();
    const achievedIds = new Set(data.achieved.map(a => a.id));

    for (const milestone of MILESTONE_DEFINITIONS) {
      if (!achievedIds.has(milestone.id)) {
        return {
          ...milestone,
          progressPercent: Math.min(100, (currentXP / milestone.xp) * 100),
          xpRemaining: Math.max(0, milestone.xp - currentXP)
        };
      }
    }

    return null; // All milestones achieved
  }

  /**
   * Check if user is eligible for prestige
   * Requirements: Reach highest milestone (100k XP) and have no pending prestige
   */
  static canPrestige() {
    const currentXP = ProgressionUnlockService.getTotalXP();
    const prestigeData = this.getPrestigeData();
    const highestMilestone = MILESTONE_DEFINITIONS[MILESTONE_DEFINITIONS.length - 1];
    
    return currentXP >= highestMilestone.xp && prestigeData.prestigeLevel < MAX_PRESTIGE_LEVEL;
  }

  /**
   * Perform prestige - reset XP but keep permanent bonuses
   */
  static performPrestige() {
    if (!this.canPrestige()) {
      return { success: false, error: 'Not eligible for prestige' };
    }

    const prestigeData = this.getPrestigeData();
    const currentXP = ProgressionUnlockService.getTotalXP();
    const newPrestigeLevel = prestigeData.prestigeLevel + 1;

    // Record prestige event
    const prestigeEvent = {
      prestigeLevel: newPrestigeLevel,
      date: new Date().toISOString(),
      xpAtPrestige: currentXP,
      milestone: 'Mythic'
    };

    prestigeData.prestigeLevel = newPrestigeLevel;
    prestigeData.totalPrestiges += 1;
    prestigeData.prestigeHistory.push(prestigeEvent);

    // Add permanent bonuses
    prestigeData.permanentBonuses.xpMultiplier = (newPrestigeLevel * PRESTIGE_BONUS_PERCENT) / 100;
    
    // Unlock exclusive prestige rewards
    const prestigeRewards = this.getPrestigeRewards(newPrestigeLevel);
    prestigeData.permanentBonuses.exclusiveRewards.push(...prestigeRewards);

    this.savePrestigeData(prestigeData);

    // Reset milestone tracking for new journey
    const milestoneData = this.getMilestoneData();
    milestoneData.achieved = [];
    milestoneData.lastCheckXP = 0;
    this.saveMilestoneData(milestoneData);

    return {
      success: true,
      prestigeLevel: newPrestigeLevel,
      xpMultiplier: prestigeData.permanentBonuses.xpMultiplier,
      newRewards: prestigeRewards,
      message: `Prestige ${newPrestigeLevel} achieved! You now have a ${newPrestigeLevel * PRESTIGE_BONUS_PERCENT}% permanent XP bonus.`
    };
  }

  /**
   * Get prestige rewards for a given prestige level
   */
  static getPrestigeRewards(prestigeLevel) {
    const rewards = [];
    
    if (prestigeLevel === 1) {
      rewards.push({ type: 'title', id: 'prestige_1', name: 'Reborn', description: 'Completed your first prestige' });
      rewards.push({ type: 'theme', id: 'prestige_gold', name: 'Prestige Gold', description: 'Exclusive prestige theme' });
    } else if (prestigeLevel === 3) {
      rewards.push({ type: 'title', id: 'prestige_3', name: 'Ascended', description: 'Third prestige completed' });
      rewards.push({ type: 'banner', id: 'ascended_banner', name: 'Ascended Banner' });
    } else if (prestigeLevel === 5) {
      rewards.push({ type: 'title', id: 'prestige_5', name: 'Transcendent', description: 'Fifth prestige - truly dedicated' });
      rewards.push({ type: 'animation', id: 'prestige_animation', name: 'Prestige Aura' });
    } else if (prestigeLevel === 10) {
      rewards.push({ type: 'title', id: 'prestige_10', name: 'Immortal Legend', description: 'Maximum prestige achieved' });
      rewards.push({ type: 'exclusive', id: 'immortal_frame', name: 'Immortal Frame', description: 'The ultimate recognition' });
    }

    // Every prestige gets a badge
    rewards.push({
      type: 'badge',
      id: `prestige_${prestigeLevel}_badge`,
      name: `Prestige ${prestigeLevel}`,
      description: `Prestige level ${prestigeLevel} badge`
    });

    return rewards;
  }

  /**
   * Get current prestige status
   */
  static getPrestigeStatus() {
    const prestigeData = this.getPrestigeData();
    const currentXP = ProgressionUnlockService.getTotalXP();
    const canPrestige = this.canPrestige();

    return {
      prestigeLevel: prestigeData.prestigeLevel,
      totalPrestiges: prestigeData.totalPrestiges,
      xpMultiplier: prestigeData.permanentBonuses.xpMultiplier,
      canPrestige,
      prestigeProgress: canPrestige ? 100 : (currentXP / 100000) * 100,
      history: prestigeData.prestigeHistory,
      permanentBonuses: prestigeData.permanentBonuses
    };
  }

  /**
   * Get calendar events (milestones and prestige dates)
   */
  static getCalendarEvents() {
    const events = [];
    const milestoneData = this.getMilestoneData();
    const prestigeData = this.getPrestigeData();

    // Add milestone achievements
    for (const achievement of milestoneData.achieved) {
      const date = new Date(achievement.achievedAt);
      events.push({
        id: `milestone_${achievement.id}`,
        type: 'milestone',
        title: achievement.name,
        description: achievement.description,
        date: achievement.achievedAt,
        day: date.getDate(),
        month: date.getMonth(),
        year: date.getFullYear(),
        icon: achievement.icon,
        xp: achievement.xpAtAchievement
      });
    }

    // Add prestige events
    for (const prestige of prestigeData.prestigeHistory) {
      const date = new Date(prestige.date);
      events.push({
        id: `prestige_${prestige.prestigeLevel}`,
        type: 'prestige',
        title: `Prestige ${prestige.prestigeLevel}`,
        description: `Achieved ${prestige.milestone} milestone and prestiged!`,
        date: prestige.date,
        day: date.getDate(),
        month: date.getMonth(),
        year: date.getFullYear(),
        icon: '🌟',
        xp: prestige.xpAtPrestige,
        prestigeLevel: prestige.prestigeLevel
      });
    }

    // Sort by date (newest first)
    return events.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  /**
   * Get calendar events for a specific month
   */
  static getCalendarEventsForMonth(year, month) {
    const allEvents = this.getCalendarEvents();
    return allEvents.filter(e => e.year === year && e.month === month);
  }

  /**
   * Get total XP with prestige multiplier applied
   */
  static getEffectiveXPMultiplier() {
    const prestigeData = this.getPrestigeData();
    return 1 + (prestigeData.permanentBonuses.xpMultiplier || 0);
  }

  /**
   * Get milestone summary for display
   */
  static getMilestoneSummary() {
    const milestones = this.getAllMilestones();
    const nextMilestone = this.getNextMilestone();
    const prestigeStatus = this.getPrestigeStatus();
    const recentEvents = this.getCalendarEvents().slice(0, 5);

    const achievedCount = milestones.filter(m => m.achieved).length;
    const totalCount = milestones.length;

    return {
      totalMilestones: totalCount,
      achievedMilestones: achievedCount,
      progressPercent: (achievedCount / totalCount) * 100,
      nextMilestone,
      prestigeStatus,
      recentEvents,
      allMilestones: milestones
    };
  }

  /**
   * Reset all milestone and prestige data (for testing)
   */
  static resetAllData() {
    StorageService.remove(MILESTONE_STORAGE_KEY);
    StorageService.remove(PRESTIGE_STORAGE_KEY);
  }
}

export { MilestoneService, MILESTONE_DEFINITIONS, PRESTIGE_BONUS_PERCENT, MAX_PRESTIGE_LEVEL };
export default MilestoneService;
