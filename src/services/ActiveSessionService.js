import StorageService from './StorageService';

const ACTIVE_GAME_SESSIONS_KEY = 'activeGameSessions';

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const readActiveGameSessions = () => {
  try {
    const parsed = StorageService.get(ACTIVE_GAME_SESSIONS_KEY, {});
    return isPlainObject(parsed) ? parsed : {};
  } catch (error) {
    console.error('Error reading active sessions:', error);
    return {};
  }
};

export const getActiveSessionStartTime = (sessionEntry) => {
  if (!sessionEntry) {
    return null;
  }

  if (typeof sessionEntry === 'string') {
    return sessionEntry;
  }

  if (typeof sessionEntry === 'object' && sessionEntry.startTime) {
    return sessionEntry.startTime;
  }

  return null;
};

export const createActiveSessionEntry = (game) => ({
  startTime: new Date().toISOString(),
  gameId: game?.appid || game?.name || null,
  metadata: {
    genres: Array.isArray(game?.genres) ? game.genres : [],
    mood: game?.mood || null,
    platform: game?.platform || null,
    source: game?.source || null,
    launchType: game?.launchType || null,
    emulator: game?.emulator || null,
    emulatorProfileId: game?.emulatorProfileId || null,
    romPath: game?.romPath || null,
    brandPlatform: game?.brandPlatform || null
  },
  paused: false
});

const normalizeActiveSessionEntry = (gameName, sessionEntry) => {
  const sessionStartTime = getActiveSessionStartTime(sessionEntry);
  if (!sessionStartTime) {
    return null;
  }

  if (typeof sessionEntry === 'object' && sessionEntry !== null) {
    return {
      ...sessionEntry,
      startTime: sessionStartTime,
      gameId: sessionEntry.gameId || gameName,
      metadata: isPlainObject(sessionEntry.metadata) ? sessionEntry.metadata : {},
      paused: Boolean(sessionEntry.paused)
    };
  }

  return {
    startTime: sessionStartTime,
    gameId: gameName,
    metadata: {},
    paused: false
  };
};

export const normalizeAndPersistActiveSessions = () => {
  const currentSessions = readActiveGameSessions();
  const normalizedSessions = Object.entries(currentSessions).reduce((acc, [gameName, sessionEntry]) => {
    const normalizedEntry = normalizeActiveSessionEntry(gameName, sessionEntry);
    if (normalizedEntry) {
      acc[gameName] = normalizedEntry;
    }
    return acc;
  }, {});

  StorageService.set(ACTIVE_GAME_SESSIONS_KEY, normalizedSessions);
  return normalizedSessions;
};

export const persistActiveGameSessions = (sessions) => {
  StorageService.set(ACTIVE_GAME_SESSIONS_KEY, sessions);
};

export { ACTIVE_GAME_SESSIONS_KEY };
