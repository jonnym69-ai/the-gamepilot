import StorageService from './StorageService';
import SteamWishlistService from './SteamWishlistService';

const ENABLED_KEY = 'steamFriendsEnabled';
const CACHE_KEY = 'steamFriendsCacheV1';
const CACHE_TTL_MS = 60000;

// Steam personastate values: 0 offline, 1 online, 2 busy, 3 away,
// 4 snooze, 5 looking to trade, 6 looking to play.
const ONLINE_STATES = new Set([1, 2, 3, 4, 5, 6]);

const readCache = () => {
  try {
    const raw = StorageService.get(CACHE_KEY, null);
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.friends)) return null;
    return parsed;
  } catch {
    return null;
  }
};

const normalizeFriend = (friend) => ({
  steamid: String(friend?.steamid || ''),
  name: String(friend?.name || 'Steam friend'),
  avatar: typeof friend?.avatar === 'string' ? friend.avatar : null,
  state: Number.isInteger(friend?.state) ? friend.state : 0,
  online: ONLINE_STATES.has(friend?.state) && !friend?.isPrivate,
  playing: typeof friend?.playing === 'string' && friend.playing ? friend.playing : null,
  appid: friend?.appid ? String(friend.appid) : null,
  isPrivate: friend?.isPrivate === true,
});

class SteamFriendsService {
  static isEnabled() {
    return StorageService.getString(ENABLED_KEY) === 'true';
  }

  static setEnabled(enabled) {
    StorageService.setString(ENABLED_KEY, String(Boolean(enabled)));
  }

  static getSteamId() {
    return SteamWishlistService.getSteamId();
  }

  static setSteamId(id) {
    SteamWishlistService.setSteamId(id);
  }

  static getCached() {
    const cached = readCache();
    if (!cached || Date.now() - Number(cached.fetchedAt || 0) > CACHE_TTL_MS * 5) return null;
    return { friends: cached.friends.map(normalizeFriend), fetchedAt: cached.fetchedAt };
  }

  static async fetchFriends({ force = false } = {}) {
    const steamId = this.getSteamId();
    if (!steamId) {
      return { success: false, error: 'Steam ID is not configured.', friends: [] };
    }

    const api = window.electronAPI?.steamFriends;
    if (!api) {
      return { success: false, error: 'Steam friends is not available in this build.', friends: [] };
    }

    const cached = readCache();
    if (!force && cached && Date.now() - Number(cached.fetchedAt || 0) < CACHE_TTL_MS) {
      return {
        success: true,
        friends: cached.friends.map(normalizeFriend),
        fetchedAt: cached.fetchedAt,
        cached: true,
      };
    }

    try {
      const result = await api(steamId);
      if (!result?.ok) {
        const error =
          result?.error === 'friends-list-private'
            ? 'Your Steam friends list is private. Set it to public in Steam privacy settings to use this.'
            : result?.error === 'invalid-steamid'
              ? 'The saved Steam ID is not a valid Steam64 ID.'
              : 'Steam friends are unavailable right now.';
        return { success: false, error, friends: [], code: result?.error || null };
      }

      const friends = result.friends.map(normalizeFriend);
      const fetchedAt = Number(result.fetchedAt) || Date.now();
      StorageService.set(CACHE_KEY, { friends: result.friends, fetchedAt });
      return { success: true, friends, fetchedAt };
    } catch (err) {
      return { success: false, error: err?.message || 'Steam friends request failed.', friends: [] };
    }
  }

  static splitByPresence(friends) {
    const list = Array.isArray(friends) ? friends : [];
    const playing = list.filter((friend) => friend.playing && friend.online);
    const online = list.filter((friend) => friend.online && !friend.playing);
    return { playing, online, total: list.length };
  }
}

export default SteamFriendsService;
