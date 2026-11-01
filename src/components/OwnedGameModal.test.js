import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import OwnedGameModal from './OwnedGameModal';
import { getSteamStoreDetails } from '../services/SteamStoreService';

jest.mock('../services/SteamStoreService', () => ({
  getSteamAppId: jest.fn(),
  getSteamStoreDetails: jest.fn(),
}));

afterEach(() => {
  jest.clearAllMocks();
  delete window.electronAPI;
});

test('steam rows show store details, metadata and an Install via Steam action', async () => {
  getSteamStoreDetails.mockResolvedValue({
    name: 'Dockside',
    header_image: 'https://cdn.akamai.steam/header.jpg',
    short_description: 'A <i>harbour</i> sim.',
    genres: [{ description: 'Simulation' }, { description: 'Strategy' }],
    developers: ['Harbour Dev'],
    release_date: { date: 'Mar 2025' },
    screenshots: [{ path_full: 'https://cdn.akamai.steam/shot1.jpg' }],
    metacritic: { score: 88 },
  });

  render(
    <OwnedGameModal
      game={{ source: 'steam', name: 'Dockside', platform: 'Steam', appid: 12345, playtimeForever: 5400 }}
      onClose={jest.fn()}
      onInstall={jest.fn()}
    />
  );

  expect(getSteamStoreDetails).toHaveBeenCalledWith('12345');
  expect(await screen.findByText('A harbour sim.')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Dockside' })).toBeInTheDocument();
  expect(screen.getByText(/90h played/)).toBeInTheDocument();
  expect(screen.getByText(/Simulation · Strategy/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /install via steam/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /view store page/i })).toBeInTheDocument();
});

test('epic rows render catalog data without a store fetch', () => {
  render(
    <OwnedGameModal
      game={{
        source: 'epic',
        name: 'TerraScape',
        platform: 'Epic',
        appName: 'TerraScapeApp',
        icon: 'https://cdn.epic.example/t.jpg',
        description: 'Build cozy medieval cities.',
      }}
      onClose={jest.fn()}
      onInstall={jest.fn()}
    />
  );

  expect(getSteamStoreDetails).not.toHaveBeenCalled();
  expect(screen.getByText('Build cozy medieval cities.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /install via epic/i })).toBeInTheDocument();
});

test('gog rows load details through the gog bridge', async () => {
  window.electronAPI = {
    gogStoreDetails: jest.fn().mockResolvedValue({
      ok: true,
      data: {
        name: 'Fallout: London',
        lead: 'A <b>mod-sized</b> adventure.',
        description: '<p>Full conversion.</p>',
        hero: 'https://images.gog.com/hero.jpg',
        screenshots: ['https://images.gog.com/s1.jpg'],
        storeUrl: 'https://www.gog.com/game/fallout_london',
      },
    }),
  };

  render(
    <OwnedGameModal
      game={{ source: 'gog', name: 'Fallout: London', platform: 'GOG', gogProductId: '1455615258' }}
      onClose={jest.fn()}
      onInstall={jest.fn()}
    />
  );

  expect(window.electronAPI.gogStoreDetails).toHaveBeenCalledWith('1455615258');
  expect(await screen.findByText('A mod-sized adventure.')).toBeInTheDocument();
  expect(await screen.findByText('Full conversion.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /install via galaxy/i })).toBeInTheDocument();
});

test('install click forwards the game and escape closes', async () => {
  const onInstall = jest.fn();
  const onClose = jest.fn();
  getSteamStoreDetails.mockResolvedValue({ name: 'X' });

  const game = { source: 'steam', name: 'X', platform: 'Steam', appid: 1 };
  render(<OwnedGameModal game={game} onClose={onClose} onInstall={onInstall} />);

  fireEvent.click(await screen.findByRole('button', { name: /install via steam/i }));
  expect(onInstall).toHaveBeenCalledWith(game);

  fireEvent.keyDown(window, { key: 'Escape' });
  expect(onClose).toHaveBeenCalled();
});

test('backdrop click closes', async () => {
  const onClose = jest.fn();
  render(<OwnedGameModal game={{ source: 'epic', name: 'Y', platform: 'Epic', appName: 'Y_App' }} onClose={onClose} />);
  fireEvent.click(screen.getByTestId('owned-modal-overlay'));
  await waitFor(() => expect(onClose).toHaveBeenCalled());
});

test('labels past offers and ownership honestly', () => {
  render(
    <OwnedGameModal
      game={{
        source: 'epic',
        name: 'TerraScape',
        platform: 'Epic',
        appName: 'TerraScapeApp',
        freebie: { platform: 'Epic Games Store', endDate: null, seenAt: 123 },
        alsoOwnedOn: ['Steam'],
        relatedOwnedOn: ['GOG'],
      }}
      onClose={jest.fn()}
      onInstall={jest.fn()}
    />
  );
  expect(screen.getByText(/Previously offered free on Epic Games Store/)).toBeInTheDocument();
  expect(screen.getByText(/Same title on Steam/)).toBeInTheDocument();
  expect(screen.getByText(/Possible other edition on GOG/)).toBeInTheDocument();
});
