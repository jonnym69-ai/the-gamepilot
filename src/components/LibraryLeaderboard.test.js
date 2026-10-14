import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import LibraryLeaderboard from './LibraryLeaderboard';
import StorageService from '../services/StorageService';

jest.mock('./LazyImage', () => ({ alt }) => <img alt={alt} />);

const game = (name, minutes, appid) => ({
  name,
  platform: 'Steam',
  appid: appid ?? name.length,
  time_played: minutes,
});

const library = Array.from({ length: 15 }, (_, index) => game(`Game ${index + 1}`, (15 - index) * 60));

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  delete window.electronAPI;
});

test('renders the top 10 played games by default', () => {
  render(<LibraryLeaderboard library={library} />);
  expect(screen.getByRole('heading', { name: /your top shelf/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Launch Game 1' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Launch Game 10' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Launch Game 11' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Top 10' })).toHaveAttribute('aria-pressed', 'true');
});

test('top 20 toggle expands the board and persists', () => {
  const view = render(<LibraryLeaderboard library={library} />);
  fireEvent.click(screen.getByRole('button', { name: 'Top 20' }));

  expect(screen.getByRole('button', { name: 'Launch Game 15' })).toBeInTheDocument();
  expect(StorageService.get('libraryLeaderboardLimitV1', 10)).toBe(20);

  view.unmount();
  render(<LibraryLeaderboard library={library} />);
  expect(screen.getByRole('button', { name: 'Top 20' })).toHaveAttribute('aria-pressed', 'true');
});

test('top ranks earn the top shelf trophy and rows launch the game', () => {
  const onLaunchGame = jest.fn();
  render(<LibraryLeaderboard library={library} onLaunchGame={onLaunchGame} />);

  expect(screen.getAllByText('Top shelf').length).toBe(3);
  fireEvent.click(screen.getByRole('button', { name: 'Launch Game 1' }));
  expect(onLaunchGame).toHaveBeenCalledWith(expect.objectContaining({ name: 'Game 1' }));
});

test('hides entirely when the library is too small to rank', () => {
  render(<LibraryLeaderboard library={[game('Solo', 100)]} />);
  expect(screen.queryByRole('heading', { name: /your top shelf/i })).not.toBeInTheDocument();
});

test('playing now mode crosses the Steam chart with the library', async () => {
  const owned = [game('Counter-Strike 2', 600, 730), game('Terraria', 300, 105600), game('Myshelf', 100, 999999)];
  window.electronAPI = {
    steamMostPlayed: jest.fn().mockResolvedValue({
      ok: true,
      rows: [
        { appid: 730, rank: 1, concurrent: 1011472, peak: 1280126 },
        { appid: 570, rank: 2, concurrent: 763192, peak: 859106 },
        { appid: 105600, rank: 54, concurrent: 28244, peak: 53092 },
      ],
      fetchedAt: Date.now(),
    }),
    steamPlayerCount: jest.fn().mockResolvedValue({ ok: true, count: 7 }),
  };

  render(<LibraryLeaderboard library={owned} />);
  fireEvent.click(screen.getByRole('button', { name: 'Playing now' }));

  expect(await screen.findByText(/1,011,472 playing now/)).toBeInTheDocument();
  expect(screen.getByText(/28,244 playing now/)).toBeInTheDocument();
  expect(screen.getByText('#1')).toBeInTheDocument();
  expect(screen.getByText('#54')).toBeInTheDocument();
  expect(screen.getByText('Steam top 10')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Launch Terraria' })).toBeInTheDocument();
  expect(StorageService.get('libraryLeaderboardModeV1', 'playtime')).toBe('players');
});

test('falls back to per-game counts when no owned games are on the chart', async () => {
  const owned = [game('Cult Indie', 500, 424242), game('Other Indie', 100, 434343)];
  window.electronAPI = {
    steamMostPlayed: jest.fn().mockResolvedValue({
      ok: true,
      rows: [{ appid: 730, rank: 1, concurrent: 1011472, peak: 1280126 }],
      fetchedAt: Date.now(),
    }),
    steamPlayerCount: jest
      .fn()
      .mockImplementation((appid) => Promise.resolve({ ok: true, count: appid === 424242 ? 8123 : 432 })),
  };

  render(<LibraryLeaderboard library={owned} />);
  fireEvent.click(screen.getByRole('button', { name: 'Playing now' }));

  expect(await screen.findByText(/8,123 playing now/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Launch Cult Indie' })).toHaveTextContent('off the top 100');
  expect(screen.getByRole('button', { name: 'Launch Other Indie' })).toHaveTextContent('432 playing now');
  expect(window.electronAPI.steamPlayerCount).toHaveBeenCalledWith(424242);
});

test('shows an error and retry when Steam is unreachable', async () => {
  window.electronAPI = {
    steamMostPlayed: jest.fn().mockRejectedValue(new Error('offline')),
    steamPlayerCount: jest.fn().mockRejectedValue(new Error('offline')),
  };

  render(<LibraryLeaderboard library={library} />);
  fireEvent.click(screen.getByRole('button', { name: 'Playing now' }));

  expect(await screen.findByText(/couldn't reach steam/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
});

test('playing now mode notes when the desktop bridge is missing', async () => {
  render(<LibraryLeaderboard library={library} />);
  fireEvent.click(screen.getByRole('button', { name: 'Playing now' }));
  expect(await screen.findByText(/need the desktop app/i)).toBeInTheDocument();
});
