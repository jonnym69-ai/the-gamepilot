import SessionRepository from './SessionRepository';

const timestamp = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const ms = typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(ms) && ms > 0 ? ms : null;
};
const nameKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase();

/**
 * Observations from settled local sessions, never inferred from imported hours.
 * Name fallback supports legacy rows; conflicting explicit IDs never match.
 * Median uses the latest ten valid sessions (at least three), without silently
 * discarding long sessions. It describes recorded time, not uninterrupted play.
 */
export const getGameSessionContext = (game, history = SessionRepository.getSessionHistory(), now = Date.now()) => {
  const gameName = nameKey(game?.name || game?.title);
  const gameId = game?.id == null ? '' : String(game.id);
  const sessions = SessionRepository.dedupeSessionHistory(Array.isArray(history) ? history : [])
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

  const recent = sessions.slice(0, 10);
  const lengths = recent.map((row) => row.minutes).sort((a, b) => a - b);
  const middle = Math.floor(lengths.length / 2);
  const medianMinutes =
    lengths.length < 3
      ? null
      : Math.round(lengths.length % 2 ? lengths[middle] : (lengths[middle - 1] + lengths[middle]) / 2);
  // UTC month keys make this count stable across machines/timezone settings.
  const activeMonths = new Set(sessions.map((row) => new Date(row.at).toISOString().slice(0, 7))).size;
  const notes = [
    ...sessions.filter((row) => row.note).map((row) => ({ at: row.at, text: row.note })),
    ...(Array.isArray(game?.sessionNotes) ? game.sessionNotes : []).map((note) => ({
      at: timestamp(note?.timestamp),
      text: typeof note?.text === 'string' ? note.text.trim() : '',
    })),
  ]
    .filter((note) => note.at !== null && note.at <= now && note.text)
    .sort((a, b) => b.at - a.at)
    .filter((note, index, all) => all.findIndex((other) => other.at === note.at && other.text === note.text) === index);

  return {
    sessionCount: sessions.length,
    lastSessionAt: sessions[0]?.at || null,
    lastSessionMinutes: sessions[0]?.minutes ?? null,
    medianMinutes,
    sampleCount: recent.length,
    activeMonths,
    notes,
  };
};
