/**
 * SpecialEventsService - Aggregates time-based reward events for the
 * Rewards page roadmap. Pulls from CalendarXPService + SeasonalRewardService
 * and produces a unified list with active/upcoming status.
 *
 * Local-only: reads existing storage, no network.
 */

import CalendarXPService from './CalendarXPService';
import { SeasonalRewardService } from './SeasonalRewardService';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const daysBetween = (from, to) => {
  const fromMidnight = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const toMidnight = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  return Math.round((toMidnight - fromMidnight) / MS_PER_DAY);
};

const nextOccurrence = (month, day) => {
  const today = new Date();
  let target = new Date(today.getFullYear(), month, day);
  if (target < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
    target = new Date(today.getFullYear() + 1, month, day);
  }
  return target;
};

export const SpecialEventsService = {
  /**
   * Returns a unified list of upcoming/active special events with status.
   */
  getUpcomingEvents() {
    const events = [];
    const today = new Date();

    // Birthday — only if user has set one
    const birthday = CalendarXPService.getBirthday();
    if (birthday && Number.isInteger(birthday.month) && Number.isInteger(birthday.day)) {
      const target = nextOccurrence(birthday.month, birthday.day);
      const days = daysBetween(today, target);
      const isToday = days === 0;
      const claimed = isToday && CalendarXPService.processBirthdayReward
        ? false
        : false; // claim status is checked dynamically via CalendarXPService
      events.push({
        id: 'birthday',
        name: 'Your Birthday',
        description: 'Annual birthday XP bonus that grows each year you stay with GamePilot.',
        icon: 'birthday',
        category: 'Personal',
        active: isToday,
        daysUntil: days,
        targetDate: target,
        xpReward: 900,
        bonus: '+125 XP per year since joining',
        claimed
      });
    } else {
      events.push({
        id: 'birthday',
        name: 'Set Your Birthday',
        description: 'Add your birthday in Profile to unlock annual XP bonuses.',
        icon: 'birthday',
        category: 'Personal',
        active: false,
        daysUntil: null,
        targetDate: null,
        xpReward: 900,
        bonus: 'Set in Profile',
        claimed: false,
        actionHint: 'Go to Profile → Edit Profile and set your birthday.'
      });
    }

    // Christmas (Dec 25)
    {
      const target = nextOccurrence(11, 25);
      const days = daysBetween(today, target);
      events.push({
        id: 'christmas',
        name: 'Christmas Day',
        description: 'Holiday XP bundle plus 5 free spins.',
        icon: 'christmas',
        category: 'Holiday',
        active: days === 0,
        daysUntil: days,
        targetDate: target,
        xpReward: 650,
        bonus: '+5 free spins'
      });
    }

    // Halloween (Oct 31 — but seasonal event is whole of October)
    {
      const target = nextOccurrence(9, 31);
      const days = daysBetween(today, target);
      events.push({
        id: 'halloween',
        name: 'Halloween Event',
        description: 'Spooky season XP bonus + Haunted Harvest theme challenge (5 horror games unlocks Autumn Harvest theme).',
        icon: 'halloween',
        category: 'Seasonal',
        active: today.getMonth() === 9,
        daysUntil: days,
        targetDate: target,
        xpReward: 200,
        bonus: 'Autumn Harvest theme (5 horror games)'
      });
    }

    // Winter (Dec, +300 XP) — separate from Christmas
    {
      const target = nextOccurrence(11, 1);
      const days = daysBetween(today, target);
      events.push({
        id: 'winter',
        name: 'Winter Wonderland',
        description: 'December XP bonus + Winter Frost theme challenge (5 games during holidays).',
        icon: 'winter',
        category: 'Seasonal',
        active: today.getMonth() === 11,
        daysUntil: days,
        targetDate: target,
        xpReward: 300,
        bonus: 'Winter Frost theme'
      });
    }

    // Spring (Apr, +200 XP)
    {
      const target = nextOccurrence(3, 1);
      const days = daysBetween(today, target);
      events.push({
        id: 'spring',
        name: 'Spring Renewal',
        description: 'April XP bonus + Spring Bloom theme challenge (3 new games).',
        icon: 'spring',
        category: 'Seasonal',
        active: today.getMonth() === 3,
        daysUntil: days,
        targetDate: target,
        xpReward: 200,
        bonus: 'Spring Bloom theme'
      });
    }

    // Summer (Jul, +250 XP)
    {
      const target = nextOccurrence(6, 1);
      const days = daysBetween(today, target);
      events.push({
        id: 'summer',
        name: 'Summer Sizzle',
        description: 'July XP bonus + Summer Heat theme challenge (5 action/shooter games).',
        icon: 'summer',
        category: 'Seasonal',
        active: today.getMonth() === 6,
        daysUntil: days,
        targetDate: target,
        xpReward: 250,
        bonus: 'Summer Heat theme'
      });
    }

    // GamePilot Anniversary (March 15-31)
    {
      const target = nextOccurrence(2, 15);
      const days = daysBetween(today, target);
      const inAnniversaryWindow = today.getMonth() === 2 && today.getDate() >= 15 && today.getDate() <= 31;
      events.push({
        id: 'anniversary',
        name: 'GamePilot Anniversary',
        description: 'Late-March XP bonus celebrating the app launch.',
        icon: 'anniversary',
        category: 'App',
        active: inAnniversaryWindow,
        daysUntil: days,
        targetDate: target,
        xpReward: 500,
        bonus: 'Anniversary badge'
      });
    }

    // Sort: active first, then by daysUntil ascending
    events.sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      const aDays = a.daysUntil === null ? Number.MAX_SAFE_INTEGER : a.daysUntil;
      const bDays = b.daysUntil === null ? Number.MAX_SAFE_INTEGER : b.daysUntil;
      return aDays - bDays;
    });

    // Add seasonal challenge progress where relevant
    try {
      const challenges = SeasonalRewardService.getActiveChallenges();
      for (const event of events) {
        const challenge = challenges.find((c) => {
          if (event.id === 'halloween') return c.id === 'halloween';
          if (event.id === 'winter') return c.id === 'winter_holiday';
          if (event.id === 'spring') return c.id === 'spring_bloom';
          if (event.id === 'summer') return c.id === 'summer_heat';
          return false;
        });
        if (challenge) {
          event.challenge = {
            plays: challenge.plays,
            required: challenge.requirement.count,
            unlocked: challenge.unlocked,
            progressPercent: challenge.progressPercent
          };
        }
      }
    } catch {
      // ignore
    }

    return events;
  },

  /**
   * Returns just the count of currently active events (for sidebar badge).
   */
  getActiveCount() {
    return this.getUpcomingEvents().filter((e) => e.active).length;
  }
};

export default SpecialEventsService;
