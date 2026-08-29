/**
 * IdentityShiftService — detects when the user's gaming persona changes over
 * time and generates a roast about the shift. Stores quarterly persona snapshots
 * and compares them to detect archetype/genre changes.
 *
 * Built on top of GamingPersonaService which can compute personas for any
 * time window via getPersona({ windowDays }).
 */

import GamingPersonaService from './GamingPersonaService';
import StorageService from './StorageService';

const SNAPSHOTS_KEY = 'gamepilot-persona-snapshots';
const LAST_SHIFT_KEY = 'gamepilot-identity-shift-last-toast';

// ---------------------------------------------------------------------------
// Quarter helpers
// ---------------------------------------------------------------------------

const getQuarterKey = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth();
  const quarter = Math.floor(month / 3) + 1;
  return `${year}-Q${quarter}`;
};

const getPreviousQuarterKey = (quarterKey) => {
  const match = quarterKey.match(/^(\d{4})-Q([1-4])$/);
  if (!match) return null;
  const year = Number(match[1]);
  const quarter = Number(match[2]);
  if (quarter === 1) return `${year - 1}-Q4`;
  return `${year}-Q${quarter - 1}`;
};

// ---------------------------------------------------------------------------
// Snapshot storage
// ---------------------------------------------------------------------------

const getSnapshots = () => {
  try {
    const raw = StorageService.getString(SNAPSHOTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveSnapshots = (snapshots) => {
  StorageService.setString(SNAPSHOTS_KEY, JSON.stringify(snapshots));
};

/**
 * Store a persona snapshot for the current quarter.
 * Called periodically (e.g. on session end).
 */
export const storeSnapshot = () => {
  const quarterKey = getQuarterKey();
  const snapshots = getSnapshots();

  // Don't re-snapshot if we already have one for this quarter
  if (snapshots[quarterKey]) return snapshots[quarterKey];

  try {
    const identity = GamingPersonaService.getPublicIdentity();
    const persona = GamingPersonaService.getPersona();

    const snapshot = {
      quarterKey,
      timestamp: Date.now(),
      archetypeId: persona?.primaryPersona?.id || null,
      archetypeLabel: identity?.label || null,
      roast: identity?.roast || null,
      dominantGenre: persona?.signals?.dominantGenre || null,
      topGame: persona?.topGames?.[0]?.name || null,
      sessionPattern: persona?.signals?.sessionPattern || null,
      peakHour: persona?.signals?.peakHour ?? null,
      totalPlaytime: persona?.signals?.totalPlaytime || 0
    };

    snapshots[quarterKey] = snapshot;
    saveSnapshots(snapshots);
    return snapshot;
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// Shift detection
// ---------------------------------------------------------------------------

/**
 * Compare current persona to the previous quarter's snapshot.
 * Returns { fromSnapshot, toSnapshot, shifts: [], roast } or null if no shift.
 */
export const detectIdentityShift = () => {
  const currentQuarter = getQuarterKey();
  const prevQuarter = getPreviousQuarterKey(currentQuarter);
  if (!prevQuarter) return null;

  const snapshots = getSnapshots();
  const prevSnapshot = snapshots[prevQuarter];

  // Need a previous snapshot to compare against
  if (!prevSnapshot || !prevSnapshot.archetypeId) return null;

  // Get current persona
  let currentSnapshot;
  try {
    const identity = GamingPersonaService.getPublicIdentity();
    const persona = GamingPersonaService.getPersona();
    currentSnapshot = {
      quarterKey: currentQuarter,
      archetypeId: persona?.primaryPersona?.id || null,
      archetypeLabel: identity?.label || null,
      dominantGenre: persona?.signals?.dominantGenre || null,
      topGame: persona?.topGames?.[0]?.name || null,
      sessionPattern: persona?.signals?.sessionPattern || null
    };
  } catch {
    return null;
  }

  if (!currentSnapshot.archetypeId) return null;

  // Same archetype, no shift
  if (currentSnapshot.archetypeId === prevSnapshot.archetypeId) return null;

  // Detect what changed
  const shifts = [];

  if (currentSnapshot.archetypeId !== prevSnapshot.archetypeId) {
    shifts.push({
      type: 'archetype',
      from: prevSnapshot.archetypeLabel,
      to: currentSnapshot.archetypeLabel
    });
  }

  if (prevSnapshot.dominantGenre && currentSnapshot.dominantGenre &&
      currentSnapshot.dominantGenre !== prevSnapshot.dominantGenre) {
    shifts.push({
      type: 'genre',
      from: prevSnapshot.dominantGenre,
      to: currentSnapshot.dominantGenre
    });
  }

  if (prevSnapshot.sessionPattern && currentSnapshot.sessionPattern &&
      currentSnapshot.sessionPattern !== prevSnapshot.sessionPattern) {
    shifts.push({
      type: 'pattern',
      from: prevSnapshot.sessionPattern,
      to: currentSnapshot.sessionPattern
    });
  }

  if (shifts.length === 0) return null;

  // Generate roast
  const roast = generateShiftRoast(shifts, prevSnapshot, currentSnapshot);

  return {
    fromSnapshot: prevSnapshot,
    toSnapshot: currentSnapshot,
    shifts,
    roast
  };
};

// ---------------------------------------------------------------------------
// Roast generation
// ---------------------------------------------------------------------------

const generateShiftRoast = (shifts, fromSnap, toSnap) => {
  const archetypeShift = shifts.find((s) => s.type === 'archetype');
  const genreShift = shifts.find((s) => s.type === 'genre');
  const patternShift = shifts.find((s) => s.type === 'pattern');

  if (archetypeShift) {
    const roasts = [
      `You went from ${archetypeShift.from} to ${archetypeShift.to} this quarter. You changed. We noticed.`,
      `Last quarter you were ${archetypeShift.from}. Now you're ${archetypeShift.to}. What happened?`,
      `Identity shift detected: ${archetypeShift.from} → ${archetypeShift.to}. The transformation is complete.`,
      `You were ${archetypeShift.from}. Now you're ${archetypeShift.to}. The old you would be concerned.`
    ];
    let roast = roasts[Math.floor(Date.now() / 1000) % roasts.length];

    if (genreShift) {
      roast += ` ${genreShift.from} was your life. Now it's all ${genreShift.to}.`;
    }
    return roast;
  }

  if (genreShift) {
    return `${genreShift.from} was your whole personality last quarter. Now it's ${genreShift.to}. Consistency is overrated.`;
  }

  if (patternShift) {
    const patternRoasts = {
      'long->short': 'You used to play in long marathons. Now it is quick bursts. Adulting?',
      'short->long': 'You used to play in short bursts. Now you are marathoning. Free time acquired?',
      'long->medium': 'Marathon sessions became moderate sittings. Restraint noted.',
      'medium->long': 'Moderate sittings became marathons. Restraint abandoned.'
    };
    const key = `${patternShift.from}->${patternShift.to}`;
    return patternRoasts[key] || `Your session pattern shifted from ${patternShift.from} to ${patternShift.to}. We see you evolving.`;
  }

  return 'Your gaming identity shifted this quarter. GamePilot noticed. GamePilot always notices.';
};

// ---------------------------------------------------------------------------
// Toast — fires once per quarter when a shift is detected
// ---------------------------------------------------------------------------

/**
 * Check for identity shift and return toast message if one is detected.
 * Throttled to once per quarter.
 */
export const checkIdentityShiftToast = () => {
  const shift = detectIdentityShift();
  if (!shift) return null;

  const currentQuarter = getQuarterKey();
  const lastToasted = StorageService.getString(LAST_SHIFT_KEY);

  // Already toasted this quarter
  if (lastToasted === currentQuarter) return null;

  StorageService.setString(LAST_SHIFT_KEY, currentQuarter);

  return {
    message: shift.roast,
    fromLabel: shift.fromSnapshot.archetypeLabel,
    toLabel: shift.toSnapshot.archetypeLabel,
    quarter: currentQuarter
  };
};

/**
 * Get all stored persona snapshots for the identity evolution timeline.
 */
export const getSnapshotHistory = () => {
  const snapshots = getSnapshots();
  return Object.values(snapshots).sort((a, b) => a.quarterKey.localeCompare(b.quarterKey));
};

const IdentityShiftService = {
  storeSnapshot,
  detectIdentityShift,
  checkIdentityShiftToast,
  getSnapshotHistory
};

export default IdentityShiftService;
