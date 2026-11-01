/**
 * YouTube "Watch before you play" preview bridge.
 *
 * Local prototype: the user saves their own YouTube Data API v3 key in
 * Settings. The key is encrypted with safeStorage (DPAPI on Windows) and
 * written to userData/youtube-key.enc — never localStorage, backups, the
 * renderer bundle, or any GamePilot server. Searches run only when the user
 * picks a category in a game modal; nothing is prefetched.
 */

const { app, safeStorage } = require('electron');
const fs = require('fs');
const path = require('path');
const { httpsRequest } = require('./net');

const KEY_PATTERN = /^[A-Za-z0-9_-]{20,200}$/;
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';
const SEARCH_TIMEOUT_MS = 15000;
const MAX_TITLE_CHARS = 200;
const MAX_RESULTS = 3;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 100;

const CATEGORY_TERMS = {
  gameplay: 'gameplay',
  reviews: 'game review',
  guides: 'beginner guide',
};

// Bumped on every key save/clear so requests started under an old key can
// never repopulate the cache of the new one.
let cacheGeneration = 0;
const searchCache = new Map(); // `${category}\n${title}` -> { at, videos }
const inflight = new Map(); // same key -> Promise (generation captured inside)

const keyFilePath = () => path.join(app.getPath('userData'), 'youtube-key.enc');

// basic_text means "encrypted" with a hardcoded password — not real protection.
const encryptionUsable = () => {
  try {
    if (!safeStorage.isEncryptionAvailable()) return false;
    if (typeof safeStorage.getSelectedStorageBackend === 'function') {
      return safeStorage.getSelectedStorageBackend() !== 'basic_text';
    }
    return true;
  } catch {
    return false;
  }
};

const loadKey = () => {
  try {
    if (!encryptionUsable()) return null;
    const encrypted = fs.readFileSync(keyFilePath());
    const key = safeStorage.decryptString(encrypted);
    return KEY_PATTERN.test(key) ? key : null;
  } catch {
    // Missing or corrupted key file reports as "not configured" — never leak.
    return null;
  }
};

const saveKey = (key) => {
  const filePath = keyFilePath();
  const tempPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, safeStorage.encryptString(key), { mode: 0o600 });
  fs.renameSync(tempPath, filePath);
};

const clearKey = () => {
  try {
    fs.unlinkSync(keyFilePath());
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
};

const invalidateKeyState = () => {
  cacheGeneration += 1;
  searchCache.clear();
  // Drop dedupe handles so new searches start fresh under the new key; any
  // still-running request resolves normally but generation-checks its cache write.
  inflight.clear();
};

const classifyFailure = (status, body) => {
  let reason = null;
  try {
    reason = JSON.parse(body)?.error?.errors?.[0]?.reason || null;
  } catch {}
  if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') return 'quota-exceeded';
  if (reason === 'keyInvalid' || status === 400 || status === 401) return 'invalid-key';
  if (status === 403) return 'access-denied';
  return 'unavailable';
};

const normalizeVideos = (body) => {
  let items;
  try {
    items = JSON.parse(body)?.items;
  } catch {
    throw new Error('invalid-response');
  }
  // A real "no results" is an empty array; anything else is a malformed response.
  if (!Array.isArray(items)) throw new Error('invalid-response');
  return items
    .map((item) => {
      const id = typeof item?.id?.videoId === 'string' ? item.id.videoId : null;
      if (!id || !VIDEO_ID_PATTERN.test(id)) return null;
      return {
        id,
        title: String(item?.snippet?.title || 'Untitled video'),
        channelTitle: String(item?.snippet?.channelTitle || ''),
        thumbnailUrl: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
      };
    })
    .filter(Boolean)
    .slice(0, MAX_RESULTS);
};

const cacheResult = (cacheKey, generation, videos) => {
  if (generation !== cacheGeneration) return;
  searchCache.set(cacheKey, { at: Date.now(), videos });
  while (searchCache.size > CACHE_MAX_ENTRIES) {
    searchCache.delete(searchCache.keys().next().value);
  }
};

const runSearch = async (cacheKey, key, query) => {
  const generation = cacheGeneration;
  const promise = (async () => {
    try {
      const url = `${SEARCH_URL}?${new URLSearchParams({
        part: 'snippet',
        type: 'video',
        maxResults: String(MAX_RESULTS),
        q: query,
        safeSearch: 'moderate',
      }).toString()}`;
      const res = await httpsRequest(
        url,
        null,
        { 'X-Goog-Api-Key': key, Accept: 'application/json' },
        SEARCH_TIMEOUT_MS
      );
      if (res.status !== 200) {
        return { ok: false, error: classifyFailure(res.status, res.body) };
      }
      const videos = normalizeVideos(res.body);
      cacheResult(cacheKey, generation, videos);
      return { ok: true, videos, cached: false };
    } catch {
      return { ok: false, error: 'unavailable' };
    }
  })();
  inflight.set(cacheKey, promise);
  try {
    return await promise;
  } finally {
    if (inflight.get(cacheKey) === promise) inflight.delete(cacheKey);
  }
};

function registerIpcHandlers(ipcMain) {
  ipcMain.handle('youtube-status', async () => ({ ok: true, configured: Boolean(loadKey()) }));

  ipcMain.handle('youtube-set-key', async (_event, key) => {
    const trimmed = String(key || '').trim();
    if (!KEY_PATTERN.test(trimmed)) return { ok: false, error: 'invalid-key' };
    if (!encryptionUsable()) return { ok: false, error: 'secure-storage-unavailable' };
    try {
      saveKey(trimmed);
      invalidateKeyState();
      return { ok: true };
    } catch {
      return { ok: false, error: 'key-save-failed' };
    }
  });

  ipcMain.handle('youtube-clear-key', async () => {
    try {
      clearKey();
      invalidateKeyState();
      return { ok: true };
    } catch {
      return { ok: false, error: 'key-clear-failed' };
    }
  });

  ipcMain.handle('youtube-search', async (_event, request = {}) => {
    const title = String(request?.title || '').trim();
    const category = String(request?.category || '');
    if (!title || title.length > MAX_TITLE_CHARS || !Object.prototype.hasOwnProperty.call(CATEGORY_TERMS, category)) {
      return { ok: false, error: 'invalid-query' };
    }
    const key = loadKey();
    if (!key) return { ok: false, error: 'missing-key' };

    const cacheKey = `${category}\n${title}`;
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return { ok: true, videos: cached.videos, cached: true };
    }
    const pending = inflight.get(cacheKey);
    if (pending) return pending;

    return runSearch(cacheKey, key, `${title} ${CATEGORY_TERMS[category]}`);
  });
}

module.exports = { registerIpcHandlers };
