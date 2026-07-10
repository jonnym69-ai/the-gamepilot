// GamingPersonaService.js - Memeish, data-backed gaming personas
// Computes a primary persona, sub-traits, and a roast line from local play data.
import StorageService from './StorageService';
import { UserBehaviorProfile } from './UserBehaviorProfile';
import { PlaytimeAutoLogger } from './PlaytimeAutoLogger';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getReleaseYear = (game) => {
  if (!game) return null;
  const raw = game.releaseDate || game.release_date || game.releaseYear || game.year || game.first_release_date;
  if (!raw) return null;
  const match = String(raw).match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
};

const getPlaytime = (game) => {
  if (!game) return 0;
  // Steam returns minutes; internal GamePilot also uses minutes.
  // playtime is stored as an object with .total in some places, so check
  // the specific numeric fields first.
  const candidates = [
    game.time_played,
    game.playtime?.total,
    game.playtime?.minutes,
    game.playtimeMinutes,
    game.importedPlaytimeMinutes
  ];
  for (const raw of candidates) {
    if (raw === null || raw === undefined) continue;
    const num = Number(raw);
    if (Number.isFinite(num)) return Math.max(0, num);
  }
  return 0;
};

const getGenres = (game) => {
  if (!game) return [];
  const genres = game.genres || game.genre || game.genreNames || [];
  if (Array.isArray(genres)) return genres.filter(Boolean).map((g) => String(g).toLowerCase());
  if (typeof genres === 'string') return [genres.toLowerCase()];
  return [];
};

const getTags = (game) => {
  if (!game) return [];
  const tags = game.tags || game.tag || game.steamTags || [];
  if (Array.isArray(tags)) return tags.filter(Boolean).map((t) => String(t).toLowerCase());
  if (typeof tags === 'string') return [tags.toLowerCase()];
  return [];
};

const getDevelopers = (game) => {
  if (!game) return [];
  const devs = game.developers || game.developer || game.developerNames || [];
  if (Array.isArray(devs)) return devs.filter(Boolean);
  if (typeof devs === 'string') return [devs];
  return [];
};

const getPublishers = (game) => {
  if (!game) return [];
  const pubs = game.publishers || game.publisher || game.publisherNames || [];
  if (Array.isArray(pubs)) return pubs.filter(Boolean);
  if (typeof pubs === 'string') return [pubs];
  return [];
};

const getFranchise = (game) => {
  if (!game) return null;
  const name = String(game.name || game.title || '');
  if (!name) return null;
  // Take the first segment before a colon, dash, or number as a rough franchise
  const base = name.split(/[:–—-]/)[0].trim();
  if (!base) return null;
  return base;
};

const clamp = (value, min, max) => {
  const num = Number(value);
  if (Number.isNaN(num) || !Number.isFinite(num)) return min;
  return Math.max(min, Math.min(max, num));
};

const sum = (arr) => arr.reduce((a, b) => a + b, 0);

const mean = (arr) => (arr.length ? sum(arr) / arr.length : 0);

// ---------------------------------------------------------------------------
// Signal gathering
// ---------------------------------------------------------------------------

const getSessionStart = (session) => {
  if (!session) return null;
  const raw = session.startTime || session.startedAt || session.timestamp || session.date || session.endTime || null;
  if (!raw) return null;
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : null;
};

const normalizeGameKey = (value) => (value ? String(value).trim().toLowerCase() : '');

const gatherSignals = (options = {}) => {
  const windowDays = Number.isFinite(options.windowDays) ? options.windowDays : null;
  const recencyHalfLifeDays = Number.isFinite(options.recencyHalfLifeDays) && options.recencyHalfLifeDays > 0
    ? options.recencyHalfLifeDays
    : null;
  const library = StorageService.get('library', []);
  const behaviorProfile = UserBehaviorProfile.getProfile();
  const personaSnapshot = UserBehaviorProfile.getPersonaSnapshot();
  const allSessions = PlaytimeAutoLogger.getSessionHistory() || [];

  // Within a time window, recent sessions contribute more than older ones.
  // Half-life of N days means a session N days old has 0.5 weight.
  const getRecencyWeight = (session) => {
    if (recencyHalfLifeDays === null) return 1;
    const start = getSessionStart(session);
    if (start === null) return 1;
    const daysAgo = (Date.now() - start) / (24 * 60 * 60 * 1000);
    return Math.exp(-0.6931471805599453 * daysAgo / recencyHalfLifeDays);
  };

  const getSessionDuration = (session) => {
    if (!session) return 0;
    const raw = session.playtimeMinutes || session.duration || session.durationMinutes || session.playtime || session.actualElapsedMinutes || session.duration_ms || session.elapsedMinutes || 0;
    const num = Number(raw);
    if (!Number.isFinite(num)) return 0;
    if (raw === session.duration_ms && num > 1000) return num / 60000;
    return Math.max(0, num);
  };

  // Restrict sessions to the requested window (null = all time).
  const cutoff = windowDays !== null ? Date.now() - windowDays * 24 * 60 * 60 * 1000 : null;
  const sessions = cutoff !== null
    ? allSessions.filter((s) => {
        const start = getSessionStart(s);
        return start === null ? false : start >= cutoff;
      })
    : allSessions;

  // In windowed (recent) mode, per-game playtime comes from sessions in the
  // window rather than the all-time library totals, so a game you stopped
  // playing fades out of the persona. Recency weighting makes newer sessions
  // count more, giving the persona a smoother drift as habits change.
  const recentPlaytimeByGame = {};
  if (windowDays !== null) {
    sessions.forEach((s) => {
      const key = normalizeGameKey(s.gameName || s.gameId);
      if (!key) return;
      const weight = getRecencyWeight(s);
      recentPlaytimeByGame[key] = (recentPlaytimeByGame[key] || 0) + getSessionDuration(s) * weight;
    });
  }
  const effectivePlaytime = (game) => {
    if (windowDays === null) return getPlaytime(game);
    const key = normalizeGameKey(game.name || game.title || game.gameName || game.appid);
    return recentPlaytimeByGame[key] || 0;
  };
  const wasPlayedInWindow = (game) => effectivePlaytime(game) > 0;

  const totalGames = library.length;
  const libraryPlaytime = library.reduce((acc, game) => acc + effectivePlaytime(game), 0);
  const sessionPlaytime = sessions.reduce(
    (acc, session) => acc + getSessionDuration(session) * getRecencyWeight(session),
    0
  );
  const totalPlaytime = libraryPlaytime || sessionPlaytime;
  const playedGames = windowDays !== null
    ? library.filter(wasPlayedInWindow).length
    : library.filter((game) => getPlaytime(game) > 0 || game.last_played).length;
  const playedRatio = totalGames > 0 ? playedGames / totalGames : 0;
  // Backlog = games that have never been launched (0 playtime, never opened).
  // This is a reliable, local-only signal that needs no manual logging.
  const neverPlayedGames = library.filter((game) => getPlaytime(game) === 0 && !game.last_played).length;
  const unplayedRatio = totalGames > 0 ? neverPlayedGames / totalGames : 0;

  // Manual completion data — only meaningful if the user actually logs it.
  const completedGames = StorageService.get('completedGames', []);
  const completedCount = (Array.isArray(completedGames) ? completedGames.length : 0)
    + library.filter((game) => ['finished', 'beaten', 'completed', '100%'].includes(game.replayIntent) || ['finished', 'beaten', 'completed', '100%'].includes(game.completionStatus)).length;
  const hasCompletionData = completedCount > 0;
  // Real completion rate = completed / games actually played. Far more honest
  // than the mood-picker selectionHistory rate, which is near-zero for everyone.
  const realCompletionRate = playedGames > 0
    ? Math.min(100, Math.round((completedCount / playedGames) * 100))
    : 0;

  const releaseYears = library.map(getReleaseYear).filter((y) => y !== null);
  const avgReleaseYear = releaseYears.length ? Math.round(mean(releaseYears)) : null;
  const releaseYearCoverage = totalGames > 0 ? releaseYears.length / totalGames : 0;

  // Most-played games by playtime — the concrete titles that define the player.
  const topGames = library
    .map((game) => ({ name: game.name || game.title || game.gameName, minutes: effectivePlaytime(game) }))
    .filter((g) => g.name && g.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 5);
  const topGame = topGames[0] || null;
  const topGameShare = totalPlaytime > 0 && topGame ? topGame.minutes / totalPlaytime : 0;

  // Genre distribution by playtime
  const genrePlaytime = {};
  library.forEach((game) => {
    const pt = effectivePlaytime(game);
    getGenres(game).forEach((genre) => {
      genrePlaytime[genre] = (genrePlaytime[genre] || 0) + pt;
    });
  });
  const totalGenrePlaytime = sum(Object.values(genrePlaytime));
  const sortedGenres = Object.entries(genrePlaytime)
    .sort((a, b) => b[1] - a[1])
    .map(([genre]) => genre);
  const dominantGenre = sortedGenres[0] || null;
  const dominantGenreShare = totalGenrePlaytime > 0 && dominantGenre
    ? genrePlaytime[dominantGenre] / totalGenrePlaytime
    : 0;

  // Tags
  const tagCounts = {};
  library.forEach((game) => {
    getTags(game).forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });
  const totalTaggedGames = library.filter((g) => getTags(g).length > 0).length;
  const indieRatio = totalTaggedGames > 0 ? (tagCounts.indie || 0) / totalTaggedGames : 0;
  const earlyAccessRatio = totalTaggedGames > 0
    ? ((tagCounts['early access'] || 0) + (tagCounts['early_access'] || 0)) / totalTaggedGames
    : 0;

  // Developer / publisher concentration
  const devPlaytime = {};
  const pubPlaytime = {};
  library.forEach((game) => {
    const pt = effectivePlaytime(game);
    getDevelopers(game).forEach((dev) => {
      devPlaytime[dev] = (devPlaytime[dev] || 0) + pt;
    });
    getPublishers(game).forEach((pub) => {
      pubPlaytime[pub] = (pubPlaytime[pub] || 0) + pt;
    });
  });
  const topDev = Object.entries(devPlaytime).sort((a, b) => b[1] - a[1])[0] || null;
  const topDevShare = totalPlaytime > 0 && topDev ? topDev[1] / totalPlaytime : 0;
  const topPub = Object.entries(pubPlaytime).sort((a, b) => b[1] - a[1])[0] || null;
  const topPubShare = totalPlaytime > 0 && topPub ? topPub[1] / totalPlaytime : 0;

  // Franchise concentration
  const franchiseGames = {};
  library.forEach((game) => {
    const franchise = getFranchise(game);
    if (!franchise) return;
    franchiseGames[franchise] = (franchiseGames[franchise] || 0) + 1;
  });
  const topFranchise = Object.entries(franchiseGames).sort((a, b) => b[1] - a[1])[0] || null;
  const topFranchiseShare = totalGames > 0 && topFranchise ? topFranchise[1] / totalGames : 0;

  // Replay concentration from sessions, weighted by recency so a game played
  // heavily last week outranks one played heavily three months ago.
  const gameSessionCounts = {};
  sessions.forEach((session) => {
    const key = session.gameId || session.gameName || 'unknown';
    const weight = getRecencyWeight(session);
    gameSessionCounts[key] = (gameSessionCounts[key] || 0) + weight;
  });
  const sortedSessionCounts = Object.values(gameSessionCounts).sort((a, b) => b - a);
  const top3Sessions = sum(sortedSessionCounts.slice(0, 3));
  const totalSessions = sum(sortedSessionCounts);
  const top3SessionShare = totalSessions > 0 ? top3Sessions / totalSessions : 0;

  // Peak hour — from windowed sessions in recent mode, else the all-time snapshot.
  let peakHour = personaSnapshot.peakPlayHour;
  if (windowDays !== null) {
    const hourCounts = {};
    sessions.forEach((s) => {
      const start = getSessionStart(s);
      if (start === null) return;
      const hour = new Date(start).getHours();
      const weight = getRecencyWeight(s);
      hourCounts[hour] = (hourCounts[hour] || 0) + weight;
    });
    const topHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
    peakHour = topHour ? Number(topHour[0]) : null;
  }
  const isNightOwl = peakHour !== null && (peakHour >= 22 || peakHour <= 4);
  const isEarlyRiser = peakHour !== null && peakHour >= 5 && peakHour <= 9;

  // Completion rate — prefer the real library-based rate over the near-zero
  // selectionHistory rate.
  const completionRate = hasCompletionData
    ? realCompletionRate
    : (personaSnapshot.overallCompletionRate || 0);

  // Session pattern — weighted by recency so recent sessions define the
  // current play cadence.
  let sessionPattern = personaSnapshot.preferredSessionBucket || null;
  let avgSessionLength = personaSnapshot.avgSessionLength || 0;
  if (windowDays !== null) {
    const durations = sessions
      .map((s) => getSessionDuration(s) * getRecencyWeight(s))
      .filter((d) => d > 0);
    avgSessionLength = durations.length ? Math.round(mean(durations)) : 0;
    if (avgSessionLength === 0) sessionPattern = null;
    else if (avgSessionLength < 30) sessionPattern = 'short';
    else if (avgSessionLength < 90) sessionPattern = 'medium';
    else sessionPattern = 'long';
  }

  // Mood distribution
  const moodPlaytime = {};
  const moodEntries = Object.entries(behaviorProfile.moodPreferences || {});
  moodEntries.forEach(([mood, data]) => {
    moodPlaytime[mood] = data.totalPlaytime || data.count || 0;
  });
  const totalMoodPlaytime = sum(Object.values(moodPlaytime));
  const dominantMood = Object.entries(moodPlaytime)
    .sort((a, b) => b[1] - a[1])
    .map(([mood]) => mood)[0] || null;
  const socialMoodShare = totalMoodPlaytime > 0 ? (moodPlaytime.Social || 0) / totalMoodPlaytime : 0;

  // Challenge score: playtime-weighted hard/difficult/souls-like content
  const hardTags = ['souls-like', 'soulslike', 'difficult', 'punishing', 'hardcore', 'roguelike', 'roguelite', 'bullet hell', 'metroidvania'];
  const hardGenres = ['fighting', 'action'];
  let challengeScore = 0;
  let hardGameCount = 0;
  library.forEach((game) => {
    const pt = effectivePlaytime(game);
    const tags = getTags(game);
    const genres = getGenres(game);
    const tagMatch = hardTags.some((t) => tags.includes(t));
    const genreMatch = hardGenres.some((g) => genres.includes(g));
    if (tagMatch || genreMatch) {
      challengeScore += pt;
      hardGameCount += 1;
    }
  });
  const challengeRatio = totalPlaytime > 0 ? challengeScore / totalPlaytime : 0;
  const hardGameRatio = totalGames > 0 ? hardGameCount / totalGames : 0;

  // Platform distribution
  const platformCounts = {};
  library.forEach((game) => {
    if (game.platform) {
      platformCounts[game.platform] = (platformCounts[game.platform] || 0) + 1;
    }
  });
  const platformCount = Object.keys(platformCounts).length;

  const currentYear = new Date().getFullYear();

  return {
    totalGames,
    totalPlaytime,
    playedRatio,
    unplayedRatio,
    avgReleaseYear,
    releaseYearCoverage,
    genrePlaytime,
    sortedGenres,
    dominantGenre,
    dominantGenreShare,
    tagCounts,
    indieRatio,
    earlyAccessRatio,
    topDev,
    topDevShare,
    topPub,
    topPubShare,
    topFranchise,
    topFranchiseShare,
    top3SessionShare,
    totalSessions,
    peakHour,
    isNightOwl,
    isEarlyRiser,
    completionRate,
    sessionPattern,
    avgSessionLength,
    dominantMood,
    socialMoodShare,
    platformCount,
    challengeScore,
    challengeRatio,
    hardGameRatio,
    completedCount,
    hasCompletionData,
    topGames,
    topGame,
    topGameShare,
    currentYear
  };
};

// ---------------------------------------------------------------------------
// Narrative voice: how the story service reads when the player has a persona.
// Archetypes override specific templates; missing keys fall back to DEFAULT_VOICE.
// Placeholders: {PERIOD} period label (e.g. "this week"), {LEAD} genre lead,
// {GAME} leading game, {HOURS} its hours, {WEEKS} active count, {WEEKWORD}
// "week"/"weeks", {MVP} digest MVP, {MVPHOURS} digest MVP hours, {GENRE}
// digest dominant genre, {PEAK} busiest week hours, {STREAK} top streak,
// {ORDINAL} ordinal, {PREVGAME} previous top game, {PREVGENRE} previous genre,
// {FRESH} comma list of new rotation games. The digestYear template overrides
// digest for full-year digests.
// ---------------------------------------------------------------------------

export const DEFAULT_VOICE = {
  periodHook: 'You spent {PERIOD} {LEAD} in **{GAME}** ({HOURS}h).',
  secondary: 'with a taste of **{LEAD}** in **{GAME}** ({HOURS}h)',
  quiet: 'A quiet {PERIOD}. The backlog can wait. Ready when you are.',
  digest: '{WEEKS} active {WEEKWORD} · **{HOURS}h** logged.',
  digestYear: 'Across {WEEKS} active {WEEKWORD} this year, you logged **{HOURS}h**.',
  digestMVP: ' **{MVP}** was your MVP at **{MVPHOURS}h**.',
  digestGenre: ' You leaned hard into **{GENRE}**.',
  digestPeak: ' Your busiest week hit **{PEAK}h**.',
  digestStreak: ' One game held the crown **{STREAK} weeks** straight.',
  continuity: {
    streak: '**{GAME}** has held the crown for the {ORDINAL} {PERIOD} running.',
    dethroned: '**{GAME}** dethroned **{PREVGAME}** as your most-played.',
    comeback: 'Back in the game after a quiet {PERIOD}.',
    genreShift: 'Your taste swung from **{PREVGENRE}** toward **{GENRE}**.',
    newRotation: 'New in the rotation: {FRESH}.'
  }
};

const mergeVoice = (overrides = {}) => ({
  ...DEFAULT_VOICE,
  ...overrides,
  continuity: { ...DEFAULT_VOICE.continuity, ...(overrides.continuity || {}) }
});

// ---------------------------------------------------------------------------
// Archetypes
// ---------------------------------------------------------------------------

const ARCHETYPES = [
  {
    id: 'backlog_archaeologist',
    label: 'The Backlog Archaeologist',
    description: 'Curates a vast library. Plays very little of it.',
    score: (s) => {
      if (s.totalGames < 20) return 0;
      // Active players shouldn't be reduced to "hoarder" just because their library is large
      const challengeDiscount = Math.max(0.5, 1 - s.challengeRatio);
      const playtimeDiscount = s.totalPlaytime > 1000 ? 0.65 : 1;
      const sizeScore = Math.min(1, s.totalGames / 300) * 40;
      const hoardScore = s.unplayedRatio * 60;
      return (sizeScore + hoardScore) * challengeDiscount * playtimeDiscount;
    },
    roasts: [
      'Owns a museum of unplayed games. Keeps digging anyway.',
      'Has enough unplayed games to survive a decade of rainy days.',
      'Collects games like Pokémon. Refuses to evolve them.'
    ],
    contextRoasts: [
      'Owns a whole museum of games, somehow only ever opens {GAME}.',
      'Has hundreds of unplayed games and one battered, {HOURS}-hour copy of {GAME}.',
      'Buys {GENRE} games faster than they finish them. Except {GAME}, obviously.'
    ],
    voice: mergeVoice({
      periodHook: 'Another {PERIOD} digging through the backlog; **{GAME}** ({HOURS}h) surfaced this time.',
      quiet: 'Not even the backlog got touched this {PERIOD}. The pile grows.',
      digest: '{WEEKS} active {WEEKWORD} · **{HOURS}h** logged. The backlog briefly noticed.',
      continuity: {
        comeback: 'Back from the archive, finally playing something.'
      }
    })
  },
  {
    id: 'credit_roll_dodger',
    label: 'The Credit-Roll Dodger',
    description: 'Starts games with enthusiasm. Rarely sees the ending.',
    score: (s) => {
      // Completion is manual-only data; without enough of it we cannot claim
      // someone "doesn't finish" games. Require a real completion sample.
      if (!s.hasCompletionData || s.completedCount < 5) return 0;
      if (s.totalPlaytime < 300) return 0; // need meaningful playtime
      // A dodger STARTS many games and bounces. Someone who pours time into a
      // few favorites (high session concentration) is a replayer, not a dodger.
      const spreadFactor = 1 - Math.min(1, s.top3SessionShare);
      const completionFactor = (100 - s.completionRate) / 100;
      const playtimeFactor = Math.min(1, s.totalPlaytime / 3000);
      return (completionFactor * 60 + playtimeFactor * 40) * spreadFactor;
    },
    roasts: [
      'Has seen more title screens than ending credits.',
      'Excels at starting games. Finishing them is someone else\'s job.',
      'Their backlog is a graveyard of half-finished masterpieces.'
    ],
    contextRoasts: [
      'Has {HOURS} hours in {GAME} and still hasn\'t seen its ending.',
      'Starts a new game every week, then crawls back to {GAME}.',
      'Finishing games is hard. Reinstalling {GAME} is easy.'
    ],
    voice: mergeVoice({
      periodHook: 'Another {PERIOD} of starting strong in **{GAME}** ({HOURS}h). The ending remains a mystery.',
      quiet: 'No new starts this {PERIOD}. The half-finished pile stays half-finished.',
      continuity: {
        comeback: 'Back at the title screen after a quiet {PERIOD}.'
      }
    })
  },
  {
    id: 'frame_data_masochist',
    label: 'The Frame-Data Masochist',
    description: 'Loves precise, punishing, mechanics-heavy games.',
    score: (s) => {
      const hasHardLibrary = s.hardGameRatio >= 0.3;
      if (s.totalPlaytime < 60 && !hasHardLibrary) return 0;
      const challengeScore = Math.min(1, s.challengeRatio) * 65;
      const hardGameScore = Math.min(1, s.hardGameRatio) * 35;
      const sessionScore = ['medium', 'long', 'weekend'].includes(s.sessionPattern) ? 15 : 0;
      return challengeScore + hardGameScore + sessionScore;
    },
    roasts: [
      'Enjoys suffering. Calls it "mechanics."',
      'Will spend four hours learning one boss pattern. Calls it relaxing.',
      'Has a PhD in frames. Uses it exclusively to die.'
    ],
    contextRoasts: [
      'Has {HOURS} hours of controller-gripping rage logged in {GAME}.',
      'Calls {GAME} "relaxing." {GAME} is not relaxing.',
      'Would rather learn one {GAME} boss pattern than sleep.'
    ],
    voice: mergeVoice({
      periodHook: 'Another {PERIOD} of studying pain in **{GAME}** ({HOURS}h).',
      quiet: 'Even the masochist took a break this {PERIOD}. The bosses will wait.',
      digest: '{WEEKS} active {WEEKWORD} · **{HOURS}h** logged. The suffering was consistent.',
      continuity: {
        comeback: 'Back on the grind after a quiet {PERIOD}. The pain resumes.'
      }
    })
  },
  {
    id: 'spreadsheet_tactician',
    label: 'The Spreadsheet Tactician',
    description: 'Loves systems, strategy, and watching numbers go up.',
    score: (s) => {
      if (!s.dominantGenre) return 0;
      const simGenres = ['strategy', 'simulation', 'management', 'grand strategy', 'automation', '4x', 'city builder', 'tycoon'];
      const isSimGenre = simGenres.some((g) => s.dominantGenre.includes(g));
      const genreScore = isSimGenre ? s.dominantGenreShare * 70 : 0;
      const sessionScore = s.avgSessionLength > 90 ? 20 : 0;
      return genreScore + sessionScore + 10;
    },
    roasts: [
      'Plays games for the menus. Has a spreadsheet about the spreadsheet.',
      'Min-maxes the fun out of everything. Considers it optimal.',
      'A well-organized UI is peak gameplay.'
    ],
    contextRoasts: [
      'Has a spreadsheet for {GAME}. Possibly several. Colour-coded.',
      'Optimised the fun out of {GAME} roughly {HOURS} hours ago.',
      'Treats {GAME} like a second job with better numbers.'
    ],
    voice: mergeVoice({
      periodHook: 'Another {PERIOD} of optimising systems in **{GAME}** ({HOURS}h).',
      quiet: 'A quiet {PERIOD}. The spreadsheets remain untouched.',
      digest: '{WEEKS} active {WEEKWORD} · **{HOURS}h** logged. The numbers mostly went up.'
    })
  },
  {
    id: 'story_diver',
    label: 'The Lore Dredger',
    description: 'Gets lost in narrative, world, and character.',
    score: (s) => {
      if (!s.dominantGenre) return 0;
      const storyGenres = ['rpg', 'adventure', 'visual novel', 'story-rich'];
      const isStoryGenre = storyGenres.some((g) => s.dominantGenre.includes(g));
      const genreScore = isStoryGenre ? s.dominantGenreShare * 70 : 0;
      const sessionScore = s.avgSessionLength > 90 ? 25 : 0;
      return genreScore + sessionScore;
    },
    roasts: [
      'Will get emotionally attached to a side quest NPC.',
      'Reads every journal entry. Twice. For lore.',
      'Has cried over a video game. Probably this year.'
    ],
    contextRoasts: [
      'Cried during {GAME}. Would absolutely do it again.',
      'Knows {GAME}\'s lore better than their own family tree.',
      'Spent {HOURS} hours in {GAME} just to read every codex entry.'
    ],
    voice: mergeVoice({
      periodHook: 'Another {PERIOD} lost in the story of **{GAME}** ({HOURS}h).',
      quiet: 'A quiet {PERIOD}. The next chapter will have to wait.',
      continuity: {
        comeback: 'Back to the story after a quiet {PERIOD}.'
      }
    })
  },
  {
    id: 'comfort_replay_junkie',
    label: 'The Comfort Replay Junkie',
    description: 'Keeps coming back to the same beloved games.',
    score: (s) => {
      if (s.totalSessions < 5) return 0;
      const concentrationScore = s.top3SessionShare * 80;
      const longTermScore = s.totalPlaytime > 1000 ? 20 : 0;
      return concentrationScore + longTermScore;
    },
    roasts: [
      'Has one game. Has played it for 800 hours. Has no regrets.',
      'New releases come and go. Their main stays the same.',
      'Comfort zone has a 400-hour radius.'
    ],
    contextRoasts: [
      'New games release weekly. {GAME} remains undefeated at {HOURS} hours.',
      'Comfort game: {GAME}. Backup comfort game: also {GAME}.',
      'Has {HOURS} hours in {GAME} and zero intention of stopping.'
    ],
    voice: mergeVoice({
      periodHook: 'Another {PERIOD} back in the comfort loop with **{GAME}** ({HOURS}h).',
      quiet: 'The comfort loop is on pause this {PERIOD}. Nothing new broke the streak.',
      digest: '{WEEKS} active {WEEKWORD} · **{HOURS}h** logged, mostly in the same comfort zone.',
      continuity: {
        streak: '**{GAME}** has held the crown for the {ORDINAL} {PERIOD} running. The comfort loop continues.',
        comeback: 'Back in the comfort zone after a quiet {PERIOD}.'
      }
    })
  },
  {
    id: 'night_owl',
    label: 'The Night Owl',
    description: 'Does their best gaming after the sun goes down.',
    score: (s) => {
      if (!s.isNightOwl) return 0;
      const sessionScore = Math.min(1, s.totalSessions / 20) * 40;
      return 60 + sessionScore;
    },
    roasts: [
      'Gaming after midnight counts as self-care, apparently.',
      'The best sessions happen when the rest of the world is asleep.',
      'Has strong opinions about monitor brightness at 2am.'
    ],
    contextRoasts: [
      'Does their best gaming while everyone else is asleep — hasn\'t seen the sun in {HOURS} hours because of {GAME}.',
      'It\'s 3am. {GAME} is still open. Of course it is.',
      'Sleep is optional when {GAME} is installed.'
    ],
    voice: mergeVoice({
      periodHook: 'Another {PERIOD} of nocturnal ops in **{GAME}** ({HOURS}h).',
      quiet: 'Even the night owl took a break this {PERIOD}. The base is safe for now.',
      digest: '{WEEKS} active {WEEKWORD} · **{HOURS}h** logged under moonlight.',
      continuity: {
        streak: '**{GAME}** has held the crown for the {ORDINAL} {PERIOD} running. The night shift is consistent.',
        comeback: 'Back on the night shift after a quiet {PERIOD}.'
      }
    })
  },
  {
    id: 'indie_fairy',
    label: 'The Indie Curator',
    description: 'Dwells in the weird, wonderful world of small-studio games.',
    score: (s) => {
      if (s.totalGames < 10) return 0;
      const indieScore = s.indieRatio * 80;
      const sizeScore = Math.min(1, s.totalGames / 50) * 20;
      return indieScore + sizeScore;
    },
    roasts: [
      'If a game has a marketing budget, it\'s already too mainstream.',
      'Discovers gems before the algorithm does.',
      'Has emotionally supported at least three solo developers.'
    ],
    contextRoasts: [
      'Champions tiny studios, then quietly sinks {HOURS} hours into {GAME}.',
      'Discovered {GAME} before your favourite streamer did. Won\'t let you forget it.',
      'Their {GENRE} taste is impeccable, and {GAME} is the proof.'
    ],
    voice: mergeVoice({
      periodHook: 'Another {PERIOD} championing indie gems; **{GAME}** ({HOURS}h) led the charge.',
      quiet: 'A quiet {PERIOD}. The indie scene carries on without you.',
      digest: '{WEEKS} active {WEEKWORD} · **{HOURS}h** logged. Underdogs dominated.'
    })
  },
  {
    id: 'franchise_loyalist',
    label: 'The Franchise Loyalist',
    description: 'Commits to one universe and stays there.',
    score: (s) => {
      const franchiseScore = s.topFranchiseShare * 60;
      const pubScore = s.topPubShare * 30;
      const devScore = s.topDevShare * 10;
      return Math.max(franchiseScore, pubScore + devScore);
    },
    roasts: [
      'Owns every entry. Will defend the bad ones to the grave.',
      'Has a favorite series and a very strong opinion about it.',
      'Brand loyalty is a lifestyle choice.'
    ],
    contextRoasts: [
      'Would marry the {GAME} franchise if the paperwork allowed it.',
      'Owns everything near {GAME}. Defends the bad entries to the grave.',
      'Put {HOURS} hours into {GAME} and considers that just the warm-up.'
    ],
    voice: mergeVoice({
      periodHook: 'Another {PERIOD} staying loyal to **{GAME}** ({HOURS}h).',
      quiet: 'A quiet {PERIOD}. The franchise waits patiently.',
      digest: '{WEEKS} active {WEEKWORD} · **{HOURS}h** logged. The loyalty remains unmatched.'
    })
  },
  {
    id: 'retro_futurist',
    label: 'The Retro-Futurist',
    description: 'A soul from the low-poly, manual-reading era.',
    score: (s) => {
      if (s.releaseYearCoverage < 0.3 || s.avgReleaseYear === null) return 0;
      if (s.avgReleaseYear > 2010) return 0;
      const ageScore = (2010 - s.avgReleaseYear) / 20 * 70; // 2010 -> 0, 1990 -> 70
      const coverageScore = Math.min(1, s.releaseYearCoverage) * 30;
      return Math.min(100, ageScore + coverageScore);
    },
    roasts: [
      'Claims gaming peaked when polygons were a suggestion.',
      'Maintains that low-poly has more soul than ray tracing.',
      'Has strong opinions about tank controls. Positive ones.'
    ],
    contextRoasts: [
      'Swears games peaked around {GAME}\'s era and refuses further discussion.',
      'Has {HOURS} hours in {GAME} and a deep distrust of anything with ray tracing.',
      'Would take {GAME} over any current-year release. Has said so. Loudly.'
    ],
    voice: mergeVoice({
      periodHook: 'Another {PERIOD} back in the golden era with **{GAME}** ({HOURS}h).',
      quiet: 'A quiet {PERIOD}. The classics will keep.',
      digest: '{WEEKS} active {WEEKWORD} · **{HOURS}h** logged. Retro soul intact.'
    })
  },
  {
    id: 'bleeding_edge',
    label: 'The Bleeding Edge',
    description: 'Lives in the current release cycle.',
    score: (s) => {
      if (s.releaseYearCoverage < 0.3 || s.avgReleaseYear === null) return 0;
      if (s.avgReleaseYear < s.currentYear - 4) return 0;
      const recencyScore = (s.currentYear - s.avgReleaseYear) / 4 * 70;
      const coverageScore = Math.min(1, s.releaseYearCoverage) * 30;
      return Math.min(100, recencyScore + coverageScore);
    },
    roasts: [
      'Owns the future. Still hasn\'t finished last year\'s future.',
      'Day-one patches are part of the experience.',
      'Has a backlog of current-year releases. Impressive and terrifying.'
    ],
    contextRoasts: [
      'Bought {GAME} on day one. Bugs included. No refund requested.',
      'Has {HOURS} hours in {GAME} and already pre-ordered its sequel.',
      'Lives on the release calendar. {GAME} is just the latest casualty.'
    ],
    voice: mergeVoice({
      periodHook: 'Another {PERIOD} on the release frontier with **{GAME}** ({HOURS}h).',
      quiet: 'A quiet {PERIOD}. The patch notes pile up.',
      digest: '{WEEKS} active {WEEKWORD} · **{HOURS}h** logged. Cutting edge, new scratches.'
    })
  },
  {
    id: 'completionist',
    label: 'The Completionist',
    description: 'Does not rest until every checkbox is ticked.',
    score: (s) => {
      // Requires real completion logging to be meaningful.
      if (!s.hasCompletionData || s.totalPlaytime < 60) return 0;
      return (s.completionRate / 100) * 90 + 10;
    },
    roasts: [
      'Cannot rest until the map is 100% grey.',
      'Achievement unlocked: touched every collectible.',
      'Skips the main quest to 100% the side content first.'
    ],
    contextRoasts: [
      '100%\'d {GAME} and immediately felt strangely empty.',
      'Every single checkbox in {GAME} is ticked. Every. Single. One.',
      'Spent {HOURS} hours in {GAME} making sure nothing was left undone.'
    ],
    voice: mergeVoice({
      periodHook: 'Another {PERIOD} of ticking boxes in **{GAME}** ({HOURS}h).',
      quiet: 'A quiet {PERIOD}. The checklist stays unchecked.',
      digest: '{WEEKS} active {WEEKWORD} · **{HOURS}h** logged. Completionism marches on.'
    })
  },
  {
    id: 'roamer',
    label: 'The Roamer',
    description: 'Samples widely across many games and genres.',
    score: (s) => {
      if (s.totalGames < 15) return 0;
      const varietyScore = Math.min(1, s.sortedGenres.length / 8) * 45;
      const lowConcentrationScore = (1 - s.dominantGenreShare) * 40;
      const spreadScore = Math.min(1, s.playedRatio) * 15;
      return varietyScore + lowConcentrationScore + spreadScore;
    },
    roasts: [
      'Tastes everything. Finishes nothing.',
      'A tourist in their own library.',
      'Has a top 50 favorite games. Changes it weekly.'
    ],
    contextRoasts: [
      'Has {HOURS} hours in {GAME} and 60 other games gathering dust.',
      'Bounces across the whole library but keeps sneaking back to {GAME}.',
      'Samples every {GENRE} going, then defaults to {GAME} anyway.'
    ],
    voice: mergeVoice({
      periodHook: 'You spent {PERIOD} bouncing around, with **{GAME}** ({HOURS}h) leading the tour.',
      quiet: 'A quiet {PERIOD} on the road. No new stops this week.',
      digest: '{WEEKS} active {WEEKWORD} · **{HOURS}h** logged. A wide tour of the library.',
      continuity: {
        streak: '**{GAME}** has held the crown for the {ORDINAL} {PERIOD} running. Even the tourist has a favourite.'
      }
    })
  },
  {
    id: 'social_drop_in',
    label: 'The Social Drop-in',
    description: 'Games are better with friends, even when played alone.',
    score: (s) => {
      const socialScore = s.socialMoodShare * 60;
      const coOpTags = ['co-op', 'coop', 'multiplayer', 'online co-op', 'local co-op'];
      const coOpRatio = s.totalGames > 0
        ? coOpTags.reduce((acc, tag) => acc + (s.tagCounts[tag] || 0), 0) / s.totalGames
        : 0;
      const coOpScore = coOpRatio * 40;
      return socialScore + coOpScore;
    },
    roasts: [
      'Buys party games. Plays them alone. Still counts.',
      'The lobby is always open, even when no one shows up.',
      'Friends are optional. The option is always enabled.'
    ],
    contextRoasts: [
      'Bought {GAME} to play with friends. Plays it solo. Still counts.',
      'The {GAME} lobby is always open. Attendance optional.',
      'Has {HOURS} hours in {GAME}, most of them narrating to no one.'
    ],
    voice: mergeVoice({
      periodHook: 'Another {PERIOD} dropping into lobbies with **{GAME}** ({HOURS}h).',
      quiet: 'A quiet {PERIOD}. The squad is on standby.',
      digest: '{WEEKS} active {WEEKWORD} · **{HOURS}h** logged. The lobby stayed open.'
    })
  },
  {
    id: 'jank_enjoyer',
    label: 'The Jank Enjoyer',
    description: 'Finds charm in the rough, buggy, and unfinished.',
    score: (s) => {
      if (s.totalGames < 10) return 0;
      const eaScore = s.earlyAccessRatio * 70;
      const indieScore = s.indieRatio * 20;
      const lowCompletionScore = (100 - s.completionRate) / 100 * 10;
      return eaScore + indieScore + lowCompletionScore;
    },
    roasts: [
      'Voluntarily pays to find bugs. Considers it content.',
      'Enjoys the smell of unoptimized code in the morning.',
      '"It\'s got potential" is the highest compliment they give.'
    ],
    contextRoasts: [
      'Loves {GAME} specifically because it\'s held together with tape and hope.',
      'Calls {GAME}\'s bugs "features." And means it.',
      'Put {HOURS} hours into {GAME} while it was still technically broken.'
    ],
    voice: mergeVoice({
      periodHook: 'Another {PERIOD} embracing the jank in **{GAME}** ({HOURS}h).',
      quiet: 'A quiet {PERIOD}. Even the bugs miss you.',
      digest: '{WEEKS} active {WEEKWORD} · **{HOURS}h** logged. Held together with tape and hope.'
    })
  }
];

// ---------------------------------------------------------------------------
// Sub-traits
// ---------------------------------------------------------------------------

const SUB_TRAITS = [
  {
    id: 'backlog_hoarder',
    label: 'Backlog Hoarder',
    condition: (s) => s.unplayedRatio > 0.5 && s.totalGames >= 20,
    roasts: [
      'Buys games on sale "just in case."',
      'Their library is a safety net for fictional future boredom.'
    ]
  },
  {
    id: 'replay_junkie',
    label: 'Replay Junkie',
    condition: (s) => s.top3SessionShare > 0.6 && s.totalSessions >= 10,
    roasts: [
      'Has replayed the same game more times than most people finish it.',
      'New games are a threat to their comfort loop.'
    ]
  },
  {
    id: 'night_owl',
    label: 'Nocturnal Gamer',
    condition: (s) => s.isNightOwl,
    roasts: [
      'Does their best gaming after midnight.',
      'The sun is a mild inconvenience.'
    ]
  },
  {
    id: 'early_riser',
    label: 'Early Riser',
    condition: (s) => s.isEarlyRiser,
    roasts: [
      'Gaming before breakfast is a valid morning routine.',
      'The early bird gets the headshot.'
    ]
  },
  {
    id: 'genre_specialist',
    label: 'Genre Specialist',
    condition: (s) => s.dominantGenreShare > 0.5,
    roasts: [
      'Has a very specific type of game. It is GENRE_PLACEHOLDER.',
      'Knows one genre inside and out. Stays there.'
    ]
  },
  {
    id: 'platform_hopper',
    label: 'Platform Hopper',
    condition: (s) => s.platformCount >= 3,
    roasts: [
      'Refuses to be locked into one launcher.',
      'Has credentials for every store. Remembers none of them.'
    ]
  },
  {
    id: 'early_access_volunteer',
    label: 'Early Access Volunteer',
    condition: (s) => s.earlyAccessRatio > 0.2,
    roasts: [
      'Pays to beta test. Sometimes twice.',
      'Roadmaps are their favorite genre.'
    ]
  },
  {
    id: 'patient_gamer',
    label: 'Patient Gamer',
    condition: (s) => s.avgReleaseYear !== null && s.avgReleaseYear < s.currentYear - 6,
    roasts: [
      'Waits for the perfect sale. And then waits some more.',
      'Has no idea what just came out. Plays a 2014 classic instead.'
    ]
  },
  {
    id: 'day_one_daredevil',
    label: 'Day-One Daredevil',
    condition: (s) => s.avgReleaseYear !== null && s.avgReleaseYear >= s.currentYear - 2,
    roasts: [
      'Buys new releases while they are still warm.',
      'Patch notes are bedtime reading.'
    ]
  },
  {
    id: 'indie_devout',
    label: 'Indie Devout',
    condition: (s) => s.indieRatio > 0.5,
    roasts: [
      'Solo devs have a special place in their heart.',
      'Would rather fund a Kickstarter than read a review.'
    ]
  },
  {
    id: 'franchise_prisoner',
    label: 'Franchise Prisoner',
    condition: (s) => s.topFranchiseShare > 0.4 || s.topPubShare > 0.4,
    roasts: [
      'Has played every entry. Including the one nobody talks about.',
      'Loyal to a fault. Mostly to a specific publisher.'
    ]
  },
  {
    id: 'pain_connoisseur',
    label: 'Pain Connoisseur',
    condition: (s) => s.challengeRatio > 0.25,
    roasts: [
      'Treats brutal games like a spa day.',
      'Collects boss fight replays like vacation photos.'
    ]
  }
];

// ---------------------------------------------------------------------------
// Persona assembly
// ---------------------------------------------------------------------------

const pickRoast = (options, seed) => {
  if (!Array.isArray(options) || options.length === 0) return '';
  const index = Math.abs(seed) % options.length;
  return options[index];
};

const generateSeed = (primary, subTraits) => {
  let seed = 0;
  if (primary?.id) {
    seed += primary.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  }
  subTraits.forEach((trait) => {
    seed += trait.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  });
  return seed;
};

const buildSubTraitRoast = (subTraits, seed) => {
  if (subTraits.length === 0) return '';
  const topTrait = subTraits[0];
  const roast = pickRoast(topTrait.roasts, seed);
  if (topTrait.id === 'genre_specialist') {
    return roast.replace('GENRE_PLACEHOLDER', topTrait.meta?.dominantGenre || 'this genre');
  }
  return roast;
};

const formatSummaryRoast = (primaryRoast, subTraitRoast) => {
  if (!subTraitRoast) return primaryRoast;
  return `${primaryRoast} ${subTraitRoast}`;
};

const formatHours = (minutes) => {
  const hours = Math.round((minutes || 0) / 60);
  return hours >= 1000 ? `${(hours / 1000).toFixed(1)}k` : `${hours}`;
};

// Substitute real game/genre data into a roast template. Uses a specific game
// so the persona references what the player actually plays.
const fillTemplate = (str, signals, game) => {
  if (!str) return str;
  const primaryGame = game || signals.topGame;
  const name = primaryGame?.name || 'their main';
  const second = signals.topGames?.find((g) => g.name !== name)?.name || 'something else';
  const hours = formatHours(primaryGame?.minutes || 0);
  const genre = signals.dominantGenre || 'games';
  return str
    .replace(/\{GAME2\}/g, second)
    .replace(/\{GAME\}/g, name)
    .replace(/\{HOURS\}/g, hours)
    .replace(/\{GENRE\}/g, genre);
};

// Pick the best roast for an archetype: prefer a game-aware contextual roast
// when we know the player's top game, otherwise fall back to a generic one.
const pickArchetypeRoast = (archetype, signals, seed, game) => {
  if (!archetype) return 'GamePilot is still learning your style.';
  const useContext = (game || signals.topGame)?.name && Array.isArray(archetype.contextRoasts) && archetype.contextRoasts.length;
  const pool = useContext ? archetype.contextRoasts : archetype.roasts;
  return fillTemplate(pickRoast(pool, seed), signals, game);
};

export class GamingPersonaService {
  static getPersona(identityProfile = null, customSeed = null, options = {}) {
    const windowDays = options.windowDays ?? null;
    // When using a recent window, default to a 30-day half-life so the persona
    // drifts smoothly as habits change rather than snapping at the window edge.
    const recencyHalfLifeDays = options.recencyHalfLifeDays ?? (windowDays !== null ? 30 : null);
    const signals = gatherSignals({ windowDays, recencyHalfLifeDays });

    // Score each archetype
    const scoredArchetypes = ARCHETYPES.map((archetype) => ({
      ...archetype,
      score: clamp(archetype.score(signals), 0, 100)
    })).sort((a, b) => b.score - a.score);

    const primary = scoredArchetypes[0] || null;

    // Determine confidence
    let confidence = 'low';
    if (primary && primary.score >= 60) confidence = 'high';
    else if (primary && primary.score >= 35) confidence = 'medium';

    // Gather sub-traits
    const matchedSubTraits = SUB_TRAITS
      .map((trait) => {
        const meta = {};
        if (trait.id === 'genre_specialist' && signals.dominantGenre) {
          meta.dominantGenre = signals.dominantGenre;
        }
        return { ...trait, meta };
      })
      .filter((trait) => trait.condition(signals))
      .slice(0, 2);

    const baseSeed = customSeed ?? generateSeed(primary, matchedSubTraits);
    const primaryRoast = pickArchetypeRoast(primary, signals, baseSeed, signals.topGame);
    const subTraitRoast = buildSubTraitRoast(matchedSubTraits, baseSeed + 1);
    const summaryRoast = formatSummaryRoast(primaryRoast, subTraitRoast);

    // Format for UI
    const subTraits = matchedSubTraits.map((trait) => ({
      id: trait.id,
      label: trait.label,
      description: pickRoast(trait.roasts, baseSeed + 2)
    }));

    const primaryPersona = primary
      ? {
          id: primary.id,
          label: primary.label,
          description: primary.description,
          score: Math.round(primary.score),
          roast: primaryRoast,
          basedOnGame: signals.topGame?.name || null,
          voice: primary.voice || DEFAULT_VOICE
        }
      : null;

    // Secondary persona: the next-best archetype, roasted through the lens of a
    // DIFFERENT top game. Gives the user an alternate identity to pick from and
    // reflects a broader slice of their playstyle than just their #1 game.
    const secondaryArchetype = scoredArchetypes.find(
      (a) => a.id !== primary?.id && a.score > 0
    ) || null;
    const secondaryGame = signals.topGames?.find((g) => g.name !== signals.topGame?.name)
      || signals.topGame
      || null;
    const secondaryPersona = secondaryArchetype
      ? {
          id: secondaryArchetype.id,
          label: secondaryArchetype.label,
          description: secondaryArchetype.description,
          score: Math.round(secondaryArchetype.score),
          roast: pickArchetypeRoast(secondaryArchetype, signals, baseSeed + 5, secondaryGame),
          basedOnGame: secondaryGame?.name || null,
          voice: secondaryArchetype.voice || DEFAULT_VOICE
        }
      : null;

    const allArchetypes = scoredArchetypes.map((a) => ({
      id: a.id,
      label: a.label,
      score: Math.round(a.score)
    }));

    return {
      primaryPersona,
      secondaryPersona,
      subTraits,
      summaryRoast,
      topGames: signals.topGames,
      windowDays,
      recencyHalfLifeDays,
      confidence,
      allArchetypes,
      signals: {
        totalGames: signals.totalGames,
        playedRatio: Math.round(signals.playedRatio * 100),
        avgReleaseYear: signals.avgReleaseYear,
        dominantGenre: signals.dominantGenre,
        dominantGenreShare: Math.round(signals.dominantGenreShare * 100),
        completionRate: signals.completionRate,
        top3SessionShare: Math.round(signals.top3SessionShare * 100),
        platformCount: signals.platformCount,
        challengeRatio: Math.round(signals.challengeRatio * 100),
        hardGameRatio: Math.round(signals.hardGameRatio * 100),
        totalPlaytime: signals.totalPlaytime,
        unplayedRatio: Math.round(signals.unplayedRatio * 100),
        completedCount: signals.completedCount,
        hasCompletionData: signals.hasCompletionData
      }
    };
  }

  // Convenience method for recommendation systems that just want the primary identity
  static getPrimaryPersona() {
    return this.getPersona().primaryPersona;
  }

  // Get a short label for the current user, e.g. for "Because you're a..."
  static getRoastLine() {
    return this.getPersona().summaryRoast;
  }
}

export default GamingPersonaService;
