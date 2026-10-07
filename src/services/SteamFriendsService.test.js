import SteamFriendsService from './SteamFriendsService';

const STEAM_ID = '76561199057118227';

const friend = (overrides = {}) => ({
  steamid: '76561199000000001',
  name: 'Test Friend',
  avatar: 'https://avatars.steamstatic.com/x.jpg',
  state: 1,
  playing: null,
  appid: null,
  isPrivate: false,
  ...overrides,
});

beforeEach(() => {
  localStorage.clear();
  window.electronAPI = { steamFriends: jest.fn() };
});

afterEach(() => {
  delete window.electronAPI;
});

describe('SteamFriendsService', () => {
  it('is disabled by default', () => {
    expect(SteamFriendsService.isEnabled()).toBe(false);
  });

  it('fails clearly without a Steam ID', async () => {
    const result = await SteamFriendsService.fetchFriends();
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Steam ID/);
    expect(window.electronAPI.steamFriends).not.toHaveBeenCalled();
  });

  it('fails clearly when the bridge is unavailable', async () => {
    SteamFriendsService.setSteamId(STEAM_ID);
    delete window.electronAPI;
    const result = await SteamFriendsService.fetchFriends();
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not available/);
  });

  it('normalizes presence data from the relay', async () => {
    SteamFriendsService.setSteamId(STEAM_ID);
    window.electronAPI.steamFriends.mockResolvedValue({
      ok: true,
      fetchedAt: Date.now(),
      friends: [
        friend({ playing: 'Project Zomboid', appid: '108600' }),
        friend({ steamid: '76561199000000002', name: 'Away Pal', state: 3 }),
        friend({ steamid: '76561199000000003', name: 'Offline Pal', state: 0 }),
      ],
    });

    const result = await SteamFriendsService.fetchFriends();
    expect(result.success).toBe(true);
    const { playing, online, total } = SteamFriendsService.splitByPresence(result.friends);
    expect(total).toBe(3);
    expect(playing).toHaveLength(1);
    expect(playing[0].playing).toBe('Project Zomboid');
    expect(online).toHaveLength(1);
    expect(online[0].name).toBe('Away Pal');
  });

  it('uses the cache within the TTL window', async () => {
    SteamFriendsService.setSteamId(STEAM_ID);
    window.electronAPI.steamFriends.mockResolvedValue({
      ok: true,
      fetchedAt: Date.now(),
      friends: [friend()],
    });

    await SteamFriendsService.fetchFriends();
    const second = await SteamFriendsService.fetchFriends();
    expect(window.electronAPI.steamFriends).toHaveBeenCalledTimes(1);
    expect(second.cached).toBe(true);
  });

  it('reports a private friends list honestly', async () => {
    SteamFriendsService.setSteamId(STEAM_ID);
    window.electronAPI.steamFriends.mockResolvedValue({ ok: false, error: 'friends-list-private' });
    const result = await SteamFriendsService.fetchFriends({ force: true });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/private/);
  });

  it('reports an invalid Steam ID from the bridge', async () => {
    SteamFriendsService.setSteamId(STEAM_ID);
    window.electronAPI.steamFriends.mockResolvedValue({ ok: false, error: 'invalid-steamid' });
    const result = await SteamFriendsService.fetchFriends({ force: true });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Steam64/);
  });

  it('handles bridge exceptions without throwing', async () => {
    SteamFriendsService.setSteamId(STEAM_ID);
    window.electronAPI.steamFriends.mockRejectedValue(new Error('offline'));
    const result = await SteamFriendsService.fetchFriends({ force: true });
    expect(result.success).toBe(false);
    expect(result.error).toBe('offline');
  });
});
