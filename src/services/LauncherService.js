import { getElectronAPI, waitForElectronAPI } from './ElectronBridge';

export class LauncherService {
  static async launchGame(game) {
    const electronAPI = process.env.NODE_ENV === 'production'
      ? await waitForElectronAPI()
      : getElectronAPI();
    if (!electronAPI || typeof electronAPI.launchGame !== 'function') {
      console.error('Electron APIs not available for game launch, retrying...');
      // Retry after a short delay in production mode
      if (process.env.NODE_ENV === 'production') {
        const retryAPI = await waitForElectronAPI({ retries: 4, delayMs: 500 });
        if (retryAPI && typeof retryAPI.launchGame === 'function') {
          console.log('✅ Electron API available after retry for game launch.');
          const result = await retryAPI.launchGame(game);
          return result || { success: false, message: 'Unknown launch response after retry' };
        } else {
          console.error('❌ Electron API still not available after retry for game launch.');
          throw new Error('Electron APIs not available after retry - please restart the app');
        }
      } else {
        throw new Error('Electron APIs not available - please restart the app');
      }
    }

    const result = await electronAPI.launchGame(game);
    return result || { success: false, message: 'Unknown launch response' };
  }
}
