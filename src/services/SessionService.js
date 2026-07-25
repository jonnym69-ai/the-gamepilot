import StorageService from './StorageService';

const SESSION_KEY = 'lastSessionTimestamp';
const DISMISS_KEY = 'welcomeBackDismissed';
const OPT_OUT_KEY = 'welcomeBackOptOut';

const FRESH_SESSION_GAP_MS = 4 * 60 * 60 * 1000;

function isSameCalendarDay(ts1, ts2) {
  const d1 = new Date(ts1);
  const d2 = new Date(ts2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function isFreshSession(lastTs, now = Date.now()) {
  if (!lastTs || Number.isNaN(lastTs)) return true;
  if (isSameCalendarDay(lastTs, now)) {
    return (now - lastTs) >= FRESH_SESSION_GAP_MS;
  }
  return true;
}

function stampSession(now = Date.now()) {
  StorageService.set(SESSION_KEY, now);
}

function isWelcomeBackDismissed() {
  try {
    return sessionStorage.getItem(`gamepilot-${DISMISS_KEY}`) === '1';
  } catch {
    return false;
  }
}

function dismissWelcomeBack() {
  try {
    sessionStorage.setItem(`gamepilot-${DISMISS_KEY}`, '1');
  } catch {
    // ignore
  }
}

function isWelcomeBackOptedOut() {
  return StorageService.get(OPT_OUT_KEY, false) === true;
}

function setWelcomeBackOptedOut(enabled) {
  StorageService.set(OPT_OUT_KEY, Boolean(enabled));
}

export const SessionService = {
  isFreshSession,
  stampSession,
  isWelcomeBackDismissed,
  dismissWelcomeBack,
  isWelcomeBackOptedOut,
  setWelcomeBackOptedOut,
  FRESH_SESSION_GAP_MS
};

export default SessionService;
