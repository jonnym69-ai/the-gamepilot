import StorageService from './StorageService';

/**
 * Enrichment for owned-game lists:
 *  - giveaway-observation memory: every giveaway the radar has ever shown is
 *    kept in a small persistent store, so owned games can be tagged
 *    "Previously offered free on …" — an observed offer is evidence the offer
 *    existed, never that the user claimed it.
 *  - duplicate detection: exact-title matches across launchers get
 *    `alsoOwnedOn` ("Same title on …"); looser edition matches get
 *    `relatedOwnedOn` ("Possible other edition on …").
 * Pure local computation — no network.
 */

const MEMORY_KEY = 'freebieMemoryV1';
const MAX_MEMORY = 800;

// Words that don't distinguish editions of the same underlying game.
const EDITION_TOKENS = new Set([
  'the',
  'a',
  'definitive',
  'complete',
  'enhanced',
  'anniversary',
  'remastered',
  'remaster',
  'ultimate',
  'deluxe',
  'special',
  'collection',
  'hd',
  'vr',
  'edition',
  'version',
  'cut',
  'redux',
  'reload',
  'overhaul',
  'goty',
]);

const PHRASE_EDITIONS = /\b(game of the year|director'?s cut|collector'?s edition)\b/g;

/** Aggressive match key: edition/marketing words removed so e.g.
 * "Dishonored: Definitive Edition" (Epic) matches "Dishonored" (Steam).
 * Kept for the legacy freebieMemoryV1 store and the "possible other edition"
 * hint — it must never assert two entries are the same game. */
const matchKeyFor = (title) =>
  String(title || '')
    .toLowerCase()
    .replace(/[®™©]/g, '')
    .replace(PHRASE_EDITIONS, ' ')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((token) => token && !EDITION_TOKENS.has(token))
    .join(' ')
    .trim();

/** Strict match key: punctuation/articles normalized but edition words kept —
 * "Dishonored" and "Dishonored: Definitive Edition" stay distinct. */
const exactTitleKey = (title) =>
  String(title || '')
    // Strip trademark marks BEFORE NFKC — ™ would otherwise decompose to "TM"
    // and break equality with the unmarked title.
    .replace(/[®™©]/g, '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/,\s*(the|an|a)\s*$/, '')
    .replace(/^(the|an|a)\s+/, '')
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

const readMemory = () => {
  const stored = StorageService.get(MEMORY_KEY, {});
  return stored && typeof stored === 'object' ? stored : {};
};

const writeMemory = (memory) => {
  const entries = Object.entries(memory);
  if (entries.length > MAX_MEMORY) {
    entries.sort((a, b) => (b[1].seenAt || 0) - (a[1].seenAt || 0));
    memory = Object.fromEntries(entries.slice(0, MAX_MEMORY));
  }
  StorageService.set(MEMORY_KEY, memory);
};

const giveawayPlatform = (game) =>
  String(game?.platform || game?.source || '')
    .split(',')
    .map((token) => token.trim())
    .filter((token) => token && token !== 'PC' && token !== 'DRM-Free')
    .join(' + ') || null;

/**
 * Fold a batch of radar games (Epic offers, GamerPower giveaways, store
 * freebies) into the persistent freebie memory. Idempotent — call it every
 * time a radar fetch succeeds.
 */
const recordSeenGiveaways = (games) => {
  if (!Array.isArray(games) || games.length === 0) return;
  const memory = readMemory();
  let changed = false;
  for (const game of games) {
    const key = matchKeyFor(game?.title || game?.name);
    if (!key) continue;
    const platform = giveawayPlatform(game);
    const endDate = Date.parse(game?.endDate);
    const existing = memory[key];
    // Keep the earliest-seen record of an offer; refresh artwork-free fields.
    if (!existing) {
      memory[key] = {
        title: String(game.title || game.name),
        platform: platform || 'a giveaway',
        endDate: Number.isFinite(endDate) ? new Date(endDate).toISOString() : null,
        seenAt: Date.now(),
      };
      changed = true;
    } else if (
      platform &&
      existing.platform !== platform &&
      exactTitleKey(existing.title) === exactTitleKey(game.title || game.name)
    ) {
      existing.platform = platform;
      changed = true;
    }
  }
  if (changed) writeMemory(memory);
};

const labelForSource = (source) => ({ steam: 'Steam', epic: 'Epic', gog: 'GOG', itch: 'itch.io' })[source] || source;

/**
 * Returns the input array (new objects) with per-game enrichment:
 *  - alsoOwnedOn: ['Epic'] — other launcher sources owning the exact same
 *    normalized title (still not proof it is the same SKU/DLC bundle).
 *  - relatedOwnedOn: ['Epic'] — same loose edition-stripped key but different
 *    exact title: a possible other edition, never implied equivalent.
 *  - freebie: { platform, endDate } — a remembered giveaway whose stored title
 *    exact-matches this game's title. Seeing an offer is not claim evidence;
 *    seenAt is only the day the radar observed it.
 *  - probableFreebie: always false — "Epic + never played" used to guess at
 *    weekly claims and overclaimed; kept on the shape for compatibility.
 */
const enrichGames = (games) => {
  if (!Array.isArray(games) || games.length === 0) return [];
  const memory = readMemory();
  const looseBuckets = new Map();
  const exactBuckets = new Map();
  games.forEach((game) => {
    const looseKey = matchKeyFor(game?.name || game?.title);
    if (looseKey) {
      const bucket = looseBuckets.get(looseKey) || [];
      bucket.push(game);
      looseBuckets.set(looseKey, bucket);
    }
    const exactKey = exactTitleKey(game?.name || game?.title);
    if (exactKey) {
      const bucket = exactBuckets.get(exactKey) || [];
      bucket.push(game);
      exactBuckets.set(exactKey, bucket);
    }
  });
  const otherSourceLabels = (bucket, game, extraFilter = () => true) => [
    ...new Set(
      bucket
        .filter((g) => g !== game && g.source && g.source !== game.source && extraFilter(g))
        .map((g) => labelForSource(g.source))
    ),
  ];
  return games.map((game) => {
    const looseKey = matchKeyFor(game?.name || game?.title);
    const exactKey = exactTitleKey(game?.name || game?.title);
    const alsoOwnedOn = exactKey ? otherSourceLabels(exactBuckets.get(exactKey) || [], game) : [];
    const relatedOwnedOn = looseKey
      ? otherSourceLabels(
          looseBuckets.get(looseKey) || [],
          game,
          (g) => exactTitleKey(g?.name || g?.title) !== exactKey
        ).filter((label) => !alsoOwnedOn.includes(label))
      : [];
    const seen = looseKey ? memory[looseKey] : null;
    const freebie =
      seen && exactKey && exactTitleKey(seen.title) === exactKey
        ? { platform: seen.platform, endDate: seen.endDate, seenAt: seen.seenAt }
        : null;
    return {
      ...game,
      alsoOwnedOn,
      relatedOwnedOn,
      freebie,
      probableFreebie: false,
    };
  });
};

const OwnedEnrichmentService = { matchKeyFor, exactTitleKey, recordSeenGiveaways, enrichGames };

export default OwnedEnrichmentService;
