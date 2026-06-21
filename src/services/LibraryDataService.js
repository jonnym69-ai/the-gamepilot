import { getBrandPlatform } from './PlatformBranding';
import { getMoodForGame, isValidMood } from '../constants/GenresMoods';

const normalizeTrackedNumber = (value) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0;
};

const normalizePlatformName = (platform) => {
  const normalizedPlatform = String(platform || '').trim();
  if (!normalizedPlatform) {
    return 'Unknown';
  }

  const lowerPlatform = normalizedPlatform.toLowerCase();
  const compactPlatform = lowerPlatform.replace(/[^a-z0-9]+/g, '');
  if (lowerPlatform === 'origin') return 'EA';
  if (lowerPlatform === 'ea app') return 'EA';
  if (lowerPlatform === 'uplay') return 'Ubisoft';
  if (lowerPlatform === 'ubisoft connect') return 'Ubisoft';
  if (lowerPlatform === 'battlenet') return 'Battle.net';
  if (lowerPlatform === 'riot games') return 'Riot';
  if (compactPlatform === 'riotgames') return 'Riot';
  if (compactPlatform === 'riotclient') return 'Riot';
  if (lowerPlatform === 'battlestate games') return 'BSG';
  if (compactPlatform === 'battlestategames') return 'BSG';
  if (compactPlatform === 'curseforge') return 'CurseForge';
  if (compactPlatform === 'curseforgeapp') return 'CurseForge';
  if (compactPlatform === 'overwolfcurseforge') return 'CurseForge';
  if (compactPlatform === 'emulated') return 'Emulated';
  if (compactPlatform === 'emulator') return 'Emulated';
  if (compactPlatform === 'emulation') return 'Emulated';
  if (lowerPlatform === 'playstation brand') return 'PlayStation';
  return normalizedPlatform;
};

const normalizeBrandPlatformName = (brandPlatform, platform, game = {}) => {
  const normalizedBrandPlatform = String(brandPlatform || '').trim();
  if (normalizedBrandPlatform) {
    return normalizePlatformName(normalizedBrandPlatform);
  }

  const inferredBrandPlatform = getBrandPlatform({
    developer: game?.developer || game?.developers || '',
    publisher: game?.publisher || game?.publishers || '',
    gameName: game?.name || '',
    tags: Array.isArray(game?.tags) ? game.tags : []
  });
  if (inferredBrandPlatform) {
    return normalizePlatformName(inferredBrandPlatform);
  }

  const normalizedPlatform = normalizePlatformName(platform);
  return normalizedPlatform === 'PlayStation' ? 'PlayStation' : null;
};

const normalizeLastPlayedValue = (lastPlayedValue) => {
  if (typeof lastPlayedValue === 'number' && Number.isFinite(lastPlayedValue)) {
    return lastPlayedValue;
  }

  if (typeof lastPlayedValue === 'string') {
    const parsedTimestamp = Date.parse(lastPlayedValue);
    return Number.isNaN(parsedTimestamp) ? null : parsedTimestamp;
  }

  return null;
};

const mergePlaytimeBucket = (existingBucket = {}, incomingBucket = {}) => ({
  ...(existingBucket || {}),
  ...(incomingBucket || {})
});

/**
 * Canonical key for cross-launcher deduplication.
 *
 * Conservative: only strips trademark/registered/copyright symbols and
 * non-alphanumeric characters, then lowercases. Does NOT strip edition
 * suffixes ("GOTY", "Definitive Edition", etc.) because those usually
 * mark genuinely different SKUs the user purchased separately. Better
 * to under-merge than to incorrectly fuse two distinct purchases.
 *
 * Returns null when the resulting key would be empty so the caller can
 * fall back to exact-name matching for edge cases (e.g. names made
 * entirely of punctuation).
 */
const getCanonicalGameKey = (game) => {
  const rawName = typeof game?.name === 'string' ? game.name : '';
  const stripped = rawName
    .replace(/[\u2122\u00ae\u00a9]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
  return stripped.length > 0 ? stripped : null;
};

/**
 * Returns the launch sources for a game. Backfills from legacy
 * `platform` + `appid` fields when `launchSources` is absent so older
 * library data continues to work without a migration step.
 */
const getLaunchSources = (game) => {
  if (Array.isArray(game?.launchSources) && game.launchSources.length > 0) {
    return game.launchSources
      .filter((source) => source && typeof source === 'object' && source.platform)
      .map((source) => ({
        platform: normalizePlatformName(source.platform),
        appid: source.appid || null
      }));
  }

  if (game?.platform) {
    return [{
      platform: normalizePlatformName(game.platform),
      appid: game.appid || null
    }];
  }

  return [];
};

const mergeLaunchSources = (existingSources = [], incomingSources = []) => {
  const seen = new Map();
  [...existingSources, ...incomingSources].forEach((source) => {
    if (!source || !source.platform) {
      return;
    }
    const key = `${source.platform}::${source.appid || ''}`;
    if (!seen.has(key)) {
      seen.set(key, { platform: source.platform, appid: source.appid || null });
    }
  });
  return Array.from(seen.values());
};

const normalizeGameLibraryEntry = (game) => {
  if (!game || typeof game !== 'object') {
    return null;
  }

  const resolvedTimePlayed = Math.max(
    normalizeTrackedNumber(game?.time_played),
    normalizeTrackedNumber(game?.playtime?.total)
  );

  // Always re-derive mood from genres to ensure canonical scoring is applied.
  // This guarantees the weighted genre→mood system is the single source of truth.
  const derivedMood = getMoodForGame(game?.genres || []) || (isValidMood(game?.mood) ? game.mood : null);

  return {
    ...game,
    platform: normalizePlatformName(game?.platform),
    brandPlatform: normalizeBrandPlatformName(game?.brandPlatform, game?.platform, game),
    launchSources: getLaunchSources(game),
    mood: derivedMood,
    time_played: resolvedTimePlayed,
    launch_count: normalizeTrackedNumber(game?.launch_count),
    last_played: normalizeLastPlayedValue(game?.last_played),
    userRating: game?.userRating !== undefined ? Number(game.userRating) : null,
    replayIntent: game?.replayIntent || null,
    playtime: {
      total: resolvedTimePlayed,
      daily: { ...(game?.playtime?.daily || {}) },
      weekly: { ...(game?.playtime?.weekly || {}) },
      monthly: { ...(game?.playtime?.monthly || {}) },
      yearly: { ...(game?.playtime?.yearly || {}) }
    }
  };
};

const normalizeLibraryData = (libraryData) => (
  Array.isArray(libraryData)
    ? libraryData.map(normalizeGameLibraryEntry).filter(Boolean)
    : []
);

const getMostRecentlyPlayedGame = (libraryData = []) => (
  normalizeLibraryData(libraryData).reduce((mostRecentGame, currentGame) => {
    const currentLastPlayed = normalizeLastPlayedValue(currentGame?.last_played) || 0;
    const mostRecentLastPlayed = normalizeLastPlayedValue(mostRecentGame?.last_played) || 0;

    return currentLastPlayed > mostRecentLastPlayed ? currentGame : mostRecentGame;
  }, null)
);

const mergeTrackedGameData = (existingGame, incomingGame) => {
  const normalizedExistingGame = normalizeGameLibraryEntry(existingGame) || {};
  const normalizedIncomingGame = normalizeGameLibraryEntry(incomingGame) || {};
  const resolvedTimePlayed = Math.max(
    normalizeTrackedNumber(normalizedExistingGame.time_played),
    normalizeTrackedNumber(normalizedIncomingGame.time_played)
  );
  const resolvedLaunchCount = Math.max(
    normalizeTrackedNumber(normalizedExistingGame.launch_count),
    normalizeTrackedNumber(normalizedIncomingGame.launch_count)
  );
  const incomingLastPlayed = normalizeLastPlayedValue(normalizedIncomingGame.last_played);
  const existingLastPlayed = normalizeLastPlayedValue(normalizedExistingGame.last_played);
  const resolvedLastPlayed = incomingLastPlayed !== null && existingLastPlayed !== null
    ? Math.max(incomingLastPlayed, existingLastPlayed)
    : incomingLastPlayed ?? existingLastPlayed;

  // Preserve the EXISTING entry's primary platform/appid so user-facing
  // launch behaviour is unchanged when a re-scan finds the same game on
  // a new launcher. The new launcher is recorded as an additional source
  // via mergeLaunchSources below; the user can promote it later via the
  // launch-source picker UI.
  const mergedLaunchSources = mergeLaunchSources(
    normalizedExistingGame.launchSources,
    normalizedIncomingGame.launchSources
  );

  return normalizeGameLibraryEntry({
    ...normalizedExistingGame,
    ...normalizedIncomingGame,
    platform: normalizedExistingGame.platform || normalizedIncomingGame.platform,
    appid: normalizedExistingGame.appid || normalizedIncomingGame.appid,
    launchSources: mergedLaunchSources,
    time_played: resolvedTimePlayed,
    launch_count: resolvedLaunchCount,
    last_played: resolvedLastPlayed,
    userRating: normalizedIncomingGame.userRating !== null ? normalizedIncomingGame.userRating : normalizedExistingGame.userRating,
    replayIntent: normalizedIncomingGame.replayIntent !== null ? normalizedIncomingGame.replayIntent : normalizedExistingGame.replayIntent,
    playtime: {
      total: resolvedTimePlayed,
      daily: mergePlaytimeBucket(normalizedExistingGame.playtime?.daily, normalizedIncomingGame.playtime?.daily),
      weekly: mergePlaytimeBucket(normalizedExistingGame.playtime?.weekly, normalizedIncomingGame.playtime?.weekly),
      monthly: mergePlaytimeBucket(normalizedExistingGame.playtime?.monthly, normalizedIncomingGame.playtime?.monthly),
      yearly: mergePlaytimeBucket(normalizedExistingGame.playtime?.yearly, normalizedIncomingGame.playtime?.yearly)
    }
  });
};

const findExistingEntryIndex = (mergedLibrary, normalizedGame) => {
  const incomingKey = getCanonicalGameKey(normalizedGame);

  // Primary path: canonical-key match (handles cross-launcher dedup,
  // trademark differences, casing/whitespace variants).
  if (incomingKey) {
    const indexByKey = mergedLibrary.findIndex(
      (game) => getCanonicalGameKey(game) === incomingKey
    );
    if (indexByKey >= 0) {
      return indexByKey;
    }
  }

  // Fallback for pathological names (all-punctuation, etc.) where the
  // canonical key is null. Use raw-name equality so we never collapse
  // two such entries by accident.
  return mergedLibrary.findIndex((game) => game?.name === normalizedGame.name);
};

const mergeLibraryUpdates = (currentLibrary, newGames) => {
  if (!currentLibrary || !Array.isArray(currentLibrary)) {
    return normalizeLibraryData(newGames);
  }

  const merged = normalizeLibraryData(currentLibrary);

  (Array.isArray(newGames) ? newGames : []).forEach((newGame) => {
    const normalizedGame = normalizeGameLibraryEntry(newGame);
    if (!normalizedGame) {
      return;
    }

    const existingIndex = findExistingEntryIndex(merged, normalizedGame);
    if (existingIndex >= 0) {
      merged[existingIndex] = mergeTrackedGameData(merged[existingIndex], normalizedGame);
    } else {
      merged.push(normalizedGame);
    }
  });

  return merged;
};

export {
  mergeLibraryUpdates,
  getMostRecentlyPlayedGame,
  normalizeGameLibraryEntry,
  normalizeLibraryData,
  normalizeLastPlayedValue,
  normalizeTrackedNumber,
  getCanonicalGameKey,
  getLaunchSources
};
