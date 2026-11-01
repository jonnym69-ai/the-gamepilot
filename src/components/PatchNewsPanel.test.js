import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PatchNewsPanel from './PatchNewsPanel';
import SteamNewsService from '../services/SteamNewsService';

jest.mock('../services/SteamNewsService', () => ({
  __esModule: true,
  default: {
    isEnabled: jest.fn(() => true),
    setEnabled: jest.fn(),
    getCached: jest.fn(() => null),
    getNews: jest.fn(async () => null),
    getUpdateStatus: jest.fn(() => null),
  },
}));

const game = { name: 'News Game', platform: 'Steam', appid: '10' };
const entry = {
  found: true,
  items: [
    { gid: '1', title: 'Patch 1.4 notes', url: 'u1', dateMs: Date.now() - 86400000, feedLabel: 'Patch notes' },
    { gid: '2', title: 'Community spotlight', url: 'u2', dateMs: Date.now() - 172800000, feedLabel: 'Community' },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  SteamNewsService.isEnabled.mockReturnValue(true);
  SteamNewsService.getCached.mockReturnValue(entry);
  SteamNewsService.getNews.mockResolvedValue(entry);
  SteamNewsService.getUpdateStatus.mockReturnValue(null);
});

test('a mix of patch and general posts counts as recent posts, not patches', () => {
  SteamNewsService.getUpdateStatus.mockReturnValue({
    sinceLastPlayed: true,
    unread: true,
    newerCount: 2,
    isPatch: true,
    latest: entry.items[0],
  });
  render(<PatchNewsPanel game={game} />);
  expect(screen.getByText('2')).toBeInTheDocument();
  expect(screen.getByText(/recent posts published since your last play/)).toBeInTheDocument();
  expect(screen.getByText(/not a complete update history/)).toBeInTheDocument();
  expect(screen.queryByText(/patch \/ update/)).not.toBeInTheDocument();
});

test('singular post wording', () => {
  SteamNewsService.getUpdateStatus.mockReturnValue({
    sinceLastPlayed: true,
    unread: true,
    newerCount: 1,
    isPatch: false,
    latest: entry.items[0],
  });
  render(<PatchNewsPanel game={game} />);
  expect(screen.getByText('1')).toBeInTheDocument();
  expect(screen.getByText(/recent post published since your last play/)).toBeInTheDocument();
});

test('enabling from the empty state triggers a lookup', async () => {
  SteamNewsService.isEnabled.mockReturnValue(false);
  SteamNewsService.getCached.mockReturnValue(null);
  render(<PatchNewsPanel game={game} />);
  expect(SteamNewsService.getNews).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: /enable now/i }));
  expect(SteamNewsService.setEnabled).toHaveBeenCalledWith(true);
  await waitFor(() => expect(SteamNewsService.getNews).toHaveBeenCalledWith(game));
  expect(await screen.findByText('Patch 1.4 notes')).toBeInTheDocument();
});
