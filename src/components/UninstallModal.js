import React, { useEffect, useState } from 'react';
import { X, Trash2, AlertTriangle, Clock, Calendar, HardDrive, ExternalLink, FolderOpen } from 'lucide-react';
import DiskUsageService, { formatBytes } from '../services/DiskUsageService';
import UninstallCoachService from '../services/UninstallCoachService';
import './UninstallModal.css';

const formatHours = (minutes) => {
  const total = Number(minutes) || 0;
  if (total <= 0) return 'Never played';
  const hrs = Math.floor(total / 60);
  const mins = total % 60;
  if (hrs >= 100) return `${hrs}h`;
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
};

const formatLastPlayed = (lastPlayed) => {
  if (!lastPlayed) return 'Never';
  const t = new Date(lastPlayed).getTime();
  if (!Number.isFinite(t) || t === 0) return 'Never';
  const days = Math.round((Date.now() - t) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.round(days / 30)} months ago`;
  return `${Math.round(days / 365)} years ago`;
};

// "Are you sure?" modal that runs before any uninstall hand-off. Surfaces the
// hours invested and last-played so the user has a sanity check before they
// reclaim space — and shows exactly which uninstaller will open. GamePilot
// itself never deletes files; that's the launcher's job.
const UninstallModal = ({ isOpen, game, onClose, onCompleted = () => {} }) => {
  const [plan, setPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !game) return undefined;
    let cancelled = false;
    setPlanLoading(true);
    setError('');
    setPlan(null);
    UninstallCoachService.previewPlan(game)
      .then((result) => {
        if (cancelled) return;
        if (result?.ok) setPlan(result.plan);
        else setError(result?.error || 'Could not build uninstall plan.');
      })
      .finally(() => { if (!cancelled) setPlanLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen, game]);

  if (!isOpen || !game) return null;

  const sizeEntry = DiskUsageService.getCached(game);
  const sizeBytes = sizeEntry?.ok ? sizeEntry.bytes : 0;
  const hoursPlayed = (Number(game.time_played) || 0) / 60;
  const isAttached = hoursPlayed >= 25; // arbitrary "you really did play this" threshold

  const handleConfirm = async () => {
    setDispatching(true);
    setError('');
    const result = await UninstallCoachService.start(game);
    setDispatching(false);
    if (result?.ok) {
      onCompleted(game, result.plan);
      onClose();
    } else {
      const errMsg = result?.error || 'Failed to launch uninstaller.';
      // Provide a more helpful message for common failure cases
      let userMsg = errMsg;
      if (errMsg === 'electron-only') {
        userMsg = 'Uninstall is only available in the desktop app. Run GamePilot as an installed app, not in a browser.';
      } else if (errMsg.includes('openExternal') || errMsg.includes('start fallback')) {
        userMsg = `Could not open the launcher uninstaller (${errMsg}). Try opening the launcher manually and uninstalling from there.`;
      }
      setError(userMsg);
    }
  };

  return (
    <div className="uninstall-modal-overlay" onClick={onClose}>
      <div className="uninstall-modal" onClick={(e) => e.stopPropagation()}>
        <button className="uninstall-modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <header className="uninstall-modal-header">
          <div className="uninstall-modal-title">
            <Trash2 size={18} />
            <h2>Uninstall {game.name}?</h2>
          </div>
          <p className="uninstall-modal-subtitle">
            GamePilot never deletes files — it hands the job to the launcher's official uninstaller.
          </p>
        </header>

        <div className="uninstall-modal-stats">
          <div className="uninstall-stat">
            <HardDrive size={14} />
            <div>
              <span className="uninstall-stat-label">Reclaimable</span>
              <strong>{sizeBytes ? formatBytes(sizeBytes) : 'Unknown'}</strong>
            </div>
          </div>
          <div className="uninstall-stat">
            <Clock size={14} />
            <div>
              <span className="uninstall-stat-label">Hours invested</span>
              <strong>{formatHours(game.time_played)}</strong>
            </div>
          </div>
          <div className="uninstall-stat">
            <Calendar size={14} />
            <div>
              <span className="uninstall-stat-label">Last played</span>
              <strong>{formatLastPlayed(game.last_played)}</strong>
            </div>
          </div>
        </div>

        {isAttached && (
          <div className="uninstall-modal-warn">
            <AlertTriangle size={14} />
            <span>You've spent {formatHours(game.time_played)} in this game. Sure you want to remove it?</span>
          </div>
        )}

        <section className="uninstall-modal-plan">
          <h3>What happens next</h3>
          {planLoading && <p className="uninstall-modal-muted">Preparing uninstall plan…</p>}
          {!planLoading && plan && (
            <>
              <div className="uninstall-modal-plan-target">
                {plan.method === 'open-folder' || plan.method === 'manual'
                  ? <FolderOpen size={14} />
                  : <ExternalLink size={14} />}
                <span>
                  <strong>{plan.label}</strong>{plan.method === 'unsupported' ? '' : ` will open${plan.fallback ? ' (fallback)' : ''}`}
                </span>
              </div>
              <p className="uninstall-modal-plan-message">{plan.message}</p>
              {game.platform && (
                <p className="uninstall-modal-path">
                  <span>Detected platform:</span> <code>{game.platform}</code>
                  {game.appid && <span style={{ marginLeft: '8px' }}>(appid: {game.appid})</span>}
                </p>
              )}
              {game.installDir && (
                <p className="uninstall-modal-path">
                  <span>Install folder:</span> <code>{game.installDir}</code>
                </p>
              )}
            </>
          )}
          {!planLoading && error && (
            <p className="uninstall-modal-error">
              <AlertTriangle size={12} /> {error}
            </p>
          )}
        </section>

        <footer className="uninstall-modal-footer">
          <button className="uninstall-modal-cancel" onClick={onClose} disabled={dispatching}>
            Cancel
          </button>
          <button
            className="uninstall-modal-confirm"
            onClick={handleConfirm}
            disabled={dispatching || planLoading || !plan || plan.method === 'unsupported'}
          >
            {dispatching ? 'Opening uninstaller…' : plan?.method === 'unsupported' ? 'Unavailable' : `Open ${plan?.label || 'uninstaller'}`}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default UninstallModal;
