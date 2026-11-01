import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SteamSnapshot from './SteamSnapshot';
import SteamPublicService from '../services/SteamPublicService';
import SteamAchievementsService from '../services/SteamAchievementsService';

jest.mock('../services/SteamPublicService');
jest.mock('../services/SteamAchievementsService');

const game = { name: 'Hades', platform: 'Steam', appid: 1145360 };

const snapshotEntry = {
  found: true,
  fetchedAt: Date.now(),
  achievements: { total: 50, averagePercent: 12.3, rarestPercent: 0.8, rarestInternalName: 'ACH_RARE' },
  communityUrl: 'https://steamcommunity.com/app/1145360',
};

beforeEach(() => {
  localStorage.clear();
  SteamPublicService.isEnabled.mockReturnValue(true);
  SteamPublicService.getCached.mockReturnValue(snapshotEntry);
  SteamPublicService.getSnapshot.mockResolvedValue(snapshotEntry);
  SteamAchievementsService.getForGame.mockResolvedValue({ ok: false, error: 'no-achievements' });
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

test('shows personal achievement progress with a rarest-unlock callout', async () => {
  SteamAchievementsService.getForGame.mockResolvedValue({
    ok: true,
    unlocked: 2,
    total: 3,
    achievements: [
      {
        apiname: 'A1',
        name: 'Easy One',
        description: '',
        achieved: true,
        unlockTime: '2024-01-01T00:00:00.000Z',
        percent: 60,
      },
      {
        apiname: 'A2',
        name: 'Rare Gem',
        description: 'shiny',
        achieved: true,
        unlockTime: '2024-02-01T00:00:00.000Z',
        percent: 4.2,
      },
      { apiname: 'A3', name: 'Locked One', description: '', achieved: false, unlockTime: null, percent: 30 },
    ],
  });

  render(<SteamSnapshot game={game} />);

  expect(await screen.findByText(/Your achievements:/)).toBeInTheDocument();
  expect(screen.getByText('2 / 3 (67%)')).toBeInTheDocument();
  expect(screen.getByText(/Rarest unlock:/)).toBeInTheDocument();

  // Expanding shows the sorted list (unlocked first, rarest first).
  fireEvent.click(screen.getByRole('button', { name: /Your achievements/ }));
  // 'Rare Gem' appears in the callout AND the list row — assert both.
  expect((await screen.findAllByText('Rare Gem')).length).toBeGreaterThanOrEqual(2);
  expect(screen.getByText('Locked One')).toBeInTheDocument();
});

test('shows a Settings hint when no Steam ID is stored', async () => {
  SteamAchievementsService.getForGame.mockResolvedValue({ ok: false, error: 'no-steam-id' });
  render(<SteamSnapshot game={game} />);
  expect(await screen.findByText(/Add your Steam ID in Settings/)).toBeInTheDocument();
});

test('shows the privacy hint for a private profile and nothing for no-achievements', async () => {
  SteamAchievementsService.getForGame.mockResolvedValue({ ok: false, error: 'private-profile' });
  render(<SteamSnapshot game={game} />);
  expect(await screen.findByText(/Game details.*Public/)).toBeInTheDocument();
  expect(screen.queryByText(/Your achievements/)).not.toBeInTheDocument();
});
