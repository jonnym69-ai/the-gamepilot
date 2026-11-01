/**
 * Trending — Steam's global most-played chart (top ~50), crossed with the
 * local library.
 *
 * Chart rows come from the shared `steam-most-played` IPC and only carry
 * { appid, rank, concurrent, peak } — no titles. A title is shown only when it
 * can be resolved truthfully: from a matching local-library game, or from
 * Steam's own store metadata via `steam-store-details`. When neither works the
 * row is labelled by its real app id instead of a guessed name.
 *
 * Rank movement is measured against the last snapshot this page itself
 * recorded (`trendingRankSnapshotV1`); on the first visit there is nothing
 * trustworthy to compare, so no arrows are shown.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Flame,
  Play,
  RefreshCw,
} from 'lucide-react';
import NavBar from './NavBar';
import GameModal from './components/GameModal';
import LazyImage from './components/LazyImage';
import StorageService from './services/StorageService';
import SteamOwnedGamesService from './services/SteamOwnedGamesService';
import { getElectronAPI, openExternalUrl } from './services/ElectronBridge';
import { getCanonicalGameKey } from './services/LibraryDataService';
import { resolveGameArtworkBundle } from './services/GameArtworkService';
import { getBlendedPlaytimeMinutes, isGameUnplayed, isNonGameTitle } from './services/gameClassification';
import WishlistService from './services/WishlistService';
import formatPlaytime from './utils/formatPlaytime';
import './Trending.css';

const CHART_LIMIT = 50;
const DETAILS_CONCURRENCY = 4;
const RANK_SNAPSHOT_KEY = 'trendingRankSnapshotV1';
const FAVORITES_STORAGE_KEY = 'favorites';

const getFavoriteGameKey = (game) => game?.appid || game?.app_id || game?.steamAppId || game?.name;

const getAppId = (game) => {
  const id = Number(game?.appid ?? game?.steamAppId ?? game?.steam_appid);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

const formatCount = (value) => new Intl.NumberFormat('en-GB').format(value);

const formatFetchedAt = (timestamp) => {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return '';
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
};

const readRankSnapshot = () => {
  try {
    const snapshot = StorageService.get(RANK_SNAPSHOT_KEY, null);
    if (!snapshot || typeof snapshot !== 'object' || !snapshot.ranks) return null;
    return snapshot;
  } catch {
    return null;
  }
};

// Store-detail lookups trickle in a few at a time so opening the page doesn't
// fire ~50 store requests at once. The main process caches each result for a
// day, so repeat visits are nearly free.
const runWithConcurrency = async (items, limit, worker) => {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length > 0) {
      const next = queue.shift();
      if (next !== undefined) await worker(next);
    }
  });
  await Promise.all(runners);
};

function Trending({
  library = [],
  onLaunchGame,
  onToggleFavorite,
  onToggleHidden,
  onUpdateRating,
  onUpdateCollections,
  onUpdateCompletion,
  onUpdateNotes,
  onUpdateCoverArt,
  onUpdateMood,
  onAddSessionNote,
  onTogglePlayedElsewhere,
  onUpdateMetadata,
}) {
  const navigate = useNavigate();
  const [chart, setChart] = useState({ status: 'loading', rows: [], fetchedAt: null, unavailable: false });
  const [details, setDetails] = useState({});
  const [rankDelta, setRankDelta] = useState({});
  const [modalGame, setModalGame] = useState(null);
  const [favorites, setFavorites] = useState(() => {
    try {
      const stored = StorageService.get(FAVORITES_STORAGE_KEY, []);
      return Array.isArray(stored) ? stored : [];
    } catch {
      return [];
    }
  });
  const [wishlistVersion, setWishlistVersion] = useState(0);
  const detailsInFlight = useRef(new Set());
  const detailsResolved = useRef(new Set());

  // Steam library games by appid — the only matching key the chart gives us
  // directly. Rows that miss this map fall back to a canonical-name match once
  // store details resolve a title, so games owned on other launchers (e.g.
  // Red Dead Redemption 2 via Rockstar) are still recognised.
  const libraryByAppid = useMemo(
    () =>
      new Map(
        (Array.isArray(library) ? library : [])
          .map((game) => [getAppId(game), game])
          .filter(([appid, game]) => appid !== null && !isNonGameTitle(game))
      ),
    [library]
  );

  // Every library game by canonical name — same conservative keying
  // LibraryDataService uses for cross-platform dedupe.
  const libraryByName = useMemo(
    () =>
      new Map(
        (Array.isArray(library) ? library : [])
          .map((game) => [getCanonicalGameKey(game), game])
          .filter(([key, game]) => Boolean(key) && !isNonGameTitle(game))
      ),
    [library]
  );

  // Owned-but-not-installed Steam appids from the opt-in owned-games cache.
  // Read only — no fetch; an empty map just means we can't distinguish
  // "owned elsewhere on Steam" from "not owned", which is fine.
  const ownedNotInstalledAppIds = useMemo(() => {
    try {
      if (!SteamOwnedGamesService.isEnabled()) return new Set();
      const cached = SteamOwnedGamesService.getCached();
      return new Set(
        (cached?.games || [])
          .map((game) => Number(game?.appid))
          .filter((appid) => Number.isSafeInteger(appid) && appid > 0)
      );
    } catch {
      return new Set();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart.status]);

  const resolveRowDetails = useCallback(async (rows, api) => {
    if (typeof api?.steamStoreDetails !== 'function') return;
    await runWithConcurrency(rows, DETAILS_CONCURRENCY, async (row) => {
      if (detailsInFlight.current.has(row.appid) || detailsResolved.current.has(row.appid)) return;
      detailsInFlight.current.add(row.appid);
      try {
        const result = await api.steamStoreDetails(row.appid);
        const data = result?.ok && result.data?.name ? result.data : null;
        if (data) detailsResolved.current.add(row.appid);
        setDetails((current) => ({
          ...current,
          // Merge on failure so a catalogue-resolved name isn't wiped out.
          [row.appid]: data
            ? { name: data.name, capsule_image: data.capsule_image || null, header_image: data.header_image || null }
            : { ...(current[row.appid] || {}), unavailable: true },
        }));
      } catch {
        setDetails((current) => ({
          ...current,
          [row.appid]: { ...(current[row.appid] || {}), unavailable: true },
        }));
      } finally {
        detailsInFlight.current.delete(row.appid);
      }
    });
  }, []);

  const loadChart = useCallback(async () => {
    const api = getElectronAPI();
    if (!api || typeof api.steamMostPlayed !== 'function') {
      setChart({ status: 'unavailable', rows: [], fetchedAt: null, unavailable: true });
      return;
    }

    setChart({ status: 'loading', rows: [], fetchedAt: null, unavailable: false });
    try {
      const result = await api.steamMostPlayed();
      if (!result?.ok || !Array.isArray(result.rows)) {
        setChart({ status: 'error', rows: [], fetchedAt: null, unavailable: false });
        return;
      }

      const seenAppIds = new Set();
      const rows = result.rows
        .filter((row) => {
          if (!Number.isSafeInteger(row?.appid) || row.appid <= 0 || seenAppIds.has(row.appid)) return false;
          seenAppIds.add(row.appid);
          return true;
        })
        .slice(0, CHART_LIMIT);
      if (rows.length === 0) {
        setChart({ status: 'empty', rows: [], fetchedAt: result.fetchedAt || null, unavailable: false });
        return;
      }

      // Movement is only honest against a snapshot this page recorded earlier.
      const snapshot = readRankSnapshot();
      const deltas = {};
      if (snapshot?.ranks) {
        rows.forEach((row) => {
          const previous = snapshot.ranks[row.appid];
          if (Number.isSafeInteger(previous) && previous !== row.rank) {
            deltas[row.appid] = previous - row.rank;
          }
        });
      }
      setRankDelta(deltas);
      try {
        StorageService.set(RANK_SNAPSHOT_KEY, {
          savedAt: Date.now(),
          ranks: Object.fromEntries(rows.map((row) => [row.appid, row.rank])),
        });
      } catch {
        /* movement is optional */
      }

      setChart({ status: 'ready', rows, fetchedAt: result.fetchedAt || null, unavailable: false });
      const unmatched = rows.filter((row) => !libraryByAppid.has(row.appid));
      // Titles resolve from Steam's app catalogue in one request — much more
      // reliable than per-game store lookups, which rate-limit under a burst
      // of ~50 and leave rows titled "Steam app N".
      if (typeof api.steamAppNames === 'function' && unmatched.length > 0) {
        api
          .steamAppNames(unmatched.map((row) => row.appid))
          .then((names) => {
            if (!names?.ok || !names.names || typeof names.names !== 'object') return;
            setDetails((current) => {
              const next = { ...current };
              Object.entries(names.names).forEach(([appid, name]) => {
                if (typeof name === 'string' && name && !next[appid]?.name) {
                  next[appid] = { ...(next[appid] || {}), name };
                }
              });
              return next;
            });
          })
          .catch(() => {});
      }
      // Only unowned rows need a store lookup — owned names come from the library.
      resolveRowDetails(unmatched, api).catch(() => {});
    } catch {
      setChart({ status: 'error', rows: [], fetchedAt: null, unavailable: false });
    }
  }, [resolveRowDetails, libraryByAppid]);

  useEffect(() => {
    loadChart();
  }, [loadChart]);

  const wishlistEnabled = useMemo(() => {
    try {
      return WishlistService.isEnabled();
    } catch {
      return false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wishlistVersion]);

  const toggleFavorite = useCallback((key) => {
    if (key === undefined || key === null) return;
    setFavorites((previous) => {
      const exists = previous.includes(key);
      const next = exists ? previous.filter((item) => item !== key) : [...previous, key];
      try {
        StorageService.set(FAVORITES_STORAGE_KEY, next);
      } catch {
        /* persistence optional */
      }
      return next;
    });
  }, []);

  const toggleWishlist = useCallback((title, row) => {
    const name = String(title || '').trim();
    if (!name) return;
    try {
      if (WishlistService.isWishlisted(name)) {
        WishlistService.removeGame(name);
      } else {
        WishlistService.addGame({
          name,
          appid: row.appid,
          platform: 'Steam',
          image: row.detail?.capsule_image || row.detail?.header_image || '',
        });
      }
      setWishlistVersion((version) => version + 1);
    } catch {
      /* wishlist storage is best-effort */
    }
  }, []);

  // Plain function — re-evaluated per render; wishlistVersion bumps force a
  // fresh read of the wishlist store.
  const isWishlisted = (title) => {
    try {
      return Boolean(title) && WishlistService.isWishlisted(title);
    } catch {
      return false;
    }
  };

  const entries = useMemo(
    () =>
      chart.rows.map((row) => {
        const detail = details[row.appid] || null;
        // Appid match first (Steam-installed), then a canonical-name match on
        // the resolved store title so non-Steam copies (Rockstar, Epic, GOG)
        // are recognised too.
        const game =
          libraryByAppid.get(row.appid) ||
          (detail?.name ? libraryByName.get(getCanonicalGameKey({ name: detail.name })) || null : null);
        const title = game?.name || detail?.name || null;
        const ownedElsewhere = !game && ownedNotInstalledAppIds.has(row.appid);
        return { row, game, detail, title, ownedElsewhere };
      }),
    [chart.rows, details, libraryByAppid, libraryByName, ownedNotInstalledAppIds]
  );

  const ownedCount = entries.filter((entry) => entry.game).length;

  return (
    <div className="trending-page">
      <NavBar />
      <div className="trending-page-content">
        <div className="trending-page-header">
          <button className="trending-back-btn" onClick={() => navigate('/')} title="Back to Home">
            <ArrowLeft size={20} />
          </button>
          <div className="trending-title-section">
            <h1 className="trending-page-title">
              <Flame size={22} aria-hidden="true" /> Trending on Steam
            </h1>
            <p className="trending-page-subtitle">
              Steam's live most-played chart — the top {CHART_LIMIT} games by concurrent players right now.
              {chart.status === 'ready' && ownedCount > 0
                ? ` ${ownedCount} ${ownedCount === 1 ? 'is' : 'are'} in your library.`
                : ''}
            </p>
          </div>
          {chart.status !== 'unavailable' && (
            <button
              type="button"
              className="trending-refresh-btn"
              onClick={loadChart}
              disabled={chart.status === 'loading'}
            >
              <RefreshCw size={14} aria-hidden="true" /> Refresh
            </button>
          )}
        </div>

        {chart.status === 'loading' && <p className="trending-note">Checking Steam's live chart…</p>}

        {chart.status === 'unavailable' && (
          <p className="trending-note">
            Steam's live most-played chart needs the desktop app — this view doesn't fetch in a browser.
          </p>
        )}

        {chart.status === 'error' && (
          <p className="trending-note">
            Couldn't reach Steam right now.{' '}
            <button type="button" className="trending-retry" onClick={loadChart}>
              <RefreshCw size={12} aria-hidden="true" /> Retry
            </button>
          </p>
        )}

        {chart.status === 'empty' && <p className="trending-note">Steam returned an empty chart right now.</p>}

        {chart.status === 'ready' && (
          <>
            <ol className="trending-list">
              {entries.map(({ row, game, detail, title, ownedElsewhere }) => {
                const artworkGame = game || {
                  appid: row.appid,
                  name: title || `Steam app ${row.appid}`,
                  platform: 'Steam',
                  capsule_image: detail?.capsule_image || null,
                  header_image: detail?.header_image || null,
                };
                const { artwork, placeholder } = resolveGameArtworkBundle(artworkGame, { surface: 'portrait' });
                const delta = rankDelta[row.appid];
                const owned = Boolean(game);
                const minutes = owned ? getBlendedPlaytimeMinutes(game) : 0;
                const wishlisted = isWishlisted(title);
                return (
                  <li key={row.appid} className="trending-item">
                    <div className="trending-row">
                      <span className={`trending-rank${row.rank <= 10 ? ' podium' : ''}`}>#{row.rank}</span>
                      <span
                        className={`trending-delta${delta > 0 ? ' up' : ''}${delta < 0 ? ' down' : ''}`}
                        title={delta ? 'Change since your last check of this chart' : ''}
                      >
                        {delta > 0 && (
                          <>
                            <ArrowUp size={12} aria-hidden="true" />
                            {delta}
                          </>
                        )}
                        {delta < 0 && (
                          <>
                            <ArrowDown size={12} aria-hidden="true" />
                            {Math.abs(delta)}
                          </>
                        )}
                      </span>
                      <button
                        type="button"
                        className="trending-art"
                        onClick={() => owned && setModalGame(game)}
                        disabled={!owned}
                        aria-label={owned ? `Open ${title}` : undefined}
                        title={owned ? `Open ${title}` : title || `Steam app ${row.appid}`}
                      >
                        <LazyImage src={artwork} alt="" placeholder={placeholder} />
                      </button>
                      <span className="trending-info">
                        <span className="trending-name">{title || `Steam app ${row.appid}`}</span>
                        <span className="trending-meta">
                          {formatCount(row.concurrent)} playing now
                          {Number.isSafeInteger(row.peak) && row.peak > 0 ? ` · peak ${formatCount(row.peak)}` : ''}
                          {detail?.unavailable && !title ? ' · store details unavailable' : ''}
                        </span>
                        <span className="trending-badges">
                          {owned && (
                            <>
                              <span className="trending-badge owned">
                                In library
                                {game.platform && game.platform !== 'Steam' ? ` · ${game.platform}` : ''}
                              </span>
                              {isGameUnplayed(game) ? (
                                <span className="trending-badge unplayed">Unplayed</span>
                              ) : (
                                <span className="trending-badge">{formatPlaytime(minutes)} played</span>
                              )}
                            </>
                          )}
                          {!owned && ownedElsewhere && (
                            <span className="trending-badge owned-not-installed">Owned · not installed</span>
                          )}
                          {!owned && !ownedElsewhere && <span className="trending-badge">Not in your library</span>}
                          {wishlisted && <span className="trending-badge wishlisted">Wishlisted</span>}
                        </span>
                      </span>
                      <span className="trending-actions">
                        {owned && (
                          <button
                            type="button"
                            className="trending-action launch"
                            onClick={() => onLaunchGame?.(game)}
                            aria-label={`Launch ${title}`}
                            title={`Launch ${title}`}
                          >
                            <Play size={14} aria-hidden="true" /> Launch
                          </button>
                        )}
                        {!owned && (
                          <button
                            type="button"
                            className="trending-action store"
                            onClick={() => openExternalUrl(`https://store.steampowered.com/app/${row.appid}/`)}
                            aria-label={`View ${title || `Steam app ${row.appid}`} on Steam`}
                            title={`View ${title || `Steam app ${row.appid}`} on Steam`}
                          >
                            <ExternalLink size={14} aria-hidden="true" /> View on Steam
                          </button>
                        )}
                        {wishlistEnabled && title && !owned && (
                          <button
                            type="button"
                            className={`trending-action${wishlisted ? ' active' : ''}`}
                            onClick={() => toggleWishlist(title, { appid: row.appid, detail })}
                            aria-label={
                              wishlisted ? `Remove ${title} from your wishlist` : `Add ${title} to your wishlist`
                            }
                            title={wishlisted ? `Remove ${title} from your wishlist` : `Add ${title} to your wishlist`}
                            aria-pressed={wishlisted}
                          >
                            {wishlisted ? (
                              <>
                                <BookmarkCheck size={14} aria-hidden="true" /> Wishlisted
                              </>
                            ) : (
                              <>
                                <Bookmark size={14} aria-hidden="true" /> Wishlist
                              </>
                            )}
                          </button>
                        )}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
            <p className="trending-fetched">
              Live Steam data{chart.fetchedAt ? ` · updated ${formatFetchedAt(chart.fetchedAt)}` : ''}.
              {rankDelta && Object.keys(rankDelta).length > 0 ? ' Arrows compare to your last check.' : ''}
            </p>
          </>
        )}
      </div>

      {modalGame && (
        <GameModal
          game={modalGame}
          library={library}
          isOpen={Boolean(modalGame)}
          onClose={() => setModalGame(null)}
          onLaunch={onLaunchGame}
          onSelectGame={(next) => {
            const match = (Array.isArray(library) ? library : []).find(
              (item) => getCanonicalGameKey(item) === getCanonicalGameKey(next) || item.name === next?.name
            );
            if (match) setModalGame(match);
          }}
          onToggleFavorite={(key) => {
            toggleFavorite(key);
            if (typeof onToggleFavorite === 'function') onToggleFavorite(key);
          }}
          isFavorite={favorites.includes(getFavoriteGameKey(modalGame))}
          onUpdateRating={onUpdateRating}
          onUpdateCollections={onUpdateCollections}
          onToggleHidden={onToggleHidden}
          onUpdateCompletion={onUpdateCompletion}
          onUpdateNotes={onUpdateNotes}
          onUpdateCoverArt={onUpdateCoverArt}
          onUpdateMood={onUpdateMood}
          onAddSessionNote={onAddSessionNote}
          onTogglePlayedElsewhere={onTogglePlayedElsewhere}
          onUpdateMetadata={onUpdateMetadata}
        />
      )}
    </div>
  );
}

export default Trending;
