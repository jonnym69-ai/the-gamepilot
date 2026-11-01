/**
 * Auto-update IPC handlers backed by electron-updater (GitHub Releases).
 *
 * The update feed comes from the `publish` provider configured in
 * package.json (`build.publish` → app-update.yml in the packaged resources).
 * Downloads are user-initiated (`autoDownload = false`); installs happen via
 * an explicit "Restart to install" action or automatically on quit once an
 * update has been downloaded (`autoInstallOnAppQuit`).
 *
 * In unpackaged/dev runs the module is a no-op: handlers still respond so the
 * renderer can distinguish "no updater" from a failed check.
 */

const { app } = require('electron');
const fallbackLogger = require('../logger');

const CHECK_DELAY_MS = 15 * 1000;
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

const INITIAL_STATE = { status: 'idle', version: null, percent: null, error: null };

function registerIpcHandlers(ipcMain, deps) {
  const { getMainWindow } = deps;

  if (!app.isPackaged) {
    const devResult = { ok: false, reason: 'dev', status: 'idle' };
    ipcMain.handle('updater-check', async () => devResult);
    ipcMain.handle('updater-download', async () => devResult);
    ipcMain.handle('updater-install', async () => devResult);
    ipcMain.handle('updater-get-state', async () => ({ ok: false, reason: 'dev', ...INITIAL_STATE }));
    return;
  }

  const { autoUpdater } = require('electron-updater');
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = deps.logger || fallbackLogger;

  let state = { ...INITIAL_STATE };

  const setState = (patch) => {
    state = { ...state, ...patch };
    try {
      const mainWindow = getMainWindow?.();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('updater-status', state);
      }
    } catch {
      // Window may not exist yet (early startup check) — state is still
      // tracked and retrievable via updater-get-state.
    }
  };

  autoUpdater.on('checking-for-update', () => setState({ status: 'checking', error: null }));
  autoUpdater.on('update-available', (info) =>
    setState({ status: 'available', version: info?.version || null, error: null })
  );
  autoUpdater.on('update-not-available', (info) =>
    setState({ status: 'not-available', version: info?.version || state.version, percent: null, error: null })
  );
  autoUpdater.on('download-progress', (progress) =>
    setState({ status: 'downloading', percent: Math.max(0, Math.min(100, Math.round(progress?.percent ?? 0))) })
  );
  autoUpdater.on('update-downloaded', (info) =>
    setState({ status: 'downloaded', version: info?.version || state.version, percent: null, error: null })
  );
  autoUpdater.on('error', (error) =>
    setState({ status: 'error', percent: null, error: String(error?.message || error) })
  );

  const runCheck = () => {
    try {
      const result = autoUpdater.checkForUpdates();
      if (result?.catch) result.catch(() => {});
    } catch {
      // The 'error' event carries the detail; avoid unhandled rejections here.
    }
  };

  const initialTimer = setTimeout(runCheck, CHECK_DELAY_MS);
  const interval = setInterval(runCheck, CHECK_INTERVAL_MS);
  initialTimer.unref?.();
  interval.unref?.();

  ipcMain.handle('updater-check', async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return { ok: true, status: state.status, version: result?.updateInfo?.version || state.version };
    } catch (error) {
      setState({ status: 'error', error: String(error?.message || error) });
      return { ok: false, status: 'error', error: String(error?.message || error) };
    }
  });

  ipcMain.handle('updater-download', async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { ok: true, status: state.status, version: state.version };
    } catch (error) {
      setState({ status: 'error', error: String(error?.message || error) });
      return { ok: false, status: 'error', error: String(error?.message || error) };
    }
  });

  ipcMain.handle('updater-install', async () => {
    try {
      autoUpdater.quitAndInstall();
      return { ok: true };
    } catch (error) {
      return { ok: false, status: 'error', error: String(error?.message || error) };
    }
  });

  ipcMain.handle('updater-get-state', async () => ({ ok: true, ...state }));
}

module.exports = { registerIpcHandlers };
