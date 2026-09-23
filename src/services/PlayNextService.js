// PlayNextService.js
// The startup decision: what should the player launch right now.
//
// Two modes:
//   resume — the last-played game is recent enough that "jump back in" is the
//     obvious answer. Ties into the era system when the run is era-dominant.
//   pick — otherwise, the recommendation engine's top pick for right now,
//     with its generated explanation and typical session length.
//
// Pure-ish: reads session history + library, returns plain data the UI renders.

import { PlaytimeAutoLogger } from './PlaytimeAutoLogger';
import { RecommendationEngine } from './RecommendationEngine';
import CurrentEraService from './CurrentEraService';

const RESUME_WINDOW_MS = 72 * 60 * 60 * 1000; // 3 days
const PICK_COUNT = 3;

const normalizeKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase();

const getSessionTime = (session) => {
  const raw = session?.endTime || session?.timestamp || session?.startTime;
  const ts = raw ? new Date(raw).getTime() : 0;
  return Number.isFinite(ts) ? ts : 0;
};

const findLibraryGame = (library, name, gameId) => {
  const key = normalizeKey(name);
  if (!key) return null;
  return (
    library.find(
      (game) =>
        normalizeKey(game?.name || game?.title) === key ||
        (gameId && String(game?.appid || game?.id) === String(gameId))
    ) || null
  );
};

const formatLastPlayed = (ms) => {
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours < 1) return 'less than an hour ago';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
};

export class PlayNextService {
  /**
   * Returns { mode, primary: {game, reason, detail}, alternates: [...] } or
   * null when there is nothing to suggest (empty library / no data).
   */
  static getPlayNext(library = []) {
    const games = Array.isArray(library) ? library.filter(Boolean) : [];
    if (games.length === 0) return null;

    const now = Date.now();
    const sessions = (PlaytimeAutoLogger.getSessionHistory() || [])
      .map((session) => ({ session, ts: getSessionTime(session) }))
      .filter((entry) => entry.ts > 0 && entry.session?.gameName)
      .sort((a, b) => b.ts - a.ts);

    const lastSession = sessions[0] || null;
    const resumeGame = lastSession
      ? findLibraryGame(games, lastSession.session.gameName, lastSession.session.gameId)
      : null;
    const canResume = resumeGame && now - lastSession.ts <= RESUME_WINDOW_MS;

    const result = RecommendationEngine.getPerfectPlayResult(games, null, null, null, PICK_COUNT);
    const toChoice = (entry) => ({
      game: entry.game,
      reason:
        [entry.explanation, entry.explanation?.summary, entry.explanation?.fullExplanation].find(
          (value) => typeof value === 'string' && value.trim()
        ) || 'A strong fit for how you play right now.',
      detail: entry.estimatedSessionMinutes ? `~${Math.round(entry.estimatedSessionMinutes)}m typical session` : null,
    });
    const entries = (result?.entries || [])
      .filter(
        (entry) =>
          entry?.game &&
          normalizeKey(entry.game.name || entry.game.title) !== normalizeKey(resumeGame?.name || resumeGame?.title)
      )
      .map(toChoice);

    if (canResume) {
      let reason = `You last played ${formatLastPlayed(now - lastSession.ts)} — keep the run going.`;
      try {
        const era = CurrentEraService.getCurrentEra();
        if (
          era?.gameDominated &&
          era?.topGame &&
          normalizeKey(era.topGame) === normalizeKey(resumeGame.name || resumeGame.title)
        ) {
          reason = `Day ${era.dayCount} of ${era.name}. The run isn't over.`;
        }
      } catch {
        /* era flavour is optional */
      }
      return {
        mode: 'resume',
        primary: { game: resumeGame, reason, detail: null },
        alternates: entries,
      };
    }

    if (entries.length === 0) return null;

    return {
      mode: 'pick',
      primary: entries[0],
      alternates: entries.slice(1),
    };
  }
}

export default PlayNextService;
