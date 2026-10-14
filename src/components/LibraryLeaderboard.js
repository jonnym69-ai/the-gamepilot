import React, { useMemo, useState } from 'react';
import { Trophy } from 'lucide-react';
import StorageService from '../services/StorageService';
import { getTopPlayedGames, isTopShelfRank } from '../services/gameClassification';
import { getCanonicalGameKey } from '../services/LibraryDataService';
import { resolveGameArtworkBundle } from '../services/GameArtworkService';
import formatPlaytime from '../utils/formatPlaytime';
import LazyImage from './LazyImage';
import './LibraryLeaderboard.css';

const LIMIT_KEY = 'libraryLeaderboardLimitV1';
const LIMITS = [10, 20];

const readLimit = () => {
  try {
    const stored = StorageService.get(LIMIT_KEY, 10);
    return LIMITS.includes(stored) ? stored : 10;
  } catch {
    return 10;
  }
};

const LibraryLeaderboard = ({ library = [], onLaunchGame }) => {
  const [limit, setLimit] = useState(readLimit);

  const entries = useMemo(() => getTopPlayedGames(library, limit), [library, limit]);

  const chooseLimit = (next) => {
    setLimit(next);
    try {
      StorageService.set(LIMIT_KEY, next);
    } catch {
      /* persistence optional */
    }
  };

  if (entries.length === 0) return null;

  return (
    <section className="library-leaderboard" aria-labelledby="library-leaderboard-heading">
      <div className="library-leaderboard-header">
        <div>
          <h3 id="library-leaderboard-heading">Your top shelf</h3>
          <p className="library-leaderboard-sub">
            All-time most played across your library — ranked by your own hours, not a store chart.
          </p>
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
    </section>
  );
};

export default LibraryLeaderboard;
