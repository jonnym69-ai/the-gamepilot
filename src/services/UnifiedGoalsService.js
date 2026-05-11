import { DailyMissionService } from './DailyMissionService';
import { RetentionQuestService } from './RetentionQuestService';
import { ChallengeBoardService } from './ChallengeBoardService';
import { QuestHistoryService } from './QuestHistoryService';

const clampPercent = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

const normalizeGoal = (goal = {}, source, period = 'daily') => {
  const id = goal.id || goal.questId || goal.achievementId || `${source}-${period}-${goal.title || goal.name || 'goal'}`;
  const title = goal.title || goal.name || goal.metricTitle || 'Goal';
  const description = goal.description || goal.requirementLabel || '';
  const progressPercent = clampPercent(goal.progressPercent ?? goal.percent ?? 0);
  const completed = Boolean(goal.completed || goal.isComplete || progressPercent >= 100);

  return {
    id: String(id),
    source,
    period,
    icon: goal.icon || '🎯',
    title,
    description,
    progressPercent,
    progressLabel: goal.progressLabel || '',
    remainingLabel: completed ? 'Complete' : (goal.remainingLabel || 'In progress'),
    completed,
    isPinned: Boolean(goal.isPinned),
    xpReward: Number(goal.xpReward || goal.xpValue || 0)
  };
};

const sortGoals = (left, right) => {
  if (left.completed !== right.completed) return left.completed ? 1 : -1;
  if (left.isPinned !== right.isPinned) return left.isPinned ? -1 : 1;
  if (right.progressPercent !== left.progressPercent) return right.progressPercent - left.progressPercent;
  if (right.xpReward !== left.xpReward) return right.xpReward - left.xpReward;
  return left.title.localeCompare(right.title);
};

const addUniqueGoal = (goals, seen, goal) => {
  const key = `${goal.period}:${goal.id}`;
  if (seen.has(key)) return;
  seen.add(key);
  goals.push(goal);
};

export class UnifiedGoalsService {
  static getUnifiedGoalsSnapshot(library = [], referenceDate = new Date()) {
    const safeLibrary = Array.isArray(library) ? library : [];
    const daily = DailyMissionService.getDailyMissionSnapshot(safeLibrary, referenceDate);
    const weekly = RetentionQuestService.getWeeklyQuestSnapshot(safeLibrary);
    const challengeBoard = ChallengeBoardService.getChallengeBoardSnapshot(safeLibrary);
    const recentHistory = QuestHistoryService.getQuestCompletionHistory().slice(0, 8);
    const currentYear = referenceDate.getFullYear();
    const yearlyHistory = QuestHistoryService.getQuestCompletionSummaryForYear(currentYear);
    const goals = [];
    const seen = new Set();

    (daily?.missions || []).forEach((mission) => {
      addUniqueGoal(goals, seen, normalizeGoal(mission, 'daily-mission', 'daily'));
    });

    (weekly?.quests || []).forEach((quest) => {
      addUniqueGoal(goals, seen, normalizeGoal(quest, 'weekly-quest', 'weekly'));
    });

    (challengeBoard?.periods || []).forEach((periodSnapshot) => {
      if (!periodSnapshot?.primaryChallenge) return;
      addUniqueGoal(
        goals,
        seen,
        normalizeGoal(periodSnapshot.primaryChallenge, 'challenge-board', periodSnapshot.period)
      );
    });

    const sortedGoals = goals.sort(sortGoals);
    const completedCount = sortedGoals.filter((goal) => goal.completed).length;
    const totalCount = sortedGoals.length;
    const focusGoals = [
      daily?.nextMission ? normalizeGoal(daily.nextMission, 'daily-mission', 'daily') : null,
      weekly?.primaryQuest ? normalizeGoal(weekly.primaryQuest, 'weekly-quest', 'weekly') : null,
      ...(challengeBoard?.periods || [])
        .map((periodSnapshot) => periodSnapshot?.primaryChallenge
          ? normalizeGoal(periodSnapshot.primaryChallenge, 'challenge-board', periodSnapshot.period)
          : null)
    ].filter(Boolean).sort(sortGoals).slice(0, 4);

    return {
      generatedAt: Date.now(),
      daily,
      weekly,
      challengeBoard,
      goals: sortedGoals,
      focusGoals,
      nextGoal: sortedGoals.find((goal) => !goal.completed) || sortedGoals[0] || null,
      completedCount,
      totalCount,
      completionPercent: totalCount > 0 ? clampPercent((completedCount / totalCount) * 100) : 0,
      history: {
        recent: recentHistory,
        totalThisYear: yearlyHistory.totalCompleted || 0,
        periodCounts: yearlyHistory.periodCounts || { daily: 0, weekly: 0, monthly: 0, yearly: 0 },
        topPeriod: yearlyHistory.topPeriod || null
      },
      summaryLabel: totalCount > 0
        ? `${completedCount}/${totalCount} active goals complete`
        : 'No active goals yet',
      focusLabel: focusGoals[0]
        ? `${focusGoals[0].title}: ${focusGoals[0].remainingLabel}`
        : 'No active focus goal yet'
    };
  }
}
