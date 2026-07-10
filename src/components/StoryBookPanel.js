import React, { useCallback, useMemo, useState } from 'react';
import { Book, Download, Archive, AlertTriangle } from 'lucide-react';
import StoryArchiveService from '../services/StoryArchiveService';
import GamingStoryPanel from './GamingStoryPanel';
import './StoryBookPanel.css';

const LAYOUTS = [
  { id: 'yearly', label: '1 Chapter', hint: 'Year in review' },
  { id: 'weekly', label: '52 Chapters', hint: 'Weekly arc' },
  { id: 'monthly', label: '12 Chapters', hint: 'Monthly digest' },
  { id: 'seasonal', label: '4 Chapters', hint: 'Seasonal digest' }
];

const formatBytes = (bytes) => {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const downloadJson = (payload, filename) => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Year in Review "book" — assembles archived weekly chapters into a 52 / 12 / 4
 * chapter layout, and surfaces the 3-year rolling retention prompt so the user
 * can export, keep, or let the oldest year roll off. Never prunes silently.
 */
function StoryBookPanel() {
  const [layout, setLayout] = useState('weekly');
  const [retentionDismissed, setRetentionDismissed] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // refreshKey intentionally forces these to recompute after a prune.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const years = useMemo(() => StoryArchiveService.getYears(), [refreshKey]);
  const [selectedYear, setSelectedYear] = useState(() => StoryArchiveService.getYears()[0] || new Date().getFullYear());

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const retention = useMemo(() => StoryArchiveService.getRetentionStatus(), [refreshKey]);

  const book = useMemo(
    () => StoryArchiveService.getBook(selectedYear, layout),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedYear, layout, refreshKey]
  );

  const handleExportYear = useCallback((year) => {
    const payload = StoryArchiveService.exportYear(year);
    downloadJson(payload, `gamepilot-story-book-${year}.json`);
  }, []);

  const handleExportOldest = useCallback(() => {
    if (retention.oldestYear === null) return;
    handleExportYear(retention.oldestYear);
  }, [retention.oldestYear, handleExportYear]);

  const handleRollOff = useCallback(() => {
    if (retention.oldestYear === null) return;
    StoryArchiveService.pruneYear(retention.oldestYear);
    setRefreshKey((key) => key + 1);
    setRetentionDismissed(false);
  }, [retention.oldestYear]);

  if (years.length === 0) {
    return (
      <div className="story-book-panel story-book-panel--empty">
        <Book size={22} />
        <p>Your story book fills in as weekly chapters are generated. Keep playing and check back.</p>
      </div>
    );
  }

  return (
    <div className="story-book-panel">
      <div className="story-book-header">
        <div className="story-book-title">
          <Book size={20} />
          <h2>Your Gaming Story Book</h2>
        </div>
        <div className="story-book-controls">
          <label className="story-book-year">
            <span>Year</span>
            <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="story-book-export"
            onClick={() => handleExportYear(selectedYear)}
            title="Export this year's chapters"
          >
            <Download size={15} />
            <span>Export {selectedYear}</span>
          </button>
        </div>
      </div>

      <div className="story-book-layout-toggle">
        {LAYOUTS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`story-book-layout-btn ${layout === option.id ? 'active' : ''}`}
            onClick={() => setLayout(option.id)}
          >
            <span className="story-book-layout-label">{option.label}</span>
            <span className="story-book-layout-hint">{option.hint}</span>
          </button>
        ))}
      </div>

      {retention.pruningDue && !retentionDismissed && (
        <div className="story-book-retention">
          <div className="story-book-retention-copy">
            <AlertTriangle size={18} />
            <div>
              <strong>Your archive spans {retention.yearSpan} years.</strong>
              <p>
                GamePilot keeps {retention.retentionYears} years of chapters by default
                (~{formatBytes(retention.estimatedBytes)} stored). You decide what happens to
                {retention.oldestYear !== null ? ` ${retention.oldestYear}` : ' the oldest year'} — nothing is deleted automatically.
              </p>
            </div>
          </div>
          <div className="story-book-retention-actions">
            <button type="button" className="story-book-retention-export" onClick={handleExportOldest}>
              <Download size={14} /> Export &amp; keep
            </button>
            <button type="button" className="story-book-retention-keep" onClick={() => setRetentionDismissed(true)}>
              <Archive size={14} /> Keep in app
            </button>
            <button type="button" className="story-book-retention-rolloff" onClick={handleRollOff}>
              Let it roll off
            </button>
          </div>
        </div>
      )}

      <div className="story-book-chapters">
        {book.chapters.map((chapter, index) => (
          <div key={`${chapter.title || 'chapter'}-${index}`} className="story-book-chapter">
            <GamingStoryPanel story={chapter} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default StoryBookPanel;
