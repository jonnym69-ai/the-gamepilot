import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Star, Clock, Calendar, Play, ExternalLink, Heart, Share2 } from 'lucide-react';
import { formatPrice, parseSteamPrice, storePurchasePrice, getCurrentCurrency } from '../CurrencyConverter';
import { GameRequirements } from '../services/GameRequirements';
import { openExternalUrl } from '../services/ElectronBridge';
import { HardwareDetector } from '../services/HardwareDetector';
import { LocalShareService } from '../services/LocalShareService';
import './GameModal.css';

const REPLAY_INTENT_OPTIONS = ['none', 'soon', 'active', 'finished', 'endless'];

const GameModal = ({ game, isOpen, onClose, onLaunch, onToggleFavorite, isFavorite = false, onUpdatePrice, onUpdateRating }) => {
  const [gameDetails, setGameDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [screenshots, setScreenshots] = useState([]);
  const [currentScreenshot, setCurrentScreenshot] = useState(0);
  const [systemInfo, setSystemInfo] = useState(null);
  const [compatibility, setCompatibility] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [rating, setRating] = useState(game?.userRating || 0);
  const [replayIntent, setReplayIntent] = useState(game?.replayIntent || 'none');
  const [selectedControlIndex, setSelectedControlIndex] = useState(0);
  const fetchedGameId = React.useRef(null);

  // Sync state when game prop changes
  useEffect(() => {
    if (game) {
      setRating(game.userRating || 0);
      setReplayIntent(game.replayIntent || 'none');
      setSelectedControlIndex(0);
    }
  }, [game]);

  const handleRatingChange = useCallback((newRating) => {
    setRating(newRating);
  }, []);

  const handleRatingSave = useCallback((finalRating) => {
    if (onUpdateRating) {
      onUpdateRating(game.name, finalRating, replayIntent);
    }
  }, [game, onUpdateRating, replayIntent]);

  const handleReplayIntentChange = useCallback((newIntent) => {
    setReplayIntent(newIntent);
    if (onUpdateRating) {
      onUpdateRating(game.name, rating, newIntent);
    }
  }, [game, onUpdateRating, rating]);

  // Get system info on component mount
  useEffect(() => {
    const getSystemInfo = async () => {
      try {
        const info = await HardwareDetector.getSystemInfo();
        setSystemInfo(info);
      } catch (error) {
        console.error('Failed to get system info:', error);
      }
    };
    getSystemInfo();
  }, []);

  // Load completion status from localStorage
  useEffect(() => {
    if (game) {
      const completedGames = JSON.parse(localStorage.getItem('completedGames') || '[]');
      const completed = completedGames.some(cg => cg.name === game.name);
      setIsCompleted(completed);
    }
  }, [game]);

  // Calculate compatibility when systemInfo or game changes
  useEffect(() => {
    if (systemInfo && game) {
      try {
        const compatData = GameRequirements.checkGameCompatibility(game, systemInfo);
        setCompatibility(compatData);
      } catch (error) {
        console.error('Failed to calculate compatibility:', error);
      }
      return;
    }

    setCompatibility(null);
  }, [systemInfo, game]);

  useEffect(() => {
    if (!game) {
      setGameDetails(null);
      setScreenshots([]);
      setCurrentScreenshot(0);
      fetchedGameId.current = null;
      return;
    }

    setCurrentScreenshot(0);
    if (!game.appid) {
      setGameDetails(null);
      setScreenshots([]);
      setLoading(false);
      fetchedGameId.current = null;
    } else if (game.appid !== fetchedGameId.current) {
      setGameDetails(null);
      setScreenshots([]);
    }
  }, [game]);

  const toggleCompletion = useCallback(() => {
    if (!game) return;
    
    const completedGames = JSON.parse(localStorage.getItem('completedGames') || '[]');
    const gameIndex = completedGames.findIndex(cg => cg.name === game.name);
    
    if (gameIndex > -1) {
      // Remove from completed
      completedGames.splice(gameIndex, 1);
      setIsCompleted(false);
    } else {
      // Add to completed
      completedGames.push({
        name: game.name,
        appid: game.appid,
        completedDate: new Date().toISOString()
      });
      setIsCompleted(true);
    }
    
    localStorage.setItem('completedGames', JSON.stringify(completedGames));
  }, [game]);

  const fetchGameDetails = useCallback(async () => {
    if (!game?.appid || fetchedGameId.current === game.appid) return;
    
    setLoading(true);
    fetchedGameId.current = game.appid;
    
    try {
      const response = await fetch(`https://store.steampowered.com/api/appdetails?appids=${game.appid}&cc=us&l=en`);
      const data = await response.json();
      
      if (data?.[game.appid]?.success) {
        const details = data[game.appid].data;
        setGameDetails(details);
        setScreenshots(details.screenshots || []);
        
        // Store purchase price for tracking
        if (details.price_overview) {
          const priceInUSD = parseSteamPrice(details.price_overview.final_formatted);
          const currentCurrency = getCurrentCurrency();
          storePurchasePrice(game.appid, priceInUSD, currentCurrency);
          
          // Call onUpdatePrice with the original price data
          if (onUpdatePrice) {
            onUpdatePrice(game.appid, details.price_overview);
          }
        }
      } else {
        setGameDetails(null);
        setScreenshots([]);
      }
    } catch (error) {
      console.error('Failed to fetch game details:', error);
      setGameDetails(null);
      setScreenshots([]);
    } finally {
      setLoading(false);
    }
  }, [game, onUpdatePrice]);

  useEffect(() => {
    if (isOpen && game?.appid && game.appid !== fetchedGameId.current) {
      fetchGameDetails();
    }
  }, [isOpen, game, fetchGameDetails]);

  const handleLaunchGame = useCallback(async () => {
    if (!game) return;

    if (typeof onLaunch === 'function') {
      onLaunch(game);
      return;
    }

    if (game.appid) {
      await openExternalUrl(`steam://run/${game.appid}`);
    }
  }, [game, onLaunch]);

  const handleOpenStore = useCallback(async () => {
    if (!game?.appid) {
      return;
    }

    await openExternalUrl(`https://store.steampowered.com/app/${game.appid}`);
  }, [game]);

  const favoriteKey = game?.appid || game?.app_id || game?.steamAppId || game?.name;

  const modalControls = useMemo(() => [
    'launch',
    'close',
    'completion',
    'rating',
    'replay',
    ...(game?.appid ? ['store'] : []),
    ...(typeof onToggleFavorite === 'function' ? ['favorite'] : []),
    'share'
  ], [game?.appid, onToggleFavorite]);

  useEffect(() => {
    if (!isOpen || !game) {
      return undefined;
    }

    const cycleReplayIntent = (direction) => {
      const currentIndex = Math.max(0, REPLAY_INTENT_OPTIONS.indexOf(replayIntent));
      const nextIndex = Math.max(0, Math.min(REPLAY_INTENT_OPTIONS.length - 1, currentIndex + direction));
      const nextIntent = REPLAY_INTENT_OPTIONS[nextIndex];
      handleReplayIntentChange(nextIntent);
    };

    const handleModalControllerInput = (event) => {
      const action = event?.detail?.action;
      const activeControl = modalControls[selectedControlIndex] || modalControls[0];

      if (!action) {
        return;
      }

      event.preventDefault();

      if (action === 'cancel') {
        onClose();
        return;
      }

      if (action === 'page_previous' || action === 'up') {
        setSelectedControlIndex((prev) => Math.max(0, prev - 1));
        return;
      }

      if (action === 'page_next' || action === 'down') {
        setSelectedControlIndex((prev) => Math.min(modalControls.length - 1, prev + 1));
        return;
      }

      if (activeControl === 'rating') {
        if (action === 'left') {
          const nextRating = Math.max(0, Number((rating - 0.5).toFixed(1)));
          handleRatingChange(nextRating);
          handleRatingSave(nextRating);
          return;
        }

        if (action === 'right') {
          const nextRating = Math.min(10, Number((rating + 0.5).toFixed(1)));
          handleRatingChange(nextRating);
          handleRatingSave(nextRating);
          return;
        }
      }

      if (activeControl === 'replay') {
        if (action === 'left') {
          cycleReplayIntent(-1);
          return;
        }

        if (action === 'right') {
          cycleReplayIntent(1);
          return;
        }
      }

      if (action !== 'confirm') {
        return;
      }

      switch (activeControl) {
        case 'launch':
          handleLaunchGame();
          break;
        case 'close':
          onClose();
          break;
        case 'completion':
          toggleCompletion();
          break;
        case 'store':
          handleOpenStore();
          break;
        case 'favorite':
          onToggleFavorite?.(favoriteKey);
          break;
        case 'share': {
          const shareText = `Check out ${game.name} on GamePilot! I've played for ${((game.time_played || 0) / 60).toFixed(1)} hours. #GamePilot`;
          LocalShareService.copyTextToClipboard(shareText);
          alert('Share text copied to clipboard!');
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener('controllerInput', handleModalControllerInput);
    return () => window.removeEventListener('controllerInput', handleModalControllerInput);
  }, [favoriteKey, game, handleLaunchGame, handleOpenStore, handleRatingChange, handleRatingSave, handleReplayIntentChange, isOpen, modalControls, onClose, onToggleFavorite, rating, replayIntent, selectedControlIndex, toggleCompletion]);

  if (!isOpen || !game) {
    return <div style={{ display: 'none' }} aria-hidden="true" />;
  }

  const iconSource = game.icon || game.iconUrl || 'https://placehold.co/96x96.jpg?text=Game';
  const platformLabel = game.brandPlatform || game.platform || 'Unknown Platform';
  const genreLabels = gameDetails?.genres?.map((entry) => entry.description).filter(Boolean)
    || (Array.isArray(game.genres) ? game.genres.filter(Boolean) : []);
  const compatibilityLabel = compatibility ? GameRequirements.getSettingsLabel(compatibility.settingsLevel) : null;
  const fallbackOverview = `${game.name} is tracked in your ${platformLabel} library${game.mood ? ` and tagged for ${String(game.mood).toLowerCase()} sessions` : ''}.`;
  const formatDateValue = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
  };

  return (
    <div className="game-modal-overlay" onClick={onClose}>
      <div className="game-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="game-modal-header">
          <div className="game-modal-title">
            <img 
              src={iconSource} 
              alt={game.name} 
              className="game-modal-icon"
              onError={(e) => {
                e.target.src = 'https://placehold.co/60x60.jpg?text=Loading...';
              }}
            />
            <h2>{game.name}</h2>
          </div>
          <button className="game-modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="game-modal-body">
          {loading ? (
            <div className="game-modal-loading">
              <div className="game-modal-spinner"></div>
              <p>Loading game details...</p>
            </div>
          ) : (
            <div className="game-modal-layout">
              <div className="game-modal-primary">
                <div className="screenshots-section">
                  {screenshots.length > 0 ? (
                    <div className="screenshot-carousel">
                      <div className="screenshot-main">
                        <img 
                          key={`main-screenshot-${currentScreenshot}`}
                          src={screenshots[currentScreenshot]?.path_full} 
                          alt={`Screenshot ${currentScreenshot + 1}`}
                          className="screenshot-main-img"
                          onError={(e) => {
                            e.target.src = 'https://placehold.co/800x400.jpg?text=Loading...';
                          }}
                        />
                      </div>
                      {screenshots.length > 1 && (
                        <div className="screenshot-thumbnails">
                          {screenshots.map((screenshot, index) => (
                            <img
                              key={`${screenshot.path_thumbnail}-${index}`}
                              src={screenshot.path_thumbnail}
                              alt={`Thumbnail ${index + 1}`}
                              className={`game-thumbnail ${index === currentScreenshot ? 'active' : ''}`}
                              onClick={() => setCurrentScreenshot(index)}
                              onError={(e) => {
                                e.target.src = 'https://placehold.co/80x45.jpg?text=Loading...';
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="game-hero-fallback">
                      <img 
                        src={iconSource}
                        alt={game.name}
                        className="game-hero-art"
                        onError={(e) => {
                          e.target.src = 'https://placehold.co/160x160.jpg?text=Game';
                        }}
                      />
                      <div className="game-hero-copy">
                        <h3>{game.name}</h3>
                        <p>{fallbackOverview}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="game-info-panel">
                  <h3>Overview</h3>
                  {gameDetails?.short_description ? (
                    <p 
                      className="game-description"
                      dangerouslySetInnerHTML={{ __html: gameDetails.short_description }}
                    />
                  ) : (
                    <p className="game-description">{fallbackOverview}</p>
                  )}
                  <div className="meta-chip-row">
                    <span className="meta-chip">{platformLabel}</span>
                    {game.mood && <span className="meta-chip">Mood: {game.mood}</span>}
                    {genreLabels.slice(0, 4).map((genre) => (
                      <span key={genre} className="meta-chip">{genre}</span>
                    ))}
                  </div>
                  
                  <div style={{ marginTop: '15px' }}>
                    <button 
                      className="share-btn"
                      onClick={() => {
                        const shareText = `Check out ${game.name} on GamePilot! I've played for ${((game.time_played || 0) / 60).toFixed(1)} hours. #GamePilot`;
                        LocalShareService.copyTextToClipboard(shareText);
                        alert('Share text copied to clipboard!');
                      }}
                      style={{
                        outline: modalControls[selectedControlIndex] === 'share' ? '2px solid var(--accent, #ff6b35)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: 'var(--text)',
                        cursor: 'pointer',
                        fontSize: '14px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <Share2 size={16} /> Share Game
                    </button>
                  </div>
                </div>

                {gameDetails?.developers && (
                  <div className="game-info-panel">
                    <h3>Developers</h3>
                    <p className="game-description">{gameDetails.developers.join(', ')}</p>
                  </div>
                )}
              </div>

              <div className="game-modal-secondary">
                <div className="game-info-panel">
                  <h3>Game Details</h3>
                  <div className="info-grid">
                    <div className="info-item rating-control">
                      <Star size={16} />
                      <span className="info-label">Your Rating</span>
                      <div className="rating-slider-container" style={{ outline: modalControls[selectedControlIndex] === 'rating' ? '2px solid var(--accent, #ff6b35)' : 'none', borderRadius: '8px' }}>
                        <input 
                          type="range" 
                          min="0" 
                          max="10" 
                          step="0.5" 
                          value={rating} 
                          onChange={(e) => {
                            e.stopPropagation();
                            handleRatingChange(parseFloat(e.target.value));
                          }}
                          onMouseUp={(e) => {
                            e.stopPropagation();
                            handleRatingSave(parseFloat(e.target.value));
                          }}
                          onTouchEnd={(e) => {
                            e.stopPropagation();
                            handleRatingSave(parseFloat(e.target.value));
                          }}
                          className="rating-slider"
                        />
                        <span className="rating-value">{rating.toFixed(1)}/10</span>
                      </div>
                    </div>
                    <div className="info-item intent-control">
                      <Play size={16} />
                      <span className="info-label">Replay Intent</span>
                      <select 
                        value={replayIntent} 
                        onChange={(e) => {
                          e.stopPropagation();
                          handleReplayIntentChange(e.target.value);
                        }}
                        className="intent-select"
                        style={{ outline: modalControls[selectedControlIndex] === 'replay' ? '2px solid var(--accent, #ff6b35)' : 'none' }}
                      >
                        <option value="none">Not Planned</option>
                        <option value="soon">Playing Soon</option>
                        <option value="active">Currently Playing</option>
                        <option value="finished">Finished/Done</option>
                        <option value="endless">Endless/Ongoing</option>
                      </select>
                    </div>
                    <div className="info-item">
                      <Clock size={16} />
                      <span className="info-label">Playtime</span>
                      <span>{((game.time_played || 0) / 60).toFixed(1)} hours played</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Platform</span>
                      <span>{platformLabel}</span>
                    </div>
                    {gameDetails?.release_date && (
                      <div className="info-item">
                        <Calendar size={16} />
                        <span className="info-label">Released</span>
                        <span>{gameDetails.release_date.date}</span>
                      </div>
                    )}
                    {genreLabels.length > 0 && (
                      <div className="info-item">
                        <Star size={16} />
                        <span className="info-label">Genres</span>
                        <span>{genreLabels.join(', ')}</span>
                      </div>
                    )}
                    {typeof game.launch_count === 'number' && (
                      <div className="info-item">
                        <Play size={16} />
                        <span className="info-label">Launches</span>
                        <span>{game.launch_count}</span>
                      </div>
                    )}
                    {game.last_played && (
                      <div className="info-item">
                        <span className="info-label">Last Played</span>
                        <span>{formatDateValue(game.last_played)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="game-info-panel">
                  <h3>Completion Status</h3>
                  <button 
                    onClick={toggleCompletion}
                    className={`completion-toggle ${isCompleted ? 'completed' : ''}`}
                    style={{ outline: modalControls[selectedControlIndex] === 'completion' ? '2px solid var(--accent, #ff6b35)' : 'none' }}
                  >
                    {isCompleted ? '✓ Completed' : '○ Mark as Completed'}
                  </button>
                </div>

                {gameDetails?.price_overview && (
                  <div className="game-info-panel">
                    <h3>Price ({getCurrentCurrency()})</h3>
                    <div className="price-info">
                      {gameDetails.price_overview.discount_percent > 0 && (
                        <span className="discount-badge">
                          -{gameDetails.price_overview.discount_percent}%
                        </span>
                      )}
                      <span className="price">
                        {(() => {
                          const priceInUSD = parseSteamPrice(gameDetails.price_overview.final_formatted);
                          return formatPrice(priceInUSD, getCurrentCurrency());
                        })()}
                      </span>
                      {gameDetails.price_overview.discount_percent > 0 && (
                        <span className="original-price">
                          {(() => {
                            const originalPriceInUSD = parseSteamPrice(gameDetails.price_overview.initial_formatted);
                            return formatPrice(originalPriceInUSD, getCurrentCurrency());
                          })()}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {compatibility && compatibilityLabel && (
                  <div className="game-info-panel">
                    <h3>System Compatibility</h3>
                    <div className="compatibility-info">
                      <div className="compatibility-status">
                        <div className="status-badge" style={{ backgroundColor: compatibilityLabel.color }}>
                          {`${compatibilityLabel.emoji} ${compatibilityLabel.text} • ${compatibility.estimatedFPS} FPS`}
                        </div>
                      </div>

                      {compatibility.isEstimate && (
                        <p className="compatibility-note">
                          This is an estimated result based on your current hardware because this game does not have a verified requirements profile in the local database yet.
                        </p>
                      )}
                      
                      {compatibility.requirements && (
                        <div className="requirements-grid">
                          <div className="requirement-level">
                            <h4>Minimum Requirements</h4>
                            <ul>
                              <li>CPU Score: {compatibility.requirements.minimum.cpuScore}</li>
                              <li>GPU Score: {compatibility.requirements.minimum.gpuScore}</li>
                              <li>RAM: {compatibility.requirements.minimum.ram}GB</li>
                              <li>Storage: {compatibility.requirements.minimum.storage}GB</li>
                              {compatibility.requirements.minimum.requiresSSD && <li>⚠️ Requires SSD</li>}
                            </ul>
                          </div>
                          
                          <div className="requirement-level">
                            <h4>Recommended Requirements</h4>
                            <ul>
                              <li>CPU Score: {compatibility.requirements.recommended.cpuScore}</li>
                              <li>GPU Score: {compatibility.requirements.recommended.gpuScore}</li>
                              <li>RAM: {compatibility.requirements.recommended.ram}GB</li>
                              <li>Storage: {compatibility.requirements.recommended.storage}GB</li>
                              {compatibility.requirements.recommended.requiresSSD && <li>⚠️ Requires SSD</li>}
                            </ul>
                          </div>
                          
                          <div className="requirement-level">
                            <h4>Ultra Requirements</h4>
                            <ul>
                              <li>CPU Score: {compatibility.requirements.ultra.cpuScore}</li>
                              <li>GPU Score: {compatibility.requirements.ultra.gpuScore}</li>
                              <li>RAM: {compatibility.requirements.ultra.ram}GB</li>
                              <li>Storage: {compatibility.requirements.ultra.storage}GB</li>
                              {compatibility.requirements.ultra.requiresSSD && <li>⚠️ Requires SSD</li>}
                            </ul>
                          </div>
                        </div>
                      )}
                      
                      {compatibility.bottlenecks && compatibility.bottlenecks.length > 0 && (
                        <div className="bottlenecks-section">
                          <h4>⚡ Potential Bottlenecks</h4>
                          <ul>
                            {compatibility.bottlenecks.map((bottleneck, idx) => (
                              <li key={idx} className={`bottleneck-item ${bottleneck.impact}`}>
                                {bottleneck.component}: {bottleneck.message}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="game-modal-footer">
          {(typeof onLaunch === 'function' || game.appid) && (
            <button 
              className="launch-button"
              onClick={handleLaunchGame}
              style={{ outline: modalControls[selectedControlIndex] === 'launch' ? '2px solid var(--accent, #ff6b35)' : 'none' }}
            >
              <Play size={16} />
              Launch Game
            </button>
          )}
          
          {game.appid && (
            <button 
              className="store-button"
              onClick={handleOpenStore}
              style={{ outline: modalControls[selectedControlIndex] === 'store' ? '2px solid var(--accent, #ff6b35)' : 'none' }}
            >
              <ExternalLink size={16} />
              View on Steam
            </button>
          )}
          
          {typeof onToggleFavorite === 'function' && (
            <button 
              className={`wishlist-button ${isFavorite ? 'wishlisted' : ''}`}
              onClick={() => onToggleFavorite(favoriteKey)}
              style={{ outline: modalControls[selectedControlIndex] === 'favorite' ? '2px solid var(--accent, #ff6b35)' : 'none' }}
            >
              <Heart size={16} />
              {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameModal;
