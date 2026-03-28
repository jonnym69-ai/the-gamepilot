import React, { useState, useMemo, useContext, useEffect } from 'react';
import { Play, Search, Download, Grid, List, Clock } from 'lucide-react';
import { getCurrentCurrency } from './CurrencyConverter';
import NavBar from './NavBar';
import GameModal from './components/GameModal';
import ExportModal from './components/ExportModal';
import LazyImage from './components/LazyImage';
import BackToTopButton from './components/BackToTopButton';
import { AchievementTracker } from './AchievementSystem';
import { useToast } from './components/Toast';
import { ThemeContext, getThemeSpecificLibraryTitle } from './ThemeContext';
import { PLATFORM_ICONS, PLATFORM_COLORS } from './constants/PlatformConstants';
import { SteamPriceService } from './services/SteamPriceService';
import { GameRequirements } from './services/GameRequirements';
import { HardwareDetector } from './services/HardwareDetector';
import { FreeGameRadar } from './services/FreeGameRadar';
import { ProgressionUnlockService } from './services/ProgressionUnlockService';
import './Library.css';

// Helper function to get compatibility badge info
const getCompatibilityBadge = (game, systemInfo) => {
  if (!game || !systemInfo) return null;
  
  try {
    const compatibility = GameRequirements.checkGameCompatibility(game, systemInfo);
    const settingsLabel = GameRequirements.getSettingsLabel(compatibility.settingsLevel);
    
    return {
      level: compatibility.settingsLevel,
      label: settingsLabel.text,
      emoji: settingsLabel.emoji,
      color: settingsLabel.color,
      canRun: compatibility.canRun,
      fps: compatibility.estimatedFPS,
      isEstimate: compatibility.isEstimate
    };
  } catch (error) {
    return null;
  }
};

const getFavoriteGameKey = (game) => game?.appid || game?.app_id || game?.steamAppId || game?.name;

// Format time played function
const formatTimePlayed = (minutes) => {
  if (!minutes || minutes === 0) return 'Never played';
  
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  
  if (days > 0) {
    return `${days}d ${remainingHours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else {
    return `${minutes}m`;
  }
};

// Get price display for a game in selected currency
const getGamePrice = (game, currency = null) => {
  return SteamPriceService.getPriceDisplay(game, currency);
};

const getLastPlayedSortValue = (lastPlayedValue) => {
  if (typeof lastPlayedValue === 'number' && Number.isFinite(lastPlayedValue)) {
    return lastPlayedValue;
  }

  if (typeof lastPlayedValue === 'string') {
    const parsedTimestamp = Date.parse(lastPlayedValue);
    return Number.isNaN(parsedTimestamp) ? 0 : parsedTimestamp;
  }

  return 0;
};

// Use centralized platform constants
const platformIcons = PLATFORM_ICONS;
const platformColors = PLATFORM_COLORS;

const LIBRARY_PRESENTATION_PRESETS = Object.freeze({
  classic_shelf: {
    accent: '#ff6b35',
    secondary: '#ff8c42',
    gridMinWidth: 250,
    gridGap: 20,
    listGap: 12,
    cardRadius: 12,
    cardPadding: 15,
    cardMinHeight: 280,
    imageHeight: 100,
    listPadding: '16px',
    tagBg: 'rgba(255, 107, 53, 0.14)',
    tagColor: '#ff6b35',
    favoriteBg: 'rgba(0, 0, 0, 0.7)',
    cardShadow: '0 10px 24px rgba(0, 0, 0, 0.14)',
    listIcon: { width: 64, height: 64, padding: 8, borderRadius: '50%', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.35)' },
    listHero: { width: 118, height: 66, padding: 0, borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }
  },
  compact_matrix: {
    accent: '#3dd9ff',
    secondary: '#6366f1',
    gridMinWidth: 220,
    gridGap: 14,
    listGap: 10,
    cardRadius: 10,
    cardPadding: 12,
    cardMinHeight: 246,
    imageHeight: 88,
    listPadding: '12px 14px',
    tagBg: 'rgba(61, 217, 255, 0.14)',
    tagColor: '#3dd9ff',
    favoriteBg: 'rgba(17, 24, 39, 0.72)',
    cardShadow: '0 8px 18px rgba(11, 17, 32, 0.2)',
    listIcon: { width: 56, height: 56, padding: 7, borderRadius: '18px', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.28)' },
    listHero: { width: 102, height: 58, padding: 0, borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.22)' }
  },
  spotlight_showcase: {
    accent: '#f093fb',
    secondary: '#ff6b35',
    gridMinWidth: 290,
    gridGap: 24,
    listGap: 16,
    cardRadius: 18,
    cardPadding: 18,
    cardMinHeight: 340,
    imageHeight: 132,
    listPadding: '18px',
    tagBg: 'rgba(240, 147, 251, 0.16)',
    tagColor: '#f093fb',
    favoriteBg: 'rgba(34, 21, 49, 0.78)',
    cardShadow: '0 14px 32px rgba(240, 147, 251, 0.16)',
    listIcon: { width: 72, height: 72, padding: 10, borderRadius: '22px', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.28)' },
    listHero: { width: 132, height: 74, padding: 0, borderRadius: '12px', boxShadow: '0 4px 14px rgba(0,0,0,0.24)' }
  },
  intel_panels: {
    accent: '#7ddc84',
    secondary: '#0f766e',
    gridMinWidth: 260,
    gridGap: 18,
    listGap: 12,
    cardRadius: 10,
    cardPadding: 16,
    cardMinHeight: 300,
    imageHeight: 104,
    listPadding: '14px 16px',
    tagBg: 'rgba(125, 220, 132, 0.13)',
    tagColor: '#7ddc84',
    favoriteBg: 'rgba(5, 33, 27, 0.78)',
    cardShadow: '0 12px 26px rgba(15, 118, 110, 0.14)',
    listIcon: { width: 60, height: 60, padding: 8, borderRadius: '12px', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.28)' },
    listHero: { width: 120, height: 68, padding: 0, borderRadius: '10px', boxShadow: '0 3px 10px rgba(0,0,0,0.24)' }
  }
});

const getLibraryListPreviewSize = (presentationId, isIconPreferred) => {
  const presentationPreset = LIBRARY_PRESENTATION_PRESETS[presentationId] || LIBRARY_PRESENTATION_PRESETS.classic_shelf;
  return isIconPreferred ? presentationPreset.listIcon : presentationPreset.listHero;
};

const getDisplayPlatform = (game) => {
  if (!game) return 'Unknown';
  return game.brandPlatform || game.platform || 'Unknown';
};

function Library({ 
  library = [], 
  onLaunchGame = () => {}, 
  activeSessions = {},
  sortBy = 'name',
  setSortBy = () => {},
  filterMood = '',
  setFilterMood = () => {},
  filterGenre = '',
  setFilterGenre = () => {},
  filterPlatform = '',
  setFilterPlatform = () => {},
  filterMaxTime = '',
  setFilterMaxTime = () => {},
  theme = 'dark',
  onUpdatePrice = () => {},
  searchQuery = '',
  setSearchQuery = () => {},
  endSession = () => {},
  currency = 'USD'
}) {
  const { currentTheme } = useContext(ThemeContext);
  const { success } = useToast();
  const [viewMode, setViewMode] = useState('grid');
  const [selectedGame, setSelectedGame] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem('favorites') || '[]'));
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(50); // Start with 50 items
  const [showAll, setShowAll] = useState(false); // Toggle for showing all items
  const [advancedSearchOpen, setAdvancedSearchOpen] = useState(false);
  const [completionFilter, setCompletionFilter] = useState(''); // 'completed', 'not-completed', or ''
  const [minPlaytime, setMinPlaytime] = useState('');
  const [maxPlaytime, setMaxPlaytime] = useState('');
  const [selectedGames, setSelectedGames] = useState(new Set()); // For bulk actions
  const [bulkMode, setBulkMode] = useState(false);
  const [systemInfo, setSystemInfo] = useState(null);
  const [freeGames, setFreeGames] = useState([]);
  const [showFreeGames, setShowFreeGames] = useState(true);
  const [loadingFreeGames, setLoadingFreeGames] = useState(false);
  const [freeGameError, setFreeGameError] = useState(null);

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

  useEffect(() => {
    let isMounted = true;

    const loadFreeGames = async () => {
      setLoadingFreeGames(true);
      try {
        const games = await FreeGameRadar.getFreeGames();
        if (isMounted) {
          setFreeGames(games);
          setFreeGameError(null);
        }
      } catch (error) {
        if (isMounted) {
          setFreeGameError(error.message);
        }
      } finally {
        if (isMounted) {
          setLoadingFreeGames(false);
        }
      }
    };

    loadFreeGames();
    return () => {
      isMounted = false;
    };
  }, []);

  const refreshFreeGames = async () => {
    setLoadingFreeGames(true);
    try {
      const games = await FreeGameRadar.getFreeGames({ forceRefresh: true });
      setFreeGames(games);
      setFreeGameError(null);
    } catch (error) {
      setFreeGameError(error.message);
    } finally {
      setLoadingFreeGames(false);
    }
  };

  const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  };

  const debouncedSearch = useMemo(() => debounce(setSearchQuery, 300), [setSearchQuery]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    debouncedSearch(value);
  };

  const toggleFavorite = (gameId) => {
    const newFavorites = favorites.includes(gameId)
      ? favorites.filter(id => id !== gameId)
      : [...favorites, gameId];
    setFavorites(newFavorites);
    localStorage.setItem('favorites', JSON.stringify(newFavorites));
  };

  const openGameModal = (game) => {
    setSelectedGame(game);
    setIsModalOpen(true);
  };

  const closeGameModal = () => {
    setIsModalOpen(false);
    setSelectedGame(null);
  };

  // Filter and sort logic
  const filteredAndSortedGames = useMemo(() => {
    let filtered = library.filter(game => {
      const displayPlatform = getDisplayPlatform(game);
      const matchesSearch = game.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesMood = !filterMood || game.mood === filterMood;
      const matchesGenre = !filterGenre || (game.genres && game.genres.includes(filterGenre));
      const matchesPlatform = !filterPlatform || displayPlatform === filterPlatform;
      const matchesMaxTime = !filterMaxTime || (game.time_played && game.time_played <= parseInt(filterMaxTime));
      
      // Advanced filters
      const gamePlaytime = game.time_played || 0;
      const matchesMinPlaytime = !minPlaytime || gamePlaytime >= parseInt(minPlaytime);
      const matchesMaxPlaytime = !maxPlaytime || gamePlaytime <= parseInt(maxPlaytime);
      
      // Completion filter - check if game is in completed games list
      let matchesCompletion = true;
      if (completionFilter) {
        const completedGames = JSON.parse(localStorage.getItem('completedGames') || '[]');
        const isCompleted = completedGames.some(cg => cg.name === game.name);
        
        if (completionFilter === 'completed') {
          matchesCompletion = isCompleted;
        } else if (completionFilter === 'not-completed') {
          matchesCompletion = !isCompleted;
        }
      }
      
      return matchesSearch && matchesMood && matchesGenre && matchesPlatform && 
             matchesMaxTime && matchesMinPlaytime && matchesMaxPlaytime && matchesCompletion;
    });

    // Sort games
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'most-played':
          return (b.time_played || 0) - (a.time_played || 0);
        case 'least-played':
          return (a.time_played || 0) - (b.time_played || 0);
        case 'genre':
          return (a.genres?.[0] || '').localeCompare(b.genres?.[0] || '');
        case 'recent':
          return getLastPlayedSortValue(b.last_played) - getLastPlayedSortValue(a.last_played);
        case 'last-played':
          const aLastPlayed = getLastPlayedSortValue(a.last_played);
          const bLastPlayed = getLastPlayedSortValue(b.last_played);
          if (aLastPlayed === 0 && bLastPlayed === 0) return a.name.localeCompare(b.name);
          if (aLastPlayed === 0) return 1;
          if (bLastPlayed === 0) return -1;
          return bLastPlayed - aLastPlayed;
        case 'platform':
          return (a.platform || '').localeCompare(b.platform || '');
        case 'mood':
          return (a.mood || '').localeCompare(b.mood || '');
        case 'favorites':
          const aIsFavorite = favorites.includes(getFavoriteGameKey(a));
          const bIsFavorite = favorites.includes(getFavoriteGameKey(b));
          if (aIsFavorite && !bIsFavorite) return -1;
          if (!aIsFavorite && bIsFavorite) return 1;
          // If both are favorites or both are not, sort by name
          return a.name.localeCompare(b.name);
        default: // 'name'
          return a.name.localeCompare(b.name);
      }
    });

    return filtered;
  }, [library, searchQuery, filterMood, filterGenre, filterPlatform, filterMaxTime, sortBy, favorites, completionFilter, minPlaytime, maxPlaytime]);

  // Paginated games for display
  const displayedGames = useMemo(() => {
    if (showAll) {
      return filteredAndSortedGames;
    }
    return filteredAndSortedGames.slice(0, itemsPerPage);
  }, [filteredAndSortedGames, itemsPerPage, showAll]);

  // Check if there are more games to load
  const hasMoreGames = filteredAndSortedGames.length > itemsPerPage && !showAll;

  const loadMoreGames = () => {
    setItemsPerPage(prev => prev + 50); // Load 50 more games
  };

  const toggleShowAll = () => {
    setShowAll(prev => !prev);
  };

  // Bulk action functions
  const toggleGameSelection = (gameId) => {
    const newSelected = new Set(selectedGames);
    if (newSelected.has(gameId)) {
      newSelected.delete(gameId);
    } else {
      newSelected.add(gameId);
    }
    setSelectedGames(newSelected);
  };

  const selectAllGames = () => {
    const allGameIds = displayedGames.map(game => game.appid || game.name);
    setSelectedGames(new Set(allGameIds));
  };

  const clearSelection = () => {
    setSelectedGames(new Set());
  };

  const bulkMarkCompleted = () => {
    if (selectedGames.size === 0) return;

    const completedGames = JSON.parse(localStorage.getItem('completedGames') || '[]');
    const newCompletedGames = [...completedGames];

    selectedGames.forEach(gameId => {
      const game = displayedGames.find(g => (g.appid || g.name) === gameId);
      if (game && !newCompletedGames.some(cg => cg.name === game.name)) {
        newCompletedGames.push({
          name: game.name,
          completedAt: new Date().toISOString(),
          playTime: game.time_played || 0
        });
      }
    });

    localStorage.setItem('completedGames', JSON.stringify(newCompletedGames));
    success(`Marked ${selectedGames.size} games as completed!`);
    clearSelection();
  };

  const bulkLaunchGames = () => {
    if (selectedGames.size === 0) return;

    let launchedCount = 0;
    selectedGames.forEach(gameId => {
      const game = displayedGames.find(g => (g.appid || g.name) === gameId);
      if (game) {
        onLaunchGame(game);
        launchedCount++;
      }
    });

    success(`Launched ${launchedCount} games!`);
    clearSelection();
  };

  const toggleBulkMode = () => {
    setBulkMode(!bulkMode);
    if (bulkMode) {
      clearSelection(); // Clear selection when exiting bulk mode
    }
  };

  // Get unique moods and genres for filters
  const uniqueMoods = useMemo(() => {
    const moods = new Set(library.map(game => game.mood).filter(Boolean));
    return Array.from(moods);
  }, [library]);

  const uniqueGenres = useMemo(() => {
    const genres = new Set();
    library.forEach(game => {
      if (game.genres) {
        game.genres.forEach(genre => {
          if (genre !== 'Unknown') {
            genres.add(genre);
          }
        });
      }
    });
    return Array.from(genres);
  }, [library]);

  const uniquePlatforms = useMemo(() => {
    const platforms = new Set(library.map(game => getDisplayPlatform(game)).filter(Boolean));
    return Array.from(platforms);
  }, [library]);

  const rewardPresentationCustomization = ProgressionUnlockService.getRewardPresentationCustomization();
  const libraryPresentationRewards = ProgressionUnlockService.getLibraryPresentationVariants();
  const selectedLibraryPresentation = libraryPresentationRewards.find((presentation) => presentation.id === rewardPresentationCustomization.selectedLibraryVariant) || libraryPresentationRewards[0] || null;
  const libraryPresentationId = selectedLibraryPresentation?.id || 'classic_shelf';
  const libraryPresentationPreset = LIBRARY_PRESENTATION_PRESETS[libraryPresentationId] || LIBRARY_PRESENTATION_PRESETS.classic_shelf;
  const libraryRootStyle = {
    '--library-presentation-accent': libraryPresentationPreset.accent,
    '--library-presentation-secondary': libraryPresentationPreset.secondary,
    '--library-presentation-preview': selectedLibraryPresentation?.preview || 'linear-gradient(135deg, rgba(255, 107, 53, 0.18), rgba(15, 23, 42, 0.24))',
    '--library-presentation-card-border': `${libraryPresentationPreset.accent}33`,
    '--library-presentation-card-radius': `${libraryPresentationPreset.cardRadius}px`,
    '--library-presentation-card-shadow': libraryPresentationPreset.cardShadow,
    '--library-presentation-tag-bg': libraryPresentationPreset.tagBg,
    '--library-presentation-tag-color': libraryPresentationPreset.tagColor
  };
  const libraryGridStyle = {
    gridTemplateColumns: `repeat(auto-fill, minmax(${libraryPresentationPreset.gridMinWidth}px, 1fr))`,
    gap: `${libraryPresentationPreset.gridGap}px`
  };
  const libraryListStyle = {
    gap: `${libraryPresentationPreset.listGap}px`
  };
  const libraryCardStyle = {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--library-presentation-card-border, var(--border-primary))',
    borderRadius: 'var(--library-presentation-card-radius, 8px)',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    padding: `${libraryPresentationPreset.cardPadding}px`,
    minHeight: `${libraryPresentationPreset.cardMinHeight}px`
  };
  const libraryListItemStyle = {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--library-presentation-card-border, var(--border-primary))',
    borderRadius: 'var(--library-presentation-card-radius, 8px)',
    padding: libraryPresentationPreset.listPadding,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: `${libraryPresentationPreset.listGap + 4}px`,
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
  };
  const libraryLaunchButtonStyle = {
    background: `linear-gradient(135deg, ${libraryPresentationPreset.accent} 0%, ${libraryPresentationPreset.secondary} 100%)`,
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    cursor: 'pointer',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px'
  };
  const getLibraryCardImageStyle = (platformColor, imageSrc) => ({
    width: '100%',
    height: `${libraryPresentationPreset.imageHeight}px`,
    objectFit: imageSrc ? 'cover' : 'contain',
    backgroundColor: platformColor
  });
  const getLibraryFavoriteOverlayStyle = (isFavorite) => ({
    position: 'absolute',
    top: '8px',
    right: '8px',
    backgroundColor: libraryPresentationPreset.favoriteBg,
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: isFavorite ? '#ff6b6b' : libraryPresentationPreset.tagColor
  });
  const getLibraryListFavoriteButtonStyle = (isFavorite) => ({
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: isFavorite ? '#ff6b6b' : libraryPresentationPreset.tagColor,
    marginRight: '12px'
  });

  return (
    <div className={`App ${theme} library-page library-presentation-${libraryPresentationId}`} style={libraryRootStyle}>
      <NavBar />
      
      {/* Library Header with Stats */}
      <div className="library-header">
        <div className="library-header-copy">
          <h1 className="library-title">{currentTheme ? getThemeSpecificLibraryTitle(currentTheme.id) : "📚 Library"}</h1>
          <div className="library-reward-pill">
            <span>Library Presentation</span>
            <strong>{selectedLibraryPresentation?.name || 'Classic Shelf'}</strong>
          </div>
        </div>
        <div className="library-stats">
          <div className="stat-card">
            <span className="stat-number">{library.length}</span>
            <span className="stat-label">Total Games</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{library.filter(g => g.time_played > 0).length}</span>
            <span className="stat-label">Games Played</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{library.reduce((sum, game) => sum + (game.time_played || 0), 0)}</span>
            <span className="stat-label">Total Minutes</span>
          </div>
        </div>
      </div>

      {/* Free Games Radar */}
      {(showFreeGames) && (
        <div className="free-games-section">
          <div className="free-games-header">
            <div>
              <h3>🆓 Weekly Free Games</h3>
              <p>Powered by Epic Games Store — auto-refreshes hourly. Claim them before the timer ends.</p>
            </div>
            <div className="free-games-controls">
              <button
                className="free-games-toggle"
                onClick={refreshFreeGames}
                disabled={loadingFreeGames}
              >
                Refresh
              </button>
              <button
                className="free-games-toggle"
                onClick={() => setShowFreeGames(false)}
              >
                Hide
              </button>
            </div>
          </div>
          {freeGameError && (
            <div className="free-games-error">
              ⚠️ {freeGameError}
            </div>
          )}
          {loadingFreeGames ? (
            <div className="free-games-loading">Fetching freebies...</div>
          ) : (
            <div className="free-games-grid">
              {freeGames.length === 0 ? (
                <div className="free-games-empty">No active promos from the selected stores.</div>
              ) : (
                freeGames.map((game) => (
                  <div key={game.id} className="free-game-card">
                    <div className="free-game-thumb" style={{ backgroundImage: `url(${game.image})` }} />
                    <div className="free-game-body">
                      <div className="free-game-title">
                        <span>{game.platformIcon}</span>
                        <h4>{game.title}</h4>
                      </div>
                      <p>{game.description}</p>
                      <div className="free-game-meta">
                        <span>Ends {game.endDate ? new Date(game.endDate).toLocaleDateString() : 'Soon'}</span>
                        <button onClick={() => window.open(game.url, '_blank')}>Claim</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
      {!showFreeGames && (
        <div className="free-games-hidden-bar">
          <span>Free game radar hidden</span>
          <button onClick={() => setShowFreeGames(true)}>Show Again</button>
        </div>
      )}

      {/* Library Value Section */}
      {library && library.length > 0 && (
        <div className="library-value">
          <h4 className="library-value-title">
            💰 Library Value ({getCurrentCurrency()})
          </h4>
          <div className="library-value-content">
            {(() => {
              // Use the same calculation logic as Stats page
              const totalValue = library.reduce((total, game) => {
                // Use actual Steam price if available, otherwise try stored price, then fallback
                let gamePrice = 0;
                
                if (game.priceNumeric) {
                  // Use stored numeric price
                  gamePrice = game.priceNumeric;
                } else if (game.price) {
                  // Parse price string (e.g., "£19.99" -> 19.99)
                  const priceMatch = game.price.toString().match(/[\d.]+/);
                  gamePrice = priceMatch ? parseFloat(priceMatch[0]) : 0;
                } else {
                  // Check localStorage for stored price data
                  const storedPrices = JSON.parse(localStorage.getItem('gamePrices') || '{}');
                  const storedPrice = storedPrices[game.appid];
                  if (storedPrice && storedPrice.priceNumeric) {
                    gamePrice = storedPrice.priceNumeric;
                  } else {
                    // Conservative fallback - use lower estimate
                    gamePrice = 15; // Reduced from £50 to be more realistic
                  }
                }
                
                return total + gamePrice;
              }, 0);

              // Format the price with currency
              const formatPrice = (amount, currency = 'USD') => {
                const symbols = {
                  'USD': '$',
                  'EUR': '€',
                  'GBP': '£',
                  'JPY': '¥',
                  'CAD': 'C$',
                  'AUD': 'A$',
                  'CHF': 'CHF',
                  'CNY': '¥',
                  'INR': '₹',
                  'BRL': 'R$',
                  'RUB': '₽'
                };
                
                const symbol = symbols[currency] || '$';
                
                if (currency === 'JPY') {
                  return `${symbol}${Math.round(amount).toLocaleString()}`;
                } else {
                  return `${symbol}${amount.toFixed(2)}`;
                }
              };

              const currentCurrency = getCurrentCurrency();
              const formattedValue = formatPrice(totalValue, currentCurrency);

              return (
                <div className="value-main">
                  <span className="value-amount">{formattedValue}</span>
                </div>
              );
            })()}
          </div>
        </div>
      )}
      
      {/* Export buttons */}
      <div className="export-section">
        <button 
          onClick={() => setIsExportModalOpen(true)}
          className="export-button"
        >
          <Download size={16} /> Export Data
        </button>
        <button 
          onClick={toggleBulkMode}
          className={`bulk-mode-btn ${bulkMode ? 'active' : ''}`}
          style={{
            marginLeft: '12px',
            backgroundColor: bulkMode ? 'var(--button-primary-bg)' : 'var(--button-secondary-bg)',
            color: bulkMode ? 'var(--button-primary-text)' : 'var(--button-secondary-text)',
            border: '1px solid var(--border-primary)',
            borderRadius: '8px',
            padding: '12px 24px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px'
          }}
        >
          {bulkMode ? 'Exit Bulk Mode' : 'Bulk Mode'}
        </button>
      </div>

      {/* Bulk Action Controls */}
      {bulkMode && selectedGames.size > 0 && (
        <div className="bulk-controls" style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>
            {selectedGames.size} game{selectedGames.size !== 1 ? 's' : ''} selected
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={selectAllGames}
              style={{
                backgroundColor: 'var(--button-secondary-bg)',
                color: 'var(--button-secondary-text)',
                border: '1px solid var(--border-primary)',
                borderRadius: '4px',
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Select All
            </button>
            <button 
              onClick={clearSelection}
              style={{
                backgroundColor: 'var(--button-secondary-bg)',
                color: 'var(--button-secondary-text)',
                border: '1px solid var(--border-primary)',
                borderRadius: '4px',
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Clear Selection
            </button>
            <button 
              onClick={bulkMarkCompleted}
              style={{
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Mark Completed
            </button>
            <button 
              onClick={bulkLaunchGames}
              style={{
                backgroundColor: 'var(--button-primary-bg)',
                color: 'var(--button-primary-text)',
                border: 'none',
                borderRadius: '4px',
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Launch Selected
            </button>
          </div>
        </div>
      )}
      
      {/* Search and Filters */}
      <div className="search-filter-section">
        <div className="search-bar">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search games..."
            onChange={handleSearchChange}
            className="search-input"
          />
        </div>
        
        <div className="filter-controls">
          <select 
            value={sortBy} 
            onChange={(e) => {
              setSortBy(e.target.value);
              AchievementTracker.trackFeatureUsage('sort');
            }}
            className="sort-select"
          >
            <option value="name">Sort by Name</option>
            <option value="platform">Sort by Platform</option>
            <option value="mood">Sort by Mood</option>
            <option value="favorites">Favourites First</option>
            <option value="recent">Recently Played</option>
            <option value="last-played">Last Played (Oldest First)</option>
            <option value="most-played">Most Played</option>
            <option value="least-played">Least Played</option>
          </select>
          
          <div className="view-toggle">
            <button
              onClick={() => setViewMode('grid')}
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="quick-filters">
        <div className="filter-group">
          <label>Mood:</label>
          <select 
            value={filterMood} 
            onChange={(e) => {
              setFilterMood(e.target.value);
              AchievementTracker.trackFeatureUsage('filter');
            }}
            className="filter-select"
          >
            <option value="">All Moods</option>
            {uniqueMoods.map(mood => (
              <option key={mood} value={mood}>{mood}</option>
            ))}
          </select>
        </div>
        
        <div className="filter-group">
          <label>Genre:</label>
          <select 
            value={filterGenre} 
            onChange={(e) => {
              setFilterGenre(e.target.value);
              AchievementTracker.trackFeatureUsage('filter');
            }}
            className="filter-select"
          >
            <option value="">All Genres</option>
            {uniqueGenres.map(genre => (
              <option key={genre} value={genre}>{genre}</option>
            ))}
          </select>
        </div>
        
        <div className="filter-group">
          <label>Platform:</label>
          <select 
            value={filterPlatform} 
            onChange={(e) => {
              setFilterPlatform(e.target.value);
              AchievementTracker.trackFeatureUsage('filter');
            }}
            className="filter-select"
          >
            <option value="">All Platforms</option>
            {uniquePlatforms.map(platform => (
              <option key={platform} value={platform}>{platform}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Advanced Search */}
      <div className="advanced-search-section">
        <button
          onClick={() => setAdvancedSearchOpen(!advancedSearchOpen)}
          className="advanced-search-toggle"
          style={{
            width: '100%',
            backgroundColor: 'var(--button-secondary-bg)',
            color: 'var(--button-secondary-text)',
            border: '1px solid var(--border-primary)',
            borderRadius: '8px',
            padding: '12px',
            cursor: 'pointer',
            fontWeight: 'bold',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <span>🔍 Advanced Search</span>
          <span>{advancedSearchOpen ? '▼' : '▶'}</span>
        </button>

        {advancedSearchOpen && (
          <div className="advanced-filters" style={{
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '8px',
            padding: '16px',
            border: '1px solid var(--border-primary)',
            marginBottom: '16px'
          }}>
            <div className="advanced-filter-row" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px'
            }}>
              <div className="filter-group">
                <label>Completion Status:</label>
                <select
                  value={completionFilter}
                  onChange={(e) => setCompletionFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="">Any Status</option>
                  <option value="completed">✅ Completed</option>
                  <option value="not-completed">⏳ Not Completed</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Min Playtime (hours):</label>
                <input
                  type="number"
                  value={minPlaytime}
                  onChange={(e) => setMinPlaytime(e.target.value)}
                  placeholder="0"
                  className="filter-select"
                  min="0"
                />
              </div>

              <div className="filter-group">
                <label>Max Playtime (hours):</label>
                <input
                  type="number"
                  value={maxPlaytime}
                  onChange={(e) => setMaxPlaytime(e.target.value)}
                  placeholder="No limit"
                  className="filter-select"
                  min="0"
                />
              </div>
            </div>

            <div className="filter-actions" style={{
              marginTop: '12px',
              display: 'flex',
              gap: '8px'
            }}>
              <button
                onClick={() => {
                  setCompletionFilter('');
                  setMinPlaytime('');
                  setMaxPlaytime('');
                }}
                style={{
                  backgroundColor: 'var(--button-secondary-bg)',
                  color: 'var(--button-secondary-text)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '4px',
                  padding: '6px 12px',
                  cursor: 'pointer'
                }}
              >
                Clear Advanced Filters
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="library-content">
        {viewMode === 'grid' ? (
          <div className="library-grid" style={libraryGridStyle}>
            {displayedGames.map(game => {
              const displayPlatform = getDisplayPlatform(game);
              const platformIcon = platformIcons[displayPlatform] || platformIcons[game.platform] || platformIcons['Unknown'];
              const platformColor = platformColors[displayPlatform] || platformColors[game.platform] || platformColors['Unknown'];
              const brandDiffers = game.brandPlatform && game.brandPlatform !== game.platform;
              const isFavorite = favorites.includes(getFavoriteGameKey(game));
              
              const preferredIcon = typeof game.icon === 'string' ? game.icon.trim() : '';
              const fallbackImage = typeof game.iconUrl === 'string' ? game.iconUrl.trim() : '';
              const imageSrc = preferredIcon || fallbackImage;

              return (
                <div 
                  key={game.appid || game.name}
                  className="game-card"
                  data-testid="game-card"
                  onClick={() => openGameModal(game)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Game: ${game.name}. Platform: ${displayPlatform}. ${brandDiffers ? `Launches via ${game.platform}. ` : ''}${game.genres ? `Genres: ${game.genres.join(', ')}` : ''}. ${game.time_played ? `Played for ${formatTimePlayed(game.time_played)}` : 'Never played'}. ${game.mood ? `Mood: ${game.mood}` : ''}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openGameModal(game);
                    }
                  }}
                  style={libraryCardStyle}
                >
                  <div className="game-image-container">
                    <LazyImage
                      src={imageSrc}
                      alt={game.name}
                      gameName={game.name}
                      platform={displayPlatform}
                      genre={game.genres && game.genres[0]}
                      mood={game.mood}
                      style={{
                        ...getLibraryCardImageStyle(platformColor, imageSrc)
                      }}
                    />
                    {bulkMode && (
                      <input
                        type="checkbox"
                        checked={selectedGames.has(game.appid || game.name)}
                        onChange={() => toggleGameSelection(game.appid || game.name)}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          left: '8px',
                          width: '20px',
                          height: '20px',
                          cursor: 'pointer',
                          zIndex: 10
                        }}
                      />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(getFavoriteGameKey(game));
                      }}
                      className="favorite-btn"
                      style={getLibraryFavoriteOverlayStyle(isFavorite)}
                    >
                      {isFavorite ? '❤️' : '🤍'}
                    </button>
                  </div>
                  
                  <div className="game-info">
                    <h3>{game.name}</h3>
                    <div className="game-meta">
                      <span className="platform-tag">
                        {platformIcon} {displayPlatform}
                        {brandDiffers && (
                          <span className="platform-launcher">via {game.platform}</span>
                        )}
                      </span>
                      {game.mood && <span className="mood-tag">{game.mood}</span>}
                      {systemInfo && (() => {
                        const badge = getCompatibilityBadge(game, systemInfo);
                        if (badge) {
                          return (
                            <span 
                              className="compatibility-badge"
                              style={{
                                backgroundColor: badge.color,
                                color: 'white',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                display: 'inline-block',
                                marginLeft: '4px'
                              }}
                              title={`${badge.isEstimate ? 'Estimated ' : ''}${badge.label} - ${badge.fps} FPS`}
                            >
                              {badge.emoji} {badge.label}
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    <div className="game-time">
                      <Clock size={12} />
                      <span>{formatTimePlayed(game.time_played)}</span>
                    </div>
                    {game.genres && game.genres.filter(g => g !== 'Unknown').length > 0 && (
                      <div className="genre-tags">
                        {game.genres.filter(g => g !== 'Unknown').slice(0, 2).map((genre, i) => (
                          <span key={i} className="genre-tag">{genre}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="game-actions">
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        AchievementTracker.logGameplayFeature('continue_playing');
                        AchievementTracker.trackPlatformUsage(game.platform);
                        onLaunchGame(game); 
                      }}
                      style={libraryLaunchButtonStyle}
                    >
                      <Play size={16} /> Launch
                    </button>
                    {activeSessions[game.name] && (
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          endSession(game.name);
                        }}
                        style={{
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '8px 16px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          marginLeft: '8px'
                        }}
                      >
                        🛑 End Session
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="library-list" style={libraryListStyle}>
            {displayedGames.map(game => {
              const displayPlatform = getDisplayPlatform(game);
              const platformIcon = platformIcons[displayPlatform] || platformIcons[game.platform] || platformIcons['Unknown'];
              const platformColor = platformColors[displayPlatform] || platformColors[game.platform] || platformColors['Unknown'];
              const brandDiffers = game.brandPlatform && game.brandPlatform !== game.platform;
              const isFavorite = favorites.includes(getFavoriteGameKey(game));
              const iconSrc = typeof game.icon === 'string' ? game.icon.trim() : '';
              const heroSrc = typeof game.iconUrl === 'string' ? game.iconUrl.trim() : '';
              const imageSrc = iconSrc || heroSrc;
              const isIconPreferred = Boolean(iconSrc);
              const previewSize = getLibraryListPreviewSize(libraryPresentationId, isIconPreferred);
              
              return (
                <div 
                  key={game.appid || game.name}
                  className="game-list-item"
                  onClick={() => openGameModal(game)}
                  style={libraryListItemStyle}
                >
                  <div className="game-list-image">
                    <LazyImage
                      src={imageSrc}
                      alt={game.name}
                      gameName={game.name}
                      platform={displayPlatform}
                      genre={game.genres && game.genres[0]}
                      mood={game.mood}
                      style={{
                        width: `${previewSize.width}px`,
                        height: `${previewSize.height}px`,
                        borderRadius: previewSize.borderRadius,
                        objectFit: isIconPreferred ? 'contain' : 'cover',
                        padding: `${previewSize.padding}px`,
                        backgroundColor: platformColor,
                        flexShrink: 0,
                        boxShadow: previewSize.boxShadow,
                        alignSelf: 'center'
                      }}
                    />
                  </div>
                  
                  <div className="game-list-content">
                    <h3>{game.name}</h3>
                    <div className="game-list-meta">
                      <span className="platform-tag">
                        {platformIcon} {displayPlatform}
                        {brandDiffers && (
                          <span className="platform-launcher">via {game.platform}</span>
                        )}
                      </span>
                      {game.mood && <span className="mood-tag">{game.mood}</span>}
                      {systemInfo && (() => {
                        const badge = getCompatibilityBadge(game, systemInfo);
                        if (badge) {
                          return (
                            <span 
                              className="compatibility-badge"
                              style={{
                                backgroundColor: badge.color,
                                color: 'white',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                display: 'inline-block',
                                marginLeft: '4px'
                              }}
                              title={`${badge.isEstimate ? 'Estimated ' : ''}${badge.label} - ${badge.fps} FPS`}
                            >
                              {badge.emoji} {badge.label}
                            </span>
                          );
                        }
                        return null;
                      })()}
                      {game.genres && game.genres.filter(g => g !== 'Unknown').length > 0 && (
                        <span className="genre-tag">{game.genres.filter(g => g !== 'Unknown')[0]}</span>
                      )}
                      <div className="game-time-list">
                        <Clock size={12} />
                        <span>{formatTimePlayed(game.time_played)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {getGamePrice(game, currency) && (
                    <div className="game-list-price">
                      {getGamePrice(game, currency)}
                    </div>
                  )}
                  
                  <div className="game-list-actions">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(getFavoriteGameKey(game));
                      }}
                      className="favorite-btn"
                      style={getLibraryListFavoriteButtonStyle(isFavorite)}
                    >
                      {isFavorite ? '❤️' : '🤍'}
                    </button>
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        AchievementTracker.logGameplayFeature('continue_playing');
                        AchievementTracker.trackPlatformUsage(game.platform);
                        onLaunchGame(game); 
                      }}
                      style={libraryLaunchButtonStyle}
                    >
                      <Play size={16} /> Launch
                    </button>
                    {activeSessions[game.name] && (
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          endSession(game.name);
                        }}
                        style={{
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '8px 16px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          marginLeft: '8px'
                        }}
                      >
                        🛑 End Session
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Pagination Controls */}
        {(hasMoreGames || displayedGames.length < filteredAndSortedGames.length) && (
          <div className="pagination-controls" style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '12px',
            marginTop: '20px',
            marginBottom: '20px'
          }}>
            {hasMoreGames && (
              <button 
                onClick={loadMoreGames}
                className="load-more-btn"
                style={{
                  backgroundColor: 'var(--button-primary-bg)',
                  color: 'var(--button-primary-text)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}
              >
                Load {Math.min(50, filteredAndSortedGames.length - displayedGames.length)} More Games
              </button>
            )}
            
            <button 
              onClick={toggleShowAll}
              className="show-all-btn"
              style={{
                backgroundColor: 'var(--button-secondary-bg)',
                color: 'var(--button-secondary-text)',
                border: '1px solid var(--border-primary)',
                borderRadius: '8px',
                padding: '12px 24px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px'
              }}
            >
              {showAll ? 'Show Less' : `Show All ${filteredAndSortedGames.length} Games`}
            </button>
          </div>
        )}
        </div>
        
      {/* Global helpers */}
      <BackToTopButton />

      {/* Games Grid/List */}
      <GameModal
        game={selectedGame}
        isOpen={isModalOpen}
        onClose={closeGameModal}
        onLaunch={onLaunchGame}
        theme={theme}
        onToggleFavorite={toggleFavorite}
        isFavorite={favorites.includes(getFavoriteGameKey(selectedGame))}
        onUpdatePrice={onUpdatePrice}
      />
      
      {/* Export Modals */}
      <ExportModal 
        library={library}
        theme={theme}
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  );
}

export default Library;
