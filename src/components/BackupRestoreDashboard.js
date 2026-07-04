import React, { useRef, useState } from 'react';
import {
  Archive,
  ArrowDown,
  ArrowUp,
  Check,
  Database,
  RefreshCw,
  Save,
  Shield,
  TriangleAlert,
  Upload
} from 'lucide-react';
import BackupService from '../services/BackupService';
import './BackupRestoreDashboard.css';

export function BackupRestoreDashboard() {
  const fileRef = useRef(null);
  const [backup, setBackup] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [overwrite, setOverwrite] = useState(false);

  const handleCreateBackup = () => {
    setLoading(true);
    setResult(null);
    setTimeout(() => {
      const outcome = BackupService.createBackup();
      setLoading(false);
      if (outcome.success) {
        BackupService.downloadBackup(outcome.blob);
        setResult({ type: 'success', message: outcome.message });
      } else {
        setResult({ type: 'error', message: outcome.message });
      }
    }, 200);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setResult(null);
    setBackup(null);
    setPreview(null);
    const outcome = await BackupService.parseBackupFile(file);
    setLoading(false);
    if (outcome.success) {
      setBackup(outcome.backup);
      setPreview(BackupService.getBackupSummary(outcome.backup));
    } else {
      setResult({ type: 'error', message: outcome.message });
    }
  };

  const handleRestore = () => {
    if (!backup) return;
    setLoading(true);
    setResult(null);
    setTimeout(() => {
      const outcome = BackupService.restoreBackup(backup, { overwrite });
      setLoading(false);
      setResult({ type: outcome.success ? 'success' : 'error', message: outcome.message });
      if (outcome.success) {
        setBackup(null);
        setPreview(null);
      }
    }, 200);
  };

  const handleCancel = () => {
    setBackup(null);
    setPreview(null);
    setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="backup-restore-dashboard">
      <div className="brd-intro">
        <Shield size={24} />
        <div>
          <h3>Local Backup & Restore</h3>
          <p>
            Your GamePilot data stays on your device. Export everything to a JSON file for safekeeping, or restore
            from a previous backup.
          </p>
        </div>
      </div>

      <div className="brd-grid">
        <div className="brd-card">
          <div className="brd-card-header">
            <Archive size={20} />
            <h4>Export Backup</h4>
          </div>
          <p className="brd-card-desc">
            Download a complete snapshot of your library, sessions, settings, achievements, and progress.
          </p>
          <button className="brd-button primary" onClick={handleCreateBackup} disabled={loading}>
            {loading ? <RefreshCw className="spin" size={18} /> : <ArrowDown size={18} />}
            {loading ? 'Creating...' : 'Download Backup'}
          </button>
        </div>

        <div className="brd-card">
          <div className="brd-card-header">
            <Upload size={20} />
            <h4>Import Backup</h4>
          </div>
          <p className="brd-card-desc">
            Select a previously exported GamePilot backup JSON file to preview and restore.
          </p>
          <input
            type="file"
            accept=".json,application/json"
            ref={fileRef}
            onChange={handleFileSelect}
            disabled={loading}
            className="brd-file-input"
          />
          {preview && (
            <div className="brd-preview">
              <div className="brd-preview-row">
                <Database size={16} />
                <span>{preview.games} games</span>
              </div>
              <div className="brd-preview-row">
                <Save size={16} />
                <span>{preview.sessions} sessions</span>
              </div>
              <div className="brd-preview-row">
                <Check size={16} />
                <span>{preview.settings} settings entries</span>
              </div>
              <div className="brd-preview-row">
                <Archive size={16} />
                <span>{(preview.totalSize / 1024).toFixed(1)} KB</span>
              </div>
              {preview.exportedAt && (
                <div className="brd-preview-row">
                  <span>Exported {new Date(preview.exportedAt).toLocaleString()}</span>
                </div>
              )}
            </div>
          )}
          {preview && (
            <div className="brd-restore-options">
              <label className="brd-toggle">
                <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} />
                <span>Overwrite existing data before restoring</span>
              </label>
            </div>
          )}
          {preview && (
            <div className="brd-actions">
              <button className="brd-button primary" onClick={handleRestore} disabled={loading}>
                {loading ? <RefreshCw className="spin" size={18} /> : <ArrowUp size={18} />}
                {loading ? 'Restoring...' : 'Restore Backup'}
              </button>
              <button className="brd-button secondary" onClick={handleCancel} disabled={loading}>
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {result && (
        <div className={`brd-result ${result.type}`}>
          {result.type === 'error' ? <TriangleAlert size={18} /> : <Check size={18} />}
          <span>{result.message}</span>
        </div>
      )}
    </div>
  );
}

export default BackupRestoreDashboard;
