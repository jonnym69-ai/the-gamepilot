import { StatsAggregationService } from './StatsAggregationService';
import { DailyMissionService } from './DailyMissionService';
import { ProgressionUnlockService } from './ProgressionUnlockService';

const normalizeMinutes = (value) => Math.max(0, Math.round(Number(value) || 0));

const formatMissionFocusLabel = (mission) => {
  if (!mission) {
    return 'Pick your next goal';
  }

  if (mission.completed) {
    return `${mission.title} complete`;
  }

  return mission.remainingLabel || `Continue ${mission.title}`;
};

const buildMissionBaseline = (afterMission, detail = {}, afterSummary = {}) => {
  if (!afterMission) {
    return null;
  }

  let baselineCurrent = Number(afterMission.current || 0);

  if (afterMission.id === 'daily-playtime') {
    baselineCurrent = Math.max(0, baselineCurrent - normalizeMinutes(detail.playtimeMinutes));
  } else if (afterMission.id === 'daily-variety') {
    baselineCurrent = Math.max(0, baselineCurrent - (Number(afterSummary.uniqueGamesToday || 0) > 0 ? 1 : 0));
  } else if (afterMission.id === 'daily-discovery') {
    baselineCurrent = afterMission.completed ? Math.max(0, baselineCurrent - 1) : baselineCurrent;
  }

  return {
    ...afterMission,
    current: baselineCurrent
  };
};

const getMissionDeltaLabel = (beforeMission, afterMission, detail = {}, afterSummary = {}) => {
  if (!afterMission) {
    return null;
  }

  const beforeValue = Number(beforeMission?.current || 0);
  const afterValue = Number(afterMission.current || 0);
  const delta = Math.max(0, afterValue - beforeValue);
  const sessionMinutes = normalizeMinutes(detail.playtimeMinutes);
  const isFirstSessionToday = Number(afterSummary.sessionsToday || 0) <= 1;

  if (delta <= 0) {
    if (afterMission.completed) {
      return 'Stayed complete';
    }

    if (afterMission.id === 'daily-playtime' && sessionMinutes > 0) {
      return `${Math.max(0, afterMission.target - afterValue)}m still to go`;
    }

    return afterMission.remainingLabel;
  }

  if (afterMission.id === 'daily-playtime') {
    return `+${delta}m this session`;
  }

  if (afterMission.id === 'daily-variety') {
    if (isFirstSessionToday) {
      return 'Marked your first game today';
    }

    return delta > 0 ? 'Variety progress moved forward' : afterMission.remainingLabel;
  }

  if (afterMission.id === 'daily-discovery') {
    return afterMission.completed
      ? 'Discovery goal is now complete'
      : afterMission.remainingLabel;
  }

  return `+${delta} progress`;
};

const getStreakSummary = (afterDaily = {}) => {
  const sessionsToday = Number(afterDaily.sessions || 0);
  const activeStreak = Number(afterDaily?.streak?.current || 0);
  const previousStreak = sessionsToday <= 1 ? Math.max(0, activeStreak - 1) : activeStreak;

  return {
    activeStreak,
    previousStreak,
    label: activeStreak > previousStreak
      ? 'Your daily streak moved forward.'
      : activeStreak > 0
        ? 'Your current streak is holding.'
        : 'A new streak starts with today.'
  };
};

const getRecommendedAction = ({ missionSummary, progression, hasBacklogRescue = false }) => {
  const nextMission = missionSummary?.nextMission || null;

  if (nextMission && !nextMission.completed) {
    return {
      type: 'mission',
      title: nextMission.title,
      label: `Focus on ${nextMission.title}`,
      description: formatMissionFocusLabel(nextMission)
    };
  }

  if (progression?.nextUnlock) {
    return {
      type: 'unlock',
      title: progression.nextUnlock.name,
      label: `Push toward ${progression.nextUnlock.name}`,
      description: progression.nextUnlockProgressLabel
    };
  }

  if (hasBacklogRescue) {
    return {
      type: 'backlog',
      title: 'Backlog Rescue',
      label: 'Jump back into backlog rescue',
      description: 'Pick up something you already started.'
    };
  }

  return {
    type: 'mission',
    title: 'Next step',
    label: 'Find a focused next play',
    description: 'Use a recommendation to keep momentum going.'
  };
};

export class PostSessionRecapService {
  static buildRecap(detail = {}, library = [], options = {}) {
    const safeLibrary = Array.isArray(library) ? library : [];
    const hasBacklogRescue = Boolean(options?.hasBacklogRescue);
    const endedMinutes = normalizeMinutes(detail.playtimeMinutes);
    const endTime = detail.endTime || Date.now();
    const referenceDate = new Date(endTime);

    const afterDashboard = StatsAggregationService.getDashboardData(safeLibrary, referenceDate);
    const afterDaily = afterDashboard?.periods?.daily || {};
    const streakSummary = getStreakSummary(afterDaily);

    const afterMissions = DailyMissionService.getDailyMissionSnapshot(safeLibrary);
    const beforeMissionMap = new Map((afterMissions?.missions || []).map((mission) => [
      mission.id,
      buildMissionBaseline(mission, detail, afterDaily)
    ]));

    const progressionSnapshot = ProgressionUnlockService.getUnlockSnapshot();
    const nextUnlock = progressionSnapshot?.summary?.nextUnlock || null;
    const progression = {
      xp: Number(progressionSnapshot?.xp || 0),
      level: Number(progressionSnapshot?.level || 1),
      nextUnlock,
      nextUnlockProgressLabel: nextUnlock
        ? `${nextUnlock.remainingXP?.toLocaleString?.() || 0} XP until ${nextUnlock.name}`
        : 'You are currently caught up on unlocks.'
    };
    const missionSummary = {
      completedCount: Number(afterMissions?.completedCount || 0),
      totalCount: Number(afterMissions?.totalCount || 0),
      nextMission: afterMissions?.nextMission || null
    };
    const summary = {
      sessionsToday: Number(afterDaily.sessions || 0),
      activeStreak: Number(streakSummary.activeStreak || 0),
      previousStreak: Number(streakSummary.previousStreak || 0),
      streakSummaryLabel: streakSummary.label,
      totalPlaytimeToday: Number(afterDaily.playtimeMinutes || 0),
      uniqueGamesToday: Number(afterDaily.uniqueGames || 0),
      sessionSummaryLabel: endedMinutes > 0
        ? `${endedMinutes}m added to today${Number(afterDaily.sessions || 0) > 1 ? ' across your running streak of sessions.' : '.'}`
        : 'This session has been logged into today\'s progress.'
    };
    const recommendedAction = getRecommendedAction({
      missionSummary,
      progression,
      hasBacklogRescue
    });

    return {
      gameName: detail.gameName || 'Recent Session',
      gameId: detail.gameId || detail.gameName || null,
      genre: detail.genre || null,
      mood: detail.mood || null,
      playtimeMinutes: endedMinutes,
      endTime,
      summary,
      missions: (afterMissions?.missions || []).map((mission) => ({
        ...mission,
        deltaLabel: getMissionDeltaLabel(beforeMissionMap.get(mission.id), mission, detail, summary)
      })),
      missionSummary,
      progression,
      recommendedAction
    };
  }
}
