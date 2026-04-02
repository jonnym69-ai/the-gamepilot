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
  if (lowerPlatform === 'origin') return 'EA';
  if (lowerPlatform === 'ea app') return 'EA';
  if (lowerPlatform === 'uplay') return 'Ubisoft';
  if (lowerPlatform === 'ubisoft connect') return 'Ubisoft';
  if (lowerPlatform === 'battlenet') return 'Battle.net';
  if (lowerPlatform === 'riot games') return 'Riot';
  if (lowerPlatform === 'battlestate games') return 'BSG';
  if (lowerPlatform === 'playstation brand') return 'PlayStation';
  return normalizedPlatform;
};

const normalizeBrandPlatformName = (brandPlatform, platform) => {
  const normalizedBrandPlatform = String(brandPlatform || '').trim();
  if (normalizedBrandPlatform) {
    return normalizePlatformName(normalizedBrandPlatform);
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

const normalizeGameLibraryEntry = (game) => {
  if (!game || typeof game !== 'object') {
    return null;
  }

  const resolvedTimePlayed = Math.max(
    normalizeTrackedNumber(game?.time_played),
    normalizeTrackedNumber(game?.playtime?.total)
  );

  return {
    ...game,
    platform: normalizePlatformName(game?.platform),
    brandPlatform: normalizeBrandPlatformName(game?.brandPlatform, game?.platform),
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

  return normalizeGameLibraryEntry({
    ...normalizedExistingGame,
    ...normalizedIncomingGame,
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

    const existingIndex = merged.findIndex((game) => game.name === normalizedGame.name);
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
  normalizeTrackedNumber
};
