import StorageService from './StorageService';
import SteamWishlistService from './SteamWishlistService';

const ENABLED_KEY = 'steamProfileEnabled';
const CACHE_KEY = 'steamProfileCacheV1';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // profile data is slow-moving
const STALE_TTL_MS = 24 * 60 * 60 * 1000; // older than this is not shown at all

const readCache = () => {
  try {
    const raw = StorageService.get(CACHE_KEY, null);
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return parsed && typeof parsed === 'object' && parsed.profile ? parsed : null;
  } catch {
    return null;
  }
};

const normalizeProfile = (profile) => ({
  steamid: String(profile?.steamid || ''),
  name: String(profile?.name || 'Steam player'),
  avatar: typeof profile?.avatar === 'string' ? profile.avatar : null,
  profileUrl: typeof profile?.profileUrl === 'string' ? profile.profileUrl : null,
  memberSince: Number.isInteger(profile?.memberSince) ? profile.memberSince : null,
  isPrivate: profile?.isPrivate === true,
  level: Number.isInteger(profile?.level) ? profile.level : null,
  xp: Number.isInteger(profile?.xp) ? profile.xp : null,
  badges: Number.isInteger(profile?.badges) ? profile.badges : null,
});

class SteamProfileService {
  static isEnabled() {
    return StorageService.getString(ENABLED_KEY) === 'true';
  }

  static setEnabled(enabled) {
    StorageService.setString(ENABLED_KEY, String(Boolean(enabled)));
  }

  static getSteamId() {
    return SteamWishlistService.getSteamId();
  }

  static getCached() {
    const cached = readCache();
    if (!cached || Date.now() - Number(cached.fetchedAt || 0) > STALE_TTL_MS) return null;
    return { profile: normalizeProfile(cached.profile), fetchedAt: cached.fetchedAt };
  }

  static async fetchProfile({ force = false } = {}) {
    const steamId = this.getSteamId();
    if (!steamId) {
      return { success: false, error: 'Steam ID is not configured.', profile: null };
    }

    const api = window.electronAPI?.steamProfile;
    if (!api) {
      return { success: false, error: 'Steam profile is not available in this build.', profile: null };
    }

    const cached = readCache();
    if (!force && cached && Date.now() - Number(cached.fetchedAt || 0) < CACHE_TTL_MS) {
      return { success: true, profile: normalizeProfile(cached.profile), fetchedAt: cached.fetchedAt, cached: true };
    }

    try {
      const result = await api(steamId);
      if (!result?.ok) {
        const error =
          result?.error === 'invalid-steamid'
            ? 'The saved Steam ID is not a valid Steam64 ID.'
            : result?.error === 'profile-not-found'
              ? 'No Steam profile was found for that ID.'
              : 'Steam profile is unavailable right now.';
        return { success: false, error, profile: null, code: result?.error || null };
      }

      const profile = normalizeProfile(result.profile);
      const fetchedAt = Number(result.fetchedAt) || Date.now();
      StorageService.set(CACHE_KEY, { profile: result.profile, fetchedAt });
      return { success: true, profile, fetchedAt };
    } catch (err) {
      return { success: false, error: err?.message || 'Steam profile request failed.', profile: null };
    }
  }
}

export default SteamProfileService;
