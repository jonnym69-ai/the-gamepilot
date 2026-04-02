// EmptyLibraryFallbackData.js - Standardized fallback data for empty library states

export const EMPTY_LIBRARY_FALLBACK = Object.freeze({
  // Sample games for demonstration purposes
  sampleGames: [
    {
      id: 'sample-1',
      name: 'Portal 2',
      platform: 'Steam',
      genre: 'Puzzle',
      mood: 'Focused',
      playtime: 0,
      lastPlayed: null,
      icon: '🧩',
      description: 'Mind-bending puzzle game with cooperative gameplay'
    },
    {
      id: 'sample-2', 
      name: 'Stardew Valley',
      platform: 'Steam',
      genre: 'Simulation',
      mood: 'Relaxed',
      playtime: 0,
      lastPlayed: null,
      icon: '🌾',
      description: 'Peaceful farming simulation game'
    },
    {
      id: 'sample-3',
      name: 'DOOM Eternal',
      platform: 'Steam',
      genre: 'FPS',
      mood: 'Intense',
      playtime: 0,
      lastPlayed: null,
      icon: '🔥',
      description: 'High-octane first-person shooter'
    }
  ],
  
  // Empty state messages
  messages: {
    home: '🎮 Your game library is empty! Start by scanning for games on your system.',
    library: '📚 No games found. Try scanning your system or adding games manually.',
    stats: '📊 No gaming data yet. Launch some games to see your statistics!',
    achievements: '🏆 No achievements yet. Start playing and unlock your first achievement!',
    yearInReview: '📅 No gaming history for this year. Start building your gaming legacy!',
    performance: '⚡ No games to analyze. Scan your library to see performance recommendations.',
    challengeBoard: '🎯 No challenges available yet. Build your library to unlock personalized challenges!'
  },
  
  // Default stats for empty library
  defaultStats: {
    totalGames: 0,
    totalPlaytime: 0,
    averageSession: 0,
    favoriteGenre: 'None',
    mostPlayedGame: 'None',
    achievementCount: 0,
    sessionsRecorded: 0
  },
  
  // Default recommendations for empty library
  defaultRecommendations: [
    {
      type: 'scan',
      title: 'Scan Your System',
      description: 'Discover games already installed on your computer',
      action: 'scan'
    },
    {
      type: 'browse',
      title: 'Browse Store',
      description: 'Find new games to add to your collection',
      action: 'browse'
    },
    {
      type: 'import',
      title: 'Import Library',
      description: 'Import your existing game library from other platforms',
      action: 'import'
    }
  ]
});

// Helper function to get fallback data for specific components
export const getEmptyLibraryFallback = (componentName) => {
  const fallback = EMPTY_LIBRARY_FALLBACK;
  
  switch (componentName) {
    case 'Home':
    case 'Library':
      return {
        message: fallback.messages[componentName.toLowerCase()] || fallback.messages.home,
        sampleGames: fallback.sampleGames,
        recommendations: fallback.defaultRecommendations
      };
      
    case 'Stats':
    case 'Achievements':
    case 'YearInReview':
    case 'Performance':
    case 'ChallengeBoard':
      return {
        message: fallback.messages[componentName.toLowerCase()] || fallback.messages.home,
        stats: fallback.defaultStats,
        showSampleData: componentName === 'Performance' // Show sample data for performance testing
      };
      
    default:
      return {
        message: fallback.messages.home,
        sampleGames: fallback.sampleGames,
        recommendations: fallback.defaultRecommendations
      };
  }
};

// Helper function to check if library is empty and provide fallback
export const withEmptyLibraryFallback = (library, componentName, callback) => {
  if (!Array.isArray(library) || library.length === 0) {
    return getEmptyLibraryFallback(componentName);
  }
  
  return callback(library);
};
