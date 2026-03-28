// OfflineManager.js - Manages offline/online state and data synchronization
export class OfflineManager {
  static isOnline = navigator.onLine;
  static listeners = new Set();
  static syncQueue = [];

  static init() {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Set initial state
    this.isOnline = navigator.onLine;
    this.notifyListeners();
  }

  static onStatusChange(callback) {
    this.listeners.add(callback);
    // Immediately call with current status
    callback(this.isOnline);
    return () => this.listeners.delete(callback);
  }

  static handleOnline() {
    console.log('🔗 Connection restored - syncing data...');
    this.isOnline = true;
    this.notifyListeners();
    this.syncPendingOperations();
  }

  static handleOffline() {
    console.log('📴 Connection lost - switching to offline mode');
    this.isOnline = false;
    this.notifyListeners();
  }

  static notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.isOnline);
      } catch (error) {
        console.error('Error in offline status listener:', error);
      }
    });
  }

  static queueOperation(operation) {
    if (this.isOnline) {
      // Execute immediately if online
      return this.executeOperation(operation);
    } else {
      // Queue for later if offline
      this.syncQueue.push({
        ...operation,
        timestamp: Date.now(),
        id: Math.random().toString(36).substr(2, 9)
      });
      console.log('📋 Operation queued for when connection is restored:', operation.type);
      return Promise.resolve({ queued: true, id: this.syncQueue[this.syncQueue.length - 1].id });
    }
  }

  static async executeOperation(operation) {
    try {
      switch (operation.type) {
        case 'updateGamePrice':
          return await this.updateGamePrice(operation.data);
        case 'fetchSteamData':
          return await this.fetchSteamData(operation.data);
        case 'syncAchievements':
          return await this.syncAchievements(operation.data);
        default:
          console.warn('Unknown operation type:', operation.type);
          return { success: false, error: 'Unknown operation type' };
      }
    } catch (error) {
      console.error('Error executing operation:', error);
      return { success: false, error: error.message };
    }
  }

  static async updateGamePrice({ appid, priceData }) {
    // This would normally call Steam API
    if (!this.isOnline) {
      throw new Error('Cannot update price while offline');
    }

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 100));

      const storedPrices = JSON.parse(localStorage.getItem('gamePrices') || '{}');
      storedPrices[appid] = {
        price: priceData.final_formatted,
        priceNumeric: priceData.final / 100,
        lastUpdate: new Date().toISOString()
      };
      localStorage.setItem('gamePrices', JSON.stringify(storedPrices));

      return { success: true, data: storedPrices[appid] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async fetchSteamData({ userId }) {
    if (!this.isOnline) {
      throw new Error('Cannot fetch Steam data while offline');
    }

    // This would normally call Steam API
    console.log('Fetching Steam data for user:', userId);
    return { success: true, data: {} };
  }

  static async syncAchievements({ achievements }) {
    if (!this.isOnline) {
      throw new Error('Cannot sync achievements while offline');
    }

    // This would normally sync with a backend
    console.log('Syncing achievements:', achievements);
    return { success: true };
  }

  static async syncPendingOperations() {
    if (this.syncQueue.length === 0) {
      console.log('📋 No pending operations to sync');
      return;
    }

    console.log(`📋 Syncing ${this.syncQueue.length} pending operations...`);

    const results = [];
    const remainingQueue = [];

    for (const operation of this.syncQueue) {
      try {
        const result = await this.executeOperation(operation);
        results.push({ ...result, operationId: operation.id });
      } catch (error) {
        console.error('Failed to sync operation:', operation, error);
        // Keep failed operations in queue for retry
        remainingQueue.push(operation);
      }
    }

    this.syncQueue = remainingQueue;

    if (results.length > 0) {
      console.log('✅ Sync completed:', results);
    }

    return results;
  }

  static getSyncStatus() {
    return {
      isOnline: this.isOnline,
      queuedOperations: this.syncQueue.length,
      operations: this.syncQueue.map(op => ({
        type: op.type,
        timestamp: op.timestamp,
        id: op.id
      }))
    };
  }

  static clearSyncQueue() {
    const cleared = this.syncQueue.length;
    this.syncQueue = [];
    console.log(`🗑️ Cleared ${cleared} queued operations`);
    return cleared;
  }
}

// Initialize offline manager
OfflineManager.init();
