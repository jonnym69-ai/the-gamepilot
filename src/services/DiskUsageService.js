// DiskUsageService.js
// Local-first disk-size cache for installed games.
//
// We compute size in the Electron main process (recursive walk, hard-bounded
// for safety), keep results in localStorage keyed by install path, and let
// the renderer read them back instantly. Library cards, the GameModal
// "Uninstall…" affordance, and the Storage Manager page all share this cache.
//
// Sizes are not privacy-sensitive — but recursive walks are heavy, so the
// service is opt-in via Settings (default on for desktop, no-op on web).

import StorageService from './StorageService';

const CACHE_KEY = 'diskUsageCacheV1';
const FRESH_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days — installs rarely change size
const ERROR_TTL_MS = 6 * 60 * 60 * 1000;       // re-try misses after 6h
const SETTINGS_KEY = 'diskUsageScanEnabled';

const inflight = new Map();

const readCache = () => {
  try {
    const raw = StorageService.getString(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch { return {}; }
};

const writeCache = (cache) => {
  try { StorageService.set(CACHE_KEY, cache); }
  catch (err) { console.warn('[DiskUsage] cache write failed:', err); }
};

// Stable cache key — install path is canonical. Falls back to appid+name so
// games without a known path still get cached error state.
export const getDiskKey = (game) => {
  const installDir = String(game?.installDir || '').trim();
  if (installDir) return installDir.toLowerCase();
  if (game?.appid) return `appid:${String(game.appid).toLowerCase()}`;
  if (game?.name) return `name:${String(game.name).toLowerCase()}`;
  return null;
};

const isFresh = (entry) => {
  if (!entry || !entry.fetchedAt) return false;
  const ttl = entry.ok ? FRESH_TTL_MS : ERROR_TTL_MS;
  return Date.now() - entry.fetchedAt < ttl;
};

class DiskUsageService {
  static isEnabled() {
    const raw = StorageService.getString(SETTINGS_KEY);
    if (raw === null || raw === undefined || raw === '') return true;
    return raw === 'true' || raw === true;
  }

  static setEnabled(enabled) {
    StorageService.set(SETTINGS_KEY, Boolean(enabled));
  }

  static getCached(game) {
    const key = getDiskKey(game);
    if (!key) return null;
    return readCache()[key] || null;
  }

  static getCachedBytes(game) {
    const entry = this.getCached(game);
    return entry && entry.ok ? entry.bytes : null;
  }

  static async measure(game, { force = false } = {}) {
    const key = getDiskKey(game);
    if (!key) return null;
    if (!this.isEnabled()) return this.getCached(game);

    const installDir = String(game?.installDir || '').trim();
    if (!installDir) {
      // Cache a "no-path" marker so the UI can render a helpful state without
      // hammering IPC every render.
      const entry = { ok: false, error: 'no-install-dir', fetchedAt: Date.now() };
      const next = { ...readCache(), [key]: entry };
      writeCache(next);
      return entry;
    }

    const cache = readCache();
    const cached = cache[key];
    if (!force && cached && isFresh(cached)) return cached;
    if (inflight.has(key)) return inflight.get(key);

    const knownInstallSize = typeof game?.installSize === 'number' && game.installSize > 0 ? game.installSize : null;
    if (knownInstallSize !== null) {
      const entry = {
        ok: true,
        bytes: knownInstallSize,
        files: 0,
        dirs: 0,
        truncated: false,
        durationMs: 0,
        fetchedAt: Date.now()
      };
      const next = { ...readCache(), [key]: entry };
      writeCache(next);
      return entry;
    }

    const api = window.electronAPI?.diskFolderSize;
    if (!api) return cached || null;

    const promise = (async () => {
      try {
        const result = await api({ path: installDir });
        const entry = result?.ok
          ? {
              ok: true,
              bytes: Number(result.bytes) || 0,
              files: Number(result.files) || 0,
              dirs: Number(result.dirs) || 0,
              truncated: Boolean(result.truncated),
              durationMs: Number(result.durationMs) || 0,
              fetchedAt: Date.now()
            }
          : { ok: false, error: result?.error || 'unknown', fetchedAt: Date.now() };
        const next = { ...readCache(), [key]: entry };
        writeCache(next);
        return entry;
      } catch (err) {
        console.warn('[DiskUsage] measure failed:', err);
        const entry = { ok: false, error: err.message || 'measure-failed', fetchedAt: Date.now() };
        const next = { ...readCache(), [key]: entry };
        writeCache(next);
        return entry;
      } finally {
        inflight.delete(key);
      }
    })();
    inflight.set(key, promise);
    return promise;
  }

  // Prune stale or error entries so the next scan will remeasure.
  static clearStaleErrors() {
    try {
      const cache = readCache();
      let changed = false;
      const next = {};
      for (const [key, entry] of Object.entries(cache)) {
        if (!entry?.ok && entry?.fetchedAt) {
          changed = true;
          continue; // drop error entries
        }
        if (entry?.ok && !isFresh(entry)) {
          changed = true;
          continue; // drop expired success entries too
        }
        next[key] = entry;
      }
      if (changed) writeCache(next);
    } catch { /* swallow */ }
  }

  // Best-effort bulk warmup — sequential by design because parallel disk
  // walks fight each other for I/O on a single drive and slow everything
  // down. Yields to the event loop between games.
  static async warmup(games, { force = false, maxGames = 200 } = {}) {
    if (!this.isEnabled()) return;
    if (!Array.isArray(games)) return;
    const queue = games.slice(0, maxGames).filter((g) => getDiskKey(g));
    for (const game of queue) {
      const cached = this.getCached(game);
      if (!force && cached && isFresh(cached)) continue;
      try { await this.measure(game, { force }); }
      catch { /* swallow; logged inside measure */ }
      await new Promise((r) => setTimeout(r, 60));
    }
  }

  // Aggregate helpers for the Storage Manager.
  static getTotalBytes(games) {
    if (!Array.isArray(games)) return 0;
    let total = 0;
    for (const g of games) {
      const e = this.getCached(g);
      if (e && e.ok) total += e.bytes || 0;
    }
    return total;
  }

  // Score how strong an uninstall candidate a game is. Higher is "more
  // reclaimable / less missed". Used by the Storage Manager to surface a
  // "Most reclaimable" sort independent of raw size.
  // Score = sizeGB * coldnessMultiplier, where coldness rises with days since
  // last_played and falls with hours invested.
  static reclaimScore(game) {
    const entry = this.getCached(game);
    if (!entry || !entry.ok) return 0;
    const sizeGB = (entry.bytes || 0) / (1024 ** 3);
    const lastPlayedMs = (() => {
      const lp = game?.last_played;
      if (!lp) return 0;
      const t = new Date(lp).getTime();
      return Number.isFinite(t) ? t : 0;
    })();
    const daysSince = lastPlayedMs ? (Date.now() - lastPlayedMs) / 86400000 : 365 * 2;
    const hoursPlayed = (Number(game?.time_played) || 0) / 60;
    // Cold rises with disuse, falls with attachment.
    const coldness = Math.min(3, daysSince / 90) - Math.min(2, hoursPlayed / 50);
    return Math.max(0, sizeGB * (1 + coldness));
  }
}

export default DiskUsageService;

// Pure formatting helper colocated for re-use across UI surfaces.
export const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log10(bytes) / 3));
  const value = bytes / 1000 ** i;
  const rounded = value >= 100 ? Math.round(value) : value >= 10 ? value.toFixed(1) : value.toFixed(2);
  return `${rounded} ${units[i]}`;
};
