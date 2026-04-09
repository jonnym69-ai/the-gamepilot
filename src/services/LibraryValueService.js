/**
 * Library Value Calculator Service
 * Calculates the estimated value of a game library based on Steam pricing data
 * and allows sharing as image or spreadsheet
 */

export class LibraryValueService {
  // Default pricing tiers for games without Steam data
  static PRICE_TIERS = {
    AAA_NEW: { min: 50, max: 70, default: 59.99, label: 'AAA New Release' },
    AAA_OLD: { min: 20, max: 40, default: 29.99, label: 'AAA Classic' },
    INDIE: { min: 10, max: 25, default: 14.99, label: 'Indie Game' },
    FREE: { min: 0, max: 0, default: 0, label: 'Free to Play' },
    UNKNOWN: { min: 15, max: 30, default: 19.99, label: 'Standard' }
  };

  // Platform-specific pricing adjustments
  static PLATFORM_MULTIPLIERS = {
    'Steam': 1.0,
    'Epic': 1.0,
    'GOG': 1.0,
    'Xbox': 1.0,
    'EA': 1.0,
    'Rockstar': 1.0,
    'Battle.net': 1.0,
    'Ubisoft': 1.0,
    'CurseForge': 0, // Mods are free
    'itch.io': 0.8,
    'Unknown': 1.0
  };

  /**
   * Calculate library value
   * @param {Array} library - Game library
   * @returns {Object} Library value statistics
   */
  static calculateLibraryValue(library) {
    if (!library || !Array.isArray(library) || library.length === 0) {
      return {
        totalGames: 0,
        totalValue: 0,
        averageValue: 0,
        steamGames: 0,
        steamValue: 0,
        nonSteamGames: 0,
        nonSteamValue: 0,
        platformBreakdown: {},
        tierBreakdown: {},
        games: []
      };
    }

    const games = library.map(game => this.estimateGameValue(game));
    
    const totalValue = games.reduce((sum, g) => sum + g.estimatedValue, 0);
    const steamGames = games.filter(g => g.platform === 'Steam');
    const nonSteamGames = games.filter(g => g.platform !== 'Steam');
    
    const platformBreakdown = {};
    const tierBreakdown = {};

    games.forEach(game => {
      // Platform breakdown
      const platform = game.platform || 'Unknown';
      if (!platformBreakdown[platform]) {
        platformBreakdown[platform] = { count: 0, value: 0 };
      }
      platformBreakdown[platform].count++;
      platformBreakdown[platform].value += game.estimatedValue;

      // Tier breakdown
      const tier = game.priceTier;
      if (!tierBreakdown[tier]) {
        tierBreakdown[tier] = { count: 0, value: 0, label: this.PRICE_TIERS[tier]?.label || tier };
      }
      tierBreakdown[tier].count++;
      tierBreakdown[tier].value += game.estimatedValue;
    });

    return {
      totalGames: games.length,
      totalValue: Math.round(totalValue * 100) / 100,
      averageValue: Math.round((totalValue / games.length) * 100) / 100,
      steamGames: steamGames.length,
      steamValue: Math.round(steamGames.reduce((sum, g) => sum + g.estimatedValue, 0) * 100) / 100,
      nonSteamGames: nonSteamGames.length,
      nonSteamValue: Math.round(nonSteamGames.reduce((sum, g) => sum + g.estimatedValue, 0) * 100) / 100,
      platformBreakdown,
      tierBreakdown,
      games: games.sort((a, b) => b.estimatedValue - a.estimatedValue)
    };
  }

  /**
   * Estimate value for a single game
   */
  static estimateGameValue(game) {
    if (!game) return null;

    const platform = game.platform || 'Unknown';
    
    // Check if game has actual Steam price data
    if (game.steamPrice || game.price) {
      const actualPrice = parseFloat(game.steamPrice || game.price);
      if (!isNaN(actualPrice) && actualPrice >= 0) {
        return {
          name: game.name || game.appname || 'Unknown',
          platform,
          estimatedValue: actualPrice,
          priceTier: this.getPriceTier(actualPrice),
          hasActualPrice: true,
          genres: game.genres || [],
          playtime: game.time_played || 0,
          iconUrl: game.iconUrl || game.icon
        };
      }
    }

    // Estimate based on game characteristics
    const estimatedValue = this.estimateValueByCharacteristics(game);
    
    return {
      name: game.name || game.appname || 'Unknown',
      platform,
      estimatedValue,
      priceTier: this.getPriceTier(estimatedValue),
      hasActualPrice: false,
      genres: game.genres || [],
      playtime: game.time_played || 0,
      iconUrl: game.iconUrl || game.icon
    };
  }

  /**
   * Estimate value based on game characteristics
   */
  static estimateValueByCharacteristics(game) {
    const platform = game.platform || 'Unknown';
    const genres = game.genres || [];
    const name = (game.name || game.appname || '').toLowerCase();
    
    // Free to play games
    const freeKeywords = ['free', 'demo', 'trial', 'beta', 'alpha', 'test'];
    if (freeKeywords.some(kw => name.includes(kw))) {
      return 0;
    }

    // Indie indicators
    const indieIndicators = [
      'itch.io', 'gamejolt', 'indie', 'pixel', 'retro',
      '2d platformer', 'puzzle', 'casual'
    ];
    const isIndie = indieIndicators.some(ind => 
      name.includes(ind) || genres.some(g => g.toLowerCase().includes(ind))
    );

    // AAA indicators
    const aaaIndicators = [
      'call of duty', 'battlefield', 'fifa', 'madden', 'nba',
      'assassin', 'creed', 'witcher', 'cyberpunk', 'gta',
      'red dead', 'elden ring', 'dark souls', 'final fantasy',
      'resident evil', 'god of war', 'uncharted', 'last of us'
    ];
    const isAAA = aaaIndicators.some(aaa => name.includes(aaa));

    // Determine tier
    let tier = 'UNKNOWN';
    if (isAAA) {
      tier = 'AAA_OLD'; // Assume older AAA for estimated pricing
    } else if (isIndie) {
      tier = 'INDIE';
    }

    // Apply platform multiplier
    const multiplier = this.PLATFORM_MULTIPLIERS[platform] || 1.0;
    const baseValue = this.PRICE_TIERS[tier].default;
    
    return Math.round(baseValue * multiplier * 100) / 100;
  }

  /**
   * Get price tier based on value
   */
  static getPriceTier(value) {
    if (value === 0) return 'FREE';
    if (value >= 50) return 'AAA_NEW';
    if (value >= 30) return 'AAA_OLD';
    if (value >= 10) return 'INDIE';
    return 'UNKNOWN';
  }

  /**
   * Generate CSV export of library value
   */
  static generateValueCSV(libraryValue) {
    const headers = ['Name', 'Platform', 'Estimated Value', 'Price Source', 'Playtime (min)', 'Genres'];
    
    const csvContent = [
      headers.join(','),
      ...libraryValue.games.map(game => [
        `"${game.name.replace(/"/g, '""')}"`,
        game.platform,
        game.estimatedValue.toFixed(2),
        game.hasActualPrice ? 'Steam Price' : 'Estimated',
        game.playtime || 0,
        `"${(game.genres || []).join('; ')}"`
      ].join(','))
    ].join('\n');

    // Add summary at the end
    const summary = [
      '',
      '"Summary"',
      `"Total Games",${libraryValue.totalGames}`,
      `"Total Value",${libraryValue.totalValue.toFixed(2)}`,
      `"Average Value",${libraryValue.averageValue.toFixed(2)}`,
      `"Steam Games",${libraryValue.steamGames}`,
      `"Steam Value",${libraryValue.steamValue.toFixed(2)}`,
      `"Non-Steam Games",${libraryValue.nonSteamGames}`,
      `"Non-Steam Value",${libraryValue.nonSteamValue.toFixed(2)}`
    ].join('\n');

    return csvContent + summary;
  }

  /**
   * Generate shareable text for social media
   */
  static generateShareText(libraryValue, username = 'Gamer') {
    return `🎮 ${username}'s GamePilot Library Value

💰 Total Value: $${libraryValue.totalValue.toFixed(2)}
🎯 ${libraryValue.totalGames} Games
📊 Steam: $${libraryValue.steamValue.toFixed(2)} (${libraryValue.steamGames} games)
💎 Non-Steam: $${libraryValue.nonSteamValue.toFixed(2)} (${libraryValue.nonSteamGames} games)

Tracked with GamePilot - My Ultimate Game Library!`;
  }

  /**
   * Format currency
   */
  static formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  }
}

export default LibraryValueService;
