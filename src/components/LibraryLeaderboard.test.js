import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import LibraryLeaderboard from './LibraryLeaderboard';
import StorageService from '../services/StorageService';

jest.mock('./LazyImage', () => ({ alt }) => <img alt={alt} />);

const game = (name, minutes) => ({ name, platform: 'Steam', appid: name.length, time_played: minutes });

const library = Array.from({ length: 15 }, (_, index) => game(`Game ${index + 1}`, (15 - index) * 60));

beforeEach(() => {
  localStorage.clear();
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
