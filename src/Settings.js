import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Settings as SettingsIcon, Palette, Bell, Database, Download, Upload, Trash2, Save, AlertCircle, Heart, Music2, Waves, Keyboard, Sparkles } from 'lucide-react';
import { useToast } from './components/Toast';
import { useTheme } from './ThemeContext';
import NavBar from './NavBar';
import { AchievementTracker } from './AchievementSystem';
import { audioManager } from './services/AudioManager';
import { ProgressionUnlockService } from './services/ProgressionUnlockService';
import { KeyboardShortcuts } from './KeyboardShortcuts';
import CollapsibleSection from './components/CollapsibleSection';
import './Settings.css';

function Settings() {
  const { currentTheme, setTheme, availableThemes, validatePatreonCode, isThemeUnlocked, bigScreenMode, toggleBigScreenMode } = useTheme();
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [timeFormat, setTimeFormat] = useState('24-hour');
  const [timezone, setTimezone] = useState('UTC');
  const [autoTheme, setAutoTheme] = useState(false);
  const [themeMode, setThemeMode] = useState('custom'); // 'light', 'dark', or 'custom'
  const [cacheEnabled, setCacheEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [achievementNotifications, setAchievementNotifications] = useState(true);
  const [gameLaunchNotifications, setGameLaunchNotifications] = useState(true);
  const [dailySummaryNotifications, setDailySummaryNotifications] = useState(false);
  const [scanCompleteNotifications, setScanCompleteNotifications] = useState(true);
  const [backupReminders, setBackupReminders] = useState(false);
  const [patreonCode, setPatreonCode] = useState('');
  const [activationResult, setActivationResult] = useState(null);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [previewTheme] = useState(currentTheme);
  const [showLegalModal, setShowLegalModal] = useState(null);
  const [customBgImage, setCustomBgImage] = useState('');
  const [customBgOverlay, setCustomBgOverlay] = useState(30);
  const [customBgPreview, setCustomBgPreview] = useState('');
  const [ambientEnabledSetting, setAmbientEnabledSetting] = useState(() => audioManager.getSettings().ambientEnabled);
  const [ambientSoundPack, setAmbientSoundPack] = useState(() => audioManager.getSettings().ambientSoundPack);
  const [ambientVolume, setAmbientVolume] = useState(() => audioManager.getSettings().ambientVolume);
  const [sfxEnabledSetting, setSfxEnabledSetting] = useState(() => audioManager.getSettings().sfxEnabled);
  const [buttonSoundPack, setButtonSoundPack] = useState(() => audioManager.getSettings().buttonSoundPack);
  const [sfxVolume, setSfxVolume] = useState(() => audioManager.getSettings().sfxVolume);
  const [buttonSampleSelection, setButtonSampleSelection] = useState(() => audioManager.getButtonSampleSelection());
  const [musicEnabled, setMusicEnabled] = useState(() => audioManager.getSettings().musicEnabled);
  const [musicPack, setMusicPack] = useState(() => audioManager.getSettings().musicPack);
  const [musicVolume, setMusicVolume] = useState(() => audioManager.getSettings().musicVolume);
  const [ambientUnlocked, setAmbientUnlocked] = useState(() => audioManager.isAmbientUnlocked());
  const [musicUnlocked, setMusicUnlocked] = useState(() => audioManager.isMusicUnlocked());
  const [ambientRequirement, setAmbientRequirement] = useState(() => ProgressionUnlockService.getAmbientRequirement());
  const [musicRequirement, setMusicRequirement] = useState(() => ProgressionUnlockService.getMusicRequirement());
  const [ambientPackOptions, setAmbientPackOptions] = useState(() => audioManager.getAmbientPacks());
  const [musicPackOptions, setMusicPackOptions] = useState(() => audioManager.getMusicPacks());
  const [buttonPackOptions, setButtonPackOptions] = useState(() => audioManager.getButtonPacks());
  const [rewardPresentationCustomization, setRewardPresentationCustomization] = useState(() => ProgressionUnlockService.getRewardPresentationCustomization());
  const [libraryPresentationOptions, setLibraryPresentationOptions] = useState(() => ProgressionUnlockService.getLibraryPresentationVariants());
  const [homeLayoutOptions, setHomeLayoutOptions] = useState(() => ProgressionUnlockService.getHomeLayoutVariants());
  const [recommendationPackOptions, setRecommendationPackOptions] = useState(() => ProgressionUnlockService.getRecommendationPacks());
  const [rewardCatalogSummary, setRewardCatalogSummary] = useState(() => ProgressionUnlockService.getRewardCatalogSummary());
  const [shortcutSettings, setShortcutSettings] = useState(() => KeyboardShortcuts.getSettings());
  const [shortcutEntries, setShortcutEntries] = useState(() => KeyboardShortcuts.getShortcutList());
  const [recommendationStyle, setRecommendationStyle] = useState(() => localStorage.getItem('gamepilot_recommendation_style') || 'balanced');
  const { success, error: toastError } = useToast();
  const currentAmbientPackMeta = ambientPackOptions.find((pack) => pack.id === ambientSoundPack) || null;
  const currentMusicPackMeta = musicPackOptions.find((pack) => pack.id === musicPack) || null;
  const currentButtonPackMeta = buttonPackOptions.find((pack) => pack.id === buttonSoundPack);
  const currentButtonPack = currentButtonPackMeta || buttonPackOptions[0];
  const isSampleButtonPack = currentButtonPack?.type === 'sample';
  const currentSampleSelection = buttonSampleSelection[buttonSoundPack] || null;
  const ambientPackProgress = useMemo(() => {
    const nextUnlock = ambientPackOptions
      .filter((pack) => !pack.unlocked)
      .sort((left, right) => left.requiredXP - right.requiredXP || left.label.localeCompare(right.label))[0] || null;

    return {
      unlockedCount: ambientPackOptions.filter((pack) => pack.unlocked).length,
      totalCount: ambientPackOptions.length,
      nextUnlock
    };
  }, [ambientPackOptions]);
  const musicPackProgress = useMemo(() => {
    const nextUnlock = musicPackOptions
      .filter((pack) => !pack.unlocked)
      .sort((left, right) => left.requiredXP - right.requiredXP || left.label.localeCompare(right.label))[0] || null;

    return {
      unlockedCount: musicPackOptions.filter((pack) => pack.unlocked).length,
      totalCount: musicPackOptions.length,
      nextUnlock
    };
  }, [musicPackOptions]);
  const buttonPackProgress = useMemo(() => {
    const nextUnlock = buttonPackOptions
      .filter((pack) => !pack.unlocked)
      .sort((left, right) => left.requiredXP - right.requiredXP || left.label.localeCompare(right.label))[0] || null;

    return {
      unlockedCount: buttonPackOptions.filter((pack) => pack.unlocked).length,
      totalCount: buttonPackOptions.length,
      nextUnlock
    };
  }, [buttonPackOptions]);
  const nextAudioUnlock = useMemo(() => {
    return [
      ambientPackProgress.nextUnlock ? { ...ambientPackProgress.nextUnlock, category: 'Atmosphere Pack' } : null,
      musicPackProgress.nextUnlock ? { ...musicPackProgress.nextUnlock, category: 'Music Pack' } : null,
      buttonPackProgress.nextUnlock ? { ...buttonPackProgress.nextUnlock, category: buttonPackProgress.nextUnlock.type === 'synth' ? 'Button Synth' : 'Button SFX' } : null
    ]
      .filter(Boolean)
      .sort((left, right) => left.requiredXP - right.requiredXP || left.label.localeCompare(right.label))[0] || null;
  }, [ambientPackProgress, buttonPackProgress, musicPackProgress]);
  const sampleEntries = useMemo(() => (
    isSampleButtonPack && currentButtonPackMeta?.unlocked
      ? audioManager.getSamplesForPack(buttonSoundPack)
      : []
  ), [buttonSoundPack, isSampleButtonPack, currentButtonPackMeta]);
  const selectedLibraryPresentation = useMemo(() => {
    const selectedId = rewardPresentationCustomization?.selectedLibraryVariant;
    return libraryPresentationOptions.find((variant) => variant.id === selectedId) || libraryPresentationOptions[0] || null;
  }, [libraryPresentationOptions, rewardPresentationCustomization]);
  const selectedHomeLayout = useMemo(() => {
    const selectedId = rewardPresentationCustomization?.selectedHomeLayout;
    return homeLayoutOptions.find((layout) => layout.id === selectedId) || homeLayoutOptions[0] || null;
  }, [homeLayoutOptions, rewardPresentationCustomization]);
  const selectedRecommendationPack = useMemo(() => {
    const selectedId = rewardPresentationCustomization?.selectedRecommendationPack;
    return recommendationPackOptions.find((pack) => pack.id === selectedId) || recommendationPackOptions[0] || null;
  }, [recommendationPackOptions, rewardPresentationCustomization]);
  const presentationRewardCounts = useMemo(() => ({
    unlocked: libraryPresentationOptions.filter((reward) => reward.unlocked).length
      + homeLayoutOptions.filter((reward) => reward.unlocked).length
      + recommendationPackOptions.filter((reward) => reward.unlocked).length,
    total: libraryPresentationOptions.length + homeLayoutOptions.length + recommendationPackOptions.length
  }), [homeLayoutOptions, libraryPresentationOptions, recommendationPackOptions]);
  const nextPresentationUnlock = useMemo(() => {
    return [
      ...libraryPresentationOptions.map((reward) => ({ ...reward, category: 'Library Variant' })),
      ...homeLayoutOptions.map((reward) => ({ ...reward, category: 'Home Layout' })),
      ...recommendationPackOptions.map((reward) => ({ ...reward, category: 'Recommendation Pack' }))
    ]
      .filter((reward) => !reward.unlocked)
      .sort((left, right) => left.requiredXP - right.requiredXP || left.name.localeCompare(right.name))[0] || null;
  }, [homeLayoutOptions, libraryPresentationOptions, recommendationPackOptions]);

  const refreshRewardPresentation = useCallback(() => {
    setRewardPresentationCustomization(ProgressionUnlockService.getRewardPresentationCustomization());
    setLibraryPresentationOptions(ProgressionUnlockService.getLibraryPresentationVariants());
    setHomeLayoutOptions(ProgressionUnlockService.getHomeLayoutVariants());
    setRecommendationPackOptions(ProgressionUnlockService.getRecommendationPacks());
    setRewardCatalogSummary(ProgressionUnlockService.getRewardCatalogSummary());
  }, []);

  const refreshShortcutSettings = useCallback(() => {
    setShortcutSettings(KeyboardShortcuts.getSettings());
    setShortcutEntries(KeyboardShortcuts.getShortcutList());
  }, []);

  const refreshAudioLocks = useCallback(() => {
    const settings = audioManager.getSettings();
    setAmbientEnabledSetting(settings.ambientEnabled);
    setAmbientSoundPack(settings.ambientSoundPack);
    setAmbientVolume(settings.ambientVolume);
    setSfxEnabledSetting(settings.sfxEnabled);
    setButtonSoundPack(settings.buttonSoundPack);
    setSfxVolume(settings.sfxVolume);
    setButtonSampleSelection(audioManager.getButtonSampleSelection());
    setMusicEnabled(settings.musicEnabled);
    setMusicPack(settings.musicPack);
    setMusicVolume(settings.musicVolume);
    setAmbientUnlocked(audioManager.isAmbientUnlocked());
    setMusicUnlocked(audioManager.isMusicUnlocked());
    setAmbientRequirement(ProgressionUnlockService.getAmbientRequirement());
    setMusicRequirement(ProgressionUnlockService.getMusicRequirement());
    setAmbientPackOptions(audioManager.getAmbientPacks());
    setMusicPackOptions(audioManager.getMusicPacks());
    setButtonPackOptions(audioManager.getButtonPacks());
  }, []);

  useEffect(() => {
    setDateFormat(localStorage.getItem('dateFormat') || 'DD/MM/YYYY');
    setTimeFormat(localStorage.getItem('timeFormat') || '24-hour');
    setTimezone(localStorage.getItem('timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone);
    setAutoTheme(localStorage.getItem('autoTheme') === 'true');
    setThemeMode(localStorage.getItem('themeMode') || 'custom');
    setCacheEnabled(localStorage.getItem('cacheEnabled') !== 'false');
    
    // Load notification settings
    setNotificationsEnabled(localStorage.getItem('notificationsEnabled') !== 'false');
    setAchievementNotifications(localStorage.getItem('achievementNotifications') !== 'false');
    setGameLaunchNotifications(localStorage.getItem('gameLaunchNotifications') !== 'false');
    setDailySummaryNotifications(localStorage.getItem('dailySummaryNotifications') === 'true');
    setScanCompleteNotifications(localStorage.getItem('scanCompleteNotifications') !== 'false');
    setBackupReminders(localStorage.getItem('backupReminders') === 'true');
    setSelectedCurrency(localStorage.getItem('selectedCurrency') || 'USD');
    
    // Load custom background settings
    setCustomBgImage(localStorage.getItem('customBgImage') || '');
    setCustomBgOverlay(parseInt(localStorage.getItem('customBgOverlay') || '30'));
    refreshAudioLocks();
    refreshRewardPresentation();
    refreshShortcutSettings();
  }, [refreshAudioLocks, refreshRewardPresentation, refreshShortcutSettings]);

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

  const handleAmbientToggle = (enabled) => {
    audioManager.setAmbientEnabled(enabled);
    setAmbientEnabledSetting(audioManager.getSettings().ambientEnabled);
  };

  const handleAmbientPackChange = (packId) => {
    audioManager.setAmbientPack(packId);
    setAmbientSoundPack(audioManager.getSettings().ambientSoundPack);
  };

  const handleAmbientVolumeChange = (value) => {
    setAmbientVolume(value);
    audioManager.setAmbientVolume(value);
  };

  const handlePreviewAmbient = () => {
    if (ambientSoundPack === 'dynamic' || !currentAmbientPackMeta?.unlocked) return;
    audioManager.previewAmbient(ambientSoundPack);
  };

  const handleSfxToggle = (enabled) => {
    setSfxEnabledSetting(enabled);
    audioManager.setSfxEnabled(enabled);
  };

  const handleButtonPackChange = (pack) => {
    audioManager.setButtonPack(pack);
    setButtonSoundPack(audioManager.getSettings().buttonSoundPack);
  };

  const handleMusicToggle = (enabled) => {
    if (!musicUnlocked) return;
    audioManager.setMusicEnabled(enabled);
    setMusicEnabled(audioManager.getSettings().musicEnabled);
  };

  const handleMusicPackChange = (packId) => {
    audioManager.setMusicPack(packId);
    setMusicPack(audioManager.getSettings().musicPack);
  };

  const handleMusicVolumeChange = (value) => {
    if (!musicUnlocked) return;
    setMusicVolume(value);
    audioManager.setMusicVolume(value);
  };

  const handlePreviewMusic = () => {
    if (!musicEnabled || !musicUnlocked || !currentMusicPackMeta?.unlocked) return;
    audioManager.previewMusicPack(musicPack);
  };

  const handlePreviewButtonSample = (file) => {
    if (!sfxEnabledSetting || !currentButtonPackMeta?.unlocked) return;
    audioManager.previewButtonSample(buttonSoundPack, file);
  };

  const handleSelectButtonSample = (file) => {
    if (!sfxEnabledSetting || !currentButtonPackMeta?.unlocked) return;
    audioManager.setButtonSampleSelection(buttonSoundPack, file);
    setButtonSampleSelection(audioManager.getButtonSampleSelection());
  };

  const handleSfxVolumeChange = (value) => {
    setSfxVolume(value);
    audioManager.setSfxVolume(value);
  };

  const handleThemeModeChange = (newMode) => {
    setThemeMode(newMode);
    
    if (newMode === 'light') {
      setTheme('light');
    } else if (newMode === 'dark') {
      setTheme('dark');
    }
    // For 'custom', keep the current theme
    
    localStorage.setItem('themeMode', newMode);
    success(`Theme mode changed to ${newMode}`);
  };

  const saveSettings = () => {
    localStorage.setItem('dateFormat', dateFormat);
    localStorage.setItem('timeFormat', timeFormat);
    localStorage.setItem('timezone', timezone);
    localStorage.setItem('autoTheme', autoTheme);
    localStorage.setItem('cacheEnabled', cacheEnabled);
    localStorage.setItem('gamepilot-theme', currentTheme); // Save theme
    localStorage.setItem('selectedCurrency', selectedCurrency);
    
    // Save notification settings
    localStorage.setItem('notificationsEnabled', notificationsEnabled);
    localStorage.setItem('achievementNotifications', achievementNotifications);
    localStorage.setItem('gameLaunchNotifications', gameLaunchNotifications);
    localStorage.setItem('dailySummaryNotifications', dailySummaryNotifications);
    localStorage.setItem('scanCompleteNotifications', scanCompleteNotifications);
    localStorage.setItem('backupReminders', backupReminders);
    
    // Track settings changes for achievements
    AchievementTracker.trackFeatureUsage('settings');
    
    success('Settings saved successfully!');
  };

  const clearCache = () => {
    localStorage.removeItem('libraryCache');
    localStorage.removeItem('lastSync');
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

    localStorage.setItem('customBgImage', customBgImage);
    localStorage.setItem('customBgOverlay', customBgOverlay.toString());
    
    // Apply custom theme
    setTheme('custom');
    success('Custom background applied! Your theme has been updated.');
    AchievementTracker.trackFeatureUsage('custom_theme');
  };

  const clearCustomBackground = () => {
    setCustomBgImage('');
    setCustomBgPreview('');
    setCustomBgOverlay(30);
    localStorage.removeItem('customBgImage');
    localStorage.removeItem('customBgOverlay');
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
      refreshAudioLocks();
      refreshRewardPresentation();
      audioManager.playAmbientForTheme(currentTheme);
      setPatreonCode(''); // Clear the input after successful activation
      setTimeout(() => setActivationResult(null), 5000); // Clear result message after 5 seconds
    } else {
      toastError(result.message);
      setTimeout(() => setActivationResult(null), 5000); // Clear error message after 5 seconds
    }
  };

  const exportSettings = () => {
    const settings = {
      dateFormat,
      timeFormat,
      timezone,
      theme: currentTheme,
      autoTheme,
      notificationsEnabled,
      achievementNotifications,
      gameLaunchNotifications,
      dailySummaryNotifications,
      scanCompleteNotifications,
      backupReminders,
      cacheEnabled,
      rewardPresentationCustomization,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gamepilot-settings-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    success('Settings exported!');
  };

  const importSettings = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const settings = JSON.parse(e.target.result);
        if (settings.dateFormat) setDateFormat(settings.dateFormat);
        if (settings.timeFormat) setTimeFormat(settings.timeFormat);
        if (settings.timezone) setTimezone(settings.timezone);
        if (settings.theme) setTheme(settings.theme);
        if (settings.autoTheme !== undefined) setAutoTheme(settings.autoTheme);
        if (settings.notificationsEnabled !== undefined) setNotificationsEnabled(settings.notificationsEnabled);
        if (settings.achievementNotifications !== undefined) setAchievementNotifications(settings.achievementNotifications);
        if (settings.gameLaunchNotifications !== undefined) setGameLaunchNotifications(settings.gameLaunchNotifications);
        if (settings.dailySummaryNotifications !== undefined) setDailySummaryNotifications(settings.dailySummaryNotifications);
        if (settings.scanCompleteNotifications !== undefined) setScanCompleteNotifications(settings.scanCompleteNotifications);
        if (settings.backupReminders !== undefined) setBackupReminders(settings.backupReminders);
        if (settings.cacheEnabled !== undefined) setCacheEnabled(settings.cacheEnabled);
        if (settings.rewardPresentationCustomization && typeof settings.rewardPresentationCustomization === 'object') {
          ProgressionUnlockService.updateRewardPresentationCustomization(settings.rewardPresentationCustomization);
          refreshRewardPresentation();
        }
        success('Settings imported successfully!');
      } catch (err) {
        toastError('Invalid settings file!');
      }
    };
    reader.readAsText(file);
  };

  const resetSettings = () => {
    const confirmReset = window.confirm('Are you sure you want to reset all settings to defaults?');
    if (confirmReset) {
      localStorage.clear();
      setDateFormat('DD/MM/YYYY');
      setTimeFormat('24-hour');
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
      setAutoTheme(false);
      setNotificationsEnabled(true);
      setAchievementNotifications(true);
      setGameLaunchNotifications(true);
      setDailySummaryNotifications(false);
      setScanCompleteNotifications(true);
      setBackupReminders(false);
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
                            {availableThemes[previewTheme]?.isPremium && !isThemeUnlocked(previewTheme) && (
                              <div className="theme-wheel-lock-overlay">
                                <Heart size={20} />
                                <div className="theme-wheel-lock-text">Locked</div>
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
                          <div className="theme-wheel-premium-badge" style={{ color: 'var(--text-primary)' }}>
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
                    <div className="toggle-switch" onClick={toggleBigScreenMode}>
                      <div className={`toggle-slider ${bigScreenMode ? 'toggled' : ''}`}></div>
                      <span className="toggle-label">{bigScreenMode ? 'ON' : 'OFF'}</span>
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
                        onChange={(e) => setAutoTheme(e.target.checked)}
                        id="auto-theme"
                      />
                      <label htmlFor="auto-theme" className="toggle-slider"></label>
                    </div>
                  </div>
                  </div>
                </div>
              </CollapsibleSection>

              {/* Reward Presentation Section */}
              <CollapsibleSection
                title="Reward Presentation"
                subtitle="Equip XP-unlocked Home layouts, Library variants, and recommendation pack cosmetics."
                badge={`${presentationRewardCounts.unlocked}/${presentationRewardCounts.total} unlocked`}
                icon={<Palette size={18} />}
                className="settings-folder"
              >
                <div className="settings-section">
                  <div className="section-header">
                    <Palette size={20} />
                    <h2>Reward Presentation</h2>
                  </div>
                  <div className="presentation-reward-panel">
                    <div className="presentation-reward-summary">
                      <div className="presentation-reward-stat">
                        <span className="presentation-reward-stat-label">Reward XP</span>
                        <strong>{Number(rewardCatalogSummary?.xp || 0).toLocaleString()} XP</strong>
                        <span className="presentation-reward-stat-caption">Local-only unlocks still shape how Home and Library feel as you level up.</span>
                      </div>
                      <div className="presentation-reward-stat">
                        <span className="presentation-reward-stat-label">Equipped Home Layout</span>
                        <strong>{selectedHomeLayout?.name || 'Mission Control'}</strong>
                        <span className="presentation-reward-stat-caption">Recommendation cards currently use the {selectedRecommendationPack?.name || 'Classic Glow'} pack.</span>
                      </div>
                      <div className="presentation-reward-stat">
                        <span className="presentation-reward-stat-label">Equipped Library Variant</span>
                        <strong>{selectedLibraryPresentation?.name || 'Classic Shelf'}</strong>
                        <span className="presentation-reward-stat-caption">Rewards now have a dedicated page for full browsing.</span>
                      </div>
                    </div>

                    {nextPresentationUnlock && (
                      <div className="presentation-next-unlock">
                        <div>
                          <span className="presentation-reward-stat-label">Next Presentation Unlock</span>
                          <strong>{nextPresentationUnlock.name}</strong>
                          <p>{`${nextPresentationUnlock.category} unlocks at ${Number(nextPresentationUnlock.requiredXP || 0).toLocaleString()} XP.`}</p>
                        </div>
                        <span className="presentation-next-unlock-badge">
                          {Math.max(0, Number(nextPresentationUnlock.requiredXP || 0) - Number(rewardCatalogSummary?.xp || 0)).toLocaleString()} XP left
                        </span>
                      </div>
                    )}

                    <div className="setting-item">
                      <label>Full Reward Management</label>
                      <p className="setting-description">
                        Use the Rewards page to browse locked and unlocked presentation rewards in one place, while Settings stays focused on app configuration.
                      </p>
                      <button
                        type="button"
                        className="save-btn"
                        onClick={() => {
                          window.location.hash = '#/rewards';
                        }}
                      >
                        Open Rewards Page
                      </button>
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
                          localStorage.setItem('gamepilot_recommendation_style', e.target.value);
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
              {/* Atmosphere + UI Audio Section */}
              <CollapsibleSection
                title="Ambient Atmosphere + UI Audio"
                subtitle="Per-pack XP audio progression, previews, and sound mix controls."
                badge={`${ambientPackProgress.unlockedCount + musicPackProgress.unlockedCount + buttonPackProgress.unlockedCount} unlocked`}
                icon={<Waves size={18} />}
                className="settings-folder"
              >
                <div className="settings-section">
                  <div className="section-header">
                    <Waves size={20} />
                    <h2>Ambient Atmosphere + UI Audio</h2>
                  </div>
                  <div className="audio-settings" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="premium-lock-message" style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px dashed var(--border-primary)',
                      borderRadius: '8px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Heart size={18} />
                        <div>
                          Audio rewards now unlock one pack at a time through XP, so you always have another soundscape or click set to chase.
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                        <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-primary)' }}>
                          <strong>{ambientPackProgress.unlockedCount}/{ambientPackProgress.totalCount}</strong>
                          <div style={{ fontSize: '12px', opacity: 0.72, marginTop: '4px' }}>Atmosphere packs unlocked</div>
                        </div>
                        <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-primary)' }}>
                          <strong>{musicPackProgress.unlockedCount}/{musicPackProgress.totalCount}</strong>
                          <div style={{ fontSize: '12px', opacity: 0.72, marginTop: '4px' }}>Music packs unlocked</div>
                        </div>
                        <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-primary)' }}>
                          <strong>{buttonPackProgress.unlockedCount}/{buttonPackProgress.totalCount}</strong>
                          <div style={{ fontSize: '12px', opacity: 0.72, marginTop: '4px' }}>Button packs unlocked</div>
                        </div>
                      </div>
                      {nextAudioUnlock && (
                        <div style={{ fontSize: '12px', opacity: 0.8 }}>
                          {`Next audio unlock: ${nextAudioUnlock.label} (${nextAudioUnlock.category}) at ${Number(nextAudioUnlock.requiredXP || 0).toLocaleString()} XP.`}
                        </div>
                      )}
                    </div>

                    <div className="setting-item">
                      <label>Ambient Atmosphere</label>
                      <div className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={ambientEnabledSetting}
                          onChange={(e) => handleAmbientToggle(e.target.checked)}
                          id="ambient-enabled"
                          disabled={!ambientUnlocked}
                        />
                        <label htmlFor="ambient-enabled" className="toggle-slider"></label>
                      </div>
                      <p style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>
                        {ambientUnlocked
                          ? `${ambientRequirement.unlockedCount}/${ambientRequirement.totalCount} atmosphere packs unlocked.`
                          : `First atmosphere pack unlocks at ${Number(ambientRequirement.requiredXP || 0).toLocaleString()} XP (${Number(ambientRequirement.currentXP || 0).toLocaleString()} XP earned).`}
                      </p>
                      {ambientPackProgress.nextUnlock && ambientUnlocked && (
                        <p style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>
                          {`Next atmosphere pack: ${ambientPackProgress.nextUnlock.label} at ${Number(ambientPackProgress.nextUnlock.requiredXP || 0).toLocaleString()} XP.`}
                        </p>
                      )}
                    </div>

                    <div className="setting-item">
                      <label>Atmosphere Pack</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <select
                            value={ambientSoundPack}
                            onChange={(e) => handleAmbientPackChange(e.target.value)}
                            className="settings-select"
                            disabled={!ambientEnabledSetting || !ambientUnlocked}
                          >
                            <option value="dynamic">Match Theme (Dynamic)</option>
                            {ambientPackOptions.map((pack) => (
                              <option key={pack.id} value={pack.id} disabled={!pack.unlocked}>
                                {`${pack.label} — ${Number(pack.requiredXP || 0).toLocaleString()} XP${pack.unlocked ? '' : ' (Locked)'}`}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="data-button"
                            style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                            disabled={!ambientEnabledSetting || ambientSoundPack === 'dynamic' || !currentAmbientPackMeta?.unlocked}
                            onClick={handlePreviewAmbient}
                            data-sfx="none"
                          >
                            <Waves size={16} />
                            Preview
                          </button>
                        </div>
                        {ambientSoundPack !== 'dynamic' && (
                          <p style={{ fontSize: '12px', opacity: 0.7 }}>
                            {currentAmbientPackMeta?.description || 'Custom atmosphere selection.'}
                          </p>
                        )}
                        {ambientSoundPack === 'dynamic' && (
                          <p style={{ fontSize: '12px', opacity: 0.7 }}>
                            Dynamic mode auto-selects the best loop for whatever theme is active.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="setting-item">
                      <label>Ambient Volume: {Math.round(ambientVolume * 100)}%</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={ambientVolume}
                        onChange={(e) => handleAmbientVolumeChange(parseFloat(e.target.value))}
                        disabled={!ambientEnabledSetting || !ambientUnlocked}
                        style={{ width: '100%' }}
                      />
                    </div>

                    <hr style={{ borderColor: 'var(--border-primary)', opacity: 0.3 }} />

                    <div className="setting-item">
                      <label>Button Click SFX</label>
                      <div className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={sfxEnabledSetting}
                          onChange={(e) => handleSfxToggle(e.target.checked)}
                          id="sfx-enabled"
                        />
                        <label htmlFor="sfx-enabled" className="toggle-slider"></label>
                      </div>
                    </div>

                    <div className="setting-item">
                      <label>Background Music</label>
                      <div className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={musicEnabled}
                          onChange={(e) => handleMusicToggle(e.target.checked)}
                          id="music-enabled"
                          disabled={!musicUnlocked}
                        />
                        <label htmlFor="music-enabled" className="toggle-slider"></label>
                      </div>
                      <p style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>
                        {musicUnlocked
                          ? `${musicRequirement.unlockedCount}/${musicRequirement.totalCount} music packs unlocked.`
                          : `First music pack unlocks at ${Number(musicRequirement.requiredXP || 0).toLocaleString()} XP (${Number(musicRequirement.currentXP || 0).toLocaleString()} XP earned).`}
                      </p>
                      {musicPackProgress.nextUnlock && musicUnlocked && (
                        <p style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>
                          {`Next music pack: ${musicPackProgress.nextUnlock.label} at ${Number(musicPackProgress.nextUnlock.requiredXP || 0).toLocaleString()} XP.`}
                        </p>
                      )}
                    </div>

                    <div className="setting-item">
                      <label>Music Pack</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <select
                            value={musicPack}
                            onChange={(e) => handleMusicPackChange(e.target.value)}
                            className="settings-select"
                            disabled={!musicEnabled || !musicUnlocked}
                          >
                            {musicPackOptions.map((pack) => (
                              <option key={pack.id} value={pack.id} disabled={!pack.unlocked}>
                                {`${pack.label} — ${Number(pack.requiredXP || 0).toLocaleString()} XP${pack.unlocked ? '' : ' (Locked)'}`}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="data-button"
                            style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                            disabled={!musicEnabled || !currentMusicPackMeta?.unlocked}
                            onClick={handlePreviewMusic}
                            data-sfx="none"
                          >
                            <Music2 size={16} />
                            Preview
                          </button>
                        </div>
                        <p style={{ fontSize: '12px', opacity: 0.7 }}>
                          {currentMusicPackMeta?.description || 'XP-unlocked background music for browsing GamePilot.'}
                        </p>
                      </div>
                    </div>

                    <div className="setting-item">
                      <label>Music Volume: {Math.round(musicVolume * 100)}%</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={musicVolume}
                        onChange={(e) => handleMusicVolumeChange(parseFloat(e.target.value))}
                        disabled={!musicEnabled || !musicUnlocked}
                        style={{ width: '100%' }}
                      />
                    </div>

                    <div className="setting-item">
                      <label>Button Sound Pack</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <select
                          value={buttonSoundPack}
                          onChange={(e) => handleButtonPackChange(e.target.value)}
                          className="settings-select"
                          disabled={!sfxEnabledSetting}
                        >
                          {buttonPackOptions.map((pack) => (
                            <option
                              key={pack.id}
                              value={pack.id}
                              disabled={!pack.unlocked}
                            >
                              {pack.label} {pack.type === 'synth' ? '(Synth)' : '(Sample)'}
                              {` — ${Number(pack.requiredXP || 0).toLocaleString()} XP${pack.unlocked ? '' : ' (Locked)'}`}
                            </option>
                          ))}
                        </select>
                        <p style={{ fontSize: '12px', opacity: 0.7 }}>
                          {currentButtonPackMeta?.description || 'Choose from curated sample packs or synth-based clicks.'}
                        </p>
                        {(!currentButtonPackMeta?.unlocked) && (
                          <p style={{ fontSize: '12px', opacity: 0.7, color: 'var(--accent-primary)' }}>
                            {`Unlocks at ${Number(currentButtonPackMeta?.requiredXP || 0).toLocaleString()} XP (${Number(currentButtonPackMeta?.currentXP || 0).toLocaleString()} XP earned).`}
                          </p>
                        )}
                        {buttonPackProgress.nextUnlock && currentButtonPackMeta?.unlocked && (
                          <p style={{ fontSize: '12px', opacity: 0.7 }}>
                            {`Next button pack: ${buttonPackProgress.nextUnlock.label} at ${Number(buttonPackProgress.nextUnlock.requiredXP || 0).toLocaleString()} XP.`}
                          </p>
                        )}
                        {isSampleButtonPack && currentButtonPackMeta?.unlocked && sampleEntries.length > 0 && (
                          <div
                            className="sample-selector"
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px',
                              padding: '12px',
                              border: '1px solid var(--border-primary)',
                              borderRadius: '8px',
                              background: 'var(--bg-secondary)'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <div>
                                <strong>Individual Samples</strong>
                                <p style={{ fontSize: '12px', opacity: 0.75, marginTop: '2px' }}>
                                  Pin a favorite click or fall back to rotating through the pack.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleSelectButtonSample(null)}
                                disabled={!sfxEnabledSetting || !currentButtonPackMeta?.unlocked || !currentSampleSelection}
                                className="data-button"
                                style={{
                                  padding: '8px 12px',
                                  opacity: !currentSampleSelection ? 0.6 : 1,
                                  cursor: !currentSampleSelection ? 'not-allowed' : 'pointer'
                                }}
                              >
                                Use pack rotation
                              </button>
                            </div>

                            <div style={{ display: 'grid', gap: '8px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                              {sampleEntries.map((sample) => {
                                const isSelected = currentSampleSelection === sample.file;
                                return (
                                  <div
                                    key={sample.file}
                                    style={{
                                      border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-primary)'}`,
                                      borderRadius: '8px',
                                      padding: '10px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '6px',
                                      background: isSelected ? 'rgba(255, 255, 255, 0.04)' : 'transparent'
                                    }}
                                  >
                                    <div style={{ fontWeight: 600 }}>{sample.label}</div>
                                    <div style={{ fontSize: '11px', opacity: 0.65, wordBreak: 'break-all' }}>{sample.file}</div>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                      <button
                                        type="button"
                                        onClick={() => handlePreviewButtonSample(sample.file)}
                                        disabled={!sfxEnabledSetting || !currentButtonPackMeta?.unlocked}
                                        className="data-button"
                                        style={{ flex: 1, minWidth: '100px', display: 'flex', justifyContent: 'center', gap: '6px' }}
                                      >
                                        Preview
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleSelectButtonSample(sample.file)}
                                        disabled={!sfxEnabledSetting || !currentButtonPackMeta?.unlocked || isSelected}
                                        className="data-button"
                                        style={{
                                          flex: 1,
                                          minWidth: '120px',
                                          background: isSelected ? 'var(--accent-primary)' : 'var(--button-primary-bg)',
                                          color: 'var(--button-primary-text)',
                                          opacity: isSelected ? 0.85 : 1
                                        }}
                                      >
                                        {isSelected ? 'Selected' : 'Use this sample'}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="setting-item">
                      <label>SFX Volume: {Math.round(sfxVolume * 100)}%</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={sfxVolume}
                        onChange={(e) => handleSfxVolumeChange(parseFloat(e.target.value))}
                        disabled={!sfxEnabledSetting}
                        style={{ width: '100%' }}
                      />
                      <p style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Music2 size={14} /> Crisp UI clicks paired with ambient loops.
                      </p>
                    </div>
                  </div>
                </div>
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
                          <label>🏆 Achievement unlocked</label>
                          <div className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={achievementNotifications}
                              onChange={(e) => setAchievementNotifications(e.target.checked)}
                              id="achievement-notifications"
                            />
                            <label htmlFor="achievement-notifications" className="toggle-slider"></label>
                          </div>
                        </div>

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
                subtitle="Clear, export, import, and reset your local settings data."
                badge="Local backup"
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
                    <button onClick={clearCache} className="data-button clear">
                      <Trash2 size={16} />
                      Clear Cache
                    </button>
                    <button onClick={exportSettings} className="data-button export">
                      <Download size={16} />
                      Export Settings
                    </button>
                    <label className="data-button import">
                      <Upload size={16} />
                      Import Settings
                      <input type="file" accept=".json" onChange={importSettings} style={{ display: 'none' }} />
                    </label>
                    <button onClick={resetSettings} className="data-button reset">
                      <AlertCircle size={16} />
                      Reset All
                    </button>
                  </div>
                  </div>
                </div>
              </CollapsibleSection>

              {/* Patreon Supporter Section */}
              <CollapsibleSection
                title="Support GamePilot"
                subtitle="Patreon support links plus optional XP boost code activation."
                badge="XP boost"
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
                    <p>Support GamePilot development on Patreon and activate optional XP boost perks.</p>
                    <p>Enter your Patreon code to apply an XP multiplier to your progression.</p>
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
                  <div className="patreon-links">
                    <button 
                      onClick={() => window.open('https://www.patreon.com/gamepilot', '_blank')}
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
