const ENGAGEMENT_STORAGE_KEY = 'dailyEngagement';
const LAUNCH_REWARD_STATS_KEY = 'launchRewardStats';

const applyReward = (reward) => {
  if (reward.type === 'xp' && reward.amount > 0) {
    try {
      const stored = JSON.parse(localStorage.getItem(LAUNCH_REWARD_STATS_KEY) || '{}');
      const currentXP = Math.max(0, Math.round(Number(stored?.totalXP) || 0));
      localStorage.setItem(LAUNCH_REWARD_STATS_KEY, JSON.stringify({
        totalXP: currentXP + reward.amount,
        launches: stored?.launches || 0
      }));
      return { applied: true, message: `+${reward.amount} XP added!` };
    } catch (e) {
      return { applied: false, message: 'Failed to add XP' };
    }
  }

  if (reward.type === 'theme' && reward.themeId) {
    try {
      const unlockedThemes = JSON.parse(localStorage.getItem('unlockedThemes') || '[]');
      if (!unlockedThemes.includes(reward.themeId)) {
        unlockedThemes.push(reward.themeId);
        localStorage.setItem('unlockedThemes', JSON.stringify(unlockedThemes));
      }
      return { applied: true, message: `${reward.label} unlocked!` };
    } catch (e) {
      return { applied: false, message: 'Failed to unlock theme' };
    }
  }

  if (reward.type === 'frame' && reward.frameId) {
    try {
      const unlockedFrames = JSON.parse(localStorage.getItem('unlockedProfileFrames') || '[]');
      if (!unlockedFrames.includes(reward.frameId)) {
        unlockedFrames.push(reward.frameId);
        localStorage.setItem('unlockedProfileFrames', JSON.stringify(unlockedFrames));
      }
      return { applied: true, message: `${reward.label} unlocked!` };
    } catch (e) {
      return { applied: false, message: 'Failed to unlock frame' };
    }
  }

  if (reward.type === 'banner' && reward.bannerId) {
    try {
      const unlockedBanners = JSON.parse(localStorage.getItem('unlockedProfileBanners') || '[]');
      if (!unlockedBanners.includes(reward.bannerId)) {
        unlockedBanners.push(reward.bannerId);
        localStorage.setItem('unlockedProfileBanners', JSON.stringify(unlockedBanners));
      }
      return { applied: true, message: `${reward.label} unlocked!` };
    } catch (e) {
      return { applied: false, message: 'Failed to unlock banner' };
    }
  }

  if (reward.type === 'title' && reward.titleId) {
    try {
      const unlockedTitles = JSON.parse(localStorage.getItem('unlockedProfileTitles') || '[]');
      if (!unlockedTitles.includes(reward.titleId)) {
        unlockedTitles.push(reward.titleId);
        localStorage.setItem('unlockedProfileTitles', JSON.stringify(unlockedTitles));
      }
      return { applied: true, message: `${reward.label} unlocked!` };
    } catch (e) {
      return { applied: false, message: 'Failed to unlock title' };
    }
  }

  if (reward.type === 'booster' && reward.amount > 0) {
    try {
      const stored = JSON.parse(localStorage.getItem('xpBoosters') || '{"active": [], "history": []}');
      stored.active.push({
        hours: reward.amount,
        activatedAt: new Date().toISOString()
      });
      localStorage.setItem('xpBoosters', JSON.stringify(stored));
      return { applied: true, message: `${reward.amount}h XP Booster activated!` };
    } catch (e) {
      return { applied: false, message: 'Failed to activate booster' };
    }
  }

  return { applied: false, message: '' };
};

export const DAILY_REWARDS = [
  { id: 'xp_10', type: 'xp', amount: 10, label: '+10 XP', weight: 25 },
  { id: 'xp_25', type: 'xp', amount: 25, label: '+25 XP', weight: 20 },
  { id: 'xp_50', type: 'xp', amount: 50, label: '+50 XP', weight: 15 },
  { id: 'theme_basic', type: 'theme', themeId: 'cyber-minimal', label: 'Cyber Theme', weight: 5 },
  { id: 'theme_retro', type: 'theme', themeId: 'retro-arcade', label: 'Retro Theme', weight: 5 },
  { id: 'frame_starter', type: 'frame', frameId: 'starter_halo', label: 'Starter Frame', weight: 3 },
  { id: 'banner_basic', type: 'banner', bannerId: 'pixel_pioneer', label: 'Pixel Banner', weight: 5 },
  { id: 'title_rookie', type: 'title', titleId: 'Rookie', label: 'Rookie Title', weight: 5 },
  { id: 'booster_1h', type: 'booster', amount: 1, label: '1h XP Booster', weight: 7 },
  { id: 'booster_2h', type: 'booster', amount: 2, label: '2h XP Booster', weight: 5 },
  { id: 'nothing', type: 'nothing', amount: 0, label: 'Better luck next time!', weight: 5 }
];

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 365];

const getStoredEngagement = () => {
  try {
    const stored = localStorage.getItem(ENGAGEMENT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    return null;
  }
};

const saveEngagement = (data) => {
  try {
    localStorage.setItem(ENGAGEMENT_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('[DailyEngagement] Failed to save:', error);
  }
};

const getTodayDateString = () => {
  return new Date().toISOString().split('T')[0];
};

const getYesterdayDateString = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
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

      data.lastLoginDate = today;
      data.totalLogins = (data.totalLogins || 0) + 1;
      data.spinsRemaining = 1;

      saveEngagement(data);
    }

    return {
      ...data,
      canSpin: data.spinsRemaining > 0 && data.lastSpinDate !== today,
      streakAtRisk: data.currentStreak > 0 && data.lastLoginDate !== today && data.lastLoginDate !== yesterday
    };
  },

  spinWheel: () => {
    const data = getStoredEngagement();
    const today = getTodayDateString();

    if (!data || data.spinsRemaining <= 0 || data.lastSpinDate === today) {
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

    const rewardResult = applyReward(selectedReward);

    data.spinsRemaining = 0;
    data.lastSpinDate = today;
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
      spinsUsed: data.claimedRewards?.filter(r => r.date >= weekAgo.toISOString().split('T')[0]).length || 0
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

  getStreakMilestones: () => STREAK_MILESTONES,

  getAvailableRewards: () => DAILY_REWARDS
};

export default DailyEngagementService;
