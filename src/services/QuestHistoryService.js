import StorageService from './StorageService';

const QUEST_HISTORY_KEY = 'questCompletionHistory';

const normalizeTimestamp = (value) => {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric;
  }
  return Date.now();
};

const normalizeText = (value, fallback = '') => {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
};

const sortNewestFirst = (left, right) => Number(right?.completedAt || 0) - Number(left?.completedAt || 0);

export class QuestHistoryService {
  static getQuestCompletionHistory() {
    try {
      const stored = StorageService.get(QUEST_HISTORY_KEY, []);
      return Array.isArray(stored) ? stored : [];
    } catch (error) {
      console.error('QuestHistoryService: Failed to read quest history', error);
      return [];
    }
  }

  static saveQuestCompletionHistory(history = []) {
    try {
      const safeHistory = Array.isArray(history) ? history : [];
      StorageService.set(QUEST_HISTORY_KEY, safeHistory.slice(0, 1000));
    } catch (error) {
      console.error('QuestHistoryService: Failed to save quest history', error);
    }
  }

  static recordQuestCompletion(entry = {}) {
    const achievementId = normalizeText(entry.achievementId);
    const period = normalizeText(entry.period);
    const periodKey = normalizeText(entry.periodKey);
    if (!achievementId || !period || !periodKey) {
      return null;
    }

    const history = this.getQuestCompletionHistory().filter((item) => !(
      item?.achievementId === achievementId
      && item?.period === period
      && item?.periodKey === periodKey
    ));

    const normalizedEntry = {
      achievementId,
      period,
      periodKey,
      name: normalizeText(entry.name, achievementId),
      description: normalizeText(entry.description),
      icon: normalizeText(entry.icon, '🏆'),
      rarity: normalizeText(entry.rarity, 'COMMON'),
      metric: normalizeText(entry.metric),
      target: Number(entry.target) || 0,
      current: Number(entry.current) || 0,
      completedAt: normalizeTimestamp(entry.completedAt)
    };

    history.unshift(normalizedEntry);
    history.sort(sortNewestFirst);
    this.saveQuestCompletionHistory(history);
    return normalizedEntry;
  }

  static getQuestCompletionHistoryForYear(year) {
    const safeYear = Number(year);
    return this.getQuestCompletionHistory().filter((entry) => {
      const completedAt = new Date(Number(entry?.completedAt || 0));
      return !Number.isNaN(completedAt.getTime()) && completedAt.getFullYear() === safeYear;
    }).sort(sortNewestFirst);
  }

  static getQuestCompletionSummaryForYear(year) {
    const entries = this.getQuestCompletionHistoryForYear(year);
    const periods = {
      daily: 0,
      weekly: 0,
      monthly: 0,
      yearly: 0
    };

    entries.forEach((entry) => {
      if (periods[entry.period] !== undefined) {
        periods[entry.period] += 1;
      }
    });

    const topPeriod = Object.entries(periods)
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0] || null;

    return {
      totalCompleted: entries.length,
      periodCounts: periods,
      topPeriod: topPeriod && topPeriod[1] > 0 ? { period: topPeriod[0], count: topPeriod[1] } : null,
      highlights: entries.slice(0, 8)
    };
  }
}
