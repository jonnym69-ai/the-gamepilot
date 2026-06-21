import InterfacePreferencesService from '../services/InterfacePreferencesService';

const HOURS_PER_DAY = 24;

// Below this many hours, "auto" mode keeps showing hours rather than days.
const AUTO_DAYS_THRESHOLD_HOURS = 100;

const formatHoursOnly = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60);
  const remainder = totalMinutes % 60;
  if (hours > 0 && remainder > 0) return `${hours}h ${remainder}m`;
  if (hours > 0) return `${hours}h`;
  return `${remainder}m`;
};

const formatDays = (totalMinutes) => {
  const totalHours = totalMinutes / 60;
  const days = Math.floor(totalHours / HOURS_PER_DAY);
  const hours = Math.round(totalHours % HOURS_PER_DAY);
  if (days > 0 && hours > 0) return `${days}d ${hours}h`;
  if (days > 0) return `${days}d`;
  return formatHoursOnly(totalMinutes);
};

/**
 * Format a minute count according to the user's playtime unit preference.
 * @param {number} minutes - duration in minutes
 * @param {('auto'|'hours'|'days')} [unitOverride] - optional explicit unit
 */
export const formatPlaytime = (minutes = 0, unitOverride) => {
  const safeMinutes = Math.max(0, Math.round(Number(minutes) || 0));
  const unit = unitOverride || InterfacePreferencesService.get('playtimeUnit') || 'auto';

  if (unit === 'hours') {
    return formatHoursOnly(safeMinutes);
  }

  if (unit === 'days') {
    return formatDays(safeMinutes);
  }

  // auto: switch to days only for large totals so small sessions stay readable
  const totalHours = safeMinutes / 60;
  if (totalHours >= AUTO_DAYS_THRESHOLD_HOURS) {
    return formatDays(safeMinutes);
  }
  return formatHoursOnly(safeMinutes);
};

export default formatPlaytime;
