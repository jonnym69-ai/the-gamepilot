import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Share2 } from 'lucide-react';
import './ShareCaptionDialog.css';

export function ShareCaptionDialog({ isOpen, onClose, channel, caption, onShare }) {
  const [draft, setDraft] = useState('');
  const textareaRef = useRef(null);
  const channelLabel = channel?.label || 'Share';

  useEffect(() => {
    if (isOpen) {
      setDraft(caption || '');
      // Focus and select the textarea content after the dialog renders
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.select();
        }
      }, 0);
    }
  }, [isOpen, caption]);

  if (!isOpen) return null;

  const handleShare = () => {
    onShare(draft.trim());
    onClose();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      handleShare();
    }
    if (event.key === 'Escape') {
      onClose();
    }
  };

  return createPortal(
    <div className="share-caption-dialog-backdrop" onClick={onClose} role="presentation">
      <div className="share-caption-dialog" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="share-caption-title">
        <div className="share-caption-dialog-header">
          <h3 id="share-caption-title">Share to {channelLabel}</h3>
          <button type="button" className="share-caption-dialog-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="share-caption-dialog-body">
          <label htmlFor="share-caption-text">Edit your caption before sharing</label>
          <textarea
            id="share-caption-text"
            ref={textareaRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={8}
            placeholder="Write your share caption..."
          />
          <div className="share-caption-dialog-hint">
            Press Ctrl+Enter to share. Only public game stats and your display name are included.
          </div>
        </div>

        <div className="share-caption-dialog-footer">
          <button type="button" className="share-caption-dialog-btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="share-caption-dialog-btn primary" onClick={handleShare}>
            <Share2 size={16} />
            <span>Share to {channelLabel}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ShareCaptionDialog;
