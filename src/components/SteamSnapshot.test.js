import React from 'react';
import { render, screen } from '@testing-library/react';
import SteamSnapshot from './SteamSnapshot';
import SteamPublicService from '../services/SteamPublicService';

jest.mock('../services/SteamPublicService');

const game = { name: 'Hades', platform: 'Steam', appid: 1145360 };

beforeEach(() => {
  SteamPublicService.isEnabled.mockReturnValue(true);
  SteamPublicService.getCached.mockReturnValue(null);
  SteamPublicService.getSnapshot.mockResolvedValue(null);
});

test('shows the player count with an honest snapshot timestamp, never as live', async () => {
  const entry = {
    found: true,
    fetchedAt: Date.now(),
    players: { count: 42137, fetchedAt: new Date('2026-09-27T10:30:00').getTime() },
    reviews: {
      label: 'Overwhelmingly Positive',
      positivePct: 98,
      totalReviews: 300000,
      totalPositive: 294000,
      totalNegative: 6000,
    },
    achievements: null,
    communityUrl: 'https://steamcommunity.com/app/1145360',
  };
  SteamPublicService.getCached.mockReturnValue(entry);
  SteamPublicService.getSnapshot.mockResolvedValue(entry);
  render(<SteamSnapshot game={game} />);
  expect(await screen.findByText('42,137')).toBeInTheDocument();
  expect(screen.getByText(/playing on Steam/)).toBeInTheDocument();
  expect(screen.getByText(/as of/)).toBeInTheDocument();
  expect(screen.getByText(/10:30/)).toBeInTheDocument();
  expect(screen.queryByText(/live/i)).not.toBeInTheDocument();
});

test('renders the snapshot without a players line when the count was unavailable', async () => {
  const entry = {
    found: true,
    fetchedAt: Date.now(),
    players: null,
    reviews: { label: 'Very Positive', positivePct: 90, totalReviews: 1000, totalPositive: 900, totalNegative: 100 },
    achievements: null,
  };
  SteamPublicService.getCached.mockReturnValue(entry);
  SteamPublicService.getSnapshot.mockResolvedValue(entry);
  render(<SteamSnapshot game={game} />);
  expect(await screen.findByText('Very Positive')).toBeInTheDocument();
  expect(screen.queryByText(/playing on Steam/)).not.toBeInTheDocument();
});
