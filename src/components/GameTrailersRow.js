import React, { useState } from 'react';
import { Play, X } from 'lucide-react';
import './GameTrailersRow.css';

// Steam store trailers (from appdetails.movies via steam-store-details).
// Thumbnails only until clicked — one video at a time, muted by default.
export default function GameTrailersRow({ movies = [], label = 'Trailers' }) {
  const [activeId, setActiveId] = useState(null);
  const list = (Array.isArray(movies) ? movies : []).filter((m) => m?.thumbnail && (m.webm || m.mp4));
  if (list.length === 0) return null;
  const current = list.find((m) => m.id === activeId) || null;

  return (
    <div className="game-trailers">
      {current ? (
        <div className="game-trailers-player">
          <video
            key={current.id}
            src={current.webm || current.mp4}
            poster={current.thumbnail}
            controls
            autoPlay
            muted
            aria-label={current.name || label}
          />
          <button
            type="button"
            className="game-trailers-close"
            onClick={() => setActiveId(null)}
            aria-label="Close trailer"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="game-trailers-strip" role="group" aria-label={label}>
          {list.map((movie) => (
            <button
              key={movie.id || movie.name}
              type="button"
              className="game-trailers-thumb"
              onClick={() => setActiveId(movie.id)}
              aria-label={movie.name ? `Play trailer: ${movie.name}` : 'Play trailer'}
            >
              <img src={movie.thumbnail} alt="" loading="lazy" />
              <span className="game-trailers-play" aria-hidden="true">
                <Play size={16} />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
