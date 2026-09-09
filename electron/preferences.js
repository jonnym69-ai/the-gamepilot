const { app } = require('electron');
const fs = require('fs');
const path = require('path');

const APP_PREFERENCES_FILE = 'preferences.json';

const isStartupLaunchSupported = () => process.platform === 'win32';

const getPreferencesFilePath = () => path.join(app.getPath('userData'), APP_PREFERENCES_FILE);

const readAppPreferences = () => {
  try {
    const preferencesPath = getPreferencesFilePath();
    if (!fs.existsSync(preferencesPath)) {
      return {};
    }

    const rawPreferences = fs.readFileSync(preferencesPath, 'utf8');
    const parsedPreferences = JSON.parse(rawPreferences);
    return parsedPreferences && typeof parsedPreferences === 'object' ? parsedPreferences : {};
  } catch (error) {
    console.error('❌ Failed to read app preferences:', error);
    return {};
  }
};

const writeAppPreferences = (preferences = {}) => {
  try {
    const preferencesPath = getPreferencesFilePath();
    fs.writeFileSync(preferencesPath, JSON.stringify(preferences, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('❌ Failed to write app preferences:', error);
    return false;
  }
};

const getStartupLaunchPreference = () => Boolean(readAppPreferences().launchOnStartup);

const applyStartupLaunchPreference = (enabled) => {
  if (!isStartupLaunchSupported()) {
    return {
      success: false,
      supported: false,
      enabled: false,
    };
  }

  try {
    app.setLoginItemSettings({
      openAtLogin: Boolean(enabled),
      openAsHidden: false,
    });

    const loginItemSettings = app.getLoginItemSettings();

    return {
      success: true,
      supported: true,
      enabled: Boolean(loginItemSettings.openAtLogin),
    };
  } catch (error) {
    console.error('❌ Failed to apply startup launch preference:', error);
    return {
      success: false,
      supported: true,
      enabled: false,
      message: error.message,
    };
  }
};

const getStartupLaunchSettings = () => {
  if (!isStartupLaunchSupported()) {
    return {
      supported: false,
      enabled: false,
      persisted: false,
      isPackaged: app.isPackaged,
    };
  }

  const storedEnabled = getStartupLaunchPreference();
  const loginItemSettings = app.getLoginItemSettings();

  return {
    supported: true,
    enabled: Boolean(loginItemSettings.openAtLogin),
    persisted: storedEnabled,
    isPackaged: app.isPackaged,
  };
};

function registerIpcHandlers(ipcMain) {
  ipcMain.handle('get-startup-launch-settings', async () => getStartupLaunchSettings());

  ipcMain.handle('set-startup-launch-enabled', async (_event, enabled) => {
    if (!isStartupLaunchSupported()) {
      return {
        success: false,
        supported: false,
        enabled: false,
        persisted: false,
        isPackaged: app.isPackaged,
      };
    }

    const nextEnabled = Boolean(enabled);
    const applyResult = applyStartupLaunchPreference(nextEnabled);
    if (!applyResult.success) {
      return {
        ...applyResult,
        persisted: getStartupLaunchPreference(),
        isPackaged: app.isPackaged,
      };
    }

    const preferences = readAppPreferences();
    const writeSucceeded = writeAppPreferences({
      ...preferences,
      launchOnStartup: applyResult.enabled,
    });

    return {
      success: writeSucceeded,
      supported: true,
      enabled: applyResult.enabled,
      persisted: applyResult.enabled,
      isPackaged: app.isPackaged,
      message: writeSucceeded ? null : 'Unable to persist startup preference',
    };
  });
}

module.exports = {
  APP_PREFERENCES_FILE,
  isStartupLaunchSupported,
  readAppPreferences,
  writeAppPreferences,
  getStartupLaunchPreference,
  applyStartupLaunchPreference,
  getStartupLaunchSettings,
  registerIpcHandlers,
};
