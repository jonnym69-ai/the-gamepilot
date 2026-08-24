// AchievementSystem.js - GamePilot Achievement and Analytics System
import { RollingAchievementsTracker } from './services/RollingAchievementsTracker';
import { StatsAggregationService } from './services/StatsAggregationService';
import { QuestHistoryService } from './services/QuestHistoryService';
import { PlaytimeAutoLogger } from './services/PlaytimeAutoLogger';
import { getDateKey } from './services/DateKeyService';
import StorageService from './services/StorageService';
import { HabitTrackerService } from './services/HabitTrackerService';
import { THEME_DEFINITIONS } from './services/GamingPersonaService';

// Achievement rarity system
export const ACHIEVEMENT_RARITY = {
  COMMON: { name: 'Common', color: '#808080', weight: 1 },
  RARE: { name: 'Rare', color: '#0066cc', weight: 2 },
  EPIC: { name: 'Epic', color: '#9933cc', weight: 3 },
  LEGENDARY: { name: 'Legendary', color: '#ff6600', weight: 4 }
};

// Achievement definitions
export const ACHIEVEMENTS = {
  library: [
    { id: 'first_game', name: 'First Steps', desc: 'Launch your first game with GamePilot', icon: '🎮', rarity: 'COMMON' },
    { id: 'collector_5', name: 'Small Shelf', desc: 'Have 5 games in your library', icon: '📚', rarity: 'COMMON' },
    { id: 'collector_10', name: 'Growing Library', desc: 'Have 10 games in your library', icon: '📦', rarity: 'COMMON' },
    { id: 'collector_25', name: 'Library Curator', desc: 'Have 25 games in your library', icon: '🏛️', rarity: 'RARE' },
    { id: 'collector_50', name: 'Collection Keeper', desc: 'Have 50 games in your library', icon: '🏆', rarity: 'RARE' },
    { id: 'collector_100', name: 'Century Collection', desc: 'Have 100 games in your library', icon: '💯', rarity: 'EPIC' },
    { id: 'collector_250', name: 'Grand Archive', desc: 'Have 250 games in your library', icon: '🎯', rarity: 'EPIC' },
    { id: 'collector_500', name: 'Vast Archive', desc: 'Have 500 games in your library', icon: '🎖️', rarity: 'LEGENDARY' },
    { id: 'variety_3', name: 'Genre Sampler', desc: 'Play 3 different genres', icon: '🌈', rarity: 'COMMON' },
    { id: 'variety_5', name: 'Genre Explorer', desc: 'Play 5 different genres', icon: '🎨', rarity: 'RARE' },
    { id: 'platform_diverse', name: 'Platform Diverse', desc: 'Use 3 different platforms', icon: '🔄', rarity: 'RARE' }
  ],
  time: [
    { id: 'hour_1', name: 'First Hour', desc: 'Play 1 hour total', icon: '⏱️', rarity: 'COMMON' },
    { id: 'hour_5', name: 'Five Hour Mark', desc: 'Play 5 hours total', icon: '☕', rarity: 'COMMON' },
    { id: 'hour_10', name: 'Ten Hour Mark', desc: 'Play 10 hours total', icon: '⚡', rarity: 'COMMON' },
    { id: 'hour_25', name: 'Time Explorer', desc: 'Play 25 hours total', icon: '⌚', rarity: 'RARE' },
    { id: 'hour_50', name: 'Time Enthusiast', desc: 'Play 50 hours total', icon: '🕰️', rarity: 'RARE' },
    { id: 'hour_100', name: 'Hundred Hours', desc: 'Play 100 hours total', icon: '💯', rarity: 'EPIC' },
    { id: 'hour_250', name: 'Seasoned Player', desc: 'Play 250 hours total', icon: '🎯', rarity: 'EPIC' },
    { id: 'hour_500', name: 'Playtime Veteran', desc: 'Play 500 hours total', icon: '🎖️', rarity: 'LEGENDARY' },
    { id: 'session_1', name: 'First Session', desc: 'Complete 1 gaming session', icon: '🎮', rarity: 'COMMON' },
    { id: 'session_5', name: 'Session Starter', desc: 'Complete 5 gaming sessions', icon: '🎲', rarity: 'COMMON' },
    { id: 'session_10', name: 'Session Regular', desc: 'Complete 10 gaming sessions', icon: '🗓️', rarity: 'COMMON' },
    { id: 'session_25', name: 'Session Explorer', desc: 'Complete 25 gaming sessions', icon: '📅', rarity: 'RARE' },
    { id: 'session_50', name: 'Session Enthusiast', desc: 'Complete 50 gaming sessions', icon: '📈', rarity: 'RARE' },
    { id: 'session_100', name: 'Session Century', desc: 'Complete 100 gaming sessions', icon: '📊', rarity: 'EPIC' },
    { id: 'session_250', name: 'Session Veteran', desc: 'Complete 250 gaming sessions', icon: '🏅', rarity: 'EPIC' },
    { id: 'session_500', name: 'Session Specialist', desc: 'Complete 500 gaming sessions', icon: '🏆', rarity: 'LEGENDARY' }
  ],
  mood: [
    { id: 'relaxed_5', name: 'Easygoing', desc: 'Play 5 Relaxed sessions', icon: '😌', rarity: 'COMMON' },
    { id: 'relaxed_25', name: 'Calm Routine', desc: 'Play 25 Relaxed sessions', icon: '🧘', rarity: 'RARE' },
    { id: 'social_5', name: 'Good Company', desc: 'Play 5 Social sessions', icon: '🦋', rarity: 'COMMON' },
    { id: 'social_25', name: 'Social Circle', desc: 'Play 25 Social sessions', icon: '🤝', rarity: 'RARE' },
    { id: 'creative_5', name: 'Creative Spark', desc: 'Play 5 Creative sessions', icon: '🎨', rarity: 'COMMON' },
    { id: 'creative_25', name: 'Creative Current', desc: 'Play 25 Creative sessions', icon: '💡', rarity: 'RARE' },
    { id: 'focused_5', name: 'Finding Focus', desc: 'Play 5 Focused sessions', icon: '🎯', rarity: 'COMMON' },
    { id: 'focused_25', name: 'Deep Focus', desc: 'Play 25 Focused sessions', icon: '🏹', rarity: 'RARE' },
    { id: 'competitive_5', name: 'Friendly Rival', desc: 'Play 5 Competitive sessions', icon: '⚔️', rarity: 'COMMON' },
    { id: 'competitive_25', name: 'Seasoned Competitor', desc: 'Play 25 Competitive sessions', icon: '🥇', rarity: 'RARE' },
    { id: 'mood_explorer', name: 'Mood Explorer', desc: 'Play at least one session across all 5 moods', icon: '🎭', rarity: 'RARE' }
  ],
  features: [
    { id: 'perfect_play_1', name: 'Perfect Start', desc: 'Launch your first Perfect Play pick', icon: '✨', rarity: 'COMMON' },
    { id: 'perfect_play_5', name: 'Perfect Picks', desc: 'Launch 5 Perfect Play picks', icon: '⭐', rarity: 'RARE' },
    { id: 'surprise_1', name: 'First Surprise', desc: 'Launch your first Surprise Me pick', icon: '🎁', rarity: 'COMMON' },
    { id: 'surprise_5', name: 'Surprise Seeker', desc: 'Launch 5 Surprise Me picks', icon: '🎲', rarity: 'RARE' },
    { id: 'rediscover_1', name: 'Memory Lane', desc: 'Launch your first Rediscover pick', icon: '🔮', rarity: 'COMMON' },
    { id: 'rediscover_5', name: 'Backlog Revival', desc: 'Launch 5 Rediscover picks', icon: '📜', rarity: 'RARE' }
  ],
  quests: [
    { id: 'quest_total_1', name: 'Quest Initiate', desc: 'Complete your first rotating quest', icon: '🧭', rarity: 'COMMON' },
    { id: 'quest_total_10', name: 'Quest Runner', desc: 'Complete 10 rotating quests', icon: '🗺️', rarity: 'RARE' },
    { id: 'quest_total_25', name: 'Quest Specialist', desc: 'Complete 25 rotating quests', icon: '🚩', rarity: 'EPIC' }
  ],
  uniqueGames: [
    { id: 'unique_game_1', name: 'Fresh Start', desc: 'Play 1 unique game', icon: '🆕', rarity: 'COMMON' },
    { id: 'unique_game_3', name: 'New Experiences', desc: 'Play 3 unique games', icon: '🕹️', rarity: 'COMMON' },
    { id: 'unique_game_5', name: 'Game Explorer', desc: 'Play 5 unique games', icon: '🧭', rarity: 'COMMON' },
    { id: 'unique_game_10', name: 'Diverse Player', desc: 'Play 10 unique games', icon: '🌈', rarity: 'RARE' },
    { id: 'unique_game_25', name: 'Library Voyager', desc: 'Play 25 unique games', icon: '🚀', rarity: 'RARE' },
    { id: 'unique_game_50', name: 'Wide Horizons', desc: 'Play 50 unique games', icon: '🛸', rarity: 'EPIC' },
    { id: 'unique_game_100', name: 'Century Explorer', desc: 'Play 100 unique games', icon: '💯', rarity: 'LEGENDARY' }
  ],
  genres: [
    { id: 'genre_sessions_5', name: 'Genre Regular', desc: 'Play 5 sessions in any one genre', icon: '🎨', rarity: 'COMMON' },
    { id: 'genre_sessions_15', name: 'Genre Enthusiast', desc: 'Play 15 sessions in any one genre', icon: '🎵', rarity: 'RARE' },
    { id: 'genre_sessions_30', name: 'Genre Specialist', desc: 'Play 30 sessions in any one genre', icon: '🏅', rarity: 'EPIC' }
  ],
  sessions: [
    { id: 'session_warrior_30', name: 'Half-Hour Session', desc: 'Complete a 30-minute gaming session', icon: '⏱️', rarity: 'COMMON' },
    { id: 'session_warrior_1h', name: 'Full-Hour Session', desc: 'Complete a 1-hour gaming session', icon: '⏰', rarity: 'COMMON' },
    { id: 'session_warrior_2h', name: 'Two-Hour Session', desc: 'Complete a 2-hour gaming session', icon: '🎮', rarity: 'RARE' },
    { id: 'session_warrior_4h', name: 'Four-Hour Session', desc: 'Complete a 4-hour gaming session', icon: '⌛', rarity: 'EPIC' }
  ],
  engagement: [
    { id: 'rating_1', name: 'First Impression', desc: 'Rate your first game', icon: '⭐', rarity: 'COMMON' },
    { id: 'rating_5', name: 'Opinion Sharer', desc: 'Rate 5 games', icon: '📝', rarity: 'COMMON' },
    { id: 'rating_15', name: 'Library Reviewer', desc: 'Rate 15 games', icon: '📋', rarity: 'RARE' },
    { id: 'completion_1', name: 'First Finish', desc: 'Mark your first game Beaten, Completed, or 100%', icon: '✅', rarity: 'COMMON' },
    { id: 'completion_5', name: 'Finish Line Five', desc: 'Mark 5 games Beaten, Completed, or 100%', icon: '🏁', rarity: 'RARE' },
    { id: 'completion_10', name: 'Ten Titles Finished', desc: 'Mark 10 games Beaten, Completed, or 100%', icon: '🏆', rarity: 'EPIC' }
  ],
  daily: [
    { id: 'daily_15min', name: 'Daily Fifteen', desc: 'Play 15 minutes in one day', icon: '⏰', rarity: 'COMMON' },
    { id: 'daily_30min', name: 'Daily Half Hour', desc: 'Play 30 minutes in one day', icon: '⌚', rarity: 'COMMON' },
    { id: 'daily_1hour', name: 'Daily Hour', desc: 'Play 1 hour in one day', icon: '🕐', rarity: 'COMMON' },
    { id: 'daily_2hours', name: 'Daily Two Hours', desc: 'Play 2 hours in one day', icon: '🕑', rarity: 'RARE' },
    { id: 'daily_2sessions', name: 'Daily Double', desc: 'Complete 2 sessions in one day', icon: '🎮', rarity: 'COMMON' },
    { id: 'daily_2games', name: 'Daily Game Pair', desc: 'Play 2 games in one day', icon: '🕹️', rarity: 'COMMON' },
    { id: 'daily_2genres', name: 'Daily Genre Pair', desc: 'Play 2 genres in one day', icon: '🎨', rarity: 'COMMON' },
    { id: 'daily_2moods', name: 'Daily Mood Pair', desc: 'Play sessions in 2 moods in one day', icon: '🎭', rarity: 'COMMON' }
  ],
  weekly: [
    { id: 'weekly_2hours', name: 'Weekly Two Hours', desc: 'Play 2 hours in one week', icon: '📆', rarity: 'COMMON' },
    { id: 'weekly_5hours', name: 'Weekly Five Hours', desc: 'Play 5 hours in one week', icon: '🗓️', rarity: 'COMMON' },
    { id: 'weekly_10hours', name: 'Weekly Ten Hours', desc: 'Play 10 hours in one week', icon: '⌚', rarity: 'RARE' },
    { id: 'weekly_20hours', name: 'Weekly Twenty Hours', desc: 'Play 20 hours in one week', icon: '⏳', rarity: 'EPIC' },
    { id: 'weekly_3sessions', name: 'Weekly Session Trio', desc: 'Complete 3 sessions in one week', icon: '🎮', rarity: 'COMMON' },
    { id: 'weekly_7sessions', name: 'Weekly Seven Sessions', desc: 'Complete 7 sessions in one week', icon: '📅', rarity: 'RARE' },
    { id: 'weekly_3games', name: 'Weekly Game Trio', desc: 'Play 3 games in one week', icon: '🕹️', rarity: 'COMMON' },
    { id: 'weekly_5games', name: 'Weekly Five Games', desc: 'Play 5 games in one week', icon: '🧭', rarity: 'RARE' },
    { id: 'weekly_3genres', name: 'Weekly Genre Trio', desc: 'Play 3 genres in one week', icon: '🎨', rarity: 'COMMON' },
    { id: 'weekly_3moods', name: 'Weekly Mood Trio', desc: 'Play sessions in 3 moods in one week', icon: '🎭', rarity: 'COMMON' },
    { id: 'weekly_3days', name: 'Weekly Three Days', desc: 'Be active on 3 days in one week', icon: '📌', rarity: 'COMMON' },
    { id: 'weekly_5days', name: 'Weekly Five Days', desc: 'Be active on 5 days in one week', icon: '🔥', rarity: 'RARE' }
  ],
  monthly: [
    { id: 'monthly_10hours', name: 'Monthly Ten Hours', desc: 'Play 10 hours in one month', icon: '📆', rarity: 'COMMON' },
    { id: 'monthly_25hours', name: 'Monthly Twenty-Five Hours', desc: 'Play 25 hours in one month', icon: '🗓️', rarity: 'COMMON' },
    { id: 'monthly_50hours', name: 'Monthly Fifty Hours', desc: 'Play 50 hours in one month', icon: '⌚', rarity: 'RARE' },
    { id: 'monthly_100hours', name: 'Monthly Hundred Hours', desc: 'Play 100 hours in one month', icon: '⏳', rarity: 'EPIC' },
    { id: 'monthly_10sessions', name: 'Monthly Ten Sessions', desc: 'Complete 10 sessions in one month', icon: '🎮', rarity: 'COMMON' },
    { id: 'monthly_25sessions', name: 'Monthly Twenty-Five Sessions', desc: 'Complete 25 sessions in one month', icon: '📅', rarity: 'RARE' },
    { id: 'monthly_5days', name: 'Monthly Five Days', desc: 'Be active on 5 days in one month', icon: '📌', rarity: 'COMMON' },
    { id: 'monthly_10days', name: 'Monthly Ten Days', desc: 'Be active on 10 days in one month', icon: '🔥', rarity: 'RARE' },
    { id: 'monthly_20days', name: 'Monthly Twenty Days', desc: 'Be active on 20 days in one month', icon: '📈', rarity: 'EPIC' },
    { id: 'monthly_5genres', name: 'Monthly Five Genres', desc: 'Play 5 genres in one month', icon: '🎨', rarity: 'COMMON' },
    { id: 'monthly_10genres', name: 'Monthly Ten Genres', desc: 'Play 10 genres in one month', icon: '🌈', rarity: 'RARE' },
    { id: 'monthly_all_moods', name: 'Monthly Mood Tour', desc: 'Play sessions across all 5 moods in one month', icon: '🎭', rarity: 'EPIC' }
  ],
  yearly: [
    { id: 'yearly_50hours', name: 'Yearly Fifty Hours', desc: 'Play 50 hours in one year', icon: '🎊', rarity: 'COMMON' },
    { id: 'yearly_100hours', name: 'Yearly Hundred Hours', desc: 'Play 100 hours in one year', icon: '📆', rarity: 'COMMON' },
    { id: 'yearly_250hours', name: 'Yearly Two-Fifty', desc: 'Play 250 hours in one year', icon: '⌚', rarity: 'RARE' },
    { id: 'yearly_500hours', name: 'Yearly Five Hundred', desc: 'Play 500 hours in one year', icon: '⏳', rarity: 'EPIC' },
    { id: 'yearly_1000hours', name: 'Yearly Thousand Hours', desc: 'Play 1000 hours in one year', icon: '🏅', rarity: 'LEGENDARY' },
    { id: 'yearly_50sessions', name: 'Yearly Fifty Sessions', desc: 'Complete 50 sessions in one year', icon: '🎮', rarity: 'COMMON' },
    { id: 'yearly_100sessions', name: 'Yearly Hundred Sessions', desc: 'Complete 100 sessions in one year', icon: '📅', rarity: 'RARE' },
    { id: 'yearly_200sessions', name: 'Yearly Two Hundred Sessions', desc: 'Complete 200 sessions in one year', icon: '📊', rarity: 'EPIC' },
    { id: 'yearly_25days', name: 'Yearly Twenty-Five Days', desc: 'Be active on 25 days in one year', icon: '📌', rarity: 'COMMON' },
    { id: 'yearly_50days', name: 'Yearly Fifty Days', desc: 'Be active on 50 days in one year', icon: '🗓️', rarity: 'RARE' },
    { id: 'yearly_100days', name: 'Yearly Hundred Days', desc: 'Be active on 100 days in one year', icon: '📈', rarity: 'EPIC' },
    { id: 'yearly_200days', name: 'Yearly Two Hundred Days', desc: 'Be active on 200 days in one year', icon: '🏆', rarity: 'LEGENDARY' },
    { id: 'yearly_10genres', name: 'Yearly Ten Genres', desc: 'Play 10 genres in one year', icon: '🎨', rarity: 'RARE' },
    { id: 'yearly_15genres', name: 'Yearly Fifteen Genres', desc: 'Play 15 genres in one year', icon: '🌈', rarity: 'EPIC' },
    { id: 'yearly_all_moods', name: 'Yearly Mood Tour', desc: 'Play sessions across all 5 moods in one year', icon: '🎭', rarity: 'EPIC' }
  ],
  themes: [
    { id: 'theme_horror_3', name: 'Horror Initiate', desc: 'Play 3 different horror games', icon: '👻', rarity: 'COMMON' },
    { id: 'theme_horror_5', name: 'Horror Regular', desc: 'Play 5 different horror games', icon: '🔪', rarity: 'RARE' },
    { id: 'theme_horror_10', name: 'Horror Connoisseur', desc: 'Play 10 different horror games', icon: '💀', rarity: 'EPIC' },
    { id: 'theme_survival_3', name: 'Survival Instinct', desc: 'Play 3 different survival games', icon: '🏕️', rarity: 'COMMON' },
    { id: 'theme_survival_5', name: 'Survivalist', desc: 'Play 5 different survival games', icon: '🔥', rarity: 'RARE' },
    { id: 'theme_survival_10', name: 'Apocalypse Ready', desc: 'Play 10 different survival games', icon: '🪓', rarity: 'EPIC' },
    { id: 'theme_space_3', name: 'Space Cadet', desc: 'Play 3 different space or sci-fi games', icon: '🚀', rarity: 'COMMON' },
    { id: 'theme_space_5', name: 'Star Voyager', desc: 'Play 5 different space or sci-fi games', icon: '🛸', rarity: 'RARE' },
    { id: 'theme_space_10', name: 'Galaxy Explorer', desc: 'Play 10 different space or sci-fi games', icon: '🌌', rarity: 'EPIC' },
    { id: 'theme_fantasy_3', name: 'Fantasy Novice', desc: 'Play 3 different fantasy games', icon: '⚔️', rarity: 'COMMON' },
    { id: 'theme_fantasy_5', name: 'Fantasy Adventurer', desc: 'Play 5 different fantasy games', icon: '🐉', rarity: 'RARE' },
    { id: 'theme_fantasy_10', name: 'Fantasy Legend', desc: 'Play 10 different fantasy games', icon: '🏰', rarity: 'EPIC' },
    { id: 'theme_cyberpunk_3', name: 'Neon Rookie', desc: 'Play 3 different cyberpunk or dystopian games', icon: '🌃', rarity: 'COMMON' },
    { id: 'theme_cyberpunk_5', name: 'Neon Native', desc: 'Play 5 different cyberpunk or dystopian games', icon: '🦾', rarity: 'RARE' },
    { id: 'theme_cyberpunk_10', name: 'Chrome Legend', desc: 'Play 10 different cyberpunk or dystopian games', icon: '💡', rarity: 'EPIC' },
    { id: 'theme_cozy_3', name: 'Cozy Starter', desc: 'Play 3 different cozy or farming games', icon: '🌱', rarity: 'COMMON' },
    { id: 'theme_cozy_5', name: 'Cozy Comfort', desc: 'Play 5 different cozy or farming games', icon: '🏡', rarity: 'RARE' },
    { id: 'theme_cozy_10', name: 'Cozy Master', desc: 'Play 10 different cozy or farming games', icon: '🌻', rarity: 'EPIC' }
  ],
  backlog: [
    { id: 'dust_off_1', name: 'Dust Off', desc: 'Play a game you hadn\'t touched in 6 months', icon: '🧹', rarity: 'COMMON' },
    { id: 'dust_off_5', name: 'Serial Dust Off', desc: 'Play 5 games you hadn\'t touched in 6 months', icon: '📐', rarity: 'RARE' },
    { id: 'shelf_diver_1', name: 'Shelf Diver', desc: 'Play a game that\'s been in your library for 1+ year', icon: '📦', rarity: 'COMMON' },
    { id: 'shelf_diver_5', name: 'Deep Shelf Diver', desc: 'Play 5 games that have been in your library for 1+ year', icon: '🗂️', rarity: 'RARE' },
    { id: 'finish_started_1', name: 'Finish What You Started', desc: 'Complete a game you had previously played but not finished', icon: '✅', rarity: 'COMMON' },
    { id: 'finish_started_5', name: 'Comeback Season', desc: 'Complete 5 games you had previously played but not finished', icon: '🏅', rarity: 'EPIC' }
  ]
};

export const MOOD_SLUGS = ['relaxed', 'social', 'creative', 'focused', 'competitive'];

export const GENRE_SLUGS = [
  'action', 'adventure', 'rpg', 'indie', 'puzzle', 'simulation', 'strategy', 'shooter',
  'racing', 'platformer', 'horror', 'fighting', 'sports', 'roguelike', 'management', 'survival'
];
export const FEATURE_SLUGS = Array.from(new Set((ACHIEVEMENTS.features || [])
  .map(({ id }) => id.split('_'))
  .filter(parts => parts.length > 1 && !Number.isNaN(parseInt(parts[parts.length - 1], 10)))
  .map(parts => parts.slice(0, parts.length - 1).join('_'))));

export const slugify = (value) => {
  if (!value) return '';
  return value.toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
};

const createThresholdMap = (definitions, allowedSlugs = null) => {
  const map = {};
  definitions.forEach(({ id }) => {
    if (!id) return;
    const parts = id.split('_');
    const threshold = parseInt(parts[parts.length - 1], 10);
    if (Number.isNaN(threshold)) {
      return;
    }
    const slug = parts.slice(0, parts.length - 1).join('_');
    if (allowedSlugs && !allowedSlugs.includes(slug)) {
      return;
    }
    if (!map[slug]) {
      map[slug] = [];
    }
    map[slug].push({ id, threshold });
  });

  Object.values(map).forEach(list => list.sort((a, b) => a.threshold - b.threshold));
  return map;
};

const SESSION_ACHIEVEMENTS = ACHIEVEMENTS.time.filter(({ id }) => id.startsWith('session_'));
const HOUR_ACHIEVEMENTS = ACHIEVEMENTS.time.filter(({ id }) => id.startsWith('hour_'));
const PERIOD_KEYS = ['daily', 'weekly', 'monthly', 'yearly'];
const SUPPORT_TIER_MULTIPLIERS = Object.freeze({
  Bronze: 2,
  Silver: 3,
  Gold: 4,
  Platinum: 5
});

const normalizeSupportTier = (tier) => {
  const normalized = String(tier || '').trim().toLowerCase();
  if (normalized === 'bronze') return 'Bronze';
  if (normalized === 'silver') return 'Silver';
  if (normalized === 'gold') return 'Gold';
  if (normalized === 'platinum') return 'Platinum';
  return null;
};

const formatXPBoostMultiplier = (multiplier) => {
  const numeric = Number(multiplier);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return '1x';
  }
  return `${numeric}x`;
};

const buildTierBoostMeta = (tier, labelPrefix = 'Supporter') => {
  const normalizedTier = normalizeSupportTier(tier);
  if (!normalizedTier) {
    return null;
  }

  return {
    multiplier: SUPPORT_TIER_MULTIPLIERS[normalizedTier],
    tier: normalizedTier,
    label: `${normalizedTier} ${labelPrefix} XP Boost`
  };
};

const resolveStoredBoostMeta = (profile = {}) => {
  const normalizedCode = typeof profile.code === 'string' ? profile.code.toUpperCase().trim() : '';

  if (normalizedCode) {
    if (profile.isMonthly && MONTHLY_XP_BOOST_CODES[normalizedCode]) {
      return MONTHLY_XP_BOOST_CODES[normalizedCode];
    }
    if (PATREON_XP_BOOST_CODES[normalizedCode]) {
      return PATREON_XP_BOOST_CODES[normalizedCode];
    }
    if (MONTHLY_XP_BOOST_CODES[normalizedCode]) {
      return MONTHLY_XP_BOOST_CODES[normalizedCode];
    }
  }

  return buildTierBoostMeta(profile.tier, profile.isMonthly ? 'Monthly' : 'Supporter');
};

const parseTimestamp = (value) => {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getBoostEligibleXP = (activatedAt, achievementPoints) => {
  const activationTimestamp = parseTimestamp(activatedAt);
  if (!activationTimestamp) {
    return 0;
  }

  const achievementXP = AchievementTracker.getAchievementUnlockHistory()
    .filter((entry) => parseTimestamp(entry?.unlockedAt) >= activationTimestamp)
    .reduce((sum, entry) => {
      const explicitXP = Number(entry?.xp);
      if (Number.isFinite(explicitXP) && explicitXP >= 0) {
        return sum + explicitXP;
      }
      return sum + Number(achievementPoints?.[entry?.id] || 0);
    }, 0);

  const playtimeXP = PlaytimeAutoLogger.getSessionHistory()
    .filter((session) => parseTimestamp(session?.timestamp || session?.endTime || session?.date) >= activationTimestamp)
    .reduce((sum, session) => sum + Math.max(0, Math.round(Number(session?.playtimeMinutes) || 0)), 0);

  return achievementXP + playtimeXP;
};

const PATREON_XP_BOOST_CODES = Object.freeze({
  THEME3_2026: {
    ...buildTierBoostMeta('Bronze')
  },
  THEME5_2026: {
    ...buildTierBoostMeta('Silver')
  },
  THEME8_2026: {
    ...buildTierBoostMeta('Gold')
  },
  THEME10_2026: {
    ...buildTierBoostMeta('Platinum')
  },
  'PATREON-2024-FOUNDERS': {
    ...buildTierBoostMeta('Bronze', 'Founder')
  },
  'GAMEPILOT-SUPPORTER-2024': {
    ...buildTierBoostMeta('Bronze', 'Founder')
  },
  'FOUNDER-PACK-2024': {
    ...buildTierBoostMeta('Silver', 'Founder')
  },
  'EARLY-ADOPTER-2024': {
    ...buildTierBoostMeta('Silver', 'Early Adopter')
  },
  'SUPPORTER-2025': {
    ...buildTierBoostMeta('Silver')
  },
  'FOUNDER-2025': {
    ...buildTierBoostMeta('Gold', 'Founder')
  },
  'PATREON-SUPPORTER': {
    ...buildTierBoostMeta('Silver')
  }
});

// Monthly XP boost codes for each tier
const MONTHLY_XP_BOOST_CODES = Object.freeze({
  // Bronze tier monthly codes (2x boost)
  'BRONZE-MAR-2026': {
    ...buildTierBoostMeta('Bronze', 'Monthly'),
    label: 'Bronze Monthly XP Boost - March 2026',
    expiry: '2026-03-31'
  },
  'BRONZE-APR-2026': {
    ...buildTierBoostMeta('Bronze', 'Monthly'),
    label: 'Bronze Monthly XP Boost - April 2026',
    expiry: '2026-04-30'
  },
  'BRONZE-MAY-2026': {
    ...buildTierBoostMeta('Bronze', 'Monthly'),
    label: 'Bronze Monthly XP Boost - May 2026',
    expiry: '2026-05-31'
  },
  'BRONZE-JUN-2026': {
    ...buildTierBoostMeta('Bronze', 'Monthly'),
    label: 'Bronze Monthly XP Boost - June 2026',
    expiry: '2026-06-30'
  },
  
  // Silver tier monthly codes (3x boost)
  'SILVER-MAR-2026': {
    ...buildTierBoostMeta('Silver', 'Monthly'),
    label: 'Silver Monthly XP Boost - March 2026',
    expiry: '2026-03-31'
  },
  'SILVER-APR-2026': {
    ...buildTierBoostMeta('Silver', 'Monthly'),
    label: 'Silver Monthly XP Boost - April 2026',
    expiry: '2026-04-30'
  },
  'SILVER-MAY-2026': {
    ...buildTierBoostMeta('Silver', 'Monthly'),
    label: 'Silver Monthly XP Boost - May 2026',
    expiry: '2026-05-31'
  },
  'SILVER-JUN-2026': {
    ...buildTierBoostMeta('Silver', 'Monthly'),
    label: 'Silver Monthly XP Boost - June 2026',
    expiry: '2026-06-30'
  },
  
  // Gold tier monthly codes (4x boost)
  'GOLD-MAR-2026': {
    ...buildTierBoostMeta('Gold', 'Monthly'),
    label: 'Gold Monthly XP Boost - March 2026',
    expiry: '2026-03-31'
  },
  'GOLD-APR-2026': {
    ...buildTierBoostMeta('Gold', 'Monthly'),
    label: 'Gold Monthly XP Boost - April 2026',
    expiry: '2026-04-30'
  },
  'GOLD-MAY-2026': {
    ...buildTierBoostMeta('Gold', 'Monthly'),
    label: 'Gold Monthly XP Boost - May 2026',
    expiry: '2026-05-31'
  },
  'GOLD-JUN-2026': {
    ...buildTierBoostMeta('Gold', 'Monthly'),
    label: 'Gold Monthly XP Boost - June 2026',
    expiry: '2026-06-30'
  },
  
  // Platinum tier monthly codes (5x boost)
  'PLATINUM-MAR-2026': {
    ...buildTierBoostMeta('Platinum', 'Monthly'),
    label: 'Platinum Monthly XP Boost - March 2026',
    expiry: '2026-03-31'
  },
  'PLATINUM-APR-2026': {
    ...buildTierBoostMeta('Platinum', 'Monthly'),
    label: 'Platinum Monthly XP Boost - April 2026',
    expiry: '2026-04-30'
  },
  'PLATINUM-MAY-2026': {
    ...buildTierBoostMeta('Platinum', 'Monthly'),
    label: 'Platinum Monthly XP Boost - May 2026',
    expiry: '2026-05-31'
  },
  'PLATINUM-JUN-2026': {
    ...buildTierBoostMeta('Platinum', 'Monthly'),
    label: 'Platinum Monthly XP Boost - June 2026',
    expiry: '2026-06-30'
  }
});

const TIME_ASSIGNMENT_DEFAULT_COUNTS = {
  daily: 5,
  weekly: 4,
  monthly: 4,
  yearly: 3
};

export const MOOD_THRESHOLD_MAP = createThresholdMap(ACHIEVEMENTS.mood, MOOD_SLUGS);
export const GENRE_THRESHOLD_MAP = createThresholdMap(ACHIEVEMENTS.genres, ['genre_sessions']);
export const FEATURE_THRESHOLD_MAP = createThresholdMap(ACHIEVEMENTS.features);
export const SESSION_THRESHOLD_MAP = createThresholdMap(SESSION_ACHIEVEMENTS, ['session']);
export const PLAYTIME_THRESHOLD_MAP = createThresholdMap(HOUR_ACHIEVEMENTS, ['hour']);
export const UNIQUE_GAME_THRESHOLD_MAP = createThresholdMap(ACHIEVEMENTS.uniqueGames, ['unique_game']);
export const COLLECTOR_THRESHOLD_MAP = createThresholdMap(ACHIEVEMENTS.library, ['collector']);
export const QUEST_THRESHOLD_MAP = createThresholdMap(ACHIEVEMENTS.quests, ['quest_total']);
export const ENGAGEMENT_THRESHOLD_MAP = createThresholdMap(ACHIEVEMENTS.engagement, ['rating', 'completion']);

// Maps achievement theme slugs to GamingPersonaService THEME_DEFINITIONS ids.
export const THEME_ACHIEVEMENT_MAP = {
  horror: 'horror_junkie',
  survival: 'doomsday_prepper',
  space: 'starfarer',
  fantasy: 'dungeon_delver',
  cyberpunk: 'console_cowboy',
  cozy: 'homesteader'
};

export const THEME_THRESHOLD_MAP = createThresholdMap(ACHIEVEMENTS.themes);
export const BACKLOG_THRESHOLD_MAP = createThresholdMap(ACHIEVEMENTS.backlog, ['dust_off', 'shelf_diver', 'finish_started']);

export const ROLLING_FEATURE_KEY_MAP = {
  perfect_play: 'perfectPlay',
  surprise: 'surpriseMe',
  rediscover: 'rediscover',
  continue_playing: 'continuePlaying',
  share: 'share'
};

export const MOOD_VARIETY_TARGETS = [];

const ALL_ACHIEVEMENT_DEFINITIONS = Object.entries(ACHIEVEMENTS).flatMap(([category, defs]) =>
  defs.map(def => ({ ...def, category }))
);

export const TOTAL_ACHIEVEMENT_COUNT = ALL_ACHIEVEMENT_DEFINITIONS.length;


export const normalizeMood = (value) => {
  const slug = slugify(value);
  if (!slug) return null;
  if (slug === 'adventurous') return 'creative';
  if (slug === 'adventure') return 'creative';
  return MOOD_SLUGS.includes(slug) ? slug : null;
};

export const normalizeGenre = (value) => {
  const slug = slugify(value);
  return slug || null;
};

const normalizeFeature = (value) => {
  const slug = slugify(value);
  if (!slug) return null;
  if (FEATURE_SLUGS.includes(slug)) {
    return slug;
  }
  if (slug === 'continue') return 'continue_playing';
  if (slug === 'continueplaying') return 'continue_playing';
  return FEATURE_SLUGS.includes(slug.replace(/_/g, '')) ? slug.replace(/_/g, '') : null;
};

const AchievementStats = {
  getCompletionRate(unlockedIds = null) {
    const currentIds = new Set(ALL_ACHIEVEMENT_DEFINITIONS.map(({ id }) => id));
    const storedIds = Array.isArray(unlockedIds) ? unlockedIds : AchievementTracker.getUnlockedAchievements();
    const unlockedCount = new Set(storedIds.filter(id => currentIds.has(id))).size;
    return {
      unlocked: unlockedCount,
      total: TOTAL_ACHIEVEMENT_COUNT,
      completion: TOTAL_ACHIEVEMENT_COUNT > 0 ? (unlockedCount / TOTAL_ACHIEVEMENT_COUNT) * 100 : 0
    };
  }
};

// Achievement tracking and validation functions

// Achievement tracking functions
export class AchievementTracker {
  static getUnlockedAchievements() {
    return StorageService.get('unlockedAchievements', []);
  }

  static unlockAchievement(achievementId) {
    const unlocked = this.getUnlockedAchievements();
    if (!unlocked.includes(achievementId)) {
      unlocked.push(achievementId);
      StorageService.set('unlockedAchievements', unlocked);
      
      // XP is calculated passively based on unlocked achievements, no need to add manually
      
      // Add to recently unlocked
      this.addRecentlyUnlocked(achievementId);
      this.addAchievementUnlockHistory(achievementId);
      return true;
    }
    return false;
  }

  static isAchievementUnlocked(achievementId) {
    return this.getUnlockedAchievements().includes(achievementId);
  }

  static getAchievementProgress(achievementId, current, required) {
    if (achievementId === 'first_game') {
      return current > 0 ? 100 : 0;
    }
    
    // Library achievements - all collector achievements
    if (achievementId.startsWith('collector_')) {
      const target = parseInt(achievementId.split('_')[1]);
      return Math.min((current / target) * 100, 100);
    }
    
    // Time achievements
    if (achievementId.startsWith('hour_')) {
      const targetHours = parseInt(achievementId.split('_')[1]);
      return Math.min((current / (targetHours * 60)) * 100, 100); // Convert hours to minutes
    }
    
    // Session achievements
    if (achievementId.startsWith('session_')) {
      const targetSessions = parseInt(achievementId.split('_')[1]);
      return Math.min((current / targetSessions) * 100, 100);
    }
    
    // Variety achievements
    if (achievementId.startsWith('variety_')) {
      const targetGenres = parseInt(achievementId.split('_')[1]);
      return Math.min((current / targetGenres) * 100, 100);
    }
    
    // Platform diversity
    if (achievementId === 'platform_diverse') {
      return Math.min((current / 3) * 100, 100);
    }
    
    // Feature usage achievements
    if (achievementId.startsWith('perfect_play_')) {
      const target = parseInt(achievementId.split('_')[2]);
      return Math.min((current / target) * 100, 100);
    }
    
    if (achievementId.startsWith('surprise_')) {
      const target = parseInt(achievementId.split('_')[1]);
      return Math.min((current / target) * 100, 100);
    }
    
    if (achievementId.startsWith('rediscover_')) {
      const target = parseInt(achievementId.split('_')[1]);
      return Math.min((current / target) * 100, 100);
    }
    
    if (achievementId.startsWith('share_')) {
      const target = parseInt(achievementId.split('_')[1]);
      return Math.min((current / target) * 100, 100);
    }
    
    // Mood achievements
    if (achievementId.startsWith('relaxed_')) {
      const target = parseInt(achievementId.split('_')[1]);
      return Math.min((current / target) * 100, 100);
    }
    
    if (achievementId.startsWith('focused_')) {
      const target = parseInt(achievementId.split('_')[1]);
      return Math.min((current / target) * 100, 100);
    }
    
    if (achievementId.startsWith('adventurous_')) {
      const target = parseInt(achievementId.split('_')[1]);
      return Math.min((current / target) * 100, 100);
    }
    
    return 0;
  }

  static getPlatformStats() {
    try {
      return StorageService.get('platformStats', {});
    } catch (error) {
      StorageService.set('platformStats', {});
      return {};
    }
  }

  static trackPlatformUsage(platform) {
    const stats = this.getPlatformStats();
    stats[platform] = (stats[platform] || 0) + 1;
    StorageService.set('platformStats', stats);
  }

  static getFeatureStats() {
    try {
      return StorageService.get('featureStats', {});
    } catch (error) {
      StorageService.set('featureStats', {});
      return {};
    }
  }

  static trackFeatureUsage(feature) {
    const stats = this.getFeatureStats();
    stats[feature] = (stats[feature] || 0) + 1;
    StorageService.set('featureStats', stats);
  }

  static getUniqueGameStats() {
    try {
      const stored = StorageService.get('uniqueGameStats', {});
      if (!stored || typeof stored !== 'object') {
        return { games: {} };
      }
      if (!stored.games || typeof stored.games !== 'object') {
        stored.games = {};
      }
      return stored;
    } catch (error) {
      console.error('Error reading unique game stats:', error);
      return { games: {} };
    }
  }

  static getLaunchRewardStats() {
    try {
      const stored = StorageService.get('launchRewardStats', {});
      const totalXP = Math.max(0, Math.round(Number(stored?.totalXP) || 0));
      const launches = Math.max(0, Math.round(Number(stored?.launches) || 0));
      return { totalXP, launches };
    } catch (error) {
      console.warn('Error reading launch reward stats, resetting to defaults:', error);
      return { totalXP: 0, launches: 0 };
    }
  }

  static getBonusRewardStats() {
    try {
      const stored = StorageService.get('bonusRewardStats', {});
      const totalXP = Math.max(0, Math.round(Number(stored?.totalXP) || 0));
      const awards = Math.max(0, Math.round(Number(stored?.awards) || 0));
      return { totalXP, awards };
    } catch (error) {
      console.warn('Error reading bonus reward stats, resetting to defaults:', error);
      return { totalXP: 0, awards: 0 };
    }
  }

  static rewardGameLaunch(xp = 10) {
    const rewardValue = Number(xp);
    const rewardXP = Number.isFinite(rewardValue) && rewardValue > 0
      ? Math.round(rewardValue)
      : 10;
    const stats = this.getLaunchRewardStats();
    const updatedStats = {
      totalXP: stats.totalXP + rewardXP,
      launches: stats.launches + 1
    };
    StorageService.set('launchRewardStats', updatedStats);
    return updatedStats;
  }

  static grantXP(source = 'bonus_reward', xp = 0, metadata = {}) {
    const rewardValue = Number(xp);
    const rewardXP = Number.isFinite(rewardValue) && rewardValue > 0
      ? Math.round(rewardValue)
      : 0;

    if (rewardXP <= 0) {
      return this.getBonusRewardStats();
    }

    const stats = this.getBonusRewardStats();
    const updatedStats = {
      totalXP: stats.totalXP + rewardXP,
      awards: stats.awards + 1,
      lastAward: {
        source,
        xp: rewardXP,
        awardedAt: new Date().toISOString(),
        metadata
      }
    };

    StorageService.set('bonusRewardStats', updatedStats);
    return updatedStats;
  }

  static getUniqueGamesPlayedCount() {
    const stats = this.getUniqueGameStats();
    return Object.keys(stats.games || {}).length;
  }

  static getGameIdentifier(game) {
    if (!game) return null;
    if (game.appid) return `appid:${game.appid}`;
    if (game.launchId) return `launch:${game.launchId}`;
    if (game.installDir) return `install:${game.installDir.toLowerCase()}`;
    const nameSlug = slugify(game.name || '');
    return nameSlug ? `name:${nameSlug}` : null;
  }

  static logGameplayMood(mood) {
    const normalized = normalizeMood(mood);
    if (!normalized) return;
    this.trackMoodUsage(normalized);
  }

  static logGameplayGenre(genre) {
    const normalized = normalizeGenre(Array.isArray(genre) ? genre[0] : genre);
    if (!normalized) return;
    this.trackGenreUsage(normalized);
  }

  static logGameplayFeature(feature) {
    const normalized = normalizeFeature(feature);
    if (!normalized) return;
    this.trackFeatureUsage(normalized);
    const rollingKey = ROLLING_FEATURE_KEY_MAP[normalized];
    if (rollingKey) {
      RollingAchievementsTracker.trackFeatureUsage(rollingKey);
    }
  }

  static logUniqueGamePlay(game) {
    const identifier = this.getGameIdentifier(game);
    if (!identifier) {
      return;
    }

    const stats = this.getUniqueGameStats();
    if (!stats.games[identifier]) {
      stats.games[identifier] = {
        name: game?.name || 'Unknown Game',
        firstPlayed: Date.now(),
        sessions: 0
      };
    }

    stats.games[identifier].sessions += 1;
    StorageService.set('uniqueGameStats', stats);
  }

  static getStoredLibrary() {
    try {
      return StorageService.get('library', []);
    } catch (error) {
      return [];
    }
  }

  static getStatsBackboneSnapshot(period = 'all', library = null) {
    const resolvedLibrary = Array.isArray(library) ? library : this.getStoredLibrary();
    const dashboardData = StatsAggregationService.getDashboardData(resolvedLibrary);
    const normalizedPeriod = ['daily', 'weekly', 'monthly', 'yearly', 'all'].includes(period) ? period : 'all';

    return {
      library: resolvedLibrary,
      snapshot: dashboardData?.periods?.[normalizedPeriod] || null
    };
  }

  static getLegacyTimeStats(library = null) {
    const resolvedLibrary = Array.isArray(library) ? library : this.getStoredLibrary();

    return resolvedLibrary.reduce((totals, game) => {
      const totalMinutes = Math.max(0, Math.round(Number(game?.playtime?.total ?? game?.time_played ?? 0)));
      const totalSessions = Math.max(0, Math.round(Number(game?.launch_count || 0)));

      totals.total += totalMinutes;
      totals.sessions += totalSessions;
      return totals;
    }, { total: 0, sessions: 0 });
  }

  static getLegacyPeriodPlaytime(period, library = null) {
    const resolvedLibrary = Array.isArray(library) ? library : this.getStoredLibrary();
    const currentDate = new Date();

    switch (period) {
      case 'daily': {
        const dayKey = getDateKey(currentDate);
        return resolvedLibrary.reduce((totalMinutes, game) => totalMinutes + Number(game?.playtime?.daily?.[dayKey] || 0), 0);
      }
      case 'weekly': {
        const weekKey = `${currentDate.getFullYear()}-W${Math.floor((currentDate.getDate() - 1) / 7) + 1}`;
        return resolvedLibrary.reduce((totalMinutes, game) => totalMinutes + Number(game?.playtime?.weekly?.[weekKey] || 0), 0);
      }
      case 'monthly': {
        const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        return resolvedLibrary.reduce((totalMinutes, game) => totalMinutes + Number(game?.playtime?.monthly?.[monthKey] || 0), 0);
      }
      case 'yearly': {
        const yearKey = currentDate.getFullYear().toString();
        return resolvedLibrary.reduce((totalMinutes, game) => totalMinutes + Number(game?.playtime?.yearly?.[yearKey] || 0), 0);
      }
      case 'all':
      default:
        return resolvedLibrary.reduce((totalMinutes, game) => (
          totalMinutes + Math.max(0, Math.round(Number(game?.playtime?.total ?? game?.time_played ?? 0)))
        ), 0);
    }
  }

  static getTimeStats() {
    try {
      const { library, snapshot } = this.getStatsBackboneSnapshot('all');
      const canonicalStats = {
        total: Math.max(0, Math.round(Number(snapshot?.playtimeMinutes || 0))),
        sessions: Math.max(0, Math.round(Number(snapshot?.sessions || 0)))
      };
      const legacyStats = this.getLegacyTimeStats(library);

      return {
        total: Math.max(canonicalStats.total, legacyStats.total),
        sessions: Math.max(canonicalStats.sessions, legacyStats.sessions)
      };
    } catch (error) {
      console.error('Error reading playtime stats:', error);
      return this.getLegacyTimeStats();
    }
  }

  static getPeriodPlaytime(period) {
    try {
      const { library, snapshot } = this.getStatsBackboneSnapshot(period);
      const canonicalPlaytime = Math.max(0, Math.round(Number(snapshot?.playtimeMinutes || 0)));
      const legacyPlaytime = this.getLegacyPeriodPlaytime(period, library);

      return Math.max(canonicalPlaytime, legacyPlaytime);
    } catch (error) {
      console.error(`Error getting ${period} playtime:`, error);
      return this.getLegacyPeriodPlaytime(period);
    }
  }

  static getPeriodSessions(period) {
    try {
      const { library, snapshot } = this.getStatsBackboneSnapshot(period);
      const canonicalSessions = Math.max(0, Math.round(Number(snapshot?.sessions || 0)));
      const legacySessions = this.getLegacyTimeStats(library).sessions;

      return canonicalSessions > 0 ? canonicalSessions : legacySessions;
    } catch (error) {
      console.error(`Error getting ${period} sessions:`, error);
      return this.getLegacyTimeStats().sessions;
    }
  }

  static trackTimePlayed(minutes) {
    const stats = this.getTimeStats();
    stats.total += minutes;
    stats.sessions += 1;
    StorageService.set('timeStats', stats);
  }

  static recordSessionDurationAchievements(minutes) {
    const duration = Math.max(0, Number(minutes) || 0);
    const previousLongest = Math.max(0, Number(StorageService.get('longestSessionMinutes', 0)) || 0);
    if (duration > previousLongest) StorageService.set('longestSessionMinutes', duration);
    const thresholds = [
      { id: 'session_warrior_30', minutes: 30 },
      { id: 'session_warrior_1h', minutes: 60 },
      { id: 'session_warrior_2h', minutes: 120 },
      { id: 'session_warrior_4h', minutes: 240 }
    ];

    return thresholds
      .filter(({ minutes: target }) => duration >= target)
      .filter(({ id }) => this.unlockAchievement(id))
      .map(({ id }) => id);
  }

  static getLongestSessionMinutes() {
    return Math.max(0, Number(StorageService.get('longestSessionMinutes', 0)) || 0);
  }

  static getMoodStats() {
    try {
      return StorageService.get('moodStats', {});
    } catch (error) {
      StorageService.set('moodStats', {});
      return {};
    }
  }

  static getLifetimeMoodStats() {
    try {
      const stored = StorageService.get('lifetimeMoodStats', null);
      if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
        return stored;
      }

      // Seed lifetime totals from the existing weekly history once, preserving prior mood progress.
      const lifetimeStats = {};
      Object.values(this.getMoodStats()).forEach((weekStats) => {
        if (!weekStats || typeof weekStats !== 'object') return;
        MOOD_SLUGS.forEach((mood) => {
          lifetimeStats[mood] = (lifetimeStats[mood] || 0) + Math.max(0, Number(weekStats[mood]) || 0);
        });
      });
      StorageService.set('lifetimeMoodStats', lifetimeStats);
      return lifetimeStats;
    } catch (error) {
      StorageService.set('lifetimeMoodStats', {});
      return {};
    }
  }

  static trackMoodUsage(mood) {
    const stats = this.getMoodStats();
    const lifetimeStats = this.getLifetimeMoodStats();
    const weekKey = this.getCurrentWeekKey();
    
    if (!stats[weekKey]) {
      stats[weekKey] = {};
    }
    
    stats[weekKey][mood] = (stats[weekKey][mood] || 0) + 1;
    lifetimeStats[mood] = (lifetimeStats[mood] || 0) + 1;
    StorageService.set('moodStats', stats);
    StorageService.set('lifetimeMoodStats', lifetimeStats);
  }

  static getCurrentWeekKey() {
    const now = new Date();
    const year = now.getFullYear();
    const week = Math.floor((now.getDate() - 1) / 7) + 1;
    return `${year}-W${week}`;
  }

  // Time period tracking for achievements
  static getCurrentDayKey() {
    return getDateKey(new Date());
  }

  static getCurrentMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  static getCurrentYearKey() {
    const now = new Date();
    return now.getFullYear().toString();
  }

  static getPeriodCurrentKey(period) {
    switch (period) {
      case 'daily':
        return this.getCurrentDayKey();
      case 'weekly':
        return this.getCurrentWeekKey();
      case 'monthly':
        return this.getCurrentMonthKey();
      case 'yearly':
        return this.getCurrentYearKey();
      default:
        return null;
    }
  }

  // Time-based achievement tracking
  static getTimeBasedAchievements(period) {
    try {
      return StorageService.get(`timeAchievements_${period}`, {});
    } catch (error) {
      StorageService.set(`timeAchievements_${period}`, {});
      return {};
    }
  }

  static setTimeBasedAchievements(period, achievements) {
    StorageService.set(`timeAchievements_${period}`, achievements);
  }

  static getLastResetKey(period) {
    return `lastReset_${period}`;
  }

  static getTimeAssignmentState() {
    try {
      const stored = StorageService.get('timeAssignments', {});
      PERIOD_KEYS.forEach(period => {
        if (!stored[period] || typeof stored[period] !== 'object') {
          stored[period] = { key: null, ids: [] };
        } else {
          stored[period].ids = Array.isArray(stored[period].ids) ? stored[period].ids : [];
        }
      });
      return stored;
    } catch (error) {
      console.warn('Error reading time assignment state, reinitializing:', error);
      return PERIOD_KEYS.reduce((acc, period) => {
        acc[period] = { key: null, ids: [] };
        return acc;
      }, {});
    }
  }

  static saveTimeAssignmentState(state) {
    StorageService.set('timeAssignments', state);
  }

  static selectRandomAssignmentsForPeriod(period) {
    const periodAchievements = [...(ACHIEVEMENTS[period] || [])];
    if (!periodAchievements.length) return [];
    const targetCount = Math.min(
      TIME_ASSIGNMENT_DEFAULT_COUNTS[period] || periodAchievements.length,
      periodAchievements.length
    );
    const unlockedAchievements = new Set(this.getUnlockedAchievements());
    const lockedPool = periodAchievements.filter(({ id }) => id && !unlockedAchievements.has(id));
    const unlockedPool = periodAchievements.filter(({ id }) => id && unlockedAchievements.has(id));
    const pool = lockedPool.length >= targetCount
      ? [...lockedPool]
      : [...lockedPool, ...unlockedPool];
    const selected = [];
    while (selected.length < targetCount && pool.length) {
      const index = Math.floor(Math.random() * pool.length);
      const [choice] = pool.splice(index, 1);
      if (choice?.id) {
        selected.push(choice.id);
      }
    }
    return selected;
  }

  static rotatePeriodAssignments(period, currentKey = null) {
    const state = this.getTimeAssignmentState();
    const key = currentKey || this.getPeriodCurrentKey(period);
    state[period] = {
      key,
      ids: this.selectRandomAssignmentsForPeriod(period)
    };
    this.saveTimeAssignmentState(state);
    return state[period].ids;
  }

  static getActivePeriodAchievementIds(period) {
    const state = this.getTimeAssignmentState();
    const periodState = state[period] || { key: null, ids: [] };
    const currentKey = this.getPeriodCurrentKey(period);
    const availableIds = new Set((ACHIEVEMENTS[period] || []).map(({ id }) => id));
    const validIds = Array.isArray(periodState.ids) ? periodState.ids.filter((id) => availableIds.has(id)) : [];
    const targetCount = Math.min(TIME_ASSIGNMENT_DEFAULT_COUNTS[period] || availableIds.size, availableIds.size);
    if (periodState.key !== currentKey || validIds.length !== targetCount) {
      return this.rotatePeriodAssignments(period, currentKey);
    }
    return validIds;
  }

  static getActivePeriodAchievementDefinitions(period) {
    const ids = this.getActivePeriodAchievementIds(period);
    if (!ids.length) return [];
    return (ACHIEVEMENTS[period] || []).filter(({ id }) => ids.includes(id));
  }

  static checkAndResetTimeBasedAchievements() {
    PERIOD_KEYS.forEach(period => {
      const lastReset = StorageService.getString(`lastReset_${period}`);
      
      const currentKey = this.getPeriodCurrentKey(period);
      if (!currentKey) {
        console.warn(`Unknown period: ${period}`);
        return;
      }

      if (lastReset !== currentKey) {
        // Reset achievements for this period
        this.setTimeBasedAchievements(period, {});
        StorageService.setString(`lastReset_${period}`, currentKey);
        this.rotatePeriodAssignments(period, currentKey);
      }
    });
  }

  static getPeriodAchievementCount(period) {
    const achievements = this.getTimeBasedAchievements(period);
    return achievements ? Object.keys(achievements).length : 0;
  }

  static getAllTimeCounters() {
    return {
      daily: {
        count: this.getPeriodAchievementCount('daily'),
        day: this.getCurrentDayKey()
      },
      weekly: {
        count: this.getPeriodAchievementCount('weekly'),
        week: this.getCurrentWeekKey()
      },
      monthly: {
        count: this.getPeriodAchievementCount('monthly'),
        month: this.getCurrentMonthKey()
      },
      yearly: {
        count: this.getPeriodAchievementCount('yearly'),
        year: parseInt(this.getCurrentYearKey(), 10)
      }
    };
  }

  static isTimeBasedAchievementUnlocked(period, achievementId) {
    const achievements = this.getTimeBasedAchievements(period);
    return achievements[achievementId] === true;
  }

  static unlockTimeBasedAchievement(period, achievementId) {
    const achievements = this.getTimeBasedAchievements(period);
    if (!achievements[achievementId]) {
      achievements[achievementId] = true;
      this.setTimeBasedAchievements(period, achievements);
      const achievement = this.getAchievementById(achievementId);
      const progress = RollingAchievementsTracker.getAchievementProgressSnapshot(achievementId);
      QuestHistoryService.recordQuestCompletion({
        achievementId,
        period,
        periodKey: this.getPeriodCurrentKey(period),
        name: achievement?.name || achievementId,
        description: achievement?.desc || '',
        icon: achievement?.icon || '🏆',
        rarity: achievement?.rarity || 'COMMON',
        metric: progress?.metric || '',
        target: Number(progress?.target || 0),
        current: Number(progress?.current || 0),
        completedAt: Date.now()
      });
      
      // Add to recently unlocked
      this.addRecentlyUnlocked(achievementId);
      return true;
    }
    return false;
  }

  static getGenreStats() {
    try {
      return StorageService.get('genreStats', {});
    } catch (error) {
      StorageService.set('genreStats', {});
      return {};
    }
  }

  static trackGenreUsage(genre) {
    const stats = this.getGenreStats();
    stats[genre] = (stats[genre] || 0) + 1;
    StorageService.set('genreStats', stats);
  }

  // --- Theme tracking (horror, survival, space, fantasy, cyberpunk, cozy) ---

  static getThemesForGame(game) {
    if (!game) return [];
    const genres = Array.isArray(game.genres) ? game.genres : (game.genre ? [game.genre] : []);
    const tags = Array.isArray(game.tags) ? game.tags : (game.tag ? [game.tag] : []);
    const haystack = [...genres, ...tags].filter(Boolean).map(s => String(s).toLowerCase());
    if (haystack.length === 0) return [];

    const matchedThemeIds = new Set();
    THEME_DEFINITIONS.forEach((theme) => {
      const matched = theme.tags.some((needle) =>
        haystack.some((h) => h === needle || h.includes(needle))
      );
      if (matched) matchedThemeIds.add(theme.id);
    });

    // Map persona theme IDs to achievement theme slugs
    const slugs = [];
    Object.entries(THEME_ACHIEVEMENT_MAP).forEach(([slug, personaId]) => {
      if (matchedThemeIds.has(personaId)) slugs.push(slug);
    });
    return slugs;
  }

  static getThemeStats() {
    try {
      return StorageService.get('themeStats', {});
    } catch (error) {
      StorageService.set('themeStats', {});
      return {};
    }
  }

  static trackThemeUsage(game) {
    const themeSlugs = this.getThemesForGame(game);
    if (themeSlugs.length === 0) return;
    const identifier = this.getGameIdentifier(game);
    if (!identifier) return;

    const stats = this.getThemeStats();
    themeSlugs.forEach((slug) => {
      if (!stats[slug]) stats[slug] = {};
      stats[slug][identifier] = true;
    });
    StorageService.set('themeStats', stats);
  }

  static getThemeUniqueCount(slug) {
    const stats = this.getThemeStats();
    return Object.keys(stats[slug] || {}).length;
  }

  // --- Backlog tracking (dust off, shelf diver, finish what you started) ---

  static getBacklogStats() {
    try {
      return StorageService.get('backlogStats', { dust_off: 0, shelf_diver: 0, finish_started: 0 });
    } catch (error) {
      const defaults = { dust_off: 0, shelf_diver: 0, finish_started: 0 };
      StorageService.set('backlogStats', defaults);
      return defaults;
    }
  }

  static trackBacklogMilestone(type) {
    if (!['dust_off', 'shelf_diver', 'finish_started'].includes(type)) return;
    const stats = this.getBacklogStats();
    stats[type] = (stats[type] || 0) + 1;
    StorageService.set('backlogStats', stats);
  }

  static checkDustOff(game) {
    const lastPlayed = game?.last_played;
    if (!lastPlayed) return false;
    const lastPlayedTs = typeof lastPlayed === 'number' ? lastPlayed : Date.parse(lastPlayed);
    if (!Number.isFinite(lastPlayedTs)) return false;
    const sixMonthsMs = 1000 * 60 * 60 * 24 * 180;
    return (Date.now() - lastPlayedTs) >= sixMonthsMs;
  }

  static checkShelfDiver(game) {
    const added = game?.dateAdded || game?.addedAt || game?.firstSeen;
    if (!added) return false;
    const addedTs = typeof added === 'number' ? added : Date.parse(added);
    if (!Number.isFinite(addedTs)) return false;
    const oneYearMs = 1000 * 60 * 60 * 24 * 365;
    return (Date.now() - addedTs) >= oneYearMs;
  }

  static getGamingStats() {
    const timeStats = this.getTimeStats();
    const platformStats = this.getPlatformStats();
    const featureStats = this.getFeatureStats();
    const moodStats = this.getMoodStats();
    const genreStats = this.getGenreStats();
    const librarySize = this.getStoredLibrary().length;
    const uniqueGamesPlayed = this.getUniqueGamesPlayedCount();
    
    return {
      totalPlayTime: timeStats.total,
      totalSessions: timeStats.sessions,
      uniqueGamesPlayed,
      averageSessionTime: timeStats.sessions > 0 ? Math.round(timeStats.total / timeStats.sessions) : 0,
      favoritePlatform: this.getFavoritePlatform(platformStats),
      mostUsedFeature: this.getMostUsedFeature(featureStats),
      favoriteMood: this.getFavoriteMood(moodStats),
      favoriteGenre: this.getFavoriteGenre(genreStats),
      platformDiversity: Object.keys(platformStats).length,
      achievementProgress: AchievementStats.getCompletionRate(),
      librarySize: librarySize
    };
  }

  static getFavoritePlatform(platformStats) {
    const entries = Object.entries(platformStats);
    if (entries.length === 0) return 'None';
    return entries.sort(([,a], [,b]) => b - a)[0][0];
  }

  static getMostUsedFeature(featureStats) {
    const entries = Object.entries(featureStats);
    if (entries.length === 0) return 'None';
    return entries.sort(([,a], [,b]) => b - a)[0][0];
  }

  static getFavoriteMood(moodStats) {
    const entries = Object.entries(moodStats).flatMap(([week, moods]) => Object.entries(moods));
    if (entries.length === 0) return 'None';
    const moodCounts = {};
    entries.forEach(([mood]) => {
      moodCounts[mood] = (moodCounts[mood] || 0) + 1;
    });
    return Object.entries(moodCounts).sort(([,a], [,b]) => b - a)[0][0];
  }

  static getFavoriteGenre(genreStats) {
    const entries = Object.entries(genreStats);
    if (entries.length === 0) return 'None';
    return entries.sort(([,a], [,b]) => b - a)[0][0];
  }

  static getRecentlyUnlocked() {
    try {
      return StorageService.get('recentlyUnlocked', []);
    } catch (error) {
      return [];
    }
  }

  static addRecentlyUnlocked(achievementId) {
    const recent = this.getRecentlyUnlocked().filter((entry) => entry?.id !== achievementId);
    const achievement = this.getAchievementById(achievementId);
    if (achievement) {
      recent.unshift({
        id: achievementId,
        name: achievement.name,
        unlockedAt: Date.now()
      });
      // Keep only last 10 recently unlocked
      if (recent.length > 10) recent.pop();
      StorageService.set('recentlyUnlocked', recent);
    }
  }

  static getAchievementUnlockHistory() {
    try {
      return StorageService.get('achievementUnlockHistory', []);
    } catch (error) {
      return [];
    }
  }

  static addAchievementUnlockHistory(achievementId) {
    const achievement = this.getAchievementById(achievementId);
    if (!achievement) {
      return;
    }

    const history = this.getAchievementUnlockHistory().filter((entry) => entry?.id !== achievementId);
    const achievementPoints = this.getAchievementPoints();
    history.unshift({
      id: achievementId,
      name: achievement.name,
      rarity: achievement.rarity || 'COMMON',
      icon: achievement.icon || '🏆',
      xp: Number(achievementPoints[achievementId] ?? 50),
      unlockedAt: Date.now()
    });

    StorageService.set('achievementUnlockHistory', history.slice(0, 500));
  }

  static getAchievementById(id) {
    for (const category of Object.values(ACHIEVEMENTS)) {
      const achievement = category.find(a => a.id === id);
      if (achievement) return achievement;
    }
    return null;
  }

  static getQuestCompletionStats() {
    const history = QuestHistoryService.getQuestCompletionHistory();
    const periodCounts = {
      daily: 0,
      weekly: 0,
      monthly: 0,
      yearly: 0
    };

    history.forEach((entry) => {
      if (periodCounts[entry?.period] !== undefined) {
        periodCounts[entry.period] += 1;
      }
    });

    return {
      totalCompleted: history.length,
      periodCounts
    };
  }

  // XP and Level System
  static getAchievementPoints() {
    const rarityPoints = { COMMON: 50, RARE: 150, EPIC: 400, LEGENDARY: 1000 };
    const map = {};
    ALL_ACHIEVEMENT_DEFINITIONS.forEach((def) => {
      map[def.id] = rarityPoints[def.rarity] || 50;
    });
    return map;
  }

  static getPatreonBoostProfile() {
    try {
      const parsed = StorageService.get('patreonXPBoost', {});
      const canonicalMeta = resolveStoredBoostMeta(parsed);
      const multiplier = Number(canonicalMeta?.multiplier ?? parsed.multiplier);
      const safeMultiplier = Number.isFinite(multiplier) && multiplier >= 1 ? multiplier : 1;

      return {
        multiplier: safeMultiplier,
        code: parsed.code || null,
        label: canonicalMeta?.label || parsed.label || (safeMultiplier > 1 ? `${formatXPBoostMultiplier(safeMultiplier)} Patreon XP Boost` : null),
        tier: canonicalMeta?.tier || normalizeSupportTier(parsed.tier),
        activatedAt: parsed.activatedAt || null,
        isMonthly: Boolean(parsed.isMonthly),
        expiry: parsed.expiry || null
      };
    } catch (error) {
      console.warn('Failed to parse Patreon XP boost profile:', error);
      return {
        multiplier: 1,
        code: null,
        label: null,
        tier: null,
        activatedAt: null,
        isMonthly: false,
        expiry: null
      };
    }
  }

  static getXPBoostMultiplier() {
    return this.checkMonthlyBoostExpiry().multiplier;
  }

  static getPatreonBoostCatalog() {
    return { ...PATREON_XP_BOOST_CODES };
  }

  static validatePatreonBoostCode(code) {
    if (!code || typeof code !== 'string') {
      return null;
    }
    return PATREON_XP_BOOST_CODES[code.toUpperCase().trim()] || null;
  }

  static activatePatreonXPBoost(code) {
    const normalizedCode = (code || '').toUpperCase().trim();
    const boostMeta = this.validatePatreonBoostCode(normalizedCode);

    if (!boostMeta) {
      return {
        success: false,
        message: 'Invalid Patreon code. Please check your code and try again.'
      };
    }

    const existing = this.getPatreonBoostProfile();
    if (existing.multiplier > boostMeta.multiplier) {
      return {
        success: false,
        message: `You already have a higher XP boost (${formatXPBoostMultiplier(existing.multiplier)}).`
      };
    }

    if (existing.code === normalizedCode && existing.multiplier === boostMeta.multiplier) {
      return {
        success: false,
        message: 'This XP boost is already active on your profile.'
      };
    }

    const profile = {
      multiplier: boostMeta.multiplier,
      code: normalizedCode,
      label: boostMeta.label,
      tier: normalizeSupportTier(boostMeta.tier),
      activatedAt: new Date().toISOString()
    };

    StorageService.set('patreonXPBoost', profile);

    const multiplierLabel = formatXPBoostMultiplier(boostMeta.multiplier);
    return {
      success: true,
      message: `XP boost activated! Future progression now earns XP at ${multiplierLabel} the base rate.`,
      multiplier: boostMeta.multiplier,
      multiplierLabel,
      tier: normalizeSupportTier(boostMeta.tier),
      code: normalizedCode
    };
  }

  // Monthly XP Boost Code Methods
  static redeemMonthlyBoostCode(code) {
    const normalizedCode = String(code || '').trim().toUpperCase();
    
    // Check if it's a valid monthly code
    const monthlyCodeMeta = MONTHLY_XP_BOOST_CODES[normalizedCode];
    if (!monthlyCodeMeta) {
      return {
        success: false,
        message: 'Invalid monthly XP boost code.'
      };
    }

    // Check if the code has expired
    const today = new Date();
    const expiryDate = new Date(monthlyCodeMeta.expiry);
    if (today > expiryDate) {
      return {
        success: false,
        message: `This monthly code expired on ${monthlyCodeMeta.expiry}.`
      };
    }

    // Check if this monthly code was already redeemed
    const redeemedMonthlyCodes = this.getRedeemedMonthlyCodes();
    if (redeemedMonthlyCodes.includes(normalizedCode)) {
      return {
        success: false,
        message: 'This monthly code has already been redeemed.'
      };
    }

    // Get current boost profile
    const currentProfile = this.getPatreonBoostProfile();
    
    // If user already has an active boost with higher or equal multiplier, don't downgrade
    if (currentProfile.multiplier >= monthlyCodeMeta.multiplier) {
      return {
        success: false,
        message: `You already have an active ${formatXPBoostMultiplier(currentProfile.multiplier)} XP boost. This ${formatXPBoostMultiplier(monthlyCodeMeta.multiplier)} boost would not improve your current rate.`
      };
    }

    // Activate the monthly boost
    const profile = {
      multiplier: monthlyCodeMeta.multiplier,
      code: normalizedCode,
      label: monthlyCodeMeta.label,
      tier: normalizeSupportTier(monthlyCodeMeta.tier),
      activatedAt: new Date().toISOString(),
      isMonthly: true,
      expiry: monthlyCodeMeta.expiry
    };

    StorageService.set('patreonXPBoost', profile);

    // Mark this monthly code as redeemed
    redeemedMonthlyCodes.push(normalizedCode);
    StorageService.set('redeemedMonthlyCodes', redeemedMonthlyCodes);

    const multiplierLabel = formatXPBoostMultiplier(monthlyCodeMeta.multiplier);
    return {
      success: true,
      message: `Monthly ${normalizeSupportTier(monthlyCodeMeta.tier) || monthlyCodeMeta.tier} XP boost activated! Future progression now earns XP at ${multiplierLabel} the base rate until ${monthlyCodeMeta.expiry}.`,
      multiplier: monthlyCodeMeta.multiplier,
      multiplierLabel,
      tier: normalizeSupportTier(monthlyCodeMeta.tier),
      code: normalizedCode,
      expiry: monthlyCodeMeta.expiry
    };
  }

  static getRedeemedMonthlyCodes() {
    try {
      return StorageService.get('redeemedMonthlyCodes', []);
    } catch (error) {
      return [];
    }
  }

  static getAvailableMonthlyCodes(tier = null) {
    const redeemedCodes = this.getRedeemedMonthlyCodes();
    const today = new Date();
    
    return Object.entries(MONTHLY_XP_BOOST_CODES)
      .filter(([code, meta]) => {
        // Filter by tier if specified
        if (tier && meta.tier.toLowerCase() !== tier.toLowerCase()) {
          return false;
        }
        
        // Filter out redeemed codes
        if (redeemedCodes.includes(code)) {
          return false;
        }
        
        // Filter out expired codes
        const expiryDate = new Date(meta.expiry);
        return today <= expiryDate;
      })
      .map(([code, meta]) => ({
        code,
        ...meta
      }));
  }

  static checkMonthlyBoostExpiry() {
    const currentProfile = this.getPatreonBoostProfile();
    
    // Only check expiry for monthly boosts
    if (!currentProfile.isMonthly || !currentProfile.expiry) {
      return currentProfile;
    }

    const today = new Date();
    const expiryDate = new Date(currentProfile.expiry);
    
    if (today > expiryDate) {
      // Monthly boost has expired, reset to base multiplier
      const resetProfile = {
        multiplier: 1,
        code: null,
        label: null,
        tier: null,
        activatedAt: null,
        isMonthly: false,
        expiry: null
      };
      
      StorageService.set('patreonXPBoost', resetProfile);
      
      return resetProfile;
    }
    
    return currentProfile;
  }

  static getXPStats() {
    const unlockedAchievements = this.getUnlockedAchievements();
    const achievementPoints = this.getAchievementPoints();
    const timeStats = this.getTimeStats();
    const launchRewardStats = this.getLaunchRewardStats();
    const bonusRewardStats = this.getBonusRewardStats();

    // Legacy achievement XP is still computed for display/back-compat, but it no
    // longer feeds progression — XP and reward unlocks now come from habits.
    const achievementXP = unlockedAchievements.reduce((total, achievementId) => {
      return total + (achievementPoints[achievementId] ?? 10);
    }, 0);

    // Habit-driven XP: consistency, engagement, completions, and streaks.
    let habitXP = 0;
    try {
      habitXP = HabitTrackerService.getHabitXP()?.total || 0;
    } catch (habitError) {
      console.warn('Failed to read habit XP, defaulting to 0:', habitError);
    }

    // Calculate XP from playtime (0.5 XP per minute) so raw hours stay a
    // meaningful but non-dominant slice of the balanced habit-driven mix.
    const playtimeXP = Math.round((timeStats.total || 0) * 0.5);
    const launchXP = launchRewardStats.totalXP;
    const bonusRewardXP = bonusRewardStats.totalXP;
    const baseXP = habitXP + playtimeXP + launchXP + bonusRewardXP;
    
    // Check for monthly boost expiry before getting boost profile
    const boostProfile = this.checkMonthlyBoostExpiry();
    const boostMultiplier = boostProfile.multiplier || 1;
    const boostEligibleXP = boostMultiplier > 1
      ? getBoostEligibleXP(boostProfile.activatedAt, achievementPoints)
      : 0;
    const bonusXP = Math.max(0, Math.round(boostEligibleXP * Math.max(0, boostMultiplier - 1)));
    const totalXP = baseXP + bonusXP;
    const level = this.calculateLevel(totalXP);
    const xpForCurrentLevel = this.getXPForLevel(level);
    const xpForNextLevel = this.getXPForLevel(level + 1);
    const xpProgress = totalXP - xpForCurrentLevel;
    const xpToNextLevel = xpForNextLevel - xpForCurrentLevel;

    return {
      totalXP,
      achievementXP,
      habitXP,
      playtimeXP,
      launchXP,
      bonusRewardXP,
      bonusRewardCount: bonusRewardStats.awards,
      launchCount: launchRewardStats.launches,
      baseXP,
      boostEligibleXP,
      bonusXP,
      boostMultiplier,
      boostLabel: boostProfile.label,
      boostTier: boostProfile.tier,
      boostActive: boostMultiplier > 1,
      level,
      xpProgress,
      xpToNextLevel,
      xpForNextLevel,
      levelProgress: xpToNextLevel > 0 ? Math.min((xpProgress / xpToNextLevel) * 100, 100) : 100
    };
  }

  static calculateLevel(xp) {
    // Level calculation: Level = floor(sqrt(XP / 100)) + 1
    // This creates a gradual progression where higher levels require more XP
    return Math.floor(Math.sqrt(xp / 100)) + 1;
  }

  static getXPForLevel(level) {
    // Reverse of calculateLevel: XP = (level - 1)^2 * 100
    return Math.pow(level - 1, 2) * 100;
  }

  static getWeeklyMoodBadge() {
    const weekKey = this.getCurrentWeekKey();
    const stats = this.getMoodStats();
    const weekStats = stats[weekKey] || {};
    
    if (Object.keys(weekStats).length === 0) return null;
    
    const mostUsedMood = Object.entries(weekStats)
      .sort(([,a], [,b]) => b - a)[0][0];
    
    const moodBadges = {
      'Relaxed': '😌 Chill Champion',
      'Social': '🔥 Social Butterfly',
      'Creative': '🎨 Creative Genius',
      'Focused': '🎯 Focus Master',
      'Competitive': '⚔️ Arena Champion'
    };
    
    return {
      mood: mostUsedMood,
      badge: moodBadges[mostUsedMood] || '🎮 Gamer',
      count: weekStats[mostUsedMood]
    };
  }

  static checkAndUnlockAchievements() {
    try {
      const stats = this.getGamingStats();
      const unlocked = this.getUnlockedAchievements();
    
    // Library achievements
    if (this.getLaunchRewardStats().launches > 0 && !unlocked.includes('first_game')) {
      this.unlockAchievement('first_game');
      unlocked.push('first_game');
    }
    (COLLECTOR_THRESHOLD_MAP.collector || []).forEach(({ id, threshold }) => {
      if (stats.librarySize >= threshold && !unlocked.includes(id)) {
        this.unlockAchievement(id);
        unlocked.push(id);
      }
    });

    // Time achievements (total)
    const totalPlaytime = stats.totalPlayTime;
    const playtimeThresholds = PLAYTIME_THRESHOLD_MAP.hour || [];
    playtimeThresholds.forEach(({ id, threshold }) => {
      if (totalPlaytime >= threshold * 60 && !unlocked.includes(id)) {
        this.unlockAchievement(id);
        unlocked.push(id);
      }
    });

    // Session achievements
    const sessionThresholds = (SESSION_THRESHOLD_MAP.session || []);
    sessionThresholds.forEach(({ id, threshold }) => {
      if (stats.totalSessions >= threshold && !unlocked.includes(id)) {
        this.unlockAchievement(id);
        unlocked.push(id);
      }
    });

    // Platform diversity
    if (stats.platformDiversity >= 3 && !unlocked.includes('platform_diverse')) {
      this.unlockAchievement('platform_diverse');
    }

    // Genre variety
    const genreStats = this.getGenreStats();
    const uniqueGenres = Object.keys(genreStats).length;
    if (uniqueGenres >= 3 && !unlocked.includes('variety_3')) {
      this.unlockAchievement('variety_3');
      unlocked.push('variety_3');
    }
    if (uniqueGenres >= 5 && !unlocked.includes('variety_5')) {
      this.unlockAchievement('variety_5');
      unlocked.push('variety_5');
    }

    // Mood achievements use permanent lifetime counts, while weekly mood data remains available for badges.
    const lifetimeMoodStats = this.getLifetimeMoodStats();
    Object.entries(MOOD_THRESHOLD_MAP).forEach(([mood, thresholds = []]) => {
      const sessions = Number(lifetimeMoodStats[mood] || 0);
      thresholds.forEach(({ id, threshold }) => {
        if (sessions >= threshold && !unlocked.includes(id)) {
          this.unlockAchievement(id);
          unlocked.push(id);
        }
      });
    });
    if (MOOD_SLUGS.every(mood => Number(lifetimeMoodStats[mood] || 0) > 0) && !unlocked.includes('mood_explorer')) {
      this.unlockAchievement('mood_explorer');
      unlocked.push('mood_explorer');
    }

    // Genre session achievements use the most-played genre.
    const maxGenreSessions = Math.max(0, ...Object.values(genreStats).map(value => Number(value) || 0));
    (GENRE_THRESHOLD_MAP.genre_sessions || []).forEach(({ id, threshold }) => {
      if (maxGenreSessions >= threshold && !unlocked.includes(id)) {
        this.unlockAchievement(id);
        unlocked.push(id);
      }
    });

    // Unique gameplay achievements
    const uniqueGameCount = this.getUniqueGamesPlayedCount();
    const uniqueThresholds = UNIQUE_GAME_THRESHOLD_MAP.unique_game || [];
    uniqueThresholds.forEach(({ id, threshold }) => {
      if (uniqueGameCount >= threshold && !unlocked.includes(id)) {
        this.unlockAchievement(id);
        unlocked.push(id);
      }
    });

    // Feature usage achievements (Perfect Play, Surprise, Rediscover, Share, etc.)
    Object.entries(FEATURE_THRESHOLD_MAP).forEach(([featureSlug, thresholds = []]) => {
      const featureStats = this.getFeatureStats();
      const count = featureStats[featureSlug] || 0;
      thresholds.forEach(({ id, threshold }) => {
        if (count >= threshold && !unlocked.includes(id)) {
          this.unlockAchievement(id);
          unlocked.push(id);
        }
      });
    });

    // Engagement achievements are derived from the current stored library.
    const library = this.getStoredLibrary();
    const ratingCount = library.filter(game => Number(game?.userRating ?? game?.rating) > 0).length;
    const completedStatuses = new Set(['beaten', 'completed', '100%']);
    const completionCount = library.filter(game => completedStatuses.has(String(game?.completionStatus || '').trim().toLowerCase())).length;
    Object.entries(ENGAGEMENT_THRESHOLD_MAP).forEach(([metric, thresholds = []]) => {
      const count = metric === 'rating' ? ratingCount : completionCount;
      thresholds.forEach(({ id, threshold }) => {
        if (count >= threshold && !unlocked.includes(id)) {
          this.unlockAchievement(id);
          unlocked.push(id);
        }
      });
    });

    // Quest completion achievements
    const questStats = this.getQuestCompletionStats();
    (QUEST_THRESHOLD_MAP.quest_total || []).forEach(({ id, threshold }) => {
      if (questStats.totalCompleted >= threshold && !unlocked.includes(id)) {
        this.unlockAchievement(id);
        unlocked.push(id);
      }
    });

    // Theme achievements — unique games played per theme
    Object.entries(THEME_THRESHOLD_MAP).forEach(([themeKey, thresholds = []]) => {
      const themeSlug = themeKey.replace(/^theme_/, '');
      const themeCount = this.getThemeUniqueCount(themeSlug);
      thresholds.forEach(({ id, threshold }) => {
        if (themeCount >= threshold && !unlocked.includes(id)) {
          this.unlockAchievement(id);
          unlocked.push(id);
        }
      });
    });

    // Backlog achievements
    const backlogStats = this.getBacklogStats();
    Object.entries(BACKLOG_THRESHOLD_MAP).forEach(([metric, thresholds = []]) => {
      const count = Number(backlogStats[metric]) || 0;
      thresholds.forEach(({ id, threshold }) => {
        if (count >= threshold && !unlocked.includes(id)) {
          this.unlockAchievement(id);
          unlocked.push(id);
        }
      });
    });

    // Time-based achievements
    this.checkTimeBasedAchievements();
    } catch (error) {
      console.error('Error checking achievements:', error);
    // Don't crash the app if achievement checking fails
    }
  }

  static checkTimeBasedAchievements() {
    const unlockedAchievements = this.getUnlockedAchievements();
    const library = this.getStoredLibrary();

    // Only recompute if library changed, not on every achievement check
    const currentLibraryHash = JSON.stringify(library).slice(0, 100);
    const lastLibraryHash = StorageService.getString('lastLibraryHash');

    if (currentLibraryHash !== lastLibraryHash) {
      RollingAchievementsTracker.recomputeActivityFromHistory(library);
      StorageService.setString('lastLibraryHash', currentLibraryHash);
    }
    
    PERIOD_KEYS.forEach(period => {
      const activeIds = this.getActivePeriodAchievementIds(period);
      activeIds.forEach(achievementId => {
        const progress = RollingAchievementsTracker.getAchievementProgressSnapshot(achievementId);
        if (!progress?.completed || this.isTimeBasedAchievementUnlocked(period, achievementId)) {
          return;
        }

        this.unlockTimeBasedAchievement(period, achievementId);

        if (!unlockedAchievements.includes(achievementId)) {
          this.unlockAchievement(achievementId);
          unlockedAchievements.push(achievementId);
        }
      });
    });
  }

  // Activation code system for special achievements
  static validateActivationCode(code) {
    const validCodes = {
      'PATREON-2024-FOUNDERS': 'patreon_supporter',
      'GAMEPILOT-SUPPORTER-2024': 'patreon_supporter',
      'FOUNDER-PACK-2024': 'patreon_supporter',
      'EARLY-ADOPTER-2024': 'patreon_supporter',
      'SUPPORTER-2025': 'patreon_supporter',
      'FOUNDER-2025': 'patreon_supporter',
      'PATREON-SUPPORTER': 'patreon_supporter'
    };
    
    return validCodes[code.toUpperCase().trim()] || null;
  }

  static unlockByActivationCode(code) {
    const upperCode = code.toUpperCase().trim();
    const achievementId = this.validateActivationCode(upperCode);
    
    if (!achievementId) {
      return { 
        success: false, 
        message: 'Invalid activation code. Please check your code and try again.' 
      };
    }

    const boostMeta = this.validatePatreonBoostCode(upperCode);
    const boostResult = boostMeta ? this.activatePatreonXPBoost(upperCode) : null;
    
    if (!this.isAchievementUnlocked(achievementId)) {
      this.unlockAchievement(achievementId);
    }

    return { 
      success: true, 
      message: boostResult?.success
        ? `🎉 Founder recognition unlocked! ${boostResult.message}`
        : '🎉 Founder recognition unlocked! Patreon support now boosts progression through XP multipliers rather than direct content unlocks.',
      xp: 0,
      achievementId: achievementId
    };
  }
}
