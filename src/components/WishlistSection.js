import React from 'react';
import LazyImage from './LazyImage';
import EmptyState from './EmptyState';
import { resolveGameArtwork, getGameArtworkPlaceholder } from '../services/GameArtworkService';
import WishlistService from '../services/WishlistService';

export default function WishlistSection({ library = [], platformIcons, onLaunchGame }) {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [enabled, setEnabled] = React.useState(() => WishlistService.isEnabled());
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState(null);
  const [searching, setSearching] = React.useState(false);
  const [justAdded, setJustAdded] = React.useState(null);
  const [alertSummary, setAlertSummary] = React.useState(() => WishlistService.getAlertSummary());
  const [backgroundChecking, setBackgroundChecking] = React.useState(false);

  const loadItems = React.useCallback(() => {
    const wishlist = WishlistService.getWishlist();
    const enriched = wishlist.map((item) => {
      const libGame = library.find((g) => (g.name || '').toLowerCase() === item.name.toLowerCase());
      return { ...item, libraryGame: libGame };
    });
    setItems(enriched);
    setAlertSummary(WishlistService.recalculateAlertSummary());
  }, [library]);

  React.useEffect(() => { loadItems(); }, [loadItems]);

  React.useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    setBackgroundChecking(true);
    WishlistService.refreshIfStale()
      .then(() => {
        if (!cancelled) loadItems();
      })
      .finally(() => {
        if (!cancelled) setBackgroundChecking(false);
      });
    return () => { cancelled = true; };
  }, [enabled, loadItems]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await WishlistService.refreshAllPrices();
      loadItems();
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = (name) => {
    WishlistService.removeGame(name);
    loadItems();
  };

  const handleToggle = () => {
    const next = !enabled;
    setEnabled(next);
    WishlistService.setEnabled(next);
  };

  if (!enabled) {
    return (
      <div className="results-section">
        <div className="result-card">
          <div className="wishlist-enable-row">
            <EmptyState
              icon="🔕"
              title="Wishlist tracking is off"
              description="Enable it to search games and track prices."
              compact
            />
            <button className="wishlist-enable-btn" onClick={handleToggle}>Enable Wishlist</button>
          </div>
        </div>
      </div>
    );
  }

  const handleThreshold = (name, value) => {
    WishlistService.setThreshold(name, value ? parseFloat(value) : null);
    loadItems();
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return;
    setSearching(true);
    setSearchResults(null);
    const results = await WishlistService.searchGame(searchQuery.trim(), library);
    setSearchResults(results);
    setSearching(false);
  };

  const isWishlisted = (name) => {
    return WishlistService.isWishlisted(name);
  };

  const handleAddFromSearch = (result) => {
    if (isWishlisted(result.name)) return;
    // If this result matches a game in the local library, carry its genres and
    // platform so Buy Recommendations can rank it against the player's taste.
    const libGame = (library || []).find(
      (g) => (g.name || g.title || '').toLowerCase() === (result.name || '').toLowerCase()
    );
    const added = WishlistService.addGame(
      { name: result.name, platform: result.platform || libGame?.platform || '' },
      { threshold: null, genres: Array.isArray(libGame?.genres) ? libGame.genres : null }
    );
    if (!added) return;
    setJustAdded(result.name);
    loadItems();
    setBackgroundChecking(true);
    WishlistService.fetchPrice(result.name)
      .then(() => loadItems())
      .finally(() => setBackgroundChecking(false));
    setTimeout(() => setJustAdded(null), 2000);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
  };

  const drops = items.filter((item) => {
    if (!item.currentPrice || !item.threshold) return false;
    return item.currentPrice.price <= item.threshold;
  });
  const alertCount = alertSummary?.count || 0;
  const historicalDeals = Array.isArray(alertSummary?.deals) ? alertSummary.deals : [];

  const artworkForGame = (game) => {
    if (!game) return null;
    const art = resolveGameArtwork(game);
    if (art && typeof art === 'string' && art.startsWith('http')) return art;
    return getGameArtworkPlaceholder(game.platform);
  };

  return (
    <div className="results-section">
      <div className="wishlist-header-bar">
        <div className="wishlist-header-left">
          {alertCount > 0 && (
            <span className="wishlist-badge wishlist-badge--alert">{alertCount} active alert{alertCount > 1 ? 's' : ''}</span>
          )}
          {drops.length > 0 && (
            <span className="wishlist-badge wishlist-badge--drop">{drops.length} price drop{drops.length > 1 ? 's' : ''}</span>
          )}
          <span className="wishlist-count">{items.length} game{items.length !== 1 ? 's' : ''}</span>
          {backgroundChecking && <span className="wishlist-checking">Checking prices...</span>}
        </div>
        <div className="wishlist-header-right">
          <form className="wishlist-search-form" onSubmit={handleSearch}>
            <input
              type="text"
              className="wishlist-search-input"
              placeholder="Search game to add..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="wishlist-search-btn" disabled={searching || !searchQuery.trim()}>
              {searching ? '...' : 'Search'}
            </button>
          </form>
          <button className="wishlist-refresh-btn" onClick={handleRefresh} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh Prices'}
          </button>
        </div>
      </div>

      {alertCount > 0 && (
        <div className="wishlist-alert-strip">
          <strong>Price alert ready</strong>
          <span>
            {drops.length > 0
              ? `${drops[0].name} is at or below your alert threshold.`
              : `${historicalDeals[0]?.name || 'A watched game'} is matching its known low price.`}
          </span>
        </div>
      )}

      {searchResults && (
        <div className="wishlist-search-results">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Search results</span>
            <button className="wishlist-search-add" onClick={clearSearch}>Close</button>
          </div>
          {searchResults.length === 0 ? (
            <p className="wishlist-search-empty">No games found. Try a different search.</p>
          ) : (
            <div className="wishlist-search-list">
              {searchResults.map((result) => {
                const alreadyAdded = isWishlisted(result.name);
                const wasJustAdded = justAdded === result.name;
                return (
                  <div key={result.id || result.name} className="wishlist-search-result">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="wishlist-search-name">{result.name}</span>
                      {result.source === 'library' && (
                        <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(108,92,231,0.2)', color: '#a29bfe' }}>Library</span>
                      )}
                      {result.source === 'cheapshark' && (
                        <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(34,197,94,0.2)', color: '#22c55e' }}>Store</span>
                      )}
                      {result.source === 'custom' && (
                        <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}>Custom</span>
                      )}
                    </div>
                    {alreadyAdded ? (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Added</span>
                    ) : wasJustAdded ? (
                      <span style={{ fontSize: '0.78rem', color: '#22c55e', fontWeight: 600 }}>Added!</span>
                    ) : (
                      <button className="wishlist-search-add" onClick={() => handleAddFromSearch(result)}>Add</button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <div className="result-card">
          <EmptyState
            icon="📝"
            title="Your wishlist is empty"
            description="Use the search box above to find games and add them to your wishlist."
            compact
          />
        </div>
      ) : (
        <div className="wishlist-grid">
          {items.map((item) => {
            const game = item.libraryGame;
            const placeholder = getGameArtworkPlaceholder(game?.platform);
            const currentPrice = item.currentPrice;
            const hasDrop = currentPrice && item.threshold && currentPrice.price <= item.threshold;
            return (
              <div key={item.name} className={`wishlist-card ${hasDrop ? 'wishlist-card--drop' : ''}`}>
                <div className="wishlist-card-art">
                  {game ? (
                    <LazyImage src={artworkForGame(game)} alt={item.name} placeholder={placeholder} className="game-image" />
                  ) : (
                    <div className="game-placeholder"><div className="platform-icon">🎮</div></div>
                  )}
                </div>
                <div className="wishlist-card-body">
                  <div className="wishlist-card-title-row">
                    <span className="wishlist-card-name">{item.name}</span>
                    {game?.platform && platformIcons?.[game.platform] && (
                      <span className="wishlist-card-platform">{platformIcons[game.platform]}</span>
                    )}
                  </div>
                  {currentPrice ? (
                    <div className="wishlist-card-price">
                      <span className="wishlist-price-current">{currentPrice.priceFormatted || `$${currentPrice.price}`}</span>
                      {currentPrice.store && <span className="wishlist-price-store">{currentPrice.store}</span>}
                    </div>
                  ) : (
                    <span className="wishlist-price-unavailable">Price unavailable</span>
                  )}
                  {hasDrop && (
                    <span className="wishlist-drop-badge">Price drop!</span>
                  )}
                  <div className="wishlist-card-actions">
                    <label className="wishlist-threshold-label">
                      Alert at:
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="wishlist-threshold-input"
                        value={item.threshold || ''}
                        onChange={(e) => handleThreshold(item.name, e.target.value)}
                        placeholder="No alert"
                      />
                    </label>
                    {game && onLaunchGame && (
                      <button className="wishlist-launch-btn" onClick={() => onLaunchGame(game)}>Launch</button>
                    )}
                    <button className="wishlist-remove-btn" onClick={() => handleRemove(item.name)}>Remove</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
