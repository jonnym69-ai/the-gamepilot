const nativeLibraryScanner = require('./nativeLibraryScanner');

const sanitizeForIpc = (value) => {
  if (value === null || typeof value === 'undefined') {
    return value ?? null;
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'bigint') {
    return Number(value);
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeForIpc).filter((item) => typeof item !== 'undefined');
  }

  if (typeof value === 'object') {
    return Object.entries(value).reduce((accumulator, [key, nestedValue]) => {
      if (typeof nestedValue === 'function' || typeof nestedValue === 'symbol') {
        return accumulator;
      }

      accumulator[key] = sanitizeForIpc(nestedValue);
      return accumulator;
    }, {});
  }

  return null;
};

const runScan = () => {
  try {
    const games = sanitizeForIpc(nativeLibraryScanner.scanAllLibraries());
    const platforms = [...new Set(games.map((game) => game.platform))];
    const platformCounts = {};

    platforms.forEach((platform) => {
      platformCounts[platform] = games.filter((game) => game.platform === platform).length;
    });

    if (typeof process.send === 'function') {
      process.send({
        success: true,
        games,
        debug: {
          totalGames: games.length,
          platforms,
          platformCounts,
          sampleGames: games.slice(0, 5).map((game) => ({ name: game.name, platform: game.platform }))
        }
      });
    }
  } catch (error) {
    if (typeof process.send === 'function') {
      process.send({
        success: false,
        games: [],
        debug: {
          error: error?.message || 'Unknown scan error',
          stack: error?.stack || null
        }
      });
    }
  } finally {
    process.exit(0);
  }
};

runScan();
