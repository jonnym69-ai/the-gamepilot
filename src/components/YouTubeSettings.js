import React, { useEffect, useState } from 'react';
import { getElectronAPI, openExternalUrl } from '../services/ElectronBridge';

/**
 * YouTube Data API key entry for the local "Watch before you play" preview.
 * The key is encrypted in Electron via safeStorage and only ever reported as
 * configured/not-configured — the saved secret is never read back into the
 * renderer.
 */
export default function YouTubeSettings() {
  const api = getElectronAPI();
  const available = Boolean(api?.youtubeStatus && api?.youtubeSetKey && api?.youtubeClearKey);
  const [configured, setConfigured] = useState(false);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!available || !api) return undefined;
    let cancelled = false;
    api
      .youtubeStatus()
      .then((result) => {
        if (!cancelled) setConfigured(result?.configured === true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [api, available]);

  const saveKey = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setPending(true);
    setError(null);
    try {
      const result = await api.youtubeSetKey(trimmed);
      if (result?.ok) {
        setConfigured(true);
        setDraft('');
      } else {
        setError(
          result?.error === 'invalid-key'
            ? 'That does not look like a YouTube API key — check it and try again.'
            : result?.error === 'secure-storage-unavailable'
              ? 'Secure storage is not available on this system, so the key cannot be saved.'
              : 'Could not save the key. Try again.'
        );
      }
    } catch {
      setError('Could not save the key. Try again.');
    } finally {
      setPending(false);
    }
  };

  const removeKey = async () => {
    setPending(true);
    setError(null);
    try {
      const result = await api.youtubeClearKey();
      if (result?.ok) {
        setConfigured(false);
        setDraft('');
      } else {
        setError('Could not remove the key. Try again.');
      }
    } catch {
      setError('Could not remove the key. Try again.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="setting-item">
      <label htmlFor="youtube-api-key">YouTube Videos (Local Preview)</label>
      {available ? (
        <div>
          <input
            id="youtube-api-key"
            type="password"
            placeholder="Paste your YouTube Data API key..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={pending}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: '6px',
              border: '1px solid var(--border-primary, rgba(148, 163, 184, 0.3))',
              background: 'var(--bg-secondary, #1a1a2e)',
              color: 'var(--text-primary, var(--text-color, #e2e8f0))',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button type="button" className="export-button" onClick={saveKey} disabled={pending || !draft.trim()}>
              {pending ? 'Working…' : 'Save key'}
            </button>
            {configured && (
              <button type="button" className="export-button" onClick={removeKey} disabled={pending}>
                Remove key
              </button>
            )}
          </div>
        </div>
      ) : (
        <p className="setting-description" style={{ margin: '4px 0 0' }}>
          Requires the GamePilot desktop app.
        </p>
      )}
      <p className="setting-description">
        For this local preview, enable YouTube Data API v3 in Google Cloud and save a key here. Searches run only when
        you choose a video category.{' '}
        <button
          type="button"
          className="yt-settings-link"
          onClick={() => openExternalUrl('https://console.cloud.google.com/apis/library/youtube.googleapis.com')}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: 'inherit',
            textDecoration: 'underline',
            cursor: 'pointer',
            font: 'inherit',
          }}
        >
          Open YouTube Data API in Google Cloud
        </button>
      </p>
      {configured && (
        <p className="setting-description" style={{ margin: '4px 0 0' }}>
          Key saved on this PC.
        </p>
      )}
      {error && (
        <p className="setting-description" style={{ margin: '4px 0 0' }}>
          {error}
        </p>
      )}
    </div>
  );
}
