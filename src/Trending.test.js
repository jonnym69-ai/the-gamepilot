import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Trending from './Trending';
import StorageService from './services/StorageService';
import WishlistService from './services/WishlistService';

jest.mock('./NavBar', () => () => <nav aria-label="Main" />);
jest.mock('./components/LazyImage', () => ({ alt }) => <img alt={alt} />);
jest.mock('./components/GameModal', () => ({ game, onClose }) => (
  <div data-testid="game-modal" onClick={onClose}>
    {game?.name}
  </div>
));

const renderPage = (props = {}) =>
  render(
    <MemoryRouter>
      <Trending library={[]} {...props} />
    </MemoryRouter>
  );

const chartRows = (rows) =>
  Promise.resolve({
    ok: true,
    rows,
    fetchedAt: Date.now(),
  });

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  delete window.electronAPI;
  jest.restoreAllMocks();
});

test('renders the chart with titles resolved from the local library', async () => {
  window.electronAPI = {
    steamMostPlayed: jest.fn(() => chartRows([{ appid: 730, rank: 1, concurrent: 1011472, peak: 1280126 }])),
    steamStoreDetails: jest.fn(),
  };
  renderPage({ library: [{ name: 'Counter-Strike 2', platform: 'Steam', appid: 730 }] });

  expect(await screen.findByText('Counter-Strike 2')).toBeInTheDocument();
  expect(screen.getByText('#1')).toBeInTheDocument();
  expect(screen.getByText(/1,011,472 playing now/)).toBeInTheDocument();
  // Library title resolved — no store lookup needed.
  expect(window.electronAPI.steamStoreDetails).not.toHaveBeenCalled();
});

test('labels owned, unplayed and played states honestly', async () => {
  window.electronAPI = {
    steamMostPlayed: jest.fn(() =>
      chartRows([
        { appid: 730, rank: 1, concurrent: 10, peak: 20 },
        { appid: 570, rank: 2, concurrent: 9, peak: 20 },
        { appid: 440, rank: 3, concurrent: 8, peak: 20 },
      ])
    ),
    steamStoreDetails: jest.fn().mockResolvedValue({ ok: false, error: 'store-unavailable' }),
  };
  renderPage({
    library: [
      { name: 'Counter-Strike 2', platform: 'Steam', appid: 730, time_played: 0 },
      { name: 'Dota 2', platform: 'Steam', appid: 570, time_played: 100 },
    ],
  });

  expect(await screen.findByText('Counter-Strike 2')).toBeInTheDocument();
  expect(screen.getAllByText('In library')).toHaveLength(2);
  expect(screen.getByText('Unplayed')).toBeInTheDocument();
  expect(screen.getByText('1h 40m played')).toBeInTheDocument();
  // Row 3 has no library match and store lookup fails — labelled by app id, never fabricated.
  expect(await screen.findByText('Steam app 440')).toBeInTheDocument();
  expect(screen.getByText(/store details unavailable/)).toBeInTheDocument();
});

test('resolves non-owned titles through steam-store-details', async () => {
  window.electronAPI = {
    steamMostPlayed: jest.fn(() => chartRows([{ appid: 440, rank: 3, concurrent: 8, peak: 20 }])),
    steamStoreDetails: jest.fn().mockResolvedValue({
      ok: true,
      data: { name: 'Team Fortress 2', capsule_image: 'https://steamstatic.com/capsule.jpg' },
    }),
  };
  renderPage();

  expect(await screen.findByText('Team Fortress 2')).toBeInTheDocument();
  expect(screen.getByText('Not in your library')).toBeInTheDocument();
});

test('falls back to the app catalogue when per-game store details fail', async () => {
  window.electronAPI = {
    steamMostPlayed: jest.fn(() => chartRows([{ appid: 2676230, rank: 9, concurrent: 119730, peak: 181134 }])),
    steamAppNames: jest.fn().mockResolvedValue({ ok: true, names: { 2676230: 'Some New Game' } }),
    steamStoreDetails: jest.fn().mockResolvedValue({ ok: false, error: 'store-unavailable' }),
  };
  renderPage();

  expect(await screen.findByText('Some New Game')).toBeInTheDocument();
  expect(screen.queryByText('Steam app 2676230')).not.toBeInTheDocument();
});

test('launch fires the shared launch handler for owned games', async () => {
  window.electronAPI = {
    steamMostPlayed: jest.fn(() => chartRows([{ appid: 730, rank: 1, concurrent: 10, peak: 20 }])),
  };
  const onLaunchGame = jest.fn();
  const game = { name: 'Counter-Strike 2', platform: 'Steam', appid: 730 };
  renderPage({ library: [game], onLaunchGame });

  fireEvent.click(await screen.findByRole('button', { name: 'Launch Counter-Strike 2' }));
  expect(onLaunchGame).toHaveBeenCalledWith(game);
});

test('opens the game modal for owned games only', async () => {
  window.electronAPI = {
    steamMostPlayed: jest.fn(() =>
      chartRows([
        { appid: 730, rank: 1, concurrent: 10, peak: 20 },
        { appid: 440, rank: 2, concurrent: 9, peak: 20 },
      ])
    ),
    steamStoreDetails: jest.fn().mockResolvedValue({ ok: true, data: { name: 'Team Fortress 2' } }),
  };
  renderPage({ library: [{ name: 'Counter-Strike 2', platform: 'Steam', appid: 730 }] });

  fireEvent.click(await screen.findByRole('button', { name: 'Open Counter-Strike 2' }));
  expect(await screen.findByTestId('game-modal')).toHaveTextContent('Counter-Strike 2');
  fireEvent.click(screen.getByTestId('game-modal'));
  expect(screen.queryByTestId('game-modal')).not.toBeInTheDocument();
  // Non-owned rows have no modal affordance.
  expect(screen.queryByRole('button', { name: 'Open Team Fortress 2' })).not.toBeInTheDocument();
});

test('wishlists a resolved chart title through WishlistService', async () => {
  window.electronAPI = {
    steamMostPlayed: jest.fn(() => chartRows([{ appid: 440, rank: 3, concurrent: 8, peak: 20 }])),
    steamStoreDetails: jest.fn().mockResolvedValue({ ok: true, data: { name: 'Team Fortress 2' } }),
  };
  renderPage();

  fireEvent.click(await screen.findByRole('button', { name: /Add Team Fortress 2 to your wishlist/ }));
  expect(WishlistService.isWishlisted('Team Fortress 2')).toBe(true);
  await waitFor(() => expect(screen.getAllByText('Wishlisted').length).toBeGreaterThan(0));
  expect(screen.getByRole('button', { name: /Remove Team Fortress 2 from your wishlist/ })).toBeInTheDocument();
});

test('shows rank movement only after a snapshot exists', async () => {
  StorageService.set('trendingRankSnapshotV1', { savedAt: 1, ranks: { 730: 5, 570: 1 } });
  window.electronAPI = {
    steamMostPlayed: jest.fn(() =>
      chartRows([
        { appid: 730, rank: 2, concurrent: 10, peak: 20 },
        { appid: 570, rank: 4, concurrent: 9, peak: 20 },
      ])
    ),
    steamStoreDetails: jest.fn().mockResolvedValue({ ok: false }),
  };
  renderPage({
    library: [
      { name: 'Counter-Strike 2', platform: 'Steam', appid: 730 },
      { name: 'Dota 2', platform: 'Steam', appid: 570 },
    ],
  });

  await screen.findByText('Counter-Strike 2');
  // 730 climbed 5 → 2 (up 3), 570 fell 1 → 4 (down 3).
  const deltas = screen.getAllByTitle('Change since your last check of this chart');
  expect(deltas[0]).toHaveTextContent('3');
  expect(deltas[0].className).toContain('up');
  expect(deltas[1]).toHaveTextContent('3');
  expect(deltas[1].className).toContain('down');
});

test('is honest when the bridge is missing, errors, or returns an empty chart', async () => {
  renderPage();
  expect(await screen.findByText(/needs the desktop app/)).toBeInTheDocument();
  expect(screen.queryByRole('list')).not.toBeInTheDocument();

  delete window.electronAPI;
  window.electronAPI = { steamMostPlayed: jest.fn().mockResolvedValue({ ok: false }) };
  const view = render(
    <MemoryRouter>
      <Trending library={[]} />
    </MemoryRouter>
  );
  expect(await screen.findByText(/Couldn't reach Steam/)).toBeInTheDocument();
  view.unmount();

  window.electronAPI.steamMostPlayed.mockResolvedValue({ ok: true, rows: [] });
  renderPage();
  expect(await screen.findByText(/empty chart/)).toBeInTheDocument();
});

test('keeps fetching detail rows at most once per appid across re-renders', async () => {
  const steamStoreDetails = jest.fn().mockResolvedValue({ ok: true, data: { name: 'TF2' } });
  window.electronAPI = {
    steamMostPlayed: jest.fn(() =>
      chartRows([
        { appid: 440, rank: 1, concurrent: 10, peak: 20 },
        { appid: 440, rank: 1, concurrent: 10, peak: 20 }, // duplicate row deduped by appid
      ])
    ),
    steamStoreDetails,
  };
  renderPage();
  await waitFor(() => expect(steamStoreDetails).toHaveBeenCalledTimes(1));
});

test('matches games owned on other launchers by the resolved store name', async () => {
  window.electronAPI = {
    steamMostPlayed: jest.fn(() => chartRows([{ appid: 1174180, rank: 7, concurrent: 500, peak: 900 }])),
    steamStoreDetails: jest.fn().mockResolvedValue({
      ok: true,
      data: { name: 'Red Dead Redemption 2' },
    }),
  };
  const rdr2 = { name: 'Red Dead Redemption 2', platform: 'Rockstar', exePath: 'C:\\Games\\RDR2.exe' };
  renderPage({ library: [rdr2] });

  expect(await screen.findByText('In library · Rockstar')).toBeInTheDocument();
  expect(screen.queryByText('Not in your library')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Launch Red Dead Redemption 2' })).toBeInTheDocument();
});

test('flags Steam-owned-but-not-installed rows from the owned-games cache', async () => {
  StorageService.setString('steamOwnedGamesEnabled', 'true');
  StorageService.set('steamOwnedCacheV1', {
    games: [{ appid: 359550, name: "Tom Clancy's Rainbow Six Siege" }],
    fetchedAt: Date.now(),
  });
  window.electronAPI = {
    steamMostPlayed: jest.fn(() => chartRows([{ appid: 359550, rank: 36, concurrent: 48206, peak: 69146 }])),
    steamStoreDetails: jest.fn().mockResolvedValue({ ok: true, data: { name: "Tom Clancy's Rainbow Six Siege" } }),
  };
  renderPage();

  expect(await screen.findByText('Owned · not installed')).toBeInTheDocument();
  expect(screen.queryByText('Not in your library')).not.toBeInTheDocument();
});

test('non-library rows get a View on Steam action pointing at the app page', async () => {
  const openExternal = jest.fn().mockResolvedValue(true);
  window.electronAPI = {
    steamMostPlayed: jest.fn(() => chartRows([{ appid: 440, rank: 3, concurrent: 8, peak: 20 }])),
    steamStoreDetails: jest.fn().mockResolvedValue({ ok: true, data: { name: 'Team Fortress 2' } }),
    openExternal,
  };
  renderPage();

  fireEvent.click(await screen.findByRole('button', { name: 'View Team Fortress 2 on Steam' }));
  await waitFor(() => expect(openExternal).toHaveBeenCalledWith('https://store.steampowered.com/app/440/'));
});
