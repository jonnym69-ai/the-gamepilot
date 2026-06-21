import StorageService from './StorageService';
import { PlaytimeAutoLogger } from './PlaytimeAutoLogger';

const STREAKS_KEY = 'gamingStreaks';
const MILESTONES_KEY = 'gamingMilestonesReached';
const TIMELINE_KEY = 'gamingIdentityTimeline';
const SEASONAL_KEY = 'gamingSeasonalTags';
const GENRE_ARCHETYPE_KEY = 'gamingGenreArchetype';
const SESSION_DAYS_KEY = 'gamingSessionDays';

const MILESTONE_DEFINITIONS = [
  { type: 'sessions', threshold: 1, name: 'Session Warmup', message: 'First session complete!' },
  { type: 'sessions', threshold: 10, name: 'Session Starter', message: '10 sessions completed!' },
  { type: 'sessions', threshold: 50, name: 'Session Grinder', message: '50 sessions — you\'re dedicated!' },
  { type: 'sessions', threshold: 100, name: 'Century Sessions', message: '100 sessions! Century club!' },
  { type: 'sessions', threshold: 250, name: 'Session Veteran', message: '250 sessions — true veteran status!' },
  { type: 'sessions', threshold: 500, name: 'Session Legend', message: '500 sessions. Legendary.' },
  { type: 'hours', threshold: 1, name: 'Hour One', message: 'First hour of playtime logged!' },
  { type: 'hours', threshold: 10, name: 'Dedicated Gamer', message: '10 hours of gaming!' },
  { type: 'hours', threshold: 100, name: 'Century Player', message: '100 hours — Century Player!' },
  { type: 'hours', threshold: 500, name: 'Half Millennium', message: '500 hours. Halfway to mastery.' },
  { type: 'hours', threshold: 1000, name: 'Millennium Master', message: '1000 hours! Millennium Master!' },
  { type: 'hours', threshold: 2500, name: 'Chrono Champion', message: '2500 hours. Time itself bows to you.' },
  { type: 'games', threshold: 1, name: 'First Game', message: 'First unique game played!' },
  { type: 'games', threshold: 10, name: 'Decade Player', message: '10 unique games played!' },
  { type: 'games', threshold: 50, name: 'Variety Master', message: '50 unique games played!' },
  { type: 'games', threshold: 100, name: 'Century Games', message: '100 unique games. Incredible range!' },
  { type: 'streak', threshold: 7, name: 'Week Warrior', message: '7-day streak! Week Warrior!' },
  { type: 'streak', threshold: 30, name: 'Month Master', message: '30-day streak! Unstoppable!' },
  { type: 'streak', threshold: 100, name: 'Streak Centurion', message: '100-day streak. Centurion status!' }
];

// ---- Streaks ----

export const GamingStreaks = {
  getStreaks() {
    const stored = StorageService.getString(STREAKS_KEY);
    if (stored) {
      try { return JSON.parse(stored); } catch { /* fallthrough */ }
    }
    return { currentStreak: 0, longestStreak: 0, lastSessionDate: null };
  },

  saveStreaks(streaks) {
    StorageService.setString(STREAKS_KEY, JSON.stringify(streaks));
  },

  recordSessionDay() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    const streaks = this.getStreaks();
    const lastDate = streaks.lastSessionDate ? new Date(streaks.lastSessionDate) : null;

    if (lastDate) {
      lastDate.setHours(0, 0, 0, 0);
      const diffDays = Math.round((today - lastDate) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return streaks; // Already recorded today
      } else if (diffDays === 1) {
        streaks.currentStreak += 1;
      } else {
        streaks.currentStreak = 1;
      }
    } else {
      streaks.currentStreak = 1;
    }

    if (streaks.currentStreak > streaks.longestStreak) {
      streaks.longestStreak = streaks.currentStreak;
    }
    streaks.lastSessionDate = todayStr;
    this.saveStreaks(streaks);
    return streaks;
  },

  getSessionDays() {
    const stored = StorageService.getString(SESSION_DAYS_KEY);
    if (stored) {
      try { return JSON.parse(stored); } catch { /* fallthrough */ }
    }
    return [];
  },

  addSessionDay() {
    const today = new Date().toISOString().split('T')[0];
    const days = this.getSessionDays();
    if (!days.includes(today)) {
      days.push(today);
      StorageService.setString(SESSION_DAYS_KEY, JSON.stringify(days));
    }
    return days;
  }
};

// ---- Backlog Stats ----

export const BacklogStats = {
  getStats() {
    const library = StorageService.get('library', []);
    const totalGames = library.length;
    const playedGames = library.filter(g => (g.time_played || 0) > 0 || g.last_played).length;
    const unplayedGames = totalGames - playedGames;
    const completionRate = totalGames > 0 ? Math.round((playedGames / totalGames) * 100) : 0;

    return {
      totalGames,
      playedGames,
      unplayedGames,
      completionRate,
      titles: this.getTitles(completionRate, totalGames)
    };
  },

  getTitles(completionRate, totalGames) {
    const titles = [];
    if (completionRate >= 80) titles.push('Backlog King');
    if (totalGames >= 500) titles.push('Collector');
    if (totalGames >= 1000) titles.push('The Dedication');
    return titles;
  }
};

// ---- Milestones ----

export const Milestones = {
  getReached() {
    const stored = StorageService.getString(MILESTONES_KEY);
    if (stored) {
      try { return JSON.parse(stored); } catch { /* fallthrough */ }
    }
    return [];
  },

  saveReached(reached) {
    StorageService.setString(MILESTONES_KEY, JSON.stringify(reached));
  },

  checkMilestones(stats) {
    const reached = this.getReached();
    const reachedIds = new Set(reached.map(r => r.id));
    const newMilestones = [];

    MILESTONE_DEFINITIONS.forEach(def => {
      const id = `${def.type}_${def.threshold}`;
      if (reachedIds.has(id)) return;

      let value = 0;
      if (def.type === 'sessions') value = stats.totalSessions;
      else if (def.type === 'hours') value = Math.floor(stats.totalPlayTime / 60);
      else if (def.type === 'games') value = stats.uniqueGamesPlayed || 0;
      else if (def.type === 'streak') value = stats.currentStreak || 0;

      if (value >= def.threshold) {
        const milestone = {
          id,
          type: def.type,
          threshold: def.threshold,
          name: def.name,
          message: def.message,
          date: new Date().toISOString()
        };
        reached.push(milestone);
        newMilestones.push(milestone);
      }
    });

    if (newMilestones.length > 0) {
      this.saveReached(reached);
    }

    return newMilestones;
  },

  getAllDefinitions() {
    return MILESTONE_DEFINITIONS.map(d => ({ ...d, id: `${d.type}_${d.threshold}` }));
  }
};

// ---- Identity Timeline ----

export const IdentityTimeline = {
  getEvents() {
    const stored = StorageService.getString(TIMELINE_KEY);
    if (stored) {
      try { return JSON.parse(stored); } catch { /* fallthrough */ }
    }
    return [];
  },

  saveEvents(events) {
    StorageService.setString(TIMELINE_KEY, JSON.stringify(events.slice(-200))); // keep last 200
  },

  addEvent(type, title, description, metadata = {}) {
    const events = this.getEvents();
    events.push({
      id: `${type}-${Date.now()}`,
      type,
      title,
      description,
      date: new Date().toISOString(),
      ...metadata
    });
    this.saveEvents(events);
    return events;
  },

  addLevelUpEvent(level, title) {
    return this.addEvent('level_up', `Level ${level} Reached`, `You are now a ${title}!`, { level, title });
  },

  addMilestoneEvent(milestone) {
    return this.addEvent('milestone', milestone.name, milestone.message, { milestoneId: milestone.id });
  },

  addSessionEvent(gameName, playtimeMinutes) {
    return this.addEvent('session', `Played ${gameName}`, `${playtimeMinutes} minute session`, { gameName, playtimeMinutes });
  },

  addStreakEvent(currentStreak) {
    return this.addEvent('streak', `${currentStreak}-Day Streak`, `Gaming streak: ${currentStreak} days!`, { streak: currentStreak });
  },

  addAchievementEvent(achievementName) {
    return this.addEvent('achievement', `Unlocked: ${achievementName}`, `Achievement earned!`, { achievementName });
  }
};

// ---- Seasonal Tags ----

export const SeasonalTags = {
  getSeasonKey(date = new Date()) {
    const year = date.getFullYear();
    const month = date.getMonth();
    if (month >= 2 && month <= 4) return `Spring ${year}`;
    if (month >= 5 && month <= 7) return `Summer ${year}`;
    if (month >= 8 && month <= 10) return `Autumn ${year}`;
    return `Winter ${year}`;
  },

  getSeasonName(seasonKey) {
    return seasonKey.split(' ')[0].toLowerCase();
  },

  getTags() {
    const stored = StorageService.getString(SEASONAL_KEY);
    if (stored) {
      try { return JSON.parse(stored); } catch { /* fallthrough */ }
    }
    return {};
  },

  saveTags(tags) {
    StorageService.setString(SEASONAL_KEY, JSON.stringify(tags));
  },

  recordSession(playtimeMinutes) {
    const seasonKey = this.getSeasonKey();
    const tags = this.getTags();

    if (!tags[seasonKey]) {
      tags[seasonKey] = { playtimeMinutes: 0, sessions: 0, tag: null };
    }

    tags[seasonKey].playtimeMinutes += playtimeMinutes;
    tags[seasonKey].sessions += 1;

    // Award tag if threshold reached
    const totalHours = Math.floor(tags[seasonKey].playtimeMinutes / 60);
    if (totalHours >= 50 && !tags[seasonKey].tag) {
      tags[seasonKey].tag = `${seasonKey} Warrior`;
      IdentityTimeline.addEvent('seasonal', tags[seasonKey].tag, `Played ${totalHours} hours this season!`, { season: seasonKey, hours: totalHours });
    }

    this.saveTags(tags);
    return tags[seasonKey];
  },

  getCurrentTag() {
    const seasonKey = this.getSeasonKey();
    const tags = this.getTags();
    return tags[seasonKey]?.tag || null;
  },

  getAllTags() {
    const tags = this.getTags();
    return Object.entries(tags)
      .filter(([, data]) => data.tag)
      .map(([season, data]) => ({ season, tag: data.tag, hours: Math.floor(data.playtimeMinutes / 60) }))
      .sort((a, b) => b.season.localeCompare(a.season));
  }
};

// ---- Genre Archetypes ----

export const GenreArchetypes = {
  getArchetype(genreStats = {}, stats = {}) {
    const entries = Object.entries(genreStats);
    if (entries.length === 0) return null;

    const sorted = entries.sort(([, a], [, b]) => b - a);
    const topGenre = sorted[0]?.[0];
    const totalHours = stats.totalPlayTime || 0;
    const avgSession = stats.averageSessionTime || 0;
    const platformDiversity = stats.platformDiversity || 0;

    // Check for special archetypes first
    const genreHours = {};
    entries.forEach(([genre, count]) => { genreHours[genre] = count; });

    if (totalHours > 0) {
      const rpgRatio = (genreHours['RPG'] || 0) / totalHours;
      const actionRatio = (genreHours['Action'] || 0) / totalHours;
      const strategyRatio = (genreHours['Strategy'] || 0) / totalHours;
      const retroRatio = ((genreHours['Retro'] || 0) + (genreHours['Platformer'] || 0)) / totalHours;
      const fpsRatio = (genreHours['Shooter'] || 0) / totalHours;

      if (rpgRatio > 0.4 && totalHours > 200) return { name: 'RPG Scholar', icon: '📜', description: '200+ hours deep in RPGs. You know every questline.' };
      if (avgSession < 20 && stats.totalSessions > 50) return { name: 'Speed Demon', icon: '⚡', description: 'Short, intense sessions. Always moving fast.' };
      if (retroRatio > 0.5 && totalHours > 100) return { name: 'Retro Purist', icon: '🕹️', description: '50%+ playtime on retro platforms. Old school forever.' };
      if (strategyRatio > 0.35 && totalHours > 100) return { name: 'Tactician', icon: '♟️', description: 'Strategy is your weapon. Every move is calculated.' };
      if (fpsRatio > 0.4 && totalHours > 100) return { name: 'Aim Legend', icon: '🎯', description: 'Sharpshooter status. Reflexes like a pro.' };
      if (platformDiversity >= 5 && totalHours > 200) return { name: 'Jack of All Trades', icon: '🃏', description: 'Played across 5+ platforms. No game is off-limits.' };
      if (actionRatio > 0.4 && totalHours > 200) return { name: 'Action Hero', icon: '💥', description: 'Action is life. Explosions are just Tuesday.' };
    }

    // Fallback based on top genre
    const archetypeMap = {
      'RPG': { name: 'Quest Walker', icon: '🗡️', description: 'Always chasing the next story.' },
      'Action': { name: 'Combat Ace', icon: '⚔️', description: 'Thrives in the thick of battle.' },
      'Strategy': { name: 'War General', icon: '🏰', description: 'Victory through superior planning.' },
      'Shooter': { name: 'Marksman', icon: '🔫', description: 'Precision under pressure.' },
      'Adventure': { name: 'Pathfinder', icon: '🧭', description: 'Every world is worth exploring.' },
      'Simulation': { name: 'Architect', icon: '🏗️', description: 'Builder of worlds.' },
      'Sports': { name: 'Athlete', icon: '🏆', description: 'Competitive spirit, always.' },
      'Racing': { name: 'Speedster', icon: '🏎️', description: 'Faster than the rest.' },
      'Puzzle': { name: 'Mind Bender', icon: '🧩', description: 'Sees solutions others miss.' }
    };

    return archetypeMap[topGenre] || { name: 'Gamer', icon: '🎮', description: 'A true gaming enthusiast.' };
  },

  getStoredArchetype() {
    const stored = StorageService.getString(GENRE_ARCHETYPE_KEY);
    if (stored) {
      try { return JSON.parse(stored); } catch { /* fallthrough */ }
    }
    return null;
  },

  saveArchetype(archetype) {
    StorageService.setString(GENRE_ARCHETYPE_KEY, JSON.stringify(archetype));
  }
};

// ---- Orchestration: Call this when a session ends ----

export const processSessionEnd = (gameName, playtimeMinutes, stats) => {
  // Streaks
  GamingStreaks.addSessionDay();
  const streaks = GamingStreaks.recordSessionDay();

  // Seasonal
  SeasonalTags.recordSession(playtimeMinutes);

  // Timeline
  IdentityTimeline.addSessionEvent(gameName, playtimeMinutes);
  if (streaks.currentStreak > 1 && streaks.currentStreak % 7 === 0) {
    IdentityTimeline.addStreakEvent(streaks.currentStreak);
  }

  // Unique games
  const history = PlaytimeAutoLogger.getSessionHistory();
  const uniqueGames = new Set(history.map(s => s.gameName)).size;

  const enrichedStats = {
    ...stats,
    totalSessions: history.length,
    totalPlayTime: history.reduce((sum, s) => sum + s.playtimeMinutes, 0),
    uniqueGamesPlayed: uniqueGames,
    currentStreak: streaks.currentStreak,
    longestStreak: streaks.longestStreak
  };

  // Milestones
  const newMilestones = Milestones.checkMilestones(enrichedStats);
  newMilestones.forEach(m => IdentityTimeline.addMilestoneEvent(m));

  // Genre archetype
  const genreStats = stats.favoriteGenre ? { [stats.favoriteGenre]: stats.totalPlayTime || 0 } : {};
  const archetype = GenreArchetypes.getArchetype(genreStats, enrichedStats);
  if (archetype) {
    GenreArchetypes.saveArchetype(archetype);
  }

  return {
    streaks,
    newMilestones,
    archetype,
    enrichedStats
  };
};

// ---- Get full enhanced profile ----

export const getEnhancedIdentity = () => {
  const streaks = GamingStreaks.getStreaks();
  const backlog = BacklogStats.getStats();
  const milestones = Milestones.getReached();
  const timeline = IdentityTimeline.getEvents();
  const seasonalTags = SeasonalTags.getAllTags();
  const currentSeasonalTag = SeasonalTags.getCurrentTag();
  const archetype = GenreArchetypes.getStoredArchetype();

  return {
    streaks,
    backlog,
    milestones,
    timeline,
    seasonalTags,
    currentSeasonalTag,
    archetype
  };
};
