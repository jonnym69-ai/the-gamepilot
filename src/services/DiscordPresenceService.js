import { getElectronAPI, isElectronRuntime } from './ElectronBridge';
import StorageService from './StorageService';

const STORAGE_KEY = 'discordRichPresenceEnabled';

class DiscordPresenceService {
  static isEnabled() {
    return StorageService.get(STORAGE_KEY, false);
  }

  static setEnabled(enabled) {
    StorageService.set(STORAGE_KEY, Boolean(enabled));
    if (!enabled) {
      this.disconnect();
    }
    return Boolean(enabled);
  }

  static isAvailable() {
    return isElectronRuntime();
  }

  static startGamePresence(game) {
    if (!this.isEnabled() || !this.isAvailable()) return;
    const api = getElectronAPI();
    if (api?.discordStartGamePresence) {
      api.discordStartGamePresence(game).catch(() => {});
    }
  }

  static stopGamePresence() {
    if (!this.isEnabled() || !this.isAvailable()) return;
    const api = getElectronAPI();
    if (api?.discordStopGamePresence) {
      api.discordStopGamePresence().catch(() => {});
    }
  }

  static setIdlePresence() {
    if (!this.isEnabled() || !this.isAvailable()) return;
    const api = getElectronAPI();
    if (api?.discordSetIdlePresence) {
      api.discordSetIdlePresence().catch(() => {});
    }
  }

  static disconnect() {
    if (!this.isAvailable()) return;
    const api = getElectronAPI();
    if (api?.discordDisconnect) {
      api.discordDisconnect().catch(() => {});
    }
  }
}

export default DiscordPresenceService;
