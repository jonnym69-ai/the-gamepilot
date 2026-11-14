import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, Download, Film, Image as ImageIcon, RefreshCw, Send, X } from 'lucide-react';
import GameCapturesService from '../services/GameCapturesService';
import { LocalShareService } from '../services/LocalShareService';
import { GameShareCard, buildGameShareData } from './GameShareCard';
import { useToast } from './Toast';
import './PostComposerModal.css';

const CAPTION_VARIANTS = [
  ({ name, hours, sessions }) =>
    `${hours} in ${name} across ${sessions} sessions — every minute tracked locally by GamePilot. #GamePilot`,
  ({ name, hours, sessions }) =>
    `GamePilot says I've put ${hours} into ${name} across ${sessions} sessions. The receipts don't lie. #GamePilot`,
  ({ name, hours }) => `${hours} in ${name} and counting. What does your library say about you? #GamePilot #PCGaming`,
];

const buildDraftCaption = (game, gameStats, variant = 0) => {
  const data = buildGameShareData(game, gameStats);
  const hoursFloat = Math.max(0, (Number(data.timePlayed) || 0) / 60);
  const hours = hoursFloat >= 1 ? `${Number(hoursFloat.toFixed(1))}h` : `${Math.round(hoursFloat * 60)}m`;
  const sessions = data.sessions || 1;
  const facts = { name: data.name, hours, sessions };
  return CAPTION_VARIANTS[variant % CAPTION_VARIANTS.length](facts);
};

const CaptureBgButton = ({ capture, selected, onSelect }) => {
  const [thumb, setThumb] = useState(capture.kind === 'image' ? capture.fileUrl : null);

  useEffect(() => {
    let cancelled = false;
    if (capture.kind === 'video' && !thumb) {
      GameCapturesService.getClipPosterFrame(capture, { maxWidth: 240 }).then((frame) => {
        if (!cancelled && frame) setThumb(frame);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [capture, thumb]);

  return (
    <button
      type="button"
      className={`post-bg-option ${selected ? 'selected' : ''}`}
      onClick={() => onSelect(capture)}
      title={capture.name}
    >
      {thumb ? (
        <img src={thumb} alt="" />
      ) : (
        <span className="post-bg-fallback">
          <Film size={18} aria-hidden="true" />
        </span>
      )}
      {capture.kind === 'video' && <span className="post-bg-badge">clip</span>}
    </button>
  );
};

export default function PostComposerModal({ game, gameStats, library = [], onClose }) {
  const { success: toastSuccess } = useToast();
  const [captures, setCaptures] = useState([]);
  const [selectedBg, setSelectedBg] = useState('cover');
  const [bgDataUrl, setBgDataUrl] = useState(null);
  const [variant, setVariant] = useState(0);
  const [caption, setCaption] = useState(() => buildDraftCaption(game, gameStats, 0));
  const [busy, setBusy] = useState(false);
  const exportCardRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    GameCapturesService.getForGame(game?.name, { library })
      .then((items) => {
        if (!cancelled) setCaptures(items || []);
      })
      .catch(() => {
        if (!cancelled) setCaptures([]);
      });
    return () => {
      cancelled = true;
    };
  }, [game?.name, library]);

  useEffect(() => {
    let cancelled = false;
    setBgDataUrl(null);
    if (!selectedBg || selectedBg === 'cover') return undefined;
    const resolve =
      selectedBg.kind === 'image'
        ? GameCapturesService.readImageDataUrl(selectedBg)
        : GameCapturesService.getClipPosterFrame(selectedBg, { maxWidth: 1600 });
    resolve.then((dataUrl) => {
      if (!cancelled && dataUrl) setBgDataUrl(dataUrl);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedBg]);

  const nextVariant = () => {
    const next = variant + 1;
    setVariant(next);
    setCaption(buildDraftCaption(game, gameStats, next));
  };

  const generateBlob = useCallback(async () => {
    if (!exportCardRef.current) return null;
    setBusy(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(exportCardRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
      });
      return await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    } catch {
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  const fileName = `${(game?.name || 'game').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-post.png`;

  const handleCopyImage = async () => {
    const blob = await generateBlob();
    if (!blob) return toastSuccess('Could not generate the card.');
    const ok = await LocalShareService.copyImageToClipboard(blob, fileName);
    toastSuccess(ok ? 'Card copied — paste it anywhere.' : 'Could not copy the card.');
  };

  const handleSaveImage = async () => {
    if (!exportCardRef.current) return;
    setBusy(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(exportCardRef.current, { scale: 2, backgroundColor: null, useCORS: true });
      LocalShareService.downloadImageFromCanvas(canvas, fileName);
      toastSuccess('Card saved.');
    } catch {
      toastSuccess('Could not save the card.');
    } finally {
      setBusy(false);
    }
  };

  const handleCopyCaption = async () => {
    const ok = await LocalShareService.copyTextToClipboard(caption);
    toastSuccess(ok ? 'Caption copied.' : 'Could not copy the caption.');
  };

  const handleIntent = async (channel) => {
    const result = await LocalShareService.openShareIntent(channel, caption);
    toastSuccess(
      result?.success
        ? `${result.label} opened — caption's filled in, paste the card image in.`
        : result?.message || `Could not open ${channel}.`
    );
    if (result?.success) {
      // Make the image easy to paste into the opened composer
      const blob = await generateBlob();
      if (blob) await LocalShareService.copyImageToClipboard(blob, fileName);
    }
  };

  const handleDiscord = async () => {
    const blob = await generateBlob();
    const result = await LocalShareService.shareToDiscord({ imageBlob: blob, text: caption, filename: fileName });
    toastSuccess(result?.success ? 'Sent to Discord.' : result?.message || 'Could not reach Discord.');
  };

  const canNativeShare = LocalShareService.canUseNativeShare();

  return createPortal(
    <div className="post-composer-overlay" role="dialog" aria-modal="true" aria-label="Make a post">
      <div className="post-composer">
        <div className="post-composer-header">
          <div>
            <h3>Make a post</h3>
            <p>{game?.name} — your capture becomes the card background, or the cover art.</p>
          </div>
          <button type="button" className="post-composer-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="post-composer-body">
          <div className="post-composer-preview" aria-hidden="true">
            <div className="post-composer-card-scale">
              <GameShareCard game={game} gameStats={gameStats} coverImageOverride={bgDataUrl} />
            </div>
          </div>

          <div className="post-composer-side">
            <p className="post-side-label">Card background</p>
            <div className="post-bg-grid">
              <button
                type="button"
                className={`post-bg-option cover-option ${selectedBg === 'cover' ? 'selected' : ''}`}
                onClick={() => setSelectedBg('cover')}
              >
                <span className="post-bg-fallback">
                  <ImageIcon size={18} aria-hidden="true" />
                </span>
                <span className="post-bg-badge">cover</span>
              </button>
              {captures.map((capture) => (
                <CaptureBgButton
                  key={capture.filePath}
                  capture={capture}
                  selected={selectedBg === capture}
                  onSelect={setSelectedBg}
                />
              ))}
              {captures.length === 0 && (
                <p className="post-bg-empty">
                  No Game Bar captures found for {game?.name}. Take one with Win+Alt+PrtScn and it'll show up here.
                </p>
              )}
            </div>

            <p className="post-side-label">
              Caption
              <button type="button" className="post-variant-btn" onClick={nextVariant} title="Try a different draft">
                <RefreshCw size={13} aria-hidden="true" /> variant
              </button>
            </p>
            <textarea
              className="post-caption-input"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={4}
              maxLength={500}
              aria-label="Post caption"
            />

            <div className="post-actions">
              <button type="button" onClick={handleCopyImage} disabled={busy}>
                <Copy size={14} aria-hidden="true" /> Copy card
              </button>
              <button type="button" onClick={handleSaveImage} disabled={busy}>
                <Download size={14} aria-hidden="true" /> Save PNG
              </button>
              <button type="button" onClick={handleCopyCaption}>
                <Check size={14} aria-hidden="true" /> Copy caption
              </button>
            </div>
            <div className="post-actions post-actions-share">
              <button type="button" onClick={() => handleIntent('x')} disabled={busy}>
                <Send size={14} aria-hidden="true" /> X
              </button>
              <button type="button" onClick={() => handleIntent('reddit')} disabled={busy}>
                <Send size={14} aria-hidden="true" /> Reddit
              </button>
              <button type="button" onClick={handleDiscord} disabled={busy}>
                <Send size={14} aria-hidden="true" /> Discord
              </button>
              {canNativeShare && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    const blob = await generateBlob();
                    const result = await LocalShareService.shareWithNativeShare({
                      text: caption,
                      files: blob ? [new File([blob], fileName, { type: 'image/png' })] : [],
                    });
                    toastSuccess(result?.success ? 'Share sheet opened.' : result?.message || 'Share cancelled.');
                  }}
                >
                  <Send size={14} aria-hidden="true" /> More…
                </button>
              )}
            </div>
            <p className="post-hint">
              Image+text posts can't be attached via a web link — opening X/Reddit pre-fills your caption and copies the
              card to your clipboard so you can paste it straight in.
            </p>
          </div>
        </div>
      </div>

      {/* Full-size copy for export — the preview is CSS-scaled so its canvas
          would come out shrunken; this renders the same card at 1080px. */}
      <div style={{ position: 'fixed', left: 0, top: 0, opacity: 0, pointerEvents: 'none', zIndex: -1 }}>
        <div ref={exportCardRef}>
          <GameShareCard game={game} gameStats={gameStats} coverImageOverride={bgDataUrl} />
        </div>
      </div>
    </div>,
    document.body
  );
}
