import StorageService from './StorageService';
import { PlaytimeAutoLogger } from './PlaytimeAutoLogger';

const ERA_WINDOW_DAYS = 30;
const PREVIOUS_WINDOW_DAYS = 30;
const HALF_LIFE_DAYS = 14;
const ERA_HISTORY_KEY = 'currentEraHistory';

const DAY_MS = 24 * 60 * 60 * 1000;

const getSessionStart = (session) => {
  if (!session) return null;
  const raw = session.startTime || session.startedAt || session.timestamp || session.date || session.endTime || null;
  if (!raw) return null;
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : null;
};

const getSessionDuration = (session) => {
  if (!session) return 0;
  const raw = session.playtimeMinutes ?? session.duration ?? session.durationMinutes ?? session.playtime ?? 0;
  const num = Number(raw);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, num);
};

const normalizeKey = (value) => (value ? String(value).trim().toLowerCase() : '');

const getGameGenres = (game) => {
  if (!game) return [];
  const genres = game.genres || game.genre || [];
  if (Array.isArray(genres)) return genres.filter(Boolean).map((g) => String(g).toLowerCase());
  if (typeof genres === 'string') return [genres.toLowerCase()];
  return [];
};

// Broad genre clusters -> era flavor names
const ERA_THEMES = [
  { match: ['survival', 'zombie', 'crafting', 'open world survival craft'], name: 'The Wilderness Era', flavor: 'living off the land' },
  { match: ['souls-like', 'soulslike', 'difficult', 'roguelike', 'roguelite'], name: 'The Gauntlet Era', flavor: 'chasing the pain' },
  { match: ['rpg', 'jrpg', 'crpg', 'adventure', 'story-rich', 'visual novel'], name: 'The Saga Era', flavor: 'living in other worlds' },
  { match: ['shooter', 'fps', 'action', 'tps', 'boomer shooter'], name: 'The Frontline Era', flavor: 'running and gunning' },
  { match: ['sandbox', 'open world', 'simulation'], name: 'The Wanderer Era', flavor: 'no map, no rules' },
  { match: ['strategy', 'grand strategy', '4x', 'city builder', 'management', 'tycoon'], name: 'The War Room Era', flavor: 'thinking three turns ahead' },
  { match: ['horror', 'survival horror', 'psychological horror'], name: 'The Midnight Era', flavor: 'playing with the lights off' },
  { match: ['platformer', 'metroidvania', 'precision platformer'], name: 'The Momentum Era', flavor: 'always moving' },
  { match: ['racing', 'sports', 'driving'], name: 'The Grand Prix Era', flavor: 'chasing lap times' },
  { match: ['puzzle', 'logic', 'mystery'], name: 'The Puzzlebox Era', flavor: 'everything is a clue' },
  { match: ['indie', 'casual', 'relaxing'], name: 'The Slow Burn Era', flavor: 'small games, big feelings' },
  { match: ['mmo', 'multiplayer', 'co-op', 'pvp'], name: 'The Guildhall Era', flavor: 'never playing alone' }
];

const buildSnapshot = (sessions, library, now, windowDays) => {
  const cutoff = now - windowDays * DAY_MS;
  const windowSessions = sessions.filter((s) => {
    const start = getSessionStart(s);
    return start !== null && start >= cutoff && start <= now;
  });

  const weightFor = (session) => {
    const start = getSessionStart(session);
    if (start === null) return 1;
    const daysAgo = (now - start) / DAY_MS;
    return Math.exp(-0.6931471805599453 * daysAgo / HALF_LIFE_DAYS);
  };

  const libraryByName = new Map();
  (Array.isArray(library) ? library : []).forEach((game) => {
    const key = normalizeKey(game?.name || game?.title);
    if (key) libraryByName.set(key, game);
  });

  const playtimeByGame = {};
  const genrePlaytime = {};
  let totalMinutes = 0;
  let sessionCount = 0;
  const durations = [];

  windowSessions.forEach((session) => {
    const duration = getSessionDuration(session);
    if (duration <= 0) return;
    const weight = weightFor(session);
    const weighted = duration * weight;
    totalMinutes += weighted;
    sessionCount += weight;
    durations.push(duration);

    const key = normalizeKey(session.gameName || session.gameId);
    if (!key) return;
    playtimeByGame[key] = (playtimeByGame[key] || 0) + weighted;

    const game = libraryByName.get(key);
    getGameGenres(game).forEach((genre) => {
      genrePlaytime[genre] = (genrePlaytime[genre] || 0) + weighted;
    });
  });

  const displayNameFor = (key) => {
    const game = libraryByName.get(key);
    return game?.name || game?.title || key;
  };

  const topGames = Object.entries(playtimeByGame)
    .map(([key, minutes]) => ({ name: displayNameFor(key), minutes }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 5);

  const sortedGenres = Object.entries(genrePlaytime).sort((a, b) => b[1] - a[1]);
  const dominantGenre = sortedGenres[0]?.[0] || null;
  const totalGenreMinutes = sortedGenres.reduce((acc, [, v]) => acc + v, 0);
  const dominantGenreShare = totalGenreMinutes > 0 && dominantGenre
    ? genrePlaytime[dominantGenre] / totalGenreMinutes
    : 0;

  const avgSessionLength = durations.length
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 0;

  const sessionBucket = avgSessionLength === 0
    ? null
    : avgSessionLength < 30 ? 'short' : avgSessionLength < 90 ? 'medium' : 'long';

  return {
    windowDays,
    totalMinutes: Math.round(totalMinutes),
    sessionCount: Math.round(sessionCount * 10) / 10,
    rawSessionCount: windowSessions.length,
    avgSessionLength,
    sessionBucket,
    topGames,
    dominantGenre,
    dominantGenreShare,
    genreMix: sortedGenres.slice(0, 4).map(([genre, minutes]) => ({ genre, minutes: Math.round(minutes) }))
  };
};

const nameEra = (snapshot) => {
  if (!snapshot || snapshot.totalMinutes <= 0) {
    return { name: 'The Quiet Season', flavor: 'the games are waiting' };
  }
  const genre = snapshot.dominantGenre || '';
  const theme = ERA_THEMES.find((t) => t.match.some((m) => genre.includes(m)));
  if (theme) return { name: theme.name, flavor: theme.flavor };
  const topGame = snapshot.topGames[0]?.name;
  if (topGame) return { name: `The ${topGame} Era`, flavor: 'one game above all' };
  return { name: 'The Wandering Era', flavor: 'a bit of everything' };
};

const detectDrift = (current, previous) => {
  const notes = [];
  if (!current || current.totalMinutes <= 0) {
    return { hasDrift: false, notes: ['No recent play detected — the story is paused.'] };
  }
  if (!previous || previous.totalMinutes <= 0) {
    return { hasDrift: false, notes: ['Not enough history yet to spot a shift.'] };
  }

  if (current.dominantGenre && previous.dominantGenre && current.dominantGenre !== previous.dominantGenre) {
    notes.push(`Genre shift: ${previous.dominantGenre} → ${current.dominantGenre}`);
  }

  const prevTop = new Set((previous.topGames || []).slice(0, 3).map((g) => normalizeKey(g.name)));
  const newEntries = (current.topGames || []).filter((g) => !prevTop.has(normalizeKey(g.name)));
  if (newEntries.length > 0) {
    const names = newEntries.slice(0, 3).map((g) => g.name).join(', ');
    notes.push(`New in rotation: ${names}`);
  }

  const prevTopGame = previous.topGames?.[0]?.name;
  const currTopGame = current.topGames?.[0]?.name;
  if (prevTopGame && currTopGame && normalizeKey(prevTopGame) !== normalizeKey(currTopGame)) {
    notes.push(`Lead changed: ${prevTopGame} → ${currTopGame}`);
  }

  if (current.sessionBucket && previous.sessionBucket && current.sessionBucket !== previous.sessionBucket) {
    notes.push(`Session shape: ${previous.sessionBucket} → ${current.sessionBucket} (${previous.avgSessionLength}m → ${current.avgSessionLength}m avg)`);
  }

  if (previous.sessionCount > 0) {
    const paceChange = (current.sessionCount - previous.sessionCount) / previous.sessionCount;
    if (paceChange >= 0.4) notes.push('Pace up: playing noticeably more often.');
    else if (paceChange <= -0.4) notes.push('Pace down: sessions are getting rarer.');
  }

  return { hasDrift: notes.length > 0, notes };
};

export class CurrentEraService {
  static getCurrentEra() {
    const sessions = PlaytimeAutoLogger.getSessionHistory() || [];
    const library = StorageService.get('library', []);
    const now = Date.now();

    const current = buildSnapshot(sessions, library, now, ERA_WINDOW_DAYS);
    const previous = buildSnapshot(
      sessions,
      library,
      now - ERA_WINDOW_DAYS * DAY_MS,
      PREVIOUS_WINDOW_DAYS
    );

    const theme = nameEra(current);
    const drift = detectDrift(current, previous);

    const history = StorageService.get(ERA_HISTORY_KEY, []);
    const signature = `${theme.name}|${current.dominantGenre || 'none'}|${current.topGames[0]?.name || 'none'}`;
    const lastEntry = Array.isArray(history) ? history[history.length - 1] : null;

    let eraHistory = Array.isArray(history) ? history : [];
    if (current.totalMinutes > 0 && (!lastEntry || lastEntry.signature !== signature)) {
      eraHistory = [
        ...eraHistory.slice(-9),
        { signature, name: theme.name, genre: current.dominantGenre, topGame: current.topGames[0]?.name || null, since: now }
      ];
      try {
        StorageService.set(ERA_HISTORY_KEY, eraHistory);
      } catch { /* ignore */ }
    }

    return {
      name: theme.name,
      flavor: theme.flavor,
      snapshot: current,
      previousSnapshot: previous,
      drift,
      history: eraHistory
    };
  }

  static getEraTagline() {
    try {
      const era = CurrentEraService.getCurrentEra();
      if (!era || !era.snapshot || era.snapshot.totalMinutes <= 0) return null;
      const hours = (era.snapshot.totalMinutes / 60).toFixed(1);
      const topGame = era.snapshot.topGames[0]?.name;
      const parts = [`${era.name}`];
      if (topGame) parts.push(`lately led by ${topGame}`);
      parts.push(`${hours}h in the last ${era.snapshot.windowDays} days`);
      return parts.join(' · ');
    } catch {
      return null;
    }
  }
}

export default CurrentEraService;
