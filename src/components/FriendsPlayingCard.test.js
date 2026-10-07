import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FriendsPlayingCard from './FriendsPlayingCard';

const STEAM_ID = '76561199057118227';

const enableFeature = () => {
  localStorage.clear();
  localStorage.setItem('gamepilot-steamFriendsEnabled', 'true');
  localStorage.setItem('gamepilot-steamWishlistId', STEAM_ID);
};

const playingFriend = {
  steamid: '76561199000000001',
  name: 'Zomboid Pal',
  avatar: null,
  state: 1,
  playing: 'Project Zomboid',
  appid: '108600',
  isPrivate: false,
};

beforeEach(() => {
  localStorage.clear();
  window.electronAPI = { steamFriends: jest.fn() };
});

afterEach(() => {
  delete window.electronAPI;
});

describe('FriendsPlayingCard', () => {
  it('renders nothing when the feature is disabled', () => {
    localStorage.setItem('gamepilot-steamWishlistId', STEAM_ID);
    const { container } = render(<FriendsPlayingCard library={[]} />);
    expect(container).toBeEmptyDOMElement();
    expect(window.electronAPI.steamFriends).not.toHaveBeenCalled();
  });

  it('renders nothing without a Steam ID', () => {
    localStorage.setItem('gamepilot-steamFriendsEnabled', 'true');
    const { container } = render(<FriendsPlayingCard library={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows friends currently playing', async () => {
    enableFeature();
    window.electronAPI.steamFriends.mockResolvedValue({
      ok: true,
      fetchedAt: Date.now(),
      friends: [playingFriend],
    });

    render(<FriendsPlayingCard library={[]} />);
    expect(await screen.findByText('Zomboid Pal')).toBeInTheDocument();
    expect(screen.getByText('Project Zomboid')).toBeInTheDocument();
  });

  it('offers launching when the game is in the library', async () => {
    enableFeature();
    window.electronAPI.steamFriends.mockResolvedValue({
      ok: true,
      fetchedAt: Date.now(),
      friends: [playingFriend],
    });
    const onLaunchGame = jest.fn();
    const library = [{ name: 'Project Zomboid', platform: 'steam', appid: '108600' }];

    render(<FriendsPlayingCard library={library} onLaunchGame={onLaunchGame} />);
    const button = await screen.findByRole('button', { name: /play your copy/i });
    await userEvent.click(button);
    expect(onLaunchGame).toHaveBeenCalledWith(library[0]);
  });

  it('shows the online count when nobody is in-game', async () => {
    enableFeature();
    window.electronAPI.steamFriends.mockResolvedValue({
      ok: true,
      fetchedAt: Date.now(),
      friends: [{ ...playingFriend, playing: null, appid: null }],
    });

    render(<FriendsPlayingCard library={[]} />);
    expect(await screen.findByText(/1 friend online/)).toBeInTheDocument();
  });

  it('surfaces the private-list error', async () => {
    enableFeature();
    window.electronAPI.steamFriends.mockResolvedValue({ ok: false, error: 'friends-list-private' });

    render(<FriendsPlayingCard library={[]} />);
    expect(await screen.findByText(/friends list is private/)).toBeInTheDocument();
  });
});
