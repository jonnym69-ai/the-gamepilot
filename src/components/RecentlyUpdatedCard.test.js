import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import RecentlyUpdatedCard from './RecentlyUpdatedCard';
import SteamNewsService from '../services/SteamNewsService';

jest.mock('../services/SteamNewsService', () => ({
  __esModule: true,
  default: {
    warmup: jest.fn(() => Promise.resolve()),
    getUpdateStatus: jest.fn(),
  },
}));

const DAY_MS = 24 * 60 * 60 * 1000;

const steamGame = (name, lastPlayedDaysAgo, appid = 100) => ({
  name,
  platform: 'Steam',
  appid,
  last_played: (Date.now() - lastPlayedDaysAgo * DAY_MS) / 1000,
});

beforeEach(() => {
  jest.clearAllMocks();
  window.electronAPI = { openExternal: jest.fn() };
});

afterEach(() => {
  delete window.electronAPI;
});

test('renders nothing when no candidates have new posts', async () => {
  SteamNewsService.getUpdateStatus.mockReturnValue(null);
  const { container } = render(<RecentlyUpdatedCard library={[steamGame('Hades', 2)]} />);
  await waitFor(() => expect(SteamNewsService.warmup).toHaveBeenCalled());
  await waitFor(() => expect(container).toBeEmptyDOMElement());
});

test('warms up only Steam games with a last-played date', async () => {
  SteamNewsService.getUpdateStatus.mockReturnValue(null);
  const played = steamGame('Hades', 2, 1145360);
  const notPlayed = { name: 'Silksong', platform: 'Steam', appid: 1030300 };
  const epicGame = { name: 'Epic Thing', platform: 'Epic', last_played: Date.now() / 1000 };
  render(<RecentlyUpdatedCard library={[played, notPlayed, epicGame]} />);
  await waitFor(() => expect(SteamNewsService.warmup).toHaveBeenCalledWith([played]));
});

test('lists games with posts newer than the last play, newest first', async () => {
  const zomboid = steamGame('Project Zomboid', 3, 108600);
  const hades = steamGame('Hades', 7, 1145360);
  SteamNewsService.getUpdateStatus.mockImplementation((game) =>
    game.name === 'Project Zomboid'
      ? {
          unread: true,
          sinceLastPlayed: true,
          isPatch: true,
          newerCount: 2,
          ageDays: 1,
          latest: { title: 'Build 42.12 hotfix', url: 'https://example.com/pz', dateMs: Date.now() - DAY_MS },
        }
      : game.name === 'Hades'
        ? {
            unread: true,
            sinceLastPlayed: true,
            isPatch: false,
            newerCount: 1,
            ageDays: 4,
            latest: { title: 'Community post', url: 'https://example.com/hades', dateMs: Date.now() - 4 * DAY_MS },
          }
        : null
  );

  render(<RecentlyUpdatedCard library={[zomboid, hades]} />);
  expect(await screen.findByText('Build 42.12 hotfix')).toBeInTheDocument();
  expect(screen.getByText('Community post')).toBeInTheDocument();
  expect(screen.getByText(/Patch/)).toBeInTheDocument();
  expect(screen.getByText(/News/)).toBeInTheDocument();
});

test('opens the latest post URL when a row is clicked', async () => {
  const zomboid = steamGame('Project Zomboid', 3, 108600);
  SteamNewsService.getUpdateStatus.mockReturnValue({
    unread: true,
    isPatch: true,
    newerCount: 1,
    ageDays: 1,
    latest: { title: 'Hotfix', url: 'https://example.com/pz', dateMs: Date.now() - DAY_MS },
  });

  render(<RecentlyUpdatedCard library={[zomboid]} />);
  const row = await screen.findByRole('button', { name: /Project Zomboid/ });
  fireEvent.click(row);
  expect(window.electronAPI.openExternal).toHaveBeenCalledWith('https://example.com/pz');
});
