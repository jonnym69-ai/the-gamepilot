import React, { useState, useMemo } from 'react';
import { User, Brain, LayoutGrid, Clock, Play } from 'lucide-react';
import GamerIdentityCard from './GamerIdentityCard';
import HabitInsightsPanel from './HabitInsightsPanel';
import SmartCollectionsShelf from './SmartCollectionsShelf';
import LazyImage from './LazyImage';
import { resolveGameArtworkBundle } from '../services/GameArtworkService';
import './LibrarianHubCarousel.css';

const TABS = [
  { id: 'identity', label: 'Identity', icon: User },
  { id: 'insights', label: 'Insights', icon: Brain },
  { id: 'recent', label: 'Recently Played', icon: Clock },
  { id: 'shelves', label: 'Smart Shelves', icon: LayoutGrid }
];

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

const RecentlyPlayedTab = ({ library, onLaunchGame }) => {
  const recentGames = useMemo(() => {
    return (Array.isArray(library) ? library : [])
      .filter((game) => game.last_played && game.time_played > 0)
      .sort((a, b) => new Date(b.last_played) - new Date(a.last_played))
      .slice(0, 5);
  }, [library]);

  if (recentGames.length === 0) {
    return (
      <div className="librarian-hub-empty">
        <Clock size={28} style={{ opacity: 0.4 }} />
        <p>No recent play sessions yet. Launch a game to see it here.</p>
      </div>
    );
  }

  return (
    <div className="librarian-hub-recently-played">
      <p className="librarian-hub-recently-played-intro">
        Your last {recentGames.length} game{recentGames.length === 1 ? '' : 's'} — pick up where you left off.
      </p>
      <div className="librarian-hub-recently-played-shelf">
        {recentGames.map((game) => {
          const { artwork, placeholder } = resolveGameArtworkBundle(game, { surface: 'portrait' });
          return (
            <div
              key={`recent-${game.appid || game.name}`}
              className="librarian-hub-recently-played-card"
              onClick={() => onLaunchGame?.(game)}
              title={game.name}
            >
              <div className="librarian-hub-recently-played-art">
                {artwork ? (
                  <LazyImage
                    src={artwork}
                    alt={game.name}
                    placeholder={placeholder}
                    className="librarian-hub-recently-played-image"
                  />
                ) : (
                  <div className="librarian-hub-recently-played-placeholder">
                    <Play size={20} />
                  </div>
                )}
                <div className="librarian-hub-recently-played-overlay">
                  <Play size={22} />
                </div>
              </div>
              <div className="librarian-hub-recently-played-info">
                <span className="librarian-hub-recently-played-name">{game.name}</span>
                <span className="librarian-hub-recently-played-meta">
                  {formatLastPlayed(game.last_played)} · {formatPlaytime(game.time_played)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const LibrarianHubCarousel = ({ library = [], onLaunchGame }) => {
  const [activeTab, setActiveTab] = useState('identity');

  return (
    <div className="librarian-hub-carousel">
      <div className="librarian-hub-tabs">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`librarian-hub-tab ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              aria-pressed={isActive}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="librarian-hub-panel">
        {activeTab === 'identity' && (
          <GamerIdentityCard library={library} />
        )}
        {activeTab === 'insights' && (
          <HabitInsightsPanel library={library} />
        )}
        {activeTab === 'recent' && (
          <RecentlyPlayedTab library={library} onLaunchGame={onLaunchGame} />
        )}
        {activeTab === 'shelves' && (
          <SmartCollectionsShelf library={library} onLaunchGame={onLaunchGame} />
        )}
      </div>
    </div>
  );
};

export default LibrarianHubCarousel;
