import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings as SettingsIcon, Palette, Bell, Database, Trash2, Save, AlertCircle, Heart, Keyboard, Sparkles, Eye, Unlock, SlidersHorizontal, Archive, Sparkles as SparklesIcon } from 'lucide-react';
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
import EntitlementService from './services/EntitlementService';
import TrialService from './services/TrialService';
import { LibraryExportService } from './services/LibraryExportService';
import RecommendationTunerPanel from './components/RecommendationTunerPanel';
import { ScanReportPanel } from './components/ScanReportPanel';
import BackupRestoreDashboard from './components/BackupRestoreDashboard';
import DynamicBackdropStudio from './components/DynamicBackdropStudio';
import './Settings.css';

function Settings({ library = [], dynamicCoverBg = false, setDynamicCoverBg, minimizeOnLaunch = false, setMinimizeOnLaunch }) {
  const navigate = useNavigate();
  const { currentTheme, setTheme, availableThemes, validatePatreonCode, hasPatreonAccess, bigScreenMode, toggleBigScreenMode, autoTheme, toggleAutoTheme } = useTheme();
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
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [gameLaunchNotifications, setGameLaunchNotifications] = useState(true);
  const [dailySummaryNotifications, setDailySummaryNotifications] = useState(false);
  const [scanCompleteNotifications, setScanCompleteNotifications] = useState(true);
  const [backupReminders, setBackupReminders] = useState(false);
  const [launchOnStartup, setLaunchOnStartup] = useState(false);
  const [startupLaunchSupported, setStartupLaunchSupported] = useState(false);
  const [startupLaunchLoading, setStartupLaunchLoading] = useState(false);
  const [patreonCode, setPatreonCode] = useState('');
  const [activationResult, setActivationResult] = useState(null);
  const [storeCode, setStoreCode] = useState('');
  const [storeCodeResult, setStoreCodeResult] = useState(null);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [previewTheme] = useState(currentTheme);
  const [showLegalModal, setShowLegalModal] = useState(null);
  const [customBgImage, setCustomBgImage] = useState('');
  const [customBgOverlay, setCustomBgOverlay] = useState(30);
  const [customBgPreview, setCustomBgPreview] = useState('');
  const [shortcutSettings, setShortcutSettings] = useState(() => KeyboardShortcuts.getSettings());
  const [shortcutEntries, setShortcutEntries] = useState(() => KeyboardShortcuts.getShortcutList());
  const [recommendationStyle, setRecommendationStyle] = useState(() => StorageService.getString('recommendationStyle', 'balanced'));
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

  const handlePatreonCodeSubmit = () => {
    if (!patreonCode.trim()) {
      toastError('Please enter a Patreon code');
      return;
    }

    const result = validatePatreonCode(patreonCode.trim());
    setActivationResult(result);

    if (result.success) {
      success(result.message);
      setPatreonCode(''); // Clear the input after successful activation
      setTimeout(() => setActivationResult(null), 5000); // Clear result message after 5 seconds
    } else {
      toastError(result.message);
      setTimeout(() => setActivationResult(null), 5000); // Clear error message after 5 seconds
    }
  };

  const handleStoreCodeSubmit = () => {
    if (!storeCode.trim()) {
      toastError('Please enter an unlock code');
      return;
    }

    const result = EntitlementService.redeemCode(storeCode.trim());
    setStoreCodeResult(result);

    if (result.success) {
      success(result.message);
      setStoreCode('');
      setTimeout(() => setStoreCodeResult(null), 5000);
    } else {
      toastError(result.message);
      setTimeout(() => setStoreCodeResult(null), 5000);
    }
  };

  const resetSettings = () => {
    const confirmReset = window.confirm('Are you sure you want to reset all settings to defaults?');
    if (confirmReset) {
      localStorage.clear();
      setDateFormat('DD/MM/YYYY');
      setTimeFormat('24-hour');
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
      setNotificationsEnabled(true);
      setGameLaunchNotifications(true);
      setDailySummaryNotifications(false);
      setScanCompleteNotifications(true);
      setBackupReminders(false);
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
                            {availableThemes[previewTheme]?.patreonExclusive && !hasPatreonAccess() && (
                              <div className="theme-wheel-lock-overlay">
                                <Heart size={20} />
                                <div className="theme-wheel-lock-text">Patreon Exclusive</div>
                              </div>
                            )}
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

              {/* Recommendation Style Section */}
              <CollapsibleSection
                title="Recommendation Style"
                subtitle="Choose how GamePilot suggests games to you."
                badge={recommendationStyle === 'balanced' ? 'Balanced' : recommendationStyle}
                icon={<Sparkles size={18} />}
                className="settings-folder"
              >
                <div className="settings-section">
                  <div className="section-header">
                    <Sparkles size={20} />
                    <h2>Recommendation Style</h2>
                  </div>
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
                        <h4>Notification Types</h4>

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

              {/* Backup & Restore — Pro / Power Tools exclusive */}
              {(EntitlementService.hasEntitlement('power_tools') || EntitlementService.hasEntitlement('gamepilot_pro')) && (
                <CollapsibleSection
                  title="Backup & Restore"
                  subtitle="Export and import your complete GamePilot data."
                  badge="Pro"
                  icon={<Archive size={18} />}
                  className="settings-folder"
                  defaultOpen={false}
                >
                  <BackupRestoreDashboard
                    isPro={EntitlementService.hasEntitlement('power_tools') || EntitlementService.hasEntitlement('gamepilot_pro')}
                  />
                </CollapsibleSection>
              )}

              {/* Dynamic Backdrop Studio — Pro / Power Tools exclusive */}
              {(EntitlementService.hasEntitlement('power_tools') || EntitlementService.hasEntitlement('gamepilot_pro')) && (
                <CollapsibleSection
                  title="Dynamic Backdrop Studio"
                  subtitle="Animated, color-reactive backgrounds from your last played cover art."
                  badge="Pro"
                  icon={<SparklesIcon size={18} />}
                  className="settings-folder"
                  defaultOpen={false}
                >
                  <DynamicBackdropStudio
                    isPro={EntitlementService.hasEntitlement('power_tools') || EntitlementService.hasEntitlement('gamepilot_pro')}
                  />
                </CollapsibleSection>
              )}

              {/* Patreon Supporter Section */}
              <CollapsibleSection
                title="Support GamePilot"
                subtitle="Cosmetic supporter extras — all progression rewards unlock free through gameplay."
                badge={hasPatreonAccess() ? 'Supporter' : 'Themes +'}
                icon={<Heart size={18} />}
                className="settings-folder"
              >
                <div className="settings-section">
                  <div className="section-header">
                    <Heart size={20} />
                    <h2>Support GamePilot</h2>
                  </div>
                  <div className="patreon-section">
                  <div className="patreon-info">
                    <p>Every reward, theme, and feature in GamePilot unlocks free through gameplay and XP progression.</p>
                    <p>Supporters get cosmetic extras — bonus themes, a theme builder with colors and effects, accent colors, and an XP boost — as a thank you for backing development.</p>
                  </div>
                  <div className="activation-code-section">
                    <div className="setting-item">
                      <label>Patreon Code</label>
                      <div className="activation-input-group">
                        <input
                          type="text"
                          placeholder="Enter your Patreon activation code"
                          value={patreonCode}
                          onChange={(e) => setPatreonCode(e.target.value)}
                          className="activation-input"
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            border: '1px solid var(--border-primary)',
                            borderRadius: '4px',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)'
                          }}
                        />
                        <button
                          onClick={handlePatreonCodeSubmit}
                          className="activation-button"
                          style={{
                            marginLeft: '8px',
                            padding: '8px 16px',
                            backgroundColor: 'var(--button-primary-bg)',
                            color: 'var(--button-primary-text)',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          Activate
                        </button>
                      </div>
                      {activationResult && (
                        <div className={`activation-result ${activationResult.success ? 'success' : 'error'}`} style={{
                          marginTop: '8px',
                          padding: '8px 12px',
                          borderRadius: '4px',
                          fontSize: '14px',
                          backgroundColor: activationResult.success ? 'var(--success-bg, #d4edda)' : 'var(--error-bg, #f8d7da)',
                          color: activationResult.success ? 'var(--success-text, #155724)' : 'var(--error-text, #721c24)',
                          border: `1px solid ${activationResult.success ? 'var(--success-border, #c3e6cb)' : 'var(--error-border, #f5c6cb)'}`
                        }}>
                          {activationResult.message}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Store Unlock Code Section */}
                  <div className="activation-code-section">
                    <div className="setting-item">
                      <label>Store Unlock Code <span style={{ fontSize: '12px', opacity: 0.7 }}>(itch.io / one-time)</span></label>
                      <div className="activation-input-group">
                        <input
                          type="text"
                          placeholder="Enter your store unlock code"
                          value={storeCode}
                          onChange={(e) => setStoreCode(e.target.value)}
                          className="activation-input"
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            border: '1px solid var(--border-primary)',
                            borderRadius: '4px',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)'
                          }}
                        />
                        <button
                          onClick={handleStoreCodeSubmit}
                          className="activation-button"
                          style={{
                            marginLeft: '8px',
                            padding: '8px 16px',
                            backgroundColor: 'var(--button-primary-bg)',
                            color: 'var(--button-primary-text)',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          <Unlock size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                          Redeem
                        </button>
                      </div>
                      {storeCodeResult && (
                        <div className={`activation-result ${storeCodeResult.success ? 'success' : 'error'}`} style={{
                          marginTop: '8px',
                          padding: '8px 12px',
                          borderRadius: '4px',
                          fontSize: '14px',
                          backgroundColor: storeCodeResult.success ? 'var(--success-bg, #d4edda)' : 'var(--error-bg, #f8d7da)',
                          color: storeCodeResult.success ? 'var(--success-text, #155724)' : 'var(--error-text, #721c24)',
                          border: `1px solid ${storeCodeResult.success ? 'var(--success-border, #c3e6cb)' : 'var(--error-border, #f5c6cb)'}`
                        }}>
                          {storeCodeResult.message}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="patreon-links">
                    {(hasPatreonAccess() || EntitlementService.hasEntitlement('advanced_theme_builder') || EntitlementService.hasEntitlement('gamepilot_pro') || TrialService.isTrialActive('advanced_theme_builder')) && (
                      <button
                        onClick={() => navigate('/theme-builder')}
                        className="patreon-button"
                        style={{
                          backgroundColor: 'var(--accent-primary)',
                          color: '#0f172a',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '12px 24px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          fontSize: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <Palette size={16} />
                        Open Theme Builder
                        {TrialService.isTrialActive('advanced_theme_builder') && !EntitlementService.hasEntitlement('advanced_theme_builder') && !EntitlementService.hasEntitlement('gamepilot_pro') && (
                          <span className="trial-badge">Trial</span>
                        )}
                      </button>
                    )}
                    {!hasPatreonAccess() && !EntitlementService.hasEntitlement('advanced_theme_builder') && !EntitlementService.hasEntitlement('gamepilot_pro') && !TrialService.isTrialActive('advanced_theme_builder') && (
                      <button
                        onClick={() => {
                          const result = TrialService.startTrial('advanced_theme_builder');
                          alert(result.message);
                        }}
                        className="patreon-button trial-btn"
                        style={{
                          borderRadius: '8px',
                          padding: '12px 24px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          fontSize: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <Palette size={16} />
                        Try Theme Builder
                      </button>
                    )}
                    <button
                      onClick={() => window.open('https://www.patreon.com/cw/GamePilot', '_blank')}
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
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <Heart size={16} />
                      Support on Patreon
                    </button>
                  </div>
                  </div>
                </div>
              </CollapsibleSection>
            </div>
          </div>

          {/* Recommendation Engine Tuner — Power Tools exclusive */}
          {(EntitlementService.hasEntitlement('power_tools') || EntitlementService.hasEntitlement('gamepilot_pro')) && (
            <div className="settings-section-wrapper">
              <div className="settings-folder-content">
                <CollapsibleSection
                  title="Recommendation Engine Tuner"
                  subtitle="Fine-tune how GamePilot scores and ranks game recommendations."
                  badge="Power Tools"
                  icon={<SlidersHorizontal size={18} />}
                  className="settings-folder power-tools-folder"
                >
                  <RecommendationTunerPanel />
                </CollapsibleSection>
              </div>
            </div>
          )}

          {/* Save Settings */}
          <div className="settings-actions">
            <button onClick={saveSettings} className="save-button">
              <Save size={16} />
              Save Settings
            </button>
          </div>

          {/* Legal & Disclaimer Section */}
          <CollapsibleSection
            title="Legal & Disclaimer"
            subtitle="License, privacy, terms, and local-first usage notes."
            badge="Local-first"
            icon={<AlertCircle size={18} />}
            className="settings-folder legal-folder"
          >
            <div className="settings-section legal-section">
              <div className="section-header">
                <AlertCircle size={20} />
                <h2>Legal & Disclaimer</h2>
              </div>
              <div className="legal-settings">
              <div className="legal-content">
                <h3>GamePilot Disclaimer</h3>
                <div className="legal-text">
                  <p><strong>Software License:</strong> GamePilot is provided "as is" without warranties of any kind.</p>
                  <p><strong>Game Detection:</strong> GamePilot only reads game metadata from existing installations. No game files are modified.</p>
                  <p><strong>Third-Party Content:</strong> Game images and metadata are sourced from public APIs. All trademarks belong to respective owners.</p>
                  <p><strong>Privacy:</strong> All data is stored locally on your device. No data is transmitted to external servers.</p>
                  <p><strong>Usage:</strong> Users are responsible for complying with game license terms and applicable laws.</p>
                  <p><strong>Legal Protection:</strong> GamePilot operates under fair use principles for library management and does not circumvent DRM or modify game files.</p>
                </div>
                
                <div className="legal-links">
                  <button onClick={() => setShowLegalModal('license')} className="legal-button">
                    View Full License
                  </button>
                  <button onClick={() => setShowLegalModal('privacy')} className="legal-button">
                    Privacy Policy
                  </button>
                  <button onClick={() => setShowLegalModal('terms')} className="legal-button">
                    Terms of Service
                  </button>
                </div>
                
                <div className="copyright-notice">
                  <p><strong>Copyright Notice:</strong></p>
                  <p> 2026 Moz. All rights reserved.</p>
                  <p>GamePilot is not affiliated with Steam, Epic Games, Microsoft, Sony, Nintendo, or any game publishers.</p>
                  <p>All game titles, logos, and images are trademarks of their respective owners.</p>
                </div>
              </div>
              </div>
            </div>
          </CollapsibleSection>
        </div>
      </div>

      {/* Legal Modal */}
      {showLegalModal && (
        <div className="legal-modal-overlay" onClick={() => setShowLegalModal(null)}>
          <div className="legal-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="legal-modal-header">
              <h2>{showLegalModal === 'license' ? 'Software License' : showLegalModal === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}</h2>
              <button onClick={() => setShowLegalModal(null)} className="close-legal-modal">×</button>
            </div>
            <div className="legal-modal-body">
              {showLegalModal === 'license' && (
                <div className="legal-content-full">
                  <h3>MIT License</h3>
                  <p>Copyright (c) 2026 Moz</p>
                  <p>Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:</p>
                  <p>The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.</p>
                  <p><strong>THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.</strong></p>
                </div>
              )}
              {showLegalModal === 'privacy' && (
                <div className="legal-content-full">
                  <h3>Privacy Policy</h3>
                  <p><strong>Last Updated:</strong> March 2026</p>
                  <h4>Data Collection</h4>
                  <p>GamePilot does NOT collect, transmit, or store any personal data on external servers. All data is stored locally on your device using browser localStorage.</p>
                  <h4>Local Data Storage</h4>
                  <p>The following data is stored locally on your device:</p>
                  <ul>
                    <li>Game library information (titles, platforms, playtime)</li>
                    <li>Achievement progress and statistics</li>
                    <li>User preferences and settings</li>
                    <li>Profile information (username, avatar)</li>
                    <li>Calendar events and reminders</li>
                  </ul>
                  <h4>Third-Party Services</h4>
                  <p>GamePilot may access public APIs for game metadata and images. No personal information is transmitted to these services.</p>
                  <h4>Data Security</h4>
                  <p>Your data remains on your device and is never transmitted to external servers. You can export, backup, or delete your data at any time from the Profile page.</p>
                  <h4>Changes to Privacy Policy</h4>
                  <p>We may update this policy from time to time. Continued use of GamePilot constitutes acceptance of any changes.</p>
                </div>
              )}
              {showLegalModal === 'terms' && (
                <div className="legal-content-full">
                  <h3>Terms of Service</h3>
                  <p><strong>Last Updated:</strong> March 2026</p>
                  <h4>Acceptance of Terms</h4>
                  <p>By using GamePilot, you agree to these Terms of Service. If you do not agree, please do not use the software.</p>
                  <h4>License Grant</h4>
                  <p>GamePilot is licensed under the MIT License. You are free to use, modify, and distribute the software in accordance with the license terms.</p>
                  <h4>Permitted Use</h4>
                  <p>GamePilot is designed for personal game library management. You may:</p>
                  <ul>
                    <li>Scan and organize your legally owned games</li>
                    <li>Track playtime and achievements</li>
                    <li>Use mood-based game recommendations</li>
                    <li>Export and backup your data</li>
                  </ul>
                  <h4>Prohibited Use</h4>
                  <p>You may NOT:</p>
                  <ul>
                    <li>Use GamePilot to circumvent DRM or copy protection</li>
                    <li>Modify or distribute pirated games</li>
                    <li>Use the software for any illegal purposes</li>
                    <li>Claim ownership of GamePilot or its components</li>
                  </ul>
                  <h4>Disclaimer</h4>
                  <p>GamePilot is provided "AS IS" without warranties. We are not responsible for any damages arising from use of the software.</p>
                  <h4>Third-Party Content</h4>
                  <p>GamePilot is not affiliated with Steam, Epic Games, Microsoft, Sony, Nintendo, or any game publishers. All game titles, logos, and trademarks belong to their respective owners.</p>
                  <h4>Limitation of Liability</h4>
                  <p>In no event shall the developers be liable for any damages arising from the use or inability to use GamePilot.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Settings;
