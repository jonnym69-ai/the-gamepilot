import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FriendsPlayedPanel from './FriendsPlayedPanel';
import SteamFriendsService from '../services/SteamFriendsService';

jest.mock('../services/SteamFriendsService');

const STEAM_ID = '76561199057118227';
const game = { name: 'Project Zomboid', platform: 'steam', appid: '108600', playtimeForever: 3000 };

const friend = {
  steamid: '76561199000000001',
  name: 'Zomboid Pal',
  avatar: null,
  state: 1,
  playing: 'Project Zomboid',
  appid: '108600',
  isPrivate: false,
};

beforeEach(() => {
  jest.resetAllMocks();
  localStorage.clear();
  SteamFriendsService.isEnabled.mockReturnValue(true);
  SteamFriendsService.getSteamId.mockReturnValue(STEAM_ID);
  window.electronAPI = { steamOwnedLibrary: jest.fn() };
});

afterEach(() => {
  delete window.electronAPI;
});

describe('FriendsPlayedPanel', () => {
  it('compares against the cached friends list', async () => {
    SteamFriendsService.getCached.mockReturnValue({ friends: [friend], fetchedAt: Date.now() });
    window.electronAPI.steamOwnedLibrary.mockResolvedValue({
      ok: true,
      games: [{ appid: 108600, playtimeForever: 1200 }],
    });

    render(<FriendsPlayedPanel game={game} />);
    await userEvent.click(screen.getByRole('button', { name: /compare with friends/i }));

    expect(await screen.findByText('Zomboid Pal')).toBeInTheDocument();
    expect(window.electronAPI.steamOwnedLibrary).toHaveBeenCalledWith(friend.steamid);
    expect(SteamFriendsService.fetchFriends).not.toHaveBeenCalled();
  });

  it('fetches friends on demand when the cache is empty', async () => {
    SteamFriendsService.getCached.mockReturnValue(null);
    SteamFriendsService.fetchFriends.mockResolvedValue({
      success: true,
      friends: [friend],
      fetchedAt: Date.now(),
    });
    window.electronAPI.steamOwnedLibrary.mockResolvedValue({
      ok: true,
      games: [{ appid: 108600, playtimeForever: 600 }],
    });

    render(<FriendsPlayedPanel game={game} />);
    await userEvent.click(screen.getByRole('button', { name: /compare with friends/i }));

    expect(SteamFriendsService.fetchFriends).toHaveBeenCalled();
    expect(await screen.findByText('Zomboid Pal')).toBeInTheDocument();
    expect(window.electronAPI.steamOwnedLibrary).toHaveBeenCalledWith(friend.steamid);
  });

  it('shows the error note when the on-demand fetch fails', async () => {
    SteamFriendsService.getCached.mockReturnValue(null);
    SteamFriendsService.fetchFriends.mockResolvedValue({
      success: false,
      error: 'Steam friends are unavailable right now.',
      friends: [],
    });

    render(<FriendsPlayedPanel game={game} />);
    await userEvent.click(screen.getByRole('button', { name: /compare with friends/i }));

    expect(await screen.findByText(/reach your Steam friends/)).toBeInTheDocument();
    expect(window.electronAPI.steamOwnedLibrary).not.toHaveBeenCalled();
  });
});
