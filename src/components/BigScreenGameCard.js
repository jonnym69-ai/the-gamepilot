import React, { memo, useMemo } from 'react';
import { Play } from 'lucide-react';
import { resolveGameArtwork, getGameArtworkPlaceholder } from '../services/GameArtworkService';
import LazyImage from './LazyImage';

function formatPlaytime(minutes) {
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  if (h < 1) return `${Math.round(minutes)}m`;
  return `${h}h`;
}

function getBlendedPlaytimeMinutes(game) {
  if (!game) return 0;
  return Math.max(
    0,
    Number(game.time_played || 0),
    Number(game.playtime?.total || 0),
    Number(game.playtime?.minutes || 0),
    Number(game.playtimeMinutes || 0),
    Number(game.importedPlaytimeMinutes || 0),
    Number(game.playtimeForever || 0),
    Number(game.totalPlaytime || 0)
  );
}

function BigScreenGameCard({ game, index, isFocused, onSelect }) {
  const artwork = useMemo(
    () => (game ? resolveGameArtwork(game, { surface: 'bigscreen' }) : ''),
    [game]
  );
  const fallbackArtwork = useMemo(
    () => (game ? resolveGameArtwork(game, { surface: 'hero' }) : ''),
    [game]
  );
  const placeholder = useMemo(
    () => (game ? getGameArtworkPlaceholder({ game, surface: 'bigscreen' }) : ''),
    [game]
  );

  if (!game) return null;

  const minutes = getBlendedPlaytimeMinutes(game);
  const playtimeLabel = formatPlaytime(minutes);
  const fallbackSrc = fallbackArtwork && fallbackArtwork !== artwork ? fallbackArtwork : null;

  return (
    <div
      className={`bs-game-card ${isFocused ? 'bs-game-card-focused' : ''}`}
      onClick={() => onSelect(index)}
      title={game.name}
    >
      <div className="bs-game-card-artwork">
        <LazyImage
          src={artwork}
          fallbackSrc={fallbackSrc}
          alt={game.name}
          placeholder={placeholder}
          gameName={game.name}
          platform={game.brandPlatform || game.platform}
        />
        <div className="bs-game-card-shade" />
        {isFocused && (
          <div className="bs-game-card-play-overlay">
            <Play size={40} fill="currentColor" />
          </div>
        )}
        <div className="bs-game-card-caption">
          <span className="bs-game-card-title">{game.name}</span>
          {playtimeLabel && <span className="bs-game-card-hours">{playtimeLabel}</span>}
        </div>
      </div>
    </div>
  );
}

export default memo(BigScreenGameCard);
