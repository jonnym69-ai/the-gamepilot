import { gameBelongsToGenre } from '../GameGenreDatabase';

export class GameRecommendationService {
  static getPerfectPlay({ library, mood, selectedGenre, time }) {
    if (!library || library.length === 0) {
      return [];
    }

    let filtered = [...library];

    const moodGenreMapping = {
      Relaxed: ['Puzzle', 'Simulation', 'Strategy', 'Casual', 'Adventure', 'Indie'],
      Social: ['Action', 'Sports', 'Racing', 'Party', 'Multiplayer', 'Co-op'],
      Focused: ['Strategy', 'Puzzle', 'RPG', 'Turn-Based', 'Tactical', 'Simulation'],
      Creative: ['Sandbox', 'Building', 'Crafting', 'RPG', 'Simulation', 'Indie'],
      Escapist: ['Action', 'Adventure', 'RPG', 'Fantasy', 'Sci-Fi', 'Open World']
    };

    const moodKeywords = {
      Relaxed: ['casual', 'relaxing', 'chill', 'calm', 'zen', 'peaceful', 'cozy', 'puzzle', 'simulation', 'strategy'],
      Social: ['multiplayer', 'co-op', 'party', 'social', 'friends', 'online', 'versus', 'competitive', 'team', 'pvp'],
      Focused: ['strategy', 'puzzle', 'thinking', 'brain', 'logic', 'planning', 'tactical', 'turn-based', 'rpg'],
      Creative: ['building', 'crafting', 'creation', 'design', 'art', 'music', 'sandbox', 'customization', 'mod'],
      Escapist: ['action', 'adventure', 'fantasy', 'sci-fi', 'epic', 'heroic', 'quest', 'exploration', 'story']
    };

    const scoredGames = filtered.map((game) => {
      let score = 0;
      const reasons = [];
      const gameGenres = Array.isArray(game?.genres) ? game.genres : [];

      if (mood && moodGenreMapping[mood]) {
        const preferredGenres = moodGenreMapping[mood];
        gameGenres.forEach((genre) => {
          if (preferredGenres.includes(genre)) {
            score += 10;
            reasons.push(`Genre match: ${genre}`);
          }
        });
      }

      if (mood && moodKeywords[mood]) {
        const keywords = moodKeywords[mood];
        const gameName = (game?.name || '').toLowerCase();
        const gameDesc = (game?.description || '').toLowerCase();

        keywords.forEach((keyword) => {
          if (gameName.includes(keyword.toLowerCase())) {
            score += 5;
            reasons.push(`Name keyword: ${keyword}`);
          }
          if (gameDesc.includes(keyword.toLowerCase())) {
            score += 3;
            reasons.push(`Description keyword: ${keyword}`);
          }
        });
      }

      if (game?.playtime_forever && game.playtime_forever > 60) {
        score += 2;
        reasons.push('Previously enjoyed');
      }

      return { ...game, score, reasons };
    });

    if (selectedGenre && selectedGenre !== '') {
      filtered = scoredGames.filter((game) => gameBelongsToGenre(game.name, selectedGenre));
    } else {
      filtered = scoredGames;
    }

    filtered.sort((a, b) => (b.score || 0) - (a.score || 0));

    if (time && time === 'quick') {
      filtered = filtered.filter((game) => {
        const quickGenres = ['Puzzle', 'Casual', 'Indie', 'Arcade'];
        const gameGenres = Array.isArray(game?.genres) ? game.genres : [];
        return gameGenres.some((genre) => quickGenres.includes(genre)) || (game.playtime_forever || 0) < 300;
      }).slice(0, Math.min(10, filtered.length));
    } else if (time && time === 'medium') {
      filtered = filtered.slice(0, Math.min(20, filtered.length));
    } else if (time && time === 'long') {
      filtered = filtered.filter((game) => {
        const longGenres = ['RPG', 'Strategy', 'Adventure', 'Simulation'];
        const gameGenres = Array.isArray(game?.genres) ? game.genres : [];
        return gameGenres.some((genre) => longGenres.includes(genre)) || (game.playtime_forever || 0) > 600;
      }).slice(0, Math.min(15, filtered.length));
    }

    if (filtered.length === 0) {
      filtered = scoredGames.slice(0, 5);
    }

    return filtered.slice(0, Math.min(10, filtered.length));
  }
}
