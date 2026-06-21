import React, { useMemo, useState } from 'react';
import {
  Play,
  Archive,
  Heart,
  Gem,
  Compass,
  Repeat,
  Calendar,
  Zap,
  Smile,
  Search,
  AlertCircle,
  Trophy,
  Sparkles,
  ChevronRight,
  X,
  LayoutGrid
} from 'lucide-react';
import { SmartCollectionsService } from '../services/SmartCollectionsService';
import { getGameArtworkPlaceholder, resolveGameArtwork } from '../services/GameArtworkService';
import './SmartCollectionsShelf.css';

const ICON_MAP = {
  'play-circle': Play,
  archive: Archive,
  heart: Heart,
  gem: Gem,
  compass: Compass,
  repeat: Repeat,
  calendar: Calendar,
  zap: Zap,
  smile: Smile,
  search: Search,
  'alert-circle': AlertCircle,
  trophy: Trophy,
  sparkles: Sparkles
};

const SmartCollectionCard = ({ collection, onLaunchGame, onDismiss }) => {
  const [expanded, setExpanded] = useState(false);
  const Icon = ICON_MAP[collection.icon] || LayoutGrid;
  const displayGames = expanded ? collection.games : collection.games.slice(0, 4);

  return (
    <div className="smart-collection-card" style={{ '--collection-accent': collection.color }}>
      <div className="smart-collection-header">
        <div className="smart-collection-meta">
          <div className="smart-collection-icon" style={{ background: `${collection.color}20`, color: collection.color }}>
            <Icon size={18} />
          </div>
          <div className="smart-collection-titles">
            <h4 className="smart-collection-title">{collection.title}</h4>
            <p className="smart-collection-subtitle">{collection.subtitle}</p>
          </div>
        </div>
        <div className="smart-collection-actions">
          {collection.games.length > 4 && (
            <button
              type="button"
              className="smart-collection-expand"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Show less' : `+${collection.games.length - 4} more`}
            </button>
          )}
          <button
            type="button"
            className="smart-collection-dismiss"
            onClick={() => onDismiss?.(collection.id)}
            title="Dismiss this collection"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {collection.isInsightOnly ? (
        <div className="smart-collection-insight">
          <p>{collection.insight}</p>
          <div className="smart-collection-gaps">
            {collection.gaps?.slice(0, 6).map((gap) => (
              <span key={gap} className="smart-gap-pill">{gap}</span>
            ))}
          </div>
        </div>
      ) : (
        <div className="smart-collection-games">
          {displayGames.map((game) => {
            const artwork = resolveGameArtwork(game);
            const placeholder = getGameArtworkPlaceholder(game);
            return (
              <button
                key={game.appid || game.name}
                type="button"
                className="smart-game-chip"
                onClick={() => onLaunchGame?.(game)}
                title={game.name}
              >
                <div className="smart-game-thumb">
                  {artwork ? (
                    <img src={artwork} alt={game.name} loading="lazy" />
                  ) : (
                    <div className="smart-game-placeholder">{placeholder}</div>
                  )}
                </div>
                <span className="smart-game-name">{game.name}</span>
                <ChevronRight size={12} className="smart-game-arrow" />
              </button>
            );
          })}
        </div>
      )}

      {collection.insight && !collection.isInsightOnly && (
        <p className="smart-collection-footer">{collection.insight}</p>
      )}
    </div>
  );
};

const SmartCollectionsShelf = ({ library = [], onLaunchGame }) => {
  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('smartCollectionsDismissed') || '[]'));
    } catch {
      return new Set();
    }
  });

  const collections = useMemo(() => {
    if (!Array.isArray(library) || library.length === 0) return [];
    const all = SmartCollectionsService.buildAllCollections(library);
    return all.filter((c) => !dismissedIds.has(c.id));
  }, [library, dismissedIds]);

  const handleDismiss = (id) => {
    SmartCollectionsService.dismissCollection(id);
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  if (collections.length === 0) {
    return null;
  }

  return (
    <div className="smart-collections-shelf">
      <div className="smart-collections-header">
        <LayoutGrid size={18} />
        <h3>Your Smart Shelves</h3>
        <span className="smart-collections-badge">{collections.length} curated</span>
      </div>
      <div className="smart-collections-list">
        {collections.map((collection) => (
          <SmartCollectionCard
            key={collection.id}
            collection={collection}
            onLaunchGame={onLaunchGame}
            onDismiss={handleDismiss}
          />
        ))}
      </div>
    </div>
  );
};

export default SmartCollectionsShelf;
