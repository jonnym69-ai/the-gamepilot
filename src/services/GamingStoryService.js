import { resolveGameArtwork } from './GameArtworkService';
import StorageService from './StorageService';
import { GamingIdentity } from '../GamingIdentity';
import { StatsAggregationService } from './StatsAggregationService';

const FIRST_STORY_SHOWN_KEY = 'firstGamingStoryShown';
const GAMING_STORY_KEY = 'gamingStory';
const PERIOD_STORY_KEY = 'periodGamingStory';
const STORY_FREQUENCY_KEY = 'gamingStoryFrequency';
const LAST_PERIOD_STORY_KEY = 'lastPeriodGamingStory';
const EVOLVING_THRESHOLD_SESSIONS = 5;

const PERIOD_LABELS = {
  daily: 'today',
  weekly: 'this week',
  monthly: 'this month',
  yearly: 'this year'
};

const GENRE_TEMPLATES = {
  'Survival': {
    lead: 'surviving the wild',
    hook: 'You spent {period} surviving the wild'
  },
  'Survival Horror': {
    lead: 'surviving the apocalypse',
    hook: 'You spent {period} surviving the apocalypse'
  },
  'Horror': {
    lead: 'surviving the apocalypse',
    hook: 'You spent {period} surviving the apocalypse'
  },
  'Zombie': {
    lead: 'surviving the zombie apocalypse',
    hook: 'You spent {period} surviving the zombie apocalypse'
  },
  'Sports': {
    lead: 'living the pro sports life',
    hook: 'You spent {period} living the pro sports life'
  },
  'Racing': {
    lead: 'chasing the checkered flag',
    hook: 'You spent {period} chasing the checkered flag'
  },
  'RPG': {
    lead: 'on an epic quest',
    hook: 'You spent {period} on an epic quest'
  },
  'Action RPG': {
    lead: 'on an epic quest',
    hook: 'You spent {period} on an epic quest'
  },
  'Strategy': {
    lead: 'building empires',
    hook: 'You spent {period} building empires'
  },
  'Turn-Based Strategy': {
    lead: 'building empires',
    hook: 'You spent {period} building empires'
  },
  'Simulation': {
    lead: 'crafting worlds',
    hook: 'You spent {period} crafting worlds'
  },
  'Shooter': {
    lead: 'in the thick of the action',
    hook: 'You spent {period} in the thick of the action'
  },
  'FPS': {
    lead: 'in the thick of the action',
    hook: 'You spent {period} in the thick of the action'
  },
  'Adventure': {
    lead: 'exploring unknown worlds',
    hook: 'You spent {period} exploring unknown worlds'
  },
  'Open World': {
    lead: 'exploring unknown worlds',
    hook: 'You spent {period} exploring unknown worlds'
  },
  'Fighting': {
    lead: 'settling scores in the arena',
    hook: 'You spent {period} settling scores in the arena'
  },
  'Puzzle': {
    lead: 'bending your brain',
    hook: 'You spent {period} bending your brain'
  },
  'Platformer': {
    lead: 'leaping through danger',
    hook: 'You spent {period} leaping through danger'
  }
};

const DEFAULT_TEMPLATE = {
  lead: 'gaming',
  hook: 'You spent {period} deep in the game'
};

const getTemplateForGenre = (genre) => {
  if (!genre) return DEFAULT_TEMPLATE;
  const normalized = String(genre).trim();
  return GENRE_TEMPLATES[normalized] || DEFAULT_TEMPLATE;
};

const getPeriodTopGames = (periodData, limit = 3) => {
  if (!periodData || !Array.isArray(periodData.topGames)) {
    return [];
  }

  return periodData.topGames
    .filter((entry) => entry && entry.gameName)
    .map((entry) => ({
      name: entry.gameName,
      hours: Math.round((entry.minutes || 0) / 60),
      genre: entry.genre || null,
      coverUrl: entry.coverUrl || ''
    }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, limit);
};

const getGameGenre = (game) => {
  if (!game) return null;
  if (game.genre) return game.genre;
  if (Array.isArray(game.genres) && game.genres.length > 0) return game.genres[0];
  if (game.primaryGenre) return game.primaryGenre;
  return null;
};

const getGameHours = (game) => {
  const minutes = game?.playtime?.total || game?.time_played || game?.playtimeForever || 0;
  return Math.max(0, Math.round(minutes / 60));
};

const getTopGames = (library, limit = 5) => {
  return [...library]
    .filter((g) => g && g.name)
    .map((game) => ({
      ...game,
      hours: getGameHours(game),
      genre: getGameGenre(game),
      coverUrl: resolveGameArtwork(game, { surface: 'library_card' })
    }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, limit);
};

const buildGenreFingerprint = (games) => {
  const totals = new Map();
  games.forEach((game) => {
    const genre = game.genre || 'Unknown';
    const current = totals.get(genre) || { hours: 0, count: 0 };
    totals.set(genre, { hours: current.hours + game.hours, count: current.count + 1 });
  });

  return Array.from(totals.entries())
    .map(([genre, data]) => ({ genre, ...data }))
    .sort((a, b) => b.hours - a.hours);
};

const formatList = (items) => {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
};

export const GamingStoryService = {
  shouldShowFirstStory() {
    return StorageService.getString(FIRST_STORY_SHOWN_KEY) !== 'true';
  },

  markFirstStoryShown() {
    StorageService.setString(FIRST_STORY_SHOWN_KEY, 'true');
  },

  getCurrentStory() {
    return StorageService.get(GAMING_STORY_KEY, null);
  },

  saveStory(story) {
    if (!story) return;
    StorageService.set(GAMING_STORY_KEY, {
      ...story,
      updatedAt: new Date().toISOString()
    });
  },

  shouldEvolveStory(profile) {
    const current = this.getCurrentStory();
    if (!current) return true;
    const stats = profile?.stats || {};
    return (stats.totalSessions || 0) >= EVOLVING_THRESHOLD_SESSIONS;
  },

  generateFirstScanStory(library) {
    if (!Array.isArray(library) || library.length === 0) {
      return null;
    }

    const topGames = getTopGames(library, 3);
    if (topGames.length === 0) {
      return null;
    }

    const totalHours = topGames.reduce((sum, g) => sum + g.hours, 0);
    const genreFingerprint = buildGenreFingerprint(topGames);
    const topGenreNames = genreFingerprint.slice(0, 3).map((g) => g.genre);

    const leadingGame = topGames[0];
    const runnerUpGames = topGames.slice(1, 3);
    const runnerUpNames = runnerUpGames.map((g) => g.name);

    let narrative = `Your first scan shows **${totalHours} hours** across your top ${topGames.length} games. `;
    narrative += `**${leadingGame.name}** leads the way with **${leadingGame.hours} hours**.`;

    if (runnerUpNames.length > 0) {
      narrative += ` It's followed by ${formatList(runnerUpNames)}.`;
    }

    if (topGenreNames.length > 0) {
      narrative += ` Your strongest genres so far are ${formatList(topGenreNames)}.`;
    }

    narrative += " GamePilot will build your identity from this foundation as you keep playing.";

    return {
      chapter: 'anchor',
      title: 'Your Gaming Story Begins',
      subtitle: `From ${topGames.length} anchor games and ${totalHours} hours`,
      totalHours,
      gameCount: topGames.length,
      topGames,
      genreFingerprint,
      narrative,
      identityLabel: null,
      tasteClusters: []
    };
  },

  generateEvolvingStory() {
    const profile = GamingIdentity.getProfile();
    const identity = profile?.identity || {};
    const persona = profile?.persona || {};
    const stats = profile?.stats || {};
    const library = StorageService.get('library', []);

    const topGames = getTopGames(library, 3);
    if (topGames.length === 0) {
      return null;
    }

    const totalHours = Math.round((stats.totalPlayTime || 0) / 60);
    const identityLabel = persona?.personaIdentity?.label || identity?.personality || 'Gamer';
    const identityDescription = persona?.personaIdentity?.description || identity?.description || '';
    const tasteClusters = profile?.tasteClusters || identity?.tasteClusters || [];
    const dominantGenre = persona?.dominantGenre || identity?.dominantGenre || stats?.favoriteGenre || null;
    const sessionPattern = persona?.sessionPatternLabel || identity?.sessionPattern || null;
    const topGenres = (persona?.topGenres || []).slice(0, 3);

    const genreNames = topGenres.map((g) => g.genre || g);
    if (!genreNames.includes(dominantGenre) && dominantGenre) {
      genreNames.unshift(dominantGenre);
    }
    const uniqueGenres = genreNames.slice(0, 3);

    const leadingGame = topGames[0];
    const runnerUpGames = topGames.slice(1, 3);
    const runnerUpNames = runnerUpGames.map((g) => g.name);

    let narrative = `You're now a **${identityLabel}**. `;
    if (identityDescription) {
      narrative += `${identityDescription} `;
    }
    narrative += `Across **${totalHours} hours** and **${stats.totalSessions || 0} sessions**, **${leadingGame.name}** remains your anchor at **${leadingGame.hours} hours**.`;

    if (runnerUpNames.length > 0) {
      narrative += ` It's joined by ${formatList(runnerUpNames)}.`;
    }

    if (uniqueGenres.length > 0) {
      narrative += ` Your taste clusters around ${formatList(uniqueGenres)}.`;
    }

    if (sessionPattern) {
      narrative += ` Your play pattern looks like ${sessionPattern.toLowerCase()} sessions.`;
    }

    narrative += " GamePilot uses this to decide what you should play next.";

    return {
      chapter: 'identity',
      title: 'Your Gaming Story',
      subtitle: `You play as a ${identityLabel.toLowerCase()}`,
      totalHours,
      gameCount: topGames.length,
      topGames,
      genreFingerprint: uniqueGenres.map((genre) => ({ genre, count: 0, hours: 0 })),
      narrative,
      identityLabel,
      tasteClusters: tasteClusters.slice(0, 3)
    };
  },

  updateStory(library) {
    const profile = GamingIdentity.getProfile();
    const hasEnoughSessions = (profile?.stats?.totalSessions || 0) >= EVOLVING_THRESHOLD_SESSIONS;
    const current = this.getCurrentStory();

    let story;
    if (current?.chapter === 'identity' && hasEnoughSessions) {
      story = this.generateEvolvingStory();
    } else if (!current && Array.isArray(library) && library.length > 0) {
      story = this.generateFirstScanStory(library);
    } else if (hasEnoughSessions && current?.chapter === 'anchor') {
      story = this.generateEvolvingStory();
    } else {
      return current;
    }

    if (story) {
      this.saveStory(story);
    }
    return story;
  },

  getStoryFrequency() {
    const value = StorageService.getString(STORY_FREQUENCY_KEY, 'weekly');
    return ['off', 'daily', 'weekly', 'monthly', 'yearly'].includes(value) ? value : 'weekly';
  },

  setStoryFrequency(frequency) {
    if (!['off', 'daily', 'weekly', 'monthly', 'yearly'].includes(frequency)) {
      return;
    }
    StorageService.setString(STORY_FREQUENCY_KEY, frequency);
  },

  getPeriodStory() {
    return StorageService.get(PERIOD_STORY_KEY, null);
  },

  savePeriodStory(story) {
    if (!story) return;
    StorageService.set(PERIOD_STORY_KEY, {
      ...story,
      generatedAt: new Date().toISOString()
    });
    StorageService.setString(LAST_PERIOD_STORY_KEY, story.period || 'weekly');
  },

  shouldGeneratePeriodStory(period) {
    const frequency = this.getStoryFrequency();
    if (frequency === 'off') return false;
    if (frequency !== period) return false;

    const lastStory = this.getPeriodStory();
    if (!lastStory?.generatedAt) return true;

    const lastDate = new Date(lastStory.generatedAt);
    const now = new Date();

    if (period === 'daily') {
      return lastDate.toDateString() !== now.toDateString();
    }
    if (period === 'weekly') {
      return this.getWeekStart(lastDate) !== this.getWeekStart(now);
    }
    if (period === 'monthly') {
      return lastDate.getMonth() !== now.getMonth() || lastDate.getFullYear() !== now.getFullYear();
    }
    if (period === 'yearly') {
      return lastDate.getFullYear() !== now.getFullYear();
    }
    return false;
  },

  getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff)).toDateString();
  },

  generatePeriodStory(period) {
    const dashboard = StatsAggregationService.getDashboardData();
    const periodData = dashboard?.periods?.[period];
    if (!periodData) return null;

    const topGames = getPeriodTopGames(periodData, 3);
    if (topGames.length === 0) return null;

    const totalHours = Math.round((periodData.playtimeMinutes || 0) / 60);
    const leadingGame = topGames[0];
    const leadingTemplate = getTemplateForGenre(leadingGame.genre);

    const secondaryGames = topGames.slice(1, 3);
    const secondaryLines = secondaryGames.map((game) => {
      const template = getTemplateForGenre(game.genre);
      return `with a taste of **${template.lead}** in **${game.name}** (${game.hours}h)`;
    });

    let narrative = `${leadingTemplate.hook.replace('{period}', PERIOD_LABELS[period])} in **${leadingGame.name}** (${leadingGame.hours}h).`;

    if (secondaryLines.length > 0) {
      narrative += ` ${formatList(secondaryLines)}.`;
    }

    narrative += ` **${totalHours} hours** total across your top games.`;

    const genreFingerprint = topGames
      .map((g) => ({ genre: g.genre || 'Unknown', hours: g.hours, count: 1 }))
      .filter((entry) => entry.genre !== 'Unknown');

    return {
      chapter: 'period',
      period,
      title: `Your ${PERIOD_LABELS[period]} story`,
      subtitle: `${totalHours} hours · ${topGames.length} games`,
      totalHours,
      gameCount: topGames.length,
      topGames,
      genreFingerprint,
      narrative,
      identityLabel: null,
      tasteClusters: []
    };
  },

  updatePeriodStory(period) {
    if (!this.shouldGeneratePeriodStory(period)) {
      return this.getPeriodStory();
    }
    const story = this.generatePeriodStory(period);
    if (story) {
      this.savePeriodStory(story);
    }
    return story;
  }
};

export default GamingStoryService;
