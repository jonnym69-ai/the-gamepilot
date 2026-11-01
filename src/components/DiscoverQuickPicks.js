import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Play, RotateCcw, Shuffle, Sofa, Sparkles, Sprout } from 'lucide-react';
import LazyImage from './LazyImage';
import OwnedGameModal from './OwnedGameModal';
import { RecommendationEngine } from '../services/RecommendationEngine';
import { RecommendationExplainer } from '../services/RecommendationExplainer';
import { getBlendedPlaytimeMinutes, isGameUnplayed } from '../services/gameClassification';
import SteamPublicService from '../services/SteamPublicService';
import StorageService from '../services/StorageService';
import OwnedBacklogService from '../services/OwnedBacklogService';
import PendingInstallService from '../services/PendingInstallService';
import { getSeasonalTheme, matchesSeasonalTheme } from '../services/SeasonalDiscoveryService';
import RecommendationPreferenceService, {
  CHANGE_EVENT as PREFERENCE_CHANGE_EVENT,
} from '../services/RecommendationPreferenceService';
import RecommendationPreferenceControl from './RecommendationPreferenceControl';
import { openExternalUrl } from '../services/ElectronBridge';
import { getGameArtworkPlaceholder, resolveGameArtwork } from '../services/GameArtworkService';

const STORAGE_KEY = 'discoverQuickPicksV1';
const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_WINDOW_MS = 14 * DAY_MS;
const PROVEN_MINUTES = 120;
const PROVEN_RATING = 7;
const MIX_ORDER = ['continue', 'comfort', 'new'];

const gameKey = (game) =>
  `${String(game.platform || '').toLowerCase()}:${game.appid || game.id || String(game.name).trim().toLowerCase()}`;
// Owned entries key by source:id so an Epic appName can't collide with a GOG
// product id; installed library games keep the platform/id fallback.
const keyOf = (game) => OwnedBacklogService.keyFor(game) || gameKey(game);
const EMPTY_DISMISSALS = { keys: [], slots: [], context: null };

const INTENT_OPTIONS = [
  { value: '', label: 'For you', Icon: Sparkles },
  { value: 'continue', label: 'Pick up a run', Icon: RotateCcw },
  { value: 'comfort', label: 'Comfort pick', Icon: Sofa },
  { value: 'new', label: 'Something new', Icon: Sprout },
  { value: 'surprise', label: 'Surprise me', Icon: Shuffle },
  { value: 'seasonal', label: 'Seasonal', Icon: Sparkles },
  { value: 'uninstalled', label: 'Not installed', Icon: Download },
];
const INTENTS = INTENT_OPTIONS.map((option) => option.value);

const readSaved = () => {
  const saved = StorageService.get(STORAGE_KEY, null);
  return INTENTS.includes(saved?.intent) ? saved.intent : '';
};

const normalize = (value) =>
  String(value || '')
    .trim()
    .toLowerCase();

const lastPlayedTimestamp = (game) => {
  const raw = game?.last_played;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const ratingOf = (game) => Number(game?.userRating || game?.rating || 0);

// A library game belongs to the current rotation when a focus entry matches its
// id or its name — the same two comparisons RecommendationEngine uses.
const focusEntryFor = (game, focus) => {
  const entries = Array.isArray(focus?.games) ? focus.games : [];
  const key = normalize(game?.appid || game?.id || game?.name);
  const name = normalize(game?.name);
  return (
    entries.find(
      (entry) => normalize(entry?.gameId || entry?.name) === key || (name && normalize(entry?.name) === name)
    ) || null
  );
};

const compactCount = (n) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
};

// One factual line per card, generated from real library data. The engine's own
// internal feedbackReason is never rendered raw.
const slotReason = (slot, game, entry, focus, theme) => {
  if (slot === 'seasonal' && theme) {
    return theme.id === 'halloween' ? 'Horror / survival pick for Halloween.' : 'Cozy / party pick for Christmas.';
  }
  if (slot === 'uninstalled') {
    return `Owned on ${game?.platform || game?.source} — not installed.`;
  }
  if (typeof entry?.feedbackReason === 'string' && entry.feedbackReason.trim()) {
    return 'This hit the mark for you before.';
  }
  let reason = '';
  if (slot === 'continue') {
    const focusEntry = focusEntryFor(game, focus);
    if (focusEntry) {
      reason =
        focusEntry.sessions >= 4 && focusEntry.distinctDays < 3
          ? `Part of your current rotation — ${focusEntry.sessions} sessions recently.`
          : `Part of your current rotation — ${focusEntry.distinctDays} days this fortnight.`;
    } else {
      const ts = lastPlayedTimestamp(game);
      if (ts) {
        const days = Math.max(0, Math.floor((Date.now() - ts) / DAY_MS));
        reason =
          days === 0
            ? 'Last played today — easy to slip back into.'
            : `Last played ${days} ${days === 1 ? 'day' : 'days'} ago — easy to slip back into.`;
      } else {
        reason = 'A run worth picking back up.';
      }
    }
  } else if (slot === 'comfort') {
    const rating = ratingOf(game);
    const minutes = getBlendedPlaytimeMinutes(game);
    if (rating >= PROVEN_RATING) {
      reason = `You rated it ${rating}/10.`;
    } else if (minutes >= PROVEN_MINUTES) {
      reason = `${Math.round(minutes / 60)}h logged — one of your proven games.`;
    } else {
      reason = 'One you already know you enjoy.';
    }
  } else if (slot === 'new') {
    const signature = RecommendationExplainer.getSignatureGameReasoning(game);
    reason = signature
      ? `Unplayed — shares ${String(signature).replace(/^Shares\s+/i, '')}`
      : 'Unplayed in your library — a fresh pick.';
  } else if (slot === 'surprise') {
    reason = isGameUnplayed(game) ? 'Unplayed — a total wildcard.' : 'A wildcard from your library.';
  }
  if (reason) return reason;
  const explanation = entry?.explanation;
  const strings = [
    ...(Array.isArray(explanation?.previewReasons) ? explanation.previewReasons : []),
    ...(Array.isArray(explanation?.reasons) ? explanation.reasons : []),
  ].filter((value) => typeof value === 'string' && value.trim() && !value.includes('[object Object]'));
  return strings.find((value) => /last played|current rotation|rated|logged|unplayed/i.test(value)) || '';
};

export default function DiscoverQuickPicks({ library = [], onLaunchGame, activeSessions = {} }) {
  const [intent, setIntent] = useState(readSaved);
  const [theme, setTheme] = useState(() => getSeasonalTheme());

  // A long-running app can cross a month boundary — re-check on window focus.
  useEffect(() => {
    const update = () => setTheme(getSeasonalTheme());
    window.addEventListener('focus', update);
    return () => window.removeEventListener('focus', update);
  }, []);

  useEffect(() => {
    StorageService.set(STORAGE_KEY, { intent });
  }, [intent]);

  // A saved seasonal lane silently falls back to the mix outside its month.
  const effectiveIntent = intent === 'seasonal' && !theme ? '' : intent;

  const runningKey = JSON.stringify(Object.keys(activeSessions || {}));
  const running = useMemo(
    () => new Set(JSON.parse(runningKey).map((name) => String(name).trim().toLowerCase())),
    [runningKey]
  );

  const focus = useMemo(() => RecommendationEngine.getCurrentPlayFocus(), []);

  // "Not installed" loads the owned pool on demand — never for other lanes.
  const [ownedPool, setOwnedPool] = useState([]);
  const [ownedLoading, setOwnedLoading] = useState(false);
  const [ownedError, setOwnedError] = useState(false);
  const [modalGame, setModalGame] = useState(null);
  const [installing, setInstalling] = useState(null);
  const [installError, setInstallError] = useState(null);

  useEffect(() => {
    if (effectiveIntent !== 'uninstalled') return undefined;
    let cancelled = false;
    setOwnedPool([]);
    setOwnedError(false);
    setOwnedLoading(true);
    OwnedBacklogService.getPool(library)
      .then((pool) => {
        if (!cancelled) setOwnedPool(Array.isArray(pool) ? pool : []);
      })
      .catch(() => {
        if (!cancelled) setOwnedError(true);
      })
      .finally(() => {
        if (!cancelled) setOwnedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [effectiveIntent, library]);

  const [dismissals, setDismissals] = useState(EMPTY_DISMISSALS);
  // Re-render picks when a set-aside preference is saved or cleared anywhere.
  const [preferenceRevision, setPreferenceRevision] = useState(0);
  useEffect(() => {
    const bump = () => setPreferenceRevision((value) => value + 1);
    window.addEventListener(PREFERENCE_CHANGE_EVENT, bump);
    return () => window.removeEventListener(PREFERENCE_CHANGE_EVENT, bump);
  }, []);
  const context = useMemo(
    () => ({ library, intent: effectiveIntent, running, theme, ownedPool, preferenceRevision }),
    [library, effectiveIntent, running, theme, ownedPool, preferenceRevision]
  );
  const result = useMemo(() => {
    const source = effectiveIntent === 'uninstalled' ? ownedPool : library;
    const games = Array.isArray(source)
      ? source.filter(
          (game) =>
            game?.name &&
            !game.hidden &&
            !game.isHidden &&
            !RecommendationPreferenceService.isSetAside(game.name) &&
            !running.has(normalize(game.name)) &&
            !dismissals.keys.includes(keyOf(game))
        )
      : [];
    const eligible = new Set(games.map(keyOf));
    const slots = dismissals.context === context ? dismissals.slots : [];
    const retained = slots.map((entry) => (entry && eligible.has(keyOf(entry.game)) ? entry : null));
    const seen = new Set(retained.filter(Boolean).map((entry) => keyOf(entry.game)));
    const candidates = games.filter((game) => !seen.has(keyOf(game)));

    // Pools: each card has a concrete job, computed from real library data.
    const now = Date.now();
    const continuePool = candidates.filter(
      (game) =>
        !isGameUnplayed(game) &&
        ((lastPlayedTimestamp(game) > 0 && now - lastPlayedTimestamp(game) <= RECENT_WINDOW_MS) ||
          Boolean(focusEntryFor(game, focus)))
    );
    const continueKeys = new Set(continuePool.map(gameKey));
    const pools = {
      continue: continuePool,
      comfort: candidates.filter(
        (game) =>
          !isGameUnplayed(game) &&
          !continueKeys.has(gameKey(game)) &&
          (getBlendedPlaytimeMinutes(game) >= PROVEN_MINUTES || ratingOf(game) >= PROVEN_RATING)
      ),
      new: candidates.filter((game) => isGameUnplayed(game)),
      seasonal: candidates.filter((game) => matchesSeasonalTheme(game, theme)),
      uninstalled: candidates,
    };
    const slotByKey = new Map();
    MIX_ORDER.forEach((slot) => pools[slot].forEach((game) => slotByKey.set(keyOf(game), slot)));

    const take = (pool, count, slot) => {
      if (!pool.length || count <= 0) return [];
      const poolKeys = new Set(pool.map(keyOf));
      return (RecommendationEngine.getPerfectPlayResult(pool, null, null, null, count)?.entries || [])
        .filter((entry) => {
          if (!entry?.game?.name) return false;
          const key = keyOf(entry.game);
          // The engine must never emit a game outside the supplied pool.
          if (!poolKeys.has(key) || !eligible.has(key) || seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map((entry) => ({ ...entry, _slot: slot || slotByKey.get(keyOf(entry.game)) || effectiveIntent }));
    };

    const fresh = [];
    if (effectiveIntent) {
      // One lane: a single engine call on that pool.
      const pool = effectiveIntent === 'surprise' ? candidates : pools[effectiveIntent] || [];
      fresh.push(...take(pool, 3 - seen.size, effectiveIntent));
    } else if (seen.size < 3) {
      // The mix: one pick per job, then backfill from what is left over.
      MIX_ORDER.forEach((slot) => {
        fresh.push(...take(pools[slot], 1, slot));
      });
      const remaining = 3 - seen.size;
      if (remaining > 0) {
        const leftover = MIX_ORDER.flatMap((slot) => pools[slot]).filter((game) => !seen.has(keyOf(game)));
        fresh.push(...take(leftover, remaining, null));
      }
    }

    // Retained cards keep their positions; a dismissed slot prefers a fresh pick
    // whose job is not already covered so each card keeps a distinct role.
    const merged = retained.slice(0, 3);
    while (merged.length < 3) merged.push(null);
    for (let i = 0; i < merged.length; i += 1) {
      if (merged[i]) continue;
      const usedSlots = new Set(merged.filter(Boolean).map((entry) => entry._slot));
      const index = fresh.findIndex((entry) => !usedSlots.has(entry._slot));
      merged[i] = index >= 0 ? fresh.splice(index, 1)[0] : fresh.shift() || null;
    }
    const entries = merged.filter(Boolean);
    entries.push(...fresh.slice(0, 3 - entries.length));
    return entries.length ? { entries } : null;
  }, [library, effectiveIntent, running, dismissals, context, focus, ownedPool, theme]);

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
      keys: [...new Set([...current.keys, keyOf(game)])],
      slots: result.entries.map((entry) => (keyOf(entry.game) === keyOf(game) ? null : entry)),
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

  const pick = (value) => {
    setInstallError(null);
    setIntent((current) => (current === value ? '' : value));
  };

  const installOwned = (game) => {
    const key = keyOf(game);
    setInstallError(null);
    setInstalling(key);
    const action =
      game.source === 'itch'
        ? openExternalUrl(game.url || 'https://itch.io/my-purchases')
        : PendingInstallService.installOwnedGame(game);
    Promise.resolve(action)
      .then((opened) => {
        if (opened === false) {
          setInstallError(`Couldn't open the installer for ${game.name}. Try again from the launcher.`);
        }
      })
      .catch(() => setInstallError(`Couldn't open the installer for ${game.name}. Try again from the launcher.`))
      .finally(() => setInstalling(null));
  };

  const INSTALL_LABELS = { steam: 'Install', epic: 'Install', gog: 'Install', itch: 'Open on itch.io' };

  return (
    <section className="discover-quick-picks" aria-labelledby="discover-quick-picks-heading">
      <header className="discover-quick-picks-header">
        <div>
          <h2 id="discover-quick-picks-heading">Can't decide?</h2>
          <p>Three picks with different jobs — take the mix or pick a lane.</p>
        </div>
      </header>

      <div className="discover-quick-pick-rows">
        <div className="discover-quick-pick-row" role="group" aria-label="Pick a lane">
          {INTENT_OPTIONS.map((option) => {
            if (option.value === 'seasonal' && !theme) return null;
            const Icon = option.Icon;
            return (
              <button
                key={option.value || 'mix'}
                type="button"
                className="discover-pick-pill"
                aria-pressed={effectiveIntent === option.value}
                onClick={() => pick(option.value)}
                title={option.value === 'seasonal' ? theme.description : undefined}
              >
                {Icon && <Icon size={14} aria-hidden="true" />}
                {option.value === 'seasonal' ? theme.label : option.label}
              </button>
            );
          })}
        </div>
      </div>

      {effectiveIntent === 'seasonal' && theme && <p className="discover-quick-picks-theme">{theme.description}</p>}

      {RecommendationPreferenceService.hasPreferences() && (
        <p className="discover-quick-picks-theme">
          Games you set aside remain in your library. Open their details to recommend them again.
        </p>
      )}

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
      {effectiveIntent === 'uninstalled' && installError && (
        <p role="alert" className="discover-quick-pick-empty">
          {installError}
        </p>
      )}
      {effectiveIntent === 'uninstalled' && ownedLoading ? (
        <p className="discover-quick-pick-empty" role="status">
          Loading your owned games…
        </p>
      ) : effectiveIntent === 'uninstalled' && ownedError ? (
        <p className="discover-quick-pick-empty">Could not load your owned games right now. Try again later.</p>
      ) : result ? (
        <div className="discover-quick-pick-cards">
          {result.entries.map((entry, index) => {
            const game = entry.game;
            const owned = effectiveIntent === 'uninstalled';
            const artwork = resolveGameArtwork(game, { surface: 'portrait' });
            const placeholder = getGameArtworkPlaceholder({ game, surface: 'portrait' });
            const reason = slotReason(entry._slot, game, entry, focus, theme);
            const appid = SteamPublicService.appIdOf(game);
            const playing = !owned && appid ? playerCounts[appid] : null;
            const installKey = keyOf(game);
            return (
              <article key={installKey} className="discover-quick-pick-card">
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
                  {owned && <p className="discover-quick-pick-meta">{game.platform || game.source} · Not installed</p>}
                  {playing && (
                    <p className="discover-quick-pick-meta">
                      <span
                        className="discover-quick-pick-players"
                        title={`Steam player count · as of ${new Date(playing.fetchedAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}`}
                      >
                        {compactCount(playing.count)} playing
                      </span>
                    </p>
                  )}
                  {owned ? (
                    <div className="discover-quick-pick-actions">
                      <button
                        type="button"
                        className="discover-quick-pick-play"
                        onClick={() => setModalGame(game)}
                        aria-label={`${game.name} details`}
                      >
                        Details
                      </button>
                      <button
                        type="button"
                        className="discover-quick-pick-play"
                        onClick={() => installOwned(game)}
                        disabled={installing === installKey}
                        aria-label={`${INSTALL_LABELS[game.source] || 'Install'} ${game.name}`}
                      >
                        <Download size={14} aria-hidden="true" />{' '}
                        {installing === installKey ? 'Opening…' : INSTALL_LABELS[game.source] || 'Install'}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="discover-quick-pick-play"
                      onClick={() => onLaunchGame?.(game)}
                      aria-label={`Play ${game.name}`}
                    >
                      <Play size={14} aria-hidden="true" /> Play
                    </button>
                  )}
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
                  <RecommendationPreferenceControl game={game} />
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="discover-quick-pick-empty">
          {effectiveIntent === 'uninstalled'
            ? 'No owned, uninstalled games found. Connect your libraries in Settings or try another lane.'
            : effectiveIntent === 'seasonal'
              ? 'No matching games found in your library metadata. Try another lane.'
              : !Array.isArray(library) || library.length === 0
                ? 'Scan your library and GamePilot will put up to three picks here — no filters needed.'
                : 'No picks to show — reset skipped picks or try another lane.'}
        </p>
      )}
      {modalGame && (
        <OwnedGameModal
          game={modalGame}
          onClose={() => setModalGame(null)}
          onInstall={(g) => {
            setModalGame(null);
            installOwned(g);
          }}
          installing={installing === keyOf(modalGame)}
        />
      )}
    </section>
  );
}
