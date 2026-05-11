// SteamPublicService.js
// Renderer-side wrapper around two anonymous Steam endpoints:
//   1. store.steampowered.com/appreviews/<appid>?json=1 — review summary
//   2. api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp
//      — per-achievement global unlock rates (no API key required for this one)
// Combined into a single per-game snapshot. Local-first: cached on device with
// a 7-day TTL, anonymous, no GamePilot server in the loop.

import StorageService from './StorageService';

const CACHE_KEY = 'steamSnapshotCacheV1';
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PENDING_TTL_MS = 6 * 60 * 60 * 1000;
const SETTINGS_KEY = 'steamSnapshotEnabled';

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
  catch (err) { console.warn('[SteamSnapshot] cache write failed:', err); }
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

// Map Steam's review_score (0-9) to a human label / colour bucket if the API
// itself didn't return review_score_desc.
const REVIEW_LABELS = [
  'No reviews', 'Negative', 'Mostly Negative', 'Mixed', 'Mixed', 'Mixed',
  'Mostly Positive', 'Positive', 'Very Positive', 'Overwhelmingly Positive'
];

const buildReviewBlock = (apiResult) => {
  if (!apiResult || !apiResult.ok || !apiResult.summary) return null;
  const s = apiResult.summary;
  const total = (s.total_positive || 0) + (s.total_negative || 0);
  if (!total) return null;
  const positivePct = Math.round((s.total_positive / total) * 100);
  return {
    label: s.review_score_desc || REVIEW_LABELS[s.review_score] || null,
    score: typeof s.review_score === 'number' ? s.review_score : null,
    positivePct,
    totalReviews: total,
    totalPositive: s.total_positive || 0,
    totalNegative: s.total_negative || 0
  };
};

const buildAchievementBlock = (apiResult) => {
  if (!apiResult || !apiResult.ok) return null;
  const list = Array.isArray(apiResult.achievements) ? apiResult.achievements : [];
  if (list.length === 0) return null;
  // Each item: { name, percent } where percent is 0..100 float
  const sorted = [...list].sort((a, b) => (a.percent || 0) - (b.percent || 0));
  const rarest = sorted[0];
  const avg = list.reduce((acc, a) => acc + (a.percent || 0), 0) / list.length;
  return {
    total: list.length,
    rarestPercent: rarest ? Number(rarest.percent.toFixed(2)) : null,
    rarestInternalName: rarest ? rarest.name : null,
    averagePercent: Number(avg.toFixed(1))
  };
};

class SteamPublicService {
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

  static async getSnapshot(game, { force = false } = {}) {
    const appid = getAppId(game);
    if (!appid) return null;
    if (!this.isEnabled()) return this.getCached(game);

    const cache = readCache();
    const cached = cache[appid];
    if (!force && cached && isFresh(cached)) return cached;
    if (inflight.has(appid)) return inflight.get(appid);

    const reviewsApi = window.electronAPI?.steamAppReviews;
    const achApi = window.electronAPI?.steamGlobalAchievements;
    if (!reviewsApi || !achApi) return cached || null;

    const promise = (async () => {
      try {
        // Fire both in parallel — they're independent and small.
        const [reviewsRes, achRes] = await Promise.all([
          reviewsApi(appid).catch((err) => ({ ok: false, error: err.message })),
          achApi(appid).catch((err) => ({ ok: false, error: err.message }))
        ]);
        const reviews = buildReviewBlock(reviewsRes);
        const achievements = buildAchievementBlock(achRes);
        const found = Boolean(reviews || achievements);
        const entry = {
          found,
          fetchedAt: Date.now(),
          appid,
          reviews,
          achievements,
          communityUrl: `https://steamcommunity.com/app/${appid}`,
          achievementsUrl: achievements ? `https://steamcommunity.com/stats/${appid}/achievements` : null
        };
        const next = { ...readCache(), [appid]: entry };
        writeCache(next);
        return entry;
      } catch (err) {
        console.warn('[SteamSnapshot] getSnapshot failed:', err);
        return cached || null;
      } finally {
        inflight.delete(appid);
      }
    })();
    inflight.set(appid, promise);
    return promise;
  }
}

export default SteamPublicService;
