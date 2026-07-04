import React, { useState, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, X, Play, RotateCcw, Sparkles } from 'lucide-react';
import NavBar from './NavBar';
import LazyImage from './components/LazyImage';
import { GamingIdentity } from './GamingIdentity';
import { UserBehaviorProfile } from './services/UserBehaviorProfile';
import { getGameArtworkPlaceholder, resolveGameArtwork } from './services/GameArtworkService';
import StorageService from './services/StorageService';
import './SwipeDeck.css';

const SHORTLIST_KEY = 'swipeDeckShortlist';
const SWIPE_HISTORY_KEY = 'swipeDeckHistory';

function loadShortlist() {
  return StorageService.get(SHORTLIST_KEY, []);
}

function saveShortlist(list) {
  StorageService.set(SHORTLIST_KEY, list);
}

function loadSwipeHistory() {
  return StorageService.get(SWIPE_HISTORY_KEY, {});
}

function saveSwipeHistory(history) {
  StorageService.set(SWIPE_HISTORY_KEY, history);
}

function getWhyThisText(game, identity) {
  try {
    const id = identity?.identity;
    if (!id) return null;
    const genres = Array.isArray(game?.genres) ? game.genres : [];
    const reasons = [];

    if (id.favoriteMood && game.mood === id.favoriteMood) {
      reasons.push(`Matches your ${id.favoriteMood} vibe`);
    }
    if (id.favoriteGenre && genres.includes(id.favoriteGenre)) {
      reasons.push(`From your favorite genre: ${id.favoriteGenre}`);
    }
    if (id.archetype) {
      reasons.push(`Aligned with your ${id.archetype} identity`);
    }
    if (id.playStyle) {
      reasons.push(`Fits your ${id.playStyle} style`);
    }
    if (game.time_played && game.time_played > 0) {
      const hours = Math.round(game.time_played / 60);
      reasons.push(`${hours}h already invested`);
    }

    return reasons.length > 0 ? reasons[0] : 'In your library';
  } catch {
    return null;
  }
}

function buildDeck(library, filters, identity) {
  let pool = [...library];

  if (filters.mood) {
    pool = pool.filter((g) => g.mood === filters.mood);
  }
  if (filters.genre) {
    pool = pool.filter((g) => Array.isArray(g.genres) && g.genres.includes(filters.genre));
  }

  const history = loadSwipeHistory();
  const today = new Date().toISOString().split('T')[0];
  const swipedToday = history[today] || [];

  // Exclude games already swiped today and games in shortlist
  const shortlist = loadShortlist();
  const shortlistIds = new Set(shortlist.map((g) => g.appid || g.name));

  pool = pool.filter((g) => {
    const id = g.appid || g.name;
    return !swipedToday.includes(id) && !shortlistIds.has(id);
  });

  // Score and sort
  const scored = pool.map((game) => {
    let score = Math.random() * 10; // slight shuffle
    const genres = Array.isArray(game.genres) ? game.genres : [];
    const id = identity?.identity;

    if (id?.favoriteMood && game.mood === id.favoriteMood) score += 20;
    if (id?.favoriteGenre && genres.includes(id.favoriteGenre)) score += 15;
    if (id?.archetype) {
      const archetypeGenreMap = {
        'RPG Connoisseur': ['RPG'],
        'Strategy Sage': ['Strategy', 'Management'],
        'Shooter Specialist': ['Shooter', 'FPS', 'Action'],
        'Adventure Seeker': ['Adventure', 'Exploration'],
        'Puzzle Master': ['Puzzle', 'Logic'],
        'Indie Explorer': ['Indie'],
        'Horror Enthusiast': ['Horror'],
        'Sports Fanatic': ['Sports', 'Racing'],
        'Sandbox Architect': ['Simulation', 'Sandbox', 'Survival'],
        'MOBA Strategist': ['MOBA', 'Strategy'],
        'Fighting Veteran': ['Fighting'],
        'MMO Devotee': ['MMO', 'RPG'],
        'Narrative Lover': ['Adventure', 'RPG', 'Visual Novel'],
        'Completionist': ['RPG', 'Adventure', 'Platformer']
      };
      const aff = archetypeGenreMap[id.archetype] || [];
      if (aff.some((ag) => genres.includes(ag))) score += 12;
    }

    // Prefer games with some playtime but not a ton (backlog buster)
    const minutes = Number(game.time_played || 0);
    if (minutes > 0 && minutes < 300) score += 10; // 0-5h is ideal backlog
    if (minutes === 0) score += 5; // unplayed

    return { game, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.game);
}

function HalfStarRating({ value, onChange, size = 18 }) {
  const stars = [];
  for (let i = 1; i <= 10; i++) {
    const filled = value >= i;
    const half = !filled && value >= i - 0.5;
    stars.push(
      <button
        key={i}
        className="half-star-btn"
        type="button"
        aria-label={`Rate ${i} out of 10`}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const isLeft = x < rect.width / 2;
          const next = isLeft ? i - 0.5 : i;
          onChange(next === value ? 0 : next);
        }}
      >
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="half-star-svg">
          <defs>
            <linearGradient id={`star-grad-${i}`}>
              <stop offset="50%" stopColor={half ? 'currentColor' : 'transparent'} />
              <stop offset="50%" stopColor={filled ? 'currentColor' : 'transparent'} />
            </linearGradient>
          </defs>
          <path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            fill={filled || half ? `url(#star-grad-${i})` : 'transparent'}
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    );
  }
  return <div className="half-star-rating">{stars}</div>;
}

export default function SwipeDeck({ library, onLaunchGame, onUpdateRating }) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('filter'); // filter | swiping | finished
  const [filters, setFilters] = useState({ mood: '', genre: '', deckType: 'smart' });
  const [deck, setDeck] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shortlist, setShortlist] = useState(() => loadShortlist());
  const [, setDismissedCount] = useState(0);
  const [swipeDir, setSwipeDir] = useState(null);
  const [showShortlistDrawer, setShowShortlistDrawer] = useState(false);
  const cardRef = useRef(null);
  const startX = useRef(0);
  const currentX = useRef(0);
  const isDragging = useRef(false);
  const identity = useMemo(() => {
    try { return GamingIdentity.getProfile(); } catch { return null; }
  }, []);

  const availableMoods = useMemo(() => {
    const moods = new Set();
    library.forEach((g) => { if (g.mood) moods.add(g.mood); });
    return Array.from(moods).sort();
  }, [library]);

  const availableGenres = useMemo(() => {
    const genres = new Set();
    library.forEach((g) => {
      if (Array.isArray(g.genres)) g.genres.forEach((gr) => genres.add(gr));
    });
    return Array.from(genres).sort();
  }, [library]);

  const currentGame = deck[currentIndex];

  const startDeck = useCallback(() => {
    const built = buildDeck(library, filters, identity);
    setDeck(built);
    setCurrentIndex(0);
    setDismissedCount(0);
    setPhase(built.length > 0 ? 'swiping' : 'finished');
  }, [library, filters, identity]);

  const recordSwipe = useCallback((game, direction) => {
    try {
      const history = loadSwipeHistory();
      const today = new Date().toISOString().split('T')[0];
      if (!history[today]) history[today] = [];
      const id = game.appid || game.name;
      if (!history[today].includes(id)) history[today].push(id);
      saveSwipeHistory(history);

      UserBehaviorProfile.trackRecommendationFeedback('swipe_deck', id, direction === 'right', {
        mood: game.mood,
        genre: Array.isArray(game.genres) ? game.genres[0] : null,
        direction,
        deckType: filters.deckType
      });
    } catch {
      // non-critical
    }
  }, [filters.deckType]);

  const handleSwipe = useCallback((direction) => {
    if (!currentGame) return;
    setSwipeDir(direction);
    recordSwipe(currentGame, direction);

    if (direction === 'right') {
      const next = [...loadShortlist(), currentGame];
      saveShortlist(next);
      setShortlist(next);
    } else if (direction === 'up') {
      const next = [...loadShortlist(), currentGame];
      saveShortlist(next);
      setShortlist(next);
      if (onLaunchGame) onLaunchGame(currentGame);
    } else {
      setDismissedCount((c) => c + 1);
    }

    setTimeout(() => {
      setSwipeDir(null);
      setCurrentIndex((i) => {
        const next = i + 1;
        if (next >= deck.length) {
          setPhase('finished');
        }
        return next;
      });
    }, 300);
  }, [currentGame, deck.length, onLaunchGame, recordSwipe]);

  // Touch / mouse drag handlers
  const onPointerDown = useCallback((e) => {
    isDragging.current = true;
    startX.current = e.clientX || e.touches?.[0]?.clientX || 0;
    currentX.current = startX.current;
  }, []);

  const onPointerMove = useCallback((e) => {
    if (!isDragging.current || !cardRef.current) return;
    const x = e.clientX || e.touches?.[0]?.clientX || 0;
    currentX.current = x;
    const delta = x - startX.current;
    const rotate = delta * 0.05;
    cardRef.current.style.transform = `translateX(${delta}px) rotate(${rotate}deg)`;
    cardRef.current.style.opacity = String(Math.max(0.4, 1 - Math.abs(delta) / 600));
  }, []);

  const onPointerUp = useCallback(() => {
    if (!isDragging.current || !cardRef.current) return;
    isDragging.current = false;
    const delta = currentX.current - startX.current;
    cardRef.current.style.transition = 'transform 0.3s ease, opacity 0.3s ease';

    if (delta > 120) {
      cardRef.current.style.transform = 'translateX(500px) rotate(15deg)';
      cardRef.current.style.opacity = '0';
      handleSwipe('right');
    } else if (delta < -120) {
      cardRef.current.style.transform = 'translateX(-500px) rotate(-15deg)';
      cardRef.current.style.opacity = '0';
      handleSwipe('left');
    } else {
      cardRef.current.style.transform = 'translateX(0) rotate(0deg)';
      cardRef.current.style.opacity = '1';
    }

    setTimeout(() => {
      if (cardRef.current) {
        cardRef.current.style.transition = '';
        cardRef.current.style.transform = '';
        cardRef.current.style.opacity = '';
      }
    }, 300);
  }, [handleSwipe]);

  const removeFromShortlist = useCallback((game) => {
    const next = shortlist.filter((g) => (g.appid || g.name) !== (game.appid || game.name));
    saveShortlist(next);
    setShortlist(next);
  }, [shortlist]);

  const handleRateGame = useCallback((game, rating) => {
    if (onUpdateRating) {
      onUpdateRating(game.name, rating, null);
    }
    // Optimistically update shortlist game in-place so UI reflects change immediately
    setShortlist((prev) => prev.map((g) => (g.name === game.name ? { ...g, userRating: rating } : g)));
  }, [onUpdateRating]);

  const whyText = currentGame ? getWhyThisText(currentGame, identity) : null;

  const renderShortlistPanel = (forceOpen = false) => (
    <div className={`swipe-shortlist-panel ${(showShortlistDrawer || forceOpen) ? 'open' : ''}`}>
      <div className="swipe-shortlist-header">
        <h3><Heart size={18} fill="currentColor" /> Your Shortlist ({shortlist.length})</h3>
        <button
          className="swipe-shortlist-close"
          onClick={() => setShowShortlistDrawer(false)}
          title="Close"
        >
          <X size={18} />
        </button>
      </div>
      <div className="swipe-shortlist-grid">
        {shortlist.length === 0 ? (
          <p className="swipe-shortlist-empty">Swipe right on games to add them here.</p>
        ) : (
          shortlist.map((game) => (
            <div key={game.appid || game.name} className="swipe-shortlist-item">
              <div className="swipe-shortlist-artwork">
                <LazyImage
                  src={resolveGameArtwork(game, { surface: 'recommendation_card' })}
                  alt={game.name}
                  placeholder={getGameArtworkPlaceholder({ game, surface: 'recommendation_card' })}
                />
              </div>
              <span className="swipe-shortlist-name">{game.name}</span>
              <HalfStarRating
                value={game.userRating || 0}
                onChange={(rating) => handleRateGame(game, rating)}
                size={16}
              />
              <div className="swipe-shortlist-actions">
                <button onClick={() => onLaunchGame && onLaunchGame(game)} title="Launch">
                  <Play size={14} />
                </button>
                <button onClick={() => removeFromShortlist(game)} title="Remove">
                  <X size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  if (phase === 'filter') {
    return (
      <div className="swipe-deck-page">
        <NavBar />
        <div className="swipe-deck-header">
          <button className="swipe-back-btn" onClick={() => navigate(-1)} title="Back">
            <ArrowLeft size={20} />
          </button>
          <h1 className="swipe-deck-title">
            <Sparkles size={22} /> Swipe Deck
          </h1>
        </div>

        <div className="swipe-deck-filter-card">
          <h2>What are you in the mood for?</h2>
          <p className="swipe-deck-subtitle">Swipe through your library to build a shortlist for tonight.</p>

          <div className="swipe-filter-group">
            <label className="swipe-filter-label">Mood</label>
            <div className="swipe-filter-chips">
              <button
                className={`swipe-filter-chip ${filters.mood === '' ? 'active' : ''}`}
                onClick={() => setFilters((f) => ({ ...f, mood: '' }))}
              >
                Any
              </button>
              {availableMoods.map((m) => (
                <button
                  key={m}
                  className={`swipe-filter-chip ${filters.mood === m ? 'active' : ''}`}
                  onClick={() => setFilters((f) => ({ ...f, mood: m }))}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="swipe-filter-group">
            <label className="swipe-filter-label">Genre</label>
            <div className="swipe-filter-chips">
              <button
                className={`swipe-filter-chip ${filters.genre === '' ? 'active' : ''}`}
                onClick={() => setFilters((f) => ({ ...f, genre: '' }))}
              >
                Any
              </button>
              {availableGenres.map((g) => (
                <button
                  key={g}
                  className={`swipe-filter-chip ${filters.genre === g ? 'active' : ''}`}
                  onClick={() => setFilters((f) => ({ ...f, genre: g }))}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="swipe-filter-group">
            <label className="swipe-filter-label">Deck Type</label>
            <div className="swipe-filter-chips">
              {[
                { id: 'smart', label: 'Smart Mix', desc: 'Identity + random shuffle' },
                { id: 'backlog', label: 'Backlog Buster', desc: 'Unplayed & under 5h' },
                { id: 'comfort', label: 'Comfort Picks', desc: 'Most played & liked' },
                { id: 'surprise', label: 'Surprise Me', desc: 'Random across library' }
              ].map((t) => (
                <button
                  key={t.id}
                  className={`swipe-filter-chip ${filters.deckType === t.id ? 'active' : ''}`}
                  onClick={() => setFilters((f) => ({ ...f, deckType: t.id }))}
                  title={t.desc}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <button className="swipe-start-btn" onClick={startDeck}>
            Start Swiping ({library.length} games)
          </button>

          {shortlist.length > 0 && (
            <div className="swipe-existing-shortlist">
              <span>You have {shortlist.length} game{shortlist.length !== 1 ? 's' : ''} in your shortlist</span>
              <button
                className="swipe-clear-shortlist-btn"
                onClick={() => { saveShortlist([]); setShortlist([]); }}
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'finished') {
    return (
      <div className="swipe-deck-page">
        <NavBar />
        <div className="swipe-deck-header">
          <button className="swipe-back-btn" onClick={() => navigate(-1)} title="Back">
            <ArrowLeft size={20} />
          </button>
          <h1 className="swipe-deck-title">
            <Sparkles size={22} /> Swipe Deck
          </h1>
        </div>

        <div className="swipe-finished-card">
          <Sparkles size={48} className="swipe-finished-icon" />
          <h2>Deck Complete!</h2>
          <p>You swiped through {deck.length} game{deck.length !== 1 ? 's' : ''}.</p>

          {shortlist.length > 0 ? (
            <>
              <p className="swipe-finished-shortlist-count">
                <Heart size={16} fill="currentColor" /> {shortlist.length} added to shortlist
              </p>
              <div className="swipe-finished-actions">
                <button className="swipe-restart-btn" onClick={startDeck}>
                  <RotateCcw size={18} /> Swipe Again
                </button>
                <button className="swipe-back-home-btn" onClick={() => navigate('/')}>
                  Back to Home
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="swipe-finished-empty">No games made it to your shortlist this time.</p>
              <div className="swipe-finished-actions">
                <button className="swipe-restart-btn" onClick={startDeck}>
                  <RotateCcw size={18} /> Try Again
                </button>
                <button className="swipe-back-home-btn" onClick={() => navigate('/')}>
                  Back to Home
                </button>
              </div>
            </>
          )}
        </div>

        {shortlist.length > 0 && (
          <div className="swipe-finished-shortlist-wrapper">
            {renderShortlistPanel(true)}
          </div>
        )}
      </div>
    );
  }

  // Swiping phase
  return (
    <div className="swipe-deck-page swiping">
      <NavBar />
      <div className="swipe-deck-header minimal">
        <button className="swipe-back-btn" onClick={() => setPhase('filter')} title="Back">
          <ArrowLeft size={18} />
        </button>
        <span className="swipe-progress">
          {currentIndex + 1} / {deck.length}
        </span>
        <button
          className={`swipe-shortlist-toggle ${showShortlistDrawer ? 'active' : ''}`}
          onClick={() => setShowShortlistDrawer((s) => !s)}
          title={`Shortlist (${shortlist.length})`}
        >
          <Heart size={18} /> {shortlist.length}
        </button>
      </div>

      {showShortlistDrawer && renderShortlistPanel()}

      <div className="swipe-card-area">
        {currentGame && (
          <div
            ref={cardRef}
            className={`swipe-card ${swipeDir ? `swipe-${swipeDir}` : ''}`}
            onMouseDown={onPointerDown}
            onMouseMove={onPointerMove}
            onMouseUp={onPointerUp}
            onMouseLeave={onPointerUp}
            onTouchStart={onPointerDown}
            onTouchMove={onPointerMove}
            onTouchEnd={onPointerUp}
          >
            <div className="swipe-card-artwork">
              <LazyImage
                src={resolveGameArtwork(currentGame, { surface: 'recommendation_card' })}
                alt={currentGame.name}
                placeholder={getGameArtworkPlaceholder({ game: currentGame, surface: 'recommendation_card' })}
              />
              {whyText && (
                <div className="swipe-card-reason">{whyText}</div>
              )}
            </div>

            <div className="swipe-card-info">
              <h3 className="swipe-card-title">{currentGame.name}</h3>
              <div className="swipe-card-meta">
                <span className="swipe-card-platform">{currentGame.platform}</span>
                {Array.isArray(currentGame.genres) && currentGame.genres.length > 0 && (
                  <span className="swipe-card-genre">{currentGame.genres.filter((g) => g !== 'Unknown')[0] || ''}</span>
                )}
                {currentGame.mood && (
                  <span className="swipe-card-mood">{currentGame.mood}</span>
                )}
              </div>
              {currentGame.time_played > 0 && (
                <div className="swipe-card-playtime">
                  {Math.round(currentGame.time_played / 60)}h played
                </div>
              )}
            </div>

            <div className="swipe-card-overlay right">
              <Heart size={48} />
              <span>SHORTLIST</span>
            </div>
            <div className="swipe-card-overlay left">
              <X size={48} />
              <span>NOT NOW</span>
            </div>
            <div className="swipe-card-overlay up">
              <Play size={48} />
              <span>PLAY NOW</span>
            </div>
          </div>
        )}
      </div>

      <div className="swipe-controls">
        <button className="swipe-btn dismiss" onClick={() => handleSwipe('left')} title="Not now (Left)">
          <X size={24} />
        </button>
        <button className="swipe-btn launch" onClick={() => handleSwipe('up')} title="Play now (Up)">
          <Play size={24} />
        </button>
        <button className="swipe-btn like" onClick={() => handleSwipe('right')} title="Shortlist (Right)">
          <Heart size={24} />
        </button>
      </div>

      <div className="swipe-keyboard-hint">
        ← Pass · → Shortlist · ↑ Launch · Esc Back
      </div>
    </div>
  );
}
