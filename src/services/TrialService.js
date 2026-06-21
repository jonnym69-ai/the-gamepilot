import StorageService from './StorageService';

const TRIAL_STORAGE_KEY = 'gamepilot-trials';

const TRIAL_CONFIG = {
  power_tools: { maxUses: 3, durationHours: 24 },
  advanced_theme_builder: { maxUses: 1, durationHours: 24 },
  widget_pack: { maxUses: 3, durationHours: 24 },
  layout_pack: { maxUses: 2, durationHours: 24 },
  premium_theme_pack: { maxUses: 2, durationHours: 24 }
};

class TrialService {
  static getTrials() {
    return StorageService.get(TRIAL_STORAGE_KEY, {});
  }

  static saveTrials(trials) {
    StorageService.set(TRIAL_STORAGE_KEY, trials);
  }

  static getTrialState(productId) {
    const trials = this.getTrials();
    const trial = trials[productId];
    if (!trial) return { active: false, usesLeft: 0, expired: true };

    const now = Date.now();
    const expiry = trial.startedAt + (TRIAL_CONFIG[productId]?.durationHours || 24) * 3600000;
    const expired = now > expiry;
    const usesLeft = Math.max(0, (TRIAL_CONFIG[productId]?.maxUses || 3) - (trial.uses || 0));

    return { active: !expired && usesLeft > 0, usesLeft, expired, totalUses: trial.uses || 0 };
  }

  static isTrialActive(productId) {
    return this.getTrialState(productId).active;
  }

  static startTrial(productId) {
    const trials = this.getTrials();
    const config = TRIAL_CONFIG[productId];
    if (!config) return { success: false, message: 'No trial available for this feature.' };

    const existing = trials[productId];
    if (existing) {
      const state = this.getTrialState(productId);
      if (state.active) {
        return { success: true, message: `Trial active — ${state.usesLeft} uses remaining.`, usesLeft: state.usesLeft };
      }
    }

    trials[productId] = { startedAt: Date.now(), uses: 0 };
    this.saveTrials(trials);
    return { success: true, message: `Trial started! ${config.maxUses} uses within ${config.durationHours} hours.`, usesLeft: config.maxUses };
  }

  static recordTrialUse(productId) {
    if (!this.isTrialActive(productId)) return { success: false };
    const trials = this.getTrials();
    if (trials[productId]) {
      trials[productId].uses = (trials[productId].uses || 0) + 1;
      this.saveTrials(trials);
    }
    const state = this.getTrialState(productId);
    return { success: true, usesLeft: state.usesLeft };
  }

  static getTrialHint(productId) {
    const state = this.getTrialState(productId);
    if (!state.active) return null;
    return state.usesLeft === 1
      ? '1 trial use left'
      : `${state.usesLeft} trial uses left`;
  }
}

export default TrialService;
