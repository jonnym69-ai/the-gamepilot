// GameProcessMonitor.js - Monitors active game processes and tracks playtime
import { getElectronAPI } from './services/ElectronBridge';

export class GameProcessMonitor {
  static activeMonitors = new Map();

  static getElectronAPI() {
    return getElectronAPI();
  }

  static matchesMonitorPayload(game, monitorId, payload) {
    const meta = typeof payload === 'string'
      ? { gameName: payload }
      : (payload || {});
    const monitorMatch = meta.monitorId && meta.monitorId === monitorId;
    const nameMatch = meta.gameName === game.name;
    const appMatch = typeof game.appid !== 'undefined'
      && typeof meta.appid !== 'undefined'
      && String(meta.appid) === String(game.appid);

    return {
      matches: monitorMatch || nameMatch || appMatch,
      meta
    };
  }

  static cleanupMonitor(monitorId, stopNative = true) {
    if (!this.activeMonitors.has(monitorId)) {
      return;
    }

    try {
      const monitor = this.activeMonitors.get(monitorId);
      const electronAPI = monitor?.electronAPI || this.getElectronAPI();

      if (monitor) {
        if (typeof monitor.unsubscribeGameStarted === 'function') {
          monitor.unsubscribeGameStarted();
        }
        if (typeof monitor.unsubscribeGameClosed === 'function') {
          monitor.unsubscribeGameClosed();
        }
        if (typeof monitor.unsubscribeMonitorTimeout === 'function') {
          monitor.unsubscribeMonitorTimeout();
        }

        if (stopNative && electronAPI && typeof electronAPI.stopGameMonitor === 'function') {
          electronAPI.stopGameMonitor({ monitorId }).catch((error) => {
            console.warn(`⚠️ Failed to stop native process monitor for ${monitor.game.name}:`, error);
          });
        }
      }

      this.activeMonitors.delete(monitorId);
      console.log(`📊 Stopped monitoring: ${monitor.game.name}`);
    } catch (error) {
      console.error('Error stopping game process monitor:', error);
    }
  }

  // Start monitoring a game process
  static startMonitoring(game, callbacks = {}) {
    console.log(`[GameProcessMonitor] Starting monitoring for: ${game.name} (${game.platform})`);
    const electronAPI = this.getElectronAPI();
    if (!electronAPI) {
      console.warn('[GameProcessMonitor] Electron IPC not available for process monitoring');
      return null;
    }

    const callbackConfig = typeof callbacks === 'function'
      ? { onGameClosed: callbacks }
      : (callbacks || {});
    const onGameStarted = typeof callbackConfig.onGameStarted === 'function'
      ? callbackConfig.onGameStarted
      : () => {};
    const onGameClosed = typeof callbackConfig.onGameClosed === 'function'
      ? callbackConfig.onGameClosed
      : () => {};
    const onMonitorTimeout = typeof callbackConfig.onMonitorTimeout === 'function'
      ? callbackConfig.onMonitorTimeout
      : () => {};

    try {
      const monitorId = `${game.name}-${game.platform}-${Date.now()}`;

      const handleGameStarted = (event, payload) => {
        console.log(`[GameProcessMonitor] Game start event received for ${game.name}, payload:`, payload);
        const { matches, meta } = this.matchesMonitorPayload(game, monitorId, payload);
        if (!matches) {
          console.log(`[GameProcessMonitor] Game start payload doesn't match monitor ${monitorId} for ${game.name}`);
          return;
        }

        console.log(`🎮 Game started detected: ${game.name}`);
        onGameStarted(game, meta);
      };

      const handleGameClosed = (event, payload) => {
        console.log(`[GameProcessMonitor] Game close event received for ${game.name}, payload:`, payload);
        const { matches, meta } = this.matchesMonitorPayload(game, monitorId, payload);
        if (!matches) {
          console.log(`[GameProcessMonitor] Game close payload doesn't match monitor ${monitorId} for ${game.name}`);
          return;
        }

        console.log(`🎮 Game closed detected: ${game.name}${meta.reason ? ` (${meta.reason})` : ''}`);
        onGameClosed(game, meta);
        this.cleanupMonitor(monitorId, false);
      };

      const handleMonitorTimeout = (event, payload) => {
        const { matches, meta } = this.matchesMonitorPayload(game, monitorId, payload);
        if (!matches) {
          return;
        }

        console.warn(`⚠️ Native process monitor timed out for ${game.name}${meta.reason ? ` (${meta.reason})` : ''}`);
        onMonitorTimeout(game, meta);
        this.cleanupMonitor(monitorId, false);
      };

      const unsubscribeGameStarted = electronAPI.onGameStarted?.((payload) => {
        handleGameStarted(null, payload);
      });
      const unsubscribeGameClosed = electronAPI.onGameClosed?.((payload) => {
        handleGameClosed(null, payload);
      });
      const unsubscribeMonitorTimeout = electronAPI.onGameMonitorTimeout?.((payload) => {
        handleMonitorTimeout(null, payload);
      });

      this.activeMonitors.set(monitorId, {
        game,
        electronAPI,
        unsubscribeGameStarted,
        unsubscribeGameClosed,
        unsubscribeMonitorTimeout
      });

      electronAPI.startGameMonitor({ monitorId, game }).then((result) => {
        console.log(`[GameProcessMonitor] Native monitor start result for ${game.name}:`, result);
        if (!result?.success) {
          console.warn(`⚠️ Failed to start native process monitor for ${game.name}:`, result?.message || 'Unknown error');
          this.cleanupMonitor(monitorId, false);
        } else {
          console.log(`[GameProcessMonitor] ✅ Native monitor started successfully for ${game.name}, monitorId: ${monitorId}`);
        }
      }).catch((error) => {
        console.warn(`⚠️ Error starting native process monitor for ${game.name}:`, error);
        this.cleanupMonitor(monitorId, false);
      });

      console.log(`📊 Started monitoring: ${game.name}`);
      return monitorId;
    } catch (error) {
      console.error('Error starting game process monitor:', error);
    }
  }

  // Stop monitoring a specific game
  static stopMonitoring(monitorId) {
    this.cleanupMonitor(monitorId, true);
  }

  static stopMonitoringByGame(gameName) {
    Array.from(this.activeMonitors.entries()).forEach(([monitorId, monitor]) => {
      if (monitor?.game?.name === gameName) {
        this.cleanupMonitor(monitorId, true);
      }
    });
  }

  // Stop all monitors
  static stopAllMonitors() {
    for (const monitorId of Array.from(this.activeMonitors.keys())) {
      this.stopMonitoring(monitorId);
    }
  }

  // Get active monitors count
  static getActiveMonitorCount() {
    return this.activeMonitors.size;
  }
}
