import { AchievementTracker, AchievementStats } from '../AchievementSystem';
import { StatsAggregationService } from './StatsAggregationService';
import { ProgressionUnlockService } from './ProgressionUnlockService';
import { UserBehaviorProfile } from './UserBehaviorProfile';

const MONTH_LABELS = Object.freeze(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);
const SESSION_BUCKET_LABELS = Object.freeze({
  '0-30': 'Sprint Sessions',
  '30-60': 'Focused Runs',
  '60-120': 'Extended Flights',
  '120+': 'Marathon Missions'
});
const PROGRESSION_GROUP_LABELS = Object.freeze({
  themes: 'Themes',
  audio: 'Audio',
  cosmetics: 'Cosmetics',
  utility: 'Utility'
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
  const personaIdentity = topMoodEntries.length > 0 ? UserBehaviorProfile.buildPersonaIdentity(topMoodEntries) : null;

  return {
    identityLabel: personaIdentity?.label || (dominantMood ? `${dominantMood} Pilot` : 'Adaptive Pilot'),
    identityDescription: personaIdentity?.description || (dominantGenre
      ? `Spent the year leaning into ${dominantGenre.toLowerCase()} sessions.`
      : 'Built a unique local play profile through completed sessions.'),
    dominantMood,
    dominantGenre,
    preferredSessionBucket,
    preferredSessionLabel: SESSION_BUCKET_LABELS[preferredSessionBucket] || 'Flexible Sessions',
    peakPlayWindow: peakHour !== null ? UserBehaviorProfile.getTimeOfDay(Number(peakHour)) : null,
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

const buildAchievementSummary = (selectedYear) => {
  const history = AchievementTracker.getAchievementUnlockHistory()
    .filter((entry) => new Date(entry?.unlockedAt || 0).getFullYear() === selectedYear)
    .sort((left, right) => Number(right?.unlockedAt || 0) - Number(left?.unlockedAt || 0));
  const fallbackHighlights = AchievementTracker.getRecentlyUnlocked()
    .filter((entry) => new Date(entry?.unlockedAt || 0).getFullYear() === selectedYear)
    .sort((left, right) => Number(right?.unlockedAt || 0) - Number(left?.unlockedAt || 0));
  const completion = AchievementStats.getCompletionRate();

  return {
    trackedUnlocksThisYear: history.length,
    highlights: (history.length > 0 ? history : fallbackHighlights).slice(0, 8),
    totalUnlocked: AchievementTracker.getUnlockedAchievements().length,
    completionPercentage: Math.round(completion.completion),
    historyAvailable: history.length > 0
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

const buildSummaryCards = ({ year, summary, topGames, persona, distributions, achievements, progression }) => {
  const topGame = topGames[0] || null;
  const topPlatform = distributions.topPlatforms[0] || null;
  const topMood = distributions.topMoods[0] || null;
  const nextUnlock = progression.nextUnlock;

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
      detail: topGame ? `${Math.round(topGame.totalPlaytime / 60)}h · ${topGame.sessions} sessions` : 'Launch and finish sessions to populate this card'
    },
    {
      id: 'persona',
      title: 'Player Identity',
      value: persona.identityLabel,
      detail: persona.dominantMood ? `${persona.dominantMood} mood · ${persona.preferredSessionLabel}` : 'Build your local play profile'
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
      id: 'achievements',
      title: 'Achievement Highlights',
      value: `${achievements.trackedUnlocksThisYear}`,
      detail: achievements.historyAvailable ? 'Tracked unlocks captured this year' : 'Recent highlight tracking is just getting started'
    },
    {
      id: 'level',
      title: 'Progression Level',
      value: `Level ${progression.level}`,
      detail: `${progression.xp.toLocaleString()} XP total`
    },
    {
      id: 'next-unlock',
      title: 'Next Unlock',
      value: nextUnlock?.name || 'All caught up',
      detail: nextUnlock ? `${nextUnlock.remainingXP.toLocaleString()} XP to go` : 'No pending unlocks right now'
    }
  ];
};

export class YearInReviewService {
  static getNormalizedSessionHistory(library = []) {
    return StatsAggregationService.getNormalizedSessionHistory(library);
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
        activeDays: new Set(sessions.map((session) => session.timestamp.toISOString().split('T')[0])).size,
        avgSessionMinutes: sessions.length > 0 ? Math.round(sessions.reduce((sum, session) => sum + session.playtimeMinutes, 0) / sessions.length) : 0,
        longestSessionMinutes: sessions.reduce((max, session) => Math.max(max, session.playtimeMinutes), 0),
        playtimeHours: Number((sessions.reduce((sum, session) => sum + session.playtimeMinutes, 0) / 60).toFixed(1))
      };
      const distributions = buildDistributionSummary(sessions);
      const topGames = buildTopGames(sessions, 6);
      const persona = buildPersonaFromSessions(sessions);
      const achievements = buildAchievementSummary(safeYear);
      const progressionSnapshot = ProgressionUnlockService.getUnlockSnapshot();
      const progression = {
        xp: progressionSnapshot.xp,
        level: progressionSnapshot.level,
        nextUnlock: progressionSnapshot.summary?.nextUnlock || null,
        progressionGroups: Object.entries(progressionSnapshot.summary?.progressionGroups || {}).map(([key, value]) => ({
          key,
          label: PROGRESSION_GROUP_LABELS[key] || key,
          unlocked: Number(value?.unlocked || 0),
          total: Number(value?.total || 0)
        })),
        unlockedCounts: progressionSnapshot.summary?.unlockedCounts || {},
        totalCounts: progressionSnapshot.summary?.totalCounts || {}
      };
      const monthly = buildMonthlyBreakdown(sessions);
      const evolution = buildPersonaEvolution(sessions);

      return {
        year: safeYear,
        generatedAt: Date.now(),
        hasData: sessions.length > 0,
        summary,
        distributions,
        topGames,
        persona,
        achievements,
        progression,
        monthly,
        evolution,
        summaryCards: buildSummaryCards({
          year: safeYear,
          summary,
          topGames,
          persona,
          distributions,
          achievements,
          progression
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
      const fallbackAchievements = {
        trackedUnlocksThisYear: 0,
        highlights: [],
        totalUnlocked: 0,
        completionPercentage: 0,
        historyAvailable: false
      };
      const fallbackProgression = {
        xp: 0,
        level: 1,
        nextUnlock: null,
        progressionGroups: [],
        unlockedCounts: {},
        totalCounts: {}
      };
      const fallbackMonthly = {
        playtimeMinutes: Object.fromEntries(MONTH_LABELS.map((label) => [label, 0])),
        playtimeHours: Object.fromEntries(MONTH_LABELS.map((label) => [label, 0])),
        sessionCounts: Object.fromEntries(MONTH_LABELS.map((label) => [label, 0]))
      };

      return {
        year: fallbackYear,
        generatedAt: Date.now(),
        hasData: false,
        summary: fallbackSummary,
        distributions: fallbackDistributions,
        topGames: [],
        persona: fallbackPersona,
        achievements: fallbackAchievements,
        progression: fallbackProgression,
        monthly: fallbackMonthly,
        evolution: null,
        summaryCards: buildSummaryCards({
          year: fallbackYear,
          summary: fallbackSummary,
          topGames: [],
          persona: fallbackPersona,
          distributions: fallbackDistributions,
          achievements: fallbackAchievements,
          progression: fallbackProgression
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
        achievements: snapshot.achievements,
        progression: snapshot.progression,
        monthly: snapshot.monthly,
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
