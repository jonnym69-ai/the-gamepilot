import StorageService from './StorageService';
import { AchievementTracker } from '../AchievementSystem';

const TIER_ORDER = ['Platinum', 'Gold', 'Silver', 'Bronze'];

const FounderService = {
  getFounderProfile() {
    const boostProfile = AchievementTracker.getPatreonBoostProfile() || {};
    const savedUsername = StorageService.getString('profileUsername', '');
    const userFounders = StorageService.get('userFounders', []);
    const matchedFounder = userFounders.find(
      (f) => f.name?.toLowerCase() === savedUsername.trim().toLowerCase()
    );

    const tier = matchedFounder?.tier || boostProfile.tier || null;
    const isFounder = Boolean(tier);
    const multiplier = boostProfile.multiplier || 1;
    const joinDate = matchedFounder?.date || boostProfile.activatedAt || null;
    const displayName = matchedFounder?.name || savedUsername || null;

    return {
      isFounder,
      tier,
      tierIndex: tier ? TIER_ORDER.indexOf(tier) : -1,
      multiplier,
      hasXPBoost: multiplier > 1,
      joinDate,
      displayName,
      isPlatinum: tier === 'Platinum',
      isGold: tier === 'Gold',
      isSilver: tier === 'Silver',
      isBronze: tier === 'Bronze',
      isGoldOrHigher: tier && TIER_ORDER.indexOf(tier) <= 1,
      isSilverOrHigher: tier && TIER_ORDER.indexOf(tier) <= 2,
    };
  },

  hasLabsAccess() {
    return this.getFounderProfile().isFounder;
  },

  getFounderRoasts() {
    return [
      'Pays real money for a free app. Has their priorities straight.',
      'Supports local-first development. Their library is safe from the cloud.',
      'Their wallet did what their backlog couldn\'t: supported something.',
      'Has a founder badge and zero regrets. The badge is worth more than the backlog.',
      'Could\'ve bought a coffee. Bought GamePilot a coffee instead. The app runs on it.',
      'Their tier is higher than their completion rate. No notes.',
      'Believes in the cockpit enough to fund it. The cockpit believes in them back.'
    ];
  },

  getFounderContextRoasts() {
    return [
      'Spends money on {GAME} and money on GamePilot. At least one of those is free.',
      'Has {HOURS} hours in {GAME} and a founder tier. Their wallet is the real MVP.',
      'A {TIER} founder playing {GAME}. The app runs on their generosity and their backlog.',
      'Pays for the app that tells them to play {GAME}. The circle of gaming life.',
      'Their founder tier and {GAME} playtime have one thing in common: both are committed.'
    ];
  },

  getFounderSubTrait() {
    return {
      id: 'founder_supporter',
      label: 'Founding Supporter',
      description: 'Backs local-first development with real currency.',
      score: () => 100
    };
  }
};

export default FounderService;
