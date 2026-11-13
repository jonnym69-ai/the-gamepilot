// First read — the day-one story for a brand-new user. Rendered only while
// real tracked sessions are still scarce; built entirely from imported
// playtime (Steam/GOG minutes, Epic's library side) so it's honest history,
// clearly labelled "recorded elsewhere", never fabricated sessions.

const SESSIONS_FOR_FULL_STORY = 8;

const importedMinutes = (game) =>
  Math.max(
    0,
    Number(game?.importedPlaytimeMinutes) || Number(game?.playtimeForever) || Number(game?.totalPlaytime) || 0
  );

const lastPlayedMs = (game) => {
  const raw = game?.last_played || game?.lastPlayed;
  const ms = raw ? new Date(raw).getTime() : 0;
  return Number.isFinite(ms) ? ms : 0;
};

export const FirstReadService = {
  /**
   * @returns {null|{totalMinutes, topGames, platformCounts, latestPlayed,
   *   genreMinutes, sessionsSoFar, importedGames}} or null once the user has
   *   enough real sessions that the regular story surfaces take over.
   */
  getFirstRead(library = [], sessionHistory = []) {
    const sessions = Array.isArray(sessionHistory) ? sessionHistory.length : 0;
    if (sessions >= SESSIONS_FOR_FULL_STORY) return null;

    const imported = (Array.isArray(library) ? library : [])
      .filter((g) => g?.name && importedMinutes(g) > 0)
      .map((g) => ({
        name: g.name,
        platform: g.platform || '',
        genres: Array.isArray(g.genres) ? g.genres : [],
        minutes: importedMinutes(g),
        lastPlayed: lastPlayedMs(g),
      }));
    if (imported.length === 0) return null;

    const platformCounts = new Map();
    const genreMinutes = new Map();
    let totalMinutes = 0;
    imported.forEach((g) => {
      totalMinutes += g.minutes;
      const p = g.platform || 'Other';
      platformCounts.set(p, (platformCounts.get(p) || 0) + 1);
      (Array.isArray(g.genres) ? g.genres : []).forEach((genre) =>
        genreMinutes.set(genre, (genreMinutes.get(genre) || 0) + g.minutes)
      );
    });

    const topGames = [...imported].sort((a, b) => b.minutes - a.minutes).slice(0, 5);
    const latestPlayed = [...imported].sort((a, b) => b.lastPlayed - a.lastPlayed)[0] || null;
    const topGenres = [...genreMinutes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

    // Library size across every launcher — Epic contributes names even without
    // minutes, so count the full scanned library for the "you own N games" line.
    const ownedGames = (library || []).filter((g) => g?.name).length;

    return {
      totalMinutes,
      topGames,
      platformCounts: [...platformCounts.entries()].sort((a, b) => b[1] - a[1]),
      latestPlayed: latestPlayed?.lastPlayed ? latestPlayed : null,
      topGenres,
      ownedGames,
      importedGames: imported.length,
      sessionsSoFar: sessions,
      sessionsToFullStory: SESSIONS_FOR_FULL_STORY,
    };
  },
};

export default FirstReadService;
