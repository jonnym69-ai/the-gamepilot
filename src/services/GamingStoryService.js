import { resolveGameArtwork } from './GameArtworkService';
import StorageService from './StorageService';

const STORAGE_KEY = 'firstGamingStoryShown';

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
    return StorageService.getString(STORAGE_KEY) !== 'true';
  },

  markFirstStoryShown() {
    StorageService.setString(STORAGE_KEY, 'true');
  },

  generateFirstScanStory(library) {
    if (!Array.isArray(library) || library.length === 0) {
      return null;
    }

    const topGames = getTopGames(library, 5);
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
      title: `Your Gaming Story Begins`,
      subtitle: `From ${topGames.length} anchor games and ${totalHours} hours`,
      totalHours,
      gameCount: topGames.length,
      topGames,
      genreFingerprint,
      narrative
    };
  }
};

export default GamingStoryService;
