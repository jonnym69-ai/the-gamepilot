import React, { useMemo, useRef, useState } from 'react';
import { Download, FileText, Image as ImageIcon, Link as LinkIcon, RefreshCcw, Share2, Trash2, Upload } from 'lucide-react';
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
import './ExportHub.css';

const getFallbackLibrary = () => {
  const fallback = getEmptyLibraryFallback('Home');
  return Array.isArray(fallback?.sampleGames) ? fallback.sampleGames : [];
};

function ExportHub({ library = [], theme }) {
  const { success, error } = useToast();
  const navigate = useNavigate();
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
    <div className="export-hub-page">
      <NavBar />
      <div className="export-hub-hero">
        <div>
          <div className="confidence-badge">Local-first export center</div>
          <h1>Export, Import & Share</h1>
          <p>
            Keep backups safe, export your library as a spreadsheet, and create visual recap/share assets from one place.
          </p>
        </div>
        <button type="button" className="export-hub-btn" onClick={() => navigate('/year-in-review')} title="Open the full recap page with visuals and exports">
          <RefreshCcw size={16} />
          <span>Open Year in Review</span>
        </button>
      </div>

      <div className="export-hub-summary">
        <div className="export-hub-stat">
          <div className="export-hub-stat-label">Library Size</div>
          <strong className="export-hub-stat-value">{Array.isArray(library) ? library.length : 0}</strong>
        </div>
        <div className="export-hub-stat">
          <div className="export-hub-stat-label">Unlocked Rewards</div>
          <strong className="export-hub-stat-value">{rewardSummary?.totals?.unlocked || 0}</strong>
        </div>
        <div className="export-hub-stat">
          <div className="export-hub-stat-label">Achievements</div>
          <strong className="export-hub-stat-value">{backupSummary?.unlockedAchievements || 0}</strong>
        </div>
        <div className="export-hub-stat">
          <div className="export-hub-stat-label">Tracked Playtime</div>
          <strong className="export-hub-stat-value">{backupSummary?.totalPlaytimeHours || '0.0'}h</strong>
        </div>
      </div>

      <div className="export-hub-grid">
        <section className="export-hub-card">
          <h2>Full Backup</h2>
          <p>Save or restore your complete local GamePilot profile, including library curation, progression, rewards, settings, and usage history.</p>
          <div className="export-hub-btn-row">
            <button type="button" className="export-hub-btn" onClick={handleBackupExport} title="Download a full local backup including progression and profile data">
              <Download size={16} />
              <span>Export Backup</span>
            </button>
            <button type="button" className="export-hub-btn" onClick={() => backupImportRef.current?.click()} title="Restore a previously exported full GamePilot backup">
              <Upload size={16} />
              <span>Import Backup</span>
            </button>
            <button type="button" className="export-hub-btn danger" onClick={handleClearAllData} title="Erase all local GamePilot data on this device">
              <Trash2 size={16} />
              <span>Clear All Data</span>
            </button>
          </div>
          <input ref={backupImportRef} type="file" accept=".json" className="export-hub-hidden-input" onChange={handleBackupImport} />
        </section>

        <section className="export-hub-card">
          <h2>Library Exports</h2>
          <p>Export your catalogue as a spreadsheet-friendly CSV or create visual showcase images and posters.</p>
          <div className="export-hub-btn-row">
            <button type="button" className="export-hub-btn" onClick={() => {
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
            <button type="button" className="export-hub-btn" onClick={() => setIsExportModalOpen(true)} title="Open the richer visual library showcase exporter">
              <ImageIcon size={16} />
              <span>Open Showcase Export</span>
            </button>
            <button type="button" className="export-hub-btn" onClick={() => setIsCinematicExportOpen(true)} title="Open the cinematic poster generator for a stylized share image">
              <ImageIcon size={16} />
              <span>Open Cinematic Poster</span>
            </button>
          </div>
        </section>

        <section className="export-hub-card">
          <h2>Year in Review Share</h2>
          <div className="export-hub-year-row">
            <label>
              <span className="export-hub-stat-label export-hub-year-label">Recap year</span>
              <select value={resolvedYear} onChange={(event) => setSelectedYear(Number(event.target.value))} className="export-hub-btn export-hub-year-select">
                {availableYears.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="export-hub-share-text">{shareText}</p>
          <div className="export-hub-btn-row">
            <button type="button" className="export-hub-btn" onClick={handleCopyYearShare} title="Copy your recap summary text to the clipboard">
              <Share2 size={16} />
              <span>Copy Share Text</span>
            </button>
            <button type="button" className="export-hub-btn" onClick={handleDownloadYearShare} title="Download your recap summary as a plain text file">
              <FileText size={16} />
              <span>Download Share Text</span>
            </button>
          </div>
          <div className="export-hub-btn-row">
            {LocalShareService.getSupportedChannels().map((channel) => (
              <button key={channel.id} type="button" className="export-hub-btn" onClick={() => handleOpenShareChannel(channel.id)} title={`Open a ${channel.label} share intent with your current recap text`}>
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
