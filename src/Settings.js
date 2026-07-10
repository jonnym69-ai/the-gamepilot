import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings as SettingsIcon, Palette, Bell, Database, Trash2, Save, AlertCircle, Heart, Keyboard, Eye, SlidersHorizontal, Archive } from 'lucide-react';
import InterfaceSettings from './components/InterfaceSettings';
import { useToast } from './components/Toast';
import { useTheme } from './ThemeContext';
import NavBar from './NavBar';
import { KeyboardShortcuts } from './KeyboardShortcuts';
import CollapsibleSection from './components/CollapsibleSection';
import { isElectronRuntime, waitForElectronAPI } from './services/ElectronBridge';
import StorageService from './services/StorageService';
import HowLongToBeatService from './services/HowLongToBeatService';
import PCGamingWikiService from './services/PCGamingWikiService';
import SteamPublicService from './services/SteamPublicService';
import SteamNewsService from './services/SteamNewsService';
import DiskUsageService from './services/DiskUsageService';
import WishlistService from './services/WishlistService';
import BuyRecommendationService from './services/BuyRecommendationService';
import SteamWishlistService from './services/SteamWishlistService';
import LabsService from './services/LabsService';
import { LibraryExportService } from './services/LibraryExportService';
import RecommendationTunerPanel from './components/RecommendationTunerPanel';
import { ScanReportPanel } from './components/ScanReportPanel';
import BackupRestoreDashboard from './components/BackupRestoreDashboard';
import './Settings.css';

function Settings({ library = [], dynamicCoverBg = false, setDynamicCoverBg, minimizeOnLaunch = false, setMinimizeOnLaunch }) {
  const navigate = useNavigate();
  const { currentTheme, setTheme, availableThemes, bigScreenMode, toggleBigScreenMode, autoTheme, toggleAutoTheme } = useTheme();
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [timeFormat, setTimeFormat] = useState('24-hour');
  const [timezone, setTimezone] = useState('UTC');
  const [themeMode, setThemeMode] = useState('custom'); // 'light', 'dark', or 'custom'
  const [cacheEnabled, setCacheEnabled] = useState(true);
  const [hltbEnabled, setHltbEnabled] = useState(() => HowLongToBeatService.isEnabled());
  const [pcgwEnabled, setPcgwEnabled] = useState(() => PCGamingWikiService.isEnabled());
  const [steamSnapshotEnabled, setSteamSnapshotEnabled] = useState(() => SteamPublicService.isEnabled());
  const [steamNewsEnabled, setSteamNewsEnabled] = useState(() => SteamNewsService.isEnabled());
  const [diskUsageEnabled, setDiskUsageEnabled] = useState(() => DiskUsageService.isEnabled());
  const [wishlistEnabled, setWishlistEnabled] = useState(() => WishlistService.isEnabled());
  const [buyRecommendationsEnabled, setBuyRecommendationsEnabled] = useState(() => BuyRecommendationService.isEnabled());
  const [steamWishlistEnabled, setSteamWishlistEnabled] = useState(() => SteamWishlistService.isEnabled());
  const [steamId, setSteamId] = useState(() => SteamWishlistService.getSteamId());
  const [steamWishlistSyncing, setSteamWishlistSyncing] = useState(false);
  const [steamWishlistLastResult, setSteamWishlistLastResult] = useState(() => SteamWishlistService.getLastResult());
  const [labsEnabled, setLabsEnabled] = useState(() => LabsService.isEnabled());
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [gameLaunchNotifications, setGameLaunchNotifications] = useState(true);
  const [dailySummaryNotifications, setDailySummaryNotifications] = useState(false);
  const [scanCompleteNotifications, setScanCompleteNotifications] = useState(true);
  const [backupReminders, setBackupReminders] = useState(false);
  const [launchOnStartup, setLaunchOnStartup] = useState(false);
  const [startupLaunchSupported, setStartupLaunchSupported] = useState(false);
  const [startupLaunchLoading, setStartupLaunchLoading] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [previewTheme] = useState(currentTheme);
  const [customBgImage, setCustomBgImage] = useState('');
  const [customBgOverlay, setCustomBgOverlay] = useState(30);
  const [customBgPreview, setCustomBgPreview] = useState('');
  const [shortcutSettings, setShortcutSettings] = useState(() => KeyboardShortcuts.getSettings());
  const [shortcutEntries, setShortcutEntries] = useState(() => KeyboardShortcuts.getShortcutList());
  const [recommendationStyle, setRecommendationStyle] = useState(() => StorageService.getString('recommendationStyle', 'balanced'));
  const [storyFrequency, setStoryFrequency] = useState(() => StorageService.getString('gamingStoryFrequency', 'weekly'));
  const { success, error: toastError } = useToast();

  const refreshShortcutSettings = useCallback(() => {
    setShortcutSettings(KeyboardShortcuts.getSettings());
    setShortcutEntries(KeyboardShortcuts.getShortcutList());
  }, []);

  useEffect(() => {
    setDateFormat(StorageService.getString('dateFormat', 'DD/MM/YYYY'));
    setTimeFormat(StorageService.getString('timeFormat', '24-hour'));
    setTimezone(StorageService.getString('timezone', Intl.DateTimeFormat().resolvedOptions().timeZone));
    setThemeMode(StorageService.getString('themeMode', 'custom'));
    setCacheEnabled(StorageService.getString('cacheEnabled', 'true') === 'true');

    // Load notification settings
    setNotificationsEnabled(StorageService.getString('notificationsEnabled', 'true') === 'true');
    setGameLaunchNotifications(StorageService.getString('gameLaunchNotifications', 'true') === 'true');
    setDailySummaryNotifications(StorageService.getString('dailySummaryNotifications') === 'true');
    setScanCompleteNotifications(StorageService.getString('scanCompleteNotifications', 'true') === 'true');
    setBackupReminders(StorageService.getString('backupReminders') === 'true');
    setSelectedCurrency(StorageService.getString('selectedCurrency', 'USD'));
    setStoryFrequency(StorageService.getString('gamingStoryFrequency', 'weekly'));

    // Load custom background settings
    setCustomBgImage(StorageService.getString('customBgImage', ''));
    setCustomBgOverlay(parseInt(StorageService.getString('customBgOverlay', '30')));
    refreshShortcutSettings();
  }, [refreshShortcutSettings]);

  useEffect(() => {
    let active = true;

    const loadStartupLaunchSettings = async () => {
      if (!isElectronRuntime()) {
        if (active) {
          setStartupLaunchSupported(false);
          setLaunchOnStartup(false);
        }
        return;
      }

      setStartupLaunchLoading(true);
      try {
        const electronAPI = await waitForElectronAPI();
        const settings = await electronAPI?.getStartupLaunchSettings?.();

        if (!active) {
          return;
        }

        setStartupLaunchSupported(Boolean(settings?.supported));
        setLaunchOnStartup(Boolean(settings?.enabled));
      } catch (_error) {
        if (active) {
          setStartupLaunchSupported(false);
          setLaunchOnStartup(false);
        }
      } finally {
        if (active) {
          setStartupLaunchLoading(false);
        }
      }
    };

    loadStartupLaunchSettings();

    return () => {
      active = false;
    };
  }, []);

  const handleShortcutToggle = (enabled) => {
    KeyboardShortcuts.setEnabled(enabled);
    refreshShortcutSettings();
    success(`Keyboard shortcuts ${enabled ? 'enabled' : 'disabled'}.`);
  };

  const handleShortcutChange = (actionId, value) => {
    const result = KeyboardShortcuts.setShortcutForAction(actionId, value);
    if (!result.success) {
      toastError(result.message);
      refreshShortcutSettings();
      return;
    }
    refreshShortcutSettings();
    success(result.message);
  };

  const handleShortcutReset = (actionId) => {
    KeyboardShortcuts.resetShortcut(actionId);
    refreshShortcutSettings();
    success('Shortcut reset to default.');
  };

  const handleStartupLaunchToggle = async (enabled) => {
    if (!startupLaunchSupported) {
      return;
    }

    setStartupLaunchLoading(true);
    try {
      const electronAPI = await waitForElectronAPI();
      const result = await electronAPI?.setStartupLaunchEnabled?.(enabled);

      if (!result?.success) {
        toastError(result?.message || 'Unable to update Windows startup setting.');
        return;
      }

      setLaunchOnStartup(Boolean(result.enabled));
      success(`Launch on Windows startup ${result.enabled ? 'enabled' : 'disabled'}.`);
    } catch (_error) {
      toastError('Unable to update Windows startup setting.');
    } finally {
      setStartupLaunchLoading(false);
    }
  };

  const handleThemeModeChange = (newMode) => {
    setThemeMode(newMode);

    if (autoTheme) {
      toggleAutoTheme();
    }

    if (newMode === 'light') {
      setTheme('light');
    } else if (newMode === 'dark') {
      setTheme('dark');
    }
    // For 'custom', keep the current theme

    StorageService.setString('themeMode', newMode);
    success(`Theme mode changed to ${newMode}`);
  };

  const saveSettings = () => {
    StorageService.setString('dateFormat', dateFormat);
    StorageService.setString('timeFormat', timeFormat);
    StorageService.setString('timezone', timezone);
    StorageService.setString('autoTheme', autoTheme ? 'true' : 'false');
    StorageService.setString('cacheEnabled', cacheEnabled ? 'true' : 'false');
    StorageService.setString('theme', currentTheme);
    StorageService.setString('themeMode', themeMode);
    StorageService.setString('selectedCurrency', selectedCurrency);
    StorageService.setString('recommendationStyle', recommendationStyle);

    // Save notification settings
    StorageService.setString('notificationsEnabled', notificationsEnabled ? 'true' : 'false');
    StorageService.setString('gameLaunchNotifications', gameLaunchNotifications ? 'true' : 'false');
    StorageService.setString('dailySummaryNotifications', dailySummaryNotifications ? 'true' : 'false');
    StorageService.setString('scanCompleteNotifications', scanCompleteNotifications ? 'true' : 'false');
    StorageService.setString('backupReminders', backupReminders ? 'true' : 'false');
    StorageService.setString('gamingStoryFrequency', storyFrequency);

    success('Settings saved successfully!');
  };

  const clearCache = () => {
    StorageService.remove('libraryCache');
    StorageService.remove('lastSync');
    success('Cache cleared successfully!');
  };

  const handleBackgroundUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toastError('Image too large! Please use an image under 5MB.');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toastError('Please select a valid image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageData = event.target.result;
      setCustomBgPreview(imageData);
      setCustomBgImage(imageData);
    };
    reader.readAsDataURL(file);
  };

  const handleOverlayChange = (e) => {
    setCustomBgOverlay(parseInt(e.target.value));
  };

  const saveCustomTheme = () => {
    if (!customBgImage) {
      toastError('Please upload a background image first.');
      return;
    }

    StorageService.setString('customBgImage', customBgImage);
    StorageService.setString('customBgOverlay', customBgOverlay.toString());
    
    // Apply custom theme
    setTheme('custom');
    success('Custom background applied! Your theme has been updated.');
  };

  const clearCustomBackground = () => {
    setCustomBgImage('');
    setCustomBgPreview('');
    setCustomBgOverlay(30);
    StorageService.remove('customBgImage');
    StorageService.remove('customBgOverlay');
    success('Custom background cleared!');
  };

  const resetSettings = () => {
    const confirmReset = window.confirm('Are you sure you want to reset all settings to defaults?');
    if (confirmReset) {
      const settingsKeys = [
        'themeMode',
        'dateFormat',
        'timeFormat',
        'timezone',
        'autoTheme',
        'cacheEnabled',
        'theme',
        'selectedCurrency',
        'notificationsEnabled',
        'gameLaunchNotifications',
        'dailySummaryNotifications',
        'scanCompleteNotifications',
        'backupReminders',
        'gamingStoryFrequency',
        'customBgImage',
        'customBgOverlay',
        'dynamicCoverBg',
        'minimizeOnLaunch',
        'recommendationStyle',
        'launchOnStartup',
        'bigScreenMode'
      ];
      settingsKeys.forEach((key) => StorageService.remove(key));
      setDateFormat('DD/MM/YYYY');
      setTimeFormat('24-hour');
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
      setNotificationsEnabled(true);
      setGameLaunchNotifications(true);
      setDailySummaryNotifications(false);
      setScanCompleteNotifications(true);
      setBackupReminders(false);
      setStoryFrequency('weekly');
      if (startupLaunchSupported) {
        setLaunchOnStartup(false);
        handleStartupLaunchToggle(false);
      }
      setCacheEnabled(true);
      success('Settings reset to defaults!');
    }
  };

  return (
    <>
      <NavBar />
      <div className={`App ${currentTheme}`}>
        <div className="settings-container">
          <div className="settings-header">
            <div className="settings-title">
              <SettingsIcon size={32} />
              <h1>Settings</h1>
            </div>
            <p>Customize your GamePilot experience</p>
          </div>

          <div className="settings-layout">
            {/* Left Column - Main Settings */}
            <div className="settings-column">
              {/* Basic Settings Section */}
              <CollapsibleSection
                title="Basic Settings"
                subtitle="Date, time, timezone, and currency defaults."
                badge={selectedCurrency}
                icon={<SettingsIcon size={18} />}
                className="settings-folder"
                defaultOpen
              >
                <div className="settings-section">
                  <div className="section-header">
                    <SettingsIcon size={20} />
                    <h2>Basic Settings</h2>
                  </div>
                  <div className="basic-settings">
                  <div className="setting-item">
                    <label>Date Format</label>
                    <select value={dateFormat} onChange={(e) => setDateFormat(e.target.value)} className="settings-select">
                      <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2023)</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2023)</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD (2023-12-31)</option>
                    </select>
                  </div>
                  
                  <div className="setting-item">
                    <label>Time Format</label>
                    <select value={timeFormat} onChange={(e) => setTimeFormat(e.target.value)} className="settings-select">
                      <option value="12-hour">12-hour (3:45 PM)</option>
                      <option value="24-hour">24-hour (15:45)</option>
                    </select>
                  </div>
                  
                  <div className="setting-item">
                    <label>Timezone</label>
                    <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="settings-select">
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time (ET)</option>
                      <option value="America/Chicago">Central Time (CT)</option>
                      <option value="America/Denver">Mountain Time (MT)</option>
                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                      <option value="Europe/London">London (GMT/BST)</option>
                      <option value="Europe/Paris">Paris (CET/CEST)</option>
                      <option value="Europe/Berlin">Berlin (CET/CEST)</option>
                      <option value="Asia/Tokyo">Tokyo (JST)</option>
                      <option value="Asia/Shanghai">Shanghai (CST)</option>
                      <option value="Australia/Sydney">Sydney (AEDT/AEST)</option>
                      <option value="Pacific/Auckland">Auckland (NZDT/NZST)</option>
                    </select>
                  </div>
                  
                  <div className="setting-item">
                    <label>Currency</label>
                    <select value={selectedCurrency} onChange={(e) => setSelectedCurrency(e.target.value)} className="settings-select">
                      <option value="USD">USD - US Dollar ($)</option>
                      <option value="EUR">EUR - Euro (€)</option>
                      <option value="GBP">GBP - British Pound (£)</option>
                      <option value="JPY">JPY - Japanese Yen (¥)</option>
                      <option value="CAD">CAD - Canadian Dollar (C$)</option>
                      <option value="AUD">AUD - Australian Dollar (A$)</option>
                      <option value="CHF">CHF - Swiss Franc (CHF)</option>
                      <option value="CNY">CNY - Chinese Yuan (¥)</option>
                      <option value="INR">INR - Indian Rupee (₹)</option>
                      <option value="BRL">BRL - Brazilian Real (R$)</option>
                      <option value="RUB">RUB - Russian Ruble (₽)</option>
                    </select>
                  </div>

                  <div className="setting-item">
                    <label>Labs (experimental features)</label>
                    <div className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={labsEnabled}
                        onChange={(e) => {
                          const next = e.target.checked;
                          setLabsEnabled(next);
                          LabsService.setEnabled(next);
                        }}
                        id="labs-enabled"
                      />
                      <label htmlFor="labs-enabled" className="toggle-slider"></label>
                    </div>
                    <p className="setting-description">
                      On by default. Reveals secondary features (Habits, Achievements, Library Reclaimer, Year in Review, Performance Cockpit, and more) in the “More” menu. Turn this off to keep the interface focused on the essentials — your library and deciding what to play or buy next.
                    </p>
                  </div>
                  </div>
                </div>
              </CollapsibleSection>

              {/* Appearance Section */}
              <CollapsibleSection
                title="Appearance"
                subtitle="Theme mode, theme preview, and visual presentation defaults."
                badge={themeMode === 'custom' ? 'Custom mode' : themeMode === 'light' ? 'Light mode' : 'Dark mode'}
                icon={<Palette size={18} />}
                className="settings-folder"
              >
                <div className="settings-section">
                  <div className="section-header">
                    <Palette size={20} />
                    <h2>Appearance</h2>
                  </div>
                  <div className="appearance-settings">
                  <div className="setting-item">
                    <label>Theme Mode</label>
                    <div className="theme-mode-buttons" style={{
                      display: 'flex',
                      gap: '8px',
                      flexWrap: 'wrap'
                    }}>
                      {[
                        { value: 'light', label: '☀️ Light', description: 'Clean and bright' },
                        { value: 'dark', label: '🌙 Dark', description: 'Easy on the eyes' },
                        { value: 'custom', label: '🎨 Custom', description: 'Choose your style' }
                      ].map(mode => (
                        <button
                          key={mode.value}
                          onClick={() => handleThemeModeChange(mode.value)}
                          className={`theme-mode-btn ${themeMode === mode.value ? 'active' : ''}`}
                          style={{
                            padding: '12px 16px',
                            border: `2px solid ${themeMode === mode.value ? 'var(--accent-primary)' : 'var(--border-primary)'}`,
                            borderRadius: '8px',
                            backgroundColor: themeMode === mode.value ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                            color: themeMode === mode.value ? 'white' : 'var(--text-primary)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            minWidth: '100px',
                            transition: 'all 0.2s ease'
                          }}
                          aria-label={`Switch to ${mode.description.toLowerCase()} theme`}
                          tabIndex={0}
                        >
                          <span style={{ fontSize: '16px' }}>{mode.label}</span>
                          <span style={{ fontSize: '12px', opacity: 0.8 }}>{mode.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {themeMode === 'custom' && (
                    <div className="setting-item">
                      <label>Custom Theme</label>
                      <div className="theme-wheel-display" style={{ alignItems: 'stretch' }}>
                        <div className="theme-wheel-preview">
                          <div
                            className="theme-preview"
                            style={{
                              background: availableThemes[previewTheme]?.preview || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              width: '100%',
                              height: '100%',
                              borderRadius: '8px',
                              position: 'relative'
                            }}
                          >
                          </div>
                        </div>

                        <div className="theme-wheel-info" style={{ gap: '10px' }}>
                          <div className="theme-wheel-name">
                            {availableThemes[previewTheme]?.name || currentTheme || 'Current Theme'}
                          </div>
                          <div className="theme-wheel-index">
                            {Object.keys(availableThemes).length} themes available in your collection
                          </div>
                          <div className="theme-wheel-access-badge" style={{ color: 'var(--text-primary)' }}>
                            <Palette size={12} />
                            Browse and switch themes from the dedicated Themes page
                          </div>
                          <button
                            type="button"
                            className="save-btn"
                            onClick={() => {
                              window.location.hash = '#/themes';
                            }}
                          >
                            Open Themes Page
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="setting-item">
                    <label>Big Screen/Controller Mode</label>
                    <div className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={bigScreenMode}
                        onChange={() => toggleBigScreenMode()}
                        id="big-screen-mode"
                      />
                      <label htmlFor="big-screen-mode" className="toggle-slider"></label>
                    </div>
                    <p className="setting-description">
                      Optimizes the interface for larger screens and enables controller navigation. Ideal for TV or console-like setups.
                    </p>
                  </div>
                  
                  <div className="setting-item">
                    <label>Auto-switch to system theme</label>
                    <div className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={autoTheme}
                        onChange={() => toggleAutoTheme()}
                        id="auto-theme"
                      />
                      <label htmlFor="auto-theme" className="toggle-slider"></label>
                    </div>
                  </div>

                  <div className="setting-item">
                    <label>Last-played cover art background</label>
                    <div className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={dynamicCoverBg}
                        onChange={() => {
                          const next = !dynamicCoverBg;
                          setDynamicCoverBg(next);
                          StorageService.setString('dynamicCoverBg', next ? 'true' : 'false');
                        }}
                        id="dynamic-cover-bg"
                      />
                      <label htmlFor="dynamic-cover-bg" className="toggle-slider"></label>
                    </div>
                    <p className="setting-description">
                      Use the cover art of your most recently played game as a subtle full-screen background. Falls back to the normal theme when no recent game exists.
                    </p>
                  </div>

                  <div className="setting-item">
                    <label>Minimize on game launch</label>
                    <div className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={minimizeOnLaunch}
                        onChange={() => {
                          const next = !minimizeOnLaunch;
                          setMinimizeOnLaunch(next);
                          StorageService.setString('minimizeOnLaunch', next ? 'true' : 'false');
                        }}
                        id="minimize-on-launch"
                      />
                      <label htmlFor="minimize-on-launch" className="toggle-slider"></label>
                    </div>
                    <p className="setting-description">
                      Automatically minimize GamePilot to the taskbar when you launch a game, and restore the window when the session ends.
                    </p>
                  </div>
                  </div>
                </div>
              </CollapsibleSection>

              {/* Custom Background Section */}
              <CollapsibleSection
                title="Custom Background"
                subtitle="Upload a personal backdrop and tune the overlay strength."
                badge={customBgPreview || customBgImage ? 'Configured' : 'Optional'}
                icon={<Palette size={18} />}
                className="settings-folder"
              >
                <div className="settings-section">
                  <div className="section-header">
                    <Palette size={20} />
                    <h2>Custom Background</h2>
                  </div>
                  <div className="settings-group">
                  <p className="section-description">
                    Upload your own background image to personalize GamePilot. Supports JPG, PNG, GIF, and WebP (max 5MB).
                  </p>

                  <div className="setting-item">
                    <label>Upload Background Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBackgroundUpload}
                      style={{
                        padding: '8px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        background: 'var(--input-bg)',
                        color: 'var(--text-color)',
                        cursor: 'pointer'
                      }}
                    />
                  </div>

                  {(customBgPreview || customBgImage) && (
                    <>
                      <div className="setting-item">
                        <label>Preview</label>
                        <div style={{
                          width: '100%',
                          height: '200px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          position: 'relative',
                          border: '2px solid var(--border-color)'
                        }}>
                          <img
                            src={customBgPreview || customBgImage}
                            alt="Custom background preview"
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                          />
                          <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: `rgba(0, 0, 0, ${customBgOverlay / 100})`,
                            pointerEvents: 'none'
                          }} />
                        </div>
                      </div>

                      <div className="setting-item">
                        <label>Overlay Darkness: {customBgOverlay}%</label>
                        <input
                          type="range"
                          min="0"
                          max="80"
                          value={customBgOverlay}
                          onChange={handleOverlayChange}
                          style={{
                            width: '100%',
                            accentColor: 'var(--primary-color)'
                          }}
                        />
                        <p style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>
                          Adjust darkness overlay to ensure text remains readable
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button
                          onClick={saveCustomTheme}
                          className="action-button primary"
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                          }}
                        >
                          <Save size={16} />
                          Apply Custom Background
                        </button>
                        <button
                          onClick={clearCustomBackground}
                          className="action-button"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            background: '#dc3545',
                            color: 'white'
                          }}
                        >
                          <Trash2 size={16} />
                          Clear
                        </button>
                      </div>
                    </>
                  )}
                  </div>
                </div>
              </CollapsibleSection>
            </div>

            {/* Right Column - Other Settings */}
            <div className="settings-column">
              {/* Interface Customization */}
              <CollapsibleSection
                title="Interface"
                subtitle="Hide elements like the streak, trim the Home page, set compact mode, and pick an accent."
                badge="Customization"
                icon={<Eye size={18} />}
                className="settings-folder"
                defaultOpen
              >
                <InterfaceSettings />
              </CollapsibleSection>

              {/* Preferences Section */}
              <CollapsibleSection
                title="Preferences"
                subtitle="Notification behavior and local cache preferences."
                badge={notificationsEnabled ? 'Alerts on' : 'Alerts off'}
                icon={<Bell size={18} />}
                className="settings-folder"
              >
                <div className="settings-section">
                  <div className="section-header">
                    <Bell size={20} />
                    <h2>Preferences</h2>
                  </div>
                  <div className="preferences-settings">
                  <div className="setting-item">
                    <label>Enable notifications</label>
                    <div className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={notificationsEnabled}
                        onChange={(e) => setNotificationsEnabled(e.target.checked)}
                        id="notifications-enabled"
                      />
                      <label htmlFor="notifications-enabled" className="toggle-slider"></label>
                    </div>
                  </div>

                  {notificationsEnabled && (
                    <>
                      <div className="notification-section">
                        <h4 style={{ marginTop: '16px', marginBottom: '8px', fontSize: '14px', opacity: 0.8 }}>Notifications</h4>

                        <div className="setting-item">
                          <label>🎮 Game launched successfully</label>
                          <div className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={gameLaunchNotifications}
                              onChange={(e) => setGameLaunchNotifications(e.target.checked)}
                              id="game-launch-notifications"
                            />
                            <label htmlFor="game-launch-notifications" className="toggle-slider"></label>
                          </div>
                        </div>

                        <div className="setting-item">
                          <label>📊 Daily gaming summary</label>
                          <div className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={dailySummaryNotifications}
                              onChange={(e) => setDailySummaryNotifications(e.target.checked)}
                              id="daily-summary-notifications"
                            />
                            <label htmlFor="daily-summary-notifications" className="toggle-slider"></label>
                          </div>
                        </div>

                        <div className="setting-item">
                          <label>🔍 Library scan complete</label>
                          <div className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={scanCompleteNotifications}
                              onChange={(e) => setScanCompleteNotifications(e.target.checked)}
                              id="scan-complete-notifications"
                            />
                            <label htmlFor="scan-complete-notifications" className="toggle-slider"></label>
                          </div>
                        </div>

                        <div className="setting-item">
                          <label>💾 Backup reminders</label>
                          <div className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={backupReminders}
                              onChange={(e) => setBackupReminders(e.target.checked)}
                              id="backup-reminders"
                            />
                            <label htmlFor="backup-reminders" className="toggle-slider"></label>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <h4 style={{ marginTop: '20px', marginBottom: '8px', fontSize: '14px', opacity: 0.8 }}>Local Storage & Recaps</h4>

                  <div className="setting-item">
                    <label>Enable local cache</label>
                    <div className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={cacheEnabled}
                        onChange={(e) => setCacheEnabled(e.target.checked)}
                        id="cache"
                      />
                      <label htmlFor="cache" className="toggle-slider"></label>
                    </div>
                  </div>

                  <div className="setting-item">
                    <label>Gaming story frequency</label>
                    <select
                      value={storyFrequency}
                      onChange={(e) => setStoryFrequency(e.target.value)}
                      className="settings-select"
                      aria-label="Gaming story frequency"
                    >
                      <option value="off">Off</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                    <p className="setting-description">
                      How often GamePilot generates a themed recap of your recent play.
                    </p>
                  </div>

                  <h4 style={{ marginTop: '20px', marginBottom: '8px', fontSize: '14px', opacity: 0.8 }}>Data Sources</h4>

                  <div className="setting-item">
                    <label>HowLongToBeat lookups</label>
                    <div className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={hltbEnabled}
                        onChange={(e) => {
                          const next = e.target.checked;
                          setHltbEnabled(next);
                          HowLongToBeatService.setEnabled(next);
                          success(`HowLongToBeat lookups ${next ? 'enabled' : 'disabled'}.`);
                        }}
                        id="hltb-enabled"
                      />
                      <label htmlFor="hltb-enabled" className="toggle-slider"></label>
                    </div>
                    <p className="setting-description">
                      On by default. Sends each game's title (and only the title) directly to <code>howlongtobeat.com</code> to fetch story-length estimates that power Session Fit and the time chips on Library cards. No GamePilot server is involved — the lookup is anonymous and results are cached on your device for 14 days. Turn this off any time to stop all future requests immediately.
                    </p>
                  </div>

                  <div className="setting-item">
                    <label>PCGamingWiki lookups (Librarian's Notes)</label>
                    <div className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={pcgwEnabled}
                        onChange={(e) => {
                          const next = e.target.checked;
                          setPcgwEnabled(next);
                          PCGamingWikiService.setEnabled(next);
                          success(`PCGamingWiki lookups ${next ? 'enabled' : 'disabled'}.`);
                        }}
                        id="pcgw-enabled"
                      />
                      <label htmlFor="pcgw-enabled" className="toggle-slider"></label>
                    </div>
                    <p className="setting-description">
                      On by default. When you open a game, GamePilot queries the public <code>pcgamingwiki.com</code> MediaWiki API for save-file paths, configuration locations, and controller-support info. Anonymous, no GamePilot server involved, results cached locally for 30 days.
                    </p>
                  </div>

                  <div className="setting-item">
                    <label>Steam Snapshot (reviews + achievement rarity)</label>
                    <div className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={steamSnapshotEnabled}
                        onChange={(e) => {
                          const next = e.target.checked;
                          setSteamSnapshotEnabled(next);
                          SteamPublicService.setEnabled(next);
                          success(`Steam Snapshot ${next ? 'enabled' : 'disabled'}.`);
                        }}
                        id="steam-snapshot-enabled"
                      />
                      <label htmlFor="steam-snapshot-enabled" className="toggle-slider"></label>
                    </div>
                    <p className="setting-description">
                      On by default. For Steam games, GamePilot queries the public <code>store.steampowered.com</code> review summary and the global achievement-rarity endpoint to surface "Very Positive · 94% of 12k reviews" and "Rarest achievement: only 0.4% of players have it." Anonymous, no API key, no GamePilot server, cached locally for 7 days.
                    </p>
                  </div>

                  <div className="setting-item">
                    <label>Patch &amp; News Radar (Steam News)</label>
                    <div className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={steamNewsEnabled}
                        onChange={(e) => {
                          const next = e.target.checked;
                          setSteamNewsEnabled(next);
                          SteamNewsService.setEnabled(next);
                          success(`Patch & News Radar ${next ? 'enabled' : 'disabled'}.`);
                        }}
                        id="steam-news-enabled"
                      />
                      <label htmlFor="steam-news-enabled" className="toggle-slider"></label>
                    </div>
                    <p className="setting-description">
                      On by default. For Steam games, GamePilot queries the public <code>api.steampowered.com</code> news feed to surface a "Patch / News" badge on Library cards when something has been posted since you last played, plus a recent-posts list inside the Game modal. Anonymous, no API key, no GamePilot server, cached locally for 6 hours.
                    </p>
                  </div>

                  <div className="setting-item">
                    <label>Disk Usage &amp; Library Reclaimer</label>
                    <div className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={diskUsageEnabled}
                        onChange={(e) => {
                          const next = e.target.checked;
                          setDiskUsageEnabled(next);
                          DiskUsageService.setEnabled(next);
                          success(`Disk Usage scanning ${next ? 'enabled' : 'disabled'}.`);
                        }}
                        id="disk-usage-enabled"
                      />
                      <label htmlFor="disk-usage-enabled" className="toggle-slider"></label>
                    </div>
                    <p className="setting-description">
                      On by default. GamePilot walks each game's install folder locally to measure disk usage and powers the Library Reclaimer page + size chips on Library cards. Everything stays on-device — no data leaves your machine. Folder walks are throttled and bounded so they cannot hang the app.
                  </p>
                  </div>

                  <h4 style={{ marginTop: '20px', marginBottom: '8px', fontSize: '14px', opacity: 0.8 }}>Discovery & Buying</h4>

                  <div className="setting-item">
                    <label>Wishlist & Price Alerts</label>
                    <div className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={wishlistEnabled}
                        onChange={(e) => {
                          const next = e.target.checked;
                          setWishlistEnabled(next);
                          WishlistService.setEnabled(next);
                          success(`Wishlist ${next ? 'enabled' : 'disabled'}.`);
                        }}
                        id="wishlist-enabled"
                      />
                      <label htmlFor="wishlist-enabled" className="toggle-slider"></label>
                    </div>
                    <p className="setting-description">
                      On by default. Track games you want and get price-drop alerts via IsThereAnyDeal. Prices are cached locally for 24 hours. No user data leaves your device.
                    </p>
                  </div>

                  <div className="setting-item">
                    <label>Buy Recommendations</label>
                    <div className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={buyRecommendationsEnabled}
                        onChange={(e) => {
                          const next = e.target.checked;
                          setBuyRecommendationsEnabled(next);
                          BuyRecommendationService.setEnabled(next);
                          success(`Buy Recommendations ${next ? 'enabled' : 'disabled'}.`);
                        }}
                        id="buy-recommendations-enabled"
                      />
                      <label htmlFor="buy-recommendations-enabled" className="toggle-slider"></label>
                    </div>
                    <p className="setting-description">
                      Off by default. Ranks your local Wishlist using owned-library taste signals and cached price context. This first scaffold does not call external catalog APIs, open stores, purchase anything, or send your play history anywhere.
                    </p>
                  </div>

                  <div className="setting-item">
                    <label>Steam Wishlist Import</label>
                    <div className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={steamWishlistEnabled}
                        onChange={(e) => {
                          const next = e.target.checked;
                          setSteamWishlistEnabled(next);
                          SteamWishlistService.setEnabled(next);
                          success(`Steam Wishlist import ${next ? 'enabled' : 'disabled'}.`);
                        }}
                        id="steam-wishlist-enabled"
                      />
                      <label htmlFor="steam-wishlist-enabled" className="toggle-slider"></label>
                    </div>
                    <p className="setting-description">
                      Off by default. Import your public Steam wishlist using your Steam64 ID. Adds those games to GamePilot's local Wishlist so Buy Recommendations can rank what to buy next. Your ID and wishlist data stay on-device.
                    </p>
                    {steamWishlistEnabled && (
                      <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="text"
                            placeholder="Paste your Steam64 ID or profile URL..."
                            value={steamId}
                            onChange={(e) => {
                              const next = e.target.value;
                              setSteamId(next);
                              SteamWishlistService.setSteamId(next);
                            }}
                            onBlur={() => {
                              const normalized = SteamWishlistService.getSteamId();
                              setSteamId(normalized);
                            }}
                            style={{ flex: 1, padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                          />
                          <button
                            className="export-button"
                            disabled={!SteamWishlistService.getSteamId() || steamWishlistSyncing}
                            onClick={async () => {
                              setSteamWishlistSyncing(true);
                              try {
                                const normalized = SteamWishlistService.getSteamId();
                                setSteamId(normalized);
                                const result = await SteamWishlistService.sync();
                                setSteamWishlistLastResult(result);
                                if (result.success) {
                                  success(`Synced ${result.count} game${result.count === 1 ? '' : 's'} from Steam wishlist.`);
                                } else {
                                  const msg = result.error || 'Steam wishlist sync failed.';
                                  console.warn('[Settings] Steam wishlist sync:', msg);
                                }
                              } finally {
                                setSteamWishlistSyncing(false);
                              }
                            }}
                            style={{ padding: '8px 14px', whiteSpace: 'nowrap' }}
                          >
                            {steamWishlistSyncing ? 'Syncing...' : 'Sync Now'}
                          </button>
                        </div>
                        {steamWishlistLastResult?.fetchedAt && (
                          <p className="setting-description" style={{ margin: '4px 0 0' }}>
                            {steamWishlistLastResult.success
                              ? `Last sync: ${steamWishlistLastResult.count} new game${steamWishlistLastResult.count === 1 ? '' : 's'} added from ${steamWishlistLastResult.totalFetched} fetched.`
                              : `Last sync failed: ${steamWishlistLastResult.error}`}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <h4 style={{ marginTop: '20px', marginBottom: '8px', fontSize: '14px', opacity: 0.8 }}>System</h4>

                  {startupLaunchSupported && (
                    <div className="setting-item">
                      <div>
                        <label>Launch GamePilot when Windows starts</label>
                        <p className="setting-description" style={{ margin: '6px 0 0' }}>
                          Opens GamePilot automatically after you sign in to Windows.
                        </p>
                      </div>
                      <div className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={launchOnStartup}
                          disabled={startupLaunchLoading}
                          onChange={(e) => handleStartupLaunchToggle(e.target.checked)}
                          id="launch-on-startup"
                        />
                        <label htmlFor="launch-on-startup" className="toggle-slider"></label>
                      </div>
                    </div>
                  )}
                  </div>
                </div>
              </CollapsibleSection>

              <CollapsibleSection
                title="Keyboard Shortcuts"
                subtitle="Enable shortcut help and customize the quick actions you use most often."
                badge={shortcutSettings.enabled ? `${shortcutEntries.length} active` : 'Disabled'}
                icon={<Keyboard size={18} />}
                className="settings-folder"
              >
                <div className="settings-section">
                  <div className="section-header">
                    <Keyboard size={20} />
                    <h2>Keyboard Shortcuts</h2>
                  </div>
                  <div className="preferences-settings">
                    <div className="setting-item">
                      <div>
                        <label>Enable keyboard shortcuts</label>
                        <p className="setting-description">Turn the global shortcut layer on or off without losing your custom bindings.</p>
                      </div>
                      <div className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={shortcutSettings.enabled}
                          onChange={(e) => handleShortcutToggle(e.target.checked)}
                          id="keyboard-shortcuts-enabled"
                        />
                        <label htmlFor="keyboard-shortcuts-enabled" className="toggle-slider"></label>
                      </div>
                    </div>

                    <div className="notification-section">
                      <h4>Shortcut Bindings</h4>
                      <p className="setting-description" style={{ marginBottom: '16px' }}>
                        Use combinations like <strong>Ctrl+K</strong>, <strong>Ctrl+Shift+P</strong>, or <strong>?</strong>. Clear a field to fall back to the default binding.
                      </p>
                      {shortcutEntries.map((shortcutEntry) => (
                        <div key={shortcutEntry.actionId} className="setting-item shortcut-setting-item">
                          <div>
                            <label>{shortcutEntry.description}</label>
                            <p className="setting-description">Default: {shortcutEntry.defaultKey || 'Unassigned'}</p>
                          </div>
                          <div className="shortcut-edit-row">
                            <input
                              type="text"
                              value={shortcutEntry.key || ''}
                              onChange={(e) => handleShortcutChange(shortcutEntry.actionId, e.target.value)}
                              className="settings-select shortcut-input"
                              placeholder={shortcutEntry.defaultKey || 'Type shortcut'}
                              title={`Shortcut for ${shortcutEntry.description}`}
                            />
                            <button
                              type="button"
                              onClick={() => handleShortcutReset(shortcutEntry.actionId)}
                              className="data-button reset shortcut-reset-button"
                              title={`Reset ${shortcutEntry.description} to ${shortcutEntry.defaultKey}`}
                            >
                              Reset
                            </button>
                          </div>
                        </div>
                      ))}
                      <div className="setting-item shortcut-setting-item">
                        <div>
                          <label>Shortcut help overlay</label>
                          <p className="setting-description">Use {KeyboardShortcuts.getShortcutForAction('show_shortcuts') || '?'} anywhere outside text inputs to see the current shortcut list.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => KeyboardShortcuts.showHelp()}
                          className="data-button export shortcut-help-button"
                          title="Open keyboard shortcut help"
                        >
                          Show Help
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </CollapsibleSection>

              {/* Data Management Section */}
              <CollapsibleSection
                title="Data Management"
                subtitle="Clear cache or reset local settings to defaults."
                badge="Local tools"
                icon={<Database size={18} />}
                className="settings-folder"
              >
                <div className="settings-section">
                  <div className="section-header">
                    <Database size={20} />
                    <h2>Data Management</h2>
                  </div>
                  <div className="data-settings">
                  <div className="data-actions">
                    <button onClick={() => LibraryExportService.exportLibrary(library, 'csv')} className="data-button export">
                      <Save size={16} />
                      Export CSV
                    </button>
                    <button onClick={() => LibraryExportService.exportLibrary(library, 'markdown')} className="data-button export">
                      <Save size={16} />
                      Export Markdown
                    </button>
                    <button onClick={clearCache} className="data-button clear">
                      <Trash2 size={16} />
                      Clear Cache
                    </button>
                    <button onClick={resetSettings} className="data-button reset">
                      <AlertCircle size={16} />
                      Reset All
                    </button>
                  </div>
                  <ScanReportPanel />
                  </div>
                </div>
              </CollapsibleSection>

              {/* Backup & Restore */}
              <CollapsibleSection
                title="Backup & Restore"
                subtitle="Export and import your complete GamePilot data."
                icon={<Archive size={18} />}
                className="settings-folder"
                defaultOpen={false}
              >
                <BackupRestoreDashboard />
              </CollapsibleSection>

              {/* Support Section */}
              <CollapsibleSection
                title="Support GamePilot"
                subtitle="Optional donations help keep development going."
                badge="Donate"
                icon={<Heart size={18} />}
                className="settings-folder"
              >
                <div className="settings-section">
                  <div className="section-header">
                    <Heart size={20} />
                    <h2>Support GamePilot</h2>
                  </div>
                  <div className="patreon-section">
                    <p>
                      GamePilot is free and local-first. If you want to support development, visit the Founders Lounge for patron options and founder perks.
                    </p>
                    <button
                      onClick={() => navigate('/donate')}
                      className="patreon-button"
                      style={{
                        backgroundColor: '#ff424d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '12px 24px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '16px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginTop: '12px'
                      }}
                    >
                      <Heart size={16} />
                      Open Founders Lounge
                    </button>
                  </div>
                </div>
              </CollapsibleSection>
            </div>
          </div>

          {/* Recommendation Engine Tuner */}
          <div className="settings-section-wrapper">
            <div className="settings-folder-content">
              <CollapsibleSection
                title="Recommendation Engine Tuner"
                subtitle="Fine-tune how GamePilot scores and ranks game recommendations."
                icon={<SlidersHorizontal size={18} />}
                className="settings-folder power-tools-folder"
              >
                <div className="settings-section" style={{ marginBottom: '16px' }}>
                  <div className="settings-group">
                    <div className="setting-item">
                      <label>Recommendation Style</label>
                      <p className="setting-description">
                        Choose how GamePilot prioritizes game suggestions in the Home page and Librarian features.
                      </p>
                      <select
                        value={recommendationStyle}
                        onChange={(e) => {
                          setRecommendationStyle(e.target.value);
                          StorageService.setString('recommendationStyle', e.target.value);
                        }}
                        className="settings-select"
                        style={{ marginTop: '8px' }}
                      >
                        <option value="balanced">Balanced - Mix of favorites and discoveries</option>
                        <option value="discovery">Discovery - Prioritize unplayed and hidden gems</option>
                        <option value="comfort">Comfort - Stick to your favorites and most-played</option>
                        <option value="nostalgia">Nostalgia - Bring back games you haven't played in a while</option>
                      </select>
                    </div>
                  </div>
                </div>
                <RecommendationTunerPanel />
              </CollapsibleSection>
            </div>
          </div>

          {/* Save Settings */}
          <div className="settings-actions">
            <button onClick={saveSettings} className="save-button">
              <Save size={16} />
              Save Settings
            </button>
          </div>

        </div>
      </div>
    </>
  );
}

export default Settings;
