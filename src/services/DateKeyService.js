import StorageService from './StorageService';

export const getPreferredTimeZone = () => {
  return StorageService.getString('timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;
};

export const getDateKey = (referenceDate = new Date(), timeZone = getPreferredTimeZone()) => {
  const date = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
};
