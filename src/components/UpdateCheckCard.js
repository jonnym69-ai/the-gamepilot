import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Download, RefreshCw, RotateCw } from 'lucide-react';
import UpdateService from '../services/UpdateService';
import { useToast } from './Toast';
import { APP_VERSION } from '../appVersion';

const describeStatus = ({ status, version, percent, error }) => {
  switch (status) {
    case 'checking':
      return 'Checking for updates…';
    case 'available':
      return version ? `Update v${version} is available.` : 'An update is available.';
    case 'not-available':
      return 'You are on the latest version.';
    case 'downloading':
      return percent != null ? `Downloading update… ${percent}%` : 'Downloading update…';
    case 'downloaded':
      return version ? `v${version} downloaded — restart to install.` : 'Update downloaded — restart to install.';
    case 'error':
      return error ? `Update check failed: ${error}` : 'Update check failed.';
    default:
      return 'Update checks run automatically after launch and every 6 hours.';
  }
};

/**
 * Settings → About row: current version, manual update check, and
 * download/restart actions driven by the main-process updater.
 */
export default function UpdateCheckCard() {
  const { success: toastSuccess } = useToast();
  const [supported] = useState(() => UpdateService.isSupported());
  const [state, setState] = useState({ status: 'idle', version: null, percent: null, error: null });
  const [devMode, setDevMode] = useState(false);
  const stateRef = useRef(state);

  useEffect(() => {
    if (!supported) return undefined;
    return UpdateService.onStatus((next) => {
      if (!next || typeof next !== 'object') return;
      const prev = stateRef.current;
      const merged = { ...prev, ...next };
      stateRef.current = merged;
      setState(merged);
      if (merged.status === 'downloaded' && prev.status !== 'downloaded') {
        toastSuccess(
          merged.version
            ? `GamePilot v${merged.version} is ready — restart to install.`
            : 'Update downloaded — restart to install.',
          8000
        );
      }
    });
  }, [supported, toastSuccess]);

  useEffect(() => {
    if (!supported) return undefined;
    let live = true;
    UpdateService.getState().then((snapshot) => {
      if (!live || !snapshot) return;
      if (snapshot.reason === 'dev') {
        setDevMode(true);
        return;
      }
      if (snapshot.ok !== false || snapshot.status !== 'idle') {
        stateRef.current = { ...stateRef.current, ...snapshot };
        setState(stateRef.current);
      }
    });
    return () => {
      live = false;
    };
  }, [supported]);

  const applyResult = (result) => {
    if (!result) return;
    if (result.reason === 'dev') {
      setDevMode(true);
      return;
    }
    if (result.status || result.ok) {
      stateRef.current = { ...stateRef.current, ...result };
      setState(stateRef.current);
    }
  };

  const busy = state.status === 'checking' || state.status === 'downloading';
  const unavailable = !supported || devMode;

  return (
    <div className="setting-item update-check-card">
      <div className="update-check-info">
        <label>App Updates</label>
        <p className="setting-description">
          {unavailable
            ? `GamePilot v${APP_VERSION} — update checks are only available in the installed app.`
            : `GamePilot v${APP_VERSION} — ${describeStatus(state)}`}
        </p>
        {state.status === 'downloading' && state.percent != null && (
          <div
            className="update-progress"
            role="progressbar"
            aria-valuenow={state.percent}
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <div className="update-progress-fill" style={{ width: `${state.percent}%` }} />
          </div>
        )}
      </div>
      <div className="update-check-actions">
        <button
          type="button"
          className="data-button export"
          disabled={unavailable || busy}
          onClick={() => UpdateService.check().then(applyResult)}
        >
          <RefreshCw size={16} className={state.status === 'checking' ? 'update-check-spin' : ''} />
          Check for updates
        </button>
        {state.status === 'available' && (
          <button
            type="button"
            className="data-button export"
            onClick={() => UpdateService.download().then(applyResult)}
          >
            <Download size={16} />
            Download{state.version ? ` v${state.version}` : ''}
          </button>
        )}
        {state.status === 'downloaded' && (
          <button
            type="button"
            className="data-button export"
            onClick={() => UpdateService.install().then(applyResult)}
          >
            <RotateCw size={16} />
            Restart to install
          </button>
        )}
        {state.status === 'not-available' && (
          <span className="update-check-uptodate">
            <CheckCircle2 size={15} /> Up to date
          </span>
        )}
      </div>
    </div>
  );
}
