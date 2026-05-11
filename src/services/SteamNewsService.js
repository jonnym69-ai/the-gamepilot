// SteamNewsService.js
// Anonymous Steam News bridge. Pulls recent news/patch posts for a Steam
// appid via api.steampowered.com/ISteamNews/GetNewsForApp/v0002/ and surfaces
// "updated since you last played" signals on Library cards plus a recent-posts
// list inside GameModal.
//
// Local-first: cached on-device with a 6-hour TTL, opt-out via Settings, no
// GamePilot server in the loop.

import StorageService from './StorageService';

const CACHE_KEY = 'steamNewsCacheV1';
const TTL_MS = 6 * 60 * 60 * 1000;       // 6h fresh window
const PENDING_TTL_MS = 1 * 60 * 60 * 1000; // re-try misses after 1h
const SETTINGS_KEY = 'steamNewsEnabled';

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
  catch (err) { console.warn('[SteamNews] cache write failed:', err); }
};

const isFresh = (entry) => {
  if (!entry || !entry.fetchedAt) return false;
  const ttl = entry.found ? TTL_MS : PENDING_TTL_MS;
  return Date.now() - entry.fetchedAt < ttl;
};

const getAppId = (game) => {
  if (!game) return null;
  if (String(game.platform || '').toLowerCase() !== 'steam') return null;
  const id = game.appid || game.steam_appid || game.appId;
  return id ? String(id) : null;
};

// Strip Steam BBCode + raw HTML so we can show a clean preview line. We don't
// try to render it — the click-through goes to the canonical Steam news page.
const stripMarkup = (str) => String(str || '')
  .replace(/\[\/?[a-z][^\]]*\]/gi, '')   // BBCode tags
  .replace(/<[^>]+>/g, '')               // HTML
  .replace(/&[a-z]+;/gi, ' ')            // HTML entities
  .replace(/\s+/g, ' ')
  .trim();

const buildEntry = (apiResult) => {
  const now = Date.now();
  if (!apiResult || !apiResult.ok) {
    return { found: false, fetchedAt: now, error: apiResult?.error || 'unknown', items: [] };
  }
  const raw = Array.isArray(apiResult.items) ? apiResult.items : [];
  const items = raw.map((n) => ({
    gid: String(n.gid || ''),
    title: String(n.title || '').trim(),
    url: n.url || (n.gid ? `https://steamcommunity.com/games/${apiResult.appid || ''}/announcements/detail/${n.gid}` : null),
    feedLabel: n.feedlabel || '',
    feedName: n.feedname || '',
    author: n.author || '',
    // API returns unix seconds.
    dateMs: typeof n.date === 'number' ? n.date * 1000 : null,
    preview: stripMarkup(n.contents).slice(0, 220)
  })).filter((it) => it.title && it.dateMs);
  return {
    found: items.length > 0,
    fetchedAt: now,
    items
  };
};

const PATCH_KEYWORDS = /\b(patch|update|hotfix|bug ?fix|fixes|fixed|version|release notes|changelog|build \d|server side|stability|rollout|quality of life|qol)\b/i;

class SteamNewsService {
  static isEnabled() {
    const raw = StorageService.getString(SETTINGS_KEY);
    if (raw === null || raw === undefined || raw === '') return true;
    return raw === 'true' || raw === true;
  }

  static setEnabled(enabled) {
    StorageService.set(SETTINGS_KEY, Boolean(enabled));
  }

  static getCached(game) {
    const appid = getAppId(game);
    if (!appid) return null;
    return readCache()[appid] || null;
  }

  static async getNews(game, { force = false, count = 5 } = {}) {
    const appid = getAppId(game);
    if (!appid) return null;
    if (!this.isEnabled()) return this.getCached(game);

    const cache = readCache();
    const cached = cache[appid];
    if (!force && cached && isFresh(cached)) return cached;
    if (inflight.has(appid)) return inflight.get(appid);

    const api = window.electronAPI?.steamNews;
    if (!api) return cached || null;

    const promise = (async () => {
      try {
        const result = await api({ appid, count });
        const entry = buildEntry({ ...result, appid });
        const next = { ...readCache(), [appid]: entry };
        writeCache(next);
        return entry;
      } catch (err) {
        console.warn('[SteamNews] getNews failed:', err);
        return cached || null;
      } finally {
        inflight.delete(appid);
      }
    })();
    inflight.set(appid, promise);
    return promise;
  }

  // Compute a small status object for Library cards: whether anything was
  // posted *after* the user's last_played timestamp, and whether it looks
  // like a patch vs general news.
  static getUpdateStatus(game) {
    const entry = this.getCached(game);
    if (!entry || !entry.found || entry.items.length === 0) return null;
    const lastPlayedMs = (() => {
      const lp = game?.last_played;
      if (!lp) return 0;
      const t = new Date(lp).getTime();
      return Number.isFinite(t) ? t : 0;
    })();
    if (!lastPlayedMs) {
      // Never played — no "since you last played" framing applies. Return
      // the most-recent post age so callers can decide how to surface it.
      const latest = entry.items[0];
      return {
        sinceLastPlayed: false,
        unread: false,
        latest,
        ageDays: latest ? Math.round((Date.now() - latest.dateMs) / 86400000) : null
      };
    }
    const newer = entry.items.filter((it) => it.dateMs > lastPlayedMs);
    if (newer.length === 0) return null;
    const latest = newer[0];
    const isPatch = newer.some((it) => PATCH_KEYWORDS.test(`${it.title} ${it.feedLabel}`));
    return {
      sinceLastPlayed: true,
      unread: true,
      latest,
      newerCount: newer.length,
      isPatch,
      ageDays: Math.round((Date.now() - latest.dateMs) / 86400000)
    };
  }

  // Bulk warmup for Library — throttled, tolerates failures silently.
  static async warmup(games, { concurrency = 2, delayMs = 400 } = {}) {
    if (!this.isEnabled()) return;
    const queue = (games || [])
      .map((g) => ({ game: g, appid: getAppId(g) }))
      .filter((x) => x.appid);
    if (queue.length === 0) return;
    const cache = readCache();
    const stale = queue.filter(({ appid }) => !isFresh(cache[appid]));
    if (stale.length === 0) return;

    let cursor = 0;
    const workers = Array.from({ length: Math.min(concurrency, stale.length) }, async () => {
      while (cursor < stale.length) {
        const idx = cursor++;
        const { game } = stale[idx];
        try { await this.getNews(game); } catch { /* swallow */ }
        if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
      }
    });
    await Promise.all(workers);
  }
}

export default SteamNewsService;
