import React, { useEffect } from 'react';

function GettingStartedModal({ isOpen, onClose, onHidePermanently, onScan, theme }) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleScan = () => {
    onScan?.();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '520px' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="getting-started-title"
        aria-describedby="getting-started-description"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="modal-close"
          aria-label="Close getting started guide"
        >
          <span aria-hidden="true">×</span>
        </button>
        <h2 id="getting-started-title" className={`modal-title ${theme}`}>Your gaming librarian</h2>
        <p id="getting-started-description" style={{ marginBottom: '24px', opacity: 0.85, lineHeight: 1.6 }}>
          GamePilot reads your libraries, builds a living persona from how you play, and recommends your next session — with a roast on the side.
        </p>
        <div className="getting-started-actions">
          <button onClick={handleScan} className="getting-started-primary">Scan my games</button>
          <button onClick={onHidePermanently} className="getting-started-secondary">Skip for now</button>
        </div>
      </div>
    </div>
  );
}

export default GettingStartedModal;
