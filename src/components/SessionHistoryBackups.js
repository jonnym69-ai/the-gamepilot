import React, { useCallback, useEffect, useState } from 'react';
import { Check, History, RefreshCw, RotateCcw, TriangleAlert } from 'lucide-react';
import SessionRepository from '../services/SessionRepository';
import './BackupRestoreDashboard.css';

const formatDate = (value) => {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toLocaleString() : 'unknown date';
};

const formatSize = (bytes) => {
  const kb = Number(bytes) / 1024;
  return Number.isFinite(kb) ? `${kb.toFixed(1)} KB` : '';
};

/**
 * Settings → Backup & Restore panel for the rolling session-history copies
 * the main process keeps under userData/session-backups.
 */
export default function SessionHistoryBackups() {
  const [supported] = useState(() => Boolean(window.electronAPI?.sessionStoreListBackups));
  const [backups, setBackups] = useState([]);
  const [sessionCount, setSessionCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyFile, setBusyFile] = useState(null);
  const [result, setResult] = useState(null);

  const refresh = useCallback(async () => {
    const [snapshot, list] = await Promise.all([SessionRepository.getDiskSnapshot(), SessionRepository.listBackups()]);
    setSessionCount(Array.isArray(snapshot?.sessionHistory) ? snapshot.sessionHistory.length : null);
    setBackups([...list].reverse()); // names sort by date — newest first
  }, []);

  useEffect(() => {
    if (!supported) return undefined;
    let live = true;
    setLoading(true);
    refresh().finally(() => {
      if (live) setLoading(false);
    });
    return () => {
      live = false;
    };
  }, [supported, refresh]);

  const handleRestore = async (file) => {
    const confirmed = window.confirm(
      `Restore session history from ${file}? A safety copy of the current data is taken automatically first.`
    );
    if (!confirmed) return;
    setBusyFile(file);
    setResult(null);
    const outcome = await SessionRepository.restoreBackup(file);
    setBusyFile(null);
    if (outcome?.ok) {
      const restored = outcome.snapshot?.sessionHistory?.length;
      setResult({
        type: 'success',
        message: `Session history restored${restored != null ? ` (${restored} sessions)` : ''}.`,
      });
      await refresh();
    } else {
      setResult({ type: 'error', message: `Restore failed${outcome?.error ? `: ${outcome.error}` : '.'}` });
    }
  };

  return (
    <div className="session-history-backups">
      <div className="brd-card session-history-backups-card">
        <div className="brd-card-header">
          <History size={20} />
          <h4>Session History Backups</h4>
        </div>
        <p className="brd-card-desc">
          GamePilot keeps rolling copies of your playtime record and takes a safety copy before every restore.
        </p>
        {!supported ? (
          <p className="shb-note">Session backups are only available in the installed app.</p>
        ) : loading ? (
          <p className="shb-note">Loading backups…</p>
        ) : (
          <>
            <p className="shb-count">
              {sessionCount != null ? `${sessionCount} sessions on disk` : 'Session count unavailable'}
            </p>
            {backups.length === 0 ? (
              <p className="shb-note">No backups yet — one is created at startup and before history rewrites.</p>
            ) : (
              <ul className="shb-list">
                {backups.map((backup) => (
                  <li key={backup.file} className="shb-row">
                    <span className="shb-meta">
                      <strong>{formatDate(backup.createdAt)}</strong>
                      <span>
                        {backup.sessionCount != null ? `${backup.sessionCount} sessions` : 'unreadable'}
                        {backup.sizeBytes != null ? ` · ${formatSize(backup.sizeBytes)}` : ''}
                      </span>
                    </span>
                    <button
                      type="button"
                      className="brd-button secondary shb-restore"
                      disabled={busyFile != null}
                      onClick={() => handleRestore(backup.file)}
                    >
                      {busyFile === backup.file ? <RefreshCw className="spin" size={14} /> : <RotateCcw size={14} />}
                      Restore
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {result && (
              <div className={`brd-result ${result.type}`}>
                {result.type === 'error' ? <TriangleAlert size={18} /> : <Check size={18} />}
                <span>{result.message}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
