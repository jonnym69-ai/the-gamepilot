import React, { useState, useEffect } from 'react';
import { ScanLine, CheckCircle, AlertCircle, XCircle, Clock, Trash2 } from 'lucide-react';
import { LibraryScanCoordinatorService } from '../services/LibraryScanCoordinatorService';
import './ScanReportPanel.css';

const statusIcon = (status) => {
  switch (status) {
    case 'found': return <CheckCircle size={16} className="scan-status-found" />;
    case 'error': return <XCircle size={16} className="scan-status-error" />;
    case 'empty': return <AlertCircle size={16} className="scan-status-empty" />;
    default: return <AlertCircle size={16} className="scan-status-empty" />;
  }
};

const statusLabel = (status) => {
  switch (status) {
    case 'found': return 'Found';
    case 'error': return 'Error';
    case 'empty': return 'Empty';
    default: return status || 'Unknown';
  }
};

export function ScanReportPanel() {
  const [report, setReport] = useState(() => LibraryScanCoordinatorService.getLastScanReport());

  const refresh = () => setReport(LibraryScanCoordinatorService.getLastScanReport());

  useEffect(() => {
    const handleScanComplete = () => refresh();
    window.addEventListener('gamepilot:scan-complete', handleScanComplete);
    return () => window.removeEventListener('gamepilot:scan-complete', handleScanComplete);
  }, []);

  const handleClear = () => {
    LibraryScanCoordinatorService.clearLastScanReport();
    refresh();
  };

  if (!report) {
    return (
      <div className="scan-report-panel empty">
        <ScanLine size={24} />
        <p>No scan report yet. Run a library scan to see per-platform diagnostics.</p>
      </div>
    );
  }

  const summary = report.summary || {};
  const platformStatus = report.platformStatus || {};
  const platformCounts = report.platformCounts || {};
  const entries = Object.entries(platformStatus).sort((a, b) => a[0].localeCompare(b[0]));
  const lastScanAt = summary.lastScanAt || report.lastScanAt;

  return (
    <div className="scan-report-panel">
      <div className="scan-report-header">
        <div className="scan-report-title">
          <ScanLine size={18} />
          <h3>Last Library Scan</h3>
        </div>
        <button className="scan-report-clear" onClick={handleClear} title="Clear report">
          <Trash2 size={14} />
        </button>
      </div>

      <div className="scan-report-summary">
        <div className="scan-report-stat">
          <span className="scan-report-value">{summary.totalGamesAfterDedupe || 0}</span>
          <span className="scan-report-label">games found</span>
        </div>
        <div className="scan-report-stat">
          <span className="scan-report-value">{summary.scannedPlatformCount || 0}</span>
          <span className="scan-report-label">platforms scanned</span>
        </div>
        <div className="scan-report-stat">
          <span className="scan-report-value">{summary.successfulPlatformCount || 0}</span>
          <span className="scan-report-label">ok</span>
        </div>
        <div className="scan-report-stat">
          <span className="scan-report-value">{summary.emptyPlatformCount || 0}</span>
          <span className="scan-report-label">empty</span>
        </div>
        <div className="scan-report-stat">
          <span className="scan-report-value">{summary.errorPlatformCount || 0}</span>
          <span className="scan-report-label">errors</span>
        </div>
      </div>

      {lastScanAt && (
        <div className="scan-report-meta">
          <Clock size={14} />
          <span>{new Date(lastScanAt).toLocaleString()}</span>
        </div>
      )}

      {entries.length > 0 && (
        <div className="scan-report-platforms">
          {entries.map(([platform, info]) => {
            const status = info?.scanStatus || 'unknown';
            const count = platformCounts[platform] || info?.count || 0;
            const reason = info?.reason || info?.message || null;

            return (
              <div key={platform} className={`scan-report-row scan-status-${status}`}>
                {statusIcon(status)}
                <div className="scan-report-platform-name">{platform}</div>
                <div className="scan-report-platform-status">{statusLabel(status)}</div>
                <div className="scan-report-platform-count">{count}</div>
                {reason && (
                  <div className="scan-report-platform-reason">{reason}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
