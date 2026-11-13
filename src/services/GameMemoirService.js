// Per-game memoir — assembles the "character sheet" for one title from data
// the app already holds: settled sessions, completion history, era records,
// signature titles, cached achievements. Nothing fabricated — a field only
// appears when the underlying record exists.
import SessionRepository from './SessionRepository';
import { GameCurationService } from './GameCurationService';
import SignatureTitleService from './SignatureTitleService';
import SteamAchievementsService from './SteamAchievementsService';
import StorageService from './StorageService';

const DAY_MS = 24 * 60 * 60 * 1000;

const timestamp = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const ms = typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(ms) && ms > 0 ? ms : null;
};

const nameKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase();

const STATUS_LABELS = {
  beaten: 'Beaten',
  completed: 'Completed',
  '100%': '100%',
  abandoned: 'Shelved',
  playing: 'In progress',
  'not-started': 'Not started',
};

const sessionsFor = (game, history, now) => {
  const gameName = nameKey(game?.name || game?.title);
  const gameId = game?.id == null ? '' : String(game.id);
  return SessionRepository.dedupeSessionHistory(Array.isArray(history) ? history : [])
    .filter((row) => {
      const rowId = row?.gameId == null ? '' : String(row.gameId);
      if (gameId && rowId && nameKey(rowId) !== gameName) return gameId === rowId;
      return Boolean(gameName) && nameKey(row?.gameName) === gameName;
    })
    .map((row) => ({
      at: timestamp(row.endTime || row.timestamp || row.ended_at),
      minutes: Number(row.playtimeMinutes ?? row.playtime ?? row.duration ?? row.minutes),
      note: typeof row.note === 'string' ? row.note.trim() : '',
    }))
    .filter((row) => row.at !== null && row.at <= now && Number.isFinite(row.minutes) && row.minutes > 0)
    .sort((a, b) => b.at - a.at);
};

const eraHeadline = (gameName) => {
  try {
    const history = StorageService.get('currentEraHistory', []);
    if (!Array.isArray(history)) return null;
    const hit = [...history].reverse().find((entry) => nameKey(entry?.topGame) === gameName);
    return hit ? { name: hit.name, since: hit.since } : null;
  } catch {
    return null;
  }
};

const completionState = (gameName) => {
  try {
    const entry = GameCurationService.getGameCompletion?.(gameName) || { status: 'not-started', history: [] };
    const status = entry.status && entry.status !== 'not-started' ? entry.status : null;
    if (!status) return null;
    const at = Array.isArray(entry.history)
      ? entry.history.reduce((latest, h) => Math.max(latest, timestamp(h?.timestamp) || 0), 0) || null
      : null;
    return { status, label: STATUS_LABELS[status] || status, at };
  } catch {
    return null;
  }
};

export const GameMemoirService = {
  getMemoir(game, library = [], now = Date.now()) {
    if (!game) return { hasAny: false };
    const history = SessionRepository.getSessionHistory();
    const sessions = sessionsFor(game, history, now);
    const gameName = nameKey(game?.name || game?.title);

    const totalMinutes = sessions.reduce((sum, s) => sum + s.minutes, 0);
    const longest = sessions.reduce((best, s) => (s.minutes > (best?.minutes || 0) ? s : best), null);
    const firstPlayedAt = sessions.length ? sessions[sessions.length - 1].at : null;
    const activeMonths = new Set(sessions.map((s) => new Date(s.at).toISOString().slice(0, 7))).size;
    const daySpan =
      sessions.length > 1
        ? Math.max(1, Math.round((sessions[0].at - sessions[sessions.length - 1].at) / DAY_MS) + 1)
        : 0;

    let signatureTitle = null;
    try {
      signatureTitle = SignatureTitleService.getTitleForGame(game?.name || game?.title, library) || null;
    } catch {
      signatureTitle = null;
    }

    const appid = game.appid ?? game.steam_appid ?? game.steamAppId ?? game.appId;
    let achievements = null;
    try {
      const cached = appid ? SteamAchievementsService.getCachedForGame(appid) : null;
      if (cached?.ok && cached.total > 0) achievements = { unlocked: cached.unlocked, total: cached.total };
    } catch {
      achievements = null;
    }

    const status = completionState(game?.name || game?.title);
    const era = gameName ? eraHeadline(gameName) : null;
    const latestNote = sessions.find((s) => s.note) || null;
    const ra = game.raProgress && game.raProgress.total > 0 ? game.raProgress : null;

    const hasAny = sessions.length > 0 || status || era || signatureTitle || achievements || ra || totalMinutes > 0;

    return {
      hasAny: Boolean(hasAny),
      sessionCount: sessions.length,
      totalMinutes,
      longestSession: longest ? { minutes: longest.minutes, at: longest.at } : null,
      firstPlayedAt,
      lastPlayedAt: sessions[0]?.at || null,
      daySpan,
      activeMonths,
      status,
      era,
      signatureTitle,
      achievements,
      ra,
      latestNote: latestNote ? { at: latestNote.at, text: latestNote.note } : null,
    };
  },
};

export default GameMemoirService;
