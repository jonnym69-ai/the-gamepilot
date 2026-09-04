import moodThemes from '../themes/moodThemes.json';
import { AchievementTracker } from '../AchievementSystem';
import StorageService from './StorageService';

const tuneProgressionRequirement = (requiredXP) => {
  if (requiredXP <= 0) return 0;
  return Math.round(requiredXP / 50) * 50;
};

const dispatchPresentationCustomizationUpdated = (customization) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent('gamepilot:reward-presentation-updated', {
    detail: customization
  }));
};

const tuneRewardCollection = (collection = []) => Object.freeze(collection.map((reward) => ({
  ...reward,
  requiredXP: tuneProgressionRequirement(reward.requiredXP)
})));

const THEME_TIER_XP_REQUIREMENTS = Object.freeze({
  basic: 0,
  plus: tuneProgressionRequirement(1000),
  gold: tuneProgressionRequirement(3600),
  platinum: tuneProgressionRequirement(8200),
  diamond: tuneProgressionRequirement(15000)
});

const CORE_THEME_IDS = Object.freeze(new Set(['dark', 'light']));

const isThemeXPUnlockedContent = (theme) => Boolean(theme) && !CORE_THEME_IDS.has(theme.id) && theme.patreonExclusive !== true;


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
    requiredXP: 800,
    accentColor: '#3dd9ff',
    shadowColor: 'rgba(61, 217, 255, 0.32)'
  },
  {
    id: 'violet_vector',
    name: 'Violet Vector',
    description: 'A sharper look for tuned-in strategists.',
    requiredXP: 2400,
    accentColor: '#9b5cff',
    shadowColor: 'rgba(155, 92, 255, 0.34)'
  },
  {
    id: 'golden_aegis',
    name: 'Golden Aegis',
    description: 'Prestige plating for high-level players.',
    requiredXP: 6400,
    accentColor: '#f5b700',
    shadowColor: 'rgba(245, 183, 0, 0.34)'
  },
  {
    id: 'crimson_guard',
    name: 'Crimson Guard',
    description: 'A fierce frame for competitive spirits.',
    requiredXP: 4800,
    accentColor: '#dc2626',
    shadowColor: 'rgba(220, 38, 38, 0.35)'
  },
  {
    id: 'emerald_sentinel',
    name: 'Emerald Sentinel',
    description: 'Guardian frame for the patient collector.',
    requiredXP: 5200,
    accentColor: '#10b981',
    shadowColor: 'rgba(16, 185, 129, 0.35)'
  },
  {
    id: 'platinum_crown',
    name: 'Platinum Crown',
    description: 'The ultimate frame for completionists.',
    requiredXP: 8200,
    accentColor: '#e5e7eb',
    shadowColor: 'rgba(229, 231, 235, 0.4)'
  },
  {
    id: 'diamond_prism',
    name: 'Diamond Prism',
    description: 'Refracted prismatic frame. Prestige tier — for the dedicated few.',
    requiredXP: 12000,
    accentColor: '#a5f3fc',
    shadowColor: 'rgba(165, 243, 252, 0.45)',
    prestige: true
  }
]);

const CARD_STYLE_UNLOCKS = tuneRewardCollection([
  {
    id: 'standard',
    name: 'Standard Cards',
    description: 'Clean, classic game cards with subtle shadows.',
    requiredXP: 0,
    rewardType: 'cosmetic',
    preview: {
      border: '1px solid var(--border-color)',
      background: 'var(--card-bg)',
      shadow: '0 2px 8px rgba(0,0,0,0.1)'
    }
  },
  {
    id: 'neon',
    name: 'Neon Frames',
    description: 'Glowing neon borders that pulse on hover.',
    requiredXP: 900,
    rewardType: 'cosmetic',
    preview: {
      border: '2px solid #00d4ff',
      background: 'linear-gradient(135deg, rgba(0,212,255,0.1) 0%, transparent 100%)',
      shadow: '0 0 20px rgba(0,212,255,0.3), inset 0 0 20px rgba(0,212,255,0.1)'
    }
  },
  {
    id: 'glass',
    name: 'Glass Prism',
    description: 'Frosted glass cards with backdrop blur and sheen.',
    requiredXP: 1800,
    rewardType: 'cosmetic',
    preview: {
      border: '1px solid rgba(255,255,255,0.2)',
      background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
      shadow: '0 8px 32px rgba(0,0,0,0.3)',
      backdropFilter: 'blur(10px)'
    }
  },
  {
    id: 'retro',
    name: 'Retro Pixels',
    description: '8-bit inspired borders with pixelated corners.',
    requiredXP: 2600,
    rewardType: 'cosmetic',
    preview: {
      border: '3px solid #4ade80',
      background: 'var(--card-bg)',
      shadow: '4px 4px 0 #1f2937',
      borderRadius: '4px'
    }
  },
  {
    id: 'holographic',
    name: 'Holographic',
    description: 'Shifting rainbow sheen on unlockable cards.',
    requiredXP: 6500,
    rewardType: 'cosmetic',
    preview: {
      border: '2px solid transparent',
      background: 'linear-gradient(135deg, rgba(255,0,128,0.2) 0%, rgba(0,255,255,0.2) 50%, rgba(255,255,0,0.2) 100%)',
      shadow: '0 0 30px rgba(255,0,128,0.3)',
      borderImage: 'linear-gradient(135deg, #ff0080, #00ffff, #ffff00) 1'
    }
  }
]);

const LOGO_ANIMATION_UNLOCKS = tuneRewardCollection([
  { id: 'synthwave-runway', name: 'Neon Runway', description: 'Cyberpunk neon aesthetic', accent: '', requiredXP: 0, rewardType: 'cosmetic' },
  { id: 'pixel-parade', name: 'Pixel Parade', description: 'Retro 8-bit style', accent: '', requiredXP: 700, rewardType: 'cosmetic' },
  { id: 'sunset-brush', name: 'Sunset Brush', description: 'Warm gradient flows', accent: '', requiredXP: 1400, rewardType: 'cosmetic' },
  { id: 'circuit-glow', name: 'Circuit Glow', description: 'Tech grid pattern', accent: '', requiredXP: 2200, rewardType: 'cosmetic' },
  { id: 'nebula-script', name: 'Nebula Script', description: 'Cosmic space theme', accent: '', requiredXP: 2200, rewardType: 'cosmetic' },
  { id: 'orbit-comet', name: 'Orbit Comet', description: 'Fast orbital streaks around your doodle avatar bubble.', accent: '', requiredXP: 3200, rewardType: 'cosmetic' },
  { id: 'moon-tide', name: 'Moon Tide', description: 'Soft lunar drift and cool-toned shimmer for calmer sessions.', accent: '', requiredXP: 4700, rewardType: 'cosmetic' },
  { id: 'victory-burst', name: 'Victory Burst', description: 'Celebratory spark bursts for high-energy profile flair.', accent: '', requiredXP: 6200, rewardType: 'cosmetic' },
  { id: 'golden-shine', name: 'Golden Shine', description: 'Prestige gold accent', accent: '', requiredXP: 8500, rewardType: 'cosmetic' }
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
    requiredXP: 900,
    preview: 'linear-gradient(135deg, rgba(34, 40, 104, 0.7), rgba(98, 0, 234, 0.45), rgba(0, 212, 255, 0.22))'
  },
  {
    id: 'aurora_drift',
    name: 'Aurora Drift',
    description: 'A calmer banner for deep backlog runs.',
    requiredXP: 2600,
    preview: 'linear-gradient(135deg, rgba(0, 150, 136, 0.55), rgba(76, 175, 80, 0.28), rgba(33, 150, 243, 0.22))'
  },
  {
    id: 'victory_wave',
    name: 'Victory Wave',
    description: 'A bright hero banner for milestone hunters.',
    requiredXP: 6800,
    preview: 'linear-gradient(135deg, rgba(245, 183, 0, 0.5), rgba(255, 107, 53, 0.35), rgba(255, 255, 255, 0.12))'
  },
  {
    id: 'crimson_arena',
    name: 'Crimson Arena',
    description: 'Competitive energy for ranked sessions.',
    requiredXP: 4200,
    preview: 'linear-gradient(135deg, rgba(220, 38, 38, 0.6), rgba(153, 27, 27, 0.4), rgba(0, 0, 0, 0.3))'
  },
  {
    id: 'emerald_archive',
    name: 'Emerald Archive',
    description: 'Scholarly vibes for deep catalog divers.',
    requiredXP: 4800,
    preview: 'linear-gradient(135deg, rgba(16, 185, 129, 0.5), rgba(6, 95, 70, 0.35), rgba(0, 0, 0, 0.2))'
  },
  {
    id: 'cosmic_horizon',
    name: 'Cosmic Horizon',
    description: 'Infinite possibilities for explorers.',
    requiredXP: 7800,
    preview: 'linear-gradient(135deg, rgba(139, 92, 246, 0.5), rgba(59, 130, 246, 0.35), rgba(15, 23, 42, 0.4))'
  },
  {
    id: 'diamond_aurora',
    name: 'Diamond Aurora',
    description: 'Iridescent prestige banner reserved for Diamond-tier pilots.',
    requiredXP: 13500,
    preview: 'linear-gradient(135deg, rgba(165, 243, 252, 0.6), rgba(196, 181, 253, 0.45), rgba(252, 165, 165, 0.35))',
    prestige: true
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
    requiredXP: 600
  },
  {
    id: 'mood_cartographer',
    name: 'Mood Cartographer',
    description: 'Earned by players who know what fits the night.',
    requiredXP: 1600
  },
  {
    id: 'session_strategist',
    name: 'Session Strategist',
    description: 'For players who turn time into progression.',
    requiredXP: 3800
  },
  {
    id: 'backlog_legend',
    name: 'Backlog Legend',
    description: 'Reserved for long-haul GamePilot regulars.',
    requiredXP: 7600
  },
  {
    id: 'achievement_hunter',
    name: 'Achievement Hunter',
    description: 'For those who chase every milestone.',
    requiredXP: 3200
  },
  {
    id: 'completionist',
    name: 'The Completionist',
    description: 'Perfected their library, one game at a time.',
    requiredXP: 5400
  },
  {
    id: 'retro_guardian',
    name: 'Retro Guardian',
    description: 'Protector of classics and forgotten gems.',
    requiredXP: 2000
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Finds their flow when the world sleeps.',
    requiredXP: 2800
  },
  {
    id: 'gamepilot_veteran',
    name: 'GamePilot Veteran',
    description: 'Has seen every update, unlocked every reward.',
    requiredXP: 9000
  },
  {
    id: 'diamond_pilot',
    name: 'Diamond Pilot',
    description: 'Prestige title for those who fly above the rest.',
    requiredXP: 15000,
    prestige: true
  }
]);

const SHOWCASE_SLOT_XP_REQUIREMENTS = Object.freeze([0, 1200, 3600, 7800].map((requiredXP) => tuneProgressionRequirement(requiredXP)));

const EXPORT_FILTER_UNLOCKS = tuneRewardCollection([
  {
    id: 'basic_export',
    name: 'Basic Export',
    description: 'Export your full library as JSON or CSV anytime.',
    requiredXP: 0,
    rewardType: 'utility',
    filters: ['json', 'csv']
  },
  {
    id: 'platform_filter',
    name: 'Platform Filter',
    description: 'Export only games from specific platforms.',
    requiredXP: 400,
    rewardType: 'utility',
    filters: ['platforms']
  },
  {
    id: 'date_filter',
    name: 'Date Range Filter',
    description: 'Export games played in the last 7, 30, or 90 days.',
    requiredXP: 800,
    rewardType: 'utility',
    filters: ['dateRange']
  },
  {
    id: 'selection_filter',
    name: 'Selected Games Export',
    description: 'Export only the games you hand-pick from your library.',
    requiredXP: 1200,
    rewardType: 'utility',
    filters: ['selectedGames']
  },
  {
    id: 'stats_only',
    name: 'Stats-Only Export',
    description: 'Trim exports to just the core stats columns for quick analysis.',
    requiredXP: 1600,
    rewardType: 'utility',
    filters: ['fields']
  },
  {
    id: 'advanced_export',
    name: 'Advanced Export Suite',
    description: 'Combine custom date ranges, platforms, selections, and field presets in one export.',
    requiredXP: 2000,
    rewardType: 'utility',
    filters: ['all']
  }
]);

const RECAP_THEME_UNLOCKS = tuneRewardCollection([
  {
    id: 'nebula',
    name: 'Nebula',
    description: 'The signature orange-on-midnight recap look.',
    requiredXP: 0,
    rewardType: 'cosmetic',
    palette: {
      background: 'linear-gradient(135deg, #0d1224 0%, #111827 50%, #0d1224 100%)',
      accent: '#ff6b35',
      glow: 'rgba(255, 107, 53, 0.22)',
      text: '#f8fafc',
      muted: '#94a3b8',
      surface: 'rgba(255, 255, 255, 0.06)',
      surfaceBorder: 'rgba(255, 255, 255, 0.1)'
    }
  },
  {
    id: 'midnight',
    name: 'Midnight Blue',
    description: 'Cool electric-blue gradient for a calm, premium feel.',
    requiredXP: 600,
    rewardType: 'cosmetic',
    palette: {
      background: 'linear-gradient(135deg, #0b1120 0%, #0f2742 50%, #0b1120 100%)',
      accent: '#38bdf8',
      glow: 'rgba(56, 189, 248, 0.24)',
      text: '#f1f5f9',
      muted: '#93a8c4',
      surface: 'rgba(255, 255, 255, 0.06)',
      surfaceBorder: 'rgba(148, 197, 255, 0.16)'
    }
  },
  {
    id: 'emerald',
    name: 'Emerald',
    description: 'Deep green tones for that grindset flex.',
    requiredXP: 1000,
    rewardType: 'cosmetic',
    palette: {
      background: 'linear-gradient(135deg, #07140f 0%, #0d2a1f 50%, #07140f 100%)',
      accent: '#34d399',
      glow: 'rgba(52, 211, 153, 0.24)',
      text: '#f0fdf4',
      muted: '#8fb8a6',
      surface: 'rgba(255, 255, 255, 0.06)',
      surfaceBorder: 'rgba(52, 211, 153, 0.16)'
    }
  },
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm pink-to-amber gradient for a vibrant share.',
    requiredXP: 1400,
    rewardType: 'cosmetic',
    palette: {
      background: 'linear-gradient(135deg, #1a0b1e 0%, #3a1024 50%, #1a0b1e 100%)',
      accent: '#fb7185',
      glow: 'rgba(251, 113, 133, 0.26)',
      text: '#fdf2f8',
      muted: '#c89bb0',
      surface: 'rgba(255, 255, 255, 0.07)',
      surfaceBorder: 'rgba(251, 113, 133, 0.18)'
    }
  },
  {
    id: 'mono',
    name: 'Mono Ink',
    description: 'Minimal monochrome styling that lets the numbers shine.',
    requiredXP: 1800,
    rewardType: 'cosmetic',
    palette: {
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1c1c1c 50%, #0a0a0a 100%)',
      accent: '#e5e7eb',
      glow: 'rgba(229, 231, 235, 0.16)',
      text: '#fafafa',
      muted: '#9ca3af',
      surface: 'rgba(255, 255, 255, 0.05)',
      surfaceBorder: 'rgba(255, 255, 255, 0.12)'
    }
  },
  {
    id: 'aurora',
    name: 'Aurora',
    description: 'Teal-to-violet aurora gradient — the prestige recap skin.',
    requiredXP: 2400,
    rewardType: 'cosmetic',
    palette: {
      background: 'linear-gradient(135deg, #06121f 0%, #15123a 50%, #052024 100%)',
      accent: '#a855f7',
      glow: 'rgba(168, 85, 247, 0.26)',
      text: '#f5f3ff',
      muted: '#a3a8d4',
      surface: 'rgba(255, 255, 255, 0.07)',
      surfaceBorder: 'rgba(168, 85, 247, 0.18)'
    }
  }
]);

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
    requiredXP: 900,
    rewardType: 'utility',
    preview: 'linear-gradient(135deg, rgba(61, 217, 255, 0.16), rgba(34, 40, 104, 0.35))'
  },
  {
    id: 'spotlight_showcase',
    name: 'Spotlight Showcase',
    description: 'Larger, art-forward cards for featured browsing.',
    requiredXP: 2800,
    rewardType: 'utility',
    preview: 'linear-gradient(135deg, rgba(240, 147, 251, 0.18), rgba(255, 107, 53, 0.22))'
  },
  {
    id: 'intel_panels',
    name: 'Intel Panels',
    description: 'Sharper metadata panels for power users.',
    requiredXP: 7000,
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
    requiredXP: 1100,
    rewardType: 'utility',
    preview: 'linear-gradient(135deg, rgba(61, 217, 255, 0.15), rgba(99, 102, 241, 0.26))'
  },
  {
    id: 'dashboard_split',
    name: 'Dashboard Split',
    description: 'A two-column mission view for active recommendation sessions.',
    requiredXP: 4600,
    rewardType: 'utility',
    preview: 'linear-gradient(135deg, rgba(245, 183, 0, 0.18), rgba(255, 107, 53, 0.24))'
  },
  {
    id: 'streamer_overlay',
    name: 'Streamer Overlay',
    description: 'Ultra-compact single-column layout that keeps the focus on what you are playing now.',
    requiredXP: 8000,
    rewardType: 'utility',
    preview: 'linear-gradient(135deg, rgba(168, 85, 247, 0.18), rgba(59, 130, 246, 0.22))'
  },
  {
    id: 'arcade_cabinet',
    name: 'Arcade Cabinet',
    description: 'Bold, spacious retro styling with chunkier sections and neon hero glow.',
    requiredXP: 12000,
    rewardType: 'utility',
    preview: 'linear-gradient(135deg, rgba(255, 107, 53, 0.28), rgba(240, 147, 251, 0.18))'
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
    requiredXP: 800,
    rewardType: 'cosmetic',
    accentColor: '#3dd9ff',
    secondaryColor: '#9b5cff',
    preview: 'linear-gradient(135deg, rgba(61, 217, 255, 0.28), rgba(155, 92, 255, 0.22))'
  },
  {
    id: 'tactical_hud',
    name: 'Tactical HUD',
    description: 'Sharper borders and analytic styling for decision-heavy sessions.',
    requiredXP: 2400,
    rewardType: 'cosmetic',
    accentColor: '#7ddc84',
    secondaryColor: '#0f766e',
    preview: 'linear-gradient(135deg, rgba(125, 220, 132, 0.24), rgba(15, 118, 110, 0.24))'
  },
  {
    id: 'victory_lights',
    name: 'Victory Lights',
    description: 'Celebratory gold trim for marquee recommendation moments.',
    requiredXP: 6200,
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
    requiredXP: 1200,
    rewardType: 'cosmetic',
    accentColor: '#3dd9ff',
    features: ['neon-border', 'pulse-animation']
  },
  {
    id: 'category_icons',
    name: 'Category Icons',
    description: 'Visual icons for each link category (Store, Community, Streaming, etc.).',
    requiredXP: 0,
    rewardType: 'cosmetic',
    features: ['category-icons']
  },
  {
    id: 'gradient_cards',
    name: 'Gradient Cards',
    description: 'Beautiful gradient backgrounds for link containers.',
    requiredXP: 2200,
    rewardType: 'cosmetic',
    features: ['gradient-background', 'glass-effect']
  },
  {
    id: 'particle_effects',
    name: 'Particle Effects',
    description: 'Subtle floating particles around link containers.',
    requiredXP: 4200,
    rewardType: 'cosmetic',
    features: ['particle-animation']
  },
  {
    id: '3d_transforms',
    name: '3D Transforms',
    description: '3D flip and rotate effects on hover.',
    requiredXP: 5600,
    rewardType: 'cosmetic',
    features: ['3d-transform', 'perspective']
  },
  {
    id: 'glass_panels',
    name: 'Glass Panels',
    description: 'Frosted glass cards with soft blur and edge lighting.',
    requiredXP: 3000,
    rewardType: 'cosmetic',
    features: ['glassmorphism', 'backdrop-blur', 'edge-lighting']
  },
  {
    id: 'status_badges',
    name: 'Status Badges',
    description: 'Adds compact badges for quick category and priority scanning.',
    requiredXP: 1800,
    rewardType: 'cosmetic',
    features: ['status-badges', 'priority-chips']
  },
  {
    id: 'spotlight_rows',
    name: 'Spotlight Rows',
    description: 'Hero row styling for featured links and seasonal picks.',
    requiredXP: 6800,
    rewardType: 'cosmetic',
    features: ['featured-row', 'hero-highlight', 'seasonal-accent']
  }
]);

// XP-gated layout + box-style rewards for the Gaming Links page.
// Different from the always-available cosmetic features above — these change
// the actual page structure (grid vs list vs hero, box shape, etc.).
const GAMING_LINKS_LAYOUT_UNLOCKS = tuneRewardCollection([
  {
    id: 'classic_grid',
    name: 'Classic Grid',
    description: 'The default 3-column grid you start with.',
    requiredXP: 0,
    rewardType: 'cosmetic',
    layout: 'grid',
    box: 'rounded',
    preview: 'linear-gradient(135deg, rgba(255, 107, 53, 0.18), rgba(15, 23, 42, 0.24))'
  },
  {
    id: 'compact_list',
    name: 'Compact List',
    description: 'Single-column dense list — see more links at a glance.',
    requiredXP: 750,
    rewardType: 'cosmetic',
    layout: 'list',
    box: 'pill',
    preview: 'linear-gradient(135deg, rgba(61, 217, 255, 0.18), rgba(34, 40, 104, 0.32))'
  },
  {
    id: 'showcase_hero',
    name: 'Showcase Hero',
    description: 'First link in each category becomes a featured hero card.',
    requiredXP: 1800,
    rewardType: 'cosmetic',
    layout: 'hero',
    box: 'rounded',
    preview: 'linear-gradient(135deg, rgba(245, 183, 0, 0.2), rgba(255, 107, 53, 0.26))'
  },
  {
    id: 'magazine_mosaic',
    name: 'Magazine Mosaic',
    description: 'Asymmetric mosaic with mixed card sizes for a magazine look.',
    requiredXP: 3400,
    rewardType: 'cosmetic',
    layout: 'mosaic',
    box: 'sharp',
    preview: 'linear-gradient(135deg, rgba(240, 147, 251, 0.22), rgba(155, 92, 255, 0.24))'
  },
  {
    id: 'hex_grid',
    name: 'Hex Grid',
    description: 'Hexagonal tiles arranged in a honeycomb. Pure flex.',
    requiredXP: 5800,
    rewardType: 'cosmetic',
    layout: 'hex',
    box: 'hex',
    preview: 'linear-gradient(135deg, rgba(125, 220, 132, 0.22), rgba(15, 118, 110, 0.32))'
  },
  {
    id: 'arcade_cabinet',
    name: 'Arcade Cabinet',
    description: 'Retro arcade marquee style with glowing CRT borders.',
    requiredXP: 7600,
    rewardType: 'cosmetic',
    layout: 'arcade',
    box: 'arcade',
    preview: 'linear-gradient(135deg, rgba(255, 0, 128, 0.22), rgba(0, 212, 255, 0.22))'
  }
]);

const PROFILE_CUSTOMIZATION_STORAGE_KEY = 'profileCustomization';
const PRESENTATION_CUSTOMIZATION_STORAGE_KEY = 'rewardPresentationCustomization';
const EXPORT_FILTER_CUSTOMIZATION_STORAGE_KEY = 'exportFilterCustomization';
const LEGACY_CARD_STYLE_STORAGE_KEY = 'gamepilot_card_style';
const LEGACY_LOGO_ANIMATION_STORAGE_KEY = 'gamepilot_logo_animation';

const PROFILE_REWARD_COLLECTIONS = Object.freeze({
  frames: PROFILE_FRAME_UNLOCKS,
  banners: PROFILE_BANNER_UNLOCKS,
  titles: PROFILE_TITLE_UNLOCKS
});

const PRESENTATION_REWARD_COLLECTIONS = Object.freeze({
  cardStyles: CARD_STYLE_UNLOCKS,
  logoAnimations: LOGO_ANIMATION_UNLOCKS,
  libraryVariants: LIBRARY_PRESENTATION_UNLOCKS,
  homeLayouts: HOME_LAYOUT_UNLOCKS,
  recommendationPacks: RECOMMENDATION_PACK_UNLOCKS,
  gamingLinks: GAMING_LINKS_UNLOCKS,
  gamingLinksLayouts: GAMING_LINKS_LAYOUT_UNLOCKS,
  exportFilters: EXPORT_FILTER_UNLOCKS,
  recapThemes: RECAP_THEME_UNLOCKS
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


const readProfileCustomization = () => {
  try {
    const parsed = StorageService.get(PROFILE_CUSTOMIZATION_STORAGE_KEY, null);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    return {};
  }
};

const readPresentationCustomization = () => {
  try {
    const parsed = StorageService.get(PRESENTATION_CUSTOMIZATION_STORAGE_KEY, null);
    const customization = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    const legacyCardStyle = StorageService.getString(LEGACY_CARD_STYLE_STORAGE_KEY);
    const legacyLogoAnimation = StorageService.getString(LEGACY_LOGO_ANIMATION_STORAGE_KEY);

    return {
      ...customization,
      selectedCardStyle: customization.selectedCardStyle || legacyCardStyle || customization.selectedCardStyle,
      selectedLogoAnimation: customization.selectedLogoAnimation || legacyLogoAnimation || customization.selectedLogoAnimation
    };
  } catch (error) {
    return {};
  }
};

const readExportFilterCustomization = () => {
  try {
    const parsed = StorageService.get(EXPORT_FILTER_CUSTOMIZATION_STORAGE_KEY, null);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    return {};
  }
};

const getUnlockedRewardCount = (collection = []) => collection.filter((reward) => reward.unlocked).length;

const getRewardDisplayName = (reward) => reward?.name || reward?.label || '';
const GLOBAL_UNLOCK_STEP_XP = 200;

const PROGRESSION_SEQUENCE_ORDER = Object.freeze({
  'Theme': 1,
  'Frame': 2,
  'Banner': 3,
  'Title': 4,
  'Recommendation Pack': 5,
  'Music Pack': 6,
  'Atmosphere Pack': 7,
  'Button Synth': 8,
  'Button SFX': 9,
  'Library Variant': 10,
  'Home Layout': 11,
  'Showcase Slot': 12,
  'Card Style': 13,
  'Logo Animation': 14,
  'Gaming Links': 15,
  'Gaming Links Layout': 16,
  'Export Filter': 17,
  'Recap Theme': 18
});

const buildSequencedUnlockTrack = (rewards = [], currentXP = 0, limit = 8) => rewards
  .filter((reward) => !reward.unlocked)
  .sort((left, right) => {
    const leftSequence = PROGRESSION_SEQUENCE_ORDER[left.category] || Number.MAX_SAFE_INTEGER;
    const rightSequence = PROGRESSION_SEQUENCE_ORDER[right.category] || Number.MAX_SAFE_INTEGER;

    return left.requiredXP - right.requiredXP
      || leftSequence - rightSequence
      || getRewardDisplayName(left).localeCompare(getRewardDisplayName(right));
  })
  .slice(0, limit)
  .map((reward, index) => ({
    ...reward,
    unlockStep: index + 1,
    remainingXP: Math.max(0, reward.requiredXP - currentXP),
    displayRemainingXP: Math.max(0, reward.requiredXP - currentXP),
    displayRequiredXP: reward.requiredXP,
    isNearlyUnlocked: Math.max(0, reward.requiredXP - currentXP) <= 25
  }));

const buildGlobalRewardPool = () => {
  const themeRewards = moodThemes
    .filter((theme) => isThemeXPUnlockedContent(theme))
    .map((theme) => ({
      trackKey: `Theme:${theme.id}`,
      id: theme.id,
      name: theme.name,
      description: theme.description,
      category: 'Theme',
      requiredTier: theme.requiredTier || FALLBACK_THEME_TIER,
      baseRequiredXP: THEME_TIER_XP_REQUIREMENTS[theme.requiredTier || FALLBACK_THEME_TIER] ?? THEME_TIER_XP_REQUIREMENTS[FALLBACK_THEME_TIER],
      rewardType: 'theme'
    }));

  const showcaseRewards = SHOWCASE_SLOT_XP_REQUIREMENTS.map((requiredXP, index) => ({
    trackKey: `Showcase Slot:showcase_slot_${index + 1}`,
    id: `showcase_slot_${index + 1}`,
    name: `Showcase Slot ${index + 1}`,
    description: 'Pin one more achievement on your profile.',
    category: 'Showcase Slot',
    baseRequiredXP: requiredXP,
    slotNumber: index + 1,
    rewardType: 'utility'
  }));

  const catalogRewards = [
    ...PROFILE_FRAME_UNLOCKS.map((reward) => ({ trackKey: `Frame:${reward.id}`, category: 'Frame', ...reward })),
    ...PROFILE_BANNER_UNLOCKS.map((reward) => ({ trackKey: `Banner:${reward.id}`, category: 'Banner', ...reward })),
    ...PROFILE_TITLE_UNLOCKS.map((reward) => ({ trackKey: `Title:${reward.id}`, category: 'Title', ...reward })),
    ...CARD_STYLE_UNLOCKS.map((reward) => ({ trackKey: `Card Style:${reward.id}`, category: 'Card Style', ...reward })),
    ...LOGO_ANIMATION_UNLOCKS.map((reward) => ({ trackKey: `Logo Animation:${reward.id}`, category: 'Logo Animation', ...reward })),
    ...LIBRARY_PRESENTATION_UNLOCKS.map((reward) => ({ trackKey: `Library Variant:${reward.id}`, category: 'Library Variant', ...reward })),
    ...HOME_LAYOUT_UNLOCKS.map((reward) => ({ trackKey: `Home Layout:${reward.id}`, category: 'Home Layout', ...reward })),
    ...RECOMMENDATION_PACK_UNLOCKS.map((reward) => ({ trackKey: `Recommendation Pack:${reward.id}`, category: 'Recommendation Pack', ...reward })),
    ...GAMING_LINKS_UNLOCKS.map((reward) => ({ trackKey: `Gaming Links:${reward.id}`, category: 'Gaming Links', ...reward })),
    ...GAMING_LINKS_LAYOUT_UNLOCKS.map((reward) => ({ trackKey: `Gaming Links Layout:${reward.id}`, category: 'Gaming Links Layout', ...reward })),
    ...EXPORT_FILTER_UNLOCKS.map((reward) => ({ trackKey: `Export Filter:${reward.id}`, category: 'Export Filter', ...reward })),
    ...RECAP_THEME_UNLOCKS.map((reward) => ({ trackKey: `Recap Theme:${reward.id}`, category: 'Recap Theme', ...reward })),
  ].map((reward) => ({
    ...reward,
    baseRequiredXP: reward.requiredXP
  }));

  return [...themeRewards, ...catalogRewards, ...showcaseRewards]
    .sort((left, right) => {
      const leftSequence = PROGRESSION_SEQUENCE_ORDER[left.category] || Number.MAX_SAFE_INTEGER;
      const rightSequence = PROGRESSION_SEQUENCE_ORDER[right.category] || Number.MAX_SAFE_INTEGER;

      return left.baseRequiredXP - right.baseRequiredXP
        || leftSequence - rightSequence
        || getRewardDisplayName(left).localeCompare(getRewardDisplayName(right));
    })
    .reduce((acc, reward, index) => {
      const previousRequiredXP = index > 0 ? acc[index - 1].requiredXP : -GLOBAL_UNLOCK_STEP_XP;
      const requiredXP = Math.max(reward.baseRequiredXP, previousRequiredXP + GLOBAL_UNLOCK_STEP_XP);
      acc.push({
        ...reward,
        requiredXP,
        unlockStep: index + 1
      });
      return acc;
    }, []);
};

const GLOBAL_SEQUENTIAL_REWARD_TRACK = Object.freeze(buildGlobalRewardPool());

const GLOBAL_SEQUENTIAL_REWARD_LOOKUP = Object.freeze(GLOBAL_SEQUENTIAL_REWARD_TRACK.reduce((acc, reward) => {
  acc[reward.trackKey] = reward;
  return acc;
}, {}));

const getSequentialReward = (category, rewardId) => GLOBAL_SEQUENTIAL_REWARD_LOOKUP[`${category}:${rewardId}`] || null;

const buildSequentialRewardMeta = (category, reward, currentXP) => {
  const sequentialReward = getSequentialReward(category, reward.id);
  const requiredXP = sequentialReward?.requiredXP ?? reward.requiredXP ?? 0;
  return {
    ...reward,
    requiredXP,
    originalRequiredXP: sequentialReward?.baseRequiredXP ?? reward.requiredXP ?? 0,
    unlockStep: sequentialReward?.unlockStep || null,
    unlocked: currentXP >= requiredXP,
    progressPercent: toProgressPercent(currentXP, requiredXP)
  };
};

const RECAP_STAT_KEYS = ['games', 'sessions', 'steamHours', 'libraryValue', 'topGames'];
const SHARE_CARD_WATERMARKS = ['gamepilot', 'github', 'itchio', 'none'];

const sanitizeShareCardWatermark = (value) => {
  return SHARE_CARD_WATERMARKS.includes(value) ? value : 'gamepilot';
};

const sanitizeRecapVisibleStats = (value) => {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return RECAP_STAT_KEYS.reduce((acc, key) => {
    acc[key] = source[key] !== false; // default visible
    return acc;
  }, {});
};

const getUnlockedRewardIdFromMeta = (collection = [], selectedId) => {
  const matchingReward = collection.find((reward) => reward.id === selectedId && reward.unlocked);
  if (matchingReward) {
    return matchingReward.id;
  }

  const unlockedRewards = collection.filter((reward) => reward.unlocked);
  return unlockedRewards[unlockedRewards.length - 1]?.id || collection[0]?.id || '';
};

const sanitizeShowcasedAchievements = (achievementIds, slotCount, unlockedAchievements) => {
  const uniqueIds = Array.isArray(achievementIds)
    ? Array.from(new Set(achievementIds.filter((id) => typeof id === 'string' && unlockedAchievements.has(id))))
    : [];
  return uniqueIds.slice(0, slotCount);
};

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
    const sequentialTheme = getSequentialReward('Theme', themeId);

    if (!theme || !isThemeXPUnlockedContent(theme)) {
      return {
        unlocked: true,
        requiredTier: null,
        requiredXP: 0,
        currentXP,
        progressPercent: 100
      };
    }

    const requiredTier = theme.requiredTier || FALLBACK_THEME_TIER;
    const requiredXP = sequentialTheme?.requiredXP ?? this.getThemeTierRequirement(requiredTier);

    return {
      unlocked: currentXP >= requiredXP,
      requiredTier,
      requiredXP,
      originalRequiredXP: sequentialTheme?.baseRequiredXP ?? this.getThemeTierRequirement(requiredTier),
      unlockStep: sequentialTheme?.unlockStep || null,
      currentXP,
      progressPercent: toProgressPercent(currentXP, requiredXP)
    };
  }

  static isThemeUnlocked(themeId) {
    return this.getThemeRequirement(themeId).unlocked;
  }

  static getUnlockableThemes() {
    return moodThemes
      .filter((theme) => isThemeXPUnlockedContent(theme))
      .map((theme) => {
        const unlockMeta = this.getThemeRequirement(theme.id);
        return {
          id: theme.id,
          name: theme.name,
          description: theme.description,
          requiredTier: theme.requiredTier || FALLBACK_THEME_TIER,
          requiredXP: unlockMeta.requiredXP,
          originalRequiredXP: unlockMeta.originalRequiredXP,
          currentXP: unlockMeta.currentXP,
          progressPercent: unlockMeta.progressPercent,
          unlocked: unlockMeta.unlocked,
          unlockStep: unlockMeta.unlockStep,
          preview: theme.palette?.background || theme.palette?.surface || 'linear-gradient(135deg, rgba(255, 255, 255, 0.16), rgba(15, 23, 42, 0.24))',
          rewardType: 'theme'
        };
      })
      .sort((left, right) => left.requiredXP - right.requiredXP || left.name.localeCompare(right.name));
  }

  static getThemes() {
    return this.getUnlockableThemes();
  }

  static getThemeTierProgression() {
    const unlockableThemes = this.getUnlockableThemes();
    return Object.entries(THEME_TIER_XP_REQUIREMENTS).map(([tier, requiredXP]) => ({
      id: `theme_tier_${tier}`,
      tier,
      name: `${tier.charAt(0).toUpperCase()}${tier.slice(1)} Tier`,
      requiredXP,
      unlocked: this.getTotalXP() >= requiredXP,
      progressPercent: toProgressPercent(this.getTotalXP(), requiredXP),
      unlockedThemeCount: unlockableThemes.filter((theme) => theme.unlocked && theme.requiredTier === tier).length,
      totalThemeCount: unlockableThemes.filter((theme) => theme.requiredTier === tier).length
    }));
  }


  static getProfileFrames() {
    const currentXP = this.getTotalXP();
    return PROFILE_FRAME_UNLOCKS.map((reward) => buildSequentialRewardMeta('Frame', reward, currentXP));
  }

  static getProfileBanners() {
    const currentXP = this.getTotalXP();
    return PROFILE_BANNER_UNLOCKS.map((reward) => buildSequentialRewardMeta('Banner', reward, currentXP));
  }

  static getProfileTitles() {
    const currentXP = this.getTotalXP();
    return PROFILE_TITLE_UNLOCKS.map((reward) => buildSequentialRewardMeta('Title', reward, currentXP));
  }

  static getShowcaseSlots() {
    const currentXP = this.getTotalXP();
    return SHOWCASE_SLOT_XP_REQUIREMENTS.map((requiredXP, index) => {
      const id = `showcase_slot_${index + 1}`;
      const sequentialReward = getSequentialReward('Showcase Slot', id);
      const effectiveRequiredXP = sequentialReward?.requiredXP ?? requiredXP;

      return {
        id,
        slotNumber: index + 1,
        requiredXP: effectiveRequiredXP,
        originalRequiredXP: requiredXP,
        unlockStep: sequentialReward?.unlockStep || null,
        unlocked: currentXP >= effectiveRequiredXP,
        progressPercent: toProgressPercent(currentXP, effectiveRequiredXP)
      };
    });
  }

  static getShowcaseSlotCount() {
    return this.getShowcaseSlots().filter((slot) => slot.unlocked).length;
  }

  static getProfileCustomization() {
    const storedCustomization = readProfileCustomization();
    const unlockedAchievementIds = new Set(AchievementTracker.getUnlockedAchievements());
    const slotCount = this.getShowcaseSlotCount();
    const frames = this.getProfileFrames();
    const banners = this.getProfileBanners();
    const titles = this.getProfileTitles();

    const sanitizedCustomization = {
      selectedFrame: getUnlockedRewardIdFromMeta(frames, storedCustomization.selectedFrame),
      selectedBanner: getUnlockedRewardIdFromMeta(banners, storedCustomization.selectedBanner),
      selectedTitle: getUnlockedRewardIdFromMeta(titles, storedCustomization.selectedTitle),
      showcasedAchievements: sanitizeShowcasedAchievements(storedCustomization.showcasedAchievements, slotCount, unlockedAchievementIds)
    };

    const hasStoredCustomization = Object.keys(storedCustomization).length > 0;
    if (!hasStoredCustomization || JSON.stringify(storedCustomization) !== JSON.stringify(sanitizedCustomization)) {
      StorageService.set(PROFILE_CUSTOMIZATION_STORAGE_KEY, sanitizedCustomization);
    }

    return sanitizedCustomization;
  }

  static updateProfileCustomization(partialCustomization = {}) {
    const currentCustomization = this.getProfileCustomization();
    const mergedCustomization = {
      ...currentCustomization,
      ...partialCustomization
    };
    const unlockedAchievementIds = new Set(AchievementTracker.getUnlockedAchievements());
    const slotCount = this.getShowcaseSlotCount();
    const frames = this.getProfileFrames();
    const banners = this.getProfileBanners();
    const titles = this.getProfileTitles();

    const sanitizedCustomization = {
      selectedFrame: getUnlockedRewardIdFromMeta(frames, mergedCustomization.selectedFrame),
      selectedBanner: getUnlockedRewardIdFromMeta(banners, mergedCustomization.selectedBanner),
      selectedTitle: getUnlockedRewardIdFromMeta(titles, mergedCustomization.selectedTitle),
      showcasedAchievements: sanitizeShowcasedAchievements(mergedCustomization.showcasedAchievements, slotCount, unlockedAchievementIds)
    };

    StorageService.set(PROFILE_CUSTOMIZATION_STORAGE_KEY, sanitizedCustomization);
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
    return LIBRARY_PRESENTATION_UNLOCKS.map((reward) => buildSequentialRewardMeta('Library Variant', reward, currentXP));
  }

  static getCardStyles() {
    const currentXP = this.getTotalXP();
    return CARD_STYLE_UNLOCKS.map((reward) => buildSequentialRewardMeta('Card Style', reward, currentXP));
  }

  static getLogoAnimations() {
    const currentXP = this.getTotalXP();
    return LOGO_ANIMATION_UNLOCKS.map((reward) => buildSequentialRewardMeta('Logo Animation', reward, currentXP));
  }

  static getHomeLayoutVariants() {
    const currentXP = this.getTotalXP();
    return HOME_LAYOUT_UNLOCKS.map((reward) => buildSequentialRewardMeta('Home Layout', reward, currentXP));
  }

  static getRecommendationPacks() {
    const currentXP = this.getTotalXP();
    return RECOMMENDATION_PACK_UNLOCKS.map((reward) => buildSequentialRewardMeta('Recommendation Pack', reward, currentXP));
  }

  static getGamingLinksFeatures() {
    const currentXP = this.getTotalXP();
    return GAMING_LINKS_UNLOCKS.map((reward) => buildSequentialRewardMeta('Gaming Links', reward, currentXP));
  }

  static getGamingLinksLayouts() {
    const currentXP = this.getTotalXP();
    return GAMING_LINKS_LAYOUT_UNLOCKS.map((reward) => buildSequentialRewardMeta('Gaming Links Layout', reward, currentXP));
  }

  static getExportFilters() {
    const currentXP = this.getTotalXP();
    return EXPORT_FILTER_UNLOCKS.map((reward) => buildSequentialRewardMeta('Export Filter', reward, currentXP));
  }

  static getExportFilterCustomization() {
    const storedCustomization = readExportFilterCustomization();
    const exportFilters = this.getExportFilters();
    const unlockedFilterIds = new Set(exportFilters.filter((reward) => reward.unlocked).map((reward) => reward.id));
    const selectedPreset = storedCustomization.selectedPreset && unlockedFilterIds.has(storedCustomization.selectedPreset)
      ? storedCustomization.selectedPreset
      : 'basic_export';

    const sanitized = {
      selectedPreset,
      defaultFields: storedCustomization.defaultFields || 'standard',
      defaultDateRange: storedCustomization.defaultDateRange || 'all',
      includePrices: Boolean(storedCustomization.includePrices),
      includePlaytime: storedCustomization.includePlaytime !== false
    };

    if (JSON.stringify(storedCustomization) !== JSON.stringify(sanitized)) {
      StorageService.set(EXPORT_FILTER_CUSTOMIZATION_STORAGE_KEY, sanitized);
    }

    return sanitized;
  }

  static updateExportFilterCustomization(partialCustomization = {}) {
    const currentCustomization = this.getExportFilterCustomization();
    const mergedCustomization = { ...currentCustomization, ...partialCustomization };
    const exportFilters = this.getExportFilters();
    const unlockedFilterIds = new Set(exportFilters.filter((reward) => reward.unlocked).map((reward) => reward.id));

    const sanitized = {
      selectedPreset: unlockedFilterIds.has(mergedCustomization.selectedPreset)
        ? mergedCustomization.selectedPreset
        : currentCustomization.selectedPreset,
      defaultFields: ['minimal', 'standard', 'full'].includes(mergedCustomization.defaultFields)
        ? mergedCustomization.defaultFields
        : currentCustomization.defaultFields,
      defaultDateRange: ['all', 'last7days', 'last30days', 'last90days', 'lastYear', 'custom'].includes(mergedCustomization.defaultDateRange)
        ? mergedCustomization.defaultDateRange
        : currentCustomization.defaultDateRange,
      includePrices: Boolean(mergedCustomization.includePrices),
      includePlaytime: mergedCustomization.includePlaytime !== false
    };

    StorageService.set(EXPORT_FILTER_CUSTOMIZATION_STORAGE_KEY, sanitized);
    return sanitized;
  }

  static selectExportFilterPreset(presetId) {
    const preset = this.getExportFilters().find((reward) => reward.id === presetId);
    if (!preset) {
      return { success: false, message: 'Export filter preset not found.' };
    }
    if (!preset.unlocked) {
      return { success: false, message: `${preset.name} unlocks at ${preset.requiredXP.toLocaleString()} XP.` };
    }

    const exportFilterCustomization = this.updateExportFilterCustomization({ selectedPreset: presetId });
    const presentationCustomization = this.updateRewardPresentationCustomization({ selectedExportFilter: presetId });
    return {
      success: true,
      message: `${preset.name} equipped as your default export preset.`,
      customization: exportFilterCustomization,
      presentationCustomization
    };
  }

  static getRecapThemes() {
    const currentXP = this.getTotalXP();
    return RECAP_THEME_UNLOCKS.map((reward) => {
      const meta = buildSequentialRewardMeta('Recap Theme', reward, currentXP);
      // The default skin (0 XP base) is always available so every user can share.
      if ((reward.requiredXP ?? 0) === 0) {
        return { ...meta, unlocked: true, requiredXP: 0, progressPercent: 100 };
      }
      return meta;
    });
  }

  static getRecapStatKeys() {
    return ['games', 'sessions', 'steamHours', 'libraryValue', 'topGames'];
  }

  static getRecapCustomization() {
    const presentation = this.getRewardPresentationCustomization();
    const themes = this.getRecapThemes();
    const selectedTheme = themes.find((reward) => reward.id === presentation.selectedRecapTheme && reward.unlocked)
      || themes.find((reward) => reward.id === 'nebula')
      || themes[0]
      || null;

    return {
      selectedThemeId: selectedTheme?.id || 'nebula',
      palette: selectedTheme?.palette || null,
      visibleStats: presentation.recapVisibleStats,
      useMostPlayedCover: presentation.useMostPlayedCover !== false,
      shareCardWatermark: presentation.shareCardWatermark || 'gamepilot'
    };
  }

  static selectRecapTheme(themeId) {
    const theme = this.getRecapThemes().find((reward) => reward.id === themeId);
    if (!theme) {
      return { success: false, message: 'Recap theme not found.' };
    }
    if (!theme.unlocked) {
      return { success: false, message: `${theme.name} unlocks at ${theme.requiredXP.toLocaleString()} XP.` };
    }

    return {
      success: true,
      message: `${theme.name} equipped for your recap card.`,
      customization: this.updateRewardPresentationCustomization({ selectedRecapTheme: themeId })
    };
  }

  static updateRecapStatVisibility(partialVisibility = {}) {
    const current = this.getRewardPresentationCustomization().recapVisibleStats;
    const nextVisibility = { ...current, ...partialVisibility };
    return this.updateRewardPresentationCustomization({ recapVisibleStats: nextVisibility });
  }

  static updateRecapUseMostPlayedCover(useCover = true) {
    return this.updateRewardPresentationCustomization({ useMostPlayedCover: Boolean(useCover) });
  }

  static updateShareCardWatermark(watermark = 'gamepilot') {
    return this.updateRewardPresentationCustomization({ shareCardWatermark: sanitizeShareCardWatermark(watermark) });
  }

  static getExportFilterUnlockStatus(filterId) {
    const filter = this.getExportFilters().find((reward) => reward.id === filterId);
    return filter || { unlocked: false, requiredXP: 0, name: filterId };
  }

  static isExportFilterUnlocked(filterId) {
    return this.getExportFilterUnlockStatus(filterId).unlocked;
  }

  static canUseExportFilter(filterType) {
    const exportFilters = this.getExportFilters();
    return exportFilters.some((reward) => reward.unlocked && (reward.filters || []).includes(filterType));
  }

  static getRewardPresentationCustomization() {
    const storedCustomization = readPresentationCustomization();
    const cardStyles = this.getCardStyles();
    const logoAnimations = this.getLogoAnimations();
    const libraryVariants = this.getLibraryPresentationVariants();
    const homeLayouts = this.getHomeLayoutVariants();
    const recommendationPacks = this.getRecommendationPacks();
    const gamingLinksLayouts = this.getGamingLinksLayouts();
    const exportFilterCustomization = this.getExportFilterCustomization();
    const recapThemes = this.getRecapThemes();

    const sanitizedCustomization = {
      selectedCardStyle: getUnlockedRewardIdFromMeta(cardStyles, storedCustomization.selectedCardStyle),
      selectedLogoAnimation: getUnlockedRewardIdFromMeta(logoAnimations, storedCustomization.selectedLogoAnimation),
      selectedLibraryVariant: getUnlockedRewardIdFromMeta(libraryVariants, storedCustomization.selectedLibraryVariant),
      selectedHomeLayout: getUnlockedRewardIdFromMeta(homeLayouts, storedCustomization.selectedHomeLayout),
      selectedRecommendationPack: getUnlockedRewardIdFromMeta(recommendationPacks, storedCustomization.selectedRecommendationPack),
      selectedGamingLinksFeatures: getUnlockedRewardIdFromMeta(this.getGamingLinksFeatures(), storedCustomization.selectedGamingLinksFeatures),
      selectedGamingLinksLayout: getUnlockedRewardIdFromMeta(gamingLinksLayouts, storedCustomization.selectedGamingLinksLayout),
      selectedExportFilter: getUnlockedRewardIdFromMeta(this.getExportFilters(), exportFilterCustomization.selectedPreset),
      selectedRecapTheme: getUnlockedRewardIdFromMeta(recapThemes, storedCustomization.selectedRecapTheme),
      recapVisibleStats: sanitizeRecapVisibleStats(storedCustomization.recapVisibleStats),
      useMostPlayedCover: storedCustomization.useMostPlayedCover !== false,
      shareCardWatermark: sanitizeShareCardWatermark(storedCustomization.shareCardWatermark)
    };

    const hasStoredCustomization = Object.keys(storedCustomization).length > 0;
    if (!hasStoredCustomization || JSON.stringify(storedCustomization) !== JSON.stringify(sanitizedCustomization)) {
      StorageService.set(PRESENTATION_CUSTOMIZATION_STORAGE_KEY, sanitizedCustomization);
    }

    return sanitizedCustomization;
  }

  static updateRewardPresentationCustomization(partialCustomization = {}) {
    const currentCustomization = this.getRewardPresentationCustomization();
    const mergedCustomization = {
      ...currentCustomization,
      ...partialCustomization
    };
    const cardStyles = this.getCardStyles();
    const logoAnimations = this.getLogoAnimations();
    const libraryVariants = this.getLibraryPresentationVariants();
    const homeLayouts = this.getHomeLayoutVariants();
    const recommendationPacks = this.getRecommendationPacks();
    const gamingLinksLayouts = this.getGamingLinksLayouts();
    const exportFilterCustomization = this.getExportFilterCustomization();
    const selectedExportFilter = mergedCustomization.selectedExportFilter || exportFilterCustomization.selectedPreset;
    const recapThemes = this.getRecapThemes();

    const sanitizedCustomization = {
      selectedCardStyle: getUnlockedRewardIdFromMeta(cardStyles, mergedCustomization.selectedCardStyle),
      selectedLogoAnimation: getUnlockedRewardIdFromMeta(logoAnimations, mergedCustomization.selectedLogoAnimation),
      selectedLibraryVariant: getUnlockedRewardIdFromMeta(libraryVariants, mergedCustomization.selectedLibraryVariant),
      selectedHomeLayout: getUnlockedRewardIdFromMeta(homeLayouts, mergedCustomization.selectedHomeLayout),
      selectedRecommendationPack: getUnlockedRewardIdFromMeta(recommendationPacks, mergedCustomization.selectedRecommendationPack),
      selectedGamingLinksFeatures: getUnlockedRewardIdFromMeta(this.getGamingLinksFeatures(), mergedCustomization.selectedGamingLinksFeatures),
      selectedGamingLinksLayout: getUnlockedRewardIdFromMeta(gamingLinksLayouts, mergedCustomization.selectedGamingLinksLayout),
      selectedExportFilter: getUnlockedRewardIdFromMeta(this.getExportFilters(), selectedExportFilter),
      selectedRecapTheme: getUnlockedRewardIdFromMeta(recapThemes, mergedCustomization.selectedRecapTheme),
      recapVisibleStats: sanitizeRecapVisibleStats(mergedCustomization.recapVisibleStats),
      useMostPlayedCover: mergedCustomization.useMostPlayedCover !== false,
      shareCardWatermark: sanitizeShareCardWatermark(mergedCustomization.shareCardWatermark)
    };

    StorageService.set(PRESENTATION_CUSTOMIZATION_STORAGE_KEY, sanitizedCustomization);
    dispatchPresentationCustomizationUpdated(sanitizedCustomization);
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

  static selectCardStyle(styleId) {
    const style = this.getCardStyles().find((reward) => reward.id === styleId);
    if (!style) {
      return { success: false, message: 'Card style not found.' };
    }
    if (!style.unlocked) {
      return { success: false, message: `${style.name} unlocks at ${style.requiredXP.toLocaleString()} XP.` };
    }

    return {
      success: true,
      message: `${style.name} equipped for Library cards.`,
      customization: this.updateRewardPresentationCustomization({ selectedCardStyle: styleId })
    };
  }

  static selectLogoAnimation(animationId) {
    const animation = this.getLogoAnimations().find((reward) => reward.id === animationId);
    if (!animation) {
      return { success: false, message: 'Logo animation not found.' };
    }
    if (!animation.unlocked) {
      return { success: false, message: `${animation.name} unlocks at ${animation.requiredXP.toLocaleString()} XP.` };
    }

    return {
      success: true,
      message: `${animation.name} equipped for Home.`,
      customization: this.updateRewardPresentationCustomization({ selectedLogoAnimation: animationId })
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
    if (!feature.unlocked) {
      return { success: false, message: `${feature.name} unlocks at ${feature.requiredXP.toLocaleString()} XP.` };
    }

    return {
      success: true,
      message: `${feature.name} enabled for Gaming Links.`,
      customization: this.updateRewardPresentationCustomization({ selectedGamingLinksFeatures: featureId })
    };
  }

  static selectGamingLinksLayout(layoutId) {
    const layout = this.getGamingLinksLayouts().find((reward) => reward.id === layoutId);
    if (!layout) {
      return { success: false, message: 'Gaming Links layout not found.' };
    }
    if (!layout.unlocked) {
      return { success: false, message: `${layout.name} unlocks at ${layout.requiredXP.toLocaleString()} XP.` };
    }

    return {
      success: true,
      message: `${layout.name} equipped for Gaming Links.`,
      customization: this.updateRewardPresentationCustomization({ selectedGamingLinksLayout: layoutId })
    };
  }

  static getProfileRewardCatalog() {
    return {
      xp: this.getTotalXP(),
      level: this.getLevel(),
      themes: this.getThemes(),
      themeTiers: this.getThemeTierProgression(),
      frames: this.getProfileFrames(),
      banners: this.getProfileBanners(),
      titles: this.getProfileTitles(),
      showcaseSlots: this.getShowcaseSlots(),
      customization: this.getProfileCustomization(),
      libraryVariants: this.getLibraryPresentationVariants(),
      homeLayouts: this.getHomeLayoutVariants(),
      recommendationPacks: this.getRecommendationPacks(),
      gamingLinks: this.getGamingLinksFeatures(),
      gamingLinksLayouts: this.getGamingLinksLayouts(),
      exportFilters: this.getExportFilters(),
      exportFilterCustomization: this.getExportFilterCustomization(),
      presentationCustomization: this.getRewardPresentationCustomization()
    };
  }

  static getRewardCatalogSummary() {
    const currentXP = this.getTotalXP();
    const themes = this.getUnlockableThemes();
    const frames = this.getProfileFrames();
    const banners = this.getProfileBanners();
    const titles = this.getProfileTitles();
    const showcaseSlots = this.getShowcaseSlots();
    const libraryVariants = this.getLibraryPresentationVariants();
    const homeLayouts = this.getHomeLayoutVariants();
    const recommendationPacks = this.getRecommendationPacks();
    const gamingLinks = this.getGamingLinksFeatures();
    const gamingLinksLayouts = this.getGamingLinksLayouts();
    const exportFilters = this.getExportFilters();
    const rewardPool = [
      ...themes.map((reward) => ({ ...reward, category: 'Theme' })),
      ...frames.map((reward) => ({ ...reward, category: 'Frame' })),
      ...banners.map((reward) => ({ ...reward, category: 'Banner' })),
      ...titles.map((reward) => ({ ...reward, category: 'Title' })),
      ...libraryVariants.map((reward) => ({ ...reward, category: 'Library Variant' })),
      ...homeLayouts.map((reward) => ({ ...reward, category: 'Home Layout' })),
      ...recommendationPacks.map((reward) => ({ ...reward, category: 'Recommendation Pack' })),
      ...gamingLinks.map((reward) => ({ ...reward, category: 'Gaming Links' })),
      ...gamingLinksLayouts.map((reward) => ({ ...reward, category: 'Gaming Links Layout' })),
      ...exportFilters.map((reward) => ({ ...reward, category: 'Export Filter' })),
      ...showcaseSlots.map((slot) => ({
        id: slot.id,
        name: `Showcase Slot ${slot.slotNumber}`,
        description: `Pin one more achievement on your profile.`,
        requiredXP: slot.requiredXP,
        unlocked: slot.unlocked,
        progressPercent: slot.progressPercent,
        category: 'Showcase Slot'
      }))
    ];

    const sortedUpcomingUnlocks = buildSequencedUnlockTrack(rewardPool, currentXP, 5);

    const nextUnlock = sortedUpcomingUnlocks[0] || null;

    return {
      xp: currentXP,
      level: this.getLevel(),
      unlockedCounts: {
        themes: themes.filter((reward) => reward.unlocked).length,
        frames: frames.filter((reward) => reward.unlocked).length,
        banners: banners.filter((reward) => reward.unlocked).length,
        titles: titles.filter((reward) => reward.unlocked).length,
        libraryVariants: libraryVariants.filter((reward) => reward.unlocked).length,
        homeLayouts: homeLayouts.filter((reward) => reward.unlocked).length,
        recommendationPacks: recommendationPacks.filter((reward) => reward.unlocked).length,
        gamingLinks: gamingLinks.filter((reward) => reward.unlocked).length,
        gamingLinksLayouts: gamingLinksLayouts.filter((reward) => reward.unlocked).length,
        exportFilters: exportFilters.filter((reward) => reward.unlocked).length
      },
      totalCounts: {
        themes: themes.length,
        frames: frames.length,
        banners: banners.length,
        titles: titles.length,
        libraryVariants: libraryVariants.length,
        homeLayouts: homeLayouts.length,
        recommendationPacks: recommendationPacks.length,
        gamingLinks: gamingLinks.length,
        gamingLinksLayouts: gamingLinksLayouts.length,
        exportFilters: exportFilters.length
      },
      progressionGroups: {
        themes: {
          unlocked: getUnlockedRewardCount(themes),
          total: themes.length
        },
        cosmetics: {
          unlocked: getUnlockedRewardCount(frames) + getUnlockedRewardCount(banners) + getUnlockedRewardCount(titles) + getUnlockedRewardCount(recommendationPacks) + getUnlockedRewardCount(gamingLinks) + getUnlockedRewardCount(gamingLinksLayouts),
          total: frames.length + banners.length + titles.length + recommendationPacks.length + gamingLinks.length + gamingLinksLayouts.length
        },
        utility: {
          unlocked: showcaseSlots.filter((slot) => slot.unlocked).length + getUnlockedRewardCount(libraryVariants) + getUnlockedRewardCount(homeLayouts) + getUnlockedRewardCount(exportFilters),
          total: showcaseSlots.length + libraryVariants.length + homeLayouts.length + exportFilters.length
        }
      },
      showcaseSlotsUnlocked: showcaseSlots.filter((slot) => slot.unlocked).length,
      showcaseSlotsTotal: showcaseSlots.length,
      unlockPathMode: 'sequenced',
      upcomingUnlocks: sortedUpcomingUnlocks,
      nextUnlock: nextUnlock
        ? {
            ...nextUnlock,
            remainingXP: Math.max(0, nextUnlock.requiredXP - currentXP),
            displayRemainingXP: Math.max(0, nextUnlock.requiredXP - currentXP),
            displayRequiredXP: nextUnlock.requiredXP,
            isNearlyUnlocked: Math.max(0, nextUnlock.requiredXP - currentXP) <= 25
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
      themes: this.getUnlockableThemes(),
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
        gamingLinksLayouts: this.getGamingLinksLayouts(),
        exportFilters: this.getExportFilters(),
        exportFilterCustomization: this.getExportFilterCustomization(),
        customization: this.getRewardPresentationCustomization()
      },
      summary,
      upcomingUnlocks: summary.upcomingUnlocks
    };
  }
}
