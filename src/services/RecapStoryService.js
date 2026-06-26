import { formatPlaytime } from '../utils/formatPlaytime';

const PERIOD_LABELS = {
  weekly: 'week',
  monthly: 'month',
  yearly: 'year',
  daily: 'day',
  all: 'all-time'
};

const GRIND_HOUR_THRESHOLDS = {
  weekly: 10,
  monthly: 15,
  yearly: 50,
  daily: 2,
  all: 25
};

const MARATHON_SHARE_THRESHOLD = 0.4;

const GRIND_VERBS = [
  'grinding',
  'diving into',
  'chasing glory in',
  'exploring',
  'mastering'
];

const REDISCOVERY_VERBS = [
  'came back to',
  'rediscovered',
  'returned to',
  'revisited'
];

const pickOne = (items) => {
  if (!Array.isArray(items) || items.length === 0) return '';
  return items[Math.floor(Math.random() * items.length)];
};

const getSafeName = (game) => {
  const name = game?.name || game?.gameName || 'a game';
  return String(name).trim();
};

const resolveGamePlaytime = (game) => {
  const value = Number(game?.totalPlaytime ?? game?.playtimeMinutes ?? game?.time_played ?? game?.playtime ?? 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
};

const resolveGameSessions = (game) => {
  const value = Number(game?.sessions ?? game?.sessionCount ?? 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
};

const resolveGameDays = (game) => {
  const value = Number(game?.activeDays ?? game?.daysPlayed ?? 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
};

const getDominantMood = (periodSnapshot) => {
  const moodCounts = periodSnapshot?.moodCounts || {};
  const entries = Object.entries(moodCounts)
    .filter(([mood, count]) => mood && typeof count === 'number' && count > 0)
    .sort((left, right) => right[1] - left[1]);
  return entries[0]?.[0] || null;
};

const getDominantGenre = (periodSnapshot) => {
  const genreCounts = periodSnapshot?.genreCounts || {};
  const entries = Object.entries(genreCounts)
    .filter(([genre, count]) => genre && typeof count === 'number' && count > 0)
    .sort((left, right) => right[1] - left[1]);
  return entries[0]?.[0] || null;
};

const buildGameGrindStory = (game, period, totalPlaytimeMinutes) => {
  const playtime = resolveGamePlaytime(game);
  const hours = playtime / 60;
  const thresholdHours = GRIND_HOUR_THRESHOLDS[period] || GRIND_HOUR_THRESHOLDS.weekly;

  if (hours < thresholdHours) return null;

  const name = getSafeName(game);
  const verb = pickOne(GRIND_VERBS);
  const formatted = formatPlaytime(playtime);
  const periodLabel = PERIOD_LABELS[period] || 'period';

  return `Spent the ${periodLabel} ${verb} ${name} for ${formatted}.`;
};

const buildMarathonStory = (game, period, totalPlaytimeMinutes) => {
  const playtime = resolveGamePlaytime(game);
  if (totalPlaytimeMinutes <= 0 || playtime <= 0) return null;

  const share = playtime / totalPlaytimeMinutes;
  if (share < MARATHON_SHARE_THRESHOLD) return null;

  const name = getSafeName(game);
  const periodLabel = PERIOD_LABELS[period] || 'period';
  const percentage = Math.round(share * 100);

  return `${name} claimed ${percentage}% of your ${periodLabel} playtime — a true marathon focus.`;
};

const buildRediscoveryStory = (game, period) => {
  const playtime = resolveGamePlaytime(game);
  const sessions = resolveGameSessions(game);
  if (playtime <= 0 || sessions <= 0) return null;

  // Without a true last-played history we treat a game with relatively few sessions
  // but a big burst as a comeback. If more metadata is available, this can be refined.
  const hours = playtime / 60;
  const periodLabel = PERIOD_LABELS[period] || 'period';
  const name = getSafeName(game);
  const verb = pickOne(REDISCOVERY_VERBS);

  if (sessions <= 2 && hours >= 4) {
    return `You ${verb} ${name} this ${periodLabel} — ${formatPlaytime(playtime)} in just ${sessions} session${sessions === 1 ? '' : 's'}.`;
  }

  return null;
};

const buildConsistencyStory = (game, period) => {
  const days = resolveGameDays(game);
  const playtime = resolveGamePlaytime(game);
  if (days <= 1 || playtime <= 0) return null;

  const name = getSafeName(game);
  const periodLabel = PERIOD_LABELS[period] || 'period';

  return `Most consistent pick this ${periodLabel}: ${name} showed up on ${days} play days.`;
};

const buildMoodStory = (periodSnapshot, period) => {
  const mood = getDominantMood(periodSnapshot);
  if (!mood) return null;

  const periodLabel = PERIOD_LABELS[period] || 'period';
  const vibeMap = {
    Escapist: 'chasing expansive worlds',
    Relaxed: 'keeping things cozy',
    Social: 'hanging with friends',
    Focused: 'zeroing in',
    Creative: 'building and experimenting'
  };
  const vibe = vibeMap[mood] || `riding a ${mood.toLowerCase()} vibe`;

  return `Your ${periodLabel} mood was **${mood}** — you spent most of it ${vibe}.`;
};

const buildSessionStyleStory = (periodSnapshot, period) => {
  const longest = Number(periodSnapshot?.longestSessionMinutes || 0);
  const avg = Number(periodSnapshot?.avgSessionMinutes || 0);
  if (longest <= 0 || avg <= 0) return null;

  const periodLabel = PERIOD_LABELS[period] || 'period';
  const longestFormatted = formatPlaytime(longest);

  if (longest >= 180) {
    return `Longest session this ${periodLabel} stretched ${longestFormatted} — a proper marathon.`;
  }

  if (avg <= 30) {
    return `Quick sessions ruled this ${periodLabel}: average playtime was ${formatPlaytime(avg)}.`;
  }

  return `Average session this ${periodLabel} was ${formatPlaytime(avg)}.`;
};

const buildGenreStory = (periodSnapshot, period) => {
  const genre = getDominantGenre(periodSnapshot);
  if (!genre) return null;

  const periodLabel = PERIOD_LABELS[period] || 'period';
  return `Top genre this ${periodLabel}: **${genre}**.`;
};

const buildTopGameStories = (periodSnapshot, period) => {
  const topGames = Array.isArray(periodSnapshot?.topGames) ? periodSnapshot.topGames : [];
  const totalPlaytimeMinutes = Number(periodSnapshot?.playtimeMinutes || 0);
  const stories = [];

  if (topGames.length === 0) return stories;

  const topGame = topGames[0];
  const grind = buildGameGrindStory(topGame, period, totalPlaytimeMinutes);
  if (grind) stories.push(grind);

  const marathon = buildMarathonStory(topGame, period, totalPlaytimeMinutes);
  if (marathon) stories.push(marathon);

  const rediscovery = buildRediscoveryStory(topGame, period);
  if (rediscovery) stories.push(rediscovery);

  const consistency = buildConsistencyStory(topGame, period);
  if (consistency) stories.push(consistency);

  return stories;
};

export class RecapStoryService {
  static buildPeriodStories(periodSnapshot = {}, period = 'weekly', username = 'Pilot') {
    const periodLabel = PERIOD_LABELS[period] || 'period';
    const stories = [];

    const totalPlaytimeMinutes = Number(periodSnapshot?.playtimeMinutes || 0);
    const sessions = Number(periodSnapshot?.sessions || 0);
    const activeDays = Number(periodSnapshot?.activeDays || 0);
    const uniqueGames = Number(periodSnapshot?.uniqueGames || 0);

    if (totalPlaytimeMinutes <= 0 || sessions <= 0) {
      return {
        period,
        periodLabel,
        username: username || 'Pilot',
        hasData: false,
        stories: [`No playtime tracked this ${periodLabel} yet — time to launch something?`]
      };
    }

    const gameStories = buildTopGameStories(periodSnapshot, period);
    stories.push(...gameStories);

    const moodStory = buildMoodStory(periodSnapshot, period);
    if (moodStory) stories.push(moodStory);

    const genreStory = buildGenreStory(periodSnapshot, period);
    if (genreStory) stories.push(genreStory);

    const sessionStyleStory = buildSessionStyleStory(periodSnapshot, period);
    if (sessionStyleStory) stories.push(sessionStyleStory);

    if (activeDays >= 5 && uniqueGames >= 1) {
      stories.push(`You gamed on ${activeDays} days this ${periodLabel} across ${uniqueGames} title${uniqueGames === 1 ? '' : 's'}.`);
    }

    if (stories.length === 0) {
      stories.push(`You logged ${formatPlaytime(totalPlaytimeMinutes)} this ${periodLabel} — ${sessions} session${sessions === 1 ? '' : 's'} in total.`);
    }

    return {
      period,
      periodLabel,
      username: username || 'Pilot',
      hasData: true,
      totalPlaytimeMinutes,
      sessions,
      activeDays,
      uniqueGames,
      stories: stories.slice(0, 5)
    };
  }

  static buildWeeklyStories(weeklySnapshot = {}, username = 'Pilot') {
    return this.buildPeriodStories(weeklySnapshot, 'weekly', username);
  }

  static buildMonthlyStories(monthlySnapshot = {}, username = 'Pilot') {
    return this.buildPeriodStories(monthlySnapshot, 'monthly', username);
  }

  static buildYearlyStories(yearlySnapshot = {}, username = 'Pilot') {
    return this.buildPeriodStories(yearlySnapshot, 'yearly', username);
  }

  static buildShareText(periodSnapshot = {}, period = 'weekly', username = 'Pilot') {
    const packageData = this.buildPeriodStories(periodSnapshot, period, username);
    const title = period === 'weekly'
      ? "This Week's GamePilot Recap"
      : period === 'monthly'
        ? "This Month's GamePilot Recap"
        : "GamePilot Recap";

    const lines = [
      `${title} — ${username || 'Pilot'}`,
      ...packageData.stories,
      '',
      'Generated locally by GamePilot.'
    ];

    return lines.join('\n');
  }
}

export default RecapStoryService;
