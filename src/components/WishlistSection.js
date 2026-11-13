import React from 'react';
import './WishlistSection.css';
import LazyImage from './LazyImage';
import EmptyState from './EmptyState';
import { resolveGameArtwork, getGameArtworkPlaceholder } from '../services/GameArtworkService';
import WishlistService from '../services/WishlistService';
import BuyRecommendationService from '../services/BuyRecommendationService';
import ReleaseTrackerService from '../services/ReleaseTrackerService';
import { getFamiliarityBias, setFamiliarityBias } from '../services/RecommendationWeights';
import { formatPrice, getCurrentCurrency, getCurrencySymbol, convertToUSD } from '../CurrencyConverter';

// Mini price-history chart built from our own daily price checks, anchored by
// CheapShark's all-time-low when we have a recorded date for it. No chart lib —
// a plain SVG polyline keeps this dependency-free.
function PriceSparkline({ item, currency }) {
  const history = Array.isArray(item.priceHistory)
    ? item.priceHistory.filter((p) => p && Number.isFinite(p.p) && Number.isFinite(p.t))
    : [];
  const low = item.historicalLow?.price;
  const lowRecorded = item.historicalLow?.recorded;
  const points = [...history];
  if (
    typeof low === 'number' &&
    Number.isFinite(low) &&
    typeof lowRecorded === 'number' &&
    (!history.length || lowRecorded < history[0].t)
  ) {
    points.unshift({ t: lowRecorded, p: low });
  }
  if (points.length === 0) {
    return <p className="wishlist-spark-empty">Price history builds up with each daily check.</p>;
  }
  const W = 200;
  const H = 46;
  const PAD = 6;
  const prices = points.map((p) => p.p);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = Math.max(max - min, 0.01);
  const t0 = points[0].t;
  const t1 = points[points.length - 1].t;
  const x = (t) => (t1 === t0 ? W / 2 : PAD + ((t - t0) / (t1 - t0)) * (W - PAD * 2));
  const y = (p) => H - PAD - ((p - min) / span) * (H - PAD * 2);
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.t).toFixed(1)},${y(p.p).toFixed(1)}`).join(' ');
  return (
    <div className="wishlist-spark">
      <svg viewBox={`0 0 ${W} ${H}`} className="wishlist-spark-svg" role="img" aria-label="Price history">
        {typeof low === 'number' && Number.isFinite(low) && low >= min && low <= max && (
          <line x1={PAD} x2={W - PAD} y1={y(low)} y2={y(low)} className="wishlist-spark-lowline" />
        )}
        {points.length > 1 && <path d={path} className="wishlist-spark-line" />}
        {points.map((p, i) => (
          <circle
            key={`${p.t}-${i}`}
            cx={x(p.t)}
            cy={y(p.p)}
            r={i === points.length - 1 ? 3 : 1.8}
            className={i === points.length - 1 ? 'wishlist-spark-dot-last' : 'wishlist-spark-dot'}
          />
        ))}
      </svg>
      <div className="wishlist-spark-caption">
        <span>Low {formatPrice(min, currency)}</span>
        <span>
          {points.length} check{points.length !== 1 ? 's' : ''}
        </span>
        <span>Now {formatPrice(prices[prices.length - 1], currency)}</span>
      </div>
    </div>
  );
}

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
  const [buyEnabled] = React.useState(() => BuyRecommendationService.isEnabled());
  const [filterGenre, setFilterGenre] = React.useState('');
  const [filterMaxPrice, setFilterMaxPrice] = React.useState('');
  const [familiarityBias, setFamiliarityBiasState] = React.useState(() => getFamiliarityBias());
  const [healedArt, setHealedArt] = React.useState({});
  const healAttemptedRef = React.useRef(new Set());
  const [releaseSummary, setReleaseSummary] = React.useState(() => ReleaseTrackerService.getSummary());
  const [sortMode, setSortMode] = React.useState('ranked');
  const [onSaleOnly, setOnSaleOnly] = React.useState(false);
  const [expandedKey, setExpandedKey] = React.useState(null);
  const [reviews, setReviews] = React.useState({});
  const [dragKey, setDragKey] = React.useState(null);

  // Genre + Price suggestions. Mood is intentionally excluded — it can't be
  // known for a game you don't own yet.
  const buySnapshot = React.useMemo(() => {
    if (!buyEnabled) return null;
    const localMax = filterMaxPrice ? parseFloat(filterMaxPrice) : null;
    // Cached prices are in USD; convert the user's local-currency budget to USD.
    const maxPrice = typeof localMax === 'number' && !Number.isNaN(localMax) ? convertToUSD(localMax) : null;
    return BuyRecommendationService.getSnapshot(library, WishlistService.getWishlist(), {
      genre: filterGenre || null,
      maxPrice,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyEnabled, library, filterGenre, filterMaxPrice, items, familiarityBias]);

  const loadItems = React.useCallback(() => {
    const wishlist = WishlistService.getWishlist();
    const enriched = wishlist.map((item) => {
      const libGame = library.find((g) => (g.name || '').toLowerCase() === item.name.toLowerCase());
      return { ...item, libraryGame: libGame };
    });
    setItems(enriched);
    setAlertSummary(WishlistService.recalculateAlertSummary());
  }, [library]);

  React.useEffect(() => {
    loadItems();
  }, [loadItems]);

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
    if (ReleaseTrackerService.isEnabled()) {
      ReleaseTrackerService.refresh().catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [enabled, loadItems]);

  React.useEffect(() => {
    const onReleases = () => setReleaseSummary(ReleaseTrackerService.getSummary());
    window.addEventListener('gamepilot:wishlist-releases', onReleases);
    return () => window.removeEventListener('gamepilot:wishlist-releases', onReleases);
  }, []);

  // Heal wishlist artwork for items with a Steam AppID whose stored thumb is
  // missing or points at the guessed /apps/<id>/header.jpg path — that path
  // 404s on newer app IDs. Pulls the canonical header_image via the desktop
  // store-details bridge, then backfills the entry so it persists.
  React.useEffect(() => {
    const api = window.electronAPI?.steamStoreDetails;
    if (typeof api !== 'function' || items.length === 0) return undefined;
    const targets = items
      .filter((item) => {
        const steamId = item?.steamAppID || (item?.appid && /^\d+$/.test(String(item.appid)) ? item.appid : null);
        if (!steamId || healAttemptedRef.current.has(item.key)) return false;
        const thumb = typeof item?.thumb === 'string' ? item.thumb : '';
        return !thumb || /\/steam\/apps\/\d+\/header\.jpg/.test(thumb);
      })
      .slice(0, 12);
    if (targets.length === 0) return undefined;
    targets.forEach((item) => healAttemptedRef.current.add(item.key));

    let cancelled = false;
    (async () => {
      const healed = {};
      for (const item of targets) {
        const steamId = String(item.steamAppID || item.appid);
        try {
          const result = await api(steamId);
          const url = result?.ok ? result.data?.header_image || result.data?.capsule_image : null;
          if (url) {
            healed[item.key] = url;
            WishlistService.backfillGame(item.name, { thumb: url });
          }
        } catch {
          /* best-effort heal */
        }
      }
      if (!cancelled && Object.keys(healed).length > 0) {
        setHealedArt((current) => ({ ...current, ...healed }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [items]);

  // Steam review scores on cards — Steam wishlist parity. Results persist on
  // the wishlist entry (`item.review`) for a week so the bridge isn't hit on
  // every visit; sequential, capped per render, and best-effort.
  React.useEffect(() => {
    const api = window.electronAPI?.steamAppReviews;
    if (typeof api !== 'function' || items.length === 0) return undefined;
    const WEEK = 7 * 24 * 60 * 60 * 1000;
    const targets = items
      .filter((item) => {
        const id = item.steamAppID || (item.appid && /^\d+$/.test(String(item.appid)) ? item.appid : null);
        if (!id) return false;
        const r = item.review;
        return !(r && r.fetchedAt && Date.now() - r.fetchedAt < WEEK);
      })
      .slice(0, 12);
    if (targets.length === 0) return undefined;
    let cancelled = false;
    (async () => {
      for (const item of targets) {
        if (cancelled) return;
        const id = String(item.steamAppID || item.appid);
        try {
          const res = await api(id);
          const s = res?.summary;
          if (res?.ok && s && Number(s.total_reviews) > 0) {
            const review = {
              desc: String(s.review_score_desc || 'Reviewed'),
              pct: Math.round((Number(s.total_positive) / Number(s.total_reviews)) * 100),
              fetchedAt: Date.now(),
            };
            if (!cancelled) setReviews((m) => ({ ...m, [item.key]: review }));
            WishlistService.backfillGame(item.name, { review });
          }
        } catch {
          /* review fetch is best-effort */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [items]);

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
            <button className="wishlist-enable-btn" onClick={handleToggle}>
              Enable Wishlist
            </button>
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
      {
        name: result.name,
        platform: result.platform || libGame?.platform || '',
        appid: libGame?.appid || result.steamAppID || '',
        steamAppID: result.steamAppID || '',
        thumb: result.thumb || '',
      },
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

  const currency = getCurrentCurrency();

  // Resolve artwork candidates for a wishlist item: matched library game art,
  // a Steam header image built from the appid, then the cheapshark thumb.
  // Any renderable scheme counts — data:/app:/file: covers are valid <img>
  // sources in the desktop shell, and LazyImage handles genuinely dead URLs.
  const artworkCandidatesForItem = (item) => {
    const urls = [];
    const game = item?.libraryGame;
    if (game) {
      const art = resolveGameArtwork(game, { surface: 'library_card' });
      if (art && typeof art === 'string' && art.trim()) urls.push(art.trim());
    }
    const steamId = item?.steamAppID || (item?.appid && /^\d+$/.test(String(item.appid)) ? item.appid : null);
    const healed = healedArt[item?.key];
    if (healed) urls.push(healed);
    if (item?.thumb && typeof item.thumb === 'string' && item.thumb.startsWith('http')) {
      urls.push(item.thumb);
    }
    if (steamId) {
      // Guessed path — kept as a last resort only; it 404s on newer app IDs.
      urls.push(`https://cdn.cloudflare.steamstatic.com/steam/apps/${steamId}/header.jpg`);
    }
    return [...new Set(urls)];
  };

  const upcomingByAppid = new Map((releaseSummary?.upcoming || []).map((entry) => [String(entry.appid), entry]));
  const releasedByAppid = new Map((releaseSummary?.releasedToday || []).map((entry) => [String(entry.appid), entry]));
  const releaseForItem = (item) => {
    const id = item?.steamAppID || (item?.appid && /^\d+$/.test(String(item.appid)) ? item.appid : null);
    if (!id) return null;
    const key = String(id);
    if (releasedByAppid.has(key)) return { ...releasedByAppid.get(key), released: true };
    return upcomingByAppid.get(key) || null;
  };
  const releasingSoonItems = items.filter((item) => {
    const release = releaseForItem(item);
    return release && !release.released;
  });

  const isOnSale = (item) =>
    Boolean(
      item.currentPrice &&
        (Number(item.currentPrice.cut) > 0 ||
          (item.historicalLow && item.currentPrice.price <= item.historicalLow.price))
    );

  // Steam-parity sorting + the GG.deals-style "wishlist cost" readout. A plain
  // derivation (not useMemo) because the `!enabled` early return happens first.
  const displayItems = (() => {
    const list = onSaleOnly ? items.filter(isOnSale) : items;
    const arr = [...list];
    const priceOf = (i) =>
      typeof i.currentPrice?.price === 'number' && Number.isFinite(i.currentPrice.price)
        ? i.currentPrice.price
        : Infinity;
    switch (sortMode) {
      case 'price':
        arr.sort((a, b) => priceOf(a) - priceOf(b));
        break;
      case 'discount':
        arr.sort((a, b) => (Number(b.currentPrice?.cut) || 0) - (Number(a.currentPrice?.cut) || 0));
        break;
      case 'added':
        arr.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
        break;
      case 'name':
        arr.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'release':
        arr.sort((a, b) => {
          const ra = releaseForItem(a)?.releaseAt;
          const rb = releaseForItem(b)?.releaseAt;
          return (ra ? new Date(ra).getTime() : Infinity) - (rb ? new Date(rb).getTime() : Infinity);
        });
        break;
      default:
        break; // ranked = stored order, draggable
    }
    return arr;
  })();

  const totals = items.reduce(
    (acc, item) => {
      const p = item.currentPrice?.price;
      if (typeof p === 'number' && Number.isFinite(p)) {
        acc.sum += p;
        acc.priced += 1;
        acc.save += Math.max(0, (Number(item.currentPrice.retail) || p) - p);
      }
      return acc;
    },
    { sum: 0, save: 0, priced: 0 }
  );

  const renderWishlistCard = (item) => {
    const game = item.libraryGame;
    const placeholder = getGameArtworkPlaceholder({ game, surface: 'library_card' });
    const [artwork, ...fallbackArtwork] = artworkCandidatesForItem(item);
    const currentPrice = item.currentPrice;
    const hasDrop = currentPrice && item.threshold && currentPrice.price <= item.threshold;
    const discount = currentPrice ? Math.round(Number(currentPrice.cut) || 0) : 0;
    const release = releaseForItem(item);
    const verdict = WishlistService.getVerdict(item);
    const review = reviews[item.key] || item.review;
    const expanded = expandedKey === item.key;
    const deals = Array.isArray(item.deals) ? item.deals : [];
    const draggable = sortMode === 'ranked' && !onSaleOnly;
    return (
      <div
        key={item.name}
        className={`wishlist-card ${hasDrop ? 'wishlist-card--drop' : ''} ${
          dragKey === item.key ? 'wishlist-card--dragging' : ''
        }`}
        draggable={draggable}
        onDragStart={
          draggable
            ? (e) => {
                setDragKey(item.key);
                e.dataTransfer.effectAllowed = 'move';
              }
            : undefined
        }
        onDragEnd={() => setDragKey(null)}
        onDragOver={
          draggable
            ? (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }
            : undefined
        }
        onDrop={
          draggable
            ? (e) => {
                e.preventDefault();
                if (dragKey && dragKey !== item.key) {
                  WishlistService.moveItem(dragKey, item.name);
                  loadItems();
                }
                setDragKey(null);
              }
            : undefined
        }
      >
        <div className="wishlist-card-art">
          {artwork ? (
            <LazyImage
              src={artwork}
              fallbackSrcs={fallbackArtwork}
              alt={item.name}
              placeholder={placeholder}
              className="game-image"
            />
          ) : (
            <div className="game-placeholder">
              <div className="platform-icon">🎮</div>
            </div>
          )}
        </div>
        <div className="wishlist-card-body">
          <div className="wishlist-card-title-row">
            <span className="wishlist-card-name">{item.name}</span>
            {game?.platform && platformIcons?.[game.platform] && (
              <span className="wishlist-card-platform">{platformIcons[game.platform]}</span>
            )}
            {review && (
              <span
                className={`wishlist-review-chip ${review.pct >= 70 ? 'wishlist-review-chip--good' : review.pct >= 40 ? 'wishlist-review-chip--mixed' : 'wishlist-review-chip--poor'}`}
                title={`${review.pct}% of ${'Steam'} reviews are positive`}
              >
                {review.desc} · {review.pct}%
              </span>
            )}
          </div>
          {currentPrice ? (
            <div className="wishlist-card-price">
              <span className="wishlist-price-current">
                {Number(currentPrice.price) === 0 ? 'Free' : formatPrice(currentPrice.price, currency)}
              </span>
              {discount > 0 && Number(currentPrice.retail) > Number(currentPrice.price) && (
                <span className="wishlist-price-retail">{formatPrice(currentPrice.retail, currency)}</span>
              )}
              {discount > 0 && <span className="wishlist-price-cut">-{discount}%</span>}
              {currentPrice.store && <span className="wishlist-price-store">{currentPrice.store}</span>}
            </div>
          ) : (
            <span className="wishlist-price-unavailable">Price unavailable</span>
          )}
          {verdict && (
            <span className={`wishlist-verdict wishlist-verdict--${verdict.kind}`}>
              {verdict.kind === 'wait' && verdict.reference != null
                ? `${verdict.label} (${formatPrice(verdict.reference, currency)})`
                : verdict.label}
            </span>
          )}
          {release?.released && <span className="wishlist-release-chip wishlist-release-chip--out-now">Out now</span>}
          {release && !release.released && (
            <span className="wishlist-release-chip">{ReleaseTrackerService.formatCountdown(release)}</span>
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
              <button className="wishlist-launch-btn" onClick={() => onLaunchGame(game)}>
                Launch
              </button>
            )}
            {currentPrice?.dealID && (
              <a
                className="wishlist-deal-link"
                href={`https://www.cheapshark.com/redirect?dealID=${encodeURIComponent(currentPrice.dealID)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View deal
              </a>
            )}
            <button
              className="wishlist-details-btn"
              onClick={() => setExpandedKey(expanded ? null : item.key)}
              title="Price history and all store offers"
            >
              {expanded ? 'Hide details' : deals.length > 1 ? `Details · ${deals.length} stores` : 'Details'}
            </button>
            <button className="wishlist-remove-btn" onClick={() => handleRemove(item.name)}>
              Remove
            </button>
          </div>
          {expanded && (
            <div className="wishlist-card-details">
              <PriceSparkline item={item} currency={currency} />
              {deals.length > 0 && (
                <div className="wishlist-stores">
                  <div className="wishlist-stores-title">
                    Best offers across {deals.length} store{deals.length !== 1 ? 's' : ''}
                  </div>
                  {deals.map((d, i) => (
                    <a
                      key={`${d.store}-${i}`}
                      className="wishlist-store-row"
                      href={
                        d.dealID
                          ? `https://www.cheapshark.com/redirect?dealID=${encodeURIComponent(d.dealID)}`
                          : undefined
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="wishlist-store-name">{d.store}</span>
                      <span className="wishlist-store-cut">{d.cut > 0 ? `-${Math.round(d.cut)}%` : ''}</span>
                      <span className="wishlist-store-price">
                        {d.price === 0 ? 'Free' : formatPrice(d.price, currency)}
                      </span>
                    </a>
                  ))}
                </div>
              )}
              <label className="wishlist-notes-label">
                Notes
                <textarea
                  className="wishlist-notes-input"
                  defaultValue={item.notes || ''}
                  placeholder="Why this one? Wait for a bigger cut?"
                  rows={2}
                  onBlur={(e) => {
                    if (e.target.value !== (item.notes || '')) {
                      WishlistService.setNotes(item.name, e.target.value);
                    }
                  }}
                />
              </label>
            </div>
          )}
        </div>
      </div>
    );
  };
  return (
    <div className="results-section">
      <div className="wishlist-header-bar">
        <div className="wishlist-header-left">
          {alertCount > 0 && (
            <span className="wishlist-badge wishlist-badge--alert">
              {alertCount} active alert{alertCount > 1 ? 's' : ''}
            </span>
          )}
          {drops.length > 0 && (
            <span className="wishlist-badge wishlist-badge--drop">
              {drops.length} price drop{drops.length > 1 ? 's' : ''}
            </span>
          )}
          <span className="wishlist-count">
            {items.length} game{items.length !== 1 ? 's' : ''}
          </span>
          {totals.priced > 0 && (
            <span className="wishlist-totals" title="What your wishlist would cost at current best prices">
              {formatPrice(totals.sum, currency)} total
              {totals.save > 0 && ` · save ${formatPrice(totals.save, currency)}`}
            </span>
          )}
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

      {items.length > 0 && (
        <div className="wishlist-toolbar">
          <select
            className="wishlist-sort-select"
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value)}
            title="Sort the wishlist"
          >
            <option value="ranked">Your ranking</option>
            <option value="price">Price: low → high</option>
            <option value="discount">Biggest discount</option>
            <option value="added">Recently added</option>
            <option value="name">Name A–Z</option>
            <option value="release">Release date</option>
          </select>
          <label className="wishlist-onsale-toggle">
            <input type="checkbox" checked={onSaleOnly} onChange={(e) => setOnSaleOnly(e.target.checked)} />
            On sale only
          </label>
          {sortMode === 'ranked' && !onSaleOnly && items.length > 1 && (
            <span className="wishlist-drag-hint">drag cards to rank</span>
          )}
        </div>
      )}

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

      {buyEnabled && items.length > 0 && (
        <div className="wishlist-suggestions">
          <div className="wishlist-suggestions-header">
            <span className="wishlist-suggestions-title">What to buy next</span>
            <div className="wishlist-suggestions-filters">
              <select
                className="wishlist-filter-select"
                value={filterGenre}
                onChange={(e) => setFilterGenre(e.target.value)}
                title="Filter suggestions by genre"
              >
                <option value="">Any genre</option>
                {(buySnapshot?.availableGenres || []).map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              <div className="wishlist-filter-price">
                <span>Max {getCurrencySymbol(getCurrentCurrency())}</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="wishlist-filter-price-input"
                  value={filterMaxPrice}
                  onChange={(e) => setFilterMaxPrice(e.target.value)}
                  placeholder="Any"
                  title="Only suggest games at or below this price"
                />
              </div>
              {(filterGenre || filterMaxPrice) && (
                <button
                  type="button"
                  className="wishlist-filter-clear"
                  onClick={() => {
                    setFilterGenre('');
                    setFilterMaxPrice('');
                  }}
                >
                  Clear
                </button>
              )}
              <div className="familiarity-toggle-group">
                <div className="familiarity-toggle-buttons">
                  <button
                    className={`familiarity-btn ${familiarityBias === 'familiar' ? 'selected' : ''}`}
                    onClick={() => {
                      setFamiliarityBias('familiar');
                      setFamiliarityBiasState('familiar');
                    }}
                  >
                    Familiar
                  </button>
                  <button
                    className={`familiarity-btn ${familiarityBias === null ? 'selected' : ''}`}
                    onClick={() => {
                      setFamiliarityBias(null);
                      setFamiliarityBiasState(null);
                    }}
                  >
                    Balanced
                  </button>
                  <button
                    className={`familiarity-btn ${familiarityBias === 'fresh' ? 'selected' : ''}`}
                    onClick={() => {
                      setFamiliarityBias('fresh');
                      setFamiliarityBiasState('fresh');
                    }}
                  >
                    Fresh
                  </button>
                </div>
              </div>
            </div>
          </div>
          {(buySnapshot?.entries || []).length === 0 ? (
            <p className="wishlist-suggestions-empty">{buySnapshot?.message || 'No suggestions yet.'}</p>
          ) : (
            <div className="wishlist-suggestions-list">
              {buySnapshot.entries.map((entry) => {
                const g = entry.game || {};
                const m = entry.meta || {};
                const reason = m.primaryReason || (m.buyReasons || [])[0];
                const price = m.wishlistItem?.currentPrice;
                const steamUrl = g.appid
                  ? `https://store.steampowered.com/app/${g.appid}`
                  : `https://store.steampowered.com/search/?term=${encodeURIComponent(g.name)}`;
                return (
                  <div key={entry.id || g.name} className="wishlist-suggestion">
                    <div className="wishlist-suggestion-main">
                      {m.conviction === 'strong' && (
                        <span className="wishlist-suggestion-score strong">Strong fit</span>
                      )}
                      <div className="wishlist-suggestion-text">
                        <span className="wishlist-suggestion-name">
                          {g.name}
                          {buySnapshot?.familiarityBias && (
                            <span className={`familiarity-badge ${buySnapshot.familiarityBias}`}>
                              {buySnapshot.familiarityBias}
                            </span>
                          )}
                        </span>
                        {reason && <span className="wishlist-suggestion-reason">{reason}</span>}
                      </div>
                    </div>
                    <div className="wishlist-suggestion-side">
                      {price && <span className="wishlist-suggestion-price">{formatPrice(price.price, currency)}</span>}
                      <a href={steamUrl} target="_blank" rel="noopener noreferrer" className="wishlist-search-add">
                        View
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {searchResults && (
        <div className="wishlist-search-results">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Search results</span>
            <button className="wishlist-search-add" onClick={clearSearch}>
              Close
            </button>
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
                        <span
                          style={{
                            fontSize: '0.7rem',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(108,92,231,0.2)',
                            color: '#a29bfe',
                          }}
                        >
                          Library
                        </span>
                      )}
                      {result.source === 'cheapshark' && (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(34,197,94,0.2)',
                            color: '#22c55e',
                          }}
                        >
                          Store
                        </span>
                      )}
                      {result.source === 'custom' && (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(255,255,255,0.08)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          Custom
                        </span>
                      )}
                    </div>
                    {alreadyAdded ? (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Added</span>
                    ) : wasJustAdded ? (
                      <span style={{ fontSize: '0.78rem', color: '#22c55e', fontWeight: 600 }}>Added!</span>
                    ) : (
                      <button className="wishlist-search-add" onClick={() => handleAddFromSearch(result)}>
                        Add
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {releasingSoonItems.length > 0 && (
        <div className="wishlist-releasing-soon">
          <h3 className="wishlist-releasing-title">Releasing soon</h3>
          <div className="wishlist-grid">{releasingSoonItems.map(renderWishlistCard)}</div>
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
        <div className="wishlist-grid">{displayItems.map(renderWishlistCard)}</div>
      )}
    </div>
  );
}
