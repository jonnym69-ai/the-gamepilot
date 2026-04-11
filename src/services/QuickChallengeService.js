const CHALLENGE_STORAGE_KEY = 'quickChallenges';
const LAUNCH_REWARD_STATS_KEY = 'launchRewardStats';

const DEFAULT_CHALLENGES = [
  {
    id: 'launch_2_games',
    type: 'daily',
    title: 'Launch 2 Games',
    description: 'Launch any 2 games today',
    target: 2,
    xpReward: 25,
    icon: 'play'
  },
  {
    id: 'try_new_game',
    type: 'daily',
    title: 'Try Something New',
    description: 'Launch a game you haven\'t played in 30+ days',
    target: 1,
    xpReward: 50,
    icon: 'star'
  },
  {
    id: 'complete_session',
    type: 'daily',
    title: 'Complete a Session',
    description: 'Play a game for at least 30 minutes',
    target: 1,
    xpReward: 30,
    icon: 'clock'
  },
  {
    id: 'launch_5_games_week',
    type: 'weekly',
    title: 'Weekly Warrior',
    description: 'Launch 5 games this week',
    target: 5,
    xpReward: 100,
    icon: 'trophy'
  },
  {
    id: 'try_3_genres',
    type: 'weekly',
    title: 'Genre Explorer',
    description: 'Play 3 different genres this week',
    target: 3,
    xpReward: 75,
    icon: 'compass'
  }
];

const getStoredChallenges = () => {
  try {
    const stored = localStorage.getItem(CHALLENGE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const saveChallenges = (data) => {
  try {
    localStorage.setItem(CHALLENGE_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('[QuickChallenge] Failed to save:', e);
  }
};

const getTodayDateString = () => new Date().toISOString().split('T')[0];

const getWeekStartString = () => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek;
  const weekStart = new Date(now.setDate(diff));
  return weekStart.toISOString().split('T')[0];
};

export const QuickChallengeService = {
  getChallenges: () => {
    const stored = getStoredChallenges();
    const today = getTodayDateString();
    const weekStart = getWeekStartString();

    if (!stored || stored.lastResetDate !== today) {
      const newData = {
        lastResetDate: today,
        weekStart,
        daily: DEFAULT_CHALLENGES.filter(c => c.type === 'daily').map(c => ({
          ...c,
          progress: 0,
          completed: false,
          completedAt: null
        })),
        weekly: stored?.weekly && stored.weekStart === weekStart
          ? stored.weekly
          : DEFAULT_CHALLENGES.filter(c => c.type === 'weekly').map(c => ({
              ...c,
              progress: 0,
              completed: false,
              completedAt: null
            }))
      };
      saveChallenges(newData);
      return newData;
    }

    return stored;
  },

  incrementProgress: (challengeId) => {
    const data = getStoredChallenges();
    if (!data) return null;

    const today = getTodayDateString();
    let updated = false;

    data.daily.forEach(c => {
      if (c.id === challengeId && !c.completed && c.progress < c.target) {
        c.progress += 1;
        if (c.progress >= c.target) {
          c.completed = true;
          c.completedAt = today;
        }
        updated = true;
      }
    });

    data.weekly.forEach(c => {
      if (c.id === challengeId && !c.completed && c.progress < c.target) {
        c.progress += 1;
        if (c.progress >= c.target) {
          c.completed = true;
          c.completedAt = today;
        }
        updated = true;
      }
    });

    if (updated) {
      saveChallenges(data);
    }

    return updated ? data : null;
  },

  completeChallenge: (challengeId) => {
    const data = getStoredChallenges();
    if (!data) return null;

    const today = getTodayDateString();
    let challenge = null;

    [...data.daily, ...data.weekly].forEach(c => {
      if (c.id === challengeId && !c.completed) {
        c.progress = c.target;
        c.completed = true;
        c.completedAt = today;
        challenge = c;
      }
    });

    if (challenge) {
      const xpToAdd = challenge.xpReward;
      try {
        const stored = JSON.parse(localStorage.getItem(LAUNCH_REWARD_STATS_KEY) || '{}');
        const currentXP = Math.max(0, Math.round(Number(stored?.totalXP) || 0));
        localStorage.setItem(LAUNCH_REWARD_STATS_KEY, JSON.stringify({
          totalXP: currentXP + xpToAdd,
          launches: stored?.launches || 0
        }));
      } catch (e) {
        console.error('[QuickChallenge] Failed to add XP:', e);
      }

      saveChallenges(data);
      return { challenge, xpAwarded: xpToAdd };
    }

    return null;
  },

  getActiveChallenges: () => {
    const data = getStoredChallenges();
    if (!data) return { daily: [], weekly: [] };

    return {
      daily: data.daily.filter(c => !c.completed),
      weekly: data.weekly.filter(c => !c.completed)
    };
  },

  getCompletedChallenges: () => {
    const data = getStoredChallenges();
    if (!data) return { daily: [], weekly: [] };

    return {
      daily: data.daily.filter(c => c.completed),
      weekly: data.weekly.filter(c => c.completed)
    };
  },

  getDailyProgress: () => {
    const data = getStoredChallenges();
    if (!data) return { completed: 0, total: 0 };

    const completed = data.daily.filter(c => c.completed).length;
    return { completed, total: data.daily.length };
  },

  getWeeklyProgress: () => {
    const data = getStoredChallenges();
    if (!data) return { completed: 0, total: 0 };

    const completed = data.weekly.filter(c => c.completed).length;
    return { completed, total: data.weekly.length };
  }
};

export default QuickChallengeService;
