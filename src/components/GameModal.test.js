import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import GameModal from './GameModal';
import SessionRepository from '../services/SessionRepository';

jest.mock('./Toast', () => ({ useToast: () => ({ success: jest.fn(), error: jest.fn() }) }));
jest.mock('./LazyImage', () => ({ alt }) => <img alt={alt} />);
jest.mock('./LibrariansNotes', () => () => null);
jest.mock('./SaveBackupPanel', () => () => null);
jest.mock('./SteamSnapshot', () => () => null);
jest.mock('./PatchNewsPanel', () => () => null);
jest.mock('./YouTubeVideosPanel', () => () => null);
jest.mock('../services/SessionRepository', () => {
  const actual = jest.requireActual('../services/SessionRepository');
  return {
    __esModule: true,
    default: {
      ...actual.default,
      getSessionHistory: jest.fn(() => []),
      dedupeSessionHistory: (history) => actual.default.dedupeSessionHistory(history),
    },
  };
});
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
  SessionRepository.getSessionHistory.mockReturnValue([]);
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
  // Steam navigation lives in the footer overflow menu
  fireEvent.click(screen.getByRole('button', { name: /More/ }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Steam Library' }));
  await waitFor(() => expect(window.electronAPI.openSteamLibrary).toHaveBeenCalledWith('774361'));
  expect(onLaunch).not.toHaveBeenCalled();
  await screen.findByText('A punishing action-platformer.');
});

test('secondary actions live in the overflow menu and run their callbacks', () => {
  const onToggleFavorite = jest.fn();
  render(<GameModal game={game} isOpen onClose={jest.fn()} onToggleFavorite={onToggleFavorite} />);

  // Favorites action is hidden until the menu opens
  expect(screen.queryByRole('menuitem', { name: 'Add to Favorites' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /More/ }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Add to Favorites' }));
  expect(onToggleFavorite).toHaveBeenCalledTimes(1);
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

test('shows recorded session metrics and merged notes for the game', async () => {
  SessionRepository.getSessionHistory.mockReturnValue([
    {
      sessionId: 's1',
      gameName: 'Blasphemous',
      timestamp: '2026-10-01T12:00:00Z',
      playtimeMinutes: 30,
      note: 'Beat the boss',
    },
    {
      sessionId: 's2',
      gameName: 'Blasphemous',
      timestamp: '2026-10-02T12:00:00Z',
      playtimeMinutes: 60,
      note: 'Almost finished',
    },
    {
      sessionId: 's3',
      gameName: 'Blasphemous',
      timestamp: '2026-09-15T12:00:00Z',
      playtimeMinutes: 45,
    },
  ]);
  const noted = {
    ...game,
    sessionNotes: [{ timestamp: Date.parse('2026-10-05T12:00:00Z'), text: 'Manual note here' }],
  };
  render(<GameModal game={noted} isOpen onClose={jest.fn()} />);

  expect(await screen.findByText(/3 recorded sessions/)).toBeInTheDocument();
  expect(screen.getByText(/Typical recorded session: 45 min/)).toBeInTheDocument();
  expect(screen.getByText(/Played across 2 calendar months/)).toBeInTheDocument();

  const noteTexts = ['Manual note here', 'Almost finished', 'Beat the boss'];
  const items = screen
    .getAllByRole('listitem')
    .filter((item) => noteTexts.some((text) => item.textContent.includes(text)));
  expect(items).toHaveLength(3);
  expect(items[0]).toHaveTextContent('Manual note here');
});

test('does not fabricate a session summary from imported playtime', async () => {
  render(<GameModal game={{ ...game, playtimeForever: 99999 }} isOpen onClose={jest.fn()} />);
  expect(
    await screen.findByText(/No recorded sessions yet\. Imported playtime does not tell us when you played\./)
  ).toBeInTheDocument();
  expect(screen.queryByText(/Typical recorded session/)).not.toBeInTheDocument();
});

test('a store description with markup renders as text without executable nodes', async () => {
  window.electronAPI.steamStoreDetails.mockResolvedValue(
    result(774361, '<img src=x onerror=alert(1)><script>alert(2)</script>Safe <i>harbour</i> sim.')
  );
  render(<GameModal game={game} isOpen onClose={jest.fn()} />);
  // Tags are stripped, so the payload text stays literal and no img/script/italic
  // nodes are ever created inside the description.
  const description = await screen.findByText(/Safe harbour sim\./, { selector: '.game-description' });
  expect(within(description).queryByRole('img')).not.toBeInTheDocument();
  expect(description).toHaveTextContent('alert(2)Safe harbour sim.');
});
