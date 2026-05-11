import React, { useEffect, useState } from 'react';
import { BookOpen, Save, Settings as SettingsIcon, Gamepad2, ExternalLink, Loader2 } from 'lucide-react';
import PCGamingWikiService from '../services/PCGamingWikiService';
import './LibrariansNotes.css';

const labelControllerValue = (value) => {
  if (!value) return null;
  if (value === 'yes') return 'Full support';
  if (value === 'limited') return 'Partial / hackable';
  if (value === 'no') return 'Not supported';
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const ControllerRow = ({ label, value }) => {
  const display = labelControllerValue(value);
  if (!display) return null;
  const tone = value === 'yes' ? 'good' : value === 'no' ? 'bad' : 'meh';
  return (
    <div className={`librarian-controller-row tone-${tone}`}>
      <span>{label}</span>
      <strong>{display}</strong>
    </div>
  );
};

const LibrariansNotes = ({ game }) => {
  const [entry, setEntry] = useState(() => PCGamingWikiService.getCached(game));
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(() => PCGamingWikiService.isEnabled());

  useEffect(() => {
    setEntry(PCGamingWikiService.getCached(game));
    if (!game || !PCGamingWikiService.isEnabled()) return undefined;
    let cancelled = false;
    setLoading(true);
    PCGamingWikiService.lookup(game)
      .then((result) => { if (!cancelled) setEntry(result); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [game]);

  const openExternal = (url) => {
    if (!url) return;
    if (typeof window !== 'undefined' && window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url);
    } else if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  if (!enabled) {
    return (
      <div className="librarians-notes librarians-notes-empty">
        <div className="librarians-notes-header">
          <BookOpen size={16} aria-hidden="true" />
          <h3>Librarian's Notes</h3>
        </div>
        <p>
          PCGamingWiki lookups are off. Enable them in Settings to surface save-file paths,
          configuration locations, and controller-support info per game.
        </p>
        <button
          type="button"
          className="librarians-notes-enable"
          onClick={() => {
            PCGamingWikiService.setEnabled(true);
            setEnabled(true);
          }}
        >
          Enable now
        </button>
      </div>
    );
  }

  if (loading && !entry) {
    return (
      <div className="librarians-notes librarians-notes-loading">
        <Loader2 size={14} className="librarians-notes-spin" aria-hidden="true" />
        <span>Looking up Librarian's Notes…</span>
      </div>
    );
  }

  if (!entry || !entry.found) {
    return (
      <div className="librarians-notes librarians-notes-empty">
        <div className="librarians-notes-header">
          <BookOpen size={16} aria-hidden="true" />
          <h3>Librarian's Notes</h3>
        </div>
        <p>No PCGamingWiki entry matched this title yet. The lookup will retry automatically.</p>
      </div>
    );
  }

  const { saveLocation, configLocation, controller, pageUrl, pageTitle, stub } = entry;
  const hasAnyData = saveLocation || configLocation || controller;

  return (
    <div className="librarians-notes">
      <div className="librarians-notes-header">
        <BookOpen size={16} aria-hidden="true" />
        <h3>Librarian's Notes</h3>
        <span className="librarians-notes-source">via PCGamingWiki</span>
      </div>

      {(!hasAnyData || stub) && (
        <p className="librarians-notes-empty-line">
          The wiki page for <em>{pageTitle || 'this game'}</em> exists but its save / config / controller rows haven't been filled out yet. You can contribute on PCGamingWiki — the panel will pick up changes within 30 days.
        </p>
      )}

      {saveLocation && (
        <div className="librarians-notes-row">
          <Save size={14} aria-hidden="true" />
          <div>
            <span className="librarians-notes-label">Save data (Windows)</span>
            <code>{saveLocation}</code>
          </div>
        </div>
      )}

      {configLocation && (
        <div className="librarians-notes-row">
          <SettingsIcon size={14} aria-hidden="true" />
          <div>
            <span className="librarians-notes-label">Config files (Windows)</span>
            <code>{configLocation}</code>
          </div>
        </div>
      )}

      {controller && (
        <div className="librarians-notes-row librarians-notes-controller">
          <Gamepad2 size={14} aria-hidden="true" />
          <div>
            <span className="librarians-notes-label">Controller support</span>
            <div className="librarians-controller-grid">
              <ControllerRow label="Native" value={controller.fullController} />
              <ControllerRow label="Xbox / XInput" value={controller.xinput} />
              <ControllerRow label="PlayStation" value={controller.playstation} />
              <ControllerRow label="Remapping" value={controller.controllerRemap} />
            </div>
          </div>
        </div>
      )}

      {pageUrl && (
        <button
          type="button"
          className="librarians-notes-link"
          onClick={() => openExternal(pageUrl)}
          title={pageTitle || 'Open on PCGamingWiki'}
        >
          <ExternalLink size={12} aria-hidden="true" />
          Read full page on PCGamingWiki
        </button>
      )}
    </div>
  );
};

export default LibrariansNotes;
