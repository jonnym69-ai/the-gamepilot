import React, { useCallback, useEffect, useState } from 'react';
import { Clapperboard, Film } from 'lucide-react';
import GameCapturesService from '../services/GameCapturesService';
import './GameCapturesRow.css';

// The user's Game Bar / ShadowPlay captures attributed to this game — named
// files by title, anonymous recorder files by session time. Generic Windows
// screenshots are only assigned explicitly by the user, never guessed.
const CaptureThumb = ({ capture, onClick, actionLabel }) => {
  const [thumb, setThumb] = useState(capture.kind === 'image' ? capture.fileUrl : null);
  const [thumbTried, setThumbTried] = useState(capture.kind === 'image');

  useEffect(() => {
    let cancelled = false;
    if (capture.kind === 'video' && !thumbTried) {
      setThumbTried(true);
      GameCapturesService.getClipPosterFrame(capture).then((frame) => {
        if (!cancelled && frame) setThumb(frame);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [capture, thumbTried]);

  return (
    <button
      type="button"
      className="captures-thumb"
      onClick={() => (onClick ? onClick(capture) : GameCapturesService.open(capture))}
      title={actionLabel || `${new Date(capture.capturedAt).toLocaleString()} — open ${capture.kind}`}
      aria-label={actionLabel || `Open ${capture.kind} capture ${capture.name}`}
    >
      {thumb ? (
        <img src={thumb} alt="" loading="lazy" />
      ) : (
        <span className="captures-thumb-fallback">
          <Film size={22} aria-hidden="true" />
        </span>
      )}
      <span className="captures-thumb-badge" aria-hidden="true">
        {actionLabel ? 'assign' : capture.kind === 'video' ? 'clip' : ''}
      </span>
    </button>
  );
};

export default function GameCapturesRow({ gameName, library = [] }) {
  const [captures, setCaptures] = useState([]);
  const [unattributed, setUnattributed] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [reviewLimit, setReviewLimit] = useState(24);
  const [assignedMessage, setAssignedMessage] = useState('');

  const load = useCallback(async () => {
    if (!gameName) return;
    const result = await GameCapturesService.getAttribution({ library });
    setCaptures(result.byGame.get(gameName) || []);
    setUnattributed((result.unattributed || []).filter((capture) => capture.kind === 'image'));
    setLoaded(true);
  }, [gameName, library]);

  useEffect(() => {
    setLoaded(false);
    setReviewLimit(24);
    load().catch(() => setLoaded(true));
  }, [load]);

  if (!gameName || !loaded || (captures.length === 0 && unattributed.length === 0)) return null;

  const assign = (capture) => {
    GameCapturesService.assign(capture, gameName);
    setAssignedMessage(`Assigned to ${gameName}.`);
    load();
  };

  return (
    <div className="captures-row">
      {captures.length > 0 && (
        <>
          <p className="captures-row-label">
            <Clapperboard size={13} aria-hidden="true" />
            Captures linked to this game — {captures.length}
          </p>
          <div className="captures-strip" role="group" aria-label={`Your ${gameName} captures`}>
            {captures.map((capture) => (
              <CaptureThumb key={capture.filePath} capture={capture} />
            ))}
          </div>
        </>
      )}

      {unattributed.length > 0 && (
        <details className="captures-review">
          <summary>Review unmatched screenshots ({unattributed.length})</summary>
          <p className="captures-review-note">
            Generic screenshots are never assigned by timestamp alone. Choose only images that belong to {gameName}.
          </p>
          <div className="captures-strip captures-review-strip" role="group" aria-label="Unmatched screenshots">
            {unattributed.slice(0, reviewLimit).map((capture) => (
              <CaptureThumb
                key={capture.filePath}
                capture={capture}
                onClick={assign}
                actionLabel={`Assign ${capture.name} to ${gameName}`}
              />
            ))}
          </div>
          {unattributed.length > reviewLimit && (
            <button type="button" className="captures-review-more" onClick={() => setReviewLimit((n) => n + 24)}>
              Show more screenshots
            </button>
          )}
          {assignedMessage && <p className="captures-review-assigned">{assignedMessage}</p>}
        </details>
      )}
    </div>
  );
}
