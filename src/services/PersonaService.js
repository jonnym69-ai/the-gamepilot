/**
 * PersonaService - Pilot Persona bundles
 *
 * A persona is a coherent identity preset that equips multiple cosmetic rewards
 * at once (theme + frame + banner + title + recommendation pack + gaming links
 * layout). Locked components are skipped gracefully.
 *
 * Local-only: no network, no analytics. All state lives in the existing
 * ProgressionUnlockService + ThemeContext storage.
 */

import { ProgressionUnlockService } from './ProgressionUnlockService';

export const PILOT_PERSONAS = Object.freeze([
  {
    id: 'cyberpunk_pilot',
    name: 'Cyberpunk Pilot',
    description: 'Neon-soaked late-night sessions. For the night owls who chase the high-score glow.',
    accentColor: '#3dd9ff',
    secondaryColor: '#ff00ff',
    preview: 'linear-gradient(135deg, rgba(0, 212, 255, 0.32), rgba(155, 92, 255, 0.32))',
    equip: {
      theme: 'cyberpunk',
      frame: 'neon_circuit',
      banner: 'midnight_arcade',
      title: 'night_owl',
      recommendationPack: 'arcade_signal',
      gamingLinksLayout: 'arcade_cabinet'
    }
  },
  {
    id: 'cozy_explorer',
    name: 'Cozy Explorer',
    description: 'Slow afternoons, soft palettes, comfort backlogs. For long deliberate dives.',
    accentColor: '#10b981',
    secondaryColor: '#84cc16',
    preview: 'linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(132, 204, 22, 0.28))',
    equip: {
      theme: 'forest',
      frame: 'emerald_sentinel',
      banner: 'aurora_drift',
      title: 'library_ranger',
      recommendationPack: 'classic_glow',
      gamingLinksLayout: 'compact_list'
    }
  },
  {
    id: 'tactical_operator',
    name: 'Tactical Operator',
    description: 'Sharp lines, ranked focus, no-nonsense readouts. For competitive sessions.',
    accentColor: '#dc2626',
    secondaryColor: '#0f172a',
    preview: 'linear-gradient(135deg, rgba(220, 38, 38, 0.36), rgba(15, 23, 42, 0.5))',
    equip: {
      theme: 'tactical',
      frame: 'crimson_guard',
      banner: 'crimson_arena',
      title: 'session_strategist',
      recommendationPack: 'tactical_hud',
      gamingLinksLayout: 'magazine_mosaic'
    }
  },
  {
    id: 'retro_captain',
    name: 'Retro Captain',
    description: 'Pixel-art warmth and saturated nostalgia. For the patient classics curators.',
    accentColor: '#ff6b35',
    secondaryColor: '#ffd700',
    preview: 'linear-gradient(135deg, rgba(255, 107, 53, 0.32), rgba(255, 215, 0, 0.28))',
    equip: {
      theme: 'retro',
      frame: 'starter_halo',
      banner: 'pilot_sunset',
      title: 'retro_guardian',
      recommendationPack: 'classic_glow',
      gamingLinksLayout: 'classic_grid'
    }
  },
  {
    id: 'champion_pilot',
    name: 'Champion Pilot',
    description: 'Top-shelf prestige. Earned the lot, flexes with restraint. Late-game persona.',
    accentColor: '#f5b700',
    secondaryColor: '#ff8c42',
    preview: 'linear-gradient(135deg, rgba(245, 183, 0, 0.4), rgba(255, 140, 66, 0.3))',
    equip: {
      theme: 'sunset',
      frame: 'golden_aegis',
      banner: 'victory_wave',
      title: 'completionist',
      recommendationPack: 'victory_lights',
      gamingLinksLayout: 'showcase_hero'
    }
  }
]);

const isThemeUnlocked = (themeId) => {
  if (!themeId) return false;
  try {
    return ProgressionUnlockService.isThemeUnlocked(themeId);
  } catch {
    return false;
  }
};

const isCollectionItemUnlocked = (collection, id) => {
  if (!id) return false;
  return Array.isArray(collection) && collection.some((item) => item.id === id && item.unlocked);
};

export const PersonaService = {
  getPersonas() {
    const frames = ProgressionUnlockService.getProfileFrames();
    const banners = ProgressionUnlockService.getProfileBanners();
    const titles = ProgressionUnlockService.getProfileTitles();
    const recPacks = ProgressionUnlockService.getRecommendationPacks();
    const linkLayouts = ProgressionUnlockService.getGamingLinksLayouts();

    return PILOT_PERSONAS.map((persona) => {
      const checks = {
        theme: isThemeUnlocked(persona.equip.theme),
        frame: isCollectionItemUnlocked(frames, persona.equip.frame),
        banner: isCollectionItemUnlocked(banners, persona.equip.banner),
        title: isCollectionItemUnlocked(titles, persona.equip.title),
        recommendationPack: isCollectionItemUnlocked(recPacks, persona.equip.recommendationPack),
        gamingLinksLayout: isCollectionItemUnlocked(linkLayouts, persona.equip.gamingLinksLayout)
      };
      const totalParts = Object.keys(checks).length;
      const unlockedParts = Object.values(checks).filter(Boolean).length;
      return {
        ...persona,
        unlockedParts,
        totalParts,
        progressPercent: Math.round((unlockedParts / totalParts) * 100),
        fullyUnlocked: unlockedParts === totalParts,
        checks
      };
    });
  },

  /**
   * Apply a persona — equips every cosmetic component that the user has unlocked,
   * silently skips locked ones, returns a summary.
   */
  applyPersona(personaId) {
    const personas = this.getPersonas();
    const persona = personas.find((p) => p.id === personaId);
    if (!persona) {
      return { success: false, message: 'Persona not found.', applied: [], skipped: [] };
    }

    const applied = [];
    const skipped = [];

    // Theme — uses event so ThemeContext can update React state.
    if (persona.checks.theme) {
      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gamepilot:request-theme', {
            detail: { themeId: persona.equip.theme }
          }));
        }
        applied.push(`theme: ${persona.equip.theme}`);
      } catch {
        skipped.push(`theme: ${persona.equip.theme}`);
      }
    } else if (persona.equip.theme) {
      skipped.push(`theme: ${persona.equip.theme} (locked)`);
    }

    // Frame
    if (persona.checks.frame) {
      const result = ProgressionUnlockService.selectProfileFrame(persona.equip.frame);
      (result?.success ? applied : skipped).push(`frame: ${persona.equip.frame}`);
    } else if (persona.equip.frame) {
      skipped.push(`frame: ${persona.equip.frame} (locked)`);
    }

    // Banner
    if (persona.checks.banner) {
      const result = ProgressionUnlockService.selectProfileBanner(persona.equip.banner);
      (result?.success ? applied : skipped).push(`banner: ${persona.equip.banner}`);
    } else if (persona.equip.banner) {
      skipped.push(`banner: ${persona.equip.banner} (locked)`);
    }

    // Title
    if (persona.checks.title) {
      const result = ProgressionUnlockService.selectProfileTitle(persona.equip.title);
      (result?.success ? applied : skipped).push(`title: ${persona.equip.title}`);
    } else if (persona.equip.title) {
      skipped.push(`title: ${persona.equip.title} (locked)`);
    }

    // Recommendation Pack
    if (persona.checks.recommendationPack) {
      const result = ProgressionUnlockService.selectRecommendationPack(persona.equip.recommendationPack);
      (result?.success ? applied : skipped).push(`recommendation pack: ${persona.equip.recommendationPack}`);
    } else if (persona.equip.recommendationPack) {
      skipped.push(`recommendation pack: ${persona.equip.recommendationPack} (locked)`);
    }

    // Gaming Links Layout
    if (persona.checks.gamingLinksLayout) {
      const result = ProgressionUnlockService.selectGamingLinksLayout(persona.equip.gamingLinksLayout);
      (result?.success ? applied : skipped).push(`gaming links layout: ${persona.equip.gamingLinksLayout}`);
    } else if (persona.equip.gamingLinksLayout) {
      skipped.push(`gaming links layout: ${persona.equip.gamingLinksLayout} (locked)`);
    }

    return {
      success: applied.length > 0,
      personaId,
      personaName: persona.name,
      applied,
      skipped,
      message: applied.length === 0
        ? `${persona.name}: nothing applied (all components are locked).`
        : skipped.length === 0
          ? `${persona.name} fully equipped!`
          : `${persona.name} equipped (${applied.length}/${applied.length + skipped.length} parts — rest still locked).`
    };
  }
};

export default PersonaService;
