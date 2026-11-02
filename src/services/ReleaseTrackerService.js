// ReleaseTrackerService.js
// Tracks release dates for wishlisted games via the existing
// steam-store-details desktop bridge (store page metadata, no API key).
// Release info and the derived summary live in localStorage so Today and
// the wishlist render synchronously — fetches are background-only.

import StorageService from './StorageService';
import WishlistService from './WishlistService';

const SETTINGS_KEY = 'wishlistReleaseTrackingEnabled';
const INFO_KEY = 'wishlistReleaseInfoV1';
const SUMMARY_KEY = 'wishlistReleaseSummaryV1';
const ANNOUNCED_KEY = 'wishlistReleaseAnnouncedV1';
const RELEASE_EVENT = 'gamepilot:wishlist-releases';

const DAY_MS = 24 * 60 * 60 * 1000;
const TTL_DEFAULT = 24 * 60 * 60 * 1000; // 24h
const TTL_IMMINENT = 6 * 60 * 60 * 1000; // 6h once a release is within 7 days
const MAX_CONCURRENT = 3;

const MONTHS = {
  january: 0,
  jan: 0,
  february: 1,
  feb: 1,
  march: 2,
  mar: 2,
  april: 3,
  apr: 3,
  may: 4,
  june: 5,
  jun: 5,
  july: 6,
  jul: 6,
  august: 7,
  aug: 7,
  september: 8,
  sep: 8,
  sept: 8,
  october: 9,
  oct: 9,
  november: 10,
  nov: 10,
  december: 11,
  dec: 11,
};

const TBA_RE = /^(coming soon|t\.?b\.?a\.?|to be announced|tbd)\.?$/i;

const parseStoredValue = (raw, fallback) => {
  if (raw === null || raw === undefined || raw === '') return fallback;
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return raw;
  }
};

const readInfo = () => {
  const parsed = parseStoredValue(StorageService.get(INFO_KEY, null), {});
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
};

// Steam appid for a wishlist item — same resolution the artwork heal uses.
const steamIdForItem = (item) => {
  const id = item?.steamAppID || (item?.appid && /^\d+$/.test(String(item.appid)) ? item.appid : null);
  return id ? String(id) : null;
};

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const daysBetween = (releaseAt, now) => Math.round((startOfDay(new Date(releaseAt)) - startOfDay(now)) / DAY_MS);

// Sort tier for the upcoming list: day-precision first, then anchored
// month/quarter/year, tba last.
const precisionTier = (entry) => (entry.precision === 'day' ? 0 : entry.releaseAt ? 1 : 2);

const anchorTime = (entry) => (entry.releaseAt ? new Date(entry.releaseAt).getTime() : Number.POSITIVE_INFINITY);

class ReleaseTrackerService {
  static isEnabled() {
    const raw = StorageService.getString(SETTINGS_KEY);
    if (raw === null || raw === undefined || raw === '') return true;
    const parsed = parseStoredValue(raw, true);
    if (typeof parsed === 'boolean') return parsed;
    return String(parsed).toLowerCase() !== 'false';
  }

  static setEnabled(enabled) {
    StorageService.setString(SETTINGS_KEY, String(Boolean(enabled)));
  }

  static parseSteamReleaseDate(text, now = new Date()) {
    void now;
    const raw = typeof text === 'string' ? text.trim() : '';
    if (!raw || TBA_RE.test(raw)) {
      return { releaseAt: null, label: raw || 'Coming soon', precision: 'tba' };
    }

    let m = raw.match(/^Q([1-4])\s+(\d{4})$/i);
    if (m) {
      const anchor = new Date(Number(m[2]), (Number(m[1]) - 1) * 3, 1);
      return { releaseAt: anchor.toISOString(), label: raw, precision: 'quarter' };
    }
    if (/^\d{4}$/.test(raw)) {
      return {
        releaseAt: new Date(Number(raw), 0, 1).toISOString(),
        label: raw,
        precision: 'year',
      };
    }
    // "December 12, 2026" / "Dec 12 2026"
    m = raw.match(/^([A-Za-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})$/);
    if (m && MONTHS[m[1].toLowerCase()] !== undefined) {
      const d = new Date(Number(m[3]), MONTHS[m[1].toLowerCase()], Number(m[2]));
      return { releaseAt: d.toISOString(), label: raw, precision: 'day' };
    }
    // "12 Dec, 2026"
    m = raw.match(/^(\d{1,2})\s+([A-Za-z]+)\.?,?\s+(\d{4})$/);
    if (m && MONTHS[m[2].toLowerCase()] !== undefined) {
      const d = new Date(Number(m[3]), MONTHS[m[2].toLowerCase()], Number(m[1]));
      return { releaseAt: d.toISOString(), label: raw, precision: 'day' };
    }
    // "December 2026" / "Dec 2026"
    m = raw.match(/^([A-Za-z]+)\.?\s+(\d{4})$/);
    if (m && MONTHS[m[1].toLowerCase()] !== undefined) {
      const d = new Date(Number(m[2]), MONTHS[m[1].toLowerCase()], 1);
      return { releaseAt: d.toISOString(), label: raw, precision: 'month' };
    }
    return { releaseAt: null, label: raw, precision: 'tba' };
  }

  static getSummary() {
    const parsed = parseStoredValue(StorageService.get(SUMMARY_KEY, null), null);
    return parsed && typeof parsed === 'object' ? parsed : null;
  }

  static getReleaseInfo(appid) {
    if (!appid) return null;
    const entry = readInfo()[String(appid)];
    return entry && typeof entry === 'object' ? entry : null;
  }

  static formatCountdown(info, now = new Date()) {
    if (!info || typeof info !== 'object') return '';
    if (info.precision !== 'day' || !info.releaseAt) {
      return info.label || 'Coming soon';
    }
    const days = daysBetween(info.releaseAt, now);
    if (days <= 0) return 'Out today';
    if (days === 1) return 'Tomorrow';
    if (days <= 14) return `In ${days} days`;
    return `In ${Math.round(days / 7)} weeks`;
  }

  static async refresh({ force = false } = {}) {
    if (!this.isEnabled()) return this.getSummary();

    const items = (WishlistService.getWishlist() || [])
      .map((item) => ({ appid: steamIdForItem(item), item }))
      .filter((entry) => entry.appid);

    const api =
      typeof window !== 'undefined' && window.electronAPI?.steamStoreDetails
        ? window.electronAPI.steamStoreDetails
        : null;
    if (!api) return this.buildAndStoreSummary(items);

    const cache = readInfo();
    const nowMs = Date.now();
    const stale = items.filter(({ appid }) => {
      if (force) return true;
      const entry = cache[appid];
      if (!entry || !entry.fetchedAt) return true;
      const imminent = entry.releaseAt && new Date(entry.releaseAt).getTime() - nowMs <= 7 * DAY_MS;
      const ttl = imminent ? TTL_IMMINENT : TTL_DEFAULT;
      return nowMs - entry.fetchedAt >= ttl;
    });

    const queue = stale.slice();
    const worker = async () => {
      while (queue.length > 0) {
        const { appid, item } = queue.shift();
        try {
          const result = await api(appid);
          if (!result?.ok || !result.data) continue;
          const releaseDate = result.data.release_date || {};
          const parsed = this.parseSteamReleaseDate(typeof releaseDate.date === 'string' ? releaseDate.date : '');
          cache[appid] = {
            comingSoon: releaseDate.coming_soon === true,
            dateText: typeof releaseDate.date === 'string' ? releaseDate.date : '',
            releaseAt: parsed.releaseAt,
            precision: parsed.precision,
            label: parsed.label,
            name: item.name,
            fetchedAt: Date.now(),
          };
        } catch {
          /* best-effort refresh */
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENT, queue.length) }, worker));

    StorageService.set(INFO_KEY, cache);
    return this.buildAndStoreSummary(items);
  }

  static buildAndStoreSummary(items) {
    const nameByAppid = new Map(items.map(({ appid, item }) => [appid, item.name]));
    const cache = readInfo();
    const now = new Date();
    const upcoming = [];
    const releasedToday = [];

    for (const [appid, entry] of Object.entries(cache)) {
      if (!nameByAppid.has(appid)) continue;
      const released =
        entry.comingSoon === false ||
        (entry.precision === 'day' && entry.releaseAt && new Date(entry.releaseAt) <= now);
      const row = {
        appid,
        name: nameByAppid.get(appid),
        releaseAt: entry.releaseAt,
        label: entry.label,
        precision: entry.precision,
        daysUntil: entry.precision === 'day' && entry.releaseAt ? daysBetween(entry.releaseAt, now) : null,
      };
      if (released) releasedToday.push(row);
      else upcoming.push(row);
    }

    upcoming.sort((a, b) => precisionTier(a) - precisionTier(b) || anchorTime(a) - anchorTime(b));
    releasedToday.sort((a, b) => anchorTime(a) - anchorTime(b));

    const summary = {
      upcoming,
      releasedToday,
      nextRelease: upcoming[0] || null,
      updatedAt: new Date().toISOString(),
    };
    StorageService.set(SUMMARY_KEY, summary);
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new Event(RELEASE_EVENT));
    }
    return summary;
  }

  static consumeReleaseDayAnnouncements() {
    const released = this.getSummary()?.releasedToday || [];
    if (released.length === 0) return [];
    const announced = new Set(parseStoredValue(StorageService.get(ANNOUNCED_KEY, null), []) || []);
    const fresh = released.filter((entry) => entry.appid && !announced.has(entry.appid));
    if (fresh.length > 0) {
      fresh.forEach((entry) => announced.add(entry.appid));
      StorageService.set(ANNOUNCED_KEY, [...announced]);
    }
    return fresh;
  }
}

export const WISHLIST_RELEASES_EVENT = RELEASE_EVENT;
export default ReleaseTrackerService;
