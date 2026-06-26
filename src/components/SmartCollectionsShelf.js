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
  LayoutGrid,
  Folder,
  Shield,
  Star
} from 'lucide-react';
import { SmartCollectionsService } from '../services/SmartCollectionsService';
import { UserRuleCollectionService } from '../services/UserRuleCollectionService';
import { getGameArtworkPlaceholder, resolveGameArtwork } from '../services/GameArtworkService';
import CreateCollectionModal from './CreateCollectionModal';
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
  sparkles: Sparkles,
  folder: Folder,
  shield: Shield,
  star: Star
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
            <h4 className="smart-collection-title">
              {collection.title}
              {collection.isUserCreated && (
                <span className="smart-collection-user-badge">Custom</span>
              )}
              {collection.isPreset && (
                <span className="smart-collection-preset-badge">Preset</span>
              )}
            </h4>
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userCollectionsVersion, setUserCollectionsVersion] = useState(0);

  const userCollections = useMemo(() => {
    if (!Array.isArray(library) || library.length === 0) return [];
    return UserRuleCollectionService.evaluateAllCollections(library);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [library, userCollectionsVersion]);

  const collections = useMemo(() => {
    if (!Array.isArray(library) || library.length === 0) return userCollections;
    const system = SmartCollectionsService.buildAllCollections(library);
    const merged = [...system, ...userCollections];
    return merged.filter((c) => !dismissedIds.has(c.id));
  }, [library, dismissedIds, userCollections]);

  const handleDismiss = (id) => {
    SmartCollectionsService.dismissCollection(id);
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const handleCreated = () => {
    setUserCollectionsVersion((v) => v + 1);
  };

  if (collections.length === 0 && !showCreateModal) {
    return (
      <div className="smart-collections-shelf">
        <div className="smart-collections-header">
          <LayoutGrid size={18} />
          <h3>Your Smart Shelves</h3>
        </div>
        <div className="smart-collections-empty">
          <p>No smart collections yet.</p>
          <button
            type="button"
            className="smart-collections-create-btn"
            onClick={() => setShowCreateModal(true)}
          >
            Create your first collection
          </button>
        </div>
        <CreateCollectionModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          library={library}
          onCreated={handleCreated}
        />
      </div>
    );
  }

  return (
    <div className="smart-collections-shelf">
      <div className="smart-collections-header">
        <LayoutGrid size={18} />
        <h3>Your Smart Shelves</h3>
        <div className="smart-collections-header-actions">
          <span className="smart-collections-badge">{collections.length} curated</span>
          <button
            type="button"
            className="smart-collections-create-btn"
            onClick={() => setShowCreateModal(true)}
            title="Create custom collection"
          >
            + New
          </button>
        </div>
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
      <CreateCollectionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        library={library}
        onCreated={handleCreated}
      />
    </div>
  );
};

export default SmartCollectionsShelf;
