import React, { useCallback, useMemo, useState } from 'react';
import { BrushCleaning, CheckCircle2, RefreshCw, Recycle, ShieldCheck } from 'lucide-react';
import { formatBytes } from '../services/DiskUsageService';
import './ReclaimSpacePanel.css';

/**
 * "Reclaim space" panel — scans for provably-orphaned disk usage (Steam shader
 * caches for uninstalled games + Windows crash dumps) and moves the selected
 * items to the Recycle Bin via the storage-cleaner IPC bridge.
 *
 * The renderer only ever sends item ids back; the main process re-scans and
 * intersects before touching anything.
 */
export default function ReclaimSpacePanel() {
  const api = typeof window !== 'undefined' ? window.electronAPI : null;
  const bridgeAvailable = Boolean(api?.storageCleanerScan && api?.storageCleanerClean);

  const [scanState, setScanState] = useState('idle'); // idle | scanning | scanned | error
  const [items, setItems] = useState([]);
  const [checkedIds, setCheckedIds] = useState(() => new Set());
  const [confirming, setConfirming] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [results, setResults] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const runScan = useCallback(async () => {
    setScanState('scanning');
    setErrorMessage('');
    setResults(null);
    setConfirming(false);
    try {
      const response = await api.storageCleanerScan();
      const found = Array.isArray(response?.items) ? response.items : [];
      if (!response?.ok) {
        setItems([]);
        setCheckedIds(new Set());
        setScanState('error');
        setErrorMessage(response?.error || 'The scan could not complete.');
        return;
      }
      setItems(found);
      setCheckedIds(new Set(found.map((item) => item.id)));
      setScanState('scanned');
    } catch (err) {
      setItems([]);
      setCheckedIds(new Set());
      setScanState('error');
      setErrorMessage(err?.message || 'The scan could not complete.');
    }
  }, [api]);

  const selectedBytes = useMemo(
    () => items.filter((item) => checkedIds.has(item.id)).reduce((sum, item) => sum + (item.bytes || 0), 0),
    [items, checkedIds]
  );

  const toggleItem = (id) => {
    setCheckedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runClean = useCallback(async () => {
    setCleaning(true);
    setErrorMessage('');
    try {
      const response = await api.storageCleanerClean(Array.from(checkedIds));
      if (!response?.ok) {
        setErrorMessage(response?.error || 'The clean-up could not complete.');
        return;
      }
      const byId = new Map(items.map((item) => [item.id, item]));
      const settled = (response.results || []).map((result) => ({
        ...result,
        label: byId.get(result.id)?.label || result.id,
        bytes: byId.get(result.id)?.bytes || 0,
      }));
      setResults(settled);
      // Remove trashed items from the list; failed/unknown ones stay visible.
      const trashed = new Set(settled.filter((r) => r.ok).map((r) => r.id));
      setItems((current) => current.filter((item) => !trashed.has(item.id)));
      setCheckedIds((current) => new Set(Array.from(current).filter((id) => !trashed.has(id))));
    } catch (err) {
      setErrorMessage(err?.message || 'The clean-up could not complete.');
    } finally {
      setCleaning(false);
      setConfirming(false);
    }
  }, [api, checkedIds, items]);

  const freedBytes = useMemo(
    () => (results || []).filter((result) => result.ok).reduce((sum, result) => sum + (result.bytes || 0), 0),
    [results]
  );
  const failedResults = (results || []).filter((result) => !result.ok);

  return (
    <section className="reclaim-space-panel" aria-label="Reclaim space">
      <div className="reclaim-space-header">
        <div className="reclaim-space-title">
          <BrushCleaning size={18} />
          <h2>Reclaim space</h2>
        </div>
        <p>
          Finds <strong>orphaned shader caches</strong> Steam left behind for games that are no longer installed, plus
          old <strong>Windows crash dumps</strong>. These are safe to remove — selected items are moved to the Recycle
          Bin, never permanently deleted.
        </p>
      </div>

      {!bridgeAvailable ? (
        <p className="reclaim-space-note">Reclaim space is available in the GamePilot desktop app.</p>
      ) : (
        <>
          <div className="reclaim-space-actions-row">
            <button
              type="button"
              className="reclaim-space-scan"
              onClick={runScan}
              disabled={scanState === 'scanning' || cleaning}
            >
              <RefreshCw size={14} className={scanState === 'scanning' ? 'spin' : ''} />
              {scanState === 'scanning'
                ? 'Scanning…'
                : scanState === 'scanned'
                  ? 'Scan again'
                  : 'Scan for reclaimable space'}
            </button>
            {scanState === 'scanned' && items.length > 0 && (
              <span className="reclaim-space-total">
                {formatBytes(items.reduce((sum, item) => sum + (item.bytes || 0), 0))} recoverable
              </span>
            )}
          </div>

          {scanState === 'error' && <p className="reclaim-space-error">{errorMessage}</p>}

          {scanState === 'scanned' && items.length === 0 && !results && (
            <p className="reclaim-space-note">
              <ShieldCheck size={14} /> Nothing to reclaim — no orphaned shader caches or crash dumps found.
            </p>
          )}

          {items.length > 0 && (
            <ul className="reclaim-space-list">
              {items.map((item) => (
                <li key={item.id}>
                  <label className="reclaim-space-item">
                    <input
                      type="checkbox"
                      checked={checkedIds.has(item.id)}
                      onChange={() => toggleItem(item.id)}
                      disabled={cleaning}
                    />
                    <span className="reclaim-space-item-copy">
                      <strong>{item.label}</strong>
                      <small>{item.kind === 'steam-shader-orphan' ? 'Steam shader cache' : 'Crash dump'}</small>
                    </span>
                    <span className="reclaim-space-item-bytes">{formatBytes(item.bytes)}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}

          {items.length > 0 && !confirming && (
            <button
              type="button"
              className="reclaim-space-clean"
              onClick={() => setConfirming(true)}
              disabled={checkedIds.size === 0 || cleaning}
            >
              <Recycle size={14} />
              Clean selected
            </button>
          )}

          {confirming && (
            <div className="reclaim-space-confirm" role="alertdialog" aria-label="Confirm clean-up">
              <p>
                Move {checkedIds.size} item{checkedIds.size === 1 ? '' : 's'} ({formatBytes(selectedBytes)}) to the
                Recycle Bin?
              </p>
              <div className="reclaim-space-confirm-actions">
                <button type="button" onClick={runClean} disabled={cleaning} className="reclaim-space-clean">
                  {cleaning ? 'Moving…' : 'Yes, move to Recycle Bin'}
                </button>
                <button type="button" onClick={() => setConfirming(false)} disabled={cleaning}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {errorMessage && scanState !== 'error' && <p className="reclaim-space-error">{errorMessage}</p>}

          {results && (
            <div className="reclaim-space-results" role="status">
              <p>
                <CheckCircle2 size={14} /> Moved {results.filter((r) => r.ok).length} item
                {results.filter((r) => r.ok).length === 1 ? '' : 's'} ({formatBytes(freedBytes)}) to the Recycle Bin.
              </p>
              {failedResults.length > 0 && (
                <ul>
                  {failedResults.map((result) => (
                    <li key={result.id}>
                      {result.label}: {result.error || 'could not be moved'}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
