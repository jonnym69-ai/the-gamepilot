// Gaming vitals — the "sleep tracker" interpretation layer over real session
// telemetry. Pure functions over SessionRepository history: no persistence,
// no judgement — it describes your rhythm, it doesn't grade it.
//
// Sessions are attributed to the evening they STARTED (a 9pm–1am run counts
// as that night's session, sleep-tracker style), and depth bands classify
// each sit-down: deep >= 90 min, steady 15–90, hop < 15.

const DAY_MS = 24 * 60 * 60 * 1000;
const DEEP_MIN = 90;
const STEADY_MIN = 15;
const WINDOW_DAYS = 30;
const NORM_WEEKS = 5;

const dateKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const depthBand = (minutes) => (minutes >= DEEP_MIN ? 'deep' : minutes >= STEADY_MIN ? 'steady' : 'hop');

const normalize = (entry) => {
  const end = new Date(entry?.endTime || entry?.timestamp || 0).getTime() || 0;
  const startRaw = new Date(entry?.startTime || 0).getTime() || 0;
  const minutes = Math.round(Number(entry?.playtimeMinutes ?? entry?.duration ?? 0) || 0);
  const start = startRaw || (end && minutes ? end - minutes * 60000 : end);
  return { game: entry?.gameName || 'a game', start, end, minutes };
};

const summarize = (sessions) => {
  const days = new Set();
  const games = new Map();
  const bands = { deep: 0, steady: 0, hop: 0 };
  let minutes = 0;
  sessions.forEach((s) => {
    days.add(dateKey(new Date(s.start)));
    minutes += s.minutes;
    bands[depthBand(s.minutes)] += 1;
    games.set(s.game, (games.get(s.game) || 0) + s.minutes);
  });
  const topGame = [...games.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  return { days: days.size, sessions: sessions.length, minutes, bands, topGame };
};

export const GamingVitalsService = {
  getVitals(history, now = new Date()) {
    const sessions = (Array.isArray(history) ? history : [])
      .map(normalize)
      .filter((s) => s.start > 0 && s.minutes > 0)
      .sort((a, b) => a.start - b.start);
    if (sessions.length === 0) return null;

    const todayKey = dateKey(now);
    const nowMs = now.getTime();
    const today = summarize(sessions.filter((s) => dateKey(new Date(s.start)) === todayKey));

    const last7 = summarize(sessions.filter((s) => nowMs - s.start < 7 * DAY_MS));

    // Norm: days played per week across the NORM_WEEKS full weeks before the
    // current one — "your usual" is a median so one monster week doesn't skew it.
    const weekDays = [];
    for (let w = 1; w <= NORM_WEEKS; w++) {
      const start = nowMs - (w + 1) * 7 * DAY_MS;
      const end = nowMs - w * 7 * DAY_MS;
      weekDays.push(summarize(sessions.filter((s) => s.start >= start && s.start < end)).days);
    }
    const sorted = [...weekDays].sort((a, b) => a - b);
    const weeklyNorm = sorted[Math.floor(sorted.length / 2)] ?? 0;

    // Typical start window — modal start hour over the last WINDOW_DAYS days.
    const recent = sessions.filter((s) => nowMs - s.start < WINDOW_DAYS * DAY_MS);
    const hourCounts = new Map();
    recent.forEach((s) => {
      const h = new Date(s.start).getHours();
      hourCounts.set(h, (hourCounts.get(h) || 0) + 1);
    });
    const modalHour = [...hourCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    // Rest/streak: consecutive played days ending today (or yesterday if today
    // hasn't logged anything yet — the night is young).
    const playedDays = new Set(sessions.map((s) => dateKey(new Date(s.start))));
    let streak = 0;
    const cursor = new Date(now);
    if (!playedDays.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (playedDays.has(dateKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    const lastSession = sessions[sessions.length - 1];
    const daysSinceLast = Math.floor(
      (new Date(todayKey).getTime() - new Date(dateKey(new Date(lastSession.start))).getTime()) / DAY_MS
    );

    const focusLabel =
      last7.bands.deep > last7.bands.steady + last7.bands.hop
        ? 'mostly deep runs'
        : last7.bands.hop > last7.bands.steady + last7.bands.deep
          ? 'mostly short hops'
          : 'a mixed rhythm';

    return {
      today: {
        sessions: today.sessions,
        minutes: today.minutes,
        played: today.sessions > 0,
      },
      week: {
        days: last7.days,
        sessions: last7.sessions,
        minutes: last7.minutes,
        bands: last7.bands,
        topGame: last7.topGame,
        focusLabel,
      },
      weeklyNorm,
      typicalStartHour: modalHour,
      streak,
      daysSinceLast,
      totalSessions: sessions.length,
    };
  },
};

export default GamingVitalsService;
