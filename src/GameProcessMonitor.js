// GameProcessMonitor.js - Monitors active game processes and tracks playtime
export class GameProcessMonitor {
  static activeMonitors = new Map();

  static getElectronIpc() {
    if (!window.require) {
      return null;
    }

    try {
      const { ipcRenderer } = window.require('electron');
      return ipcRenderer || null;
    } catch (error) {
      console.warn('IPC unavailable for game monitoring:', error);
      return null;
    }
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
      const ipcRenderer = monitor?.ipcRenderer || this.getElectronIpc();

      if (ipcRenderer && monitor) {
        ipcRenderer.removeListener('game-started', monitor.handleGameStarted);
        ipcRenderer.removeListener('game-closed', monitor.handleGameClosed);
        ipcRenderer.removeListener('game-monitor-timeout', monitor.handleMonitorTimeout);

        if (stopNative) {
          ipcRenderer.invoke('stop-game-monitor', { monitorId }).catch((error) => {
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
    const ipcRenderer = this.getElectronIpc();
    if (!ipcRenderer) {
      console.warn('Electron IPC not available for process monitoring');
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

        console.log(`🎮 Game started detected: ${game.name}`);
        onGameStarted(game, meta);
      };

      const handleGameClosed = (event, payload) => {
        const { matches, meta } = this.matchesMonitorPayload(game, monitorId, payload);
        if (!matches) {
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

      ipcRenderer.on('game-started', handleGameStarted);
      ipcRenderer.on('game-closed', handleGameClosed);
      ipcRenderer.on('game-monitor-timeout', handleMonitorTimeout);

      this.activeMonitors.set(monitorId, {
        game,
        handleGameStarted,
        handleGameClosed,
        handleMonitorTimeout,
        ipcRenderer
      });

      ipcRenderer.invoke('start-game-monitor', { monitorId, game }).then((result) => {
        if (!result?.success) {
          console.warn(`⚠️ Failed to start native process monitor for ${game.name}:`, result?.message || 'Unknown error');
          this.cleanupMonitor(monitorId, false);
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
