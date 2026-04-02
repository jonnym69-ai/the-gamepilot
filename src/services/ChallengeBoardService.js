import { AchievementTracker } from '../AchievementSystem';
import { resolveGameArtwork } from './GameArtworkService';
import { RollingAchievementsTracker } from './RollingAchievementsTracker';
import { StatsAggregationService } from './StatsAggregationService';

const PREFERENCES_KEY = 'retentionQuestPreferences';
const CURATED_LIMIT = 4;
const PERIOD_CONFIG = Object.freeze({
  daily: {
    title: 'Today',
    context: 'today'
  },
  weekly: {
    title: 'This Week',
    context: 'this week'
  },
  monthly: {
    title: 'This Month',
    context: 'this month'
  },
  yearly: {
    title: 'This Year',
    context: 'this year'
  }
});

const readPreferences = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(PREFERENCES_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    return {};
  }
};

const savePreferences = (preferences) => {
  try {
    const safePreferences = preferences && typeof preferences === 'object' ? preferences : {};
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(safePreferences));
  } catch (error) {
    console.error('Failed to save challenge board preferences:', error);
  }
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
  const numValue = Number(value) || 0;
  return `${Math.max(0, Math.round(numValue))}`;
};

const getGameId = (game = {}) => String(
  game.id
    || game.appid
    || game.appId
    || game.steamAppId
    || game.rawgId
    || game.name
    || ''
);

const getGameImage = (game = {}) => resolveGameArtwork(game, { surface: 'recommendation_card' }) || game.background_image || '';

const toGameSummary = (game = {}) => ({
  id: getGameId(game),
  name: game.name || 'Unknown Game',
  platform: game.platform || 'Local Library',
  timePlayed: Number(game.time_played || 0),
  lastPlayed: Number(game.last_played || 0),
  image: getGameImage(game)
});

const getCuratedCollectionMap = (preferences) => {
  const collections = preferences.curatedCollections;
  return collections && typeof collections === 'object' && !Array.isArray(collections) ? collections : {};
};

const sortCandidateGames = (games = []) => [...games].sort((left, right) => {
  const leftNeverPlayed = Number(left.timePlayed || 0) <= 0;
  const rightNeverPlayed = Number(right.timePlayed || 0) <= 0;
  if (leftNeverPlayed !== rightNeverPlayed) {
    return leftNeverPlayed ? -1 : 1;
  }

  const leftLastPlayed = Number(left.lastPlayed || 0);
  const rightLastPlayed = Number(right.lastPlayed || 0);
  if (leftLastPlayed !== rightLastPlayed) {
    return leftLastPlayed - rightLastPlayed;
  }

  if (left.timePlayed !== right.timePlayed) {
    return left.timePlayed - right.timePlayed;
  }

  return left.name.localeCompare(right.name);
});

export class ChallengeBoardService {
  static getPinnedQuestId(period) {
    const preferences = readPreferences();
    const pinnedQuest = preferences[period] || null;
    const currentPeriodKey = AchievementTracker.getPeriodCurrentKey(period);
    const activeIds = AchievementTracker.getActivePeriodAchievementIds(period);

    if (!pinnedQuest?.questId || pinnedQuest.periodKey !== currentPeriodKey || !activeIds.includes(pinnedQuest.questId)) {
      if (preferences[period]) {
        const nextPreferences = { ...preferences };
        delete nextPreferences[period];
        savePreferences(nextPreferences);
      }
      return null;
    }

    return pinnedQuest.questId;
  }

  static pinQuest(period, questId) {
    try {
      const activeIds = AchievementTracker.getActivePeriodAchievementIds(period);
      if (!activeIds.includes(questId)) {
        return {
          success: false,
          message: 'That challenge is no longer active for this rotation.'
        };
      }

      const preferences = readPreferences();
      preferences[period] = {
        periodKey: AchievementTracker.getPeriodCurrentKey(period),
        questId
      };
      savePreferences(preferences);

      const achievement = AchievementTracker.getAchievementById(questId);
      return {
        success: true,
        message: `${achievement?.name || 'Challenge'} pinned for ${PERIOD_CONFIG[period]?.context || period}.`
      };
    } catch (error) {
      console.error('Error pinning quest:', error);
      return {
        success: false,
        message: 'Failed to pin quest.'
      };
    }
  }

  static clearQuestPin(period) {
    try {
      const preferences = readPreferences();
      if (!preferences[period]) {
        return {
          success: false,
          message: 'No pinned challenge for this rotation.'
        };
      }

      delete preferences[period];
      savePreferences(preferences);

      return {
        success: true,
        message: `Pinned ${PERIOD_CONFIG[period]?.context || period} challenge cleared.`
      };
    } catch (error) {
      console.error('Error clearing quest pin:', error);
      return {
        success: false,
        message: 'Failed to clear pinned quest.'
      };
    }
  }

  static getChallengeBoardSnapshot(library = []) {
    try {
      const safeLibrary = Array.isArray(library) ? library : [];
      const dashboard = StatsAggregationService.getDashboardData(safeLibrary);
      return {
        generatedAt: Date.now(),
        periods: Object.keys(PERIOD_CONFIG).map((period) => this.getPeriodChallengeSnapshot(period, safeLibrary, dashboard))
      };
    } catch (e) {
      console.error('ChallengeBoardService: Failed to get challenge board snapshot', e);
      return {
        generatedAt: Date.now(),
        periods: []
      };
    }
  }

  static getCuratedGameIds(period) {
    try {
      const preferences = readPreferences();
      const collections = getCuratedCollectionMap(preferences);
      const ids = collections[period];
      return Array.isArray(ids)
        ? ids.map((id) => String(id)).filter(Boolean).slice(0, CURATED_LIMIT)
        : [];
    } catch (e) {
      console.error('ChallengeBoardService: Failed to get curated game IDs', e);
      return [];
    }
  }

  static addCuratedGame(period, gameId) {
    try {
      const normalizedId = String(gameId || '').trim();
      if (!normalizedId) {
        return {
          success: false,
          message: 'Select a game to add first.'
        };
      }

      const preferences = readPreferences();
      const collections = getCuratedCollectionMap(preferences);
      const currentIds = collections[period] || [];
      if (currentIds.includes(normalizedId)) {
        return {
          success: false,
          message: 'This game is already in the curated lineup.'
        };
      }

      const updatedIds = [...currentIds, normalizedId].slice(0, CURATED_LIMIT);
      preferences.curatedCollections = preferences.curatedCollections || {};
      preferences.curatedCollections[period] = updatedIds;
      savePreferences(preferences);

      return {
        success: true,
        message: `Added to ${PERIOD_CONFIG[period]?.context || period} lineup.`
      };
    } catch (error) {
      console.error('Error adding curated game:', error);
      return {
        success: false,
        message: 'Failed to add game to lineup.'
      };
    }
  }

  static removeCuratedGame(period, gameId) {
    try {
      const normalizedId = String(gameId || '').trim();
      if (!normalizedId) {
        return {
          success: false,
          message: 'Invalid game ID.'
        };
      }

      const preferences = readPreferences();
      const collections = getCuratedCollectionMap(preferences);
      const currentIds = collections[period] || [];
      if (!currentIds.includes(normalizedId)) {
        return {
          success: false,
          message: 'This game is not in the curated lineup.'
        };
      }

      const updatedIds = currentIds.filter((id) => id !== normalizedId);
      preferences.curatedCollections = preferences.curatedCollections || {};
      preferences.curatedCollections[period] = updatedIds;
      savePreferences(preferences);

      return {
        success: true,
        message: `Removed from ${PERIOD_CONFIG[period]?.context || period} lineup.`
      };
    } catch (error) {
      console.error('Error removing curated game:', error);
      return {
        success: false,
        message: 'Failed to remove game from lineup.'
      };
    }
  }

  static getCuratedGames(period, library = []) {
    try {
      const safeLibrary = Array.isArray(library) ? library : [];
      const byId = new Map(
        safeLibrary
          .map((game) => [getGameId(game), toGameSummary(game)])
          .filter(([id]) => Boolean(id))
      );

      return this.getCuratedGameIds(period)
        .map((id) => byId.get(id))
        .filter(Boolean);
    } catch (e) {
      console.error('ChallengeBoardService: Failed to get curated games', e);
      return [];
    }
  }

  static getCandidateGames(period, library = []) {
    try {
      const safeLibrary = Array.isArray(library) ? library : [];
      const currentIds = new Set(this.getCuratedGameIds(period));
      return sortCandidateGames(
        safeLibrary
          .map((game) => toGameSummary(game))
          .filter((game) => game.id && !currentIds.has(game.id))
      );
    } catch (e) {
      console.error('ChallengeBoardService: Failed to get candidate games', e);
      return [];
    }
  }

  static getPeriodChallengeSnapshot(period, library = [], dashboard = null) {
    try {
      const config = PERIOD_CONFIG[period] || { title: period, context: period };
      const safeLibrary = Array.isArray(library) ? library : [];
      const statsDashboard = dashboard || StatsAggregationService.getDashboardData(safeLibrary);
      const periodStats = statsDashboard?.periods?.[period] || null;
      
      // Ensure periodStats has safe default values to prevent NaN
      const safePeriodStats = periodStats ? {
        ...periodStats,
        sessions: Number(periodStats.sessions) || 0,
        playtimeMinutes: Number(periodStats.playtimeMinutes) || 0,
        uniqueGames: Number(periodStats.uniqueGames) || 0,
        activeDays: Number(periodStats.activeDays) || 0,
        avgSessionMinutes: Number(periodStats.avgSessionMinutes) || 0,
        longestSessionMinutes: Number(periodStats.longestSessionMinutes) || 0,
        playtimeHours: Number(periodStats.playtimeHours) || 0
      } : null;
      
      const xpMap = AchievementTracker.getAchievementPoints();
      const activeQuests = AchievementTracker.getActivePeriodAchievementDefinitions(period);
      const pinnedQuestId = this.getPinnedQuestId(period);

    const quests = activeQuests
        .map((quest) => {
          const progress = RollingAchievementsTracker.getAchievementProgressSnapshot(quest.id);
          
          if (!progress) {
            console.warn(`No progress data found for achievement: ${quest.id}`);
            return null;
          }

          const target = Number(progress.target) || 0;
          const current = Number(progress.current) || 0;
          
          // Debug logging for NaN values
          if (isNaN(target) || isNaN(current)) {
            console.warn(`NaN values in achievement ${quest.id}:`, { 
              target: progress.target, 
              current: progress.current,
              parsedTarget: target,
              parsedCurrent: current
            });
          }

          const questDescription = quest.description || quest.desc || 'Complete this challenge';
          
          const targetText = formatMetricValue(target, progress.unit);
          const currentText = formatMetricValue(current, progress.unit);
          const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
          const isComplete = progress.isComplete || percent >= 100;
          const xpValue = xpMap[quest.id] || 0;

          return {
            questId: quest.id,
            id: quest.id, // Add id for React key
            name: quest.name,
            description: questDescription,
            icon: quest.icon,
            period,
            target,
            current,
            unit: progress.unit,
            targetText,
            currentText,
            percent,
            isComplete,
            xpValue,
            isPinned: String(quest.id) === String(pinnedQuestId),
            category: quest.category,
            rarity: quest.rarity,
            // UI properties that ChallengeBoard component expects
            progressLabel: `${currentText}/${targetText}`,
            remainingLabel: `${Math.max(0, target - current)} ${progress.unit} remaining`,
            xpReward: xpValue,
            progressPercent: percent,
            completed: isComplete,
            metricTitle: quest.name,
            requirementLabel: questDescription
          };
        })
        .filter(Boolean);

      const primaryChallenge = quests.find((q) => q.isPinned) || quests[0] || null;

      // Add UI properties to primaryChallenge if it exists
      if (primaryChallenge) {
        primaryChallenge.progressLabel = primaryChallenge.progressLabel || `${primaryChallenge.currentText}/${primaryChallenge.targetText}`;
        primaryChallenge.remainingLabel = primaryChallenge.remainingLabel || `${Math.max(0, primaryChallenge.target - primaryChallenge.current)} ${primaryChallenge.unit} remaining`;
        primaryChallenge.xpReward = primaryChallenge.xpReward || primaryChallenge.xpValue || 0;
        primaryChallenge.progressPercent = primaryChallenge.progressPercent || primaryChallenge.percent || 0;
        primaryChallenge.completed = primaryChallenge.completed || primaryChallenge.isComplete || false;
        primaryChallenge.requirementLabel = primaryChallenge.requirementLabel || primaryChallenge.description || 'Complete this challenge';
        primaryChallenge.permanentlyUnlocked = primaryChallenge.permanentlyUnlocked || false;
      }

      return {
        period,
        title: config.title,
        context: config.context,
        lastUpdated: Date.now(),
        stats: safePeriodStats,
        quests,
        primaryChallenge,
        hasData: quests.length > 0,
        curatedGames: this.getCuratedGames(period, library),
        candidateGames: this.getCandidateGames(period, library),
        // Add count properties for the challenges complete counter
        totalCount: quests.length,
        completedCount: quests.filter(q => q.completed).length
      };
    } catch (e) {
      console.error('ChallengeBoardService: Failed to get period challenge snapshot', e);
      return {
        period,
        title: PERIOD_CONFIG[period]?.title || period,
        context: PERIOD_CONFIG[period]?.context || period,
        lastUpdated: Date.now(),
        stats: null,
        quests: [],
        primaryChallenge: null,
        hasData: false,
        curatedGames: [],
        candidateGames: [],
        // Add count properties for the challenges complete counter
        totalCount: 0,
        completedCount: 0
      };
    }
  }

  static getCuratedLineups(library = []) {
    try {
      const safeLibrary = Array.isArray(library) ? library : [];
      return ['daily', 'weekly', 'monthly', 'yearly'].reduce((acc, period) => {
        acc[period] = this.getCuratedGames(period, safeLibrary);
        return acc;
      }, {});
    } catch (e) {
      console.error('ChallengeBoardService: Failed to get curated lineups', e);
      return { daily: [], weekly: [], monthly: [], yearly: [] };
    }
  }
}
                          
