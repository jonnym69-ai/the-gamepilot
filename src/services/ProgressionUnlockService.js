import moodThemes from '../themes/moodThemes.json';
import { AchievementTracker } from '../AchievementSystem';
import {
  ALL_BUTTON_PACKS,
  AMBIENT_PACK_LIBRARY,
  AMBIENT_PACK_OPTIONS,
  BUTTON_SFX_LIBRARY,
  BUTTON_SYNTH_PRESETS,
  MUSIC_PACK_LIBRARY,
  MUSIC_PACK_OPTIONS,
  SAMPLE_BUTTON_PACKS
} from './AudioRewardCatalog';

const tuneProgressionRequirement = (requiredXP) => {
  if (requiredXP <= 0) return 0;
  return Math.round((requiredXP * 1.9 + 1200) / 20) * 20;
};

const tuneRewardCollection = (collection = []) => Object.freeze(collection.map((reward) => ({
  ...reward,
  requiredXP: tuneProgressionRequirement(reward.requiredXP)
})));

const THEME_TIER_XP_REQUIREMENTS = Object.freeze({
  basic: 1400,
  plus: tuneProgressionRequirement(1800),
  gold: tuneProgressionRequirement(6200),
  platinum: tuneProgressionRequirement(14000)
});

const MUSIC_PACK_UNLOCKS = Object.freeze(MUSIC_PACK_OPTIONS.map((id) => ({
  id,
  name: MUSIC_PACK_LIBRARY[id].label,
  ...MUSIC_PACK_LIBRARY[id],
  rewardType: 'audio'
})));

const AMBIENT_PACK_UNLOCKS = Object.freeze(AMBIENT_PACK_OPTIONS.map((id) => ({
  id,
  name: AMBIENT_PACK_LIBRARY[id].label,
  ...AMBIENT_PACK_LIBRARY[id],
  rewardType: 'audio'
})));

const BUTTON_PACK_UNLOCKS = Object.freeze(ALL_BUTTON_PACKS.map((id) => {
  if (SAMPLE_BUTTON_PACKS.includes(id)) {
    return {
      id,
      name: BUTTON_SFX_LIBRARY[id].label,
      ...BUTTON_SFX_LIBRARY[id],
      packType: 'sample',
      rewardType: 'audio'
    };
  }

  return {
    id,
    name: BUTTON_SYNTH_PRESETS[id].label,
    ...BUTTON_SYNTH_PRESETS[id],
    packType: 'synth',
    rewardType: 'audio'
  };
}));

const AUDIO_UNLOCK_XP_REQUIREMENTS = Object.freeze({
  music: Math.min(...MUSIC_PACK_UNLOCKS.map((reward) => reward.requiredXP)),
  ambient: Math.min(...AMBIENT_PACK_UNLOCKS.map((reward) => reward.requiredXP)),
  buttonSfx: Math.min(...BUTTON_PACK_UNLOCKS.map((reward) => reward.requiredXP))
});

const PROFILE_FRAME_UNLOCKS = tuneRewardCollection([
  {
    id: 'starter_halo',
    name: 'Starter Halo',
    description: 'A clean frame for fresh pilots.',
    requiredXP: 0,
    accentColor: '#ff6b35',
    shadowColor: 'rgba(255, 107, 53, 0.35)'
  },
  {
    id: 'neon_circuit',
    name: 'Neon Circuit',
    description: 'Arcade energy for regular launches.',
    requiredXP: 1320,
    accentColor: '#3dd9ff',
    shadowColor: 'rgba(61, 217, 255, 0.32)'
  },
  {
    id: 'violet_vector',
    name: 'Violet Vector',
    description: 'A sharper look for tuned-in strategists.',
    requiredXP: 4320,
    accentColor: '#9b5cff',
    shadowColor: 'rgba(155, 92, 255, 0.34)'
  },
  {
    id: 'golden_aegis',
    name: 'Golden Aegis',
    description: 'Prestige plating for high-level players.',
    requiredXP: 11070,
    accentColor: '#f5b700',
    shadowColor: 'rgba(245, 183, 0, 0.34)'
  }
]);

const PROFILE_BANNER_UNLOCKS = tuneRewardCollection([
  {
    id: 'pilot_sunset',
    name: 'Pilot Sunset',
    description: 'Warm gradients for the opening stretch.',
    requiredXP: 0,
    preview: 'linear-gradient(135deg, rgba(255, 107, 53, 0.28), rgba(240, 147, 251, 0.2))'
  },
  {
    id: 'midnight_arcade',
    name: 'Midnight Arcade',
    description: 'A neon banner for late-night sessions.',
    requiredXP: 1980,
    preview: 'linear-gradient(135deg, rgba(34, 40, 104, 0.7), rgba(98, 0, 234, 0.45), rgba(0, 212, 255, 0.22))'
  },
  {
    id: 'aurora_drift',
    name: 'Aurora Drift',
    description: 'A calmer banner for deep backlog runs.',
    requiredXP: 6240,
    preview: 'linear-gradient(135deg, rgba(0, 150, 136, 0.55), rgba(76, 175, 80, 0.28), rgba(33, 150, 243, 0.22))'
  },
  {
    id: 'victory_wave',
    name: 'Victory Wave',
    description: 'A bright hero banner for milestone hunters.',
    requiredXP: 14850,
    preview: 'linear-gradient(135deg, rgba(245, 183, 0, 0.5), rgba(255, 107, 53, 0.35), rgba(255, 255, 255, 0.12))'
  }
]);

const PROFILE_TITLE_UNLOCKS = tuneRewardCollection([
  {
    id: 'rookie_pilot',
    name: 'Rookie Pilot',
    description: 'For players building their library rhythm.',
    requiredXP: 0
  },
  {
    id: 'library_ranger',
    name: 'Library Ranger',
    description: 'Given to players who keep exploring.',
    requiredXP: 1100
  },
  {
    id: 'mood_cartographer',
    name: 'Mood Cartographer',
    description: 'Earned by players who know what fits the night.',
    requiredXP: 3840
  },
  {
    id: 'session_strategist',
    name: 'Session Strategist',
    description: 'For players who turn time into progression.',
    requiredXP: 8400
  },
  {
    id: 'backlog_legend',
    name: 'Backlog Legend',
    description: 'Reserved for long-haul GamePilot regulars.',
    requiredXP: 17550
  }
]);

const SHOWCASE_SLOT_XP_REQUIREMENTS = Object.freeze([0, 2420, 7440, 18900].map((requiredXP) => tuneProgressionRequirement(requiredXP)));

const LIBRARY_PRESENTATION_UNLOCKS = tuneRewardCollection([
  {
    id: 'classic_shelf',
    name: 'Classic Shelf',
    description: 'Balanced library cards for everyday browsing.',
    requiredXP: 0,
    rewardType: 'utility',
    preview: 'linear-gradient(135deg, rgba(255, 107, 53, 0.18), rgba(15, 23, 42, 0.24))'
  },
  {
    id: 'compact_matrix',
    name: 'Compact Matrix',
    description: 'A denser shelf for scanning more games at once.',
    requiredXP: 1980,
    rewardType: 'utility',
    preview: 'linear-gradient(135deg, rgba(61, 217, 255, 0.16), rgba(34, 40, 104, 0.35))'
  },
  {
    id: 'spotlight_showcase',
    name: 'Spotlight Showcase',
    description: 'Larger, art-forward cards for featured browsing.',
    requiredXP: 6240,
    rewardType: 'utility',
    preview: 'linear-gradient(135deg, rgba(240, 147, 251, 0.18), rgba(255, 107, 53, 0.22))'
  },
  {
    id: 'intel_panels',
    name: 'Intel Panels',
    description: 'Sharper metadata panels for power users.',
    requiredXP: 12420,
    rewardType: 'utility',
    preview: 'linear-gradient(135deg, rgba(125, 220, 132, 0.16), rgba(15, 118, 110, 0.32))'
  }
]);

const HOME_LAYOUT_UNLOCKS = tuneRewardCollection([
  {
    id: 'mission_control',
    name: 'Mission Control',
    description: 'The default command layout with a full hero and filter stack.',
    requiredXP: 0,
    rewardType: 'utility',
    preview: 'linear-gradient(135deg, rgba(255, 107, 53, 0.18), rgba(255, 140, 66, 0.16))'
  },
  {
    id: 'focus_finder',
    name: 'Focus Finder',
    description: 'A tighter home layout that prioritizes recommendation inputs.',
    requiredXP: 2860,
    rewardType: 'utility',
    preview: 'linear-gradient(135deg, rgba(61, 217, 255, 0.15), rgba(99, 102, 241, 0.26))'
  },
  {
    id: 'dashboard_split',
    name: 'Dashboard Split',
    description: 'A two-column mission view for active recommendation sessions.',
    requiredXP: 8160,
    rewardType: 'utility',
    preview: 'linear-gradient(135deg, rgba(245, 183, 0, 0.18), rgba(255, 107, 53, 0.24))'
  }
]);

const RECOMMENDATION_PACK_UNLOCKS = tuneRewardCollection([
  {
    id: 'classic_glow',
    name: 'Classic Glow',
    description: 'Warm gradients and soft glow around recommendation cards.',
    requiredXP: 0,
    rewardType: 'cosmetic',
    accentColor: '#ff6b35',
    secondaryColor: '#f093fb',
    preview: 'linear-gradient(135deg, rgba(255, 107, 53, 0.28), rgba(240, 147, 251, 0.2))'
  },
  {
    id: 'arcade_signal',
    name: 'Arcade Signal',
    description: 'Neon recommendation badges and vibrant action buttons.',
    requiredXP: 2420,
    rewardType: 'cosmetic',
    accentColor: '#3dd9ff',
    secondaryColor: '#9b5cff',
    preview: 'linear-gradient(135deg, rgba(61, 217, 255, 0.28), rgba(155, 92, 255, 0.22))'
  },
  {
    id: 'tactical_hud',
    name: 'Tactical HUD',
    description: 'Sharper borders and analytic styling for decision-heavy sessions.',
    requiredXP: 6480,
    rewardType: 'cosmetic',
    accentColor: '#7ddc84',
    secondaryColor: '#0f766e',
    preview: 'linear-gradient(135deg, rgba(125, 220, 132, 0.24), rgba(15, 118, 110, 0.24))'
  },
  {
    id: 'victory_lights',
    name: 'Victory Lights',
    description: 'Celebratory gold trim for marquee recommendation moments.',
    requiredXP: 12960,
    rewardType: 'cosmetic',
    accentColor: '#f5b700',
    secondaryColor: '#ff8c42',
    preview: 'linear-gradient(135deg, rgba(245, 183, 0, 0.32), rgba(255, 140, 66, 0.22))'
  }
]);

const GAMING_LINKS_UNLOCKS = tuneRewardCollection([
  {
    id: 'basic_hover',
    name: 'Smooth Hover',
    description: 'Smooth transitions and enhanced hover effects for link containers.',
    requiredXP: 0,
    rewardType: 'cosmetic',
    features: ['hover-animation', 'enhanced-shadow']
  },
  {
    id: 'neon_glow',
    name: 'Neon Glow',
    description: 'Glowing neon borders that pulse with energy.',
    requiredXP: 1680,
    rewardType: 'cosmetic',
    accentColor: '#3dd9ff',
    features: ['neon-border', 'pulse-animation']
  },
  {
    id: 'category_icons',
    name: 'Category Icons',
    description: 'Visual icons for each link category (Store, Community, Streaming, etc.).',
    requiredXP: 3240,
    rewardType: 'cosmetic',
    features: ['category-icons']
  },
  {
    id: 'gradient_cards',
    name: 'Gradient Cards',
    description: 'Beautiful gradient backgrounds for link containers.',
    requiredXP: 5760,
    rewardType: 'cosmetic',
    features: ['gradient-background', 'glass-effect']
  },
  {
    id: 'particle_effects',
    name: 'Particle Effects',
    description: 'Subtle floating particles around link containers.',
    requiredXP: 9120,
    rewardType: 'cosmetic',
    features: ['particle-animation']
  },
  {
    id: '3d_transforms',
    name: '3D Transforms',
    description: '3D flip and rotate effects on hover.',
    requiredXP: 14040,
    rewardType: 'cosmetic',
    features: ['3d-transform', 'perspective']
  },
  {
    id: 'glass_panels',
    name: 'Glass Panels',
    description: 'Frosted glass cards with soft blur and edge lighting.',
    requiredXP: 16840,
    rewardType: 'cosmetic',
    features: ['glassmorphism', 'backdrop-blur', 'edge-lighting']
  },
  {
    id: 'status_badges',
    name: 'Status Badges',
    description: 'Adds compact badges for quick category and priority scanning.',
    requiredXP: 19800,
    rewardType: 'cosmetic',
    features: ['status-badges', 'priority-chips']
  },
  {
    id: 'spotlight_rows',
    name: 'Spotlight Rows',
    description: 'Hero row styling for featured links and seasonal picks.',
    requiredXP: 22840,
    rewardType: 'cosmetic',
    features: ['featured-row', 'hero-highlight', 'seasonal-accent']
  }
]);

const PROFILE_CUSTOMIZATION_STORAGE_KEY = 'profileCustomization';
const PRESENTATION_CUSTOMIZATION_STORAGE_KEY = 'rewardPresentationCustomization';

const PROFILE_REWARD_COLLECTIONS = Object.freeze({
  frames: PROFILE_FRAME_UNLOCKS,
  banners: PROFILE_BANNER_UNLOCKS,
  titles: PROFILE_TITLE_UNLOCKS
});

const PRESENTATION_REWARD_COLLECTIONS = Object.freeze({
  libraryVariants: LIBRARY_PRESENTATION_UNLOCKS,
  homeLayouts: HOME_LAYOUT_UNLOCKS,
  recommendationPacks: RECOMMENDATION_PACK_UNLOCKS,
  gamingLinks: GAMING_LINKS_UNLOCKS
});

const FALLBACK_THEME_TIER = 'basic';

const toFiniteNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toProgressPercent = (current, required) => {
  if (required <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round((current / required) * 100)));
};

const mapRewardRequirements = (collection = []) => collection.reduce((acc, reward) => {
  acc[reward.id] = reward.requiredXP;
  return acc;
}, {});

const readProfileCustomization = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(PROFILE_CUSTOMIZATION_STORAGE_KEY) || 'null');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    return {};
  }
};

const readPresentationCustomization = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(PRESENTATION_CUSTOMIZATION_STORAGE_KEY) || 'null');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    return {};
  }
};

const buildRewardMeta = (reward, currentXP) => ({
  ...reward,
  unlocked: currentXP >= reward.requiredXP,
  progressPercent: toProgressPercent(currentXP, reward.requiredXP)
});

const buildRewardCollectionMeta = (collection = [], currentXP) => collection.map((reward) => buildRewardMeta(reward, currentXP));

const getLockedRewards = (collection = []) => collection.filter((reward) => !reward.unlocked);

const getUnlockedRewardCount = (collection = []) => collection.filter((reward) => reward.unlocked).length;

const getRewardDisplayName = (reward) => reward?.name || reward?.label || '';

const buildUpcomingUnlocks = (collection = [], currentXP, limit = 1) => getLockedRewards(collection)
  .sort((left, right) => left.requiredXP - right.requiredXP || getRewardDisplayName(left).localeCompare(getRewardDisplayName(right)))
  .slice(0, limit)
  .map((reward) => ({
    ...reward,
    remainingXP: Math.max(0, reward.requiredXP - currentXP)
  }));

const getUnlockedRewardId = (collection, selectedId, currentXP) => {
  const matchingReward = collection.find((reward) => reward.id === selectedId && currentXP >= reward.requiredXP);
  if (matchingReward) {
    return matchingReward.id;
  }

  const unlockedRewards = collection.filter((reward) => currentXP >= reward.requiredXP);
  return unlockedRewards[unlockedRewards.length - 1]?.id || collection[0]?.id || '';
};

const sanitizeShowcasedAchievements = (achievementIds, slotCount, unlockedAchievements) => {
  const uniqueIds = Array.isArray(achievementIds)
    ? Array.from(new Set(achievementIds.filter((id) => typeof id === 'string' && unlockedAchievements.has(id))))
    : [];
  return uniqueIds.slice(0, slotCount);
};

export const PROGRESSION_UNLOCK_REQUIREMENTS = Object.freeze({
  themeTiers: THEME_TIER_XP_REQUIREMENTS,
  audio: AUDIO_UNLOCK_XP_REQUIREMENTS,
  musicPacks: mapRewardRequirements(MUSIC_PACK_UNLOCKS),
  ambientPacks: mapRewardRequirements(AMBIENT_PACK_UNLOCKS),
  buttonPacks: mapRewardRequirements(BUTTON_PACK_UNLOCKS),
  profileFrames: mapRewardRequirements(PROFILE_FRAME_UNLOCKS),
  profileBanners: mapRewardRequirements(PROFILE_BANNER_UNLOCKS),
  profileTitles: mapRewardRequirements(PROFILE_TITLE_UNLOCKS),
  showcaseSlots: SHOWCASE_SLOT_XP_REQUIREMENTS,
  libraryPresentationVariants: mapRewardRequirements(LIBRARY_PRESENTATION_UNLOCKS),
  homeLayoutVariants: mapRewardRequirements(HOME_LAYOUT_UNLOCKS),
  recommendationPacks: mapRewardRequirements(RECOMMENDATION_PACK_UNLOCKS)
});

export class ProgressionUnlockService {
  static getTotalXP() {
    const stats = AchievementTracker.getXPStats();
    return toFiniteNumber(stats?.totalXP, 0);
  }

  static getLevel() {
    const stats = AchievementTracker.getXPStats();
    return toFiniteNumber(stats?.level, 1);
  }

  static getThemeTierRequirement(themeTier) {
    if (!themeTier) return THEME_TIER_XP_REQUIREMENTS[FALLBACK_THEME_TIER];
    return THEME_TIER_XP_REQUIREMENTS[themeTier] ?? THEME_TIER_XP_REQUIREMENTS[FALLBACK_THEME_TIER];
  }

  static getThemeRequirement(themeId) {
    const theme = moodThemes.find((entry) => entry.id === themeId);
    const currentXP = this.getTotalXP();

    if (!theme || !theme.isPremium) {
      return {
        unlocked: true,
        requiredTier: null,
        requiredXP: 0,
        currentXP,
        progressPercent: 100
      };
    }

    const requiredTier = theme.requiredTier || FALLBACK_THEME_TIER;
    const requiredXP = this.getThemeTierRequirement(requiredTier);

    return {
      unlocked: currentXP >= requiredXP,
      requiredTier,
      requiredXP,
      currentXP,
      progressPercent: toProgressPercent(currentXP, requiredXP)
    };
  }

  static isThemeUnlocked(themeId) {
    return this.getThemeRequirement(themeId).unlocked;
  }

  static getPremiumThemes() {
    return moodThemes
      .filter((theme) => theme.isPremium)
      .map((theme) => {
        const unlockMeta = this.getThemeRequirement(theme.id);
        return {
          id: theme.id,
          name: theme.name,
          description: theme.description,
          requiredTier: theme.requiredTier || FALLBACK_THEME_TIER,
          requiredXP: unlockMeta.requiredXP,
          currentXP: unlockMeta.currentXP,
          progressPercent: unlockMeta.progressPercent,
          unlocked: unlockMeta.unlocked,
          preview: theme.palette?.background || theme.palette?.surface || 'linear-gradient(135deg, rgba(255, 255, 255, 0.16), rgba(15, 23, 42, 0.24))',
          rewardType: 'theme'
        };
      })
      .sort((left, right) => left.requiredXP - right.requiredXP || left.name.localeCompare(right.name));
  }

  static getThemeTierProgression() {
    const premiumThemes = this.getPremiumThemes();
    return Object.entries(THEME_TIER_XP_REQUIREMENTS).map(([tier, requiredXP]) => ({
      id: `theme_tier_${tier}`,
      tier,
      name: `${tier.charAt(0).toUpperCase()}${tier.slice(1)} Tier`,
      requiredXP,
      unlocked: this.getTotalXP() >= requiredXP,
      progressPercent: toProgressPercent(this.getTotalXP(), requiredXP),
      unlockedThemeCount: premiumThemes.filter((theme) => theme.unlocked && theme.requiredTier === tier).length,
      totalThemeCount: premiumThemes.filter((theme) => theme.requiredTier === tier).length
    }));
  }

  static getMusicRequirement() {
    const currentXP = this.getTotalXP();
    const requiredXP = AUDIO_UNLOCK_XP_REQUIREMENTS.music;
    const musicPacks = this.getMusicPacks();
    return {
      unlocked: musicPacks.some((pack) => pack.unlocked),
      requiredXP,
      currentXP,
      progressPercent: toProgressPercent(currentXP, requiredXP),
      unlockedCount: getUnlockedRewardCount(musicPacks),
      totalCount: musicPacks.length,
      nextUnlock: buildUpcomingUnlocks(musicPacks, currentXP)[0] || null
    };
  }

  static isMusicUnlocked() {
    return this.getMusicPacks().some((pack) => pack.unlocked);
  }

  static getAmbientRequirement() {
    const currentXP = this.getTotalXP();
    const requiredXP = AUDIO_UNLOCK_XP_REQUIREMENTS.ambient;
    const ambientPacks = this.getAmbientPacks();
    return {
      unlocked: ambientPacks.some((pack) => pack.unlocked),
      requiredXP,
      currentXP,
      progressPercent: toProgressPercent(currentXP, requiredXP),
      unlockedCount: getUnlockedRewardCount(ambientPacks),
      totalCount: ambientPacks.length,
      nextUnlock: buildUpcomingUnlocks(ambientPacks, currentXP)[0] || null
    };
  }

  static isAmbientUnlocked() {
    return this.getAmbientPacks().some((pack) => pack.unlocked);
  }

  static getMusicPacks() {
    const currentXP = this.getTotalXP();
    return buildRewardCollectionMeta(MUSIC_PACK_UNLOCKS, currentXP);
  }

  static getAmbientPacks() {
    const currentXP = this.getTotalXP();
    return buildRewardCollectionMeta(AMBIENT_PACK_UNLOCKS, currentXP);
  }

  static getButtonPacks() {
    const currentXP = this.getTotalXP();
    return buildRewardCollectionMeta(BUTTON_PACK_UNLOCKS, currentXP);
  }

  static getButtonPackRequirement(packId) {
    return this.getButtonPacks().find((pack) => pack.id === packId) || this.getButtonPacks()[0] || {
      unlocked: false,
      requiredXP: 0,
      currentXP: this.getTotalXP(),
      progressPercent: 0
    };
  }

  static isButtonPackUnlocked(packId) {
    return this.getButtonPackRequirement(packId).unlocked;
  }

  static getProfileFrames() {
    const currentXP = this.getTotalXP();
    return PROFILE_FRAME_UNLOCKS.map((reward) => buildRewardMeta(reward, currentXP));
  }

  static getProfileBanners() {
    const currentXP = this.getTotalXP();
    return PROFILE_BANNER_UNLOCKS.map((reward) => buildRewardMeta(reward, currentXP));
  }

  static getProfileTitles() {
    const currentXP = this.getTotalXP();
    return PROFILE_TITLE_UNLOCKS.map((reward) => buildRewardMeta(reward, currentXP));
  }

  static getShowcaseSlots() {
    const currentXP = this.getTotalXP();
    return SHOWCASE_SLOT_XP_REQUIREMENTS.map((requiredXP, index) => ({
      id: `showcase_slot_${index + 1}`,
      slotNumber: index + 1,
      requiredXP,
      unlocked: currentXP >= requiredXP,
      progressPercent: toProgressPercent(currentXP, requiredXP)
    }));
  }

  static getShowcaseSlotCount() {
    return this.getShowcaseSlots().filter((slot) => slot.unlocked).length;
  }

  static getProfileCustomization() {
    const currentXP = this.getTotalXP();
    const storedCustomization = readProfileCustomization();
    const unlockedAchievementIds = new Set(AchievementTracker.getUnlockedAchievements());
    const slotCount = this.getShowcaseSlotCount();

    const sanitizedCustomization = {
      selectedFrame: getUnlockedRewardId(PROFILE_FRAME_UNLOCKS, storedCustomization.selectedFrame, currentXP),
      selectedBanner: getUnlockedRewardId(PROFILE_BANNER_UNLOCKS, storedCustomization.selectedBanner, currentXP),
      selectedTitle: getUnlockedRewardId(PROFILE_TITLE_UNLOCKS, storedCustomization.selectedTitle, currentXP),
      showcasedAchievements: sanitizeShowcasedAchievements(storedCustomization.showcasedAchievements, slotCount, unlockedAchievementIds)
    };

    const hasStoredCustomization = Object.keys(storedCustomization).length > 0;
    if (!hasStoredCustomization || JSON.stringify(storedCustomization) !== JSON.stringify(sanitizedCustomization)) {
      localStorage.setItem(PROFILE_CUSTOMIZATION_STORAGE_KEY, JSON.stringify(sanitizedCustomization));
    }

    return sanitizedCustomization;
  }

  static updateProfileCustomization(partialCustomization = {}) {
    const currentCustomization = this.getProfileCustomization();
    const mergedCustomization = {
      ...currentCustomization,
      ...partialCustomization
    };
    const currentXP = this.getTotalXP();
    const unlockedAchievementIds = new Set(AchievementTracker.getUnlockedAchievements());
    const slotCount = this.getShowcaseSlotCount();
    const sanitizedCustomization = {
      selectedFrame: getUnlockedRewardId(PROFILE_FRAME_UNLOCKS, mergedCustomization.selectedFrame, currentXP),
      selectedBanner: getUnlockedRewardId(PROFILE_BANNER_UNLOCKS, mergedCustomization.selectedBanner, currentXP),
      selectedTitle: getUnlockedRewardId(PROFILE_TITLE_UNLOCKS, mergedCustomization.selectedTitle, currentXP),
      showcasedAchievements: sanitizeShowcasedAchievements(mergedCustomization.showcasedAchievements, slotCount, unlockedAchievementIds)
    };

    localStorage.setItem(PROFILE_CUSTOMIZATION_STORAGE_KEY, JSON.stringify(sanitizedCustomization));
    return sanitizedCustomization;
  }

  static selectProfileFrame(frameId) {
    const frame = this.getProfileFrames().find((reward) => reward.id === frameId);
    if (!frame) {
      return { success: false, message: 'Profile frame not found.' };
    }
    if (!frame.unlocked) {
      return { success: false, message: `${frame.name} unlocks at ${frame.requiredXP.toLocaleString()} XP.` };
    }

    return {
      success: true,
      message: `${frame.name} equipped.`,
      customization: this.updateProfileCustomization({ selectedFrame: frameId })
    };
  }

  static selectProfileBanner(bannerId) {
    const banner = this.getProfileBanners().find((reward) => reward.id === bannerId);
    if (!banner) {
      return { success: false, message: 'Profile banner not found.' };
    }
    if (!banner.unlocked) {
      return { success: false, message: `${banner.name} unlocks at ${banner.requiredXP.toLocaleString()} XP.` };
    }

    return {
      success: true,
      message: `${banner.name} equipped.`,
      customization: this.updateProfileCustomization({ selectedBanner: bannerId })
    };
  }

  static selectProfileTitle(titleId) {
    const title = this.getProfileTitles().find((reward) => reward.id === titleId);
    if (!title) {
      return { success: false, message: 'Profile title not found.' };
    }
    if (!title.unlocked) {
      return { success: false, message: `${title.name} unlocks at ${title.requiredXP.toLocaleString()} XP.` };
    }

    return {
      success: true,
      message: `${title.name} equipped.`,
      customization: this.updateProfileCustomization({ selectedTitle: titleId })
    };
  }

  static setShowcasedAchievements(achievementIds = []) {
    return {
      success: true,
      customization: this.updateProfileCustomization({ showcasedAchievements: achievementIds })
    };
  }

  static getLibraryPresentationVariants() {
    const currentXP = this.getTotalXP();
    return LIBRARY_PRESENTATION_UNLOCKS.map((reward) => buildRewardMeta(reward, currentXP));
  }

  static getHomeLayoutVariants() {
    const currentXP = this.getTotalXP();
    return HOME_LAYOUT_UNLOCKS.map((reward) => buildRewardMeta(reward, currentXP));
  }

  static getRecommendationPacks() {
    const currentXP = this.getTotalXP();
    return RECOMMENDATION_PACK_UNLOCKS.map((reward) => buildRewardMeta(reward, currentXP));
  }

  static getGamingLinksFeatures() {
    return GAMING_LINKS_UNLOCKS.map((reward) => ({
      ...reward,
      unlocked: true,
      progressPercent: 100
    }));
  }

  static getRewardPresentationCustomization() {
    const currentXP = this.getTotalXP();
    const storedCustomization = readPresentationCustomization();

    const sanitizedCustomization = {
      selectedLibraryVariant: getUnlockedRewardId(LIBRARY_PRESENTATION_UNLOCKS, storedCustomization.selectedLibraryVariant, currentXP),
      selectedHomeLayout: getUnlockedRewardId(HOME_LAYOUT_UNLOCKS, storedCustomization.selectedHomeLayout, currentXP),
      selectedRecommendationPack: getUnlockedRewardId(RECOMMENDATION_PACK_UNLOCKS, storedCustomization.selectedRecommendationPack, currentXP),
      selectedGamingLinksFeatures: getUnlockedRewardId(
        GAMING_LINKS_UNLOCKS,
        storedCustomization.selectedGamingLinksFeatures,
        Number.POSITIVE_INFINITY
      )
    };

    const hasStoredCustomization = Object.keys(storedCustomization).length > 0;
    if (!hasStoredCustomization || JSON.stringify(storedCustomization) !== JSON.stringify(sanitizedCustomization)) {
      localStorage.setItem(PRESENTATION_CUSTOMIZATION_STORAGE_KEY, JSON.stringify(sanitizedCustomization));
    }

    return sanitizedCustomization;
  }

  static updateRewardPresentationCustomization(partialCustomization = {}) {
    const currentCustomization = this.getRewardPresentationCustomization();
    const mergedCustomization = {
      ...currentCustomization,
      ...partialCustomization
    };
    const currentXP = this.getTotalXP();

    const sanitizedCustomization = {
      selectedLibraryVariant: getUnlockedRewardId(LIBRARY_PRESENTATION_UNLOCKS, mergedCustomization.selectedLibraryVariant, currentXP),
      selectedHomeLayout: getUnlockedRewardId(HOME_LAYOUT_UNLOCKS, mergedCustomization.selectedHomeLayout, currentXP),
      selectedRecommendationPack: getUnlockedRewardId(RECOMMENDATION_PACK_UNLOCKS, mergedCustomization.selectedRecommendationPack, currentXP),
      selectedGamingLinksFeatures: getUnlockedRewardId(
        GAMING_LINKS_UNLOCKS,
        mergedCustomization.selectedGamingLinksFeatures,
        Number.POSITIVE_INFINITY
      )
    };

    localStorage.setItem(PRESENTATION_CUSTOMIZATION_STORAGE_KEY, JSON.stringify(sanitizedCustomization));
    return sanitizedCustomization;
  }

  static selectLibraryPresentationVariant(variantId) {
    const variant = this.getLibraryPresentationVariants().find((reward) => reward.id === variantId);
    if (!variant) {
      return { success: false, message: 'Library presentation variant not found.' };
    }
    if (!variant.unlocked) {
      return { success: false, message: `${variant.name} unlocks at ${variant.requiredXP.toLocaleString()} XP.` };
    }

    return {
      success: true,
      message: `${variant.name} equipped for your library.`,
      customization: this.updateRewardPresentationCustomization({ selectedLibraryVariant: variantId })
    };
  }

  static selectHomeLayoutVariant(layoutId) {
    const layout = this.getHomeLayoutVariants().find((reward) => reward.id === layoutId);
    if (!layout) {
      return { success: false, message: 'Home layout variant not found.' };
    }
    if (!layout.unlocked) {
      return { success: false, message: `${layout.name} unlocks at ${layout.requiredXP.toLocaleString()} XP.` };
    }

    return {
      success: true,
      message: `${layout.name} equipped for Home.`,
      customization: this.updateRewardPresentationCustomization({ selectedHomeLayout: layoutId })
    };
  }

  static selectRecommendationPack(packId) {
    const pack = this.getRecommendationPacks().find((reward) => reward.id === packId);
    if (!pack) {
      return { success: false, message: 'Recommendation pack not found.' };
    }
    if (!pack.unlocked) {
      return { success: false, message: `${pack.name} unlocks at ${pack.requiredXP.toLocaleString()} XP.` };
    }

    return {
      success: true,
      message: `${pack.name} equipped for recommendations.`,
      customization: this.updateRewardPresentationCustomization({ selectedRecommendationPack: packId })
    };
  }

  static selectGamingLinksFeatures(featureId) {
    const feature = this.getGamingLinksFeatures().find((reward) => reward.id === featureId);
    if (!feature) {
      return { success: false, message: 'Gaming Links feature not found.' };
    }

    return {
      success: true,
      message: `${feature.name} enabled for Gaming Links.`,
      customization: this.updateRewardPresentationCustomization({ selectedGamingLinksFeatures: featureId })
    };
  }

  static getProfileRewardCatalog() {
    return {
      xp: this.getTotalXP(),
      level: this.getLevel(),
      premiumThemes: this.getPremiumThemes(),
      themeTiers: this.getThemeTierProgression(),
      musicPacks: this.getMusicPacks(),
      ambientPacks: this.getAmbientPacks(),
      buttonPacks: this.getButtonPacks(),
      frames: this.getProfileFrames(),
      banners: this.getProfileBanners(),
      titles: this.getProfileTitles(),
      showcaseSlots: this.getShowcaseSlots(),
      customization: this.getProfileCustomization(),
      libraryVariants: this.getLibraryPresentationVariants(),
      homeLayouts: this.getHomeLayoutVariants(),
      recommendationPacks: this.getRecommendationPacks(),
      gamingLinks: this.getGamingLinksFeatures(),
      presentationCustomization: this.getRewardPresentationCustomization()
    };
  }

  static getRewardCatalogSummary() {
    const currentXP = this.getTotalXP();
    const premiumThemes = this.getPremiumThemes();
    const musicPacks = this.getMusicPacks();
    const ambientPacks = this.getAmbientPacks();
    const buttonPacks = this.getButtonPacks();
    const frames = this.getProfileFrames();
    const banners = this.getProfileBanners();
    const titles = this.getProfileTitles();
    const showcaseSlots = this.getShowcaseSlots();
    const libraryVariants = this.getLibraryPresentationVariants();
    const homeLayouts = this.getHomeLayoutVariants();
    const recommendationPacks = this.getRecommendationPacks();
    const gamingLinks = this.getGamingLinksFeatures();
    const sortedUpcomingUnlocks = [
      ...premiumThemes.map((reward) => ({ ...reward, category: 'Theme' })),
      ...musicPacks.map((reward) => ({ ...reward, category: 'Music Pack' })),
      ...ambientPacks.map((reward) => ({ ...reward, category: 'Atmosphere Pack' })),
      ...buttonPacks.map((reward) => ({ ...reward, category: reward.packType === 'synth' ? 'Button Synth' : 'Button SFX' })),
      ...frames.map((reward) => ({ ...reward, category: 'Frame' })),
      ...banners.map((reward) => ({ ...reward, category: 'Banner' })),
      ...titles.map((reward) => ({ ...reward, category: 'Title' })),
      ...libraryVariants.map((reward) => ({ ...reward, category: 'Library Variant' })),
      ...homeLayouts.map((reward) => ({ ...reward, category: 'Home Layout' })),
      ...recommendationPacks.map((reward) => ({ ...reward, category: 'Recommendation Pack' })),
      ...gamingLinks.map((reward) => ({ ...reward, category: 'Gaming Links' })),
      ...showcaseSlots.map((slot) => ({
        id: slot.id,
        name: `Showcase Slot ${slot.slotNumber}`,
        description: `Pin one more achievement on your profile.`,
        requiredXP: slot.requiredXP,
        unlocked: slot.unlocked,
        progressPercent: slot.progressPercent,
        category: 'Showcase Slot'
      }))
    ]
      .filter((reward) => !reward.unlocked)
      .sort((left, right) => left.requiredXP - right.requiredXP || getRewardDisplayName(left).localeCompare(getRewardDisplayName(right)));

    const nextUnlock = sortedUpcomingUnlocks[0] || null;

    return {
      xp: currentXP,
      level: this.getLevel(),
      unlockedCounts: {
        premiumThemes: premiumThemes.filter((reward) => reward.unlocked).length,
        musicPacks: musicPacks.filter((reward) => reward.unlocked).length,
        ambientPacks: ambientPacks.filter((reward) => reward.unlocked).length,
        buttonPacks: buttonPacks.filter((reward) => reward.unlocked).length,
        frames: frames.filter((reward) => reward.unlocked).length,
        banners: banners.filter((reward) => reward.unlocked).length,
        titles: titles.filter((reward) => reward.unlocked).length,
        libraryVariants: libraryVariants.filter((reward) => reward.unlocked).length,
        homeLayouts: homeLayouts.filter((reward) => reward.unlocked).length,
        recommendationPacks: recommendationPacks.filter((reward) => reward.unlocked).length,
        gamingLinks: gamingLinks.filter((reward) => reward.unlocked).length
      },
      totalCounts: {
        premiumThemes: premiumThemes.length,
        musicPacks: musicPacks.length,
        ambientPacks: ambientPacks.length,
        buttonPacks: buttonPacks.length,
        frames: frames.length,
        banners: banners.length,
        titles: titles.length,
        libraryVariants: libraryVariants.length,
        homeLayouts: homeLayouts.length,
        recommendationPacks: recommendationPacks.length,
        gamingLinks: gamingLinks.length
      },
      progressionGroups: {
        themes: {
          unlocked: getUnlockedRewardCount(premiumThemes),
          total: premiumThemes.length
        },
        audio: {
          unlocked: getUnlockedRewardCount(musicPacks) + getUnlockedRewardCount(ambientPacks) + getUnlockedRewardCount(buttonPacks),
          total: musicPacks.length + ambientPacks.length + buttonPacks.length
        },
        cosmetics: {
          unlocked: getUnlockedRewardCount(frames) + getUnlockedRewardCount(banners) + getUnlockedRewardCount(titles) + getUnlockedRewardCount(recommendationPacks) + getUnlockedRewardCount(gamingLinks),
          total: frames.length + banners.length + titles.length + recommendationPacks.length + gamingLinks.length
        },
        utility: {
          unlocked: showcaseSlots.filter((slot) => slot.unlocked).length + getUnlockedRewardCount(libraryVariants) + getUnlockedRewardCount(homeLayouts),
          total: showcaseSlots.length + libraryVariants.length + homeLayouts.length
        }
      },
      showcaseSlotsUnlocked: showcaseSlots.filter((slot) => slot.unlocked).length,
      showcaseSlotsTotal: showcaseSlots.length,
      upcomingUnlocks: sortedUpcomingUnlocks.slice(0, 8).map((reward) => ({
        ...reward,
        remainingXP: Math.max(0, reward.requiredXP - currentXP)
      })),
      nextUnlock: nextUnlock
        ? {
            ...nextUnlock,
            remainingXP: Math.max(0, nextUnlock.requiredXP - currentXP)
          }
        : null
    };
  }

  static getUnlockSnapshot() {
    const currentXP = this.getTotalXP();
    const summary = this.getRewardCatalogSummary();
    return {
      xp: currentXP,
      level: this.getLevel(),
      themeTiers: this.getThemeTierProgression(),
      themes: this.getPremiumThemes(),
      audio: {
        music: this.getMusicRequirement(),
        musicPacks: this.getMusicPacks(),
        ambient: this.getAmbientRequirement(),
        ambientPacks: this.getAmbientPacks(),
        buttonPacks: this.getButtonPacks()
      },
      profile: {
        collections: Object.keys(PROFILE_REWARD_COLLECTIONS),
        frames: this.getProfileFrames(),
        banners: this.getProfileBanners(),
        titles: this.getProfileTitles(),
        showcaseSlots: this.getShowcaseSlots(),
        customization: this.getProfileCustomization(),
        summary: this.getRewardCatalogSummary()
      },
      presentation: {
        collections: Object.keys(PRESENTATION_REWARD_COLLECTIONS),
        libraryVariants: this.getLibraryPresentationVariants(),
        homeLayouts: this.getHomeLayoutVariants(),
        recommendationPacks: this.getRecommendationPacks(),
        gamingLinks: this.getGamingLinksFeatures(),
        customization: this.getRewardPresentationCustomization()
      },
      summary,
      upcomingUnlocks: summary.upcomingUnlocks
    };
  }
}
