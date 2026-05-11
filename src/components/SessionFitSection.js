import React, { useEffect, useMemo, useState } from 'react';
import { Timer, Sparkles, RefreshCw, Play } from 'lucide-react';
import HowLongToBeatService from '../services/HowLongToBeatService';
import StorageService from '../services/StorageService';
import { resolveGameArtwork, getGameArtworkPlaceholder } from '../services/GameArtworkService';
import LazyImage from './LazyImage';
import './SessionFitSection.css';

const PRESETS = [30, 60, 90, 120];
const PREF_KEY = 'sessionFitMinutes';

const formatHours = (h) => {
  if (!h || h <= 0) return '—';
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 10) return `${h.toFixed(1)}h`;
  return `${Math.round(h)}h`;
};

const playedHoursOf = (game) => {
  const minutes = Number(game?.time_played) || 0;
  return minutes / 60;
};

const SessionFitSection = ({ library = [], onLaunchGame, onOpenGame }) => {
  const [minutes, setMinutes] = useState(() => {
    const saved = Number(StorageService.get(PREF_KEY, 60));
    return Number.isFinite(saved) && saved > 0 ? saved : 60;
  });
  const [warmupCount, setWarmupCount] = useState(0);
  const [warming, setWarming] = useState(false);
  const [hltbEnabled, setHltbEnabled] = useState(() => HowLongToBeatService.isEnabled());

  // Persist preference.
  useEffect(() => {
    StorageService.set(PREF_KEY, minutes);
  }, [minutes]);

  const warmSessionFitCache = () => {
    if (!HowLongToBeatService.isEnabled()) return;
    if (!Array.isArray(library) || library.length === 0) return;

    const candidates = [...library]
      .filter((g) => g?.name)
      .sort((a, b) => {
        const ap = Number(a.time_played) || 0;
        const bp = Number(b.time_played) || 0;
        const aScore = ap > 0 && ap < 1800 ? 3 : ap === 0 ? 2 : 1;
        const bScore = bp > 0 && bp < 1800 ? 3 : bp === 0 ? 2 : 1;
        return bScore - aScore;
      })
      .slice(0, 12);

    setWarming(true);
    HowLongToBeatService.warmup(candidates, { concurrency: 1, delayMs: 600 })
      .finally(() => {
        setWarming(false);
        setWarmupCount((n) => n + 1);
      });
  };

  // warmupCount is an intentional re-trigger after fresh HLTB lookups land in cache.
  const ranked = useMemo(
    () => HowLongToBeatService.rankSessionFit(library, minutes, { playedHoursOf }).slice(0, 6),
    [library, minutes, warmupCount] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleLaunch = (game) => {
    if (typeof onLaunchGame === 'function') onLaunchGame(game);
  };

  const handleOpen = (game) => {
    if (typeof onOpenGame === 'function') onOpenGame(game);
  };

  return (
    <section className="session-fit-section" aria-label="Session Fit">
      <header className="session-fit-header">
        <div className="session-fit-title">
          <Timer size={18} aria-hidden="true" />
          <h2>Session Fit</h2>
        </div>
        <p className="session-fit-sub">
          Tell GamePilot how long you've got — we'll suggest games where that's a meaningful chunk of progress.
        </p>
      </header>

      <div className="session-fit-controls">
        <div className="session-fit-presets" role="group" aria-label="Session length presets">
          {PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              className={`session-fit-preset ${minutes === m ? 'is-active' : ''}`}
              onClick={() => setMinutes(m)}
            >
              {m < 60 ? `${m}m` : `${m / 60}h`}
            </button>
          ))}
        </div>
        <label className="session-fit-custom">
          <span>Custom</span>
          <input
            type="number"
            min={10}
            max={600}
            step={5}
            value={minutes}
            onChange={(e) => {
              const next = Math.max(10, Math.min(600, Number(e.target.value) || 60));
              setMinutes(next);
            }}
            aria-label="Custom session length in minutes"
          />
          <span>min</span>
        </label>
      </div>

      {!hltbEnabled ? (
        <div className="session-fit-empty">
          <Sparkles size={16} aria-hidden="true" />
          <span>HowLongToBeat lookups are turned off. Re-enable them in Settings to use Session Fit.</span>
          <button
            type="button"
            className="session-fit-refresh"
            onClick={() => {
              HowLongToBeatService.setEnabled(true);
              setHltbEnabled(true);
              setWarmupCount((n) => n + 1);
            }}
          >
            Enable now
          </button>
        </div>
      ) : ranked.length === 0 ? (
        <div className="session-fit-empty">
          <Sparkles size={16} aria-hidden="true" />
          <span>
            {warming
              ? 'Looking up game lengths from HowLongToBeat…'
              : 'No cached matches yet. Refresh when you want GamePilot to look up a small local-first batch.'}
          </span>
          {!warming && (
            <button
              type="button"
              className="session-fit-refresh"
              onClick={warmSessionFitCache}
              aria-label="Recalculate session fit"
            >
              <RefreshCw size={13} /> Refresh
            </button>
          )}
        </div>
      ) : (
        <ol className="session-fit-list">
          {ranked.map(({ game, mainHours, remainingHours, fitScore }) => {
            const placeholder = getGameArtworkPlaceholder({ game, surface: 'recommendation_card' });
            const remainingPct = mainHours > 0
              ? Math.min(100, Math.round(((mainHours - remainingHours) / mainHours) * 100))
              : 0;
            return (
              <li key={game.appid || game.name} className="session-fit-card">
                <button
                  type="button"
                  className="session-fit-card-art"
                  onClick={() => handleOpen(game)}
                  aria-label={`Open ${game.name}`}
                >
                  <LazyImage
                    src={resolveGameArtwork(game, { surface: 'recommendation_card' })}
                    alt={game.name}
                    gameName={game.name}
                    placeholder={placeholder}
                  />
                </button>
                <div className="session-fit-card-body">
                  <h3 title={game.name}>{game.name}</h3>
                  <div className="session-fit-card-meta">
                    <span className="session-fit-fit" title="How well this session fits this game">
                      Fit {fitScore}
                    </span>
                    <span title="HowLongToBeat main story">Main {formatHours(mainHours)}</span>
                    {remainingPct > 0 && (
                      <span title="Estimated remaining based on your playtime">
                        {remainingPct}% done · {formatHours(remainingHours)} left
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  className="session-fit-launch"
                  onClick={() => handleLaunch(game)}
                  aria-label={`Launch ${game.name}`}
                >
                  <Play size={14} /> Launch
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
};

export default SessionFitSection;
