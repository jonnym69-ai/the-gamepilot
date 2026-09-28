import React, { useMemo } from 'react';
import { Play } from 'lucide-react';
import LazyImage from './LazyImage';
import { resolveGameArtworkBundle } from '../services/GameArtworkService';
import './RecentlyPlayedShelf.css';

const formatLastPlayed = (lastPlayed) => {
  if (!lastPlayed) return 'Never';
  const t = new Date(lastPlayed).getTime();
  if (!Number.isFinite(t) || t === 0) return 'Never';
  const days = Math.round((Date.now() - t) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.round(days / 30)}mo ago`;
  return `${Math.round(days / 365)}y ago`;
};

const formatPlaytime = (minutes) => {
  const total = Number(minutes) || 0;
  if (total <= 0) return '0h';
  const hrs = Math.floor(total / 60);
  if (hrs >= 1) return `${hrs}h`;
  return `${total}m`;
};

const RecentlyPlayedShelf = ({ library = [], onLaunchGame }) => {
  const recentGames = useMemo(() => {
    return (Array.isArray(library) ? library : [])
      .filter((game) => game.last_played && game.time_played > 0)
      .sort((a, b) => new Date(b.last_played) - new Date(a.last_played))
      .slice(0, 8);
  }, [library]);

  if (recentGames.length === 0) return null;

  return (
    <div className="recently-played-shelf">
      <p className="recently-played-intro">
        Your last {recentGames.length} game{recentGames.length === 1 ? '' : 's'} — pick up where you left off.
      </p>
      <div className="recently-played-row">
        {recentGames.map((game) => {
          const { artwork, placeholder } = resolveGameArtworkBundle(game, { surface: 'portrait' });
          return (
            <button
              key={`recent-${game.appid || game.name}`}
              type="button"
              className="recently-played-card"
              onClick={() => onLaunchGame?.(game)}
              aria-label={`Play ${game.name}`}
              title={`Play ${game.name}`}
            >
              <div className="recently-played-art">
                {artwork ? (
                  <LazyImage src={artwork} alt="" placeholder={placeholder} className="recently-played-image" />
                ) : (
                  <div className="recently-played-placeholder">
                    <Play size={20} />
                  </div>
                )}
                <div className="recently-played-overlay">
                  <Play size={22} />
                </div>
              </div>
              <div className="recently-played-info">
                <span className="recently-played-name">{game.name}</span>
                <span className="recently-played-meta">
                  {formatLastPlayed(game.last_played)} · {formatPlaytime(game.time_played)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default RecentlyPlayedShelf;
