import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import GameModal from './GameModal';

jest.mock('./Toast', () => ({ useToast: () => ({ success: jest.fn(), error: jest.fn() }) }));
jest.mock('./LazyImage', () => ({ alt }) => <img alt={alt} />);
jest.mock('./LibrariansNotes', () => () => null);
jest.mock('./SaveBackupPanel', () => () => null);
jest.mock('./SteamSnapshot', () => () => null);
jest.mock('./PatchNewsPanel', () => () => null);
jest.mock('./UninstallModal', () => () => null);
jest.mock('./ShareMenu', () => ({ ShareMenu: () => null }));
jest.mock('./GameShareCard', () => ({ GameShareCard: () => null }));
jest.mock('./SessionLaunchShareCard', () => ({ SessionLaunchShareCard: () => null }));
jest.mock('../services/RecommendationEngine', () => ({
  RecommendationEngine: { getSimilarToGame: () => [] },
}));

const game = { name: 'Blasphemous', platform: 'Steam', appid: 774361 };
const result = (appid = 774361, description = 'A punishing action-platformer.') => ({
  ok: true,
  data: {
    steam_appid: appid,
    short_description: description,
    screenshots: [
      {
        path_full: 'https://shared.akamai.steamstatic.com/ss.jpg',
        path_thumbnail: 'https://shared.akamai.steamstatic.com/thumb.jpg',
      },
    ],
  },
});

beforeEach(() => {
  localStorage.clear();
  HTMLElement.prototype.scrollTo = jest.fn();
  window.electronAPI = { steamStoreDetails: jest.fn().mockResolvedValue(result()) };
});

afterEach(() => {
  delete window.electronAPI;
  jest.restoreAllMocks();
});

test('loads descriptions and screenshots through the desktop bridge without refetching on library edits', async () => {
  const onLaunch = jest.fn();
  const { rerender } = render(<GameModal game={game} isOpen onLaunch={onLaunch} onClose={jest.fn()} />);
  expect(await screen.findByText('A punishing action-platformer.')).toBeInTheDocument();
  expect(screen.getByAltText('Screenshot 1')).toHaveAttribute('src', result().data.screenshots[0].path_full);
  expect(window.electronAPI.steamStoreDetails).toHaveBeenCalledWith('774361');
  rerender(<GameModal game={{ ...game, userRating: 8 }} isOpen onLaunch={onLaunch} onClose={jest.fn()} />);
  expect(window.electronAPI.steamStoreDetails).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: /launch game/i }));
  expect(onLaunch).toHaveBeenCalledWith(expect.objectContaining({ appid: 774361 }));
});

test('shows a retry after failure and allows reopening the same game to recover', async () => {
  window.electronAPI.steamStoreDetails.mockResolvedValueOnce({ ok: false });
  const { rerender } = render(<GameModal game={game} isOpen onClose={jest.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Retry Steam details' }));
  expect(await screen.findByText('A punishing action-platformer.')).toBeInTheDocument();
  rerender(<GameModal game={game} isOpen={false} onClose={jest.fn()} />);
  rerender(<GameModal game={game} isOpen onClose={jest.fn()} />);
  await waitFor(() => expect(window.electronAPI.steamStoreDetails).toHaveBeenCalledTimes(3));
  expect(await screen.findByText('A punishing action-platformer.')).toBeInTheDocument();
});

test('ignores a failed old request after switching to another game', async () => {
  let rejectOld;
  window.electronAPI.steamStoreDetails.mockImplementationOnce(
    () =>
      new Promise((resolve, reject) => {
        rejectOld = reject;
      })
  );
  const { rerender } = render(<GameModal game={game} isOpen onClose={jest.fn()} />);
  window.electronAPI.steamStoreDetails.mockResolvedValue(result(108600, 'Survive the apocalypse.'));
  rerender(
    <GameModal game={{ name: 'Project Zomboid', platform: 'Steam', appid: 108600 }} isOpen onClose={jest.fn()} />
  );
  expect(await screen.findByText('Survive the apocalypse.')).toBeInTheDocument();
  await act(async () => rejectOld(new Error('Late failure')));
  expect(screen.getByText('Survive the apocalypse.')).toBeInTheDocument();
  expect(screen.queryByText(/Late failure/)).not.toBeInTheDocument();
});

test('does not fetch Steam data for non-Steam numeric IDs or a closed modal', () => {
  const { rerender } = render(<GameModal game={game} isOpen={false} onClose={jest.fn()} />);
  rerender(<GameModal game={{ ...game, platform: 'GOG' }} isOpen onClose={jest.fn()} />);
  expect(window.electronAPI.steamStoreDetails).not.toHaveBeenCalled();
});

test('opens the Steam library without launching the game', async () => {
  window.electronAPI.openSteamLibrary = jest.fn().mockResolvedValue(true);
  const onLaunch = jest.fn();
  render(<GameModal game={game} isOpen onLaunch={onLaunch} onClose={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Steam Library' }));
  await waitFor(() => expect(window.electronAPI.openSteamLibrary).toHaveBeenCalledWith('774361'));
  expect(onLaunch).not.toHaveBeenCalled();
  await screen.findByText('A punishing action-platformer.');
});

test('does not offer Steam navigation for another launcher or malformed ID', () => {
  const { rerender } = render(<GameModal game={{ ...game, platform: 'GOG' }} isOpen onClose={jest.fn()} />);
  expect(screen.queryByRole('button', { name: 'Steam Library' })).not.toBeInTheDocument();
  rerender(<GameModal game={{ ...game, appid: '108600/../../run' }} isOpen onClose={jest.fn()} />);
  expect(screen.queryByRole('button', { name: 'Steam Library' })).not.toBeInTheDocument();
});

test('rejects a mismatched game returned by the bridge', async () => {
  window.electronAPI.steamStoreDetails.mockResolvedValue(result(108600, 'Wrong game'));
  render(<GameModal game={game} isOpen onClose={jest.fn()} />);
  expect(await screen.findByRole('button', { name: 'Retry Steam details' })).toBeInTheDocument();
  expect(screen.queryByText('Wrong game')).not.toBeInTheDocument();
});
