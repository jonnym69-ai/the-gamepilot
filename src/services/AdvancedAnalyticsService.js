import { StatsAggregationService } from './StatsAggregationService';
import { SteamPriceService } from './SteamPriceService';

const getMinutesPlayed = (game) => {
  const direct = Number(game?.time_played || 0);
  const nested = Number(game?.playtime?.total || 0);
  return Math.max(Number.isFinite(direct) ? direct : 0, Number.isFinite(nested) ? nested : 0);
};

const getStatus = (game) => (
  game?.completionStatus
  || game?.completion_status
  || game?.status
  || (game?.completed ? 'Completed' : 'Unfinished')
);

const isCompleted = (game) => {
  const status = getStatus(game);
  return status === 'Completed' || status === 'completed' || game?.completed === true;
};

const isDropped = (game) => {
  const status = getStatus(game);
  return status === 'Dropped' || status === 'dropped' || status === 'Abandoned';
};

const getGenres = (game) => {
  if (Array.isArray(game?.genres) && game.genres.length > 0) return game.genres;
  if (Array.isArray(game?.genre) && game.genre.length > 0) return game.genre;
  if (typeof game?.genre === 'string' && game.genre) return [game.genre];
  return [];
};

const getReleaseYear = (game) => {
  if (!game) return null;
  const raw = game.releaseDate || game.release_date || game.releaseYear || game.year;
  if (!raw) return null;
  const match = String(raw).match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[1]) : null;
};

const getPrice = (game) => {
  if (!game) return 0;
  const steamPrice = SteamPriceService.getPriceNumeric(game);
  return steamPrice > 0 ? steamPrice : Number(game.priceNumeric || game.price || 0);
};

const formatCurrency = (value) => {
  const num = Number(value) || 0;
  return `$${num.toFixed(2)}`;
};

const groupByField = (library, field, options = {}) => {
  const {
    minGames = 1,
    topCount = 10,
    sortBy = 'hours',
    includeValue = true
  } = options;

  const groups = {};

  library.forEach((game) => {
    // Support both plural array fields (developers) and singular string fields (developer)
    const pluralField = field;
    const singularField = field.replace(/s$/, '');
    const values = game?.[pluralField] ?? game?.[singularField];
    if (!values) return;
    const list = Array.isArray(values) ? values : [values];
    const minutes = getMinutesPlayed(game);
    const price = includeValue ? getPrice(game) : 0;
    const completed = isCompleted(game);
    const dropped = isDropped(game);

    list.filter(Boolean).forEach((name) => {
      const key = String(name).trim();
      if (!key) return;
      if (!groups[key]) {
        groups[key] = { name: key, games: 0, minutes: 0, hours: 0, value: 0, completed: 0, dropped: 0 };
      }
      groups[key].games += 1;
      groups[key].minutes += minutes;
      groups[key].hours += minutes / 60;
      groups[key].value += price;
      if (completed) groups[key].completed += 1;
      if (dropped) groups[key].dropped += 1;
    });
  });

  const result = Object.values(groups)
    .filter((g) => g.games >= minGames)
    .map((g) => ({
      ...g,
      hours: Math.round(g.hours * 10) / 10,
      value: Math.round(g.value * 100) / 100,
      completionRate: g.games > 0 ? Math.round((g.completed / g.games) * 100) : 0,
      dropRate: g.games > 0 ? Math.round((g.dropped / g.games) * 100) : 0,
      valuePerHour: g.hours > 0 ? Math.round((g.value / g.hours) * 100) / 100 : 0
    }))
    .sort((a, b) => {
      if (sortBy === 'hours') return b.hours - a.hours;
      if (sortBy === 'value') return b.value - a.value;
      if (sortBy === 'games') return b.games - a.games;
      return b.hours - a.hours;
    })
    .slice(0, topCount);

  return result;
};

const getPriceTier = (price) => {
  if (price === 0) return 'Free';
  if (price < 10) return 'Budget (<$10)';
  if (price < 30) return 'Mid ($10-$30)';
  if (price < 60) return 'Premium ($30-$60)';
  return 'AAA ($60+)';
};

export class AdvancedAnalyticsService {
  static getDeveloperPublisherStats(library = []) {
    if (!Array.isArray(library) || library.length === 0) return null;
    return {
      developers: groupByField(library, 'developers', { minGames: 1, topCount: 10, sortBy: 'hours' }),
      publishers: groupByField(library, 'publishers', { minGames: 1, topCount: 10, sortBy: 'hours' })
    };
  }

  static getPriceTierAnalysis(library = []) {
    if (!Array.isArray(library) || library.length === 0) return null;

    const tiers = {};
    let totalValue = 0;
    let totalHours = 0;

    library.forEach((game) => {
      const price = getPrice(game);
      const tier = getPriceTier(price);
      const minutes = getMinutesPlayed(game);
      const hours = minutes / 60;

      if (!tiers[tier]) {
        tiers[tier] = { tier, games: 0, value: 0, hours: 0 };
      }
      tiers[tier].games += 1;
      tiers[tier].value += price;
      tiers[tier].hours += hours;
      totalValue += price;
      totalHours += hours;
    });

    const breakdown = Object.values(tiers)
      .map((t) => ({
        ...t,
        value: Math.round(t.value * 100) / 100,
        hours: Math.round(t.hours * 10) / 10,
        valuePct: totalValue > 0 ? Math.round((t.value / totalValue) * 100) : 0,
        hoursPct: totalHours > 0 ? Math.round((t.hours / totalHours) * 100) : 0
      }))
      .sort((a, b) => b.value - a.value);

    return {
      totalValue: Math.round(totalValue * 100) / 100,
      totalHours: Math.round(totalHours * 10) / 10,
      breakdown
    };
  }

  static getValuePerHourAnalysis(library = []) {
    if (!Array.isArray(library) || library.length === 0) return null;

    const games = library
      .map((game) => {
        const hours = getMinutesPlayed(game) / 60;
        const value = getPrice(game);
        return {
          game,
          name: game.name || 'Unknown',
          hours: Math.round(hours * 10) / 10,
          value: Math.round(value * 100) / 100,
          valuePerHour: hours > 0 ? Math.round((value / hours) * 100) / 100 : 0,
          platform: game.platform || 'Unknown',
          genres: getGenres(game)
        };
      })
      .filter((g) => g.hours > 0 && g.value > 0)
      .sort((a, b) => b.valuePerHour - a.valuePerHour);

    const bestValue = games.slice(0, 5);
    const worstValue = [...games].sort((a, b) => a.valuePerHour - b.valuePerHour).slice(0, 5);
    const mostPlayed = [...games].sort((a, b) => b.hours - a.hours).slice(0, 5);

    return { bestValue, worstValue, mostPlayed, totalGames: games.length };
  }

  static getCompletionAnalytics(library = []) {
    if (!Array.isArray(library) || library.length === 0) return null;

    const total = library.length;
    const completed = library.filter(isCompleted).length;
    const dropped = library.filter(isDropped).length;
    const unfinished = total - completed - dropped;

    const byGenre = groupByField(library, 'genres', { minGames: 3, topCount: 10, sortBy: 'games', includeValue: false })
      .sort((a, b) => b.completionRate - a.completionRate);

    const byPlatform = {};
    library.forEach((game) => {
      const platform = game.platform || 'Unknown';
      if (!byPlatform[platform]) {
        byPlatform[platform] = { platform, games: 0, completed: 0, dropped: 0 };
      }
      byPlatform[platform].games += 1;
      if (isCompleted(game)) byPlatform[platform].completed += 1;
      if (isDropped(game)) byPlatform[platform].dropped += 1;
    });

    const byYear = {};
    library.forEach((game) => {
      const year = getReleaseYear(game) || 'Unknown';
      if (!byYear[year]) {
        byYear[year] = { year, games: 0, completed: 0, dropped: 0 };
      }
      byYear[year].games += 1;
      if (isCompleted(game)) byYear[year].completed += 1;
      if (isDropped(game)) byYear[year].dropped += 1;
    });

    const mapCompletion = (g) => ({
      ...g,
      completionRate: g.games > 0 ? Math.round((g.completed / g.games) * 100) : 0,
      dropRate: g.games > 0 ? Math.round((g.dropped / g.games) * 100) : 0
    });

    return {
      overall: {
        total,
        completed,
        dropped,
        unfinished,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        dropRate: total > 0 ? Math.round((dropped / total) * 100) : 0
      },
      byGenre,
      byPlatform: Object.values(byPlatform).map(mapCompletion).sort((a, b) => b.games - a.games),
      byYear: Object.values(byYear).map(mapCompletion).sort((a, b) => String(b.year) - String(a.year))
    };
  }

  static getGenreEvolution(library = []) {
    const sessions = StatsAggregationService.getNormalizedSessionHistory?.(library) || [];
    if (sessions.length === 0) return null;

    const monthlyGenre = {};

    sessions.forEach((session) => {
      const date = session.timestamp;
      if (!date) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
      if (!monthlyGenre[key]) {
        monthlyGenre[key] = { label, genres: {} };
      }
      const genres = session.genres || [session.primaryGenre].filter(Boolean);
      genres.forEach((genre) => {
        monthlyGenre[key].genres[genre] = (monthlyGenre[key].genres[genre] || 0) + session.playtimeMinutes;
      });
    });

    const sortedKeys = Object.keys(monthlyGenre).sort();
    const topGenres = new Map();
    sortedKeys.forEach((key) => {
      Object.entries(monthlyGenre[key].genres)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([genre]) => topGenres.set(genre, true));
    });

    const labels = sortedKeys.map((key) => monthlyGenre[key].label);
    const datasets = Array.from(topGenres.keys()).map((genre, index) => ({
      label: genre,
      data: sortedKeys.map((key) => Math.round((monthlyGenre[key].genres[genre] || 0) / 60 * 10) / 10)
    }));

    return { labels, datasets };
  }

  static getPlatformValueBreakdown(library = []) {
    if (!Array.isArray(library) || library.length === 0) return null;

    const platforms = {};
    library.forEach((game) => {
      const platform = game.platform || 'Unknown';
      const minutes = getMinutesPlayed(game);
      const value = getPrice(game);

      if (!platforms[platform]) {
        platforms[platform] = { platform, games: 0, hours: 0, value: 0 };
      }
      platforms[platform].games += 1;
      platforms[platform].hours += minutes / 60;
      platforms[platform].value += value;
    });

    return Object.values(platforms)
      .map((p) => ({
        ...p,
        hours: Math.round(p.hours * 10) / 10,
        value: Math.round(p.value * 100) / 100,
        valuePerHour: p.hours > 0 ? Math.round((p.value / p.hours) * 100) / 100 : 0
      }))
      .sort((a, b) => b.hours - a.hours);
  }

  static getBacklogInvestments(library = []) {
    if (!Array.isArray(library) || library.length === 0) return null;

    const backlog = library.filter((g) => !isCompleted(g) && !isDropped(g));
    const totalBacklogValue = backlog.reduce((sum, g) => sum + getPrice(g), 0);
    const totalBacklogHours = backlog.reduce((sum, g) => sum + getMinutesPlayed(g) / 60, 0);

    const topUnplayed = backlog
      .filter((g) => getMinutesPlayed(g) === 0)
      .sort((a, b) => getPrice(b) - getPrice(a))
      .slice(0, 5)
      .map((g) => ({ name: g.name, value: getPrice(g), platform: g.platform }));

    const biggestPartial = backlog
      .filter((g) => getMinutesPlayed(g) > 0)
      .sort((a, b) => getPrice(b) - getPrice(a))
      .slice(0, 5)
      .map((g) => ({ name: g.name, value: getPrice(g), hours: Math.round(getMinutesPlayed(g) / 60 * 10) / 10, platform: g.platform }));

    return {
      totalBacklogGames: backlog.length,
      totalBacklogValue: Math.round(totalBacklogValue * 100) / 100,
      totalBacklogHours: Math.round(totalBacklogHours * 10) / 10,
      topUnplayed,
      biggestPartial
    };
  }

  static getBacklogPriority(library = []) {
    if (!Array.isArray(library) || library.length === 0) return null;

    const favoriteGenres = this.getTopGenres(library, 5);
    const favoriteMoods = this.getTopMoods(library, 5);
    const completion = this.getCompletionAnalytics(library);
    const avgCompletion = completion?.overall?.completionRate || 0;

    const backlog = library.filter((g) => !isCompleted(g) && !isDropped(g));
    const year = new Date().getFullYear();

    const scored = backlog.map((game) => {
      const price = getPrice(game);
      const hours = getMinutesPlayed(game) / 60;
      const genres = getGenres(game);
      const mood = game.mood || game.assignedMood;
      const releaseYear = getReleaseYear(game);
      const genreBoost = genres.reduce((sum, genre) => {
        return sum + (favoriteGenres.find((g) => g.name === genre)?.rank || 0);
      }, 0);
      const moodBoost = favoriteMoods.find((m) => m.name === mood)?.rank || 0;
      const startedBoost = hours > 0 ? 20 : 0;
      const recencyBoost = releaseYear && year - releaseYear < 3 ? 15 : 0;
      const valueScore = Math.min(price * 3, 100);
      const completionGap = avgCompletion > 0 ? avgCompletion / 100 : 0.5;

      const score = valueScore + genreBoost * 8 + moodBoost * 6 + startedBoost + recencyBoost + completionGap * 25;
      return {
        name: game.name || 'Unknown',
        platform: game.platform,
        genres,
        mood,
        value: price,
        hours: Math.round(hours * 10) / 10,
        releaseYear,
        score: Math.round(score)
      };
    });

    return scored.sort((a, b) => b.score - a.score).slice(0, 10);
  }

  static getTopGenres(library = [], topCount = 5) {
    const genres = {};
    library.forEach((game) => {
      const list = getGenres(game);
      list.forEach((genre) => {
        genres[genre] = (genres[genre] || 0) + getMinutesPlayed(game);
      });
    });
    return Object.entries(genres)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topCount)
      .map(([name], index) => ({ name, rank: topCount - index }));
  }

  static getTopMoods(library = [], topCount = 5) {
    const moods = {};
    library.forEach((game) => {
      const mood = game.mood || game.assignedMood;
      if (!mood) return;
      moods[mood] = (moods[mood] || 0) + getMinutesPlayed(game);
    });
    return Object.entries(moods)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topCount)
      .map(([name], index) => ({ name, rank: topCount - index }));
  }

  static getNextUpRecommendations(library = []) {
    if (!Array.isArray(library) || library.length === 0) return null;
    const priority = this.getBacklogPriority(library);
    if (!priority || priority.length === 0) return null;
    return priority.slice(0, 5).map((g) => ({ ...g, reason: this.buildNextUpReason(g) }));
  }

  static buildNextUpReason(game) {
    const reasons = [];
    if (game.hours > 0) reasons.push('already started');
    if (game.value > 30) reasons.push('high value');
    if (game.releaseYear && new Date().getFullYear() - game.releaseYear < 3) reasons.push('recent release');
    if (reasons.length === 0) reasons.push('matches your taste');
    return reasons.join(' + ');
  }

  static getSessionQuality(library = []) {
    const sessions = StatsAggregationService.getNormalizedSessionHistory?.(library) || [];
    if (sessions.length === 0) return null;

    const sorted = [...sessions].sort((a, b) => a.timestamp - b.timestamp);
    const durations = sorted.map((s) => s.playtimeMinutes || 0);
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const longest = Math.max(...durations);

    const dayCounts = {};
    sorted.forEach((s) => {
      const key = s.timestamp.toISOString().split('T')[0];
      dayCounts[key] = (dayCounts[key] || 0) + 1;
    });
    const streaks = [];
    let current = 0;
    const sortedDays = Object.keys(dayCounts).sort();
    sortedDays.forEach((day, index) => {
      if (index === 0) {
        current = 1;
        return;
      }
      const prev = new Date(sortedDays[index - 1]);
      const curr = new Date(day);
      const diff = (curr - prev) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        current += 1;
      } else {
        streaks.push(current);
        current = 1;
      }
    });
    streaks.push(current);
    const bestStreak = Math.max(...streaks);

    const weekdayHours = new Array(7).fill(0);
    sorted.forEach((s) => {
      weekdayHours[s.timestamp.getDay()] += (s.playtimeMinutes || 0) / 60;
    });
    const bestDayIndex = weekdayHours.indexOf(Math.max(...weekdayHours));
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const consistency = sortedDays.length > 1
      ? (sortedDays.length / ((new Date(sortedDays[sortedDays.length - 1]) - new Date(sortedDays[0])) / (1000 * 60 * 60 * 24) + 1)) * 100
      : 100;

    return {
      totalSessions: sessions.length,
      averageSessionMinutes: Math.round(avg),
      longestSessionMinutes: longest,
      bestStreak,
      bestDay: dayNames[bestDayIndex],
      bestDayHours: Math.round(weekdayHours[bestDayIndex] * 10) / 10,
      consistencyScore: Math.round(Math.min(consistency, 100))
    };
  }

  static getInsights(library = []) {
    if (!Array.isArray(library) || library.length === 0) return [];

    const insights = [];
    const valuePerHour = this.getValuePerHourAnalysis(library);
    const completion = this.getCompletionAnalytics(library);
    const backlog = this.getBacklogInvestments(library);
    const devPub = this.getDeveloperPublisherStats(library);
    const priceTiers = this.getPriceTierAnalysis(library);
    const nextUp = this.getNextUpRecommendations(library);
    const sessionQuality = this.getSessionQuality(library);

    if (valuePerHour?.bestValue?.[0]) {
      const best = valuePerHour.bestValue[0];
      insights.push({
        type: 'success',
        icon: '💎',
        title: 'Best Value Game',
        text: `${best.name} cost ${formatCurrency(best.value)} and gave you ${best.hours}h — ${formatCurrency(best.valuePerHour)}/hour.`
      });
    }

    if (valuePerHour?.worstValue?.[0]) {
      const worst = valuePerHour.worstValue[0];
      if (worst.valuePerHour > 0 && worst.valuePerHour > (valuePerHour.bestValue?.[0]?.valuePerHour || 0) * 5) {
        insights.push({
          type: 'warning',
          icon: '💸',
          title: 'Premium per Hour',
          text: `${worst.name} is your most expensive hour at ${formatCurrency(worst.valuePerHour)}/hour.`
        });
      }
    }

    if (completion?.byGenre?.[0]) {
      const best = completion.byGenre[0];
      insights.push({
        type: 'success',
        icon: '🏆',
        title: 'Most Completed Genre',
        text: `You finish ${best.completionRate}% of ${best.name} games — your strongest genre.`
      });
    }

    if (backlog?.totalBacklogValue > 0) {
      insights.push({
        type: 'info',
        icon: '📚',
        title: 'Backlog Investment',
        text: `You own ${backlog.totalBacklogGames} unplayed or unfinished games worth ${formatCurrency(backlog.totalBacklogValue)}.`
      });
    }

    if (devPub?.publishers?.[0]) {
      const top = devPub.publishers[0];
      insights.push({
        type: 'info',
        icon: '🏢',
        title: 'Top Publisher',
        text: `${top.name} dominates with ${top.hours}h across ${top.games} games.`
      });
    }

    if (priceTiers?.breakdown?.length > 0) {
      const biggest = priceTiers.breakdown[0];
      insights.push({
        type: 'info',
        icon: '💰',
        title: 'Biggest Spend Tier',
        text: `${biggest.tier} games represent ${biggest.valuePct}% of your library value.`
      });
    }

    if (nextUp?.[0]) {
      const pick = nextUp[0];
      insights.push({
        type: 'tip',
        icon: '🎲',
        title: 'Next Up Recommendation',
        text: `${pick.name} scores ${pick.score} — ${pick.reason}.`
      });
    }

    if (sessionQuality?.bestStreak > 1) {
      insights.push({
        type: 'success',
        icon: '🔥',
        title: 'Best Streak',
        text: `You played on ${sessionQuality.bestStreak} consecutive days at your best streak.`
      });
    }

    return insights.slice(0, 8);
  }

  static getFullAdvancedAnalytics(library = []) {
    return {
      devPub: this.getDeveloperPublisherStats(library),
      priceTiers: this.getPriceTierAnalysis(library),
      valuePerHour: this.getValuePerHourAnalysis(library),
      completion: this.getCompletionAnalytics(library),
      genreEvolution: this.getGenreEvolution(library),
      platformBreakdown: this.getPlatformValueBreakdown(library),
      backlogInvestments: this.getBacklogInvestments(library),
      backlogPriority: this.getBacklogPriority(library),
      nextUp: this.getNextUpRecommendations(library),
      sessionQuality: this.getSessionQuality(library),
      insights: this.getInsights(library)
    };
  }
}

export default AdvancedAnalyticsService;
