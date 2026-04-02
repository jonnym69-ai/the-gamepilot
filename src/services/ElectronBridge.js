const getElectronAPI = () => {
  if (typeof window === 'undefined') {
    console.warn('Electron API not available: window object is undefined.');
    return null;
  }

  if (!window.electronAPI) {
    console.warn('Electron API not available: window.electronAPI is not defined.');
  }
  return window.electronAPI || null;
};

const waitForElectronAPI = async ({ retries = 10, delayMs = 250 } = {}) => {
  const immediateApi = getElectronAPI();
  if (immediateApi) {
    return immediateApi;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    const retryApi = getElectronAPI();
    if (retryApi) {
      console.log(`✅ Electron API became available after ${attempt} retry attempt(s).`);
      return retryApi;
    }
  }

  console.warn('❌ Electron API still not available after waiting.');
  return null;
};

const isElectronRuntime = () => Boolean(getElectronAPI());

const openExternalUrl = async (url) => {
  const electronAPI = await waitForElectronAPI();

  if (electronAPI && typeof electronAPI.openExternal === 'function') {
    return electronAPI.openExternal(url);
  }

  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
};

export {
  getElectronAPI,
  waitForElectronAPI,
  isElectronRuntime,
  openExternalUrl
};
