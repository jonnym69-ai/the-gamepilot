// DataValidator.js - Validates all data calculations for accuracy
import { SteamPriceService } from './SteamPriceService';
import { OpenedGamesTracker } from './OpenedGamesTracker';
import { AchievementTracker } from '../AchievementSystem';

export class DataValidator {
  // Validate library value calculation
  static validateLibraryValue(library, currency = 'USD') {
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      data: {
        totalGames: 0,
        openedGames: 0,
        pricedGames: 0,
        totalValue: 0,
        gameDetails: []
      }
    };

    try {
      validation.data.totalGames = library.length;

      // Get opened games
      const openedGames = OpenedGamesTracker.getOpenedGamesList();
      validation.data.openedGames = openedGames.length;

      let totalValue = 0;
      let pricedGames = 0;

      // Validate each opened game
      openedGames.forEach(openedGame => {
        const fullGame = library.find(g => g.appid === openedGame.appid);
        
        if (!fullGame) {
          validation.errors.push(`Opened game ${openedGame.appid} not found in library`);
          validation.isValid = false;
          return;
        }

        const gamePrice = SteamPriceService.getPriceNumeric(fullGame);
        
        if (gamePrice > 0) {
          totalValue += gamePrice;
          pricedGames++;
          
          validation.data.gameDetails.push({
            name: fullGame.name,
            appid: fullGame.appid,
            platform: fullGame.platform,
            price: gamePrice,
            hasPriceData: true
          });
        } else {
          validation.data.gameDetails.push({
            name: fullGame.name,
            appid: fullGame.appid,
            platform: fullGame.platform,
            price: 0,
            hasPriceData: false
          });
          
          if (fullGame.platform === 'Steam') {
            validation.warnings.push(`Steam game "${fullGame.name}" missing price data`);
          }
        }
      });

      validation.data.pricedGames = pricedGames;
      validation.data.totalValue = totalValue;

      if (pricedGames === 0 && openedGames.length > 0) {
        validation.warnings.push('No priced games found in opened games list');
      }

      return validation;
    } catch (error) {
      validation.isValid = false;
      validation.errors.push(`Validation error: ${error.message}`);
      return validation;
    }
  }

  // Validate platform distribution
  static validatePlatformDistribution(library) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      data: {
        totalGames: library.length,
        platformCounts: {},
        uniquePlatforms: 0
      }
    };

    try {
      const platformCounts = {};
      
      library.forEach(game => {
        const platform = game.platform || 'Unknown';
        platformCounts[platform] = (platformCounts[platform] || 0) + 1;
      });

      validation.data.platformCounts = platformCounts;
      validation.data.uniquePlatforms = Object.keys(platformCounts).length;

      // Verify counts sum to total
      const countSum = Object.values(platformCounts).reduce((a, b) => a + b, 0);
      if (countSum !== library.length) {
        validation.isValid = false;
        validation.errors.push(`Platform count sum (${countSum}) doesn't match total games (${library.length})`);
      }

      // Check for unknown platforms
      if (platformCounts['Unknown'] && platformCounts['Unknown'] > 0) {
        validation.warnings.push(`${platformCounts['Unknown']} games have unknown platform`);
      }

      return validation;
    } catch (error) {
      validation.isValid = false;
      validation.errors.push(`Validation error: ${error.message}`);
      return validation;
    }
  }

  // Validate genre distribution
  static validateGenreDistribution(library) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      data: {
        totalGames: library.length,
        genreCounts: {},
        uniqueGenres: 0,
        gamesWithoutGenre: 0
      }
    };

    try {
      const genreCounts = {};
      let gamesWithoutGenre = 0;

      library.forEach(game => {
        if (!game.genres || !Array.isArray(game.genres) || game.genres.length === 0) {
          gamesWithoutGenre++;
        } else {
          game.genres.forEach(genre => {
            genreCounts[genre] = (genreCounts[genre] || 0) + 1;
          });
        }
      });

      validation.data.genreCounts = genreCounts;
      validation.data.uniqueGenres = Object.keys(genreCounts).length;
      validation.data.gamesWithoutGenre = gamesWithoutGenre;

      if (gamesWithoutGenre > 0) {
        validation.warnings.push(`${gamesWithoutGenre} games missing genre data`);
      }

      return validation;
    } catch (error) {
      validation.isValid = false;
      validation.errors.push(`Validation error: ${error.message}`);
      return validation;
    }
  }

  // Validate mood distribution
  static validateMoodDistribution(library) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      data: {
        totalGames: library.length,
        moodCounts: {},
        uniqueMoods: 0,
        gamesWithoutMood: 0
      }
    };

    try {
      const moodCounts = {};
      let gamesWithoutMood = 0;

      library.forEach(game => {
        const mood = game.mood || 'Unknown';
        if (mood === 'Unknown') {
          gamesWithoutMood++;
        }
        moodCounts[mood] = (moodCounts[mood] || 0) + 1;
      });

      validation.data.moodCounts = moodCounts;
      validation.data.uniqueMoods = Object.keys(moodCounts).length;
      validation.data.gamesWithoutMood = gamesWithoutMood;

      // Verify counts sum to total
      const countSum = Object.values(moodCounts).reduce((a, b) => a + b, 0);
      if (countSum !== library.length) {
        validation.isValid = false;
        validation.errors.push(`Mood count sum (${countSum}) doesn't match total games (${library.length})`);
      }

      if (gamesWithoutMood > 0) {
        validation.warnings.push(`${gamesWithoutMood} games missing mood data`);
      }

      return validation;
    } catch (error) {
      validation.isValid = false;
      validation.errors.push(`Validation error: ${error.message}`);
      return validation;
    }
  }

  // Validate achievement data
  static validateAchievementData() {
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      data: {
        unlockedCount: 0,
        totalAchievements: 370,
        completionPercentage: 0,
        xpStats: {},
        gamingStats: {}
      }
    };

    try {
      const unlockedAchievements = AchievementTracker.getUnlockedAchievements();
      const xpStats = AchievementTracker.getXPStats();
      const gamingStats = AchievementTracker.getGamingStats();

      validation.data.unlockedCount = unlockedAchievements.length;
      validation.data.completionPercentage = Math.round((unlockedAchievements.length / 370) * 100);
      validation.data.xpStats = xpStats;
      validation.data.gamingStats = gamingStats;

      // Verify completion percentage is valid
      if (validation.data.completionPercentage < 0 || validation.data.completionPercentage > 100) {
        validation.isValid = false;
        validation.errors.push(`Invalid completion percentage: ${validation.data.completionPercentage}%`);
      }

      // Verify XP stats
      if (!xpStats.level || xpStats.level < 1) {
        validation.warnings.push('Invalid XP level data');
      }

      return validation;
    } catch (error) {
      validation.isValid = false;
      validation.errors.push(`Validation error: ${error.message}`);
      return validation;
    }
  }

  // Run all validations
  static runFullAudit(library, currency = 'USD') {
    const audit = {
      timestamp: new Date().toISOString(),
      isValid: true,
      validations: {
        libraryValue: this.validateLibraryValue(library, currency),
        platformDistribution: this.validatePlatformDistribution(library),
        genreDistribution: this.validateGenreDistribution(library),
        moodDistribution: this.validateMoodDistribution(library),
        achievements: this.validateAchievementData()
      }
    };

    // Check if any validation failed
    Object.values(audit.validations).forEach(validation => {
      if (!validation.isValid) {
        audit.isValid = false;
      }
    });

    return audit;
  }

  // Get audit report as readable text
  static getAuditReport(library, currency = 'USD') {
    const audit = this.runFullAudit(library, currency);
    let report = `\n=== DATA VALIDATION AUDIT ===\n`;
    report += `Timestamp: ${audit.timestamp}\n`;
    report += `Overall Status: ${audit.isValid ? '✅ VALID' : '❌ INVALID'}\n\n`;

    Object.entries(audit.validations).forEach(([key, validation]) => {
      report += `\n--- ${key.toUpperCase()} ---\n`;
      report += `Status: ${validation.isValid ? '✅ VALID' : '❌ INVALID'}\n`;
      
      if (validation.errors.length > 0) {
        report += `Errors:\n`;
        validation.errors.forEach(err => report += `  ❌ ${err}\n`);
      }
      
      if (validation.warnings.length > 0) {
        report += `Warnings:\n`;
        validation.warnings.forEach(warn => report += `  ⚠️ ${warn}\n`);
      }
      
      report += `Data: ${JSON.stringify(validation.data, null, 2)}\n`;
    });

    return report;
  }
}
