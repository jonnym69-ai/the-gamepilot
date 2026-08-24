import { resolveGameArtwork } from './GameArtworkService';
import StorageService from './StorageService';
import { GamingIdentity } from '../GamingIdentity';
import { StatsAggregationService } from './StatsAggregationService';
import { UserBehaviorProfile } from './UserBehaviorProfile';
import StoryArchiveService from './StoryArchiveService';
import { GamingPersonaService, DEFAULT_VOICE } from './GamingPersonaService';

// Minimum engagement before a full narrative chapter is generated. Below this
// we render a short "quiet week" card instead of forcing a story.
const QUIET_PERIOD_MIN_HOURS = 2;

const FIRST_STORY_SHOWN_KEY = 'firstGamingStoryShown';
const GAMING_STORY_KEY = 'gamingStory';
const PERIOD_STORY_KEY = 'periodGamingStory';
const STORY_FREQUENCY_KEY = 'gamingStoryFrequency';
const LAST_PERIOD_STORY_KEY = 'lastPeriodGamingStory';
const EVOLVING_THRESHOLD_SESSIONS = 5;

const PERIOD_LABELS = {
  daily: 'today',
  weekly: 'this week',
  monthly: 'this month',
  yearly: 'this year'
};

// Maps a story period to the recency window (in days) that should drive the
// persona/roast used in that story. This keeps "this week" stories rooted in
// what was actually played this week rather than an all-time identity.
const PERIOD_WINDOW_DAYS = {
  daily: 1,
  weekly: 7,
  monthly: 30,
  yearly: 365
};

const getPublicIdentityForPeriod = (period) => {
  try {
    const windowDays = PERIOD_WINDOW_DAYS[period] ?? null;
    return GamingPersonaService.getPublicIdentity(windowDays !== null ? { windowDays } : {});
  } catch {
    return null;
  }
};

const PERIOD_STORY_TITLES = {
  daily: 'Story of Your Day',
  weekly: 'Story of Your Week',
  monthly: 'Story of Your Month',
  yearly: 'Story of Your Year'
};

const PERIOD_STORY_SCHEMA_VERSION = 3;

const GENRE_TEMPLATES = {
  'Survival': {
    lead: 'scraping by in the wild',
    hook: 'You spent {period} scraping by in the wild',
    arc: 'a survival arc where every session is another night you almost didn\'t make it'
  },
  'Survival Horror': {
    lead: 'walking straight into the nightmare',
    hook: 'You spent {period} walking straight into the nightmare',
    arc: 'a horror arc built on bad decisions and worse hallways'
  },
  'Horror': {
    lead: 'letting the dread cook',
    hook: 'You spent {period} letting the dread cook',
    arc: 'a horror arc where the jump scares are optional and the tension is not'
  },
  'Zombie': {
    lead: 'outlasting the undead',
    hook: 'You spent {period} outlasting the undead',
    arc: 'a zombie-season arc: loot, bite marks, and one more safehouse'
  },
  'Sports': {
    lead: 'living the pro sports grind',
    hook: 'You spent {period} living the pro sports grind',
    arc: 'a sports-year arc of seasons, rivalries, and highlight-reel delusions'
  },
  'Racing': {
    lead: 'chasing the checkered flag',
    hook: 'You spent {period} chasing the checkered flag',
    arc: 'a racing arc measured in apexes, restarts, and pure tunnel vision'
  },
  'RPG': {
    lead: 'living inside someone else\'s legend',
    hook: 'You spent {period} living inside someone else\'s legend',
    arc: 'an RPG arc stuffed with side quests you swore you wouldn\'t do'
  },
  'Action RPG': {
    lead: 'swinging through a whole campaign',
    hook: 'You spent {period} swinging through a whole campaign',
    arc: 'an action-RPG arc of bosses, builds, and "one more dungeon"'
  },
  'Strategy': {
    lead: 'moving pieces until the map bends',
    hook: 'You spent {period} moving pieces until the map bends',
    arc: 'a strategy arc where the fun is the plan and the plan is a spreadsheet'
  },
  'Turn-Based Strategy': {
    lead: 'winning wars one turn at a time',
    hook: 'You spent {period} winning wars one turn at a time',
    arc: 'a turn-based empire arc with zero urgency and maximum smugness'
  },
  'Simulation': {
    lead: 'running a second life in systems',
    hook: 'You spent {period} running a second life in systems',
    arc: 'a sim arc where the menus are the gameplay and you are fine with that'
  },
  'Shooter': {
    lead: 'living in the crosshairs',
    hook: 'You spent {period} living in the crosshairs',
    arc: 'a shooter arc of loadouts, rematches, and "that should have hit"'
  },
  'FPS': {
    lead: 'living in the crosshairs',
    hook: 'You spent {period} living in the crosshairs',
    arc: 'an FPS arc measured in headshots and stubborn playlists'
  },
  'Adventure': {
    lead: 'chasing the next unmarked trail',
    hook: 'You spent {period} chasing the next unmarked trail',
    arc: 'an adventure arc of maps, mysteries, and "I\'ll sleep after this area"'
  },
  'Open World': {
    lead: 'getting beautifully distracted',
    hook: 'You spent {period} getting beautifully distracted',
    arc: 'an open-world arc where the main quest is a polite suggestion'
  },
  'Fighting': {
    lead: 'settling scores in the arena',
    hook: 'You spent {period} settling scores in the arena',
    arc: 'a fighting-game arc of lab time, salt, and one clean combo'
  },
  'Puzzle': {
    lead: 'staring at problems until they blink',
    hook: 'You spent {period} staring at problems until they blink',
    arc: 'a puzzle arc powered by stubbornness and quiet victory noises'
  },
  'Platformer': {
    lead: 'timing jumps like a religion',
    hook: 'You spent {period} timing jumps like a religion',
    arc: 'a platformer arc of near-misses, retries, and pure flow'
  },
  'Indie': {
    lead: 'championing the weird little masterpieces',
    hook: 'You spent {period} championing the weird little masterpieces',
    arc: 'an indie arc of oddball gems nobody asked you to finish — but you did'
  },
  'Roguelike': {
    lead: 'dying, learning, and running it back',
    hook: 'You spent {period} dying, learning, and running it back',
    arc: 'a roguelike arc where every death is tuition'
  },
  'Roguelite': {
    lead: 'dying, learning, and running it back',
    hook: 'You spent {period} dying, learning, and running it back',
    arc: 'a roguelite arc of meta-progress and "this run is the one"'
  },
  'Metroidvania': {
    lead: 'unlocking the map one ability at a time',
    hook: 'You spent {period} unlocking the map one ability at a time',
    arc: 'a metroidvania arc of locked doors and smug return trips'
  },
  'Sandbox': {
    lead: 'building your own fun from scratch',
    hook: 'You spent {period} building your own fun from scratch',
    arc: 'a sandbox arc with no win condition except "look what I made"'
  },
  'Crafting': {
    lead: 'gathering, crafting, and justifying one more stack',
    hook: 'You spent {period} gathering, crafting, and justifying one more stack',
    arc: 'a crafting arc powered by inventory Tetris'
  },
  'MMO': {
    lead: 'grinding with the crowd',
    hook: 'You spent {period} grinding alongside thousands of others',
    arc: 'an MMO arc of raids, resets, and friends who are also a second job'
  },
  'MMORPG': {
    lead: 'grinding with the crowd',
    hook: 'You spent {period} grinding alongside thousands of others',
    arc: 'an MMORPG arc written in weekly lockouts'
  },
  'MOBA': {
    lead: 'chasing the perfect teamfight',
    hook: 'You spent {period} chasing the perfect teamfight',
    arc: 'a MOBA arc of drafts, tilt, and one beautiful objective steal'
  },
  'Battle Royale': {
    lead: 'dropping in for the last-one-standing rush',
    hook: 'You spent {period} chasing that last-one-standing rush',
    arc: 'a battle-royale arc of hot drops and cold loot'
  },
  'Multiplayer': {
    lead: 'squadding up',
    hook: 'You spent {period} squadding up with the crew',
    arc: 'a multiplayer arc that only makes sense with the right people online'
  },
  'Co-op': {
    lead: 'watching each other\'s backs',
    hook: 'You spent {period} watching each other\'s backs',
    arc: 'a co-op arc of shared wins and shared bad calls'
  },
  'Stealth': {
    lead: 'staying in the shadows on purpose',
    hook: 'You spent {period} staying in the shadows on purpose',
    arc: 'a stealth arc where alarms are personal failures'
  },
  'Card Game': {
    lead: 'building the perfect deck',
    hook: 'You spent {period} building the perfect deck',
    arc: 'a card-game arc of tech choices and "one more ranked"'
  },
  'Deckbuilder': {
    lead: 'building the perfect deck',
    hook: 'You spent {period} building the perfect deck',
    arc: 'a deckbuilder arc of synergies you will explain to nobody'
  },
  'Fighting Game': {
    lead: 'settling scores in the arena',
    hook: 'You spent {period} settling scores in the arena',
    arc: 'a fighting-game arc of lab time, salt, and one clean combo'
  },
  'Action-Adventure': {
    lead: 'chasing set pieces and secrets',
    hook: 'You spent {period} chasing set pieces and secrets',
    arc: 'an action-adventure arc of big moments and bigger detours'
  },
  'Sci-Fi': {
    lead: 'chasing the stars',
    hook: 'You spent {period} chasing the stars',
    arc: 'a sci-fi arc of strange tech and stranger choices'
  },
  'Fantasy': {
    lead: 'living out a legend',
    hook: 'You spent {period} living out a fantasy legend',
    arc: 'a fantasy arc of swords, spells, and lore rabbit holes'
  },
  'Souls-like': {
    lead: 'dying with purpose',
    hook: 'You spent {period} dying with purpose',
    arc: 'a souls-like arc of patience, pattern memory, and pure spite'
  },
  'Visual Novel': {
    lead: 'choosing every dialogue branch like it matters',
    hook: 'You spent {period} choosing every dialogue branch like it matters',
    arc: 'a visual-novel arc of feelings, flags, and bad endings on purpose'
  }
};

// Rotating fallbacks so unmapped genres don't all read identically.
const DEFAULT_TEMPLATES = [
  { lead: 'deep in the session', hook: 'You spent {period} deep in the session', arc: 'a pure playtime arc with no neat genre label' },
  { lead: 'locked in', hook: 'You spent {period} locked in', arc: 'a locked-in arc where the clock stopped mattering' },
  { lead: 'chasing the next session', hook: 'You spent {period} chasing the next session', arc: 'a habit arc of short hops that somehow added up' },
  { lead: 'lost in the grind', hook: 'You spent {period} lost in the grind', arc: 'a grind arc that only makes sense if you were there' }
];

const getTemplateForGenre = (genre) => {
  if (!genre) return DEFAULT_TEMPLATES[0];
  const normalized = String(genre).trim();
  const exact = GENRE_TEMPLATES[normalized];
  if (exact) return exact;
  const lower = normalized.toLowerCase();
  const fuzzyKey = Object.keys(GENRE_TEMPLATES).find((key) => {
    const k = key.toLowerCase();
    return lower.includes(k) || k.includes(lower);
  });
  if (fuzzyKey) return GENRE_TEMPLATES[fuzzyKey];
  // Rotate fallback by genre name so unmapped genres don't all read the same.
  const hash = normalized.split('').reduce((h, c) => h + c.charCodeAt(0), 0);
  return DEFAULT_TEMPLATES[hash % DEFAULT_TEMPLATES.length];
};

const buildGenreArcLine = (genreFingerprint = [], topGames = []) => {
  const topGenres = (genreFingerprint || [])
    .map((entry) => entry?.genre || entry)
    .filter(Boolean)
    .slice(0, 3);
  if (topGenres.length === 0 && topGames[0]?.genre) {
    topGenres.push(topGames[0].genre);
  }
  if (topGenres.length === 0) return '';

  const primary = getTemplateForGenre(topGenres[0]);
  if (topGenres.length === 1) {
    return `This chapter reads like ${primary.arc || `a ${topGenres[0]} arc`}.`;
  }
  if (topGenres.length === 2) {
    return `This chapter reads like ${primary.arc || `a ${topGenres[0]} arc`}, with a side plot of ${topGenres[1]}.`;
  }
  return `This chapter reads like ${primary.arc || `a ${topGenres[0]} arc`}, drifting through ${topGenres[1]} and ${topGenres[2]} along the way.`;
};

const getPeriodTopGames = (periodData, limit = 3) => {
  if (!periodData || !Array.isArray(periodData.topGames)) {
    return [];
  }

  // Prefer recently played games from this period, not lifetime library leaders.
  // Hours still break ties so a heavy recent sit-down can outrank a brief one.
  return periodData.topGames
    .filter((entry) => entry && (entry.gameName || entry.name))
    .map((entry) => {
      const lastPlayedRaw = entry.lastPlayed || entry.last_played || entry.timestamp || null;
      const lastPlayedMs = lastPlayedRaw ? new Date(lastPlayedRaw).getTime() : 0;
      return {
        name: entry.gameName || entry.name,
        hours: Math.round((entry.minutes || entry.totalPlaytime || 0) / 60),
        minutes: Math.round(entry.minutes || entry.totalPlaytime || 0),
        genre: entry.genre || null,
        coverUrl: entry.coverUrl || '',
        lastPlayed: Number.isFinite(lastPlayedMs) ? lastPlayedMs : 0,
        sessions: entry.sessions || entry.playCount || 0
      };
    })
    .sort((a, b) => {
      if (b.lastPlayed !== a.lastPlayed) return b.lastPlayed - a.lastPlayed;
      if (b.minutes !== a.minutes) return b.minutes - a.minutes;
      return (b.sessions || 0) - (a.sessions || 0);
    })
    .slice(0, limit);
};

const getGameGenre = (game) => {
  if (!game) return null;
  if (game.genre) return game.genre;
  if (Array.isArray(game.genres) && game.genres.length > 0) return game.genres[0];
  if (game.primaryGenre) return game.primaryGenre;
  return null;
};

const getGameHours = (game) => {
  const minutes = Math.max(
    Number(game?.playtime?.total) || 0,
    Number(game?.time_played) || 0,
    Number(game?.playtimeForever) || 0,
    Number(game?.importedPlaytimeMinutes) || 0,
    Number(game?.playtimeMinutes) || 0,
    Number(game?.totalPlaytime) || 0
  );
  return Math.max(0, Math.round(minutes / 60));
};

const getTopGames = (library, limit = 5) => {
  return [...library]
    .filter((g) => {
      if (!g) return false;
      const name = String(g.name || g.title || '').trim();
      if (!name || /^(untitled|unknown|unknown game|null|undefined)$/i.test(name)) return false;
      return getGameHours(g) > 0 || g.last_played;
    })
    .map((game) => ({
      ...game,
      name: game.name || game.title,
      hours: getGameHours(game),
      genre: getGameGenre(game),
      coverUrl: resolveGameArtwork(game, { surface: 'library_card' })
    }))
    .filter((game) => game.hours > 0)
    .sort((a, b) => b.hours - a.hours)
    .slice(0, limit);
};

const buildGenreFingerprint = (games) => {
  const totals = new Map();
  games.forEach((game) => {
    const genre = game.genre || 'Unknown';
    const current = totals.get(genre) || { hours: 0, count: 0 };
    totals.set(genre, { hours: current.hours + game.hours, count: current.count + 1 });
  });

  return Array.from(totals.entries())
    .map(([genre, data]) => ({ genre, ...data }))
    .sort((a, b) => b.hours - a.hours);
};

const formatList = (items) => {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
};

const normName = (value) => (value ? String(value).trim().toLowerCase() : '');

const ordinal = (n) => {
  const num = Number(n) || 0;
  const rem10 = num % 10;
  const rem100 = num % 100;
  if (rem10 === 1 && rem100 !== 11) return `${num}st`;
  if (rem10 === 2 && rem100 !== 12) return `${num}nd`;
  if (rem10 === 3 && rem100 !== 13) return `${num}rd`;
  return `${num}th`;
};

// Singular noun for a period, used in continuity copy ("3rd week running").
const PERIOD_NOUN = {
  daily: 'day',
  weekly: 'week',
  monthly: 'month',
  yearly: 'year'
};

// "last week" / "last month" phrasing for deltas.
const PERIOD_PREVIOUS = {
  daily: 'yesterday',
  weekly: 'last week',
  monthly: 'last month',
  yearly: 'last year'
};

const getStoryDominantGenre = (story) => {
  if (!story) return null;
  if (Array.isArray(story.genreFingerprint) && story.genreFingerprint.length > 0) {
    return story.genreFingerprint[0].genre || null;
  }
  const top = Array.isArray(story.topGames) ? story.topGames[0] : null;
  return top?.genre || null;
};

// Resolve the narrative voice to use for story copy. If a caller passes a
// persona object, use its voice; otherwise fetch the current primary persona.
const getVoiceForStory = (persona) => {
  if (persona?.voice) return persona.voice;
  try {
    return GamingPersonaService.getPrimaryPersona()?.voice || DEFAULT_VOICE;
  } catch {
    return DEFAULT_VOICE;
  }
};

// Simple template substitution for voice strings. Undefined vars become ''.
const fillVoiceTemplate = (template, vars) => {
  if (!template) return '';
  return Object.entries(vars).reduce((str, [key, value]) => {
    const safe = value === undefined || value === null ? '' : String(value);
    return str.replace(new RegExp(`\\{${key}\\}`, 'g'), safe);
  }, template);
};

/**
 * Derive week-to-week narrative deltas by comparing the current period summary
 * against the previous chapter of the same cadence. This is what turns a stats
 * snapshot into a story with an arc. Returns narrative lines plus a streak count
 * that carries forward on the saved chapter.
 *
 * When a voice is supplied, continuity lines are flavored by the player's
 * persona so the arc reads like the same narrator wrote the whole book.
 */
const computeContinuity = (period, current, previous, voice = DEFAULT_VOICE) => {
  const noun = PERIOD_NOUN[period] || 'period';
  const lastWord = PERIOD_PREVIOUS[period] || 'last time';
  const lines = [];
  const curTop = (current.topGames || [])[0] || null;
  const prevActive = previous && !previous.isQuiet ? previous : null;
  const prevTop = prevActive ? (prevActive.topGames || [])[0] || null : null;

  let topGameStreak = 1;

  const continuityVoice = voice.continuity || DEFAULT_VOICE.continuity;

  // Top-game continuity: same anchor (streak) or a new #1 dethroning the old.
  if (curTop && prevTop) {
    if (normName(curTop.name) === normName(prevTop.name)) {
      const prevStreak = Number(prevActive?.continuity?.topGameStreak) || 1;
      topGameStreak = prevStreak + 1;
      if (topGameStreak >= 3) {
        lines.push(fillVoiceTemplate(continuityVoice.streak, {
          GAME: curTop.name,
          ORDINAL: ordinal(topGameStreak),
          PERIOD: noun
        }));
      } else {
        lines.push(`**${curTop.name}** kept its grip on the top spot from ${lastWord}.`);
      }
    } else {
      lines.push(fillVoiceTemplate(continuityVoice.dethroned, {
        GAME: curTop.name,
        PREVGAME: prevTop.name
      }));
    }
  }

  // Comeback after a quiet stretch.
  if (previous?.isQuiet && !current.isQuiet) {
    lines.push(fillVoiceTemplate(continuityVoice.comeback, { PERIOD: noun }));
  }

  // Genre shift in taste.
  const curGenre = getStoryDominantGenre(current);
  const prevGenre = prevActive ? getStoryDominantGenre(prevActive) : null;
  if (curGenre && prevGenre && normName(curGenre) !== normName(prevGenre)) {
    lines.push(fillVoiceTemplate(continuityVoice.genreShift, {
      PREVGENRE: prevGenre,
      GENRE: curGenre
    }));
  }

  // New games breaking into the rotation.
  if (prevActive && Array.isArray(prevActive.topGames)) {
    const prevNames = new Set(prevActive.topGames.map((g) => normName(g.name)));
    const fresh = (current.topGames || []).filter((g) => g.name && !prevNames.has(normName(g.name)));
    if (fresh.length > 0 && prevTop) {
      lines.push(fillVoiceTemplate(continuityVoice.newRotation, {
        FRESH: formatList(fresh.map((g) => `**${g.name}**`))
      }));
    }
  }

  // Playtime delta versus the previous chapter.
  if (prevActive && Number.isFinite(prevActive.totalHours)) {
    const delta = Math.round((current.totalHours || 0) - prevActive.totalHours);
    if (delta >= 3) {
      lines.push(`That's **${delta}h** more than ${lastWord}.`);
    } else if (delta <= -3) {
      lines.push(`That's **${Math.abs(delta)}h** less than ${lastWord}.`);
    }
  }

  return {
    lines,
    topGameStreak,
    comparedTo: previous?.generatedAt || null
  };
};

export const GamingStoryService = {
  shouldShowFirstStory() {
    return StorageService.getString(FIRST_STORY_SHOWN_KEY) !== 'true';
  },

  markFirstStoryShown() {
    StorageService.setString(FIRST_STORY_SHOWN_KEY, 'true');
  },

  getCurrentStory() {
    return StorageService.get(GAMING_STORY_KEY, null);
  },

  saveStory(story) {
    if (!story) return;
    StorageService.set(GAMING_STORY_KEY, {
      ...story,
      updatedAt: new Date().toISOString()
    });
  },

  shouldEvolveStory(profile) {
    const current = this.getCurrentStory();
    if (!current) return true;
    const stats = profile?.stats || {};
    return (stats.totalSessions || 0) >= EVOLVING_THRESHOLD_SESSIONS;
  },

  generateFirstScanStory(library) {
    if (!Array.isArray(library) || library.length === 0) {
      return null;
    }

    const topGames = getTopGames(library, 3);
    if (topGames.length === 0) {
      return null;
    }

    const totalHours = topGames.reduce((sum, g) => sum + g.hours, 0);
    const genreFingerprint = buildGenreFingerprint(topGames);
    const topGenreNames = genreFingerprint.slice(0, 3).map((g) => g.genre);

    const leadingGame = topGames[0];
    const runnerUpGames = topGames.slice(1, 3);
    const runnerUpNames = runnerUpGames.map((g) => g.name);

    let publicIdentity = null;
    try {
      publicIdentity = GamingPersonaService.getPublicIdentity();
    } catch {
      publicIdentity = null;
    }

    let narrative = `Your first scan shows **${totalHours} hours** across your top ${topGames.length} games. `;
    narrative += `**${leadingGame.name}** leads the way with **${leadingGame.hours} hours**.`;

    if (runnerUpNames.length > 0) {
      narrative += ` It's followed by ${formatList(runnerUpNames)}.`;
    }

    if (topGenreNames.length > 0) {
      narrative += ` Your strongest genres so far are ${formatList(topGenreNames)}.`;
    }

    const arcLine = buildGenreArcLine(genreFingerprint, topGames);
    if (arcLine) {
      narrative += ` ${arcLine}`;
    }

    if (publicIdentity?.label) {
      narrative += ` Early read: you already look like **${publicIdentity.label}**.`;
      if (publicIdentity.roast) {
        narrative += ` ${publicIdentity.roast}`;
      }
    } else {
      narrative += ' GamePilot will roast a living persona out of this as you keep playing.';
    }

    return {
      chapter: 'anchor',
      title: 'Your Gaming Story Begins',
      subtitle: publicIdentity?.label
        ? `${publicIdentity.label} · ${topGames.length} anchor games`
        : `From ${topGames.length} anchor games and ${totalHours} hours`,
      totalHours,
      gameCount: topGames.length,
      topGames,
      genreFingerprint,
      narrative,
      identityLabel: publicIdentity?.label || null,
      tasteClusters: []
    };
  },

  generateEvolvingStory() {
    const library = StorageService.get('library', []);

    const topGames = getTopGames(library, 5);
    if (topGames.length === 0) {
      return null;
    }

    let publicIdentity = null;
    try {
      publicIdentity = GamingPersonaService.getPublicIdentity();
    } catch {
      publicIdentity = null;
    }

    const profile = GamingIdentity.getProfile();
    const stats = profile?.stats || {};
    const totalHours = Math.round((stats.totalPlayTime || 0) / 60);
    const identityLabel = publicIdentity?.label || profile?.identity?.personality || 'Gamer';
    const identityRoast = publicIdentity?.roast || profile?.identity?.description || '';
    const dominantGenre = publicIdentity?.dominantGenre || profile?.persona?.dominantGenre || stats?.favoriteGenre || null;
    const sessionPattern = profile?.persona?.sessionPatternLabel || profile?.identity?.sessionPattern || null;

    // Build genre fingerprint from persona's affinity + dominant genre
    const affinityGenres = publicIdentity?.affinityGenres || [];
    const genreNames = [];
    if (dominantGenre) genreNames.push(dominantGenre);
    affinityGenres.forEach((g) => { if (!genreNames.includes(g)) genreNames.push(g); });
    const uniqueGenres = genreNames.slice(0, 3);
    const genreFingerprint = uniqueGenres.map((genre) => ({ genre, count: 0, hours: 0 }));

    const leadingGame = topGames[0];
    const runnerUpGames = topGames.slice(1, 3);
    const runnerUpNames = runnerUpGames.map((g) => g.name);

    const narrativeParts = [];

    narrativeParts.push(`You're **${identityLabel}**.`);
    if (identityRoast) {
      narrativeParts.push(identityRoast);
    }
    narrativeParts.push(`Across **${totalHours} hours** and **${stats.totalSessions || 0} sessions**, **${leadingGame.name}** remains your anchor at **${leadingGame.hours} hours**.`);

    if (runnerUpNames.length > 0) {
      narrativeParts.push(`It's joined by ${formatList(runnerUpNames)}.`);
    }

    const arcLine = buildGenreArcLine(genreFingerprint, topGames);
    if (arcLine) {
      narrativeParts.push(arcLine);
    } else if (uniqueGenres.length > 0) {
      narrativeParts.push(`Your taste clusters around ${formatList(uniqueGenres)}.`);
    }

    if (sessionPattern) {
      narrativeParts.push(`Your sessions lean ${sessionPattern.toLowerCase()}.`);
    }

    if (publicIdentity?.subTraits?.length > 0) {
      narrativeParts.push(`Traits: ${publicIdentity.subTraits.slice(0, 3).join(', ')}.`);
    }

    narrativeParts.push('That voice is what GamePilot uses to pick — and roast — your next session.');

    const narrative = narrativeParts.join(' ');

    return {
      chapter: 'identity',
      title: 'Your Gaming Story',
      subtitle: identityLabel.startsWith('The ')
        ? `You play as ${identityLabel}`
        : `You play as a ${identityLabel.toLowerCase()}`,
      totalHours,
      gameCount: topGames.length,
      topGames,
      genreFingerprint,
      narrative,
      identityLabel,
      tasteClusters: (publicIdentity?.affinityGenres || []).slice(0, 3)
    };
  },

  updateStory(library) {
    const profile = GamingIdentity.getProfile();
    const hasEnoughSessions = (profile?.stats?.totalSessions || 0) >= EVOLVING_THRESHOLD_SESSIONS;
    const current = this.getCurrentStory();

    let story;
    if (current?.chapter === 'identity' && hasEnoughSessions) {
      story = this.generateEvolvingStory();
    } else if (!current && Array.isArray(library) && library.length > 0) {
      story = this.generateFirstScanStory(library);
    } else if (hasEnoughSessions && current?.chapter === 'anchor') {
      story = this.generateEvolvingStory();
    } else {
      return current;
    }

    if (story) {
      this.saveStory(story);
    }
    return story;
  },

  getStoryFrequency() {
    const value = StorageService.getString(STORY_FREQUENCY_KEY, 'weekly');
    return ['off', 'daily', 'weekly', 'monthly', 'yearly'].includes(value) ? value : 'weekly';
  },

  setStoryFrequency(frequency) {
    if (!['off', 'daily', 'weekly', 'monthly', 'yearly'].includes(frequency)) {
      return;
    }
    StorageService.setString(STORY_FREQUENCY_KEY, frequency);
  },

  getPeriodStory() {
    return StorageService.get(PERIOD_STORY_KEY, null);
  },

  savePeriodStory(story) {
    if (!story) return;
    StorageService.set(PERIOD_STORY_KEY, {
      ...story,
      generatedAt: new Date().toISOString()
    });
    StorageService.setString(LAST_PERIOD_STORY_KEY, story.period || 'weekly');
  },

  shouldGeneratePeriodStory(period) {
    const frequency = this.getStoryFrequency();
    if (frequency === 'off') return false;
    if (frequency !== period) return false;

    const lastStory = this.getPeriodStory();
    if (!lastStory?.generatedAt) return true;

    const lastDate = new Date(lastStory.generatedAt);
    const now = new Date();

    if (period === 'daily') {
      return lastDate.toDateString() !== now.toDateString();
    }
    if (period === 'weekly') {
      return this.getWeekStart(lastDate) !== this.getWeekStart(now);
    }
    if (period === 'monthly') {
      return lastDate.getMonth() !== now.getMonth() || lastDate.getFullYear() !== now.getFullYear();
    }
    if (period === 'yearly') {
      return lastDate.getFullYear() !== now.getFullYear();
    }
    return false;
  },

  getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff)).toDateString();
  },

  /**
   * Compute the start timestamp (ms) for the current instance of a period.
   * Used to scope recommendation outcomes to the story's timeframe.
   */
  getPeriodStartTimestamp(period) {
    const now = new Date();
    if (period === 'daily') {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    }
    if (period === 'weekly') {
      return new Date(this.getWeekStart(now)).getTime();
    }
    if (period === 'monthly') {
      return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    }
    if (period === 'yearly') {
      return new Date(now.getFullYear(), 0, 1).getTime();
    }
    return null;
  },

  /**
   * Build a short "quiet period" card when engagement is below threshold.
   * Tone adapts to the user's identity persona so it still feels personal.
   */
  buildQuietPeriodStory(period, totalHours = 0, previousStory = null, persona = null) {
    const username = StorageService.getString('profileUsername', '') || 'you';
    const publicIdentity = getPublicIdentityForPeriod(period);

    const voice = getVoiceForStory(persona || publicIdentity?.primary);
    const identityLabel = persona?.label || publicIdentity?.label || null;

    // Continuity: acknowledge stepping back after an active chapter.
    const usablePrevious = previousStory && previousStory.period === period ? previousStory : null;
    const prevTop = usablePrevious && !usablePrevious.isQuiet
      ? (usablePrevious.topGames || [])[0]
      : null;
    let narrative = fillVoiceTemplate(voice.quiet || DEFAULT_VOICE.quiet, {
      PERIOD: PERIOD_NOUN[period] || 'period'
    });
    if (prevTop) {
      narrative += ` A change of pace after **${prevTop.name}** dominated ${PERIOD_PREVIOUS[period] || 'last time'}.`;
    }
    if (identityLabel) {
      narrative += ` Even **${identityLabel}** needs a breather.`;
    }

    return {
      chapter: 'quiet',
      period,
      isQuiet: true,
      title: `A quiet ${PERIOD_NOUN[period] || 'period'} for ${username}`,
      subtitle: totalHours > 0
        ? `${totalHours}h tracked by GamePilot`
        : `No sessions tracked by GamePilot ${PERIOD_LABELS[period] || 'in this period'}`,
      totalHours,
      gameCount: 0,
      topGames: [],
      genreFingerprint: [],
      moodFingerprint: [],
      recommendationOutcomes: null,
      narrative,
      identityLabel,
      tasteClusters: [],
      continuity: { lines: [], topGameStreak: 0, comparedTo: usablePrevious?.generatedAt || null }
    };
  },

  generatePeriodStory(period, previousStory = null, persona = null) {
    const dashboard = StatsAggregationService.getDashboardData();
    const periodData = dashboard?.periods?.[period];
    if (!periodData) {
      return this.buildQuietPeriodStory(period, 0, previousStory, persona);
    }

    const topGames = getPeriodTopGames(periodData, 5);
    const totalHours = Math.round((periodData.playtimeMinutes || 0) / 60);

    // Quiet-period fallback: not enough playtime or no tracked games.
    if (topGames.length === 0 || totalHours < QUIET_PERIOD_MIN_HOURS) {
      return this.buildQuietPeriodStory(period, totalHours, previousStory, persona);
    }

    const publicIdentity = getPublicIdentityForPeriod(period);
    const voice = getVoiceForStory(persona || publicIdentity?.primary);
    const periodLabel = PERIOD_LABELS[period] || 'this period';
    const identityLabel = persona?.label || publicIdentity?.label || null;
    const identityRoast = publicIdentity?.roast || null;

    // --- Extract period stats ---
    const sessionCount = periodData.sessions || 0;
    const uniqueGames = periodData.uniqueGames || topGames.length;
    const activeDays = periodData.activeDays || 0;
    const avgSessionMin = periodData.avgSessionMinutes || 0;
    const longestMin = periodData.longestSessionMinutes || 0;
    const streak = periodData.streak || { current: 0, best: 0 };
    const platformCounts = periodData.platformCounts || {};
    const genreCounts = periodData.genreCounts || {};

    // --- Genre fingerprint from genreCounts (richer than deriving from top games) ---
    const genreFingerprint = Object.entries(genreCounts)
      .filter(([g]) => g && g !== 'Unknown' && g !== 'null')
      .map(([genre, count]) => ({ genre, count, hours: 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // --- Leading game + genre template ---
    const leadingGame = topGames[0];
    const leadingTemplate = getTemplateForGenre(leadingGame.genre);

    // --- Build narrative with variety ---
    const narrativeParts = [];

    // Opening: persona-voiced hook
    narrativeParts.push(fillVoiceTemplate(voice.periodHook || DEFAULT_VOICE.periodHook, {
      PERIOD: periodLabel,
      PERIOD_NOUN: PERIOD_NOUN[period] || 'period',
      LEAD: leadingTemplate.lead,
      GAME: leadingGame.name,
      HOURS: leadingGame.hours
    }));

    // Secondary games — use voice.secondary template
    const secondaryGames = topGames.slice(1, 3);
    if (secondaryGames.length > 0) {
      const secondaryLines = secondaryGames.map((game) => {
        const template = getTemplateForGenre(game.genre);
        return fillVoiceTemplate(voice.secondary || DEFAULT_VOICE.secondary, {
          LEAD: template.lead,
          GAME: game.name,
          HOURS: game.hours
        });
      });
      narrativeParts.push(formatList(secondaryLines) + '.');
    }

    // Genre arc line
    const arcLine = buildGenreArcLine(genreFingerprint, topGames);
    if (arcLine) {
      narrativeParts.push(arcLine);
    }

    // Session stats — varies phrasing based on intensity
    const avgSessionHours = Math.round(avgSessionMin / 60 * 10) / 10;
    const longestHours = Math.round(longestMin / 60 * 10) / 10;
    if (sessionCount > 0) {
      let sessionLine;
      if (sessionCount >= 10) {
        sessionLine = `**${sessionCount} sessions** across **${activeDays} day${activeDays === 1 ? '' : 's'}**`;
      } else if (sessionCount >= 5) {
        sessionLine = `**${sessionCount} sessions** over **${activeDays} day${activeDays === 1 ? '' : 's'}**`;
      } else {
        sessionLine = `**${sessionCount} session${sessionCount === 1 ? '' : 's'}** over **${activeDays} day${activeDays === 1 ? '' : 's'}**`;
      }
      if (avgSessionHours > 0) {
        sessionLine += ` — averaging **${avgSessionHours}h** per sit-down`;
      }
      if (longestHours >= 3) {
        sessionLine += `. Longest single session: **${longestHours}h**`;
      }
      narrativeParts.push(sessionLine + '.');
    }

    // Total hours
    narrativeParts.push(`**${totalHours} hours** total${uniqueGames > topGames.length ? ` across **${uniqueGames} games**` : ''}.`);

    // Genre highlights — top 2 genres with counts
    if (genreFingerprint.length >= 2) {
      const topGenre = genreFingerprint[0].genre;
      const secondGenre = genreFingerprint[1].genre;
      narrativeParts.push(`Your taste leaned into **${topGenre}** and **${secondGenre}** ${periodLabel}.`);
    } else if (genreFingerprint.length === 1) {
      narrativeParts.push(`**${genreFingerprint[0].genre}** dominated your playtime ${periodLabel}.`);
    }

    // Platform breakdown if multi-platform
    const platformEntries = Object.entries(platformCounts)
      .filter(([p]) => p && p !== 'Unknown' && p !== 'null')
      .sort((a, b) => b[1] - a[1]);
    if (platformEntries.length >= 2) {
      const topPlatform = platformEntries[0][0];
      const topPlatformSessions = platformEntries[0][1];
      narrativeParts.push(`Most of that was on **${topPlatform}** (${topPlatformSessions} session${topPlatformSessions === 1 ? '' : 's'}).`);
    }

    // Streak callout
    if (streak.current >= 3) {
      const noun = PERIOD_NOUN[period] || 'period';
      narrativeParts.push(`You're on a **${streak.current}-${noun} streak** — keep it alive.`);
    }

    // Continuity: compare against the previous chapter of the same cadence
    const usablePrevious = previousStory && previousStory.period === period ? previousStory : null;
    const continuity = computeContinuity(
      period,
      { topGames, genreFingerprint, totalHours, isQuiet: false },
      usablePrevious,
      voice
    );
    if (continuity.lines.length > 0) {
      narrativeParts.push(continuity.lines.join(' '));
    }

    // Persona roast as a closing flourish
    if (identityLabel && identityRoast) {
      narrativeParts.push(`Because you're **${identityLabel}**: ${identityRoast}`);
    } else if (identityLabel) {
      narrativeParts.push(`That's **${identityLabel}** behaviour, through and through.`);
    }

    // Taste fingerprint — top moods
    let moodFingerprint = [];
    try {
      moodFingerprint = (UserBehaviorProfile.getTopMoods(3) || [])
        .map((entry) => ({ mood: entry.mood, count: entry.count }));
    } catch {
      moodFingerprint = [];
    }

    // Recommendation outcomes
    let recommendationOutcomes = null;
    try {
      const since = this.getPeriodStartTimestamp(period);
      const outcomes = UserBehaviorProfile.getRecommendationOutcomes(since);
      recommendationOutcomes = {
        accepted: outcomes.acceptedCount,
        ignored: outcomes.ignoredCount
      };
      if (outcomes.acceptedCount > 0) {
        narrativeParts.push(`You followed **${outcomes.acceptedCount}** recommendation${outcomes.acceptedCount === 1 ? '' : 's'} ${periodLabel}.`);
      } else if (outcomes.ignoredCount > 0) {
        narrativeParts.push(`You forged your own path, passing on ${outcomes.ignoredCount} suggestion${outcomes.ignoredCount === 1 ? '' : 's'}.`);
      }
    } catch {
      recommendationOutcomes = null;
    }

    const narrative = narrativeParts.join(' ');

    return {
      chapter: 'period',
      period,
      isQuiet: false,
      schemaVersion: PERIOD_STORY_SCHEMA_VERSION,
      title: PERIOD_STORY_TITLES[period] || 'Story of Your Week',
      subtitle: `${totalHours}h · ${sessionCount} sessions · ${uniqueGames} games`,
      totalHours,
      gameCount: topGames.length,
      sessionCount,
      uniqueGames,
      activeDays,
      avgSessionMinutes: avgSessionMin,
      longestSessionMinutes: longestMin,
      topGames,
      genreFingerprint,
      moodFingerprint,
      recommendationOutcomes,
      narrative,
      identityLabel,
      tasteClusters: [],
      continuity
    };
  },

  needsPeriodStoryRefresh(story, period) {
    if (!story) return true;
    if (story.period && period && story.period !== period) return true;
    if (story.schemaVersion !== PERIOD_STORY_SCHEMA_VERSION) return true;
    const title = String(story.title || '').toLowerCase();
    return title.includes('this week story')
      || title.includes("this week's story")
      || title === 'this week'
      || title.startsWith('your this');
  },

  updatePeriodStory(period, persona = null, options = {}) {
    const force = Boolean(options?.force);
    const existing = this.getPeriodStory();
    const periodBoundary = this.shouldGeneratePeriodStory(period);
    const needsRefresh = force || periodBoundary || this.needsPeriodStoryRefresh(existing, period);

    if (!needsRefresh) {
      return existing;
    }

    const story = this.generatePeriodStory(period, existing, persona);
    if (story) {
      this.savePeriodStory(story);
      if (period === 'weekly' && periodBoundary) {
        try {
          StoryArchiveService.recordWeeklyChapter({
            ...story,
            generatedAt: story.generatedAt || new Date().toISOString()
          });
        } catch (err) {
          console.warn('[GamingStory] failed to archive weekly chapter:', err);
        }
      }
    }
    return story;
  }
};

export default GamingStoryService;
