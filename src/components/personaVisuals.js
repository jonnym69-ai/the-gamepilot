// Emblem + accent color for each persona archetype and theme. The theme (the
// world the player inhabits — zombies, space, horror) wins over the behavioral
// archetype when both exist, because hybrid labels are named after the theme:
// "The Doomsday Prepper who replays everything" should look like the prepper.
import {
  Biohazard,
  Ghost,
  Flame,
  Cpu,
  Rocket,
  Swords,
  Crosshair,
  Repeat,
  Target,
  Sprout,
  Landmark,
  Car,
  Dumbbell,
  Building2,
  Map,
  Pickaxe,
  FastForward,
  Table,
  BookOpen,
  Coffee,
  Gem,
  Crown,
  Radio,
  FlaskConical,
  Trophy,
  Footprints,
  Users,
  Bug,
  Wrench,
  Timer,
  CalendarDays,
  Pizza,
  Gamepad2,
} from 'lucide-react';

const PERSONA_VISUALS = {
  // Themes — the dominant world, detected from tags/genres.
  doomsday_prepper: { icon: Biohazard, accent: '#a3e635' },
  horror_junkie: { icon: Ghost, accent: '#c084fc' },
  ashen_masochist: { icon: Flame, accent: '#f97316' },
  console_cowboy: { icon: Cpu, accent: '#e879f9' },
  starfarer: { icon: Rocket, accent: '#818cf8' },
  dungeon_delver: { icon: Swords, accent: '#fbbf24' },
  queue_warrior: { icon: Trophy, accent: '#fb7185' },
  run_addict: { icon: Repeat, accent: '#2dd4bf' },
  breacher: { icon: Target, accent: '#ef4444' },
  homesteader: { icon: Sprout, accent: '#4ade80' },
  armchair_general: { icon: Landmark, accent: '#f59e0b' },
  gearhead: { icon: Car, accent: '#fb923c' },
  club_athlete: { icon: Dumbbell, accent: '#34d399' },
  architect: { icon: Building2, accent: '#38bdf8' },
  cartographer: { icon: Map, accent: '#eab308' },
  // Behavioral archetypes.
  backlog_archaeologist: { icon: Pickaxe, accent: '#a8a29e' },
  credit_roll_dodger: { icon: FastForward, accent: '#94a3b8' },
  frame_data_masochist: { icon: Swords, accent: '#f43f5e' },
  spreadsheet_tactician: { icon: Table, accent: '#60a5fa' },
  story_diver: { icon: BookOpen, accent: '#c084fc' },
  comfort_replay_junkie: { icon: Repeat, accent: '#4ade80' },
  unwinder: { icon: Coffee, accent: '#84cc16' },
  indie_curator: { icon: Gem, accent: '#f0abfc' },
  franchise_loyalist: { icon: Crown, accent: '#fbbf24' },
  retro_futurist: { icon: Radio, accent: '#fb923c' },
  bleeding_edge: { icon: FlaskConical, accent: '#22d3ee' },
  completionist: { icon: Trophy, accent: '#eab308' },
  roamer: { icon: Footprints, accent: '#2dd4bf' },
  social_drop_in: { icon: Users, accent: '#38bdf8' },
  jank_enjoyer: { icon: Bug, accent: '#a3e635' },
  modder: { icon: Wrench, accent: '#f472b6' },
  speedrunner: { icon: Timer, accent: '#facc15' },
  multiplayer_mainliner: { icon: Crosshair, accent: '#ef4444' },
  weekend_warrior: { icon: CalendarDays, accent: '#818cf8' },
  lunch_break_gamer: { icon: Pizza, accent: '#fb923c' },
};

const FALLBACK_VISUAL = { icon: Gamepad2, accent: '#3dd9ff' };

export const getPersonaVisual = (themeId, archetypeId) =>
  PERSONA_VISUALS[themeId] || PERSONA_VISUALS[archetypeId] || FALLBACK_VISUAL;

// '#a3e635' -> '163, 230, 53' for use inside rgba() in CSS custom properties.
export const accentToRgb = (hex) => {
  const value = parseInt(String(hex).replace('#', ''), 16);
  if (!Number.isFinite(value)) return '61, 217, 255';
  return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
};

// Persona rarity — how decisive the verdict is. The archetype score (0-100)
// measures how strongly the player's data matches one archetype, so a
// blowout match reads as rarer than a coin-flip.
export const PERSONA_TIERS = {
  legendary: { label: 'Legendary', className: 'tier-legendary' },
  epic: { label: 'Epic', className: 'tier-epic' },
  rare: { label: 'Rare', className: 'tier-rare' },
  common: { label: 'Common', className: 'tier-common' },
};

export const getPersonaTier = (score) => {
  const s = Number(score);
  if (!Number.isFinite(s)) return 'common';
  if (s >= 75) return 'legendary';
  if (s >= 55) return 'epic';
  if (s >= 35) return 'rare';
  return 'common';
};
