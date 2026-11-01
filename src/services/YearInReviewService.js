import { StatsAggregationService } from './StatsAggregationService';
import { UserBehaviorProfile } from './UserBehaviorProfile';
import { getDateKey } from './DateKeyService';
import GamingPersonaService from './GamingPersonaService';
import PeriodChampionService, { findLibraryGame } from './PeriodChampionService';
import { getGameArtworkPlaceholder, resolveGameArtworkBundle } from './GameArtworkService';
import SessionRepository from './SessionRepository';
import CurrentEraService from './CurrentEraService';

const MONTH_LABELS = Object.freeze([
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]);
const FULL_MONTH_LABELS = Object.freeze([
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]);
const SESSION_BUCKET_LABELS = Object.freeze({
  '0-30': 'Sprint Sessions',
  '30-60': 'Focused Runs',
  '60-120': 'Extended Flights',
  '120+': 'Marathon Missions',
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
  return Object.entries(safeCounts).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
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
    voice: primary?.voice || null,
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
    sessionCounts,
  };
};

// --- Eras of the year -------------------------------------------------------
// Buckets the year's real sessions by calendar month, finds each month's
// dominant genre/mood/top game, and merges consecutive months that share the
// same signature into "era" stretches. Imported Steam/GOG totals are undated
// and never appear here — only tracked sessions produce eras.

const weightedDominant = (counts = {}) => sortCounts(counts)[0]?.[0] || null;

const buildMonthSignature = (monthSessions = []) => {
  const genreMinutes = {};
  const moodMinutes = {};
  const gameMinutes = {};
  const gameNames = {};

  monthSessions.forEach((session) => {
    const minutes = Number(session?.playtimeMinutes) || 0;
    const weight = minutes > 0 ? minutes : 1; // zero-minute entries still count as a session signal
    incrementCounter(genreMinutes, session?.primaryGenre, weight);
    incrementCounter(moodMinutes, session?.mood, weight);
    const gameKey = String(session?.gameId || session?.gameName || '').trim();
    if (gameKey) {
      incrementCounter(gameMinutes, gameKey, weight);
      gameNames[gameKey] = session.gameName || gameKey;
    }
  });

  const topGameKey = weightedDominant(gameMinutes);
  return {
    dominantGenre: weightedDominant(genreMinutes),
    dominantMood: weightedDominant(moodMinutes),
    topGame: topGameKey ? gameNames[topGameKey] || topGameKey : null,
    topGameKey,
  };
};

const monthRangeLabel = (startMonth, endMonth) =>
  startMonth === endMonth ? MONTH_LABELS[startMonth] : `${MONTH_LABELS[startMonth]}–${MONTH_LABELS[endMonth]}`;

const nameEraStretch = (signature, topGameShare) => {
  if (signature?.topGame && topGameShare >= 0.6) {
    return { name: `The ${signature.topGame} Era`, gameDominated: true };
  }
  if (signature?.dominantGenre && signature.dominantGenre !== 'Unknown') {
    return { name: `The ${signature.dominantGenre} Era`, gameDominated: false };
  }
  if (signature?.topGame) {
    return { name: `The ${signature.topGame} Era`, gameDominated: true };
  }
  return { name: 'The Mixed Era', gameDominated: false };
};

const accumulateGameMinutes = (bucket, target) => {
  bucket.forEach((session) => {
    const key = String(session?.gameId || session?.gameName || '').trim();
    if (key) target[key] = (target[key] || 0) + (Number(session?.playtimeMinutes) || 0);
  });
};

const buildEraStretches = (sessions = []) => {
  const monthBuckets = new Map();
  (Array.isArray(sessions) ? sessions : []).forEach((session) => {
    if (!(session?.timestamp instanceof Date) || Number.isNaN(session.timestamp.getTime())) return;
    const month = session.timestamp.getMonth();
    if (!monthBuckets.has(month)) monthBuckets.set(month, []);
    monthBuckets.get(month).push(session);
  });

  const stretches = [];
  let current = null;

  for (let month = 0; month < MONTH_LABELS.length; month += 1) {
    const bucket = monthBuckets.get(month);
    if (!bucket || bucket.length === 0) {
      current = null; // a quiet month breaks the stretch
      continue;
    }

    const signature = buildMonthSignature(bucket);
    const signatureKey = `${signature.dominantGenre || 'none'}|${signature.dominantMood || 'none'}|${signature.topGameKey || 'none'}`;
    const monthMinutes = bucket.reduce((sum, s) => sum + (Number(s.playtimeMinutes) || 0), 0);

    if (current && current.signatureKey === signatureKey) {
      current.endMonth = month;
      current.playtimeMinutes += monthMinutes;
      current.sessionCount += bucket.length;
      accumulateGameMinutes(bucket, current.gameMinutes);
      continue;
    }

    const gameMinutes = {};
    accumulateGameMinutes(bucket, gameMinutes);
    current = {
      signatureKey,
      startMonth: month,
      endMonth: month,
      dominantGenre: signature.dominantGenre,
      dominantMood: signature.dominantMood,
      topGame: signature.topGame,
      topGameKey: signature.topGameKey,
      playtimeMinutes: monthMinutes,
      sessionCount: bucket.length,
      gameMinutes,
    };
    stretches.push(current);
  }

  return stretches.map((stretch) => {
    const topGameMinutes = stretch.topGame ? stretch.gameMinutes[stretch.topGameKey ?? stretch.topGame] || 0 : 0;
    const named = nameEraStretch(stretch, stretch.playtimeMinutes > 0 ? topGameMinutes / stretch.playtimeMinutes : 0);
    return {
      name: named.name,
      gameDominated: named.gameDominated,
      startMonth: stretch.startMonth,
      endMonth: stretch.endMonth,
      monthLabel: monthRangeLabel(stretch.startMonth, stretch.endMonth),
      monthCount: stretch.endMonth - stretch.startMonth + 1,
      dominantGenre: stretch.dominantGenre,
      dominantMood: stretch.dominantMood,
      topGame: stretch.topGame,
      playtimeMinutes: stretch.playtimeMinutes,
      playtimeHours: Number((stretch.playtimeMinutes / 60).toFixed(1)),
      sessionCount: stretch.sessionCount,
    };
  });
};

// Era-change markers recorded by CurrentEraService (currentEraHistory) whose
// `since` falls inside the selected year. These are real signature flips the
// app observed live — complementary to the month-bucketed stretches above.
const buildRecordedEras = (year) => {
  try {
    const era = CurrentEraService.getCurrentEra();
    const history = Array.isArray(era?.history) ? era.history : [];
    const latest = history[history.length - 1];
    return history
      .filter((entry) => {
        const since = new Date(entry?.since || 0);
        return !Number.isNaN(since.getTime()) && since.getFullYear() === year;
      })
      .map((entry) => ({
        name: entry.name || 'Unnamed Era',
        topGame: entry.topGame || null,
        genre: entry.genre || null,
        since: entry.since,
        dateLabel: formatReviewDate(new Date(entry.since)),
        isCurrent: entry === latest,
      }));
  } catch (error) {
    console.warn('YearInReviewService.buildRecordedEras failed', error);
    return [];
  }
};

// One-line session journal notes left through the post-session feedback modal.
// Read from the raw settled history (normalized sessions drop the `note`
// field); entries keep their real end-time and are never fabricated.
const buildJournalNotes = (year) => {
  try {
    return SessionRepository.getSessionHistory()
      .map((entry) => {
        const raw = entry?.endTime || entry?.timestamp || entry?.startTime || entry?.date || null;
        const timestamp = raw ? new Date(raw) : null;
        if (!timestamp || Number.isNaN(timestamp.getTime()) || timestamp.getFullYear() !== year) return null;
        const note = typeof entry?.note === 'string' ? entry.note.trim() : '';
        if (!note) return null;
        return {
          gameName: entry?.gameName || 'Unknown Game',
          note,
          timestamp,
          dateLabel: formatReviewDate(timestamp),
          playtimeMinutes: Math.max(0, Math.round(Number(entry?.playtimeMinutes ?? entry?.duration ?? 0) || 0)),
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.timestamp - b.timestamp);
  } catch (error) {
    console.warn('YearInReviewService.buildJournalNotes failed', error);
    return [];
  }
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
        coverUrl: session.coverUrl || '',
        totalPlaytime: 0,
        sessions: 0,
        lastPlayed: session.timestamp,
        longestSessionMinutes: 0,
        avgSessionMinutes: 0,
      });
    }

    const entry = gameMap.get(key);
    entry.totalPlaytime += session.playtimeMinutes;
    entry.sessions += 1;
    entry.longestSessionMinutes = Math.max(entry.longestSessionMinutes, session.playtimeMinutes);
    if (!entry.coverUrl && session.coverUrl) {
      entry.coverUrl = session.coverUrl;
    }
    if (!entry.lastPlayed || session.timestamp > entry.lastPlayed) {
      entry.lastPlayed = session.timestamp;
    }
  });

  return Array.from(gameMap.values())
    .map((entry) => ({
      ...entry,
      avgSessionMinutes: entry.sessions > 0 ? Math.round(entry.totalPlaytime / entry.sessions) : 0,
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
      sessions: 0,
    };
    current.playtimeMinutes += session.playtimeMinutes;
    current.sessions += 1;
    dayMap.set(dateKey, current);
  });

  const busiestDay =
    Array.from(dayMap.values()).sort(
      (left, right) => right.playtimeMinutes - left.playtimeMinutes || right.sessions - left.sessions
    )[0] || null;
  const topBySessions =
    [...topGames].sort(
      (left, right) => right.sessions - left.sessions || right.totalPlaytime - left.totalPlaytime
    )[0] || null;

  return {
    longestSession: longestSession
      ? {
          gameName: longestSession.gameName,
          platform: longestSession.platform,
          playtimeMinutes: longestSession.playtimeMinutes,
          dateLabel: formatReviewDate(longestSession.timestamp),
          timestamp: longestSession.timestamp,
        }
      : null,
    busiestDay,
    topBySessions,
    weekendSessions: weekendSessions.length,
    weekendPlaytimeMinutes: weekendSessions.reduce((sum, session) => sum + session.playtimeMinutes, 0),
    lateNightSessions: lateNightSessions.length,
    lateNightPlaytimeMinutes: lateNightSessions.reduce((sum, session) => sum + session.playtimeMinutes, 0),
    gamesWithMultipleSessions: topGames.filter((game) => game.sessions > 1).length,
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
      description: 'Your local profile is still taking shape across moods, genres, and session rhythm.',
    };
  }

  const styleDescriptor = getSessionStyleDescriptor(preferredSessionBucket);
  // Keep the label clean: never combine mood + genre with a separator, and never use 'leaning'.
  const label = dominantGenre
    ? `${dominantGenre} ${styleDescriptor} player`
    : dominantMood
      ? `${dominantMood} Pilot`
      : `${styleDescriptor} player`;

  const descriptionParts = [];
  if (dominantMood) {
    descriptionParts.push(`${dominantMood} showed up as your strongest mood signal`);
  }
  if (dominantGenre) {
    descriptionParts.push(`${dominantGenre.toLowerCase()} games shaped the genre side of your profile`);
  }
  if (preferredSessionBucket) {
    descriptionParts.push(
      `${SESSION_BUCKET_LABELS[preferredSessionBucket] || 'Flexible Sessions'} gave your year a ${styleDescriptor} rhythm`
    );
  }
  if (peakPlayWindow) {
    descriptionParts.push(`${peakPlayWindow.toLowerCase()} was your most active play window`);
  }

  return {
    label,
    description: `${descriptionParts.join('. ')}.`,
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
      genreMix: [],
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
        completionRate: 0,
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
    peakPlayWindow,
  });

  return {
    identityLabel: personaIdentity?.label || (dominantMood ? `${dominantMood} Pilot` : 'Adaptive Pilot'),
    identityDescription:
      personaIdentity?.description || 'Built a unique local play profile through completed sessions.',
    dominantMood,
    dominantGenre,
    preferredSessionBucket,
    preferredSessionLabel: SESSION_BUCKET_LABELS[preferredSessionBucket] || 'Flexible Sessions',
    peakPlayWindow,
    avgSessionMinutes,
    moodMix: buildRankedList(moodCounts, 3),
    genreMix: buildRankedList(genreCounts, 3),
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
  } else if (
    opening.preferredSessionBucket &&
    closing.preferredSessionBucket &&
    opening.preferredSessionBucket !== closing.preferredSessionBucket
  ) {
    summary = `Your session rhythm evolved from ${opening.preferredSessionLabel.toLowerCase()} to ${closing.preferredSessionLabel.toLowerCase()}.`;
  }

  return {
    opening,
    closing,
    summary,
  };
};

const SEASON_MONTHS = Object.freeze({
  Winter: [11, 0, 1], // Dec, Jan, Feb
  Spring: [2, 3, 4], // Mar, Apr, May
  Summer: [5, 6, 7], // Jun, Jul, Aug
  Autumn: [8, 9, 10], // Sep, Oct, Nov
});

const SEASON_ORDER = Object.freeze(['Winter', 'Spring', 'Summer', 'Autumn']);

const getSeasonForMonth = (monthIndex) => {
  for (const [season, months] of Object.entries(SEASON_MONTHS)) {
    if (months.includes(monthIndex)) return season;
  }
  return null;
};

// --- Data-driven story ------------------------------------------------------
// The story tab is generated from facts, not templates: each builder below
// returns one short paragraph (or null when the underlying fact doesn't
// exist), so a sparse year simply produces fewer sentences — never filler.

const formatStoryDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  // Deterministic day-first ("14 Jul") — toLocaleDateString ordering varies
  // by runtime locale and would make the copy (and tests) unstable.
  return `${date.getDate()} ${MONTH_LABELS[date.getMonth()]}`;
};

const formatStoryDuration = (minutes = 0) => {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  const hours = Math.floor(total / 60);
  const remainder = total % 60;
  if (hours > 0 && remainder > 0) return `${hours}h ${remainder}m`;
  if (hours > 0) return `${hours}h`;
  return `${remainder}m`;
};

const joinList = (items = []) => {
  const list = items.filter(Boolean);
  if (list.length <= 1) return list.join('');
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
};

const buildStoryOpener = (sessions = []) => {
  const first = [...sessions].sort((a, b) => a.timestamp - b.timestamp)[0];
  if (!first?.timestamp) return null;
  let text = `Your year started on ${formatStoryDate(first.timestamp)} with ${first.gameName || 'an untracked game'}.`;
  const firstMonth = first.timestamp.getMonth();
  if (firstMonth > 1) {
    text +=
      firstMonth >= 5
        ? ` GamePilot only started tracking in ${FULL_MONTH_LABELS[firstMonth]}, so this is the story of your second half.`
        : ` GamePilot only started tracking in ${FULL_MONTH_LABELS[firstMonth]}, so this is the story of your year from ${MONTH_LABELS[firstMonth]} onward.`;
  }
  return text;
};

const buildStoryDominantGame = (sessions = [], topGames = []) => {
  const totalMinutes = sessions.reduce((sum, s) => sum + (Number(s.playtimeMinutes) || 0), 0);
  const top = topGames[0] || null;
  if (!top || totalMinutes <= 0) return null;
  const share = top.totalPlaytime / totalMinutes;
  const percent = Math.round(share * 100);
  if (share >= 0.5) {
    return `${top.name} took ${percent}% of your year — ${Math.round(top.totalPlaytime / 60)}h over ${top.sessions} launches.`;
  }
  if (share >= 0.3) {
    const others = topGames
      .slice(1, 3)
      .map((game) => game.name)
      .filter(Boolean);
    return others.length > 0
      ? `${top.name} was your main game at ${percent}% of playtime, but it shared the year with ${joinList(others)}.`
      : `${top.name} was your main game at ${percent}% of playtime.`;
  }
  return null;
};

const buildStoryEraParagraphs = (stretches = []) => {
  const paragraphs = [];
  stretches.forEach((era, index) => {
    if (index === 0) {
      paragraphs.push({ id: 'era-0', text: `${era.monthLabel} was ${era.name}.`, gameName: era.topGame });
      return;
    }
    const previous = stretches[index - 1];
    const signatureChanged =
      era.dominantGenre !== previous.dominantGenre ||
      era.dominantMood !== previous.dominantMood ||
      era.topGame !== previous.topGame;
    if (!signatureChanged) {
      // Same signature split by a quiet month — a resume, not a pivot.
      paragraphs.push({
        id: `era-${index}`,
        text: `${era.name} picked back up in ${era.monthLabel} after a quiet gap.`,
        gameName: era.topGame,
      });
      return;
    }
    let transition = null;
    if (era.dominantGenre !== previous.dominantGenre && previous.dominantGenre && era.dominantGenre) {
      transition = `the ${previous.dominantGenre} run gave way to ${era.dominantGenre}`;
    } else if (era.dominantMood !== previous.dominantMood && previous.dominantMood && era.dominantMood) {
      transition = `the ${previous.dominantMood} mood gave way to ${era.dominantMood}`;
    } else if (era.topGame !== previous.topGame && previous.topGame && era.topGame) {
      transition = `${previous.topGame} handed over to ${era.topGame}`;
    }
    paragraphs.push({
      id: `era-${index}`,
      text: transition
        ? `Then ${era.monthLabel} brought ${era.name} — ${transition}.`
        : `Then in ${era.monthLabel}, ${era.name} began.`,
      gameName: era.topGame,
    });
  });
  return paragraphs;
};

const buildStoryPeak = (playtimeMinutes = {}) => {
  const active = MONTH_LABELS.map((label) => [label, Number(playtimeMinutes[label]) || 0]).filter(
    ([, minutes]) => minutes > 0
  );
  if (active.length === 0) return null;
  const peak = active.reduce((best, entry) => (entry[1] > best[1] ? entry : best), active[0]);
  const peakHours = Math.round(peak[1] / 60);
  if (active.length === 1) {
    return `${peak[0]} held all your tracked play — ${peakHours}h in a single month.`;
  }
  const average = active.reduce((sum, [, minutes]) => sum + minutes, 0) / active.length;
  const ratio = average > 0 ? peak[1] / average : 0;
  if (ratio >= 1.9) {
    return `${peak[0]} was the peak — ${peakHours}h, almost double your usual month.`;
  }
  if (ratio >= 1.4) {
    return `${peak[0]} was the peak — ${peakHours}h, well above your usual ${Math.round(average / 60)}h month.`;
  }
  return `${peak[0]} was your busiest month — ${peakHours}h.`;
};

const buildStoryRhythm = (sessions = [], deepStats = {}) => {
  const total = sessions.length;
  if (total === 0) return null;
  const parts = [];
  if ((deepStats.lateNightSessions || 0) / total >= 0.35) {
    parts.push(`${deepStats.lateNightSessions} of your ${total} sessions ran after 10pm — you're a late-night player.`);
  }
  if ((deepStats.weekendSessions || 0) / total >= 0.35) {
    parts.push(`${deepStats.weekendSessions} of your ${total} sessions landed on the weekend.`);
  }
  return parts.length > 0 ? parts.join(' ') : null;
};

const buildStoryLongestSitting = (deepStats = {}) => {
  const longest = deepStats.longestSession;
  if (!longest) return null;
  const date = longest.timestamp ? formatStoryDate(longest.timestamp) : longest.dateLabel;
  return `Your longest single sitting was ${formatStoryDuration(longest.playtimeMinutes)}${date ? ` on ${date}` : ''}${longest.gameName ? `, in ${longest.gameName}` : ''}.`;
};

const buildStoryNewcomers = (sessions = [], allSessions = [], year) => {
  const gameKey = (session) => String(session?.gameId || session?.gameName || '').trim();
  const priorKeys = new Set(
    (Array.isArray(allSessions) ? allSessions : [])
      .filter((session) => session?.timestamp instanceof Date && session.timestamp.getFullYear() < year)
      .map(gameKey)
      .filter(Boolean)
  );
  const yearGames = new Map();
  sessions.forEach((session) => {
    const key = gameKey(session);
    if (!key) return;
    const entry = yearGames.get(key) || { name: session.gameName || key, sessions: 0 };
    entry.sessions += 1;
    yearGames.set(key, entry);
  });
  const newcomers = Array.from(yearGames.entries())
    .filter(([key]) => !priorKeys.has(key))
    .map(([, game]) => game)
    .sort((a, b) => b.sessions - a.sessions || a.name.localeCompare(b.name));
  const wonders = Array.from(yearGames.values()).filter((game) => game.sessions === 1);
  if (newcomers.length === 0 && wonders.length === 0) return null;

  const parts = [];
  const namedGames = [];
  if (newcomers.length > 0) {
    const stuck = newcomers.find((game) => game.sessions > 1) || null;
    const fizzled = newcomers.find((game) => game.sessions === 1) || null;
    if (stuck) namedGames.push(stuck.name);
    if (fizzled) namedGames.push(fizzled.name);
    let sentence = `You picked up ${newcomers.length} new game${newcomers.length === 1 ? '' : 's'} this year`;
    if (stuck && fizzled) {
      sentence += `; ${stuck.name} stuck (${stuck.sessions} sessions), ${fizzled.name} didn't (1).`;
    } else if (stuck) {
      sentence += `; ${stuck.name} stuck (${stuck.sessions} sessions).`;
    } else if (newcomers.length === 1) {
      sentence += ', though it only got one session.';
    } else {
      sentence += ', but none made it past a single session.';
    }
    parts.push(sentence);
    const returningWonders = wonders.length - newcomers.filter((game) => game.sessions === 1).length;
    if (returningWonders > 0) {
      parts.push(
        `${returningWonders} game${returningWonders === 1 ? '' : 's'} you'd played before also got one session and never came back.`
      );
    }
  } else {
    parts.push(`${wonders.length} game${wonders.length === 1 ? '' : 's'} got one session and never came back.`);
  }
  return { text: parts.join(' '), gameNames: namedGames };
};

const buildStorySeasons = (sessions = []) => {
  const uniqueGames = new Set(sessions.map((s) => String(s.gameId || s.gameName))).size;
  // A single-game year would make every season line repeat the same name —
  // the era stretches already tell that story better.
  if (uniqueGames <= 1) return null;

  const seasonGroups = {};
  sessions.forEach((session) => {
    const season = getSeasonForMonth(session.timestamp.getMonth());
    if (!season) return;
    if (!seasonGroups[season]) seasonGroups[season] = [];
    seasonGroups[season].push(session);
  });

  const sentences = [];
  const quietSeasons = [];
  SEASON_ORDER.forEach((season) => {
    const seasonSessions = seasonGroups[season] || [];
    if (seasonSessions.length === 0) {
      quietSeasons.push(season.toLowerCase());
      return;
    }
    const minutes = seasonSessions.reduce((sum, s) => sum + (Number(s.playtimeMinutes) || 0), 0);
    const gameMinutes = {};
    const gameNames = {};
    seasonSessions.forEach((s) => {
      const key = String(s.gameId || s.gameName || '').trim();
      if (!key) return;
      gameMinutes[key] = (gameMinutes[key] || 0) + (Number(s.playtimeMinutes) || 0);
      gameNames[key] = s.gameName || key;
    });
    const [topKey, topMinutes] = sortCounts(gameMinutes)[0] || [null, 0];
    const share = minutes > 0 ? topMinutes / minutes : 0;
    const tail =
      share >= 0.75 && topKey
        ? `, nearly all ${gameNames[topKey]}`
        : share >= 0.4 && topKey
          ? `, mostly ${gameNames[topKey]}`
          : '';
    sentences.push(`${season}: ${Math.round(minutes / 60)}h${tail}.`);
  });

  if (sentences.length === 0) return null;
  if (quietSeasons.length > 0) {
    const quiet = joinList(quietSeasons);
    sentences.push(`${quiet.charAt(0).toUpperCase()}${quiet.slice(1)} had no tracked sessions.`);
  }
  return sentences.join(' ');
};

const buildStoryCloser = (persona = {}) => (persona?.identityLabel ? `Verdict: ${persona.identityLabel}.` : null);

const buildStory = ({ sessions, allSessions, year, topGames, deepStats, monthly, eras, persona, library }) => {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return { paragraphs: [] };
  }
  const paragraphs = [];

  // Resolve covers for paragraphs that name specific games. Lookup order:
  // library artwork → a Steam-appid stub built from the session record (covers
  // games never added to the scanned library) → the session's own coverUrl →
  // a name-tile placeholder, so every named game still gets a visual.
  const sessionGameIndex = new Map();
  sessions.forEach((session) => {
    const key = String(session?.gameName || '')
      .toLowerCase()
      .trim();
    if (!key) return;
    const entry = sessionGameIndex.get(key) || {};
    if (!entry.coverUrl && session.coverUrl) entry.coverUrl = session.coverUrl;
    if (!entry.appid) {
      const id = session.appid ?? session.appId ?? session.gameId;
      if (id != null && /^\d+$/.test(String(id))) entry.appid = String(id);
    }
    if (!entry.platform && session.platform) entry.platform = session.platform;
    sessionGameIndex.set(key, entry);
  });
  const coverFor = (gameName) => {
    if (!gameName) return null;
    const stub = sessionGameIndex.get(String(gameName).toLowerCase().trim());
    const libGame = findLibraryGame(library, gameName);
    const artGame = libGame || (stub?.appid ? { appid: stub.appid, name: gameName, platform: stub.platform } : null);
    const bundle = artGame
      ? resolveGameArtworkBundle(artGame, { surface: 'portrait', fallbackSurface: 'library_card' })
      : null;
    return {
      portrait: bundle?.artwork || stub?.coverUrl || null,
      portraitFallback: bundle?.fallbackSrc || null,
      placeholder:
        bundle?.placeholder ||
        getGameArtworkPlaceholder({ game: { name: gameName, platform: stub?.platform }, surface: 'portrait' }),
      name: gameName,
    };
  };
  const push = (id, text, gameNames = []) => {
    if (!text) return;
    const names = (Array.isArray(gameNames) ? gameNames : [gameNames]).filter(Boolean);
    const covers = names.map(coverFor).filter(Boolean).slice(0, 3);
    paragraphs.push(covers.length > 0 ? { id, text, covers } : { id, text });
  };

  const firstSession = [...sessions].sort((a, b) => a.timestamp - b.timestamp)[0];
  push('opener', buildStoryOpener(sessions), [firstSession?.gameName]);
  push('dominant', buildStoryDominantGame(sessions, topGames), [topGames[0]?.name]);
  buildStoryEraParagraphs(eras?.stretches || []).forEach((paragraph) =>
    push(paragraph.id, paragraph.text, [paragraph.gameName])
  );
  push('peak', buildStoryPeak(monthly?.playtimeMinutes));
  push('rhythm', buildStoryRhythm(sessions, deepStats));
  push('longest', buildStoryLongestSitting(deepStats), [deepStats?.longestSession?.gameName]);
  const newcomersResult = buildStoryNewcomers(sessions, allSessions, year);
  push('newcomers', newcomersResult?.text ?? newcomersResult, newcomersResult?.gameNames);
  push('seasons', buildStorySeasons(sessions));
  push('closer', buildStoryCloser(persona));

  return { paragraphs };
};

const buildHabitSummary = (selectedYear, sessions = []) => {
  const yearSessions = sessions.filter((s) => new Date(s.timestamp || 0).getFullYear() === selectedYear);
  const daysActive = new Set(yearSessions.map((s) => getDateKey(s.timestamp))).size;
  const avgSessionMinutes =
    yearSessions.length > 0
      ? Math.round(yearSessions.reduce((sum, s) => sum + (s.playtimeMinutes || 0), 0) / yearSessions.length)
      : 0;

  return {
    daysActive,
    avgSessionMinutes,
    sessionsCount: yearSessions.length,
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
    topGenres: buildRankedList(genres, 4),
  };
};

// Fixed 8-card glance set — two clean rows of four on the Overview tab.
const buildSummaryCards = ({ year, summary, topGames, distributions, habits, deepStats }) => {
  const topGame = topGames[0] || null;
  const topPlatform = distributions.topPlatforms[0] || null;
  const topMood = distributions.topMoods[0] || null;
  const topGenre = distributions.topGenres[0] || null;
  const longestSession = deepStats?.longestSession || null;
  const busiestDay = deepStats?.busiestDay || null;

  return [
    {
      id: 'headline',
      title: `${year} at a Glance`,
      value: `${summary.playtimeHours}h`,
      detail: `${summary.sessions} sessions across ${summary.uniqueGames} games`,
    },
    {
      id: 'top-game',
      title: 'Most Played',
      value: topGame?.name || 'No sessions yet',
      detail: topGame
        ? `${Math.round(topGame.totalPlaytime / 60)}h · ${topGame.sessions} launch${topGame.sessions !== 1 ? 'es' : ''} this year`
        : 'Launch and finish sessions to populate this card',
    },
    {
      id: 'longest-session',
      title: 'Longest Session',
      value: longestSession?.gameName || 'No marathon yet',
      detail: longestSession
        ? `${formatStoryDuration(longestSession.playtimeMinutes)}${longestSession.dateLabel ? ` · ${longestSession.dateLabel}` : ''}`
        : 'Your biggest single sitting will appear here',
    },
    {
      id: 'habits',
      title: 'Days Active',
      value: `${habits.daysActive}`,
      detail:
        habits.daysActive > 0
          ? `${habits.sessionsCount} sessions · ~${habits.avgSessionMinutes} min avg`
          : 'Play sessions will appear here as you build your habit history',
    },
    {
      id: 'busiest-day',
      title: 'Busiest Day',
      value: busiestDay?.dateLabel || '—',
      detail: busiestDay
        ? `${formatStoryDuration(busiestDay.playtimeMinutes)} across ${busiestDay.sessions} session${busiestDay.sessions === 1 ? '' : 's'}`
        : 'Your most active day will appear here',
    },
    {
      id: 'mood',
      title: 'Mood of the Year',
      value: topMood?.label || '—',
      detail: topMood ? `${topMood.count} tracked sessions` : 'No mood trend yet',
    },
    {
      id: 'top-genre',
      title: 'Top Genre',
      value: topGenre?.label || '—',
      detail: topGenre ? `${topGenre.count} tracked sessions` : 'No genre trend yet',
    },
    {
      id: 'platform',
      title: 'Platform Home',
      value: topPlatform?.label || '—',
      detail: topPlatform ? `${topPlatform.count} sessions` : 'No platform trend yet',
    },
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
      const years = Array.from(
        new Set(this.getNormalizedSessionHistory(library).map((session) => session.timestamp.getFullYear()))
      ).sort((left, right) => right - left);

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
        avgSessionMinutes:
          sessions.length > 0
            ? Math.round(sessions.reduce((sum, session) => sum + session.playtimeMinutes, 0) / sessions.length)
            : 0,
        longestSessionMinutes: sessions.reduce((max, session) => Math.max(max, session.playtimeMinutes), 0),
        playtimeHours: Number((sessions.reduce((sum, session) => sum + session.playtimeMinutes, 0) / 60).toFixed(1)),
      };
      const distributions = buildDistributionSummary(sessions);
      const topGames = buildTopGames(sessions, 6);
      const basePersona = buildPersonaFromSessions(sessions);
      const gamingPersona = getPersonaVoice();
      const persona = {
        ...basePersona,
        identityLabel: gamingPersona.label || basePersona.identityLabel,
        identityDescription: basePersona.identityDescription,
        roast: gamingPersona.roast || null,
      };
      const habits = buildHabitSummary(safeYear, sessions);
      const monthly = buildMonthlyBreakdown(sessions);
      const evolution = buildPersonaEvolution(sessions);
      const deepStats = buildDeepStats(sessions, topGames);
      const championJourney = buildChampionJourney(sessions, library, safeYear);
      const eras = {
        stretches: buildEraStretches(sessions),
        recorded: buildRecordedEras(safeYear),
      };
      const journalNotes = buildJournalNotes(safeYear);
      const story = buildStory({
        sessions,
        allSessions,
        year: safeYear,
        topGames,
        deepStats,
        monthly,
        eras,
        persona,
        library,
      });

      return {
        year: safeYear,
        generatedAt: Date.now(),
        hasData: sessions.length > 0,
        summary,
        distributions,
        topGames,
        persona,
        habits,
        monthly,
        evolution,
        story,
        deepStats,
        championJourney,
        eras,
        journalNotes,
        summaryCards: buildSummaryCards({
          year: safeYear,
          summary,
          topGames,
          distributions,
          habits,
          deepStats,
        }),
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
        playtimeHours: 0,
      };
      const fallbackDistributions = {
        platforms: {},
        moods: {},
        genres: {},
        topPlatforms: [],
        topMoods: [],
        topGenres: [],
      };
      const fallbackPersona = {
        identityLabel: 'Uncharted Pilot',
        identityDescription: 'Complete a few sessions to generate a local play identity for this year.',
        roast: null,
        dominantMood: null,
        dominantGenre: null,
        preferredSessionBucket: null,
        preferredSessionLabel: 'Flexible Sessions',
        peakPlayWindow: null,
        avgSessionMinutes: 0,
        moodMix: [],
        genreMix: [],
      };
      const fallbackHabits = {
        daysActive: 0,
        avgSessionMinutes: 0,
        sessionsCount: 0,
      };
      const fallbackMonthly = {
        playtimeMinutes: Object.fromEntries(MONTH_LABELS.map((label) => [label, 0])),
        playtimeHours: Object.fromEntries(MONTH_LABELS.map((label) => [label, 0])),
        sessionCounts: Object.fromEntries(MONTH_LABELS.map((label) => [label, 0])),
      };

      return {
        year: fallbackYear,
        generatedAt: Date.now(),
        hasData: false,
        summary: fallbackSummary,
        distributions: fallbackDistributions,
        topGames: [],
        persona: fallbackPersona,
        habits: fallbackHabits,
        monthly: fallbackMonthly,
        evolution: null,
        story: { paragraphs: [] },
        deepStats: buildDeepStats([], []),
        championJourney: { yearChampion: null, monthlyChampions: [] },
        eras: { stretches: [], recorded: [] },
        journalNotes: [],
        summaryCards: buildSummaryCards({
          year: fallbackYear,
          summary: fallbackSummary,
          topGames: [],
          distributions: fallbackDistributions,
          habits: fallbackHabits,
          deepStats: buildDeepStats([], []),
        }),
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
        monthly: snapshot.monthly,
        story: snapshot.story,
        deepStats: snapshot.deepStats,
        championJourney: snapshot.championJourney,
        eras: snapshot.eras,
        journalNotes: snapshot.journalNotes,
        topGames: snapshot.topGames,
        distributions: {
          topPlatforms: snapshot.distributions.topPlatforms,
          topMoods: snapshot.distributions.topMoods,
          topGenres: snapshot.distributions.topGenres,
        },
        summaryCards: snapshot.summaryCards,
      };
    } catch (e) {
      console.error('YearInReviewService: Failed to build export payload', e);
      return null;
    }
  }
}
