// PerfectPlayRecommender.js - Recommends games based on mood, genre, and time selection
import { RecommendationEngine } from './RecommendationEngine';
import { GenreMoodMapper } from './GenreMoodMapper';

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

export class PerfectPlayRecommender {
  static getSelectionResult(library, selectedMoods, selectedGenres, availableMinutes = null, count = null) {
    const safeCount = count || (Array.isArray(library) ? library.length : 0);

    return RecommendationEngine.getPerfectPlaySelectionResult(
      library,
      selectedMoods,
      selectedGenres,
      availableMinutes,
      safeCount
    );
  }

  // Get games matching selected moods and genres with time filter
  static getRecommendations(library, selectedMoods, selectedGenres, availableMinutes = null) {
    return this.getSelectionResult(library, selectedMoods, selectedGenres, availableMinutes).games;
  }

  // Get single best recommendation
  static getBestRecommendation(library, selectedMoods, selectedGenres, availableMinutes = null) {
    return this.getSelectionResult(library, selectedMoods, selectedGenres, availableMinutes, 1).primaryGame || null;
  }

  // Get random recommendation
  static getRandomRecommendation(library, selectedMoods, selectedGenres, availableMinutes = null) {
    const recommendations = this.getRecommendations(library, selectedMoods, selectedGenres, availableMinutes);
    
    if (recommendations.length === 0) {
      return null;
    }

    return recommendations[Math.floor(Math.random() * recommendations.length)];
  }

  // Get least played recommendation
  static getLeastPlayedRecommendation(library, selectedMoods, selectedGenres, availableMinutes = null) {
    const recommendations = [...this.getRecommendations(library, selectedMoods, selectedGenres, availableMinutes)];
    
    if (recommendations.length === 0) {
      return null;
    }

    const sorted = recommendations.sort((a, b) => {
      const aPlayCount = a.launch_count || 0;
      const bPlayCount = b.launch_count || 0;
      return aPlayCount - bPlayCount;
    });

    return sorted[0];
  }

  // Get most recently played recommendation
  static getMostRecentlyPlayedRecommendation(library, selectedMoods, selectedGenres, availableMinutes = null) {
    const recommendations = [...this.getRecommendations(library, selectedMoods, selectedGenres, availableMinutes)];
    
    if (recommendations.length === 0) {
      return null;
    }

    const sorted = recommendations.sort((a, b) => {
      const aLastPlayed = getLastPlayedTimestamp(a.last_played);
      const bLastPlayed = getLastPlayedTimestamp(b.last_played);
      return bLastPlayed - aLastPlayed; // Most recent first
    });

    return sorted[0];
  }

  // Get multiple recommendations
  static getMultipleRecommendations(library, selectedMoods, selectedGenres, availableMinutes = null, count = 5) {
    return this.getSelectionResult(library, selectedMoods, selectedGenres, availableMinutes, count).games;
  }

  // Get count of games matching criteria
  static getMatchingGameCount(library, selectedMoods, selectedGenres, availableMinutes = null) {
    return this.getSelectionResult(library, selectedMoods, selectedGenres, availableMinutes).totalMatches || 0;
  }

  // Validate selections
  static validateSelections(selectedMoods, selectedGenres) {
    const validMoods = Array.isArray(selectedMoods)
      ? selectedMoods.filter((mood, index, moods) => GenreMoodMapper.isValidMood(mood) && moods.indexOf(mood) === index)
      : [];
    const validGenres = Array.isArray(selectedGenres)
      ? selectedGenres.filter((genre, index, genres) => GenreMoodMapper.isValidGenre(genre) && genres.indexOf(genre) === index)
      : [];

    return {
      isValid: validMoods.length > 0 || validGenres.length > 0,
      validMoods,
      validGenres,
      invalidMoods: Array.isArray(selectedMoods) ? selectedMoods.filter(mood => !GenreMoodMapper.isValidMood(mood)) : [],
      invalidGenres: Array.isArray(selectedGenres) ? selectedGenres.filter(genre => !GenreMoodMapper.isValidGenre(genre)) : []
    };
  }
}
