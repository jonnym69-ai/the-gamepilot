import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Play,
  Gamepad,
  Library as LibraryIcon,
  Sparkles,
  User,
  ChevronRight,
  ChevronLeft,
  Monitor,
  Trophy,
  Clock,
  Square
} from 'lucide-react';
import { RecommendationEngine } from '../services/RecommendationEngine';
import { GamingIdentity } from '../GamingIdentity';
import { GamingPersonaService } from '../services/GamingPersonaService';
import { resolveGameArtwork, getGameArtworkPlaceholder } from '../services/GameArtworkService';
import LazyImage from './LazyImage';
import { useTheme } from '../ThemeContext';
import BigScreenGameCard from './BigScreenGameCard';
import GameModal from './GameModal';
import '../BigScreenMode.css';

const BLADES = [
  { id: 'continue-playing', label: 'Continue', icon: Play },
  { id: 'library', label: 'Library', icon: LibraryIcon },
  { id: 'backlog', label: 'Backlog Buster', icon: Gamepad },
  { id: 'for-you', label: 'For You', icon: Sparkles },
  { id: 'profile', label: 'Profile', icon: User },
];

export default function BigScreenMode({
  library, onLaunchGame, activeSessions, onEndSession, lastPlayedGame,
  onUpdateRating, onToggleFavorite, onUpdateCollections, onToggleHidden,
  onUpdateCompletion, onUpdateNotes, onUpdateCoverArt, onAddSessionNote, onTogglePlayedElsewhere
}) {
  const { toggleBigScreenMode, currentTheme } = useTheme();
  const [activeBlade, setActiveBlade] = useState(0);
  const [focusedGameIndex, setFocusedGameIndex] = useState(0);
  const [detailGame, setDetailGame] = useState(null);
  const [sessionClock, setSessionClock] = useState('0:00');
  const bladeRef = useRef(null);
  const scrollRef = useRef(null);
  const gridRef = useRef(null);

  const safeLibrary = useMemo(() => (Array.isArray(library) ? library : []), [library]);

  // activeSessions is an object keyed by game name: { gameName: { startTime, ... } }
  const activeSessionList = useMemo(() => {
    if (!activeSessions || typeof activeSessions !== 'object') return [];
    return Object.entries(activeSessions).map(([gameName, session]) => {
      const game = safeLibrary.find((g) => g?.name === gameName) || { name: gameName };
      return { game, session, gameName };
    }).filter((entry) => entry.game);
  }, [activeSessions, safeLibrary]);

  const activeSessionNames = useMemo(
    () => activeSessionList.map((s) => s.gameName),
    [activeSessionList]
  );

  const backlogResult = useMemo(() => {
    if (safeLibrary.length === 0) return null;
    try {
      return RecommendationEngine.getBacklogBusterResult(safeLibrary, null, null, 12);
    } catch { return null; }
  }, [safeLibrary]);

  const personaSnapshot = useMemo(() => {
    try { return GamingPersonaService.getPublicIdentity(); } catch { return null; }
  }, []);

  const profile = useMemo(() => {
    try { return GamingIdentity.getProfile(); } catch { return null; }
  }, []);

  const signatureGames = useMemo(() => {
    try { return GamingIdentity.getSignatureGames(4); } catch { return []; }
  }, []);

  // Continue Playing: the last played game (or active session game)
  const continuePlayingGame = useMemo(() => {
    if (activeSessionList.length > 0) {
      return activeSessionList[0].game;
    }
    if (lastPlayedGame) return lastPlayedGame;
    // Fallback: find most recently played in library
    const played = safeLibrary
      .filter((g) => g && (g.last_played || g.time_played > 0))
      .sort((a, b) => {
        const aTime = new Date(a.last_played || 0).getTime();
        const bTime = new Date(b.last_played || 0).getTime();
        return bTime - aTime;
      });
    return played[0] || null;
  }, [activeSessionList, lastPlayedGame, safeLibrary]);

  // For You: games related to the continue-playing game by genre/mood
  const forYouResult = useMemo(() => {
    if (!continuePlayingGame || safeLibrary.length === 0) return null;
    try {
      const primaryGenre = RecommendationEngine.getPrimaryGenre(continuePlayingGame);
      const mood = continuePlayingGame.mood || null;
      const scored = safeLibrary
        .filter((g) => g && g.name !== continuePlayingGame.name)
        .map((game) => {
          let score = RecommendationEngine.scoreGameByBehavior(game, mood, primaryGenre, null);
          const reasons = [];
          const genres = Array.isArray(game.genres) ? game.genres : [];
          if (primaryGenre && genres.includes(primaryGenre)) {
            score += 40;
            reasons.push(`Same genre as ${continuePlayingGame.name}: ${primaryGenre}`);
          }
          if (mood && game.mood === mood) {
            score += 25;
            reasons.push(`Similar mood: ${mood}`);
          }
          return { game, score, reasons };
        })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score)
        .slice(0, 12);
      return scored.length > 0 ? scored : null;
    } catch { return null; }
  }, [continuePlayingGame, safeLibrary]);

  const currentGames = useMemo(() => {
    const blade = BLADES[activeBlade];
    if (!blade) return [];
    switch (blade.id) {
      case 'continue-playing':
        return continuePlayingGame ? [continuePlayingGame] : [];
      case 'library':
        return safeLibrary.slice(0, 24);
      case 'backlog':
        return backlogResult?.entries?.map((e) => e.game).filter(Boolean) || [];
      case 'for-you':
        return forYouResult?.map((e) => e.game).filter(Boolean) || [];
      case 'profile':
        return signatureGames;
      default:
        return [];
    }
  }, [activeBlade, safeLibrary, backlogResult, forYouResult, continuePlayingGame, signatureGames]);

  // Live session timer
  useEffect(() => {
    if (activeSessionList.length === 0) {
      setSessionClock('0:00');
      return;
    }
    const tick = () => {
      const entry = activeSessionList[0];
      if (!entry?.session?.startTime) return;
      const elapsed = Date.now() - new Date(entry.session.startTime).getTime();
      const totalSec = Math.floor(elapsed / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      setSessionClock(h > 0
        ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
        : `${m}:${String(s).padStart(2, '0')}`
      );
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeSessionList]);

  useEffect(() => {
    setFocusedGameIndex(0);
  }, [activeBlade]);

  // Calculate actual columns in the grid for correct up/down navigation
  const getGridColumns = useCallback(() => {
    if (!gridRef.current) return 4;
    const grid = gridRef.current;
    const gridWidth = grid.clientWidth;
    const firstCard = grid.querySelector('.bs-game-card');
    if (!firstCard) return 4;
    const cardWidth = firstCard.getBoundingClientRect().width;
    const gap = 20;
    if (cardWidth <= 0) return 4;
    return Math.max(1, Math.round((gridWidth + gap) / (cardWidth + gap)));
  }, []);

  const moveFocus = useCallback((direction) => {
    const gameCount = currentGames.length;
    const cols = getGridColumns();
    if (direction === 'right') {
      if (gameCount > 0 && focusedGameIndex < gameCount - 1) {
        setFocusedGameIndex((prev) => prev + 1);
      } else {
        setActiveBlade((prev) => (prev + 1) % BLADES.length);
      }
    } else if (direction === 'left') {
      if (focusedGameIndex > 0) {
        setFocusedGameIndex((prev) => prev - 1);
      } else {
        setActiveBlade((prev) => (prev - 1 + BLADES.length) % BLADES.length);
      }
    } else if (direction === 'down') {
      if (gameCount === 0) return;
      if (focusedGameIndex + cols < gameCount) {
        setFocusedGameIndex((prev) => prev + cols);
      } else if (focusedGameIndex < gameCount - 1) {
        // Move to last item in grid if can't go full row down
        setFocusedGameIndex(gameCount - 1);
      }
    } else if (direction === 'up') {
      if (focusedGameIndex - cols >= 0) {
        setFocusedGameIndex((prev) => prev - cols);
      } else {
        setFocusedGameIndex(0);
      }
    }
  }, [focusedGameIndex, currentGames, getGridColumns]);

  const activate = useCallback(() => {
    const game = currentGames[focusedGameIndex];
    if (game) {
      setDetailGame(game);
    }
  }, [focusedGameIndex, currentGames]);

  const handleKeyDown = useCallback((e) => {
    if (detailGame) return; // detail view handles its own keys
    if (e.key === 'ArrowRight') { e.preventDefault(); moveFocus('right'); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); moveFocus('left'); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); moveFocus('down'); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveFocus('up'); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
    else if (e.key === 'Escape') { e.preventDefault(); toggleBigScreenMode(); }
  }, [moveFocus, activate, toggleBigScreenMode, detailGame]);

  // Controller input — capture phase intercepts before ControllerSupport
  const handleControllerInput = useCallback((e) => {
    if (detailGame) return; // detail view handles its own input
    const action = e?.detail?.action;
    if (!action) return;

    const handled = ['up', 'down', 'left', 'right', 'confirm', 'cancel', 'page_next', 'page_previous'];
    if (!handled.includes(action)) return;

    e.preventDefault();
    e.stopPropagation();

    if (action === 'up') moveFocus('up');
    else if (action === 'down') moveFocus('down');
    else if (action === 'left') moveFocus('left');
    else if (action === 'right') moveFocus('right');
    else if (action === 'confirm') activate();
    else if (action === 'cancel') toggleBigScreenMode();
    else if (action === 'page_next') setActiveBlade((prev) => (prev + 1) % BLADES.length);
    else if (action === 'page_previous') setActiveBlade((prev) => (prev - 1 + BLADES.length) % BLADES.length);
  }, [moveFocus, activate, toggleBigScreenMode, detailGame]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    window.addEventListener('controllerInput', handleControllerInput, true);
    return () => window.removeEventListener('controllerInput', handleControllerInput, true);
  }, [handleControllerInput]);

  // Auto-scroll to keep focused card visible
  useEffect(() => {
    if (!scrollRef.current) return;
    const scrollEl = scrollRef.current;
    const grid = gridRef.current;
    if (!grid) return;
    const cards = grid.querySelectorAll('.bs-game-card');
    const card = cards[focusedGameIndex];
    if (!card) return;
    const cardTop = card.offsetTop;
    const cardBottom = cardTop + card.offsetHeight;
    const scrollTop = scrollEl.scrollTop;
    const viewportHeight = scrollEl.clientHeight;
    if (cardTop < scrollTop) {
      scrollEl.scrollTo({ top: cardTop - 20, behavior: 'smooth' });
    } else if (cardBottom > scrollTop + viewportHeight) {
      scrollEl.scrollTo({ top: cardBottom - viewportHeight + 20, behavior: 'smooth' });
    }
  }, [focusedGameIndex, activeBlade]);

  const handleLaunchFromDetail = useCallback((game) => {
    onLaunchGame?.(game);
  }, [onLaunchGame]);

  const handleCloseDetail = useCallback(() => {
    setDetailGame(null);
  }, []);

  const handleSelectGame = useCallback((index) => {
    setFocusedGameIndex(index);
    setDetailGame(currentGames[index]);
  }, [currentGames]);

  const blade = BLADES[activeBlade];
  const focusedGame = currentGames[focusedGameIndex];

  const renderBladeContent = () => {
    const bladeId = blade.id;

    if (bladeId === 'continue-playing') {
      if (!continuePlayingGame) {
        return (
          <div className="bs-empty-blade">
            <Play size={80} />
            <h2>No games played yet</h2>
            <p>Launch a game from your library to get started.</p>
          </div>
        );
      }
      const game = continuePlayingGame;
      const minutes = Math.max(
        0,
        Number(game.time_played || 0),
        Number(game.playtime?.total || 0),
        Number(game.playtimeMinutes || 0)
      );
      const isActive = activeSessionNames.includes(game.name);
      const roast = GamingPersonaService.getBladeRoast('continue-playing', game);
      const personaLabel = personaSnapshot?.label || profile?.identity?.gamingPersona?.primaryPersona?.label;
      const genres = Array.isArray(game.genres) ? game.genres.filter((g) => g && g !== 'Unknown') : [];
      const artwork = resolveGameArtwork(game, { surface: 'bigscreen' });
      const placeholder = getGameArtworkPlaceholder({ game, surface: 'bigscreen' });
      return (
        <div className="bs-continue-playing">
          <div className="bs-continue-hero">
            <div className="bs-continue-artwork">
              <LazyImage src={artwork} alt={game.name} placeholder={placeholder} />
            </div>
            <div className="bs-continue-info">
              <span className="bs-continue-label">Continue Playing</span>
              <h1 className="bs-continue-title">{game.name}</h1>
              <div className="bs-continue-meta">
                <div className="bs-continue-meta-item">
                  <Clock size={22} />
                  <span>{minutes > 0 ? `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}m` : 'Not played yet'} played</span>
                </div>
                {game.launch_count > 0 && (
                  <div className="bs-continue-meta-item">
                    <Play size={18} />
                    <span>{game.launch_count} launches</span>
                  </div>
                )}
                {genres.length > 0 && (
                  <div className="bs-continue-genres">
                    {genres.slice(0, 4).map((g) => (
                      <span key={g} className="bs-continue-genre-tag">{g}</span>
                    ))}
                  </div>
                )}
              </div>
              {roast && (
                <div className="bs-continue-roast">
                  {personaLabel && <span className="bs-continue-persona">{personaLabel}</span>}
                  <p>"{roast}"</p>
                </div>
              )}
              {isActive ? (
                <div className="bs-continue-active">
                  <div className="bs-continue-session-timer">
                    <div className="bs-session-pulse" />
                    <span className="bs-continue-session-label">Live Session</span>
                    <span className="bs-continue-session-clock">{sessionClock}</span>
                  </div>
                  <button
                    className="bs-detail-btn bs-detail-btn-end"
                    onClick={() => onEndSession?.(game.name)}
                  >
                    <Square size={22} fill="currentColor" />
                    <span>End Session</span>
                  </button>
                </div>
              ) : (
                <button
                  className="bs-detail-btn bs-detail-btn-play bs-continue-resume-btn"
                  onClick={() => onLaunchGame?.(game)}
                >
                  <Play size={26} fill="currentColor" />
                  <span>Resume</span>
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (bladeId === 'backlog') {
      const stats = backlogResult?.backlogStats;
      if (!stats || stats.totalUnplayed === 0) {
        return (
          <div className="bs-empty-blade">
            <Gamepad size={80} />
            <h2>Backlog cleared!</h2>
            <p>Every game in your library has been played. Legendary.</p>
          </div>
        );
      }
      return (
        <>
          <div className="bs-backlog-stats">
            <div className="bs-backlog-stat">
              <strong>{stats.totalUnplayed}</strong>
              <span>Unplayed</span>
            </div>
            <div className="bs-backlog-stat">
              <strong>{stats.totalLibrary}</strong>
              <span>Total Games</span>
            </div>
            <div className="bs-backlog-stat">
              <strong>{stats.backlogPercentage}%</strong>
              <span>Backlog</span>
            </div>
          </div>
          {backlogResult?.message && (
            <p className="bs-blade-message">{backlogResult.message}</p>
          )}
          <div className="bs-games-grid" ref={gridRef}>
            {currentGames.map((game, i) => (
              <BigScreenGameCard
                key={`${game.appid || game.name}-${i}`}
                game={game}
                index={i}
                isFocused={i === focusedGameIndex}
                onSelect={handleSelectGame}
              />
            ))}
          </div>
          {(() => {
            const entry = backlogResult?.entries?.[focusedGameIndex];
            const reasons = entry?.meta?.backlogReasons || [];
            if (reasons.length > 0 && focusedGame) {
              return (
                <div className="bs-game-reason-overlay">
                  <Sparkles size={16} />
                  <span>{reasons[0]}</span>
                </div>
              );
            }
            return null;
          })()}
        </>
      );
    }

    if (bladeId === 'profile') {
      const persona = personaSnapshot?.persona || profile?.identity?.gamingPersona?.primaryPersona;
      const roast = personaSnapshot?.roast || profile?.identity?.gamingPersona?.roast;
      const title = profile?.identity?.title || persona?.title || 'Gamer';
      const level = profile?.level || 0;
      return (
        <div className="bs-profile-blade">
          <div className="bs-profile-header">
            <div className="bs-profile-avatar">
              <User size={64} />
            </div>
            <div className="bs-profile-info">
              <h2 className="bs-profile-title">{title}</h2>
              {persona?.name && <p className="bs-profile-persona">{persona.name}</p>}
              {level > 0 && (
                <div className="bs-profile-level">
                  <Trophy size={20} />
                  <span>Level {level}</span>
                </div>
              )}
              {roast && <p className="bs-profile-roast">"{roast}"</p>}
            </div>
          </div>
          {signatureGames.length > 0 && (
            <>
              <h3 className="bs-profile-section-title">Signature Games</h3>
              <div className="bs-games-grid bs-signature-grid" ref={gridRef}>
                {currentGames.map((game, i) => (
                  <BigScreenGameCard
                    key={`${game.appid || game.name}-${i}`}
                    game={game}
                    index={i}
                    isFocused={i === focusedGameIndex}
                    onSelect={handleSelectGame}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      );
    }

    if (bladeId === 'for-you') {
      if (!forYouResult || forYouResult.length === 0) {
        return (
          <div className="bs-empty-blade">
            <Sparkles size={80} />
            <h2>No recommendations yet</h2>
            <p>Play a game to get personalized recommendations here.</p>
          </div>
        );
      }
      const continueName = continuePlayingGame?.name;
      const forYouRoast = GamingPersonaService.getBladeRoast('for-you', continuePlayingGame);
      return (
        <>
          {continueName && (
            <p className="bs-blade-message">
              Because you played <strong>{continueName}</strong>
            </p>
          )}
          {forYouRoast && (
            <div className="bs-blade-roast">
              {personaSnapshot?.label && <span className="bs-continue-persona">{personaSnapshot.label}</span>}
              <p>"{forYouRoast}"</p>
            </div>
          )}
          <div className="bs-games-grid" ref={gridRef}>
            {currentGames.map((game, i) => (
              <BigScreenGameCard
                key={`${game.appid || game.name}-${i}`}
                game={game}
                index={i}
                isFocused={i === focusedGameIndex}
                onSelect={handleSelectGame}
              />
            ))}
          </div>
          {(() => {
            const entry = forYouResult[focusedGameIndex];
            const reasons = entry?.reasons || [];
            if (reasons.length > 0 && focusedGame) {
              return (
                <div className="bs-game-reason-overlay">
                  <Sparkles size={16} />
                  <span>{reasons[0]}</span>
                </div>
              );
            }
            return null;
          })()}
        </>
      );
    }

    if (currentGames.length === 0) {
      return (
        <div className="bs-empty-blade">
          <blade.icon size={80} />
          <h2>Nothing here yet</h2>
          <p>Scan your library to populate this blade.</p>
        </div>
      );
    }

    return (
      <div className="bs-games-grid" ref={gridRef}>
        {currentGames.map((game, i) => (
          <BigScreenGameCard
            key={`${game.appid || game.name}-${i}`}
            game={game}
            index={i}
            isFocused={i === focusedGameIndex}
            onSelect={handleSelectGame}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="bs-overlay" ref={bladeRef} data-bs-theme={currentTheme}>
      <div className="bs-background" />

      <div className="bs-header">
        <div className="bs-logo">
          <Gamepad size={32} />
          <span>GamePilot</span>
        </div>
        <div className="bs-header-actions">
          <button
            className="bs-header-btn"
            onClick={toggleBigScreenMode}
            title="Exit TV Mode (Esc)"
          >
            <Monitor size={20} />
            <span>Exit TV Mode</span>
          </button>
        </div>
      </div>

      <div className="bs-blades-nav">
        {BLADES.map((b, i) => {
          const Icon = b.icon;
          const isActive = i === activeBlade;
          return (
            <button
              key={b.id}
              className={`bs-blade-tab ${isActive ? 'bs-blade-tab-active' : ''}`}
              onClick={() => setActiveBlade(i)}
            >
              <Icon size={24} />
              <span>{b.label}</span>
              {isActive && <div className="bs-blade-tab-glow" />}
            </button>
          );
        })}
      </div>

      <div className="bs-blade-content" key={blade.id}>
        <div className="bs-blade-content-inner" ref={scrollRef}>
          {renderBladeContent()}
        </div>
      </div>

      <div className="bs-footer">
        <div className="bs-footer-hint">
          <ChevronLeft size={18} />
          <ChevronRight size={18} />
          <span>Navigate</span>
        </div>
        <div className="bs-footer-hint">
          <span className="bs-key-cap">A</span>
          <span className="bs-key-cap">Enter</span>
          <span>Select</span>
        </div>
        <div className="bs-footer-hint">
          <span className="bs-key-cap">B</span>
          <span className="bs-key-cap">Esc</span>
          <span>Back</span>
        </div>
        <div className="bs-footer-hint">
          <span className="bs-key-cap">LB</span>
          <span className="bs-key-cap">RB</span>
          <span>Switch Blade</span>
        </div>
        {focusedGame && (
          <div className="bs-footer-now">
            <span>{focusedGame.name}</span>
          </div>
        )}
      </div>

      <GameModal
        game={detailGame}
        library={safeLibrary}
        isOpen={!!detailGame}
        onClose={handleCloseDetail}
        onLaunch={handleLaunchFromDetail}
        onSelectGame={setDetailGame}
        onUpdateRating={onUpdateRating}
        onToggleFavorite={onToggleFavorite}
        onUpdateCollections={onUpdateCollections}
        onToggleHidden={onToggleHidden}
        onUpdateCompletion={onUpdateCompletion}
        onUpdateNotes={onUpdateNotes}
        onUpdateCoverArt={onUpdateCoverArt}
        onAddSessionNote={onAddSessionNote}
        onTogglePlayedElsewhere={onTogglePlayedElsewhere}
        bigScreen={true}
      />
    </div>
  );
}
