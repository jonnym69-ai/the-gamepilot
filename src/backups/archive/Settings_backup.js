import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Palette, Bell, Database, Download, Upload, Trash2, Save, AlertCircle, Heart, MessageSquare, Mail, Twitter } from 'lucide-react';
import { useToast } from './components/Toast';
import { useTheme } from './ThemeContext';
import NavBar from './NavBar';
import { AchievementTracker } from './AchievementSystem';
import './Settings.css';

function Settings() {
  const { currentTheme, setTheme, availableThemes } = useTheme();
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
  const [activationCode, setActivationCode] = useState('');
  const [activationResult, setActivationResult] = useState(null);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const { success, error: toastError } = useToast();

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
  }, []);

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

  const handleActivationCode = () => {
    if (!activationCode.trim()) {
      setActivationResult({ success: false, message: 'Please enter an activation code' });
      return;
    }

    const result = AchievementTracker.unlockByActivationCode(activationCode.trim());
    setActivationResult(result);
    
    if (result.success) {
      success(result.message);
      setActivationCode(''); // Clear the input after successful activation
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

          <div className="settings-grid">
          {/* Basic Settings Section */}
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

          {/* Appearance Section */}
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
                      role="button"
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
                  <select 
                    value={currentTheme} 
                    onChange={(e) => {
                      setTheme(e.target.value);
                      AchievementTracker.trackFeatureUsage('theme_changes');
                    }} 
                    className="settings-select theme-dropdown-override"
                  >
                    {Object.entries(availableThemes).map(([themeId, themeInfo]) => (
                      <option key={themeId} value={themeId}>
                        {themeInfo.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
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

          {/* Preferences Section */}
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

          {/* Data Management Section */}
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
        </div>

        {/* Contact & Feedback Section */}
        <div className="settings-section contact-section">
          <div className="section-header">
            <MessageSquare size={20} />
            <h2>Contact & Feedback</h2>
          </div>
          <div className="contact-settings">
            <div className="contact-content">
              <h3>Get in Touch</h3>
              <p>Have questions, suggestions, or found a bug? We'd love to hear from you!</p>
              
              <div className="contact-info">
                <h4>Contact Us Directly</h4>
                <div className="contact-links">
                  <div className="contact-option">
                    <Mail size={16} />
                    <a href="mailto:gamepilot91@hotmail.com">gamepilot91@hotmail.com</a>
                  </div>
                  <div className="contact-option">
                    <Twitter size={16} />
                    <a href="https://twitter.com/gamepilot" target="_blank" rel="noopener noreferrer">@gamepilot</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Legal & Disclaimer Section */}
          <div className="settings-section">
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
                  <button onClick={() => window.open('#', '_blank')} className="legal-button">
                    View Full License
                  </button>
                  <button onClick={() => window.open('#', '_blank')} className="legal-button">
                    Privacy Policy
                  </button>
                  <button onClick={() => window.open('#', '_blank')} className="legal-button">
                    Terms of Service
                  </button>
                </div>
                
                <div className="copyright-notice">
                  <p><strong>Copyright Notice:</strong></p>
                  <p>© 2026 Moz. All rights reserved.</p>
                  <p>GamePilot is not affiliated with Steam, Epic Games, Microsoft, Sony, Nintendo, or any game publishers.</p>
                  <p>All game titles, logos, and images are trademarks of their respective owners.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Patreon Supporter Section */}
          <div className="settings-section">
            <div className="section-header">
              <Heart size={20} />
              <h2>Support GamePilot</h2>
            </div>
            <div className="patreon-section">
              <div className="patreon-info">
                <p>Support GamePilot development on Patreon and unlock exclusive rewards!</p>
                <p>Enter your activation code to claim your Patreon Supporter achievement (10,000 XP).</p>
              </div>
              <div className="activation-code-section">
                <div className="setting-item">
                  <label>Activation Code</label>
                  <div className="activation-input-group">
                    <input
                      type="text"
                      placeholder="Enter your Patreon activation code"
                      value={activationCode}
                      onChange={(e) => setActivationCode(e.target.value)}
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
                      onClick={handleActivationCode}
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

        {/* Save Button */}
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
