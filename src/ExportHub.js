import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Download, FileText, Filter, Image as ImageIcon, Link as LinkIcon, RefreshCcw, Share2, Trash2, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import NavBar from './NavBar';
import ExportModal from './components/ExportModal';
import CinematicExport from './components/CinematicExport';
import { useToast } from './components/Toast';
import { DataExportService } from './services/DataExportService';
import { DataManager } from './DataManager';
import { LocalShareService } from './services/LocalShareService';
import { ProfileService } from './services/ProfileService';
import { YearInReviewService } from './services/YearInReviewService';
import { getEmptyLibraryFallback } from './services/EmptyLibraryFallbackData';
import { ProgressionUnlockService } from './services/ProgressionUnlockService';
import { LibraryShareCard, LIBRARY_SHARE_CARD_SIZE_PX } from './components/LibraryShareCard';
import { YearInReviewShareCard, SHARE_CARD_SIZE_PX as YIR_CARD_SIZE_PX } from './components/YearInReviewShareCard';
import { ShareCaptionDialog } from './components/ShareCaptionDialog';
import './ExportHub.css';

const getFallbackLibrary = () => {
  const fallback = getEmptyLibraryFallback('Home');
  return Array.isArray(fallback?.sampleGames) ? fallback.sampleGames : [];
};

function ExportHub({ library = [], theme }) {
  const { success, error } = useToast();
  const navigate = useNavigate();
  const backupImportRef = useRef(null);
  const filteredShareCardRef = useRef(null);
  const yearInReviewShareCardRef = useRef(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCinematicExportOpen, setIsCinematicExportOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [editShare, setEditShare] = useState(null);
  const [recapCustomization] = useState(() => ProgressionUnlockService.getRecapCustomization?.() || { palette: null, visibleStats: {} });
  const username = useMemo(() => ProfileService.getCurrentUsername(), []);
  const [exportOptions, setExportOptions] = useState(() => {
    const customization = ProgressionUnlockService.getExportFilterCustomization();
    return {
      dateRange: customization.defaultDateRange,
      fields: customization.defaultFields,
      platforms: [],
      selectedGames: [],
      hasPlaytime: false,
      includePrices: customization.includePrices,
      includePlaytime: customization.includePlaytime
    };
  });

  const rewardSummary = useMemo(() => ProgressionUnlockService.getRewardCatalogSummary(), []);
  const safeLibrary = useMemo(() => (Array.isArray(library) && library.length > 0 ? library : getFallbackLibrary()), [library]);
  const availableYears = useMemo(() => YearInReviewService.getAvailableYears(safeLibrary), [safeLibrary]);
  const resolvedYear = availableYears.includes(selectedYear) ? selectedYear : (availableYears[0] || new Date().getFullYear());
  const yearSnapshot = useMemo(() => YearInReviewService.getYearSnapshot(safeLibrary, resolvedYear), [safeLibrary, resolvedYear]);
  const shareText = useMemo(() => LocalShareService.buildYearInReviewShareText(yearSnapshot, resolvedYear), [yearSnapshot, resolvedYear]);
  const backupSummary = useMemo(() => DataExportService.getBackupSummary(library || []), [library]);
  const filteredLibrary = useMemo(() => DataExportService.applyExportFilters(safeLibrary, exportOptions), [safeLibrary, exportOptions]);
  const filteredCount = filteredLibrary.length;

  const isExportFilterUnlocked = (filterId) => ProgressionUnlockService.isExportFilterUnlocked(filterId);

  const handleExportOptionChange = (key, value) => {
    setExportOptions((prev) => ({ ...prev, [key]: value }));
  };

  const handleExportFilteredCSV = () => {
    const exported = DataExportService.exportLibraryWithFiltersAsCSV(safeLibrary, exportOptions);
    if (exported) {
      success(`Filtered CSV exported (${filteredCount} games).`);
    } else {
      error('Filtered CSV export failed.');
    }
  };

  const generateFilteredRecapBlob = useCallback(async () => {
    if (!filteredShareCardRef.current) {
      error('Could not generate filtered recap image.');
      return null;
    }
    const canvas = await html2canvas(filteredShareCardRef.current, {
      scale: 1,
      width: LIBRARY_SHARE_CARD_SIZE_PX,
      height: LIBRARY_SHARE_CARD_SIZE_PX,
      backgroundColor: null,
      logging: false,
      useCORS: true
    });
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  }, [error]);

  const handleExportFilteredImage = useCallback(async () => {
    const blob = await generateFilteredRecapBlob();
    if (!blob) {
      error('Could not render filtered recap image.');
      return false;
    }
    const date = new Date().toISOString().split('T')[0];
    const filename = `gamepilot-filtered-recap-${exportOptions.dateRange}-${date}.png`;
    DataExportService.downloadFile(blob, filename);
    success(`Filtered recap image saved (${filteredCount} games).`);
    return true;
  }, [generateFilteredRecapBlob, exportOptions.dateRange, filteredCount, error, success]);

  const handleCopyFilteredRecapImage = useCallback(async () => {
    const blob = await generateFilteredRecapBlob();
    if (!blob) {
      error('Could not render filtered recap image.');
      return;
    }
    const date = new Date().toISOString().split('T')[0];
    const filename = `gamepilot-filtered-recap-${exportOptions.dateRange}-${date}.png`;
    const result = await LocalShareService.copyImageToClipboard(blob, filename);
    if (result.success) {
      success(`Filtered recap image copied (${filteredCount} games).`);
    } else {
      error(result.message || 'Could not copy image.');
    }
  }, [generateFilteredRecapBlob, exportOptions.dateRange, filteredCount, success, error]);

  const handleShareFilteredRecapToDiscord = useCallback(async (text = null) => {
    const blob = await generateFilteredRecapBlob();
    const date = new Date().toISOString().split('T')[0];
    const filename = `gamepilot-filtered-recap-${exportOptions.dateRange}-${date}.png`;
    const shareText = text || LocalShareService.buildLibraryShareText(filteredLibrary, username, 'all');
    const result = await LocalShareService.shareToDiscord({ imageBlob: blob, text: shareText, filename });
    if (result.success) {
      success(result.imageStaged
        ? 'Discord opened — your filtered recap image and caption are copied, just paste them in.'
        : 'Discord opened — caption copied, image saved to attach.');
    } else {
      error(result.message || 'Could not share to Discord.');
    }
  }, [generateFilteredRecapBlob, exportOptions.dateRange, filteredLibrary, username, success, error]);

  const handleShareFilteredRecapToMessenger = useCallback(async (text = null) => {
    const blob = await generateFilteredRecapBlob();
    const date = new Date().toISOString().split('T')[0];
    const filename = `gamepilot-filtered-recap-${exportOptions.dateRange}-${date}.png`;
    const shareText = text || LocalShareService.buildLibraryShareText(filteredLibrary, username, 'all');
    const result = await LocalShareService.shareToMessenger({ imageBlob: blob, text: shareText, filename });
    if (result.success) {
      success(result.imageStaged
        ? 'Messenger opened — your filtered recap image and caption are copied, just paste them in.'
        : 'Messenger opened — caption copied, image saved to attach.');
    } else {
      error(result.message || 'Could not share to Messenger.');
    }
  }, [generateFilteredRecapBlob, exportOptions.dateRange, filteredLibrary, username, success, error]);

  const handleShareFilteredRecapToChannel = useCallback(async (channel, text = null) => {
    const shareText = text || LocalShareService.buildLibraryShareText(filteredLibrary, username, 'all');
    let imageStaged = false;
    if (LocalShareService.canCopyImage()) {
      try {
        const blob = await generateFilteredRecapBlob();
        if (blob) {
          const date = new Date().toISOString().split('T')[0];
          const filename = `gamepilot-filtered-recap-${exportOptions.dateRange}-${date}.png`;
          const copyResult = await LocalShareService.copyImageToClipboard(blob, filename);
          imageStaged = copyResult.success;
        }
      } catch (err) {
        imageStaged = false;
      }
    }

    const result = await LocalShareService.openShareIntent(channel, shareText);
    if (result.success) {
      if (imageStaged) {
        success(`${result.label} opened — your filtered recap image is copied, just paste it into the post.`);
      } else {
        success(`${result.label} share opened.`);
      }
    } else {
      error(result.message || 'Could not open share link.');
    }
  }, [generateFilteredRecapBlob, exportOptions.dateRange, filteredLibrary, username, success, error]);

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

  const generateYearInReviewBlob = useCallback(async () => {
    if (!yearInReviewShareCardRef.current) {
      error('Could not generate Year in Review share image.');
      return null;
    }
    const canvas = await html2canvas(yearInReviewShareCardRef.current, {
      width: YIR_CARD_SIZE_PX,
      height: YIR_CARD_SIZE_PX,
      scale: 1,
      useCORS: true,
      backgroundColor: '#0d1224',
      logging: false
    });
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  }, [error]);

  const handleSaveYearInReviewImage = useCallback(async () => {
    const blob = await generateYearInReviewBlob();
    if (!blob) return;
    const filename = `gamepilot-year-in-review-${resolvedYear}.png`;
    DataExportService.downloadFile(blob, filename);
    success(`Year in Review image saved.`);
  }, [generateYearInReviewBlob, resolvedYear, success]);

  const handleCopyYearInReviewImage = useCallback(async () => {
    const blob = await generateYearInReviewBlob();
    if (!blob) return;
    const filename = `gamepilot-year-in-review-${resolvedYear}.png`;
    const result = await LocalShareService.copyImageToClipboard(blob, filename);
    if (result.success) {
      success('Year in Review image copied to clipboard.');
    } else {
      error(result.message || 'Could not copy image.');
    }
  }, [generateYearInReviewBlob, resolvedYear, success, error]);

  const handleShareYearInReviewToDiscord = useCallback(async (text = null) => {
    const blob = await generateYearInReviewBlob();
    const filename = `gamepilot-year-in-review-${resolvedYear}.png`;
    const caption = text || shareText;
    const result = await LocalShareService.shareToDiscord({ imageBlob: blob, text: caption, filename });
    if (result.success) {
      success(result.imageStaged
        ? 'Discord opened — your Year in Review image and caption are copied, just paste them in.'
        : 'Discord opened — caption copied, image saved to attach.');
    } else {
      error(result.message || 'Could not share to Discord.');
    }
  }, [generateYearInReviewBlob, resolvedYear, shareText, success, error]);

  const handleShareYearInReviewToMessenger = useCallback(async (text = null) => {
    const blob = await generateYearInReviewBlob();
    const filename = `gamepilot-year-in-review-${resolvedYear}.png`;
    const caption = text || shareText;
    const result = await LocalShareService.shareToMessenger({ imageBlob: blob, text: caption, filename });
    if (result.success) {
      success(result.imageStaged
        ? 'Messenger opened — your Year in Review image and caption are copied, just paste them in.'
        : 'Messenger opened — caption copied, image saved to attach.');
    } else {
      error(result.message || 'Could not share to Messenger.');
    }
  }, [generateYearInReviewBlob, resolvedYear, shareText, success, error]);

  const handleShareYearInReviewToChannel = useCallback(async (channel, text = null) => {
    const caption = text || shareText;
    let imageStaged = false;
    if (LocalShareService.canCopyImage()) {
      try {
        const blob = await generateYearInReviewBlob();
        if (blob) {
          const filename = `gamepilot-year-in-review-${resolvedYear}.png`;
          const copyResult = await LocalShareService.copyImageToClipboard(blob, filename);
          imageStaged = copyResult.success;
        }
      } catch (err) {
        imageStaged = false;
      }
    }

    const result = await LocalShareService.openShareIntent(channel, caption);
    if (result.success) {
      if (imageStaged) {
        success(`${result.label} opened — your Year in Review image is copied, just paste it into the post.`);
      } else {
        success(`${result.label} share opened.`);
      }
    } else {
      error(result.message || 'Could not open share link.');
    }
  }, [generateYearInReviewBlob, resolvedYear, shareText, success, error]);

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
          <h2>
            <Filter size={18} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
            Export Filters
          </h2>
          <p>Slice and dice your library before exporting. Filters unlock free as you earn XP.</p>
          <div className="export-hub-filter-row">
            <label className="export-hub-filter-label">
              <span>Date range</span>
              <select
                className="export-hub-btn export-hub-filter-select"
                value={exportOptions.dateRange}
                onChange={(event) => handleExportOptionChange('dateRange', event.target.value)}
                disabled={!isExportFilterUnlocked('date_filter')}
              >
                <option value="all">All time</option>
                <option value="last7days">Last 7 days</option>
                <option value="last30days">Last 30 days</option>
                <option value="last90days">Last 90 days</option>
                <option value="lastYear">Last year</option>
              </select>
              {!isExportFilterUnlocked('date_filter') && <span className="export-hub-lock-badge">XP Lock</span>}
            </label>

            <label className="export-hub-filter-label">
              <span>Fields</span>
              <select
                className="export-hub-btn export-hub-filter-select"
                value={exportOptions.fields}
                onChange={(event) => handleExportOptionChange('fields', event.target.value)}
                disabled={!isExportFilterUnlocked('stats_only')}
              >
                <option value="full">Full</option>
                <option value="standard">Standard</option>
                <option value="minimal">Stats only</option>
              </select>
              {!isExportFilterUnlocked('stats_only') && <span className="export-hub-lock-badge">XP Lock</span>}
            </label>

            <label className="export-hub-filter-label export-hub-filter-checkbox">
              <input
                type="checkbox"
                checked={exportOptions.hasPlaytime}
                onChange={(event) => handleExportOptionChange('hasPlaytime', event.target.checked)}
              />
              <span>Only games with playtime</span>
            </label>
          </div>

          <div className="export-hub-filter-summary">
            <span>{filteredCount} game{filteredCount !== 1 ? 's' : ''} match the current filters</span>
          </div>

          <div className="export-hub-btn-row">
            <button type="button" className="export-hub-btn" onClick={handleExportFilteredImage} title="Export a shareable recap image of the filtered library">
              <ImageIcon size={16} />
              <span>Export Filtered Recap Image</span>
            </button>
            <button type="button" className="export-hub-btn" onClick={handleCopyFilteredRecapImage} title="Copy the filtered recap image to the clipboard">
              <ImageIcon size={16} />
              <span>Copy Recap Image</span>
            </button>
            <button type="button" className="export-hub-btn" onClick={handleExportFilteredCSV} title="Export filtered library as a viewable spreadsheet">
              <Download size={16} />
              <span>Export Filtered Spreadsheet</span>
            </button>
          </div>
          <div className="export-hub-btn-row">
            {LocalShareService.getSupportedChannels().map((channel) => (
              <button
                key={channel.id}
                type="button"
                className="export-hub-btn"
                onClick={() => {
                  setEditShare({
                    channel,
                    caption: LocalShareService.buildLibraryShareText(filteredLibrary, username, 'all'),
                    onShare: (text) => {
                      if (channel.id === 'discord') {
                        handleShareFilteredRecapToDiscord(text);
                      } else if (channel.id === 'messenger') {
                        handleShareFilteredRecapToMessenger(text);
                      } else {
                        handleShareFilteredRecapToChannel(channel.id, text);
                      }
                    }
                  });
                }}
                title={`Open a ${channel.label} share intent with your filtered library recap`}
              >
                <LinkIcon size={16} />
                <span>Share to {channel.label}</span>
              </button>
            ))}
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
            <button type="button" className="export-hub-btn" onClick={handleCopyYearInReviewImage} title="Copy your Year in Review recap image to the clipboard">
              <ImageIcon size={16} />
              <span>Copy Recap Image</span>
            </button>
            <button type="button" className="export-hub-btn" onClick={handleSaveYearInReviewImage} title="Download your Year in Review recap image">
              <Download size={16} />
              <span>Save Recap Image</span>
            </button>
          </div>
          <div className="export-hub-btn-row">
            {LocalShareService.getSupportedChannels().map((channel) => (
              <button
                key={channel.id}
                type="button"
                className="export-hub-btn"
                onClick={() => {
                  setEditShare({
                    channel,
                    caption: shareText,
                    onShare: (text) => {
                      if (channel.id === 'discord') {
                        handleShareYearInReviewToDiscord(text);
                      } else if (channel.id === 'messenger') {
                        handleShareYearInReviewToMessenger(text);
                      } else {
                        handleShareYearInReviewToChannel(channel.id, text);
                      }
                    }
                  });
                }}
                title={`Open a ${channel.label} share intent with your Year in Review recap`}
              >
                <LinkIcon size={16} />
                <span>Share to {channel.label}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <div
        ref={filteredShareCardRef}
        style={{
          position: 'fixed',
          top: -10000,
          left: -10000,
          width: LIBRARY_SHARE_CARD_SIZE_PX,
          height: LIBRARY_SHARE_CARD_SIZE_PX,
          pointerEvents: 'none',
          zIndex: -1
        }}
      >
        <LibraryShareCard
          library={filteredLibrary}
          username={username}
          period="all"
          theme={recapCustomization.palette}
          visibleStats={recapCustomization.visibleStats}
        />
      </div>

      <div
        ref={yearInReviewShareCardRef}
        style={{
          position: 'fixed',
          top: -10000,
          left: -10000,
          pointerEvents: 'none',
          zIndex: -1
        }}
      >
        <YearInReviewShareCard snapshot={yearSnapshot} year={resolvedYear} username={username} />
      </div>

      {isExportModalOpen && (
        <ExportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} library={library || []} theme={theme} />
      )}
      {isCinematicExportOpen && (
        <CinematicExport isOpen={isCinematicExportOpen} onClose={() => setIsCinematicExportOpen(false)} library={library || []} theme={theme} />
      )}

      <ShareCaptionDialog
        isOpen={!!editShare}
        onClose={() => setEditShare(null)}
        channel={editShare?.channel}
        caption={editShare?.caption}
        onShare={(text) => {
          editShare?.onShare(text);
          setEditShare(null);
        }}
      />
    </div>
  );
}

export default ExportHub;
