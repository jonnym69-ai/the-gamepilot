import { getDateKey } from './DateKeyService';
import StorageService from './StorageService';
import { QuestRerollService } from './QuestRerollService';
import { AchievementTracker } from '../AchievementSystem';

const ENGAGEMENT_KEY = 'dailyEngagement';
const EVENT_BONUSES_KEY = 'dailyEventBonuses';

const isChristmasDay = (date = new Date()) => date.getMonth() === 11 && date.getDate() === 25;

const getStoredEventBonuses = () => StorageService.get(EVENT_BONUSES_KEY, {});

const saveStoredEventBonuses = (data) => StorageService.set(EVENT_BONUSES_KEY, data);

const grantXP = (amount) => {
  AchievementTracker.grantXP('daily_engagement', amount, { source: 'daily_engagement' });
};

const applyDuplicateCosmeticReward = (reward) => {
  const fallbackXP = reward.duplicateXP || 175;
  grantXP(fallbackXP);
  return { applied: true, message: `${reward.label} already owned, converted to +${fallbackXP} XP!` };
};

const applyReward = (reward) => {
  if (reward.type === 'xp' && reward.amount > 0) {
    grantXP(reward.amount);
    return { applied: true, message: `+${reward.amount} XP rewarded!` };
  }

  if (reward.type === 'theme' && reward.themeId) {
    const unlockedThemes = StorageService.get('unlockedThemes', []);
    if (unlockedThemes.includes(reward.themeId)) {
      return applyDuplicateCosmeticReward(reward);
    }
    if (!unlockedThemes.includes(reward.themeId)) {
      unlockedThemes.push(reward.themeId);
    }
    StorageService.set('unlockedThemes', unlockedThemes);
    return { applied: true, message: `${reward.label} unlocked!` };
  }

  if (reward.type === 'frame' && reward.frameId) {
    const unlockedFrames = StorageService.get('unlockedProfileFrames', []);
    if (unlockedFrames.includes(reward.frameId)) {
      return applyDuplicateCosmeticReward(reward);
    }
    if (!unlockedFrames.includes(reward.frameId)) {
      unlockedFrames.push(reward.frameId);
    }
    StorageService.set('unlockedProfileFrames', unlockedFrames);
    return { applied: true, message: `${reward.label} unlocked!` };
  }

  if (reward.type === 'banner' && reward.bannerId) {
    const unlockedBanners = StorageService.get('unlockedProfileBanners', []);
    if (unlockedBanners.includes(reward.bannerId)) {
      return applyDuplicateCosmeticReward(reward);
    }
    if (!unlockedBanners.includes(reward.bannerId)) {
      unlockedBanners.push(reward.bannerId);
    }
    StorageService.set('unlockedProfileBanners', unlockedBanners);
    return { applied: true, message: `${reward.label} unlocked!` };
  }

  if (reward.type === 'title' && reward.titleId) {
    const unlockedTitles = StorageService.get('unlockedProfileTitles', []);
    if (unlockedTitles.includes(reward.titleId)) {
      return applyDuplicateCosmeticReward(reward);
    }
    if (!unlockedTitles.includes(reward.titleId)) {
      unlockedTitles.push(reward.titleId);
    }
    StorageService.set('unlockedProfileTitles', unlockedTitles);
    return { applied: true, message: `${reward.label} unlocked!` };
  }

  if (reward.type === 'booster' && reward.amount > 0) {
    const stored = StorageService.get('xpBoosters', { active: [], history: [] });
    stored.active.push({
      hours: reward.amount,
      activatedAt: new Date().toISOString()
    });
    StorageService.set('xpBoosters', stored);
    return { applied: true, message: `${reward.amount}h XP Booster activated!` };
  }

  if (reward.type === 'reroll' && reward.amount > 0) {
    QuestRerollService.addTokens(reward.amount, 'Daily Spin');
    return { applied: true, message: `${reward.amount} quest reroll${reward.amount === 1 ? '' : 's'} added!` };
  }

  if (reward.type === 'spin' && reward.amount > 0) {
    return { applied: true, message: `${reward.amount} bonus ${reward.amount === 1 ? 'spin' : 'spins'} queued!` };
  }

  return { applied: false, message: '' };
};

export const DAILY_REWARDS = [
  { id: 'xp_125', type: 'xp', amount: 125, label: '+125 XP', weight: 26 },
  { id: 'xp_150', type: 'xp', amount: 150, label: '+150 XP', weight: 24 },
  { id: 'xp_200', type: 'xp', amount: 200, label: '+200 XP', weight: 14 },
  { id: 'xp_275', type: 'xp', amount: 275, label: '+275 XP', weight: 7 },
  { id: 'booster_24h', type: 'booster', amount: 24, label: '24h XP Boost', weight: 9 },
  { id: 'booster_48h', type: 'booster', amount: 48, label: '48h XP Boost', weight: 3 },
  { id: 'bonus_spin', type: 'spin', amount: 1, label: 'Bonus Spin', weight: 7 },
  { id: 'bonus_spin_double', type: 'spin', amount: 2, label: '2 Bonus Spins', weight: 2 },
  { id: 'reroll_1', type: 'reroll', amount: 1, label: 'Quest Reroll Token', weight: 2 },
  { id: 'reroll_3', type: 'reroll', amount: 3, label: '3 Quest Rerolls', weight: 0.8 },
  { id: 'frame_starter', type: 'frame', frameId: 'starter_halo', label: 'Starter Halo Frame', weight: 2 },
  { id: 'banner_sunset', type: 'banner', bannerId: 'pilot_sunset', label: 'Pilot Sunset Banner', weight: 2 },
  { id: 'title_rookie_pilot', type: 'title', titleId: 'rookie_pilot', label: 'Rookie Pilot Title', weight: 1.5 },
  { id: 'theme_basic', type: 'theme', themeId: 'cyber-minimal', label: 'Cyber Minimal Theme', weight: 1.5 },
  { id: 'theme_retro', type: 'theme', themeId: 'retro-arcade', label: 'Retro Arcade Theme', weight: 1 }
];

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 365];

const getStoredEngagement = () => StorageService.get(ENGAGEMENT_KEY, null);

const saveEngagement = (data) => StorageService.set(ENGAGEMENT_KEY, data);

const getTodayDateString = () => {
  return getDateKey(new Date());
};

const getYesterdayDateString = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return getDateKey(yesterday);
};

const getDaysBetween = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

export const DailyEngagementService = {
  getStatus: () => {
    const data = getStoredEngagement() || {
      lastLoginDate: null,
      currentStreak: 0,
      longestStreak: 0,
      totalLogins: 0,
      spinsRemaining: 1,
      lastSpinDate: null,
      weeklySummaryShown: null,
      claimedRewards: []
    };

    const today = getTodayDateString();
    const yesterday = getYesterdayDateString();

    if (data.lastLoginDate !== today) {
      const daysSinceLastLogin = data.lastLoginDate ? getDaysBetween(data.lastLoginDate, today) : 999;

      if (daysSinceLastLogin > 1) {
        data.currentStreak = 0;
      }

      if (daysSinceLastLogin === 1) {
        data.currentStreak = (data.currentStreak || 0) + 1;
      } else if (!data.lastLoginDate || daysSinceLastLogin > 1) {
        data.currentStreak = 1;
      }

      data.longestStreak = Math.max(data.longestStreak || 0, data.currentStreak || 0);

      data.lastLoginDate = today;
      data.totalLogins = (data.totalLogins || 0) + 1;
      data.spinsRemaining = 1;

      if (isChristmasDay()) {
        const eventBonuses = getStoredEventBonuses();
        const christmasGrantKey = `christmas_${new Date().getFullYear()}`;

        if (!eventBonuses[christmasGrantKey]) {
          data.spinsRemaining = Math.max(data.spinsRemaining, 5);
          eventBonuses[christmasGrantKey] = {
            grantedAt: new Date().toISOString(),
            spinsGranted: 5
          };
          saveStoredEventBonuses(eventBonuses);
        }
      }

      saveEngagement(data);
    }

    return {
      ...data,
      canSpin: data.spinsRemaining > 0,
      streakAtRisk: data.currentStreak > 0 && data.lastLoginDate !== today && data.lastLoginDate !== yesterday,
      isChristmasDay: isChristmasDay(),
      rewardFloorXP: 125
    };
  },

  spinWheel: () => {
    const data = getStoredEngagement();
    const today = getTodayDateString();

    if (!data || data.spinsRemaining <= 0) {
      return { success: false, reward: null, message: 'No spins remaining today' };
    }

    const totalWeight = DAILY_REWARDS.reduce((sum, r) => sum + r.weight, 0);
    let random = Math.random() * totalWeight;
    let selectedReward = DAILY_REWARDS[0];

    for (const reward of DAILY_REWARDS) {
      random -= reward.weight;
      if (random <= 0) {
        selectedReward = reward;
        break;
      }
    }

    data.spinsRemaining = Math.max(0, (Number(data.spinsRemaining) || 0) - 1);
    data.lastSpinDate = today;

    const rewardResult = applyReward(selectedReward);
    if (selectedReward.type === 'spin' && selectedReward.amount > 0) {
      data.spinsRemaining += selectedReward.amount;
      rewardResult.message = `${selectedReward.amount} bonus ${selectedReward.amount === 1 ? 'spin' : 'spins'} added!`;
    }

    data.claimedRewards = data.claimedRewards || [];
    data.claimedRewards.push({
      ...selectedReward,
      date: today,
      applied: rewardResult.applied
    });

    saveEngagement(data);

    return {
      success: true,
      reward: selectedReward,
      newStreak: data.currentStreak,
      rewardMessage: rewardResult.message
    };
  },

  checkStreakMilestone: () => {
    const data = getStoredEngagement();
    if (!data) return null;

    const currentStreak = data.currentStreak || 0;
    const milestone = STREAK_MILESTONES.find(m => m === currentStreak);

    if (milestone) {
      return {
        reached: true,
        milestone,
        message: `${milestone} day streak achieved!`
      };
    }

    return null;
  },

  getWeeklySummary: () => {
    const data = getStoredEngagement();
    if (!data) return null;

    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const stats = {
      loginsThisWeek: 0,
      currentStreak: data.currentStreak || 0,
      longestStreak: data.longestStreak || 0,
      totalLogins: data.totalLogins || 0,
      spinsUsed: data.claimedRewards?.filter(r => r.date >= getDateKey(weekAgo)).length || 0
    };

    return stats;
  },

  shouldShowWeeklySummary: () => {
    const data = getStoredEngagement();
    if (!data) return false;

    const today = getTodayDateString();
    const dayOfWeek = new Date().getDay();

    if (dayOfWeek === 0 && data.weeklySummaryShown !== today) {
      return true;
    }

    return false;
  },

  markWeeklySummaryShown: () => {
    const data = getStoredEngagement() || {};
    data.weeklySummaryShown = getTodayDateString();
    saveEngagement(data);
  },

  grantBonusSpins: (amount = 1, source = 'Bonus Spin') => {
    const parsedAmount = Math.max(0, Math.round(Number(amount) || 0));

    if (!parsedAmount) {
      return { applied: false, message: 'No bonus spins granted' };
    }

    const data = getStoredEngagement() || {
      lastLoginDate: getTodayDateString(),
      currentStreak: 0,
      longestStreak: 0,
      totalLogins: 0,
      spinsRemaining: 0,
      lastSpinDate: null,
      weeklySummaryShown: null,
      claimedRewards: []
    };

    data.spinsRemaining = Math.max(0, Number(data.spinsRemaining) || 0) + parsedAmount;
    saveEngagement(data);

    return {
      applied: true,
      message: `${parsedAmount} extra ${parsedAmount === 1 ? 'spin' : 'spins'} added from ${source}!`
    };
  },

  getRewardHistory: () => {
    const data = getStoredEngagement();
    if (!data || !Array.isArray(data.claimedRewards)) return [];
    return [...data.claimedRewards].reverse();
  },

  getStreakMilestones: () => STREAK_MILESTONES,

  getAvailableRewards: () => DAILY_REWARDS
};

export default DailyEngagementService;
