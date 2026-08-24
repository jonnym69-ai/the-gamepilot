import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Home,
  Sparkles,
  Shuffle,
  RotateCcw,
  Compass,
  Heart,
  Target,
  Music,
  ListMusic,
  ChevronRight,
  Play,
  Plus,
  Trash2,
  Fingerprint,
  Gamepad,
  Scale,
  TrendingUp,
  Gamepad2
} from 'lucide-react';
import NavBar from './NavBar';
import LazyImage from './components/LazyImage';
import { PerfectPlaySelector } from './components/PerfectPlaySelector';
import { GamingIdentity } from './GamingIdentity';
import { AchievementTracker } from './AchievementSystem';
import { RecommendationEngine } from './services/RecommendationEngine';
import { RecommendationReasonChip } from './components/RecommendationReasonChip';
import { UserBehaviorProfile } from './services/UserBehaviorProfile';
import WishlistService from './services/WishlistService';
import StorageService from './services/StorageService';
import { getGameArtworkPlaceholder, resolveGameArtwork } from './services/GameArtworkService';
import { MOODS, getMoodForGame } from './constants/GenresMoods';
import './Recommendations.css';

function formatPlaytime(minutes) {
  const safe = Math.max(0, Math.round(Number(minutes) || 0));
  if (safe < 60) return `${safe}m`;
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/* ──────────────── Library Intelligence Helpers ──────────────── */

const getGameId = (game) => String(game?.appid || game?.app_id || game?.steamAppId || game?.launchId || game?.name || '');

const getMinutesPlayed = (game) => {
  const direct = Number(game?.time_played || 0);
  const nested = Number(game?.playtime?.total || 0);
  return Math.max(Number.isFinite(direct) ? direct : 0, Number.isFinite(nested) ? nested : 0);
};

const formatHours = (minutes) => {
  const hours = Math.round((Number(minutes || 0) / 60) * 10) / 10;
  return `${hours}h`;
};

const formatDate = (value) => {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const getCompletionLabel = (game) => (
  game?.completionStatus
  || game?.completion_status
  || game?.status
  || (game?.completed ? 'Completed' : 'Unfinished')
);

const getRatingLabel = (game) => {
  const rating = game?.userRating ?? game?.rating ?? game?.user_rating;
  return rating ? `${rating}/10` : 'Not rated';
};

const getTopGenres = (game) => (
  Array.isArray(game?.genres) && game.genres.length > 0 ? game.genres.slice(0, 3).join(', ') : 'Unknown'
);

const getRecencyScore = (game) => {
  if (!game?.last_played) return 0;
  const days = (Date.now() - new Date(game.last_played).getTime()) / 86400000;
  if (!Number.isFinite(days)) return 0;
  if (days <= 7) return 30;
  if (days <= 30) return 20;
  if (days <= 90) return 10;
  return 3;
};

const getMomentumScore = (game) => {
  const minutes = getMinutesPlayed(game);
  const launches = Number(game?.launch_count || 0);
  return Math.min(100, Math.round((minutes / 60) * 2 + launches * 3 + getRecencyScore(game)));
};

const buildVerdict = (selectedGames) => {
  if (selectedGames.length < 2) {
    return 'Pick at least two games to compare your local play patterns.';
  }

  const sortedByTime = [...selectedGames].sort((a, b) => getMinutesPlayed(b) - getMinutesPlayed(a));
  const sortedByMomentum = [...selectedGames].sort((a, b) => getMomentumScore(b) - getMomentumScore(a));
  const mostPlayed = sortedByTime[0];
  const highestMomentum = sortedByMomentum[0];

  if (getGameId(mostPlayed) === getGameId(highestMomentum)) {
    return `${mostPlayed.name} is your strongest pick here: it has the most time invested and the best current momentum.`;
  }

  return `${mostPlayed.name} has the most time invested, but ${highestMomentum.name} looks like the better current-session pick based on recent activity and launches.`;
};

const metricRows = [
  { label: 'Playtime', getValue: (game) => formatHours(getMinutesPlayed(game)) },
  { label: 'Launches', getValue: (game) => Number(game?.launch_count || 0) },
  { label: 'Last played', getValue: (game) => formatDate(game?.last_played) },
  { label: 'Completion', getValue: getCompletionLabel },
  { label: 'Rating', getValue: getRatingLabel },
  { label: 'Genres', getValue: getTopGenres },
  { label: 'Momentum', getValue: (game) => `${getMomentumScore(game)}/100` }
];

const PLAYLIST_KEY = 'recommendationsPlaylist';

function loadPlaylist() {
  const stored = StorageService.get(PLAYLIST_KEY, []);
  return Array.isArray(stored) ? stored.filter((game) => game && typeof game === 'object' && game.name) : [];
}

function savePlaylist(list) {
  StorageService.set(PLAYLIST_KEY, list);
}

function getPlatformIcon(platform) {
  switch (platform?.toLowerCase()) {
    case 'steam':
      return '🎮';
    case 'epic':
      return '🎯';
    case 'gog':
      return '🛡️';
    case 'xbox':
      return '✖️';
    case 'playstation':
      return '🔺';
    case 'switch':
      return '🔲';
    default:
      return '🖥️';
  }
}

/* ──────────────── Recommendation Style Engines ──────────────── */

function getMoodMixes(library, identity) {
  if (!library?.length) return [];
  const moods = Object.fromEntries(MOODS.map((mood) => [mood, []]));
  library.forEach((game) => {
    if (UserBehaviorProfile.shouldSuppressRecommendation(game?.appid || game?.name, game?.name)) return;
    const explicitMood = MOODS.find((mood) => mood.toLowerCase() === String(game?.mood || '').toLowerCase());
    const mood = explicitMood || getMoodForGame(game?.genres);
    if (mood && moods[mood]) moods[mood].push(game);
  });

  const mixes = MOODS.map((mood) => {
    const games = moods[mood];
    const shuffled = [...games].sort(() => Math.random() - 0.5);
    return {
      title: `${mood} Mix`,
      subtitle: games.length > 0 ? `${games.length} ${games.length === 1 ? 'game' : 'games'}` : 'No matches yet',
      mood,
      games: shuffled.slice(0, 6),
      color: getMoodColor(mood)
    };
  });

  // Prioritize mixes that match user's favorite mood
  const favorite = identity?.identity?.favoriteMood;
  if (favorite) {
    mixes.sort((a, b) => {
      if (a.mood === favorite) return -1;
      if (b.mood === favorite) return 1;
      return b.games.length - a.games.length;
    });
  }

  return mixes.slice(0, 6);
}

function getMoodColor(mood) {
  const map = {
    Competitive: '#e74c3c',
    Relaxed: '#27ae60',
    Social: '#f39c12',
    Creative: '#9b59b6',
    Focused: '#3498db'
  };
  return map[mood] || '#6366f1';
}

function getRabbitHole(library, identity) {
  if (!library?.length) return null;

  // Pick a seed game: recently played or favorite genre
  const recentlyPlayed = [...library]
    .filter((g) => g.last_played)
    .sort((a, b) => new Date(b.last_played) - new Date(a.last_played))[0];

  const seedGame = recentlyPlayed || library[Math.floor(Math.random() * library.length)];
  if (!seedGame) return null;

  const seedGenres = Array.isArray(seedGame.genres) ? seedGame.genres : [];
  const seedMood = seedGame.mood;

  // Find similar games
  const similar = library
    .filter((g) => g !== seedGame && !UserBehaviorProfile.shouldSuppressRecommendation(g?.appid || g?.name, g?.name))
    .map((game) => {
      const genres = Array.isArray(game.genres) ? game.genres : [];
      let score = UserBehaviorProfile.getRecommendationOutcomeSignal(game?.appid || game?.name, game?.name).adjustment;
      genres.forEach((g) => {
        if (seedGenres.includes(g)) score += 3;
      });
      if (game.mood && game.mood === seedMood) score += 2;
      if (game.platform === seedGame.platform) score += 1;
      return { game, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (similar.length < 2) return null;

  return {
    title: 'Rabbit Hole',
    subtitle: `Because you played ${seedGame.name}`,
    seedGame,
    games: similar.map((e) => e.game)
  };
}

function getSessionPlaylistCandidates(library, identity) {
  if (!library?.length) return [];
  // Short games or games with low playtime
  return library.filter((g) => {
    if (UserBehaviorProfile.shouldSuppressRecommendation(g?.appid || g?.name, g?.name)) return false;
    const hltb = g.hltb?.main || g.hltb?.mainExtra || 0;
    const played = g.time_played || 0;
    return (hltb > 0 && hltb <= 120) || (played > 0 && played <= 120);
  });
}

/* ──────────────── Sub-Components ──────────────── */

function StyleCard({ icon: Icon, title, description, color, onClick, isActive }) {
  return (
    <button
      className={`rec-style-card ${isActive ? 'active' : ''}`}
      onClick={onClick}
      style={{ '--card-accent': color }}
    >
      <div className="rec-style-icon" style={{ background: color }}>
        <Icon size={24} />
      </div>
      <div className="rec-style-info">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <ChevronRight size={18} className="rec-style-chevron" />
    </button>
  );
}

function GameRow({ game, index, onLaunch, onAddToPlaylist, inPlaylist, recommendationType }) {
  const artwork = useMemo(() => resolveGameArtwork(game, { surface: 'portrait' }), [game]);
  const placeholder = useMemo(() => getGameArtworkPlaceholder({ game, surface: 'portrait' }), [game]);

  return (
    <div className="rec-game-row">
      <span className="rec-row-index">{index + 1}</span>
      <div className="rec-row-artwork">
        <LazyImage src={artwork} alt={game.name} placeholder={placeholder} />
      </div>
      <div className="rec-row-info">
        <span className="rec-row-title">{game.name}</span>
        <span className="rec-row-meta">
          {getPlatformIcon(game.platform)} {game.platform}
          {game.mood && <> · {game.mood}</>}
          {game.time_played ? <> · {formatPlaytime(game.time_played)}</> : null}
        </span>
        {recommendationType && (
          <RecommendationReasonChip
            game={game}
            recommendationType={recommendationType}
          />
        )}
      </div>
      {onAddToPlaylist && (
        <button
          type="button"
          className={`rec-row-action ${inPlaylist ? 'in-playlist' : ''}`}
          onClick={() => onAddToPlaylist(game)}
          title={inPlaylist ? 'Remove from playlist' : 'Add to playlist'}
          aria-label={`${inPlaylist ? 'Remove' : 'Add'} ${game.name} ${inPlaylist ? 'from' : 'to'} playlist`}
        >
          {inPlaylist ? <Trash2 size={16} /> : <Plus size={16} />}
          <span>{inPlaylist ? 'Remove' : 'Add'}</span>
        </button>
      )}
      {onLaunch && (
        <button type="button" className="rec-row-launch" onClick={() => onLaunch(game)} title="Launch game" aria-label={`Launch ${game.name}`}>
          <Play size={16} />
          <span>Launch</span>
        </button>
      )}
    </div>
  );
}

function HorizontalGameStrip({ games, onLaunch, onAddToPlaylist, playlist, recommendationType }) {
  return (
    <div className="rec-horizontal-strip">
      {games.map((game, i) => (
        <div key={`${game.appid || game.name}-${i}`} className="rec-strip-card">
          <div className="rec-strip-artwork">
            <LazyImage
              src={resolveGameArtwork(game, { surface: 'portrait' })}
              alt={game.name}
              placeholder={getGameArtworkPlaceholder({ game, surface: 'portrait' })}
            />
            <button type="button" className="rec-strip-play" onClick={() => onLaunch?.(game)} aria-label={`Launch ${game.name}`}>
              <Play size={20} />
            </button>
          </div>
          <span className="rec-strip-title">{game.name}</span>
          {game.mood && <span className="rec-strip-mood">{game.mood}</span>}
          {recommendationType && (
            <RecommendationReasonChip
              game={game}
              recommendationType={recommendationType}
            />
          )}
          {onAddToPlaylist && (
            <button
              type="button"
              className={`rec-strip-add ${playlist?.some((p) => p.name === game.name) ? 'in-playlist' : ''}`}
              onClick={() => onAddToPlaylist(game)}
              aria-label={`${playlist?.some((p) => p.name === game.name) ? 'Remove' : 'Add'} ${game.name} ${playlist?.some((p) => p.name === game.name) ? 'from' : 'to'} playlist`}
            >
              {playlist?.some((p) => p.name === game.name) ? <Trash2 size={14} /> : <Plus size={14} />}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/* ──────────────── Main Component ──────────────── */

export default function Recommendations({ library, onLaunchGame }) {
  const navigate = useNavigate();
  const [activeStyle, setActiveStyle] = useState('hub');
  const [playlist, setPlaylist] = useState(() => loadPlaylist());
  const safeLibrary = useMemo(() => (Array.isArray(library) ? library.filter(Boolean) : []), [library]);

  const playableLibrary = useMemo(() => (
    Array.isArray(library)
      ? library.filter((game) => game && game.name).sort((a, b) => String(a.name).localeCompare(String(b.name)))
      : []
  ), [library]);

  const defaultSelections = useMemo(() => playableLibrary.slice(0, 2).map(getGameId), [playableLibrary]);
  const [selectedIds, setSelectedIds] = useState(defaultSelections);

  const identity = useMemo(() => {
    try { return GamingIdentity.getProfile(); } catch { return null; }
  }, []);

  const addToPlaylist = useCallback((game) => {
    const current = loadPlaylist();
    const exists = current.some((g) => g.name === game.name);
    let next;
    if (exists) {
      next = current.filter((g) => g.name !== game.name);
    } else {
      next = [...current, game];
    }
    savePlaylist(next);
    setPlaylist(next);
  }, []);

  const clearPlaylist = useCallback(() => {
    savePlaylist([]);
    setPlaylist([]);
  }, []);

  const handleLaunch = useCallback((game) => {
    const gameId = game?.appid || game?.name;
    const achievementFeature = {
      'perfect-play': 'perfect_play',
      'surprise-me': 'surprise',
      rediscover: 'rediscover'
    }[activeStyle];
    if (achievementFeature) {
      AchievementTracker.logGameplayFeature(achievementFeature);
      AchievementTracker.checkAndUnlockAchievements();
    }
    if (gameId && activeStyle !== 'hub') {
      UserBehaviorProfile.trackRecommendationLaunch(activeStyle, gameId, {
        mood: game?.mood || null,
        genre: RecommendationEngine.getPrimaryGenre(game) || null,
        source: 'recommendations-page'
      });
    }
    if (typeof onLaunchGame === 'function') {
      onLaunchGame(game);
    }
  }, [activeStyle, onLaunchGame]);

  const recommendationStyles = useMemo(() => [
    {
      id: 'identity-picks',
      title: 'Identity Picks',
      description: 'Curated from your gaming identity and taste',
      icon: Fingerprint,
      color: '#f39c12'
    },
    {
      id: 'perfect-play',
      title: 'Perfect Play',
      description: 'Best match for your current mood and time',
      icon: Target,
      color: '#e74c3c'
    },
    {
      id: 'mood-mix',
      title: 'Mood Mix',
      description: 'Curated stacks by vibe like Spotify Daily Mix',
      icon: Music,
      color: '#1db954'
    },
    {
      id: 'backlog-buster',
      title: 'Backlog Buster',
      description: 'Unplayed games matched to your taste',
      icon: Gamepad,
      color: '#e67e22'
    },
    {
      id: 'rediscover',
      title: 'Rediscover',
      description: 'Old favorites you have not touched in ages',
      icon: RotateCcw,
      color: '#3498db'
    },
    {
      id: 'surprise-me',
      title: 'Surprise Me',
      description: 'Let fate pick your next game',
      icon: Sparkles,
      color: '#9b59b6'
    },
    {
      id: 'rabbit-hole',
      title: 'Rabbit Hole',
      description: 'If you liked this, you will love these',
      icon: Compass,
      color: '#1abc9c'
    },
    {
      id: 'session-playlist',
      title: 'Session Playlist',
      description: 'Build a queue of short games',
      icon: ListMusic,
      color: '#6366f1'
    },
    {
      id: 'swipe-deck',
      title: 'Swipe Deck',
      description: 'Tinder-style quick sorting',
      icon: Heart,
      color: '#ec4899'
    },
    {
      id: 'game-comparison',
      title: 'Game Comparison',
      description: 'Compare 2-4 games side-by-side',
      icon: Scale,
      color: '#ff8a1f'
    },
    {
      id: 'momentum-picks',
      title: 'Momentum Picks',
      description: 'Games ranked by momentum score',
      icon: TrendingUp,
      color: '#1abc9c'
    },
    {
      id: 'untouched-shelf',
      title: 'Untouched Shelf',
      description: 'Games with zero playtime',
      icon: Gamepad2,
      color: '#9b59b6'
    }
  ], []);

  const identityPicksResult = useMemo(() => {
    if (activeStyle !== 'identity-picks') return null;
    return RecommendationEngine.getIdentityPicks(safeLibrary, identity, 5);
  }, [activeStyle, safeLibrary, identity]);

  const wishlistIdentityPicks = useMemo(() => {
    if (activeStyle !== 'identity-picks') return null;
    try {
      return RecommendationEngine.getWishlistIdentityPicks(WishlistService.getWishlist(), identity, 3);
    } catch {
      return null;
    }
  }, [activeStyle, identity]);

  const backlogBusterResult = useMemo(() => {
    if (activeStyle !== 'backlog-buster') return null;
    return RecommendationEngine.getBacklogBusterResult(safeLibrary, null, null, 5);
  }, [activeStyle, safeLibrary]);

  const rediscoverResult = useMemo(() => {
    if (activeStyle !== 'rediscover') return null;
    return RecommendationEngine.getRediscoverResult(safeLibrary);
  }, [activeStyle, safeLibrary]);

  const surpriseResult = useMemo(() => {
    if (activeStyle !== 'surprise-me') return null;
    return RecommendationEngine.getSurpriseMeResult(safeLibrary);
  }, [activeStyle, safeLibrary]);

  const moodMixes = useMemo(() => {
    if (activeStyle !== 'mood-mix') return [];
    return getMoodMixes(safeLibrary, identity);
  }, [activeStyle, safeLibrary, identity]);

  const rabbitHole = useMemo(() => {
    if (activeStyle !== 'rabbit-hole') return null;
    return getRabbitHole(safeLibrary, identity);
  }, [activeStyle, safeLibrary, identity]);

  const sessionCandidates = useMemo(() => {
    if (activeStyle !== 'session-playlist') return [];
    return getSessionPlaylistCandidates(safeLibrary, identity);
  }, [activeStyle, safeLibrary, identity]);

  /* ── Library Intelligence computations ── */

  const selectedGames = useMemo(() => (
    selectedIds
      .map((id) => playableLibrary.find((game) => getGameId(game) === id))
      .filter(Boolean)
  ), [playableLibrary, selectedIds]);

  const updateSelection = useCallback((slotIndex, value) => {
    setSelectedIds((current) => {
      const next = [...current];
      next[slotIndex] = value;
      return next.filter(Boolean).slice(0, 4);
    });
  }, []);

  const addCompareSlot = useCallback(() => {
    const nextGame = playableLibrary.find((game) => !selectedIds.includes(getGameId(game)));
    if (nextGame) {
      setSelectedIds((current) => [...current, getGameId(nextGame)].slice(0, 4));
    }
  }, [playableLibrary, selectedIds]);

  const removeCompareSlot = useCallback((slotIndex) => {
    setSelectedIds((current) => current.filter((_, i) => i !== slotIndex));
  }, []);

  const highMomentum = useMemo(() => {
    if (activeStyle !== 'momentum-picks') return [];
    return playableLibrary
      .filter((game) => getMinutesPlayed(game) > 0
        && !UserBehaviorProfile.shouldSuppressRecommendation(game?.appid || game?.name, game?.name))
      .sort((a, b) => (
        getMomentumScore(b) + UserBehaviorProfile.getRecommendationOutcomeSignal(b?.appid || b?.name, b?.name).adjustment
      ) - (
        getMomentumScore(a) + UserBehaviorProfile.getRecommendationOutcomeSignal(a?.appid || a?.name, a?.name).adjustment
      ))
      .slice(0, 5);
  }, [activeStyle, playableLibrary]);

  const untouchedGames = useMemo(() => {
    if (activeStyle !== 'untouched-shelf') return [];
    return playableLibrary
      .filter((game) => getMinutesPlayed(game) === 0
        && !UserBehaviorProfile.shouldSuppressRecommendation(game?.appid || game?.name, game?.name))
      .slice(0, 6);
  }, [activeStyle, playableLibrary]);

  const renderHub = () => (
    <>
      <div className="rec-hub-header">
        <h1>Recommendations</h1>
        <p>Discover your next favorite game</p>
      </div>

      <div className="rec-styles-grid">
        {recommendationStyles.map((style) => (
          <StyleCard
            key={style.id}
            {...style}
            isActive={false}
            onClick={() => {
              if (style.id === 'swipe-deck') {
                navigate('/swipe-deck');
              } else {
                setActiveStyle(style.id);
              }
            }}
          />
        ))}
      </div>

      {playlist.length > 0 && (
        <div className="rec-playlist-mini">
          <div className="rec-playlist-header">
            <h3><ListMusic size={18} /> Your Session Playlist</h3>
            <span>{playlist.length} games</span>
          </div>
          <div className="rec-playlist-games">
            {playlist.slice(0, 4).map((game) => (
              <div key={game.name} className="rec-playlist-chip">
                {game.name}
              </div>
            ))}
            {playlist.length > 4 && (
              <span className="rec-playlist-more">+{playlist.length - 4} more</span>
            )}
          </div>
          <button className="rec-playlist-clear" onClick={clearPlaylist}>
            <Trash2 size={14} /> Clear
          </button>
        </div>
      )}
    </>
  );

  const renderStyleHeader = (title, subtitle) => (
    <div className="rec-style-detail-header">
      <button className="rec-back-btn" onClick={() => setActiveStyle('hub')}>
        <ArrowLeft size={20} />
      </button>
      <div>
        <p className="rec-detail-subtitle">{subtitle}</p>
      </div>
    </div>
  );

  const renderGameList = (games, recommendationType) => (
    <div className="rec-game-list">
      {games.map((game, i) => (
        <GameRow
          key={`${game.appid || game.name}-${i}`}
          game={game}
          index={i}
          onLaunch={handleLaunch}
          onAddToPlaylist={activeStyle === 'session-playlist' ? addToPlaylist : undefined}
          inPlaylist={playlist.some((p) => p.name === game.name)}
          recommendationType={recommendationType}
        />
      ))}
    </div>
  );

  const renderPayload = (payload, recommendationType) => {
    if (!payload?.games?.length) {
      return (
        <div className="rec-empty">
          <Sparkles size={48} />
          <p>No recommendations found right now.</p>
          <button className="rec-refresh-btn" onClick={() => setActiveStyle('hub')}>
            Try another style
          </button>
        </div>
      );
    }
    return (
      <>
        {payload.message && <p className="rec-payload-message">{payload.message}</p>}
        <HorizontalGameStrip
          games={payload.games}
          onLaunch={handleLaunch}
          onAddToPlaylist={activeStyle === 'session-playlist' ? addToPlaylist : undefined}
          playlist={playlist}
          recommendationType={recommendationType}
        />
        {renderGameList(payload.games, recommendationType)}
      </>
    );
  };

  const renderMoodMixes = () => {
    if (!moodMixes.length) {
      return (
        <div className="rec-empty">
          <Music size={48} />
          <p>Not enough mood-tagged games to build mixes.</p>
        </div>
      );
    }
    return (
      <div className="rec-mood-mixes">
        {moodMixes.map((mix) => (
          <div key={mix.title} className="rec-mood-mix-card" style={{ borderColor: mix.color }}>
            <div className="rec-mix-header" style={{ background: mix.color }}>
              <Music size={20} />
              <div>
                <h3>{mix.title}</h3>
                <span>{mix.subtitle}</span>
              </div>
            </div>
            {mix.games.length > 0 ? (
              <HorizontalGameStrip games={mix.games} onLaunch={handleLaunch} />
            ) : (
              <div className="rec-mood-empty">No games in your library currently match this mood.</div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderSessionPlaylist = () => {
    const candidates = sessionCandidates;
    return (
      <>
        <div className="rec-playlist-builder">
          <div className="rec-playlist-queue">
            <h3><ListMusic size={18} /> Your Queue ({playlist.length})</h3>
            {playlist.length === 0 ? (
              <p className="rec-playlist-hint">Add games from below to build your session queue.</p>
            ) : (
              <div className="rec-playlist-list">
                {playlist.map((game, i) => (
                  <div key={`${game.name}-${i}`} className="rec-playlist-item">
                    <span>{i + 1}. {game.name}</span>
                    <button onClick={() => addToPlaylist(game)}><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
            {playlist.length > 0 && (
              <button className="rec-playlist-clear" onClick={clearPlaylist}>
                <Trash2 size={14} /> Clear Queue
              </button>
            )}
          </div>
        </div>
        <h3 className="rec-candidates-title"><Target size={18} /> Suggested Short Games</h3>
        {candidates.length === 0 ? (
          <div className="rec-empty">
            <p>No short-session games found in your library.</p>
          </div>
        ) : (
          renderGameList(candidates)
        )}
      </>
    );
  };

  const renderRabbitHole = () => {
    if (!rabbitHole) {
      return (
        <div className="rec-empty">
          <Compass size={48} />
          <p>Not enough data to build a rabbit hole.</p>
        </div>
      );
    }
    return (
      <>
        {rabbitHole.seedGame && (
          <div className="rec-seed-game">
            <span className="rec-seed-label">Starting from</span>
            <div className="rec-seed-card">
              <LazyImage
                src={resolveGameArtwork(rabbitHole.seedGame, { surface: 'portrait' })}
                alt={rabbitHole.seedGame.name}
                placeholder={getGameArtworkPlaceholder({ game: rabbitHole.seedGame, surface: 'portrait' })}
              />
              <span>{rabbitHole.seedGame.name}</span>
            </div>
          </div>
        )}
        <h3 className="rec-section-title">You might also love</h3>
        {renderGameList(rabbitHole.games)}
      </>
    );
  };

  const renderGameComparison = () => {
    if (playableLibrary.length < 2) {
      return (
        <div className="rec-empty">
          <Scale size={48} />
          <p>You need at least two games in your library to compare.</p>
        </div>
      );
    }
    return (
      <>
        <div className="rec-comparison-controls">
          <div className="rec-comparison-selectors">
            {selectedIds.map((id, index) => (
              <label key={`${id}-${index}`} className="rec-comparison-selector">
                <span>Game {index + 1}</span>
                <div className="rec-comparison-selector-row">
                  <select value={id} onChange={(event) => updateSelection(index, event.target.value)}>
                    {playableLibrary.map((game) => (
                      <option key={getGameId(game)} value={getGameId(game)}>{game.name}</option>
                    ))}
                  </select>
                  {selectedIds.length > 2 && (
                    <button
                      type="button"
                      className="rec-comparison-remove"
                      onClick={() => removeCompareSlot(index)}
                      aria-label={`Remove game ${index + 1}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </label>
            ))}
          </div>
          {selectedIds.length < 4 && (
            <button type="button" className="rec-comparison-add" onClick={addCompareSlot}>
              <Plus size={16} /> Add game
            </button>
          )}
        </div>

        <div className="rec-comparison-verdict">
          <Sparkles size={18} />
          <span>{buildVerdict(selectedGames)}</span>
        </div>

        <div className="rec-comparison-table">
          <div className="rec-comparison-table-row rec-comparison-table-head">
            <span>Metric</span>
            {selectedGames.map((game) => <strong key={getGameId(game)}>{game.name}</strong>)}
          </div>
          {metricRows.map((row) => (
            <div className="rec-comparison-table-row" key={row.label}>
              <span>{row.label}</span>
              {selectedGames.map((game) => <strong key={`${row.label}-${getGameId(game)}`}>{row.getValue(game)}</strong>)}
            </div>
          ))}
        </div>
      </>
    );
  };

  const renderMomentumPicks = () => {
    if (highMomentum.length === 0) {
      return (
        <div className="rec-empty">
          <TrendingUp size={48} />
          <p>No momentum yet — start playing a few games to surface your strongest patterns.</p>
        </div>
      );
    }
    return (
      <>
        <p className="rec-payload-message">
          Games with the strongest current pattern from playtime, launches, and recency.
        </p>
        <div className="rec-momentum-list">
          {highMomentum.map((game, index) => (
            <article className="rec-momentum-card" key={getGameId(game)}>
              <span className="rec-momentum-rank">{index + 1}</span>
              <div className="rec-momentum-info">
                <strong>{game.name}</strong>
                <span>{formatHours(getMinutesPlayed(game))} · {formatDate(game.last_played)}</span>
              </div>
              <div className="rec-momentum-score">{getMomentumScore(game)}</div>
              {typeof onLaunchGame === 'function' && (
                <button type="button" className="rec-momentum-launch" onClick={() => handleLaunch(game)}>
                  <Play size={14} /> Launch
                </button>
              )}
            </article>
          ))}
        </div>
      </>
    );
  };

  const renderUntouchedShelf = () => {
    if (untouchedGames.length === 0) {
      return (
        <div className="rec-empty">
          <Gamepad2 size={48} />
          <p>No untouched games found — every game in your library has some playtime.</p>
        </div>
      );
    }
    return (
      <>
        <p className="rec-payload-message">
          Games in your library with no recorded playtime yet.
        </p>
        <div className="rec-untouched-grid">
          {untouchedGames.map((game) => (
            <span className="rec-untouched-chip" key={getGameId(game)}>
              <Gamepad2 size={14} />
              {game.name}
            </span>
          ))}
        </div>
      </>
    );
  };

  const renderWishlistIdentityPicks = () => {
    if (!wishlistIdentityPicks?.items?.length) return null;
    return (
      <div className="rec-wishlist-identity">
        <h3 className="rec-section-title">From your wishlist</h3>
        {wishlistIdentityPicks.message && (
          <p className="rec-payload-message">{wishlistIdentityPicks.message}</p>
        )}
        <div className="rec-wishlist-identity-list">
          {wishlistIdentityPicks.items.map((item) => (
            <div key={item.key || item.name} className="rec-wishlist-identity-row">
              <div className="rec-wishlist-identity-artwork">
                <LazyImage
                  src={resolveGameArtwork(item, { surface: 'portrait' })}
                  alt={item.name}
                  placeholder={getGameArtworkPlaceholder({ game: item, surface: 'portrait' })}
                />
              </div>
              <div className="rec-wishlist-identity-info">
                <span className="rec-wishlist-identity-title">{item.name}</span>
                {item.identityReasons?.length > 0 && (
                  <span className="rec-wishlist-identity-reason">
                    {item.identityReasons[0].replace(/\*\*/g, '')}
                  </span>
                )}
                {item.currentPrice?.price != null && (
                  <span className={`rec-wishlist-identity-price ${item.priceStatus || ''}`}>
                    {item.currentPrice.formatted || `${item.currentPrice.price}`}
                    {item.priceStatus === 'below-threshold' && ' · below your target'}
                    {item.priceStatus === 'historical-low' && ' · historical low'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTopNav = () => (
    <div className="rec-top-nav">
      <div className="rec-top-nav-left">
        <button className="rec-nav-home-btn" onClick={() => navigate('/')} title="Home">
          <Home size={18} />
        </button>
        {activeStyle !== 'hub' && (
          <button className="rec-nav-back-btn" onClick={() => setActiveStyle('hub')} title="Back to hub">
            <ArrowLeft size={18} />
          </button>
        )}
      </div>
      <div className="rec-top-nav-title">
        {activeStyle === 'hub' ? 'Recommendations' : recommendationStyles.find((s) => s.id === activeStyle)?.title || ''}
      </div>
      <div className="rec-top-nav-right" />
    </div>
  );

  return (
    <div className="recommendations-page">
      <NavBar />
      {renderTopNav()}
      <div className="rec-content">
        {activeStyle === 'hub' && renderHub()}

        {activeStyle === 'identity-picks' && (
          <>
            {renderStyleHeader('Identity Picks', 'Curated from your gaming identity and taste')}
            {renderPayload(identityPicksResult, 'identity-picks')}
            {renderWishlistIdentityPicks()}
          </>
        )}

        {activeStyle === 'perfect-play' && (
          <>
            {renderStyleHeader('Perfect Play', 'Select moods, genres & time to find your match')}
            <PerfectPlaySelector library={safeLibrary} onGameSelected={handleLaunch} />
          </>
        )}

        {activeStyle === 'mood-mix' && (
          <>
            {renderStyleHeader('Mood Mix', 'Curated stacks by vibe')}
            {renderMoodMixes()}
          </>
        )}

        {activeStyle === 'backlog-buster' && (
          <>
            {renderStyleHeader('Backlog Buster', 'Unplayed games matched to your taste')}
            {backlogBusterResult?.backlogStats && (
              <div className="rec-backlog-stats">
                <span className="rec-backlog-stat">
                  <strong>{backlogBusterResult.backlogStats.totalUnplayed}</strong> unplayed
                </span>
                <span className="rec-backlog-stat">
                  <strong>{backlogBusterResult.backlogStats.totalLibrary}</strong> total games
                </span>
                <span className="rec-backlog-stat">
                  <strong>{backlogBusterResult.backlogStats.backlogPercentage}%</strong> backlog
                </span>
              </div>
            )}
            {renderPayload(backlogBusterResult, 'backlog-buster')}
          </>
        )}

        {activeStyle === 'rediscover' && (
          <>
            {renderStyleHeader('Rediscover', 'Old favorites waiting for you')}
            {renderPayload(rediscoverResult, 'rediscover')}
          </>
        )}

        {activeStyle === 'surprise-me' && (
          <>
            {renderStyleHeader('Surprise Me', 'Let fate decide')}
            {renderPayload(surpriseResult, 'surprise-me')}
            <div className="rec-actions">
              <button
                className="rec-action-btn"
                onClick={() => {
                  setActiveStyle('hub');
                  setTimeout(() => setActiveStyle('surprise-me'), 50);
                }}
              >
                <Shuffle size={18} /> Roll Again
              </button>
            </div>
          </>
        )}

        {activeStyle === 'rabbit-hole' && (
          <>
            {renderStyleHeader('Rabbit Hole', 'Start from one game, find more')}
            {renderRabbitHole()}
          </>
        )}

        {activeStyle === 'session-playlist' && (
          <>
            {renderStyleHeader('Session Playlist', 'Build a queue of short games')}
            {renderSessionPlaylist()}
          </>
        )}

        {activeStyle === 'game-comparison' && (
          <>
            {renderStyleHeader('Game Comparison', 'Compare 2-4 games side-by-side')}
            {renderGameComparison()}
          </>
        )}

        {activeStyle === 'momentum-picks' && (
          <>
            {renderStyleHeader('Momentum Picks', 'Games ranked by momentum score')}
            {renderMomentumPicks()}
          </>
        )}

        {activeStyle === 'untouched-shelf' && (
          <>
            {renderStyleHeader('Untouched Shelf', 'Games with zero playtime')}
            {renderUntouchedShelf()}
          </>
        )}
      </div>
    </div>
  );
}
