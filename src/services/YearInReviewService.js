import { StatsAggregationService } from './StatsAggregationService';
import { UserBehaviorProfile } from './UserBehaviorProfile';
import { DailyEngagementService } from './DailyEngagementService';
import { getDateKey } from './DateKeyService';
import { ProgressionUnlockService } from './ProgressionUnlockService';
import GamingPersonaService from './GamingPersonaService';
import PeriodChampionService from './PeriodChampionService';

const MONTH_LABELS = Object.freeze(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);
const SESSION_BUCKET_LABELS = Object.freeze({
  '0-30': 'Sprint Sessions',
  '30-60': 'Focused Runs',
  '60-120': 'Extended Flights',
  '120+': 'Marathon Missions'
});
const incrementCounter = (counter, key, amount = 1) => {
  const normalizedKey = typeof key === 'string' ? key.trim() : '';
  if (!normalizedKey) {
    return;
  }
  counter[normalizedKey] = (counter[normalizedKey] || 0) + amount;
};

const sortCounts = (counts = {}) => {
  const safeCounts = counts && typeof counts === 'object' ? counts : {};
  return Object.entries(safeCounts)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
};

const buildRankedList = (counts = {}, limit = 5) => {
  const safeCounts = counts && typeof counts === 'object' ? counts : {};
  const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 5;
  return sortCounts(safeCounts)
    .slice(0, safeLimit)
    .map(([label, count]) => ({ label, count }));
};

const getPersonaVoice = () => {
  // Year in Review is a retrospective — it deliberately uses the all-time
  // persona rather than the app-wide default current-rotation persona.
  const persona = GamingPersonaService.getPersona(null, null, { mode: 'all-time' });
  const primary = persona?.primaryPersona;
  return {
    label: primary?.label || null,
    roast: persona?.summaryRoast || primary?.roast || null,
    voice: primary?.voice || null
  };
};

const buildMonthlyBreakdown = (sessions = []) => {
  const safeSessions = Array.isArray(sessions) ? sessions : [];
  const playtimeMinutes = Object.fromEntries(MONTH_LABELS.map((label) => [label, 0]));
  const sessionCounts = Object.fromEntries(MONTH_LABELS.map((label) => [label, 0]));

  safeSessions.forEach((session) => {
    if (!session || !session.timestamp || typeof session.playtimeMinutes !== 'number') {
      return;
    }
    const label = MONTH_LABELS[session.timestamp.getMonth()];
    if (label) {
      incrementCounter(playtimeMinutes, label, session.playtimeMinutes);
      incrementCounter(sessionCounts, label, 1);
    }
  });

  return {
    playtimeMinutes,
    playtimeHours: Object.fromEntries(
      Object.entries(playtimeMinutes).map(([label, value]) => [label, Number((value / 60).toFixed(1))])
    ),
    sessionCounts
  };
};

const buildChampionJourney = (sessions = [], library = [], year = new Date().getFullYear()) => {
  const safeYear = Number(year) || new Date().getFullYear();
  const monthlyChampions = MONTH_LABELS.map((monthLabel, monthIndex) => {
    const periodKey = `${safeYear}-${String(monthIndex + 1).padStart(2, '0')}`;
    const champion = PeriodChampionService.getChampionForPeriod('month', periodKey, {
      library,
      sessions,
      includePersona: false,
    });
    return champion ? { ...champion, monthLabel } : null;
  }).filter(Boolean);
  return {
    yearChampion: PeriodChampionService.getChampionForPeriod('year', String(safeYear), {
      library,
      sessions,
      includePersona: false,
    }),
    monthlyChampions,
  };
};

const buildTopGames = (sessions = [], limit = 5) => {
  const gameMap = new Map();

  sessions.forEach((session) => {
    const key = String(session.gameId || session.gameName);
    if (!gameMap.has(key)) {
      gameMap.set(key, {
        id: key,
        name: session.gameName,
        platform: session.platform,
        totalPlaytime: 0,
        sessions: 0,
        lastPlayed: session.timestamp,
        longestSessionMinutes: 0,
        avgSessionMinutes: 0
      });
    }

    const entry = gameMap.get(key);
    entry.totalPlaytime += session.playtimeMinutes;
    entry.sessions += 1;
    entry.longestSessionMinutes = Math.max(entry.longestSessionMinutes, session.playtimeMinutes);
    if (!entry.lastPlayed || session.timestamp > entry.lastPlayed) {
      entry.lastPlayed = session.timestamp;
    }
  });

  return Array.from(gameMap.values())
    .map((entry) => ({
      ...entry,
      avgSessionMinutes: entry.sessions > 0 ? Math.round(entry.totalPlaytime / entry.sessions) : 0
    }))
    .sort((left, right) => right.totalPlaytime - left.totalPlaytime || right.sessions - left.sessions)
    .slice(0, limit);
};

const formatReviewDate = (value) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const buildDeepStats = (sessions = [], topGames = []) => {
  const safeSessions = Array.isArray(sessions) ? sessions : [];
  const longestSession = safeSessions.reduce((best, session) => {
    if (!best || session.playtimeMinutes > best.playtimeMinutes) {
      return session;
    }
    return best;
  }, null);
  const dayMap = new Map();
  const weekendSessions = safeSessions.filter((session) => [0, 6].includes(session.timestamp.getDay()));
  const lateNightSessions = safeSessions.filter((session) => {
    const hour = session.timestamp.getHours();
    return hour >= 22 || hour < 5;
  });

  safeSessions.forEach((session) => {
    const dateKey = getDateKey(session.timestamp);
    const current = dayMap.get(dateKey) || {
      dateKey,
      dateLabel: formatReviewDate(session.timestamp),
      playtimeMinutes: 0,
      sessions: 0
    };
    current.playtimeMinutes += session.playtimeMinutes;
    current.sessions += 1;
    dayMap.set(dateKey, current);
  });

  const busiestDay = Array.from(dayMap.values())
    .sort((left, right) => right.playtimeMinutes - left.playtimeMinutes || right.sessions - left.sessions)[0] || null;
  const topBySessions = [...topGames]
    .sort((left, right) => right.sessions - left.sessions || right.totalPlaytime - left.totalPlaytime)[0] || null;

  return {
    longestSession: longestSession ? {
      gameName: longestSession.gameName,
      platform: longestSession.platform,
      playtimeMinutes: longestSession.playtimeMinutes,
      dateLabel: formatReviewDate(longestSession.timestamp)
    } : null,
    busiestDay,
    topBySessions,
    weekendSessions: weekendSessions.length,
    weekendPlaytimeMinutes: weekendSessions.reduce((sum, session) => sum + session.playtimeMinutes, 0),
    lateNightSessions: lateNightSessions.length,
    lateNightPlaytimeMinutes: lateNightSessions.reduce((sum, session) => sum + session.playtimeMinutes, 0),
    gamesWithMultipleSessions: topGames.filter((game) => game.sessions > 1).length
  };
};

const getSessionStyleDescriptor = (bucket) => {
  switch (bucket) {
    case '0-30':
      return 'quick-hit';
    case '30-60':
      return 'steady';
    case '60-120':
      return 'deep-session';
    case '120+':
      return 'marathon';
    default:
      return 'flexible';
  }
};

const buildBlendedPersonaIdentity = ({ dominantMood, dominantGenre, preferredSessionBucket, peakPlayWindow }) => {
  // Don't inject the current archetype into historical snapshots — evolution
  // should show how mood/genre/session patterns changed over time, not repeat
  // the same archetype label on both sides.

  if (!dominantMood && !dominantGenre && !preferredSessionBucket) {
    return {
      label: 'Adaptive Pilot',
      description: 'Your local profile is still taking shape across moods, genres, and session rhythm.'
    };
  }

  const styleDescriptor = getSessionStyleDescriptor(preferredSessionBucket);
  // Keep the label clean: never combine mood + genre with a separator, and never use 'leaning'.
  const label = dominantGenre
    ? `${dominantGenre} ${styleDescriptor} player`
    : (dominantMood ? `${dominantMood} Pilot` : `${styleDescriptor} player`);

  const descriptionParts = [];
  if (dominantMood) {
    descriptionParts.push(`${dominantMood} showed up as your strongest mood signal`);
  }
  if (dominantGenre) {
    descriptionParts.push(`${dominantGenre.toLowerCase()} games shaped the genre side of your profile`);
  }
  if (preferredSessionBucket) {
    descriptionParts.push(`${SESSION_BUCKET_LABELS[preferredSessionBucket] || 'Flexible Sessions'} gave your year a ${styleDescriptor} rhythm`);
  }
  if (peakPlayWindow) {
    descriptionParts.push(`${peakPlayWindow.toLowerCase()} was your most active play window`);
  }

  return {
    label,
    description: `${descriptionParts.join('. ')}.`
  };
};

const buildPersonaFromSessions = (sessions = []) => {
  if (!sessions.length) {
    return {
      identityLabel: 'Uncharted Pilot',
      identityDescription: 'Complete a few sessions to generate a local play identity for this year.',
      dominantMood: null,
      dominantGenre: null,
      preferredSessionBucket: null,
      preferredSessionLabel: 'Flexible Sessions',
      peakPlayWindow: null,
      avgSessionMinutes: 0,
      moodMix: [],
      genreMix: []
    };
  }

  const moodCounts = {};
  const genreCounts = {};
  const hourCounts = {};
  const topMoodEntries = [];
  const totalMinutes = sessions.reduce((sum, session) => {
    incrementCounter(moodCounts, session.mood);
    incrementCounter(genreCounts, session.primaryGenre);
    incrementCounter(hourCounts, String(session.timestamp.getHours()));
    return sum + session.playtimeMinutes;
  }, 0);

  sortCounts(moodCounts)
    .slice(0, 3)
    .forEach(([mood, count]) => {
      topMoodEntries.push({
        mood,
        count,
        completionRate: 0
      });
    });

  const [dominantMood] = sortCounts(moodCounts)[0] || [null, 0];
  const [dominantGenre] = sortCounts(genreCounts)[0] || [null, 0];
  const [peakHour] = sortCounts(hourCounts)[0] || [null, 0];
  const avgSessionMinutes = Math.round(totalMinutes / sessions.length);
  const preferredSessionBucket = UserBehaviorProfile.getSessionLengthCategory(avgSessionMinutes);
  const peakPlayWindow = peakHour !== null ? UserBehaviorProfile.getTimeOfDay(Number(peakHour)) : null;
  const personaIdentity = buildBlendedPersonaIdentity({
    dominantMood,
    dominantGenre,
    preferredSessionBucket,
    peakPlayWindow
  });

  return {
    identityLabel: personaIdentity?.label || (dominantMood ? `${dominantMood} Pilot` : 'Adaptive Pilot'),
    identityDescription: personaIdentity?.description || 'Built a unique local play profile through completed sessions.',
    dominantMood,
    dominantGenre,
    preferredSessionBucket,
    preferredSessionLabel: SESSION_BUCKET_LABELS[preferredSessionBucket] || 'Flexible Sessions',
    peakPlayWindow,
    avgSessionMinutes,
    moodMix: buildRankedList(moodCounts, 3),
    genreMix: buildRankedList(genreCounts, 3)
  };
};

const buildPersonaEvolution = (sessions = []) => {
  if (sessions.length < 3) {
    return null;
  }

  const segmentSize = Math.max(1, Math.ceil(sessions.length / 3));
  const opening = buildPersonaFromSessions(sessions.slice(0, segmentSize));
  const closing = buildPersonaFromSessions(sessions.slice(-segmentSize));

  let summary = 'Your play profile stayed steady across the year.';
  if (opening.dominantMood && closing.dominantMood && opening.dominantMood !== closing.dominantMood) {
    summary = `You shifted from ${opening.dominantMood.toLowerCase()} sessions into a more ${closing.dominantMood.toLowerCase()} finish.`;
  } else if (opening.dominantGenre && closing.dominantGenre && opening.dominantGenre !== closing.dominantGenre) {
    summary = `Your genre focus moved from ${opening.dominantGenre} into ${closing.dominantGenre} as the year went on.`;
  } else if (opening.preferredSessionBucket && closing.preferredSessionBucket && opening.preferredSessionBucket !== closing.preferredSessionBucket) {
    summary = `Your session rhythm evolved from ${opening.preferredSessionLabel.toLowerCase()} to ${closing.preferredSessionLabel.toLowerCase()}.`;
  }

  return {
    opening,
    closing,
    summary
  };
};

const SEASON_MONTHS = Object.freeze({
  Winter: [11, 0, 1],   // Dec, Jan, Feb
  Spring: [2, 3, 4],    // Mar, Apr, May
  Summer: [5, 6, 7],   // Jun, Jul, Aug
  Autumn: [8, 9, 10]    // Sep, Oct, Nov
});

const SEASON_ORDER = Object.freeze(['Winter', 'Spring', 'Summer', 'Autumn']);

const getSeasonForMonth = (monthIndex) => {
  for (const [season, months] of Object.entries(SEASON_MONTHS)) {
    if (months.includes(monthIndex)) return season;
  }
  return null;
};

const buildSeasonalChapter = (season, seasonSessions, prevSeason) => {
  if (!seasonSessions || seasonSessions.length === 0) {
    return {
      season,
      hasData: false,
      headline: `${season} was quiet.`,
      body: 'No tracked sessions this season. Sometimes life gets in the way of the sticks.',
      stats: null,
      pivot: null
    };
  }

  const totalMinutes = seasonSessions.reduce((sum, s) => sum + s.playtimeMinutes, 0);
  const uniqueGames = new Set(seasonSessions.map(s => String(s.gameId || s.gameName))).size;
  const persona = buildPersonaFromSessions(seasonSessions);
  const longest = seasonSessions.reduce((best, s) =>
    (!best || s.playtimeMinutes > best.playtimeMinutes) ? s : best, null);

  // Find dominant game by playtime
  const gameMap = new Map();
  seasonSessions.forEach((s) => {
    const key = String(s.gameId || s.gameName);
    const existing = gameMap.get(key) || { name: s.gameName, minutes: 0, sessions: 0 };
    existing.minutes += s.playtimeMinutes;
    existing.sessions += 1;
    gameMap.set(key, existing);
  });
  const topGame = Array.from(gameMap.values()).sort((a, b) => b.minutes - a.minutes)[0] || null;

  // Detect pivot from previous season
  let pivot = null;
  if (prevSeason?.persona) {
    if (prevSeason.persona.dominantMood && persona.dominantMood && prevSeason.persona.dominantMood !== persona.dominantMood) {
      pivot = {
        type: 'mood',
        from: prevSeason.persona.dominantMood,
        to: persona.dominantMood,
        text: `A shift in tone — you moved from ${prevSeason.persona.dominantMood.toLowerCase()} into ${persona.dominantMood.toLowerCase()}.`
      };
    } else if (prevSeason.persona.dominantGenre && persona.dominantGenre && prevSeason.persona.dominantGenre !== persona.dominantGenre) {
      pivot = {
        type: 'genre',
        from: prevSeason.persona.dominantGenre,
        to: persona.dominantGenre,
        text: `You pivoted from ${prevSeason.persona.dominantGenre} into ${persona.dominantGenre}.`
      };
    } else if (prevSeason.persona.preferredSessionBucket && persona.preferredSessionBucket &&
               prevSeason.persona.preferredSessionBucket !== persona.preferredSessionBucket) {
      pivot = {
        type: 'session',
        from: prevSeason.persona.preferredSessionLabel,
        to: persona.preferredSessionLabel,
        text: `Your rhythm changed — ${prevSeason.persona.preferredSessionLabel.toLowerCase()} gave way to ${persona.preferredSessionLabel.toLowerCase()}.`
      };
    }
  }

  // Build narrative headline
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthsActive = [...new Set(seasonSessions.map(s => s.timestamp.getMonth()))].sort((a, b) => a - b);
  const monthRange = monthsActive.length > 0
    ? `${monthNames[monthsActive[0]]}${monthsActive.length > 1 ? `–${monthNames[monthsActive[monthsActive.length - 1]]}` : ''}`
    : '';

  let headline;
  const isEveningHeavy = seasonSessions.filter(s => s.timestamp.getHours() >= 18).length > seasonSessions.length / 2;

  if (pivot) {
    headline = `${season}: The ${pivot.type === 'genre' ? 'pivot' : pivot.type === 'mood' ? 'turn' : 'shift'}.`;
  } else if (topGame && topGame.minutes > totalMinutes * 0.4) {
    headline = `${season}: The ${topGame.name} season.`;
  } else if (uniqueGames >= 5) {
    headline = `${season}: A sampler's journey.`;
  } else if (isEveningHeavy) {
    headline = `${season}: After-dark sessions.`;
  } else {
    headline = `${season}: Steady hands on the sticks.`;
  }

  // Build narrative body
  const bodyParts = [];
  const gamingPersona = getPersonaVoice();
  bodyParts.push(`You logged ${Math.round(totalMinutes / 60)} hours across ${seasonSessions.length} sessions${uniqueGames > 1 ? ` and ${uniqueGames} games` : ''}.`);

  if (gamingPersona.roast) {
    bodyParts.push(gamingPersona.roast);
  } else if (persona.dominantMood && persona.dominantGenre) {
    bodyParts.push(`${persona.identityLabel} — ${persona.dominantMood.toLowerCase()} energy, ${persona.dominantGenre.toLowerCase()} focus.`);
  } else if (persona.dominantMood) {
    bodyParts.push(`${persona.identityLabel} — a ${persona.dominantMood.toLowerCase()} stretch.`);
  }

  if (topGame) {
    bodyParts.push(`${topGame.name} led the charge with ${Math.round(topGame.minutes / 60)}h.`);
  }

  if (longest) {
    bodyParts.push(`Your longest sitting: ${Math.round(longest.playtimeMinutes)} minutes on ${formatReviewDate(longest.timestamp) || 'one focused day'}.`);
  }

  if (pivot) {
    bodyParts.push(pivot.text);
  }

  return {
    season,
    hasData: true,
    headline,
    body: bodyParts.join(' '),
    monthRange,
    stats: {
      playtimeMinutes: totalMinutes,
      playtimeHours: Number((totalMinutes / 60).toFixed(1)),
      sessions: seasonSessions.length,
      uniqueGames,
      dominantMood: persona.dominantMood,
      dominantGenre: persona.dominantGenre,
      preferredSessionLabel: persona.preferredSessionLabel,
      topGame: topGame ? { name: topGame.name, hours: Number((topGame.minutes / 60).toFixed(1)) } : null,
      longestSession: longest ? { gameName: longest.gameName, minutes: longest.playtimeMinutes, dateLabel: formatReviewDate(longest.timestamp) } : null
    },
    persona: {
      identityLabel: persona.identityLabel,
      identityDescription: persona.identityDescription
    },
    pivot
  };
};

const buildSeasonalStory = (sessions = [], selectedYear) => {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return null;
  }

  const yearSessions = sessions.filter((s) => s.timestamp.getFullYear() === selectedYear);
  if (yearSessions.length === 0) return null;

  // Group sessions by season
  const seasonGroups = {};
  yearSessions.forEach((s) => {
    const season = getSeasonForMonth(s.timestamp.getMonth());
    if (!season) return;
    if (!seasonGroups[season]) seasonGroups[season] = [];
    seasonGroups[season].push(s);
  });

  // Sort seasons in chronological order for the selected year
  // We need to handle year-boundary: Winter includes Dec of previous year AND Jan/Feb of current year
  // For simplicity, we'll just map the months within the selected year
  const chapters = [];
  let prevChapter = null;

  for (const season of SEASON_ORDER) {
    const seasonSessions = seasonGroups[season] || [];
    const chapter = buildSeasonalChapter(season, seasonSessions, prevChapter);
    chapters.push(chapter);
    if (chapter.hasData) {
      prevChapter = chapter;
    }
  }

  // Build overall narrative arc
  const activeSeasons = chapters.filter(c => c.hasData);
  const gamingPersona = getPersonaVoice();
  const totalHours = Math.round(yearSessions.reduce((sum, s) => sum + s.playtimeMinutes, 0) / 60);
  const uniqueGames = new Set(yearSessions.map((s) => String(s.gameId || s.gameName))).size;
  const sessionCount = yearSessions.length;
  let arc = '';
  if (activeSeasons.length === 0) {
    arc = 'A quiet year. The controller gathered dust.';
  } else if (gamingPersona.roast) {
    arc = `This year you logged ${totalHours} hours across ${uniqueGames} games and ${sessionCount} sessions. ${gamingPersona.label || 'Your gaming persona'}: ${gamingPersona.roast}`;
  } else if (activeSeasons.length === 1) {
    arc = `${activeSeasons[0].season} was your season. Everything else was filler.`;
  } else {
    const first = activeSeasons[0];
    const last = activeSeasons[activeSeasons.length - 1];
    const pivots = activeSeasons.filter(c => c.pivot).length;
    if (pivots >= 2) {
      arc = `A year of change — ${pivots} pivots in playstyle across the seasons.`;
    } else if (first.persona?.identityLabel && last.persona?.identityLabel &&
               first.persona.identityLabel === last.persona.identityLabel) {
      arc = `Consistent all year — ${first.persona.identityLabel} from start to finish.`;
    } else {
      arc = `You started as ${first.persona?.identityLabel || 'a player'} and ended as ${last.persona?.identityLabel || 'someone new'}.`;
    }
  }

  return {
    arc,
    chapters,
    activeSeasons: activeSeasons.length,
    totalSeasons: SEASON_ORDER.length
  };
};

const buildHabitSummary = (selectedYear, sessions = []) => {
  const yearSessions = sessions.filter((s) => new Date(s.timestamp || 0).getFullYear() === selectedYear);
  const daysActive = new Set(yearSessions.map((s) => getDateKey(s.timestamp))).size;
  const avgSessionMinutes = yearSessions.length > 0
    ? Math.round(yearSessions.reduce((sum, s) => sum + (s.playtimeMinutes || 0), 0) / yearSessions.length)
    : 0;

  return {
    daysActive,
    avgSessionMinutes,
    sessionsCount: yearSessions.length
  };
};

const buildDistributionSummary = (sessions = []) => {
  const platforms = {};
  const moods = {};
  const genres = {};

  sessions.forEach((session) => {
    incrementCounter(platforms, session.platform);
    incrementCounter(moods, session.mood);
    incrementCounter(genres, session.primaryGenre);
  });

  return {
    platforms,
    moods,
    genres,
    topPlatforms: buildRankedList(platforms, 4),
    topMoods: buildRankedList(moods, 4),
    topGenres: buildRankedList(genres, 4)
  };
};

const buildEngagementSummary = () => {
  const engagement = DailyEngagementService.getStatus();
  return {
    currentStreak: Number(engagement?.currentStreak || 0),
    longestStreak: Number(engagement?.longestStreak || 0),
    totalLogins: Number(engagement?.totalLogins || 0),
    lastLoginDate: engagement?.lastLoginDate || null
  };
};

const buildSummaryCards = ({ year, summary, topGames, persona, distributions, habits, deepStats, engagement }) => {
  const gamingPersona = getPersonaVoice();
  const topGame = topGames[0] || null;
  const topPlatform = distributions.topPlatforms[0] || null;
  const topMood = distributions.topMoods[0] || null;
  const longestSession = deepStats?.longestSession || null;

  return [
    {
      id: 'headline',
      title: `${year} at a Glance`,
      value: `${summary.playtimeHours}h`,
      detail: `${summary.sessions} sessions across ${summary.uniqueGames} games`
    },
    {
      id: 'top-game',
      title: 'Most Played',
      value: topGame?.name || 'No sessions yet',
      detail: topGame ? `${Math.round(topGame.totalPlaytime / 60)}h · ${topGame.sessions} launch${topGame.sessions !== 1 ? 'es' : ''} this year` : 'Launch and finish sessions to populate this card'
    },
    {
      id: 'longest-session',
      title: 'Longest Session',
      value: longestSession?.gameName || 'No marathon yet',
      detail: longestSession ? `${Math.round(longestSession.playtimeMinutes)} minutes${longestSession.dateLabel ? ` · ${longestSession.dateLabel}` : ''}` : 'Your biggest single sitting will appear here'
    },
    {
      id: 'persona',
      title: 'Player Identity',
      value: gamingPersona.label || persona.identityLabel,
      detail: gamingPersona.roast || (persona.dominantMood ? `${persona.dominantMood} mood · ${persona.preferredSessionLabel}` : 'Build your local play profile')
    },
    {
      id: 'platform',
      title: 'Platform Home',
      value: topPlatform?.label || '—',
      detail: topPlatform ? `${topPlatform.count} sessions` : 'No platform trend yet'
    },
    {
      id: 'mood',
      title: 'Mood of the Year',
      value: topMood?.label || '—',
      detail: topMood ? `${topMood.count} tracked sessions` : 'No mood trend yet'
    },
    {
      id: 'habits',
      title: 'Days Active',
      value: `${habits.daysActive}`,
      detail: habits.daysActive > 0 ? `${habits.sessionsCount} sessions · ~${habits.avgSessionMinutes} min avg` : 'Play sessions will appear here as you build your habit history'
    },
    {
      id: 'streak',
      title: 'Current Streak',
      value: `${engagement.currentStreak}`,
      detail: engagement.longestStreak > 0
        ? `Best streak: ${engagement.longestStreak} days`
        : 'Daily check-ins will build your streak over time'
    }
  ];
};

export class YearInReviewService {
  static getNormalizedSessionHistory(library = []) {
    return StatsAggregationService.getNormalizedSessionHistory(library);
  }

  static getLifetimePersonaEvolution(library = []) {
    try {
      const sessions = StatsAggregationService.getNormalizedSessionHistory(library);
      return buildPersonaEvolution(sessions);
    } catch (error) {
      console.warn('YearInReviewService.getLifetimePersonaEvolution failed', error);
      return null;
    }
  }

  static getAvailableYears(library = []) {
    try {
      const years = Array.from(new Set(
        this.getNormalizedSessionHistory(library).map((session) => session.timestamp.getFullYear())
      )).sort((left, right) => right - left);

      return years.length > 0 ? years : [new Date().getFullYear()];
    } catch (e) {
      console.error('YearInReviewService: Failed to get available years', e);
      return [new Date().getFullYear()];
    }
  }

  static getYearSnapshot(library = [], selectedYear = new Date().getFullYear()) {
    try {
      const safeYear = Number(selectedYear) || new Date().getFullYear();
      const allSessions = StatsAggregationService.getNormalizedSessionHistory(library);
      const sessions = allSessions.filter((session) => session.timestamp.getFullYear() === safeYear);
      const summary = {
        playtimeMinutes: sessions.reduce((sum, session) => sum + session.playtimeMinutes, 0),
        sessions: sessions.length,
        uniqueGames: new Set(sessions.map((session) => String(session.gameId || session.gameName))).size,
        activeDays: new Set(sessions.map((session) => getDateKey(session.timestamp))).size,
        avgSessionMinutes: sessions.length > 0 ? Math.round(sessions.reduce((sum, session) => sum + session.playtimeMinutes, 0) / sessions.length) : 0,
        longestSessionMinutes: sessions.reduce((max, session) => Math.max(max, session.playtimeMinutes), 0),
        playtimeHours: Number((sessions.reduce((sum, session) => sum + session.playtimeMinutes, 0) / 60).toFixed(1))
      };
      const distributions = buildDistributionSummary(sessions);
      const topGames = buildTopGames(sessions, 6);
      const basePersona = buildPersonaFromSessions(sessions);
      const gamingPersona = getPersonaVoice();
      const persona = {
        ...basePersona,
        identityLabel: gamingPersona.label || basePersona.identityLabel,
        identityDescription: gamingPersona.roast || basePersona.identityDescription
      };
      const habits = buildHabitSummary(safeYear, sessions);
      const engagement = buildEngagementSummary();
      const monthly = buildMonthlyBreakdown(sessions);
      const evolution = buildPersonaEvolution(sessions);
      const seasonalStory = buildSeasonalStory(sessions, safeYear);
      const deepStats = buildDeepStats(sessions, topGames);
      const championJourney = buildChampionJourney(sessions, library, safeYear);

      let progression = null;
      try {
        const progSummary = ProgressionUnlockService.getRewardCatalogSummary();
        progression = {
          level: progSummary.level ?? 1,
          xp: progSummary.xp ?? 0,
          progressionGroups: Object.entries(progSummary.progressionGroups || {}).map(([key, group]) => ({
            key,
            label: key.charAt(0).toUpperCase() + key.slice(1),
            unlocked: group.unlocked ?? 0,
            total: group.total ?? 0
          }))
        };
      } catch {
        progression = { level: 1, xp: 0, progressionGroups: [] };
      }

      return {
        year: safeYear,
        generatedAt: Date.now(),
        hasData: sessions.length > 0,
        summary,
        distributions,
        topGames,
        persona,
        habits,
        engagement,
        monthly,
        evolution,
        seasonalStory,
        deepStats,
        championJourney,
        progression,
        summaryCards: buildSummaryCards({
          year: safeYear,
          summary,
          topGames,
          persona,
          distributions,
          habits,
          engagement,
          deepStats
        })
      };
    } catch (e) {
      console.error('YearInReviewService: Failed to generate year snapshot', e);
      const fallbackYear = Number(selectedYear) || new Date().getFullYear();
      const fallbackSummary = {
        playtimeMinutes: 0,
        sessions: 0,
        uniqueGames: 0,
        activeDays: 0,
        avgSessionMinutes: 0,
        longestSessionMinutes: 0,
        playtimeHours: 0
      };
      const fallbackDistributions = {
        platforms: {},
        moods: {},
        genres: {},
        topPlatforms: [],
        topMoods: [],
        topGenres: []
      };
      const fallbackPersona = {
        identityLabel: 'Uncharted Pilot',
        identityDescription: 'Complete a few sessions to generate a local play identity for this year.',
        dominantMood: null,
        dominantGenre: null,
        preferredSessionBucket: null,
        preferredSessionLabel: 'Flexible Sessions',
        peakPlayWindow: null,
        avgSessionMinutes: 0,
        moodMix: [],
        genreMix: []
      };
      const fallbackHabits = {
        daysActive: 0,
        avgSessionMinutes: 0,
        sessionsCount: 0
      };
      const fallbackEngagement = {
        currentStreak: 0,
        longestStreak: 0,
        totalLogins: 0,
        lastLoginDate: null
      };
      const fallbackMonthly = {
        playtimeMinutes: Object.fromEntries(MONTH_LABELS.map((label) => [label, 0])),
        playtimeHours: Object.fromEntries(MONTH_LABELS.map((label) => [label, 0])),
        sessionCounts: Object.fromEntries(MONTH_LABELS.map((label) => [label, 0]))
      };

      let fallbackProgression = { level: 1, xp: 0, progressionGroups: [] };
      try {
        const progSummary = ProgressionUnlockService.getRewardCatalogSummary();
        fallbackProgression = {
          level: progSummary.level ?? 1,
          xp: progSummary.xp ?? 0,
          progressionGroups: Object.entries(progSummary.progressionGroups || {}).map(([key, group]) => ({
            key,
            label: key.charAt(0).toUpperCase() + key.slice(1),
            unlocked: group.unlocked ?? 0,
            total: group.total ?? 0
          }))
        };
      } catch {
        // keep defaults
      }

      return {
        year: fallbackYear,
        generatedAt: Date.now(),
        hasData: false,
        summary: fallbackSummary,
        distributions: fallbackDistributions,
        topGames: [],
        persona: fallbackPersona,
        habits: fallbackHabits,
        engagement: fallbackEngagement,
        monthly: fallbackMonthly,
        evolution: null,
        seasonalStory: null,
        deepStats: buildDeepStats([], []),
        championJourney: { yearChampion: null, monthlyChampions: [] },
        progression: fallbackProgression,
        summaryCards: buildSummaryCards({
          year: fallbackYear,
          summary: fallbackSummary,
          topGames: [],
          persona: fallbackPersona,
          distributions: fallbackDistributions,
          habits: fallbackHabits,
          engagement: fallbackEngagement,
          deepStats: buildDeepStats([], [])
        })
      };
    }
  }

  static buildExportPayload(library = [], selectedYear = new Date().getFullYear()) {
    try {
      const snapshot = this.getYearSnapshot(library, selectedYear);
      return {
        exportDate: new Date().toISOString(),
        type: 'gamepilot-year-in-review',
        year: snapshot.year,
        summary: snapshot.summary,
        persona: snapshot.persona,
        evolution: snapshot.evolution,
        habits: snapshot.habits,
        engagement: snapshot.engagement,
        monthly: snapshot.monthly,
        seasonalStory: snapshot.seasonalStory,
        deepStats: snapshot.deepStats,
        championJourney: snapshot.championJourney,
        topGames: snapshot.topGames,
        distributions: {
          topPlatforms: snapshot.distributions.topPlatforms,
          topMoods: snapshot.distributions.topMoods,
          topGenres: snapshot.distributions.topGenres
        },
        summaryCards: snapshot.summaryCards
      };
    } catch (e) {
      console.error('YearInReviewService: Failed to build export payload', e);
      return null;
    }
  }
}
