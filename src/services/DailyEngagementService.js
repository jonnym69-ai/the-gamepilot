import { getDateKey } from './DateKeyService';
import StorageService from './StorageService';

const ENGAGEMENT_KEY = 'dailyEngagement';

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
      weeklySummaryShown: null
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

      saveEngagement(data);
    }

    return {
      ...data,
      streakAtRisk: data.currentStreak > 0 && data.lastLoginDate !== today && data.lastLoginDate !== yesterday
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

    return {
      loginsThisWeek: 0,
      currentStreak: data.currentStreak || 0,
      longestStreak: data.longestStreak || 0,
      totalLogins: data.totalLogins || 0
    };
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

  getStreakMilestones: () => STREAK_MILESTONES
};

export default DailyEngagementService;
