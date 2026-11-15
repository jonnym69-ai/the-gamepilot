import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink, KeyRound } from 'lucide-react';
import './ApiKeyGuideModal.css';
import { openExternalUrl } from '../services/ElectronBridge';

// "How do I get a key?" walkthrough for the Settings → API Keys cards.
// Numbered steps plus one prominent link out to the exact page where the
// service hands out free keys. Rendered in a portal so it sits above
// Settings columns regardless of stacking contexts.
export default function ApiKeyGuideModal({ isOpen, onClose, guide }) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !guide) return null;

  return createPortal(
    <div className="api-key-guide-backdrop" onClick={onClose} role="presentation">
      <div
        className="api-key-guide"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="api-key-guide-title"
      >
        <div className="api-key-guide-header">
          <h3 id="api-key-guide-title">
            <KeyRound size={18} />
            {guide.title}
          </h3>
          <button type="button" className="api-key-guide-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="api-key-guide-body">
          <p className="api-key-guide-lede">{guide.unlocks}</p>
          <ol className="api-key-guide-steps">
            {guide.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="api-key-guide-note">
            The key is free and stays on this PC — GamePilot only sends it to the service it belongs to.
          </p>
        </div>

        <div className="api-key-guide-footer">
          <button type="button" className="api-key-guide-btn secondary" onClick={onClose}>
            Close
          </button>
          <button type="button" className="api-key-guide-btn primary" onClick={() => openExternalUrl(guide.linkUrl)}>
            <ExternalLink size={15} />
            <span>{guide.linkLabel}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
