/**
 * Thin renderer-side wrapper over the auto-update IPC bridge.
 *
 * Every call degrades gracefully when `window.electronAPI` is absent (plain
 * browser dev-server, Jest) or when the main process runs unpackaged — the
 * updater module responds `{ ok: false, reason: 'dev' }` there.
 */

const getApi = () => (typeof window !== 'undefined' ? window.electronAPI : null);

const safeInvoke = async (fn, fallback) => {
  try {
    return await fn();
  } catch (error) {
    return { ...fallback, ok: false, status: 'error', error: String(error?.message || error) };
  }
};

const UpdateService = {
  isSupported() {
    return Boolean(getApi()?.updaterCheck);
  },

  async check() {
    const api = getApi();
    if (!api?.updaterCheck) return { ok: false, reason: 'unavailable', status: 'idle' };
    return safeInvoke(() => api.updaterCheck(), { status: 'idle' });
  },

  async download() {
    const api = getApi();
    if (!api?.updaterDownload) return { ok: false, reason: 'unavailable', status: 'idle' };
    return safeInvoke(() => api.updaterDownload(), { status: 'idle' });
  },

  async install() {
    const api = getApi();
    if (!api?.updaterInstall) return { ok: false, reason: 'unavailable' };
    return safeInvoke(() => api.updaterInstall(), {});
  },

  async getState() {
    const api = getApi();
    if (!api?.updaterGetState) {
      return { ok: false, reason: 'unavailable', status: 'idle', version: null, percent: null, error: null };
    }
    return safeInvoke(() => api.updaterGetState(), {
      status: 'idle',
      version: null,
      percent: null,
      error: null,
    });
  },

  /**
   * Subscribe to pushed updater state ({ status, version, percent, error }).
   * Returns an unsubscribe function; a no-op when the bridge is absent.
   */
  onStatus(callback) {
    const api = getApi();
    if (!api?.onUpdaterStatus || typeof callback !== 'function') return () => {};
    return api.onUpdaterStatus(callback) || (() => {});
  },
};

export default UpdateService;
