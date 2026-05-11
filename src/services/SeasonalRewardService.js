import StorageService from './StorageService';

const SEASONAL_REWARDS_KEY = 'seasonalRewards';
const SEASONAL_CHALLENGES = {
  halloween: {
    id: 'halloween',
    name: 'Haunted Harvest',
    themeId: 'autumn-harvest',
    month: 9,
    description: 'Play horror games to unlock the spooky season theme',
    requirement: { genre: 'Horror', count: 5 },
    reward: { type: 'theme', id: 'autumn-harvest', name: 'Autumn Harvest' }
  },
  winter_holiday: {
    id: 'winter_holiday',
    name: 'Winter Wonderland',
    themeId: 'winter-frost',
    month: 11,
    description: 'Play 5 games during the holiday season',
    requirement: { genre: null, count: 5 },
    reward: { type: 'theme', id: 'winter-frost', name: 'Winter Frost' }
  },
  spring_bloom: {
    id: 'spring_bloom',
    name: 'Spring Renewal',
    themeId: 'spring-bloom',
    month: 2,
    description: 'Play 3 new games this spring',
    requirement: { genre: null, count: 3, isNew: true },
    reward: { type: 'theme', id: 'spring-bloom', name: 'Spring Bloom' }
  },
  summer_heat: {
    id: 'summer_heat',
    name: 'Summer Sizzle',
    themeId: 'summer-heat',
    month: 5,
    description: 'Play 5 action or shooter games this summer',
    requirement: { genre: ['Action', 'Shooter'], count: 5 },
    reward: { type: 'theme', id: 'summer-heat', name: 'Summer Heat' }
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
  getCurrentSeasonChallenge: () => {
    const month = new Date().getMonth();
    const challenge = Object.values(SEASONAL_CHALLENGES).find(c => c.month === month);
    return challenge || null;
  },

  getActiveChallenges: () => {
    const month = new Date().getMonth();
    const data = getStoredRewards();
    
    return Object.values(SEASONAL_CHALLENGES).map(challenge => {
      const isActive = challenge.month === month;
      const progress = data[challenge.id] || { plays: 0, unlocked: false };
      
      return {
        ...challenge,
        isActive,
        plays: progress.plays,
        unlocked: progress.unlocked,
        progressPercent: Math.min(100, (progress.plays / challenge.requirement.count) * 100)
      };
    });
  },

  trackGamePlay: (game) => {
    const month = new Date().getMonth();
    const data = getStoredRewards();
    const challenge = Object.values(SEASONAL_CHALLENGES).find(c => c.month === month);
    
    if (!challenge || data[challenge.id]?.unlocked) return null;
    
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
      data[challenge.id].plays += 1;
      
      if (data[challenge.id].plays >= challenge.requirement.count) {
        data[challenge.id].unlocked = true;
      }
      
      saveStoredRewards(data);
      
      if (data[challenge.id].unlocked) {
        return challenge.reward;
      }
    }
    
    return null;
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
