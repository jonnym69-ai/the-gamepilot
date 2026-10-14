import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import NotInstalledSection from './NotInstalledSection';
import SteamOwnedGamesService from '../services/SteamOwnedGamesService';

jest.mock('../services/SteamOwnedGamesService', () => ({
  __esModule: true,
  default: {
    isEnabled: jest.fn(() => false),
    getSteamId: jest.fn(() => null),
    fetchOwned: jest.fn(),
    diffUninstalled: jest.fn((games) => games),
  },
}));

const library = [{ name: 'Installed Game', platform: 'Steam', appid: 105600 }];

beforeEach(() => {
  jest.clearAllMocks();
  delete window.electronAPI;
  SteamOwnedGamesService.isEnabled.mockReturnValue(false);
  SteamOwnedGamesService.getSteamId.mockReturnValue(null);
});

test('shows owned Steam games with an install action when the toggle is on', async () => {
  SteamOwnedGamesService.isEnabled.mockReturnValue(true);
  SteamOwnedGamesService.getSteamId.mockReturnValue('76561198000000000');
  SteamOwnedGamesService.fetchOwned.mockResolvedValue({
    success: true,
    games: [{ appid: 730, name: 'Counter-Strike 2', platform: 'Steam', playtimeForever: 5400, lastPlayed: 0 }],
  });
  window.electronAPI = {
    steamInstall: jest.fn().mockResolvedValue(true),
    gogUninstalled: jest.fn().mockResolvedValue({ ok: true, games: [] }),
  };

  render(<NotInstalledSection library={library} />);

  expect(await screen.findByText('Counter-Strike 2')).toBeInTheDocument();
  expect(screen.getByText(/Steam · 90h played/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Install' }));
  expect(window.electronAPI.steamInstall).toHaveBeenCalledWith('730');
});

test('shows uninstalled GOG games read from the local Galaxy database', async () => {
  window.electronAPI = {
    gogUninstalled: jest.fn().mockResolvedValue({
      ok: true,
      games: [
        {
          name: 'The Witcher 3',
          platform: 'GOG',
          releaseKey: 'gog_1207664643',
          playtimeForever: 6000,
          lastPlayed: 0,
        },
      ],
    }),
  };

  render(<NotInstalledSection library={library} />);

  expect(await screen.findByText('The Witcher 3')).toBeInTheDocument();
  expect(screen.getByText('via GOG Galaxy')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Install' })).not.toBeInTheDocument();
  expect(window.electronAPI.gogUninstalled).toHaveBeenCalledWith(['Installed Game']);
});

test('hides entirely when neither source returns anything', async () => {
  window.electronAPI = { gogUninstalled: jest.fn().mockResolvedValue({ ok: true, games: [] }) };
  render(<NotInstalledSection library={library} />);
  await waitFor(() => expect(window.electronAPI.gogUninstalled).toHaveBeenCalled());
  expect(screen.queryByText(/owned, not installed/i)).not.toBeInTheDocument();
});

test('shows an honest message when Steam game details are private', async () => {
  SteamOwnedGamesService.isEnabled.mockReturnValue(true);
  SteamOwnedGamesService.getSteamId.mockReturnValue('76561198000000000');
  SteamOwnedGamesService.fetchOwned.mockResolvedValue({
    success: false,
    error: 'Your Steam game details are private. Set "Game details" to public in Steam privacy settings to use this.',
    games: [],
  });
  window.electronAPI = { gogUninstalled: jest.fn().mockResolvedValue({ ok: true, games: [] }) };

  render(<NotInstalledSection library={library} />);

  expect(await screen.findByText(/private/i)).toBeInTheDocument();
});
