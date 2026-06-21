/**
 * HabitTrackerService - Gaming habit tracking, goals, streaks, and insights.
 * Local-only: stores habits/goals/progress in localStorage.
 */

import StorageService from './StorageService';

const HABIT_STORAGE_KEY = 'gamepilot_habits_v1';
const GOALS_STORAGE_KEY = 'gamepilot_habit_goals_v1';
const MOOD_LOG_KEY = 'gamepilot_mood_log_v1';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const getTodayDateString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getMonthKey = (date = new Date()) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const getISOWeek = (date = new Date()) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return `${d.getUTCFullYear()}-W${String(Math.ceil((((d - yearStart) / 86400000) + 1) / 7)).padStart(2, '0')}`;
};

const loadHabits = () => {
  try {
    const raw = JSON.parse(StorageService.getString(HABIT_STORAGE_KEY)) || {};
    // Restore Sets that JSON destroyed back to arrays for safety
    Object.values(raw.weekly || {}).forEach((w) => {
      if (w.days && typeof w.days === 'object' && !Array.isArray(w.days)) {
        w.days = Object.values(w.days);
      }
    });
    Object.values(raw.monthly || {}).forEach((m) => {
      if (m.days && typeof m.days === 'object' && !Array.isArray(m.days)) {
        m.days = Object.values(m.days);
      }
    });
    return raw;
  } catch {
    return {};
  }
};

const saveHabits = (data) => {
  StorageService.setString(HABIT_STORAGE_KEY, JSON.stringify(data));
};

const loadGoals = () => {
  try {
    const raw = JSON.parse(StorageService.getString(GOALS_STORAGE_KEY)) || getDefaultGoals();
    return migrateGoals(raw);
  } catch {
    return getDefaultGoals();
  }
};

const saveGoals = (data) => {
  StorageService.setString(GOALS_STORAGE_KEY, JSON.stringify(data));
};

const loadMoodLog = () => {
  try {
    return JSON.parse(StorageService.getString(MOOD_LOG_KEY)) || [];
  } catch {
    return [];
  }
};

const saveMoodLog = (data) => {
  StorageService.setString(MOOD_LOG_KEY, JSON.stringify(data));
};

const GOAL_TYPE_LABELS = {
  days: 'Days Played',
  hours: 'Hours Played',
  sessions: 'Sessions',
  completions: 'Games Completed',
  unique_games: 'Unique Games',
  new_genre: 'New Genres',
  streak: 'Day Streak',
  per_game_time: 'Hours in One Game',
  per_game_sessions: 'Sessions in One Game',
  genre_time: 'Hours in Genre',
  genre_sessions: 'Sessions in Genre',
};

const generateGoalId = () => `goal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const getDefaultGoals = () => ({
  weekly: [
    { id: 'w_play_days', label: 'Play at least 3 days this week', target: 3, type: 'days', period: 'week', active: true },
    { id: 'w_play_hours', label: 'Play at least 5 hours this week', target: 5, type: 'hours', period: 'week', active: true },
    { id: 'w_sessions', label: 'Play at least 5 sessions this week', target: 5, type: 'sessions', period: 'week', active: false },
    { id: 'w_try_genre', label: 'Try a new genre this week', target: 1, type: 'new_genre', period: 'week', active: false },
  ],
  monthly: [
    { id: 'm_finish_game', label: 'Finish 1 game this month', target: 1, type: 'completions', period: 'month', active: true },
    { id: 'm_play_hours', label: 'Play at least 20 hours this month', target: 20, type: 'hours', period: 'month', active: true },
    { id: 'm_different_games', label: 'Play at least 5 different games', target: 5, type: 'unique_games', period: 'month', active: false },
    { id: 'm_streak', label: '7-day gaming streak', target: 7, type: 'streak', period: 'month', active: false },
  ],
});

const migrateGoals = (goals) => {
  if (!goals) return getDefaultGoals();
  const migrated = { weekly: [], monthly: [] };
  ['weekly', 'monthly'].forEach((period) => {
    const list = goals[period] || [];
    migrated[period] = list.map((g) => ({
      gameName: null,
      genre: null,
      createdAt: null,
      ...g,
    }));
  });
  return migrated;
};

const calculateGoalCurrent = (goal, habits, weeklyStats, monthlyStats) => {
  const { type, period, gameName, genre } = goal;
  const stats = period === 'week' ? weeklyStats : monthlyStats;

  switch (type) {
    case 'days':
      return stats.daysPlayed;
    case 'hours':
      return Math.floor(stats.totalHours);
    case 'sessions':
      return stats.sessions;
    case 'completions':
      return habits.completions?.[getMonthKey()]?.length || 0;
    case 'unique_games':
      return stats.uniqueGames;
    case 'new_genre': {
      const prevStats = period === 'week'
        ? HabitTrackerService.getWeeklyStats(1)
        : HabitTrackerService.getMonthlyStats(1);
      const currentGenres = new Set(stats.genres);
      const prevGenres = new Set(prevStats.genres);
      return [...currentGenres].filter((g) => !prevGenres.has(g)).length;
    }
    case 'streak': {
      const streaks = HabitTrackerService.getStreaks();
      return streaks.current;
    }
    case 'per_game_time': {
      if (!gameName) return 0;
      const gameData = habits.games?.[gameName];
      return gameData ? Math.floor(gameData.minutes / 60) : 0;
    }
    case 'per_game_sessions': {
      if (!gameName) return 0;
      const gameData = habits.games?.[gameName];
      return gameData ? gameData.sessions : 0;
    }
    case 'genre_time': {
      if (!genre) return 0;
      const periodKey = period === 'week' ? getISOWeek() : getMonthKey();
      const periodData = habits[period === 'week' ? 'weekly' : 'monthly']?.[periodKey];
      if (!periodData) return 0;
      // Approximate: we don't track per-genre minutes directly, so estimate from daily records
      let minutes = 0;
      const daily = habits.daily || {};
      Object.entries(daily).forEach(([date, day]) => {
        if (day.genres?.includes(genre)) {
          minutes += day.minutes || 0;
        }
      });
      return Math.floor(minutes / 60);
    }
    case 'genre_sessions': {
      if (!genre) return 0;
      let sessions = 0;
      const daily = habits.daily || {};
      Object.values(daily).forEach((day) => {
        if (day.genres?.includes(genre)) {
          sessions += day.sessions || 0;
        }
      });
      return sessions;
    }
    default:
      return 0;
  }
};

export const HabitTrackerService = {
  /**
   * Record a gaming session for habit tracking.
   */
  recordSession(gameName, durationMinutes, genres = [], mood = null, intention = null) {
    const habits = loadHabits();
    const today = getTodayDateString();
    const weekKey = getISOWeek();
    const monthKey = getMonthKey();

    if (!habits.daily) habits.daily = {};
    if (!habits.weekly) habits.weekly = {};
    if (!habits.monthly) habits.monthly = {};
    if (!habits.games) habits.games = {};

    // Daily record
    if (!habits.daily[today]) {
      habits.daily[today] = { minutes: 0, games: [], genres: [], sessions: 0 };
    }
    habits.daily[today].minutes += durationMinutes;
    if (!habits.daily[today].games.includes(gameName)) habits.daily[today].games.push(gameName);
    habits.daily[today].genres = [...new Set([...habits.daily[today].genres, ...genres])];
    habits.daily[today].sessions += 1;

    // Weekly record
    if (!habits.weekly[weekKey]) {
      habits.weekly[weekKey] = { minutes: 0, days: [], games: [], genres: [], sessions: 0 };
    }
    habits.weekly[weekKey].minutes += durationMinutes;
    if (!habits.weekly[weekKey].days.includes(today)) habits.weekly[weekKey].days.push(today);
    if (!habits.weekly[weekKey].games.includes(gameName)) habits.weekly[weekKey].games.push(gameName);
    habits.weekly[weekKey].genres = [...new Set([...habits.weekly[weekKey].genres, ...genres])];
    habits.weekly[weekKey].sessions += 1;

    // Monthly record
    if (!habits.monthly[monthKey]) {
      habits.monthly[monthKey] = { minutes: 0, days: [], games: [], genres: [], sessions: 0 };
    }
    habits.monthly[monthKey].minutes += durationMinutes;
    if (!habits.monthly[monthKey].days.includes(today)) habits.monthly[monthKey].days.push(today);
    if (!habits.monthly[monthKey].games.includes(gameName)) habits.monthly[monthKey].games.push(gameName);
    habits.monthly[monthKey].genres = [...new Set([...habits.monthly[monthKey].genres, ...genres])];
    habits.monthly[monthKey].sessions += 1;

    // Per-game record
    if (!habits.games[gameName]) habits.games[gameName] = { minutes: 0, sessions: 0, lastPlayed: today };
    habits.games[gameName].minutes += durationMinutes;
    habits.games[gameName].sessions += 1;
    habits.games[gameName].lastPlayed = today;

    saveHabits(habits);

    // Mood log
    if (mood || intention) {
      const moodLog = loadMoodLog();
      moodLog.push({
        date: today,
        timestamp: Date.now(),
        gameName,
        mood: mood || null,
        intention: intention || null,
        durationMinutes,
      });
      saveMoodLog(moodLog.slice(-365));
    }
  },

  getWeeklyStats(weekOffset = 0) {
    const habits = loadHabits();
    const now = new Date();
    now.setDate(now.getDate() - weekOffset * 7);
    const weekKey = getISOWeek(now);
    const weekly = habits.weekly?.[weekKey] || { minutes: 0, days: [], games: [], genres: [], sessions: 0 };
    return {
      weekKey,
      totalHours: Math.round((weekly.minutes / 60) * 10) / 10,
      totalMinutes: weekly.minutes,
      daysPlayed: weekly.days?.size || weekly.days?.length || 0,
      uniqueGames: weekly.games?.length || 0,
      sessions: weekly.sessions || 0,
      genres: weekly.genres || [],
    };
  },

  getMonthlyStats(monthOffset = 0) {
    const habits = loadHabits();
    const now = new Date();
    now.setMonth(now.getMonth() - monthOffset);
    const monthKey = getMonthKey(now);
    const monthly = habits.monthly?.[monthKey] || { minutes: 0, days: [], games: [], genres: [], sessions: 0 };
    return {
      monthKey,
      totalHours: Math.round((monthly.minutes / 60) * 10) / 10,
      totalMinutes: monthly.minutes,
      daysPlayed: monthly.days?.size || monthly.days?.length || 0,
      uniqueGames: monthly.games?.length || 0,
      sessions: monthly.sessions || 0,
      genres: monthly.genres || [],
    };
  },

  /**
   * Lifetime XP derived from gaming habits. This is the progression signal that
   * replaces the old achievement-grind XP: consistency (days), engagement
   * (sessions), follow-through (completions), and momentum (longest streak).
   * Returns a breakdown so the Rewards/Stats UI can explain how XP was earned.
   */
  getHabitXP() {
    const habits = loadHabits();
    const daily = habits.daily || {};

    const activeDays = Object.keys(daily).length;
    let totalSessions = 0;
    Object.values(daily).forEach((day) => {
      totalSessions += Number(day?.sessions || 0);
    });

    let totalCompletions = 0;
    Object.values(habits.completions || {}).forEach((list) => {
      totalCompletions += Array.isArray(list) ? list.length : 0;
    });

    const longestStreak = this.getStreaks().longest || 0;

    const DAY_XP = 60;
    const SESSION_XP = 40;
    const COMPLETION_XP = 400;
    const STREAK_XP = 50;

    const dayXP = activeDays * DAY_XP;
    const sessionXP = totalSessions * SESSION_XP;
    const completionXP = totalCompletions * COMPLETION_XP;
    const streakXP = longestStreak * STREAK_XP;
    const total = dayXP + sessionXP + completionXP + streakXP;

    return {
      total,
      activeDays,
      totalSessions,
      totalCompletions,
      longestStreak,
      dayXP,
      sessionXP,
      completionXP,
      streakXP,
    };
  },

  getStreaks() {
    const habits = loadHabits();
    const daily = habits.daily || {};
    const dates = Object.keys(daily).sort();
    if (dates.length === 0) return { current: 0, longest: 0, lastPlayed: null };

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    const today = getTodayDateString();

    // Check current streak from today backwards
    for (let i = dates.length - 1; i >= 0; i--) {
      const date = dates[i];
      const expected = new Date(today);
      expected.setDate(expected.getDate() - currentStreak);
      if (date === expected.toISOString().split('T')[0]) {
        currentStreak++;
      } else if (date < expected.toISOString().split('T')[0]) {
        break;
      }
    }

    // Calculate longest streak
    for (let i = 0; i < dates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prev = new Date(dates[i - 1]);
        const curr = new Date(dates[i]);
        const diff = (curr - prev) / MS_PER_DAY;
        if (diff === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);
    }

    return {
      current: currentStreak,
      longest: longestStreak,
      lastPlayed: dates[dates.length - 1],
    };
  },

  getGoals() {
    return loadGoals();
  },

  setGoals(goals) {
    saveGoals(goals);
  },

  getGoalProgress() {
    const goals = loadGoals();
    const weeklyStats = this.getWeeklyStats(0);
    const monthlyStats = this.getMonthlyStats(0);
    const habits = loadHabits();

    const progress = { weekly: [], monthly: [] };

    goals.weekly?.forEach((goal) => {
      if (!goal.active) return;
      const current = calculateGoalCurrent(goal, habits, weeklyStats, monthlyStats);
      progress.weekly.push({
        ...goal,
        current,
        percent: Math.min(100, Math.round((current / goal.target) * 100)),
        completed: current >= goal.target,
      });
    });

    goals.monthly?.forEach((goal) => {
      if (!goal.active) return;
      const current = calculateGoalCurrent(goal, habits, weeklyStats, monthlyStats);
      progress.monthly.push({
        ...goal,
        current,
        percent: Math.min(100, Math.round((current / goal.target) * 100)),
        completed: current >= goal.target,
      });
    });

    return progress;
  },

  createGoal({ label, target, type, period, gameName = null, genre = null }) {
    const goals = loadGoals();
    const newGoal = {
      id: generateGoalId(),
      label: label || `${GOAL_TYPE_LABELS[type] || 'Goal'}: ${target}`,
      target: Number(target) || 1,
      type,
      period,
      active: true,
      gameName: gameName || null,
      genre: genre || null,
      createdAt: new Date().toISOString(),
    };
    goals[period].push(newGoal);
    saveGoals(goals);
    return newGoal;
  },

  updateGoal(id, updates) {
    const goals = loadGoals();
    let updated = false;
    ['weekly', 'monthly'].forEach((period) => {
      const idx = goals[period].findIndex((g) => g.id === id);
      if (idx !== -1) {
        goals[period][idx] = { ...goals[period][idx], ...updates };
        updated = true;
      }
    });
    if (updated) saveGoals(goals);
    return updated;
  },

  deleteGoal(id) {
    const goals = loadGoals();
    let deleted = false;
    ['weekly', 'monthly'].forEach((period) => {
      const before = goals[period].length;
      goals[period] = goals[period].filter((g) => g.id !== id);
      if (goals[period].length < before) deleted = true;
    });
    if (deleted) saveGoals(goals);
    return deleted;
  },

  toggleGoalActive(period, id) {
    const goals = loadGoals();
    const goal = goals[period]?.find((g) => g.id === id);
    if (goal) {
      goal.active = !goal.active;
      saveGoals(goals);
      return goal.active;
    }
    return null;
  },

  getGoalTypeLabel(type) {
    return GOAL_TYPE_LABELS[type] || type;
  },

  getGoalSuggestions(library = []) {
    const habits = loadHabits();
    const weekly = this.getWeeklyStats(0);
    const monthly = this.getMonthlyStats(0);
    const streaks = this.getStreaks();
    const suggestions = [];

    const hasGoal = (type, period) => {
      const goals = loadGoals();
      return goals[period]?.some((g) => g.type === type && g.active);
    };

    // Session count suggestions
    if (weekly.sessions > 0 && !hasGoal('sessions', 'week')) {
      const target = Math.max(3, Math.ceil(weekly.sessions * 1.2));
      suggestions.push({
        label: `Play ${target} sessions this week`,
        target,
        type: 'sessions',
        period: 'week',
        reason: `You played ${weekly.sessions} sessions this week. Push a bit further?`,
      });
    }

    // Hours suggestions
    if (weekly.totalHours > 2 && !hasGoal('hours', 'week')) {
      const target = Math.max(5, Math.ceil(weekly.totalHours * 1.2));
      suggestions.push({
        label: `Play ${target} hours this week`,
        target,
        type: 'hours',
        period: 'week',
        reason: `You're at ${Math.round(weekly.totalHours)}h this week. Step it up?`,
      });
    }

    // Streak suggestion
    if (streaks.current >= 2 && !hasGoal('streak', 'month')) {
      suggestions.push({
        label: `Keep your ${streaks.current}-day streak going for 7 days`,
        target: 7,
        type: 'streak',
        period: 'month',
        reason: `You're on a ${streaks.current}-day streak! Lock it in.`,
      });
    }

    // Unique games suggestion
    if (monthly.uniqueGames > 2 && !hasGoal('unique_games', 'month')) {
      const target = Math.max(3, monthly.uniqueGames + 2);
      suggestions.push({
        label: `Play ${target} different games this month`,
        target,
        type: 'unique_games',
        period: 'month',
        reason: `You've played ${monthly.uniqueGames} games this month. Mix it up!`,
      });
    }

    // Per-game time for most-played game
    const games = habits.games || {};
    const topGame = Object.entries(games).sort((a, b) => b[1].minutes - a[1].minutes)[0];
    if (topGame && topGame[1].minutes > 120 && !hasGoal('per_game_time', 'month')) {
      const hours = Math.floor(topGame[1].minutes / 60);
      const target = Math.max(10, Math.ceil(hours * 1.3));
      suggestions.push({
        label: `Play ${target} hours of ${topGame[0]}`,
        target,
        type: 'per_game_time',
        period: 'month',
        gameName: topGame[0],
        reason: `You've already put ${hours}h into ${topGame[0]}. Set a target?`,
      });
    }

    // Genre suggestion from top genre
    const genreCounts = {};
    Object.values(habits.daily || {}).forEach((day) => {
      day.genres?.forEach((g) => { genreCounts[g] = (genreCounts[g] || 0) + (day.minutes || 0); });
    });
    const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0];
    if (topGenre && topGenre[1] > 120 && !hasGoal('genre_time', 'month')) {
      const hours = Math.floor(topGenre[1] / 60);
      const target = Math.max(10, Math.ceil(hours * 1.2));
      suggestions.push({
        label: `Play ${target} hours of ${topGenre[0]} games`,
        target,
        type: 'genre_time',
        period: 'month',
        genre: topGenre[0],
        reason: `You love ${topGenre[0]} games (${hours}h tracked). Double down?`,
      });
    }

    return suggestions.slice(0, 4);
  },

  getCompletedGoals() {
    const progress = this.getGoalProgress();
    return [...progress.weekly, ...progress.monthly].filter((g) => g.completed);
  },

  getInsights() {
    const habits = loadHabits();
    const daily = habits.daily || {};
    const dates = Object.keys(daily);
    if (dates.length < 3) return [];

    const insights = [];
    const dayOfWeekCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const genreCounts = {};

    dates.forEach((date) => {
      const d = new Date(date);
      dayOfWeekCounts[d.getDay()] += 1;
      daily[date].genres?.forEach((g) => { genreCounts[g] = (genreCounts[g] || 0) + 1; });
    });

    const topDay = Object.entries(dayOfWeekCounts).sort((a, b) => b[1] - a[1])[0];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    if (topDay && topDay[1] > 1) {
      insights.push({ type: 'pattern', text: `You tend to play most on ${dayNames[topDay[0]]}s.` });
    }

    const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0];
    if (topGenre) {
      insights.push({ type: 'preference', text: `Your most-played genre is ${topGenre[0]}.` });
    }

    const streaks = this.getStreaks();
    if (streaks.current >= 3) {
      insights.push({ type: 'streak', text: `You're on a ${streaks.current}-day gaming streak!` });
    }

    const totalHours = Object.values(daily).reduce((sum, d) => sum + (d.minutes || 0), 0) / 60;
    const avgHoursPerDay = totalHours / dates.length;
    if (avgHoursPerDay > 0) {
      insights.push({ type: 'average', text: `You average ${Math.round(avgHoursPerDay * 10) / 10} hours per gaming day.` });
    }

    return insights;
  },

  getMoodLog(limit = 30) {
    return loadMoodLog().slice(-limit);
  },

  logCompletion(gameName) {
    const habits = loadHabits();
    const monthKey = getMonthKey();
    if (!habits.completions) habits.completions = {};
    if (!habits.completions[monthKey]) habits.completions[monthKey] = [];
    if (!habits.completions[monthKey].includes(gameName)) {
      habits.completions[monthKey].push(gameName);
      saveHabits(habits);
    }
  },

  getAllHabits() {
    return loadHabits();
  },

  resetAll() {
    StorageService.removeItem(HABIT_STORAGE_KEY);
    StorageService.removeItem(GOALS_STORAGE_KEY);
    StorageService.removeItem(MOOD_LOG_KEY);
  },
};

export default HabitTrackerService;
