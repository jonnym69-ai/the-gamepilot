/**
 * CollectionsService - Manages themed reward collections and completion tracking
 * Provides set bonuses and visual showcases for completed collections
 */

import { ProgressionUnlockService } from './ProgressionUnlockService';
import { 
  MUSIC_PACK_LIBRARY, 
  AMBIENT_PACK_LIBRARY, 
  BUTTON_SFX_LIBRARY,
  BUTTON_SYNTH_PRESETS 
} from './AudioRewardCatalog';
import { AchievementTracker } from '../AchievementSystem';
import StorageService from './StorageService';

// Collection definitions with themed groups of rewards
const COLLECTION_DEFINITIONS = Object.freeze([
  {
    id: 'audio_master',
    name: 'Audio Master',
    description: 'Collect every atmosphere, music, and button sound pack.',
    category: 'audio',
    icon: '🎵',
    rewards: {
      setBonusXP: 1500,
      exclusiveTitle: 'Soundweaver',
      exclusiveBadge: 'audio-master-badge'
    },
    requirements: {
      ambientPacks: Object.keys(AMBIENT_PACK_LIBRARY),
      musicPacks: Object.keys(MUSIC_PACK_LIBRARY),
      buttonPacks: [...Object.keys(BUTTON_SFX_LIBRARY), ...Object.keys(BUTTON_SYNTH_PRESETS)]
    }
  },
  {
    id: 'profile_perfectionist',
    name: 'Profile Perfectionist',
    description: 'Unlock every frame, banner, and title for your identity.',
    category: 'cosmetic',
    icon: '✨',
    rewards: {
      setBonusXP: 1200,
      exclusiveFrame: 'crown_royal',
      exclusiveBadge: 'perfectionist-badge'
    },
    get requirements() {
      const frames = ProgressionUnlockService.getProfileFrames?.() || [];
      const banners = ProgressionUnlockService.getProfileBanners?.() || [];
      const titles = ProgressionUnlockService.getProfileTitles?.() || [];
      return {
        frames: frames.map(f => f.id),
        banners: banners.map(b => b.id),
        titles: titles.map(t => t.id)
      };
    }
  },
  {
    id: 'theme_voyager',
    name: 'Theme Voyager',
    description: 'Unlock themes across all tiers.',
    category: 'themes',
    icon: '🎨',
    rewards: {
      setBonusXP: 2000,
      exclusiveTheme: 'chroma-shift',
      exclusiveBadge: 'voyager-badge'
    },
    get requirements() {
      // Dynamically loaded from theme context
      return { themeIds: [] };
    }
  },
  {
    id: 'early_adopter',
    name: 'Early Adopter',
    description: 'Unlock your first rewards in every category.',
    category: 'milestone',
    icon: '🚀',
    rewards: {
      setBonusXP: 500,
      exclusiveTitle: 'Pioneer'
    },
    requirements: {
      firstInEachCategory: ['audio', 'cosmetic', 'themes', 'utility']
    }
  },
  {
    id: 'completionist_legend',
    name: 'Completionist Legend',
    description: 'Complete all other collections. The ultimate achievement.',
    category: 'legendary',
    icon: '👑',
    rewards: {
      setBonusXP: 5000,
      exclusiveFrame: 'legend_crest',
      exclusiveTitle: 'The Completionist',
      exclusiveBadge: 'legend-badge'
    },
    requirements: {
      completeAllCollections: true
    }
  },
  {
    id: 'button_maestro',
    name: 'Button Maestro',
    description: 'Collect all button sound packs, both sample and synth.',
    category: 'audio',
    icon: '🔘',
    rewards: {
      setBonusXP: 800,
      exclusiveButtonPack: 'maestro-signature'
    },
    requirements: {
      buttonPacks: [...Object.keys(BUTTON_SFX_LIBRARY), ...Object.keys(BUTTON_SYNTH_PRESETS)]
    }
  },
  {
    id: 'atmospheric_wanderer',
    name: 'Atmospheric Wanderer',
    description: 'Collect all ambient atmosphere packs.',
    category: 'audio',
    icon: '🌊',
    rewards: {
      setBonusXP: 600,
      exclusiveTitle: 'World Listener'
    },
    requirements: {
      ambientPacks: Object.keys(AMBIENT_PACK_LIBRARY)
    }
  },
  {
    id: 'melody_seeker',
    name: 'Melody Seeker',
    description: 'Collect all background music packs.',
    category: 'audio',
    icon: '🎼',
    rewards: {
      setBonusXP: 700,
      exclusiveTitle: 'Music Collector'
    },
    requirements: {
      musicPacks: Object.keys(MUSIC_PACK_LIBRARY)
    }
  }
]);

// Storage key for collection progress
const COLLECTIONS_STORAGE_KEY = 'gamepilot_collections_progress';
const COMPLETED_COLLECTIONS_KEY = 'gamepilot_collections_completed';
const BONUS_CLAIMED_KEY = 'gamepilot_collection_bonuses_claimed';

class CollectionsService {
  /**
   * Get all collection definitions
   */
  static getAllCollections() {
    return COLLECTION_DEFINITIONS;
  }

  /**
   * Get a specific collection by ID
   */
  static getCollection(collectionId) {
    return COLLECTION_DEFINITIONS.find(c => c.id === collectionId);
  }

  /**
   * Get user's collection progress from storage
   */
  static getProgress() {
    try {
      const stored = StorageService.getString(COLLECTIONS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  /**
   * Save collection progress
   */
  static saveProgress(progress) {
    try {
      StorageService.setString(COLLECTIONS_STORAGE_KEY, JSON.stringify(progress));
    } catch (e) {
      console.warn('Failed to save collection progress:', e);
    }
  }

  /**
   * Get list of completed collections
   */
  static getCompletedCollections() {
    try {
      const stored = StorageService.getString(COMPLETED_COLLECTIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Mark a collection as completed and grant rewards
   */
  static completeCollection(collectionId) {
    const completed = this.getCompletedCollections();
    if (!completed.includes(collectionId)) {
      completed.push(collectionId);
      try {
        StorageService.setString(COMPLETED_COLLECTIONS_KEY, JSON.stringify(completed));
      } catch (e) {
        console.warn('Failed to save completed collections:', e);
      }
      
      // Grant set bonus XP
      this.grantSetBonus(collectionId);
      
      // Track achievement if applicable
      this.trackCollectionAchievement(collectionId);
      
      return true;
    }
    return false;
  }

  /**
   * Grant set bonus XP for completing a collection
   */
  static grantSetBonus(collectionId) {
    const collection = this.getCollection(collectionId);
    if (!collection || !collection.rewards?.setBonusXP) return false;

    const claimed = this.getClaimedBonuses();
    if (claimed.includes(collectionId)) return false;

    // Add to claimed list
    claimed.push(collectionId);
    try {
      StorageService.setString(BONUS_CLAIMED_KEY, JSON.stringify(claimed));
    } catch (e) {
      console.warn('Failed to save claimed bonuses:', e);
    }

    // Award XP through achievement system
    const bonusXP = collection.rewards.setBonusXP;
    AchievementTracker.grantXP?.('collection_complete', bonusXP, {
      collectionId,
      collectionName: collection.name
    });

    return bonusXP;
  }

  /**
   * Get list of claimed set bonuses
   */
  static getClaimedBonuses() {
    try {
      const stored = StorageService.getString(BONUS_CLAIMED_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Track collection completion as an achievement
   */
  static trackCollectionAchievement(collectionId) {
    const collection = this.getCollection(collectionId);
    if (!collection) return;

    // Try to unlock via AchievementTracker if available
    if (typeof AchievementTracker.unlock === 'function') {
      AchievementTracker.unlock(`collection_${collectionId}`, {
        category: 'collections',
        metadata: {
          collectionName: collection.name,
          bonusXP: collection.rewards?.setBonusXP
        }
      });
    }
  }

  /**
   * Check if user has unlocked specific rewards for collection tracking
   */
  static checkUnlockStatus(unlockedIds, requiredIds) {
    if (!Array.isArray(requiredIds)) return 0;
    if (!Array.isArray(unlockedIds)) return 0;
    
    const unlocked = requiredIds.filter(id => unlockedIds.includes(id));
    return {
      total: requiredIds.length,
      unlocked: unlocked.length,
      percent: Math.round((unlocked.length / requiredIds.length) * 100),
      remaining: requiredIds.filter(id => !unlockedIds.includes(id))
    };
  }

  /**
   * Get completion status for all collections
   */
  static getAllCompletionStatus(unlockedData) {
    const completed = this.getCompletedCollections();
    
    return COLLECTION_DEFINITIONS.map(collection => {
      const status = this.getCollectionStatus(collection, unlockedData);
      const isCompleted = completed.includes(collection.id);
      
      return {
        ...collection,
        status,
        isCompleted,
        canClaimBonus: status.isComplete && !this.getClaimedBonuses().includes(collection.id)
      };
    }).filter(collection => collection.status.totalItems > 0);
  }

  /**
   * Get completion status for a specific collection
   */
  static getCollectionStatus(collection, unlockedData) {
    const reqs = collection.requirements;
    const checks = [];

    if (reqs.frames) {
      checks.push({
        type: 'frames',
        ...this.checkUnlockStatus(unlockedData.frames, reqs.frames)
      });
    }

    if (reqs.banners) {
      checks.push({
        type: 'banners',
        ...this.checkUnlockStatus(unlockedData.banners, reqs.banners)
      });
    }

    if (reqs.titles) {
      checks.push({
        type: 'titles',
        ...this.checkUnlockStatus(unlockedData.titles, reqs.titles)
      });
    }

    if (reqs.ambientPacks) {
      checks.push({
        type: 'ambientPacks',
        ...this.checkUnlockStatus(unlockedData.ambientPacks, reqs.ambientPacks)
      });
    }

    if (reqs.musicPacks) {
      checks.push({
        type: 'musicPacks',
        ...this.checkUnlockStatus(unlockedData.musicPacks, reqs.musicPacks)
      });
    }

    if (reqs.buttonPacks) {
      checks.push({
        type: 'buttonPacks',
        ...this.checkUnlockStatus(unlockedData.buttonPacks, reqs.buttonPacks)
      });
    }

    if (reqs.completeAllCollections) {
      const allComplete = COLLECTION_DEFINITIONS
        .filter(c => c.id !== collection.id)
        .every(c => this.getCompletedCollections().includes(c.id));
      checks.push({
        type: 'completeAll',
        total: COLLECTION_DEFINITIONS.length - 1,
        unlocked: allComplete ? COLLECTION_DEFINITIONS.length - 1 : 0,
        percent: allComplete ? 100 : 0,
        remaining: allComplete ? [] : ['Complete all other collections']
      });
    }

    const totalItems = checks.reduce((sum, c) => sum + c.total, 0);
    const unlockedItems = checks.reduce((sum, c) => sum + c.unlocked, 0);
    const isComplete = checks.every(c => c.unlocked === c.total);

    return {
      checks,
      totalItems,
      unlockedItems,
      percent: totalItems > 0 ? Math.round((unlockedItems / totalItems) * 100) : 0,
      isComplete
    };
  }

  /**
   * Get recommended next collection to work on
   */
  static getRecommendedCollection(unlockedData) {
    const statuses = this.getAllCompletionStatus(unlockedData);
    
    // Find incomplete collections sorted by completion percentage (descending)
    const incomplete = statuses
      .filter(s => !s.isCompleted)
      .sort((a, b) => b.status.percent - a.status.percent);
    
    // Return the one closest to completion
    return incomplete[0] || null;
  }

  /**
   * Get exclusive rewards that have been unlocked via collections
   */
  static getUnlockedExclusives() {
    const completed = this.getCompletedCollections();
    const exclusives = [];

    completed.forEach(id => {
      const collection = this.getCollection(id);
      if (collection?.rewards) {
        if (collection.rewards.exclusiveTitle) {
          exclusives.push({ type: 'title', value: collection.rewards.exclusiveTitle, from: id });
        }
        if (collection.rewards.exclusiveFrame) {
          exclusives.push({ type: 'frame', value: collection.rewards.exclusiveFrame, from: id });
        }
        if (collection.rewards.exclusiveTheme) {
          exclusives.push({ type: 'theme', value: collection.rewards.exclusiveTheme, from: id });
        }
        if (collection.rewards.exclusiveButtonPack) {
          exclusives.push({ type: 'buttonPack', value: collection.rewards.exclusiveButtonPack, from: id });
        }
        if (collection.rewards.exclusiveBadge) {
          exclusives.push({ type: 'badge', value: collection.rewards.exclusiveBadge, from: id });
        }
      }
    });

    return exclusives;
  }

  /**
   * Calculate total collection completion percentage
   */
  static getOverallCompletion(unlockedData) {
    const statuses = this.getAllCompletionStatus(unlockedData);
    const completed = statuses.filter(s => s.isCompleted).length;
    
    return {
      totalCollections: statuses.length,
      completedCollections: completed,
      percent: statuses.length > 0 ? Math.round((completed / statuses.length) * 100) : 0,
      totalBonusXP: statuses
        .filter(s => s.isCompleted)
        .reduce((sum, s) => sum + (s.rewards?.setBonusXP || 0), 0)
    };
  }
}

export default CollectionsService;
