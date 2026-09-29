import gamingHistory from '../constants/GamingHistory.json';

export const ON_THIS_DAY_MAX_OFFSET = 3;

const OFFSET_ORDER = [0, -1, 1, -2, 2, -3, 3];

const dayKey = (date) => `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export function getTodaysEvents(date = new Date(), source = gamingHistory) {
  for (const offset of OFFSET_ORDER) {
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset);
    const events = source[dayKey(target)];
    if (events?.length) {
      return {
        exact: offset === 0,
        date: target,
        events: events.slice(0, 3),
      };
    }
  }
  return null;
}
