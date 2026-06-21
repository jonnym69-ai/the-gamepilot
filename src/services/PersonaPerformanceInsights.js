import { HardwareDetector } from './HardwareDetector';
import { GameRequirements } from './GameRequirements';
import StorageService from './StorageService';

class PersonaPerformanceInsights {
  static compatibilityCache = new Map();
  static cachedSystemInfo = null;

  static getSystemSignature(info) {
    if (!info) {
      return 'unknown-system';
    }

    const storageSignature = Array.isArray(info.storage)
      ? info.storage.map((drive) => `${drive.name || drive.model || 'drive'}:${drive.type || 'unknown'}:${drive.isSSD ? 'ssd' : 'hdd'}:${drive.isNVMe ? 'nvme' : 'non-nvme'}`).join('|')
      : 'no-storage';

    return [
      info.cpu?.brand || info.cpu?.model || 'unknown-cpu',
      info.gpu?.model || 'unknown-gpu',
      info.ram?.total || 'unknown-ram',
      storageSignature,
      info.lastUpdated || 'no-timestamp'
    ].join('::');
  }

  static setSystemInfo(info) {
    const normalized = this.normalizeSystemInfo(info);
    const previousSignature = this.getSystemSignature(this.cachedSystemInfo);
    const nextSignature = this.getSystemSignature(normalized);

    this.cachedSystemInfo = normalized;
    if (previousSignature !== nextSignature) {
      this.compatibilityCache.clear();
    }

    return this.cachedSystemInfo;
  }

  static getSystemInfo() {
    let stored = null;
    try {
      stored = StorageService.getString('systemInfo');
    } catch (error) {
      console.warn('PersonaPerformanceInsights: unable to read cached system info', error);
    }

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const normalizedStored = this.normalizeSystemInfo(parsed);
        const cachedSignature = this.getSystemSignature(this.cachedSystemInfo);
        const storedSignature = this.getSystemSignature(normalizedStored);
        if (!this.cachedSystemInfo || cachedSignature !== storedSignature) {
          this.cachedSystemInfo = normalizedStored;
          this.compatibilityCache.clear();
        }
        return this.cachedSystemInfo;
      } catch (error) {
        console.warn('PersonaPerformanceInsights: failed to parse cached system info', error);
      }
    }

    if (this.cachedSystemInfo) {
      return this.cachedSystemInfo;
    }

    this.cachedSystemInfo = this.setSystemInfo(HardwareDetector.getDefaultSystemInfo());
    return this.cachedSystemInfo;
  }

  static normalizeSystemInfo(info) {
    const normalized = { ...info };
    if (!Array.isArray(normalized.storage)) {
      normalized.storage = normalized.storage ? [normalized.storage] : [];
    }
    return normalized;
  }

  static getCacheKey(game = {}) {
    return game.appid || game.app_id || game.steamAppId || game.id || game.slug || game.name || 'unknown';
  }

  static getCompatibility(game = {}, systemInfoOverride = null) {
    const systemInfo = systemInfoOverride
      ? this.setSystemInfo(systemInfoOverride)
      : this.getSystemInfo();
    if (!systemInfo) {
      return null;
    }

    const cacheKey = `${this.getCacheKey(game)}::${this.getSystemSignature(systemInfo)}`;
    if (this.compatibilityCache.has(cacheKey)) {
      return this.compatibilityCache.get(cacheKey);
    }

    const compatibility = GameRequirements.checkGameCompatibility(game, systemInfo);
    this.compatibilityCache.set(cacheKey, compatibility);
    return compatibility;
  }

  static getHardwareScoreBonus(compatibility) {
    if (!compatibility) {
      return 0;
    }

    switch (compatibility.settingsLevel) {
      case 'ultra':
        return 18;
      case 'high':
        return 12;
      case 'low':
        return 6;
      case 'cannot_run':
        return -25;
      default:
        return 0;
    }
  }

  static getHardwareConfidenceBoost(compatibility) {
    if (!compatibility) {
      return 0;
    }

    switch (compatibility.settingsLevel) {
      case 'ultra':
        return 15;
      case 'high':
        return 10;
      case 'low':
        return 4;
      case 'cannot_run':
        return -30;
      default:
        return 0;
    }
  }

  static getHardwareMatchContribution(compatibility) {
    if (!compatibility) {
      return 0;
    }

    switch (compatibility.settingsLevel) {
      case 'ultra':
        return 95;
      case 'high':
        return 80;
      case 'low':
        return 60;
      case 'cannot_run':
        return 10;
      default:
        return 50;
    }
  }

  static describeCompatibility(compatibility) {
    if (!compatibility) {
      return null;
    }

    const settingsLabel = GameRequirements.getSettingsLabel(compatibility.settingsLevel) || {};
    const emoji = settingsLabel.emoji || '🎮';
    const text = settingsLabel.text || compatibility.settingsLevel || 'Unknown';
    const fps = compatibility.estimatedFPS || 'Unknown FPS';
    const bottleneck = compatibility.bottlenecks && compatibility.bottlenecks[0];

    let reason = `${emoji} Estimated ${text} settings (~${fps} FPS)`;
    if (bottleneck) {
      reason += ` • ${bottleneck.component} is the limiting factor`;
    }

    return reason;
  }

  static estimateSessionMinutes(game = {}) {
    if (!game) return null;
    if (typeof game.estimated_session_minutes === 'number') {
      return Math.max(10, Math.round(game.estimated_session_minutes));
    }
    if (game.time_played && game.launch_count) {
      const avg = Math.max(10, Math.round(game.time_played / Math.max(game.launch_count, 1)));
      return avg;
    }
    if (game.time_played) {
      return Math.max(10, Math.round(game.time_played));
    }
    return null;
  }

  static extractGenres(game = {}, fallbackGenre = null) {
    const genreList = Array.isArray(game.genres) ? game.genres.slice() : [];
    if (fallbackGenre && !genreList.includes(fallbackGenre)) {
      genreList.push(fallbackGenre);
    }
    return genreList;
  }
}

export { PersonaPerformanceInsights };
