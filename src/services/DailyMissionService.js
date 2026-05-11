import { StatsAggregationService } from './StatsAggregationService';

const clampProgressPercent = (current, target) => {
  const safeTarget = Math.max(1, Number(target) || 1);
  const safeCurrent = Math.max(0, Number(current) || 0);
  return Math.max(0, Math.min(100, Math.round((safeCurrent / safeTarget) * 100)));
};

const buildMission = ({
  id,
  icon,
  title,
  description,
  current,
  target,
  valueFormatter = (value) => `${value}`,
  completionLabel = 'Complete'
}) => {
  const safeCurrent = Math.max(0, Number(current) || 0);
  const safeTarget = Math.max(1, Number(target) || 1);
  const completed = safeCurrent >= safeTarget;

  return {
    id,
    icon,
    title,
    description,
    current: safeCurrent,
    target: safeTarget,
    completed,
    progressPercent: clampProgressPercent(safeCurrent, safeTarget),
    progressLabel: `${valueFormatter(Math.min(safeCurrent, safeTarget))} / ${valueFormatter(safeTarget)}`,
    remainingLabel: completed ? completionLabel : `${valueFormatter(Math.max(0, safeTarget - safeCurrent))} left`
  };
};

export class DailyMissionService {
  static getDailyMissionSnapshot(library = [], referenceDate = new Date()) {
    const dashboard = StatsAggregationService.getDashboardData(library, referenceDate);
    const daily = dashboard?.periods?.daily || {};
    const featureUsage = daily?.featureUsage?.counts || {};

    const missions = [
      buildMission({
        id: 'daily-playtime',
        icon: '⏱️',
        title: 'Daily Warmup',
        description: 'Log 30 minutes of playtime today.',
        current: daily.playtimeMinutes || 0,
        target: 30,
        valueFormatter: (value) => `${Math.round(value)}m`
      }),
      buildMission({
        id: 'daily-variety',
        icon: '🎮',
        title: 'Shelf Explorer',
        description: 'Play 2 different games today.',
        current: daily.uniqueGames || 0,
        target: 2,
        valueFormatter: (value) => `${Math.round(value)} game${Math.round(value) === 1 ? '' : 's'}`
      }),
      buildMission({
        id: 'daily-discovery',
        icon: '✨',
        title: 'Use a Guide',
        description: 'Use one recommendation tool today.',
        current: (featureUsage.perfectPlay || 0) + (featureUsage.surpriseMe || 0) + (featureUsage.rediscover || 0) + (featureUsage.continuePlaying || 0),
        target: 1,
        valueFormatter: (value) => `${Math.round(value)} pick${Math.round(value) === 1 ? '' : 's'}`
      })
    ];

    return {
      label: daily.rangeLabel || 'Today',
      missions,
      completedCount: missions.filter((mission) => mission.completed).length,
      totalCount: missions.length,
      nextMission: missions.find((mission) => !mission.completed) || missions[0] || null,
      dailyStats: {
        playtimeMinutes: Number(daily.playtimeMinutes || 0),
        playtimeHours: Number(daily.playtimeHours || 0),
        sessions: Number(daily.sessions || 0),
        uniqueGames: Number(daily.uniqueGames || 0),
        featureUses: Number(daily?.featureUsage?.totalUses || 0)
      }
    };
  }
}
