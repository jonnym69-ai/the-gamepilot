import React, { useState, useMemo } from 'react';
import { 
  Trophy, 
  Lock, 
  Star, 
  Music, 
  Palette, 
  Crown,
  CheckCircle2,
  Circle,
  Gift,
  Zap
} from 'lucide-react';
import CollectionsService from '../services/CollectionsService';

const CollectionIcon = ({ icon, category }) => {
  const iconMap = {
    '🎵': <Music size={20} />,
    '✨': <Star size={20} />,
    '🎨': <Palette size={20} />,
    '🚀': <Zap size={20} />,
    '👑': <Crown size={20} />,
    '🔘': <Circle size={20} />,
    '🌊': <Trophy size={20} />,
    '🎼': <Music size={20} />
  };
  
  return (
    <span className="collection-icon">
      {iconMap[icon] || <Trophy size={20} />}
    </span>
  );
};

const ProgressBar = ({ percent, isComplete }) => (
  <div className="collection-progress-bar">
    <div 
      className={`collection-progress-fill ${isComplete ? 'complete' : ''}`}
      style={{ width: `${percent}%` }}
    />
  </div>
);

const CollectionCard = ({ collection, onClaimBonus }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const { 
    id, 
    name, 
    description, 
    icon, 
    category,
    status,
    isCompleted,
    canClaimBonus,
    rewards 
  } = collection;

  return (
    <div className={`collection-card ${isCompleted ? 'completed' : ''} ${canClaimBonus ? 'claimable' : ''}`}>
      <div className="collection-card-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="collection-card-icon">
          <CollectionIcon icon={icon} category={category} />
        </div>
        <div className="collection-card-info">
          <h4>{name}</h4>
          <p>{description}</p>
        </div>
        <div className="collection-card-status">
          {isCompleted ? (
            <CheckCircle2 size={24} className="status-complete" />
          ) : canClaimBonus ? (
            <Gift size={24} className="status-claimable" />
          ) : (
            <Lock size={20} className="status-locked" />
          )}
        </div>
      </div>

      <ProgressBar percent={status.percent} isComplete={isCompleted} />
      
      <div className="collection-card-stats">
        <span>{status.unlockedItems}/{status.totalItems} collected</span>
        <span className="collection-percent">{status.percent}%</span>
      </div>

      {isExpanded && (
        <div className="collection-card-details">
          {status.checks?.map((check, idx) => (
            <div key={idx} className="collection-check-item">
              <span className="check-type">{check.type}</span>
              <span className="check-progress">
                {check.unlocked}/{check.total}
              </span>
              {check.unlocked === check.total ? (
                <CheckCircle2 size={16} className="check-complete" />
              ) : (
                <Circle size={16} className="check-incomplete" />
              )}
            </div>
          ))}
          
          {rewards?.setBonusXP > 0 && (
            <div className="collection-rewards">
              <h5>Set Bonus Rewards</h5>
              <div className="reward-item">
                <Zap size={16} />
                <span>{rewards.setBonusXP.toLocaleString()} XP</span>
              </div>
              {rewards.exclusiveTitle && (
                <div className="reward-item">
                  <Trophy size={16} />
                  <span>Title: {rewards.exclusiveTitle}</span>
                </div>
              )}
              {rewards.exclusiveFrame && (
                <div className="reward-item">
                  <Star size={16} />
                  <span>Frame: {rewards.exclusiveFrame}</span>
                </div>
              )}
              {rewards.exclusiveTheme && (
                <div className="reward-item">
                  <Palette size={16} />
                  <span>Theme: {rewards.exclusiveTheme}</span>
                </div>
              )}
            </div>
          )}

          {canClaimBonus && (
            <button 
              className="claim-bonus-button"
              onClick={() => onClaimBonus?.(id)}
            >
              <Gift size={16} />
              Claim Set Bonus
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const CollectionsPanel = ({ 
  unlockedData = {},
  totalXP = 0,
  onClaimBonus 
}) => {
  const [filter, setFilter] = useState('all');
  
  const collections = useMemo(() => {
    return CollectionsService.getAllCompletionStatus(unlockedData);
  }, [unlockedData]);

  const overallStats = useMemo(() => {
    return CollectionsService.getOverallCompletion(unlockedData);
  }, [unlockedData]);

  const recommended = useMemo(() => {
    return CollectionsService.getRecommendedCollection(unlockedData);
  }, [unlockedData]);

  const filteredCollections = useMemo(() => {
    if (filter === 'all') return collections;
    if (filter === 'completed') return collections.filter(c => c.isCompleted);
    if (filter === 'incomplete') return collections.filter(c => !c.isCompleted);
    if (filter === 'claimable') return collections.filter(c => c.canClaimBonus);
    return collections.filter(c => c.category === filter);
  }, [collections, filter]);

  const handleClaimBonus = (collectionId) => {
    const bonusXP = CollectionsService.grantSetBonus(collectionId);
    if (bonusXP) {
      CollectionsService.completeCollection(collectionId);
      onClaimBonus?.(collectionId, bonusXP);
    }
  };

  const categories = ['all', 'audio', 'cosmetic', 'themes', 'milestone', 'legendary', 'completed', 'incomplete'];

  return (
    <div className="collections-panel">
      <div className="collections-header">
        <div className="collections-title">
          <Trophy size={24} />
          <h3>Collections</h3>
        </div>
        <p className="collections-subtitle">
          Complete themed sets of rewards for exclusive bonuses
        </p>
      </div>

      <div className="collections-stats">
        <div className="stat-card">
          <span className="stat-value">{overallStats.completedCollections}</span>
          <span className="stat-label">Completed</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{overallStats.totalCollections}</span>
          <span className="stat-label">Total Sets</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{overallStats.percent}%</span>
          <span className="stat-label">Progress</span>
        </div>
        <div className="stat-card bonus">
          <span className="stat-value">{overallStats.totalBonusXP.toLocaleString()}</span>
          <span className="stat-label">Bonus XP Earned</span>
        </div>
      </div>

      {recommended && !recommended.isCompleted && (
        <div className="recommended-collection">
          <h4>Recommended Next</h4>
          <div className="recommended-card">
            <CollectionIcon icon={recommended.icon} />
            <div className="recommended-info">
              <span className="recommended-name">{recommended.name}</span>
              <ProgressBar percent={recommended.status.percent} />
              <span className="recommended-progress">
                {recommended.status.percent}% complete • {recommended.status.unlockedItems}/{recommended.status.totalItems} items
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="collections-filter">
        {categories.map(cat => (
          <button
            key={cat}
            className={`filter-btn ${filter === cat ? 'active' : ''}`}
            onClick={() => setFilter(cat)}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      <div className="collections-grid">
        {filteredCollections.map(collection => (
          <CollectionCard 
            key={collection.id}
            collection={collection}
            onClaimBonus={handleClaimBonus}
          />
        ))}
      </div>
    </div>
  );
};

export default CollectionsPanel;
