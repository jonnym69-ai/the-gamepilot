// The recap season runs December 1 through January 15 — the Wrapped window
// plus the slow post-holiday fortnight when a yearly recap still feels timely.
// During it the page leads with "Year in Review"; the rest of the year the
// same page reads as "Your Gaming Life". December points at the current year
// (it keeps counting to the 31st); early January points at the year that just
// ended.
const JANUARY_GRACE_DAYS = 15;

export const getRecapSeasonYear = (now = new Date()) => {
  const month = now.getMonth();
  if (month === 11) return now.getFullYear();
  if (month === 0 && now.getDate() <= JANUARY_GRACE_DAYS) return now.getFullYear() - 1;
  return null;
};
