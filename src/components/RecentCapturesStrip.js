import React, { useEffect, useState } from 'react';
import { Camera } from 'lucide-react';
import GameCapturesService from '../services/GameCapturesService';
import ScrollStrip from './ScrollStrip';
import { CaptureThumb } from './GameCapturesRow';
import './RecentCapturesStrip.css';

const MAX_CAPTURES = 12;

/**
 * PS5-style memory reel: the newest captures across every attributed game,
 * newest first. Click-through opens the file itself. Only attributed captures
 * appear — an unattributed file shown without a game name invites guessing.
 */
export default function RecentCapturesStrip({ library = [] }) {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    GameCapturesService.getAttribution({ library })
      .then(({ byGame }) => {
        if (cancelled) return;
        const flat = [];
        (byGame || new Map()).forEach((captures, gameName) => {
          (Array.isArray(captures) ? captures : []).forEach((capture) => {
            flat.push({ gameName, capture });
          });
        });
        flat.sort((a, b) => Number(b.capture?.capturedAt || 0) - Number(a.capture?.capturedAt || 0));
        setItems(flat.slice(0, MAX_CAPTURES));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [library]);

  if (!loaded || items.length === 0) return null;

  return (
    <section className="recent-captures" aria-label="Recent captures">
      <h3 className="recent-captures-title">
        <Camera size={15} aria-hidden="true" /> Your latest captures
      </h3>
      <ScrollStrip className="captures-strip" role="group" aria-label="Your latest captures across games">
        {items.map(({ gameName, capture }) => (
          <figure key={capture.filePath} className="recent-captures-item">
            <CaptureThumb
              capture={capture}
              actionLabel={`Open ${capture.kind} capture ${capture.name} — ${gameName}`}
              badge={capture.kind === 'video' ? 'clip' : ''}
            />
            <figcaption className="recent-captures-game">{gameName}</figcaption>
          </figure>
        ))}
      </ScrollStrip>
    </section>
  );
}
