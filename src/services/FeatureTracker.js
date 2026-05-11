// FeatureTracker.js - Tracks feature usage and user preferences
import StorageService from './StorageService';

export class FeatureTracker {
  static STORAGE_KEY = 'featureTracking';

  // Feature types
  static FEATURES = {
    PERFECT_PLAY: 'perfectPlay',
    SURPRISE_ME: 'surpriseMe',
    REDISCOVER: 'rediscover',
    CONTINUE_PLAYING: 'continuePlaying'
  };

  // Get all tracking data
  static getTrackingData() {
    try {
      const data = StorageService.getString(this.STORAGE_KEY);
      return data ? JSON.parse(data) : this.getDefaultData();
    } catch (error) {
      console.error('Error reading feature tracking:', error);
      return this.getDefaultData();
    }
  }

  // Get default tracking structure
  static getDefaultData() {
    return {
      features: {
        [this.FEATURES.PERFECT_PLAY]: 0,
        [this.FEATURES.SURPRISE_ME]: 0,
        [this.FEATURES.REDISCOVER]: 0,
        [this.FEATURES.CONTINUE_PLAYING]: 0
      },
      moods: {},
      genres: {},
      mostPlayedGames: {},
      lastUpdated: Date.now()
    };
  }

  // Track feature usage
  static trackFeatureUsage(feature) {
    if (!Object.values(this.FEATURES).includes(feature)) {
      console.warn(`Unknown feature: ${feature}`);
      return;
    }

    try {
      const data = this.getTrackingData();
      data.features[feature] = (data.features[feature] || 0) + 1;
      data.lastUpdated = Date.now();
      StorageService.setString(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error tracking feature usage:', error);
    }
  }

  // Track mood selection
  static trackMoodSelection(mood) {
    if (!mood) return;

    try {
      const data = this.getTrackingData();
      data.moods[mood] = (data.moods[mood] || 0) + 1;
      data.lastUpdated = Date.now();
      StorageService.setString(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error tracking mood:', error);
    }
  }

  // Track genre selection
  static trackGenreSelection(genre) {
    if (!genre) return;

    try {
      const data = this.getTrackingData();
      data.genres[genre] = (data.genres[genre] || 0) + 1;
      data.lastUpdated = Date.now();
      StorageService.setString(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error tracking genre:', error);
    }
  }

  // Track game play (for most played games)
  static trackGamePlay(game) {
    if (!game || !game.appid) return;

    try {
      const data = this.getTrackingData();
      const gameKey = game.appid || game.name;
      
      if (!data.mostPlayedGames[gameKey]) {
        data.mostPlayedGames[gameKey] = {
          name: game.name,
          platform: game.platform,
          appid: game.appid,
          playCount: 0,
          totalPlaytime: 0
        };
      }
      
      data.mostPlayedGames[gameKey].playCount += 1;
      data.lastUpdated = Date.now();
      StorageService.setString(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error tracking game play:', error);
    }
  }

  // Update game playtime
  static updateGamePlaytime(game, minutes) {
    if (!game || !game.appid || !minutes) return;

    try {
      const data = this.getTrackingData();
      const gameKey = game.appid || game.name;
      
      if (data.mostPlayedGames[gameKey]) {
        data.mostPlayedGames[gameKey].totalPlaytime += minutes;
        data.lastUpdated = Date.now();
        StorageService.setString(this.STORAGE_KEY, JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error updating game playtime:', error);
    }
  }

  // Get feature usage stats
  static getFeatureStats() {
    const data = this.getTrackingData();
    return {
      features: data.features,
      totalFeatureUses: Object.values(data.features).reduce((a, b) => a + b, 0)
    };
  }

  // Get mood stats
  static getMoodStats() {
    const data = this.getTrackingData();
    const moods = data.moods || {};
    const total = Object.values(moods).reduce((a, b) => a + b, 0);
    
    return {
      moods,
      totalMoodSelections: total,
      mostSelectedMood: Object.entries(moods).sort(([,a], [,b]) => b - a)[0]?.[0] || null
    };
  }

  // Get genre stats
  static getGenreStats() {
    const data = this.getTrackingData();
    const genres = data.genres || {};
    const total = Object.values(genres).reduce((a, b) => a + b, 0);
    
    return {
      genres,
      totalGenreSelections: total,
      mostSelectedGenre: Object.entries(genres).sort(([,a], [,b]) => b - a)[0]?.[0] || null
    };
  }

  // Get most played games
  static getMostPlayedGames(limit = 10) {
    const data = this.getTrackingData();
    const games = Object.values(data.mostPlayedGames || {});
    
    return games
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, limit);
  }

  // Get top games by playtime
  static getTopGamesByPlaytime(limit = 10) {
    const data = this.getTrackingData();
    const games = Object.values(data.mostPlayedGames || {});
    
    return games
      .sort((a, b) => b.totalPlaytime - a.totalPlaytime)
      .slice(0, limit);
  }

  // Clear all tracking data
  static clearAll() {
    try {
      StorageService.remove(this.STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing tracking data:', error);
    }
  }

  // Get all tracking data summary
  static getSummary() {
    const data = this.getTrackingData();
    const featureStats = this.getFeatureStats();
    const moodStats = this.getMoodStats();
    const genreStats = this.getGenreStats();
    const mostPlayedGames = this.getMostPlayedGames(5);

    return {
      features: featureStats,
      moods: moodStats,
      genres: genreStats,
      mostPlayedGames,
      lastUpdated: data.lastUpdated
    };
  }
}
