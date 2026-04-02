// BackgroundScanner.js - Performs library scanning in background without blocking UI
export class BackgroundScanner {
  static scannerWorker = null;
  static isScanning = false;
  static scanProgress = 0;
  static onProgressCallback = null;
  static onCompleteCallback = null;

  // Initialize background scanner
  static initialize() {
    if (typeof Worker !== 'undefined') {
      try {
        // Create a simple worker for background scanning
        const workerCode = `
          self.onmessage = function(e) {
            const { type, data } = e.data;
            
            if (type === 'scan') {
              // Simulate scanning with progress updates
              const platforms = Array.isArray(data.platforms) ? data.platforms : [];
              let totalGames = 0;
              
              platforms.forEach((platform, index) => {
                if (!platform || typeof platform !== 'string') return;
                
                // Simulate platform scan
                const progress = Math.round((index / platforms.length) * 100);
                self.postMessage({
                  type: 'progress',
                  progress: progress,
                  platform: platform
                });
                
                // Simulate finding games
                totalGames += Math.floor(Math.random() * 20);
              });
              
              self.postMessage({
                type: 'complete',
                totalGames: totalGames
              });
            }
          };
        `;
        
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        this.scannerWorker = new Worker(workerUrl);
        
        this.scannerWorker.onmessage = (e) => {
          if (!e || !e.data) return;
          const { type, progress, platform, totalGames } = e.data;
          
          if (type === 'progress') {
            this.scanProgress = typeof progress === 'number' ? progress : 0;
            if (typeof this.onProgressCallback === 'function') {
              this.onProgressCallback({ progress: this.scanProgress, platform: platform || 'unknown' });
            }
          } else if (type === 'complete') {
            this.isScanning = false;
            if (typeof this.onCompleteCallback === 'function') {
              this.onCompleteCallback({ totalGames: typeof totalGames === 'number' ? totalGames : 0 });
            }
          }
        };
        
        return true;
      } catch (error) {
        console.warn('Web Workers not available, using main thread scanning');
        return false;
      }
    }
    return false;
  }

  // Start background scan
  static startScan(platforms = [], onProgress = null, onComplete = null) {
    if (this.isScanning) {
      console.warn('Scan already in progress');
      return;
    }

    const safePlatforms = Array.isArray(platforms) ? platforms : [];
    this.onProgressCallback = typeof onProgress === 'function' ? onProgress : null;
    this.onCompleteCallback = typeof onComplete === 'function' ? onComplete : null;
    this.isScanning = true;
    this.scanProgress = 0;

    if (this.scannerWorker) {
      this.scannerWorker.postMessage({
        type: 'scan',
        data: { platforms: safePlatforms }
      });
    } else {
      // Fallback to main thread with throttling
      this.mainThreadScan(safePlatforms);
    }
  }

  // Main thread scanning with throttling to avoid UI blocking
  static mainThreadScan(platforms) {
    const safePlatforms = Array.isArray(platforms) ? platforms : [];
    let index = 0;

    const scanNext = () => {
      if (index >= safePlatforms.length) {
        this.isScanning = false;
        if (typeof this.onCompleteCallback === 'function') {
          this.onCompleteCallback({ totalGames: 0 });
        }
        return;
      }

      const platform = safePlatforms[index] || 'unknown';
      const progress = Math.round((index / safePlatforms.length) * 100);

      if (typeof this.onProgressCallback === 'function') {
        this.onProgressCallback({ progress, platform });
      }

      index++;

      // Throttle with requestIdleCallback or setTimeout
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => scanNext(), { timeout: 1000 });
      } else {
        setTimeout(scanNext, 100);
      }
    };

    scanNext();
  }

  // Stop scanning
  static stopScan() {
    this.isScanning = false;
    if (this.scannerWorker) {
      this.scannerWorker.terminate();
      this.scannerWorker = null;
    }
  }

  // Get current progress
  static getProgress() {
    return {
      isScanning: this.isScanning,
      progress: this.scanProgress
    };
  }
}
