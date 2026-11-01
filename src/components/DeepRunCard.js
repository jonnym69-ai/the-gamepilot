import React from 'react';
import { Play, X } from 'lucide-react';
import LazyImage from './LazyImage';
import CurrentEraService from '../services/CurrentEraService';
import StorageService from '../services/StorageService';
import { findLibraryGame } from '../services/PeriodChampionService';
import { isGameUnplayed } from '../services/gameClassification';
import { resolveGameArtworkBundle } from '../services/GameArtworkService';
import './DeepRunCard.css';

const DISMISS_KEY = 'deepRunDismissedV1';
const MIN_ERA_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

const lastPlayedTs = (game) => {
  const raw = game?.last_played || game?.lastPlayed || game?.lastPlayedMs;
  if (!raw) return 0;
  const t = typeof raw === 'number' ? raw : new Date(raw).getTime();
  return Number.isFinite(t) ? t : 0;
};

/**
 * Pick a "same itch, different game" suggestion for a long-running era: a
 * library game sharing the era top game's genres, preferring untouched or
 * dormant titles (the rediscovery angle) over games already in rotation.
 * Returns null when the era game's genres can't be established or nothing in
 * the library overlaps — suggesting something unrelated would be a guess.
 */
export const pickPalateCleanser = (library, eraTopGame) => {
  const eraGame = findLibraryGame(library, eraTopGame);
  const eraGenres = new Set((eraGame?.genres || []).map((g) => String(g).toLowerCase()));
  if (!eraTopGame || eraGenres.size === 0) return null;

  const scored = (Array.isArray(library) ? library : [])
    .filter((g) => g?.name && g.name !== eraTopGame)
    .map((g) => {
      const shared = (g.genres || []).filter((x) => eraGenres.has(String(x).toLowerCase()));
      if (shared.length === 0) return null;
      const unplayed = isGameUnplayed(g);
      return {
        game: g,
        sharedGenres: shared,
        unplayed,
        lastPlayed: lastPlayedTs(g),
        score: shared.length * 10 + (unplayed ? 5 : 0),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.lastPlayed - b.lastPlayed);

  return scored[0] || null;
};

/**
 * "Deep in the run" card — surfaces on Today when the current real-session
 * era has lasted a while (dayCount only exists for tracked eras, so estimated
 * eras never trigger it). Celebrates the run and offers one similar library
 * game as a palate cleanser — a suggestion, never a judgement. Dismissed per
 * era signature, so the same era can't nag twice.
 */
export default function DeepRunCard({ library, onLaunchGame }) {
  const [dismissed, setDismissed] = React.useState(() => StorageService.getString(DISMISS_KEY));

  const era = React.useMemo(() => {
    try {
      return CurrentEraService.getCurrentEra();
    } catch {
      return null;
    }
  }, []);

  const signature = era ? `${era.name}|${era.topGame}` : null;
  const pick = React.useMemo(() => (era?.topGame ? pickPalateCleanser(library, era.topGame) : null), [library, era]);

  if (
    !era ||
    era.estimated ||
    !era.dayCount ||
    era.dayCount < MIN_ERA_DAYS ||
    !era.topGame ||
    !pick ||
    dismissed === signature
  ) {
    return null;
  }

  const { game, sharedGenres, unplayed, lastPlayed } = pick;
  const bundle = resolveGameArtworkBundle(game, { surface: 'portrait', fallbackSurface: 'library_card' });
  const daysSince = lastPlayed ? Math.floor((Date.now() - lastPlayed) / DAY_MS) : null;
  const presence = unplayed
    ? 'untouched in your library'
    : daysSince && daysSince > 0
      ? `last played ${daysSince}d ago`
      : 'also in your library';

  const handleDismiss = () => {
    StorageService.setString(DISMISS_KEY, signature);
    setDismissed(signature);
  };

  return (
    <div className="deep-run-card" aria-label="Palate cleanser suggestion">
      <div className="deep-run-head">
        <p className="deep-run-eyebrow">Deep in the run</p>
        <button
          type="button"
          className="deep-run-dismiss"
          onClick={handleDismiss}
          aria-label="Dismiss this suggestion"
          title="Not now"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>
      <p className="deep-run-era">
        Day {era.dayCount} of {era.name} — a proper run.
      </p>
      <div className="deep-run-pick">
        <span className="deep-run-art">
          {bundle.artwork ? (
            <LazyImage src={bundle.artwork} fallbackSrc={bundle.fallbackSrc} alt="" placeholder={bundle.placeholder} />
          ) : (
            <span className="deep-run-placeholder" aria-hidden="true">
              {game.name[0] || '?'}
            </span>
          )}
        </span>
        <div className="deep-run-info">
          <p className="deep-run-line">
            Same itch, different game: <strong>{game.name}</strong>
          </p>
          <p className="deep-run-why">
            {sharedGenres.slice(0, 2).join(' · ')} · {presence}
          </p>
          <button
            type="button"
            className="deep-run-play"
            onClick={() => onLaunchGame?.(game)}
            aria-label={`Play ${game.name}`}
          >
            <Play size={13} aria-hidden="true" /> Play {game.name}
          </button>
        </div>
      </div>
    </div>
  );
}
