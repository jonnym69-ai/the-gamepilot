import { AchievementTracker } from '../AchievementSystem';
import { RecommendationEngine } from './RecommendationEngine';
import { RollingAchievementsTracker } from './RollingAchievementsTracker';
import { StatsAggregationService } from './StatsAggregationService';
import { UserBehaviorProfile } from './UserBehaviorProfile';
import StorageService from './StorageService';
import { QuestRerollService } from './QuestRerollService';

const RETENTION_QUEST_PREFERENCES_KEY = 'retentionQuestPreferences';

const SESSION_BUCKET_TO_TIME_CONSTRAINT = Object.freeze({
  '0-30': 'quick',
  '30-60': 'medium',
  '60-120': 'long',
  '120+': 'weekend'
});

const METRIC_COPY = Object.freeze({
  playtime: {
    title: 'Playtime Quest',
    requirement: (targetText) => `${targetText} of playtime this week`
  },
  sessions: {
    title: 'Session Quest',
    requirement: (targetText) => `${targetText} completed sessions this week`
  },
  games: {
    title: 'Discovery Quest',
    requirement: (targetText) => `${targetText} different games this week`
  },
  genres: {
    title: 'Variety Quest',
    requirement: (targetText) => `${targetText} genres this week`
  },
  moods: {
    title: 'Mood Quest',
    requirement: (targetText) => `${targetText} moods this week`
  },
  activeDays: {
    title: 'Consistency Quest',
    requirement: (targetText) => `${targetText} active days this week`
  },
  streaks: {
    title: 'Streak Quest',
    requirement: (targetText) => `${targetText} weekly streak`
  },
  perfectPlay: {
    title: 'Perfect Play Quest',
    requirement: (targetText) => `${targetText} Perfect Play uses this week`
  },
  surprise: {
    title: 'Surprise Quest',
    requirement: (targetText) => `${targetText} Surprise Me uses this week`
  },
  rediscover: {
    title: 'Rediscovery Quest',
    requirement: (targetText) => `${targetText} Rediscover launches this week`
  },
  share: {
    title: 'Share Quest',
    requirement: (targetText) => `${targetText} shares this week`
  },
  features: {
    title: 'Feature Quest',
    requirement: (targetText) => `${targetText} feature actions this week`
  },
  platforms: {
    title: 'Platform Quest',
    requirement: (targetText) => `${targetText} platforms this week`
  },
  unlocks: {
    title: 'Unlock Quest',
    requirement: (targetText) => `${targetText} reward unlocks this week`
  }
});

const readPreferences = () => {
  try {
    const parsed = StorageService.get(RETENTION_QUEST_PREFERENCES_KEY, {});
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    return {};
  }
};

const savePreferences = (preferences) => {
  StorageService.set(RETENTION_QUEST_PREFERENCES_KEY, preferences);
};

const formatPlaytime = (minutes) => {
  const safeMinutes = Math.max(0, Math.round(Number(minutes) || 0));
  if (safeMinutes < 60) {
    return `${safeMinutes}m`;
  }
  const hours = safeMinutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1).replace(/\.0$/, '')}h`;
};

const formatMetricValue = (value, unit) => {
  if (unit === 'minutes') {
    return formatPlaytime(value);
  }
  return `${Math.max(0, Math.round(Number(value) || 0))}`;
};

const buildRemainingLabel = (remaining, unit) => {
  const safeRemaining = Math.max(0, Math.round(Number(remaining) || 0));
  if (safeRemaining === 0) {
    return 'Quest complete';
  }
  if (unit === 'minutes') {
    return `${formatPlaytime(safeRemaining)} left`;
  }
  return `${safeRemaining} to go`;
};

const resolveTimeConstraint = (persona) => {
  const bucketConstraint = SESSION_BUCKET_TO_TIME_CONSTRAINT[persona?.preferredSessionBucket];
  if (bucketConstraint) {
    return bucketConstraint;
  }

  const averageSession = Number(persona?.avgSessionLength || 0);
  if (averageSession <= 0) {
    return null;
  }
  if (averageSession <= 30) {
    return 'quick';
  }
  if (averageSession <= 90) {
    return 'medium';
  }
  if (averageSession <= 180) {
    return 'long';
  }
  return 'weekend';
};

const buildPicksMessage = (persona, weeklyQuest) => {
  const personaSignals = [];
  if (persona?.dominantMood) {
    personaSignals.push(`${persona.dominantMood} mood`);
  }
  if (persona?.dominantGenre) {
    personaSignals.push(`${persona.dominantGenre} genre`);
  }
  if (persona?.preferredSessionBucket) {
    const sessionLabel = {
      '0-30': 'quick-hit sessions',
      '30-60': 'focused sessions',
      '60-120': 'long-form sessions',
      '120+': 'marathon sessions'
    }[persona.preferredSessionBucket] || 'session habits';
    personaSignals.push(sessionLabel);
  }

  const personaCopy = personaSignals.length > 0
    ? `Curated from your ${personaSignals.join(', ')}.`
    : 'Curated from your recent GamePilot habits.';

  if (weeklyQuest?.primaryQuest?.name) {
    return `${personaCopy} Great candidates while you push ${weeklyQuest.primaryQuest.name}.`;
  }

  return personaCopy;
};

export class RetentionQuestService {
  static getPinnedWeeklyQuestId() {
    const preferences = readPreferences();
    const pinnedQuest = preferences.weekly || null;
    const currentPeriodKey = AchievementTracker.getPeriodCurrentKey('weekly');
    const activeIds = AchievementTracker.getActivePeriodAchievementIds('weekly');

    if (!pinnedQuest?.questId || pinnedQuest.periodKey !== currentPeriodKey || !activeIds.includes(pinnedQuest.questId)) {
      if (preferences.weekly) {
        const nextPreferences = { ...preferences };
        delete nextPreferences.weekly;
        savePreferences(nextPreferences);
      }
      return null;
    }

    return pinnedQuest.questId;
  }

  static pinWeeklyQuest(questId) {
    const activeIds = AchievementTracker.getActivePeriodAchievementIds('weekly');
    if (!activeIds.includes(questId)) {
      return {
        success: false,
        message: 'That quest is no longer active this week.'
      };
    }

    const preferences = readPreferences();
    preferences.weekly = {
      periodKey: AchievementTracker.getPeriodCurrentKey('weekly'),
      questId
    };
    savePreferences(preferences);

    const achievement = AchievementTracker.getAchievementById(questId);
    return {
      success: true,
      message: `${achievement?.name || 'Quest'} pinned as your weekly mission.`
    };
  }

  static clearWeeklyQuestPin() {
    const preferences = readPreferences();
    if (!preferences.weekly) {
      return {
        success: false,
        message: 'No weekly quest is pinned right now.'
      };
    }

    delete preferences.weekly;
    savePreferences(preferences);

    return {
      success: true,
      message: 'Weekly quest unpinned.'
    };
  }

  static getWeeklyQuestSnapshot(library = []) {
    const dashboard = StatsAggregationService.getDashboardData(library);
    const weeklyStats = dashboard?.periods?.weekly || null;
    const xpMap = AchievementTracker.getAchievementPoints();
    const activeQuests = AchievementTracker.getActivePeriodAchievementDefinitions('weekly');
    const pinnedQuestId = this.getPinnedWeeklyQuestId();

    const quests = activeQuests
      .map((quest) => {
        const progress = RollingAchievementsTracker.getAchievementProgressSnapshot(quest.id);
        if (!progress) {
          return null;
        }

        const targetText = formatMetricValue(progress.target, progress.unit);
        const currentText = formatMetricValue(progress.current, progress.unit);
        const remaining = Math.max(0, progress.target - progress.current);
        const metricCopy = METRIC_COPY[progress.metric] || METRIC_COPY.features;
        const completed = AchievementTracker.isTimeBasedAchievementUnlocked('weekly', quest.id) || progress.completed;

        return {
          ...quest,
          xpReward: Number(xpMap[quest.id] || 50),
          metric: progress.metric,
          metricTitle: metricCopy.title,
          requirementLabel: metricCopy.requirement(targetText),
          currentValue: progress.current,
          targetValue: progress.target,
          progressPercent: progress.progressPercent,
          progressLabel: `${currentText} / ${targetText}`,
          remainingLabel: buildRemainingLabel(remaining, progress.unit),
          completed,
          permanentlyUnlocked: AchievementTracker.isAchievementUnlocked(quest.id),
          isPinned: pinnedQuestId === quest.id
        };
      })
      .filter(Boolean)
      .sort((left, right) => {
        if (left.isPinned !== right.isPinned) {
          return left.isPinned ? -1 : 1;
        }
        if (left.completed !== right.completed) {
          return left.completed ? 1 : -1;
        }
        if (right.progressPercent !== left.progressPercent) {
          return right.progressPercent - left.progressPercent;
        }
        if (right.xpReward !== left.xpReward) {
          return right.xpReward - left.xpReward;
        }
        return left.name.localeCompare(right.name);
      });

    const primaryQuest = quests.find((quest) => quest.isPinned)
      || quests.find((quest) => !quest.completed)
      || quests[0]
      || null;

    return {
      periodKey: AchievementTracker.getPeriodCurrentKey('weekly'),
      label: weeklyStats?.rangeLabel || 'This Week',
      weeklyStats,
      quests,
      primaryQuest,
      pinnedQuestId,
      completedCount: quests.filter((quest) => quest.completed).length,
      totalCount: quests.length
    };
  }

  static getGamePilotPicksResult(library = [], weeklyQuest = null) {
    if (!Array.isArray(library) || library.length === 0) {
      return null;
    }

    const persona = UserBehaviorProfile.getPersonaSnapshot();
    const mood = persona?.dominantMood || RecommendationEngine.getMoodWithMostGames(library) || null;
    const genre = persona?.dominantGenre || null;
    const timeConstraint = resolveTimeConstraint(persona);
    const availableMinutes = RecommendationEngine.getAvailableMinutes(timeConstraint);

    let games = RecommendationEngine.getPerfectPlayRecommendations(library, mood, genre, timeConstraint, 3);
    let usedFallback = false;

    if (!games.length) {
      usedFallback = true;
      games = RecommendationEngine.getRediscoverResult(library, mood, timeConstraint, 3)?.games || [];
    }

    if (!games.length) {
      usedFallback = true;
      games = RecommendationEngine.getSurpriseMeResult(library, mood, timeConstraint)?.games || [];
    }

    if (!games.length) {
      return null;
    }

    return RecommendationEngine.buildRecommendationPayload('gamepilot-picks', games, {
      mood,
      genre,
      timeConstraint,
      availableMinutes,
      usedFallback,
      source: 'retention-quest-service',
      personaTags: Array.isArray(persona?.personaTags) ? persona.personaTags : [],
      weeklyQuestId: weeklyQuest?.primaryQuest?.id || null,
      message: buildPicksMessage(persona, weeklyQuest)
    });
  }

  // Spend 1 token and swap a single weekly quest. Returns the new quest definition or an error.
  static rerollWeeklyQuest(oldQuestId = null) {
    const spend = QuestRerollService.spendToken(1);
    if (!spend.success) {
      return { success: false, message: spend.message };
    }

    const activeDefs = AchievementTracker.getActivePeriodAchievementDefinitions('weekly');
    if (!Array.isArray(activeDefs) || activeDefs.length === 0) {
      return { success: false, message: 'No active quests to reroll.' };
    }

    const pool = activeDefs.filter((q) => q.id !== oldQuestId);
    if (pool.length === 0) {
      return { success: false, message: 'No alternative quests available.' };
    }

    const newQuest = pool[Math.floor(Math.random() * pool.length)];
    return { success: true, newQuest, remainingTokens: spend.remaining };
  }

  // Spend 1 token to reroll the entire weekly quest set (new random period key preserves).
  static rerollAllWeeklyQuests() {
    const spend = QuestRerollService.spendToken(1);
    if (!spend.success) {
      return { success: false, message: spend.message };
    }
    // Clearing the weekly period key forces AchievementTracker to regenerate next snapshot call.
    AchievementTracker.forceWeeklyQuestRefresh?.(); // optional hook in AchievementTracker
    return { success: true, remainingTokens: spend.remaining };
  }

  static getHomeRetentionSnapshot(library = []) {
    const weeklyQuest = this.getWeeklyQuestSnapshot(library);
    const gamePilotPicks = this.getGamePilotPicksResult(library, weeklyQuest);

    return {
      weeklyQuest,
      gamePilotPicks
    };
  }
}
