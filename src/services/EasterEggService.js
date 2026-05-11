import StorageService from './StorageService';

const KONAMI_CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
const KONAMI_KEY = 'konamiActivated';
const SECRET_ACHIEVEMENTS_KEY = 'secretAchievements';

const SECRET_ACHIEVEMENTS = [
  { id: 'konami_code', name: 'Old School', description: 'Entered the Konami Code', icon: ' retro' },
  { id: 'night_owl', name: 'Night Owl', description: 'Played after 2 AM', icon: 'owl' },
  { id: 'early_bird', name: 'Early Bird', description: 'Played before 6 AM', icon: 'bird' },
  { id: 'completionist', name: 'Completionist', description: 'Launched every game in library', icon: 'trophy' },
  { id: 'speedrunner', name: 'Speedrunner', description: 'Launched 5 games in 5 minutes', icon: 'zap' },
  { id: 'loyal', name: 'Loyal', description: 'Used app for 7 consecutive days', icon: 'heart' }
];

let konamiIndex = 0;

export const EasterEggService = {
  handleKeyPress: (key) => {
    if (key === KONAMI_CODE[konamiIndex]) {
      konamiIndex++;
      if (konamiIndex === KONAMI_CODE.length) {
        konamiIndex = 0;
        return this.activateKonami();
      }
    } else {
      konamiIndex = 0;
    }
    return null;
  },

  activateKonami: () => {
    const alreadyActivated = StorageService.getString(KONAMI_KEY) === 'true';
    if (alreadyActivated) {
      return { type: 'already', message: 'You already unlocked the Konami secret!' };
    }

    StorageService.setString(KONAMI_KEY, 'true');
    
    const unlocked = this.unlockSecretAchievement('konami_code');
    
    return { 
      type: 'activated', 
      message: ' KONAMI CODE ACTIVATED! You feel... nostalgic.',
      achievement: unlocked
    };
  },

  checkTimeBasedAchievements: () => {
    const hour = new Date().getHours();
    const results = [];

    if (hour >= 2 && hour < 6) {
      results.push(this.unlockSecretAchievement('night_owl'));
    }

    if (hour >= 5 && hour < 7) {
      results.push(this.unlockSecretAchievement('early_bird'));
    }

    return results.filter(Boolean);
  },

  checkSpeedrunAchievement: (launchCount, timeWindowMs = 5 * 60 * 1000) => {
    const launches = StorageService.get('recentLaunches', []);
    const now = Date.now();

    const recentLaunches = launches.filter(l => now - l.time < timeWindowMs);
    recentLaunches.push({ time: now });
    StorageService.set('recentLaunches', recentLaunches);

    if (recentLaunches.length >= 5) {
      return this.unlockSecretAchievement('speedrunner');
    }
    return null;
  },

  checkLoyaltyAchievement: () => {
    const engagement = StorageService.get('dailyEngagement', {});
    if (engagement.currentStreak >= 7) {
      return this.unlockSecretAchievement('loyal');
    }
    return null;
  },

  checkCompletionistAchievement: (library, launchedGames) => {
    if (library.length > 0 && launchedGames >= library.length) {
      return this.unlockSecretAchievement('completionist');
    }
    return null;
  },

  unlockSecretAchievement: (achievementId) => {
    const stored = StorageService.get(SECRET_ACHIEVEMENTS_KEY, []);
    if (stored.includes(achievementId)) return null;

    stored.push(achievementId);
    StorageService.set(SECRET_ACHIEVEMENTS_KEY, stored);

    return SECRET_ACHIEVEMENTS.find(a => a.id === achievementId);
  },

  getSecretAchievements: () => {
    const unlocked = StorageService.get(SECRET_ACHIEVEMENTS_KEY, []);
    return SECRET_ACHIEVEMENTS.map(a => ({
      ...a,
      unlocked: unlocked.includes(a.id)
    }));
  },

  isKonamiActivated: () => StorageService.getString(KONAMI_KEY) === 'true',

  resetSecrets: () => {
    StorageService.remove(KONAMI_KEY);
    StorageService.remove(SECRET_ACHIEVEMENTS_KEY);
    StorageService.remove('recentLaunches');
  }
};

export default EasterEggService;
