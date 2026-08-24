import StorageService from './StorageService';

const DATE_FORMAT_KEY = 'dateFormat';
const TIME_FORMAT_KEY = 'timeFormat';
const TIMEZONE_KEY = 'timezone';

const pad = (num) => String(num).padStart(2, '0');

function getDateFormat() {
  return StorageService.getString(DATE_FORMAT_KEY, 'DD/MM/YYYY');
}

function getTimeFormat() {
  return StorageService.getString(TIME_FORMAT_KEY, '24-hour');
}

function getTimeZone() {
  return StorageService.getString(TIMEZONE_KEY) || Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function getPartsInTimeZone(date, options) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;

  const timeZone = getTimeZone();
  const parts = new Intl.DateTimeFormat('en-US', { ...options, timeZone }).formatToParts(d);
  const values = {};
  parts.forEach((part) => {
    if (part.type !== 'literal') {
      values[part.type] = part.value;
    }
  });
  return values;
}

function formatDate(date) {
  const values = getPartsInTimeZone(date, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
  if (!values) return 'Invalid date';

  const day = pad(values.day);
  const month = pad(values.month);
  const year = values.year;

  switch (getDateFormat()) {
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'DD/MM/YYYY':
    default:
      return `${day}/${month}/${year}`;
  }
}

function formatTime(date) {
  const is24Hour = getTimeFormat() === '24-hour';
  const values = getPartsInTimeZone(date, {
    hour: is24Hour ? '2-digit' : 'numeric',
    minute: '2-digit',
    hour12: !is24Hour,
    dayPeriod: is24Hour ? undefined : 'short'
  });
  if (!values) return 'Invalid time';

  const hour = values.hour;
  const minute = values.minute;
  const dayPeriod = values.dayPeriod;

  if (is24Hour) {
    return `${hour}:${minute}`;
  }

  return `${hour}:${minute} ${dayPeriod || ''}`.trim();
}

function formatDateTime(date) {
  return `${formatDate(date)} ${formatTime(date)}`;
}

const DateTimeFormatService = {
  getDateFormat,
  getTimeFormat,
  formatDate,
  formatTime,
  formatDateTime
};

export default DateTimeFormatService;
