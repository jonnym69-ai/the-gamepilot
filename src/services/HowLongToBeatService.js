// HowLongToBeatService.js
// Renderer-side wrapper for the unofficial HLTB search bridge in electron.js.
// Caches per-game completion times in localStorage with a 14-day TTL and
// supports manual user overrides. All network calls are best-effort and
// fail gracefully so the rest of the app never hard-depends on HLTB.

import StorageService from './StorageService';

// Bumped V1 -> V2 alongside the more robust electron-side credential
// extractor so any negative entries from a broken extractor don't shadow
// fresh lookups.
const CACHE_KEY = 'hltbCacheV5';
const TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const PENDING_TTL_MS = 60 * 60 * 1000;    // re-try misses after 1h
const SETTINGS_KEY = 'hltbEnabled';

let inflight = new Map(); // gameKey -> Promise<entry>

const slug = (s) => String(s || '')
  .toLowerCase()
  .replace(/[\u00ae\u2122\u00a9]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const gameKeyFor = (game) => {
  if (!game) return '';
  const name = game.name || game.title || '';
  return slug(name);
};

const readCache = () => {
  try {
    const raw = StorageService.getString(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeCache = (cache) => {
  try {
    StorageService.set(CACHE_KEY, cache);
  } catch (err) {
    console.warn('[HLTB] cache write failed:', err);
  }
};

const isFresh = (entry) => {
  if (!entry || !entry.fetchedAt) return false;
  const ttl = entry.found ? TTL_MS : PENDING_TTL_MS;
  return Date.now() - entry.fetchedAt < ttl;
};

// Fuzzy-match the best HLTB result to the queried name.
const pickBest = (results, queryName) => {
  if (!Array.isArray(results) || results.length === 0) return null;
  const target = slug(queryName);
  const targetCompressed = target.replace(/\s+/g, '');
  const targetWords = new Set(target.split(/\s+/).filter(Boolean));
  let best = null;
  let bestScore = -1;
  results.forEach((r) => {
    const cand = slug(r.name);
    const alias = slug(r.alias);
    const candCompressed = cand.replace(/\s+/g, '');
    const candWords = cand.split(/\s+/).filter(Boolean);
    let score = 0;
    if (cand === target) score = 100;
    else if (candCompressed === targetCompressed) score = 90;
    else if (cand.startsWith(target) || target.startsWith(cand)) score = 80;
    else if (alias && (alias === target || alias.startsWith(target))) score = 75;
    else if (cand.includes(target) || target.includes(cand)) score = 50;
    else {
      // Word-overlap fallback for spacing/camelCase mismatches.
      const overlap = candWords.filter((w) => targetWords.has(w)).length;
      if (overlap >= 2) score = 30 + overlap * 5;
      else score = 10;
    }
    // Prefer results with actual time data.
    if (r.mainSeconds || r.mainExtraSeconds || r.completionistSeconds) score += 5;
    if (score > bestScore) { bestScore = score; best = r; }
  });
  return bestScore >= 30 ? best : null;
};

const buildEntry = (queryName, apiResult) => {
  const now = Date.now();
  if (!apiResult || !apiResult.ok) {
    return { found: false, fetchedAt: now, error: apiResult?.error || 'unknown' };
  }
  const best = pickBest(apiResult.results, queryName);
  if (!best) {
    return { found: false, fetchedAt: now, error: 'no-match' };
  }
  return {
    found: true,
    fetchedAt: now,
    hltbId: best.id,
    hltbName: best.name,
    imageUrl: best.imageUrl || null,
    mainHours: best.mainSeconds ? +(best.mainSeconds / 3600).toFixed(1) : 0,
    mainExtraHours: best.mainExtraSeconds ? +(best.mainExtraSeconds / 3600).toFixed(1) : 0,
    completionistHours: best.completionistSeconds ? +(best.completionistSeconds / 3600).toFixed(1) : 0,
    allStylesHours: best.allStylesSeconds ? +(best.allStylesSeconds / 3600).toFixed(1) : 0,
    releaseYear: best.releaseYear || null
  };
};

class HowLongToBeatService {
  static isEnabled() {
    // Default ON: HLTB lookups are anonymous, public, and require no GamePilot
    // backend. Users can disable in Settings any time.
    const raw = StorageService.getString(SETTINGS_KEY);
    if (raw === null || raw === undefined || raw === '') return true;
    return raw === 'true' || raw === true;
  }

  static setEnabled(enabled) {
    StorageService.set(SETTINGS_KEY, Boolean(enabled));
  }

  // Synchronous read of a cached entry (UI-friendly).
  static getCached(game) {
    const key = gameKeyFor(game);
    if (!key) return null;
    const cache = readCache();
    const entry = cache[key];
    return entry || null;
  }

  // Async fetch with cache + dedupe. Returns entry or null.
  static async getTimes(game, { force = false } = {}) {
    const key = gameKeyFor(game);
    const name = game?.name || game?.title || '';
    if (!key || !name) {
      console.log('[HLTB] getTimes skipped: no name for', game);
      return null;
    }
    if (!this.isEnabled()) {
      console.log('[HLTB] getTimes skipped: disabled');
      return this.getCached(game);
    }

    const cache = readCache();
    const cached = cache[key];
    if (!force && cached && isFresh(cached)) {
      console.log('[HLTB] cache hit:', name, cached.found ? 'found' : 'miss');
      return cached;
    }
    if (cached?.manualOverride) {
      return cached;
    }
    if (inflight.has(key)) {
      console.log('[HLTB] dedupe inflight:', name);
      return inflight.get(key);
    }

    const api = (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.hltbSearch)
      ? window.electronAPI.hltbSearch
      : null;
    if (!api) {
      console.warn('[HLTB] no preload API — cannot fetch for', name);
      return cached || null;
    }

    console.log('[HLTB] fetching:', name);
    const promise = (async () => {
      try {
        const result = await api(name);
        console.log('[HLTB] raw result for', name, ':', result?.ok, result?.results?.length || 0, 'results');
        const entry = buildEntry(name, result);
        console.log('[HLTB] built entry for', name, ':', entry.found ? 'found' : entry.error, entry);
        const next = { ...readCache(), [key]: entry };
        writeCache(next);
        return entry;
      } catch (err) {
        console.warn('[HLTB] getTimes failed for', name, ':', err);
        return cached || null;
      } finally {
        inflight.delete(key);
      }
    })();
    inflight.set(key, promise);
    return promise;
  }

  // Manual override — user types known times.
  static setManualOverride(game, { mainHours = 0, mainExtraHours = 0, completionistHours = 0 } = {}) {
    const key = gameKeyFor(game);
    if (!key) return null;
    const entry = {
      found: true,
      manualOverride: true,
      fetchedAt: Date.now(),
      mainHours: Number(mainHours) || 0,
      mainExtraHours: Number(mainExtraHours) || 0,
      completionistHours: Number(completionistHours) || 0,
      allStylesHours: Number(mainExtraHours || mainHours) || 0
    };
    const next = { ...readCache(), [key]: entry };
    writeCache(next);
    return entry;
  }

  static clearOverride(game) {
    const key = gameKeyFor(game);
    if (!key) return;
    const cache = readCache();
    delete cache[key];
    writeCache(cache);
  }

  // Bulk warmup — kick off fetches for visible games, throttled.
  static async warmup(games, { concurrency = 2, delayMs = 250 } = {}) {
    if (!this.isEnabled() || !Array.isArray(games)) return;
    const queue = games.filter((g) => {
      const cached = this.getCached(g);
      return !cached || !isFresh(cached);
    });
    const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
      while (queue.length > 0) {
        const next = queue.shift();
        if (!next) return;
        try { await this.getTimes(next); } catch { /* ignore */ }
        await new Promise((r) => setTimeout(r, delayMs));
      }
    });
    await Promise.all(workers);
  }

  // Pick games that fit a session window. Returns array of { game, fitScore, mainHours }.
  // sessionMinutes is the user's available window. We score games where the
  // session is a meaningful chunk of progress: 8-25% of mainHours is "great",
  // 4-40% is "ok". We exclude games already finished (cap at 110% of mainHours
  // played) and games with no HLTB data.
  static rankSessionFit(games, sessionMinutes, { playedHoursOf } = {}) {
    if (!Array.isArray(games) || !sessionMinutes || sessionMinutes <= 0) return [];
    const sessionHours = sessionMinutes / 60;
    const ranked = [];
    games.forEach((game) => {
      const entry = this.getCached(game);
      if (!entry || !entry.found || !entry.mainHours) return;
      const main = entry.mainHours;
      const played = typeof playedHoursOf === 'function' ? Math.max(0, playedHoursOf(game) || 0) : 0;
      const remaining = Math.max(0, main - played);
      if (remaining < sessionHours * 0.5) return; // too close to done
      const ratio = sessionHours / main;
      let fit = 0;
      if (ratio >= 0.08 && ratio <= 0.25) fit = 100 - Math.abs(0.15 - ratio) * 200;
      else if (ratio >= 0.04 && ratio <= 0.40) fit = 60 - Math.abs(0.15 - ratio) * 150;
      else fit = Math.max(0, 30 - Math.abs(0.15 - ratio) * 100);
      ranked.push({
        game,
        mainHours: main,
        playedHours: played,
        remainingHours: remaining,
        sessionShare: ratio,
        fitScore: Math.round(fit)
      });
    });
    return ranked.sort((a, b) => b.fitScore - a.fitScore);
  }
}

export default HowLongToBeatService;
export { gameKeyFor as hltbGameKey };
