import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { X, Star, Clock, Calendar, Play, ExternalLink, Heart, Pin, Trash2, Globe, Trophy, Sparkles, Upload } from 'lucide-react';
import { LaunchSourceMenu } from './LaunchSourceMenu';
import { formatPrice, parseSteamPrice, storePurchasePrice, getCurrentCurrency } from '../CurrencyConverter';
import { openExternalUrl } from '../services/ElectronBridge';
import { LocalShareService } from '../services/LocalShareService';
import ProfileService from '../services/ProfileService';
import { GameCurationService } from '../services/GameCurationService';
import { GameRatingService } from '../services/GameRatingService';
import { PlaytimeAutoLogger } from '../services/PlaytimeAutoLogger';
import HowLongToBeatService from '../services/HowLongToBeatService';
import { RecommendationEngine } from '../services/RecommendationEngine';
import { UserBehaviorProfile } from '../services/UserBehaviorProfile';
import { getGameArtworkPlaceholder, resolveGameArtwork, fileToCoverDataUri } from '../services/GameArtworkService';
import { MOODS, getMoodForGame } from '../constants/GenresMoods';
import LazyImage from './LazyImage';
import { GameShareCard, buildGameShareCaption, buildGameShareData } from './GameShareCard';
import { SessionLaunchShareCard } from './SessionLaunchShareCard';
import { ShareMenu } from './ShareMenu';
import LibrariansNotes from './LibrariansNotes';
import SaveBackupPanel from './SaveBackupPanel';
import SteamSnapshot from './SteamSnapshot';
import PatchNewsPanel from './PatchNewsPanel';
import UninstallModal from './UninstallModal';
import useInterfacePreferences from '../hooks/useInterfacePreferences';
import { useToast } from './Toast';
import './GameModal.css';

const COVER_SEARCH_LINKS = (gameName) => ([
  { id: 'steamgriddb', label: 'SteamGridDB', url: `https://www.steamgriddb.com/search/grids/${encodeURIComponent(gameName)}` },
  { id: 'steam', label: 'Steam Store', url: `https://store.steampowered.com/search/?term=${encodeURIComponent(gameName)}` },
  { id: 'google', label: 'Google Images', url: `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${gameName} game cover art`)}` }
]);

const REPLAY_INTENT_OPTIONS = ['none', 'soon', 'active', 'finished', 'endless'];

const RATING_PRESETS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const RATING_TAG_SUGGESTIONS = GameRatingService.getDefaultTags();

const getRatingLabel = (value) => {
  if (!value) return 'Not rated yet';
  if (value >= 9) return 'All-time favourite';
  if (value >= 8) return 'Excellent';
  if (value >= 7) return 'Great';
  if (value >= 6) return 'Good';
  if (value >= 5) return 'Mixed';
  if (value >= 3) return 'Not for me';
  return 'Avoid';
};

const GameModal = ({ game, library = [], isOpen, onClose, onLaunch, onSelectGame, onToggleFavorite, isFavorite = false, onTogglePin, onUpdatePrice, onUpdateRating, onUpdateCollections, onToggleHidden, onUpdateCompletion, onUpdateNotes, onUpdateCoverArt, onAddSessionNote, onTogglePlayedElsewhere, bigScreen = false }) => {
  const { success: toastSuccess, error: toastError } = useToast();
  const [gameDetails, setGameDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [screenshots, setScreenshots] = useState([]);
  const [currentScreenshot, setCurrentScreenshot] = useState(0);
  const [showUninstall, setShowUninstall] = useState(false);
  const [rating, setRating] = useState(game?.userRating || 0);
  const [replayIntent, setReplayIntent] = useState(game?.replayIntent || 'none');
  const [wouldReplay, setWouldReplay] = useState(null);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [saveState, setSaveState] = useState('idle');
  const [selectedControlIndex, setSelectedControlIndex] = useState(0);
  const [collections] = useState(() => GameCurationService.getCollections());
  const [selectedCollections, setSelectedCollections] = useState(game?.userCollections || []);
  const [completionStatus, setCompletionStatus] = useState(game?.completionStatus || 'not-started');
  const [coverArtUrl, setCoverArtUrl] = useState(game?.coverArtOverride || '');
  const [moodOverride, setMoodOverride] = useState(game?.moodOverride || '');
  const [playedElsewhere, setPlayedElsewhere] = useState(Boolean(game?.playedElsewhere));
  const [sessionNoteText, setSessionNoteText] = useState('');
  const fetchedGameId = React.useRef(null);
  const modalBodyRef = useRef(null);
  const shareCardRef = useRef(null);
  const sessionLaunchCardRef = useRef(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const interfacePrefs = useInterfacePreferences();

  const gameStats = useMemo(() => {
    if (!game?.name) return {};
    return PlaytimeAutoLogger.getGameStats(game.name);
  }, [game?.name]);

  const similarRecommendations = useMemo(() => (
    RecommendationEngine.getSimilarToGame(Array.isArray(library) ? library : [], game, 6)
  ), [library, game]);

  const isPinned = useMemo(() => {
    const key = String(game?.appid || game?.name || '');
    return (interfacePrefs.pinnedGameIds || []).map(String).includes(key);
  }, [interfacePrefs.pinnedGameIds, game]);

  // HLTB completion check — if the user has played more than the HLTB main
  // story time but hasn't marked the game as beaten/completed, show a prompt.
  const hltbCompletionPrompt = useMemo(() => {
    if (!game) return null;
    const entry = HowLongToBeatService.getCached(game);
    if (!entry || !entry.found || !entry.mainHours || entry.mainHours <= 0) return null;
    const playedHours = (Number(game.time_played) || 0) / 60;
    if (playedHours < entry.mainHours) return null;
    const status = game.completionStatus || 'not-started';
    if (status === 'beaten' || status === 'completed' || status === '100%' || status === 'abandoned') return null;
    return {
      mainHours: entry.mainHours,
      playedHours: Math.round(playedHours * 10) / 10
    };
  }, [game]);

  // Sync state when game prop changes
  useEffect(() => {
    if (game) {
      setRating(game.userRating || 0);
      setReplayIntent(game.replayIntent || 'none');
      const gameId = String(game.appid || game.name || '');
      const ratingData = gameId ? GameRatingService.getRating(gameId) : null;
      setWouldReplay(ratingData?.wouldReplay ?? null);
      setTags(ratingData?.tags || []);
      setSelectedCollections(game.userCollections || []);
      setCompletionStatus(game.completionStatus || 'not-started');
      setCoverArtUrl(game.coverArtOverride || '');
      setPlayedElsewhere(Boolean(game.playedElsewhere));
      setSaveState('idle');
      setSelectedControlIndex(0);
      modalBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [game]);

  const handleRatingChange = useCallback((newRating) => {
    setRating(newRating);
    setSaveState('dirty');
  }, []);

  const handleRatingSave = useCallback((finalRating = rating, finalReplayIntent = replayIntent) => {
    const gameId = String(game?.appid || game?.name || '');
    if (gameId) {
      GameRatingService.setRating(gameId, {
        value: finalRating,
        wouldReplay,
        tags
      });
    }
    if (onUpdateRating) {
      onUpdateRating(game.name, finalRating, finalReplayIntent, { wouldReplay, tags });
    }
    setSaveState('saved');
  }, [game, onUpdateRating, rating, replayIntent, wouldReplay, tags]);

  const handleReplayIntentChange = useCallback((newIntent) => {
    setReplayIntent(newIntent);
    setSaveState('dirty');
  }, []);

  const hasUnsavedRatingChanges = useMemo(() => {
    const gameId = String(game?.appid || game?.name || '');
    const ratingData = gameId ? GameRatingService.getRating(gameId) : null;
    const storedWouldReplay = ratingData?.wouldReplay ?? null;
    const storedTags = ratingData?.tags || [];
    const tagsChanged = tags.length !== storedTags.length
      || tags.some((tag, index) => tag !== storedTags[index]);
    return (
      Number(game?.userRating || 0) !== Number(rating || 0)
      || (game?.replayIntent || 'none') !== replayIntent
      || storedWouldReplay !== wouldReplay
      || tagsChanged
    );
  }, [game, rating, replayIntent, wouldReplay, tags]);

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

  const handleCompletionChange = useCallback((status) => {
    if (!game || !onUpdateCompletion) return;
    setCompletionStatus(status);
    onUpdateCompletion(game.name, status);
  }, [game, onUpdateCompletion]);

  const handleCollectionToggle = useCallback((collectionId) => {
    if (!game || !onUpdateCollections) return;
    const next = selectedCollections.includes(collectionId)
      ? selectedCollections.filter((id) => id !== collectionId)
      : [...selectedCollections, collectionId];
    setSelectedCollections(next);
    onUpdateCollections(game.name, next);
  }, [game, onUpdateCollections, selectedCollections]);

  const handleCoverArtSave = useCallback(() => {
    if (!game || !onUpdateCoverArt) return;
    onUpdateCoverArt(game.name, coverArtUrl);
  }, [game, onUpdateCoverArt, coverArtUrl]);

  const handleCoverArtClear = useCallback(() => {
    if (!game || !onUpdateCoverArt) return;
    setCoverArtUrl('');
    onUpdateCoverArt(game.name, '');
  }, [game, onUpdateCoverArt]);

  const handleMoodOverrideChange = useCallback((e) => {
    const value = e.target.value;
    setMoodOverride(value);
    if (!game) return;
    GameCurationService.setMoodOverride(game.name, value);
  }, [game]);

  const handleCoverFilePicked = useCallback(async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !game || !onUpdateCoverArt) return;
    try {
      const dataUri = await fileToCoverDataUri(file);
      setCoverArtUrl(dataUri);
      onUpdateCoverArt(game.name, dataUri);
    } catch (error) {
      if (toastError) {
        toastError(error?.message || 'Could not use that image.');
      }
    }
  }, [game, onUpdateCoverArt, toastError]);

  const handleAddSessionNoteLocal = useCallback(() => {
    if (!game || !onAddSessionNote || !sessionNoteText.trim()) return;
    onAddSessionNote(game.name, sessionNoteText.trim());
    setSessionNoteText('');
  }, [game, onAddSessionNote, sessionNoteText]);

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

  const generateGameShareCardBlob = useCallback(async () => {
    if (!shareCardRef.current) return null;
    setIsCapturing(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(shareCardRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true
      });
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      setIsCapturing(false);
      return blob;
    } catch (e) {
      setIsCapturing(false);
      console.error('Game share capture failed:', e);
      return null;
    }
  }, []);

  const generateSessionLaunchShareCardBlob = useCallback(async () => {
    if (!sessionLaunchCardRef.current) return null;
    setIsCapturing(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(sessionLaunchCardRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true
      });
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      setIsCapturing(false);
      return blob;
    } catch (e) {
      setIsCapturing(false);
      console.error('Session launch share capture failed:', e);
      return null;
    }
  }, []);

  const handleCopyGameShareCard = useCallback(async () => {
    const blob = await generateGameShareCardBlob();
    if (!blob) {
      toastSuccess('Could not generate game share card.');
      return false;
    }
    const copied = await LocalShareService.copyImageToClipboard(blob);
    toastSuccess(copied ? 'Game card copied to clipboard.' : 'Could not copy game card.');
    return copied;
  }, [generateGameShareCardBlob, toastSuccess]);

  const handleCopySessionLaunchShareCard = useCallback(async () => {
    const blob = await generateSessionLaunchShareCardBlob();
    if (!blob) {
      toastSuccess('Could not generate session launch card.');
      return false;
    }
    const copied = await LocalShareService.copyImageToClipboard(blob);
    toastSuccess(copied ? 'Session launch card copied to clipboard.' : 'Could not copy session launch card.');
    return copied;
  }, [generateSessionLaunchShareCardBlob, toastSuccess]);

  const handleDownloadGameShareCard = useCallback(async () => {
    const blob = await generateGameShareCardBlob();
    if (!blob) {
      toastSuccess('Could not generate game share card.');
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gamepilot-game-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toastSuccess('Game card saved.');
  }, [generateGameShareCardBlob, toastSuccess]);

  const buildGameSessionShareText = useCallback(() => {
    const name = game?.name || 'this game';
    const lines = [
      `About to drop into ${name} for a session 🎮`,
      'Might be streaming it too — come hang out if you see a link.',
      '',
      'Powered by GamePilot'
    ];
    return ProfileService.appendSocialLinksToShareText(lines.join('\n'));
  }, [game]);

  const handleDownloadSessionLaunchShareCard = useCallback(async () => {
    const blob = await generateSessionLaunchShareCardBlob();
    if (!blob) {
      toastSuccess('Could not generate session launch card.');
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gamepilot-going-live-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toastSuccess('Session launch card saved.');
  }, [generateSessionLaunchShareCardBlob, toastSuccess]);

  const handleNativeShareSessionLaunch = useCallback(async (text = null) => {
    const blob = await generateSessionLaunchShareCardBlob();
    if (!blob) {
      toastSuccess('Could not generate session launch card.');
      return;
    }
    const file = new File([blob], `gamepilot-going-live-${Date.now()}.png`, { type: 'image/png' });
    const result = await LocalShareService.shareWithNativeShare({
      title: `Going live with ${game?.name}`,
      text: text || buildGameSessionShareText(),
      files: [file]
    });
    toastSuccess(result.success ? 'Native share opened.' : result.message || 'Could not share.');
  }, [generateSessionLaunchShareCardBlob, buildGameSessionShareText, toastSuccess, game?.name]);

  const buildGameShareText = useCallback(() => {
    const shareData = buildGameShareData(game, gameStats);
    const caption = buildGameShareCaption(shareData);
    const lines = [caption];
    if (shareData.rating > 0) {
      lines.push(`Rated ${shareData.rating}/10`);
    }
    const hours = ((shareData.timePlayed || 0) / 60).toFixed(1);
    lines.push(`${hours}h played · ${shareData.sessions} sessions`);
    if (shareData.longestSession) {
      lines.push(`Longest session: ${(shareData.longestSession / 60).toFixed(1)}h`);
    }
    lines.push('Powered by GamePilot');
    return ProfileService.appendSocialLinksToShareText(lines.join('\n'));
  }, [game, gameStats]);

  const handleShareGameText = useCallback(async (channel, text = null) => {
    const result = await LocalShareService.openShareIntent(channel, text || buildGameShareText());
    toastSuccess(result.success ? `Opened ${result.label}.` : result.message || 'Could not share game.');
  }, [buildGameShareText, toastSuccess]);

  const handleNativeShareGame = useCallback(async (text = null) => {
    const blob = await generateGameShareCardBlob();
    if (!blob) {
      toastSuccess('Could not generate game share card.');
      return;
    }
    const file = new File([blob], `gamepilot-game-${Date.now()}.png`, { type: 'image/png' });
    const result = await LocalShareService.shareWithNativeShare({
      title: `Check out ${game?.name}`,
      text: text || buildGameShareText(),
      files: [file]
    });
    toastSuccess(result.success ? 'Native share opened.' : result.message || 'Could not share.');
  }, [generateGameShareCardBlob, buildGameShareText, toastSuccess, game?.name]);

  const favoriteKey = game?.appid || game?.app_id || game?.steamAppId || game?.name;

  const modalControls = useMemo(() => [
    'launch',
    'close',
    'completion',
    'rating',
    'replay',
    'saveRating',
    ...(game?.appid ? ['store'] : []),
    ...(typeof onTogglePin === 'function' ? ['pin'] : []),
    ...(typeof onToggleFavorite === 'function' ? ['favorite'] : []),
    'share'
  ], [game?.appid, onTogglePin, onToggleFavorite]);

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
          return;
        }

        if (action === 'right') {
          const nextRating = Math.min(10, Number((rating + 0.5).toFixed(1)));
          handleRatingChange(nextRating);
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
          handleCompletionChange(completionStatus === 'completed' ? 'not-started' : 'completed');
          break;
        case 'saveRating':
          handleRatingSave();
          break;
        case 'store':
          handleOpenStore();
          break;
        case 'favorite':
          onToggleFavorite?.(favoriteKey);
          break;
        case 'share': {
          const text = buildGameShareText();
          LocalShareService.copyTextToClipboard(text);
          toastSuccess('Share text copied to clipboard!');
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener('controllerInput', handleModalControllerInput);
    return () => window.removeEventListener('controllerInput', handleModalControllerInput);
  }, [favoriteKey, game, handleLaunchGame, handleOpenStore, handleRatingChange, handleRatingSave, handleReplayIntentChange, isOpen, modalControls, onClose, onToggleFavorite, rating, replayIntent, selectedControlIndex, handleCompletionChange, completionStatus, toastSuccess, buildGameShareText]);

  if (!isOpen || !game) {
    return <div style={{ display: 'none' }} aria-hidden="true" />;
  }

  const iconSource = game.icon || game.iconUrl || getGameArtworkPlaceholder({ game, surface: 'profile_icon' });
  const platformLabel = game.brandPlatform || game.platform || 'Unknown Platform';
  const genreLabels = gameDetails?.genres?.map((entry) => entry.description).filter(Boolean)
    || (Array.isArray(game.genres) ? game.genres.filter(Boolean) : []);
  const fallbackOverview = `${game.name} is tracked in your ${platformLabel} library${game.mood ? ` and tagged for ${String(game.mood).toLowerCase()} sessions` : ''}.`;
  const playtimeHours = ((game.time_played || 0) / 60).toFixed(1);
  const ratingPercent = Math.max(0, Math.min(100, ((rating || 0) / 10) * 100));
  const formatDateValue = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
  };

  return (
    <>
    <div className={`game-modal-overlay ${bigScreen ? 'gm-big-screen' : ''}`} onClick={onClose}>
      <div className="game-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="game-modal-header">
          <div className="game-modal-title">
            <img 
              src={iconSource} 
              alt={game.name} 
              className="game-modal-icon"
              onError={(e) => {
                e.target.src = getGameArtworkPlaceholder({ game, surface: 'profile_icon' });
              }}
            />
            <div className="game-modal-title-copy">
              <h2>{game.name}</h2>
              <p className="game-modal-subtitle">
                {platformLabel} • {playtimeHours}h played{game.mood ? ` • ${game.mood}` : ''}
              </p>
            </div>
          </div>
          <button className="game-modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="game-modal-body" ref={modalBodyRef}>
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
                            e.target.src = getGameArtworkPlaceholder({ game, surface: 'hero' });
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
                                e.target.src = getGameArtworkPlaceholder({ game, surface: 'library_card' });
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
                          e.target.src = getGameArtworkPlaceholder({ game, surface: 'profile_icon' });
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
                  <div className="game-quick-summary">
                    <div className="game-quick-summary-item">
                      <span className="game-quick-summary-label">Platform</span>
                      <strong>{platformLabel}</strong>
                    </div>
                    <div className="game-quick-summary-item">
                      <span className="game-quick-summary-label">Playtime</span>
                      <strong>{playtimeHours} hours</strong>
                    </div>
                    {game.last_played && (
                      <div className="game-quick-summary-item">
                        <span className="game-quick-summary-label">Last Played</span>
                        <strong>{formatDateValue(game.last_played)}</strong>
                      </div>
                    )}
                    {typeof game.launch_count === 'number' && (
                      <div className="game-quick-summary-item">
                        <span className="game-quick-summary-label">Launches</span>
                        <strong>{game.launch_count}</strong>
                      </div>
                    )}
                  </div>
                  <div className="meta-chip-row">
                    <span className="meta-chip">{platformLabel}</span>
                    {game.mood && <span className="meta-chip">Mood: {game.mood}</span>}
                    {genreLabels.slice(0, 4).map((genre) => (
                      <span key={genre} className="meta-chip">{genre}</span>
                    ))}
                  </div>
                </div>

                {gameDetails?.developers && (
                  <div className="game-info-panel">
                    <h3>Developers</h3>
                    <p className="game-description">{gameDetails.developers.join(', ')}</p>
                  </div>
                )}

                <SteamSnapshot game={game} />

                <PatchNewsPanel game={game} />

                <LibrariansNotes game={game} />
              </div>

              <div className="game-modal-secondary">
                <div className="game-info-panel">
                  <h3>Game Details</h3>
                  <div className="info-grid">
                    <div className="info-item rating-control">
                      <div className="rating-control-header">
                        <div className="rating-control-label-group">
                          <Star size={16} />
                          <span className="info-label">Your Rating</span>
                        </div>
                        <div className={`rating-save-status ${hasUnsavedRatingChanges ? 'dirty' : saveState === 'saved' ? 'saved' : ''}`}>
                          {hasUnsavedRatingChanges ? 'Unsaved changes' : saveState === 'saved' ? 'Saved' : 'Saved to library'}
                        </div>
                      </div>
                      <div className="rating-editor" style={{ outline: modalControls[selectedControlIndex] === 'rating' ? '2px solid var(--accent, #ff6b35)' : 'none' }}>
                        <div className="rating-editor-header">
                          <div>
                            <strong className="rating-value">{rating ? rating.toFixed(1) : '—'}/10</strong>
                            <span className="rating-label">{getRatingLabel(rating)}</span>
                          </div>
                          <button
                            type="button"
                            className="rating-clear-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRatingChange(0);
                            }}
                            disabled={!rating}
                          >
                            Clear
                          </button>
                        </div>
                        <div className="rating-slider-row">
                          <input
                            type="range"
                            min="0"
                            max="10"
                            step="0.5"
                            value={rating || 0}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleRatingChange(Number(e.target.value));
                            }}
                            className="rating-slider"
                            aria-label="Rating out of 10"
                            style={{
                              background: `linear-gradient(90deg, rgba(251, 191, 36, 0.95) 0%, rgba(249, 115, 22, 0.95) ${ratingPercent}%, rgba(255, 255, 255, 0.12) ${ratingPercent}%, rgba(255, 255, 255, 0.08) 100%)`
                            }}
                          />
                          <div className="rating-slider-ticks">
                            {RATING_PRESETS.map((score) => (
                              <span
                                key={score}
                                className={`rating-tick ${(rating || 0) >= score ? 'active' : ''}`}
                              >
                                {score}
                              </span>
                            ))}
                          </div>
                        </div>
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
                        <option value="finished">On hold / Shelved</option>
                        <option value="endless">Endless/Ongoing</option>
                      </select>
                    </div>

                    <div className="info-item would-replay-control">
                      <span className="info-label">Would Replay?</span>
                      <div className="would-replay-options">
                        <button
                          type="button"
                          className={`would-replay-option ${wouldReplay === true ? 'selected' : ''}`}
                          onClick={() => {
                            setWouldReplay(true);
                            setSaveState('dirty');
                          }}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          className={`would-replay-option ${wouldReplay === false ? 'selected' : ''}`}
                          onClick={() => {
                            setWouldReplay(false);
                            setSaveState('dirty');
                          }}
                        >
                          No
                        </button>
                        <button
                          type="button"
                          className={`would-replay-option ${wouldReplay === null ? 'selected' : ''}`}
                          onClick={() => {
                            setWouldReplay(null);
                            setSaveState('dirty');
                          }}
                        >
                          Not sure
                        </button>
                      </div>
                    </div>

                    <div className="info-item rating-tags-control">
                      <span className="info-label">Tags</span>
                      <div className="rating-tags">
                        {tags.map((tag) => (
                          <span key={tag} className="rating-tag">
                            {tag}
                            <button
                              type="button"
                              className="rating-tag-remove"
                              onClick={() => {
                                setTags(tags.filter((t) => t !== tag));
                                setSaveState('dirty');
                              }}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="tag-input-row">
                        <input
                          type="text"
                          list="rating-tag-suggestions"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          placeholder="Add a tag..."
                          className="tag-input"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && tagInput.trim()) {
                              e.preventDefault();
                              const next = tagInput.trim();
                              if (!tags.includes(next)) {
                                setTags([...tags, next]);
                                setSaveState('dirty');
                              }
                              setTagInput('');
                            }
                          }}
                        />
                        <datalist id="rating-tag-suggestions">
                          {RATING_TAG_SUGGESTIONS.map((tag) => (
                            <option key={tag} value={tag} />
                          ))}
                        </datalist>
                        <button
                          type="button"
                          className="tag-add-button"
                          disabled={!tagInput.trim() || tags.includes(tagInput.trim())}
                          onClick={() => {
                            const next = tagInput.trim();
                            if (next) {
                              setTags([...tags, next]);
                              setSaveState('dirty');
                              setTagInput('');
                            }
                          }}
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    <div className="info-item">
                      <Clock size={16} />
                      <span className="info-label">Playtime</span>
                      <span>{playtimeHours} hours played</span>
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

                <SaveBackupPanel game={game} />

                {collections.some((c) => !c.locked) && (
                  <div className="game-info-panel">
                    <h3>Collections</h3>
                    <div className="collection-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {collections.filter((c) => !c.locked).map((c) => (
                        <button
                          key={c.id}
                          onClick={() => handleCollectionToggle(c.id)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            border: '1px solid ' + (selectedCollections.includes(c.id) ? c.color : 'var(--border)'),
                            background: selectedCollections.includes(c.id) ? c.color + '33' : 'transparent',
                            color: 'var(--text)',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          {selectedCollections.includes(c.id) ? '✓ ' : ''}{c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="game-info-panel">
                  <h3>Completion Status</h3>
                  {hltbCompletionPrompt && (
                    <div className="game-modal-hltb-prompt">
                      <Trophy size={16} />
                      <div>
                        <strong>You've played {hltbCompletionPrompt.playedHours}h — that's past the HLTB main story ({hltbCompletionPrompt.mainHours}h).</strong>
                        <p>Did you beat this game?</p>
                        <div className="game-modal-hltb-prompt-actions">
                          <button
                            type="button"
                            className="game-modal-hltb-prompt-btn beaten"
                            onClick={() => handleCompletionChange('beaten')}
                          >
                            ⚡ Yes, beaten
                          </button>
                          <button
                            type="button"
                            className="game-modal-hltb-prompt-btn completed"
                            onClick={() => handleCompletionChange('completed')}
                          >
                            ✓ Completed
                          </button>
                          <button
                            type="button"
                            className="game-modal-hltb-prompt-btn dismiss"
                            onClick={() => handleCompletionChange('playing')}
                          >
                            Still playing
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  <select
                    value={completionStatus}
                    onChange={(e) => handleCompletionChange(e.target.value)}
                    className="filter-select"
                    style={{ width: '100%' }}
                  >
                    {GameCurationService.COMPLETION_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s === 'not-started' && '○ Not Started'}
                        {s === 'playing' && '▶ Playing'}
                        {s === 'beaten' && '⚡ Beaten'}
                        {s === 'completed' && '✓ Completed'}
                        {s === '100%' && '★ 100%'}
                        {s === 'abandoned' && '✕ Abandoned'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="game-info-panel">
                  <h3>Cover Art Override</h3>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      placeholder="Paste image URL..."
                      value={coverArtUrl}
                      onChange={(e) => setCoverArtUrl(e.target.value)}
                      style={{ flex: 1, minWidth: '180px', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                    />
                    <button onClick={handleCoverArtSave} className="export-button" style={{ padding: '6px 12px' }}>Save</button>
                    {coverArtUrl && (
                      <button onClick={handleCoverArtClear} className="export-button" style={{ padding: '6px 12px', opacity: 0.7 }}>Clear</button>
                    )}
                    <label
                      className="export-button"
                      title="Pick a local image file — stored offline in your GamePilot data"
                      style={{ padding: '6px 12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Upload size={14} /> Upload
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleCoverFilePicked}
                      />
                    </label>
                  </div>
                  {coverArtUrl && (
                    <div style={{ marginTop: '8px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <img
                        src={coverArtUrl}
                        alt="Cover preview"
                        style={{ width: '48px', height: '72px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border)' }}
                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'inline'; }}
                      />
                      <span style={{ display: 'none', fontSize: '12px', color: '#ff8a6b' }}>
                        This URL can't be loaded as an image. Right-click the image in your browser and choose "Copy image address".
                      </span>
                    </div>
                  )}
                  <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {COVER_SEARCH_LINKS(game.name).map((target) => (
                      <a
                        key={target.id}
                        href={target.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="export-button"
                        style={{ padding: '4px 10px', fontSize: '12px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <ExternalLink size={11} /> {target.label}
                      </a>
                    ))}
                  </div>
                </div>

                <div className="game-info-panel">
                  <h3>Mood</h3>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <select
                      value={moodOverride}
                      onChange={handleMoodOverrideChange}
                      className="filter-select"
                      style={{ width: 'auto', minWidth: '160px', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                    >
                      <option value="">Auto ({getMoodForGame(game?.genres) || 'Unknown'})</option>
                      {MOODS.map((mood) => (
                        <option key={mood} value={mood}>{mood}</option>
                      ))}
                    </select>
                    {moodOverride && (
                      <button
                        onClick={() => handleMoodOverrideChange({ target: { value: '' } })}
                        className="export-button"
                        style={{ padding: '6px 12px', opacity: 0.7 }}
                      >
                        Reset to Auto
                      </button>
                    )}
                  </div>
                  <p style={{ fontSize: '0.7rem', opacity: 0.5, margin: '6px 0 0' }}>
                    Override the auto-detected mood if it doesn't feel right. Used for mood filters and recommendations.
                  </p>
                </div>

                <div className="game-info-panel">
                  <h3>Session Notes</h3>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="text"
                      placeholder="Quick note about this session..."
                      value={sessionNoteText}
                      onChange={(e) => setSessionNoteText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddSessionNoteLocal(); }}
                      style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                    />
                    <button onClick={handleAddSessionNoteLocal} className="export-button" style={{ padding: '6px 12px' }}>Add</button>
                  </div>
                  {game?.sessionNotes && game.sessionNotes.length > 0 && (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: '120px', overflowY: 'auto' }}>
                      {game.sessionNotes.map((note) => (
                        <li key={note.timestamp} style={{ padding: '4px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {new Date(note.timestamp).toLocaleDateString()} — {note.text}
                        </li>
                      ))}
                    </ul>
                  )}
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

              </div>
            </div>
          )}

        {similarRecommendations?.entries?.length > 0 && (
          <section className="game-modal-similar-section" aria-labelledby="game-modal-similar-title">
            <div className="game-modal-similar-header">
              <div>
                <h3 id="game-modal-similar-title"><Sparkles size={18} /> More Like This</h3>
                <p>Games from your library that match {game.name}'s genres, themes, tags, and mood.</p>
              </div>
            </div>
            <div className="game-modal-similar-grid">
              {similarRecommendations.entries.map((entry, index) => {
                const recommendedGame = entry.game;
                const reason = similarRecommendations.meta?.allReasons?.[index]?.[0]
                  || entry.reason
                  || similarRecommendations.message;
                return (
                  <article className="game-modal-similar-card" key={recommendedGame.appid || recommendedGame.name}>
                    <button
                      type="button"
                      className="game-modal-similar-main"
                      onClick={() => onSelectGame?.(recommendedGame)}
                      disabled={typeof onSelectGame !== 'function'}
                      aria-label={`View ${recommendedGame.name}`}
                    >
                      <LazyImage
                        src={resolveGameArtwork(recommendedGame, { surface: 'portrait' })}
                        fallbackSrc={resolveGameArtwork(recommendedGame, { surface: 'hero' })}
                        placeholder={getGameArtworkPlaceholder({ game: recommendedGame, surface: 'portrait' })}
                        alt={recommendedGame.name}
                        className="game-modal-similar-artwork"
                      />
                      <span className="game-modal-similar-copy">
                        <strong>{recommendedGame.name}</strong>
                        <small>{reason}</small>
                      </span>
                    </button>
                    {typeof onLaunch === 'function' && (
                      <button
                        type="button"
                        className="game-modal-similar-launch"
                        onClick={() => {
                          UserBehaviorProfile.trackRecommendationLaunch('similar-to-game', recommendedGame.appid || recommendedGame.name, {
                            mood: recommendedGame.mood || null,
                            genre: RecommendationEngine.getPrimaryGenre(recommendedGame) || null,
                            source: 'game-modal',
                            referenceGame: game.name
                          });
                          onLaunch(recommendedGame);
                        }}
                        aria-label={`Launch ${recommendedGame.name}`}
                      >
                        <Play size={15} /> Play
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        )}
        </div>

        <div className="game-modal-footer">
          <button
            className={`save-rating-button ${hasUnsavedRatingChanges ? 'dirty' : 'saved'}`}
            onClick={() => handleRatingSave()}
            disabled={!hasUnsavedRatingChanges}
            style={{ outline: modalControls[selectedControlIndex] === 'saveRating' ? '2px solid var(--accent, #ff6b35)' : 'none' }}
          >
            <Star size={16} />
            {hasUnsavedRatingChanges ? 'Save Rating' : 'Rating Saved'}
          </button>
          {(typeof onLaunch === 'function' || game.appid) && (
            <LaunchSourceMenu
              game={game}
              onLaunch={(launchTarget) => {
                if (typeof onLaunch === 'function') {
                  onLaunch(launchTarget);
                }
              }}
              isFocused={modalControls[selectedControlIndex] === 'launch'}
              primaryLabel="Launch Game"
            />
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
          
          {typeof onTogglePin === 'function' && (
            <button
              className={`wishlist-button ${isPinned ? 'wishlisted' : ''}`}
              onClick={() => onTogglePin(game)}
              style={{ outline: modalControls[selectedControlIndex] === 'pin' ? '2px solid var(--accent, #ff6b35)' : 'none' }}
            >
              <Pin size={16} />
              {isPinned ? 'Unpin Game' : 'Pin Game'}
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

          {typeof onTogglePlayedElsewhere === 'function' && (
            <button
              className={`wishlist-button ${playedElsewhere ? 'wishlisted' : ''}`}
              onClick={() => {
                onTogglePlayedElsewhere(game.name);
                setPlayedElsewhere((prev) => !prev);
              }}
              title="Mark this game as played on another launcher/platform so it stops counting as unplayed"
              style={{ outline: modalControls[selectedControlIndex] === 'playedElsewhere' ? '2px solid var(--accent, #ff6b35)' : 'none' }}
            >
              <Globe size={16} />
              {playedElsewhere ? 'Played Elsewhere ✓' : 'Mark Played Elsewhere'}
            </button>
          )}

          <ShareMenu
            onCopyText={async (text = null) => {
              const copied = await LocalShareService.copyTextToClipboard(text || buildGameShareText());
              toastSuccess(copied ? 'Game text copied to clipboard.' : 'Could not copy game text.');
              return copied;
            }}
            onCopyImage={handleCopyGameShareCard}
            onSaveImage={handleDownloadGameShareCard}
            onShareText={handleShareGameText}
            buildCaption={buildGameShareText}
            onNativeShare={handleNativeShareGame}
            triggerLabel="Share Game"
            imageAvailable={true}
            disabled={isCapturing}
          />

          <ShareMenu
            onCopyText={async (text = null) => {
              const copied = await LocalShareService.copyTextToClipboard(text || buildGameSessionShareText());
              toastSuccess(copied ? 'Session text copied to clipboard.' : 'Could not copy session text.');
              return copied;
            }}
            onCopyImage={handleCopySessionLaunchShareCard}
            onSaveImage={handleDownloadSessionLaunchShareCard}
            onShareText={handleShareGameText}
            buildCaption={buildGameSessionShareText}
            onNativeShare={handleNativeShareSessionLaunch}
            triggerLabel="Going Live"
            imageAvailable={true}
            disabled={isCapturing}
          />

          <button
            className="uninstall-modal-button"
            onClick={() => setShowUninstall(true)}
            title="Open safe uninstall hand-off"
          >
            <Trash2 size={16} />
            Uninstall…
          </button>
        </div>
      </div>
    </div>

      <UninstallModal
        isOpen={showUninstall}
        game={game}
        onClose={() => setShowUninstall(false)}
        onCompleted={() => setShowUninstall(false)}
      />

      <div style={{ position: 'fixed', left: 0, top: 0, opacity: 0, pointerEvents: 'none', zIndex: -1 }}>
        <div ref={shareCardRef}>
          <GameShareCard
            game={game}
            gameStats={gameStats}
          />
        </div>
        <div ref={sessionLaunchCardRef}>
          <SessionLaunchShareCard game={game} />
        </div>
      </div>
    </>
  );
};

export default GameModal;
