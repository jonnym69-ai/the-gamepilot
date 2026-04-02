// BottleneckAnalyzer.js - Analyzes hardware bottlenecks and provides upgrade recommendations
import { GameRequirements } from "./GameRequirements";
import { resolveGameArtwork } from './GameArtworkService';

export class BottleneckAnalyzer {
  // Analyze entire game library against system specs
  static analyzeLibrary(library, systemInfo) {
    const analysis = {
      overallScore: 0,
      bottlenecks: {},
      recommendations: [],
      compatibilityMatrix: [],
      stats: {
        totalGames: library.length,
        analyzedGames: 0,
        canRunMinimum: 0,
        canRunRecommended: 0,
        canRunUltra: 0,
        cannotRun: 0,
        verifiedMatches: 0,
        estimatedMatches: 0,
      },
    };

    if (!library || library.length === 0) {
      return analysis;
    }

    // Analyze each game
    library.forEach((game) => {
      if (!game) {
        return;
      }

      const compatibility = GameRequirements.checkGameCompatibility(
        game,
        systemInfo,
      );
      const gameName = game.name || game.title || "Unknown Game";
      const topBottleneck = compatibility.bottlenecks?.[0] || null;

      analysis.stats.analyzedGames++;
      if (compatibility.isEstimate) {
        analysis.stats.estimatedMatches++;
      } else {
        analysis.stats.verifiedMatches++;
      }

      analysis.compatibilityMatrix.push({
        gameId:
          compatibility.lookupKey ||
          game.appid ||
          game.app_id ||
          game.steamAppId ||
          game.name,
        gameName: gameName,
        gameImage: resolveGameArtwork(game, { surface: 'recommendation_card' }) || null,
        canRun: compatibility.canRun,
        performanceLevel: compatibility.settingsLevel,
        bottlenecks: compatibility.bottlenecks || [],
        bottleneck: topBottleneck?.component || null,
        fps: compatibility.estimatedFPS,
        isEstimate: compatibility.isEstimate,
        matchType: compatibility.matchType,
      });

      // Update stats based on settings level
      if (compatibility.settingsLevel === "unknown") {
        analysis.stats.cannotRun++;
      } else if (!compatibility.canRun) {
        analysis.stats.cannotRun++;
      } else if (compatibility.settingsLevel === "ultra") {
        analysis.stats.canRunUltra++;
      } else if (compatibility.settingsLevel === "high") {
        analysis.stats.canRunRecommended++;
      } else if (compatibility.settingsLevel === "low") {
        analysis.stats.canRunMinimum++;
      }

      // Track bottlenecks
      if (compatibility.bottlenecks && compatibility.bottlenecks.length > 0) {
        compatibility.bottlenecks.forEach((bottleneck) => {
          const key = bottleneck.component.toLowerCase();
          analysis.bottlenecks[key] = (analysis.bottlenecks[key] || 0) + 1;
        });
      }
    });

    analysis.compatibilityMatrix.sort((left, right) => {
      const levelOrder = {
        ultra: 4,
        high: 3,
        low: 2,
        cannot_run: 1,
        unknown: 0,
      };
      if (left.isEstimate !== right.isEstimate) {
        return Number(left.isEstimate) - Number(right.isEstimate);
      }
      if (
        (levelOrder[right.performanceLevel] || 0) !==
        (levelOrder[left.performanceLevel] || 0)
      ) {
        return (
          (levelOrder[right.performanceLevel] || 0) -
          (levelOrder[left.performanceLevel] || 0)
        );
      }
      return left.gameName.localeCompare(right.gameName);
    });

    // Generate recommendations based on bottlenecks
    analysis.recommendations = this.generateRecommendations(
      analysis.bottlenecks,
      systemInfo,
      analysis.stats,
    );

    // Calculate overall system score
    analysis.overallScore = this.calculateOverallScore(
      analysis.stats,
      analysis.stats.analyzedGames,
    );

    return analysis;
  }

  // Calculate overall system score
  static calculateOverallScore(stats, totalGames) {
    if (totalGames === 0) return 0;

    const ultraWeight = 100;
    const recommendedWeight = 75;
    const minimumWeight = 50;
    const cannotRunWeight = 0;

    const weightedScore =
      (stats.canRunUltra * ultraWeight +
        stats.canRunRecommended * recommendedWeight +
        stats.canRunMinimum * minimumWeight +
        stats.cannotRun * cannotRunWeight) /
      totalGames;

    return Math.round(weightedScore);
  }

  // Generate upgrade recommendations
  static generateRecommendations(bottlenecks, systemInfo, stats) {
    const recommendations = [];

    // Sort bottlenecks by frequency
    const sortedBottlenecks = Object.entries(bottlenecks).sort(
      (a, b) => b[1] - a[1],
    );

    sortedBottlenecks.forEach(([component, count]) => {
      const rec = this.generateComponentRecommendation(
        component,
        count,
        systemInfo,
        stats,
      );
      if (rec) recommendations.push(rec);
    });

    // Add general recommendations
    if (recommendations.length === 0) {
      recommendations.push({
        component: "System",
        priority: "low",
        impact: "Your system handles your library well",
        suggestion: "No immediate upgrades needed",
        estimatedCost: "$0",
        gamesAffected: 0,
      });
    }

    return recommendations;
  }

  // Generate recommendation for specific component
  static generateComponentRecommendation(
    component,
    gamesAffected,
    systemInfo,
    stats,
  ) {
    const recommendations = {
      cpu: {
        component: "CPU",
        priority: this.getPriority(gamesAffected, stats.totalGames),
        impact: `Would improve performance in ${gamesAffected} games`,
        suggestion: this.suggestCPUUpgrade(systemInfo.cpu.tier),
        estimatedCost: this.estimateCPUCost(systemInfo.cpu.tier),
        gamesAffected,
      },
      gpu: {
        component: "GPU",
        priority: this.getPriority(gamesAffected, stats.totalGames),
        impact: `Would improve performance in ${gamesAffected} games`,
        suggestion: this.suggestGPUUpgrade(systemInfo.gpu.tier),
        estimatedCost: this.estimateGPUCost(systemInfo.gpu.tier),
        gamesAffected,
      },
      ram: {
        component: "RAM",
        priority: this.getPriority(gamesAffected, stats.totalGames),
        impact: `Would improve performance in ${gamesAffected} games`,
        suggestion: this.suggestRAMUpgrade(systemInfo.ram.total),
        estimatedCost: this.estimateRAMCost(systemInfo.ram.total),
        gamesAffected,
      },
      storage: {
        component: "Storage",
        priority: this.getPriority(gamesAffected, stats.totalGames),
        impact: `Would reduce load times in ${gamesAffected} games`,
        suggestion: "Upgrade to SSD for faster load times",
        estimatedCost: "$50-150",
        gamesAffected,
      },
    };

    return recommendations[component] || null;
  }

  // Determine priority level
  static getPriority(gamesAffected, totalGames) {
    const percentage = (gamesAffected / totalGames) * 100;
    if (percentage >= 50) return "high";
    if (percentage >= 25) return "medium";
    return "low";
  }

  // CPU upgrade suggestions
  static suggestCPUUpgrade(currentTier) {
    const suggestions = {
      1: "Intel i5-13400 or AMD Ryzen 5 5600X",
      2: "Intel i5-14600K or AMD Ryzen 5 7600X",
      3: "Intel i7-14700K or AMD Ryzen 7 7800X3D",
      4: "Intel i9-14900K or AMD Ryzen 9 7950X3D",
    };
    return suggestions[currentTier] || "Consult with hardware expert";
  }

  // GPU upgrade suggestions
  static suggestGPUUpgrade(currentTier) {
    const suggestions = {
      1: "RTX 3060 or RX 6600 XT ($250-350)",
      2: "RTX 4060 Ti or RX 7600 XT ($350-450)",
      3: "RTX 4070 or RX 7700 XT ($500-600)",
      4: "RTX 4080 or RX 7900 XT ($900-1100)",
    };
    return suggestions[currentTier] || "Your GPU is top-tier";
  }

  // RAM upgrade suggestions
  static suggestRAMUpgrade(currentRAM) {
    if (currentRAM < 8) return "Upgrade to 16GB DDR4 ($40-60)";
    if (currentRAM < 16) return "Upgrade to 32GB DDR4 ($80-120)";
    if (currentRAM < 32) return "Upgrade to 64GB DDR5 ($200-300)";
    return "Your RAM is sufficient";
  }

  // Estimate CPU upgrade cost
  static estimateCPUCost(currentTier) {
    const costs = {
      1: "$150-250",
      2: "$250-350",
      3: "$350-500",
      4: "$500-700",
    };
    return costs[currentTier] || "$200-400";
  }

  // Estimate GPU upgrade cost
  static estimateGPUCost(currentTier) {
    const costs = {
      1: "$250-350",
      2: "$350-500",
      3: "$500-700",
      4: "$900-1200",
    };
    return costs[currentTier] || "$300-500";
  }

  // Estimate RAM upgrade cost
  static estimateRAMCost(currentRAM) {
    if (currentRAM < 8) return "$40-60";
    if (currentRAM < 16) return "$80-120";
    if (currentRAM < 32) return "$200-300";
    return "$300-500";
  }
}
