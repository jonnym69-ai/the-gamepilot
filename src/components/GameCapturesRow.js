import React, { useEffect, useState } from 'react';
import { Clapperboard, Film } from 'lucide-react';
import GameCapturesService from '../services/GameCapturesService';
import './GameCapturesRow.css';

// The user's Game Bar / ShadowPlay captures attributed to this game — named
// files by title, anonymous files by the session that was live when they
// were saved. Local files only; clips get a poster frame via <video>.
const CaptureThumb = ({ capture, gameName }) => {
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

  const open = () => GameCapturesService.open(capture);

  return (
    <button
      type="button"
      className="captures-thumb"
      onClick={open}
      title={`${new Date(capture.capturedAt).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })} — open ${capture.kind}`}
      aria-label={`Open ${capture.kind} capture ${capture.name}`}
    >
      {thumb ? (
        <img src={thumb} alt="" loading="lazy" />
      ) : (
        <span className="captures-thumb-fallback">
          <Film size={22} aria-hidden="true" />
        </span>
      )}
      {capture.kind === 'video' && (
        <span className="captures-thumb-badge" aria-hidden="true">
          clip
        </span>
      )}
    </button>
  );
};

export default function GameCapturesRow({ gameName, library = [] }) {
  const [captures, setCaptures] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!gameName) {
      setCaptures([]);
      return undefined;
    }
    setCaptures(null);
    GameCapturesService.getForGame(gameName, { library })
      .then((result) => {
        if (!cancelled) setCaptures(result || []);
      })
      .catch(() => {
        if (!cancelled) setCaptures([]);
      });
    return () => {
      cancelled = true;
    };
  }, [gameName, library]);

  if (!gameName || !captures || captures.length === 0) return null;

  return (
    <div className="captures-row">
      <p className="captures-row-label">
        <Clapperboard size={13} aria-hidden="true" />
        Game Bar captures — {captures.length} on disk
      </p>
      <div className="captures-strip" role="group" aria-label={`Your ${gameName} captures`}>
        {captures.map((capture) => (
          <CaptureThumb key={capture.filePath} capture={capture} gameName={gameName} />
        ))}
      </div>
    </div>
  );
}
