import { StatsAggregationService } from './StatsAggregationService';
import HowLongToBeatService from './HowLongToBeatService';

const getMinutesPlayed = (game) => {
  const direct = Number(game?.time_played || 0);
  const nested = Number(game?.playtime?.total || 0);
  return Math.max(Number.isFinite(direct) ? direct : 0, Number.isFinite(nested) ? nested : 0);
};

const getGameStatus = (game) => (
  game?.completionStatus
  || game?.completion_status
  || game?.status
  || (game?.completed ? 'Completed' : 'Unfinished')
);

const isCompleted = (game) => {
  const status = getGameStatus(game);
  return status === 'Completed' || status === 'completed' || game?.completed === true;
};

const isDropped = (game) => {
  const status = getGameStatus(game);
  return status === 'Dropped' || status === 'dropped' || status === 'Abandoned';
};

const getGenreList = (game) => {
  if (Array.isArray(game?.genres) && game.genres.length > 0) return game.genres;
  if (Array.isArray(game?.genre) && game.genre.length > 0) return game.genre;
  if (typeof game?.genre === 'string' && game.genre) return [game.genre];
  return [];
};

const getMood = (game) => game?.mood || game?.detectedMood || null;

export class LibraryAnalyticsService {
  static getPlayPatternAnalysis(library = []) {
    const sessions = StatsAggregationService.getSessionHistory?.() || [];
    const sessionList = Array.isArray(sessions) ? sessions : Object.values(sessions).flat();

    if (sessionList.length === 0) {
      return null;
    }

    const hourBuckets = new Array(24).fill(0);
    const dayBuckets = new Array(7).fill(0);
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const sessionLengths = [];
    let totalSessionMinutes = 0;

    sessionList.forEach((session) => {
      const start = session.startedAt ? new Date(session.startedAt) : null;
      const duration = Number(session.durationMinutes || session.minutes || 0);
      if (start && Number.isFinite(duration)) {
        hourBuckets[start.getHours()] += duration;
        dayBuckets[start.getDay()] += duration;
        sessionLengths.push(duration);
        totalSessionMinutes += duration;
      }
    });

    const avgSessionLength = sessionLengths.length > 0
      ? Math.round(totalSessionMinutes / sessionLengths.length)
      : 0;

    const sortedLengths = [...sessionLengths].sort((a, b) => a - b);
    const medianSessionLength = sortedLengths.length > 0
      ? sortedLengths[Math.floor(sortedLengths.length / 2)]
      : 0;

    const peakHour = hourBuckets.indexOf(Math.max(...hourBuckets));
    const peakDayIndex = dayBuckets.indexOf(Math.max(...dayBuckets));

    // Streak analysis
    const sessionDates = sessionList
      .map((s) => s.startedAt ? new Date(s.startedAt).toDateString() : null)
      .filter(Boolean);
    const uniqueDates = [...new Set(sessionDates)].sort((a, b) => new Date(a) - new Date(b));
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    for (let i = 0; i < uniqueDates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prev = new Date(uniqueDates[i - 1]);
        const curr = new Date(uniqueDates[i]);
        const diffDays = (curr - prev) / 86400000;
        if (diffDays <= 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);
    }

    // Current streak from today
    if (uniqueDates.length > 0) {
      const lastDate = new Date(uniqueDates[uniqueDates.length - 1]);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lastMidnight = new Date(lastDate);
      lastMidnight.setHours(0, 0, 0, 0);
      const daysSince = (today - lastMidnight) / 86400000;
      if (daysSince <= 1) {
        currentStreak = tempStreak;
      } else {
        currentStreak = 0;
      }
    }

    return {
      totalSessions: sessionList.length,
      avgSessionLength,
      medianSessionLength,
      peakHour,
      peakDay: dayLabels[peakDayIndex],
      hourDistribution: hourBuckets.map((m, i) => ({ hour: i, minutes: m })),
      dayDistribution: dayBuckets.map((m, i) => ({ day: dayLabels[i], minutes: m })),
      currentStreak,
      longestStreak,
      totalSessionMinutes
    };
  }

  static getBacklogOptimizer(library = []) {
    const backlog = (library || []).filter((g) => !isCompleted(g) && !isDropped(g));
    if (backlog.length === 0) return null;

    const scored = backlog.map((game) => {
      const minutes = getMinutesPlayed(game);
      const hours = minutes / 60;
      const hltb = HowLongToBeatService.getEstimate(game);
      const hltbHours = hltb?.mainStory ?? hltb?.main ?? null;
      const remainingHours = hltbHours ? Math.max(0, hltbHours - hours) : null;
      const completionPct = hltbHours && hltbHours > 0 ? Math.min(100, (hours / hltbHours) * 100) : 0;

      // Value score: higher rating + closer to completion + shorter remaining time
      const ratingBoost = (game.userRating || game.rating || 0) * 5;
      const completionBoost = completionPct * 2;
      const momentumBoost = hours > 0 ? 15 : 0;
      const recencyBoost = game.last_played
        ? Math.max(0, 30 - (Date.now() - new Date(game.last_played).getTime()) / 86400000)
        : 0;
      const shortGameBoost = hltbHours && hltbHours < 10 ? 20 : 0;

      const score = ratingBoost + completionBoost + momentumBoost + recencyBoost + shortGameBoost;

      return {
        game,
        hoursPlayed: hours,
        hltbHours,
        remainingHours,
        completionPct: Math.round(completionPct),
        score: Math.round(score),
        isQuickWin: hltbHours !== null && remainingHours !== null && remainingHours <= 5 && completionPct > 20
      };
    });

    scored.sort((a, b) => b.score - a.score);

    const quickWins = scored.filter((s) => s.isQuickWin).slice(0, 5);
    const bestInvestments = scored.filter((s) => (s.game.userRating || s.game.rating || 0) >= 7).slice(0, 5);

    return {
      totalBacklog: backlog.length,
      estimatedTotalHours: scored.reduce((sum, s) => sum + (s.remainingHours || 0), 0),
      quickWins,
      bestInvestments,
      topPicks: scored.slice(0, 5)
    };
  }

  static getMoodGenreMatrix(library = []) {
    const games = library || [];
    if (games.length === 0) return null;

    const matrix = {};
    const genreStats = {};
    const moodStats = {};

    games.forEach((game) => {
      const genres = getGenreList(game);
      const mood = getMood(game) || 'Unclassified';
      const minutes = getMinutesPlayed(game);
      const completed = isCompleted(game);
      const dropped = isDropped(game);

      genres.forEach((genre) => {
        if (!genreStats[genre]) {
          genreStats[genre] = { total: 0, completed: 0, dropped: 0, hours: 0, games: 0 };
        }
        genreStats[genre].games++;
        genreStats[genre].total++;
        genreStats[genre].hours += minutes / 60;
        if (completed) genreStats[genre].completed++;
        if (dropped) genreStats[genre].dropped++;
      });

      if (!moodStats[mood]) {
        moodStats[mood] = { total: 0, completed: 0, dropped: 0, hours: 0, games: 0 };
      }
      moodStats[mood].games++;
      moodStats[mood].total++;
      moodStats[mood].hours += minutes / 60;
      if (completed) moodStats[mood].completed++;
      if (dropped) moodStats[mood].dropped++;

      genres.forEach((genre) => {
        const key = `${genre}::${mood}`;
        if (!matrix[key]) {
          matrix[key] = { genre, mood, games: 0, hours: 0, completed: 0, dropped: 0 };
        }
        matrix[key].games++;
        matrix[key].hours += minutes / 60;
        if (completed) matrix[key].completed++;
        if (dropped) matrix[key].dropped++;
      });
    });

    // Completion rates
    Object.values(genreStats).forEach((s) => {
      s.completionRate = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
      s.dropRate = s.total > 0 ? Math.round((s.dropped / s.total) * 100) : 0;
      s.avgHours = s.games > 0 ? Math.round(s.hours / s.games * 10) / 10 : 0;
    });

    Object.values(moodStats).forEach((s) => {
      s.completionRate = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
      s.dropRate = s.total > 0 ? Math.round((s.dropped / s.total) * 100) : 0;
      s.avgHours = s.games > 0 ? Math.round(s.hours / s.games * 10) / 10 : 0;
    });

    const topGenre = Object.entries(genreStats)
      .sort((a, b) => b[1].hours - a[1].hours)[0];
    const bestCompletionGenre = Object.entries(genreStats)
      .filter(([, s]) => s.games >= 3)
      .sort((a, b) => b[1].completionRate - a[1].completionRate)[0];
    const worstCompletionGenre = Object.entries(genreStats)
      .filter(([, s]) => s.games >= 3)
      .sort((a, b) => a[1].completionRate - b[1].completionRate)[0];

    return {
      genreStats,
      moodStats,
      matrix: Object.values(matrix).sort((a, b) => b.hours - a.hours),
      topGenre: topGenre ? { name: topGenre[0], ...topGenre[1] } : null,
      bestCompletionGenre: bestCompletionGenre ? { name: bestCompletionGenre[0], ...bestCompletionGenre[1] } : null,
      worstCompletionGenre: worstCompletionGenre ? { name: worstCompletionGenre[0], ...worstCompletionGenre[1] } : null
    };
  }

  static getLibraryDiversityScore(library = []) {
    const games = library || [];
    if (games.length === 0) return null;

    const genres = new Set();
    const platforms = new Set();
    const moods = new Set();
    let totalMinutes = 0;
    let ratedGames = 0;
    let ratedSum = 0;

    games.forEach((game) => {
      getGenreList(game).forEach((g) => genres.add(g));
      if (game.platform || game.brandPlatform) platforms.add(game.platform || game.brandPlatform);
      const mood = getMood(game);
      if (mood) moods.add(mood);
      totalMinutes += getMinutesPlayed(game);
      const rating = game.userRating || game.rating || 0;
      if (rating > 0) { ratedGames++; ratedSum += rating; }
    });

    const genreDiversity = Math.min(100, Math.round((genres.size / Math.max(1, games.length)) * 200));
    const platformDiversity = Math.min(100, Math.round((platforms.size / 5) * 100));
    const moodDiversity = Math.min(100, Math.round((moods.size / 5) * 100));
    const avgRating = ratedGames > 0 ? Math.round(ratedSum / ratedGames * 10) / 10 : 0;

    const score = Math.round((genreDiversity + platformDiversity + moodDiversity + (avgRating * 10)) / 4);

    return {
      score,
      genreDiversity,
      platformDiversity,
      moodDiversity,
      avgRating,
      genreCount: genres.size,
      platformCount: platforms.size,
      moodCount: moods.size,
      totalGames: games.length,
      totalHours: Math.round(totalMinutes / 60 * 10) / 10
    };
  }

  static getPowerInsights(library = []) {
    const games = library || [];
    if (games.length < 3) return [];

    const insights = [];
    const matrix = this.getMoodGenreMatrix(games);
    const pattern = this.getPlayPatternAnalysis(games);
    const backlog = this.getBacklogOptimizer(games);

    // Genre insights
    if (matrix?.worstCompletionGenre && matrix.worstCompletionGenre.completionRate < 30) {
      insights.push({
        type: 'warning',
        icon: '⚠️',
        title: `${matrix.worstCompletionGenre.name} Drop-off`,
        text: `You only finish ${matrix.worstCompletionGenre.completionRate}% of ${matrix.worstCompletionGenre.name} games. Consider shorter titles in this genre.`
      });
    }

    if (matrix?.bestCompletionGenre && matrix.bestCompletionGenre.completionRate > 70) {
      insights.push({
        type: 'success',
        icon: '✅',
        title: `${matrix.bestCompletionGenre.name} Specialist`,
        text: `You complete ${matrix.bestCompletionGenre.completionRate}% of ${matrix.bestCompletionGenre.name} games — this is your strongest genre.`
      });
    }

    // Backlog insights
    if (backlog?.quickWins.length > 0) {
      insights.push({
        type: 'tip',
        icon: '🎯',
        title: 'Quick Wins Available',
        text: `You have ${backlog.quickWins.length} games nearly finished. A few hours could clear several titles.`
      });
    }

    if (backlog && backlog.estimatedTotalHours > 100) {
      insights.push({
        type: 'info',
        icon: '📚',
        title: 'Backlog Mountain',
        text: `Your backlog needs an estimated ${Math.round(backlog.estimatedTotalHours)} hours. Focus on quick wins to build momentum.`
      });
    }

    // Play pattern insights
    if (pattern && pattern.avgSessionLength > 0) {
      const sessionLabel = pattern.avgSessionLength < 30 ? 'short' : pattern.avgSessionLength < 90 ? 'moderate' : 'long';
      insights.push({
        type: 'info',
        icon: '⏱️',
        title: 'Session Profile',
        text: `Your average session is ${pattern.avgSessionLength} minutes (${sessionLabel}). Best played at ${pattern.peakHour}:00 on ${pattern.peakDay}s.`
      });
    }

    if (pattern && pattern.currentStreak >= 3) {
      insights.push({
        type: 'success',
        icon: '🔥',
        title: 'On Fire',
        text: `You're on a ${pattern.currentStreak}-day gaming streak. Keep it going!`
      });
    }

    if (pattern && pattern.currentStreak === 0 && pattern.longestStreak > 5) {
      insights.push({
        type: 'tip',
        icon: '🔄',
        title: 'Streak Broken',
        text: `Your longest streak was ${pattern.longestStreak} days. Time to start a new one?`
      });
    }

    // Rating insights
    const unrated = games.filter((g) => !(g.userRating || g.rating)).length;
    if (unrated > games.length * 0.5) {
      insights.push({
        type: 'tip',
        icon: '⭐',
        title: 'Rate Your Journey',
        text: `${unrated} games in your library have no rating. Rating games improves recommendations.`
      });
    }

    const hiddenGems = games.filter((g) => {
      const rating = g.userRating || g.rating || 0;
      const hours = getMinutesPlayed(g) / 60;
      return rating >= 8 && hours < 5 && !isCompleted(g);
    });
    if (hiddenGems.length > 0) {
      insights.push({
        type: 'success',
        icon: '💎',
        title: 'Hidden Gems Waiting',
        text: `You rated ${hiddenGems.length} short games 8+ but haven't finished them. Easy wins!`
      });
    }

    return insights.slice(0, 6);
  }

  static getFullAnalytics(library = []) {
    return {
      playPatterns: this.getPlayPatternAnalysis(library),
      backlog: this.getBacklogOptimizer(library),
      matrix: this.getMoodGenreMatrix(library),
      diversity: this.getLibraryDiversityScore(library),
      insights: this.getPowerInsights(library)
    };
  }
}

export default LibraryAnalyticsService;
