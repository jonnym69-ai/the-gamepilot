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
              const platforms = data.platforms || [];
              let totalGames = 0;
              
              platforms.forEach((platform, index) => {
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
          const { type, progress, platform, totalGames } = e.data;
          
          if (type === 'progress') {
            this.scanProgress = progress;
            if (this.onProgressCallback) {
              this.onProgressCallback({ progress, platform });
            }
          } else if (type === 'complete') {
            this.isScanning = false;
            if (this.onCompleteCallback) {
              this.onCompleteCallback({ totalGames });
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

    this.onProgressCallback = onProgress;
    this.onCompleteCallback = onComplete;
    this.isScanning = true;
    this.scanProgress = 0;

    if (this.scannerWorker) {
      this.scannerWorker.postMessage({
        type: 'scan',
        data: { platforms }
      });
    } else {
      // Fallback to main thread with throttling
      this.mainThreadScan(platforms);
    }
  }

  // Main thread scanning with throttling to avoid UI blocking
  static mainThreadScan(platforms) {
    let index = 0;

    const scanNext = () => {
      if (index >= platforms.length) {
        this.isScanning = false;
        if (this.onCompleteCallback) {
          this.onCompleteCallback({ totalGames: 0 });
        }
        return;
      }

      const platform = platforms[index];
      const progress = Math.round((index / platforms.length) * 100);

      if (this.onProgressCallback) {
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
