import React from 'react';
import { render, screen } from '@testing-library/react';
import SteamProfileCard from './SteamProfileCard';

const STEAM_ID = '76561199057118227';

const enableFeature = () => {
  localStorage.clear();
  localStorage.setItem('gamepilot-steamProfileEnabled', 'true');
  localStorage.setItem('gamepilot-steamWishlistId', STEAM_ID);
};

const relayProfile = {
  steamid: STEAM_ID,
  name: 'ZomboidFan',
  avatar: 'https://avatars.steamstatic.com/full.jpg',
  profileUrl: 'https://steamcommunity.com/id/zomboidfan',
  memberSince: 1400000000000,
  isPrivate: false,
  level: 42,
  xp: 12000,
  badges: 137,
};

beforeEach(() => {
  localStorage.clear();
  window.electronAPI = { steamProfile: jest.fn() };
});

afterEach(() => {
  delete window.electronAPI;
});

describe('SteamProfileCard', () => {
  it('renders nothing when the feature is disabled', () => {
    localStorage.setItem('gamepilot-steamWishlistId', STEAM_ID);
    const { container } = render(<SteamProfileCard />);
    expect(container).toBeEmptyDOMElement();
    expect(window.electronAPI.steamProfile).not.toHaveBeenCalled();
  });

  it('renders nothing without a Steam ID', () => {
    localStorage.setItem('gamepilot-steamProfileEnabled', 'true');
    const { container } = render(<SteamProfileCard />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows persona name, level, badges and member-since', async () => {
    enableFeature();
    window.electronAPI.steamProfile.mockResolvedValue({
      ok: true,
      fetchedAt: Date.now(),
      profile: relayProfile,
    });

    render(<SteamProfileCard />);
    expect(await screen.findByText('ZomboidFan')).toBeInTheDocument();
    expect(screen.getByText(/Level 42/)).toBeInTheDocument();
    expect(screen.getByText(/137 badges/)).toBeInTheDocument();
    expect(screen.getByText(/since \w+ \d{4}/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View Steam profile/ })).toHaveAttribute('href', relayProfile.profileUrl);
  });

  it('labels a limited profile without hiding it', async () => {
    enableFeature();
    window.electronAPI.steamProfile.mockResolvedValue({
      ok: true,
      fetchedAt: Date.now(),
      profile: { ...relayProfile, isPrivate: true, level: null, badges: null },
    });

    render(<SteamProfileCard />);
    expect(await screen.findByText('ZomboidFan')).toBeInTheDocument();
    expect(screen.getByText('limited profile')).toBeInTheDocument();
    expect(screen.queryByText(/Level/)).not.toBeInTheDocument();
  });

  it('shows the error message when the fetch fails', async () => {
    enableFeature();
    window.electronAPI.steamProfile.mockResolvedValue({ ok: false, error: 'profile-unavailable' });

    render(<SteamProfileCard />);
    expect(await screen.findByText(/unavailable/i)).toBeInTheDocument();
  });
});
