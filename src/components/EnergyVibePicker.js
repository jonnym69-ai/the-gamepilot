import React, { useMemo } from 'react';
import { Zap, Coffee, BookOpen, Flame, Compass, Play, Sparkles } from 'lucide-react';
import LazyImage from './LazyImage';
import { getGameArtworkPlaceholder, resolveGameArtwork } from '../services/GameArtworkService';
import './EnergyVibePicker.css';

export const VIBE_PROFILES = [
  {
    id: 'sweaty',
    name: 'High Focus',
    badge: '⚡ Sweaty & Intense',
    desc: 'High reflex, deep mastery, precision challenges & competitive grit',
    icon: Flame,
    color: '#ef4444',
    genres: ['Action', 'Shooter', 'Fighting', 'Roguelike', 'Strategy', 'Tactical', 'Horror'],
    match: (game) => {
      const g = (game.genres || []).map(x => x.toLowerCase());
      return g.some(x => ['action', 'shooter', 'fighting', 'roguelike', 'strategy', 'tactical', 'horror', 'soulslike'].includes(x));
    }
  },
  {
    id: 'podcast',
    name: 'Chill / Podcast',
    badge: '🛋️ Half-Asleep & Loop',
    desc: 'Low cognitive load, grind loops, cozy builders & podcast companions',
    icon: Coffee,
    color: '#10b981',
    genres: ['Casual', 'Simulation', 'Sandbox', 'Management', 'Platformer', 'Puzzle', 'Sports'],
    match: (game) => {
      const g = (game.genres || []).map(x => x.toLowerCase());
      return g.some(x => ['casual', 'simulation', 'sandbox', 'management', 'platformer', 'puzzle', 'sports', 'builder'].includes(x));
    }
  },
  {
    id: 'cinema',
    name: 'Story & Cinema',
    badge: '📖 Narrative Night',
    desc: 'Deep immersion, captivating lore, character journeys & cinematic worlds',
    icon: BookOpen,
    color: '#8b5cf6',
    genres: ['RPG', 'Story-driven', 'Adventure', 'Indie'],
    match: (game) => {
      const g = (game.genres || []).map(x => x.toLowerCase());
      return g.some(x => ['rpg', 'story-driven', 'adventure', 'indie', 'story rich', 'narrative'].includes(x));
    }
  },
  {
    id: 'novelty',
    name: 'Short Burst / Quick Fun',
    badge: '🎯 20-Min Quickie',
    desc: 'Immediate satisfaction, arcade vibes, low startup commitment',
    icon: Zap,
    color: '#ff8c42',
    genres: ['Casual', 'Platformer', 'Racing', 'Party', 'Puzzle'],
    match: (game) => {
      const g = (game.genres || []).map(x => x.toLowerCase());
      return g.some(x => ['casual', 'platformer', 'racing', 'party', 'puzzle', 'arcade'].includes(x));
    }
  }
];

export function EnergyVibePicker({ library = [], onLaunchGame = () => {}, onGameClick = null }) {
  const [selectedVibe, setSelectedVibe] = React.useState('sweaty');

  const activeProfile = useMemo(() => {
    return VIBE_PROFILES.find(v => v.id === selectedVibe) || VIBE_PROFILES[0];
  }, [selectedVibe]);

  const recommendedGames = useMemo(() => {
    if (!Array.isArray(library) || library.length === 0) return [];

    const matches = library.filter(game => {
      if (!game || !game.name) return false;
      return activeProfile.match(game);
    });

    // Score based on a healthy mix of rating, recent play, and familiarity
    return matches.sort((a, b) => {
      const scoreA = (Number(a.time_played || 0) > 0 ? 30 : 50) + (Number(a.userRating || a.rating || 7) * 4);
      const scoreB = (Number(b.time_played || 0) > 0 ? 30 : 50) + (Number(b.userRating || b.rating || 7) * 4);
      return scoreB - scoreA;
    }).slice(0, 4);
  }, [library, activeProfile]);

  return (
    <div className="energy-vibe-picker">
      <div className="vibe-header">
        <div className="vibe-title-row">
          <Sparkles size={18} className="vibe-icon-sparkle" />
          <h3 className="vibe-title">Current Vibe & Energy Filter</h3>
        </div>
        <p className="vibe-subtitle">
          Don't know what to play? Pick how much mental energy you have right now.
        </p>
      </div>

      <div className="vibe-tabs">
        {VIBE_PROFILES.map((profile) => {
          const Icon = profile.icon;
          const isActive = profile.id === selectedVibe;
          return (
            <button
              key={profile.id}
              type="button"
              className={`vibe-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => setSelectedVibe(profile.id)}
              style={{
                '--vibe-accent': profile.color
              }}
            >
              <Icon size={16} />
              <span className="vibe-tab-label">{profile.name}</span>
            </button>
          );
        })}
      </div>

      <div className="vibe-active-banner" style={{ borderColor: activeProfile.color }}>
        <div className="vibe-active-info">
          <span className="vibe-active-badge" style={{ color: activeProfile.color }}>
            {activeProfile.badge}
          </span>
          <p className="vibe-active-desc">{activeProfile.desc}</p>
        </div>
      </div>

      <div className="vibe-games-grid">
        {recommendedGames.length > 0 ? (
          recommendedGames.map((game) => {
            const artwork = resolveGameArtwork(game);
            const placeholder = getGameArtworkPlaceholder(game);
            const primaryGenre = (game.genres && game.genres[0]) || 'Game';

            return (
              <div
                key={game.appid || game.id || game.name}
                className="vibe-game-card"
                onClick={() => onGameClick ? onGameClick(game) : onLaunchGame(game)}
              >
                <div className="vibe-card-cover">
                  {artwork ? (
                    <LazyImage src={artwork} alt={game.name} placeholder={placeholder} className="vibe-card-img" />
                  ) : (
                    <div className="vibe-card-fallback">{game.name?.[0] || '🎮'}</div>
                  )}
                  <button
                    type="button"
                    className="vibe-card-quick-launch"
                    title={`Launch ${game.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onLaunchGame(game);
                    }}
                  >
                    <Play size={14} fill="currentColor" />
                  </button>
                </div>
                <div className="vibe-card-details">
                  <h4 className="vibe-card-name" title={game.name}>{game.name}</h4>
                  <div className="vibe-card-meta">
                    <span className="vibe-card-genre">{primaryGenre}</span>
                    <span className="vibe-card-platform">{game.platform || 'PC'}</span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="vibe-empty-state">
            <Compass size={24} />
            <p>Scan your library to see {activeProfile.name.toLowerCase()} recommendations.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default EnergyVibePicker;
