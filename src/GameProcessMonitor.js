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
          electronAPI.stopGameMonitor({ monitorId }).catch(() => {
            // Failed to stop native monitor
          });
        }
      }

      this.activeMonitors.delete(monitorId);
    } catch (error) {
      // Error stopping game process monitor
    }
  }

  // Start monitoring a game process
  static startMonitoring(game, callbacks = {}) {
    const electronAPI = this.getElectronAPI();
    if (!electronAPI) {
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
        const { matches, meta } = this.matchesMonitorPayload(game, monitorId, payload);
        if (!matches) {
          return;
        }

        onGameStarted(game, meta);
      };

      const handleGameClosed = (event, payload) => {
        const { matches, meta } = this.matchesMonitorPayload(game, monitorId, payload);
        if (!matches) {
          return;
        }

        onGameClosed(game, meta);
        this.cleanupMonitor(monitorId, false);
      };

      const handleMonitorTimeout = (event, payload) => {
        const { matches, meta } = this.matchesMonitorPayload(game, monitorId, payload);
        if (!matches) {
          return;
        }

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
        if (!result?.success) {
          this.cleanupMonitor(monitorId, false);
        }
      }).catch(() => {
        this.cleanupMonitor(monitorId, false);
      });

      return monitorId;
    } catch (error) {
      // Error starting game process monitor
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
