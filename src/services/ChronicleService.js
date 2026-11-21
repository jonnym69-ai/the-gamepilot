/**
 * ChronicleService — "Your Chronicle", a biographer view of the recorded
 * session history plus a prologue reconstructed from imported launcher totals.
 *
 * Pure and deterministic: every sentence is gated on a computed fact, and
 * every number/name comes straight from the data. Sparse histories simply
 * produce fewer sentences — never filler. Sessions without timestamps still
 * count toward totals but cannot be assigned to a monthly chapter.
 */
import { getSessionMinutes, getSessionStartMs, getSessionTimestampMs } from './SessionRepository';
import { getBlendedPlaytimeMinutes, isNonGameTitle } from './gameClassification';
import { displayGameTitle } from '../utils/gameTitle';

const DAY_MS = 24 * 60 * 60 * 1000;

const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const CHAPTER_NUMERALS = [
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
  'Twenty',
];

const SMALL_WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
  'twenty',
];

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

const numWord = (n) => SMALL_WORDS[n] ?? String(Math.max(0, Math.round(Number(n) || 0)));

const countWords = (n, singular) => `${numWord(n)} ${singular}${n === 1 ? '' : 's'}`;

const capitalize = (text) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : text);

const joinList = (items = []) => {
  const list = items.filter(Boolean);
  if (list.length <= 1) return list.join('');
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  // Comma-named games ("Matrix, The Path of Neo") turn comma-joined lists into
  // mush — switch to middle dots when any item carries a comma.
  const separator = list.some((item) => item.includes(',')) ? ' · ' : ', ';
  return `${list.slice(0, -1).join(separator)} and ${list[list.length - 1]}`;
};

const ordinal = (day) => {
  const d = Number(day);
  if (!Number.isFinite(d)) return String(day);
  const mod100 = d % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${d}th`;
  switch (d % 10) {
    case 1:
      return `${d}st`;
    case 2:
      return `${d}nd`;
    case 3:
      return `${d}rd`;
    default:
      return `${d}th`;
  }
};

// 'July 13th, 2026' — full, book-style date.
const formatFullDate = (ms) => {
  const date = new Date(ms);
  if (!Number.isFinite(date.getTime())) return null;
  return `${MONTH_LABELS[date.getMonth()]} ${ordinal(date.getDate())}, ${date.getFullYear()}`;
};

const monthKeyOf = (ms) => {
  const date = new Date(ms);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Prose durations in the voice of the sample: small counts are spelled out
 * ('fourteen minutes', 'eight and a half hours'), large counts stay numeric
 * ('113 hours'). Returns null for zero/invalid so sentences can be gated.
 */
const durationWords = (minutes) => {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  if (total <= 0) return null;
  if (total < 60) {
    return total === 1 ? 'one minute' : `${numWord(total)} minutes`;
  }
  let hours = Math.floor(total / 60);
  const remainder = total - hours * 60;
  let half = false;
  if (remainder >= 45) hours += 1;
  else if (remainder >= 15) half = true;
  if (hours > 20) return `${Math.round(total / 60)} hours`;
  const head = half ? `${numWord(hours)} and a half` : numWord(hours);
  return `${head} hour${hours === 1 && !half ? '' : 's'}`;
};

// Share of a month's minutes as a phrase; floored buckets stay honest.
const sharePhrase = (share) => {
  if (!Number.isFinite(share) || share <= 0) return null;
  if (share >= 0.95) return 'nearly every recorded minute';
  if (share >= 0.85) return 'nine of every ten recorded minutes';
  if (share >= 0.7) return 'three of every four recorded minutes';
  if (share >= 0.55) return 'over half the recorded minutes';
  return `${Math.round(share * 100)}% of the recorded minutes`;
};

// ---------------------------------------------------------------------------
// Fact computation
// ---------------------------------------------------------------------------

const normalizeName = (value) => {
  const name = String(value || '').trim();
  return name || null;
};

const getGenres = (game) => {
  const raw = game?.genres || game?.genre || game?.genreNames || [];
  if (Array.isArray(raw)) return raw.map((g) => String(g).trim()).filter(Boolean);
  if (typeof raw === 'string') return raw.trim() ? [raw.trim()] : [];
  return [];
};

const toRecord = (entry) => {
  const startMs = getSessionStartMs(entry);
  const endMs = getSessionTimestampMs(entry);
  const name = normalizeName(entry?.gameName || entry?.gameId);
  return {
    name,
    // Raw `name` stays the match/group key; prose reads `displayName`.
    displayName: name ? displayGameTitle(name) : null,
    minutes: getSessionMinutes(entry),
    note: typeof entry?.note === 'string' ? entry.note.trim() : '',
    startMs,
    endMs,
    sortMs: startMs || endMs,
  };
};

const eventTime = (value) => {
  const ms = typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(ms) && ms > 0 ? ms : null;
};

const isLateNight = (record) => {
  const start = record.startMs || record.sortMs;
  if (!start) return false;
  const hour = new Date(start).getHours();
  return hour >= 0 && hour < 5;
};

const buildPerMonth = (dated) => {
  const byMonth = new Map();
  dated.forEach((record) => {
    const key = monthKeyOf(record.sortMs);
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key).push(record);
  });

  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, monthRecords]) => {
      const firstDate = new Date(monthRecords[0].sortMs);
      const minutes = monthRecords.reduce((sum, r) => sum + r.minutes, 0);

      const gameMap = new Map();
      monthRecords.forEach((record) => {
        // Launcher/utility processes (GOG Galaxy, Epic launcher…) are real
        // recorded minutes but not games — they never enter name surfaces.
        if (!record.name || isNonGameTitle(record.name)) return;
        const gameKey = record.name.toLowerCase();
        const entry = gameMap.get(gameKey) || {
          name: record.name,
          displayName: record.displayName,
          minutes: 0,
          sessions: 0,
        };
        entry.minutes += record.minutes;
        entry.sessions += 1;
        gameMap.set(gameKey, entry);
      });
      const topGames = [...gameMap.values()].sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name));
      const dominant = topGames[0] || null;

      let longestInMonth = null;
      monthRecords.forEach((record) => {
        if (record.minutes > 0 && (!longestInMonth || record.minutes > longestInMonth.minutes)) {
          longestInMonth = record;
        }
      });

      const firstRecord = monthRecords[0];
      const lastRecord = monthRecords[monthRecords.length - 1];

      return {
        month: key,
        label: MONTH_LABELS[firstDate.getMonth()],
        year: firstDate.getFullYear(),
        minutes,
        sessions: monthRecords.length,
        gameCount: gameMap.size,
        varietyCount: gameMap.size,
        isSingleGame: gameMap.size === 1,
        dominantGame: dominant
          ? {
              name: dominant.name,
              displayName: dominant.displayName,
              minutes: dominant.minutes,
              share: minutes > 0 ? dominant.minutes / minutes : 0,
            }
          : null,
        topGames,
        lateNightCount: monthRecords.filter(isLateNight).length,
        longestSession: longestInMonth
          ? {
              gameName: longestInMonth.name,
              displayName: longestInMonth.displayName,
              startedAt: longestInMonth.startMs || longestInMonth.endMs || null,
              minutes: longestInMonth.minutes,
            }
          : null,
        firstMs: firstRecord.sortMs,
        lastMs: lastRecord.sortMs,
        firstStartMs: firstRecord.startMs || firstRecord.sortMs,
        lastEndMs: lastRecord.endMs || lastRecord.sortMs,
        receipts: monthRecords.map((record) => ({
          gameName: record.name,
          displayName: record.displayName,
          startMs: record.startMs || record.sortMs,
          endMs: record.endMs || null,
          minutes: record.minutes,
        })),
      };
    });
};

const buildImportedTotals = (library) => {
  const played = (Array.isArray(library) ? library : [])
    .filter((game) => game && !isNonGameTitle(game))
    .map((game) => ({
      name: normalizeName(game.name || game.title),
      minutes: getBlendedPlaytimeMinutes(game),
      genres: getGenres(game),
    }))
    .filter((entry) => entry.minutes > 0);

  const totalMinutes = played.reduce((sum, entry) => sum + entry.minutes, 0);
  const topGames = played
    .filter((entry) => entry.name)
    .sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name))
    .slice(0, 3)
    .map((entry) => ({
      name: entry.name,
      displayName: displayGameTitle(entry.name),
      minutes: entry.minutes,
      genres: entry.genres,
    }));

  const genreMinutes = new Map();
  let genreCoveredMinutes = 0;
  played.forEach((entry) => {
    if (entry.genres.length === 0) return;
    genreCoveredMinutes += entry.minutes;
    entry.genres.forEach((genre) => {
      genreMinutes.set(genre, (genreMinutes.get(genre) || 0) + entry.minutes);
    });
  });
  const genreLean =
    totalMinutes > 0 && genreCoveredMinutes / totalMinutes > 0.6
      ? [...genreMinutes.entries()]
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
          .slice(0, 2)
          .map(([genre]) => genre)
      : null;

  return {
    topGames,
    totalMinutes,
    genreLean,
    gameCount: played.filter((entry) => entry.name).length,
  };
};

const buildNarrativeEvents = (records, library, eraHistory) => {
  const events = [];

  records.forEach((record) => {
    const at = eventTime(record.endMs || record.sortMs);
    if (!record.note || !at || !record.name || isNonGameTitle(record.name)) return;
    events.push({
      type: 'journal',
      at,
      name: record.name,
      displayName: record.displayName,
      text: record.note,
    });
  });

  (Array.isArray(library) ? library : []).forEach((game) => {
    const name = normalizeName(game?.name || game?.title);
    if (!name || isNonGameTitle(name)) return;
    (Array.isArray(game?.completionHistory) ? game.completionHistory : []).forEach((entry) => {
      const at = eventTime(entry?.timestamp);
      if (!at || !['beaten', 'completed', '100%', 'abandoned'].includes(entry?.status)) return;
      events.push({
        type: 'completion',
        at,
        name,
        displayName: displayGameTitle(name),
        status: entry.status,
      });
    });
  });

  const collapsedEras = [];
  (Array.isArray(eraHistory) ? eraHistory : [])
    .map((era) => ({ ...era, at: eventTime(era?.since) }))
    .filter((era) => era.at && era.name)
    .sort((a, b) => a.at - b.at)
    .forEach((era) => {
      if (collapsedEras[collapsedEras.length - 1]?.name === era.name) return;
      collapsedEras.push(era);
    });
  collapsedEras.forEach((era) => {
    events.push({
      type: 'era',
      at: era.at,
      name: era.name,
      gameName: era.topGame || null,
    });
  });

  return events.sort((a, b) => a.at - b.at);
};

const buildFacts = (records, library, eraHistory = []) => {
  const dated = records.filter((r) => r.sortMs > 0).sort((a, b) => a.sortMs - b.sortMs);
  const first = dated[0] || null;
  const last = dated[dated.length - 1] || null;

  const gameKeys = new Set();
  records.forEach((record) => {
    if (record.name && !isNonGameTitle(record.name)) gameKeys.add(record.name.toLowerCase());
  });

  let longest = null;
  records.forEach((record) => {
    if (record.minutes > 0 && (!longest || record.minutes > longest.minutes)) longest = record;
  });

  let biggestGapDays = 0;
  for (let i = 1; i < dated.length; i += 1) {
    const prevEnd = dated[i - 1].endMs || dated[i - 1].sortMs;
    const nextStart = dated[i].startMs || dated[i].sortMs;
    const gap = Math.floor((nextStart - prevEnd) / DAY_MS);
    if (gap > biggestGapDays) biggestGapDays = gap;
  }

  const narrativeEvents = buildNarrativeEvents(records, library, eraHistory);
  const perMonth = buildPerMonth(dated).map((month) => ({
    ...month,
    events: narrativeEvents.filter((event) => monthKeyOf(event.at) === month.month),
  }));

  return {
    firstSession: first
      ? {
          gameName: first.name,
          displayName: first.displayName,
          startedAt: first.startMs || first.endMs,
          minutes: first.minutes,
        }
      : null,
    lastSessionAt: last ? last.sortMs : null,
    totalSessions: records.length,
    totalMinutes: records.reduce((sum, r) => sum + r.minutes, 0),
    gameCount: gameKeys.size,
    daySpan: first && last ? Math.max(0, Math.round((last.sortMs - first.sortMs) / DAY_MS)) : 0,
    longestSession: longest
      ? {
          gameName: longest.name,
          displayName: longest.displayName,
          startedAt: longest.startMs || longest.endMs || null,
          minutes: longest.minutes,
        }
      : null,
    lateNightCount: records.filter(isLateNight).length,
    perMonth,
    narrativeEvents,
    biggestGapDays,
    importedTotals: buildImportedTotals(library),
  };
};

// ---------------------------------------------------------------------------
// Prose builders — every sentence is gated on its underlying fact
// ---------------------------------------------------------------------------

const buildPrologue = (importedTotals) => {
  if (!importedTotals || importedTotals.totalMinutes <= 0) {
    return { exists: false, text: null, isReconstruction: true };
  }

  const total = durationWords(importedTotals.totalMinutes);
  let text = 'Before the first recorded session, the launchers were already keeping count.';
  if (total) {
    text += ` They remember ${total}`;
    if (importedTotals.gameCount > 0) text += ` across ${countWords(importedTotals.gameCount, 'game')}`;
    const named = importedTotals.topGames;
    if (named.length === 1) {
      text += ` — most of it in ${named[0].displayName}`;
    } else if (named.length >= 2) {
      const leads = [`${named[0].displayName} at ${durationWords(named[0].minutes)}`].concat(
        named.slice(1).map((game) => `${game.displayName} at ${durationWords(game.minutes)}`)
      );
      text += ` — led by ${joinList(leads)}`;
    }
    text += '.';
  }
  if (importedTotals.genreLean?.length) {
    text += ` The record before the record leans toward ${joinList(importedTotals.genreLean)}.`;
  }

  return { exists: true, text, isReconstruction: true };
};

const shapeSentence = ({ month, prev, index, eventful = false }) => {
  const dominant = month.dominantGame;
  const domName = dominant?.displayName || null;
  const share = dominant?.share || 0;
  const shareDelta = prev?.dominantGame ? share - prev.dominantGame.share : 0;
  const varietyJump = prev ? month.varietyCount - prev.varietyCount : 0;

  if (index === 0) {
    if (month.varietyCount >= 4) {
      return `${month.label} was the sampling month — ${numWord(month.varietyCount)} different games passed through.`;
    }
    if (month.isSingleGame && domName) {
      return `${month.label} belonged entirely to ${domName} — ${durationWords(month.minutes) || 'no recorded time'} across ${countWords(month.sessions, 'session')}.`;
    }
    if (month.varietyCount > 0) {
      return `${month.label} logged ${countWords(month.sessions, 'session')} across ${countWords(month.varietyCount, 'game')}${month.minutes > 0 ? ` — ${durationWords(month.minutes)} in all` : ''}.`;
    }
    return `${month.label} logged ${countWords(month.sessions, 'session')}${month.minutes > 0 ? ` — ${durationWords(month.minutes)} in all` : ''}.`;
  }

  if (eventful && domName) {
    if (month.isSingleGame && share > 0.95) {
      return `${month.label} belonged entirely to ${domName}.`;
    }
    if (shareDelta >= 0.3) {
      return `${month.label} drew you deeper into ${domName}.`;
    }
    if (shareDelta >= 0.15) {
      return `${domName} took a firmer hold in ${month.label}.`;
    }
    if (varietyJump >= 3) {
      return `The edges returned in ${month.label} as more games joined the record.`;
    }
    if (shareDelta <= -0.25) {
      return `${month.label} opened up beyond ${prev?.dominantGame?.displayName || domName}.`;
    }
    const names = month.topGames.slice(0, 3).map((game) => game.displayName);
    if (names.length > 1) {
      return `${month.label} moved between ${joinList(names)}.`;
    }
  }

  if (month.isSingleGame && domName && share > 0.95) {
    return `${month.label} went further — ${durationWords(month.minutes) || 'recorded time'} of ${domName} and not one recorded minute anywhere else.`;
  }
  if (domName && shareDelta >= 0.3) {
    return `The consolidation came next. ${month.label}: ${durationWords(month.minutes) || 'recorded time'}, ${sharePhrase(share)} inside ${domName}.`;
  }
  if (domName && shareDelta >= 0.15) {
    return `${month.label} tightened its focus — ${sharePhrase(share)} inside ${domName}, ${durationWords(month.minutes) || 'recorded time'} in all.`;
  }
  if (varietyJump >= 3) {
    return `The edges returned in ${month.label} — ${numWord(month.varietyCount)} different games passed through${domName ? `, led by ${domName}` : ''}.`;
  }
  if (domName && shareDelta <= -0.25) {
    return `${month.label} opened up — ${domName}'s share slipped to ${sharePhrase(share)} as other games drew time.`;
  }
  if (month.varietyCount > 0) {
    return `${month.label} logged ${countWords(month.sessions, 'session')} across ${countWords(month.varietyCount, 'game')}${month.minutes > 0 ? ` — ${durationWords(month.minutes)} in all` : ''}${domName ? `, led by ${domName}` : ''}.`;
  }
  return `${month.label} logged ${countWords(month.sessions, 'session')}${month.minutes > 0 ? ` — ${durationWords(month.minutes)} in all` : ''}.`;
};

const buildOthersSentence = (month) => {
  if (!month.dominantGame) return null;
  // When no game truly dominates (< 50%), the "others" list leads with the
  // month's biggest game — the sampling-month style. When one does, the shape
  // sentence already named it and the list covers the rest.
  const others = month.dominantGame.share >= 0.5 ? month.topGames.slice(1) : month.topGames.slice(0, 4);
  const notable = others.filter((g) => g.sessions >= 2 || g.minutes > 120).slice(0, 3);
  const oneOffs = others.filter((g) => !notable.includes(g) && g.sessions === 1).slice(0, 4);

  const bits = notable
    .map((game) => (durationWords(game.minutes) ? `${durationWords(game.minutes)} in ${game.displayName}` : null))
    .filter(Boolean);
  if (bits.length > 0 && oneOffs.length > 0) {
    const singleSession = oneOffs.length === 1 ? 'a single recorded session for' : 'a single recorded session each for';
    return `${capitalize(joinList(bits))}, and ${singleSession} ${joinList(oneOffs.map((g) => g.displayName))}.`;
  }
  if (bits.length > 0) return `${capitalize(joinList(bits))}.`;
  if (oneOffs.length === 1) return `A single recorded session went to ${oneOffs[0].displayName}.`;
  if (oneOffs.length > 1) return `A single recorded session each for ${joinList(oneOffs.map((g) => g.displayName))}.`;
  return null;
};

const buildLongestSentence = (month, facts) => {
  const longest = month.longestSession;
  if (!longest || longest.minutes < 60 || !longest.startedAt) return null;
  // The fact stays honest in `facts`/`month`, but a launcher process is never
  // narrated as a game — omit the sentence rather than name it.
  if (isNonGameTitle(longest.gameName)) return null;
  const date = formatFullDate(longest.startedAt);
  if (!date) return null;
  const isRecord =
    facts.longestSession &&
    longest.minutes === facts.longestSession.minutes &&
    longest.startedAt === facts.longestSession.startedAt;
  if (isRecord) {
    return `On ${date} came the longest sitting on record — ${durationWords(longest.minutes)}${longest.displayName ? ` without leaving ${longest.displayName}` : ''}.`;
  }
  if (longest.minutes >= 120) {
    return `The month's longest sitting ran ${durationWords(longest.minutes)}${longest.displayName ? ` in ${longest.displayName}` : ''} on ${date}.`;
  }
  return null;
};

const buildEventParagraph = (month, dated) => {
  return (month.events || [])
    .filter((event) => event.type !== 'journal')
    .map((event) => {
      const date = formatFullDate(event.at);
      if (!date) return null;
      if (event.type === 'era') return `On ${date}, ${event.name} began.`;
      if (event.type !== 'completion') return null;

      const gameKey = event.name.toLowerCase();
      const sessionCount = dated.filter(
        (record) => record.name?.toLowerCase() === gameKey && record.sortMs <= event.at && !isNonGameTitle(record.name)
      ).length;
      const after = sessionCount > 0 ? ` after ${countWords(sessionCount, 'recorded session')}` : '';
      if (event.status === 'abandoned') return `On ${date}, you shelved ${event.displayName}${after}.`;
      const status =
        event.status === '100%' ? 'as 100% complete' : event.status === 'completed' ? 'as completed' : 'beaten';
      return `On ${date}, you marked ${event.displayName} ${status}${after}.`;
    })
    .filter(Boolean)
    .join(' ');
};

const chapterTitle = ({ month, prev, index }) => {
  const numeral = CHAPTER_NUMERALS[index] || String(index + 1);
  const events = month.events || [];
  const completion = [...events].reverse().find((event) => event.type === 'completion');
  const era = events.find((event) => event.type === 'era');
  let body;
  if (index === 0) body = 'The Record Begins';
  else if (completion) {
    body =
      completion.status === 'abandoned'
        ? `Walking Away From ${completion.displayName}`
        : completion.status === '100%'
          ? `${completion.displayName}, 100%`
          : `Finishing ${completion.displayName}`;
  } else if (era) {
    body = era.name;
  } else if (month.isSingleGame && month.dominantGame && month.dominantGame.share > 0.95) {
    body = `${month.dominantGame.displayName} and Nothing Else`;
  } else if (month.dominantGame && prev?.dominantGame && month.dominantGame.share - prev.dominantGame.share >= 0.15) {
    body = `The ${month.dominantGame.displayName} Month`;
  } else if (prev && month.varietyCount - prev.varietyCount >= 3) {
    body = 'The Edges Return';
  } else if (month.dominantGame && prev?.dominantGame && prev.dominantGame.share - month.dominantGame.share >= 0.25) {
    body = 'The Widening';
  } else {
    body = month.label;
  }
  return `Chapter ${numeral} — ${body}`;
};

const chapterSubtitle = (month) => {
  const firstDate = new Date(month.firstMs);
  const lastDate = new Date(month.lastMs);
  const range =
    firstDate.getDate() === lastDate.getDate()
      ? ordinal(firstDate.getDate())
      : `${ordinal(firstDate.getDate())}–${ordinal(lastDate.getDate())}`;
  return `${month.label} ${month.year} · ${range}`;
};

const buildChapters = (facts, dated, now) => {
  const months = facts.perMonth;
  if (!months.length) return [];

  // Overall dominant across the whole record — for the verified "barely
  // stopped since" line on chapter one. Non-game titles can't be "the world
  // the player keeps returning to", so they are excluded here too.
  const totals = new Map();
  dated.forEach((record) => {
    if (!record.name || isNonGameTitle(record.name)) return;
    const key = record.name.toLowerCase();
    const entry = totals.get(key) || { name: record.name, minutes: 0 };
    entry.minutes += record.minutes;
    totals.set(key, entry);
  });
  const overallTop =
    [...totals.values()].sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name))[0] || null;
  const dominantMonthCount = overallTop ? months.filter((m) => m.dominantGame?.name === overallTop.name).length : 0;

  return months.map((month, index) => {
    const prev = index > 0 ? months[index - 1] : null;
    const isCurrent = monthKeyOf(now) === month.month;
    month.gapBeforeDays = prev ? Math.max(0, Math.floor((month.firstStartMs - prev.lastEndMs) / DAY_MS)) : 0;

    const paragraphs = [];

    if (index === 0) {
      const first = facts.firstSession;
      const name = first?.gameName && !isNonGameTitle(first.gameName) ? first.displayName : 'an untracked game';
      const duration = first ? durationWords(first.minutes) : null;
      let opening = first
        ? duration
          ? `The chronicle opens on ${formatFullDate(first.startedAt)}, with ${duration} of ${name} — a quiet first entry.`
          : `The chronicle opens on ${formatFullDate(first.startedAt)}, with ${name} — a quiet first entry.`
        : null;
      // The "followed by" beat belongs to the first real game that is not the
      // opener — skip unnamed and launcher-process sessions.
      const second = first
        ? dated
            .slice(1)
            .find(
              (record) =>
                record.name &&
                !isNonGameTitle(record.name) &&
                record.name.toLowerCase() !== String(first.gameName || '').toLowerCase()
            ) || null
        : null;
      if (first && second && second.name && second.name !== first.gameName) {
        const gapMinutes = Math.round((second.startMs - first.startedAt) / 60000);
        if (gapMinutes > 0 && gapMinutes <= 24 * 60) {
          opening += ` ${capitalize(durationWords(gapMinutes))} later, ${second.displayName} launched for the first time.`;
        } else if (second.sortMs > first.startedAt) {
          opening += ` ${second.displayName} followed on ${formatFullDate(second.startMs || second.sortMs)}.`;
        }
        if (
          overallTop &&
          second.name.toLowerCase() === overallTop.name.toLowerCase() &&
          months.length >= 2 &&
          dominantMonthCount / months.length >= 0.5
        ) {
          opening += ' It has barely stopped since.';
        }
      }
      if (opening) paragraphs.push(opening);
    } else {
      // Later chapters lead with the gap (when the record went quiet) and the
      // month's shape — consolidation, returning edges, one world, or a plain tally.
      const shape = [];
      if (month.gapBeforeDays >= 7) {
        shape.push(`The record had gone quiet for ${numWord(month.gapBeforeDays)} days before this.`);
      }
      shape.push(shapeSentence({ month, prev, index, eventful: (month.events || []).length > 0 }));
      paragraphs.push(shape.join(' '));
    }

    // Paragraph two is the month's detail: shape summary (chapter one only —
    // later chapters carry it in paragraph one), then the notable games, the
    // longest sitting and the late nights, each gated on its fact.
    const details = [];
    const eventParagraph = buildEventParagraph(month, dated);
    if (eventParagraph) details.push(eventParagraph);
    if (index === 0) details.push(shapeSentence({ month, prev, index, eventful: (month.events || []).length > 0 }));
    const othersSentence = buildOthersSentence(month);
    if (othersSentence) details.push(othersSentence);
    const longestSentence = buildLongestSentence(month, facts);
    if (longestSentence) details.push(longestSentence);
    if (month.lateNightCount > 0) {
      details.push(`${capitalize(countWords(month.lateNightCount, 'session'))} began between midnight and 5am.`);
    }
    if (details.length > 0) paragraphs.push(details.slice(0, 4).join(' '));

    if (isCurrent) {
      paragraphs.push('This chapter is still being written.');
    }

    return {
      key: month.month,
      title: chapterTitle({ month, prev, index }),
      subtitle: chapterSubtitle(month),
      paragraphs,
      journalEntries: (month.events || []).filter((event) => event.type === 'journal'),
      dominantGame: month.dominantGame,
      month,
      isCurrent,
    };
  });
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build the chronicle from session history + library.
 * @param {Array} sessions - SessionRepository.getSessionHistory() entries
 * @param {Array} library - library games (name/artwork/genres/imported playtime)
 * @returns {{ generatedAt: string, prologue: object, chapters: Array, facts: object }}
 */
export const buildChronicle = (sessions, library, options = {}) => {
  const records = (Array.isArray(sessions) ? sessions : [])
    .filter((entry) => entry && typeof entry === 'object')
    .map(toRecord);

  const facts = buildFacts(records, library, options.eraHistory);
  const dated = records.filter((r) => r.sortMs > 0).sort((a, b) => a.sortMs - b.sortMs);
  const prologue = buildPrologue(facts.importedTotals);
  const chapters = dated.length === 0 ? [] : buildChapters(facts, dated, eventTime(options.now) || Date.now());

  return {
    generatedAt: new Date().toISOString(),
    prologue,
    chapters,
    facts,
  };
};

const ChronicleService = { buildChronicle };

export default ChronicleService;
