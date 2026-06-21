// RollingAchievementsTracker.js - Tracks daily, weekly, monthly, yearly achievements
import { PlaytimeAutoLogger } from './PlaytimeAutoLogger';
import { getDateKey } from './DateKeyService';
import StorageService from './StorageService';

const PERIOD_CONFIG = {
  daily: {
    playtime: [
      { id: 'daily_15min', minutes: 15 },
      { id: 'daily_30min', minutes: 30 },
      { id: 'daily_1hour', minutes: 60 },
      { id: 'daily_2hours', minutes: 120 },
      { id: 'daily_3hours', minutes: 180 },
      { id: 'daily_5hours', minutes: 300 },
      { id: 'daily_7hours', minutes: 420 },
      { id: 'daily_10hours', minutes: 600 }
    ],
    sessions: [
      { id: 'daily_3sessions', count: 3 },
      { id: 'daily_5sessions', count: 5 },
      { id: 'daily_10sessions', count: 10 }
    ],
    games: [
      { id: 'daily_3games', count: 3 },
      { id: 'daily_5games', count: 5 }
    ],
    genres: [
      { id: 'daily_3genres', count: 3 },
      { id: 'daily_5genres', count: 5 }
    ],
    moods: [
      { id: 'daily_2moods', count: 2 },
      { id: 'daily_3moods', count: 3 },
      { id: 'daily_all_moods', count: 5 }
    ],
    platforms: [
      { id: 'daily_2platforms', count: 2 },
      { id: 'daily_3platforms', count: 3 }
    ],
    features: [
      { id: 'daily_perfect_play', key: 'perfectPlay', count: 1 },
      { id: 'daily_surprise', key: 'surpriseMe', count: 1 },
      { id: 'daily_rediscover', key: 'rediscover', count: 1 },
      { id: 'daily_share', key: 'share', count: 1 }
    ],
    streaks: []
  },
  weekly: {
    playtime: [
      { id: 'weekly_2hours', minutes: 120 },
      { id: 'weekly_5hours', minutes: 300 },
      { id: 'weekly_10hours', minutes: 600 },
      { id: 'weekly_20hours', minutes: 1200 },
      { id: 'weekly_40hours', minutes: 2400 },
      { id: 'weekly_60hours', minutes: 3600 },
      { id: 'weekly_100hours', minutes: 6000 }
    ],
    sessions: [
      { id: 'weekly_7sessions', count: 7 },
      { id: 'weekly_14sessions', count: 14 },
      { id: 'weekly_21sessions', count: 21 }
    ],
    games: [
      { id: 'weekly_5games', count: 5 },
      { id: 'weekly_10games', count: 10 },
      { id: 'weekly_15games', count: 15 }
    ],
    genres: [
      { id: 'weekly_4genres', count: 4 },
      { id: 'weekly_6genres', count: 6 }
    ],
    moods: [
      { id: 'weekly_3moods', count: 3 },
      { id: 'weekly_4moods', count: 4 }
    ],
    activeDays: [
      { id: 'weekly_4days', count: 4 },
      { id: 'weekly_6days', count: 6 }
    ],
    streaks: [
      { id: 'weekly_streak_3', count: 3 },
      { id: 'weekly_streak_5', count: 5 },
      { id: 'weekly_streak_7', count: 7 }
    ],
    perfectPlay: [
      { id: 'weekly_perfect_5', count: 5 }
    ],
    surprise: [
      { id: 'weekly_surprise_7', count: 7 }
    ],
    rediscover: [
      { id: 'weekly_rediscover_3', count: 3 }
    ],
    share: [
      { id: 'weekly_share_3', count: 3 }
    ]
  },
  monthly: {
    playtime: [
      { id: 'monthly_10hours', minutes: 600 },
      { id: 'monthly_25hours', minutes: 1500 },
      { id: 'monthly_50hours', minutes: 3000 },
      { id: 'monthly_100hours', minutes: 6000 },
      { id: 'monthly_150hours', minutes: 9000 },
      { id: 'monthly_200hours', minutes: 12000 },
      { id: 'monthly_300hours', minutes: 18000 }
    ],
    sessions: [
      { id: 'monthly_30sessions', count: 30 },
      { id: 'monthly_50sessions', count: 50 },
      { id: 'monthly_75sessions', count: 75 }
    ],
    activeDays: [
      { id: 'monthly_10days', count: 10 },
      { id: 'monthly_20days', count: 20 },
      { id: 'monthly_25days', count: 25 }
    ],
    unlocks: [
      { id: 'monthly_unlock_5', count: 5 },
      { id: 'monthly_unlock_10', count: 10 },
      { id: 'monthly_unlock_15', count: 15 }
    ],
    genres: [
      { id: 'monthly_10genres', count: 10 },
      { id: 'monthly_15genres', count: 15 }
    ],
    platforms: [
      { id: 'monthly_5platforms', count: 5 }
    ],
    moods: [
      { id: 'monthly_all_moods', count: 5 }
    ],
    perfectPlay: [
      { id: 'monthly_perfect_10', count: 10 }
    ],
    surprise: [
      { id: 'monthly_surprise_15', count: 15 }
    ],
    rediscover: [
      { id: 'monthly_rediscover_5', count: 5 }
    ],
    share: [
      { id: 'monthly_share_5', count: 5 }
    ]
  },
  yearly: {
    playtime: [
      { id: 'yearly_100hours', minutes: 6000 },
      { id: 'yearly_500hours', minutes: 30000 },
      { id: 'yearly_1000hours', minutes: 60000 },
      { id: 'yearly_1500hours', minutes: 90000 },
      { id: 'yearly_2000hours', minutes: 120000 }
    ],
    sessions: [
      { id: 'yearly_200sessions', count: 200 },
      { id: 'yearly_365sessions', count: 365 }
    ],
    activeDays: [
      { id: 'yearly_300days', count: 300 },
      { id: 'yearly_350days', count: 350 }
    ],
    unlocks: [
      { id: 'yearly_unlock_50', count: 50 },
      { id: 'yearly_unlock_100', count: 100 },
      { id: 'yearly_unlock_150', count: 150 }
    ],
    genres: [
      { id: 'yearly_20genres', count: 20 },
      { id: 'yearly_25genres', count: 25 }
    ],
    platforms: [
      { id: 'yearly_10platforms', count: 10 }
    ],
    moods: [
      { id: 'yearly_mood_100', count: 100 }
    ],
    perfectPlay: [
      { id: 'yearly_perfect_50', count: 50 }
    ],
    surprise: [
      { id: 'yearly_surprise_100', count: 100 }
    ],
    rediscover: [
      { id: 'yearly_rediscover_25', count: 25 }
    ],
    share: [
      { id: 'yearly_share_25', count: 25 }
    ],
    streaks: [
      { id: 'yearly_streak_30', count: 30 },
      { id: 'yearly_streak_50', count: 50 },
      { id: 'yearly_streak_100', count: 100 }
    ]
  }
};

export class RollingAchievementsTracker {
  static STORAGE_KEY = 'rollingAchievements';

  static getDayKey(referenceDate = new Date()) {
    return getDateKey(referenceDate);
  }

  static getMonthKey(referenceDate = new Date()) {
    const date = new Date(referenceDate);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  static getYearKey(referenceDate = new Date()) {
    return new Date(referenceDate).getFullYear().toString();
  }

  // Get or initialize rolling achievements data
  static getTrackingData() {
    try {
      const data = StorageService.getString(this.STORAGE_KEY);
      if (!data) return this.getDefaultData();

      const parsed = JSON.parse(data);

      const toSet = (value) => {
        if (!value) return new Set();
        if (Array.isArray(value)) return new Set(value);
        if (typeof value === 'object') return new Set(Object.values(value));
        return new Set();
      };

      const toDaySet = (value) => {
        if (!value) return new Set();
        if (Array.isArray(value)) return new Set(value);
        return new Set();
      };

      const inflatePeriod = (periodKey) => {
        const period = parsed[periodKey] || {};
        const gamesPlayed = toSet(period.gamesPlayed);
        const genresPlayed = toSet(period.genresPlayed);
        const moodsUsed = toSet(period.moodsUsed);
        const activeDaySet = toDaySet(period.activeDaySet);
        return {
          ...period,
          gamesPlayed,
          genresPlayed,
          moodsUsed,
          activeDaySet,
          activeDays: typeof period.activeDays === 'number' ? period.activeDays : activeDaySet.size,
          hasProgress: Boolean(period.hasProgress)
        };
      };

      return {
        daily: inflatePeriod('daily'),
        weekly: inflatePeriod('weekly'),
        monthly: inflatePeriod('monthly'),
        yearly: inflatePeriod('yearly'),
        streaks: this.inflateStreakState(parsed.streaks)
      };
    } catch (error) {
      console.error('Error reading rolling achievements:', error);
      return this.getDefaultData();
    }
  }

  // Get default tracking structure
  static getDefaultData() {
    const defaultFeatures = () => ({
      perfectPlay: 0,
      surpriseMe: 0,
      rediscover: 0,
      continuePlaying: 0,
      share: 0
    });

    return {
      daily: {
        date: new Date().toDateString(),
        playtime: 0,
        sessions: 0,
        gamesPlayed: new Set(),
        genresPlayed: new Set(),
        moodsUsed: new Set(),
        featuresUsed: defaultFeatures(),
        activeDaySet: new Set(),
        activeDays: 0,
        hasProgress: false,
        lastUpdated: Date.now()
      },
      weekly: {
        weekStart: this.getWeekStart(),
        playtime: 0,
        sessions: 0,
        gamesPlayed: new Set(),
        genresPlayed: new Set(),
        moodsUsed: new Set(),
        featuresUsed: defaultFeatures(),
        activeDaySet: new Set(),
        activeDays: 0,
        hasProgress: false,
        lastUpdated: Date.now()
      },
      monthly: {
        month: new Date().getMonth(),
        year: new Date().getFullYear(),
        playtime: 0,
        sessions: 0,
        gamesPlayed: new Set(),
        genresPlayed: new Set(),
        moodsUsed: new Set(),
        featuresUsed: defaultFeatures(),
        activeDaySet: new Set(),
        activeDays: 0,
        hasProgress: false,
        lastUpdated: Date.now()
      },
      yearly: {
        year: new Date().getFullYear(),
        playtime: 0,
        sessions: 0,
        gamesPlayed: new Set(),
        genresPlayed: new Set(),
        moodsUsed: new Set(),
        featuresUsed: defaultFeatures(),
        activeDaySet: new Set(),
        activeDays: 0,
        hasProgress: false,
        lastUpdated: Date.now()
      },
      streaks: this.getDefaultStreakState()
    };
  }

  // Get week start date (Monday)
  static getWeekStart(referenceDate = new Date()) {
    const date = new Date(referenceDate);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(date.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    return weekStart.toDateString();
  }

  static getDefaultStreakState() {
    const base = () => ({ current: 0, best: 0, lastActiveKey: null });
    return {
      daily: base(),
      weekly: base(),
      monthly: base(),
      yearly: base()
    };
  }

  static inflateStreakState(raw) {
    const defaults = this.getDefaultStreakState();
    if (!raw || typeof raw !== 'object') {
      return defaults;
    }
    return {
      daily: { ...defaults.daily, ...(raw.daily || {}) },
      weekly: { ...defaults.weekly, ...(raw.weekly || {}) },
      monthly: { ...defaults.monthly, ...(raw.monthly || {}) },
      yearly: { ...defaults.yearly, ...(raw.yearly || {}) }
    };
  }

  // Update playtime for all rolling periods
  static updatePlaytime(minutes) {
    if (!minutes || minutes <= 0) return;

    try {
      const data = this.getTrackingData();
      const now = new Date();

      // Reset periods if needed (this ensures fresh data for new time periods)
      this.ensureCurrentPeriods(data, now);

      // Update playtime for all periods
      data.daily.playtime = (data.daily.playtime || 0) + minutes;
      data.weekly.playtime = (data.weekly.playtime || 0) + minutes;
      data.monthly.playtime = (data.monthly.playtime || 0) + minutes;
      data.yearly.playtime = (data.yearly.playtime || 0) + minutes;

      this.markPeriodActivity(data, now);

      data.daily.lastUpdated = Date.now();
      data.weekly.lastUpdated = Date.now();
      data.monthly.lastUpdated = Date.now();
      data.yearly.lastUpdated = Date.now();

      this.saveData(data);
      
      console.log('[RollingAchievements] Playtime updated:', {
        daily: `${data.daily.playtime}min on ${data.daily.date}`,
        weekly: `${data.weekly.playtime}min for week ${data.weekly.weekStart}`,
        monthly: `${data.monthly.playtime}min for ${data.monthly.month}/${data.monthly.year}`,
        yearly: `${data.yearly.playtime}min for ${data.yearly.year}`
      });
      
      // Trigger window event for UI updates
      window.dispatchEvent(new CustomEvent('rollingAchievementsUpdated', { 
        detail: { minutes, period: 'all' } 
      }));
      
    } catch (error) {
      console.error('[RollingAchievements] Error updating playtime:', error);
    }
  }

  // Track game played
  static trackGamePlayed(gameId, genre, mood) {
    try {
      const data = this.getTrackingData();
      const now = new Date();

      // Reset if needed
      this.ensureCurrentPeriods(data, now);

      // Track game
      if (gameId) {
        data.daily.gamesPlayed.add(gameId);
        data.weekly.gamesPlayed.add(gameId);
        data.monthly.gamesPlayed.add(gameId);
        data.yearly.gamesPlayed.add(gameId);
      }

      // Track genre
      if (genre) {
        data.daily.genresPlayed.add(genre);
        data.weekly.genresPlayed.add(genre);
        data.monthly.genresPlayed.add(genre);
        data.yearly.genresPlayed.add(genre);
      }

      // Track mood
      if (mood) {
        data.daily.moodsUsed.add(mood);
        data.weekly.moodsUsed.add(mood);
        data.monthly.moodsUsed.add(mood);
        data.yearly.moodsUsed.add(mood);
      }

      this.markPeriodActivity(data, now);
      this.saveData(data);
    } catch (error) {
      console.error('Error tracking game:', error);
    }
  }

  // Track feature usage
  static trackFeatureUsage(feature) {
    try {
      const data = this.getTrackingData();
      const now = new Date();

      // Reset if needed
      this.ensureCurrentPeriods(data, now);

      if (feature && data.daily.featuresUsed[feature] !== undefined) {
        data.daily.featuresUsed[feature] += 1;
        data.weekly.featuresUsed[feature] += 1;
        data.monthly.featuresUsed[feature] += 1;
        data.yearly.featuresUsed[feature] += 1;
      }

      this.markPeriodActivity(data, now);
      this.saveData(data);
    } catch (error) {
      console.error('Error tracking feature:', error);
    }
  }

  // Helper to ensure current periods
  static ensureCurrentPeriods(data, now) {
    if (data.daily.date !== now.toDateString()) {
      data.daily = {
        date: now.toDateString(),
        playtime: 0,
        sessions: 0,
        gamesPlayed: new Set(),
        genresPlayed: new Set(),
        moodsUsed: new Set(),
        featuresUsed: {
          perfectPlay: 0,
          surpriseMe: 0,
          rediscover: 0,
          continuePlaying: 0,
          share: 0
        },
        activeDaySet: new Set(),
        activeDays: 0,
        hasProgress: false,
        lastUpdated: Date.now()
      };
    }

    const currentWeekStart = this.getWeekStart();
    if (data.weekly.weekStart !== currentWeekStart) {
      data.weekly = {
        weekStart: currentWeekStart,
        playtime: 0,
        sessions: 0,
        gamesPlayed: new Set(),
        genresPlayed: new Set(),
        moodsUsed: new Set(),
        featuresUsed: {
          perfectPlay: 0,
          surpriseMe: 0,
          rediscover: 0,
          continuePlaying: 0,
          share: 0
        },
        activeDaySet: new Set(),
        activeDays: 0,
        hasProgress: false,
        lastUpdated: Date.now()
      };
    }

    if (data.monthly.month !== now.getMonth() || data.monthly.year !== now.getFullYear()) {
      data.monthly = {
        month: now.getMonth(),
        year: now.getFullYear(),
        playtime: 0,
        sessions: 0,
        gamesPlayed: new Set(),
        genresPlayed: new Set(),
        moodsUsed: new Set(),
        featuresUsed: {
          perfectPlay: 0,
          surpriseMe: 0,
          rediscover: 0,
          continuePlaying: 0,
          share: 0
        },
        activeDaySet: new Set(),
        activeDays: 0,
        hasProgress: false,
        lastUpdated: Date.now()
      };
    }

    if (data.yearly.year !== now.getFullYear()) {
      data.yearly = {
        year: now.getFullYear(),
        playtime: 0,
        sessions: 0,
        gamesPlayed: new Set(),
        genresPlayed: new Set(),
        moodsUsed: new Set(),
        featuresUsed: {
          perfectPlay: 0,
          surpriseMe: 0,
          rediscover: 0,
          continuePlaying: 0,
          share: 0
        },
        activeDaySet: new Set(),
        activeDays: 0,
        hasProgress: false,
        lastUpdated: Date.now()
      };
    }

    if (!data.streaks) {
      data.streaks = this.getDefaultStreakState();
    }
  }

  // Helper to save data
  static saveData(data) {
    // Convert Sets to Arrays for JSON serialization
    const serializePeriod = (periodData) => ({
      ...periodData,
      gamesPlayed: Array.from(periodData.gamesPlayed),
      genresPlayed: Array.from(periodData.genresPlayed),
      moodsUsed: Array.from(periodData.moodsUsed),
      activeDaySet: Array.from(periodData.activeDaySet)
    });

    const serialized = {
      daily: serializePeriod(data.daily),
      weekly: serializePeriod(data.weekly),
      monthly: serializePeriod(data.monthly),
      yearly: serializePeriod(data.yearly),
      streaks: data.streaks
    };
    StorageService.setString(this.STORAGE_KEY, JSON.stringify(serialized));
  }

  // Increment session count
  static incrementSession(period = 'all') {
    try {
      const data = this.getTrackingData();
      const now = new Date();

      // Reset periods if needed
      this.ensureCurrentPeriods(data, now);

      // Increment sessions
      if (period === 'all' || period === 'daily') data.daily.sessions = (data.daily.sessions || 0) + 1;
      if (period === 'all' || period === 'weekly') data.weekly.sessions = (data.weekly.sessions || 0) + 1;
      if (period === 'all' || period === 'monthly') data.monthly.sessions = (data.monthly.sessions || 0) + 1;
      if (period === 'all' || period === 'yearly') data.yearly.sessions = (data.yearly.sessions || 0) + 1;

      this.markPeriodActivity(data, now);
      this.saveData(data);
    } catch (error) {
      console.error('Error incrementing session:', error);
    }
  }

  static markPeriodActivity(data, targetDate = new Date()) {
    const dayKey = this.getDayKey(targetDate);
    const weekKey = this.getWeekStart(targetDate);
    const monthKey = this.getMonthKey(targetDate);
    const yearKey = this.getYearKey(targetDate);

    this.markPeriodActive(data, 'daily', dayKey, dayKey);
    this.markPeriodActive(data, 'weekly', weekKey, dayKey);
    this.markPeriodActive(data, 'monthly', monthKey, dayKey);
    this.markPeriodActive(data, 'yearly', yearKey, dayKey);
  }

  static markPeriodActive(data, period, periodKey, dayKey) {
    const periodData = data[period];
    if (!periodData) return;

    if (!periodData.activeDaySet) {
      periodData.activeDaySet = new Set();
    }
    if (!periodData.activeDaySet.has(dayKey)) {
      periodData.activeDaySet.add(dayKey);
      periodData.activeDays = periodData.activeDaySet.size;
    }

    if (!periodData.hasProgress) {
      periodData.hasProgress = true;
      this.incrementStreak(data, period, periodKey);
    }
  }

  static incrementStreak(data, period, currentKey) {
    if (!data.streaks) {
      data.streaks = this.getDefaultStreakState();
    }

    const streak = data.streaks[period];
    if (!streak) return;
    if (streak.lastActiveKey === currentKey) {
      return;
    }

    if (streak.lastActiveKey && this.areConsecutivePeriods(period, streak.lastActiveKey, currentKey)) {
      streak.current += 1;
    } else {
      streak.current = 1;
    }
    streak.best = Math.max(streak.best || 0, streak.current);
    streak.lastActiveKey = currentKey;
  }

  static areConsecutivePeriods(period, previousKey, currentKey) {
    if (!previousKey) return false;
    switch (period) {
      case 'daily': {
        const prevDate = new Date(previousKey);
        const currentDate = new Date(currentKey);
        if (Number.isNaN(prevDate) || Number.isNaN(currentDate)) return false;
        const diff = (currentDate - prevDate) / (1000 * 60 * 60 * 24);
        return diff === 1;
      }
      case 'weekly': {
        const prevDate = new Date(previousKey);
        const currentDate = new Date(currentKey);
        if (Number.isNaN(prevDate) || Number.isNaN(currentDate)) return false;
        const diff = (currentDate - prevDate) / (1000 * 60 * 60 * 24 * 7);
        return diff === 1;
      }
      case 'monthly': {
        const [prevYear, prevMonth] = previousKey.split('-').map(Number);
        const [currYear, currMonth] = currentKey.split('-').map(Number);
        if (Number.isNaN(prevYear) || Number.isNaN(prevMonth) || Number.isNaN(currYear) || Number.isNaN(currMonth)) {
          return false;
        }
        return (currYear === prevYear && currMonth === prevMonth + 1) ||
          (currYear === prevYear + 1 && prevMonth === 12 && currMonth === 1);
      }
      case 'yearly': {
        const prevYear = parseInt(previousKey, 10);
        const currYear = parseInt(currentKey, 10);
        if (Number.isNaN(prevYear) || Number.isNaN(currYear)) return false;
        return currYear === prevYear + 1;
      }
      default:
        return false;
    }
  }

  // Get daily stats
  static getDailyStats() {
    const data = this.getTrackingData();
    const now = new Date();
    
    // Ensure we're showing current day's data
    this.ensureCurrentPeriods(data, now);
    
    return {
      date: data.daily.date,
      playtime: data.daily.playtime || 0,
      sessions: data.daily.sessions || 0,
      gamesPlayed: data.daily.gamesPlayed ? data.daily.gamesPlayed.size : 0,
      genresPlayed: data.daily.genresPlayed ? data.daily.genresPlayed.size : 0,
      moodsUsed: data.daily.moodsUsed ? data.daily.moodsUsed.size : 0,
      featuresUsed: data.daily.featuresUsed || {},
      activeDays: data.daily.activeDays || (data.daily.activeDaySet ? data.daily.activeDaySet.size : 0) || 0,
      streak: { ...(data.streaks?.daily || { current: 0, best: 0 }) },
      playtimeHours: ((data.daily.playtime || 0) / 60).toFixed(1),
      lastUpdated: data.daily.lastUpdated
    };
  }

  // Get weekly stats
  static getWeeklyStats() {
    const data = this.getTrackingData();
    const now = new Date();
    
    // Ensure we're showing current week's data
    this.ensureCurrentPeriods(data, now);
    
    return {
      weekStart: data.weekly.weekStart,
      playtime: data.weekly.playtime || 0,
      sessions: data.weekly.sessions || 0,
      gamesPlayed: data.weekly.gamesPlayed ? data.weekly.gamesPlayed.size : 0,
      genresPlayed: data.weekly.genresPlayed ? data.weekly.genresPlayed.size : 0,
      moodsUsed: data.weekly.moodsUsed ? data.weekly.moodsUsed.size : 0,
      featuresUsed: data.weekly.featuresUsed || {},
      activeDays: data.weekly.activeDays || (data.weekly.activeDaySet ? data.weekly.activeDaySet.size : 0) || 0,
      streak: { ...(data.streaks?.weekly || { current: 0, best: 0 }) },
      playtimeHours: ((data.weekly.playtime || 0) / 60).toFixed(1),
      lastUpdated: data.weekly.lastUpdated
    };
  }

  // Get monthly stats
  static getMonthlyStats() {
    const data = this.getTrackingData();
    const now = new Date();
    
    // Ensure we're showing current month's data
    this.ensureCurrentPeriods(data, now);
    
    const monthName = new Date(data.monthly.year, data.monthly.month).toLocaleString('default', { month: 'long', year: 'numeric' });
    return {
      month: monthName,
      playtime: data.monthly.playtime || 0,
      sessions: data.monthly.sessions || 0,
      gamesPlayed: data.monthly.gamesPlayed ? data.monthly.gamesPlayed.size : 0,
      genresPlayed: data.monthly.genresPlayed ? data.monthly.genresPlayed.size : 0,
      moodsUsed: data.monthly.moodsUsed ? data.monthly.moodsUsed.size : 0,
      featuresUsed: data.monthly.featuresUsed || {},
      activeDays: data.monthly.activeDays || (data.monthly.activeDaySet ? data.monthly.activeDaySet.size : 0) || 0,
      streak: { ...(data.streaks?.monthly || { current: 0, best: 0 }) },
      playtimeHours: ((data.monthly.playtime || 0) / 60).toFixed(1),
      lastUpdated: data.monthly.lastUpdated
    };
  }

  // Get yearly stats
  static getYearlyStats() {
    const data = this.getTrackingData();
    const now = new Date();
    
    // Ensure we're showing current year's data
    this.ensureCurrentPeriods(data, now);
    
    return {
      year: data.yearly.year,
      playtime: data.yearly.playtime || 0,
      sessions: data.yearly.sessions || 0,
      gamesPlayed: data.yearly.gamesPlayed ? data.yearly.gamesPlayed.size : 0,
      genresPlayed: data.yearly.genresPlayed ? data.yearly.genresPlayed.size : 0,
      moodsUsed: data.yearly.moodsUsed ? data.yearly.moodsUsed.size : 0,
      featuresUsed: data.yearly.featuresUsed || {},
      activeDays: data.yearly.activeDays || (data.yearly.activeDaySet ? data.yearly.activeDaySet.size : 0) || 0,
      streak: { ...(data.streaks?.yearly || { current: 0, best: 0 }) },
      playtimeHours: ((data.yearly.playtime || 0) / 60).toFixed(1),
      lastUpdated: data.yearly.lastUpdated
    };
  }

  // Get all rolling stats
  static getAllStats() {
    // Don't recompute on every stats call - this was wiping out progress
    // Only use current data without resetting
    return {
      daily: this.getDailyStats(),
      weekly: this.getWeeklyStats(),
      monthly: this.getMonthlyStats(),
      yearly: this.getYearlyStats()
    };
  }

  // Recompute sessions/games/genres/moods from session history
  static recomputeActivityFromHistory(library = null) {
    try {
      const data = this.getTrackingData();
      const now = new Date();
      this.ensureCurrentPeriods(data, now);

      if (!library) {
        library = StorageService.get('library', null);
      }

      const history = PlaytimeAutoLogger.getSessionHistory ? PlaytimeAutoLogger.getSessionHistory() : [];
      if (!history || history.length === 0) {
        return;
      }

      const resetPeriodSets = (period) => {
        if (!period) return;
        period.sessions = 0;
        period.gamesPlayed = new Set();
        period.genresPlayed = new Set();
        period.moodsUsed = new Set();
        period.activeDaySet = new Set();
        period.activeDays = 0;
        period.hasProgress = false;
      };

      resetPeriodSets(data.daily);
      resetPeriodSets(data.weekly);
      resetPeriodSets(data.monthly);
      resetPeriodSets(data.yearly);

      const findGameMeta = (session) => {
        if (!library || !Array.isArray(library)) {
          return null;
        }
        return library.find(g => g.name === session.gameName || g.appid === session.gameId) || null;
      };

      const addSessionToPeriod = (period, gameId, genre, mood) => {
        if (!period) return;
        period.sessions = (period.sessions || 0) + 1;
        if (gameId) period.gamesPlayed.add(gameId);
        if (genre) period.genresPlayed.add(genre);
        if (mood) period.moodsUsed.add(mood);
      };

      history.forEach(session => {
        const sessionDate = new Date(session.timestamp || session.date);
        if (Number.isNaN(sessionDate.getTime())) {
          return;
        }

        const meta = findGameMeta(session);
        const fallbackId = session.gameId || session.gameName;
        const gameId = meta?.appid || meta?.name || fallbackId;
        const genre = meta?.genres && meta.genres.length > 0 ? meta.genres[0] : (session.genre || null);
        const mood = meta?.mood || session.mood || null;

        if (sessionDate.toDateString() === now.toDateString()) {
          addSessionToPeriod(data.daily, gameId, genre, mood);
        }

        if (this.getWeekStart(sessionDate) === data.weekly.weekStart) {
          addSessionToPeriod(data.weekly, gameId, genre, mood);
        }

        if (
          sessionDate.getFullYear() === data.monthly.year &&
          sessionDate.getMonth() === data.monthly.month
        ) {
          addSessionToPeriod(data.monthly, gameId, genre, mood);
        }

        if (sessionDate.getFullYear() === data.yearly.year) {
          addSessionToPeriod(data.yearly, gameId, genre, mood);
        }

        this.markPeriodActivity(data, sessionDate);
      });

      this.saveData(data);
    } catch (error) {
      console.error('Error recomputing rolling achievements:', error);
    }
  }

  static getAchievementProgressSnapshot(achievementId) {
    if (!achievementId) {
      return null;
    }

    const periodKey = achievementId.split('_')[0];
    const config = PERIOD_CONFIG[periodKey];
    if (!config) {
      return null;
    }

    const data = this.getTrackingData();
    this.ensureCurrentPeriods(data, new Date());
    const periodData = data[periodKey];
    if (!periodData) {
      return null;
    }

    const metricDefinitions = [
      { metric: 'playtime', current: Number(periodData.playtime || 0), unit: 'minutes' },
      { metric: 'sessions', current: Number(periodData.sessions || 0), unit: 'count' },
      { metric: 'games', current: Number(periodData.gamesPlayed?.size || 0), unit: 'count' },
      { metric: 'genres', current: Number(periodData.genresPlayed?.size || 0), unit: 'count' },
      { metric: 'moods', current: Number(periodData.moodsUsed?.size || 0), unit: 'count' },
      { metric: 'platforms', current: Number(periodData.platformsUsed || 0), unit: 'count' },
      { metric: 'features', current: 0, unit: 'count' },
      { metric: 'perfectPlay', current: Number(periodData.featuresUsed?.perfectPlay || 0), unit: 'count' },
      { metric: 'surprise', current: Number(periodData.featuresUsed?.surpriseMe || 0), unit: 'count' },
      { metric: 'rediscover', current: Number(periodData.featuresUsed?.rediscover || 0), unit: 'count' },
      { metric: 'share', current: Number(periodData.featuresUsed?.share || 0), unit: 'count' },
      { metric: 'streaks', current: Number(data.streaks?.[periodKey]?.current || 0), unit: 'count' },
      { metric: 'activeDays', current: Number(periodData.activeDays || 0), unit: 'count' },
      { metric: 'unlocks', current: Number(periodData.unlocks || 0), unit: 'count' }
    ];

    for (const definition of metricDefinitions) {
      const entries = config[definition.metric];
      if (!Array.isArray(entries)) {
        continue;
      }

      const match = entries.find(({ id }) => id === achievementId);
      if (!match) {
        continue;
      }

      const target = typeof match.minutes === 'number'
        ? match.minutes
        : Number(match.count || 0);
      const current = definition.metric === 'features' && match.key
        ? Number(periodData.featuresUsed?.[match.key] || 0)
        : definition.current;
      const progressPercent = target > 0
        ? Math.min(100, (current / target) * 100)
        : 0;

      return {
        achievementId,
        period: periodKey,
        metric: definition.metric,
        featureKey: match.key || null,
        current,
        target,
        unit: typeof match.minutes === 'number' ? 'minutes' : definition.unit,
        progressPercent,
        remaining: Math.max(0, target - current),
        completed: target > 0 ? current >= target : false
      };
    }

    return null;
  }

  static checkAchievementUnlock(achievementId, unlocked = []) {
    if (!achievementId || unlocked.includes(achievementId)) {
      return false;
    }

    return Boolean(this.getAchievementProgressSnapshot(achievementId)?.completed);
  }
}

