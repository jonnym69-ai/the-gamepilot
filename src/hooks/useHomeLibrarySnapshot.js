import { useMemo } from 'react';

const DEFAULT_GENRES = [
  'Action', 'Adventure', 'Indie', 'Puzzle', 'Racing', 'RPG', 'Shooter', 'Simulation', 'Strategy', 'Platformer',
  'Horror', 'Fighting', 'Sports', 'Roguelike', 'Management', 'Survival'
];

const DEFAULT_PLATFORM_COUNTS = {
  Steam: 0,
  Epic: 0,
  Xbox: 0,
  Rockstar: 0,
  'Battle.net': 0,
  EA: 0,
  Ubisoft: 0,
  GOG: 0,
  Riot: 0,
  BSG: 0,
  PlayStation: 0
};

const shuffleGames = (games = []) => {
  const shuffled = [...games];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
};

export default function useHomeLibrarySnapshot(library) {
  return useMemo(() => {
    const libraryList = Array.isArray(library) ? library : [];
    const genres = new Set();
    const recentCandidates = [];
    const featuredCandidates = [];
    const topRatedCandidates = [];
    const unplayedGames = [];
    const platformCounts = { ...DEFAULT_PLATFORM_COUNTS };

    libraryList.forEach((game) => {
      if (Array.isArray(game?.genres)) {
        game.genres.forEach((genre) => {
          if (genre && genre !== 'Unknown') {
            genres.add(genre);
          }
        });
      }

      if (game?.platform && Object.prototype.hasOwnProperty.call(platformCounts, game.platform)) {
        platformCounts[game.platform] += 1;
      }

      if (game?.brandPlatform === 'PlayStation' || game?.platform === 'PlayStation') {
        platformCounts.PlayStation += 1;
      }

      if (game?.last_played && game?.time_played > 0) {
        recentCandidates.push(game);
      }

      if ((game?.time_played || 0) > 120) {
        featuredCandidates.push(game);
      }

      if (typeof game?.userRating === 'number' && game.userRating > 0) {
        topRatedCandidates.push(game);
      }

      if (!game?.time_played) {
        unplayedGames.push(game);
      }
    });

    const recommendationsPool = shuffleGames(unplayedGames).slice(0, 5);

    recentCandidates.sort((left, right) => new Date(right.last_played) - new Date(left.last_played));
    featuredCandidates.sort((left, right) => (right.time_played || 0) - (left.time_played || 0));
    topRatedCandidates.sort((left, right) => {
      const ratingDiff = (right.userRating || 0) - (left.userRating || 0);
      if (ratingDiff !== 0) {
        return ratingDiff;
      }

      return (right.time_played || 0) - (left.time_played || 0);
    });

    return {
      totalGames: libraryList.length,
      availableGenres: genres.size > 0 ? Array.from(genres).sort() : DEFAULT_GENRES,
      recentGames: recentCandidates.slice(0, 5),
      featuredGames: featuredCandidates.slice(0, 5),
      topRatedGames: topRatedCandidates.slice(0, 6),
      recommendations: recommendationsPool,
      allRecommendations: recommendationsPool,
      platformCounts
    };
  }, [library]);
}
