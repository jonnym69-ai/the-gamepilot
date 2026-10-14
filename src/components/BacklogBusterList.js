import React, { useMemo, useState } from 'react';
import { Check, ListPlus, Plus } from 'lucide-react';
import StorageService from '../services/StorageService';
import { getBlendedPlaytimeMinutes, isGameCompleted, isNonGameTitle } from '../services/gameClassification';
import { getCanonicalGameKey } from '../services/LibraryDataService';
import { resolveGameArtworkBundle } from '../services/GameArtworkService';
import LazyImage from './LazyImage';
import './BacklogBusterList.css';

const LIST_KEY = 'backlogBusterListV1';
const THRESHOLD_KEY = 'backlogBusterThresholdV1';
const THRESHOLDS = [
  { minutes: 60, label: 'Under 1h' },
  { minutes: 120, label: 'Under 2h' },
];
const MAX_CANDIDATES = 24;

const getGameKey = (game) =>
  getCanonicalGameKey(game) ||
  String(game?.appid || game?.name || '')
    .trim()
    .toLowerCase() ||
  null;

// Entries are { key, threshold } — a pick counts as "busted" once its blended
// playtime crosses the hour limit it was chosen under. Legacy plain-string
// entries migrate to the 60m default.
const readList = () => {
  try {
    const stored = StorageService.get(LIST_KEY, []);
    if (!Array.isArray(stored)) return [];
    return stored
      .map((entry) => {
        if (typeof entry === 'string' && entry) return { key: entry, threshold: 60 };
        if (entry && typeof entry === 'object' && typeof entry.key === 'string' && entry.key) {
          const threshold = Number(entry.threshold);
          return { key: entry.key, threshold: Number.isFinite(threshold) && threshold > 0 ? threshold : 60 };
        }
        return null;
      })
      .filter(Boolean);
  } catch {
    return [];
  }
};

const readThreshold = () => {
  try {
    const stored = StorageService.get(THRESHOLD_KEY, 60);
    return THRESHOLDS.some((t) => t.minutes === stored) ? stored : 60;
  } catch {
    return 60;
  }
};

const formatMinutes = (minutes) =>
  minutes <= 0 ? 'Unplayed' : minutes < 60 ? `${minutes}m played` : `${(minutes / 60).toFixed(1)}h played`;

const BacklogBusterList = ({ library = [], onLaunchGame }) => {
  const [busterKeys, setBusterKeys] = useState(readList);
  const [threshold, setThreshold] = useState(readThreshold);
  const [picking, setPicking] = useState(false);

  const { busters, candidates, bustedCount } = useMemo(() => {
    const games = Array.isArray(library) ? library : [];
    const eligible = games.filter(
      (game) =>
        game &&
        !game.hidden &&
        !game.isHidden &&
        game.installed !== false &&
        !isNonGameTitle(game) &&
        !isGameCompleted(game)
    );
    const byKey = new Map();
    eligible.forEach((game) => {
      const key = getGameKey(game);
      if (key && !byKey.has(key)) byKey.set(key, game);
    });
    const list = busterKeys
      .map((entry) => {
        const game = byKey.get(entry.key);
        if (!game) return null;
        return { game, busted: getBlendedPlaytimeMinutes(game) >= entry.threshold };
      })
      .filter(Boolean);
    const pool = eligible
      .filter((game) => getBlendedPlaytimeMinutes(game) < threshold)
      .sort(
        (a, b) =>
          getBlendedPlaytimeMinutes(a) - getBlendedPlaytimeMinutes(b) || String(a.name).localeCompare(String(b.name))
      )
      .slice(0, MAX_CANDIDATES);
    return { busters: list, candidates: pool, bustedCount: list.filter((b) => b.busted).length };
  }, [library, busterKeys, threshold]);

  const toggleBuster = (game) => {
    const key = getGameKey(game);
    if (!key) return;
    setBusterKeys((current) => {
      const next = current.some((entry) => entry.key === key)
        ? current.filter((entry) => entry.key !== key)
        : [...current, { key, threshold }];
      try {
        StorageService.set(LIST_KEY, next);
      } catch {
        /* persistence optional */
      }
      return next;
    });
  };

  const chooseThreshold = (minutes) => {
    setThreshold(minutes);
    try {
      StorageService.set(THRESHOLD_KEY, minutes);
    } catch {
      /* persistence optional */
    }
  };

  return (
    <div className="backlog-buster">
      <div className="backlog-buster-header">
        <span className="backlog-buster-title">
          {busters.length > 0 ? `Your buster list · ${bustedCount} of ${busters.length} busted` : 'No buster picks yet'}
        </span>
        <button
          type="button"
          className="backlog-buster-toggle"
          aria-expanded={picking}
          onClick={() => setPicking((open) => !open)}
        >
          <ListPlus size={14} aria-hidden="true" />
          {picking ? 'Done picking' : 'Choose picks'}
        </button>
      </div>

      {busters.length > 0 && (
        <>
          <div className="backlog-buster-progress" aria-hidden="true">
            <div
              className="backlog-buster-progress-fill"
              style={{ width: `${Math.round((bustedCount / busters.length) * 100)}%` }}
            />
          </div>
          {bustedCount === busters.length && (
            <p className="backlog-buster-complete">Every pick busted — the backlog fears you.</p>
          )}
          <div className="backlog-buster-row" aria-label="Your backlog buster list">
            {busters.map(({ game, busted }) => {
              const { artwork, placeholder } = resolveGameArtworkBundle(game, { surface: 'portrait' });
              return (
                <button
                  key={getGameKey(game)}
                  type="button"
                  className={`backlog-buster-card${busted ? ' busted' : ''}`}
                  aria-label={`Launch ${game.name}`}
                  title={`Launch ${game.name}`}
                  onClick={() => onLaunchGame?.(game)}
                >
                  <span className="backlog-buster-art">
                    <LazyImage src={artwork} alt={game.name} placeholder={placeholder} />
                  </span>
                  <span className="backlog-buster-name">{game.name}</span>
                  <span className="backlog-buster-minutes">
                    {busted ? 'Busted ✓' : formatMinutes(getBlendedPlaytimeMinutes(game))}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {picking && (
        <div className="backlog-buster-picker">
          <div className="backlog-buster-thresholds" role="group" aria-label="Playtime limit">
            {THRESHOLDS.map(({ minutes, label }) => (
              <button
                key={minutes}
                type="button"
                className={`backlog-buster-threshold${threshold === minutes ? ' active' : ''}`}
                aria-pressed={threshold === minutes}
                onClick={() => chooseThreshold(minutes)}
              >
                {label}
              </button>
            ))}
          </div>
          {candidates.length === 0 ? (
            <p className="backlog-buster-empty">No installed backlog games under {threshold / 60}h played.</p>
          ) : (
            <div className="backlog-buster-candidates">
              {candidates.map((game) => {
                const key = getGameKey(game);
                const selected = busterKeys.some((entry) => entry.key === key);
                const { artwork, placeholder } = resolveGameArtworkBundle(game, { surface: 'portrait' });
                return (
                  <button
                    key={key}
                    type="button"
                    className={`backlog-buster-candidate${selected ? ' selected' : ''}`}
                    aria-pressed={selected}
                    onClick={() => toggleBuster(game)}
                  >
                    <span className="backlog-buster-art">
                      <LazyImage src={artwork} alt="" placeholder={placeholder} />
                    </span>
                    <span className="backlog-buster-name">{game.name}</span>
                    <span className="backlog-buster-minutes">{formatMinutes(getBlendedPlaytimeMinutes(game))}</span>
                    <span className="backlog-buster-check" aria-hidden="true">
                      {selected ? <Check size={14} /> : <Plus size={14} className="backlog-buster-check-off" />}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BacklogBusterList;
