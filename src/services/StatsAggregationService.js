import { PlaytimeAutoLogger } from './PlaytimeAutoLogger';
import { FeatureTracker } from './FeatureTracker';
import { RollingAchievementsTracker } from './RollingAchievementsTracker';

const FEATURE_KEYS = Object.freeze([
  'perfectPlay',
  'surpriseMe',
  'rediscover',
  'continuePlaying',
  'share'
]);

const PERIOD_KEYS = Object.freeze(['daily', 'weekly', 'monthly', 'yearly', 'all']);

const PERIOD_LABELS = Object.freeze({
  daily: 'Today',
  weekly: 'This Week',
  monthly: 'This Month',
  yearly: 'This Year',
  all: 'All Time'
});

const ALL_TIME_FEATURE_STORAGE_KEYS = Object.freeze({
  perfectPlay: 'perfect_play',
  surpriseMe: 'surprise',
  rediscover: 'rediscover',
  continuePlaying: 'continue_playing',
  share: 'share'
});

const getStoredAchievementFeatureStats = () => {
  try {
    return JSON.parse(localStorage.getItem('featureStats') || '{}');
  } catch (error) {
    console.warn('Error reading achievement-backed feature stats:', error);
    return {};
  }
};

const buildEmptyFeatureUsage = () => FEATURE_KEYS.reduce((acc, key) => {
  acc[key] = 0;
  return acc;
}, {});

const incrementCounter = (counter, key, amount = 1) => {
  const normalizedKey = typeof key === 'string' ? key.trim() : '';
  if (!normalizedKey) {
    return;
  }

  counter[normalizedKey] = (counter[normalizedKey] || 0) + amount;
};

const buildLibraryIndex = (library = []) => {
  const index = new Map();

  library.forEach((game) => {
    if (!game) {
      return;
    }

    const keys = new Set();
    if (game.name) {
      keys.add(`name:${String(game.name).toLowerCase()}`);
    }
    if (game.appid !== undefined && game.appid !== null) {
      keys.add(`id:${String(game.appid)}`);
    }
    if (game.app_id !== undefined && game.app_id !== null) {
      keys.add(`id:${String(game.app_id)}`);
    }
    if (game.steamAppId !== undefined && game.steamAppId !== null) {
      keys.add(`id:${String(game.steamAppId)}`);
    }

    keys.forEach((key) => {
      index.set(key, game);
    });
  });

  return index;
};

const findMatchingGame = (session, libraryIndex) => {
  if (!session || !libraryIndex) {
    return null;
  }

  const possibleKeys = [];
  if (session.gameId !== undefined && session.gameId !== null) {
    possibleKeys.push(`id:${String(session.gameId)}`);
  }
  if (session.appid !== undefined && session.appid !== null) {
    possibleKeys.push(`id:${String(session.appid)}`);
  }
  if (session.gameName) {
    possibleKeys.push(`name:${String(session.gameName).toLowerCase()}`);
  }

  for (const key of possibleKeys) {
    const match = libraryIndex.get(key);
    if (match) {
      return match;
    }
  }

  return null;
};

const normalizeSession = (session, libraryIndex) => {
  const timestamp = new Date(session?.timestamp || session?.endTime || session?.date);
  if (Number.isNaN(timestamp.getTime())) {
    return null;
  }

  const playtimeMinutes = Math.max(0, Math.round(Number(session?.playtimeMinutes) || 0));
  const game = findMatchingGame(session, libraryIndex);
  const sessionGenres = Array.isArray(session?.genres) ? session.genres.filter(Boolean) : [];
  const libraryGenres = Array.isArray(game?.genres) ? game.genres.filter(Boolean) : [];
  const genres = sessionGenres.length > 0 ? sessionGenres : libraryGenres;
  const gameName = session?.gameName || game?.name || 'Unknown Game';
  const gameId = session?.gameId || game?.appid || game?.app_id || game?.steamAppId || gameName;
  const platform = session?.platform || game?.platform || 'Unknown';
  const mood = session?.mood || game?.mood || 'Unknown';
  const primaryGenre = genres[0] || 'Unknown';

  return {
    gameName,
    gameId,
    platform,
    mood,
    genres,
    primaryGenre,
    playtimeMinutes,
    timestamp,
    launchMethod: session?.launchMethod || null
  };
};

const isSessionInPeriod = (session, period, referenceDate = new Date()) => {
  if (!session?.timestamp) {
    return false;
  }

  switch (period) {
    case 'daily':
      return session.timestamp.toDateString() === referenceDate.toDateString();
    case 'weekly':
      return RollingAchievementsTracker.getWeekStart(session.timestamp) === RollingAchievementsTracker.getWeekStart(referenceDate);
    case 'monthly':
      return (
        session.timestamp.getFullYear() === referenceDate.getFullYear()
        && session.timestamp.getMonth() === referenceDate.getMonth()
      );
    case 'yearly':
      return session.timestamp.getFullYear() === referenceDate.getFullYear();
    case 'all':
      return true;
    default:
      return false;
  }
};

const getRangeLabel = (period, referenceDate = new Date(), sessions = []) => {
  switch (period) {
    case 'daily':
      return referenceDate.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      });
    case 'weekly': {
      const weekStartText = RollingAchievementsTracker.getWeekStart(referenceDate);
      return `Week of ${new Date(weekStartText).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric'
      })}`;
    }
    case 'monthly':
      return referenceDate.toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric'
      });
    case 'yearly':
      return referenceDate.getFullYear().toString();
    case 'all': {
      if (sessions.length === 0) {
        return 'Lifetime';
      }
      const firstSession = sessions[0];
      const lastSession = sessions[sessions.length - 1];
      if (!firstSession?.timestamp || !lastSession?.timestamp) {
        return 'Lifetime';
      }
      return `${firstSession.timestamp.getFullYear()} - ${lastSession.timestamp.getFullYear()}`;
    }
    default:
      return PERIOD_LABELS[period] || 'Custom';
  }
};

const buildTimeline = (sessions, period) => {
  if (period === 'daily') {
    const labels = ['00-04', '04-08', '08-12', '12-16', '16-20', '20-24'];
    const timeline = Object.fromEntries(labels.map((label) => [label, 0]));
    sessions.forEach((session) => {
      const hour = session.timestamp.getHours();
      const bucketIndex = Math.min(Math.floor(hour / 4), labels.length - 1);
      incrementCounter(timeline, labels[bucketIndex], session.playtimeMinutes);
    });
    return timeline;
  }

  if (period === 'weekly') {
    const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const timeline = Object.fromEntries(labels.map((label) => [label, 0]));
    sessions.forEach((session) => {
      incrementCounter(timeline, labels[session.timestamp.getDay()], session.playtimeMinutes);
    });
    return timeline;
  }

  if (period === 'monthly') {
    const labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'];
    const timeline = Object.fromEntries(labels.map((label) => [label, 0]));
    sessions.forEach((session) => {
      const bucket = Math.min(Math.floor((session.timestamp.getDate() - 1) / 7), labels.length - 1);
      incrementCounter(timeline, labels[bucket], session.playtimeMinutes);
    });
    return timeline;
  }

  if (period === 'yearly') {
    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const timeline = Object.fromEntries(labels.map((label) => [label, 0]));
    sessions.forEach((session) => {
      incrementCounter(timeline, labels[session.timestamp.getMonth()], session.playtimeMinutes);
    });
    return timeline;
  }

  const uniqueYears = Array.from(new Set(sessions.map((session) => session.timestamp.getFullYear()))).sort((a, b) => a - b);
  if (uniqueYears.length <= 1) {
    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const timeline = Object.fromEntries(labels.map((label) => [label, 0]));
    sessions.forEach((session) => {
      incrementCounter(timeline, labels[session.timestamp.getMonth()], session.playtimeMinutes);
    });
    return timeline;
  }

  const timeline = Object.fromEntries(uniqueYears.map((year) => [String(year), 0]));
  sessions.forEach((session) => {
    incrementCounter(timeline, String(session.timestamp.getFullYear()), session.playtimeMinutes);
  });
  return timeline;
};

const buildTopGames = (sessions) => {
  const gameMap = new Map();

  sessions.forEach((session) => {
    const key = String(session.gameId || session.gameName);
    if (!gameMap.has(key)) {
      gameMap.set(key, {
        id: key,
        name: session.gameName,
        platform: session.platform,
        totalPlaytime: 0,
        sessions: 0,
        playCount: 0,
        lastPlayed: session.timestamp,
        avgSessionMinutes: 0
      });
    }

    const entry = gameMap.get(key);
    entry.totalPlaytime += session.playtimeMinutes;
    entry.sessions += 1;
    entry.playCount += 1;
    if (!entry.lastPlayed || session.timestamp > entry.lastPlayed) {
      entry.lastPlayed = session.timestamp;
    }
  });

  return Array.from(gameMap.values())
    .map((entry) => ({
      ...entry,
      avgSessionMinutes: entry.sessions > 0 ? Math.round(entry.totalPlaytime / entry.sessions) : 0
    }))
    .sort((left, right) => {
      if (right.totalPlaytime !== left.totalPlaytime) {
        return right.totalPlaytime - left.totalPlaytime;
      }
      return right.sessions - left.sessions;
    })
    .slice(0, 10);
};

const buildRecentSessions = (sessions) => sessions
  .slice()
  .sort((left, right) => right.timestamp - left.timestamp)
  .slice(0, 8)
  .map((session, index) => ({
    id: `${String(session.gameId || session.gameName)}-${session.timestamp.getTime()}-${index}`,
    gameName: session.gameName,
    platform: session.platform,
    playtimeMinutes: session.playtimeMinutes,
    timestamp: session.timestamp,
    mood: session.mood,
    genre: session.primaryGenre,
    launchMethod: session.launchMethod
  }));

const buildFeatureUsage = (period, rollingStats) => {
  if (period === 'all') {
    const storedCounts = FeatureTracker.getTrackingData()?.features || {};
    const achievementCounts = getStoredAchievementFeatureStats();
    const counts = buildEmptyFeatureUsage();
    FEATURE_KEYS.forEach((key) => {
      const achievementKey = ALL_TIME_FEATURE_STORAGE_KEYS[key];
      counts[key] = Math.max(
        Number(storedCounts[key] || 0),
        Number(achievementCounts?.[achievementKey] || 0)
      );
    });
    const totalUses = Object.values(counts).reduce((sum, value) => sum + value, 0);
    const favoriteFeature = totalUses > 0
      ? Object.entries(counts)
        .sort((left, right) => right[1] - left[1])[0]?.[0] || null
      : null;

    return {
      counts,
      totalUses,
      favoriteFeature
    };
  }

  const periodCounts = rollingStats?.[period]?.featuresUsed || {};
  const counts = buildEmptyFeatureUsage();
  FEATURE_KEYS.forEach((key) => {
    counts[key] = Number(periodCounts[key] || 0);
  });
  const totalUses = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const favoriteFeature = totalUses > 0
    ? Object.entries(counts)
      .sort((left, right) => right[1] - left[1])[0]?.[0] || null
    : null;

  return {
    counts,
    totalUses,
    favoriteFeature
  };
};

const buildSnapshot = (sessions, period, referenceDate, rollingStats) => {
  const playtimeMinutes = sessions.reduce((sum, session) => sum + session.playtimeMinutes, 0);
  const sessionCount = sessions.length;
  const uniqueGames = new Set(sessions.map((session) => String(session.gameId || session.gameName))).size;
  const activeDays = new Set(sessions.map((session) => session.timestamp.toISOString().split('T')[0])).size;
  const longestSessionMinutes = sessions.reduce((max, session) => Math.max(max, session.playtimeMinutes), 0);
  const avgSessionMinutes = sessionCount > 0 ? Math.round(playtimeMinutes / sessionCount) : 0;
  const platformCounts = {};
  const moodCounts = {};
  const genreCounts = {};

  sessions.forEach((session) => {
    incrementCounter(platformCounts, session.platform);
    incrementCounter(moodCounts, session.mood);
    incrementCounter(genreCounts, session.primaryGenre);
  });

  const featureUsage = buildFeatureUsage(period, rollingStats);
  const streak = period === 'all'
    ? { ...(rollingStats?.daily?.streak || { current: 0, best: 0 }) }
    : { ...(rollingStats?.[period]?.streak || { current: 0, best: 0 }) };

  return {
    key: period,
    label: PERIOD_LABELS[period] || period,
    rangeLabel: getRangeLabel(period, referenceDate, sessions),
    playtimeMinutes,
    playtimeHours: Number((playtimeMinutes / 60).toFixed(1)),
    sessions: sessionCount,
    uniqueGames,
    activeDays,
    avgSessionMinutes,
    longestSessionMinutes,
    platformCounts,
    moodCounts,
    genreCounts,
    featureUsage,
    streak,
    timeline: buildTimeline(sessions, period),
    topGames: buildTopGames(sessions),
    recentSessions: buildRecentSessions(sessions)
  };
};

export class StatsAggregationService {
  static getPeriodOptions() {
    return PERIOD_KEYS.map((key) => ({
      key,
      label: PERIOD_LABELS[key] || key
    }));
  }

  static getFeatureKeys() {
    return [...FEATURE_KEYS];
  }

  static getNormalizedSessionHistory(library = []) {
    const libraryIndex = buildLibraryIndex(library);
    return PlaytimeAutoLogger.getSessionHistory()
      .map((session) => normalizeSession(session, libraryIndex))
      .filter(Boolean)
      .sort((left, right) => left.timestamp - right.timestamp);
  }

  static getAvailableYears(library = []) {
    const years = Array.from(new Set(
      this.getNormalizedSessionHistory(library).map((session) => session.timestamp.getFullYear())
    )).sort((left, right) => right - left);

    return years.length > 0 ? years : [new Date().getFullYear()];
  }

  static getDashboardData(library = [], referenceDate = new Date()) {
    const sessionHistory = this.getNormalizedSessionHistory(library);

    // Only recompute if we have new library data, not on every refresh
    // This prevents wiping out current tracking progress
    const currentLibraryHash = JSON.stringify(library).slice(0, 100);
    const lastLibraryHash = localStorage.getItem('lastLibraryHash');
    
    if (currentLibraryHash !== lastLibraryHash) {
      RollingAchievementsTracker.recomputeActivityFromHistory(library);
      localStorage.setItem('lastLibraryHash', currentLibraryHash);
    }
    
    const rollingStats = {
      daily: RollingAchievementsTracker.getDailyStats(),
      weekly: RollingAchievementsTracker.getWeeklyStats(),
      monthly: RollingAchievementsTracker.getMonthlyStats(),
      yearly: RollingAchievementsTracker.getYearlyStats()
    };

    const periods = PERIOD_KEYS.reduce((acc, period) => {
      const filteredSessions = sessionHistory.filter((session) => isSessionInPeriod(session, period, referenceDate));
      acc[period] = buildSnapshot(filteredSessions, period, referenceDate, rollingStats);
      return acc;
    }, {});

    return {
      lastUpdated: Date.now(),
      totalSessionsRecorded: sessionHistory.length,
      periods
    };
  }
}
