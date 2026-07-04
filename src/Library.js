import React, { useState, useMemo, useContext, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import { Search, Grid, List, Clock, Heart, Pin, Trash2, Sparkles, Dices, Play, ChevronLeft, ChevronRight, BarChart3, X, EyeOff, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import NavBar from './NavBar';
import GameModal from './components/GameModal';
import LibraryAnalyticsPanel from './components/LibraryAnalyticsPanel';
import LibraryShareCard, { LIBRARY_SHARE_CARD_SIZE_PX } from './components/LibraryShareCard';
import TopRatedShareCard, { TOP_RATED_SHARE_CARD_SIZE_PX } from './components/TopRatedShareCard';
import RecapCustomizeModal from './components/RecapCustomizeModal';
import ShareMenu from './components/ShareMenu';
import EmptyLibraryState from './components/EmptyLibraryState';
import LazyImage from './components/LazyImage';
import BackToTopButton from './components/BackToTopButton';
import HLTBChip from './components/HLTBChip';
import PatchNewsBadge from './components/PatchNewsBadge';
import DiskSizeChip from './components/DiskSizeChip';
import { LocalShareService } from './services/LocalShareService';
import { ProfileService } from './services/ProfileService';
import StorageService from './services/StorageService';
import InterfacePreferencesService from './services/InterfacePreferencesService';
import SteamNewsService from './services/SteamNewsService';
import DiskUsageService from './services/DiskUsageService';
import { useToast } from './components/Toast';
import { DataExportService } from './services/DataExportService';
import HowLongToBeatService, { hltbGameKey } from './services/HowLongToBeatService';
import { MOODS, getMoodForGame } from './constants/GenresMoods';
import { ThemeContext, getThemeSpecificLibraryTitle } from './ThemeContext';
import { HardwareDetector } from './services/HardwareDetector';
import { FreeGameRadar } from './services/FreeGameRadar';
import { ProgressionUnlockService } from './services/ProgressionUnlockService';
import { GameCurationService } from './services/GameCurationService';
import EmulatorLibraryService from './services/EmulatorLibraryService';
import { mergeLibraryUpdates } from './services/LibraryDataService';
import { getGameArtworkPlaceholder, resolveGameArtwork } from './services/GameArtworkService';
import { formatPrice } from './CurrencyConverter';
import { formatPlaytime } from './utils/formatPlaytime';
import useInterfacePreferences from './hooks/useInterfacePreferences';
import './Library.css';

const getFavoriteGameKey = (game) => game?.appid || game?.app_id || game?.steamAppId || game?.name;
const NOOP = () => {};
const CONTROLLER_NAV_ROUTES = ['/', '/library', '/stats', '/year-in-review', '/profile', '/settings'];
const FAVORITES_STORAGE_KEY = 'favorites';
const RECENTLY_ADDED_WINDOW_DAYS = 14;

const getResolvedMood = (game) => {
  if (!game || typeof game !== 'object') {
    return 'Relaxed';
  }

  // Always derive mood fresh from current genres + mapping
  const genres = game.genres || [];
  if (genres.length > 0) {
    const derived = getMoodForGame(genres);
    if (derived) {
      return derived;
    }
  }

  // No genres at all — use stored mood if available, else default
  if (typeof game.mood === 'string' && game.mood.trim()) {
    return game.mood.trim();
  }

  return 'Relaxed';
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

  const storedPrices = StorageService.get('gamePrices', {});
  const storedPrice = storedPrices?.[game.appid];
  if (typeof storedPrice?.priceNumeric === 'number' && Number.isFinite(storedPrice.priceNumeric)) {
    return storedPrice.priceNumeric;
  }

  return 0;
};

const formatTimePlayed = (minutes) => {
  if (!minutes || minutes === 0) return 'Never played';
  return formatPlaytime(minutes);
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
  scanLocalLibrary = NOOP,
  onLibraryUpdated = NOOP,
  loading = false,
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
  onUpdateCollections = NOOP,
  onToggleHidden = NOOP,
  onUpdateCompletion = NOOP,
  onUpdateNotes = NOOP,
  onUpdateCoverArt = NOOP,
  onAddSessionNote = NOOP,
  searchQuery = '',
  setSearchQuery = NOOP,
  endSession = NOOP,
  currency = 'USD'
}) {
  const navigate = useNavigate();
  const { currentTheme } = useContext(ThemeContext);
  const { success, error: toastError } = useToast();
  const scanLibraryHandler = onScanLibrary || onScan || scanLocalLibrary;
  const [viewMode, setViewMode] = useState('grid');
  const [selectedGame, setSelectedGame] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [favorites, setFavorites] = useState(() => {
    try {
      const storedFavorites = StorageService.get(FAVORITES_STORAGE_KEY, []);
      return Array.isArray(storedFavorites) ? storedFavorites : [];
    } catch (error) {
      console.error('Failed to load favorites:', error);
      return [];
    }
  });
  const [isRecapCustomizeOpen, setIsRecapCustomizeOpen] = useState(false);
  const [sharePeriod, setSharePeriod] = useState('all');
  const [recapCustomization, setRecapCustomization] = useState(
    () => ProgressionUnlockService.getRecapCustomization?.() || { palette: null, visibleStats: {} }
  );
  const [selectedTopRatedGames, setSelectedTopRatedGames] = useState([]);
  const [showTopRatedPicker, setShowTopRatedPicker] = useState(false);
  const libraryShareCardRef = useRef(null);
  const topRatedShareCardRef = useRef(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [itemsPerPage] = useState(50);
  const [displayCount, setDisplayCount] = useState(50);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedGames, setSelectedGames] = useState(new Set());
  const [systemInfo, setSystemInfo] = useState(null);
  const [freeGames, setFreeGames] = useState([]);
  const [showFreeGames, setShowFreeGames] = useState(true);
  const [loadingFreeGames, setLoadingFreeGames] = useState(false);
  const [freeGameError, setFreeGameError] = useState(null);
  const [emulatorProfiles, setEmulatorProfiles] = useState(() => EmulatorLibraryService.getProfiles());
  const [showEmulatorManager, setShowEmulatorManager] = useState(false);
  const [scanningEmulators, setScanningEmulators] = useState(false);
  const [emulatorDraft, setEmulatorDraft] = useState(() => ({
    name: '',
    consolePlatform: '',
    emulatorPath: '',
    romFolder: '',
    extensions: EmulatorLibraryService.getDefaultExtensions().join(', '),
    launchTemplate: '"{emulator}" "{rom}"'
  }));
  const [localSortBy, setLocalSortBy] = useState(sortBy);
  const [localFilterMood, setLocalFilterMood] = useState(filterMood);
  const [localFilterGenre, setLocalFilterGenre] = useState(filterGenre);
  const [localFilterPlatform, setLocalFilterPlatform] = useState(filterPlatform);
  const [localFilterMaxTime, setLocalFilterMaxTime] = useState(filterMaxTime);
  const [localFilterReplayIntent, setLocalFilterReplayIntent] = useState('');
  const [localFilterCompletion, setLocalFilterCompletion] = useState('');
  const [showHidden, setShowHidden] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [selectedGameIndex, setSelectedGameIndex] = useState(-1);
  const [librarianPick, setLibrarianPick] = useState(null);
  const [isLuckyAnimating, setIsLuckyAnimating] = useState(false);
  const [luckyPreviewName, setLuckyPreviewName] = useState('');
  const [carouselIndex, setCarouselIndex] = useState(0);
  const libraryContainerRef = useRef(null);
  const luckyAnimationTimeoutRef = useRef(null);
  const luckyPreviewIntervalRef = useRef(null);
  const interfacePrefs = useInterfacePreferences();
  const pinnedIds = useMemo(() => new Set((interfacePrefs.pinnedGameIds || []).map(String)), [interfacePrefs.pinnedGameIds]);
  const handleTogglePin = useCallback((game) => {
    const key = String(getFavoriteGameKey(game));
    InterfacePreferencesService.togglePin(key);
  }, []);

  const username = useMemo(() => ProfileService.getCurrentUsername(), []);

  const allTopRatedGames = useMemo(() => {
    return (library || [])
      .filter((game) => typeof game?.userRating === 'number' && game.userRating >= 10)
      .sort((left, right) => {
        const ratingDiff = (right.userRating || 0) - (left.userRating || 0);
        if (ratingDiff !== 0) return ratingDiff;
        const aTime = Number(left?.time_played ?? left?.playtime ?? left?.totalPlaytime ?? 0);
        const bTime = Number(right?.time_played ?? right?.playtime ?? right?.totalPlaytime ?? 0);
        return bTime - aTime;
      });
  }, [library]);

  const generateLibraryShareCardBlob = useCallback(async () => {
    if (!libraryShareCardRef.current) {
      return null;
    }
    const canvas = await html2canvas(libraryShareCardRef.current, {
      scale: 1,
      width: LIBRARY_SHARE_CARD_SIZE_PX,
      height: LIBRARY_SHARE_CARD_SIZE_PX,
      backgroundColor: null,
      logging: false,
      useCORS: true
    });
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  }, []);

  const handleCopyLibraryShareText = useCallback(async (text = null) => {
    const shareText = text || ProfileService.appendSocialLinksToShareText(LocalShareService.buildLibraryShareText(library, username, sharePeriod));
    const copied = await LocalShareService.copyTextToClipboard(shareText);
    if (copied) {
      success('Library recap text copied to clipboard.');
    } else {
      toastError('Could not copy library recap text.');
    }
    return copied;
  }, [library, username, sharePeriod, success, toastError]);

  const handleDownloadShareText = useCallback((text = null) => {
    const shareText = text || ProfileService.appendSocialLinksToShareText(LocalShareService.buildLibraryShareText(library, username, sharePeriod));
    const result = LocalShareService.downloadShareText(shareText, `gamepilot-${sharePeriod}-recap-${new Date().toISOString().split('T')[0]}.txt`);
    if (result) {
      success('Library recap caption downloaded.');
    } else {
      toastError('Could not download caption.');
    }
  }, [library, username, sharePeriod, success, toastError]);

  const handleShareToChannel = useCallback(async (channel, text = null) => {
    const shareText = text || ProfileService.appendSocialLinksToShareText(LocalShareService.buildLibraryShareText(library, username, sharePeriod));

    // Social web intents are text-only, so pre-stage the recap image on the
    // clipboard where supported. Gamers can then paste it straight into the post.
    let imageStaged = false;
    if (library.length > 0 && LocalShareService.canCopyImage()) {
      try {
        const blob = await generateLibraryShareCardBlob();
        if (blob) {
          const { filename } = LocalShareService.buildLibraryShareCardPackage(library, username, sharePeriod);
          const copyResult = await LocalShareService.copyImageToClipboard(blob, filename);
          imageStaged = copyResult.success;
        }
      } catch (error) {
        imageStaged = false;
      }
    }

    const result = await LocalShareService.openShareIntent(channel, shareText);
    if (result.success) {
      if (imageStaged) {
        success(`${result.label} opened — your recap image is copied, just paste it into the post.`);
      } else {
        success(`${result.label} share opened. Save the recap image to attach it to your post.`);
      }
    } else {
      toastError(result.message || 'Could not open share link.');
    }
  }, [library, username, sharePeriod, generateLibraryShareCardBlob, success, toastError]);

  const handleShareToDiscord = useCallback(async (text = null) => {
    const shareText = text || ProfileService.appendSocialLinksToShareText(LocalShareService.buildLibraryShareText(library, username, sharePeriod));
    let imageBlob = null;
    let filename = 'gamepilot-library-recap.png';

    if (library.length > 0 && LocalShareService.canCopyImage()) {
      try {
        imageBlob = await generateLibraryShareCardBlob();
        const packageResult = LocalShareService.buildLibraryShareCardPackage(library, username, sharePeriod);
        filename = packageResult.filename;
      } catch (error) {
        imageBlob = null;
      }
    }

    const result = await LocalShareService.shareToDiscord({ imageBlob, text: shareText, filename });
    if (result.success) {
      if (result.imageStaged) {
        success('Discord opened — your recap image and caption are copied, just paste them in.');
      } else {
        success('Discord opened — caption copied, save the image to attach it.');
      }
    } else {
      toastError(result.message || 'Could not share to Discord.');
    }
  }, [library, username, sharePeriod, generateLibraryShareCardBlob, success, toastError]);

  const handleShareToMessenger = useCallback(async (text = null) => {
    const shareText = text || ProfileService.appendSocialLinksToShareText(LocalShareService.buildLibraryShareText(library, username, sharePeriod));
    let imageBlob = null;
    let filename = 'gamepilot-library-recap.png';

    if (library.length > 0 && LocalShareService.canCopyImage()) {
      try {
        imageBlob = await generateLibraryShareCardBlob();
        const packageResult = LocalShareService.buildLibraryShareCardPackage(library, username, sharePeriod);
        filename = packageResult.filename;
      } catch (error) {
        imageBlob = null;
      }
    }

    const result = await LocalShareService.shareToMessenger({ imageBlob, text: shareText, filename });
    if (result.success) {
      if (result.imageStaged) {
        success('Messenger opened — your recap image and caption are copied, just paste them in.');
      } else {
        success('Messenger opened — caption copied, save the image to attach it.');
      }
    } else {
      toastError(result.message || 'Could not share to Messenger.');
    }
  }, [library, username, sharePeriod, generateLibraryShareCardBlob, success, toastError]);

  const handleDownloadLibraryShareCard = useCallback(async () => {
    const blob = await generateLibraryShareCardBlob();
    if (!blob) {
      toastError('Could not generate share card.');
      return false;
    }
    const { filename } = LocalShareService.buildLibraryShareCardPackage(library, username, sharePeriod);
    DataExportService.downloadFile(blob, filename);
    success('Library recap card saved.');
    return true;
  }, [generateLibraryShareCardBlob, library, username, sharePeriod, success, toastError]);

  const handleCopyLibraryShareCard = useCallback(async () => {
    const blob = await generateLibraryShareCardBlob();
    if (!blob) {
      toastError('Could not generate share card.');
      return false;
    }
    const { filename } = LocalShareService.buildLibraryShareCardPackage(library, username, sharePeriod);
    const result = await LocalShareService.copyImageToClipboard(blob, filename);
    if (result.success) {
      success('Library recap card copied to clipboard.');
      return true;
    }
    toastError(result.message || 'Could not copy image.');
    return false;
  }, [generateLibraryShareCardBlob, library, username, sharePeriod, success, toastError]);

  const handleNativeShareLibraryCard = useCallback(async (text = null) => {
    const blob = await generateLibraryShareCardBlob();
    const { text: baseText, filename, title } = LocalShareService.buildLibraryShareCardPackage(library, username, sharePeriod);
    if (!blob) {
      toastError('Could not generate share card.');
      return;
    }
    const file = new File([blob], filename, { type: 'image/png' });
    const result = await LocalShareService.shareWithNativeShare({ text: text || ProfileService.appendSocialLinksToShareText(baseText), files: [file], title });
    if (!result.success) {
      toastError(result.message || 'Native share failed.');
    }
  }, [generateLibraryShareCardBlob, library, username, sharePeriod, toastError]);

  const generateTopRatedShareCardBlob = useCallback(async () => {
    if (!topRatedShareCardRef.current) {
      return null;
    }
    const canvas = await html2canvas(topRatedShareCardRef.current, {
      scale: 1,
      width: TOP_RATED_SHARE_CARD_SIZE_PX,
      height: TOP_RATED_SHARE_CARD_SIZE_PX,
      backgroundColor: null,
      logging: false,
      useCORS: true
    });
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  }, []);

  const handleShareTopRatedToChannel = useCallback(async (channel, text = null) => {
    const shareText = text || ProfileService.appendSocialLinksToShareText(LocalShareService.buildTopRatedShareText(library, username, selectedTopRatedGames));
    let imageStaged = false;
    try {
      const blob = await generateTopRatedShareCardBlob();
      if (blob && LocalShareService.canCopyImage()) {
        const { filename } = LocalShareService.buildTopRatedShareCardPackage(library, username, selectedTopRatedGames);
        const copyResult = await LocalShareService.copyImageToClipboard(blob, filename);
        imageStaged = copyResult.success;
      }
    } catch (error) {
      imageStaged = false;
    }
    const result = await LocalShareService.openShareIntent(channel, shareText);
    if (result.success) {
      if (imageStaged) {
        success(`${result.label} opened — your top-rated card is copied, just paste it into the post.`);
      } else {
        success(`${result.label} share opened. Save the top-rated card to attach it to your post.`);
      }
    } else {
      toastError(result.message || 'Could not open share link.');
    }
  }, [library, username, selectedTopRatedGames, generateTopRatedShareCardBlob, success, toastError]);

  const handleShareTopRatedToDiscord = useCallback(async (text = null) => {
    const shareText = text || ProfileService.appendSocialLinksToShareText(LocalShareService.buildTopRatedShareText(library, username, selectedTopRatedGames));
    let imageBlob = null;
    let filename = 'gamepilot-top-rated.png';
    try {
      imageBlob = await generateTopRatedShareCardBlob();
      const packageResult = LocalShareService.buildTopRatedShareCardPackage(library, username, selectedTopRatedGames);
      filename = packageResult.filename;
    } catch (error) {
      imageBlob = null;
    }
    const result = await LocalShareService.shareToDiscord({ imageBlob, text: shareText, filename });
    if (result.success) {
      if (result.imageStaged) {
        success('Discord opened — your top-rated card and caption are copied, just paste them in.');
      } else {
        success('Discord opened — caption copied, save the top-rated card to attach it.');
      }
    } else {
      toastError(result.message || 'Could not share to Discord.');
    }
  }, [library, username, selectedTopRatedGames, generateTopRatedShareCardBlob, success, toastError]);

  const handleShareTopRatedToMessenger = useCallback(async (text = null) => {
    const shareText = text || ProfileService.appendSocialLinksToShareText(LocalShareService.buildTopRatedShareText(library, username, selectedTopRatedGames));
    let imageBlob = null;
    let filename = 'gamepilot-top-rated.png';
    try {
      imageBlob = await generateTopRatedShareCardBlob();
      const packageResult = LocalShareService.buildTopRatedShareCardPackage(library, username, selectedTopRatedGames);
      filename = packageResult.filename;
    } catch (error) {
      imageBlob = null;
    }
    const result = await LocalShareService.shareToMessenger({ imageBlob, text: shareText, filename });
    if (result.success) {
      if (result.imageStaged) {
        success('Messenger opened — your top-rated card and caption are copied, just paste them in.');
      } else {
        success('Messenger opened — caption copied, save the top-rated card to attach it.');
      }
    } else {
      toastError(result.message || 'Could not share to Messenger.');
    }
  }, [library, username, selectedTopRatedGames, generateTopRatedShareCardBlob, success, toastError]);

  const handleCopyTopRatedShareText = useCallback(async (text = null) => {
    const shareText = text || ProfileService.appendSocialLinksToShareText(LocalShareService.buildTopRatedShareText(library, username, selectedTopRatedGames));
    const copied = await LocalShareService.copyTextToClipboard(shareText);
    if (copied) {
      success('Top-rated picks text copied to clipboard.');
    } else {
      toastError('Could not copy top-rated picks text.');
    }
    return copied;
  }, [library, username, selectedTopRatedGames, success, toastError]);

  const handleCopyTopRatedShareCard = useCallback(async () => {
    const blob = await generateTopRatedShareCardBlob();
    if (!blob) {
      toastError('Could not generate top-rated card.');
      return false;
    }
    const { filename } = LocalShareService.buildTopRatedShareCardPackage(library, username, selectedTopRatedGames);
    const result = await LocalShareService.copyImageToClipboard(blob, filename);
    if (result.success) {
      success('Top-rated card copied to clipboard.');
      return true;
    }
    toastError(result.message || 'Could not copy image.');
    return false;
  }, [generateTopRatedShareCardBlob, library, username, selectedTopRatedGames, success, toastError]);

  const handleDownloadTopRatedShareCard = useCallback(async () => {
    const blob = await generateTopRatedShareCardBlob();
    if (!blob) {
      toastError('Could not generate top-rated card.');
      return false;
    }
    const { filename } = LocalShareService.buildTopRatedShareCardPackage(library, username, selectedTopRatedGames);
    DataExportService.downloadFile(blob, filename);
    success('Top-rated card saved.');
    return true;
  }, [generateTopRatedShareCardBlob, library, username, selectedTopRatedGames, success, toastError]);

  const handleNativeShareTopRatedCard = useCallback(async (text = null) => {
    const blob = await generateTopRatedShareCardBlob();
    const { text: baseText, filename, title } = LocalShareService.buildTopRatedShareCardPackage(library, username, selectedTopRatedGames);
    if (!blob) {
      toastError('Could not generate top-rated card.');
      return;
    }
    const file = new File([blob], filename, { type: 'image/png' });
    const result = await LocalShareService.shareWithNativeShare({ text: text || ProfileService.appendSocialLinksToShareText(baseText), files: [file], title });
    if (!result.success) {
      toastError(result.message || 'Native share failed.');
    }
  }, [generateTopRatedShareCardBlob, library, username, selectedTopRatedGames, toastError]);

  const handleToggleFavorite = useCallback((key) => {
    setFavorites((prev) => {
      const exists = prev.includes(key);
      const next = exists ? prev.filter((k) => k !== key) : [...prev, key];
      StorageService.set(FAVORITES_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const openGameModal = useCallback((game) => {
    setSelectedGame(game);
    setIsModalOpen(true);
  }, []);

  const closeGameModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedGame(null);
  }, []);

  const handleScanLibrary = useCallback(async () => {
    if (loading) {
      return;
    }

    try {
      await scanLibraryHandler();
    } catch (scanError) {
      console.error('Library scan failed from Library page:', scanError);
    }
  }, [loading, scanLibraryHandler]);

  const handleEmulatorDraftChange = useCallback((field, value) => {
    setEmulatorDraft((previousDraft) => ({
      ...previousDraft,
      [field]: value
    }));
  }, []);

  const chooseEmulatorExecutable = useCallback(async () => {
    if (!window.electronAPI?.chooseEmulatorExecutable) {
      return;
    }

    const selectedPath = await window.electronAPI.chooseEmulatorExecutable();
    if (selectedPath) {
      handleEmulatorDraftChange('emulatorPath', selectedPath);
    }
  }, [handleEmulatorDraftChange]);

  const chooseRomFolder = useCallback(async () => {
    if (!window.electronAPI?.chooseRomFolder) {
      return;
    }

    const selectedPath = await window.electronAPI.chooseRomFolder();
    if (selectedPath) {
      handleEmulatorDraftChange('romFolder', selectedPath);
    }
  }, [handleEmulatorDraftChange]);

  const addEmulatorProfile = useCallback(() => {
    if (!emulatorDraft.name.trim() || !emulatorDraft.romFolder.trim()) {
      return;
    }

    const savedProfile = EmulatorLibraryService.addProfile(emulatorDraft);
    setEmulatorProfiles(EmulatorLibraryService.getProfiles());
    setEmulatorDraft({
      name: '',
      consolePlatform: savedProfile.consolePlatform || '',
      emulatorPath: savedProfile.emulatorPath || '',
      romFolder: '',
      extensions: EmulatorLibraryService.getDefaultExtensions().join(', '),
      launchTemplate: savedProfile.launchTemplate || '"{emulator}" "{rom}"'
    });
  }, [emulatorDraft]);

  const removeEmulatorProfile = useCallback((profileId) => {
    EmulatorLibraryService.removeProfile(profileId);
    setEmulatorProfiles(EmulatorLibraryService.getProfiles());
  }, []);

  const scanEmulatorProfiles = useCallback(async () => {
    if (emulatorProfiles.length === 0 || scanningEmulators) {
      return;
    }

    setScanningEmulators(true);
    try {
      const scannedGames = await EmulatorLibraryService.scanAllProfiles();
      const mergedLibrary = mergeLibraryUpdates(library, scannedGames);
      scannedGames.forEach((game) => GameCurationService.recordGameSeen(game.name));
      onLibraryUpdated(GameCurationService.enrichLibrary(mergedLibrary));
    } catch (error) {
      console.error('Failed to scan emulator profiles:', error);
    } finally {
      setScanningEmulators(false);
    }
  }, [emulatorProfiles.length, library, onLibraryUpdated, scanningEmulators]);

  useEffect(() => {
    setLocalSortBy(sortBy);
  }, [sortBy]);

  useEffect(() => {
    return () => {
      if (luckyAnimationTimeoutRef.current) {
        clearTimeout(luckyAnimationTimeoutRef.current);
      }
      if (luckyPreviewIntervalRef.current) {
        clearInterval(luckyPreviewIntervalRef.current);
      }
    };
  }, []);

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
    setDisplayCount(50);
    setSelectedGameIndex(0);
    debouncedSearch(value);
  };

  const handleSortChange = (value) => {
    setLocalSortBy(value);
    setSortBy(value);
    setDisplayCount(50);
    setSelectedGameIndex(0);
  };

  const clearAllFilters = () => {
    setLocalSearchQuery('');
    setSearchQuery('');
    setLocalFilterPlatform('');
    setFilterPlatform('');
    setLocalFilterMood('');
    setFilterMood('');
    setLocalFilterGenre('');
    setFilterGenre('');
    setLocalFilterMaxTime('');
    setFilterMaxTime('');
    setLocalFilterReplayIntent('');
    setShowHidden(false);
    setDisplayCount(50);
    setSelectedGameIndex(0);
  };

  const handlePlatformFilterChange = (value) => {
    setLocalFilterPlatform(value);
    setFilterPlatform(value);
    setDisplayCount(50);
    setSelectedGameIndex(0);
  };

  const handleMoodFilterChange = (value) => {
    setLocalFilterMood(value);
    setFilterMood(value);
    setDisplayCount(50);
    setSelectedGameIndex(0);
  };

  const handleGenreFilterChange = (value) => {
    setLocalFilterGenre(value);
    setFilterGenre(value);
    setDisplayCount(50);
    setSelectedGameIndex(0);
  };

  const handlePlaytimeFilterChange = (value) => {
    setLocalFilterMaxTime(value);
    setFilterMaxTime(value);
    setSelectedGameIndex(0);
  };

  const handleReplayIntentFilterChange = (value) => {
    setLocalFilterReplayIntent(value);
    setDisplayCount(50);
    setSelectedGameIndex(0);
  };

  const handleCompletionFilterChange = (value) => {
    setLocalFilterCompletion(value);
    setDisplayCount(50);
    setSelectedGameIndex(0);
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
      const matchesReplayIntent = !localFilterReplayIntent || (game.replayIntent || 'none') === localFilterReplayIntent;
      const matchesHidden = showHidden ? true : !(game.isHidden || false);

      return matchesSearch && matchesMood && matchesGenre && matchesPlatform &&
             matchesMaxTime && matchesReplayIntent && matchesHidden;
    });

    const hltbCache = HowLongToBeatService.getCacheSnapshot();
    const getHltbHours = (game) => {
      const entry = hltbCache[hltbGameKey(game)];
      if (!entry || !entry.found) return 0;
      return entry.mainExtraHours || entry.mainHours || entry.completionistHours || 0;
    };

    filtered.sort((a, b) => {
      switch (localSortBy) {
        case 'most-played': return (b.time_played || 0) - (a.time_played || 0);
        case 'least-played': return (a.time_played || 0) - (b.time_played || 0);
        case 'genre': return (a.genres?.[0] || '').localeCompare(b.genres?.[0] || '');
        case 'recent': return getLastPlayedSortValue(b.last_played) - getLastPlayedSortValue(a.last_played);
        case 'recently-added': return (b.dateAdded || 0) - (a.dateAdded || 0);
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
        case 'storage-size':
          const aStorage = a.storageSize || a.installedSize || 0;
          const bStorage = b.storageSize || b.installedSize || 0;
          return bStorage - aStorage;
        case 'favorites':
          const aFav = favorites.includes(getFavoriteGameKey(a));
          const bFav = favorites.includes(getFavoriteGameKey(b));
          if (aFav && !bFav) return -1;
          if (!aFav && bFav) return 1;
          return a.name.localeCompare(b.name);
        case 'hltb-longest':
          const aHltbL = getHltbHours(a);
          const bHltbL = getHltbHours(b);
          if (aHltbL === 0 && bHltbL === 0) return a.name.localeCompare(b.name);
          if (aHltbL === 0) return 1;
          if (bHltbL === 0) return -1;
          return bHltbL - aHltbL;
        case 'hltb-shortest':
          const aHltbS = getHltbHours(a);
          const bHltbS = getHltbHours(b);
          if (aHltbS === 0 && bHltbS === 0) return a.name.localeCompare(b.name);
          if (aHltbS === 0) return 1;
          if (bHltbS === 0) return -1;
          return aHltbS - bHltbS;
        default: return a.name.localeCompare(b.name);
      }
    });

    return filtered;
  }, [library, localSearchQuery, localFilterMood, localFilterGenre, localFilterPlatform, localFilterMaxTime, localFilterReplayIntent, showHidden, localSortBy, favorites]);

  const displayedGames = useMemo(() => {
    return filteredAndSortedGames.slice(0, displayCount);
  }, [displayCount, filteredAndSortedGames]);

  // Steam News warmup — pulls recent posts so PatchNewsBadge can render the
  // "updated since you last played" pill on cards without an extra round-trip
  // when the user opens GameModal. Steam-only games; non-Steam are skipped
  // inside the service.
  useEffect(() => {
    if (!Array.isArray(displayedGames) || displayedGames.length === 0) return undefined;
    if (!SteamNewsService.isEnabled()) return undefined;
    let cancelled = false;
    const handle = setTimeout(() => {
      if (cancelled) return;
      SteamNewsService.warmup(displayedGames, { concurrency: 2, delayMs: 400 });
    }, 900);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [displayedGames]);

  useEffect(() => {
    if (!Array.isArray(displayedGames) || displayedGames.length === 0) return undefined;
    if (!HowLongToBeatService.isEnabled()) return undefined;
    let cancelled = false;
    const handle = setTimeout(() => {
      if (cancelled) return;
      HowLongToBeatService.warmup(displayedGames, { concurrency: 1, delayMs: 500 });
    }, 1000);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [displayedGames]);

  // Disk Usage warmup — quietly measures install folder sizes in the background
  // so DiskSizeChip renders cached data on Library cards without blocking.
  useEffect(() => {
    if (!Array.isArray(displayedGames) || displayedGames.length === 0) return undefined;
    if (!DiskUsageService.isEnabled()) return undefined;
    let cancelled = false;
    const handle = setTimeout(() => {
      if (cancelled) return;
      DiskUsageService.warmup(displayedGames);
    }, 1200);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [displayedGames]);

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

  const handleLoadMore = useCallback(() => {
    setDisplayCount((prev) => prev + itemsPerPage);
  }, [itemsPerPage]);

  const goToPreviousPage = useCallback(() => {
    const currentRouteIndex = CONTROLLER_NAV_ROUTES.indexOf('/library');
    const previousRoute = CONTROLLER_NAV_ROUTES[(currentRouteIndex - 1 + CONTROLLER_NAV_ROUTES.length) % CONTROLLER_NAV_ROUTES.length];
    navigate(previousRoute);
  }, [navigate]);

  const goToNextPage = useCallback(() => {
    const currentRouteIndex = CONTROLLER_NAV_ROUTES.indexOf('/library');
    const nextRoute = CONTROLLER_NAV_ROUTES[(currentRouteIndex + 1) % CONTROLLER_NAV_ROUTES.length];
    navigate(nextRoute);
  }, [navigate]);

  const toggleBulkMode = () => {
    setBulkMode(!bulkMode);
    if (bulkMode) setSelectedGames(new Set());
  };

  const bulkMarkCompleted = () => {
    if (selectedGames.size === 0) return;
    const completedGames = StorageService.get('completedGames', []);
    selectedGames.forEach(gameId => {
      const game = displayedGames.find(g => (g.appid || g.name) === gameId);
      if (game && !completedGames.some(cg => cg.name === game.name)) {
        completedGames.push({ name: game.name, completedAt: new Date().toISOString(), playTime: game.time_played || 0 });
      }
    });
    StorageService.set('completedGames', completedGames);
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

  // Librarian: Pick For Me - Smart recommendation from filtered games
  const handlePickForMe = () => {
    if (filteredAndSortedGames.length === 0) return;

    setIsLuckyAnimating(false);
    setLuckyPreviewName('');
    if (luckyAnimationTimeoutRef.current) {
      clearTimeout(luckyAnimationTimeoutRef.current);
    }
    if (luckyPreviewIntervalRef.current) {
      clearInterval(luckyPreviewIntervalRef.current);
    }
    
    const scoredGames = filteredAndSortedGames.map(game => {
      let score = Math.random() * 20;
      
      // Prefer games with some playtime but not too much
      const playtime = game.time_played || 0;
      if (playtime > 0 && playtime < 180) score += 15;
      else if (playtime === 0) score += 10;
      
      // Favorites bonus
      if (favorites.includes(getFavoriteGameKey(game))) score += 12;
      
      return { game, score };
    });
    
    scoredGames.sort((a, b) => b.score - a.score);
    const pick = scoredGames[0];
    
    setLibrarianPick({
      game: pick.game,
      method: 'smart'
    });
  };

  // Librarian: Feeling Lucky - Random with personality
  const handleFeelingLucky = () => {
    if (filteredAndSortedGames.length === 0) return;

    if (luckyAnimationTimeoutRef.current) {
      clearTimeout(luckyAnimationTimeoutRef.current);
    }
    if (luckyPreviewIntervalRef.current) {
      clearInterval(luckyPreviewIntervalRef.current);
    }

    setLibrarianPick(null);
    setIsLuckyAnimating(true);
    
    const randomIndex = Math.floor(Math.random() * filteredAndSortedGames.length);
    const game = filteredAndSortedGames[randomIndex];

    const previewPool = filteredAndSortedGames
      .filter((candidate) => candidate?.name)
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(6, filteredAndSortedGames.length));

    let previewIndex = 0;
    setLuckyPreviewName(previewPool[0]?.name || game.name);

    luckyPreviewIntervalRef.current = setInterval(() => {
      previewIndex = (previewIndex + 1) % Math.max(previewPool.length, 1);
      setLuckyPreviewName(previewPool[previewIndex]?.name || game.name);
    }, 140);

    luckyAnimationTimeoutRef.current = setTimeout(() => {
      if (luckyPreviewIntervalRef.current) {
        clearInterval(luckyPreviewIntervalRef.current);
        luckyPreviewIntervalRef.current = null;
      }

      setIsLuckyAnimating(false);
      setLuckyPreviewName('');
      setLibrarianPick({
        game,
        method: 'random'
      });
    }, 1200);
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
  const libraryCardStyle = rewardPresentationCustomization?.selectedCardStyle || 'standard';

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
    const baseClass = viewMode === 'grid' ? 'game-card' : 'game-list-item';
    return `${baseClass} fade-in ${selectedGameIndex === index ? 'controller-selected' : ''}`;
  }, [selectedGameIndex, viewMode]);

  // Scroll selected game into view when navigating with controller
  useEffect(() => {
    if (selectedGameIndex < 0 || !libraryContainerRef.current) {
      return;
    }

    const container = libraryContainerRef.current;
    const selectedElement = container.children[selectedGameIndex];

    if (selectedElement) {
      const containerRect = container.getBoundingClientRect();
      const elementRect = selectedElement.getBoundingClientRect();

      const isAboveViewport = elementRect.top < containerRect.top;
      const isBelowViewport = elementRect.bottom > containerRect.bottom;

      if (isAboveViewport || isBelowViewport) {
        selectedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }
    }
  }, [selectedGameIndex]);

  const playedGameCount = library.filter((game) => (game.time_played || 0) > 0).length;
  const totalPlaytimeMinutes = library.reduce((sum, game) => sum + (Number(game?.time_played) || 0), 0);
  const selectedModalGame = selectedGame
    ? library.find((game) => getFavoriteGameKey(game) === getFavoriteGameKey(selectedGame) || game.name === selectedGame.name) || selectedGame
    : null;
  const recentlyAddedCount = useMemo(() => (
    library.filter((game) => GameCurationService.isRecentlyAdded(game?.name, RECENTLY_ADDED_WINDOW_DAYS)).length
  ), [library]);
  const recentlyAddedShelfGames = useMemo(() => (
    filteredAndSortedGames
      .filter((game) => GameCurationService.isRecentlyAdded(game?.name, RECENTLY_ADDED_WINDOW_DAYS))
      .slice(0, 6)
  ), [filteredAndSortedGames]);
  const topRatedShelfGames = useMemo(() => (
    filteredAndSortedGames
      .filter((game) => typeof game.userRating === 'number' && game.userRating > 0)
      .sort((left, right) => {
        const ratingDifference = right.userRating - left.userRating;
        if (ratingDifference !== 0) return ratingDifference;
        return (right.time_played || 0) - (left.time_played || 0);
      })
      .slice(0, 6)
  ), [filteredAndSortedGames]);
  const pinnedGames = useMemo(() => (
    library.filter((game) => pinnedIds.has(String(getFavoriteGameKey(game))))
  ), [library, pinnedIds]);
  const favoriteGames = useMemo(() => (
    library.filter((game) => favorites.includes(getFavoriteGameKey(game)))
  ), [library, favorites]);
  const activeFilterCount = [localFilterPlatform, localFilterMood, localFilterGenre, localFilterMaxTime, localFilterReplayIntent, localFilterCompletion].filter(Boolean).length + (localSearchQuery ? 1 : 0) + (showHidden ? 1 : 0);

  return (
    <div className={`App ${theme} library-page library-presentation-${libraryPresentationId} library-card-style-${libraryCardStyle}`} style={libraryRootStyle}>
      <NavBar />
      
      <div className="library-header">
        <div className="library-header-copy">
          <h1 className="library-title">{currentTheme ? getThemeSpecificLibraryTitle(currentTheme.id) : "📚 Library"}</h1>
          <p className="library-header-summary">
            {library.length > 0
              ? `${filteredAndSortedGames.length} visible game${filteredAndSortedGames.length === 1 ? '' : 's'} from ${library.length} total in your current library view.`
              : 'Your library summary, filters, and quick actions will appear here once games have been scanned in.'}
          </p>
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
            <span className="stat-number">{playedGameCount}</span>
            <span className="stat-label">Games Played</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{Math.floor(totalPlaytimeMinutes / 60)}</span>
            <span className="stat-label">Hours Logged</span>
          </div>
        </div>
      </div>

      {/* Librarian Pick Display */}
      {(isLuckyAnimating || librarianPick) && (
        <div className={`librarian-pick-banner ${isLuckyAnimating ? 'random shuffling' : librarianPick.method === 'smart' ? 'smart' : 'random'}`}>
          <div className="librarian-pick-icon">
            {isLuckyAnimating ? '🎰' : librarianPick.method === 'smart' ? '✨' : '🎲'}
          </div>
          <div className="librarian-pick-copy">
            <h3>
              {isLuckyAnimating
                ? 'Shuffling your library...'
                : librarianPick.method === 'smart'
                  ? 'Your Librarian Recommends:'
                  : 'Feeling Lucky?'}
            </h3>
            <p>
              {isLuckyAnimating
                ? 'Pulling a wild card from your current filters.'
                : librarianPick.method === 'smart'
                  ? 'A quick filtered pick based on your current library patterns.'
                  : 'Random selection from your library with a little extra drama.'}
            </p>
          </div>
          <div className="librarian-pick-actions">
            <div className={`librarian-pick-game-chip${isLuckyAnimating ? ' is-animating' : ''}`}>
              <span>{isLuckyAnimating ? luckyPreviewName || 'Rolling the dice...' : librarianPick.game.name}</span>
              {!isLuckyAnimating && (
                <button 
                  onClick={() => onLaunchGame(librarianPick.game)}
                  className="librarian-pick-play"
                >
                  ▶ Play
                </button>
              )}
            </div>
            {!isLuckyAnimating && librarianPick.method === 'random' && (
              <div className="librarian-pick-badges">
                <span>Random Draw</span>
                <span>{getDisplayPlatform(librarianPick.game)}</span>
              </div>
            )}
            {!isLuckyAnimating && (
              <button 
                onClick={() => setLibrarianPick(null)}
                className="librarian-pick-dismiss"
                title="Dismiss"
              >
                ×
              </button>
            )}
          </div>
        </div>
      )}

      {/* Free Games Section */}
      {showFreeGames ? (
        <div className="free-games-section">
          <div className="free-games-header">
            <div>
              <h3>🆓 Weekly Free Games</h3>
              <p>Optional radar from Epic Games Store — auto-refreshes hourly.</p>
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
                  {game.isMysteryGame && (
                    <p className="free-game-mystery-note">Epic has not revealed this free game yet.</p>
                  )}
                  <div className="free-game-meta">
                    {game.isMysteryGame && <span>Upcoming reveal</span>}
                    <button onClick={() => window.open(game.url, '_blank')}>{game.isMysteryGame ? 'View Radar' : 'Claim'}</button>
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

      <div className="export-section">
        <div className="library-action-group">
          <select
            className="export-button library-share-period-select"
            value={sharePeriod}
            onChange={(event) => setSharePeriod(event.target.value)}
            title="Choose the recap period"
          >
            <option value="all">All-Time Recap</option>
            <option value="weekly">Weekly Recap</option>
            <option value="monthly">Monthly Recap</option>
          </select>
          <button
            onClick={() => setIsRecapCustomizeOpen(true)}
            className="export-button"
            title="Customize your shareable recap card theme and stats"
          >
            <Sparkles size={16} /> Customize Recap
          </button>
          <button
            type="button"
            className="export-button"
            title="Toggle between hours and days for playtime display"
            onClick={() => {
              const current = InterfacePreferencesService.get('playtimeUnit') || 'auto';
              const order = ['hours', 'days', 'auto'];
              const next = order[(order.indexOf(current) + 1) % order.length];
              InterfacePreferencesService.set('playtimeUnit', next);
            }}
          >
            <Clock size={16} /> {(() => {
              const unit = interfacePrefs.playtimeUnit || 'auto';
              if (unit === 'hours') return 'Hours';
              if (unit === 'days') return 'Days';
              return 'Auto';
            })()}
          </button>
          <ShareMenu
            imageAvailable={library.length > 0}
            onCopyText={handleCopyLibraryShareText}
            onCopyImage={handleCopyLibraryShareCard}
            onSaveImage={handleDownloadLibraryShareCard}
            onShareText={handleShareToChannel}
            onShareToDiscord={handleShareToDiscord}
            onShareToMessenger={handleShareToMessenger}
            onDownloadText={handleDownloadShareText}
            onNativeShare={handleNativeShareLibraryCard}
            buildCaption={() => ProfileService.appendSocialLinksToShareText(LocalShareService.buildLibraryShareText(library, username, sharePeriod))}
          />
          <ShareMenu
            imageAvailable={library.length > 0}
            onCopyText={handleCopyTopRatedShareText}
            onCopyImage={handleCopyTopRatedShareCard}
            onSaveImage={handleDownloadTopRatedShareCard}
            onShareText={handleShareTopRatedToChannel}
            onShareToDiscord={handleShareTopRatedToDiscord}
            onShareToMessenger={handleShareTopRatedToMessenger}
            onDownloadText={handleCopyTopRatedShareText}
            onNativeShare={handleNativeShareTopRatedCard}
            buildCaption={() => ProfileService.appendSocialLinksToShareText(LocalShareService.buildTopRatedShareText(library, username, selectedTopRatedGames))}
            triggerLabel="Share 10/10 Picks"
          />
          {allTopRatedGames.length > 6 && (
            <button
              onClick={() => setShowTopRatedPicker(true)}
              className="export-button"
              title={`Choose which ${allTopRatedGames.length} perfect 10/10 games to display (max 6)`}
            >
              Edit Picks ({selectedTopRatedGames.length > 0 ? selectedTopRatedGames.length : '6 auto'})
            </button>
          )}
          <button onClick={handleScanLibrary} className="export-button" disabled={loading}>
            {loading ? '⏳ Scanning Library...' : '🔄 Scan Library'}
          </button>
        </div>
        <div className="library-action-group library-action-group-accent">
          <button 
            onClick={handlePickForMe} 
            className="export-button export-button-recommend"
            disabled={filteredAndSortedGames.length === 0}
            title="Smart recommendation from your filtered games"
          >
            <Sparkles size={16} /> Pick For Me
          </button>
          <button 
            onClick={handleFeelingLucky} 
            className="export-button export-button-lucky"
            disabled={filteredAndSortedGames.length === 0 || isLuckyAnimating}
            title="Random game from your library"
          >
            <Dices size={16} /> {isLuckyAnimating ? 'Drawing...' : 'Feeling Lucky'}
          </button>
          <button
            onClick={toggleBulkMode}
            className={`bulk-mode-btn ${bulkMode ? 'active' : ''}`}
          >
            {bulkMode ? 'Exit Bulk Mode' : 'Bulk Mode'}
          </button>
          {bulkMode && (
            <div className="library-bulk-status" role="status" aria-live="polite">
              <span>Bulk Mode</span>
              <strong>{selectedGames.size} selected</strong>
            </div>
          )}
          {bulkMode && selectedGames.size > 0 && (
            <button
              onClick={bulkMarkCompleted}
              className="export-button"
            >
              Mark {selectedGames.size} Completed
            </button>
          )}
          {bulkMode && selectedGames.size > 0 && (
            <button
              onClick={bulkRemoveGames}
              className="export-button"
            >
              <Trash2 size={16} /> Remove {selectedGames.size}
            </button>
          )}
          {!bulkMode && (
            <button
              onClick={() => setShowAnalytics(true)}
              className="export-button"
              title="Open Library Analytics"
            >
              <BarChart3 size={16} /> Analytics
            </button>
          )}
        </div>
      </div>

      {/* Library Analytics Modal */}
      {showAnalytics && (
        <div className="library-analytics-overlay" onClick={() => setShowAnalytics(false)}>
          <div className="library-analytics-modal" onClick={(e) => e.stopPropagation()}>
            <div className="library-analytics-modal-header">
              <h2><BarChart3 size={20} /> Library Analytics</h2>
              <button className="analytics-close-btn" onClick={() => setShowAnalytics(false)}>
                <X size={18} />
              </button>
            </div>
            <LibraryAnalyticsPanel library={library} />
          </div>
        </div>
      )}

      <div className="emulator-library-panel">
        <div className="emulator-library-header">
          <div>
            <h3>Emulator Library</h3>
            <p>{emulatorProfiles.length} profile{emulatorProfiles.length === 1 ? '' : 's'} configured for ROM scanning.</p>
          </div>
          <div className="emulator-library-actions">
            <button
              type="button"
              className="emulator-secondary-button"
              onClick={() => setShowEmulatorManager((visible) => !visible)}
            >
              {showEmulatorManager ? 'Hide Manager' : 'Manage Emulators'}
            </button>
            <button
              type="button"
              className="emulator-primary-button"
              onClick={scanEmulatorProfiles}
              disabled={emulatorProfiles.length === 0 || scanningEmulators}
            >
              {scanningEmulators ? 'Scanning ROMs...' : 'Scan ROMs'}
            </button>
          </div>
        </div>
        {showEmulatorManager && (
          <div className="emulator-manager-body">
            <div className="emulator-profile-form">
              <input
                type="text"
                value={emulatorDraft.name}
                onChange={(event) => handleEmulatorDraftChange('name', event.target.value)}
                placeholder="Profile name, e.g. Dolphin"
              />
              <input
                type="text"
                value={emulatorDraft.consolePlatform}
                onChange={(event) => handleEmulatorDraftChange('consolePlatform', event.target.value)}
                placeholder="Console, e.g. GameCube"
              />
              <button type="button" onClick={chooseEmulatorExecutable}>Choose Emulator</button>
              <button type="button" onClick={chooseRomFolder}>Choose ROM Folder</button>
              <input
                type="text"
                value={emulatorDraft.extensions}
                onChange={(event) => handleEmulatorDraftChange('extensions', event.target.value)}
                placeholder="Extensions: iso, chd, gba"
              />
              <input
                type="text"
                value={emulatorDraft.launchTemplate}
                onChange={(event) => handleEmulatorDraftChange('launchTemplate', event.target.value)}
                placeholder={'"{emulator}" "{rom}"'}
              />
              <button type="button" className="emulator-add-profile" onClick={addEmulatorProfile}>Add Profile</button>
            </div>
            {(emulatorDraft.emulatorPath || emulatorDraft.romFolder) && (
              <div className="emulator-path-preview">
                {emulatorDraft.emulatorPath && <span>Emulator: {emulatorDraft.emulatorPath}</span>}
                {emulatorDraft.romFolder && <span>ROMs: {emulatorDraft.romFolder}</span>}
              </div>
            )}
            {emulatorProfiles.length > 0 && (
              <div className="emulator-profile-list">
                {emulatorProfiles.map((profile) => (
                  <div key={profile.id} className="emulator-profile-chip">
                    <span>{profile.name} · {profile.consolePlatform}</span>
                    <button type="button" onClick={() => removeEmulatorProfile(profile.id)}>Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {library.length === 0 ? (
        <EmptyLibraryState onScan={handleScanLibrary} theme={theme} />
      ) : (
        <>

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
            <option value="recently-added">Recently Added</option>
            <option value="last-played">Last Played</option>
            <option value="most-played">Most Played</option>
            <option value="least-played">Least Played</option>
            <option value="genre">Genre</option>
            <option value="platform">Platform</option>
            <option value="storage-size">Storage Size</option>
            <option value="rating">Your Rating</option>
            <option value="mood">Mood</option>
            <option value="favorites">Favorites First</option>
            <option value="hltb-longest">HLTB: Longest</option>
            <option value="hltb-shortest">HLTB: Shortest</option>
          </select>
        </div>
        <div className="view-toggle">
          <button onClick={() => setViewMode('grid')} className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}><Grid size={20} /></button>
          <button onClick={() => setViewMode('list')} className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}><List size={20} /></button>
        </div>
        {activeFilterCount > 0 && (
          <button onClick={clearAllFilters} className="library-clear-filters-btn">
            Clear Filters
          </button>
        )}
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
            <option value="Amazon">Amazon Games</option>
            <option value="Itch.io">Itch.io</option>
            <option value="Manual">Manual Entry</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Mood</label>
          <select value={localFilterMood} onChange={(e) => handleMoodFilterChange(e.target.value)} className="filter-select">
            <option value="">All Moods</option>
            {MOODS.map(mood => (
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
        <div className="filter-group">
          <label>Status</label>
          <select value={localFilterReplayIntent} onChange={(e) => handleReplayIntentFilterChange(e.target.value)} className="filter-select">
            <option value="">Any Status</option>
            <option value="active">Currently Playing</option>
            <option value="soon">Playing Soon</option>
            <option value="finished">Finished</option>
            <option value="endless">Endless / Ongoing</option>
            <option value="none">Not Planned</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Completion</label>
          <select value={localFilterCompletion} onChange={(e) => handleCompletionFilterChange(e.target.value)} className="filter-select">
            <option value="">Any</option>
            <option value="not-started">Not Started</option>
            <option value="playing">Playing</option>
            <option value="beaten">Beaten</option>
            <option value="completed">Completed</option>
            <option value="100%">100%</option>
            <option value="abandoned">Abandoned</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Hidden</label>
          <button
            onClick={() => setShowHidden((s) => !s)}
            className={`filter-toggle ${showHidden ? 'active' : ''}`}
            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer' }}
          >
            {showHidden ? 'Showing Hidden' : 'Show Hidden'}
          </button>
        </div>
      </div>

      <div className="library-context-bar">
        <div className="library-context-pill">
          <span>Showing</span>
          <strong>{displayedGames.length} of {filteredAndSortedGames.length}</strong>
        </div>
        <div className="library-context-pill library-context-pill-highlight">
          <span>New in {RECENTLY_ADDED_WINDOW_DAYS} days</span>
          <strong>{recentlyAddedCount}</strong>
        </div>
        <div className="library-context-pill">
          <span>Filters</span>
          <strong>{activeFilterCount > 0 ? `${activeFilterCount} active` : 'None'}</strong>
        </div>
        <div className="library-context-pill">
          <span>Loaded</span>
          <strong>{displayedGames.length} / {filteredAndSortedGames.length}</strong>
        </div>
        <div className="library-context-pill">
          <span>Free Games Radar</span>
          <strong>{showFreeGames ? 'Visible' : 'Hidden'}</strong>
        </div>
      </div>

      {/* Unified Shelf Carousel */}
      {(() => {
        const sections = [
          { id: 'pinned', kicker: 'Quick access', title: 'Pinned Games', games: pinnedGames, getBadge: () => null },
          { id: 'favorites', kicker: 'Your picks', title: 'Favourite Games', games: favoriteGames, getBadge: () => null },
          { id: 'top-rated', kicker: 'Highest rated', title: 'Top Rated Games', games: topRatedShelfGames, getBadge: (g) => `${g.userRating}/10` },
          { id: 'recent', kicker: 'Fresh in your library', title: 'Newly Added Games', games: recentlyAddedShelfGames, getBadge: () => 'New' },
        ];
        const active = sections[carouselIndex];
        if (!active || active.games.length === 0) return null;
        return (
          <section className="library-recent-section" aria-labelledby="library-carousel-title">
            <div className="library-recent-section-header">
              <div>
                <span className="library-recent-section-kicker">{active.kicker}</span>
                <h2 id="library-carousel-title" className="library-recent-section-title">{active.title}</h2>
              </div>
              <div className="library-shelf-carousel-controls">
                <button
                  type="button"
                  onClick={() => setCarouselIndex((i) => (i - 1 + sections.length) % sections.length)}
                  aria-label="Previous section"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setCarouselIndex((i) => (i + 1) % sections.length)}
                  aria-label="Next section"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
            <div className="library-recent-shelf">
              {active.games.map((game) => {
                const favoriteKey = getFavoriteGameKey(game);
                const isFavorite = favorites.includes(favoriteKey);
                const badge = active.getBadge ? active.getBadge(game) : null;
                return (
                  <div
                    key={`${active.id}-${game.appid || game.name}`}
                    className="library-recent-shelf-card"
                    title={game.name}
                  >
                    <button
                      type="button"
                      className="library-recent-shelf-art"
                      onClick={() => onLaunchGame(game)}
                      aria-label={`Launch ${game.name}`}
                    >
                      <LazyImage
                        src={resolveGameArtwork(game, { surface: 'recommendation_card' })}
                        alt={game.name}
                        gameName={game.name}
                        platform={getDisplayPlatform(game)}
                        genre={Array.isArray(game.genres) ? game.genres[0] : undefined}
                        mood={game.mood}
                        placeholder={getGameArtworkPlaceholder({ game, surface: 'recommendation_card' })}
                        className="library-recent-shelf-art-image"
                      />
                      <div className="library-recent-shelf-overlay">
                        <Play size={20} />
                      </div>
                      {badge && (
                        <span className="library-recent-shelf-badge">{badge}</span>
                      )}
                    </button>
                    <div className="library-recent-shelf-name">{game.name}</div>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        handleTogglePin(game);
                      }}
                      aria-label={pinnedIds.has(String(favoriteKey)) ? `Unpin ${game.name}` : `Pin ${game.name}`}
                      className={`library-recent-shelf-pin ${pinnedIds.has(String(favoriteKey)) ? 'is-pinned' : ''}`}
                    >
                      <Pin size={12} />
                    </button>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        handleToggleFavorite(favoriteKey);
                      }}
                      aria-label={isFavorite ? `Remove ${game.name} from favorites` : `Add ${game.name} to favorites`}
                      className={`library-recent-shelf-fav ${isFavorite ? 'is-favorite' : ''}`}
                    >
                      <Heart size={12} fill={isFavorite ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })()}

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
          const isRecentlyAdded = GameCurationService.isRecentlyAdded(game?.name, RECENTLY_ADDED_WINDOW_DAYS);

          return (
          <div 
            key={game.appid || game.name} 
            className={`${getGameCardClass(game, index)}${isRecentlyAdded ? ' is-recently-added' : ''}`}
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
                <div className="library-game-title-row">
                  <h3 className="library-game-title">{game.name}</h3>
                  <div className="library-game-title-actions">
                    {isRecentlyAdded && <span className="library-new-badge">New</span>}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePin(game);
                      }}
                      aria-label={pinnedIds.has(String(favoriteKey)) ? `Unpin ${game.name}` : `Pin ${game.name}`}
                      className={`library-pin-button ${pinnedIds.has(String(favoriteKey)) ? 'is-pinned' : ''}`}
                    >
                      <Pin size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(favoriteKey);
                      }}
                      aria-label={isFavorite ? `Remove ${game.name} from favorites` : `Add ${game.name} to favorites`}
                      className={`library-favorite-button ${isFavorite ? 'is-favorite' : ''}`}
                    >
                      <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                </div>
                <p className="playtime library-game-playtime">
                  <Clock size={12} /> {formatTimePlayed(game.time_played)}
                  <HLTBChip game={game} autoFetch />
                  <PatchNewsBadge game={game} />
                  <DiskSizeChip game={game} />
                </p>
                {gameValue > 0 && (
                  <p className="library-game-value">
                    Value: {formatPrice(gameValue, currency)}
                  </p>
                )}
                <div className="library-game-tags">
                  <span className="library-game-tag platform">
                    {getDisplayPlatform(game)}
                    {Array.isArray(game.launchSources) && game.launchSources.length > 1 && (
                      <span
                        className="library-game-tag-multi-source"
                        title={`Also available on ${game.launchSources
                          .map((source) => source.platform)
                          .filter((platform) => platform && platform !== getDisplayPlatform(game))
                          .join(', ')}`}
                      >
                        +{game.launchSources.length - 1}
                      </span>
                    )}
                  </span>
                  {resolvedMood && (
                    <span className="library-game-tag mood">
                      {resolvedMood}
                    </span>
                  )}
                  {Array.isArray(game.genres) && game.genres[0] && (
                    <span className="library-game-tag genre">
                      {game.genres[0]}
                    </span>
                  )}
                  {game.replayIntent && game.replayIntent !== 'none' && (
                    <span className={`library-game-tag replay-intent replay-intent-${game.replayIntent}`}>
                      {game.replayIntent === 'active' && '▶ Playing'}
                      {game.replayIntent === 'soon' && '⏳ Soon'}
                      {game.replayIntent === 'finished' && '✓ Done'}
                      {game.replayIntent === 'endless' && '∞ Endless'}
                    </span>
                  )}
                </div>
              </div>

              <div className={`library-game-actions ${viewMode === 'list' ? 'list-mode' : 'grid-mode'}`}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onLaunchGame(game);
                  }}
                  className="library-launch-button"
                >
                  Launch
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleHidden(game);
                    success(game.hidden ? 'Game unhidden' : 'Game hidden');
                  }}
                  className="library-action-button"
                  title={game.hidden ? 'Unhide game' : 'Hide game'}
                >
                  {game.hidden ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Remove "${game.name}" from your library?`)) {
                      onRemoveGames([game.appid || game.name]);
                      success(`Removed "${game.name}" from library`);
                    }
                  }}
                  className="library-action-button danger"
                  title="Remove game"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )})}
      </div>

      {/* Load More */}
      {displayCount < filteredAndSortedGames.length && (
        <div className="library-pagination-footer">
          <button
            onClick={handleLoadMore}
            className="library-pagination-button"
          >
            Load More
          </button>
        </div>
      )}

        </>
      )}

      {/* Modals */}
      {isModalOpen && <GameModal game={selectedModalGame} isOpen={isModalOpen} onClose={closeGameModal} onLaunch={onLaunchGame} systemInfo={systemInfo} onUpdateRating={onUpdateRating} onToggleFavorite={handleToggleFavorite} isFavorite={favorites.includes(getFavoriteGameKey(selectedModalGame))} onTogglePin={handleTogglePin} onUpdateCollections={onUpdateCollections} onToggleHidden={onToggleHidden} onUpdateCompletion={onUpdateCompletion} onUpdateNotes={onUpdateNotes} onUpdateCoverArt={onUpdateCoverArt} onAddSessionNote={onAddSessionNote} />}
      <RecapCustomizeModal
        isOpen={isRecapCustomizeOpen}
        onClose={() => setIsRecapCustomizeOpen(false)}
        library={library}
        username={username}
        period={sharePeriod}
        onApplied={() => setRecapCustomization(ProgressionUnlockService.getRecapCustomization())}
      />

      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: -10000,
          left: -10000,
          width: LIBRARY_SHARE_CARD_SIZE_PX,
          height: LIBRARY_SHARE_CARD_SIZE_PX,
          pointerEvents: 'none',
          zIndex: -1
        }}
      >
        <div ref={libraryShareCardRef}>
          <LibraryShareCard
            library={library}
            username={username}
            period={sharePeriod}
            theme={recapCustomization.palette}
            visibleStats={recapCustomization.visibleStats}
            showCover={recapCustomization.useMostPlayedCover !== false}
            watermark={recapCustomization.shareCardWatermark || 'gamepilot'}
          />
        </div>
      </div>

      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: -10000,
          left: -10000,
          width: TOP_RATED_SHARE_CARD_SIZE_PX,
          height: TOP_RATED_SHARE_CARD_SIZE_PX,
          pointerEvents: 'none',
          zIndex: -1
        }}
      >
        <div ref={topRatedShareCardRef}>
          <TopRatedShareCard
            library={library}
            selectedGames={selectedTopRatedGames}
            username={username}
            showCover={recapCustomization.useMostPlayedCover !== false}
            watermark={recapCustomization.shareCardWatermark || 'gamepilot'}
          />
        </div>
      </div>

      {showTopRatedPicker && (
        <div className="library-top-rated-picker-overlay" onClick={() => setShowTopRatedPicker(false)}>
          <div className="library-top-rated-picker" onClick={(e) => e.stopPropagation()}>
            <div className="library-top-rated-picker-header">
              <h3>Choose your 10/10 picks</h3>
              <p>Select up to 6 games to show on the share card. Leave blank to auto-pick by playtime.</p>
            </div>
            <div className="library-top-rated-picker-list">
              {allTopRatedGames.map((game) => {
                const id = game.id || game.appid || game.name;
                const checked = selectedTopRatedGames.some((g) => (g.id || g.appid || g.name) === id);
                const disabled = !checked && selectedTopRatedGames.length >= 6;
                return (
                  <label key={id} className={`library-top-rated-picker-item${disabled ? ' disabled' : ''}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => {
                        setSelectedTopRatedGames((prev) => {
                          const exists = prev.some((g) => (g.id || g.appid || g.name) === id);
                          if (exists) return prev.filter((g) => (g.id || g.appid || g.name) !== id);
                          if (prev.length >= 6) return prev;
                          return [...prev, game];
                        });
                      }}
                    />
                    <span className="library-top-rated-picker-name">{game.name}</span>
                    <span className="library-top-rated-picker-playtime">
                      {formatPlaytime(Number(game?.time_played ?? game?.playtime ?? game?.totalPlaytime ?? 0))}
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="library-top-rated-picker-actions">
              <span className="library-top-rated-picker-count">
                {selectedTopRatedGames.length}/6 selected
              </span>
              <button
                className="library-top-rated-picker-clear"
                onClick={() => setSelectedTopRatedGames([])}
                disabled={selectedTopRatedGames.length === 0}
              >
                Clear
              </button>
              <button
                className="library-top-rated-picker-done"
                onClick={() => setShowTopRatedPicker(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <BackToTopButton />
    </div>
  );
}

export default Library;
