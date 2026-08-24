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
        canRunMedium: 0,
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
        gameImage: resolveGameArtwork(game, { surface: 'portrait' }) || null,
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
      } else if (compatibility.settingsLevel === "medium") {
        analysis.stats.canRunMedium++;
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
        ultra: 5,
        high: 4,
        medium: 3,
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

  // Budget-based best upgrade picker
  static getBudgetRecommendation(budget, bottlenecks, systemInfo, stats) {
    if (!budget || budget <= 0 || !systemInfo) return null;

    const sortedBottlenecks = Object.entries(bottlenecks).sort(
      (a, b) => b[1] - a[1]
    );
    if (sortedBottlenecks.length === 0) return null;

    const topBottleneck = sortedBottlenecks[0];
    const component = topBottleneck[0];
    const gamesAffected = topBottleneck[1];

    const budgetTiers = this.getBudgetTiers(component, systemInfo);
    const affordable = budgetTiers.filter(t => t.maxCost <= budget);

    if (affordable.length === 0) {
      const entry = budgetTiers[0] || { minCost: 200, maxCost: 300 };
      return {
        component,
        gamesAffected,
        suggestion: `Save up — even entry-level ${component.toUpperCase()} upgrades start around $${entry.minCost}`,
        estimatedCost: `$${entry.minCost}-${entry.maxCost}`,
        minCost: entry.minCost,
        maxCost: entry.maxCost,
        withinBudget: false
      };
    }

    const best = affordable[affordable.length - 1];
    return {
      component,
      gamesAffected,
      suggestion: best.suggestion,
      estimatedCost: best.costLabel,
      minCost: best.minCost,
      maxCost: best.maxCost,
      withinBudget: true,
      tier: best.tier,
      fpsGain: best.fpsGain
    };
  }

  static getBudgetTiers(component, systemInfo) {
    const tiers = [];
    if (component === 'gpu') {
      const currentTier = systemInfo.gpu?.tier || 1;
      if (currentTier <= 1) tiers.push({ tier: 2, minCost: 250, maxCost: 350, costLabel: '$250-350', suggestion: 'RTX 4060 or RX 7600 — solid 1080p gaming', fpsGain: '+15-25 FPS' });
      if (currentTier <= 2) tiers.push({ tier: 3, minCost: 350, maxCost: 550, costLabel: '$350-550', suggestion: 'RTX 4070 or RX 7700 XT — high settings 1440p', fpsGain: '+25-40 FPS' });
      if (currentTier <= 3) tiers.push({ tier: 4, minCost: 550, maxCost: 900, costLabel: '$550-900', suggestion: 'RTX 4080 Super or RX 7900 XT — 4K ready', fpsGain: '+40-60 FPS' });
      if (currentTier <= 4) tiers.push({ tier: 5, minCost: 900, maxCost: 1600, costLabel: '$900-1600', suggestion: 'RTX 5090 or RX 9950 — enthusiast tier', fpsGain: '+60+ FPS' });
    } else if (component === 'cpu') {
      const currentTier = systemInfo.cpu?.tier || 1;
      if (currentTier <= 1) tiers.push({ tier: 2, minCost: 150, maxCost: 250, costLabel: '$150-250', suggestion: 'Ryzen 5 7600X or Intel i5-14600K', fpsGain: '+10-20 FPS' });
      if (currentTier <= 2) tiers.push({ tier: 3, minCost: 250, maxCost: 400, costLabel: '$250-400', suggestion: 'Ryzen 7 7800X3D or Intel i7-14700K', fpsGain: '+15-25 FPS' });
      if (currentTier <= 3) tiers.push({ tier: 4, minCost: 400, maxCost: 600, costLabel: '$400-600', suggestion: 'Ryzen 9 7950X3D or Intel i9-14900K', fpsGain: '+20-35 FPS' });
      if (currentTier <= 4) tiers.push({ tier: 5, minCost: 600, maxCost: 900, costLabel: '$600-900', suggestion: 'Ryzen 9 9950X or Intel Ultra 9 285K', fpsGain: '+35+ FPS' });
    } else if (component === 'ram') {
      const currentGB = systemInfo.ram?.total || 8;
      if (currentGB < 16) tiers.push({ tier: 1, minCost: 40, maxCost: 80, costLabel: '$40-80', suggestion: '16GB DDR4/DDR5 kit', fpsGain: 'Smoother multitasking' });
      if (currentGB < 32) tiers.push({ tier: 2, minCost: 80, maxCost: 150, costLabel: '$80-150', suggestion: '32GB DDR4/DDR5 kit', fpsGain: 'Eliminates stutter in open-world games' });
      if (currentGB < 64) tiers.push({ tier: 3, minCost: 150, maxCost: 300, costLabel: '$150-300', suggestion: '64GB DDR5 kit', fpsGain: 'Future-proof for heavy modding' });
    } else if (component === 'storage') {
      tiers.push({ tier: 1, minCost: 50, maxCost: 100, costLabel: '$50-100', suggestion: '1TB SATA SSD', fpsGain: '2-3x faster loads' });
      tiers.push({ tier: 2, minCost: 100, maxCost: 180, costLabel: '$100-180', suggestion: '1TB NVMe Gen4 SSD', fpsGain: '5-7x faster loads' });
      tiers.push({ tier: 3, minCost: 180, maxCost: 350, costLabel: '$180-350', suggestion: '2TB NVMe Gen5 SSD', fpsGain: '10x faster loads, massive capacity' });
    }
    return tiers;
  }
}
