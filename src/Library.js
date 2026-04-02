import React, { useState, useMemo, useContext, useEffect, useCallback, useRef } from 'react';
import { Search, Download, Grid, List, Clock, Heart, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import NavBar from './NavBar';
import GameModal from './components/GameModal';
import ExportModal from './components/ExportModal';
import CinematicExport from './components/CinematicExport';
import LazyImage from './components/LazyImage';
import BackToTopButton from './components/BackToTopButton';
import { useToast } from './components/Toast';
import { ThemeContext, getThemeSpecificLibraryTitle } from './ThemeContext';
import { HardwareDetector } from './services/HardwareDetector';
import { FreeGameRadar } from './services/FreeGameRadar';
import { ProgressionUnlockService } from './services/ProgressionUnlockService';
import { getGameArtworkPlaceholder, resolveGameArtwork } from './services/GameArtworkService';
import { formatPrice } from './CurrencyConverter';
import './Library.css';

const getFavoriteGameKey = (game) => game?.appid || game?.app_id || game?.steamAppId || game?.name;
const NOOP = () => {};
const CONTROLLER_NAV_ROUTES = ['/', '/library', '/stats', '/achievements', '/year-in-review', '/challenge-board', '/performance', '/gaming-links', '/profile', '/settings'];
const FAVORITES_STORAGE_KEY = 'favorites';

const getResolvedMood = (game) => {
  if (!game || typeof game !== 'object') {
    return '';
  }

  if (typeof game.mood === 'string' && game.mood.trim()) {
    return game.mood.trim();
  }

  if (typeof game.primaryMood === 'string' && game.primaryMood.trim()) {
    return game.primaryMood.trim();
  }

  if (Array.isArray(game.moods)) {
    const moodEntry = game.moods.find((entry) => typeof entry === 'string' && entry.trim());
    if (moodEntry) {
      return moodEntry.trim();
    }
  }

  return '';
};

const getGameValue = (game) => {
  if (!game || typeof game !== 'object') {
    return 0;
  }

  if (typeof game.priceNumeric === 'number' && Number.isFinite(game.priceNumeric)) {
    return game.priceNumeric;
  }

  if (game.price) {
    const priceMatch = game.price.toString().match(/[\d.]+/);
    if (priceMatch) {
      return Number.parseFloat(priceMatch[0]) || 0;
    }
  }

  try {
    const storedPrices = JSON.parse(localStorage.getItem('gamePrices') || '{}');
    const storedPrice = storedPrices?.[game.appid];
    if (typeof storedPrice?.priceNumeric === 'number' && Number.isFinite(storedPrice.priceNumeric)) {
      return storedPrice.priceNumeric;
    }
  } catch (error) {
    console.error('Failed to read stored game prices:', error);
  }

  return 0;
};

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
    imageHeight: 140, // Increased for better visibility
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
    gridMinWidth: 200,
    gridGap: 14,
    listGap: 10,
    cardRadius: 10,
    cardPadding: 12,
    cardMinHeight: 220,
    imageHeight: 110,
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
    imageHeight: 160,
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
    imageHeight: 150,
    listPadding: '14px 16px',
    tagBg: 'rgba(125, 220, 132, 0.13)',
    tagColor: '#7ddc84',
    favoriteBg: 'rgba(5, 33, 27, 0.78)',
    cardShadow: '0 12px 26px rgba(15, 118, 110, 0.14)',
    listIcon: { width: 60, height: 60, padding: 8, borderRadius: '12px', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.28)' },
    listHero: { width: 120, height: 68, padding: 0, borderRadius: '10px', boxShadow: '0 3px 10px rgba(0,0,0,0.24)' }
  }
});

const getDisplayPlatform = (game) => {
  if (!game) return 'Unknown';
  return game.brandPlatform || game.platform || 'Unknown';
};

function Library({ 
  library = [], 
  onLaunchGame = NOOP, 
  onScan = NOOP,
  onScanLibrary = NOOP,
  activeSessions = {},
  sortBy = 'name',
  setSortBy = NOOP,
  filterMood = '',
  setFilterMood = NOOP,
  filterGenre = '',
  setFilterGenre = NOOP,
  filterPlatform = '',
  setFilterPlatform = NOOP,
  filterMaxTime = '',
  setFilterMaxTime = NOOP,
  theme = 'dark',
  onToggleFavorite = NOOP,
  onRemoveGames = NOOP,
  onUpdatePrice = NOOP,
  onUpdateRating = NOOP,
  searchQuery = '',
  setSearchQuery = NOOP,
  endSession = NOOP,
  currency = 'USD'
}) {
  const navigate = useNavigate();
  const { currentTheme } = useContext(ThemeContext);
  const { success } = useToast();
  const scanLibraryHandler = onScanLibrary || onScan;
  const [viewMode, setViewMode] = useState('grid');
  const [selectedGame, setSelectedGame] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [favorites, setFavorites] = useState(() => {
    try {
      const storedFavorites = JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) || '[]');
      return Array.isArray(storedFavorites) ? storedFavorites : [];
    } catch (error) {
      console.error('Failed to load favorites:', error);
      return [];
    }
  });
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCinematicExportOpen, setIsCinematicExportOpen] = useState(false);
  const [itemsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(0);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedGames, setSelectedGames] = useState(new Set());
  const [systemInfo, setSystemInfo] = useState(null);
  const [freeGames, setFreeGames] = useState([]);
  const [showFreeGames, setShowFreeGames] = useState(true);
  const [loadingFreeGames, setLoadingFreeGames] = useState(false);
  const [freeGameError, setFreeGameError] = useState(null);
  const [completionFilter] = useState('');
  const [minPlaytime] = useState('');
  const [maxPlaytime] = useState('');
  const [localSortBy, setLocalSortBy] = useState(sortBy);
  const [localFilterMood, setLocalFilterMood] = useState(filterMood);
  const [localFilterGenre, setLocalFilterGenre] = useState(filterGenre);
  const [localFilterPlatform, setLocalFilterPlatform] = useState(filterPlatform);
  const [localFilterMaxTime, setLocalFilterMaxTime] = useState(filterMaxTime);
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [selectedGameIndex, setSelectedGameIndex] = useState(-1);
  const libraryContainerRef = useRef(null);

  useEffect(() => {
    setLocalSortBy(sortBy);
  }, [sortBy]);

  useEffect(() => {
    setLocalFilterMood(filterMood);
  }, [filterMood]);

  useEffect(() => {
    setLocalFilterGenre(filterGenre);
  }, [filterGenre]);

  useEffect(() => {
    setLocalFilterPlatform(filterPlatform);
  }, [filterPlatform]);

  useEffect(() => {
    setLocalFilterMaxTime(filterMaxTime);
  }, [filterMaxTime]);

  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

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
    return () => { isMounted = false; };
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

  const debouncedSearch = useMemo(() => debounce((value) => setSearchQuery(value), 300), [setSearchQuery]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setLocalSearchQuery(value);
    debouncedSearch(value);
  };

  const handleSortChange = (value) => {
    setLocalSortBy(value);
    setSortBy(value);
  };

  const handlePlatformFilterChange = (value) => {
    setLocalFilterPlatform(value);
    setFilterPlatform(value);
    setCurrentPage(0);
    setSelectedGameIndex(0);
  };

  const handleMoodFilterChange = (value) => {
    setLocalFilterMood(value);
    setFilterMood(value);
    setCurrentPage(0);
    setSelectedGameIndex(0);
  };

  const handleGenreFilterChange = (value) => {
    setLocalFilterGenre(value);
    setFilterGenre(value);
    setCurrentPage(0);
    setSelectedGameIndex(0);
  };

  const handlePlaytimeFilterChange = (value) => {
    setLocalFilterMaxTime(value);
    setFilterMaxTime(value);
    setCurrentPage(0);
    setSelectedGameIndex(0);
  };

  const handleToggleFavorite = useCallback((favoriteKey) => {
    if (!favoriteKey) {
      return;
    }

    setFavorites((previousFavorites) => {
      const nextFavorites = previousFavorites.includes(favoriteKey)
        ? previousFavorites.filter((entry) => entry !== favoriteKey)
        : [...previousFavorites, favoriteKey];

      try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(nextFavorites));
      } catch (error) {
        console.error('Failed to persist favorites:', error);
      }

      return nextFavorites;
    });

    onToggleFavorite(favoriteKey);
  }, [onToggleFavorite]);

  const openGameModal = useCallback((game) => {
    setSelectedGame(game);
    setIsModalOpen(true);
  }, []);

  const closeGameModal = () => {
    setIsModalOpen(false);
    setSelectedGame(null);
  };

  const filteredAndSortedGames = useMemo(() => {
    if (!Array.isArray(library)) return [];
    
    let filtered = library.filter(game => {
      if (!game) return false;
      const displayPlatform = getDisplayPlatform(game);
      const resolvedMood = getResolvedMood(game);
      const matchesSearch = game.name ? game.name.toLowerCase().includes(localSearchQuery.toLowerCase()) : false;
      const matchesMood = !localFilterMood || resolvedMood === localFilterMood;
      const matchesGenre = !localFilterGenre || (game.genres && Array.isArray(game.genres) && game.genres.includes(localFilterGenre));
      const matchesPlatform = !localFilterPlatform || displayPlatform === localFilterPlatform;
      const gamePlaytime = game.time_played || 0;
      const maxTimeFilter = localFilterMaxTime === '' ? null : parseInt(localFilterMaxTime, 10);
      const matchesMaxTime = maxTimeFilter === null
        ? true
        : maxTimeFilter === 0
          ? gamePlaytime === 0
          : gamePlaytime > 0 && gamePlaytime <= maxTimeFilter;
      const matchesMinPlaytime = !minPlaytime || gamePlaytime >= parseInt(minPlaytime);
      const matchesMaxPlaytime = !maxPlaytime || gamePlaytime <= parseInt(maxPlaytime);
      
      let matchesCompletion = true;
      if (completionFilter) {
        const completedGames = JSON.parse(localStorage.getItem('completedGames') || '[]');
        const isCompleted = completedGames.some(cg => cg.name === game.name);
        if (completionFilter === 'completed') matchesCompletion = isCompleted;
        else if (completionFilter === 'not-completed') matchesCompletion = !isCompleted;
      }
      
      return matchesSearch && matchesMood && matchesGenre && matchesPlatform && 
             matchesMaxTime && matchesMinPlaytime && matchesMaxPlaytime && matchesCompletion;
    });

    filtered.sort((a, b) => {
      switch (localSortBy) {
        case 'most-played': return (b.time_played || 0) - (a.time_played || 0);
        case 'least-played': return (a.time_played || 0) - (b.time_played || 0);
        case 'genre': return (a.genres?.[0] || '').localeCompare(b.genres?.[0] || '');
        case 'recent': return getLastPlayedSortValue(b.last_played) - getLastPlayedSortValue(a.last_played);
        case 'last-played': 
          const aLP = getLastPlayedSortValue(a.last_played);
          const bLP = getLastPlayedSortValue(b.last_played);
          if (aLP === 0 && bLP === 0) return a.name.localeCompare(b.name);
          return (aLP === 0) ? 1 : (bLP === 0) ? -1 : bLP - aLP;
        case 'rating':
          const aRating = typeof a.userRating === 'number' ? a.userRating : -1;
          const bRating = typeof b.userRating === 'number' ? b.userRating : -1;
          if (aRating === bRating) return a.name.localeCompare(b.name);
          return bRating - aRating;
        case 'platform': return (a.platform || '').localeCompare(b.platform || '');
        case 'mood': return getResolvedMood(a).localeCompare(getResolvedMood(b));
        case 'favorites':
          const aFav = favorites.includes(getFavoriteGameKey(a));
          const bFav = favorites.includes(getFavoriteGameKey(b));
          if (aFav && !bFav) return -1;
          if (!aFav && bFav) return 1;
          return a.name.localeCompare(b.name);
        default: return a.name.localeCompare(b.name);
      }
    });

    return filtered;
  }, [library, localSearchQuery, localFilterMood, localFilterGenre, localFilterPlatform, localFilterMaxTime, localSortBy, favorites, completionFilter, minPlaytime, maxPlaytime]);

  const displayedGames = useMemo(() => {
    const startIndex = currentPage * itemsPerPage;
    return filteredAndSortedGames.slice(startIndex, startIndex + itemsPerPage);
  }, [currentPage, filteredAndSortedGames, itemsPerPage]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredAndSortedGames.length / itemsPerPage));
    setCurrentPage((prev) => Math.min(prev, totalPages - 1));
  }, [filteredAndSortedGames.length, itemsPerPage]);

  const getVisibleGameCount = useCallback(() => {
    return displayedGames.length;
  }, [displayedGames.length]);

  const getGridColumnCount = useCallback(() => {
    if (viewMode !== 'grid') {
      return 1;
    }

    const containerWidth = libraryContainerRef.current?.clientWidth || window.innerWidth || 320;
    const firstCardWidth = libraryContainerRef.current?.firstElementChild?.getBoundingClientRect?.().width || 320;
    return Math.max(1, Math.floor(containerWidth / Math.max(firstCardWidth, 1)));
  }, [viewMode]);

  const moveSelectionByOffset = useCallback((offset) => {
    const visibleGameCount = getVisibleGameCount();
    if (visibleGameCount === 0) {
      return;
    }

    setSelectedGameIndex((prev) => {
      const currentIndex = prev < 0 ? 0 : prev;
      return Math.max(0, Math.min(visibleGameCount - 1, currentIndex + offset));
    });
  }, [getVisibleGameCount]);

  const moveSelectionByPage = useCallback((direction) => {
    const visibleGameCount = getVisibleGameCount();
    if (visibleGameCount === 0) {
      return;
    }

    const pageStep = Math.max(1, Math.floor(viewMode === 'grid' ? itemsPerPage / 2 : 8));
    setSelectedGameIndex((prev) => {
      const currentIndex = prev < 0 ? 0 : prev;
      return Math.max(0, Math.min(visibleGameCount - 1, currentIndex + (direction * pageStep)));
    });
  }, [getVisibleGameCount, itemsPerPage, viewMode]);

  const goToPreviousPage = useCallback(() => {
    if (currentPage > 0) {
      setCurrentPage((prev) => prev - 1);
      setSelectedGameIndex(0);
      return;
    }

    const currentRouteIndex = CONTROLLER_NAV_ROUTES.indexOf('/library');
    const previousRoute = CONTROLLER_NAV_ROUTES[(currentRouteIndex - 1 + CONTROLLER_NAV_ROUTES.length) % CONTROLLER_NAV_ROUTES.length];
    navigate(previousRoute);
  }, [currentPage, navigate]);

  const goToNextPage = useCallback(() => {
    const totalPages = Math.max(1, Math.ceil(filteredAndSortedGames.length / itemsPerPage));

    if (currentPage < totalPages - 1) {
      setCurrentPage((prev) => prev + 1);
      setSelectedGameIndex(0);
      return;
    }

    const currentRouteIndex = CONTROLLER_NAV_ROUTES.indexOf('/library');
    const nextRoute = CONTROLLER_NAV_ROUTES[(currentRouteIndex + 1) % CONTROLLER_NAV_ROUTES.length];
    navigate(nextRoute);
  }, [currentPage, filteredAndSortedGames.length, itemsPerPage, navigate]);

  const toggleBulkMode = () => {
    setBulkMode(!bulkMode);
    if (bulkMode) setSelectedGames(new Set());
  };

  const toggleShowAll = () => {
    const totalPages = Math.max(1, Math.ceil(filteredAndSortedGames.length / itemsPerPage));
    setCurrentPage((prev) => (prev >= totalPages - 1 ? 0 : totalPages - 1));
  };

  const bulkMarkCompleted = () => {
    if (selectedGames.size === 0) return;
    const completedGames = JSON.parse(localStorage.getItem('completedGames') || '[]');
    selectedGames.forEach(gameId => {
      const game = displayedGames.find(g => (g.appid || g.name) === gameId);
      if (game && !completedGames.some(cg => cg.name === game.name)) {
        completedGames.push({ name: game.name, completedAt: new Date().toISOString(), playTime: game.time_played || 0 });
      }
    });
    localStorage.setItem('completedGames', JSON.stringify(completedGames));
    success(`Marked ${selectedGames.size} games as completed!`);
    setSelectedGames(new Set());
  };

  const bulkRemoveGames = () => {
    if (selectedGames.size === 0) {
      return;
    }

    const gameIds = Array.from(selectedGames);
    onRemoveGames(gameIds);
    success(`Removed ${gameIds.length} games from your library.`);
    setSelectedGames(new Set());
    setBulkMode(false);
    setSelectedGameIndex(0);
  };

  const handleControllerInput = useCallback((action) => {
    const visibleGameCount = getVisibleGameCount();
    const gridColumnCount = getGridColumnCount();

    if (isModalOpen) {
      return;
    }

    if (action === 'cancel') {
      goToPreviousPage();
      return;
    }

    if (action === 'page_previous') {
      goToPreviousPage();
      return;
    }

    if (action === 'page_next') {
      goToNextPage();
      return;
    }

    if (action === 'scroll_down') {
      window.scrollBy({ top: 220, behavior: 'smooth' });
      return;
    }

    if (action === 'scroll_up') {
      window.scrollBy({ top: -220, behavior: 'smooth' });
      return;
    }

    if (viewMode === 'grid') {
      if (action === 'left') {
        moveSelectionByOffset(-1);
        return;
      }

      if (action === 'right') {
        moveSelectionByOffset(1);
        return;
      }

      if (action === 'up') {
        moveSelectionByOffset(-gridColumnCount);
        return;
      }

      if (action === 'down') {
        moveSelectionByOffset(gridColumnCount);
        return;
      }
    }

    if (action === 'left') {
      moveSelectionByPage(-1);
      return;
    }

    if (action === 'right') {
      moveSelectionByPage(1);
      return;
    }

    if (action === 'down' && selectedGameIndex < visibleGameCount - 1) {
      moveSelectionByOffset(1);
    } else if (action === 'up' && selectedGameIndex > 0) {
      moveSelectionByOffset(-1);
    } else if (action === 'confirm' && selectedGameIndex >= 0 && selectedGameIndex < visibleGameCount) {
      openGameModal(displayedGames[selectedGameIndex]);
    }
  }, [selectedGameIndex, getVisibleGameCount, getGridColumnCount, isModalOpen, goToPreviousPage, goToNextPage, moveSelectionByOffset, moveSelectionByPage, openGameModal, displayedGames, viewMode]);

  useEffect(() => {
    const handleGlobalControllerInput = (event) => {
      handleControllerInput(event?.detail?.action);
    };
    window.addEventListener('controllerInput', handleGlobalControllerInput);
    return () => window.removeEventListener('controllerInput', handleGlobalControllerInput);
  }, [handleControllerInput]);

  // UI Presentation Logic
  const rewardPresentationCustomization = ProgressionUnlockService.getRewardPresentationCustomization?.() || {};
  const libraryPresentationRewards = ProgressionUnlockService.getLibraryPresentationVariants?.() || [];
  const selectedLibraryPresentation = libraryPresentationRewards.find(
    (presentation) => presentation.id === rewardPresentationCustomization.selectedLibraryVariant
  ) || libraryPresentationRewards[0] || null;
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

  const getGameCardClass = useCallback((game, index) => {
    return `game-card fade-in ${selectedGameIndex === index ? 'selected' : ''}`;
  }, [selectedGameIndex]);

  return (
    <div className={`App ${theme} library-page library-presentation-${libraryPresentationId}`} style={libraryRootStyle}>
      <NavBar />
      
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
            <span className="stat-number">{library.reduce((sum, g) => sum + (g.time_played || 0), 0)}</span>
            <span className="stat-label">Total Minutes</span>
          </div>
        </div>
      </div>

      {/* Free Games Section */}
      {showFreeGames ? (
        <div className="free-games-section">
          <div className="free-games-header">
            <div>
              <h3>🆓 Weekly Free Games</h3>
              <p>Powered by Epic Games Store — auto-refreshes hourly.</p>
            </div>
            <div className="free-games-controls">
              <button onClick={refreshFreeGames} disabled={loadingFreeGames}>Refresh</button>
              <button onClick={() => setShowFreeGames(false)}>Hide</button>
            </div>
          </div>
          {freeGameError && (
            <div className="free-games-error" role="alert">
              {freeGameError}
            </div>
          )}
          <div className="free-games-grid">
            {freeGames.map(game => (
              <div key={game.id} className="free-game-card">
                <div className="free-game-thumb" style={{ backgroundImage: `url(${game.image})` }} />
                <div className="free-game-body">
                  <h4>{game.title}</h4>
                  <div className="free-game-meta">
                    <button onClick={() => window.open(game.url, '_blank')}>Claim</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="free-games-hidden-bar">
          <button onClick={() => setShowFreeGames(true)}>Show Free Games Radar</button>
        </div>
      )}

      {/* Action Bar */}
      <div className="export-section">
        <button onClick={() => setIsExportModalOpen(true)} className="export-button">
          <Download size={16} /> Export Data
        </button>
        <button onClick={() => setIsCinematicExportOpen(true)} className="export-button" style={{ marginLeft: '12px' }}>
          <Grid size={16} /> Cinematic Poster
        </button>
        <button onClick={scanLibraryHandler} className="export-button" style={{ marginLeft: '12px' }}>
          🔄 Scan Library
        </button>
        <button 
          onClick={toggleBulkMode} 
          className={`bulk-mode-btn ${bulkMode ? 'active' : ''}`}
          style={{ marginLeft: '12px' }}
        >
          {bulkMode ? 'Exit Bulk Mode' : 'Bulk Mode'}
        </button>
        {bulkMode && selectedGames.size > 0 && (
          <button
            onClick={bulkMarkCompleted}
            className="export-button"
            style={{ marginLeft: '12px' }}
          >
            Mark {selectedGames.size} Completed
          </button>
        )}
        {bulkMode && selectedGames.size > 0 && (
          <button
            onClick={bulkRemoveGames}
            className="export-button"
            style={{ marginLeft: '12px' }}
          >
            <Trash2 size={16} /> Remove {selectedGames.size}
          </button>
        )}
      </div>

      {/* Search and Grid */}
      <div className="search-filter-section">
        <div className="search-bar">
          <Search size={20} />
          <input type="text" placeholder="Search games..." value={localSearchQuery} onChange={handleSearchChange} className="search-input" />
        </div>
        <div className="filter-group">
          <label>Sort By</label>
          <select value={localSortBy} onChange={(e) => handleSortChange(e.target.value)} className="filter-select">
            <option value="name">Name</option>
            <option value="recent">Recently Added</option>
            <option value="last-played">Last Played</option>
            <option value="most-played">Most Played</option>
            <option value="least-played">Least Played</option>
            <option value="genre">Genre</option>
            <option value="platform">Platform</option>
            <option value="rating">Your Rating</option>
            <option value="mood">Mood</option>
            <option value="favorites">Favorites First</option>
          </select>
        </div>
        <div className="view-toggle">
          <button onClick={() => setViewMode('grid')} className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}><Grid size={20} /></button>
          <button onClick={() => setViewMode('list')} className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}><List size={20} /></button>
        </div>
      </div>

      <div className="quick-filters">
        <div className="filter-group">
          <label>Platform</label>
          <select value={localFilterPlatform} onChange={(e) => handlePlatformFilterChange(e.target.value)} className="filter-select">
            <option value="">All Platforms</option>
            <option value="Steam">Steam</option>
            <option value="Epic">Epic</option>
            <option value="GOG">GOG</option>
            <option value="EA">EA</option>
            <option value="Ubisoft">Ubisoft</option>
            <option value="Battle.net">Battle.net</option>
            <option value="Xbox">Xbox</option>
            <option value="PlayStation">PlayStation</option>
            <option value="Rockstar">Rockstar</option>
            <option value="BSG">Battlestate Games</option>
            <option value="Riot">Riot Games</option>
            <option value="CurseForge">CurseForge</option>
            <option value="Manual">Manual Entry</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Mood</label>
          <select value={localFilterMood} onChange={(e) => handleMoodFilterChange(e.target.value)} className="filter-select">
            <option value="">All Moods</option>
            {['Relaxed', 'Social', 'Creative', 'Competitive', 'Focused', 'Tactical', 'Escapist', 'Sporty'].map(mood => (
              <option key={mood} value={mood}>{mood}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Genre</label>
          <select value={localFilterGenre} onChange={(e) => handleGenreFilterChange(e.target.value)} className="filter-select">
            <option value="">All Genres</option>
            {Array.from(new Set(library.flatMap(g => g.genres || [])))
              .filter(genre => genre && genre !== 'Unknown' && genre.toLowerCase() !== 'unknown')
              .sort()
              .map(genre => (
                <option key={genre} value={genre}>{genre}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Playtime</label>
          <select value={localFilterMaxTime} onChange={(e) => handlePlaytimeFilterChange(e.target.value)} className="filter-select">
            <option value="">Any Time</option>
            <option value="0">Never Played</option>
            <option value="120">Under 2 hours</option>
            <option value="600">Under 10 hours</option>
            <option value="3000">Under 50 hours</option>
          </select>
        </div>
      </div>

      <div ref={libraryContainerRef} className={`library-${viewMode}`} style={viewMode === 'grid' ? {
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fill, minmax(${libraryPresentationPreset.gridMinWidth}px, 1fr))`,
        gap: `${libraryPresentationPreset.gridGap}px`,
        padding: '20px'
      } : { 
        display: 'flex',
        flexDirection: 'column',
        gap: `${libraryPresentationPreset.listGap}px`,
        padding: '20px'
      }}>
        {displayedGames.map((game, index) => {
          const favoriteKey = getFavoriteGameKey(game);
          const isFavorite = favorites.includes(favoriteKey);
          const resolvedMood = getResolvedMood(game);
          const gameValue = getGameValue(game);

          return (
          <div 
            key={game.appid || game.name} 
            className={getGameCardClass(game, index)}
            onClick={() => bulkMode ? null : openGameModal(game)}
            style={viewMode === 'grid' ? {
              backgroundColor: 'var(--bg-card)',
              borderRadius: 'var(--library-presentation-card-radius)',
              padding: `${libraryPresentationPreset.cardPadding}px`,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--library-presentation-card-shadow)',
              border: '1px solid var(--library-presentation-card-border)'
            } : {
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              padding: libraryPresentationPreset.listPadding,
              backgroundColor: 'var(--bg-card)',
              borderRadius: 'var(--library-presentation-card-radius)',
              border: '1px solid var(--border-primary)',
              cursor: 'pointer'
            }}
          >
            {/* Bulk Selection Overlay */}
            {bulkMode && (
              <div className="bulk-checkbox-container" style={{ marginRight: '10px' }}>
                <input 
                  type="checkbox" 
                  checked={selectedGames.has(game.appid || game.name)}
                  onChange={(e) => {
                    e.stopPropagation();
                    const newSet = new Set(selectedGames);
                    const id = game.appid || game.name;
                    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
                    setSelectedGames(newSet);
                  }}
                />
              </div>
            )}
            
            <div className="game-card-image-wrapper" style={viewMode === 'grid' ? {
                width: '100%',
                aspectRatio: '231 / 87',
                height: 'auto',
                marginBottom: '12px',
                borderRadius: '8px',
                overflow: 'hidden',
                flexShrink: 0,
                backgroundColor: '#1a1a1a'
            } : {
                width: '120px',
                aspectRatio: '231 / 87',
                height: 'auto',
                marginRight: '15px',
                borderRadius: '6px',
                overflow: 'hidden',
                flexShrink: 0,
                backgroundColor: '#1a1a1a'
            }}>
                <LazyImage 
                    src={resolveGameArtwork(game, { surface: viewMode === 'grid' ? 'library_card' : 'recommendation_card' })} 
                    alt={game.name} 
                    gameName={game.name}
                    platform={getDisplayPlatform(game)}
                    genre={Array.isArray(game.genres) ? game.genres[0] : undefined}
                    mood={game.mood}
                    placeholder={getGameArtworkPlaceholder({ game, surface: viewMode === 'grid' ? 'library_card' : 'recommendation_card' })}
                    style={{ height: '100%', width: '100%', objectFit: 'cover' }}
                />
            </div>

            <div className="game-info" style={{ flexGrow: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{game.name}</h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFavorite(favoriteKey);
                  }}
                  aria-label={isFavorite ? `Remove ${game.name} from favorites` : `Add ${game.name} to favorites`}
                  style={{
                    border: 'none',
                    background: isFavorite ? 'var(--library-presentation-tag-bg)' : 'transparent',
                    color: isFavorite ? 'var(--library-presentation-accent)' : 'var(--text-secondary)',
                    borderRadius: '999px',
                    width: '36px',
                    height: '36px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />
                </button>
              </div>
              <p className="playtime" style={{ display: 'flex', alignItems: 'center', gap: '5px', opacity: 0.7, fontSize: '0.9rem', marginTop: '4px' }}>
                <Clock size={12} /> {formatTimePlayed(game.time_played)}
              </p>
              {gameValue > 0 && (
                <p style={{ opacity: 0.8, fontSize: '0.85rem', marginTop: '4px', marginBottom: 0, color: 'var(--text-secondary)' }}>
                  Value: {formatPrice(gameValue, currency)}
                </p>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--library-presentation-accent)', background: 'var(--library-presentation-tag-bg)', padding: '4px 8px', borderRadius: '999px' }}>
                  {getDisplayPlatform(game)}
                </span>
                {resolvedMood && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--library-presentation-tag-color)', background: 'var(--library-presentation-tag-bg)', padding: '4px 8px', borderRadius: '999px' }}>
                    {resolvedMood}
                  </span>
                )}
                {Array.isArray(game.genres) && game.genres[0] && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.06)', padding: '4px 8px', borderRadius: '999px' }}>
                    {game.genres[0]}
                  </span>
                )}
              </div>
              {viewMode === 'list' && (
                  <div className="platform-tag" style={{ marginTop: '5px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--library-presentation-accent)' }}>
                          {getDisplayPlatform(game)}
                      </span>
                  </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: viewMode === 'grid' ? 'stretch' : 'center', marginTop: viewMode === 'grid' ? '14px' : 0, marginLeft: viewMode === 'list' ? '14px' : 0 }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLaunchGame(game);
                }}
                style={{
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  background: 'linear-gradient(135deg, var(--library-presentation-accent), var(--library-presentation-secondary))',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  whiteSpace: 'nowrap'
                }}
              >
                Launch
              </button>
            </div>
          </div>
        )})}
      </div>

      {/* Show More/Less Button */}
      {filteredAndSortedGames.length > itemsPerPage && (
        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <div style={{ marginBottom: '12px', opacity: 0.75 }}>
            Page {currentPage + 1} of {Math.max(1, Math.ceil(filteredAndSortedGames.length / itemsPerPage))}
          </div>
          <button
            onClick={() => toggleShowAll()}
            style={{
              border: 'none',
              borderRadius: '25px',
              padding: '12px 24px',
              background: 'linear-gradient(135deg, var(--library-presentation-accent), var(--library-presentation-secondary))',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.9rem',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
            }}
          >
            {currentPage >= Math.max(1, Math.ceil(filteredAndSortedGames.length / itemsPerPage)) - 1 ? 'Back to First Page' : 'Jump to Last Page'}
          </button>
        </div>
      )}

      {/* Modals */}
      {isModalOpen && <GameModal game={selectedGame} isOpen={isModalOpen} onClose={closeGameModal} onLaunch={onLaunchGame} systemInfo={systemInfo} onUpdateRating={onUpdateRating} onToggleFavorite={handleToggleFavorite} isFavorite={favorites.includes(getFavoriteGameKey(selectedGame))} />}
      {isExportModalOpen && <ExportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} library={library} />}
      {isCinematicExportOpen && <CinematicExport isOpen={isCinematicExportOpen} onClose={() => setIsCinematicExportOpen(false)} library={library} />}
      <BackToTopButton />
    </div>
  );
}

export default Library;