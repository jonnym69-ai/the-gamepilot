import React, { useCallback, useEffect, useState } from 'react';
import { Clapperboard, Film } from 'lucide-react';
import GameCapturesService from '../services/GameCapturesService';
import SessionRepository from '../services/SessionRepository';
import ScrollStrip from './ScrollStrip';
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
      <span className="captures-thumb-date" aria-hidden="true">
        {new Date(capture.capturedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
      </span>
      <span className="captures-thumb-badge" aria-hidden="true">
        {actionLabel ? 'assign' : capture.kind === 'video' ? 'clip' : ''}
      </span>
    </button>
  );
};

export default function GameCapturesRow({ gameName, library = [] }) {
  const [captures, setCaptures] = useState([]);
  const [unmatchedRecorder, setUnmatchedRecorder] = useState([]);
  const [unmatchedShots, setUnmatchedShots] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [inSessionOnly, setInSessionOnly] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [reviewLimit, setReviewLimit] = useState(24);
  const [assignedMessage, setAssignedMessage] = useState('');

  const load = useCallback(async () => {
    if (!gameName) return;
    const result = await GameCapturesService.getAttribution({ library });
    setCaptures(result.byGame.get(gameName) || []);
    const all = result.unattributed || [];
    // Recorder files that matched nothing are almost certainly gameplay —
    // they get their own strip. Generic screenshots stay in the review pool.
    setUnmatchedRecorder(all.filter((capture) => capture.source !== 'windows-screenshots'));
    setUnmatchedShots(all.filter((capture) => capture.source === 'windows-screenshots' && capture.kind === 'image'));
    setSessions(SessionRepository.getSessionHistory() || []);
    setLoaded(true);
  }, [gameName, library]);

  useEffect(() => {
    setLoaded(false);
    setReviewLimit(24);
    load().catch(() => setLoaded(true));
  }, [load]);

  const visibleShots = inSessionOnly
    ? unmatchedShots.filter((capture) => GameCapturesService.withinSessionWindow(capture, sessions))
    : unmatchedShots;

  if (!gameName || !loaded || (captures.length === 0 && unmatchedRecorder.length === 0 && unmatchedShots.length === 0))
    return null;

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
          <ScrollStrip className="captures-strip" role="group" aria-label={`Your ${gameName} captures`}>
            {captures.map((capture) => (
              <CaptureThumb key={capture.filePath} capture={capture} />
            ))}
          </ScrollStrip>
        </>
      )}

      {unmatchedRecorder.length > 0 && (
        <>
          <p className="captures-row-label">
            <Film size={13} aria-hidden="true" />
            From your recorders — unmatched ({unmatchedRecorder.length})
          </p>
          <div className="captures-strip captures-review-strip" role="group" aria-label="Unmatched recorder captures">
            {unmatchedRecorder.slice(0, reviewLimit).map((capture) => (
              <CaptureThumb
                key={capture.filePath}
                capture={capture}
                onClick={assign}
                actionLabel={`Assign ${capture.name} to ${gameName}`}
              />
            ))}
          </div>
        </>
      )}

      {unmatchedShots.length > 0 && (
        <details className="captures-review">
          <summary>
            Review unmatched screenshots (
            {inSessionOnly
              ? `${visibleShots.length} of ${unmatchedShots.length} during sessions`
              : unmatchedShots.length}
            )
          </summary>
          <p className="captures-review-note">
            Generic screenshots are never assigned by timestamp alone. Choose only images that belong to {gameName}.
          </p>
          <label className="captures-review-filter">
            <input
              type="checkbox"
              checked={inSessionOnly}
              onChange={(event) => setInSessionOnly(event.target.checked)}
            />
            Only screenshots taken while a session was live
          </label>
          <div className="captures-strip captures-review-strip" role="group" aria-label="Unmatched screenshots">
            {visibleShots.slice(0, reviewLimit).map((capture) => (
              <CaptureThumb
                key={capture.filePath}
                capture={capture}
                onClick={assign}
                actionLabel={`Assign ${capture.name} to ${gameName}`}
              />
            ))}
          </div>
          {visibleShots.length === 0 && (
            <p className="captures-review-note">
              None were taken during a recorded session — uncheck to browse them all.
            </p>
          )}
          {visibleShots.length > reviewLimit && (
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
