// GenreMoodMapper.js - Uses canonical genre/mood helpers for recommendations
import {
  getGenresForMood as baseGetGenresForMood,
  getMoodForGenre as baseGetMoodForGenre,
  getAllGenres as baseGetAllGenres,
  getAllMoods as baseGetAllMoods,
  isValidGenre as baseIsValidGenre,
  isValidMood as baseIsValidMood,
  mapGameGenresToValid,
  normalizeGenres
} from '../constants/GenresMoods';

const getLastPlayedTimestamp = (lastPlayedValue) => {
  if (typeof lastPlayedValue === 'number' && Number.isFinite(lastPlayedValue)) {
    return lastPlayedValue;
  }

  if (typeof lastPlayedValue === 'string') {
    const parsedTimestamp = Date.parse(lastPlayedValue);
    return Number.isNaN(parsedTimestamp) ? 0 : parsedTimestamp;
  }

  return 0;
};

export class GenreMoodMapper {

  // Get mood for a genre
  static getMoodForGenre(genre) {
    return baseGetMoodForGenre(genre);
  }

  // Get genres for a mood
  static getGenresForMood(mood) {
    return baseGetGenresForMood(mood);
  }

  // Get all valid genres
  static getAllGenres() {
    return baseGetAllGenres();
  }

  // Get all valid moods
  static getAllMoods() {
    return baseGetAllMoods();
  }

  // Check if a genre is valid
  static isValidGenre(genre) {
    return baseIsValidGenre(genre);
  }

  // Check if a mood is valid
  static isValidMood(mood) {
    return baseIsValidMood(mood);
  }

  // Get games matching a mood (from library)
  static getGamesForMood(library, mood) {
    if (!this.isValidMood(mood)) {
      return [];
    }

    const genresForMood = this.getGenresForMood(mood);
    
    return library.filter(game => {
      // User override takes priority
      if (typeof game?.moodOverride === 'string' && game.moodOverride.trim()) {
        return game.moodOverride.trim() === mood;
      }

      const normalizedGenres = mapGameGenresToValid(game.genres);
      if (!normalizedGenres.length) {
        return false;
      }

      return normalizedGenres.some(genre => genresForMood.includes(genre));
    });
  }

  // Get games matching mood and time constraint
  static getGamesForMoodAndTime(library, mood, availableMinutes) {
    const moodGames = this.getGamesForMood(library, mood);
    
    if (availableMinutes === null || availableMinutes === undefined) {
      return moodGames;
    }

    // Filter by time - games that can be played in available time
    // Estimate: if game has playtime data, use it; otherwise assume 30-60 min sessions
    return moodGames.filter(game => {
      if (!game || typeof game !== 'object') return false;
      if (!game.time_played || !game.launch_count) {
        return true;
      }

      const avgSession = Math.max(15, Math.round(game.time_played / Math.max(game.launch_count, 1)));
      return avgSession <= availableMinutes;
    });
  }

  // Get recommended game for Perfect Play
  static getPerfectPlayRecommendation(library, mood, availableMinutes) {
    const games = this.getGamesForMoodAndTime(library, mood, availableMinutes);
    
    if (games.length === 0) {
      return null;
    }

    // Prefer games that haven't been played recently
    // Sort by: least recently played, then by play count (prefer less played)
    const sorted = games.sort((a, b) => {
      const aLastPlayed = getLastPlayedTimestamp(a.last_played);
      const bLastPlayed = getLastPlayedTimestamp(b.last_played);
      
      if (aLastPlayed !== bLastPlayed) {
        return aLastPlayed - bLastPlayed; // Least recently played first
      }
      
      const aPlayCount = a.launch_count || 0;
      const bPlayCount = b.launch_count || 0;
      return aPlayCount - bPlayCount; // Less played first
    });

    return sorted[0];
  }

  // Get multiple recommendations
  static getPerfectPlayRecommendations(library, mood, availableMinutes, count = 5) {
    const games = this.getGamesForMoodAndTime(library, mood, availableMinutes);
    
    if (games.length === 0) {
      return [];
    }

    // Sort by: least recently played, then by play count
    const sorted = games.sort((a, b) => {
      const aLastPlayed = getLastPlayedTimestamp(a.last_played);
      const bLastPlayed = getLastPlayedTimestamp(b.last_played);
      
      if (aLastPlayed !== bLastPlayed) {
        return aLastPlayed - bLastPlayed;
      }
      
      const aPlayCount = a.launch_count || 0;
      const bPlayCount = b.launch_count || 0;
      return aPlayCount - bPlayCount;
    });

    return sorted.slice(0, count);
  }

  // Validate and clean genre data
  static cleanGameGenres(game) {
    return normalizeGenres(game.genres);
  }

  // Get genre distribution for a mood
  static getGenreDistributionForMood(library, mood) {
    const games = this.getGamesForMood(library, mood);
    const genresForMood = this.getGenresForMood(mood);
    const distribution = {};

    genresForMood.forEach(genre => {
      distribution[genre] = games.filter(g => 
        g.genres && g.genres.includes(genre)
      ).length;
    });

    return distribution;
  }
}
