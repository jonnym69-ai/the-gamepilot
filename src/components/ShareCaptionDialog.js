import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Share2 } from 'lucide-react';
import './ShareCaptionDialog.css';
import { LocalShareService } from '../services/LocalShareService';

export function ShareCaptionDialog({ isOpen, onClose, channel, caption, onShare }) {
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const submitting = useRef(false);
  const textareaRef = useRef(null);
  const channelLabel = channel?.label || 'Share';

  useEffect(() => {
    if (isOpen) {
      setDraft(caption || '');
      setFailure('');
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

  const handleShare = async () => {
    if (submitting.current || !draft.trim()) return;
    submitting.current = true;
    setBusy(true);
    setFailure('');
    try {
      const result = await onShare(draft.trim());
      if (result === false || result?.success === false) {
        setFailure(result?.message || 'Sharing failed. Your caption is still here to retry.');
      } else {
        onClose();
      }
    } catch {
      setFailure('Sharing failed. Your caption is still here to retry.');
    } finally {
      submitting.current = false;
      setBusy(false);
    }
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
      <div
        className="share-caption-dialog"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-caption-title"
      >
        <div className="share-caption-dialog-header">
          <h3 id="share-caption-title">Share to {channelLabel}</h3>
          <button type="button" className="share-caption-dialog-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="share-caption-dialog-body">
          {channel?.id === 'discord' && LocalShareService.hasDiscordWebhookUrl() && (
            <p role="note">
              This will post directly to your configured Discord webhook channel, including the image when available.
            </p>
          )}
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
            Review your display name, play history and any social links before continuing. Editing this caption does not
            change the image. Most apps require you to paste or attach the image yourself.
          </div>
        </div>

        {failure && (
          <p role="alert" className="share-caption-dialog-hint">
            {failure}
          </p>
        )}
        <div className="share-caption-dialog-footer">
          <button type="button" className="share-caption-dialog-btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="share-caption-dialog-btn primary"
            disabled={busy || !draft.trim()}
            onClick={handleShare}
          >
            <Share2 size={16} />
            <span>{busy ? 'Preparing…' : `Continue to ${channelLabel}`}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ShareCaptionDialog;
