// GameRequirements.js - Game requirements compatibility checking

import { HardwareScoring } from './HardwareScoring';
import { GAME_DATABASE } from './GameRequirementsDatabase';

export class GameRequirements {
  
  static gameDatabase = GAME_DATABASE;
  static normalizedNameIndex = null;

  static normalizeLookupValue(value = '') {
    return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  static getNameIndex() {
    if (this.normalizedNameIndex) {
      return this.normalizedNameIndex;
    }

    this.normalizedNameIndex = Object.entries(this.gameDatabase).reduce((acc, [id, requirements]) => {
      const normalizedName = this.normalizeLookupValue(requirements?.name);
      if (normalizedName) {
        acc[normalizedName] = id;
      }
      return acc;
    }, {});

    return this.normalizedNameIndex;
  }

  static getLookupKey(gameOrId) {
    if (gameOrId && typeof gameOrId === 'object') {
      return gameOrId.appid || gameOrId.app_id || gameOrId.steamAppId || gameOrId.id || gameOrId.name || gameOrId.title || 'unknown';
    }

    return String(gameOrId || 'unknown');
  }

  static resolveGameRequirements(gameOrId) {
    const idCandidates = [];
    const nameCandidates = [];

    if (gameOrId && typeof gameOrId === 'object') {
      [gameOrId.appid, gameOrId.app_id, gameOrId.steamAppId, gameOrId.id].forEach((value) => {
        if (value !== undefined && value !== null && `${value}`.trim()) {
          idCandidates.push(String(value).trim());
        }
      });

      [gameOrId.name, gameOrId.title].forEach((value) => {
        const normalizedValue = this.normalizeLookupValue(value);
        if (normalizedValue) {
          nameCandidates.push(normalizedValue);
        }
      });
    } else {
      const rawValue = String(gameOrId || '').trim();
      if (rawValue) {
        idCandidates.push(rawValue);
        const normalizedValue = this.normalizeLookupValue(rawValue);
        if (normalizedValue) {
          nameCandidates.push(normalizedValue);
        }
      }
    }

    for (const candidate of idCandidates) {
      if (this.gameDatabase[candidate]) {
        return {
          id: candidate,
          requirements: this.gameDatabase[candidate],
          matchType: 'id'
        };
      }
    }

    const nameIndex = this.getNameIndex();
    for (const candidate of nameCandidates) {
      const matchedId = nameIndex[candidate];
      if (matchedId && this.gameDatabase[matchedId]) {
        return {
          id: matchedId,
          requirements: this.gameDatabase[matchedId],
          matchType: 'name'
        };
      }
    }

    return null;
  }
  
  static checkGameCompatibility(gameId, systemInfo) {
    const resolvedGame = this.resolveGameRequirements(gameId);
    const requirements = resolvedGame?.requirements;
    const displayName = gameId && typeof gameId === 'object'
      ? gameId.name || gameId.title || requirements?.name || 'Unknown Game'
      : requirements?.name || String(gameId || 'Unknown Game');
    const lookupKey = resolvedGame?.id || this.getLookupKey(gameId);
    const scores = HardwareScoring.getOverallScore(systemInfo);
    
    if (!requirements) {
      let estimatedLevel = 'cannot_run';
      if (scores.overall >= 85) {
        estimatedLevel = 'ultra';
      } else if (scores.overall >= 60) {
        estimatedLevel = 'high';
      } else if (scores.overall >= 35) {
        estimatedLevel = 'low';
      }
      
      return {
        compatible: estimatedLevel !== 'cannot_run',
        settingsLevel: estimatedLevel,
        bottlenecks: [],
        estimatedFPS: this.estimateFPS(estimatedLevel, scores.overall),
        canRun: estimatedLevel !== 'cannot_run',
        gameName: displayName,
        requirements: null,
        isEstimate: true,
        matchType: 'estimate',
        lookupKey
      };
    }
    
    const meetsMinimum = this.meetsRequirements(requirements.minimum, scores, systemInfo);
    const meetsRecommended = this.meetsRequirements(requirements.recommended, scores, systemInfo);
    const meetsUltra = this.meetsRequirements(requirements.ultra, scores, systemInfo);
    
    let settingsLevel = 'cannot_run';
    if (meetsMinimum.passes) settingsLevel = 'low';
    if (meetsRecommended.passes) settingsLevel = 'high';
    if (meetsUltra.passes) settingsLevel = 'ultra';
    
    const bottlenecks = this.detectBottlenecks(requirements, scores, systemInfo, settingsLevel);
    const estimatedFPS = this.estimateFPS(settingsLevel, scores.overall);
    
    return {
      compatible: meetsMinimum.passes,
      settingsLevel,
      bottlenecks,
      estimatedFPS,
      canRun: meetsMinimum.passes,
      gameName: requirements.name,
      requirements: requirements,
      isEstimate: false,
      matchType: resolvedGame?.matchType || 'id',
      lookupKey
    };
  }
  
  static meetsRequirements(reqLevel, scores, systemInfo) {
    const issues = [];
    
    if (scores.cpu < reqLevel.cpuScore) {
      issues.push({ component: 'CPU', required: reqLevel.cpuScore, actual: scores.cpu });
    }
    
    if (scores.gpu < reqLevel.gpuScore) {
      issues.push({ component: 'GPU', required: reqLevel.gpuScore, actual: scores.gpu });
    }
    
    if (systemInfo.ram.total < reqLevel.ram) {
      issues.push({ component: 'RAM', required: reqLevel.ram, actual: systemInfo.ram.total });
    }
    
    if (reqLevel.requiresSSD) {
      const storageDevices = Array.isArray(systemInfo.storage) ? systemInfo.storage : [];
      const hasNVMe = storageDevices.some(d => d.isNVMe);
      const hasSSD = storageDevices.some(d => d.isSSD);
      if (!hasNVMe && !hasSSD) {
        issues.push({ component: 'Storage', required: 'SSD', actual: 'HDD' });
      }
    }
    
    return {
      passes: issues.length === 0,
      issues
    };
  }
  
  static detectBottlenecks(requirements, scores, systemInfo, settingsLevel) {
    const bottlenecks = [];
    
    const nextLevel = settingsLevel === 'low'
      ? requirements.recommended
      : settingsLevel === 'high'
        ? requirements.ultra
        : settingsLevel === 'cannot_run'
          ? requirements.minimum
          : null;
    const targetLabel = settingsLevel === 'low'
      ? 'High'
      : settingsLevel === 'high'
        ? 'Ultra'
        : settingsLevel === 'cannot_run'
          ? 'Minimum'
          : null;
    
    if (nextLevel && targetLabel) {
      const cpuGap = nextLevel.cpuScore - scores.cpu;
      const gpuGap = nextLevel.gpuScore - scores.gpu;
      const ramGap = nextLevel.ram - systemInfo.ram.total;
      const storageDevices = Array.isArray(systemInfo.storage) ? systemInfo.storage : [];
      const hasNVMe = storageDevices.some(d => d.isNVMe);
      const hasSSD = storageDevices.some(d => d.isSSD);
      
      if (cpuGap > 0) {
        bottlenecks.push({
          component: 'CPU',
          impact: cpuGap > 20 ? 'high' : cpuGap > 10 ? 'medium' : 'low',
          message: `CPU is ${cpuGap} points below ${targetLabel} settings`,
          scoreGap: cpuGap
        });
      }
      
      if (gpuGap > 0) {
        bottlenecks.push({
          component: 'GPU',
          impact: gpuGap > 20 ? 'high' : gpuGap > 10 ? 'medium' : 'low',
          message: `GPU is ${gpuGap} points below ${targetLabel} settings`,
          scoreGap: gpuGap
        });
      }
      
      if (ramGap > 0) {
        bottlenecks.push({
          component: 'RAM',
          impact: ramGap >= 8 ? 'high' : 'medium',
          message: `Need ${ramGap}GB more RAM for ${targetLabel} settings`,
          scoreGap: ramGap
        });
      }

      if (nextLevel.requiresSSD && !hasNVMe && !hasSSD) {
        bottlenecks.push({
          component: 'Storage',
          impact: settingsLevel === 'cannot_run' ? 'high' : 'medium',
          message: `Need SSD-class storage for ${targetLabel} settings`,
          scoreGap: 1
        });
      }
    }
    
    bottlenecks.sort((a, b) => {
      const impactOrder = { high: 3, medium: 2, low: 1 };
      return impactOrder[b.impact] - impactOrder[a.impact];
    });
    
    return bottlenecks;
  }
  
  static estimateFPS(settingsLevel, overallScore) {
    if (settingsLevel === 'cannot_run') return '< 30';
    if (settingsLevel === 'low') return '30-45';
    if (settingsLevel === 'high') {
      if (overallScore >= 75) return '60-90';
      return '45-60';
    }
    if (settingsLevel === 'ultra') {
      if (overallScore >= 90) return '90-144+';
      if (overallScore >= 85) return '75-90';
      return '60-75';
    }
    return 'Unknown';
  }
  
  static getSettingsLabel(settingsLevel) {
    const labels = {
      'ultra': { text: 'Ultra', description: 'Maxed out settings', color: '#00e676', emoji: '🔥' },
      'high': { text: 'High', description: 'High settings', color: '#4caf50', emoji: '⚡' },
      'low': { text: 'Low', description: 'Low settings', color: '#2196f3', emoji: '👍' },
      'cannot_run': { text: 'Below Minimum', description: 'Below minimum requirements', color: '#f44336', emoji: '⛔' },
      'unknown': { text: 'Unknown', description: 'No data available', color: '#9e9e9e', emoji: '❓' }
    };
    return labels[settingsLevel] || labels.unknown;
  }
}
