// GamingPersonaService.js - Memeish, data-backed gaming personas
// Computes a primary persona, sub-traits, and a roast line from local play data.
import StorageService from './StorageService';
import { UserBehaviorProfile } from './UserBehaviorProfile';
import { PlaytimeAutoLogger } from './PlaytimeAutoLogger';
import { getBlendedPlaytimeMinutes, isGameUnplayed, isNonGameTitle } from './gameClassification';
import FounderService from './FounderService';

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

// Use canonical playtime from shared classification module
const getPlaytime = getBlendedPlaytimeMinutes;

const getGameDisplayName = (game) => {
  if (!game) return null;
  const raw = game.name || game.title || game.gameName || game.appname || '';
  const name = String(raw).trim();
  if (!name) return null;
  // Drop placeholder / broken titles that leak into roasts as "0h in Untitled".
  if (/^(untitled|unknown|unknown game|null|undefined)$/i.test(name)) return null;
  return name;
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

// The persona is built from the user's CURRENT ROTATION by default: the most
// recent tracked sessions, weighted by position (newest weighs most). This is
// deliberately not a calendar window — if the user takes a break, the persona
// holds steady instead of decaying to nothing.
const ADAPTIVE_SESSION_COUNT = 15;
// Position-based half-life: a session 6 positions back weighs half as much as
// the most recent one.
const ADAPTIVE_HALF_LIFE_SESSIONS = 6;
// Cold-start blend: recent play fully takes over at ~10 tracked hours. Before
// that, lifetime library playtime fills the gaps so a new user still gets a
// meaningful persona from their scanned library on day one.
const RECENT_TAKEOVER_MINUTES = 10 * 60;

const gatherSignals = (options = {}) => {
  // Modes:
  //  - 'recent' (default): the current rotation. Uses an adaptive session pool
  //    (last N sessions) unless an explicit windowDays calendar window is
  //    given (e.g. Profile's historical windowed views).
  //  - 'all-time': pure lifetime library playtime totals imported from
  //    Steam/GOG/Epic etc. Explicit opt-in for retrospective surfaces (Profile
  //    all-time view, Year in Review).
  const isAllTime = options.mode === 'all-time';
  const windowDays = Number.isFinite(options.windowDays) ? options.windowDays : null;
  const recencyHalfLifeDays = Number.isFinite(options.recencyHalfLifeDays) && options.recencyHalfLifeDays > 0
    ? options.recencyHalfLifeDays
    : null;
  // Launcher/utility apps (GOG Galaxy client etc.) are not games — exclude
  // them from persona signals even if a scan let one into the library.
  const library = StorageService.get('library', []).filter((game) => !isNonGameTitle(game));
  const behaviorProfile = UserBehaviorProfile.getProfile();
  const personaSnapshot = UserBehaviorProfile.getPersonaSnapshot();
  const allSessions = (PlaytimeAutoLogger.getSessionHistory() || [])
    .filter((s) => !isNonGameTitle(s?.gameName));

  // Newest-first ordering shared by the adaptive pool and window filtering.
  const sortedSessions = [...allSessions].sort(
    (a, b) => (getSessionStart(b) || 0) - (getSessionStart(a) || 0)
  );

  // Session pool: all-time = everything; calendar window = sessions inside the
  // window; default recent = the N most recent sessions regardless of age.
  let sessions;
  if (isAllTime) {
    sessions = allSessions;
  } else if (windowDays !== null) {
    const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
    sessions = sortedSessions.filter((s) => {
      const start = getSessionStart(s);
      return start !== null && start >= cutoff;
    });
  } else {
    sessions = sortedSessions.slice(0, ADAPTIVE_SESSION_COUNT);
  }
  const sessionIndexByRef = new Map(sessions.map((s, i) => [s, i]));

  // Recency weights: flat in all-time mode; day-based half-life inside a
  // calendar window (default 30d); position-based half-life across the
  // adaptive pool otherwise.
  const getRecencyWeight = (session) => {
    if (isAllTime) return 1;
    if (windowDays !== null) {
      const halfLifeDays = recencyHalfLifeDays !== null ? recencyHalfLifeDays : 30;
      const start = getSessionStart(session);
      if (start === null) return 1;
      const daysAgo = (Date.now() - start) / (24 * 60 * 60 * 1000);
      return Math.exp(-0.6931471805599453 * daysAgo / halfLifeDays);
    }
    const index = sessionIndexByRef.get(session);
    if (index === undefined) return 1;
    return Math.exp(-0.6931471805599453 * index / ADAPTIVE_HALF_LIFE_SESSIONS);
  };

  const getSessionDuration = (session) => {
    if (!session) return 0;
    const raw = session.playtimeMinutes || session.duration || session.durationMinutes || session.playtime || session.actualElapsedMinutes || session.duration_ms || session.elapsedMinutes || 0;
    const num = Number(raw);
    if (!Number.isFinite(num)) return 0;
    if (raw === session.duration_ms && num > 1000) return num / 60000;
    return Math.max(0, num);
  };

  // In recent mode (adaptive pool or calendar window), per-game playtime comes
  // from session history weighted by recency, so a game you stopped playing
  // fades out of the persona. All-time mode uses library playtime totals.
  const useRecencyPlaytime = !isAllTime;
  const recentPlaytimeByGame = {};
  if (useRecencyPlaytime) {
    sessions.forEach((s) => {
      const key = normalizeGameKey(s.gameName || s.gameId);
      if (!key) return;
      const weight = getRecencyWeight(s);
      recentPlaytimeByGame[key] = (recentPlaytimeByGame[key] || 0) + getSessionDuration(s) * weight;
    });
  }

  // Cold-start blend: until ~10h of tracked play, all-time playtime fills the
  // gaps by SHARE, not magnitude. Blending raw minutes let a huge lifetime
  // game (e.g. 1500h of Rust) swamp a current binge whenever blendFactor was
  // even slightly below 1 — blending proportions keeps all-time taste shape
  // informative without its size ever outweighing current play.
  // blendFactor 0 = pure all-time (new user), 1 = pure current rotation.
  const recentTrackedMinutes = sessions.reduce((acc, s) => acc + getSessionDuration(s), 0);
  const blendFactor = isAllTime ? 0 : Math.min(1, recentTrackedMinutes / RECENT_TAKEOVER_MINUTES);

  const totalGames = library.length;
  // Lifetime library minutes (Steam/GOG/local) — never discarded.
  const lifetimeLibraryPlaytime = library.reduce((acc, game) => acc + getPlaytime(game), 0);
  const recentWeightedTotal = sum(Object.values(recentPlaytimeByGame));
  // Raw (unweighted) recent minutes per game — for honest "Xh in GAME" display.
  const recentRawMinutesByGame = {};
  if (useRecencyPlaytime) {
    sessions.forEach((s) => {
      const key = normalizeGameKey(s.gameName || s.gameId);
      if (!key) return;
      recentRawMinutesByGame[key] = (recentRawMinutesByGame[key] || 0) + getSessionDuration(s);
    });
  }
  // Display scale: what one share-point is worth in minutes. With no tracked
  // play yet, the blend degenerates to raw lifetime minutes (cold start).
  const scaleTotal = recentWeightedTotal > 0 ? recentWeightedTotal : lifetimeLibraryPlaytime;

  const effectivePlaytime = (game) => {
    const lifetime = getPlaytime(game);
    if (!useRecencyPlaytime) return lifetime;
    const key = normalizeGameKey(game.name || game.title || game.gameName || game.appid);
    const recentShare = recentWeightedTotal > 0 ? (recentPlaytimeByGame[key] || 0) / recentWeightedTotal : 0;
    const lifetimeShare = lifetimeLibraryPlaytime > 0 ? lifetime / lifetimeLibraryPlaytime : 0;
    return scaleTotal * (blendFactor * recentShare + (1 - blendFactor) * lifetimeShare);
  };
  const wasPlayedInWindow = (game) => effectivePlaytime(game) > 0;

  const windowedLibraryPlaytime = library.reduce((acc, game) => acc + effectivePlaytime(game), 0);
  const sessionPlaytime = sessions.reduce(
    (acc, session) => acc + getSessionDuration(session) * getRecencyWeight(session),
    0
  );
  // All-time mode: lifetime library is the truth. Windowed/recent mode: use
  // session-weighted totals, but never drop below what the window actually saw.
  const totalPlaytime = useRecencyPlaytime
    ? Math.max(windowedLibraryPlaytime, sessionPlaytime)
    : Math.max(lifetimeLibraryPlaytime, windowedLibraryPlaytime, sessionPlaytime);
  const playedGames = useRecencyPlaytime
    ? library.filter(wasPlayedInWindow).length
    : library.filter((game) => !isGameUnplayed(game)).length;
  const playedRatio = totalGames > 0 ? playedGames / totalGames : 0;
  const neverPlayedGames = library.filter((game) => isGameUnplayed(game)).length;
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

  // Release-year profile. In recent mode, weight by recent playtime so the
  // retro-vs-modern signal reflects what the user has actually been playing.
  const releaseYearPairs = library
    .map((game) => {
      const year = getReleaseYear(game);
      if (year === null) return null;
      const weight = useRecencyPlaytime ? effectivePlaytime(game) : getPlaytime(game);
      return weight > 0 ? { year, weight } : null;
    })
    .filter(Boolean);
  const totalReleaseYearWeight = sum(releaseYearPairs.map((p) => p.weight));
  const avgReleaseYear = releaseYearPairs.length
    ? (totalReleaseYearWeight > 0
      ? Math.round(sum(releaseYearPairs.map((p) => p.year * p.weight)) / totalReleaseYearWeight)
      : Math.round(mean(releaseYearPairs.map((p) => p.year))))
    : null;
  const releaseYearCoverage = totalGames > 0 ? releaseYearPairs.length / totalGames : 0;

  // Most-played games. In all-time mode, lifetime minutes define the player.
  // In recent/windowed mode, sort by recent session playtime so the persona
  // reflects what the user has actually been playing lately, not their all-time
  // history.
  const libraryTopGames = library
    .map((game) => {
      const name = getGameDisplayName(game);
      if (!name) return null;
      const lifetime = getPlaytime(game);
      const key = normalizeGameKey(game.name || game.title || game.gameName || game.appid);
      const minutes = effectivePlaytime(game);
      const recentRaw = useRecencyPlaytime ? (recentRawMinutesByGame[key] || 0) : 0;
      return { name, minutes, lifetimeMinutes: lifetime, recentMinutes: recentRaw };
    })
    .filter((g) => g && g.minutes > 0);

  // Session-only games: a game the user has been playing may not be in the
  // scanned library (e.g. manually tracked, non-Steam, or name mismatch). In
  // recent mode, surface these from session history so a current binge (e.g.
  // 20h of Project Zomboid this week) actually leads the persona instead of
  // being orphaned while an all-time favorite (e.g. Rust) keeps top billing.
  const libraryKeys = new Set(library.map((g) => normalizeGameKey(getGameDisplayName(g))));
  // Recover original display names from sessions (recentPlaytimeByGame keys
  // are normalized lowercase; we want "Project Zomboid" not "project zomboid").
  const sessionNameByKey = {};
  sessions.forEach((s) => {
    const key = normalizeGameKey(s.gameName || s.gameId);
    const name = s.gameName || s.gameId || null;
    if (key && name && !sessionNameByKey[key]) {
      sessionNameByKey[key] = String(name).trim();
    }
  });
  const sessionOnlyGames = useRecencyPlaytime
    ? Object.entries(recentPlaytimeByGame)
        .filter(([key, minutes]) => key && minutes > 0 && !libraryKeys.has(key))
        .map(([key, minutes]) => ({
          name: sessionNameByKey[key] || key,
          minutes: scaleTotal * blendFactor * (recentWeightedTotal > 0 ? minutes / recentWeightedTotal : 0),
          lifetimeMinutes: 0,
          recentMinutes: recentRawMinutesByGame[key] || 0
        }))
    : [];

  const topGames = [...libraryTopGames, ...sessionOnlyGames]
    .sort((a, b) => b.minutes - a.minutes || b.recentMinutes - a.recentMinutes)
    .slice(0, 5);
  const topGame = topGames[0] || null;
  const topGameShare = totalPlaytime > 0 && topGame ? topGame.minutes / totalPlaytime : 0;

  // Last-played game (most recently launched/played) — present-tense focus.
  const recentPlayedList = library
    .filter((g) => g?.last_played && (getPlaytime(g) > 0 || Number(g?.time_played || 0) > 0))
    .sort((a, b) => new Date(b.last_played) - new Date(a.last_played));
  const lastPlayedRaw = recentPlayedList[0] || null;
  const lastPlayedName = getGameDisplayName(lastPlayedRaw);
  // Fall back to the most recent tracked session if no library game has
  // last_played (e.g. session-only game not in the scanned library).
  const lastSession = sessions.length > 0
    ? [...sessions].sort((a, b) => (getSessionStart(b) || 0) - (getSessionStart(a) || 0))[0]
    : null;
  const lastSessionName = lastSession ? String(lastSession.gameName || lastSession.gameId || '').trim() : null;
  const lastPlayedGame = lastPlayedRaw && lastPlayedName
    ? { name: lastPlayedName, minutes: getPlaytime(lastPlayedRaw), last_played: lastPlayedRaw.last_played }
    : (lastSessionName
      ? { name: lastSessionName, minutes: getSessionDuration(lastSession), last_played: lastSession.timestamp || null }
      : null);

  // Genre distribution. In recent mode, weight by recent session playtime so
  // the dominant genre reflects current play, not all-time history.
  const genrePlaytime = {};
  library.forEach((game) => {
    const pt = useRecencyPlaytime ? effectivePlaytime(game) : Math.max(getPlaytime(game), effectivePlaytime(game));
    if (pt <= 0) return;
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

  // Theme profile — the worlds the player inhabits (zombies, space, horror...)
  // from tags+genres weighted by the same effective playtime as genres. In
  // recent mode this follows the current rotation automatically.
  const themePlaytime = {};
  library.forEach((game) => {
    const pt = effectivePlaytime(game);
    if (pt <= 0) return;
    const haystack = [...getTags(game), ...getGenres(game)];
    THEME_DEFINITIONS.forEach((theme) => {
      const matched = theme.tags.some((needle) => haystack.some((h) => h === needle || h.includes(needle)));
      if (matched) themePlaytime[theme.id] = (themePlaytime[theme.id] || 0) + pt;
    });
  });
  const totalThemePlaytime = sum(Object.values(themePlaytime));
  const rankedThemes = THEME_DEFINITIONS
    .map((theme) => ({
      id: theme.id,
      label: theme.label,
      shortName: theme.shortName,
      roasts: theme.roasts,
      playtime: themePlaytime[theme.id] || 0,
      share: totalThemePlaytime > 0 ? (themePlaytime[theme.id] || 0) / totalThemePlaytime : 0
    }))
    .filter((theme) => theme.playtime > 0)
    .sort((a, b) => b.playtime - a.playtime);
  const dominantTheme = rankedThemes[0] && rankedThemes[0].share >= 0.15 ? rankedThemes[0] : null;
  const secondaryTheme = rankedThemes[1] && rankedThemes[1].share >= 0.15 ? rankedThemes[1] : null;

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

  // Peak hour — from the session pool in recent mode (adaptive pool or
  // calendar window), else the all-time behavior snapshot.
  let peakHour = personaSnapshot.peakPlayHour;
  if (useRecencyPlaytime) {
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
  if (useRecencyPlaytime) {
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

  // Chill score: playtime-weighted cozy/relaxing/wholesome content
  const chillTags = ['cozy', 'relaxing', 'wholesome', 'farming', 'low-stress', 'low stress', 'slice of life', 'wholesome', 'comfort', 'meditative', 'zen', 'peaceful', 'wholesome horror'];
  const chillGenres = ['casual', 'simulation', 'puzzle', 'management'];
  let chillScore = 0;
  let chillGameCount = 0;
  library.forEach((game) => {
    const pt = effectivePlaytime(game);
    const tags = getTags(game);
    const genres = getGenres(game);
    const tagMatch = chillTags.some((t) => tags.includes(t));
    const genreMatch = chillGenres.some((g) => genres.includes(g));
    if (tagMatch || genreMatch) {
      chillScore += pt;
      chillGameCount += 1;
    }
  });
  const chillRatio = totalPlaytime > 0 ? chillScore / totalPlaytime : 0;
  const chillGameRatio = totalGames > 0 ? chillGameCount / totalGames : 0;

  // Cluster density tiers: dominant (30%+), notable (15-30%), minor (<15%)
  const hardClusterTier = hardGameRatio >= 0.3 ? 'dominant' : hardGameRatio >= 0.15 ? 'notable' : 'minor';
  const chillClusterTier = chillGameRatio >= 0.3 ? 'dominant' : chillGameRatio >= 0.15 ? 'notable' : 'minor';

  // Multiplayer / competitive game ratio
  const multiplayerTags = ['multiplayer', 'pvp', 'competitive', 'online multiplayer', 'mmo', 'moba', 'battle royale', 'team-based'];
  const multiplayerCount = library.filter((game) => {
    const tags = getTags(game);
    return multiplayerTags.some((t) => tags.includes(t));
  }).length;
  const multiplayerRatio = totalGames > 0 ? multiplayerCount / totalGames : 0;
  const multiplayerPlaytimeShare = totalPlaytime > 0
    ? library.filter((game) => {
        const tags = getTags(game);
        return multiplayerTags.some((t) => tags.includes(t));
      }).reduce((acc, game) => acc + effectivePlaytime(game), 0) / totalPlaytime
    : 0;

  // Mod-friendly game ratio (games commonly modded)
  const modFriendlyTags = ['moddable', 'mods', 'steam workshop', 'mod support', 'sandbox', 'open world'];
  const modFriendlyCount = library.filter((game) => {
    const tags = getTags(game);
    return modFriendlyTags.some((t) => tags.includes(t));
  }).length;
  const modFriendlyRatio = totalGames > 0 ? modFriendlyCount / totalGames : 0;

  // Weekend warrior: what fraction of sessions fall on Sat/Sun?
  let weekendSessionCount = 0;
  let weekdaySessionCount = 0;
  sessions.forEach((s) => {
    const start = getSessionStart(s);
    if (start === null) return;
    const day = new Date(start).getDay();
    if (day === 0 || day === 6) weekendSessionCount++;
    else weekdaySessionCount++;
  });
  const totalSessionDays = weekendSessionCount + weekdaySessionCount;
  const weekendSessionRatio = totalSessionDays > 0 ? weekendSessionCount / totalSessionDays : 0;

  // Short-session ratio (sessions under 30 min — lunch break gamers)
  const shortSessions = sessions.filter((s) => getSessionDuration(s) > 0 && getSessionDuration(s) < 30).length;
  const shortSessionRatio = sessions.length > 0 ? shortSessions / sessions.length : 0;

  // Replay intensity: how many sessions went to the same top game
  const topGameSessionCount = topGame ? (gameSessionCounts[normalizeGameKey(topGame.name)] || 0) : 0;
  const topGameSessionRatio = totalSessions > 0 ? topGameSessionCount / totalSessions : 0;

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
    playedGames,
    unplayedRatio,
    neverPlayedGames,
    useRecencyPlaytime,
    mode: isAllTime ? 'all-time' : 'recent',
    blendFactor,
    recentTrackedMinutes,
    adaptiveSessionCount: sessions.length,
    lifetimeLibraryPlaytime,
    lifetimeGames: library.filter((game) => getPlaytime(game) > 0 || game.last_played).length,
    avgReleaseYear,
    releaseYearCoverage,
    genrePlaytime,
    sortedGenres,
    dominantGenre,
    dominantGenreShare,
    dominantTheme,
    secondaryTheme,
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
    hardGameCount,
    hardClusterTier,
    chillScore,
    chillRatio,
    chillGameRatio,
    chillGameCount,
    chillClusterTier,
    completedCount,
    hasCompletionData,
    topGames,
    topGame,
    lastPlayedGame,
    topGameShare,
    multiplayerRatio,
    multiplayerPlaytimeShare,
    modFriendlyRatio,
    weekendSessionRatio,
    shortSessionRatio,
    topGameSessionRatio,
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
  periodHook: '{PERIOD}, your gaming story was anchored by **{GAME}** ({HOURS}h), {LEAD}.',
  secondary: 'You also spent time {LEAD} in **{GAME}** ({HOURS}h)',
  quiet: 'A quiet {PERIOD}. The backlog can wait — ready whenever you are.',
  digest: '{WEEKS} active {WEEKWORD} · **{HOURS}h** logged across your games.',
  digestYear: 'Across {WEEKS} active {WEEKWORD} this year, you logged **{HOURS}h** in total.',
  digestMVP: ' **{MVP}** was your true MVP at **{MVPHOURS}h**.',
  digestGenre: ' You leaned heavily into **{GENRE}**.',
  digestPeak: ' Your peak week reached **{PEAK}h** of playtime.',
  digestStreak: ' **{MVP}** held top billing for **{STREAK} weeks** straight.',
  continuity: {
    streak: '**{GAME}** held top billing for the {ORDINAL} {PERIOD} in a row.',
    dethroned: '**{GAME}** took over top spot from **{PREVGAME}**.',
    comeback: 'Welcome back into session after a quiet {PERIOD}.',
    genreShift: 'Your focus shifted from **{PREVGENRE}** over to **{GENRE}**.',
    newRotation: 'Fresh additions to your recent rotation: {FRESH}.'
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
      'Collects games like Pokémon. Refuses to evolve them.',
      'Their Steam wishlist is longer than their playtime log.',
      'Buys games the way other people buy groceries — weekly, impulsively, and mostly shelf-stable.',
      'Has a library that could outlast a nuclear winter. Plays three games.',
      'The backlog is not a list. It is a lifestyle.'
    ],
    contextRoasts: [
      'Owns a whole museum of games, somehow only ever opens {GAME}.',
      'Has hundreds of unplayed games and one battered, {HOURS}-hour copy of {GAME}.',
      'Buys {GENRE} games faster than they finish them. Except {GAME}, obviously.',
      'Could explore a new game every night for a year. Chooses {GAME} instead.',
      'Their library has {HOURS} hours in {GAME} and 0 hours in everything else. The museum is well-curated.',
      'Bought 200 games last sale. Played {GAME}. Again. For the third time.',
      'The {GENRE} section of their library is thriving. {GAME} is the only one that gets opened.'
    ],
    voice: mergeVoice({
      periodHook: 'Another {PERIOD_NOUN} digging through the backlog; **{GAME}** ({HOURS}h) surfaced this time.',
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
      'Their backlog is a graveyard of half-finished masterpieces.',
      'Knows the first two hours of every game. Intimately.',
      'Treats the main menu like a buffet — samples everything, finishes nothing.',
      'Has never met a game they couldn\'t abandon at the 60% mark.',
      'Their save files are a museum of good intentions.'
    ],
    contextRoasts: [
      'Has a library full of possible endings and still keeps crawling back to {GAME}.',
      'Starts with heroic intentions, then lets {GAME} become another very expensive bookmark.',
      'The credits are somewhere beyond {GAME}. Allegedly.',
      'Got 80% through {GAME} and moved on. That last 20% is basically DLC at this point.',
      'Has {HOURS} hours in {GAME} and has never seen the final boss. On purpose.',
      'Started {GAME} three times. Has three save files at the same point. None finished.',
      'Knows the {GENRE} tutorial by heart. The rest is a mystery.'
    ],
    voice: mergeVoice({
      periodHook: 'Another {PERIOD_NOUN} of starting strong in **{GAME}** ({HOURS}h). The ending remains a mystery.',
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
      const challengeScore = Math.min(1, s.challengeRatio) * 55;
      const hardGameScore = Math.min(1, s.hardGameRatio) * 30;
      const clusterBonus = s.hardClusterTier === 'dominant' ? 15 : s.hardClusterTier === 'notable' ? 8 : 0;
      const sessionScore = ['medium', 'long', 'weekend'].includes(s.sessionPattern) ? 10 : 0;
      return challengeScore + hardGameScore + clusterBonus + sessionScore;
    },
    roasts: [
      'Enjoys suffering. Calls it "mechanics."',
      'Will spend four hours learning one boss pattern. Calls it relaxing.',
      'Has a PhD in frames. Uses it exclusively to die.',
      'Chooses the hardest difficulty first. Complains the entire time. Reloads anyway.',
      'Their comfort game has a "YOU DIED" screen they see more than the main menu.',
      'Has beaten the same boss 47 times. It\'s not a challenge anymore. It\'s a relationship.',
      'Tells people they enjoy "challenging" games. They mean "painful" ones.'
    ],
    contextRoasts: [
      'Has {HOURS} hours of controller-gripping rage logged in {GAME}.',
      'Calls {GAME} "relaxing." {GAME} is not relaxing.',
      'Would rather learn one {GAME} boss pattern than sleep.',
      'Died to the same {GAME} boss 30 times. Says they\'re "learning." The boss disagrees.',
      'Has {HOURS} hours in {GAME}. Most of them are on the death screen.',
      'Picked the hardest difficulty in {GAME} and now it\'s personal. The game is winning.',
      'Plays {GENRE} games specifically because they hurt. {GAME} hurts the most.'
    ],
    voice: mergeVoice({
      periodHook: 'Another {PERIOD_NOUN} of studying pain in **{GAME}** ({HOURS}h).',
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
      'A well-organized UI is peak gameplay.',
      'Has never made a suboptimal choice. Has also never had fun.',
      'Their ideal game is an Excel sheet with a health bar.',
      'Spends more time planning builds than playing them. The plan is the game.',
      'Once rerolled a character because the starting stats were 2 points off optimal.'
    ],
    contextRoasts: [
      'Has a spreadsheet for {GAME}. Possibly several. Colour-coded.',
      'Optimised the fun out of {GAME} roughly {HOURS} hours ago.',
      'Treats {GAME} like a second job with better numbers.',
      'Has {HOURS} hours in {GAME}. Zero of them were wasted. Fun was not a metric.',
      'Plays {GAME} on autopilot while planning the next build. The build is the real game.',
      'Their {GAME} save has been restarted 12 times for "better starting conditions."',
      'Knows the exact DPS difference between two {GENRE} builds. Uses neither for fun.'
    ],
    voice: mergeVoice({
      periodHook: 'Another {PERIOD_NOUN} of optimising systems in **{GAME}** ({HOURS}h).',
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
      'Has cried over a video game. Probably this year.',
      'Skips gameplay to get to dialogue. The combat is just loading time between story beats.',
      'Knows the name of every character\'s pet. Has opinions about them.',
      'Their favorite game is whichever one made them sob uncontrollably last.',
      'Reads item descriptions for worldbuilding. Every. Single. One.'
    ],
    contextRoasts: [
      'Cried during {GAME}. Would absolutely do it again.',
      'Knows {GAME}\'s lore better than their own family tree.',
      'Spent {HOURS} hours in {GAME} just to read every codex entry.',
      'Has strong opinions about {GAME}\'s ending. Will share them unprompted.',
      'Spent {HOURS} hours in {GAME}. Most of it was reading. They regret nothing.',
      'Knows what every NPC in {GAME} does after the credits. Has feelings about it.',
      'Their {GENRE} shelf is a library of emotional damage. {GAME} caused the most.'
    ],
    voice: mergeVoice({
      periodHook: 'Another {PERIOD_NOUN} lost in the story of **{GAME}** ({HOURS}h).',
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
      'Comfort zone has a 400-hour radius.',
      'Has memorised every line of dialogue in their main game. Still finds new ways to play it.',
      'Their "to play" list has one game on it. It\'s the same game.',
      'Tries a new game. Goes back to the comfort game. Every. Single. Time.',
      'Has a ritual around their main game. It involves snacks, a blanket, and zero new experiences.'
    ],
    contextRoasts: [
      'New games release weekly. {GAME} remains undefeated at {HOURS} hours.',
      'Comfort game: {GAME}. Backup comfort game: also {GAME}.',
      'Has {HOURS} hours in {GAME} and zero intention of stopping.',
      'Bought a new game last week. Played {GAME} instead. The new game is still in its shrink wrap.',
      'Has {HOURS} hours in {GAME}. Could probably speedrun it blindfolded. Chooses not to.',
      'Tells friends they\'re "trying something new." It\'s {GAME}. Again.',
      'Their {GENRE} comfort zone has a name. It\'s {GAME}. It\'s always {GAME}.'
    ],
    voice: mergeVoice({
      periodHook: 'Another {PERIOD_NOUN} back in the comfort loop with **{GAME}** ({HOURS}h).',
      quiet: 'The comfort loop is on pause this {PERIOD}. Nothing new broke the streak.',
      digest: '{WEEKS} active {WEEKWORD} · **{HOURS}h** logged, mostly in the same comfort zone.',
      continuity: {
        streak: '**{GAME}** has held the crown for the {ORDINAL} {PERIOD} running. The comfort loop continues.',
        comeback: 'Back in the comfort zone after a quiet {PERIOD}.'
      }
    })
  },
  {
    id: 'unwinder',
    label: 'The Unwinder',
    description: 'Turns to cozy, low-stress games to decompress. Their library is a warm blanket.',
    score: (s) => {
      if (s.totalGames < 5) return 0;
      const chillPlayScore = Math.min(1, s.chillRatio) * 50;
      const chillGameScore = Math.min(1, s.chillGameRatio) * 35;
      const clusterBonus = s.chillClusterTier === 'dominant' ? 15 : s.chillClusterTier === 'notable' ? 8 : 0;
      const shortSessionBonus = s.sessionPattern === 'short' ? 5 : 0;
      return chillPlayScore + chillGameScore + clusterBonus + shortSessionBonus;
    },
    roasts: [
      'Their ideal evening involves a farm, a cat, and zero consequences.',
      'Has never met a problem that couldn\'t be solved by watering virtual crops.',
      'Plays games to relax. Their games are already relaxed. It\'s mutual.',
      'Knows the exact in-game season for every crop in their library.',
      'Tells friends they\'re "into gaming." They mean Stardew Valley. Again.',
      'Their backlog is just a list of cozy games they haven\'t pet the animals in yet.',
      'Has 200 hours in a game where the hardest challenge is a slightly grumpy villager.'
    ],
    contextRoasts: [
      'Spent {HOURS} hours in {GAME} doing absolutely nothing stressful. On purpose.',
      '{GAME} is their idea of a wild night. {GAME} involves fishing.',
      'Has {HOURS} hours in {GAME}. Most of it is rearranging furniture.',
      'Tells people {GAME} is "actually quite deep." It\'s a farming sim. They\'re right.',
      'Their {GENRE} games are all the same vibe: warm, soft, and aggressively non-threatening.',
      'Plays {GAME} specifically because nothing in it wants to kill them. Unlike the rest of their library.'
    ],
    voice: mergeVoice({
      periodHook: 'A gentle {PERIOD_NOUN} unwinding with **{GAME}** ({HOURS}h). No stress, no rush.',
      quiet: 'A quiet {PERIOD}. The crops will grow without you. Probably.',
      digest: '{WEEKS} active {WEEKWORD} · **{HOURS}h** logged, all of it cozy.',
      continuity: {
        streak: '**{GAME}** remains the comfort pick for the {ORDINAL} {PERIOD} running. The vibe holds.',
        comeback: 'Back to the cozy corner after a busy {PERIOD}.'
      }
    })
  },
  {
    id: 'indie_curator',
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
      'Has emotionally supported at least three solo developers.',
      'Knows the name of the person who made the music. Has their Bandcamp.',
      'Their favorite game has 12 reviews on Steam. They wrote one of them.',
      'Can smell a Unity asset flip from a screenshot. Will still play it if it has heart.',
      'Has a Kickstarter backlog. Considers it patronage, not shopping.'
    ],
    contextRoasts: [
      'Champions tiny studios, then quietly sinks {HOURS} hours into {GAME}.',
      'Discovered {GAME} before your favourite streamer did. Won\'t let you forget it.',
      'Their {GENRE} taste is impeccable, and {GAME} is the proof.',
      'Has {HOURS} hours in {GAME}. The dev has 4 Twitter followers. One of them is this player.',
      'Found {GAME} on itch.io for $3. Has recommended it to everyone they\'ve met since.',
      'Backed {GAME} on Kickstarter. It delivered. They cried. Standard Tuesday.',
      'Their {GENRE} collection is 90% games with under 500 reviews. {GAME} has 47.'
    ],
    voice: mergeVoice({
      periodHook: 'Another {PERIOD_NOUN} championing indie gems; **{GAME}** ({HOURS}h) led the charge.',
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
      'Brand loyalty is a lifestyle choice.',
      'Pre-ordered the collector\'s edition. Hasn\'t opened it. Doesn\'t matter.',
      'Knows the lore of their franchise better than the writers do. Has corrections.',
      'Has a tattoo idea from their favorite series. It\'s only a matter of time.',
      'Owns three versions of the same game. They are all "different enough."'
    ],
    contextRoasts: [
      'Would marry the {GAME} franchise if the paperwork allowed it.',
      'Owns everything near {GAME}. Defends the bad entries to the grave.',
      'Put {HOURS} hours into {GAME} and considers that just the warm-up.',
      'Has {HOURS} hours in {GAME}. Has {HOURS} hours in the sequel. Has opinions about which is better.',
      'Bought {GAME} on three different platforms. "For the achievements."',
      'Knows every {GENRE} game in the franchise. Including the mobile spinoff. Especially the mobile spinoff.',
      'Has a {GAME} wiki tab open permanently. It has been open for years.'
    ],
    voice: mergeVoice({
      periodHook: 'Another {PERIOD_NOUN} staying loyal to **{GAME}** ({HOURS}h).',
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
      'Has strong opinions about tank controls. Positive ones.',
      'Reads the manual before playing. Keeps the manual.',
      'Their favorite game came on a CD-ROM. They still have the CD-ROM.',
      'Tells kids today they don\'t know how good they have it. Then goes back to a 1998 classic.',
      'Has a CRT monitor in storage "for the authenticity."'
    ],
    contextRoasts: [
      'Swears games peaked around {GAME}\'s era and refuses further discussion.',
      'Has {HOURS} hours in {GAME} and a deep distrust of anything with ray tracing.',
      'Would take {GAME} over any current-year release. Has said so. Loudly.',
      'Has {HOURS} hours in {GAME}. The graphics are "charming." The framerate is "atmospheric."',
      'Plays {GAME} with a fan patch, a texture mod, and a DOS emulator. Calls it "the definitive version."',
      'Tries a modern {GENRE} game. Goes back to {GAME} within the hour.',
      'Owns {GAME} on three different platforms. The original is still the best. Obviously.'
    ],
    voice: mergeVoice({
      periodHook: 'Another {PERIOD_NOUN} back in the golden era with **{GAME}** ({HOURS}h).',
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
      'Has a backlog of current-year releases. Impressive and terrifying.',
      'Pre-orders games. Pre-orders the season pass. Pre-orders the disappointment.',
      'Knows every release date for the next 6 months. Has a calendar. It is color-coded.',
      'Plays new games on day one so they can be in the discourse. The discourse is the real game.',
      'Has paid full price for games that are 40% off two months later. No regrets. Okay, some regrets.'
    ],
    contextRoasts: [
      'Bought {GAME} on day one. Bugs included. No refund requested.',
      'Has {HOURS} hours in {GAME} and already pre-ordered its sequel.',
      'Lives on the release calendar. {GAME} is just the latest casualty.',
      'Has {HOURS} hours in {GAME}. Half of them were waiting for the day-one patch to download.',
      'Bought {GAME} at full price. It\'s 60% off now. They\'re not looking at the store page.',
      'Finished {GAME} before the review embargo lifted. Has opinions. Many of them.',
      'Pre-ordered {GAME} for the bonus skin. Doesn\'t use the skin. Doesn\'t regret the pre-order.'
    ],
    voice: mergeVoice({
      periodHook: 'Another {PERIOD_NOUN} on the release frontier with **{GAME}** ({HOURS}h).',
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
      'Skips the main quest to 100% the side content first.',
      'Has 100% on games they didn\'t even enjoy. The checkbox was the point.',
      'Will replay a game on a harder difficulty just for the achievement. Hates every second.',
      'Their idea of a relaxing evening is cleaning up missable achievements with a guide open.',
      'Has never left a collectible behind. Has never slept well either.'
    ],
    contextRoasts: [
      'Treats {GAME} like a crime scene: no icon, quest, or collectible leaves unnoticed.',
      'Played {GAME} with the calm intensity of an auditor approaching a missing checkbox.',
      '{HOURS} hours in {GAME}, because "probably finished" is not a recognized status.',
      'Cleared every side quest in {GAME} before touching the main story. The story waited.',
      'Has {HOURS} hours in {GAME}. 30 of those were chasing one achievement. They got it.',
      'Found every hidden item in {GAME}. Without a guide. They don\'t talk about those weekends.',
      'Their {GAME} completion rate is 100%. Their social life is 0%. Worth it.'
    ],
    voice: mergeVoice({
      periodHook: 'Another {PERIOD_NOUN} of ticking boxes in **{GAME}** ({HOURS}h).',
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
      const playedGames = Math.round(s.playedRatio * s.totalGames);
      if (playedGames < 10) return 0;
      const varietyScore = Math.min(1, s.sortedGenres.length / 12) * 35;
      const lowConcentrationScore = (1 - s.dominantGenreShare) * 30;
      const gamesPlayedScore = Math.min(1, playedGames / 30) * 25;
      const spreadScore = Math.min(1, s.playedRatio) * 10;
      return varietyScore + lowConcentrationScore + gamesPlayedScore + spreadScore;
    },
    roasts: [
      'Tastes everything. Finishes nothing.',
      'A tourist in their own library.',
      'Has a top 50 favorite games. Changes it weekly.',
      'Has 200 games with under 2 hours played. Calls it "sampling."',
      'Their gaming diet is like a wine tasting — small sips, nothing finished, slightly dizzy.',
      'Installs a game, plays 90 minutes, uninstalls. Repeats. Calls it "curation."',
      'Has tried every genre. Mastered none. Has opinions about all of them.'
    ],
    contextRoasts: [
      'Has {HOURS} hours in {GAME} and 60 other games gathering dust.',
      'Bounces across the whole library but keeps sneaking back to {GAME}.',
      'Samples every {GENRE} going, then defaults to {GAME} anyway.',
      'Has 40 minutes in {GAME}. Has 40 minutes in 60 other games. It\'s a pattern.',
      'Played {GAME} once in 2023. Still thinks about it. Won\'t reinstall it.',
      'Tried {GAME} for an hour. It was "fine." Moved on. Will recommend it to others.',
      'Their {GENRE} phase lasted two weekends. {GAME} was the highlight. The phase is over.'
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
      'Friends are optional. The option is always enabled.',
      'Sends game invites that expire unanswered. Has stopped noticing.',
      'Their Discord "game night" server has 12 members. Last activity: 8 months ago.',
      'Bought a second controller "just in case." The just-in-case never happened.',
      'Plays co-op games solo and pretends the AI teammate is their friend. The AI is trying its best.'
    ],
    contextRoasts: [
      'Bought {GAME} to play with friends. Plays it solo. Still counts.',
      'The {GAME} lobby is always open. Attendance optional.',
      'Has {HOURS} hours in {GAME}, most of them narrating to no one.',
      'Hosted a {GAME} lobby for 3 hours. One person joined. They left after 10 minutes.',
      'Has {HOURS} hours in {GAME}. All of them solo. The co-op was aspirational.',
      'Bought {GAME} on sale because "the squad would love it." The squad did not respond.',
      'Their {GENRE} collection is 80% co-op games. Their co-op partner count is zero.'
    ],
    voice: mergeVoice({
      periodHook: 'Another {PERIOD_NOUN} dropping into lobbies with **{GAME}** ({HOURS}h).',
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
      '"It\'s got potential" is the highest compliment they give.',
      'Has reported more bugs than the QA team. The dev team knows them by name.',
      'Their favorite review is "janky but charming." They wrote it. Twice.',
      'Chooses Early Access over finished games. The journey is the destination.',
      'Has a game with 3 positive reviews. Two are theirs. One is the dev.'
    ],
    contextRoasts: [
      'Loves {GAME} specifically because it\'s held together with tape and hope.',
      'Calls {GAME}\'s bugs "features." And means it.',
      'Put {HOURS} hours into {GAME} while it was still technically broken.',
      'Has {HOURS} hours in {GAME}. The game crashed 12 times. They call it "part of the experience."',
      'Backed {GAME} in Early Access. It\'s still in Early Access. They\'re still playing it.',
      'Found a game-breaking bug in {GAME}. Reported it lovingly. Kept playing.',
      'Their {GENRE} library is full of 0.3-version games. {GAME} is on 0.7. Practically finished.'
    ],
    voice: mergeVoice({
      periodHook: 'Another {PERIOD_NOUN} embracing the jank in **{GAME}** ({HOURS}h).',
      quiet: 'A quiet {PERIOD}. Even the bugs miss you.',
      digest: '{WEEKS} active {WEEKWORD} · **{HOURS}h** logged. Held together with tape and hope.'
    })
  },
  {
    id: 'modder',
    label: 'The Modder',
    description: 'The game is just the base. The mods are the real game.',
    score: (s) => {
      if (s.totalGames < 10) return 0;
      const modScore = s.modFriendlyRatio * 60;
      const sandboxScore = (s.tagCounts['sandbox'] || 0) / Math.max(1, s.totalGames) * 25;
      const concentrationBonus = s.topGameShare > 0.3 ? 15 : 0;
      return modScore + sandboxScore + concentrationBonus;
    },
    roasts: [
      'Has 200 mods loaded. The base game is a distant memory.',
      'Spends more time in the mod manager than in the game.',
      'Their load order is a carefully balanced house of cards. One wrong mod and it all collapses.',
      'Has more Nexus Mods downloads than actual game hours.',
      'The game isn\'t finished until the mods make it unrecognizable.',
      'Treats the Steam Workshop like a buffet. Takes everything. Breaks everything. Fixes it. Repeats.',
      'Has a mod list longer than the game\'s script. It loads in 20 minutes. They wait every time.'
    ],
    contextRoasts: [
      'Has {HOURS} hours in {GAME}. 180 of those were spent modding it.',
      'Plays {GAME} with 300 mods. Cannot remember what vanilla {GAME} looks like.',
      'Their {GAME} folder is 400GB. The base game is 20GB. The rest is "improvements."',
      'Has {HOURS} hours in {GAME}. Has never played it without mods. Not once.',
      'Crashes {GAME} regularly. Blames the mods. Refuses to remove them. The mods are the point.',
      'Has a {GENRE} game with 150 mods. It barely resembles {GAME} anymore. They prefer it that way.',
      'Reinstalls {GAME} just to try a new modlist. Plays for 2 hours. Goes back to modding.'
    ],
    voice: mergeVoice({
      periodHook: 'Another {PERIOD_NOUN} tweaking and modding **{GAME}** ({HOURS}h).',
      quiet: 'A quiet {PERIOD}. The load order stays untouched.',
      digest: '{WEEKS} active {WEEKWORD} · **{HOURS}h** logged. Mostly in the mod manager.'
    })
  },
  {
    id: 'speedrunner',
    label: 'The Speedrunner',
    description: 'Plays one game repeatedly to shave seconds off their time.',
    score: (s) => {
      if (s.totalSessions < 20) return 0;
      const concentrationScore = s.top3SessionShare * 50;
      const replayScore = s.topGameSessionRatio > 0.4 ? 30 : 0;
      const shortSessionScore = s.shortSessionRatio > 0.3 ? 20 : 0;
      return concentrationScore + replayScore + shortSessionScore;
    },
    roasts: [
      'Has beaten the same game 500 times. Each time was "practice."',
      'Splits are life. PB is the only goal. The rest of the library is a distraction.',
      'Knows the frame-perfect inputs. Misses them. Reloads. Every. Single. Time.',
      'Their gaming setup has a timer bigger than the monitor. The timer is the game.',
      'Has watched the same 10-second clip 200 times to understand one skip.',
      'Plays for 4 minutes, resets, plays for 4 minutes, resets. Calls it a session.',
      'Their friends think they hate the game. They don\'t. They love it. That\'s the problem.'
    ],
    contextRoasts: [
      'Has {HOURS} hours in {GAME}. Most sessions lasted under 5 minutes. It\'s about efficiency.',
      'Resets {GAME} if the first input isn\'t frame-perfect. Has 300 resets this week.',
      'Knows {GAME} so well they can beat it blindfolded. They\'ve tried. It didn\'t count.',
      'Has {HOURS} hours in {GAME}. Has never watched the ending. Too busy resetting.',
      'Their {GAME} PB is 0.3 seconds faster than last week. This is the greatest achievement of their life.',
      'Plays {GENRE} games specifically for the movement tech. {GAME} has the best tech.',
      'Can quote {GAME}\'s frame data from memory. Cannot remember what they had for lunch.'
    ],
    voice: mergeVoice({
      periodHook: 'Another {PERIOD_NOUN} grinding splits in **{GAME}** ({HOURS}h).',
      quiet: 'A quiet {PERIOD}. The timer stays paused.',
      digest: '{WEEKS} active {WEEKWORD} · **{HOURS}h** logged. Mostly resets.'
    })
  },
  {
    id: 'multiplayer_mainliner',
    label: 'The Multiplayer Mainliner',
    description: 'One game. One lobby. Infinite matches. Zero single-player.',
    score: (s) => {
      if (s.totalPlaytime < 100) return 0;
      const mpScore = s.multiplayerPlaytimeShare * 70;
      const concentrationScore = s.topGameShare > 0.3 ? 20 : 0;
      const sessionScore = s.totalSessions > 30 ? 10 : 0;
      return mpScore + concentrationScore + sessionScore;
    },
    roasts: [
      'Has 2000 hours in one multiplayer game. Has never touched the campaign.',
      'Single-player games are "for when the servers are down." The servers are never down.',
      'Their library has 300 games. They play one. It has a ranked mode.',
      'Buys new games. Plays them for 10 minutes. Goes back to the multiplayer main.',
      'Knows every map, every meta, every patch note. Hasn\'t touched a story mode in years.',
      'Their gaming identity is tied to a rank. The rank is Gold. It\'s always Gold.',
      'Tells people they "play games." They play one game. Singular.'
    ],
    contextRoasts: [
      'Has {HOURS} hours in {GAME}. Zero of them are single-player.',
      'Bought 5 single-player games this year. Played {GAME} instead. The single-player games are still sealed.',
      'Their {GAME} rank is their personality. They bring it up in conversations unrelated to gaming.',
      'Has {HOURS} hours in {GAME}. Knows every map. Has never seen the tutorial.',
      'The {GAME} servers went down for 10 minutes. They stared at the screen. It was the worst 10 minutes of their week.',
      'Plays {GENRE} games exclusively for the ranked mode. {GAME} is their whole personality.',
      'Has {HOURS} hours in {GAME}. Has never played another game since they installed it.'
    ],
    voice: mergeVoice({
      periodHook: 'Another {PERIOD_NOUN} grinding matches in **{GAME}** ({HOURS}h).',
      quiet: 'A quiet {PERIOD}. The lobby emptied out.',
      digest: '{WEEKS} active {WEEKWORD} · **{HOURS}h** logged. All ranked. All {GAME}.'
    })
  },
  {
    id: 'weekend_warrior',
    label: 'The Weekend Warrior',
    description: 'Gaming happens on Saturday and Sunday. The rest of the week is just waiting.',
    score: (s) => {
      if (s.totalSessions < 10) return 0;
      const weekendScore = s.weekendSessionRatio > 0.5 ? 60 : 0;
      const longSessionScore = s.avgSessionLength > 120 ? 20 : 0;
      const librarySizeScore = Math.min(1, s.totalGames / 50) * 20;
      return weekendScore + longSessionScore + librarySizeScore;
    },
    roasts: [
      'Monday to Friday is just the loading screen for the weekend.',
      'Has 5 hours of gaming on Saturday and 0 on Tuesday. The pattern is clear.',
      'Their gaming chair gets more use on weekends than their office chair does all week.',
      'Plans their weekend around game releases. Takes Monday off if it\'s a big one.',
      'Friday night is when the real week starts. The other 5 days are just obligations.',
      'Their Steam playtime graph looks like a heartbeat — flat, flat, flat, spike, spike, flat.',
      'Tells people they "game a lot." They mean "on weekends." Which is a lot. For them.'
    ],
    contextRoasts: [
      'Has {HOURS} hours in {GAME}. All of them logged between Friday night and Sunday evening.',
      'Plays {GAME} in 6-hour weekend sessions. Hasn\'t touched it on a Wednesday in months.',
      'Their {GAME} playtime is a weekend monument. Weekdays don\'t exist in the save file.',
      'Has {HOURS} hours in {GAME}. The timestamps tell a story: Saturday, Saturday, Sunday, Saturday.',
      'Bought {GAME} on a Tuesday. Waited until Saturday to play it. Worth the wait.',
      'Their {GENRE} marathons are a weekend ritual. {GAME} is the anchor. The couch is the throne.',
      'Plays {GAME} like it\'s a weekend sport. Warm-up Friday. Tournament Saturday. Cool-down Sunday.'
    ],
    voice: mergeVoice({
      periodHook: 'A {PERIOD_NOUN} of weekend campaigns in **{GAME}** ({HOURS}h).',
      quiet: 'A quiet {PERIOD}. The weekends weren\'t enough.',
      digest: '{WEEKS} active {WEEKWORD} · **{HOURS}h** logged. Mostly weekend marathons.'
    })
  },
  {
    id: 'lunch_break_gamer',
    label: 'The Lunch Break Gamer',
    description: 'Short, sharp sessions. Gaming fits between meetings and sandwiches.',
    score: (s) => {
      if (s.totalSessions < 10) return 0;
      const shortScore = s.shortSessionRatio > 0.5 ? 55 : (s.shortSessionRatio > 0.3 ? 30 : 0);
      const sessionCountScore = Math.min(1, s.totalSessions / 50) * 25;
      const varietyScore = Math.min(1, s.sortedGenres.length / 8) * 20;
      return shortScore + sessionCountScore + varietyScore;
    },
    roasts: [
      'Gaming sessions shorter than most people\'s coffee breaks.',
      'Has 300 sessions. Average length: 22 minutes. The sandwich was 15 of those.',
      'Treats gaming like a smoke break. Quick, satisfying, back to work.',
      'Their ideal game can be paused at any moment. Because it will be paused at any moment.',
      'Has more sessions than hours. Each one is a hit-and-run.',
      'Games in 20-minute bursts. Calls it "efficient." It is efficient.',
      'Their gaming schedule is built around lunch breaks and commute waits. The backlog is patient.'
    ],
    contextRoasts: [
      'Has {HOURS} hours in {GAME}. Achieved through 400 sessions of 15 minutes each.',
      'Plays {GAME} in 20-minute bursts. Has never seen a loading screen finish naturally.',
      'Their {GAME} save file has 200 entries. None longer than 30 minutes. It\'s a lifestyle.',
      'Has {HOURS} hours in {GAME}. Logged entirely between 12:00 and 12:45. Daily.',
      'Plays {GAME} like it\'s a mobile game. It\'s not a mobile game. They just treat it like one.',
      'Their {GENRE} sessions are bite-sized. {GAME} gets 15 minutes. Then it\'s back to the spreadsheet.',
      'Has {HOURS} hours in {GAME}. It took 600 sessions. Each one ended with "just one more." It was never just one more.'
    ],
    voice: mergeVoice({
      periodHook: 'A {PERIOD_NOUN} of bite-sized sessions in **{GAME}** ({HOURS}h).',
      quiet: 'A quiet {PERIOD}. Lunch breaks were busy.',
      digest: '{WEEKS} active {WEEKWORD} · **{HOURS}h** logged. Quick hits, steady pace.'
    })
  }
];

// ---------------------------------------------------------------------------
// Sub-traits
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Theme layer: the WORLDS the player inhabits (zombies, space, fantasy...),
// detected from game tags+genres weighted by playtime. This is what makes the
// persona game-related — "The Doomsday Prepper who replays everything" — with
// the behavioral archetype kept as the second half of the hybrid label.
// Ordered most-specific first: ties break toward the more evocative theme.
// ---------------------------------------------------------------------------

export const THEME_DEFINITIONS = [
  {
    id: 'doomsday_prepper',
    label: 'The Doomsday Prepper',
    shortName: 'the apocalypse',
    tags: ['zombies', 'post-apocalyptic', 'open world survival craft', 'survival'],
    roasts: [
      'Has spent {HOURS} hours barricading windows in {GAME}. The canned-food stockpile is aspirational.',
      'Plays {GAME} like a training manual. The zombie plan is written down somewhere.',
      'Every {GENRE} game becomes a rehearsal for the end of the world. {GAME} is going well, thanks for asking.'
    ]
  },
  {
    id: 'horror_junkie',
    label: 'The Horror Junkie',
    shortName: 'horror',
    tags: ['survival horror', 'psychological horror', 'horror', 'gore'],
    roasts: [
      'Plays {GAME} with the lights off on purpose. The neighbours have heard things.',
      '{HOURS} hours being scared in {GAME}. Calls it relaxing. It is not relaxing.',
      'Reads "Warning: disturbing content" as a personal invitation. See: {GAME}.'
    ]
  },
  {
    id: 'ashen_masochist',
    label: 'The Ashen Masochist',
    shortName: 'punishing games',
    tags: ['souls-like', 'soulslike', 'punishing', 'difficult'],
    roasts: [
      'Died four hundred times in {GAME} and counted every one as progress.',
      '"Maybe this boss attempt" — said {HOURS} hours ago, mid-{GAME}.',
      'Calls {GAME} "fair". The death screen disagrees.'
    ]
  },
  {
    id: 'console_cowboy',
    label: 'The Console Cowboy',
    shortName: 'neon dystopias',
    tags: ['cyberpunk', 'dystopian', 'hacking', 'neon'],
    roasts: [
      "Lives in {GAME}'s neon rain. Owns no trench coat. Yet.",
      '{HOURS} hours jacked into {GAME}. Reality has worse lighting.'
    ]
  },
  {
    id: 'starfarer',
    label: 'The Starfarer',
    shortName: 'space',
    tags: ['space sim', 'spaceships', 'space', 'sci-fi'],
    roasts: [
      '{HOURS} hours into {GAME}; the commute now feels disappointingly terrestrial.',
      'Names every ship in {GAME}. Remembers none of their real-life passwords.'
    ]
  },
  {
    id: 'dungeon_delver',
    label: 'The Dungeon Delver',
    shortName: 'fantasy worlds',
    tags: ['dark fantasy', 'dungeon crawler', 'fantasy', 'magic', 'dragons', 'medieval'],
    roasts: [
      'Has {HOURS} hours in {GAME} and still reads every item description out loud.',
      'Carries forty-seven wheels of cheese in {GAME}. Encumbrance is a suggestion.'
    ]
  },
  {
    id: 'queue_warrior',
    label: 'The Queue Warrior',
    shortName: 'the competitive queue',
    tags: ['moba', 'battle royale', 'hero shooter', 'esports', 'competitive'],
    roasts: [
      'Blames the team in {GAME}. The team changes. The losses remain.',
      '{HOURS} hours in {GAME} ranked. Mentally, still in promos.'
    ]
  },
  {
    id: 'run_addict',
    label: 'The Run Addict',
    shortName: 'roguelikes',
    tags: ['roguelike', 'roguelite', 'deckbuilding', 'procedural generation'],
    roasts: [
      '"One more run" of {GAME} has ended exactly zero times.',
      '{HOURS} hours in {GAME}; the run always dies, the hope never does.'
    ]
  },
  {
    id: 'breacher',
    label: 'The Breacher',
    shortName: 'shooters',
    tags: ['tactical', 'military', 'fps', 'shooter', 'war'],
    roasts: [
      'Checks corners in {GAME} and, reportedly, in supermarkets.',
      '{HOURS} hours of {GAME}. Reloads after firing three rounds. Every time.'
    ]
  },
  {
    id: 'homesteader',
    label: 'The Homesteader',
    shortName: 'cozy games',
    tags: ['farming', 'cozy', 'fishing', 'wholesome', 'life sim', 'relaxing'],
    roasts: [
      'The {GAME} crops are watered on a stricter schedule than anything in real life.',
      '{HOURS} hours of {GAME}. Blood pressure: immaculate.'
    ]
  },
  {
    id: 'armchair_general',
    label: 'The Armchair General',
    shortName: 'strategy',
    tags: ['grand strategy', '4x', 'turn-based strategy', 'real time strategy', 'strategy', 'tactics'],
    roasts: [
      'One more turn in {GAME}, said {HOURS} hours ago.',
      'Pauses {GAME} to think. Unpauses to conquer.'
    ]
  },
  {
    id: 'gearhead',
    label: 'The Gearhead',
    shortName: 'racing',
    tags: ['racing', 'driving', 'automobile', 'motorsport'],
    roasts: [
      'Brakes later in {GAME} than they ever would in a real car.',
      '{HOURS} hours chasing tenths in {GAME}. The commute is now "practice".'
    ]
  },
  {
    id: 'club_athlete',
    label: 'The Club Athlete',
    shortName: 'sports',
    tags: ['sports', 'football', 'soccer', 'basketball', 'hockey'],
    roasts: [
      'Manages {GAME} transfers with more care than their own finances.',
      '{HOURS} hours into {GAME}. Still blames the referee.'
    ]
  },
  {
    id: 'architect',
    label: 'The Architect',
    shortName: 'building games',
    tags: ['city builder', 'colony sim', 'automation', 'building', 'crafting'],
    roasts: [
      'The {GAME} layout has a five-year plan. The garage does not.',
      '{HOURS} hours optimising {GAME}. The factory must grow.'
    ]
  },
  {
    id: 'cartographer',
    label: 'The Cartographer',
    shortName: 'open worlds',
    tags: ['open world', 'exploration', 'walking simulator'],
    roasts: [
      'Ignores the {GAME} main quest to see what that mountain does.',
      '{HOURS} hours in {GAME}, about 3% of it on the actual storyline.'
    ]
  }
];

// Behavioral half of the hybrid label, keyed by archetype id.
const BEHAVIOR_PHRASES = {
  backlog_archaeologist: 'excavates the pile',
  credit_roll_dodger: 'never sees the credits',
  frame_data_masochist: 'chooses pain',
  spreadsheet_tactician: 'optimises the fun out',
  story_diver: 'reads every codex',
  comfort_replay_junkie: 'replays everything',
  indie_curator: 'champions the weird little games',
  franchise_loyalist: 'married to one franchise',
  retro_futurist: 'lives in the past',
  bleeding_edge: 'plays the unfinished',
  completionist: '100%s everything',
  roamer: 'wanders every world',
  social_drop_in: 'drops in on friends',
  jank_enjoyer: 'loves the jank',
  modder: 'mods everything',
  speedrunner: 'skips every cutscene',
  multiplayer_mainliner: 'lives in ranked',
  weekend_warrior: 'saves it all for Saturday',
  lunch_break_gamer: 'snacks on sessions',
  unwinder: 'unwinds on schedule',
  night_owl: 'plays after midnight'
};

const SUB_TRAITS = [
  {
    id: 'backlog_hoarder',
    label: 'Backlog Hoarder',
    condition: (s) => s.unplayedRatio > 0.5 && s.totalGames >= 20,
    roasts: [
      'Buys games on sale "just in case."',
      'Their library is a safety net for fictional future boredom.',
      'Has 400 unplayed games. Buys more anyway. It\'s not a problem. It\'s a collection.',
      'Their Steam wallet has been drained by more sales than they\'ve had hot dinners.'
    ]
  },
  {
    id: 'replay_junkie',
    label: 'Replay Junkie',
    condition: (s) => s.top3SessionShare > 0.6 && s.totalSessions >= 10,
    roasts: [
      'Has replayed the same game more times than most people finish it.',
      'New games are a threat to their comfort loop.',
      'Knows every speedrun skip in their favorite game. Uses none of them. Just likes being there.',
      'Has more hours in one game than most people have in their entire library.'
    ]
  },
  {
    id: 'night_owl',
    label: 'Nocturnal Gamer',
    condition: (s) => s.isNightOwl,
    roasts: [
      'Does their best gaming after midnight.',
      'The sun is a mild inconvenience.',
      'Has seen more 3 AM loading screens than sunrises.',
      'Their gaming peak hours overlap with their sleep deficit. Coincidence? No.'
    ]
  },
  {
    id: 'early_riser',
    label: 'Early Riser',
    condition: (s) => s.isEarlyRiser,
    roasts: [
      'Gaming before breakfast is a valid morning routine.',
      'The early bird gets the headshot.',
      'Has cleared a dungeon before most people have cleared their inbox.',
      'Sunrise gaming hits different. They know. They\'ve done it 200 times.'
    ]
  },
  {
    id: 'genre_specialist',
    label: 'Genre Specialist',
    condition: (s) => s.dominantGenreShare > 0.5,
    roasts: [
      'Has a very specific type of game. It is GENRE_PLACEHOLDER.',
      'Knows one genre inside and out. Stays there.',
      'Could write a thesis on their favorite genre. Has probably started one.',
      'Their library has one genre. It has 300 entries. They are happy.'
    ]
  },
  {
    id: 'platform_hopper',
    label: 'Platform Hopper',
    condition: (s) => s.platformCount >= 3,
    roasts: [
      'Refuses to be locked into one launcher.',
      'Has credentials for every store. Remembers none of them.',
      'Has games spread across 6 launchers. Can find none of them without searching.',
      'Their game library is a scavenger hunt across every PC store. They are the hunter.'
    ]
  },
  {
    id: 'early_access_volunteer',
    label: 'Early Access Volunteer',
    condition: (s) => s.earlyAccessRatio > 0.2,
    roasts: [
      'Pays to beta test. Sometimes twice.',
      'Roadmaps are their favorite genre.',
      'Has 20 Early Access games. 3 have been released. They\'re still waiting on the other 17.',
      '"It\'s early access" is their excuse for everything. Bugs. Crashes. Missing features. All of it.'
    ]
  },
  {
    id: 'patient_gamer',
    label: 'Patient Gamer',
    condition: (s) => s.avgReleaseYear !== null && s.avgReleaseYear < s.currentYear - 6,
    roasts: [
      'Waits for the perfect sale. And then waits some more.',
      'Has no idea what just came out. Plays a 2014 classic instead.',
      'Avoids day-one hype like it\'s a disease. Catches up 3 years later. Avoids spoilers somehow.',
      'Their backlog is so old it has games from publishers that no longer exist.'
    ]
  },
  {
    id: 'day_one_daredevil',
    label: 'Day-One Daredevil',
    condition: (s) => s.avgReleaseYear !== null && s.avgReleaseYear >= s.currentYear - 2,
    roasts: [
      'Buys new releases while they are still warm.',
      'Patch notes are bedtime reading.',
      'Has pre-ordered 12 games this year. Hasn\'t finished any of them. Hasn\'t regretted it either.',
      'Knows the exact minute a game unlocks. Has the countdown app to prove it.'
    ]
  },
  {
    id: 'indie_devout',
    label: 'Indie Devout',
    condition: (s) => s.indieRatio > 0.5,
    roasts: [
      'Solo devs have a special place in their heart.',
      'Would rather fund a Kickstarter than read a review.',
      'Has backed 30 Kickstarters. 10 delivered. 5 refunded. 15 are "still in development." They\'re fine with it.',
      'Knows the difference between a solo dev and a two-person team. Has opinions about which is better.'
    ]
  },
  {
    id: 'franchise_prisoner',
    label: 'Franchise Prisoner',
    condition: (s) => s.topFranchiseShare > 0.4 || s.topPubShare > 0.4,
    roasts: [
      'Has played every entry. Including the one nobody talks about.',
      'Loyal to a fault. Mostly to a specific publisher.',
      'Can trace the timeline of their favorite franchise through release dates alone. It\'s a family tree.',
      'Owns the spinoff. The mobile game. The DLC. The art book. The soundtrack. They don\'t skip.'
    ]
  },
  {
    id: 'pain_connoisseur',
    label: 'Pain Connoisseur',
    condition: (s) => s.challengeRatio > 0.25,
    roasts: [
      'Treats brutal games like a spa day.',
      'Collects boss fight replays like vacation photos.',
      'Has a folder of boss fight screenshots. It is organized by difficulty. It is extensive.',
      'Chooses "hard" mode first. Chooses "very hard" second. Chooses "nightmare" third. Chooses therapy fourth.'
    ]
  },
  {
    id: 'weekend_warrior_trait',
    label: 'Weekend Warrior',
    condition: (s) => s.totalSessions >= 10 && s.weekendSessionRatio > 0.5,
    roasts: [
      'The weekday library is for looking at. The weekend library is for playing.',
      'Has a 5-day cooldown between gaming sessions. It\'s called "having a job."',
      'Their gaming chair collects dust Monday through Friday. Saturday it becomes a throne.',
      'Plans the weekend game lineup on Wednesday. Executes it perfectly. Ignores all responsibilities.'
    ]
  },
  {
    id: 'lunch_break_trait',
    label: 'Lunch Break Gamer',
    condition: (s) => s.totalSessions >= 10 && s.shortSessionRatio > 0.5,
    roasts: [
      'Can clear a dungeon between the starter and the main course.',
      'Has mastered the art of the 20-minute session. Their boss fears their lunch break.',
      'Gaming in bite-sized chunks. Like tapas, but with more loading screens.',
      'Their ideal session ends before the microwave beeps. Anything longer is a luxury.'
    ]
  },
  {
    id: 'modder_trait',
    label: 'The Modder',
    condition: (s) => s.totalGames >= 10 && s.modFriendlyRatio > 0.4,
    roasts: [
      'Has a mod load order longer than most people\'s grocery list.',
      'The base game is a rough draft. The mods are the final edit.',
      'Has spent more time in Nexus Mods than in actual games this month.',
      'Treats every game as a kit. The goal isn\'t to play it — it\'s to rebuild it.'
    ]
  },
  {
    id: 'sampler',
    label: 'The Sampler',
    condition: (s) => s.totalGames >= 20 && s.playedRatio < 0.3,
    roasts: [
      'Has installed 200 games. Played 15. Uninstalled 50. The rest are "for later."',
      'Their library is a tasting menu. Two bites per game. On to the next.',
      'Installs games the way other people bookmark articles — compulsively, and with zero intention of following through.',
      'Has a 90% unplayed ratio and considers this "curated."'
    ]
  },
  {
    id: 'founder_supporter',
    label: 'Founding Supporter',
    condition: () => FounderService.getFounderProfile().isFounder,
    roasts: [
      'Pays real money for a free app. Has their priorities straight.',
      'Supports local-first development. Their library is safe from the cloud.',
      'Their wallet did what their backlog couldn\'t: supported something.',
      'Has a founder badge and zero regrets. The badge is worth more than the backlog.',
      'Could\'ve bought a coffee. Bought GamePilot a coffee instead. The app runs on it.',
      'Their tier is higher than their completion rate. No notes.',
      'Believes in the cockpit enough to fund it. The cockpit believes in them back.'
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
  return `${primaryRoast} Bonus diagnosis: ${subTraitRoast}`;
};

const formatHours = (minutes) => {
  const hours = Math.round((minutes || 0) / 60);
  return hours >= 1000 ? `${(hours / 1000).toFixed(1)}k` : `${hours}`;
};

// Minutes shown to the user for a game — always REAL numbers, never
// blend-scaled ranking units. Recent mode shows raw minutes from the current
// rotation; all-time mode shows lifetime. Falls back to whichever exists so
// roasts never invent hours.
const getDisplayMinutes = (game, mode) => {
  if (!game) return 0;
  if (mode === 'all-time') return game.lifetimeMinutes ?? game.minutes ?? 0;
  if ((game.recentMinutes || 0) > 0) return game.recentMinutes;
  if ((game.lifetimeMinutes || 0) > 0) return game.lifetimeMinutes;
  return game.minutes || 0;
};

// Substitute real game/genre data into a roast template. Uses a specific game
// so the persona references what the player actually plays.
const isUsableGameName = (value) => {
  const name = String(value || '').trim();
  if (!name) return false;
  return !/^(untitled|unknown|unknown game|null|undefined|their main)$/i.test(name);
};

const fillTemplate = (str, signals, game) => {
  if (!str) return str;
  const primaryGame = (game && isUsableGameName(game.name) && (game.minutes || 0) > 0)
    ? game
    : (signals.lastPlayedGame && isUsableGameName(signals.lastPlayedGame.name) && (signals.lastPlayedGame.minutes || 0) > 0)
      ? signals.lastPlayedGame
      : (signals.topGame && isUsableGameName(signals.topGame.name) && (signals.topGame.minutes || 0) > 0)
        ? signals.topGame
        : null;
  const name = isUsableGameName(primaryGame?.name) ? primaryGame.name : 'their main';
  const second = (signals.topGames || []).find((g) => isUsableGameName(g.name) && g.name !== name)?.name || 'something else';
  const third = (signals.topGames || []).find((g) => isUsableGameName(g.name) && g.name !== name && g.name !== second)?.name || 'a third option';
  const hoursNum = Number(getDisplayMinutes(primaryGame, signals.mode) || 0);
  const hours = hoursNum > 0 ? formatHours(hoursNum) : 'plenty';
  const genre = signals.dominantGenre || 'games';
  const franchise = signals.topFranchise?.[0] || 'their favorite franchise';
  const dev = signals.topDev?.[0] || 'their favorite studio';
  const publisher = signals.topPub?.[0] || 'their favorite publisher';
  let out = str
    .replace(/\{GAME3\}/g, third)
    .replace(/\{GAME2\}/g, second)
    .replace(/\{GAME\}/g, name)
    .replace(/\{HOURS\}/g, hours)
    .replace(/\{GENRE\}/g, genre)
    .replace(/\{FRANCHISE\}/g, franchise)
    .replace(/\{DEV\}/g, dev)
    .replace(/\{PUBLISHER\}/g, publisher);
  // Last-resort cleanup if a bad title still slipped through.
  out = out.replace(/\b0h in Untitled\b/gi, 'a long-running main')
    .replace(/\bUntitled\b/g, 'their main')
    .replace(/\b0h\b/g, 'plenty');
  return out;
};

// Pick the best roast for an archetype: prefer a game-aware contextual roast
// when we know the player's top game, otherwise fall back to a generic one.
const getRoastStingers = (signals, game) => {
  const primaryGame = game || signals.topGame;
  const secondGame = signals.topGames?.find((entry) => entry.name !== primaryGame?.name);
  const stingers = [];

  if (secondGame) {
    stingers.push(`Meanwhile, ${secondGame.name} is waiting in the wings like an understudy who knows it will never get the role.`);
  }
  if (signals.neverPlayedGames >= 10) {
    stingers.push(`${signals.neverPlayedGames} untouched games are currently serving as decorative shelf space.`);
  }
  if (signals.topGameShare >= 0.4 && primaryGame?.name) {
    stingers.push(`${primaryGame.name} accounts for ${Math.round(signals.topGameShare * 100)}% of the playtime, which is less a preference and more a residency.`);
  }
  if (signals.totalSessions >= 10) {
    stingers.push(`${Math.round(signals.totalSessions)} sessions later, the evidence is no longer circumstantial.`);
  }
  if (signals.avgSessionLength >= 120) {
    stingers.push(`The average session lasts ${Math.round(signals.avgSessionLength / 6) / 10} hours, because stopping at a sensible time would ruin the immersion.`);
  }
  if (signals.peakHour !== null && (signals.peakHour >= 22 || signals.peakHour <= 4)) {
    const hour = String(signals.peakHour).padStart(2, '0');
    stingers.push(`Peak operating hour: ${hour}:00. Sleep filed a complaint and received no response.`);
  }
  if (signals.topFranchise && signals.topFranchiseShare > 0.3) {
    stingers.push(`${signals.topFranchise[0]} makes up ${Math.round(signals.topFranchiseShare * 100)}% of the library. Brand loyalty is a full-time commitment.`);
  }
  if (signals.topDev && signals.topDevShare > 0.3) {
    stingers.push(`${signals.topDev[0]} receives ${Math.round(signals.topDevShare * 100)}% of their playtime. The dev knows them by name.`);
  }
  if (signals.dominantGenreShare > 0.5 && signals.dominantGenre) {
    stingers.push(`${Math.round(signals.dominantGenreShare * 100)}% of all playtime is ${signals.dominantGenre}. Variety is overrated, apparently.`);
  }
  if (signals.multiplayerPlaytimeShare > 0.6) {
    stingers.push(`${Math.round(signals.multiplayerPlaytimeShare * 100)}% of playtime is multiplayer. Single-player games are filing for neglect.`);
  }
  if (signals.weekendSessionRatio > 0.6) {
    stingers.push(`${Math.round(signals.weekendSessionRatio * 100)}% of sessions happen on weekends. The weekdays are just a loading screen.`);
  }
  if (signals.shortSessionRatio > 0.5) {
    stingers.push(`${Math.round(signals.shortSessionRatio * 100)}% of sessions are under 30 minutes. Efficiency is a personality trait.`);
  }
  if (signals.modFriendlyRatio > 0.4) {
    stingers.push(`${Math.round(signals.modFriendlyRatio * 100)}% of the library is mod-friendly. The base game is just a suggestion.`);
  }
  if (signals.platformCount >= 4) {
    stingers.push(`Games spread across ${signals.platformCount} platforms. Organization is not a strength.`);
  }
  if (signals.topGameSessionRatio > 0.5 && primaryGame?.name) {
    stingers.push(`${Math.round(signals.topGameSessionRatio * 100)}% of all sessions go to ${primaryGame.name}. The rest of the library is decorative.`);
  }

  return stingers;
};

const buildPersonaEvidence = (archetype, signals, game) => {
  const evidence = [];
  const primaryGame = game || signals.topGame;
  const secondGame = signals.topGames?.find((g) => g.name !== primaryGame?.name);

  // Headline: hours in the game that actually anchors this persona.
  if (primaryGame?.name) evidence.push(`${formatHours(getDisplayMinutes(primaryGame, signals.mode))}h in ${primaryGame.name}`);

  // Archetype-specific proof takes priority over generic stats.
  if ((archetype?.id === 'completionist' || archetype?.id === 'credit_roll_dodger') && signals.hasCompletionData) {
    evidence.push(`${signals.completionRate}% recorded completion rate`);
  }

  // Second game gives a two-game snapshot instead of just one data point.
  if (secondGame?.name) evidence.push(`${formatHours(getDisplayMinutes(secondGame, signals.mode))}h in ${secondGame.name}`);

  // Theme concentration — the world the current rotation lives in.
  if (signals.dominantTheme) {
    const scope = signals.mode === 'all-time' ? 'of your all-time play' : 'of your current rotation';
    evidence.push(`${Math.round(signals.dominantTheme.share * 100)}% ${scope} is ${signals.dominantTheme.shortName}`);
  }

  // Genre concentration, only when it's actually telling (over ~35%).
  if (signals.dominantGenre && signals.dominantGenreShare > 0.35) {
    evidence.push(`${Math.round(signals.dominantGenreShare * 100)}% ${signals.dominantGenre}`);
  } else if (signals.dominantGenre) {
    evidence.push(`${signals.dominantGenre} leads your playtime`);
  }

  // Franchise / developer loyalty.
  if (signals.topFranchise && signals.topFranchiseShare > 0.15) {
    evidence.push(`${signals.topFranchise[0]} × ${signals.topFranchise[1]} game${signals.topFranchise[1] === 1 ? '' : 's'}`);
  } else if (signals.topDev && signals.topDevShare > 0.25) {
    evidence.push(`${Math.round(signals.topDevShare * 100)}% of playtime from ${signals.topDev[0]}`);
  }

  // Session timing tells a very human story.
  if (signals.isNightOwl) evidence.push('Peak hours after 10pm');
  else if (signals.isEarlyRiser) evidence.push('Peak hours before 9am');

  if (signals.sessionPattern === 'long') evidence.push('Marathon sessions, 90+ min average');
  else if (signals.sessionPattern === 'short') evidence.push('Quick-hit sessions, under 30 min average');

  // Mood signature.
  if (signals.dominantMood) evidence.push(`Mostly plays in a ${signals.dominantMood} mood`);

  // Challenge appetite — cluster-aware.
  if (signals.hardClusterTier === 'dominant') {
    evidence.push(`${signals.hardGameCount} punishing/hardcore games — dominant cluster`);
  } else if (signals.hardClusterTier === 'notable') {
    evidence.push(`${signals.hardGameCount} punishing/hardcore games in library`);
  } else if (signals.hardGameCount >= 3) {
    evidence.push(`${signals.hardGameCount} punishing/hardcore games logged`);
  }

  // Chill appetite — cluster-aware.
  if (signals.chillClusterTier === 'dominant') {
    evidence.push(`${signals.chillGameCount} cozy/relaxing games — dominant cluster`);
  } else if (signals.chillClusterTier === 'notable') {
    evidence.push(`${signals.chillGameCount} cozy/relaxing games in library`);
  } else if (signals.chillGameCount >= 5) {
    evidence.push(`${signals.chillGameCount} cozy/relaxing games logged`);
  }

  // Multiplayer vs solo lean.
  if (signals.multiplayerPlaytimeShare > 0.5) {
    evidence.push(`${Math.round(signals.multiplayerPlaytimeShare * 100)}% multiplayer playtime`);
  } else if (signals.socialMoodShare > 0.4) {
    evidence.push('Plays social more often than not');
  }

  // Library behaviour.
  if (signals.neverPlayedGames > 0) evidence.push(`${signals.neverPlayedGames} games untouched`);
  if (signals.indieRatio > 0.5) evidence.push(`${Math.round(signals.indieRatio * 100)}% of tagged library is indie`);
  if (signals.platformCount >= 3) evidence.push(`Spread across ${signals.platformCount} platforms`);

  // Fall back to raw session count if nothing else landed.
  if (evidence.length === 0 && signals.totalSessions > 0) {
    evidence.push(`${Math.round(signals.totalSessions)} tracked sessions`);
  }

  return evidence.slice(0, 5);
};

const pickArchetypeRoast = (archetype, signals, seed, game) => {
  if (!archetype) return 'GamePilot is still learning your style.';
  const targetGame = game || signals.lastPlayedGame || signals.topGame;
  // Theme roasts speak the language of the world the player lives in (zombies,
  // space, horror...) — prefer them whenever a dominant theme is detected.
  const themeRoasts = signals.dominantTheme?.roasts;
  const useContext = targetGame?.name && Array.isArray(archetype.contextRoasts) && archetype.contextRoasts.length;
  const pool = themeRoasts?.length
    ? themeRoasts
    : (useContext ? archetype.contextRoasts : archetype.roasts);
  const opening = fillTemplate(pickRoast(pool, seed), signals, targetGame);
  const stingers = getRoastStingers(signals, targetGame);
  const stinger = pickRoast(stingers, seed + 7);
  return stinger ? `${opening} ${stinger}` : opening;
};

/** Shared persona → genre affinity map used by recs, Home shelves, and explainers. */
export const PERSONA_AFFINITY_GENRES = Object.freeze({
  backlog_archaeologist: ['Adventure', 'RPG', 'Strategy', 'Puzzle', 'Indie'],
  credit_roll_dodger: ['Roguelike', 'Roguelite', 'Sandbox', 'Multiplayer', 'Survival', 'Arcade'],
  frame_data_masochist: ['Action', 'Fighting', 'Roguelike', 'Platformer', 'Metroidvania', 'Bullet Hell', 'Souls-like'],
  spreadsheet_tactician: ['Strategy', 'Simulation', 'Management', 'Grand Strategy', '4X', 'City Builder', 'Tycoon'],
  story_diver: ['RPG', 'Adventure', 'Visual Novel', 'Interactive Fiction', 'Story Rich'],
  comfort_replay_junkie: ['Cozy', 'Casual', 'Simulation', 'Life Sim', 'Farming Sim', 'Adventure'],
  unwinder: ['Cozy', 'Casual', 'Simulation', 'Puzzle', 'Farming Sim', 'Life Sim', 'Relaxing'],
  night_owl: ['Atmospheric', 'Immersive Sim', 'RPG', 'Adventure', 'Horror'],
  indie_curator: ['Indie', 'Adventure', 'Puzzle', 'Experimental'],
  franchise_loyalist: ['Action-Adventure', 'RPG', 'Action', 'Shooter'],
  retro_futurist: ['Retro', 'Pixel Graphics', 'Arcade', 'Classic', 'Platformer'],
  bleeding_edge: ['Early Access', 'Indie', 'Survival', 'Crafting'],
  completionist: ['RPG', 'Adventure', 'Platformer', 'Metroidvania', 'Collectathon'],
  roamer: ['Open World', 'Exploration', 'Sandbox', 'Adventure', 'RPG'],
  social_drop_in: ['Multiplayer', 'Co-op', 'Online Co-Op', 'Party', 'MOBA'],
  jank_enjoyer: ['Early Access', 'Indie', 'Experimental', 'Simulation'],
  modder: ['Sandbox', 'Open World', 'RPG', 'Simulation', 'Strategy'],
  speedrunner: ['Platformer', 'Action', 'Roguelike', 'Precision Platformer', 'Metroidvania'],
  multiplayer_mainliner: ['FPS', 'MOBA', 'Battle Royale', 'Fighting', 'Hero Shooter', 'Tactical Shooter'],
  weekend_warrior: ['RPG', 'Open World', 'Action-Adventure', 'Strategy', 'Co-op'],
  lunch_break_gamer: ['Puzzle', 'Roguelike', 'Arcade', 'Card Game', 'Match-3', 'Casual']
});

export class GamingPersonaService {
  static getPinnedPersonaId() {
    return StorageService.get('pinnedPersonaId', null);
  }

  static setPinnedPersonaId(id) {
    StorageService.set('pinnedPersonaId', id || null);
  }

  static clearPinnedPersona() {
    StorageService.set('pinnedPersonaId', null);
  }

  static getPersona(identityProfile = null, customSeed = null, options = {}) {
    const windowDays = options.windowDays ?? null;
    const isAllTime = options.mode === 'all-time';
    // Default mode is adaptive-recent: the persona is built from the current
    // rotation (recent tracked sessions, position-weighted, blending with
    // lifetime playtime until ~10h tracked). Recency half-life only applies
    // to explicit calendar windows; callers wanting lifetime totals pass
    // { mode: 'all-time' }.
    const recencyHalfLifeDays = options.recencyHalfLifeDays ?? (windowDays !== null ? 30 : null);
    const signals = gatherSignals({ mode: options.mode, windowDays, recencyHalfLifeDays });

    // Score each archetype
    const scoredArchetypes = ARCHETYPES.map((archetype) => ({
      ...archetype,
      score: clamp(archetype.score(signals), 0, 100)
    })).sort((a, b) => b.score - a.score);

    const autoPrimary = scoredArchetypes[0] || null;
    const pinnedId = this.getPinnedPersonaId();
    const primary = pinnedId
      ? (scoredArchetypes.find((a) => a.id === pinnedId) || autoPrimary)
      : autoPrimary;

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
    // History anchors the persona (topGame); present play can flavor the roast.
    const roastGame = (signals.topGame && isUsableGameName(signals.topGame.name) && (signals.topGame.minutes || 0) > 0)
      ? signals.topGame
      : (signals.lastPlayedGame && isUsableGameName(signals.lastPlayedGame.name) && (signals.lastPlayedGame.minutes || 0) > 0)
        ? signals.lastPlayedGame
        : null;
    const primaryRoast = pickArchetypeRoast(primary, signals, baseSeed, roastGame);
    const subTraitRoast = buildSubTraitRoast(matchedSubTraits, baseSeed + 1);
    const summaryRoast = formatSummaryRoast(primaryRoast, subTraitRoast);

    // Format for UI
    const subTraits = matchedSubTraits.map((trait) => ({
      id: trait.id,
      label: trait.label,
      description: pickRoast(trait.roasts, baseSeed + 2)
    }));

    // Theme layer: the dominant world the player inhabits (zombies, space...)
    // becomes the headline of a hybrid label — "The Doomsday Prepper who
    // replays everything". Behavioral archetype stays as the second half.
    // Secondary theme (if any) surfaces as a sub-trait.
    const theme = signals.dominantTheme || null;
    const behaviorPhrase = primary ? (BEHAVIOR_PHRASES[primary.id] || 'plays it all') : null;
    const hybridLabel = primary
      ? (theme ? `${theme.label} who ${behaviorPhrase}` : primary.label)
      : null;
    if (signals.secondaryTheme) {
      subTraits.push({
        id: 'secondary_theme',
        label: `Also dabbles in ${signals.secondaryTheme.shortName}`,
        description: pickRoast([
          `A side of ${signals.secondaryTheme.shortName} keeps the rotation interesting.`,
          `Not the main course, but ${signals.secondaryTheme.shortName} shows up regularly.`
        ], baseSeed + 3)
      });
    }

    const primaryPersona = primary
      ? {
          id: primary.id,
          label: hybridLabel,
          archetypeLabel: primary.label,
          theme: theme ? { id: theme.id, label: theme.label, shortName: theme.shortName, share: theme.share } : null,
          description: primary.description,
          score: Math.round(primary.score),
          roast: primaryRoast,
          roasts: primary.roasts || [],
          contextRoasts: primary.contextRoasts || [],
          basedOnGame: roastGame?.name || null,
          evidence: buildPersonaEvidence(primary, signals, roastGame || signals.topGame),
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
    const secondaryBehaviorPhrase = secondaryArchetype ? (BEHAVIOR_PHRASES[secondaryArchetype.id] || 'plays it all') : null;
    const secondaryPersona = secondaryArchetype
      ? {
          id: secondaryArchetype.id,
          label: theme ? `${theme.label} who ${secondaryBehaviorPhrase}` : secondaryArchetype.label,
          archetypeLabel: secondaryArchetype.label,
          theme: theme ? { id: theme.id, label: theme.label, shortName: theme.shortName, share: theme.share } : null,
          description: secondaryArchetype.description,
          score: Math.round(secondaryArchetype.score),
          roast: pickArchetypeRoast(secondaryArchetype, signals, baseSeed + 5, secondaryGame),
          roasts: secondaryArchetype.roasts || [],
          contextRoasts: secondaryArchetype.contextRoasts || [],
          basedOnGame: secondaryGame?.name || null,
          evidence: buildPersonaEvidence(secondaryArchetype, signals, secondaryGame),
          voice: secondaryArchetype.voice || DEFAULT_VOICE
        }
      : null;

    const allArchetypes = scoredArchetypes.map((a) => ({
      id: a.id,
      label: a.label,
      score: Math.round(a.score)
    }));

    const formatHoursRounded = (mins) => {
    const hours = mins / 60;
    if (hours >= 100) return Math.round(hours).toString();
    if (hours >= 10) return hours.toFixed(0);
    return hours.toFixed(1);
  };

  const lifetimeGames = signals.lifetimeGames;
  const windowLabel = windowDays !== null
    ? `Last ${windowDays} days`
    : isAllTime
      ? 'All-time'
      : 'Current rotation';
  const contextLine = signals.useRecencyPlaytime
    ? `${windowLabel}: ${formatHoursRounded(signals.recentTrackedMinutes)}h across ${signals.adaptiveSessionCount} session${signals.adaptiveSessionCount === 1 ? '' : 's'} · All-time: ${formatHoursRounded(signals.lifetimeLibraryPlaytime)}h across ${lifetimeGames} games`
    : `${windowLabel}: ${formatHoursRounded(signals.totalPlaytime)}h across ${lifetimeGames} games`;

  return {
      primaryPersona,
      secondaryPersona,
      subTraits,
      summaryRoast,
      topGames: signals.topGames,
      windowDays,
      recencyHalfLifeDays,
      mode: signals.mode,
      blendFactor: signals.blendFactor,
      recentTrackedMinutes: signals.recentTrackedMinutes,
      confidence,
      contextLine,
      allArchetypes,
      founder: FounderService.getFounderProfile(),
      signals: {
        totalGames: signals.totalGames,
        playedRatio: Math.round(signals.playedRatio * 100),
        avgReleaseYear: signals.avgReleaseYear,
        dominantGenre: signals.dominantGenre,
        dominantGenreShare: Math.round(signals.dominantGenreShare * 100),
        peakHour: signals.peakHour,
        sessionPattern: signals.sessionPattern,
        completionRate: signals.completionRate,
        top3SessionShare: Math.round(signals.top3SessionShare * 100),
        platformCount: signals.platformCount,
        challengeRatio: Math.round(signals.challengeRatio * 100),
        hardGameRatio: Math.round(signals.hardGameRatio * 100),
        hardGameCount: signals.hardGameCount,
        hardClusterTier: signals.hardClusterTier,
        chillRatio: Math.round(signals.chillRatio * 100),
        chillGameRatio: Math.round(signals.chillGameRatio * 100),
        chillGameCount: signals.chillGameCount,
        chillClusterTier: signals.chillClusterTier,
        totalPlaytime: signals.totalPlaytime,
        unplayedRatio: Math.round(signals.unplayedRatio * 100),
        neverPlayedGames: signals.neverPlayedGames,
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

  /**
   * Generate a roast specific to a particular game, using the user's
   * persona archetype and contextRoasts templates with {GAME}/{HOURS}/{GENRE}.
   */
  static getGameSpecificRoast(game, options = {}) {
    if (!game || !game.name) return null;
    try {
      const persona = this.getPersona(null, options.seed ?? null, options);
      const primary = persona?.primaryPersona;
      if (!primary) return null;
      const signals = persona?.signals || {};
      const minutes = Math.max(
        0,
        Number(game.time_played || 0),
        Number(game.playtime?.total || 0),
        Number(game.playtimeMinutes || 0)
      );
      const targetGame = {
        name: game.name,
        minutes,
        genres: game.genres || [],
      };
      return pickArchetypeRoast(primary, signals, options.seed ?? 42, targetGame);
    } catch {
      return null;
    }
  }

  /**
   * Get a roast tailored to the BigScreen blade context.
   * - 'continue-playing': roast about the specific game being resumed
   * - 'for-you': roast about the user's taste matching the continue-playing game
   * - 'backlog': roast about the backlog
   * - 'library': general persona roast
   * - 'profile': general persona roast
   */
  static getBladeRoast(bladeId, game = null, options = {}) {
    try {
      if (bladeId === 'continue-playing' && game) {
        return this.getGameSpecificRoast(game, options);
      }
      if (bladeId === 'for-you' && game) {
        const persona = this.getPersona(null, options.seed ?? null, options);
        const primary = persona?.primaryPersona;
        if (!primary) return null;
        const contextRoasts = primary.contextRoasts || [];
        const signals = persona?.signals || {};
        if (contextRoasts.length > 0) {
          const minutes = Math.max(0, Number(game.time_played || 0));
          const targetGame = { name: game.name, minutes, genres: game.genres || [] };
          return pickArchetypeRoast(primary, signals, options.seed ?? 99, targetGame);
        }
        return primary.roast || persona?.summaryRoast || null;
      }
      // Default: overall persona roast
      return this.getPersona().summaryRoast;
    } catch {
      return null;
    }
  }

  /**
   * Canonical public-facing identity. All UI copy should prefer this over
   * legacy mood/genre combo labels from UserBehaviorProfile / GamingIdentity.
   */
  static getPublicIdentity(options = {}) {
    const persona = this.getPersona(null, options.seed ?? null, options);
    const primary = persona?.primaryPersona || null;
    const secondary = persona?.secondaryPersona || null;
    const topGame = persona?.topGames?.[0] || null;
    const label = primary?.label || null;
    const shortLabel = label ? String(label).replace(/^The\s+/i, '') : null;
    const roast = persona?.summaryRoast || primary?.roast || null;
    const description = primary?.description || null;
    const affinityGenres = primary?.id ? (PERSONA_AFFINITY_GENRES[primary.id] || []) : [];

    return {
      label,
      shortLabel,
      roast,
      description,
      confidence: persona?.confidence || 'low',
      mode: persona?.mode || 'recent',
      blendFactor: persona?.blendFactor ?? 0,
      recentTrackedMinutes: persona?.recentTrackedMinutes || 0,
      contextLine: persona?.contextLine || null,
      primary,
      secondary,
      subTraits: persona?.subTraits || [],
      topGames: persona?.topGames || [],
      topGameName: topGame?.name || primary?.basedOnGame || null,
      dominantGenre: persona?.signals?.dominantGenre || null,
      affinityGenres,
      voice: primary?.voice || DEFAULT_VOICE,
      becauseYouAre: shortLabel
        ? `Because you're ${label.startsWith('The ') ? label : `a ${shortLabel}`}`
        : 'Because of how you play',
      headline: label && roast ? `${label} — ${roast}` : (label || roast || 'Still learning your habits'),
      raw: persona
    };
  }

  static getAffinityGenres(personaId = null) {
    const id = personaId || this.getPrimaryPersona()?.id;
    if (!id) return [];
    return PERSONA_AFFINITY_GENRES[id] || [];
  }

  static gameMatchesPersona(game, personaId = null) {
    const genres = Array.isArray(game?.genres)
      ? game.genres.map((g) => String(g).toLowerCase())
      : [];
    const tags = Array.isArray(game?.tags)
      ? game.tags.map((t) => String(t).toLowerCase())
      : [];
    const affinity = this.getAffinityGenres(personaId).map((g) => String(g).toLowerCase());
    if (affinity.length === 0) return false;
    return affinity.some((a) => genres.includes(a) || tags.includes(a) || genres.some((g) => g.includes(a)) || tags.some((t) => t.includes(a)));
  }
}

export default GamingPersonaService;
