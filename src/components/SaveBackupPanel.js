import React from 'react';
import { FolderOpen, HardDrive, Loader2, ShieldCheck } from 'lucide-react';
import SaveBackupService from '../services/SaveBackupService';
import './SaveBackupPanel.css';

const statusLabel = (location) => {
  if (location.exists) return `${SaveBackupService.bytesToLabel(location.bytes)} • ${location.files || 0} file${location.files === 1 ? '' : 's'}`;
  if (Array.isArray(location.unresolvedTokens) && location.unresolvedTokens.length > 0) return `Needs manual path: ${location.unresolvedTokens.join(', ')}`;
  return 'Not found on this PC yet';
};

const formatBackupDate = (value) => {
  const parsed = new Date(Number(value || 0));
  if (Number.isNaN(parsed.getTime())) return 'Unknown date';
  return parsed.toLocaleString();
};

const SaveBackupPanel = ({ game }) => {
  const [plan, setPlan] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [openStatus, setOpenStatus] = React.useState(null);
  const [destinationRoot, setDestinationRoot] = React.useState('');
  const [backupStatus, setBackupStatus] = React.useState(null);
  const [creatingBackup, setCreatingBackup] = React.useState(false);
  const [backupHistory, setBackupHistory] = React.useState(() => SaveBackupService.getBackupHistory(game));
  const [selectedBackupId, setSelectedBackupId] = React.useState('');
  const [restorePreflight, setRestorePreflight] = React.useState(null);
  const [previewingRestore, setPreviewingRestore] = React.useState(false);
  const [restoreConfirmation, setRestoreConfirmation] = React.useState('');
  const [restoreStatus, setRestoreStatus] = React.useState(null);
  const [restoringBackup, setRestoringBackup] = React.useState(false);

  React.useEffect(() => {
    if (!game) {
      setPlan(null);
      setBackupHistory([]);
      setSelectedBackupId('');
      setRestorePreflight(null);
      setRestoreConfirmation('');
      setRestoreStatus(null);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setOpenStatus(null);
    setBackupStatus(null);
    setBackupHistory(SaveBackupService.getBackupHistory(game));
    setSelectedBackupId('');
    setRestorePreflight(null);
    setRestoreConfirmation('');
    setRestoreStatus(null);
    SaveBackupService.buildPlan(game)
      .then((nextPlan) => {
        if (!cancelled) setPlan(nextPlan);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [game]);

  const handleOpen = async (location) => {
    setOpenStatus(null);
    const result = await SaveBackupService.openLocation(game, location);
    setOpenStatus(result?.ok ? 'Opened folder.' : `Could not open: ${result?.error || 'unknown error'}`);
  };

  const handleChooseDestination = async () => {
    setBackupStatus(null);
    const result = await SaveBackupService.chooseDestination();
    if (result?.ok && result.path) {
      setDestinationRoot(result.path);
    } else if (!result?.canceled) {
      setBackupStatus({ ok: false, message: `Could not choose folder: ${result?.error || 'unknown error'}` });
    }
  };

  const handleCreateBackup = async () => {
    const readyLocations = Array.isArray(plan?.locations) ? plan.locations.filter((location) => location.exists && location.canOpen) : [];
    setCreatingBackup(true);
    setBackupStatus(null);
    try {
      const result = await SaveBackupService.createBackup(game, destinationRoot, readyLocations);
      if (result?.ok) {
        setBackupStatus({
          ok: true,
          message: `Backup created: ${result.backupPath}`,
          manifest: result.manifest
        });
        const nextHistory = SaveBackupService.getBackupHistory(game);
        setBackupHistory(nextHistory);
        setSelectedBackupId(nextHistory[0]?.id || '');
      } else {
        setBackupStatus({ ok: false, message: `Backup failed: ${result?.error || 'unknown error'}` });
      }
    } finally {
      setCreatingBackup(false);
    }
  };

  const handlePreviewRestore = async () => {
    const selectedBackup = backupHistory.find((entry) => entry.id === selectedBackupId) || backupHistory[0] || null;
    if (!selectedBackup) return;
    setPreviewingRestore(true);
    setRestorePreflight(null);
    setRestoreStatus(null);
    try {
      const result = await SaveBackupService.previewRestore(game, selectedBackup);
      setRestorePreflight(result);
    } finally {
      setPreviewingRestore(false);
    }
  };

  const handleRestoreBackup = async () => {
    const selectedBackup = backupHistory.find((entry) => entry.id === selectedBackupId) || backupHistory[0] || null;
    if (!selectedBackup) return;
    setRestoringBackup(true);
    setRestoreStatus(null);
    try {
      const result = await SaveBackupService.restoreBackup(game, selectedBackup, {
        confirmation: restoreConfirmation,
        destinationRoot,
        readyLocations
      });
      if (result?.ok) {
        setRestoreStatus({
          ok: true,
          message: result.message || 'Restore completed.',
          receiptPath: result.receiptPath,
          safetyBackupPath: result.safetyBackup?.backupPath
        });
        setBackupHistory(SaveBackupService.getBackupHistory(game));
      } else {
        setRestoreStatus({ ok: false, message: `Restore failed: ${result?.error || 'unknown error'}` });
      }
    } finally {
      setRestoringBackup(false);
    }
  };

  if (loading && !plan) {
    return (
      <div className="save-backup-panel save-backup-panel-loading">
        <Loader2 size={14} className="save-backup-spin" />
        <span>Checking save backup candidates…</span>
      </div>
    );
  }

  if (!plan || plan.candidates.length === 0) {
    return (
      <div className="save-backup-panel save-backup-panel-empty">
        <div className="save-backup-header">
          <ShieldCheck size={16} />
          <h3>Save Backup</h3>
        </div>
        <p>No save/config folder is known yet for this title. If PCGamingWiki adds one later, GamePilot can use it as a local backup candidate.</p>
      </div>
    );
  }

  const locations = plan.locations.length > 0 ? plan.locations : plan.candidates;
  const readyLocations = locations.filter((location) => location.exists && location.canOpen);
  const canCreateBackup = Boolean(plan.hasBackupBridge && destinationRoot && readyLocations.length > 0 && !creatingBackup);
  const selectedBackup = backupHistory.find((entry) => entry.id === selectedBackupId) || backupHistory[0] || null;
  const restorePreview = SaveBackupService.getRestorePreview(selectedBackup);
  const restoreSafety = SaveBackupService.getRestoreSafetyAssessment(game, restorePreflight);
  const canRestoreBackup = Boolean(
    restoreSafety.restoreEnabled
    && destinationRoot
    && restoreConfirmation === (game?.name || game?.title || '')
    && readyLocations.length > 0
    && !restoringBackup
  );

  return (
    <div className="save-backup-panel">
      <div className="save-backup-header">
        <ShieldCheck size={16} />
        <h3>Save Backup</h3>
        <span>{plan.readyCount || 0} ready</span>
      </div>
      <p className="save-backup-copy">{plan.note}</p>
      <div className="save-backup-list">
        {locations.map((location) => (
          <div key={location.id || location.rawPath} className={`save-backup-location ${location.exists ? 'is-ready' : ''}`}>
            <HardDrive size={14} />
            <div className="save-backup-location-copy">
              <strong>{location.label || location.type || 'Location'}</strong>
              <code>{location.resolvedPath || location.rawPath || location.path}</code>
              <span>{statusLabel(location)}</span>
            </div>
            {location.canOpen && (
              <button type="button" onClick={() => handleOpen(location)} title="Open folder">
                <FolderOpen size={13} />
                Open
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="save-backup-actions">
        <button type="button" onClick={handleChooseDestination} disabled={!plan.hasBackupBridge}>
          Choose backup folder
        </button>
        <button type="button" onClick={handleCreateBackup} disabled={!canCreateBackup}>
          {creatingBackup ? 'Creating backup…' : 'Create local backup'}
        </button>
      </div>
      {destinationRoot && (
        <p className="save-backup-destination">Destination: <code>{destinationRoot}</code></p>
      )}
      {backupStatus && (
        <div className={`save-backup-result ${backupStatus.ok ? 'is-success' : 'is-error'}`}>
          <p>{backupStatus.message}</p>
          {backupStatus.manifest && (
            <span>
              {backupStatus.manifest.totals.files} file{backupStatus.manifest.totals.files === 1 ? '' : 's'} copied • {SaveBackupService.bytesToLabel(backupStatus.manifest.totals.bytes)} • manifest written
            </span>
          )}
        </div>
      )}
      {backupHistory.length > 0 && (
        <div className="save-backup-history">
          <div className="save-backup-history-header">
            <strong>Recent backups</strong>
            <span>{backupHistory.length} saved locally</span>
          </div>
          <div className="save-backup-history-list">
            {backupHistory.slice(0, 3).map((entry) => (
              <button
                type="button"
                key={entry.id}
                className={entry.id === selectedBackup?.id ? 'is-selected' : ''}
                onClick={() => setSelectedBackupId(entry.id)}
              >
                <span>{formatBackupDate(entry.createdAt)}</span>
                <small>{entry.totals?.files || 0} files • {SaveBackupService.bytesToLabel(entry.totals?.bytes || 0)}</small>
              </button>
            ))}
          </div>
          {restorePreview && (
            <div className="save-backup-restore-preview">
              <p>{restorePreview.message}</p>
              {restorePreview.destinations.slice(0, 2).map((destination, index) => (
                <div key={`${destination.targetPath}-${index}`} className="save-backup-restore-row">
                  <span>{destination.label}</span>
                  <code>{destination.targetPath}</code>
                </div>
              ))}
              <button type="button" onClick={handlePreviewRestore} disabled={!plan.hasRestorePreviewBridge || previewingRestore}>
                {previewingRestore ? 'Checking live targets…' : 'Check live targets'}
              </button>
              <div className={`save-backup-safety ${restoreSafety.status === 'blocked' ? 'is-blocked' : 'is-guarded'}`}>
                <strong>{restoreSafety.status === 'blocked' ? 'Restore safety blocked' : 'Restore safety checklist'}</strong>
                <p>{restoreSafety.message}</p>
                {restoreSafety.blockers.length > 0 && (
                  <ul>
                    {restoreSafety.blockers.map((blocker) => (
                      <li key={blocker}>{blocker}</li>
                    ))}
                  </ul>
                )}
                <ul>
                  {restoreSafety.requirements.map((requirement) => (
                    <li key={requirement}>{requirement}</li>
                  ))}
                </ul>
              </div>
              {restorePreflight && (
                <div className={`save-backup-preflight-result ${restorePreflight.ok ? 'is-ready' : 'is-error'}`}>
                  <p>{restorePreflight.ok ? restorePreflight.message : `Restore preflight failed: ${restorePreflight.error || 'unknown error'}`}</p>
                  {restorePreflight.ok && restorePreflight.comparisons?.map((comparison, index) => (
                    <div key={`${comparison.targetPath}-${index}`} className="save-backup-preflight-row">
                      <strong>{comparison.label}</strong>
                      <span>{comparison.backupFiles || 0} backup files • {SaveBackupService.bytesToLabel(comparison.backupBytes || 0)}</span>
                      <span>{comparison.targetExists ? `Live target exists (${comparison.targetFiles || 0} files)` : 'Live target not found'}</span>
                      <em>{comparison.wouldOverwrite ? 'Would require overwrite approval later' : 'Would create a missing target later'}</em>
                    </div>
                  ))}
                </div>
              )}
              <div className="save-backup-restore-confirmation">
                <label htmlFor="save-restore-confirmation">Type <strong>{game?.name || game?.title}</strong> to enable guarded restore</label>
                <input
                  id="save-restore-confirmation"
                  type="text"
                  value={restoreConfirmation}
                  onChange={(event) => setRestoreConfirmation(event.target.value)}
                  placeholder={game?.name || game?.title || 'Game name'}
                />
                {!destinationRoot && <span>Choose a backup folder first so GamePilot can create a fresh safety backup before restoring.</span>}
              </div>
              <button type="button" onClick={handleRestoreBackup} disabled={!canRestoreBackup} title="Creates a fresh safety backup, then restores from the selected backup manifest">
                {restoringBackup ? 'Restoring…' : 'Restore selected backup'}
              </button>
              {restoreStatus && (
                <div className={`save-backup-result ${restoreStatus.ok ? 'is-success' : 'is-error'}`}>
                  <p>{restoreStatus.message}</p>
                  {restoreStatus.safetyBackupPath && <span>Safety backup: {restoreStatus.safetyBackupPath}</span>}
                  {restoreStatus.receiptPath && <span>Restore receipt: {restoreStatus.receiptPath}</span>}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {openStatus && <p className="save-backup-status">{openStatus}</p>}
    </div>
  );
};

export default SaveBackupPanel;
