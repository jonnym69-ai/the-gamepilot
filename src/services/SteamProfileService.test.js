import SteamProfileService from './SteamProfileService';
import SteamWishlistService from './SteamWishlistService';

const STEAM_ID = '76561199057118227';

const relayProfile = (overrides = {}) => ({
  steamid: STEAM_ID,
  name: 'Test Player',
  avatar: 'https://avatars.steamstatic.com/full.jpg',
  profileUrl: 'https://steamcommunity.com/id/testplayer',
  memberSince: 1400000000000,
  isPrivate: false,
  level: 42,
  xp: 12000,
  badges: 120,
  ...overrides,
});

beforeEach(() => {
  localStorage.clear();
  window.electronAPI = { steamProfile: jest.fn() };
});

afterEach(() => {
  delete window.electronAPI;
});

describe('SteamProfileService', () => {
  it('is disabled by default', () => {
    expect(SteamProfileService.isEnabled()).toBe(false);
  });

  it('reuses the shared Steam ID from wishlist import', () => {
    SteamWishlistService.setSteamId(STEAM_ID);
    expect(SteamProfileService.getSteamId()).toBe(STEAM_ID);
  });

  it('fails clearly without a Steam ID', async () => {
    const result = await SteamProfileService.fetchProfile();
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Steam ID/);
    expect(window.electronAPI.steamProfile).not.toHaveBeenCalled();
  });

  it('fails clearly when the bridge is unavailable', async () => {
    SteamWishlistService.setSteamId(STEAM_ID);
    delete window.electronAPI;
    const result = await SteamProfileService.fetchProfile();
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not available/);
  });

  it('normalizes and caches the relay profile', async () => {
    SteamWishlistService.setSteamId(STEAM_ID);
    window.electronAPI.steamProfile.mockResolvedValue({
      ok: true,
      fetchedAt: Date.now(),
      profile: relayProfile(),
    });

    const result = await SteamProfileService.fetchProfile();
    expect(result.success).toBe(true);
    expect(result.profile).toEqual(relayProfile());

    // Second call within TTL serves the cache without another request
    const again = await SteamProfileService.fetchProfile();
    expect(again.cached).toBe(true);
    expect(window.electronAPI.steamProfile).toHaveBeenCalledTimes(1);
    expect(SteamProfileService.getCached()?.profile.name).toBe('Test Player');
  });

  it('handles a private profile without treating null stats as errors', async () => {
    SteamWishlistService.setSteamId(STEAM_ID);
    window.electronAPI.steamProfile.mockResolvedValue({
      ok: true,
      fetchedAt: Date.now(),
      profile: relayProfile({ isPrivate: true, level: null, xp: null, badges: null }),
    });

    const result = await SteamProfileService.fetchProfile();
    expect(result.success).toBe(true);
    expect(result.profile.isPrivate).toBe(true);
    expect(result.profile.level).toBeNull();
  });

  it.each([
    ['invalid-steamid', /valid Steam64/],
    ['profile-not-found', /No Steam profile/],
    ['profile-unavailable', /unavailable/],
  ])('maps relay error %s to a readable message', async (code, expected) => {
    SteamWishlistService.setSteamId(STEAM_ID);
    window.electronAPI.steamProfile.mockResolvedValue({ ok: false, error: code });
    const result = await SteamProfileService.fetchProfile();
    expect(result.success).toBe(false);
    expect(result.error).toMatch(expected);
  });
});
