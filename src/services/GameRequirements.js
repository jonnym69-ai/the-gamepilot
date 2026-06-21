// GameRequirements.js - Game requirements compatibility checking
//
// The 220KB GameRequirementsDatabase is lazy-loaded so it doesn't bloat the
// initial bundle. Until it loads, checkGameCompatibility falls through to the
// hardware-score-based estimate path (which is the same fallback used for
// games not in the DB), so callers always get a usable result.

import { HardwareScoring } from './HardwareScoring';
import { GameRequirementsHeuristics } from './GameRequirementsHeuristics';

export class GameRequirements {

  static gameDatabase = {};
  static normalizedNameIndex = null;
  static isDatabaseLoaded = false;
  static _databasePromise = null;

  /**
   * Lazy-load the requirements DB. Returns a cached promise so concurrent
   * callers share a single network/disk hit.
   */
  static ensureDatabaseLoaded() {
    if (this.isDatabaseLoaded) {
      return Promise.resolve(this.gameDatabase);
    }
    if (!this._databasePromise) {
      this._databasePromise = import('./GameRequirementsDatabase')
        .then((mod) => {
          this.gameDatabase = mod.GAME_DATABASE || {};
          this.normalizedNameIndex = null; // rebuilt on next lookup
          this.isDatabaseLoaded = true;
          return this.gameDatabase;
        })
        .catch((err) => {
          console.error('[GameRequirements] Failed to load requirements DB:', err);
          this._databasePromise = null; // allow retry on next call
          throw err;
        });
    }
    return this._databasePromise;
  }

  /**
   * Fire-and-forget prefetch. Safe to call from page mounts to warm the cache.
   */
  static prefetchDatabase() {
    this.ensureDatabaseLoaded().catch(() => { /* swallow; logged above */ });
  }

  static normalizeLookupValue(value = '') {
    const safeValue = value != null ? String(value) : '';
    return safeValue.toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  static getNameIndex() {
    if (this.normalizedNameIndex) {
      return this.normalizedNameIndex;
    }

    const safeDatabase = this.gameDatabase && typeof this.gameDatabase === 'object' ? this.gameDatabase : {};
    this.normalizedNameIndex = Object.entries(safeDatabase).reduce((acc, [id, requirements]) => {
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

    const safeValue = gameOrId != null ? String(gameOrId) : 'unknown';
    return safeValue;
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
  
  static interpolateRequirements(minimum, recommended) {
    if (!minimum || !recommended) return null;
    return {
      cpuScore: typeof minimum.cpuScore === 'number' && typeof recommended.cpuScore === 'number'
        ? Math.round((minimum.cpuScore + recommended.cpuScore) / 2)
        : undefined,
      gpuScore: typeof minimum.gpuScore === 'number' && typeof recommended.gpuScore === 'number'
        ? Math.round((minimum.gpuScore + recommended.gpuScore) / 2)
        : undefined,
      ram: typeof minimum.ram === 'number' && typeof recommended.ram === 'number'
        ? Math.round((minimum.ram + recommended.ram) / 2)
        : undefined,
      storage: typeof minimum.storage === 'number' && typeof recommended.storage === 'number'
        ? Math.round((minimum.storage + recommended.storage) / 2)
        : undefined,
      requiresSSD: recommended.requiresSSD || minimum.requiresSSD || false
    };
  }

  static checkGameCompatibility(gameId, systemInfo) {
    // Kick off lazy DB load on first sync use. Until it resolves, the call
    // below will just hit the empty database and fall through to the
    // hardware-score estimate path (the same path used for unknown games).
    if (!this.isDatabaseLoaded) {
      this.prefetchDatabase();
    }
    const resolvedGame = this.resolveGameRequirements(gameId);
    const requirements = resolvedGame?.requirements;
    const displayName = gameId && typeof gameId === 'object'
      ? gameId.name || gameId.title || requirements?.name || 'Unknown Game'
      : requirements?.name || String(gameId || 'Unknown Game');
    const lookupKey = resolvedGame?.id || this.getLookupKey(gameId);
    const scores = HardwareScoring.getOverallScore(systemInfo);
    const gameObj = gameId && typeof gameId === 'object' ? gameId : { name: displayName };
    
    if (!requirements) {
      const heuristicReqs = GameRequirementsHeuristics.estimateRequirements(gameObj);
      const mediumReqs = this.interpolateRequirements(heuristicReqs.minimum, heuristicReqs.recommended);
      const meetsMinimum = this.meetsRequirements(heuristicReqs.minimum, scores, systemInfo);
      const meetsMedium = mediumReqs ? this.meetsRequirements(mediumReqs, scores, systemInfo) : { passes: false };
      const meetsRecommended = this.meetsRequirements(heuristicReqs.recommended, scores, systemInfo);
      const meetsUltra = this.meetsRequirements(heuristicReqs.ultra, scores, systemInfo);

      let settingsLevel = 'cannot_run';
      if (meetsMinimum.passes) settingsLevel = 'low';
      if (meetsMedium.passes) settingsLevel = 'medium';
      if (meetsRecommended.passes) settingsLevel = 'high';
      if (meetsUltra.passes) settingsLevel = 'ultra';

      const bottlenecks = this.detectBottlenecks(heuristicReqs, scores, systemInfo, settingsLevel);
      const estimatedFPS = this.estimateFPS(settingsLevel, scores.overall);

      return {
        compatible: meetsMinimum.passes,
        settingsLevel,
        bottlenecks,
        estimatedFPS,
        canRun: meetsMinimum.passes,
        gameName: displayName,
        requirements: heuristicReqs,
        isEstimate: true,
        matchType: heuristicReqs.source || 'estimate',
        lookupKey
      };
    }
    
    const mediumReqs = this.interpolateRequirements(requirements.minimum, requirements.recommended);
    const meetsMinimum = this.meetsRequirements(requirements.minimum, scores, systemInfo);
    const meetsMedium = mediumReqs ? this.meetsRequirements(mediumReqs, scores, systemInfo) : { passes: false };
    const meetsRecommended = this.meetsRequirements(requirements.recommended, scores, systemInfo);
    const meetsUltra = this.meetsRequirements(requirements.ultra, scores, systemInfo);
    
    let settingsLevel = 'cannot_run';
    if (meetsMinimum.passes) settingsLevel = 'low';
    if (meetsMedium.passes) settingsLevel = 'medium';
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
    
    if (!reqLevel || typeof reqLevel !== 'object') {
      return { passes: false, issues: [{ component: 'Requirements', required: 'Valid requirements object', actual: 'Missing or invalid' }] };
    }
    
    if (!scores || typeof scores !== 'object') {
      return { passes: false, issues: [{ component: 'Scores', required: 'Valid scores object', actual: 'Missing or invalid' }] };
    }
    
    if (!systemInfo || typeof systemInfo !== 'object') {
      return { passes: false, issues: [{ component: 'System Info', required: 'Valid system info object', actual: 'Missing or invalid' }] };
    }
    
    if (typeof scores.cpu === 'number' && typeof reqLevel.cpuScore === 'number' && scores.cpu < reqLevel.cpuScore) {
      issues.push({ component: 'CPU', required: reqLevel.cpuScore, actual: scores.cpu });
    }
    
    if (typeof scores.gpu === 'number' && typeof reqLevel.gpuScore === 'number' && scores.gpu < reqLevel.gpuScore) {
      issues.push({ component: 'GPU', required: reqLevel.gpuScore, actual: scores.gpu });
    }
    
    if (systemInfo.ram && typeof systemInfo.ram.total === 'number' && typeof reqLevel.ram === 'number' && systemInfo.ram.total < reqLevel.ram) {
      issues.push({ component: 'RAM', required: reqLevel.ram, actual: systemInfo.ram.total });
    }
    
    if (reqLevel.requiresSSD) {
      const storageDevices = Array.isArray(systemInfo.storage) ? systemInfo.storage : [];
      const hasNVMe = storageDevices.some(d => d && d.isNVMe);
      const hasSSD = storageDevices.some(d => d && d.isSSD);
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
    
    if (!requirements || typeof requirements !== 'object' || !scores || typeof scores !== 'object' || !systemInfo || typeof systemInfo !== 'object') {
      return bottlenecks;
    }
    
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
    
    if (!nextLevel || !targetLabel) {
      return bottlenecks;
    }
    
    const cpuGap = typeof nextLevel.cpuScore === 'number' && typeof scores.cpu === 'number' ? nextLevel.cpuScore - scores.cpu : 0;
    const gpuGap = typeof nextLevel.gpuScore === 'number' && typeof scores.gpu === 'number' ? nextLevel.gpuScore - scores.gpu : 0;
    const ramGap = typeof nextLevel.ram === 'number' && systemInfo.ram && typeof systemInfo.ram.total === 'number' ? nextLevel.ram - systemInfo.ram.total : 0;
    const storageDevices = Array.isArray(systemInfo.storage) ? systemInfo.storage : [];
    const hasNVMe = storageDevices.some(d => d && d.isNVMe);
    const hasSSD = storageDevices.some(d => d && d.isSSD);
    
    if (cpuGap > 5) {
      bottlenecks.push({
        component: 'CPU',
        impact: cpuGap > 20 ? 'high' : cpuGap > 10 ? 'medium' : 'low',
        message: `CPU is ${cpuGap} points below ${targetLabel} settings`,
        scoreGap: cpuGap
      });
    }

    if (gpuGap > 5) {
      bottlenecks.push({
        component: 'GPU',
        impact: gpuGap > 20 ? 'high' : gpuGap > 10 ? 'medium' : 'low',
        message: `GPU is ${gpuGap} points below ${targetLabel} settings`,
        scoreGap: gpuGap
      });
    }

    if (ramGap > 2) {
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
    
    bottlenecks.sort((a, b) => {
      const impactOrder = { high: 3, medium: 2, low: 1 };
      const aImpact = impactOrder[a.impact] || 0;
      const bImpact = impactOrder[b.impact] || 0;
      return bImpact - aImpact;
    });
    
    return bottlenecks;
  }
  
  static estimateFPS(settingsLevel, overallScore) {
    if (settingsLevel === 'cannot_run') return '< 30';
    if (settingsLevel === 'low') return '30-45';
    if (settingsLevel === 'medium') {
      if (overallScore >= 70) return '50-60';
      return '40-50';
    }
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
      'medium': { text: 'Medium', description: 'Balanced settings', color: '#8ab4f8', emoji: '✨' },
      'low': { text: 'Low', description: 'Low settings', color: '#2196f3', emoji: '👍' },
      'cannot_run': { text: 'Below Minimum', description: 'Below minimum requirements', color: '#f44336', emoji: '⛔' },
      'unknown': { text: 'Unknown', description: 'No data available', color: '#9e9e9e', emoji: '❓' }
    };
    return labels[settingsLevel] || labels.unknown;
  }
}
