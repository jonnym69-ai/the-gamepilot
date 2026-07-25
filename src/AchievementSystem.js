// AchievementSystem.js - GamePilot Achievement and Analytics System
import { RollingAchievementsTracker } from './services/RollingAchievementsTracker';
import { StatsAggregationService } from './services/StatsAggregationService';
import { QuestHistoryService } from './services/QuestHistoryService';
import { PlaytimeAutoLogger } from './services/PlaytimeAutoLogger';
import { getDateKey } from './services/DateKeyService';
import StorageService from './services/StorageService';
import { HabitTrackerService } from './services/HabitTrackerService';

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
    { id: 'first_game', name: 'First Steps', desc: 'Launch your first game', icon: '🎮', rarity: 'COMMON' },
    { id: 'collector_5', name: 'Collector', desc: 'Have 5 games in library', icon: '📚', rarity: 'COMMON' },
    { id: 'collector_10', name: 'Game Hoarder', desc: 'Have 10 games in library', icon: '📦', rarity: 'COMMON' },
    { id: 'collector_25', name: 'Library Master', desc: 'Have 25 games in library', icon: '🏛️', rarity: 'RARE' },
    { id: 'collector_50', name: 'Game Collector', desc: 'Have 50 games in library', icon: '🏆', rarity: 'RARE' },
    { id: 'collector_100', name: 'Century Club', desc: 'Have 100 games in library', icon: '💯', rarity: 'EPIC' },
    { id: 'collector_250', name: 'Quarter Master', desc: 'Have 250 games in library', icon: '🎯', rarity: 'EPIC' },
    { id: 'collector_500', name: 'Halfway Hero', desc: 'Have 500 games in library', icon: '🎖️', rarity: 'LEGENDARY' },
    { id: 'collector_750', name: 'Three Quarter King', desc: 'Have 750 games in library', icon: '👑', rarity: 'LEGENDARY' },
    { id: 'collector_1000', name: 'Millennium Master', desc: 'Have 1000 games in library', icon: '🎊', rarity: 'LEGENDARY' },
    { id: 'collector_1500', name: 'Epic Collector', desc: 'Have 1500 games in library', icon: '🌟', rarity: 'LEGENDARY' },
    { id: 'collector_2500', name: 'Ultimate Collector', desc: 'Have 2500 games in library', icon: '', rarity: 'LEGENDARY' },
    { id: 'variety_3', name: 'Variety Player', desc: 'Play 3 different genres', icon: '🌈', rarity: 'COMMON' },
    { id: 'variety_5', name: 'Genre Explorer', desc: 'Play 5 different genres', icon: '🎨', rarity: 'RARE' },
    { id: 'platform_diverse', name: 'Platform Diverse', desc: 'Use 3 different platforms', icon: '🔄', rarity: 'RARE' }
  ],
  time: [
    { id: 'hour_1', name: 'Quick Session', desc: 'Play 1 hour total', icon: '⏱️', rarity: 'COMMON' },
    { id: 'hour_5', name: 'Casual Gamer', desc: 'Play 5 hours total', icon: '☕', rarity: 'COMMON' },
    { id: 'hour_10', name: 'Dedicated Gamer', desc: 'Play 10 hours total', icon: '⚡', rarity: 'COMMON' },
    { id: 'hour_25', name: 'Marathon Runner', desc: 'Play 25 hours total', icon: '🏃', rarity: 'RARE' },
    { id: 'hour_50', name: 'Gaming Legend', desc: 'Play 50 hours total', icon: '👑', rarity: 'RARE' },
    { id: 'hour_100', name: 'Century Player', desc: 'Play 100 hours total', icon: '💯', rarity: 'EPIC' },
    { id: 'hour_250', name: 'Quarter Century Gamer', desc: 'Play 250 hours total', icon: '🎯', rarity: 'EPIC' },
    { id: 'hour_500', name: 'Half Millennium', desc: 'Play 500 hours total', icon: '🎖️', rarity: 'LEGENDARY' },
    { id: 'hour_1000', name: 'Millennium Master', desc: 'Play 1000 hours total', icon: '🏆', rarity: 'LEGENDARY' },
    { id: 'hour_1500', name: 'Time Sage', desc: 'Play 1500 hours total', icon: '⌛', rarity: 'LEGENDARY' },
    { id: 'hour_2500', name: 'Chrono Champion', desc: 'Play 2500 hours total', icon: '🕰️', rarity: 'LEGENDARY' },
    { id: 'hour_5000', name: 'Eternal Player', desc: 'Play 5000 hours total', icon: '🌀', rarity: 'LEGENDARY' },
    { id: 'hour_7500', name: 'Infinity Runner', desc: 'Play 7500 hours total', icon: '♾️', rarity: 'LEGENDARY' },
    { id: 'hour_10000', name: 'Mythic Chrononaut', desc: 'Play 10000 hours total', icon: '🌌', rarity: 'LEGENDARY' },
    { id: 'session_1', name: 'Session Warmup', desc: 'Complete 1 gaming session', icon: '🎮', rarity: 'COMMON' },
    { id: 'session_3', name: 'Session Rookie', desc: 'Complete 3 gaming sessions', icon: '🎯', rarity: 'COMMON' },
    { id: 'session_5', name: 'Session Regular', desc: 'Complete 5 gaming sessions', icon: '🎲', rarity: 'COMMON' },
    { id: 'session_10', name: 'Session Starter', desc: 'Complete 10 gaming sessions', icon: '🎮', rarity: 'COMMON' },
    { id: 'session_15', name: 'Session Enthusiast', desc: 'Complete 15 gaming sessions', icon: '🎮', rarity: 'COMMON' },
    { id: 'session_30', name: 'Session Grinder', desc: 'Complete 30 gaming sessions', icon: '🗓️', rarity: 'RARE' },
    { id: 'session_50', name: 'Daily Player', desc: 'Complete 50 gaming sessions', icon: '🗓️', rarity: 'RARE' },
    { id: 'session_75', name: 'Session Specialist', desc: 'Complete 75 gaming sessions', icon: '🏅', rarity: 'RARE' },
    { id: 'session_100', name: 'Century Sessions', desc: 'Complete 100 gaming sessions', icon: '📊', rarity: 'EPIC' },
    { id: 'session_150', name: 'Session Veteran', desc: 'Complete 150 gaming sessions', icon: '📈', rarity: 'EPIC' },
    { id: 'session_200', name: 'Session Strategist', desc: 'Complete 200 gaming sessions', icon: '🎮', rarity: 'EPIC' },
    { id: 'session_300', name: 'Session Maestro', desc: 'Complete 300 gaming sessions', icon: '🎼', rarity: 'EPIC' },
    { id: 'session_500', name: 'Session Legend', desc: 'Complete 500 gaming sessions', icon: '🏆', rarity: 'LEGENDARY' },
    { id: 'session_750', name: 'Session Fanatic', desc: 'Complete 750 gaming sessions', icon: '🔥', rarity: 'LEGENDARY' },
    { id: 'session_1000', name: 'Session Champion', desc: 'Complete 1000 gaming sessions', icon: '🏅', rarity: 'LEGENDARY' },
    { id: 'session_1500', name: 'Session Myth', desc: 'Complete 1500 gaming sessions', icon: '👑', rarity: 'LEGENDARY' },
    { id: 'session_2000', name: 'Session Immortal', desc: 'Complete 2000 gaming sessions', icon: '🌌', rarity: 'LEGENDARY' },
    { id: 'session_3000', name: 'Session Deity', desc: 'Complete 3000 gaming sessions', icon: '💫', rarity: 'LEGENDARY' },
    { id: 'session_4000', name: 'Session Ascendant', desc: 'Complete 4000 gaming sessions', icon: '🌠', rarity: 'LEGENDARY' },
    { id: 'session_5000', name: 'Session Infinite', desc: 'Complete 5000 gaming sessions', icon: '♾️', rarity: 'LEGENDARY' },
  ],
  mood: [
    // Relaxed mood achievements
    { id: 'relaxed_5', name: 'Chill Master', desc: 'Choose "Relaxed" mood 5 times', icon: '😌', rarity: 'COMMON' },
    { id: 'relaxed_10', name: 'Zen Master', desc: 'Choose "Relaxed" mood 10 times', icon: '🧘', rarity: 'COMMON' },
    { id: 'relaxed_25', name: 'Ultimate Chill', desc: 'Choose "Relaxed" mood 25 times', icon: '😎', rarity: 'RARE' },
    { id: 'relaxed_50', name: 'Tranquility Expert', desc: 'Choose "Relaxed" mood 50 times', icon: '🔥', rarity: 'EPIC' },
    { id: 'relaxed_100', name: 'Peace Master', desc: 'Choose "Relaxed" mood 100 times', icon: '☯️', rarity: 'LEGENDARY' },
    
    // Social mood achievements
    { id: 'social_5', name: 'Social Butterfly', desc: 'Choose "Social" mood 5 times', icon: '🦋', rarity: 'COMMON' },
    { id: 'social_10', name: 'Party Master', desc: 'Choose "Social" mood 10 times', icon: '🎉', rarity: 'COMMON' },
    { id: 'social_25', name: 'Community Builder', desc: 'Choose "Social" mood 25 times', icon: '🤝', rarity: 'RARE' },
    { id: 'social_50', name: 'Social Champion', desc: 'Choose "Social" mood 50 times', icon: '👑', rarity: 'EPIC' },
    { id: 'social_100', name: 'Connection Master', desc: 'Choose "Social" mood 100 times', icon: '🌍', rarity: 'LEGENDARY' },
    
    // Creative mood achievements
    { id: 'creative_5', name: 'Artisan', desc: 'Choose "Creative" mood 5 times', icon: '🎨', rarity: 'COMMON' },
    { id: 'creative_10', name: 'Master Creator', desc: 'Choose "Creative" mood 10 times', icon: '🖌️', rarity: 'COMMON' },
    { id: 'creative_25', name: 'Innovation Expert', desc: 'Choose "Creative" mood 25 times', icon: '💡', rarity: 'RARE' },
    { id: 'creative_50', name: 'Creative Genius', desc: 'Choose "Creative" mood 50 times', icon: '🎭', rarity: 'EPIC' },
    { id: 'creative_100', name: 'Imagination Master', desc: 'Choose "Creative" mood 100 times', icon: '🔥', rarity: 'LEGENDARY' },
    
    // Focused mood achievements
    { id: 'focused_5', name: 'Focus Expert', desc: 'Choose "Focused" mood 5 times', icon: '🎯', rarity: 'COMMON' },
    { id: 'focused_10', name: 'Concentration Master', desc: 'Choose "Focused" mood 10 times', icon: '🔥', rarity: 'COMMON' },
    { id: 'focused_25', name: 'Discipline Champion', desc: 'Choose "Focused" mood 25 times', icon: '⚡', rarity: 'RARE' },
    { id: 'focused_50', name: 'Precision Expert', desc: 'Choose "Focused" mood 50 times', icon: '🎯', rarity: 'EPIC' },
    { id: 'focused_100', name: 'Focus Legend', desc: 'Choose "Focused" mood 100 times', icon: '🏹', rarity: 'LEGENDARY' },
    
    // Competitive mood achievements
    { id: 'competitive_5', name: 'Contender', desc: 'Choose "Competitive" mood 5 times', icon: '⚔️', rarity: 'COMMON' },
    { id: 'competitive_10', name: 'Rank Climber', desc: 'Choose "Competitive" mood 10 times', icon: '🏅', rarity: 'COMMON' },
    { id: 'competitive_25', name: 'Arena Veteran', desc: 'Choose "Competitive" mood 25 times', icon: '🥇', rarity: 'RARE' },
    { id: 'competitive_50', name: 'Esports Prospect', desc: 'Choose "Competitive" mood 50 times', icon: '🏆', rarity: 'EPIC' },
    { id: 'competitive_100', name: 'Arena Legend', desc: 'Choose "Competitive" mood 100 times', icon: '👑', rarity: 'LEGENDARY' },
    
    // Mood variety achievements
    { id: 'mood_explorer', name: 'Mood Explorer', desc: 'Try all 5 mood types at least once', icon: '🦎', rarity: 'RARE' },
    { id: 'mood_variety_10', name: 'Mood Chameleon', desc: 'Use each mood at least 10 times', icon: '🦎', rarity: 'EPIC' },
    { id: 'mood_master', name: 'Mood Master', desc: 'Use each mood at least 25 times', icon: '🎭', rarity: 'LEGENDARY' },
    { id: 'mood_legend', name: 'Mood Legend', desc: 'Use each mood at least 50 times', icon: '👑', rarity: 'LEGENDARY' },
    
    // Mood completion rate achievements (based on behavior profile)
    { id: 'mood_completion_50', name: 'Mood Specialist', desc: 'Achieve 50%+ completion rate in one mood', icon: '🎯', rarity: 'RARE' },
    { id: 'mood_completion_70', name: 'Mood Expert', desc: 'Achieve 70%+ completion rate in one mood', icon: '⭐', rarity: 'EPIC' },
    { id: 'mood_completion_90', name: 'Mood Perfectionist', desc: 'Achieve 90%+ completion rate in one mood', icon: '💯', rarity: 'LEGENDARY' }
  ],
  features: [
    { id: 'perfect_play_1', name: 'Perfect Start', desc: 'Use Perfect Play once', icon: '✨', rarity: 'COMMON' },
    { id: 'perfect_play_5', name: 'Perfect Player', desc: 'Use Perfect Play 5 times', icon: '⭐', rarity: 'COMMON' },
    { id: 'perfect_play_10', name: 'Perfect Master', desc: 'Use Perfect Play 10 times', icon: '🌟', rarity: 'RARE' },
    { id: 'perfect_play_25', name: 'Perfect Expert', desc: 'Use Perfect Play 25 times', icon: '💫', rarity: 'EPIC' },
    { id: 'perfect_play_50', name: 'Perfect Legend', desc: 'Use Perfect Play 50 times', icon: '👑', rarity: 'LEGENDARY' },
    { id: 'perfect_play_100', name: 'Perfect Myth', desc: 'Use Perfect Play 100 times', icon: '🌟', rarity: 'LEGENDARY' },
    
    // Patreon supporter achievements
    { id: 'patreon_supporter', name: 'Patreon Supporter', desc: 'Support GamePilot on Patreon', icon: '💎', xp: 0, hidden: true, rarity: 'LEGENDARY' },
    
    // Surprise Me achievements
    { id: 'surprise_1', name: 'Surprise!', desc: 'Use Surprise Me once', icon: '🎁', rarity: 'COMMON' },
    { id: 'surprise_5', name: 'Surprise Hunter', desc: 'Use Surprise Me 5 times', icon: '', rarity: 'COMMON' },
    { id: 'surprise_10', name: 'Surprise Master', desc: 'Use Surprise Me 10 times', icon: '', rarity: 'RARE' },
    { id: 'surprise_25', name: 'Surprise Expert', desc: 'Use Surprise Me 25 times', icon: '', rarity: 'EPIC' },
    { id: 'surprise_50', name: 'Surprise Legend', desc: 'Use Surprise Me 50 times', icon: '', rarity: 'LEGENDARY' },
    { id: 'surprise_100', name: 'Surprise Myth', desc: 'Use Surprise Me 100 times', icon: '', rarity: 'LEGENDARY' },
    
    // Rediscover achievements
    { id: 'rediscover_1', name: 'Memory Lane', desc: 'Rediscover a game once', icon: '🔮', rarity: 'COMMON' },
    { id: 'rediscover_5', name: 'Nostalgic', desc: 'Rediscover 5 games', icon: '📜', rarity: 'COMMON' },
    { id: 'rediscover_10', name: 'Memory Master', desc: 'Rediscover 10 games', icon: '🗝️', rarity: 'RARE' },
    { id: 'rediscover_25', name: 'Nostalgia Expert', desc: 'Rediscover 25 games', icon: '📚', rarity: 'EPIC' },
    { id: 'rediscover_50', name: 'Time Traveler', desc: 'Rediscover 50 games', icon: '⏰', rarity: 'LEGENDARY' },
    { id: 'rediscover_100', name: 'Eternal Memory', desc: 'Rediscover 100 games', icon: '🌌', rarity: 'LEGENDARY' },
    
    // Share achievements
    { id: 'share_1', name: 'Show Off', desc: 'Share your library once', icon: '📤', rarity: 'COMMON' },
    { id: 'share_3', name: 'Social Butterfly', desc: 'Share your library 3 times', icon: '🦋', rarity: 'COMMON' },
    { id: 'share_5', name: 'Community Star', desc: 'Share your library 5 times', icon: '⭐', rarity: 'RARE' },
    { id: 'share_10', name: 'Social Influencer', desc: 'Share your library 10 times', icon: '📱', rarity: 'EPIC' },
    { id: 'share_25', name: 'Community Legend', desc: 'Share your library 25 times', icon: '🌟', rarity: 'LEGENDARY' },
    { id: 'share_50', name: 'Social Myth', desc: 'Share your library 50 times', icon: '🌍', rarity: 'LEGENDARY' },
    
    // Filter achievements
    { id: 'filter_10', name: 'Filter Expert', desc: 'Apply 10 different filters', icon: '🔍', rarity: 'COMMON' },
    { id: 'filter_25', name: 'Search Master', desc: 'Apply 25 different filters', icon: '🎯', rarity: 'RARE' },
    { id: 'filter_50', name: 'Filter Legend', desc: 'Apply 50 different filters', icon: '🔬', rarity: 'EPIC' },
    { id: 'filter_100', name: 'Search Guru', desc: 'Apply 100 different filters', icon: '🧠', rarity: 'LEGENDARY' },
    { id: 'filter_250', name: 'Filter Myth', desc: 'Apply 250 different filters', icon: '🔭', rarity: 'LEGENDARY' },
    
    // Sort achievements
    { id: 'sort_5', name: 'Organizer', desc: 'Use sorting options 5 times', icon: '📋', rarity: 'COMMON' },
    { id: 'sort_15', name: 'Data Wrangler', desc: 'Use sorting options 15 times', icon: '📊', rarity: 'RARE' },
    { id: 'sort_30', name: 'Sort Master', desc: 'Use sorting options 30 times', icon: '📈', rarity: 'EPIC' },
    { id: 'sort_50', name: 'Organization Legend', desc: 'Use sorting options 50 times', icon: '🏆', rarity: 'LEGENDARY' },
    { id: 'sort_100', name: 'Data Myth', desc: 'Use sorting options 100 times', icon: '📊', rarity: 'LEGENDARY' },
    
    // Export achievements
    { id: 'export_1', name: 'Data Exporter', desc: 'Export your library once', icon: '💾', rarity: 'COMMON' },
    { id: 'export_5', name: 'Backup Master', desc: 'Export your library 5 times', icon: '📦', rarity: 'COMMON' },
    { id: 'export_10', name: 'Data Guardian', desc: 'Export your library 10 times', icon: '🛡️', rarity: 'RARE' },
    { id: 'export_25', name: 'Backup Legend', desc: 'Export your library 25 times', icon: '🎎', rarity: 'EPIC' },
    { id: 'export_50', name: 'Backup Myth', desc: 'Export your library 50 times', icon: '💎', rarity: 'LEGENDARY' },
    
    // Settings achievements
    { id: 'settings_3', name: 'Customizer', desc: 'Change 3 different settings', icon: '⚙️', rarity: 'COMMON' }
  ],
  quests: [
    { id: 'quest_total_1', name: 'Quest Initiate', desc: 'Complete your first rotating quest', icon: '🧭', rarity: 'COMMON' },
    { id: 'quest_total_10', name: 'Quest Runner', desc: 'Complete 10 rotating quests', icon: '🗺️', rarity: 'RARE' },
    { id: 'quest_total_25', name: 'Quest Specialist', desc: 'Complete 25 rotating quests', icon: '🎯', rarity: 'EPIC' },
    { id: 'quest_total_50', name: 'Quest Vanguard', desc: 'Complete 50 rotating quests', icon: '🚀', rarity: 'LEGENDARY' },
    { id: 'quest_daily_10', name: 'Daily Cadence', desc: 'Complete 10 daily quests', icon: '🌅', rarity: 'RARE' },
    { id: 'quest_weekly_10', name: 'Weekly Rhythm', desc: 'Complete 10 weekly quests', icon: '📆', rarity: 'RARE' },
    { id: 'quest_monthly_5', name: 'Monthly Momentum', desc: 'Complete 5 monthly quests', icon: '🗓️', rarity: 'EPIC' },
    { id: 'quest_yearly_3', name: 'Yearly Legend', desc: 'Complete 3 yearly quests', icon: '🏆', rarity: 'LEGENDARY' }
  ],
  goals: [
    { id: 'goal_first', name: 'Goal Getter', desc: 'Complete your first habit goal', icon: '🎯', rarity: 'COMMON' },
    { id: 'goal_5', name: 'Goal Setter', desc: 'Complete 5 habit goals', icon: '📈', rarity: 'COMMON' },
    { id: 'goal_10', name: 'Goal Crusher', desc: 'Complete 10 habit goals', icon: '💪', rarity: 'RARE' },
    { id: 'goal_25', name: 'Goal Machine', desc: 'Complete 25 habit goals', icon: '🤖', rarity: 'EPIC' },
    { id: 'goal_50', name: 'Goal Legend', desc: 'Complete 50 habit goals', icon: '🏆', rarity: 'LEGENDARY' },
    { id: 'goal_monthly_3', name: 'Monthly Focus', desc: 'Complete 3 monthly goals', icon: '🗓️', rarity: 'RARE' },
    { id: 'goal_weekly_5', name: 'Weekly Warrior', desc: 'Complete 5 weekly goals in a row', icon: '🔥', rarity: 'RARE' }
  ],
  uniqueGames: [
    { id: 'unique_game_1', name: 'Fresh Start', desc: 'Play 1 unique game', icon: '🎯', rarity: 'COMMON' },
    { id: 'unique_game_3', name: 'New Experiences', desc: 'Play 3 unique games', icon: '🆕', rarity: 'COMMON' },
    { id: 'unique_game_5', name: 'Game Explorer', desc: 'Play 5 unique games', icon: '🧭', rarity: 'COMMON' },
    { id: 'unique_game_10', name: 'Diverse Player', desc: 'Play 10 unique games', icon: '🌈', rarity: 'RARE' },
    { id: 'unique_game_15', name: 'Genre Sampler', desc: 'Play 15 unique games', icon: '🎨', rarity: 'RARE' },
    { id: 'unique_game_30', name: 'Game Hopper', desc: 'Play 30 unique games', icon: '🚀', rarity: 'EPIC' },
    { id: 'unique_game_50', name: 'Library Voyager', desc: 'Play 50 unique games', icon: '🛸', rarity: 'EPIC' },
    { id: 'unique_game_75', name: 'Collection Conqueror', desc: 'Play 75 unique games', icon: '🏰', rarity: 'EPIC' },
    { id: 'unique_game_100', name: 'Century Explorer', desc: 'Play 100 unique games', icon: '💯', rarity: 'LEGENDARY' },
    { id: 'unique_game_150', name: 'Curator', desc: 'Play 150 unique games', icon: '🖼️', rarity: 'LEGENDARY' },
    { id: 'unique_game_200', name: 'Game Historian', desc: 'Play 200 unique games', icon: '📜', rarity: 'LEGENDARY' },
    { id: 'unique_game_300', name: 'Catalogue Legend', desc: 'Play 300 unique games', icon: '📚', rarity: 'LEGENDARY' },
    { id: 'unique_game_500', name: 'Library Myth', desc: 'Play 500 unique games', icon: '🏛️', rarity: 'LEGENDARY' },
    { id: 'unique_game_750', name: 'Collection Immortal', desc: 'Play 750 unique games', icon: '🌌', rarity: 'LEGENDARY' },
    { id: 'unique_game_1000', name: 'Archive Deity', desc: 'Play 1000 unique games', icon: '⚡', rarity: 'LEGENDARY' },
    { id: 'unique_game_1500', name: 'Infinite Curator', desc: 'Play 1500 unique games', icon: '♾️', rarity: 'LEGENDARY' }
  ],
  genres: [
    // Action genre achievements
    { id: 'action_1', name: 'Action Initiate', desc: 'Play 1 Action game', icon: '⚔️', rarity: 'COMMON' },
    { id: 'action_5', name: 'Action Explorer', desc: 'Play 5 different Action games', icon: '🎯', rarity: 'COMMON' },
    { id: 'action_10', name: 'Action Fan', desc: 'Play 10 different Action games', icon: '🎯', rarity: 'RARE' },
    { id: 'action_25', name: 'Action Expert', desc: 'Play 25 different Action games', icon: '🔥', rarity: 'EPIC' },
    { id: 'action_50', name: 'Action Master', desc: 'Play 50 different Action games', icon: '💥', rarity: 'LEGENDARY' },
    
    // Adventure genre achievements
    { id: 'adventure_1', name: 'Adventure Initiate', desc: 'Play 1 Adventure game', icon: '🗺️', rarity: 'COMMON' },
    { id: 'adventure_5', name: 'Adventure Explorer', desc: 'Play 5 different Adventure games', icon: '🗺️', rarity: 'COMMON' },
    { id: 'adventure_10', name: 'Adventure Fan', desc: 'Play 10 different Adventure games', icon: '🗺️', rarity: 'RARE' },
    { id: 'adventure_25', name: 'Adventure Expert', desc: 'Play 25 different Adventure games', icon: '🔥', rarity: 'EPIC' },
    { id: 'adventure_50', name: 'Adventure Master', desc: 'Play 50 different Adventure games', icon: '💥', rarity: 'LEGENDARY' },
    
    // RPG genre achievements
    { id: 'rpg_1', name: 'RPG Initiate', desc: 'Play 1 RPG game', icon: '⚔️', rarity: 'COMMON' },
    { id: 'rpg_5', name: 'RPG Explorer', desc: 'Play 5 different RPG games', icon: '🎯', rarity: 'COMMON' },
    { id: 'rpg_10', name: 'RPG Fan', desc: 'Play 10 different RPG games', icon: '🎯', rarity: 'RARE' },
    { id: 'rpg_25', name: 'RPG Expert', desc: 'Play 25 different RPG games', icon: '🔥', rarity: 'EPIC' },
    { id: 'rpg_50', name: 'RPG Master', desc: 'Play 50 different RPG games', icon: '💥', rarity: 'LEGENDARY' },
    
    // Indie genre achievements
    { id: 'indie_1', name: 'Indie Initiate', desc: 'Play 1 Indie game', icon: '🎮', rarity: 'COMMON' },
    { id: 'indie_5', name: 'Indie Explorer', desc: 'Play 5 different Indie games', icon: '🎮', rarity: 'COMMON' },
    { id: 'indie_10', name: 'Indie Fan', desc: 'Play 10 different Indie games', icon: '🎮', rarity: 'RARE' },
    { id: 'indie_25', name: 'Indie Expert', desc: 'Play 25 different Indie games', icon: '🔥', rarity: 'EPIC' },
    { id: 'indie_50', name: 'Indie Master', desc: 'Play 50 different Indie games', icon: '💥', rarity: 'LEGENDARY' },
    
    // Puzzle genre achievements
    { id: 'puzzle_1', name: 'Puzzle Initiate', desc: 'Play 1 Puzzle game', icon: '🧩', rarity: 'COMMON' },
    { id: 'puzzle_5', name: 'Puzzle Explorer', desc: 'Play 5 different Puzzle games', icon: '🧩', rarity: 'COMMON' },
    { id: 'puzzle_10', name: 'Puzzle Fan', desc: 'Play 10 different Puzzle games', icon: '🧩', rarity: 'RARE' },
    { id: 'puzzle_25', name: 'Puzzle Expert', desc: 'Progress through 25 Puzzle games', icon: '🔥', rarity: 'EPIC' },
    { id: 'puzzle_50', name: 'Puzzle Master', desc: 'Play 50 different Puzzle games', icon: '💥', rarity: 'LEGENDARY' },
    
    // Simulation genre achievements
    { id: 'simulation_1', name: 'Simulation Initiate', desc: 'Play 1 Simulation game', icon: '🏗️', rarity: 'COMMON' },
    { id: 'simulation_5', name: 'Simulation Explorer', desc: 'Play 5 different Simulation games', icon: '🏗️', rarity: 'COMMON' },
    { id: 'simulation_10', name: 'Simulation Fan', desc: 'Play 10 different Simulation games', icon: '🏗️', rarity: 'RARE' },
    { id: 'simulation_25', name: 'Simulation Expert', desc: 'Play 25 different Simulation games', icon: '🔥', rarity: 'EPIC' },
    { id: 'simulation_50', name: 'Simulation Master', desc: 'Play 50 different Simulation games', icon: '💥', rarity: 'LEGENDARY' },
    
    // Strategy genre achievements
    { id: 'strategy_1', name: 'Strategy Initiate', desc: 'Play 1 Strategy game', icon: '♟️', rarity: 'COMMON' },
    { id: 'strategy_5', name: 'Strategy Explorer', desc: 'Play 5 different Strategy games', icon: '♟️', rarity: 'COMMON' },
    { id: 'strategy_10', name: 'Strategy Fan', desc: 'Play 10 different Strategy games', icon: '♟️', rarity: 'RARE' },
    { id: 'strategy_25', name: 'Strategy Expert', desc: 'Play 25 different Strategy games', icon: '🔥', rarity: 'EPIC' },
    { id: 'strategy_50', name: 'Strategy Master', desc: 'Play 50 different Strategy games', icon: '💥', rarity: 'LEGENDARY' },
    
    // Shooter genre achievements
    { id: 'shooter_1', name: 'Shooter Initiate', desc: 'Play 1 Shooter game', icon: '🔫', rarity: 'COMMON' },
    { id: 'shooter_5', name: 'Shooter Explorer', desc: 'Play 5 different Shooter games', icon: '🔫', rarity: 'COMMON' },
    { id: 'shooter_10', name: 'Shooter Fan', desc: 'Play 10 different Shooter games', icon: '🔫', rarity: 'RARE' },
    { id: 'shooter_25', name: 'Shooter Expert', desc: 'Play 25 different Shooter games', icon: '🔥', rarity: 'EPIC' },
    { id: 'shooter_50', name: 'Shooter Master', desc: 'Play 50 different Shooter games', icon: '💥', rarity: 'LEGENDARY' },
    
    // Racing genre achievements
    { id: 'racing_1', name: 'Racing Initiate', desc: 'Play 1 Racing game', icon: '🏁', rarity: 'COMMON' },
    { id: 'racing_5', name: 'Racing Explorer', desc: 'Play 5 different Racing games', icon: '🏁', rarity: 'COMMON' },
    { id: 'racing_10', name: 'Racing Fan', desc: 'Play 10 different Racing games', icon: '🏁', rarity: 'RARE' },
    { id: 'racing_25', name: 'Racing Expert', desc: 'Play 25 different Racing games', icon: '🔥', rarity: 'EPIC' },
    { id: 'racing_50', name: 'Racing Master', desc: 'Play 50 different Racing games', icon: '💥', rarity: 'LEGENDARY' },
    
    // Platformer genre achievements
    { id: 'platformer_1', name: 'Platformer Initiate', desc: 'Play 1 Platformer game', icon: '🦘', rarity: 'COMMON' },
    { id: 'platformer_5', name: 'Platformer Explorer', desc: 'Play 5 different Platformer games', icon: '🦘', rarity: 'COMMON' },
    { id: 'platformer_10', name: 'Platformer Fan', desc: 'Play 10 different Platformer games', icon: '🦘', rarity: 'RARE' },
    { id: 'platformer_25', name: 'Platformer Expert', desc: 'Play 25 different Platformer games', icon: '🔥', rarity: 'EPIC' },
    { id: 'platformer_50', name: 'Platformer Master', desc: 'Play 50 different Platformer games', icon: '💥', rarity: 'LEGENDARY' },
    
    // Horror genre achievements
    { id: 'horror_1', name: 'Horror Initiate', desc: 'Play 1 Horror game', icon: '😱', rarity: 'COMMON' },
    { id: 'horror_5', name: 'Horror Explorer', desc: 'Play 5 different Horror games', icon: '😱', rarity: 'COMMON' },
    { id: 'horror_10', name: 'Horror Fan', desc: 'Play 10 different Horror games', icon: '😱', rarity: 'RARE' },
    { id: 'horror_25', name: 'Horror Expert', desc: 'Play 25 different Horror games', icon: '🔥', rarity: 'EPIC' },
    { id: 'horror_50', name: 'Horror Master', desc: 'Play 50 different Horror games', icon: '💥', rarity: 'LEGENDARY' },
    
    // Fighting genre achievements
    { id: 'fighting_1', name: 'Fighting Initiate', desc: 'Play 1 Fighting game', icon: '🥊', rarity: 'COMMON' },
    { id: 'fighting_5', name: 'Fighting Explorer', desc: 'Play 5 different Fighting games', icon: '🥊', rarity: 'COMMON' },
    { id: 'fighting_10', name: 'Fighting Fan', desc: 'Play 10 different Fighting games', icon: '🥊', rarity: 'RARE' },
    { id: 'fighting_25', name: 'Fighting Expert', desc: 'Play 25 different Fighting games', icon: '🔥', rarity: 'EPIC' },
    { id: 'fighting_50', name: 'Fighting Master', desc: 'Play 50 different Fighting games', icon: '💥', rarity: 'LEGENDARY' },
    
    // Sports genre achievements
    { id: 'sports_1', name: 'Sports Initiate', desc: 'Play 1 Sports game', icon: '⚽', rarity: 'COMMON' },
    { id: 'sports_5', name: 'Sports Explorer', desc: 'Play 5 different Sports games', icon: '⚽', rarity: 'COMMON' },
    { id: 'sports_10', name: 'Sports Fan', desc: 'Play 10 different Sports games', icon: '⚽', rarity: 'RARE' },
    { id: 'sports_25', name: 'Sports Expert', desc: 'Play 25 different Sports games', icon: '🔥', rarity: 'EPIC' },
    { id: 'sports_50', name: 'Sports Master', desc: 'Play 50 different Sports games', icon: '💥', rarity: 'LEGENDARY' },
    
    // Roguelike genre achievements
    { id: 'roguelike_1', name: 'Roguelike Initiate', desc: 'Play 1 Roguelike game', icon: '🎲', rarity: 'COMMON' },
    { id: 'roguelike_5', name: 'Roguelike Explorer', desc: 'Play 5 different Roguelike games', icon: '🎲', rarity: 'COMMON' },
    { id: 'roguelike_10', name: 'Roguelike Fan', desc: 'Play 10 different Roguelike games', icon: '🎲', rarity: 'RARE' },
    { id: 'roguelike_25', name: 'Roguelike Expert', desc: 'Play 25 different Roguelike games', icon: '🔥', rarity: 'EPIC' },
    { id: 'roguelike_50', name: 'Roguelike Master', desc: 'Play 50 different Roguelike games', icon: '💥', rarity: 'LEGENDARY' },
    
    // Management genre achievements
    { id: 'management_1', name: 'Management Initiate', desc: 'Play 1 Management game', icon: '📋', rarity: 'COMMON' },
    { id: 'management_5', name: 'Management Explorer', desc: 'Play 5 different Management games', icon: '📋', rarity: 'COMMON' },
    { id: 'management_10', name: 'Management Fan', desc: 'Play 10 different Management games', icon: '📋', rarity: 'RARE' },
    { id: 'management_25', name: 'Management Expert', desc: 'Play 25 different Management games', icon: '🔥', rarity: 'EPIC' },
    { id: 'management_50', name: 'Management Master', desc: 'Play 50 different Management games', icon: '💥', rarity: 'LEGENDARY' },
    
    // Survival genre achievements
    { id: 'survival_1', name: 'Survival Initiate', desc: 'Play 1 Survival game', icon: '🏕️', rarity: 'COMMON' },
    { id: 'survival_5', name: 'Survival Explorer', desc: 'Play 5 different Survival games', icon: '🏕️', rarity: 'COMMON' },
    { id: 'survival_10', name: 'Survival Fan', desc: 'Play 10 different Survival games', icon: '🏕️', rarity: 'RARE' },
    { id: 'survival_25', name: 'Survival Expert', desc: 'Play 25 different Survival games', icon: '🔥', rarity: 'EPIC' },
    { id: 'survival_50', name: 'Survival Master', desc: 'Play 50 different Survival games', icon: '💥', rarity: 'LEGENDARY' },
    
    // Genre completion rate achievements (based on behavior profile)
    { id: 'genre_completion_50', name: 'Genre Specialist', desc: 'Achieve 50%+ completion rate in one genre', icon: '🎯', rarity: 'RARE' },
    { id: 'genre_completion_70', name: 'Genre Expert', desc: 'Achieve 70%+ completion rate in one genre', icon: '⭐', rarity: 'EPIC' },
    { id: 'genre_completion_90', name: 'Genre Perfectionist', desc: 'Achieve 90%+ completion rate in one genre', icon: '💯', rarity: 'LEGENDARY' }
  ],
  sessions: [
    // Session warrior achievements - single session length milestones
    { id: 'session_warrior_30', name: 'Session Starter', desc: 'Complete a 30-minute gaming session', icon: '⏱️', rarity: 'COMMON' },
    { id: 'session_warrior_1h', name: 'Session Player', desc: 'Complete a 1-hour gaming session', icon: '⏰', rarity: 'COMMON' },
    { id: 'session_warrior_2h', name: 'Session Enthusiast', desc: 'Complete a 2-hour gaming session', icon: '🎮', rarity: 'RARE' },
    { id: 'session_warrior_3h', name: 'Session Marathon', desc: 'Complete a 3-hour gaming session', icon: '🏃', rarity: 'RARE' },
    { id: 'session_warrior_4h', name: 'Session Legend', desc: 'Complete a 4-hour gaming session', icon: '⚡', rarity: 'EPIC' },
    { id: 'session_warrior_6h', name: 'Session Master', desc: 'Complete a 6-hour gaming session', icon: '🔥', rarity: 'EPIC' },
    { id: 'session_warrior_8h', name: 'Session Immortal', desc: 'Complete an 8-hour gaming session', icon: '👑', rarity: 'LEGENDARY' },
    { id: 'session_warrior_10h', name: 'Session Godlike', desc: 'Complete a 10-hour gaming session', icon: '🌟', rarity: 'LEGENDARY' },
    { id: 'session_warrior_12h', name: 'Session Myth', desc: 'Complete a 12-hour gaming session', icon: '💫', rarity: 'LEGENDARY' }
  ],
  daily: [
    { id: 'daily_15min', name: 'Daily Quickie', desc: 'Play 15 minutes in one day', icon: '⏰', rarity: 'COMMON' },
    { id: 'daily_30min', name: 'Daily Gamer', desc: 'Play 30 minutes in one day', icon: '⏰', rarity: 'COMMON' },
    { id: 'daily_1hour', name: 'Daily Player', desc: 'Play 1 hour in one day', icon: '⏰', rarity: 'COMMON' },
    { id: 'daily_2hours', name: 'Daily Enthusiast', desc: 'Play 2 hours in one day', icon: '⏰', rarity: 'RARE' },
    { id: 'daily_3hours', name: 'Daily Marathon', desc: 'Play 3 hours in one day', icon: '⏰', rarity: 'EPIC' },
    { id: 'daily_5hours', name: 'Daily Legend', desc: 'Play 5 hours in one day', icon: '⏰', rarity: 'LEGENDARY' },
    { id: 'daily_7hours', name: 'Daily Immortal', desc: 'Play 7 hours in one day', icon: '🔥', rarity: 'LEGENDARY' },
    { id: 'daily_10hours', name: 'Daily Godlike', desc: 'Play 10 hours in one day', icon: '👑', rarity: 'LEGENDARY' },

    // Session streaks
    { id: 'daily_3sessions', name: 'Session Sprinter', desc: 'Complete 3 gaming sessions today', icon: '🎮', rarity: 'COMMON' },
    { id: 'daily_5sessions', name: 'Session Grinder', desc: 'Complete 5 gaming sessions today', icon: '🎯', rarity: 'RARE' },
    { id: 'daily_10sessions', name: 'Session Machine', desc: 'Complete 10 gaming sessions today', icon: '🏆', rarity: 'EPIC' },

    // Games/genres variety
    { id: 'daily_3games', name: 'Game Sampler', desc: 'Play 3 different games today', icon: '🕹️', rarity: 'COMMON' },
    { id: 'daily_5games', name: 'Library Tour', desc: 'Play 5 different games today', icon: '🧭', rarity: 'RARE' },
    { id: 'daily_3genres', name: 'Genre Hopper', desc: 'Play 3 different genres today', icon: '🎨', rarity: 'COMMON' },
    { id: 'daily_5genres', name: 'Genre Cyclone', desc: 'Play 5 different genres today', icon: '🌪️', rarity: 'RARE' },

    // Mood/platform variety
    { id: 'daily_2moods', name: 'Mood Mixer', desc: 'Use 2 different moods today', icon: '🎭', rarity: 'COMMON' },
    { id: 'daily_3moods', name: 'Mood Maestro', desc: 'Use 3 different moods today', icon: '🎷', rarity: 'RARE' },
    { id: 'daily_all_moods', name: 'Mood Cyclone', desc: 'Use all moods in a single day', icon: '🌈', rarity: 'EPIC' },
    { id: 'daily_2platforms', name: 'Platform Explorer', desc: 'Play on 2 platforms today', icon: '🖥️', rarity: 'COMMON' },
    { id: 'daily_3platforms', name: 'Platform Polyglot', desc: 'Play on 3 platforms today', icon: '💻', rarity: 'RARE' },

    // Feature usage
    { id: 'daily_perfect_play', name: 'Perfect Start', desc: 'Use Perfect Play today', icon: '✨', rarity: 'COMMON' },
    { id: 'daily_surprise', name: 'Daily Surprise', desc: 'Use Surprise Me today', icon: '🎁', rarity: 'COMMON' },
    { id: 'daily_rediscover', name: 'Nostalgia Spark', desc: 'Rediscover a game today', icon: '🔮', rarity: 'COMMON' },
    { id: 'daily_share', name: 'Share Snapshot', desc: 'Share your library today', icon: '📤', rarity: 'RARE' }
  ],
  weekly: [
    // Playtime milestones
    { id: 'weekly_2hours', name: 'Weekend Warrior', desc: 'Play 2 hours in a week', icon: '�️', rarity: 'COMMON' },
    { id: 'weekly_5hours', name: 'Weekly Gamer', desc: 'Play 5 hours in a week', icon: '�️', rarity: 'COMMON' },
    { id: 'weekly_10hours', name: 'Weekly Enthusiast', desc: 'Play 10 hours in a week', icon: '�️', rarity: 'RARE' },
    { id: 'weekly_20hours', name: 'Weekly Marathon', desc: 'Play 20 hours in a week', icon: '�️', rarity: 'EPIC' },
    { id: 'weekly_40hours', name: 'Weekly Legend', desc: 'Play 40 hours in a week', icon: '�️', rarity: 'LEGENDARY' },
    { id: 'weekly_60hours', name: 'Weekly Immortal', desc: 'Play 60 hours in a week', icon: '🔥', rarity: 'LEGENDARY' },
    { id: 'weekly_100hours', name: 'Weekly Godlike', desc: 'Play 100 hours in a week', icon: '👑', rarity: 'LEGENDARY' },

    // Session volume
    { id: 'weekly_7sessions', name: 'Routine Builder', desc: 'Complete 7 sessions in a week', icon: '📆', rarity: 'COMMON' },
    { id: 'weekly_14sessions', name: 'Weekly Grinder', desc: 'Complete 14 sessions in a week', icon: '📆', rarity: 'RARE' },
    { id: 'weekly_21sessions', name: 'Weekly Machine', desc: 'Complete 21 sessions in a week', icon: '📆', rarity: 'EPIC' },

    // Variety goals
    { id: 'weekly_5games', name: 'Weekly Sampler', desc: 'Play 5 different games in a week', icon: '🕹️', rarity: 'COMMON' },
    { id: 'weekly_10games', name: 'Weekly Explorer', desc: 'Play 10 different games in a week', icon: '🧭', rarity: 'RARE' },
    { id: 'weekly_15games', name: 'Library Sprint', desc: 'Play 15 different games in a week', icon: '🚀', rarity: 'EPIC' },
    { id: 'weekly_4genres', name: 'Palette Switcher', desc: 'Play 4 genres in a week', icon: '🎨', rarity: 'RARE' },
    { id: 'weekly_6genres', name: 'Genre Cyclone', desc: 'Play 6 genres in a week', icon: '🌪️', rarity: 'EPIC' },
    { id: 'weekly_3moods', name: 'Mood Juggler', desc: 'Use 3 moods in a week', icon: '🎭', rarity: 'COMMON' },
    { id: 'weekly_4moods', name: 'Mood Virtuoso', desc: 'Use 4 moods in a week', icon: '🎷', rarity: 'RARE' },

    // Consistency
    { id: 'weekly_4days', name: 'Cadence Keeper', desc: 'Have activity on 4 days of the week', icon: '🔥', rarity: 'RARE' },
    { id: 'weekly_6days', name: 'Weeklong Presence', desc: 'Have activity on 6 days of the week', icon: '🔥', rarity: 'EPIC' },

    // Feature usage
    { id: 'weekly_perfect_5', name: 'Perfect Week', desc: 'Use Perfect Play 5 times in a week', icon: '✨', rarity: 'RARE' },
    { id: 'weekly_surprise_7', name: 'Mystery Tour', desc: 'Use Surprise Me 7 times in a week', icon: '🎁', rarity: 'RARE' },
    { id: 'weekly_rediscover_3', name: 'Weekly Nostalgia', desc: 'Rediscover 3 games in a week', icon: '🔮', rarity: 'RARE' },
    { id: 'weekly_share_3', name: 'Weekly Hype Squad', desc: 'Share 3 times in a week', icon: '📤', rarity: 'RARE' },

    // Streaks
    { id: 'weekly_streak_3', name: 'Streak Spark', desc: 'Maintain a 3-week activity streak', icon: '🔥', rarity: 'RARE' },
    { id: 'weekly_streak_5', name: 'Streak Surfer', desc: 'Maintain a 5-week activity streak', icon: '🔥', rarity: 'EPIC' },
    { id: 'weekly_streak_7', name: 'Weekly Streak Legend', desc: 'Maintain a 7-week activity streak', icon: '🔥', rarity: 'LEGENDARY' }
  ],
  monthly: [
    // Playtime marathons
    { id: 'monthly_10hours', name: 'Monthly Player', desc: 'Play 10 hours in a month', icon: '📆', rarity: 'COMMON' },
    { id: 'monthly_25hours', name: 'Monthly Gamer', desc: 'Play 25 hours in a month', icon: '📆', rarity: 'COMMON' },
    { id: 'monthly_50hours', name: 'Monthly Enthusiast', desc: 'Play 50 hours in a month', icon: '📆', rarity: 'RARE' },
    { id: 'monthly_100hours', name: 'Monthly Marathon', desc: 'Play 100 hours in a month', icon: '📆', rarity: 'EPIC' },
    { id: 'monthly_150hours', name: 'Monthly Immortal', desc: 'Play 150 hours in a month', icon: '🔥', rarity: 'LEGENDARY' },
    { id: 'monthly_200hours', name: 'Monthly Godlike', desc: 'Play 200 hours in a month', icon: '👑', rarity: 'LEGENDARY' },
    { id: 'monthly_300hours', name: 'Monthly Mythic', desc: 'Play 300 hours in a month', icon: '🌌', rarity: 'LEGENDARY' },

    // Sessions & consistency
    { id: 'monthly_30sessions', name: 'Monthly Habit', desc: 'Complete 30 sessions in a month', icon: '📈', rarity: 'RARE' },
    { id: 'monthly_50sessions', name: 'Monthly Grinder', desc: 'Complete 50 sessions in a month', icon: '📉', rarity: 'EPIC' },
    { id: 'monthly_75sessions', name: 'Monthly Machine', desc: 'Complete 75 sessions in a month', icon: '🏆', rarity: 'LEGENDARY' },
    { id: 'monthly_10days', name: 'Monthly Momentum', desc: 'Be active on 10 days in a month', icon: '🔥', rarity: 'RARE' },
    { id: 'monthly_20days', name: 'Monthly Presence', desc: 'Be active on 20 days in a month', icon: '🔥', rarity: 'EPIC' },
    { id: 'monthly_25days', name: 'Monthly Everpresent', desc: 'Be active on 25 days in a month', icon: '🔥', rarity: 'LEGENDARY' },

    // Unlock & variety focus
    { id: 'monthly_unlock_5', name: 'Monthly Unlocker', desc: 'Unlock 5 achievements in a month', icon: '🔓', rarity: 'RARE' },
    { id: 'monthly_unlock_10', name: 'Monthly Achievement Hunter', desc: 'Unlock 10 achievements in a month', icon: '🔑', rarity: 'EPIC' },
    { id: 'monthly_unlock_15', name: 'Monthly Completionist', desc: 'Unlock 15 achievements in a month', icon: '🏅', rarity: 'LEGENDARY' },
    { id: 'monthly_10genres', name: 'Monthly Genre Tour', desc: 'Play 10 genres in a month', icon: '🎨', rarity: 'RARE' },
    { id: 'monthly_15genres', name: 'Monthly Genre Master', desc: 'Play 15 genres in a month', icon: '🌈', rarity: 'EPIC' },
    { id: 'monthly_5platforms', name: 'Platform Voyager', desc: 'Play on 5 platforms this month', icon: '💻', rarity: 'EPIC' },
    { id: 'monthly_all_moods', name: 'Monthly Mood Maestro', desc: 'Use all moods in a month', icon: '🎭', rarity: 'LEGENDARY' },

    // Feature usage
    { id: 'monthly_perfect_10', name: 'Perfect Planner', desc: 'Use Perfect Play 10 times in a month', icon: '✨', rarity: 'RARE' },
    { id: 'monthly_surprise_15', name: 'Mystery Marathon', desc: 'Use Surprise Me 15 times in a month', icon: '🎁', rarity: 'EPIC' },
    { id: 'monthly_rediscover_5', name: 'Monthly Archivist', desc: 'Rediscover 5 games in a month', icon: '🔮', rarity: 'RARE' },
    { id: 'monthly_share_5', name: 'Monthly Broadcaster', desc: 'Share 5 times in a month', icon: '📤', rarity: 'EPIC' }
  ],
  yearly: [
    // Playtime legends
    { id: 'yearly_100hours', name: 'Yearly Player', desc: 'Play 100 hours in a year', icon: '🎊', rarity: 'COMMON' },
    { id: 'yearly_500hours', name: 'Yearly Gamer', desc: 'Play 500 hours in a year', icon: '🎊', rarity: 'RARE' },
    { id: 'yearly_1000hours', name: 'Yearly Legend', desc: 'Play 1000 hours in a year', icon: '🎊', rarity: 'EPIC' },
    { id: 'yearly_1500hours', name: 'Yearly Immortal', desc: 'Play 1500 hours in a year', icon: '🔥', rarity: 'LEGENDARY' },
    { id: 'yearly_2000hours', name: 'Yearly Godlike', desc: 'Play 2000 hours in a year', icon: '👑', rarity: 'LEGENDARY' },

    // Sessions & presence
    { id: 'yearly_200sessions', name: 'Yearly Routine', desc: 'Complete 200 sessions in a year', icon: '📊', rarity: 'RARE' },
    { id: 'yearly_365sessions', name: 'Daily Devotee', desc: 'Complete 365 sessions in a year', icon: '📅', rarity: 'LEGENDARY' },
    { id: 'yearly_300days', name: 'Yearly Everpresent', desc: 'Be active on 300 days in a year', icon: '🔥', rarity: 'EPIC' },
    { id: 'yearly_350days', name: 'Yearly Unbroken', desc: 'Be active on 350 days in a year', icon: '🔥', rarity: 'LEGENDARY' },

    // Unlock & variety focus
    { id: 'yearly_unlock_50', name: 'Yearly Unlocker', desc: 'Unlock 50 achievements in a year', icon: '🔓', rarity: 'RARE' },
    { id: 'yearly_unlock_100', name: 'Yearly Achievement Hunter', desc: 'Unlock 100 achievements in a year', icon: '🔑', rarity: 'EPIC' },
    { id: 'yearly_unlock_150', name: 'Yearly Completionist', desc: 'Unlock 150 achievements in a year', icon: '🏅', rarity: 'LEGENDARY' },
    { id: 'yearly_20genres', name: 'Yearly Genre Tour', desc: 'Play 20 genres in a year', icon: '🎨', rarity: 'RARE' },
    { id: 'yearly_25genres', name: 'Yearly Genre Master', desc: 'Play 25 genres in a year', icon: '🌈', rarity: 'EPIC' },
    { id: 'yearly_10platforms', name: 'Platform Globe Trotter', desc: 'Play on 10 platforms in a year', icon: '🌍', rarity: 'LEGENDARY' },
    { id: 'yearly_mood_100', name: 'Mood Marathoner', desc: 'Use moods 100 times in a year', icon: '🎭', rarity: 'EPIC' },

    // Feature usage
    { id: 'yearly_perfect_50', name: 'Perfect Year', desc: 'Use Perfect Play 50 times in a year', icon: '✨', rarity: 'RARE' },
    { id: 'yearly_surprise_100', name: 'Yearly Mystery Tour', desc: 'Use Surprise Me 100 times in a year', icon: '🎁', rarity: 'EPIC' },
    { id: 'yearly_rediscover_25', name: 'Yearly Archivist', desc: 'Rediscover 25 games in a year', icon: '🔮', rarity: 'RARE' },
    { id: 'yearly_share_25', name: 'Yearly Broadcaster', desc: 'Share 25 times in a year', icon: '📤', rarity: 'EPIC' },

    // Streaks
    { id: 'yearly_streak_30', name: 'Yearly Spark', desc: 'Maintain a 30-day streak of active months', icon: '🔥', rarity: 'RARE' },
    { id: 'yearly_streak_50', name: 'Yearly Blaze', desc: 'Maintain a 50-day streak of active months', icon: '🔥', rarity: 'EPIC' },
    { id: 'yearly_streak_100', name: 'Yearly Inferno', desc: 'Maintain a 100-day streak of active months', icon: '🔥', rarity: 'LEGENDARY' }
  ]
};

export const MOOD_SLUGS = ['relaxed', 'social', 'creative', 'focused', 'competitive'];

export const GENRE_SLUGS = Array.from(new Set((ACHIEVEMENTS.genres || []).map(({ id }) => id.split('_')[0])));
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
export const GENRE_THRESHOLD_MAP = createThresholdMap(ACHIEVEMENTS.genres);
export const FEATURE_THRESHOLD_MAP = createThresholdMap(ACHIEVEMENTS.features);
export const SESSION_THRESHOLD_MAP = createThresholdMap(SESSION_ACHIEVEMENTS, ['session']);
export const PLAYTIME_THRESHOLD_MAP = createThresholdMap(HOUR_ACHIEVEMENTS, ['hour']);
export const UNIQUE_GAME_THRESHOLD_MAP = createThresholdMap(ACHIEVEMENTS.uniqueGames, ['unique_game']);

export const ROLLING_FEATURE_KEY_MAP = {
  perfect_play: 'perfectPlay',
  surprise: 'surpriseMe',
  rediscover: 'rediscover',
  continue_playing: 'continuePlaying',
  share: 'share'
};

export const MOOD_VARIETY_TARGETS = [
  { id: 'mood_variety_10', value: 10 },
  { id: 'mood_master', value: 25 },
  { id: 'mood_legend', value: 50 }
];

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
  if (!slug) return null;
  return GENRE_SLUGS.includes(slug) ? slug : null;
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
    const unlockedCount = Array.isArray(unlockedIds) ? unlockedIds.length : AchievementTracker.getUnlockedAchievements().length;
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

  static getMoodStats() {
    try {
      return StorageService.get('moodStats', {});
    } catch (error) {
      StorageService.set('moodStats', {});
      return {};
    }
  }

  static trackMoodUsage(mood) {
    const stats = this.getMoodStats();
    const weekKey = this.getCurrentWeekKey();
    
    if (!stats[weekKey]) {
      stats[weekKey] = {};
    }
    
    stats[weekKey][mood] = (stats[weekKey][mood] || 0) + 1;
    StorageService.set('moodStats', stats);
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
    if (periodState.key !== currentKey || !Array.isArray(periodState.ids) || periodState.ids.length === 0) {
      return this.rotatePeriodAssignments(period, currentKey);
    }
    return periodState.ids;
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
    const pointsMap = {
      // Library achievements
      'first_game': 10,
      'collector_5': 25,
      'collector_10': 50,
      'collector_25': 100,
      'collector_50': 200,
      'collector_100': 300,
      'collector_250': 500,
      'collector_500': 750,
      'collector_750': 1000,
      'collector_1500': 1500,
      'collector_2500': 2000,
      'variety_3': 30,
      'variety_5': 60,
      'platform_diverse': 40,

      // Time achievements
      'hour_1': 15,
      'hour_5': 30,
      'hour_10': 60,
      'hour_25': 125,
      'hour_50': 250,
      'hour_100': 500,
      'hour_250': 750,
      'hour_500': 1000,
      'hour_1000': 1500,
      'hour_1500': 2000,
      'hour_2500': 3200,
      'hour_5000': 5000,
      'hour_7500': 6500,
      'hour_10000': 8000,
      'session_1': 5,
      'session_3': 10,
      'session_5': 15,
      'session_10': 20,
      'session_15': 35,
      'session_30': 50,
      'session_50': 90,
      'session_75': 130,
      'session_100': 180,
      'session_150': 260,
      'session_200': 320,
      'session_300': 420,
      'session_400': 600,
      'session_500': 800,
      'session_750': 1100,
      'session_1000': 1500,
      'session_1500': 2000,
      'session_2000': 2600,
      'session_3000': 3400,
      'session_4000': 4200,
      'session_5000': 5000,

      // Mood achievements
      'relaxed_5': 25,
      'relaxed_10': 50,
      'relaxed_25': 100,
      'relaxed_50': 200,
      'relaxed_100': 400,
      'social_5': 25,
      'social_10': 50,
      'social_25': 100,
      'social_50': 200,
      'social_100': 400,
      'creative_5': 25,
      'creative_10': 50,
      'creative_25': 100,
      'creative_50': 200,
      'creative_100': 400,
      'focused_5': 25,
      'focused_10': 50,
      'focused_25': 100,
      'focused_50': 200,
      'focused_100': 400,
      'competitive_5': 25,
      'competitive_10': 50,
      'competitive_25': 100,
      'competitive_50': 200,
      'competitive_100': 400,
      'mood_explorer': 125,
      'mood_variety_10': 250,
      'mood_master': 500,
      'mood_legend': 1000,
      'perfect_play_1': 35,
      'perfect_play_5': 75,
      'perfect_play_10': 150,
      'perfect_play_25': 300,
      'perfect_play_50': 600,
      'perfect_play_100': 1200,
      'patreon_supporter': 0,
      'surprise_1': 25,
      'surprise_5': 55,
      'surprise_10': 110,
      'surprise_25': 225,
      'surprise_50': 450,
      'surprise_100': 900,
      'rediscover_1': 20,
      'rediscover_5': 45,
      'rediscover_10': 90,
      'rediscover_25': 180,
      'rediscover_50': 350,
      'rediscover_100': 700,
      'share_1': 30,
      'share_3': 65,
      'share_5': 120,
      'share_10': 200,
      'share_25': 400,
      'share_50': 800,
      'filter_10': 40,
      'filter_25': 90,
      'filter_50': 180,
      'filter_100': 350,
      'filter_250': 700,
      'sort_5': 35,
      'sort_15': 80,
      'sort_30': 160,
      'sort_50': 300,
      'sort_100': 600,
      'export_1': 45,
      'export_5': 100,
      'export_10': 200,
      'export_25': 240,
      'export_50': 480,
      'settings_3': 30,
      'quest_total_1': 15,
      'quest_total_10': 80,
      'quest_total_25': 180,
      'quest_total_50': 360,
      'quest_daily_10': 90,
      'quest_weekly_10': 140,
      'quest_monthly_5': 240,
      'quest_yearly_3': 420,
      'first_session': 25,
      'settings_8': 110,
      'settings_15': 200,
      'settings_25': 350,
      'settings_50': 700,
      'mood_changes_10': 60,
      'mood_changes_25': 125,
      'mood_changes_50': 250,
      'mood_changes_100': 500,
      'theme_changes_5': 40,
      'theme_changes_10': 80,
      'theme_changes_25': 160,
      'theme_changes_50': 320,

      // Genre achievements
      'genre_rpg_10': 80,
      'genre_rpg_25': 180,
      'genre_rpg_50': 350,
      'genre_rpg_100': 700,
      'genre_action_10': 70,
      'genre_action_25': 160,
      'genre_action_50': 320,
      'genre_action_100': 650,
      'genre_strategy_10': 90,
      'genre_strategy_25': 200,
      'genre_strategy_50': 400,
      'genre_strategy_100': 800,
      'genre_adventure_10': 75,
      'genre_adventure_25': 170,
      'genre_adventure_50': 340,
      'genre_adventure_100': 680,
      'genre_simulation_10': 65,
      'genre_simulation_25': 140,
      'genre_simulation_50': 280,
      'genre_simulation_100': 560,
      'genre_horror_5': 60,
      'genre_horror_15': 135,
      'genre_horror_30': 270,
      'genre_puzzle_10': 70,
      'genre_puzzle_25': 155,
      'genre_puzzle_50': 310,
      'genre_racing_10': 65,
      'genre_racing_25': 145,
      'genre_racing_50': 290,
      'genre_sports_10': 60,
      'genre_sports_25': 135,
      'genre_sports_50': 270,
      'genre_fighting_5': 55,
      'genre_fighting_15': 125,
      'genre_fighting_30': 250,
      'genre_shooter_10': 75,
      'genre_shooter_25': 165,
      'genre_shooter_50': 330,
      'genre_indie_15': 105,
      'genre_indie_30': 225,
      'genre_indie_50': 450,
      'genre_platformer_10': 70,
      'genre_platformer_25': 155,
      'genre_platformer_50': 310,
      'genre_collector': 300,
      'genre_master': 500,
      'genre_legend': 800,
      'genre_completionist': 1200,

      // Daily achievements - lower XP since they reset daily
      'daily_15min': 10,
      'daily_30min': 15,
      'daily_1hour': 25,
      'daily_2hours': 40,
      'daily_3hours': 60,
      'daily_5hours': 100,
      'daily_7hours': 140,
      'daily_10hours': 200,
      'daily_3sessions': 12,
      'daily_5sessions': 20,
      'daily_10sessions': 35,
      'daily_perfect_play': 15,
      'daily_surprise': 12,
      'daily_rediscover': 10,
      'daily_share': 18,
      'daily_2moods': 8,
      'daily_3moods': 15,
      'daily_all_moods': 30,
      'daily_3genres': 12,
      'daily_5genres': 20,
      'daily_2platforms': 10,
      'daily_3platforms': 18,
      'daily_3games': 15,
      'daily_5games': 28,

      // Weekly achievements - moderate XP
      'weekly_2hours': 25,
      'weekly_5hours': 50,
      'weekly_10hours': 80,
      'weekly_20hours': 140,
      'weekly_40hours': 260,
      'weekly_60hours': 380,
      'weekly_100hours': 600,
      'weekly_7sessions': 60,
      'weekly_14sessions': 110,
      'weekly_21sessions': 180,
      'weekly_5games': 70,
      'weekly_10games': 140,
      'weekly_15games': 220,
      'weekly_4genres': 120,
      'weekly_6genres': 220,
      'weekly_3moods': 60,
      'weekly_4moods': 120,
      'weekly_4days': 130,
      'weekly_6days': 220,
      'weekly_streak_3': 80,
      'weekly_streak_5': 160,
      'weekly_streak_7': 320,
      'weekly_perfect_5': 100,
      'weekly_surprise_7': 130,
      'weekly_rediscover_3': 70,
      'weekly_share_3': 90,

      // Monthly achievements - higher XP for longer commitment
      'monthly_10hours': 120,
      'monthly_25hours': 180,
      'monthly_50hours': 240,
      'monthly_100hours': 420,
      'monthly_150hours': 600,
      'monthly_200hours': 900,
      'monthly_300hours': 1300,
      'monthly_30sessions': 170,
      'monthly_50sessions': 280,
      'monthly_75sessions': 430,
      'monthly_10days': 200,
      'monthly_20days': 360,
      'monthly_25days': 520,
      'monthly_unlock_5': 320,
      'monthly_unlock_10': 620,
      'monthly_unlock_15': 950,
      'monthly_10genres': 270,
      'monthly_15genres': 420,
      'monthly_5platforms': 320,
      'monthly_all_moods': 360,
      'monthly_perfect_10': 220,
      'monthly_surprise_15': 320,
      'monthly_rediscover_5': 170,
      'monthly_share_5': 260,

      // Yearly achievements - highest XP for epic challenges
      'yearly_100hours': 400,
      'yearly_500hours': 1000,
      'yearly_1000hours': 2000,
      'yearly_1500hours': 3000,
      'yearly_2000hours': 4000,
      'yearly_200sessions': 800,
      'yearly_365sessions': 2000,
      'yearly_300days': 1500,
      'yearly_350days': 2500,
      'yearly_unlock_50': 2000,
      'yearly_unlock_100': 4000,
      'yearly_unlock_150': 6000,
      'yearly_20genres': 1000,
      'yearly_25genres': 1500,
      'yearly_10platforms': 1200,
      'yearly_mood_100': 800,
      'yearly_perfect_50': 600,
      'yearly_surprise_100': 1000,
      'yearly_rediscover_25': 500,
      'yearly_share_25': 800,
      'yearly_streak_30': 1500,
      'yearly_streak_50': 2500,
      'yearly_streak_100': 5000,
    };

    return pointsMap;
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
    if (stats.totalSessions > 0 && !unlocked.includes('first_game')) {
      this.unlockAchievement('first_game');
    }
    if (stats.librarySize >= 5 && !unlocked.includes('collector_5')) {
      this.unlockAchievement('collector_5');
    }
    if (stats.librarySize >= 10 && !unlocked.includes('collector_10')) {
      this.unlockAchievement('collector_10');
    }
    if (stats.librarySize >= 25 && !unlocked.includes('collector_25')) {
      this.unlockAchievement('collector_25');
    }
    if (stats.librarySize >= 50 && !unlocked.includes('collector_50')) {
      this.unlockAchievement('collector_50');
    }
    if (stats.librarySize >= 100 && !unlocked.includes('collector_100')) {
      this.unlockAchievement('collector_100');
    }
    if (stats.librarySize >= 250 && !unlocked.includes('collector_250')) {
      this.unlockAchievement('collector_250');
    }
    if (stats.librarySize >= 500 && !unlocked.includes('collector_500')) {
      this.unlockAchievement('collector_500');
    }
    if (stats.librarySize >= 750 && !unlocked.includes('collector_750')) {
      this.unlockAchievement('collector_750');
    }
    if (stats.librarySize >= 1000 && !unlocked.includes('collector_1000')) {
      this.unlockAchievement('collector_1000');
    }
    if (stats.librarySize >= 1500 && !unlocked.includes('collector_1500')) {
      this.unlockAchievement('collector_1500');
    }
    if (stats.librarySize >= 2000 && !unlocked.includes('collector_2000')) {
      this.unlockAchievement('collector_2000');
    }

    // Time achievements (total)
    const totalPlaytime = stats.totalPlayTime;
    const playtimeThresholds = PLAYTIME_THRESHOLD_MAP.hour || [];
    playtimeThresholds.forEach(({ id, threshold }) => {
      if (totalPlaytime >= threshold && !unlocked.includes(id)) {
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

    // Specific genre achievements (e.g., action_1, action_5, ...)
    Object.entries(GENRE_THRESHOLD_MAP).forEach(([genre, thresholds = []]) => {
      const plays = genreStats[genre] || 0;
      thresholds.forEach(({ id, threshold }) => {
        if (plays >= threshold && !unlocked.includes(id)) {
          this.unlockAchievement(id);
          unlocked.push(id);
        }
      });
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

    // Quest completion achievements
    const questStats = this.getQuestCompletionStats();
    const questThresholds = [
      { id: 'quest_total_1', threshold: 1, count: questStats.totalCompleted },
      { id: 'quest_total_10', threshold: 10, count: questStats.totalCompleted },
      { id: 'quest_total_25', threshold: 25, count: questStats.totalCompleted },
      { id: 'quest_total_50', threshold: 50, count: questStats.totalCompleted },
      { id: 'quest_daily_10', threshold: 10, count: questStats.periodCounts.daily || 0 },
      { id: 'quest_weekly_10', threshold: 10, count: questStats.periodCounts.weekly || 0 },
      { id: 'quest_monthly_5', threshold: 5, count: questStats.periodCounts.monthly || 0 },
      { id: 'quest_yearly_3', threshold: 3, count: questStats.periodCounts.yearly || 0 }
    ];

    questThresholds.forEach(({ id, threshold, count }) => {
      if (count >= threshold && !unlocked.includes(id)) {
        this.unlockAchievement(id);
        unlocked.push(id);
      }
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
