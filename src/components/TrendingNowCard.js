import React, { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { isNonGameTitle } from '../services/gameClassification';
import { getCanonicalGameKey } from '../services/LibraryDataService';
import { resolveGameArtworkBundle } from '../services/GameArtworkService';
import { getElectronAPI } from '../services/ElectronBridge';
import LazyImage from './LazyImage';
import './TrendingNowCard.css';

const MAX_PICKS = 5;

const getAppId = (game) => {
  const id = Number(game?.appid ?? game?.steamAppId ?? game?.steam_appid);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

const formatCount = (value) => new Intl.NumberFormat('en-GB').format(value);

/**
 * "Trending in your library" — your owned Steam games that are on Steam's
 * live most-played chart right now. Uses the same cached `steamMostPlayed`
 * IPC as the Activity leaderboard, so it's one shared fetch, not a new
 * pipeline. Steam-only: other launchers publish no public player counts.
 * Hides entirely without the bridge, an error, or zero matches.
 */
export default function TrendingNowCard({ library = [], onLaunchGame }) {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    const api = getElectronAPI();
    if (!api || typeof api.steamMostPlayed !== 'function') return undefined;
    const byAppid = new Map(
      (Array.isArray(library) ? library : [])
        .map((game) => [getAppId(game), game])
        .filter(([appid, game]) => appid !== null && !isNonGameTitle(game))
    );
    if (byAppid.size === 0) return undefined;

    let cancelled = false;
    api
      .steamMostPlayed()
      .then((result) => {
        if (cancelled || !result?.ok || !Array.isArray(result.rows)) return;
        const matched = result.rows
          .filter((row) => byAppid.has(row.appid))
          .slice(0, MAX_PICKS)
          .map((row) => ({ game: byAppid.get(row.appid), rank: row.rank, concurrent: row.concurrent }));
        setRows(matched);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [library]);

  if (!rows || rows.length === 0) return null;

  return (
    <div className="trending-now" aria-label="Trending in your library">
      <div className="trending-now-header">
        <Flame size={15} aria-hidden="true" />
        <span className="trending-now-title">Trending in your library</span>
        <span className="trending-now-sub">On Steam's live most-played chart</span>
      </div>
      <div className="trending-now-row">
        {rows.map(({ game, rank, concurrent }) => {
          const { artwork, placeholder } = resolveGameArtworkBundle(game, { surface: 'portrait' });
          return (
            <button
              key={getCanonicalGameKey(game) || game.name}
              type="button"
              className="trending-now-card"
              aria-label={`Launch ${game.name}`}
              title={`Launch ${game.name}`}
              onClick={() => onLaunchGame?.(game)}
            >
              <span className="trending-now-art">
                <LazyImage src={artwork} alt={game.name} placeholder={placeholder} />
              </span>
              <span className="trending-now-name">{game.name}</span>
              <span className="trending-now-meta">
                #{rank} globally · {formatCount(concurrent)} playing
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
