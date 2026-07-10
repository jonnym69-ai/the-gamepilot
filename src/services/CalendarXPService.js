/**
 * CalendarXPService - Manages time-based XP rewards
 * Includes: daily check-in streaks, anniversary rewards, birthday bonuses, seasonal events
 */

import { AchievementTracker } from '../AchievementSystem';
import StorageService from './StorageService';

// Storage keys (now using StorageService with prefixes)
const STREAK_KEY = 'checkinStreak';
const LAST_CHECKIN_KEY = 'lastCheckin';
const BIRTHDAY_KEY = 'userBirthday';
const JOIN_DATE_KEY = 'joinDate';

// XP reward amounts
const STREAK_REWARDS = {
  daily: 75,        // Base daily check-in
  streak3: 125,     // 3-day streak bonus
  streak7: 300,     // 7-day streak bonus  
  streak14: 650,    // 14-day streak bonus
  streak30: 1200,   // 30-day streak bonus
  streak365: 5500   // Full year streak (legendary)
};

const ANNIVERSARY_REWARDS = {
  firstMonth: 200,
  thirdMonth: 500,
  sixthMonth: 1000,
  year1: 2500,
  year2: 5000,
  year3: 7500,
  year5: 10000
};

const BIRTHDAY_REWARDS = {
  base: 900,
  bonusPerYear: 125  // Extra XP per year since joining
};

const CHRISTMAS_REWARDS = {
  xp: 650,
  bonusXP: 350
};

const SEASONAL_EVENTS = {
  halloween: {
    id: 'halloween',
    name: 'Halloween Event',
    description: 'Spooky season rewards for gaming in October!',
    checkDate: (date) => date.getMonth() === 9, // October
    xpBonus: 200,
    specialReward: 'spooky_theme_preview'
  },
  winter: {
    id: 'winter',
    name: 'Winter Wonderland',
    description: 'Cozy up with bonus XP during December!',
    checkDate: (date) => date.getMonth() === 11, // December
    xpBonus: 300,
    specialReward: 'winter_theme_preview'
  },
  summer: {
    id: 'summer',
    name: 'Summer Gaming',
    description: 'Long days mean more gaming time in July!',
    checkDate: (date) => date.getMonth() === 6, // July
    xpBonus: 250,
    specialReward: 'summer_theme_preview'
  },
  spring: {
    id: 'spring',
    name: 'Spring Refresh',
    description: 'New season, new backlog goals in April!',
    checkDate: (date) => date.getMonth() === 3, // April
    xpBonus: 200,
    specialReward: 'spring_theme_preview'
  },
  anniversary: {
    id: 'gamepilot_anniversary',
    name: 'GamePilot Anniversary',
    description: 'Celebrating the app launch in March!',
    checkDate: (date) => date.getMonth() === 2 && date.getDate() >= 15 && date.getDate() <= 31, // Late March
    xpBonus: 500,
    specialReward: 'anniversary_badge'
  }
};

class CalendarXPService {
  /**
   * Get current streak data
   */
  static getStreakData() {
    try {
      const stored = StorageService.get(STREAK_KEY, null);
      const lastCheckin = StorageService.getString(LAST_CHECKIN_KEY);
      
      if (!stored || !lastCheckin) {
        return { currentStreak: 0, longestStreak: 0, lastCheckin: null };
      }

      return {
        currentStreak: stored.currentStreak || 0,
        longestStreak: stored.longestStreak || 0,
        totalCheckins: stored.totalCheckins || 0,
        lastCheckin: lastCheckin
      };
    } catch (e) {
      return { currentStreak: 0, longestStreak: 0, totalCheckins: 0, lastCheckin: null };
    }
  }

  /**
   * Save streak data
   */
  static saveStreakData(data) {
    try {
      StorageService.set(STREAK_KEY, data);
    } catch (e) {
      console.warn('Failed to save streak data:', e);
    }
  }

  /**
   * Check if dates are consecutive days
   */
  static isConsecutiveDay(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    
    // Reset hours to compare just the dates
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    
    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays === 1;
  }

  /**
   * Check if it's the same day
   */
  static isSameDay(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.toDateString() === d2.toDateString();
  }

  /**
   * Process daily check-in and award streak XP
   */
  static processDailyCheckin() {
    const today = new Date().toISOString();
    const streakData = this.getStreakData();
    
    // Check if already checked in today
    if (streakData.lastCheckin && this.isSameDay(streakData.lastCheckin, today)) {
      return {
        success: false,
        alreadyCheckedIn: true,
        message: 'Already checked in today!',
        streakData: streakData
      };
    }

    // Determine if streak continues or resets
    let newStreak = 1;
    if (streakData.lastCheckin && this.isConsecutiveDay(streakData.lastCheckin, today)) {
      newStreak = streakData.currentStreak + 1;
    }

    // Calculate XP reward
    let xpEarned = STREAK_REWARDS.daily;
    let bonusType = null;

    // Check for streak milestones
    if (newStreak === 365) {
      xpEarned += STREAK_REWARDS.streak365;
      bonusType = 'legendary_year';
    } else if (newStreak === 30) {
      xpEarned += STREAK_REWARDS.streak30;
      bonusType = 'month';
    } else if (newStreak === 14) {
      xpEarned += STREAK_REWARDS.streak14;
      bonusType = 'twoweek';
    } else if (newStreak === 7) {
      xpEarned += STREAK_REWARDS.streak7;
      bonusType = 'week';
    } else if (newStreak === 3) {
      xpEarned += STREAK_REWARDS.streak3;
      bonusType = 'threeday';
    }

    // Update streak data
    const newStreakData = {
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, streakData.longestStreak || 0),
      totalCheckins: (streakData.totalCheckins || 0) + 1
    };
    
    this.saveStreakData(newStreakData);
    StorageService.setString(LAST_CHECKIN_KEY, today);

    // Award XP
    if (typeof AchievementTracker?.grantXP === 'function') {
      AchievementTracker.grantXP('daily_checkin', xpEarned, {
        streak: newStreak,
        bonusType: bonusType
      });
    }

    return {
      success: true,
      xpEarned,
      newStreak,
      bonusType,
      isMilestone: !!bonusType,
      message: bonusType 
        ? `🔥 ${newStreak}-day streak! +${xpEarned} XP bonus!`
        : `Checked in! +${xpEarned} XP (Day ${newStreak})`
    };
  }

  /**
   * Set user's birthday
   */
  static setBirthday(month, day) {
    try {
      const birthday = { month, day };
      StorageService.set(BIRTHDAY_KEY, birthday);
      return { success: true, birthday };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * Get user's birthday
   */
  static getBirthday() {
    try {
      const stored = StorageService.get(BIRTHDAY_KEY, null);
      return stored || null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Check if today is user's birthday
   */
  static isBirthdayToday() {
    const birthday = this.getBirthday();
    if (!birthday) return false;

    const today = new Date();
    return today.getMonth() === birthday.month && today.getDate() === birthday.day;
  }

  /**
   * Process birthday reward
   */
  static processBirthdayReward() {
    if (!this.isBirthdayToday()) {
      return { success: false, isBirthday: false };
    }

    const claimKey = 'lastBirthdayClaim';
    const storedLastBirthday = StorageService.getString(claimKey);
    const currentYear = new Date().getFullYear();
    
    // Check if already claimed this year
    if (storedLastBirthday && new Date(storedLastBirthday).getFullYear() === currentYear) {
      return { 
        success: false, 
        alreadyClaimed: true,
        message: 'Birthday bonus already claimed this year!' 
      };
    }

    // Calculate bonus based on years since joining
    const joinDate = this.getJoinDate();
    const yearsSinceJoin = joinDate 
      ? Math.floor((Date.now() - new Date(joinDate).getTime()) / (365 * 24 * 60 * 60 * 1000))
      : 0;

    const xpEarned = BIRTHDAY_REWARDS.base + (yearsSinceJoin * BIRTHDAY_REWARDS.bonusPerYear);

    // Award XP
    if (typeof AchievementTracker?.grantXP === 'function') {
      AchievementTracker.grantXP('birthday_bonus', xpEarned, {
        yearsSinceJoin
      });
    }

    StorageService.setString(claimKey, new Date().toISOString());

    return {
      success: true,
      xpEarned,
      yearsSinceJoin,
      message: `🎂 Happy Birthday! +${xpEarned} XP bonus!`
    };
  }

  static isChristmasDay() {
    const today = new Date();
    return today.getMonth() === 11 && today.getDate() === 25;
  }

  static processChristmasReward() {
    if (!this.isChristmasDay()) {
      return { success: false, isChristmas: false };
    }

    const claimKey = 'christmasClaim';
    const storedChristmasClaim = StorageService.getString(claimKey);
    const currentYear = new Date().getFullYear();
    if (storedChristmasClaim && new Date(storedChristmasClaim).getFullYear() === currentYear) {
      return {
        success: false,
        alreadyClaimed: true,
        message: 'Christmas rewards already claimed this year!'
      };
    }

    const totalChristmasXP = CHRISTMAS_REWARDS.xp + CHRISTMAS_REWARDS.bonusXP;

    if (typeof AchievementTracker?.grantXP === 'function') {
      AchievementTracker.grantXP('christmas_bonus', totalChristmasXP, {
        bonusXP: CHRISTMAS_REWARDS.bonusXP
      });
    }

    StorageService.setString(claimKey, new Date().toISOString());

    return {
      success: true,
      xpEarned: totalChristmasXP,
      bonusXP: CHRISTMAS_REWARDS.bonusXP,
      message: `🎄 Christmas Day bonus! +${totalChristmasXP} XP!`
    };
  }

  /**
   * Set or get join date
   */
  static getJoinDate() {
    let joinDate = StorageService.getString(JOIN_DATE_KEY);
    if (!joinDate) {
      joinDate = new Date().toISOString();
      StorageService.setString(JOIN_DATE_KEY, joinDate);
    }
    return joinDate;
  }

  /**
   * Calculate months since joining
   */
  static getMonthsSinceJoin() {
    const joinDate = new Date(this.getJoinDate());
    const now = new Date();
    return (now.getFullYear() - joinDate.getFullYear()) * 12 + 
           (now.getMonth() - joinDate.getMonth());
  }

  /**
   * Check for anniversary rewards
   */
  static checkAnniversaryReward() {
    const monthsSinceJoin = this.getMonthsSinceJoin();
    const joinDate = new Date(this.getJoinDate());
    const now = new Date();
    
    // Check if it's the anniversary day (same day of month as join date)
    const isAnniversaryDay = now.getDate() === joinDate.getDate();
    
    if (!isAnniversaryDay) {
      return { success: false, isAnniversary: false };
    }

    const checkKey = `anniversary_${monthsSinceJoin}_claimed`;
    if (StorageService.getString(checkKey)) {
      return { success: false, alreadyClaimed: true };
    }

    // Determine reward tier
    let xpEarned = 0;
    let milestone = null;

    if (monthsSinceJoin >= 60) { // 5 years
      xpEarned = ANNIVERSARY_REWARDS.year5;
      milestone = '5_year';
    } else if (monthsSinceJoin >= 36) { // 3 years
      xpEarned = ANNIVERSARY_REWARDS.year3;
      milestone = '3_year';
    } else if (monthsSinceJoin >= 24) { // 2 years
      xpEarned = ANNIVERSARY_REWARDS.year2;
      milestone = '2_year';
    } else if (monthsSinceJoin >= 12) { // 1 year
      xpEarned = ANNIVERSARY_REWARDS.year1;
      milestone = '1_year';
    } else if (monthsSinceJoin === 6) {
      xpEarned = ANNIVERSARY_REWARDS.sixthMonth;
      milestone = '6_month';
    } else if (monthsSinceJoin === 3) {
      xpEarned = ANNIVERSARY_REWARDS.thirdMonth;
      milestone = '3_month';
    } else if (monthsSinceJoin === 1) {
      xpEarned = ANNIVERSARY_REWARDS.firstMonth;
      milestone = '1_month';
    } else {
      return { success: false, noReward: true };
    }

    // Award XP
    if (typeof AchievementTracker?.grantXP === 'function') {
      AchievementTracker.grantXP('anniversary', xpEarned, {
        monthsSinceJoin,
        milestone
      });
    }

    StorageService.setString(checkKey, 'true');

    return {
      success: true,
      xpEarned,
      monthsSinceJoin,
      milestone,
      message: `🎉 ${monthsSinceJoin >= 12 ? `${Math.floor(monthsSinceJoin/12)}-Year` : `${monthsSinceJoin}-Month`} Anniversary! +${xpEarned} XP!`
    };
  }

  /**
   * Check for active seasonal events
   */
  static getActiveSeasonalEvents() {
    const today = new Date();
    const active = [];

    Object.values(SEASONAL_EVENTS).forEach(event => {
      if (event.checkDate(today)) {
        // Check if user already claimed this event this year
        const yearKey = `${event.id}_${today.getFullYear()}`;
        const claimed = StorageService.getString(`seasonal_${yearKey}`);
        
        active.push({
          ...event,
          alreadyClaimed: !!claimed,
          year: today.getFullYear()
        });
      }
    });

    return active;
  }

  /**
   * Claim seasonal event reward
   */
  static claimSeasonalReward(eventId) {
    const event = SEASONAL_EVENTS[eventId];
    if (!event) {
      return { success: false, error: 'Event not found' };
    }

    const today = new Date();
    if (!event.checkDate(today)) {
      return { success: false, error: 'Event not active' };
    }

    const yearKey = `${eventId}_${today.getFullYear()}`;
    if (StorageService.getString(`seasonal_${yearKey}`)) {
      return { success: false, alreadyClaimed: true };
    }

    // Award XP
    if (typeof AchievementTracker?.grantXP === 'function') {
      AchievementTracker.grantXP('seasonal_event', event.xpBonus, {
        eventId,
        eventName: event.name
      });
    }

    StorageService.setString(`seasonal_${yearKey}`, 'true');

    return {
      success: true,
      xpEarned: event.xpBonus,
      eventName: event.name,
      message: `🎊 ${event.name}! +${event.xpBonus} XP!`
    };
  }

  /**
   * Get all calendar XP status
   */
  static getFullCalendarStatus() {
    const today = new Date();
    const streakData = this.getStreakData();
    const birthdayClaimed = !!StorageService.getString('lastBirthdayClaim');
    const christmasClaimed = !!StorageService.getString('christmasClaim');
    
    return {
      streak: streakData,
      canCheckIn: !streakData.lastCheckin || !this.isSameDay(streakData.lastCheckin, today),
      isBirthdayToday: this.isBirthdayToday(),
      birthday: this.getBirthday(),
      birthdayClaimed,
      isChristmasDay: this.isChristmasDay(),
      christmasClaimed,
      christmasReward: CHRISTMAS_REWARDS,
      monthsSinceJoin: this.getMonthsSinceJoin(),
      joinDate: this.getJoinDate(),
      activeSeasonalEvents: this.getActiveSeasonalEvents(),
      nextMilestone: this.getNextStreakMilestone(streakData.currentStreak)
    };
  }

  /**
   * Get next streak milestone
   */
  static getNextStreakMilestone(currentStreak) {
    const milestones = [3, 7, 14, 30, 365];
    const next = milestones.find(m => m > currentStreak);
    return next || null;
  }

  /**
   * Get estimated XP for next streak milestone
   */
  static getNextStreakReward(streak) {
    const milestones = {
      3: STREAK_REWARDS.streak3,
      7: STREAK_REWARDS.streak7,
      14: STREAK_REWARDS.streak14,
      30: STREAK_REWARDS.streak30,
      365: STREAK_REWARDS.streak365
    };
    
    const next = this.getNextStreakMilestone(streak);
    return next ? { days: next, bonus: milestones[next] } : null;
  }
}

export default CalendarXPService;
