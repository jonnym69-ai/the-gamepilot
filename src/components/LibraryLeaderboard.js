import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Trophy } from 'lucide-react';
import StorageService from '../services/StorageService';
import {
  getBlendedPlaytimeMinutes,
  getTopPlayedGames,
  isNonGameTitle,
  isTopShelfRank,
} from '../services/gameClassification';
import { getCanonicalGameKey } from '../services/LibraryDataService';
import { resolveGameArtworkBundle } from '../services/GameArtworkService';
import { getElectronAPI } from '../services/ElectronBridge';
import formatPlaytime from '../utils/formatPlaytime';
import LazyImage from './LazyImage';
import './LibraryLeaderboard.css';

const LIMIT_KEY = 'libraryLeaderboardLimitV1';
const MODE_KEY = 'libraryLeaderboardModeV1';
const LIMITS = [10, 20];
const MODES = [
  { id: 'playtime', label: 'Your hours' },
  { id: 'players', label: 'Playing now' },
];
const SUPPLEMENT_TARGET = 8;
const SUPPLEMENT_CAP = 10;

const readLimit = () => {
  try {
    const stored = StorageService.get(LIMIT_KEY, 10);
    return LIMITS.includes(stored) ? stored : 10;
  } catch {
    return 10;
  }
};

const readMode = () => {
  try {
    const stored = StorageService.get(MODE_KEY, 'playtime');
    return MODES.some((mode) => mode.id === stored) ? stored : 'playtime';
  } catch {
    return 'playtime';
  }
};

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

const LibraryLeaderboard = ({ library = [], onLaunchGame }) => {
  const [limit, setLimit] = useState(readLimit);
  const [mode, setMode] = useState(readMode);
  const [playersState, setPlayersState] = useState({ status: 'idle', rows: [], fetchedAt: null, noApi: false });

  const entries = useMemo(() => getTopPlayedGames(library, limit), [library, limit]);

  const loadPlayers = useCallback(async () => {
    const api = getElectronAPI();
    if (!api || typeof api.steamMostPlayed !== 'function') {
      setPlayersState({ status: 'error', rows: [], fetchedAt: null, noApi: true });
      return;
    }

    const steamGames = (Array.isArray(library) ? library : [])
      .map((game) => ({ game, appid: getAppId(game) }))
      .filter((entry) => entry.appid !== null && !isNonGameTitle(entry.game));
    if (steamGames.length === 0) {
      setPlayersState({ status: 'empty', rows: [], fetchedAt: null, noApi: false });
      return;
    }
    const byAppid = new Map(steamGames.map((entry) => [entry.appid, entry.game]));

    let chartRows = [];
    let fetchedAt = null;
    try {
      const result = await api.steamMostPlayed();
      if (result?.ok && Array.isArray(result.rows)) {
        chartRows = result.rows;
        fetchedAt = result.fetchedAt || Date.now();
      }
    } catch {
      /* per-game counts still attempted below */
    }

    const matched = chartRows
      .filter((row) => byAppid.has(row.appid))
      .map((row) => ({
        game: byAppid.get(row.appid),
        globalRank: row.rank,
        concurrent: row.concurrent,
        peak: row.peak,
      }));

    const rows = [...matched];
    if (matched.length < SUPPLEMENT_TARGET && typeof api.steamPlayerCount === 'function') {
      const chartAppids = new Set(chartRows.map((row) => row.appid));
      const extras = steamGames
        .filter((entry) => !chartAppids.has(entry.appid))
        .sort((a, b) => getBlendedPlaytimeMinutes(b.game) - getBlendedPlaytimeMinutes(a.game))
        .slice(0, SUPPLEMENT_CAP);
      const counts = await Promise.all(
        extras.map(async (entry) => {
          try {
            const res = await api.steamPlayerCount(entry.appid);
            return res?.ok && Number.isSafeInteger(res.count)
              ? { game: entry.game, globalRank: null, concurrent: res.count, peak: null }
              : null;
          } catch {
            return null;
          }
        })
      );
      rows.push(...counts.filter(Boolean).sort((a, b) => b.concurrent - a.concurrent));
    }

    setPlayersState({
      status: rows.length > 0 || chartRows.length > 0 ? 'ready' : 'error',
      rows,
      fetchedAt,
      noApi: false,
    });
  }, [library]);

  useEffect(() => {
    if (mode !== 'players' || playersState.status !== 'idle') return;
    setPlayersState((current) => ({ ...current, status: 'loading' }));
    loadPlayers().catch(() => {
      setPlayersState({ status: 'error', rows: [], fetchedAt: null, noApi: false });
    });
  }, [mode, playersState.status, loadPlayers]);

  const chooseLimit = (next) => {
    setLimit(next);
    try {
      StorageService.set(LIMIT_KEY, next);
    } catch {
      /* persistence optional */
    }
  };

  const chooseMode = (next) => {
    setMode(next);
    try {
      StorageService.set(MODE_KEY, next);
    } catch {
      /* persistence optional */
    }
  };

  if (entries.length === 0 && mode === 'playtime') return null;

  const playersRows = playersState.rows.slice(0, limit);

  return (
    <section className="library-leaderboard" aria-labelledby="library-leaderboard-heading">
      <div className="library-leaderboard-header">
        <div>
          <h3 id="library-leaderboard-heading">{mode === 'players' ? 'Trending in your library' : 'Your top shelf'}</h3>
          <p className="library-leaderboard-sub">
            {mode === 'players'
              ? "Steam's live most-played chart, crossed with games you own."
              : 'All-time most played across your library — ranked by your own hours, not a store chart.'}
          </p>
        </div>
        <div className="library-leaderboard-controls">
          <div className="library-leaderboard-limits" role="group" aria-label="Board type">
            {MODES.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={`library-leaderboard-limit${mode === id ? ' active' : ''}`}
                aria-pressed={mode === id}
                onClick={() => chooseMode(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="library-leaderboard-limits" role="group" aria-label="Board size">
            {LIMITS.map((size) => (
              <button
                key={size}
                type="button"
                className={`library-leaderboard-limit${limit === size ? ' active' : ''}`}
                aria-pressed={limit === size}
                onClick={() => chooseLimit(size)}
              >
                Top {size}
              </button>
            ))}
          </div>
        </div>
      </div>

      {mode === 'players' ? (
        <div className="library-leaderboard-live">
          {playersState.status === 'loading' && (
            <p className="library-leaderboard-note">Checking Steam's live chart…</p>
          )}
          {playersState.status === 'error' && (
            <p className="library-leaderboard-note">
              {playersState.noApi ? 'Live player counts need the desktop app.' : "Couldn't reach Steam right now."}{' '}
              {!playersState.noApi && (
                <button
                  type="button"
                  className="library-leaderboard-retry"
                  onClick={() => setPlayersState({ status: 'idle', rows: [], fetchedAt: null, noApi: false })}
                >
                  <RefreshCw size={12} aria-hidden="true" /> Retry
                </button>
              )}
            </p>
          )}
          {playersState.status === 'empty' && (
            <p className="library-leaderboard-note">No Steam games in your library to chart.</p>
          )}
          {playersState.status === 'ready' && playersRows.length === 0 && (
            <p className="library-leaderboard-note">None of your games are on Steam's live chart right now.</p>
          )}
          {playersRows.length > 0 && (
            <>
              <ol className="library-leaderboard-list">
                {playersRows.map(({ game, globalRank, concurrent, peak }) => {
                  const { artwork, placeholder } = resolveGameArtworkBundle(game, { surface: 'portrait' });
                  return (
                    <li key={getCanonicalGameKey(game) || getAppId(game) || game.name}>
                      <button
                        type="button"
                        className="library-leaderboard-row"
                        aria-label={`Launch ${game.name}`}
                        title={`Launch ${game.name}`}
                        onClick={() => onLaunchGame?.(game)}
                      >
                        <span className={`library-leaderboard-rank${globalRank && globalRank <= 10 ? ' podium' : ''}`}>
                          {globalRank ? `#${globalRank}` : '·'}
                        </span>
                        <span className="library-leaderboard-art">
                          <LazyImage src={artwork} alt="" placeholder={placeholder} />
                        </span>
                        <span className="library-leaderboard-info">
                          <span className="library-leaderboard-name">{game.name}</span>
                          <span className="library-leaderboard-meta">
                            {formatCount(concurrent)} playing now
                            {peak ? ` · peak ${formatCount(peak)}` : ''}
                            {globalRank ? '' : ' · off the top 100'}
                          </span>
                        </span>
                        {globalRank && globalRank <= 10 && (
                          <span className="library-leaderboard-trophy">
                            <Trophy size={13} aria-hidden="true" />
                            Steam top 10
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ol>
              {playersState.fetchedAt && (
                <p className="library-leaderboard-fetched">
                  Live Steam data · updated {formatFetchedAt(playersState.fetchedAt)}
                </p>
              )}
            </>
          )}
        </div>
      ) : (
        <ol className="library-leaderboard-list">
          {entries.map(({ game, rank, minutes, total }) => {
            const { artwork, placeholder } = resolveGameArtworkBundle(game, { surface: 'portrait' });
            const topShelf = isTopShelfRank({ rank, total, minutes });
            return (
              <li key={getCanonicalGameKey(game) || game.appid || game.name}>
                <button
                  type="button"
                  className="library-leaderboard-row"
                  aria-label={`Launch ${game.name}`}
                  title={`Launch ${game.name}`}
                  onClick={() => onLaunchGame?.(game)}
                >
                  <span className={`library-leaderboard-rank${rank <= 3 ? ' podium' : ''}`}>#{rank}</span>
                  <span className="library-leaderboard-art">
                    <LazyImage src={artwork} alt="" placeholder={placeholder} />
                  </span>
                  <span className="library-leaderboard-info">
                    <span className="library-leaderboard-name">{game.name}</span>
                    <span className="library-leaderboard-meta">
                      {game.platform ? `${game.platform} · ` : ''}
                      {formatPlaytime(minutes)} played
                    </span>
                  </span>
                  {topShelf && (
                    <span className="library-leaderboard-trophy">
                      <Trophy size={13} aria-hidden="true" />
                      Top shelf
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
};

export default LibraryLeaderboard;
