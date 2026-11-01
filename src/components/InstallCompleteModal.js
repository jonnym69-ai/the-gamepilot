import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Play, X } from 'lucide-react';
import './InstallCompleteModal.css';

const SOURCE_LABELS = { steam: 'Steam', epic: 'Epic', gog: 'GOG Galaxy' };

/**
 * Shown when a game installed via "Owned, not installed" finishes — the
 * main-process watcher saw its install marker land (Steam appmanifest /
 * Epic .item / GOG registry key). Play Now deep-links straight into the
 * launcher for that game.
 */
export default function InstallCompleteModal({ game, onPlay, onDismiss }) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (game) closeRef.current?.focus();
  }, [game]);

  useEffect(() => {
    if (!game) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onDismiss?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [game, onDismiss]);

  if (!game) return null;

  return createPortal(
    <div className="install-complete-overlay" onClick={onDismiss} role="presentation">
      <div
        className="install-complete-card"
        role="dialog"
        aria-modal="true"
        aria-label={`${game.name} finished installing`}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          ref={closeRef}
          className="install-complete-close"
          onClick={onDismiss}
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
        <div className="install-complete-icon">
          {game.image ? (
            <img src={game.image} alt="" />
          ) : (
            <span className="install-complete-icon-fallback" aria-hidden="true">
              {String(game.name || '?')
                .slice(0, 1)
                .toUpperCase()}
            </span>
          )}
          <span className="install-complete-badge" aria-hidden="true">
            <CheckCircle2 size={16} />
          </span>
        </div>
        <div className="install-complete-copy">
          <h3>{game.name}</h3>
          <p>Finished installing via {SOURCE_LABELS[game.source] || 'its launcher'} — ready to play.</p>
        </div>
        <div className="install-complete-actions">
          <button type="button" className="install-complete-play" onClick={() => onPlay?.(game)}>
            <Play size={15} aria-hidden="true" />
            Play now
          </button>
          <button type="button" className="install-complete-later" onClick={onDismiss}>
            Later
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
