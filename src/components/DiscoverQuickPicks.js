import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Coffee, Crosshair, Palette, Play, Swords, Users } from 'lucide-react';
import LazyImage from './LazyImage';
import { MOODS } from '../constants/GenresMoods';
import { RecommendationEngine } from '../services/RecommendationEngine';
import SteamPublicService from '../services/SteamPublicService';
import StorageService from '../services/StorageService';
import { getGameArtworkPlaceholder, resolveGameArtwork } from '../services/GameArtworkService';

const STORAGE_KEY = 'discoverQuickPicksV1';
const gameKey = (game) =>
  `${String(game.platform || '').toLowerCase()}:${game.appid || game.id || String(game.name).trim().toLowerCase()}`;
const EMPTY_DISMISSALS = { keys: [], slots: [], context: null };
const MOOD_ICONS = {
  Relaxed: Coffee,
  Social: Users,
  Creative: Palette,
  Focused: Crosshair,
  Competitive: Swords,
};
const TIME_OPTIONS = [
  { value: '', label: 'Any length' },
  { value: 'quick', label: '~30 min' },
  { value: 'medium', label: '~2 hours' },
  { value: 'long', label: 'Long haul' },
];

const readSaved = () => {
  const saved = StorageService.get(STORAGE_KEY, null);
  return {
    mood: MOODS.includes(saved?.mood) ? saved.mood : '',
    time: TIME_OPTIONS.some((option) => option.value === saved?.time) ? saved.time : '',
  };
};

const reasonOf = (entry) => {
  const explanation = entry?.explanation;
  if (!explanation) return '';
  if (typeof explanation === 'string') return explanation;
  return explanation.previewReasons?.[0] || explanation.reasons?.[0] || explanation.summary || '';
};

const sessionLabel = (minutes) => {
  const value = Math.round(Number(minutes) || 0);
  if (value <= 0 || value > 480) return '';
  return value < 120 ? `~${value} min` : `~${Math.round(value / 60)}h`;
};

const compactCount = (n) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
};

export default function DiscoverQuickPicks({ library = [], onLaunchGame, activeSessions = {} }) {
  const [{ mood, time }, setSelection] = useState(readSaved);

  useEffect(() => {
    StorageService.set(STORAGE_KEY, { mood, time });
  }, [mood, time]);

  const runningKey = JSON.stringify(Object.keys(activeSessions || {}));
  const running = useMemo(
    () => new Set(JSON.parse(runningKey).map((name) => String(name).trim().toLowerCase())),
    [runningKey]
  );

  const [dismissals, setDismissals] = useState(EMPTY_DISMISSALS);
  const context = useMemo(() => ({ library, mood, time, running }), [library, mood, time, running]);
  const result = useMemo(() => {
    const games = Array.isArray(library)
      ? library.filter(
          (game) =>
            game?.name &&
            !running.has(String(game.name).trim().toLowerCase()) &&
            !dismissals.keys.includes(gameKey(game))
        )
      : [];
    const eligible = new Set(games.map(gameKey));
    const slots = dismissals.context === context ? dismissals.slots : [];
    const retained = slots.map((entry) => (entry && eligible.has(gameKey(entry.game)) ? entry : null));
    const seen = new Set(retained.filter(Boolean).map((entry) => gameKey(entry.game)));
    const candidates = games.filter((game) => !seen.has(gameKey(game)));
    const count = 3 - seen.size;
    const payload =
      candidates.length && count > 0
        ? RecommendationEngine.getPerfectPlayResult(candidates, mood || null, null, time || null, count)
        : null;
    const replacements = (payload?.entries || []).filter((entry) => {
      if (!entry?.game?.name) return false;
      const key = gameKey(entry.game);
      if (!eligible.has(key) || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const entries = retained.map((entry) => entry || replacements.shift()).filter(Boolean);
    entries.push(...replacements.slice(0, 3 - entries.length));
    return entries.length ? { entries } : null;
  }, [library, mood, time, running, dismissals, context]);

  const cardActions = useRef([]);
  const resetButton = useRef(null);
  const pendingFocus = useRef(null);
  useEffect(() => {
    if (pendingFocus.current === null) return;
    const index = Math.min(pendingFocus.current, (result?.entries.length || 0) - 1);
    (index >= 0 ? cardActions.current[index] : resetButton.current)?.focus();
    pendingFocus.current = null;
  }, [result]);

  const dismiss = (game, index) => {
    pendingFocus.current = index;
    setDismissals((current) => ({
      keys: [...new Set([...current.keys, gameKey(game)])],
      slots: result.entries.map((entry) => (gameKey(entry.game) === gameKey(game) ? null : entry)),
      context,
    }));
  };

  const [playerCounts, setPlayerCounts] = useState({});

  useEffect(() => {
    const picks = (result?.entries || []).map((entry) => SteamPublicService.appIdOf(entry.game)).filter(Boolean);
    if (picks.length === 0 || !window.electronAPI?.steamPlayerCount) return undefined;
    let cancelled = false;
    Promise.all(
      picks.map(async (appid) => [appid, await SteamPublicService.getPlayerCount({ platform: 'steam', appid })])
    ).then((rows) => {
      if (cancelled) return;
      const next = {};
      rows.forEach(([appid, value]) => {
        if (value) next[appid] = value;
      });
      setPlayerCounts(next);
    });
    return () => {
      cancelled = true;
    };
  }, [result]);

  const pick = (patch) => setSelection((current) => ({ ...current, ...patch }));

  return (
    <section className="discover-quick-picks" aria-labelledby="discover-quick-picks-heading">
      <header className="discover-quick-picks-header">
        <div>
          <h2 id="discover-quick-picks-heading">Can't decide?</h2>
          <p>Up to three picks, scored by how you actually play. Steer them with a mood or time.</p>
        </div>
      </header>

      <div className="discover-quick-pick-rows">
        <div className="discover-quick-pick-row" role="group" aria-label="Mood">
          {MOODS.map((option) => {
            const Icon = MOOD_ICONS[option];
            return (
              <button
                key={option}
                type="button"
                className="discover-pick-pill"
                aria-pressed={mood === option}
                onClick={() => pick({ mood: mood === option ? '' : option })}
              >
                {Icon && <Icon size={14} aria-hidden="true" />}
                {option}
              </button>
            );
          })}
        </div>
        <div className="discover-quick-pick-row" role="group" aria-label="Session length">
          {TIME_OPTIONS.map((option) => (
            <button
              key={option.value || 'any'}
              type="button"
              className="discover-pick-pill"
              aria-pressed={time === option.value}
              onClick={() => pick({ time: option.value })}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {dismissals.keys.length > 0 && (
        <div className="discover-skipped-picks">
          <p role="status">{dismissals.keys.length} skipped for this visit. Your taste profile is unchanged.</p>
          <button
            type="button"
            ref={resetButton}
            className="discover-pick-pill"
            onClick={() => {
              pendingFocus.current = 0;
              setDismissals(EMPTY_DISMISSALS);
            }}
          >
            Reset skipped picks
          </button>
        </div>
      )}
      {result ? (
        <div className="discover-quick-pick-cards">
          {result.entries.map((entry, index) => {
            const game = entry.game;
            const artwork = resolveGameArtwork(game, { surface: 'portrait' });
            const placeholder = getGameArtworkPlaceholder({ game, surface: 'portrait' });
            const reason = reasonOf(entry);
            const length = sessionLabel(entry.estimatedSessionMinutes);
            const appid = SteamPublicService.appIdOf(game);
            const playing = appid ? playerCounts[appid] : null;
            return (
              <article key={game.appid || game.id || game.name} className="discover-quick-pick-card">
                <div className="discover-quick-pick-art">
                  {artwork ? (
                    <LazyImage src={artwork} alt={`${game.name} artwork`} placeholder={placeholder} />
                  ) : (
                    <div className="discover-quick-pick-fallback" aria-hidden="true">
                      {game.name?.[0] || '?'}
                    </div>
                  )}
                </div>
                <div className="discover-quick-pick-details">
                  <h3>{game.name}</h3>
                  {reason && <p className="discover-quick-pick-reason">{reason}</p>}
                  <p className="discover-quick-pick-meta">
                    {[entry.mood, length].filter(Boolean).join(' · ')}
                    {playing && (
                      <span
                        className="discover-quick-pick-players"
                        title={`Steam player count · as of ${new Date(playing.fetchedAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}`}
                      >
                        {(entry.mood || length ? ' · ' : '') + compactCount(playing.count)} playing
                      </span>
                    )}
                  </p>
                  <button
                    type="button"
                    className="discover-quick-pick-play"
                    onClick={() => onLaunchGame?.(game)}
                    aria-label={`Play ${game.name}`}
                  >
                    <Play size={14} aria-hidden="true" /> Play
                  </button>
                  <button
                    type="button"
                    className="discover-pick-dismiss"
                    aria-label={`Not this one: ${game.name}`}
                    ref={(button) => {
                      cardActions.current[index] = button;
                    }}
                    onClick={() => dismiss(game, index)}
                  >
                    Not this one
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="discover-quick-pick-empty">
          {!Array.isArray(library) || library.length === 0
            ? 'Scan your library and GamePilot will put up to three picks here — no filters needed.'
            : dismissals.keys.length > 0
              ? 'No more picks for these filters. Reset skipped picks or try another mood or session length.'
              : 'No picks available right now. Try another mood or session length; running games are left out.'}
        </p>
      )}
    </section>
  );
}
