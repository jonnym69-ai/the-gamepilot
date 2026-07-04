import React from 'react';
import { BookOpen, Gamepad2, Sparkles } from 'lucide-react';
import { formatPlaytime } from '../utils/formatPlaytime';
import './GamingStoryCard.css';

function GamingStoryCard({ story, onContinue }) {
  if (!story) return null;

  const { title, subtitle, topGames, genreFingerprint, narrative } = story;

  return (
    <div className="gaming-story-overlay" role="dialog" aria-modal="true" aria-labelledby="gaming-story-title">
      <div className="gaming-story-card">
        <div className="gaming-story-covers">
          {topGames.map((game, index) => (
            <div
              key={game.name}
              className="gaming-story-cover"
              style={{
                backgroundImage: `url(${game.coverUrl})`,
                zIndex: topGames.length - index
              }}
              aria-hidden="true"
            />
          ))}
          <div className="gaming-story-cover-gradient" aria-hidden="true" />
        </div>

        <div className="gaming-story-content">
          <div className="gaming-story-badge">
            <Sparkles size={14} />
            Your gaming identity
          </div>

          <h2 id="gaming-story-title">{title}</h2>
          <p className="gaming-story-subtitle">{subtitle}</p>

          <div className="gaming-story-stats">
            {topGames.slice(0, 3).map((game) => (
              <div key={game.name} className="gaming-story-stat">
                <span className="gaming-story-stat-hours">{formatPlaytime(game.hours * 60)}</span>
                <span className="gaming-story-stat-name">{game.name}</span>
              </div>
            ))}
          </div>

          {genreFingerprint.length > 0 && (
            <div className="gaming-story-genres">
              {genreFingerprint.map((entry) => (
                <span key={entry.genre} className="gaming-story-genre">
                  {entry.genre}
                </span>
              ))}
            </div>
          )}

          <p
          className="gaming-story-narrative"
          dangerouslySetInnerHTML={{
            __html: narrative.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          }}
        />

          <div className="gaming-story-note">
            <BookOpen size={14} />
            <span>This story will grow as GamePilot learns more about your habits.</span>
          </div>
        </div>

        <div className="gaming-story-actions">
          <button className="gaming-story-primary" onClick={onContinue}>
            <Gamepad2 size={16} />
            Continue to your cockpit
          </button>
        </div>
      </div>
    </div>
  );
}

export default GamingStoryCard;
