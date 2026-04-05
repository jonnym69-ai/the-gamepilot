import React, { useMemo, useRef, useState } from 'react';
import { Download, FileText, FolderUp, Image as ImageIcon, Link as LinkIcon, RefreshCcw, Settings as SettingsIcon, Share2, Trash2, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import NavBar from './NavBar';
import ExportModal from './components/ExportModal';
import CinematicExport from './components/CinematicExport';
import { useToast } from './components/Toast';
import { DataExportService } from './services/DataExportService';
import { DataManager } from './DataManager';
import { LocalShareService } from './services/LocalShareService';
import { YearInReviewService } from './services/YearInReviewService';
import { getEmptyLibraryFallback } from './services/EmptyLibraryFallbackData';
import { ProgressionUnlockService } from './services/ProgressionUnlockService';

const shellStyle = {
  minHeight: '100vh',
  padding: '24px',
  color: 'var(--text-primary, var(--text))'
};

const heroStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '16px',
  alignItems: 'flex-start',
  flexWrap: 'wrap',
  marginBottom: '24px'
};

const cardGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '16px'
};

const cardStyle = {
  background: 'var(--card-bg, var(--card))',
  border: '1px solid var(--border-color)',
  borderRadius: '16px',
  padding: '18px',
  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.12)'
};

const buttonRowStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '10px',
  marginTop: '14px'
};

const buttonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  borderRadius: '10px',
  border: '1px solid var(--border-color)',
  background: 'var(--bg-secondary, rgba(255,255,255,0.04))',
  color: 'var(--text-primary, var(--text))',
  padding: '10px 14px',
  cursor: 'pointer'
};

const dangerButtonStyle = {
  ...buttonStyle,
  border: '1px solid rgba(255, 99, 132, 0.35)'
};

const summaryGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: '12px',
  marginTop: '16px',
  marginBottom: '20px'
};

const statCardStyle = {
  background: 'var(--bg-secondary, rgba(255,255,255,0.04))',
  borderRadius: '12px',
  padding: '12px 14px',
  border: '1px solid var(--border-color)'
};

const getFallbackLibrary = () => {
  const fallback = getEmptyLibraryFallback('Home');
  return Array.isArray(fallback?.sampleGames) ? fallback.sampleGames : [];
};

function ExportHub({ library = [], theme }) {
  const { success, error } = useToast();
  const navigate = useNavigate();
  const settingsImportRef = useRef(null);
  const backupImportRef = useRef(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCinematicExportOpen, setIsCinematicExportOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());

  const rewardSummary = useMemo(() => ProgressionUnlockService.getRewardCatalogSummary(), []);
  const safeLibrary = useMemo(() => (Array.isArray(library) && library.length > 0 ? library : getFallbackLibrary()), [library]);
  const availableYears = useMemo(() => YearInReviewService.getAvailableYears(safeLibrary), [safeLibrary]);
  const resolvedYear = availableYears.includes(selectedYear) ? selectedYear : (availableYears[0] || new Date().getFullYear());
  const yearSnapshot = useMemo(() => YearInReviewService.getYearSnapshot(safeLibrary, resolvedYear), [safeLibrary, resolvedYear]);
  const shareText = useMemo(() => LocalShareService.buildYearInReviewShareText(yearSnapshot, resolvedYear), [yearSnapshot, resolvedYear]);
  const backupSummary = useMemo(() => DataExportService.getBackupSummary(library || []), [library]);

  const handleBackupExport = async () => {
    try {
      await DataManager.downloadUserData();
      success('Backup exported successfully.');
    } catch (err) {
      error(`Backup export failed: ${err.message}`);
    }
  };

  const handleBackupImport = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      try {
        const payload = loadEvent?.target?.result;
        const validation = DataManager.validateBackupFile(payload);
        if (!validation.valid) {
          error(validation.message);
          return;
        }

        const result = DataManager.importUserData(payload);
        if (!result.success) {
          error(result.message);
          return;
        }

        success('Backup imported successfully. Reloading...');
        window.setTimeout(() => window.location.reload(), 1200);
      } catch (err) {
        error(`Backup import failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleClearAllData = () => {
    if (!window.confirm('Are you sure you want to clear all local GamePilot data? This cannot be undone.')) {
      return;
    }

    const result = DataManager.clearAllUserData();
    if (!result.success) {
      error(result.message);
      return;
    }

    success('All local data cleared. Reloading...');
    window.setTimeout(() => window.location.reload(), 1200);
  };

  const handleSettingsExport = () => {
    try {
      const settings = {
        dateFormat: localStorage.getItem('dateFormat') || 'DD/MM/YYYY',
        timeFormat: localStorage.getItem('timeFormat') || '24-hour',
        timezone: localStorage.getItem('timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone,
        theme: localStorage.getItem('gamepilot-theme') || theme || 'dark',
        autoTheme: localStorage.getItem('autoTheme') === 'true',
        notificationsEnabled: localStorage.getItem('notificationsEnabled') !== 'false',
        achievementNotifications: localStorage.getItem('achievementNotifications') !== 'false',
        gameLaunchNotifications: localStorage.getItem('gameLaunchNotifications') !== 'false',
        dailySummaryNotifications: localStorage.getItem('dailySummaryNotifications') === 'true',
        scanCompleteNotifications: localStorage.getItem('scanCompleteNotifications') !== 'false',
        backupReminders: localStorage.getItem('backupReminders') === 'true',
        cacheEnabled: localStorage.getItem('cacheEnabled') !== 'false',
        rewardPresentationCustomization: ProgressionUnlockService.getRewardPresentationCustomization(),
        exportDate: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
      DataExportService.downloadFile(blob, `gamepilot-settings-${new Date().toISOString().split('T')[0]}.json`);
      success('Settings exported successfully.');
    } catch (err) {
      error(`Settings export failed: ${err.message}`);
    }
  };

  const handleSettingsImport = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      try {
        const settings = JSON.parse(loadEvent?.target?.result);
        const persist = (key, value) => {
          if (typeof value !== 'undefined') {
            localStorage.setItem(key, String(value));
          }
        };

        persist('dateFormat', settings.dateFormat);
        persist('timeFormat', settings.timeFormat);
        persist('timezone', settings.timezone);
        persist('gamepilot-theme', settings.theme);
        persist('autoTheme', settings.autoTheme);
        persist('notificationsEnabled', settings.notificationsEnabled);
        persist('achievementNotifications', settings.achievementNotifications);
        persist('gameLaunchNotifications', settings.gameLaunchNotifications);
        persist('dailySummaryNotifications', settings.dailySummaryNotifications);
        persist('scanCompleteNotifications', settings.scanCompleteNotifications);
        persist('backupReminders', settings.backupReminders);
        persist('cacheEnabled', settings.cacheEnabled);

        if (settings.rewardPresentationCustomization && typeof settings.rewardPresentationCustomization === 'object') {
          ProgressionUnlockService.updateRewardPresentationCustomization(settings.rewardPresentationCustomization);
        }

        success('Settings imported successfully. Reloading...');
        window.setTimeout(() => window.location.reload(), 1200);
      } catch (err) {
        error('Invalid settings file.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleCopyYearShare = async () => {
    const copied = await LocalShareService.copyTextToClipboard(shareText);
    if (copied) {
      success('Year in Review share text copied.');
      return;
    }
    error('Could not copy share text.');
  };

  const handleDownloadYearShare = () => {
    const result = LocalShareService.downloadShareText(shareText, `gamepilot-year-in-review-${resolvedYear}-share.txt`);
    if (result) {
      success('Year in Review share text downloaded.');
      return;
    }
    error('Could not download share text.');
  };

  const handleOpenShareChannel = async (channel) => {
    const result = await LocalShareService.openShareIntent(channel, shareText);
    if (result.success) {
      success(`${result.label} share opened.`);
      return;
    }
    error(result.message || 'Could not open share link.');
  };

  return (
    <div style={shellStyle}>
      <NavBar />
      <div style={heroStyle}>
        <div>
          <div className="confidence-badge">Local-first export center</div>
          <h1 style={{ margin: '12px 0 8px' }}>Export, Import & Share</h1>
          <p style={{ margin: 0, maxWidth: '760px', opacity: 0.82 }}>
            Keep backups safe, move settings cleanly, export your library in multiple formats, and share your GamePilot recap from one place.
          </p>
        </div>
        <button type="button" style={buttonStyle} onClick={() => navigate('/year-in-review')} title="Open the full recap page with visuals and exports">
          <RefreshCcw size={16} />
          <span>Open Year in Review</span>
        </button>
      </div>

      <div style={summaryGridStyle}>
        <div style={statCardStyle}>
          <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Library Size</div>
          <strong style={{ fontSize: '1.2rem' }}>{Array.isArray(library) ? library.length : 0}</strong>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Unlocked Rewards</div>
          <strong style={{ fontSize: '1.2rem' }}>{rewardSummary?.totals?.unlocked || 0}</strong>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Achievements</div>
          <strong style={{ fontSize: '1.2rem' }}>{backupSummary?.unlockedAchievements || 0}</strong>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Tracked Playtime</div>
          <strong style={{ fontSize: '1.2rem' }}>{backupSummary?.totalPlaytimeHours || '0.0'}h</strong>
        </div>
      </div>

      <div style={cardGridStyle}>
        <section style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Full Backup</h2>
          <p style={{ opacity: 0.8 }}>Export or restore your full local GamePilot state, including progression, profile, rewards, and usage history.</p>
          <div style={buttonRowStyle}>
            <button type="button" style={buttonStyle} onClick={handleBackupExport} title="Download a full local backup including progression and profile data">
              <Download size={16} />
              <span>Export Backup</span>
            </button>
            <button type="button" style={buttonStyle} onClick={() => backupImportRef.current?.click()} title="Restore a previously exported full GamePilot backup">
              <Upload size={16} />
              <span>Import Backup</span>
            </button>
            <button type="button" style={dangerButtonStyle} onClick={handleClearAllData} title="Erase all local GamePilot data on this device">
              <Trash2 size={16} />
              <span>Clear All Data</span>
            </button>
          </div>
          <input ref={backupImportRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleBackupImport} />
        </section>

        <section style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Settings</h2>
          <p style={{ opacity: 0.8 }}>Move preference-only data separately when you just want themes, audio, notifications, and presentation setup.</p>
          <div style={buttonRowStyle}>
            <button type="button" style={buttonStyle} onClick={handleSettingsExport} title="Export only preferences like theme, notifications, and presentation setup">
              <SettingsIcon size={16} />
              <span>Export Settings</span>
            </button>
            <button type="button" style={buttonStyle} onClick={() => settingsImportRef.current?.click()} title="Import preference-only settings without replacing the whole backup">
              <FolderUp size={16} />
              <span>Import Settings</span>
            </button>
          </div>
          <input ref={settingsImportRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleSettingsImport} />
        </section>

        <section style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Library Exports</h2>
          <p style={{ opacity: 0.8 }}>Export your library as raw local data, CSV, or a more visual showcase using the existing poster/export surfaces.</p>
          <div style={buttonRowStyle}>
            <button type="button" style={buttonStyle} onClick={() => {
              DataExportService.exportLibraryAsJSON(library || []);
              success('Library JSON exported.');
            }} title="Export your library as structured local JSON data">
              <FileText size={16} />
              <span>Export JSON</span>
            </button>
            <button type="button" style={buttonStyle} onClick={() => {
              const exported = DataExportService.exportLibraryAsCSV(library || []);
              if (exported) {
                success('Library CSV exported.');
              } else {
                error('Library CSV export failed.');
              }
            }} title="Export your library as CSV for spreadsheets or external analysis">
              <Download size={16} />
              <span>Export CSV</span>
            </button>
            <button type="button" style={buttonStyle} onClick={() => setIsExportModalOpen(true)} title="Open the richer visual library showcase exporter">
              <ImageIcon size={16} />
              <span>Open Showcase Export</span>
            </button>
            <button type="button" style={buttonStyle} onClick={() => setIsCinematicExportOpen(true)} title="Open the cinematic poster generator for a stylized share image">
              <ImageIcon size={16} />
              <span>Open Cinematic Poster</span>
            </button>
          </div>
        </section>

        <section style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Year in Review Share</h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label>
              <span style={{ display: 'block', fontSize: '0.8rem', opacity: 0.7, marginBottom: '6px' }}>Recap year</span>
              <select value={resolvedYear} onChange={(event) => setSelectedYear(Number(event.target.value))} style={{ ...buttonStyle, padding: '10px 12px' }}>
                {availableYears.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </label>
          </div>
          <p style={{ opacity: 0.8, whiteSpace: 'pre-line', marginTop: '14px' }}>{shareText}</p>
          <div style={buttonRowStyle}>
            <button type="button" style={buttonStyle} onClick={handleCopyYearShare} title="Copy your recap summary text to the clipboard">
              <Share2 size={16} />
              <span>Copy Share Text</span>
            </button>
            <button type="button" style={buttonStyle} onClick={handleDownloadYearShare} title="Download your recap summary as a plain text file">
              <FileText size={16} />
              <span>Download Share Text</span>
            </button>
            <button type="button" style={buttonStyle} onClick={() => {
              const payload = YearInReviewService.buildExportPayload(safeLibrary, resolvedYear);
              const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
              DataExportService.downloadFile(blob, `gamepilot-year-in-review-${resolvedYear}.json`);
              success(`Year in Review JSON exported for ${resolvedYear}.`);
            }} title="Export the full structured Year in Review data for the selected year">
              <Download size={16} />
              <span>Export Review JSON</span>
            </button>
          </div>
          <div style={buttonRowStyle}>
            {LocalShareService.getSupportedChannels().map((channel) => (
              <button key={channel.id} type="button" style={buttonStyle} onClick={() => handleOpenShareChannel(channel.id)} title={`Open a ${channel.label} share intent with your current recap text`}>
                <LinkIcon size={16} />
                <span>Share to {channel.label}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {isExportModalOpen && (
        <ExportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} library={library || []} theme={theme} />
      )}
      {isCinematicExportOpen && (
        <CinematicExport isOpen={isCinematicExportOpen} onClose={() => setIsCinematicExportOpen(false)} library={library || []} theme={theme} />
      )}
    </div>
  );
}

export default ExportHub;
