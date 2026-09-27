import React, { useMemo, useState } from 'react';
import { Play, Shuffle } from 'lucide-react';
import LazyImage from './LazyImage';
import { resolveGameArtworkBundle } from '../services/GameArtworkService';
import PlayNextService from '../services/PlayNextService';
import './PlayNextCard.css';

const getTimeEyebrow = () => {
  const hour = new Date().getHours();
  if (hour < 6) return 'A late-night pick';
  if (hour < 12) return "This morning's pick";
  if (hour < 18) return "This afternoon's pick";
  return "Tonight's pick";
};

/**
 * The startup decision card: one game, one reason, one Play button.
 * Resume mode leads with the last-played game; pick mode leads with the
 * recommendation engine's top choice. "Another" cycles the alternates.
 */
export default function PlayNextCard({ library, onLaunchGame, emptyFallback = null }) {
  const [pickOffset, setPickOffset] = useState(0);

  const suggestion = useMemo(() => {
    try {
      return PlayNextService.getPlayNext(library);
    } catch {
      return null;
    }
  }, [library]);

  if (!suggestion?.primary?.game) return emptyFallback;

  const choices = [suggestion.primary, ...(suggestion.alternates || [])];
  const current = choices[pickOffset % choices.length];
  const isResume = suggestion.mode === 'resume' && pickOffset === 0;
  const { game } = current;
  const gameName = game.name || game.title || 'Unknown game';
  const {
    artwork,
    fallbackSrc: artworkFallback,
    placeholder,
  } = resolveGameArtworkBundle(game, { surface: 'portrait', fallbackSurface: 'hero' });

  return (
    <div className="play-next-card" data-mode={isResume ? 'resume' : 'pick'}>
      <div className="play-next-art" aria-hidden="true">
        {artwork ? (
          <LazyImage
            src={artwork}
            fallbackSrc={artworkFallback}
            alt=""
            placeholder={placeholder}
            className="play-next-artwork"
          />
        ) : (
          <div className="play-next-artwork-placeholder">🎮</div>
        )}
      </div>
      <div className="play-next-body">
        <span className="play-next-eyebrow">{isResume ? 'Pick up where you left off' : getTimeEyebrow()}</span>
        <span className="play-next-title">{gameName}</span>
        <span className="play-next-reason">
          {current.reason}
          {current.detail ? ` · ${current.detail}` : ''}
        </span>
      </div>
      <div className="play-next-actions">
        <button type="button" className="play-next-play" onClick={() => onLaunchGame?.(game)}>
          <Play size={18} aria-hidden="true" />
          Play
        </button>
        {choices.length > 1 && (
          <button
            type="button"
            className="play-next-shuffle"
            onClick={() => setPickOffset((offset) => (offset + 1) % choices.length)}
            title="Another pick"
          >
            <Shuffle size={15} aria-hidden="true" />
            Another
          </button>
        )}
      </div>
    </div>
  );
}
