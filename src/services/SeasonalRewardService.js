import StorageService from './StorageService';

const SEASONAL_REWARDS_KEY = 'seasonalRewards';

// Computus algorithm — calculates Easter Sunday for a given year
export const getEasterDate = (year) => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
};

// Active from 30 days before Easter Sunday through Easter day itself
export const isEasterActive = (date = new Date()) => {
  const todayMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const easter = getEasterDate(date.getFullYear());
  const thirtyDaysBefore = new Date(easter.getTime() - 30 * 24 * 60 * 60 * 1000);
  return todayMidnight >= thirtyDaysBefore && todayMidnight <= easter;
};

export const SEASONAL_CHALLENGES = {
  spring_bloom: {
    id: 'spring_bloom',
    name: 'Spring Renewal',
    themeId: 'spring-bloom',
    months: [2, 3, 4], // March, April, May
    description: 'Play 3 different games this spring to awaken your library',
    requirement: { genre: null, count: 3, isNew: true },
    reward: { type: 'theme', id: 'spring-bloom', name: 'Spring Bloom' },
    icon: '🌸',
    accentColor: '#10b981'
  },
  easter: {
    id: 'easter',
    name: 'Easter Egg Hunter',
    themeId: 'spring-bloom',
    months: [2, 3], // March–April (dynamic via isEasterActive)
    description: 'Discover and play 2 hidden gems or indie games',
    requirement: { genre: ['Indie', 'Puzzle', 'Adventure'], count: 2 },
    reward: { type: 'xp', amount: 350, name: 'Egg Finder Badge' },
    icon: '🥚',
    accentColor: '#f59e0b'
  },
  summer_heat: {
    id: 'summer_heat',
    name: 'Summer Sizzle',
    themeId: 'summer-heat',
    months: [5, 6, 7], // June, July, August
    description: 'Play 5 action, shooter, or racing games under the sun',
    requirement: { genre: ['Action', 'Shooter', 'Racing', 'Sports'], count: 5 },
    reward: { type: 'theme', id: 'summer-heat', name: 'Summer Heat' },
    icon: '☀️',
    accentColor: '#f97316'
  },
  halloween: {
    id: 'halloween',
    name: 'Haunted Harvest',
    themeId: 'autumn-harvest',
    months: [9], // October
    description: 'Play 5 horror, thriller, or dark mystery games',
    requirement: { genre: ['Horror', 'Survival Horror', 'Thriller', 'Mystery'], count: 5 },
    reward: { type: 'theme', id: 'autumn-harvest', name: 'Autumn Harvest' },
    icon: '🎃',
    accentColor: '#d97706'
  },
  winter_holiday: {
    id: 'winter_holiday',
    name: 'Winter Wonderland',
    themeId: 'winter-frost',
    months: [11], // December
    description: 'Play 5 cozy gaming sessions during the holiday season',
    requirement: { genre: null, count: 5 },
    reward: { type: 'theme', id: 'winter-frost', name: 'Winter Frost' },
    icon: '❄️',
    accentColor: '#38bdf8'
  }
};

const getStoredRewards = () => {
  try {
    return StorageService.get(SEASONAL_REWARDS_KEY, {});
  } catch {
    return {};
  }
};

const saveStoredRewards = (data) => {
  StorageService.set(SEASONAL_REWARDS_KEY, data);
};

export const SeasonalRewardService = {
  getCurrentSeason: () => {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  },

  getSeasonThemeId: () => {
    const season = SeasonalRewardService.getCurrentSeason();
    const map = {
      spring: 'spring-bloom',
      summer: 'summer-heat',
      autumn: 'autumn-harvest',
      winter: 'winter-frost'
    };
    return map[season] || 'dark';
  },

  getCurrentSeasonChallenge: () => {
    const month = new Date().getMonth();
    const challenges = Object.values(SEASONAL_CHALLENGES);
    const active = challenges.filter(c =>
      c.id === 'easter' ? isEasterActive() : c.months.includes(month)
    );
    return active[0] || null;
  },

  getActiveChallenges: () => {
    const month = new Date().getMonth();
    const data = getStoredRewards();
    
    return Object.values(SEASONAL_CHALLENGES).map(challenge => {
      const isActive = challenge.id === 'easter'
        ? isEasterActive()
        : challenge.months.includes(month);
      const progress = data[challenge.id] || { plays: 0, unlocked: false };
      
      return {
        ...challenge,
        isActive,
        plays: progress.plays,
        unlocked: progress.unlocked,
        progressPercent: Math.min(100, Math.round(((progress.plays || 0) / challenge.requirement.count) * 100))
      };
    });
  },

  trackGamePlay: (game) => {
    const month = new Date().getMonth();
    const data = getStoredRewards();
    const activeChallenges = Object.values(SEASONAL_CHALLENGES).filter(c =>
      c.id === 'easter' ? isEasterActive() : c.months.includes(month)
    );
    
    let unlockedRewards = [];

    activeChallenges.forEach(challenge => {
      if (data[challenge.id]?.unlocked) return;

      const genres = game.genres || [];
      const req = challenge.requirement;
      let qualifies = false;

      if (req.genre) {
        if (Array.isArray(req.genre)) {
          qualifies = req.genre.some(g => genres.includes(g));
        } else {
          qualifies = genres.includes(req.genre);
        }
      } else {
        qualifies = true;
      }

      if (qualifies) {
        if (!data[challenge.id]) {
          data[challenge.id] = { plays: 0, unlocked: false };
        }
        data[challenge.id].plays = (data[challenge.id].plays || 0) + 1;

        if (data[challenge.id].plays >= challenge.requirement.count) {
          data[challenge.id].unlocked = true;
          unlockedRewards.push(challenge.reward);
        }
      }
    });

    if (activeChallenges.length > 0) {
      saveStoredRewards(data);
    }

    return unlockedRewards.length > 0 ? unlockedRewards[0] : null;
  },

  getUnlockedThemes: () => {
    const data = getStoredRewards();
    return Object.entries(data)
      .filter(([_, progress]) => progress.unlocked)
      .map(([id, _]) => SEASONAL_CHALLENGES[id]?.themeId)
      .filter(Boolean);
  },

  isThemeUnlocked: (themeId) => {
    const unlocked = SeasonalRewardService.getUnlockedThemes();
    return unlocked.includes(themeId);
  },

  resetProgress: (challengeId) => {
    const data = getStoredRewards();
    if (data[challengeId]) {
      data[challengeId] = { plays: 0, unlocked: false };
      saveStoredRewards(data);
    }
  }
};

export default SeasonalRewardService;
