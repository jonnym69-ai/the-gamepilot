import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCcw, Sparkles, Search, ExternalLink, Gamepad2 } from 'lucide-react';
import NavBar from './NavBar';
import WishlistSection from './components/WishlistSection';
import EmptyState from './components/EmptyState';
import LazyImage from './components/LazyImage';
import SimilarGamesService from './services/SimilarGamesService';
import { PLATFORM_ICONS } from './constants/PlatformConstants';
import './WishlistPage.css';

const MODES = [
  { value: 'recent', label: 'Recent Game', description: 'Based on the last game you played' },
  { value: 'fortnight', label: 'Last 14 Days', description: 'Aggregated taste from your recent sessions' },
  { value: 'custom', label: 'Pick a Game', description: 'Choose any game from your library' },
];

function WishlistPage({ library = [], onLaunchGame }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState('recent');
  const [customGame, setCustomGame] = useState(null);
  const [customSearch, setCustomSearch] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const safeLibrary = useMemo(() => (Array.isArray(library) ? library : []), [library]);

  // Reference games for the current mode (for display before fetching)
  const referencePreview = useMemo(() => {
    return SimilarGamesService.getReferenceGames(mode, safeLibrary, customGame);
  }, [mode, safeLibrary, customGame]);

  // Library games for the custom picker, sorted by last played
  const libraryForPicker = useMemo(() => {
    return safeLibrary
      .filter((g) => g && g.name)
      .sort((a, b) => {
        const aTime = a.last_played ? new Date(a.last_played).getTime() : 0;
        const bTime = b.last_played ? new Date(b.last_played).getTime() : 0;
        return bTime - aTime;
      });
  }, [safeLibrary]);

  const filteredPickerGames = useMemo(() => {
    if (!customSearch.trim()) return libraryForPicker.slice(0, 30);
    const q = customSearch.toLowerCase();
    return libraryForPicker.filter((g) => (g.name || '').toLowerCase().includes(q)).slice(0, 30);
  }, [libraryForPicker, customSearch]);

  const fetchSimilar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await SimilarGamesService.getSimilarRecommendations({
        mode,
        library: safeLibrary,
        referenceGame: mode === 'custom' ? customGame : null,
        count: 8,
        useCache: true,
      });
      setResults(result);
    } catch (err) {
      setError(err.message || 'Could not load similar games.');
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, [mode, safeLibrary, customGame]);

  useEffect(() => {
    // Auto-fetch when mode changes (or custom game is picked)
    if (mode === 'custom' && !customGame) {
      setResults(null);
      return;
    }
    fetchSimilar();
  }, [fetchSimilar, mode, customGame]);

  // Refresh on window focus (in case sessions changed while away)
  useEffect(() => {
    const onFocus = () => {
      if (mode !== 'custom' || customGame) fetchSimilar();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchSimilar, mode, customGame]);

  const handleRefresh = () => {
    SimilarGamesService.clearCache();
    fetchSimilar();
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    if (newMode !== 'custom') {
      setCustomGame(null);
      setCustomSearch('');
    }
  };

  const handlePickCustomGame = (game) => {
    setCustomGame(game);
    setCustomSearch('');
  };

  return (
    <div className="wishlist-page">
      <NavBar />
      <div className="wishlist-page-content">
        {/* Header */}
        <div className="wishlist-page-header">
          <button className="wishlist-page-back-btn" onClick={() => navigate('/')} title="Back to Home">
            <ArrowLeft size={20} />
          </button>
          <div className="wishlist-page-title-section">
            <h1 className="wishlist-page-title">Wishlist & Discoveries</h1>
            <p className="wishlist-page-subtitle">
              Track games you want, and discover new ones similar to what you've been playing.
            </p>
          </div>
          <button
            className="wishlist-page-refresh-btn"
            onClick={handleRefresh}
            disabled={loading}
            title="Clear cache and re-fetch similar games"
          >
            <RefreshCcw size={16} />
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {/* Similar Games Discovery Panel */}
        <section className="wishlist-similar-section">
          <div className="wishlist-similar-header">
            <div className="wishlist-similar-title-row">
              <Sparkles size={20} className="wishlist-similar-icon" />
              <h2 className="wishlist-similar-title">Similar to what you've been playing</h2>
            </div>
            <p className="wishlist-similar-subtitle">
              Discovers new games from the Steam store and merges in relevant wishlist items.
            </p>
          </div>

          {/* Mode toggle */}
          <div className="wishlist-mode-toggle">
            {MODES.map((m) => (
              <button
                key={m.value}
                className={`wishlist-mode-btn${mode === m.value ? ' active' : ''}`}
                onClick={() => handleModeChange(m.value)}
                title={m.description}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Reference preview */}
          {referencePreview.length > 0 && (
            <div className="wishlist-reference-preview">
              <span className="wishlist-reference-label">Reference:</span>
              {referencePreview.map((g, i) => (
                <span key={g.name + i} className="wishlist-reference-chip">
                  {g.name}
                  {g.genres && g.genres.length > 0 && (
                    <span className="wishlist-reference-genres">{g.genres.slice(0, 3).join(', ')}</span>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* Custom game picker */}
          {mode === 'custom' && (
            <div className="wishlist-custom-picker">
              <div className="wishlist-custom-search">
                <Search size={16} />
                <input
                  type="text"
                  className="wishlist-custom-input"
                  placeholder="Search your library..."
                  value={customSearch}
                  onChange={(e) => setCustomSearch(e.target.value)}
                />
              </div>
              {customGame && (
                <div className="wishlist-custom-selected">
                  Selected: <strong>{customGame.name}</strong>
                  <button className="wishlist-custom-clear" onClick={() => setCustomGame(null)} title="Clear selection">
                    Clear
                  </button>
                </div>
              )}
              {!customGame && (
                <div className="wishlist-custom-list">
                  {filteredPickerGames.length === 0 ? (
                    <p className="wishlist-custom-empty">
                      {safeLibrary.length === 0
                        ? 'Your library is empty. Add games first.'
                        : 'No games match your search.'}
                    </p>
                  ) : (
                    filteredPickerGames.map((game) => (
                      <button
                        key={game.appid || game.name}
                        className="wishlist-custom-item"
                        onClick={() => handlePickCustomGame(game)}
                        title={game.genres ? game.genres.join(', ') : game.name}
                      >
                        <span className="wishlist-custom-item-name">{game.name}</span>
                        {game.genres && game.genres.length > 0 && (
                          <span className="wishlist-custom-item-genres">{game.genres.slice(0, 2).join(' · ')}</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Results */}
          <div className="wishlist-similar-results">
            {loading && (
              <div className="wishlist-similar-loading">
                <RefreshCcw size={24} className="spinning" />
                <p>Discovering similar games from Steam...</p>
              </div>
            )}

            {!loading && error && (
              <div className="wishlist-similar-error">
                <p>{error}</p>
                <button onClick={handleRefresh}>Try again</button>
              </div>
            )}

            {!loading && !error && results && results.entries.length === 0 && (
              <EmptyState
                icon="🔍"
                title="No similar games found"
                description={results.message || 'Try a different reference game or check back later.'}
                compact
              />
            )}

            {!loading && !error && results && results.entries.length > 0 && (
              <>
                <div className="wishlist-similar-meta">
                  <span>
                    {results.discoveredCount} discovered from Steam · {results.wishlistCount} from your wishlist
                  </span>
                  {results.cached && <span className="wishlist-similar-cached">cached</span>}
                </div>
                <div className="wishlist-similar-grid">
                  {results.entries.map((entry, index) => (
                    <article key={entry.appid || entry.name + index} className="wishlist-similar-card">
                      <div className="wishlist-similar-card-art">
                        {entry.image ? (
                          <LazyImage
                            src={entry.image}
                            alt={entry.name}
                            placeholder={
                              <div className="game-placeholder">
                                <Gamepad2 size={32} />
                              </div>
                            }
                            className="game-image"
                          />
                        ) : (
                          <div className="game-placeholder">
                            <Gamepad2 size={32} />
                          </div>
                        )}
                        <span className={`wishlist-similar-source-badge source-${entry.source}`}>
                          {entry.source === 'steam' ? 'Steam' : 'Wishlist'}
                        </span>
                      </div>
                      <div className="wishlist-similar-card-body">
                        <div className="wishlist-similar-card-header">
                          <span className="wishlist-similar-card-name">{entry.name}</span>
                          <span className="wishlist-similar-card-score">{entry.displayScore}%</span>
                        </div>
                        {entry.genres && entry.genres.length > 0 && (
                          <div className="wishlist-similar-card-genres">
                            {entry.genres.slice(0, 4).map((g) => (
                              <span key={g} className="wishlist-similar-genre-tag">
                                {g}
                              </span>
                            ))}
                          </div>
                        )}
                        {entry.reasons && entry.reasons.length > 0 && (
                          <p className="wishlist-similar-card-reason">{entry.reasons[0]}</p>
                        )}
                        <div className="wishlist-similar-card-footer">
                          {entry.price && <span className="wishlist-similar-price">{entry.price}</span>}
                          <a
                            href={entry.steamUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="wishlist-similar-view-btn"
                            title="View on Steam"
                          >
                            <ExternalLink size={14} />
                            View
                          </a>
                          {entry.source === 'wishlist' && entry.wishlistItem && (
                            <span className="wishlist-similar-on-wishlist" title="Already on your wishlist">
                              On Wishlist
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* Full wishlist management */}
        <section className="wishlist-page-list-section">
          <div className="wishlist-page-list-header">
            <h2 className="wishlist-page-list-title">Your Wishlist</h2>
            <p className="wishlist-page-list-subtitle">
              Search, add, track prices, and set alerts for games you want to buy.
            </p>
          </div>
          <WishlistSection library={safeLibrary} platformIcons={PLATFORM_ICONS} onLaunchGame={onLaunchGame} />
        </section>
      </div>
    </div>
  );
}

export default WishlistPage;
