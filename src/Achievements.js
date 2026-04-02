// Achievements.js - Achievement Display Component
import React, { useState, useEffect } from 'react';
import { Trophy, Star, Target, Clock, Gamepad2, Award, Zap, Crown, Medal, Flame, TrendingUp } from 'lucide-react';
import { ACHIEVEMENTS, AchievementTracker, AchievementStats } from './AchievementSystem';
import { RollingAchievementsTracker } from './services/RollingAchievementsTracker';
import NavBar from './NavBar';
import './Achievements.css';
import './FounderAchievement.css';

const getSessionStartTimestamp = (sessionEntry) => {
  if (!sessionEntry) {
    return null;
  }

  const rawStartTime = typeof sessionEntry === 'string'
    ? sessionEntry
    : sessionEntry.startTime;

  if (!rawStartTime) {
    return null;
  }

  const parsedStartTime = typeof rawStartTime === 'number'
    ? rawStartTime
    : Date.parse(rawStartTime);

  return Number.isNaN(parsedStartTime) ? null : parsedStartTime;
};

function Achievements({ theme }) {
  const [unlockedAchievements, setUnlockedAchievements] = useState([]);
  const [allAchievements, setAllAchievements] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [recentlyUnlocked, setRecentlyUnlocked] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // Statistics dashboard state
  const [totalPoints, setTotalPoints] = useState(0);
  const [rarestAchievement, setRarestAchievement] = useState(null);
  const [recentUnlocks, setRecentUnlocks] = useState([]);

  // Rolling achievements state
  const defaultRollingPeriod = () => ({
    playtime: 0,
    sessions: 0,
    gamesPlayed: 0,
    genresPlayed: 0,
    moodsUsed: 0,
    featuresUsed: {},
    activeDays: 0,
    streak: { current: 0, best: 0 }
  });

  const [rollingStats, setRollingStats] = useState({
    daily: defaultRollingPeriod(),
    weekly: defaultRollingPeriod(),
    monthly: defaultRollingPeriod(),
    yearly: defaultRollingPeriod()
  });

  const achievementCatalog = React.useMemo(() => (
    Object.entries(ACHIEVEMENTS).flatMap(([category, definitions]) =>
      (Array.isArray(definitions) ? definitions : []).map(definition => ({ ...definition, category }))
    )
  ), []);

  // Calculate statistics
  const calculateStatistics = React.useCallback(() => {
    // Calculate total points
    let points = 0;
    unlockedAchievements.forEach(achievementId => {
      points += getRewardPoints(achievementId) || 0;
    });
    
    // Find rarest unlocked achievement
    let rarest = null;
    let highestRarityWeight = 0;
    unlockedAchievements.forEach(achievementId => {
      const achievement = achievementCatalog.find(a => a.id === achievementId);
      if (achievement && achievement.rarity) {
        const rarityWeight = getRarityWeight(achievement.rarity);
        if (rarityWeight > highestRarityWeight) {
          highestRarityWeight = rarityWeight;
          rarest = achievement;
        }
      }
    });
    
    setTotalPoints(points);
    setRarestAchievement(rarest);
    
    // Get recent unlocks (last 5)
    const recent = AchievementTracker.getRecentlyUnlocked() || [];
    setRecentUnlocks(recent.slice(0, 5));
  }, [unlockedAchievements, achievementCatalog]);

  const getRarityWeight = (rarity) => {
    const weights = {
      'COMMON': 1,
      'RARE': 2,
      'EPIC': 3,
      'LEGENDARY': 4
    };
    return weights[rarity] || 0;
  };

  const getRarityColor = (rarity) => {
    const colors = {
      'COMMON': '#808080',
      'RARE': '#0066cc',
      'EPIC': '#9933cc',
      'LEGENDARY': '#ff6600'
    };
    return colors[rarity] || '#808080';
  };

  const formatStreak = (streak = {}) => {
    const current = streak.current || 0;
    const best = streak.best || 0;
    return `${current} current · ${best} best`;
  };

  // Progress hints for locked achievements
  const getProgressHint = (achievementId, progress) => {
    const hints = {
      // Library achievements
      'first_game': 'Launch any game from your library to unlock this achievement.',
      'collector_5': 'Add 5 games to your library. Import games or add them manually.',
      'collector_10': 'Add 10 games to your library. Keep building your collection!',
      'collector_25': 'Add 25 games to your library. You\'re becoming a serious collector!',
      'collector_50': 'Add 50 games to your library. Halfway to mastery!',
      'collector_100': 'Add 100 games to your library. You\'re a gaming enthusiast!',
      'collector_250': 'Add 250 games to your library. Impressive collection!',
      'collector_500': 'Add 500 games to your library. You\'re a true collector!',
      'collector_750': 'Add 750 games to your library. Nearly there!',
      'collector_1000': 'Add 1000 games to your library. Legendary collector!',
      'collector_2500': 'Add 2500 games to your library. Ultimate achievement!',
      'variety_3': 'Play games from 3 different genres. Try Action, RPG, and Puzzle!',
      'variety_5': 'Play games from 5 different genres. Explore new gaming experiences!',
      'platform_diverse': 'Use 3 different gaming platforms (Steam, Epic, etc.).',

      // Time achievements
      'hour_1': 'Play games for 1 hour total. Every minute counts!',
      'hour_5': 'Play games for 5 hours total. Keep gaming regularly!',
      'hour_10': 'Play games for 10 hours total. You\'re dedicated!',
      'hour_25': 'Play games for 25 hours total. Marathon gamer!',
      'hour_50': 'Play games for 50 hours total. Gaming legend!',
      'hour_100': 'Play games for 100 hours total. Century player!',
      'hour_250': 'Play games for 250 hours total. Quarter century!',
      'hour_500': 'Play games for 500 hours total. Half millennium!',
      'hour_1000': 'Play games for 1000 hours total. Millennium master!',
      'session_10': 'Complete 10 gaming sessions. Launch and play games regularly!',
      'session_25': 'Complete 25 gaming sessions. Daily gaming habit!',
      'session_50': 'Complete 50 gaming sessions. Consistent player!',
      'session_100': 'Complete 100 gaming sessions. Century of sessions!',
      'session_250': 'Complete 250 gaming sessions. Session master!',
      'session_500': 'Complete 500 gaming sessions. Session legend!',

      // Mood achievements
      'relaxed_5': 'Choose "Relaxed" mood 5 times when launching games.',
      'relaxed_10': 'Choose "Relaxed" mood 10 times. Stay chill!',
      'relaxed_25': 'Choose "Relaxed" mood 25 times. Zen master in training!',
      'relaxed_50': 'Choose "Relaxed" mood 50 times. Tranquility expert!',
      'relaxed_100': 'Choose "Relaxed" mood 100 times. Peace master!',
      'social_5': 'Choose "Social" mood 5 times. Gaming with friends!',
      'social_10': 'Choose "Social" mood 10 times. Party master!',
      'social_25': 'Choose "Social" mood 25 times. Community builder!',
      'social_50': 'Choose "Social" mood 50 times. Social champion!',
      'social_100': 'Choose "Social" mood 100 times. Connection master!',
      'creative_5': 'Choose "Creative" mood 5 times. Let your creativity flow!',
      'creative_10': 'Choose "Creative" mood 10 times. Master creator!',
      'creative_25': 'Choose "Creative" mood 25 times. Innovation expert!',
      'creative_50': 'Choose "Creative" mood 50 times. Creative genius!',
      'creative_100': 'Choose "Creative" mood 100 times. Imagination master!',
      'focused_5': 'Choose "Focused" mood 5 times. Concentrate on your goals!',
      'focused_10': 'Choose "Focused" mood 10 times. Concentration master!',
      'focused_25': 'Choose "Focused" mood 25 times. Discipline champion!',
      'focused_50': 'Choose "Focused" mood 50 times. Precision expert!',
      'focused_100': 'Choose "Focused" mood 100 times. Focus legend!',
      'escapist_5': 'Choose "Escapist" mood 5 times. Escape to new worlds!',
      'escapist_10': 'Choose "Escapist" mood 10 times. Reality bender!',
      'escapist_25': 'Choose "Escapist" mood 25 times. Fantasy explorer!',
      'escapist_50': 'Choose "Escapist" mood 50 times. Immersive master!',
      'escapist_100': 'Choose "Escapist" mood 100 times. Escape legend!',
      'tactical_5': 'Choose "Tactical" mood 5 times. Strategic thinking!',
      'tactical_10': 'Choose "Tactical" mood 10 times. Tactical master!',
      'tactical_25': 'Choose "Tactical" mood 25 times. Strategy expert!',
      'tactical_50': 'Choose "Tactical" mood 50 times. Tactical legend!',
      'tactical_100': 'Choose "Tactical" mood 100 times. Strategic myth!',
      'sporty_5': 'Choose "Sporty" mood 5 times. Get active!',
      'sporty_10': 'Choose "Sporty" mood 10 times. Sports master!',
      'sporty_25': 'Choose "Sporty" mood 25 times. Athletic expert!',
      'sporty_50': 'Choose "Sporty" mood 50 times. Sports legend!',
      'sporty_100': 'Choose "Sporty" mood 100 times. Athletic myth!',
      'competitive_5': 'Choose "Competitive" mood 5 times. Ready to compete!',
      'competitive_10': 'Choose "Competitive" mood 10 times. Rival master!',
      'competitive_25': 'Choose "Competitive" mood 25 times. Competition expert!',
      'competitive_50': 'Choose "Competitive" mood 50 times. Competitive legend!',
      'competitive_100': 'Choose "Competitive" mood 100 times. Rival myth!',
      'mood_explorer': 'Try all 8 mood types at least once. Explore different gaming vibes!',
      'mood_variety_10': 'Use each mood at least 10 times. Mood chameleon!',
      'mood_master': 'Use each mood at least 25 times. Master all moods!',
      'mood_legend': 'Use each mood at least 50 times. Mood legend!',

      // Feature achievements
      'perfect_play_1': 'Use the "Perfect Play" feature once. Find it in the game options!',
      'perfect_play_5': 'Use "Perfect Play" 5 times. Let the algorithm choose for you!',
      'perfect_play_10': 'Use "Perfect Play" 10 times. Trust the perfect choice!',
      'perfect_play_25': 'Use "Perfect Play" 25 times. Perfect play expert!',
      'perfect_play_50': 'Use "Perfect Play" 50 times. Perfect legend!',
      'perfect_play_100': 'Use "Perfect Play" 100 times. Perfect myth!',
      'surprise_1': 'Use the "Surprise Game" feature once. Get a random game!',
      'surprise_5': 'Use "Surprise Game" 5 times. Embrace randomness!',
      'surprise_10': 'Use "Surprise Game" 10 times. Surprise master!',
      'surprise_25': 'Use "Surprise Game" 25 times. Surprise expert!',
      'surprise_50': 'Use "Surprise Game" 50 times. Surprise legend!',
      'surprise_100': 'Use "Surprise Game" 100 times. Surprise myth!',
      'rediscover_1': 'Rediscover a game you haven\'t played recently. Memory lane!',
      'rediscover_5': 'Rediscover 5 games. Nostalgic journey!',
      'rediscover_10': 'Rediscover 10 games. Memory master!',
      'rediscover_25': 'Rediscover 25 games. Nostalgia expert!',
      'rediscover_50': 'Rediscover 50 games. Time traveler!',
      'rediscover_100': 'Rediscover 100 games. Eternal memory!',
      'share_1': 'Share your library once. Show off your collection!',
      'share_3': 'Share your library 3 times. Social butterfly!',
      'share_5': 'Share your library 5 times. Community star!',
      'share_10': 'Share your library 10 times. Social influencer!',
      'share_25': 'Share your library 25 times. Community legend!',
      'share_50': 'Share your library 50 times. Social myth!',
      'filter_10': 'Apply 10 different filters. Search like a pro!',
      'filter_25': 'Apply 25 different filters. Search master!',
      'filter_50': 'Apply 50 different filters. Filter legend!',
      'filter_100': 'Apply 100 different filters. Search guru!',
      'filter_250': 'Apply 250 different filters. Filter myth!',
      'sort_5': 'Use sorting options 5 times. Get organized!',
      'sort_15': 'Use sorting options 15 times. Data wrangler!',
      'sort_30': 'Use sorting options 30 times. Sort master!',
      'sort_50': 'Use sorting options 50 times. Organization legend!',
      'sort_100': 'Use sorting options 100 times. Data myth!',
      'export_1': 'Export your library once. Backup your collection!',
      'export_5': 'Export your library 5 times. Backup master!',
      'export_10': 'Export your library 10 times. Data guardian!',
      'export_25': 'Export your library 25 times. Backup legend!',
      'export_50': 'Export your library 50 times. Backup myth!',
      'settings_3': 'Change 3 different settings. Customize your experience!',

      // Genre achievements
      'action_1': 'Play 1 Action game. Explosive fun awaits!',
      'action_5': 'Play 5 different Action games. Action enthusiast!',
      'action_10': 'Play 10 different Action games. Action fan!',
      'action_25': 'Play 25 different Action games. Action expert!',
      'action_50': 'Play 50 different Action games. Action master!',
      'adventure_1': 'Play 1 Adventure game. Epic journeys!',
      'adventure_5': 'Play 5 different Adventure games. Adventure seeker!',
      'adventure_10': 'Play 10 different Adventure games. Adventure fan!',
      'adventure_25': 'Play 25 different Adventure games. Adventure expert!',
      'adventure_50': 'Play 50 different Adventure games. Adventure master!',
      'rpg_1': 'Play 1 RPG game. Start your adventure!',
      'rpg_5': 'Play 5 different RPG games. RPG explorer!',
      'rpg_10': 'Play 10 different RPG games. RPG fan!',
      'rpg_25': 'Play 25 different RPG games. RPG expert!',
      'rpg_50': 'Play 50 different RPG games. RPG master!',
      'indie_1': 'Play 1 Indie game. Support indie developers!',
      'indie_5': 'Play 5 different Indie games. Indie explorer!',
      'indie_10': 'Play 10 different Indie games. Indie fan!',
      'indie_25': 'Play 25 different Indie games. Indie expert!',
      'indie_50': 'Play 50 different Indie games. Indie master!',
      'puzzle_1': 'Play 1 Puzzle game. Exercise your mind!',
      'puzzle_5': 'Play 5 different Puzzle games. Puzzle enthusiast!',
      'puzzle_10': 'Play 10 different Puzzle games. Puzzle fan!',
      'puzzle_25': 'Play 25 different Puzzle games. Puzzle expert!',
      'puzzle_50': 'Play 50 different Puzzle games. Puzzle master!',
      'simulation_1': 'Play 1 Simulation game. Build your world!',
      'simulation_5': 'Play 5 different Simulation games. Simulation explorer!',
      'simulation_10': 'Play 10 different Simulation games. Simulation fan!',
      'simulation_25': 'Play 25 different Simulation games. Simulation expert!',
      'simulation_50': 'Play 50 different Simulation games. Simulation master!',
      'strategy_1': 'Play 1 Strategy game. Outsmart your opponents!',
      'strategy_5': 'Play 5 different Strategy games. Strategic mind!',
      'strategy_10': 'Play 10 different Strategy games. Strategy fan!',
      'strategy_25': 'Play 25 different Strategy games. Strategy expert!',
      'strategy_50': 'Play 50 different Strategy games. Strategy master!',
      'shooter_1': 'Play 1 Shooter game. Aim true!',
      'shooter_5': 'Play 5 different Shooter games. Sharpshooter!',
      'shooter_10': 'Play 10 different Shooter games. Shooter fan!',
      'shooter_25': 'Play 25 different Shooter games. Shooter expert!',
      'shooter_50': 'Play 50 different Shooter games. Shooter master!',
      'racing_1': 'Play 1 Racing game. Speed to the finish!',
      'racing_5': 'Play 5 different Racing games. Racing enthusiast!',
      'racing_10': 'Play 10 different Racing games. Racing fan!',
      'racing_25': 'Play 25 different Racing games. Racing expert!',
      'racing_50': 'Play 50 different Racing games. Racing master!',
      'platformer_1': 'Play 1 Platformer game. Jump to victory!',
      'platformer_5': 'Play 5 different Platformer games. Platformer fan!',
      'platformer_10': 'Play 10 different Platformer games. Platformer enthusiast!',
      'platformer_25': 'Play 25 different Platformer games. Platformer expert!',
      'platformer_50': 'Play 50 different Platformer games. Platformer master!',
      'horror_1': 'Play 1 Horror game. Brave the darkness!',
      'horror_5': 'Play 5 different Horror games. Horror fan!',
      'horror_10': 'Play 10 different Horror games. Horror enthusiast!',
      'horror_25': 'Play 25 different Horror games. Horror expert!',
      'horror_50': 'Play 50 different Horror games. Horror master!',
      'fighting_1': 'Play 1 Fighting game. Fight your way to victory!',
      'fighting_5': 'Play 5 different Fighting games. Fighter!',
      'fighting_10': 'Play 10 different Fighting games. Fighting fan!',
      'fighting_25': 'Play 25 different Fighting games. Fighting expert!',
      'fighting_50': 'Play 50 different Fighting games. Fighting master!',
      'sports_1': 'Play 1 Sports game. Victory is sweet!',
      'sports_5': 'Play 5 different Sports games. Sports enthusiast!',
      'sports_10': 'Play 10 different Sports games. Sports fan!',
      'sports_25': 'Play 25 different Sports games. Sports expert!',
      'sports_50': 'Play 50 different Sports games. Sports master!',
      'roguelike_1': 'Play 1 Roguelike game. One more try!',
      'roguelike_5': 'Play 5 different Roguelike games. Roguelike fan!',
      'roguelike_10': 'Play 10 different Roguelike games. Roguelike enthusiast!',
      'roguelike_25': 'Play 25 different Roguelike games. Roguelike expert!',
      'roguelike_50': 'Play 50 different Roguelike games. Roguelike master!',
      'management_1': 'Play 1 Management game. Build your empire!',
      'management_5': 'Play 5 different Management games. Management fan!',
      'management_10': 'Play 10 different Management games. Management enthusiast!',
      'management_25': 'Play 25 different Management games. Management expert!',
      'management_50': 'Play 50 different Management games. Management master!',
      'survival_1': 'Play 1 Survival game. Survive against all odds!',
      'survival_5': 'Play 5 different Survival games. Survival fan!',
      'survival_10': 'Play 10 different Survival games. Survival enthusiast!',
      'survival_25': 'Play 25 different Survival games. Survival expert!',
      'survival_50': 'Play 50 different Survival games. Survival master!',

      // Time-based achievements
      'daily_15min': 'Play for 15 minutes in one day. Quick gaming session!',
      'daily_30min': 'Play for 30 minutes in one day. Daily gaming habit!',
      'daily_1hour': 'Play for 1 hour in one day. Dedicated player!',
      'daily_2hours': 'Play for 2 hours in one day. Daily marathon!',
      'daily_3hours': 'Play for 3 hours in one day. Gaming enthusiast!',
      'daily_5hours': 'Play for 5 hours in one day. Daily legend!',
      'weekly_2hours': 'Play for 2 hours in a week. Weekend warrior!',
      'weekly_5hours': 'Play for 5 hours in a week. Weekly gamer!',
      'weekly_10hours': 'Play for 10 hours in a week. Weekly enthusiast!',
      'weekly_20hours': 'Play for 20 hours in a week. Weekly marathon!',
      'weekly_40hours': 'Play for 40 hours in a week. Weekly legend!',
      'monthly_10hours': 'Play for 10 hours in a month. Monthly player!',
      'monthly_25hours': 'Play for 25 hours in a month. Monthly gamer!',
      'monthly_50hours': 'Play for 50 hours in a month. Monthly enthusiast!',
      'monthly_100hours': 'Play for 100 hours in a month. Monthly marathon!',
      'yearly_100hours': 'Play for 100 hours in a year. Yearly player!',
      'yearly_500hours': 'Play for 500 hours in a year. Yearly gamer!',
      'yearly_1000hours': 'Play for 1000 hours in a year. Yearly legend!'
    };

    if (hints[achievementId]) {
      return hints[achievementId];
    }

    if (achievementId.startsWith('session_')) {
      const parts = achievementId.split('_');
      const targetSessions = parseInt(parts[parts.length - 1], 10);
      if (!Number.isNaN(targetSessions)) {
        return `Complete ${targetSessions} gaming sessions. Launch and wrap sessions regularly to hit this milestone.`;
      }
    }

    if (achievementId.startsWith('unique_game_')) {
      const parts = achievementId.split('_');
      const targetUnique = parseInt(parts[parts.length - 1], 10);
      if (!Number.isNaN(targetUnique)) {
        return `Play ${targetUnique} different games. Launch fresh titles to keep progressing.`;
      }
    }

    return 'Keep playing games to unlock this achievement!';
  };

  useEffect(() => {
    // Load previously notified achievements
    try {
      // Notified achievements are tracked in localStorage only
      JSON.parse(localStorage.getItem('notifiedAchievements') || '[]');
    } catch (error) {
      console.error('Error loading notified achievements:', error);
      localStorage.setItem('notifiedAchievements', JSON.stringify([]));
    }
    
    // Ensure rolling period assignments are current, then unlock achievements
    AchievementTracker.checkAndResetTimeBasedAchievements();
    AchievementTracker.checkAndUnlockAchievements();
    
    loadAchievements();
    
    // Check for recently unlocked achievements
    const checkRecentUnlocks = () => {
      const recent = AchievementTracker.getRecentlyUnlocked();
      if (recent && recent.length > 0) {
        // Get current notified achievements from localStorage to avoid stale state
        const savedNotified = JSON.parse(localStorage.getItem('notifiedAchievements') || '[]');
        const notifiedSet = new Set(savedNotified);
        
        // Find the first achievement that hasn't been notified about yet
        const newAchievement = recent.find(achievement => !notifiedSet.has(achievement.id));
        
        if (newAchievement) {
          setRecentlyUnlocked(newAchievement);
          
          // Mark this achievement as notified
          const updatedNotified = [...savedNotified, newAchievement.id];
          localStorage.setItem('notifiedAchievements', JSON.stringify(updatedNotified));
          
          // Auto-hide notification after 5 seconds
          setTimeout(() => {
            setRecentlyUnlocked(null);
          }, 5000);
        }
      }
    };
    
    checkRecentUnlocks();
    
    // Set up periodic checking for new achievements
    const interval = setInterval(() => {
      AchievementTracker.checkAndUnlockAchievements();
      checkRecentUnlocks();
      loadAchievements();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []); // Empty dependency array - only run once on mount

  // Calculate statistics when achievements change
  useEffect(() => {
    if (achievementCatalog.length > 0) {
      calculateStatistics();
    }
  }, [unlockedAchievements, achievementCatalog, calculateStatistics]);

  // Load rolling achievements data
  useEffect(() => {
    const loadRollingStats = () => {
      const stats = RollingAchievementsTracker.getAllStats();
      setRollingStats({
        daily: {
          playtime: stats.daily.playtime || 0,
          sessions: stats.daily.sessions || 0,
          gamesPlayed: stats.daily.gamesPlayed || 0,
          genresPlayed: stats.daily.genresPlayed || 0,
          moodsUsed: stats.daily.moodsUsed || 0,
          featuresUsed: stats.daily.featuresUsed || {},
          activeDays: stats.daily.activeDays || 0,
          streak: stats.daily.streak || { current: 0, best: 0 }
        },
        weekly: {
          playtime: stats.weekly.playtime || 0,
          sessions: stats.weekly.sessions || 0,
          gamesPlayed: stats.weekly.gamesPlayed || 0,
          genresPlayed: stats.weekly.genresPlayed || 0,
          moodsUsed: stats.weekly.moodsUsed || 0,
          featuresUsed: stats.weekly.featuresUsed || {},
          activeDays: stats.weekly.activeDays || 0,
          streak: stats.weekly.streak || { current: 0, best: 0 }
        },
        monthly: {
          playtime: stats.monthly.playtime || 0,
          sessions: stats.monthly.sessions || 0,
          gamesPlayed: stats.monthly.gamesPlayed || 0,
          genresPlayed: stats.monthly.genresPlayed || 0,
          moodsUsed: stats.monthly.moodsUsed || 0,
          featuresUsed: stats.monthly.featuresUsed || {},
          activeDays: stats.monthly.activeDays || 0,
          streak: stats.monthly.streak || { current: 0, best: 0 }
        },
        yearly: {
          playtime: stats.yearly.playtime || 0,
          sessions: stats.yearly.sessions || 0,
          gamesPlayed: stats.yearly.gamesPlayed || 0,
          genresPlayed: stats.yearly.genresPlayed || 0,
          moodsUsed: stats.yearly.moodsUsed || 0,
          featuresUsed: stats.yearly.featuresUsed || {},
          activeDays: stats.yearly.activeDays || 0,
          streak: stats.yearly.streak || { current: 0, best: 0 }
        }
      });
    };

    loadRollingStats();
    const interval = setInterval(loadRollingStats, 30000); // Update every 30 seconds (optimized from 10s)
    
    // Listen for rolling achievements updates
    const handleRollingAchievementsUpdate = () => {
      setTimeout(loadRollingStats, 500); // Small delay to ensure data is saved
    };
    
    window.addEventListener('rollingAchievementsUpdated', handleRollingAchievementsUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('rollingAchievementsUpdated', handleRollingAchievementsUpdate);
    };
  }, []);

  const getRewardIcon = (achievementId) => {
    const iconMap = {
      // Library achievements
      'first_game': <Gamepad2 size={16} />,
      'collector_5': <Award size={16} />,
      'collector_10': <Medal size={16} />,
      'collector_25': <Crown size={16} />,
      'collector_50': <Trophy size={16} />,
      'collector_100': <Star size={16} />,
      'collector_250': <Target size={16} />,
      'collector_500': <Zap size={16} />,
      'collector_750': <Award size={16} />,
      'collector_1000': <Crown size={16} />,
      'collector_2500': <Trophy size={16} />,
      'variety_3': <Star size={16} />,
      'variety_5': <Medal size={16} />,
      'platform_diverse': <Target size={16} />,

      // Time achievements
      'hour_1': <Clock size={16} />,
      'hour_5': <Target size={16} />,
      'hour_10': <Star size={16} />,
      'hour_25': <Zap size={16} />,
      'hour_50': <Award size={16} />,
      'hour_100': <Crown size={16} />,
      'hour_250': <Trophy size={16} />,
      'hour_500': <Star size={16} />,
      'hour_1000': <Target size={16} />,
      'session_10': <Clock size={16} />,
      'session_25': <Target size={16} />,
      'session_50': <Star size={16} />,
      'session_100': <Zap size={16} />,
      'session_250': <Award size={16} />,
      'session_500': <Crown size={16} />,

      // Mood achievements - Relaxed
      'relaxed_5': <Star size={16} />,
      'relaxed_10': <Medal size={16} />,
      'relaxed_25': <Crown size={16} />,
      'relaxed_50': <Trophy size={16} />,
      'relaxed_100': <Target size={16} />,
      
      // Mood achievements - Social
      'social_5': <Star size={16} />,
      'social_10': <Medal size={16} />,
      'social_25': <Crown size={16} />,
      'social_50': <Trophy size={16} />,
      'social_100': <Target size={16} />,
      
      // Mood achievements - Creative
      'creative_5': <Star size={16} />,
      'creative_10': <Medal size={16} />,
      'creative_25': <Crown size={16} />,
      'creative_50': <Trophy size={16} />,
      'creative_100': <Target size={16} />,
      
      // Mood achievements - Focused
      'focused_5': <Star size={16} />,
      'focused_10': <Medal size={16} />,
      'focused_25': <Crown size={16} />,
      'focused_50': <Trophy size={16} />,
      'focused_100': <Target size={16} />,
      
      // Mood achievements - Escapist
      'escapist_5': <Star size={16} />,
      'escapist_10': <Medal size={16} />,
      'escapist_25': <Crown size={16} />,
      'escapist_50': <Trophy size={16} />,
      'escapist_100': <Target size={16} />,
      
      // Mood achievements - Tactical
      'tactical_5': <Star size={16} />,
      'tactical_10': <Medal size={16} />,
      'tactical_25': <Crown size={16} />,
      'tactical_50': <Trophy size={16} />,
      'tactical_100': <Target size={16} />,
      
      // Mood achievements - Sporty
      'sporty_5': <Star size={16} />,
      'sporty_10': <Medal size={16} />,
      'sporty_25': <Crown size={16} />,
      'sporty_50': <Trophy size={16} />,
      'sporty_100': <Target size={16} />,
      
      // Mood achievements - Competitive
      'competitive_5': <Star size={16} />,
      'competitive_10': <Medal size={16} />,
      'competitive_25': <Crown size={16} />,
      'competitive_50': <Trophy size={16} />,
      'competitive_100': <Target size={16} />,
      
      // Mood variety achievements
      'mood_explorer': <Star size={16} />,
      'mood_variety_10': <Medal size={16} />,
      'mood_master': <Crown size={16} />,
      'mood_legend': <Trophy size={16} />,

      // Feature achievements
      'perfect_play_1': <Zap size={16} />,
      'perfect_play_5': <Star size={16} />,
      'perfect_play_10': <Medal size={16} />,
      'perfect_play_25': <Crown size={16} />,
      'perfect_play_50': <Trophy size={16} />,
      'perfect_play_100': <Target size={16} />,
      'surprise_1': <Star size={16} />,
      'surprise_5': <Medal size={16} />,
      'surprise_10': <Crown size={16} />,
      'surprise_25': <Trophy size={16} />,
      'surprise_50': <Target size={16} />,
      'surprise_100': <Zap size={16} />,
      'rediscover_1': <Star size={16} />,
      'rediscover_5': <Medal size={16} />,
      'rediscover_10': <Crown size={16} />,
      'rediscover_25': <Trophy size={16} />,
      'rediscover_50': <Target size={16} />,
      'rediscover_100': <Zap size={16} />,
      'share_1': <Star size={16} />,
      'share_3': <Medal size={16} />,
      'share_5': <Crown size={16} />,
      'share_10': <Trophy size={16} />,
      'share_25': <Target size={16} />,
      'share_50': <Zap size={16} />,
      'filter_10': <Star size={16} />,
      'filter_25': <Medal size={16} />,
      'filter_50': <Crown size={16} />,
      'filter_100': <Trophy size={16} />,
      'filter_250': <Target size={16} />,
      'sort_5': <Star size={16} />,
      'sort_15': <Medal size={16} />,
      'sort_30': <Crown size={16} />,
      'sort_50': <Trophy size={16} />,
      'sort_100': <Target size={16} />,
      'export_1': <Star size={16} />,
      'export_5': <Medal size={16} />,
      'export_10': <Crown size={16} />,
      'export_25': <Trophy size={16} />,
      'export_50': <Target size={16} />,
      'settings_3': <Star size={16} />,

      // Genre achievements - Action
      'action_1': <Star size={16} />,
      'action_5': <Medal size={16} />,
      'action_10': <Crown size={16} />,
      'action_25': <Trophy size={16} />,
      'action_50': <Target size={16} />,
      
      // Genre achievements - Adventure
      'adventure_1': <Star size={16} />,
      'adventure_5': <Medal size={16} />,
      'adventure_10': <Crown size={16} />,
      'adventure_25': <Trophy size={16} />,
      'adventure_50': <Target size={16} />,
      
      // Genre achievements - RPG
      'rpg_1': <Star size={16} />,
      'rpg_5': <Medal size={16} />,
      'rpg_10': <Crown size={16} />,
      'rpg_25': <Trophy size={16} />,
      'rpg_50': <Target size={16} />,
      
      // Genre achievements - Indie
      'indie_1': <Star size={16} />,
      'indie_5': <Medal size={16} />,
      'indie_10': <Crown size={16} />,
      'indie_25': <Trophy size={16} />,
      'indie_50': <Target size={16} />,
      
      // Genre achievements - Puzzle
      'puzzle_1': <Star size={16} />,
      'puzzle_5': <Medal size={16} />,
      'puzzle_10': <Crown size={16} />,
      'puzzle_25': <Trophy size={16} />,
      'puzzle_50': <Target size={16} />,
      
      // Genre achievements - Simulation
      'simulation_1': <Star size={16} />,
      'simulation_5': <Medal size={16} />,
      'simulation_10': <Crown size={16} />,
      'simulation_25': <Trophy size={16} />,
      'simulation_50': <Target size={16} />,
      
      // Genre achievements - Strategy
      'strategy_1': <Star size={16} />,
      'strategy_5': <Medal size={16} />,
      'strategy_10': <Crown size={16} />,
      'strategy_25': <Trophy size={16} />,
      'strategy_50': <Target size={16} />,
      
      // Genre achievements - Shooter
      'shooter_1': <Star size={16} />,
      'shooter_5': <Medal size={16} />,
      'shooter_10': <Crown size={16} />,
      'shooter_25': <Trophy size={16} />,
      'shooter_50': <Target size={16} />,
      
      // Genre achievements - Racing
      'racing_1': <Star size={16} />,
      'racing_5': <Medal size={16} />,
      'racing_10': <Crown size={16} />,
      'racing_25': <Trophy size={16} />,
      'racing_50': <Target size={16} />,
      
      // Genre achievements - Platformer
      'platformer_1': <Star size={16} />,
      'platformer_5': <Medal size={16} />,
      'platformer_10': <Crown size={16} />,
      'platformer_25': <Trophy size={16} />,
      'platformer_50': <Target size={16} />,
      
      // Genre achievements - Horror
      'horror_1': <Star size={16} />,
      'horror_5': <Medal size={16} />,
      'horror_10': <Crown size={16} />,
      'horror_25': <Trophy size={16} />,
      'horror_50': <Target size={16} />,
      
      // Genre achievements - Fighting
      'fighting_1': <Star size={16} />,
      'fighting_5': <Medal size={16} />,
      'fighting_10': <Crown size={16} />,
      'fighting_25': <Trophy size={16} />,
      'fighting_50': <Target size={16} />,
      
      // Genre achievements - Sports
      'sports_1': <Star size={16} />,
      'sports_5': <Medal size={16} />,
      'sports_10': <Crown size={16} />,
      'sports_25': <Trophy size={16} />,
      'sports_50': <Target size={16} />,
      
      // Genre achievements - Roguelike
      'roguelike_1': <Star size={16} />,
      'roguelike_5': <Medal size={16} />,
      'roguelike_10': <Crown size={16} />,
      'roguelike_25': <Trophy size={16} />,
      'roguelike_50': <Target size={16} />,
      
      // Genre achievements - Management
      'management_1': <Star size={16} />,
      'management_5': <Medal size={16} />,
      'management_10': <Crown size={16} />,
      'management_25': <Trophy size={16} />,
      'management_50': <Target size={16} />,
      
      // Genre achievements - Survival
      'survival_1': <Star size={16} />,
      'survival_5': <Medal size={16} />,
      'survival_10': <Crown size={16} />,
      'survival_25': <Trophy size={16} />,
      'survival_50': <Target size={16} />,

      // Daily achievements
      'daily_15min': <Clock size={16} />,
      'daily_30min': <Target size={16} />,
      'daily_1hour': <Star size={16} />,
      'daily_2hours': <Medal size={16} />,
      'daily_3hours': <Crown size={16} />,
      'daily_5hours': <Trophy size={16} />,

      // Weekly achievements
      'weekly_2hours': <Clock size={16} />,
      'weekly_5hours': <Target size={16} />,
      'weekly_10hours': <Star size={16} />,
      'weekly_20hours': <Medal size={16} />,
      'weekly_40hours': <Crown size={16} />,

      // Monthly achievements
      'monthly_10hours': <Clock size={16} />,
      'monthly_25hours': <Target size={16} />,
      'monthly_50hours': <Star size={16} />,
      'monthly_100hours': <Medal size={16} />,

      // Yearly achievements
      'yearly_100hours': <Clock size={16} />,
      'yearly_500hours': <Target size={16} />,
      'yearly_1000hours': <Star size={16} />,
      
      // Legendary and trending achievements
      'daily_7hours': <Flame size={16} />,
      'daily_10hours': <Crown size={16} />,
      'weekly_60hours': <Flame size={16} />,
      'weekly_100hours': <Crown size={16} />,
      'monthly_150hours': <Flame size={16} />,
      'monthly_200hours': <Crown size={16} />,
      'yearly_1500hours': <Flame size={16} />,
      'yearly_2000hours': <Crown size={16} />,
      
      // Trending achievements
      'weekly_champion': <TrendingUp size={16} />,
      'variety_weekly': <TrendingUp size={16} />,
      'platform_explorer': <TrendingUp size={16} />
    };

    const mappedIcon = iconMap[achievementId];
    if (mappedIcon) {
      return mappedIcon;
    }

    if (achievementId.startsWith('session_')) {
      return <Clock size={16} />;
    }

    if (achievementId.startsWith('unique_game_')) {
      return <Gamepad2 size={16} />;
    }
    
    return <Trophy size={16} />;
  };

  const getRewardPoints = (achievementId) => {
    const pointsMap = {
      // Library achievements - exponential scaling
      'first_game': 50,
      'collector_5': 100,
      'collector_10': 150,
      'collector_25': 250,
      'collector_50': 400,
      'collector_100': 700,
      'collector_250': 1200,
      'collector_500': 2000,
      'collector_750': 3000,
      'collector_1000': 4400,
      'collector_2500': 8000,
      'variety_3': 200,
      'variety_5': 500,
      'platform_diverse': 300,

      // Time achievements - scale with hours played
      'hour_1': 100,
      'hour_5': 300,
      'hour_10': 600,
      'hour_25': 1500,
      'hour_50': 3000,
      'hour_100': 5000,
      'hour_250': 8000,
      'hour_500': 12000,
      'hour_1000': 20000,
      'session_10': 150,
      'session_25': 400,
      'session_50': 900,
      'session_100': 1800,
      'session_250': 4000,
      'session_500': 8000,

      // Daily achievements - rolling achievements
      'daily_15min': 50,
      'daily_30min': 100,
      'daily_1hour': 150,
      'daily_2hours': 300,
      'daily_3hours': 500,
      'daily_5hours': 800,
      'daily_7hours': 1200,
      'daily_10hours': 2000,

      // Weekly achievements - rolling achievements
      'weekly_2hours': 100,
      'weekly_5hours': 200,
      'weekly_10hours': 400,
      'weekly_20hours': 800,
      'weekly_40hours': 1500,
      'weekly_60hours': 2500,
      'weekly_100hours': 4000,

      // Monthly achievements - rolling achievements
      'monthly_10hours': 200,
      'monthly_25hours': 500,
      'monthly_50hours': 1000,
      'monthly_100hours': 2000,
      'monthly_150hours': 3500,
      'monthly_200hours': 5000,

      // Yearly achievements - rolling achievements
      'yearly_100hours': 500,
      'yearly_500hours': 1500,
      'yearly_1000hours': 3000,
      'yearly_1500hours': 5000,
      'yearly_2000hours': 8000,

      // Mood achievements - scale with usage frequency
      'relaxed_5': 150,
      'relaxed_10': 350,
      'relaxed_25': 800,
      'relaxed_50': 1500,
      'relaxed_100': 3000,
      'social_5': 150,
      'social_10': 350,
      'social_25': 800,
      'social_50': 1500,
      'social_100': 3000,
      'creative_5': 150,
      'creative_10': 350,
      'creative_25': 800,
      'creative_50': 1500,
      'creative_100': 3000,
      'focused_5': 150,
      'focused_10': 350,
      'focused_25': 800,
      'focused_50': 1500,
      'focused_100': 3000,
      'escapist_5': 150,
      'escapist_10': 350,
      'escapist_25': 800,
      'escapist_50': 1500,
      'escapist_100': 3000,
      'tactical_5': 150,
      'tactical_10': 350,
      'tactical_25': 800,
      'tactical_50': 1500,
      'tactical_100': 3000,
      'sporty_5': 150,
      'sporty_10': 350,
      'sporty_25': 800,
      'sporty_50': 1500,
      'sporty_100': 3000,
      'competitive_5': 150,
      'competitive_10': 350,
      'competitive_25': 800,
      'competitive_50': 1500,
      'competitive_100': 3000,
      'mood_explorer': 500,
      'mood_variety_10': 1000,
      'mood_master': 2000,

      // Feature achievements - scale with feature usage
      'perfect_play_1': 200,
      'perfect_play_5': 600,
      'perfect_play_10': 1400,
      'surprise_1': 160,
      'surprise_5': 500,
      'surprise_10': 1100,
      'rediscover_1': 120,
      'rediscover_5': 360,
      'share_1': 180,
      'share_3': 450,
      'share_5': 900,

      // Weekly achievements - high reward for consistency
      'weekly_champion': 1000,
      'variety_weekly': 700,
      'platform_explorer': 600
    };

    return pointsMap[achievementId] || 100;
  };

  const loadAchievements = () => {
    try {
      // Get unlocked achievements
      const unlocked = AchievementTracker.getUnlockedAchievements();
      setUnlockedAchievements(unlocked);
      
      // Get all achievement definitions
      const allDefs = {
        library: [
          { id: 'first_game', name: 'First Steps', desc: 'Launch your first game', icon: '🎮', category: 'library' },
          { id: 'collector_5', name: 'Collector', desc: 'Have 5 games in library', icon: '📚', category: 'library' },
          { id: 'collector_10', name: 'Game Hoarder', desc: 'Have 10 games in library', icon: '📦', category: 'library' },
          { id: 'collector_25', name: 'Library Master', desc: 'Have 25 games in library', icon: '🏛️', category: 'library' },
          { id: 'collector_50', name: 'Game Collector', desc: 'Have 50 games in library', icon: '🏆', category: 'library' },
          { id: 'collector_100', name: 'Century Club', desc: 'Have 100 games in library', icon: '💯', category: 'library' },
          { id: 'collector_250', name: 'Quarter Master', desc: 'Have 250 games in library', icon: '🎯', category: 'library' },
          { id: 'collector_500', name: 'Halfway Hero', desc: 'Have 500 games in library', icon: '🎖️', category: 'library' },
          { id: 'collector_750', name: 'Three Quarter King', desc: 'Have 750 games in library', icon: '👑', category: 'library' },
          { id: 'collector_1000', name: 'Millennium Master', desc: 'Have 1000 games in library', icon: '🎊', category: 'library' },
          { id: 'collector_1500', name: 'Epic Collector', desc: 'Have 1500 games in library', icon: '🌟', category: 'library' },
          { id: 'collector_2500', name: 'Ultimate Collector', desc: 'Have 2500 games in library', icon: '🔥', category: 'library' },
          { id: 'variety_3', name: 'Variety Player', desc: 'Play 3 different genres', icon: '🌈', category: 'library' },
          { id: 'variety_5', name: 'Genre Explorer', desc: 'Play 5 different genres', icon: '🎨', category: 'library' },
          { id: 'platform_diverse', name: 'Platform Diverse', desc: 'Use 3 different platforms', icon: '🔄', category: 'library' }
        ],
        time: [
          { id: 'hour_1', name: 'Quick Session', desc: 'Play 1 hour total', icon: '⏱️', category: 'time' },
          { id: 'hour_5', name: 'Casual Gamer', desc: 'Play 5 hours total', icon: '☕', category: 'time' },
          { id: 'hour_10', name: 'Dedicated Gamer', desc: 'Play 10 hours total', icon: '⚡', category: 'time' },
          { id: 'hour_25', name: 'Marathon Runner', desc: 'Play 25 hours total', icon: '🏃', category: 'time' },
          { id: 'hour_50', name: 'Gaming Legend', desc: 'Play 50 hours total', icon: '👑', category: 'time' },
          { id: 'hour_100', name: 'Century Player', desc: 'Play 100 hours total', icon: '💯', category: 'time' },
          { id: 'hour_250', name: 'Quarter Century Gamer', desc: 'Play 250 hours total', icon: '🎯', category: 'time' },
          { id: 'hour_500', name: 'Half Millennium', desc: 'Play 500 hours total', icon: '🎖️', category: 'time' },
          { id: 'hour_1000', name: 'Millennium Master', desc: 'Play 1000 hours total', icon: '🏆', category: 'time' },
          { id: 'session_10', name: 'Regular Player', desc: 'Complete 10 gaming sessions', icon: '📅', category: 'time' },
          { id: 'session_25', name: 'Frequent Gamer', desc: 'Complete 25 gaming sessions', icon: '📆', category: 'time' },
          { id: 'session_50', name: 'Daily Player', desc: 'Complete 50 gaming sessions', icon: '📊', category: 'time' },
          { id: 'session_100', name: 'Century Sessions', desc: 'Complete 100 gaming sessions', icon: '📊', category: 'time' },
          { id: 'session_250', name: 'Session Master', desc: 'Complete 250 gaming sessions', icon: '🎯', category: 'time' },
          { id: 'session_500', name: 'Session Legend', desc: 'Complete 500 gaming sessions', icon: '🏆', category: 'time' }
        ],
        mood: [
          // Correct 8 moods from the system
          { id: 'relaxed_5', name: 'Chill Master', desc: 'Choose "Relaxed" mood 5 times', icon: '😌', category: 'mood' },
          { id: 'relaxed_10', name: 'Zen Master', desc: 'Choose "Relaxed" mood 10 times', icon: '🧘', category: 'mood' },
          { id: 'relaxed_25', name: 'Ultimate Chill', desc: 'Choose "Relaxed" mood 25 times', icon: '😎', category: 'mood' },
          { id: 'relaxed_50', name: 'Tranquility Expert', desc: 'Choose "Relaxed" mood 50 times', icon: '🔥', category: 'mood' },
          { id: 'relaxed_100', name: 'Peace Master', desc: 'Choose "Relaxed" mood 100 times', icon: '☯️', category: 'mood' },
          { id: 'social_5', name: 'Social Butterfly', desc: 'Choose "Social" mood 5 times', icon: '🦋', category: 'mood' },
          { id: 'social_10', name: 'Party Master', desc: 'Choose "Social" mood 10 times', icon: '🎉', category: 'mood' },
          { id: 'social_25', name: 'Community Builder', desc: 'Choose "Social" mood 25 times', icon: '🤝', category: 'mood' },
          { id: 'social_50', name: 'Social Champion', desc: 'Choose "Social" mood 50 times', icon: '👑', category: 'mood' },
          { id: 'social_100', name: 'Connection Master', desc: 'Choose "Social" mood 100 times', icon: '🌍', category: 'mood' },
          { id: 'creative_5', name: 'Artisan', desc: 'Choose "Creative" mood 5 times', icon: '🎨', category: 'mood' },
          { id: 'creative_10', name: 'Master Creator', desc: 'Choose "Creative" mood 10 times', icon: '🖌️', category: 'mood' },
          { id: 'creative_25', name: 'Innovation Expert', desc: 'Choose "Creative" mood 25 times', icon: '💡', category: 'mood' },
          { id: 'creative_50', name: 'Creative Genius', desc: 'Choose "Creative" mood 50 times', icon: '🎭', category: 'mood' },
          { id: 'creative_100', name: 'Imagination Master', desc: 'Choose "Creative" mood 100 times', icon: '🔥', category: 'mood' },
          { id: 'focused_5', name: 'Focus Expert', desc: 'Choose "Focused" mood 5 times', icon: '🎯', category: 'mood' },
          { id: 'focused_10', name: 'Concentration Master', desc: 'Choose "Focused" mood 10 times', icon: '🔥', category: 'mood' },
          { id: 'focused_25', name: 'Discipline Champion', desc: 'Choose "Focused" mood 25 times', icon: '⚡', category: 'mood' },
          { id: 'focused_50', name: 'Precision Expert', desc: 'Choose "Focused" mood 50 times', icon: '🎯', category: 'mood' },
          { id: 'focused_100', name: 'Focus Legend', desc: 'Choose "Focused" mood 100 times', icon: '🏹', category: 'mood' },
          { id: 'escapist_5', name: 'Dreamer', desc: 'Choose "Escapist" mood 5 times', icon: '💭', category: 'mood' },
          { id: 'escapist_10', name: 'Reality Bender', desc: 'Choose "Escapist" mood 10 times', icon: '🌌', category: 'mood' },
          { id: 'escapist_25', name: 'Fantasy Explorer', desc: 'Choose "Escapist" mood 25 times', icon: '🗺️', category: 'mood' },
          { id: 'escapist_50', name: 'Immersive Master', desc: 'Choose "Escapist" mood 50 times', icon: '🎭', category: 'mood' },
          { id: 'escapist_100', name: 'Escape Legend', desc: 'Choose "Escapist" mood 100 times', icon: '🚀', category: 'mood' },
          // Additional 3 moods from the 8-mood system
          { id: 'tactical_5', name: 'Strategic Mind', desc: 'Choose "Tactical" mood 5 times', icon: '♟️', category: 'mood' },
          { id: 'tactical_10', name: 'Tactical Master', desc: 'Choose "Tactical" mood 10 times', icon: '�', category: 'mood' },
          { id: 'tactical_25', name: 'Strategy Expert', desc: 'Choose "Tactical" mood 25 times', icon: '🧠', category: 'mood' },
          { id: 'tactical_50', name: 'Tactical Legend', desc: 'Choose "Tactical" mood 50 times', icon: '�', category: 'mood' },
          { id: 'tactical_100', name: 'Strategic Myth', desc: 'Choose "Tactical" mood 100 times', icon: '🏆', category: 'mood' },
          { id: 'sporty_5', name: 'Athlete', desc: 'Choose "Sporty" mood 5 times', icon: '⚽', category: 'mood' },
          { id: 'sporty_10', name: 'Sports Master', desc: 'Choose "Sporty" mood 10 times', icon: '�', category: 'mood' },
          { id: 'sporty_25', name: 'Athletic Expert', desc: 'Choose "Sporty" mood 25 times', icon: '�', category: 'mood' },
          { id: 'sporty_50', name: 'Sports Legend', desc: 'Choose "Sporty" mood 50 times', icon: '�', category: 'mood' },
          { id: 'sporty_100', name: 'Athletic Myth', desc: 'Choose "Sporty" mood 100 times', icon: '�️', category: 'mood' },
          { id: 'competitive_5', name: 'Competitor', desc: 'Choose "Competitive" mood 5 times', icon: '�', category: 'mood' },
          { id: 'competitive_10', name: 'Rival Master', desc: 'Choose "Competitive" mood 10 times', icon: '⚔️', category: 'mood' },
          { id: 'competitive_25', name: 'Competition Expert', desc: 'Choose "Competitive" mood 25 times', icon: '🥇', category: 'mood' },
          { id: 'competitive_50', name: 'Competitive Legend', desc: 'Choose "Competitive" mood 50 times', icon: '�', category: 'mood' },
          { id: 'competitive_100', name: 'Rival Myth', desc: 'Choose "Competitive" mood 100 times', icon: '�', category: 'mood' },
          // Mood variety achievements
          { id: 'mood_explorer', name: 'Mood Explorer', desc: 'Try all 8 mood types at least once', icon: '🦎', category: 'mood' },
          { id: 'mood_variety_10', name: 'Mood Chameleon', desc: 'Use each mood at least 10 times', icon: '🦎', category: 'mood' },
          { id: 'mood_master', name: 'Mood Master', desc: 'Use each mood at least 25 times', icon: '🎭', category: 'mood' },
          { id: 'mood_legend', name: 'Mood Legend', desc: 'Use each mood at least 50 times', icon: '👑', category: 'mood' }
        ],
        features: [
          { id: 'perfect_play_1', name: 'Perfect Start', desc: 'Use Perfect Play once', icon: '✨', category: 'features' },
          { id: 'perfect_play_5', name: 'Perfect Player', desc: 'Use Perfect Play 5 times', icon: '🌟', category: 'features' },
          { id: 'perfect_play_10', name: 'Perfect Master', desc: 'Use Perfect Play 10 times', icon: '💫', category: 'features' },
          { id: 'perfect_play_25', name: 'Perfect Expert', desc: 'Use Perfect Play 25 times', icon: '🎯', category: 'features' },
          { id: 'perfect_play_50', name: 'Perfect Legend', desc: 'Use Perfect Play 50 times', icon: '👑', category: 'features' },
          { id: 'perfect_play_100', name: 'Perfect Myth', desc: 'Use Perfect Play 100 times', icon: '🌟', category: 'features' },
          { id: 'patreon_supporter', name: 'Patreon Supporter', desc: 'Support GamePilot on Patreon', icon: '💎', category: 'features', hidden: true },
          { id: 'surprise_1', name: 'Surprise!', desc: 'Use Surprise Game once', icon: '🎁', category: 'features' },
          { id: 'surprise_5', name: 'Surprise Hunter', desc: 'Use Surprise Game 5 times', icon: '🎲', category: 'features' },
          { id: 'surprise_10', name: 'Surprise Master', desc: 'Use Surprise Game 10 times', icon: '🎰', category: 'features' },
          { id: 'surprise_25', name: 'Surprise Expert', desc: 'Use Surprise Game 25 times', icon: '🎪', category: 'features' },
          { id: 'surprise_50', name: 'Surprise Legend', desc: 'Use Surprise Game 50 times', icon: '🎨', category: 'features' },
          { id: 'surprise_100', name: 'Surprise Myth', desc: 'Use Surprise Game 100 times', icon: '🎭', category: 'features' },
          { id: 'rediscover_1', name: 'Memory Lane', desc: 'Rediscover a game once', icon: '🔮', category: 'features' },
          { id: 'rediscover_5', name: 'Nostalgic', desc: 'Rediscover 5 games', icon: '📜', category: 'features' },
          { id: 'rediscover_10', name: 'Memory Master', desc: 'Rediscover 10 games', icon: '🗝️', category: 'features' },
          { id: 'rediscover_25', name: 'Nostalgia Expert', desc: 'Rediscover 25 games', icon: '📚', category: 'features' },
          { id: 'rediscover_50', name: 'Time Traveler', desc: 'Rediscover 50 games', icon: '⏰', category: 'features' },
          { id: 'rediscover_100', name: 'Eternal Memory', desc: 'Rediscover 100 games', icon: '🌌', category: 'features' },
          { id: 'share_1', name: 'Show Off', desc: 'Share your library once', icon: '📤', category: 'features' },
          { id: 'share_3', name: 'Social Butterfly', desc: 'Share your library 3 times', icon: '🦋', category: 'features' },
          { id: 'share_5', name: 'Community Star', desc: 'Share your library 5 times', icon: '⭐', category: 'features' },
          { id: 'share_10', name: 'Social Influencer', desc: 'Share your library 10 times', icon: '📱', category: 'features' },
          { id: 'share_25', name: 'Community Legend', desc: 'Share your library 25 times', icon: '🌟', category: 'features' },
          { id: 'share_50', name: 'Social Myth', desc: 'Share your library 50 times', icon: '🌍', category: 'features' },
          { id: 'filter_10', name: 'Filter Expert', desc: 'Apply 10 different filters', icon: '🔍', category: 'features' },
          { id: 'filter_25', name: 'Search Master', desc: 'Apply 25 different filters', icon: '🎯', category: 'features' },
          { id: 'filter_50', name: 'Filter Legend', desc: 'Apply 50 different filters', icon: '🔬', category: 'features' },
          { id: 'filter_100', name: 'Search Guru', desc: 'Apply 100 different filters', icon: '🧠', category: 'features' },
          { id: 'filter_250', name: 'Filter Myth', desc: 'Apply 250 different filters', icon: '🔭', category: 'features' },
          { id: 'sort_5', name: 'Organizer', desc: 'Use sorting options 5 times', icon: '📋', category: 'features' },
          { id: 'sort_15', name: 'Data Wrangler', desc: 'Use sorting options 15 times', icon: '📊', category: 'features' },
          { id: 'sort_30', name: 'Sort Master', desc: 'Use sorting options 30 times', icon: '📈', category: 'features' },
          { id: 'sort_50', name: 'Organization Legend', desc: 'Use sorting options 50 times', icon: '🏆', category: 'features' },
          { id: 'sort_100', name: 'Data Myth', desc: 'Use sorting options 100 times', icon: '📊', category: 'features' },
          { id: 'export_1', name: 'Data Exporter', desc: 'Export your library once', icon: '💾', category: 'features' },
          { id: 'export_5', name: 'Backup Master', desc: 'Export your library 5 times', icon: '📦', category: 'features' },
          { id: 'export_10', name: 'Data Guardian', desc: 'Export your library 10 times', icon: '🛡️', category: 'features' },
          { id: 'export_25', name: 'Backup Legend', desc: 'Export your library 25 times', icon: '🎎', category: 'features' },
          { id: 'export_50', name: 'Backup Legend', desc: 'Export your library 50 times', icon: '💎', category: 'features' },
          { id: 'settings_3', name: 'Customizer', desc: 'Change 3 different settings', icon: '⚙️', category: 'features' }
        ],
        genres: [
          { id: 'action_1', name: 'Action Initiate', desc: 'Play 1 Action game', icon: '⚔️', category: 'genres' },
          { id: 'action_5', name: 'Action Explorer', desc: 'Play 5 different Action games', icon: '🎯', category: 'genres' },
          { id: 'action_10', name: 'Action Fan', desc: 'Play 10 different Action games', icon: '🎯', category: 'genres' },
          { id: 'action_25', name: 'Action Expert', desc: 'Play 25 different Action games', icon: '🔥', category: 'genres' },
          { id: 'action_50', name: 'Action Master', desc: 'Play 50 different Action games', icon: '💥', category: 'genres' },
          { id: 'adventure_1', name: 'Adventure Initiate', desc: 'Play 1 Adventure game', icon: '🗺️', category: 'genres' },
          { id: 'adventure_5', name: 'Adventure Explorer', desc: 'Play 5 different Adventure games', icon: '🗺️', category: 'genres' },
          { id: 'adventure_10', name: 'Adventure Fan', desc: 'Play 10 different Adventure games', icon: '🗺️', category: 'genres' },
          { id: 'adventure_25', name: 'Adventure Expert', desc: 'Play 25 different Adventure games', icon: '🔥', category: 'genres' },
          { id: 'adventure_50', name: 'Adventure Master', desc: 'Play 50 different Adventure games', icon: '💥', category: 'genres' },
          { id: 'rpg_1', name: 'RPG Initiate', desc: 'Play 1 RPG game', icon: '⚔️', category: 'genres' },
          { id: 'rpg_5', name: 'RPG Explorer', desc: 'Play 5 different RPG games', icon: '🎯', category: 'genres' },
          { id: 'rpg_10', name: 'RPG Fan', desc: 'Play 10 different RPG games', icon: '🎯', category: 'genres' },
          { id: 'rpg_25', name: 'RPG Expert', desc: 'Play 25 different RPG games', icon: '🔥', category: 'genres' },
          { id: 'rpg_50', name: 'RPG Master', desc: 'Play 50 different RPG games', icon: '💥', category: 'genres' },
          { id: 'indie_1', name: 'Indie Initiate', desc: 'Play 1 Indie game', icon: '🎮', category: 'genres' },
          { id: 'indie_5', name: 'Indie Explorer', desc: 'Play 5 different Indie games', icon: '🎮', category: 'genres' },
          { id: 'indie_10', name: 'Indie Fan', desc: 'Play 10 different Indie games', icon: '🎮', category: 'genres' },
          { id: 'indie_25', name: 'Indie Expert', desc: 'Play 25 different Indie games', icon: '🔥', category: 'genres' },
          { id: 'indie_50', name: 'Indie Master', desc: 'Play 50 different Indie games', icon: '💥', category: 'genres' },
          { id: 'puzzle_1', name: 'Puzzle Initiate', desc: 'Play 1 Puzzle game', icon: '🧩', category: 'genres' },
          { id: 'puzzle_5', name: 'Puzzle Explorer', desc: 'Play 5 different Puzzle games', icon: '🧩', category: 'genres' },
          { id: 'puzzle_10', name: 'Puzzle Fan', desc: 'Play 10 different Puzzle games', icon: '🧩', category: 'genres' },
          { id: 'puzzle_25', name: 'Puzzle Expert', desc: 'Progress through 25 Puzzle games', icon: '🔥', category: 'genres' },
          { id: 'puzzle_50', name: 'Puzzle Master', desc: 'Play 50 different Puzzle games', icon: '💥', category: 'genres' },
          { id: 'simulation_1', name: 'Simulation Initiate', desc: 'Play 1 Simulation game', icon: '🏗️', category: 'genres' },
          { id: 'simulation_5', name: 'Simulation Explorer', desc: 'Play 5 different Simulation games', icon: '🏗️', category: 'genres' },
          { id: 'simulation_10', name: 'Simulation Fan', desc: 'Play 10 different Simulation games', icon: '🏗️', category: 'genres' },
          { id: 'simulation_25', name: 'Simulation Expert', desc: 'Play 25 different Simulation games', icon: '🔥', category: 'genres' },
          { id: 'simulation_50', name: 'Simulation Master', desc: 'Play 50 different Simulation games', icon: '💥', category: 'genres' },
          { id: 'strategy_1', name: 'Strategy Initiate', desc: 'Play 1 Strategy game', icon: '♟️', category: 'genres' },
          { id: 'strategy_5', name: 'Strategy Explorer', desc: 'Play 5 different Strategy games', icon: '♟️', category: 'genres' },
          { id: 'strategy_10', name: 'Strategy Fan', desc: 'Play 10 different Strategy games', icon: '♟️', category: 'genres' },
          { id: 'strategy_25', name: 'Strategy Expert', desc: 'Play 25 different Strategy games', icon: '🔥', category: 'genres' },
          { id: 'strategy_50', name: 'Strategy Master', desc: 'Play 50 different Strategy games', icon: '💥', category: 'genres' },
          { id: 'shooter_1', name: 'Shooter Initiate', desc: 'Play 1 Shooter game', icon: '🔫', category: 'genres' },
          { id: 'shooter_5', name: 'Shooter Explorer', desc: 'Play 5 different Shooter games', icon: '🔫', category: 'genres' },
          { id: 'shooter_10', name: 'Shooter Fan', desc: 'Play 10 different Shooter games', icon: '🔫', category: 'genres' },
          { id: 'shooter_25', name: 'Shooter Expert', desc: 'Play 25 different Shooter games', icon: '🔥', category: 'genres' },
          { id: 'shooter_50', name: 'Shooter Master', desc: 'Play 50 different Shooter games', icon: '💥', category: 'genres' },
          { id: 'racing_1', name: 'Racing Initiate', desc: 'Play 1 Racing game', icon: '🏁️', category: 'genres' },
          { id: 'racing_5', name: 'Racing Explorer', desc: 'Play 5 different Racing games', icon: '🏁️', category: 'genres' },
          { id: 'racing_10', name: 'Racing Fan', desc: 'Play 10 different Racing games', icon: '🏁️', category: 'genres' },
          { id: 'racing_25', name: 'Racing Expert', desc: 'Play 25 different Racing games', icon: '🔥', category: 'genres' },
          { id: 'racing_50', name: 'Racing Master', desc: 'Play 50 different Racing games', icon: '💥', category: 'genres' },
          { id: 'platformer_1', name: 'Platformer Initiate', desc: 'Play 1 Platformer game', icon: '🦘', category: 'genres' },
          { id: 'platformer_5', name: 'Platformer Explorer', desc: 'Play 5 different Platformer games', icon: '🦘', category: 'genres' },
          { id: 'platformer_10', name: 'Platformer Fan', desc: 'Play 10 different Platformer games', icon: '🦘', category: 'genres' },
          { id: 'platformer_25', name: 'Platformer Expert', desc: 'Play 25 different Platformer games', icon: '🔥', category: 'genres' },
          { id: 'platformer_50', name: 'Platformer Master', desc: 'Play 50 different Platformer games', icon: '💥', category: 'genres' },
          { id: 'horror_1', name: 'Horror Initiate', desc: 'Play 1 Horror game', icon: '😱', category: 'genres' },
          { id: 'horror_5', name: 'Horror Explorer', desc: 'Play 5 different Horror games', icon: '😱', category: 'genres' },
          { id: 'horror_10', name: 'Horror Fan', desc: 'Play 10 different Horror games', icon: '😱', category: 'genres' },
          { id: 'horror_25', name: 'Horror Expert', desc: 'Play 25 different Horror games', icon: '🔥', category: 'genres' },
          { id: 'horror_50', name: 'Horror Master', desc: 'Play 50 different Horror games', icon: '💥', category: 'genres' },
          { id: 'fighting_1', name: 'Fighting Initiate', desc: 'Play 1 Fighting game', icon: '🥊', category: 'genres' },
          { id: 'fighting_5', name: 'Fighting Explorer', desc: 'Play 5 different Fighting games', icon: '🥊', category: 'genres' },
          { id: 'fighting_10', name: 'Fighting Fan', desc: 'Play 10 different Fighting games', icon: '🥊', category: 'genres' },
          { id: 'fighting_25', name: 'Fighting Expert', desc: 'Play 25 different Fighting games', icon: '🔥', category: 'genres' },
          { id: 'fighting_50', name: 'Fighting Master', desc: 'Play 50 different Fighting games', icon: '💥', category: 'genres' },
          { id: 'sports_1', name: 'Sports Initiate', desc: 'Play 1 Sports game', icon: '⚽', category: 'genres' },
          { id: 'sports_5', name: 'Sports Explorer', desc: 'Play 5 different Sports games', icon: '⚽', category: 'genres' },
          { id: 'sports_10', name: 'Sports Fan', desc: 'Play 10 different Sports games', icon: '⚽', category: 'genres' },
          { id: 'sports_25', name: 'Sports Expert', desc: 'Play 25 different Sports games', icon: '🔥', category: 'genres' },
          { id: 'sports_50', name: 'Sports Master', desc: 'Play 50 different Sports games', icon: '💥', category: 'genres' },
          { id: 'roguelike_1', name: 'Roguelike Initiate', desc: 'Play 1 Roguelike game', icon: '🎲', category: 'genres' },
          { id: 'roguelike_5', name: 'Roguelike Explorer', desc: 'Play 5 different Roguelike games', icon: '🎲', category: 'genres' },
          { id: 'roguelike_10', name: 'Roguelike Fan', desc: 'Play 10 different Roguelike games', icon: '🎲', category: 'genres' },
          { id: 'roguelike_25', name: 'Roguelike Expert', desc: 'Play 25 different Roguelike games', icon: '🔥', category: 'genres' },
          { id: 'roguelike_50', name: 'Roguelike Master', desc: 'Play 50 different Roguelike games', icon: '💥', category: 'genres' },
          { id: 'management_1', name: 'Management Initiate', desc: 'Play 1 Management game', icon: '📋', category: 'genres' },
          { id: 'management_5', name: 'Management Explorer', desc: 'Play 5 different Management games', icon: '📋', category: 'genres' },
          { id: 'management_10', name: 'Management Fan', desc: 'Play 10 different Management games', icon: '📋', category: 'genres' },
          { id: 'management_25', name: 'Management Expert', desc: 'Play 25 different Management games', icon: '🔥', category: 'genres' },
          { id: 'management_50', name: 'Management Master', desc: 'Play 50 different Management games', icon: '💥', category: 'genres' },
          { id: 'survival_1', name: 'Survival Initiate', desc: 'Play 1 Survival game', icon: '🏕️', category: 'genres' },
          { id: 'survival_5', name: 'Survival Explorer', desc: 'Play 5 different Survival games', icon: '🏕️', category: 'genres' },
          { id: 'survival_10', name: 'Survival Fan', desc: 'Play 10 different Survival games', icon: '🏕️', category: 'genres' },
          { id: 'survival_25', name: 'Survival Expert', desc: 'Play 25 different Survival games', icon: '🔥', category: 'genres' },
          { id: 'survival_50', name: 'Survival Master', desc: 'Play 50 different Survival games', icon: '💥', category: 'genres' }
        ],
        uniqueGames: (ACHIEVEMENTS.uniqueGames || []).map(def => ({
          ...def,
          category: 'uniqueGames'
        })),
        daily: [
          { id: 'daily_15min', name: 'Daily Quickie', desc: 'Play 15 minutes in one day', icon: '⏰', category: 'daily' },
          { id: 'daily_30min', name: 'Daily Gamer', desc: 'Play 30 minutes in one day', icon: '⏰', category: 'daily' },
          { id: 'daily_1hour', name: 'Daily Player', desc: 'Play 1 hour in one day', icon: '⏰', category: 'daily' },
          { id: 'daily_2hours', name: 'Daily Enthusiast', desc: 'Play 2 hours in one day', icon: '⏰', category: 'daily' },
          { id: 'daily_3hours', name: 'Daily Marathon', desc: 'Play 3 hours in one day', icon: '⏰', category: 'daily' },
          { id: 'daily_5hours', name: 'Daily Legend', desc: 'Play 5 hours in one day', icon: '⏰', category: 'daily' },
          { id: 'daily_7hours', name: 'Daily Immortal', desc: 'Play 7 hours in one day', icon: '🔥', category: 'daily' },
          { id: 'daily_10hours', name: 'Daily Godlike', desc: 'Play 10 hours in one day', icon: '👑', category: 'daily' }
        ],
        weekly: [
          { id: 'weekly_2hours', name: 'Weekend Warrior', desc: 'Play 2 hours in a week', icon: '📅', category: 'weekly' },
          { id: 'weekly_5hours', name: 'Weekly Gamer', desc: 'Play 5 hours in a week', icon: '📅', category: 'weekly' },
          { id: 'weekly_10hours', name: 'Weekly Enthusiast', desc: 'Play 10 hours in a week', icon: '📅', category: 'weekly' },
          { id: 'weekly_20hours', name: 'Weekly Marathon', desc: 'Play 20 hours in a week', icon: '📅', category: 'weekly' },
          { id: 'weekly_40hours', name: 'Weekly Legend', desc: 'Play 40 hours in a week', icon: '📅', category: 'weekly' },
          { id: 'weekly_60hours', name: 'Weekly Immortal', desc: 'Play 60 hours in a week', icon: '🔥', category: 'weekly' },
          { id: 'weekly_100hours', name: 'Weekly Godlike', desc: 'Play 100 hours in a week', icon: '👑', category: 'weekly' }
        ],
        monthly: [
          { id: 'monthly_10hours', name: 'Monthly Player', desc: 'Play 10 hours in a month', icon: '📆', category: 'monthly' },
          { id: 'monthly_25hours', name: 'Monthly Gamer', desc: 'Play 25 hours in a month', icon: '📆', category: 'monthly' },
          { id: 'monthly_50hours', name: 'Monthly Enthusiast', desc: 'Play 50 hours in a month', icon: '📆', category: 'monthly' },
          { id: 'monthly_100hours', name: 'Monthly Marathon', desc: 'Play 100 hours in a month', icon: '📆', category: 'monthly' },
          { id: 'monthly_150hours', name: 'Monthly Immortal', desc: 'Play 150 hours in a month', icon: '🔥', category: 'monthly' },
          { id: 'monthly_200hours', name: 'Monthly Godlike', desc: 'Play 200 hours in a month', icon: '👑', category: 'monthly' }
        ],
        yearly: [
          { id: 'yearly_100hours', name: 'Yearly Player', desc: 'Play 100 hours in a year', icon: '🎊', category: 'yearly' },
          { id: 'yearly_500hours', name: 'Yearly Gamer', desc: 'Play 500 hours in a year', icon: '🎊', category: 'yearly' },
          { id: 'yearly_1000hours', name: 'Yearly Legend', desc: 'Play 1000 hours in a year', icon: '🎊', category: 'yearly' },
          { id: 'yearly_1500hours', name: 'Yearly Immortal', desc: 'Play 1500 hours in a year', icon: '🔥', category: 'yearly' },
          { id: 'yearly_2000hours', name: 'Yearly Godlike', desc: 'Play 2000 hours in a year', icon: '👑', category: 'yearly' }
        ]
      };

      const activeRollingDefs = ['daily', 'weekly', 'monthly', 'yearly'].reduce((acc, period) => {
        const activeDefs = AchievementTracker.getActivePeriodAchievementDefinitions(period);
        const fallbackDefs = ACHIEVEMENTS[period] || [];
        const sourceDefs = Array.isArray(activeDefs) && activeDefs.length > 0 ? activeDefs : fallbackDefs;
        acc[period] = sourceDefs.map(def => ({ ...def, category: period }));
        return acc;
      }, {});

      setAllAchievements([
        ...allDefs.library,
        ...allDefs.time,
        ...allDefs.mood,
        ...allDefs.features,
        ...allDefs.genres,
        ...allDefs.uniqueGames,
        ...activeRollingDefs.daily,
        ...activeRollingDefs.weekly,
        ...activeRollingDefs.monthly,
        ...activeRollingDefs.yearly
      ]);
    } catch (error) {
      console.error('Error setting achievements:', error);
      setAllAchievements([]);
    }
  };

  const getAchievementProgress = (achievement) => {
    const stats = AchievementTracker.getGamingStats();
    const unlocked = unlockedAchievements.includes(achievement.id);
    
    if (unlocked) return 100;

    // For time achievements, add current active session time for real-time progress
    let adjustedTotalPlayTime = stats.totalPlayTime;
    if (achievement.category === 'time') {
      try {
        const activeSessions = JSON.parse(localStorage.getItem('activeGameSessions') || '{}');
        const currentTime = Date.now();
        
        for (const sessionData of Object.values(activeSessions)) {
          const sessionStartTimestamp = getSessionStartTimestamp(sessionData);
          if (sessionStartTimestamp !== null) {
            const sessionDuration = Math.floor((currentTime - sessionStartTimestamp) / (1000 * 60));
            adjustedTotalPlayTime += sessionDuration;
          }
        }
      } catch (error) {
        console.error('Error calculating active session time:', error);
      }
    }

    // Calculate progress based on achievement type
    if (achievement.id.startsWith('session_')) {
      const parts = achievement.id.split('_');
      const targetSessions = parseInt(parts[parts.length - 1], 10);
      if (!Number.isNaN(targetSessions) && targetSessions > 0) {
        return Math.min((stats.totalSessions / targetSessions) * 100, 100);
      }
      return 0;
    }

    if (achievement.id.startsWith('unique_game_')) {
      const parts = achievement.id.split('_');
      const targetUnique = parseInt(parts[parts.length - 1], 10);
      if (!Number.isNaN(targetUnique) && targetUnique > 0) {
        return Math.min((stats.uniqueGamesPlayed / targetUnique) * 100, 100);
      }
      return 0;
    }

    // Calculate progress based on achievement type
    switch (achievement.id) {
      // Library achievements
      case 'first_game':
        return stats.totalSessions > 0 ? 100 : 0;
      case 'collector_5':
        return Math.min((stats.librarySize / 5) * 100, 100);
      case 'collector_10':
        return Math.min((stats.librarySize / 10) * 100, 100);
      case 'collector_25':
        return Math.min((stats.librarySize / 25) * 100, 100);
      case 'collector_50':
        return Math.min((stats.librarySize / 50) * 100, 100);
      case 'collector_100':
        return Math.min((stats.librarySize / 100) * 100, 100);
      case 'collector_250':
        return Math.min((stats.librarySize / 250) * 100, 100);
      case 'collector_500':
        return Math.min((stats.librarySize / 500) * 100, 100);
      case 'relaxed_50':
        const moodStatsR50 = AchievementTracker.getMoodStats();
        const weekKeyR50 = AchievementTracker.getCurrentWeekKey();
        const weekMoodsR50 = moodStatsR50[weekKeyR50] || {};
        return Math.min(((weekMoodsR50.relaxed || 0) / 50) * 100, 100);
      case 'relaxed_100':
        const moodStatsR100 = AchievementTracker.getMoodStats();
        const weekKeyR100 = AchievementTracker.getCurrentWeekKey();
        const weekMoodsR100 = moodStatsR100[weekKeyR100] || {};
        return Math.min(((weekMoodsR100.relaxed || 0) / 100) * 100, 100);
      case 'social_25':
        const moodStatsS25 = AchievementTracker.getMoodStats();
        const weekKeyS25 = AchievementTracker.getCurrentWeekKey();
        const weekMoodsS25 = moodStatsS25[weekKeyS25] || {};
        return Math.min(((weekMoodsS25.social || 0) / 25) * 100, 100);
      case 'social_50':
        const moodStatsS50 = AchievementTracker.getMoodStats();
        const weekKeyS50 = AchievementTracker.getCurrentWeekKey();
        const weekMoodsS50 = moodStatsS50[weekKeyS50] || {};
        return Math.min(((weekMoodsS50.social || 0) / 50) * 100, 100);
      case 'social_100':
        const moodStatsS100 = AchievementTracker.getMoodStats();
        const weekKeyS100 = AchievementTracker.getCurrentWeekKey();
        const weekMoodsS100 = moodStatsS100[weekKeyS100] || {};
        return Math.min(((weekMoodsS100.social || 0) / 100) * 100, 100);
      case 'creative_25':
        const moodStatsC25 = AchievementTracker.getMoodStats();
        const weekKeyC25 = AchievementTracker.getCurrentWeekKey();
        const weekMoodsC25 = moodStatsC25[weekKeyC25] || {};
        return Math.min(((weekMoodsC25.creative || 0) / 25) * 100, 100);
      case 'creative_50':
        const moodStatsC50 = AchievementTracker.getMoodStats();
        const weekKeyC50 = AchievementTracker.getCurrentWeekKey();
        const weekMoodsC50 = moodStatsC50[weekKeyC50] || {};
        return Math.min(((weekMoodsC50.creative || 0) / 50) * 100, 100);
      case 'creative_100':
        const moodStatsC100 = AchievementTracker.getMoodStats();
        const weekKeyC100 = AchievementTracker.getCurrentWeekKey();
        const weekMoodsC100 = moodStatsC100[weekKeyC100] || {};
        return Math.min(((weekMoodsC100.creative || 0) / 100) * 100, 100);
      case 'focused_25':
        const moodStatsF25 = AchievementTracker.getMoodStats();
        const weekKeyF25 = AchievementTracker.getCurrentWeekKey();
        const weekMoodsF25 = moodStatsF25[weekKeyF25] || {};
        return Math.min(((weekMoodsF25.focused || 0) / 25) * 100, 100);
      case 'focused_50':
        const moodStatsF50 = AchievementTracker.getMoodStats();
        const weekKeyF50 = AchievementTracker.getCurrentWeekKey();
        const weekMoodsF50 = moodStatsF50[weekKeyF50] || {};
        return Math.min(((weekMoodsF50.focused || 0) / 50) * 100, 100);
      case 'focused_100':
        const moodStatsF100 = AchievementTracker.getMoodStats();
        const weekKeyF100 = AchievementTracker.getCurrentWeekKey();
        const weekMoodsF100 = moodStatsF100[weekKeyF100] || {};
        return Math.min(((weekMoodsF100.focused || 0) / 100) * 100, 100);
      case 'escapist_25':
        const moodStatsE25 = AchievementTracker.getMoodStats();
        const weekKeyE25 = AchievementTracker.getCurrentWeekKey();
        const weekMoodsE25 = moodStatsE25[weekKeyE25] || {};
        return Math.min(((weekMoodsE25.escapist || 0) / 25) * 100, 100);
      case 'escapist_50':
        const moodStatsE50 = AchievementTracker.getMoodStats();
        const weekKeyE50 = AchievementTracker.getCurrentWeekKey();
        const weekMoodsE50 = moodStatsE50[weekKeyE50] || {};
        return Math.min(((weekMoodsE50.escapist || 0) / 50) * 100, 100);
      case 'escapist_100':
        const moodStatsE100 = AchievementTracker.getMoodStats();
        const weekKeyE100 = AchievementTracker.getCurrentWeekKey();
        const weekMoodsE100 = moodStatsE100[weekKeyE100] || {};
        return Math.min(((weekMoodsE100.escapist || 0) / 100) * 100, 100);
      case 'mood_explorer':
        const moodStatsExp = AchievementTracker.getMoodStats();
        const weekKeyExp = AchievementTracker.getCurrentWeekKey();
        const weekMoodsExp = moodStatsExp[weekKeyExp] || {};
        return Math.min((Object.keys(weekMoodsExp).length / 5) * 100, 100);
      case 'mood_variety_10':
        const moodStatsVar10 = AchievementTracker.getMoodStats();
        const weekKeyVar10 = AchievementTracker.getCurrentWeekKey();
        const weekMoodsVar10 = moodStatsVar10[weekKeyVar10] || {};
        const allMoods10 = ['relaxed', 'social', 'creative', 'focused', 'escapist'];
        const minUsage10 = Math.min(...allMoods10.map(mood => weekMoodsVar10[mood] || 0));
        return Math.min((minUsage10 / 10) * 100, 100);
      case 'mood_legend':
        const moodStatsLeg = AchievementTracker.getMoodStats();
        const weekKeyLeg = AchievementTracker.getCurrentWeekKey();
        const weekMoodsLeg = moodStatsLeg[weekKeyLeg] || {};
        const allMoods50 = ['relaxed', 'social', 'creative', 'focused', 'escapist'];
        const minUsage50 = Math.min(...allMoods50.map(mood => weekMoodsLeg[mood] || 0));
        return Math.min((minUsage50 / 50) * 100, 100);
      
      // Mood achievements (using weekly data for now)
      case 'relaxed_5':
      case 'relaxed_10':
      case 'relaxed_25':
        const moodStatsR_group = AchievementTracker.getMoodStats();
        const weekKeyR_group = AchievementTracker.getCurrentWeekKey();
        const weekMoodsR_group = moodStatsR_group[weekKeyR_group] || {};
        return Math.min(((weekMoodsR_group.relaxed || 0) / (achievement.id === 'relaxed_5' ? 5 : achievement.id === 'relaxed_10' ? 10 : 25)) * 100, 100);
      case 'social_5':
      case 'social_10':
        const moodStatsS_group = AchievementTracker.getMoodStats();
        const weekKeyS_group = AchievementTracker.getCurrentWeekKey();
        const weekMoodsS_group = moodStatsS_group[weekKeyS_group] || {};
        return Math.min(((weekMoodsS_group.social || 0) / (achievement.id === 'social_5' ? 5 : 10)) * 100, 100);
      case 'creative_5':
      case 'creative_10':
        const moodStatsC_group = AchievementTracker.getMoodStats();
        const weekKeyC_group = AchievementTracker.getCurrentWeekKey();
        const weekMoodsC_group = moodStatsC_group[weekKeyC_group] || {};
        return Math.min(((weekMoodsC_group.creative || 0) / (achievement.id === 'creative_5' ? 5 : 10)) * 100, 100);
      case 'focused_5':
      case 'focused_10':
        const moodStatsF_group = AchievementTracker.getMoodStats();
        const weekKeyF_group = AchievementTracker.getCurrentWeekKey();
        const weekMoodsF_group = moodStatsF_group[weekKeyF_group] || {};
        return Math.min(((weekMoodsF_group.focused || 0) / (achievement.id === 'focused_5' ? 5 : 10)) * 100, 100);
      case 'escapist_5':
      case 'escapist_10':
        const moodStatsE_group = AchievementTracker.getMoodStats();
        const weekKeyE_group = AchievementTracker.getCurrentWeekKey();
        const weekMoodsE_group = moodStatsE_group[weekKeyE_group] || {};
        const mood_group = achievement.id.split('_')[0];
        const target_group = parseInt(achievement.id.split('_')[1]);
        return Math.min(((weekMoodsE_group[mood_group] || 0) / target_group) * 100, 100);
      
      // Time achievements
      case 'hour_1':
        return Math.min((adjustedTotalPlayTime / 60) * 100, 100);
      case 'hour_5':
        return Math.min((adjustedTotalPlayTime / 300) * 100, 100);
      case 'hour_10':
        return Math.min((adjustedTotalPlayTime / 600) * 100, 100);
      case 'hour_25':
        return Math.min((adjustedTotalPlayTime / 1500) * 100, 100);
      case 'hour_50':
        return Math.min((adjustedTotalPlayTime / 3000) * 100, 100);
      
      case 'mood_master':
        const moodStatsMas = AchievementTracker.getMoodStats();
        const weekKeyMas = AchievementTracker.getCurrentWeekKey();
        const weekMoodsMas = moodStatsMas[weekKeyMas] || {};
        return Math.min((Object.keys(weekMoodsMas).length / 5) * 100, 100);
      
      // Feature achievements
      case 'perfect_play_1':
      case 'perfect_play_5':
      case 'perfect_play_10':
      case 'surprise_1':
      case 'surprise_5':
      case 'surprise_10':
      case 'rediscover_1':
      case 'rediscover_5':
      case 'share_1':
      case 'share_3':
      case 'share_5':
      case 'filter_10':
      case 'filter_25':
      case 'sort_5':
      case 'sort_15':
      case 'export_1':
      case 'export_5':
      case 'settings_3':
      case 'settings_8':
        return 0; // Feature achievements - need feature usage tracking
      
      // Time-based achievements (daily, weekly, monthly, yearly)
      case 'daily_15min':
      case 'daily_30min':
      case 'daily_1hour':
      case 'daily_2hours':
      case 'daily_3hours':
      case 'daily_5hours':
      case 'daily_3sessions':
      case 'daily_5sessions':
      case 'daily_10sessions':
      case 'daily_perfect_play':
      case 'daily_surprise':
      case 'daily_rediscover':
      case 'daily_share':
      case 'daily_2moods':
      case 'daily_3moods':
      case 'daily_all_moods':
      case 'daily_3genres':
      case 'daily_5genres':
      case 'daily_2platforms':
      case 'daily_3platforms':
      case 'weekly_5hours':
      case 'weekly_10hours':
      case 'weekly_25hours':
      case 'weekly_50hours':
      case 'weekly_75hours':
      case 'weekly_7sessions':
      case 'weekly_14sessions':
      case 'weekly_21sessions':
      case 'weekly_streak_3':
      case 'weekly_streak_5':
      case 'weekly_streak_7':
      case 'weekly_perfect_5':
      case 'weekly_surprise_7':
      case 'weekly_rediscover_3':
      case 'weekly_share_3':
      case 'monthly_50hours':
      case 'monthly_100hours':
      case 'monthly_200hours':
      case 'monthly_300hours':
      case 'monthly_30sessions':
      case 'monthly_50sessions':
      case 'monthly_75sessions':
      case 'monthly_10days':
      case 'monthly_20days':
      case 'monthly_25days':
      case 'monthly_unlock_5':
      case 'monthly_unlock_10':
      case 'monthly_unlock_15':
      case 'monthly_10genres':
      case 'monthly_15genres':
      case 'monthly_5platforms':
      case 'monthly_all_moods':
      case 'monthly_perfect_10':
      case 'monthly_surprise_15':
      case 'monthly_rediscover_5':
      case 'monthly_share_5':
      case 'yearly_500hours':
      case 'yearly_1000hours':
      case 'yearly_1500hours':
      case 'yearly_2000hours':
      case 'yearly_200sessions':
      case 'yearly_365sessions':
      case 'yearly_300days':
      case 'yearly_350days':
      case 'yearly_unlock_50':
      case 'yearly_unlock_100':
      case 'yearly_unlock_150':
      case 'yearly_20genres':
      case 'yearly_25genres':
      case 'yearly_10platforms':
      case 'yearly_mood_100':
      case 'yearly_perfect_50':
      case 'yearly_surprise_100':
      case 'yearly_rediscover_25':
      case 'yearly_share_25':
      case 'yearly_streak_30':
      case 'yearly_streak_50':
      case 'yearly_streak_100':
        return 0; // Time-based achievements - progress will be calculated when time-based tracking is implemented
      
      // Genre achievements
      case 'genre_rpg_10':
        const genreStatsRPG10 = AchievementTracker.getGenreStats();
        return Math.min(((genreStatsRPG10.rpg || 0) / 10) * 100, 100);
      case 'genre_rpg_25':
        const genreStatsRPG25 = AchievementTracker.getGenreStats();
        return Math.min(((genreStatsRPG25.rpg || 0) / 25) * 100, 100);
      case 'genre_rpg_50':
        const genreStatsRPG50 = AchievementTracker.getGenreStats();
        return Math.min(((genreStatsRPG50.rpg || 0) / 50) * 100, 100);
      case 'genre_action_10':
        const genreStatsAction10 = AchievementTracker.getGenreStats();
        return Math.min(((genreStatsAction10.action || 0) / 10) * 100, 100);
      case 'genre_action_25':
        const genreStatsAction25 = AchievementTracker.getGenreStats();
        return Math.min(((genreStatsAction25.action || 0) / 25) * 100, 100);
      case 'genre_strategy_10':
        const genreStatsStrategy10 = AchievementTracker.getGenreStats();
        return Math.min(((genreStatsStrategy10.strategy || 0) / 10) * 100, 100);
      case 'genre_strategy_25':
        const genreStatsStrategy25 = AchievementTracker.getGenreStats();
        return Math.min(((genreStatsStrategy25.strategy || 0) / 25) * 100, 100);
      case 'genre_adventure_10':
        const genreStatsAdventure10 = AchievementTracker.getGenreStats();
        return Math.min(((genreStatsAdventure10.adventure || 0) / 10) * 100, 100);
      case 'genre_adventure_25':

// Mood achievements (using weekly data for now)
        const genreStatsCompletionist = AchievementTracker.getGenreStats();
        const genresWith20Plus = Object.values(genreStatsCompletionist).filter(count => count >= 20);
        return Math.min((genresWith20Plus.length / 10) * 100, 100);
      
      default:
        return 0;
    }
  };

  const filteredAchievements = selectedCategory === 'all' 
    ? allAchievements 
    : allAchievements.filter(a => a.category === selectedCategory);

  // Pagination logic
  const totalPages = Math.ceil(filteredAchievements.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAchievements = filteredAchievements.slice(startIndex, startIndex + itemsPerPage);

  const categories = [
    { id: 'all', name: 'All Achievements', icon: '🏆' },
    { id: 'library', name: 'Library', icon: '📚' },
    { id: 'time', name: 'Time', icon: '⏱️' },
    { id: 'mood', name: 'Mood', icon: '😌' },
    { id: 'features', name: 'Features', icon: '✨' },
    { id: 'genres', name: 'Genres', icon: '🎭' },
    { id: 'uniqueGames', name: 'Unique Games', icon: '🧭' },
    { id: 'daily', name: 'Daily', icon: '🌅' },
    { id: 'weekly', name: 'Weekly', icon: '📅' },
    { id: 'monthly', name: 'Monthly', icon: '📆' },
    { id: 'yearly', name: 'Yearly', icon: '🎊' }
  ];

  const overallCompletionStats = AchievementStats.getCompletionRate(unlockedAchievements);
  const unlockedCount = overallCompletionStats.unlocked;
  const totalCount = overallCompletionStats.total;
  const completionPercentage = Math.round(overallCompletionStats.completion);

  return (
    <div className={`App ${theme}`}>
      <NavBar />
      <div className="achievements-container">
        <div className="achievements-header">
          <h1>🏆 Achievements</h1>
          <div className="achievement-summary">
            <div className="summary-item">
              <div className="summary-number">{unlockedCount}</div>
              <div className="summary-label">Unlocked</div>
            </div>
            <div className="summary-item">
              <div className="summary-number">{totalCount}</div>
              <div className="summary-label">Total</div>
            </div>
            <div className="summary-item">
              <div className="summary-number">{completionPercentage}%</div>
              <div className="summary-label">Complete</div>
            </div>
          </div>
        </div>

        {/* Statistics Dashboard */}
        <div className="statistics-dashboard">
          <h2>📊 Achievement Statistics</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">⭐</div>
              <div className="stat-content">
                <div className="stat-number">{totalPoints.toLocaleString()}</div>
                <div className="stat-label">Total Points</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">🎯</div>
              <div className="stat-content">
                <div className="stat-number">{completionPercentage}%</div>
                <div className="stat-label">Completion Rate</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">💎</div>
              <div className="stat-content">
                <div className="stat-number" style={{ color: getRarityColor(rarestAchievement?.rarity) }}>
                  {rarestAchievement?.name || 'None'}
                </div>
                <div className="stat-label">Rarest Achievement</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">🔥</div>
              <div className="stat-content">
                <div className="stat-number">{recentUnlocks.length}</div>
                <div className="stat-label">Recent Unlocks</div>
              </div>
            </div>
          </div>
          
          {/* Recent Unlocks Showcase */}
          {recentUnlocks.length > 0 && (
            <div className="recent-unlocks">
              <h3>🎉 Recent Unlocks</h3>
              <div className="recent-unlocks-grid">
                {recentUnlocks.map((achievement, index) => (
                  <div key={achievement.id} className="recent-unlock-card">
                    <div className="recent-unlock-icon">{achievement.icon}</div>
                    <div className="recent-unlock-info">
                      <div className="recent-unlock-name">{achievement.name}</div>
                      <div className="recent-unlock-rarity" style={{ color: getRarityColor(achievement.rarity) }}>
                        {achievement.rarity}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="category-tabs">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`category-tab ${selectedCategory === category.id ? 'active' : ''}`}
            >
              <span className="category-icon">{category.icon}</span>
              <span className="category-name">{category.name}</span>
            </button>
          ))}
        </div>

        <div className="achievements-grid">
          {paginatedAchievements.map(achievement => {
            const isUnlocked = unlockedAchievements.includes(achievement.id);
            const progress = getAchievementProgress(achievement);
            
            return (
              <div
                key={achievement.id}
                className={`achievement-card ${isUnlocked ? 'unlocked' : 'locked'}`}
              >
                <div className="achievement-icon">
                  <span className="icon-emoji">{achievement.icon}</span>
                  {isUnlocked && <div className="unlock-badge">✓</div>}
                </div>
                
                <div className="achievement-info">
                  <h3 className="achievement-name">{achievement.name}</h3>
                  <p className="achievement-desc">{achievement.desc}</p>
                  
                  {/* Progress hint for locked achievements */}
                  {!isUnlocked && (
                    <div className="progress-hint">
                      <div className="hint-icon">💡</div>
                      <div className="hint-text">{getProgressHint(achievement.id, progress)}</div>
                    </div>
                  )}
                  
                  {/* Reward display */}
                  <div className="achievement-rewards">
                    <div className="reward-badge">
                      {getRewardIcon(achievement.id)}
                      <span className="reward-points">+{getRewardPoints(achievement.id)} pts</span>
                    </div>
                  </div>
                  
                  {!isUnlocked && (progress > 0 || achievement.category === 'time') && (
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ width: `${progress}%` }}
                      ></div>
                      <span className="progress-text">{Math.round(progress)}%</span>
                    </div>
                  )}
                  
                  {isUnlocked && (
                    <div className="unlocked-date">
                      <Trophy size={12} />
                      <span>Unlocked - Reward Earned!</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Rolling Achievements Section */}
        <div className="rolling-achievements-section">
          <h2 className="rolling-title">📊 Rolling Achievements</h2>
          <p className="rolling-subtitle">Track your progress across different time periods</p>
          
          <div className="rolling-grid">
            {/* Daily */}
            <div className="rolling-card">
              <div className="rolling-header">
                <h3>📅 Daily</h3>
                <span className="rolling-date">{new Date().toLocaleDateString()}</span>
              </div>
              <div className="rolling-stats">
                <div className="stat-row">
                  <span className="stat-label">⏱️ Playtime:</span>
                  <span className="stat-value">{(rollingStats.daily.playtime / 60).toFixed(1)}h</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">🎮 Sessions:</span>
                  <span className="stat-value">{rollingStats.daily.sessions}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">🎯 Games:</span>
                  <span className="stat-value">{rollingStats.daily.gamesPlayed}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">🎨 Genres:</span>
                  <span className="stat-value">{rollingStats.daily.genresPlayed}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">😌 Moods:</span>
                  <span className="stat-value">{rollingStats.daily.moodsUsed}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">🔥 Active Days:</span>
                  <span className="stat-value">{rollingStats.daily.activeDays}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">🏅 Streak:</span>
                  <span className="stat-value">{formatStreak(rollingStats.daily.streak)}</span>
                </div>
              </div>
            </div>

            {/* Weekly */}
            <div className="rolling-card">
              <div className="rolling-header">
                <h3>📆 Weekly</h3>
                <span className="rolling-date">This Week</span>
              </div>
              <div className="rolling-stats">
                <div className="stat-row">
                  <span className="stat-label">⏱️ Playtime:</span>
                  <span className="stat-value">{(rollingStats.weekly.playtime / 60).toFixed(1)}h</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">🎮 Sessions:</span>
                  <span className="stat-value">{rollingStats.weekly.sessions}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">🎯 Games:</span>
                  <span className="stat-value">{rollingStats.weekly.gamesPlayed}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">🎨 Genres:</span>
                  <span className="stat-value">{rollingStats.weekly.genresPlayed}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">😌 Moods:</span>
                  <span className="stat-value">{rollingStats.weekly.moodsUsed}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">🔥 Active Days:</span>
                  <span className="stat-value">{rollingStats.weekly.activeDays}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">🏅 Streak:</span>
                  <span className="stat-value">{formatStreak(rollingStats.weekly.streak)}</span>
                </div>
              </div>
            </div>

            {/* Monthly */}
            <div className="rolling-card">
              <div className="rolling-header">
                <h3>📊 Monthly</h3>
                <span className="rolling-date">This Month</span>
              </div>
              <div className="rolling-stats">
                <div className="stat-row">
                  <span className="stat-label">⏱️ Playtime:</span>
                  <span className="stat-value">{(rollingStats.monthly.playtime / 60).toFixed(1)}h</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">🎮 Sessions:</span>
                  <span className="stat-value">{rollingStats.monthly.sessions}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">🎯 Games:</span>
                  <span className="stat-value">{rollingStats.monthly.gamesPlayed}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">🎨 Genres:</span>
                  <span className="stat-value">{rollingStats.monthly.genresPlayed}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">😌 Moods:</span>
                  <span className="stat-value">{rollingStats.monthly.moodsUsed}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">🔥 Active Days:</span>
                  <span className="stat-value">{rollingStats.monthly.activeDays}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">🏅 Streak:</span>
                  <span className="stat-value">{formatStreak(rollingStats.monthly.streak)}</span>
                </div>
              </div>
            </div>

            {/* Yearly */}
            <div className="rolling-card">
              <div className="rolling-header">
                <h3>🎊 Yearly</h3>
                <span className="rolling-date">{new Date().getFullYear()}</span>
              </div>
              <div className="rolling-stats">
                <div className="stat-row">
                  <span className="stat-label">⏱️ Playtime:</span>
                  <span className="stat-value">{(rollingStats.yearly.playtime / 60).toFixed(1)}h</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">🎮 Sessions:</span>
                  <span className="stat-value">{rollingStats.yearly.sessions}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">🎯 Games:</span>
                  <span className="stat-value">{rollingStats.yearly.gamesPlayed}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">🎨 Genres:</span>
                  <span className="stat-value">{rollingStats.yearly.genresPlayed}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">😌 Moods:</span>
                  <span className="stat-value">{rollingStats.yearly.moodsUsed}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">🔥 Active Days:</span>
                  <span className="stat-value">{rollingStats.yearly.activeDays}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">🏅 Streak:</span>
                  <span className="stat-value">{formatStreak(rollingStats.yearly.streak)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="pagination-controls">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="pagination-button"
            >
              Previous
            </button>
            
            <span className="pagination-info">
              Page {currentPage} of {totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="pagination-button"
            >
              Next
            </button>
          </div>
        )}

        {recentlyUnlocked && (
          <div className="achievement-notification">
            <div className="notification-content">
              <div className="notification-icon">🎉</div>
              <div className="notification-text">
                <strong>Achievement Unlocked!</strong>
                <p>{recentlyUnlocked.name}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Founder Achievement - properly integrated */}
        {AchievementTracker.isAchievementUnlocked('patreon_supporter') && (
          <div className="founder-achievement">
            <div className="achievement-card unlocked">
              <div className="achievement-icon">
                <span className="icon-emoji">🌟</span>
              </div>
              <div className="achievement-info">
                <h3>Founder Status</h3>
                <p>Congratulations on your Patreon support! You've unlocked Founder recognition, and supporter tiers now boost future XP instead of granting instant XP.</p>
                <div className="achievement-reward">
                  <Star size={16} />
                  <span className="reward-points">Founder recognition + optional XP multiplier</span>
                </div>
                <div className="achievement-date">
                  <Trophy size={12} />
                  <span>Unlocked - Thank you for supporting GamePilot!</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Achievements;
