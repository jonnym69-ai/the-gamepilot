import { StatsAggregationService } from './StatsAggregationService';

const SHOWN_KEY = 'nostalgia_shown';

// Memoize the heavy aggregation per (day, library size) — same library on same
// day should never re-run the full session normalization pass.
let dailyMemo = null;
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

const getShownMap = () => {
  try {
    const raw = localStorage.getItem(SHOWN_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const setShown = (key) => {
  try {
    const map = getShownMap();
    map[key] = true;
    localStorage.setItem(SHOWN_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
};

export const NostalgiaService = {
  getOnThisDaySession(library) {
    const day = todayKey();
    const librarySize = Array.isArray(library) ? library.length : 0;
    if (dailyMemo && dailyMemo.day === day && dailyMemo.librarySize === librarySize) {
      return dailyMemo.result;
    }

    const sessions = StatsAggregationService.getNormalizedSessionHistory(library);
    if (!sessions || sessions.length === 0) {
      dailyMemo = { day, librarySize, result: null };
      return null;
    }

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentDate = today.getDate();

    const candidates = sessions.filter((session) => {
      if (!session.timestamp) return false;
      const yearDiff = today.getFullYear() - session.timestamp.getFullYear();
      if (yearDiff < 1) return false; // at least 1 year ago
      return (
        session.timestamp.getMonth() === currentMonth &&
        session.timestamp.getDate() === currentDate
      );
    });

    if (candidates.length === 0) {
      dailyMemo = { day, librarySize, result: null };
      return null;
    }

    // pick the longest session among candidates
    const best = candidates.reduce((best, current) =>
      current.playtimeMinutes > best.playtimeMinutes ? current : best
    );

    const shownMap = getShownMap();
    const cacheKey = `${best.gameName}_${best.timestamp.toISOString().split('T')[0]}`;
    const alreadyShown = shownMap[cacheKey];

    const yearsAgo = today.getFullYear() - best.timestamp.getFullYear();

    const result = {
      gameName: best.gameName,
      platform: best.platform,
      playtimeMinutes: best.playtimeMinutes,
      yearsAgo,
      date: best.timestamp,
      cacheKey,
      alreadyShown: !!alreadyShown
    };

    dailyMemo = { day, librarySize, result };
    return result;
  },

  markShown(cacheKey) {
    setShown(cacheKey);
  },

  invalidateMemo() {
    dailyMemo = null;
  }
};

export default NostalgiaService;
