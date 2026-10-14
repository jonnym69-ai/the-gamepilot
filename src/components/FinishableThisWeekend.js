import React from 'react';
import { Rocket } from 'lucide-react';
import HowLongToBeatService from '../services/HowLongToBeatService';
import { BacklogCoachService } from '../services/BacklogCoachService';
import { getBlendedPlaytimeMinutes, isGameCompleted, isNonGameTitle } from '../services/gameClassification';
import { resolveGameArtworkBundle } from '../services/GameArtworkService';
import LazyImage from './LazyImage';
import './FinishableThisWeekend.css';

const WEEKEND_HOURS = 8;
const MAX_PICKS = 8;
// Only warm HLTB lookups for this many backlog titles per mount — lookups are
// network calls, so the shelf fills in progressively as the cache warms.
const WARMUP_LIMIT = 20;

/**
 * "Finishable this weekend" — backlog games whose cached HLTB main-story
 * estimate minus time already played fits inside a weekend (~8h). Reads the
 * sync cache on render; kicks a throttled warmup for backlog titles missing
 * estimates so later visits see more picks.
 */
export default function FinishableThisWeekend({ library = [], onLaunchGame }) {
  const [warmupTick, setWarmupTick] = React.useState(0);

  const backlog = React.useMemo(() => {
    const games = Array.isArray(library) ? library : [];
    const sessionCounts = BacklogCoachService.getSessionCountByGame();
    return games.filter(
      (game) =>
        game &&
        !game.hidden &&
        !game.isHidden &&
        game.installed !== false &&
        !isNonGameTitle(game) &&
        !isGameCompleted(game) &&
        BacklogCoachService.isBacklogGame(game, sessionCounts)
    );
  }, [library]);

  React.useEffect(() => {
    if (!HowLongToBeatService.isEnabled() || backlog.length === 0) return undefined;
    let cancelled = false;
    const missing = backlog.filter((game) => !HowLongToBeatService.getCached(game)).slice(0, WARMUP_LIMIT);
    if (missing.length === 0) return undefined;
    HowLongToBeatService.warmup(missing)
      .then(() => {
        if (!cancelled) setWarmupTick((tick) => tick + 1);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [backlog]);

  const picks = React.useMemo(
    () =>
      backlog
        .map((game) => {
          const estimate = HowLongToBeatService.getEstimate(game);
          const mainHours = estimate?.mainStory || 0;
          if (mainHours <= 0) return null;
          const playedHours = getBlendedPlaytimeMinutes(game) / 60;
          const remaining = mainHours - playedHours;
          if (remaining <= 0 || remaining > WEEKEND_HOURS) return null;
          return { game, remaining };
        })
        .filter(Boolean)
        .sort((a, b) => a.remaining - b.remaining)
        .slice(0, MAX_PICKS),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- warmupTick forces a re-read of the externally-mutated HLTB cache after background fetches land
    [backlog, warmupTick]
  );

  if (!HowLongToBeatService.isEnabled() || picks.length === 0) return null;

  return (
    <div className="finishable-weekend">
      <div className="finishable-weekend-header">
        <Rocket size={15} aria-hidden="true" />
        <span className="finishable-weekend-title">Finishable this weekend</span>
        <span className="finishable-weekend-sub">~{WEEKEND_HOURS}h or less left, per HowLongToBeat</span>
      </div>
      <div className="finishable-weekend-row">
        {picks.map(({ game, remaining }) => {
          const { artwork, placeholder } = resolveGameArtworkBundle(game, { surface: 'portrait' });
          return (
            <button
              key={game.appid || game.name}
              type="button"
              className="finishable-weekend-card"
              aria-label={`Launch ${game.name}`}
              title={`Launch ${game.name}`}
              onClick={() => onLaunchGame?.(game)}
            >
              <span className="finishable-weekend-art">
                <LazyImage src={artwork} alt={game.name} placeholder={placeholder} />
              </span>
              <span className="finishable-weekend-name">{game.name}</span>
              <span className="finishable-weekend-time">~{remaining.toFixed(1)}h left</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
