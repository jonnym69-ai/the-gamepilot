import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import BacklogBusterList from './BacklogBusterList';
import StorageService from '../services/StorageService';

jest.mock('./LazyImage', () => ({ alt }) => <img alt={alt} />);

const tiny = { name: 'Tiny Game', platform: 'Steam', appid: 101 };
const mid = { name: 'Mid Game', platform: 'Steam', appid: 102, time_played: 90 };
const big = { name: 'Big Game', platform: 'Steam', appid: 103, time_played: 300 };
const done = { name: 'Finished Game', platform: 'Steam', appid: 104, completionStatus: 'completed' };

beforeEach(() => {
  localStorage.clear();
});

test('shows an empty state until the user opens the picker', () => {
  render(<BacklogBusterList library={[tiny]} />);
  expect(screen.getByText(/no buster picks yet/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /choose picks/i })).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('group', { name: /playtime limit/i })).not.toBeInTheDocument();
});

test('picker lists only installed, unfinished games under the threshold', () => {
  render(<BacklogBusterList library={[tiny, mid, big, done]} />);
  fireEvent.click(screen.getByRole('button', { name: /choose picks/i }));

  expect(screen.getByRole('button', { name: /^tiny game/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^mid game/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^big game/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^finished game/i })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Under 2h' }));
  expect(screen.getByRole('button', { name: /^mid game/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^big game/i })).not.toBeInTheDocument();
});

test('toggling candidates builds a persisted buster list that survives remount', () => {
  const view = render(<BacklogBusterList library={[tiny, mid]} />);
  fireEvent.click(screen.getByRole('button', { name: /choose picks/i }));
  fireEvent.click(screen.getByRole('button', { name: /^tiny game/i }));

  const candidate = screen.getByRole('button', { name: /^tiny game/i });
  expect(candidate).toHaveAttribute('aria-pressed', 'true');
  expect(StorageService.get('backlogBusterListV1', [])).toEqual(['tinygame']);
  expect(screen.getByText(/your buster list · 1 picked/i)).toBeInTheDocument();

  view.unmount();
  render(<BacklogBusterList library={[tiny, mid]} />);
  expect(screen.getByText(/your buster list · 1 picked/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /launch tiny game/i })).toBeInTheDocument();
});

test('launching a buster card calls onLaunchGame and re-clicking a candidate removes it', () => {
  const onLaunchGame = jest.fn();
  render(<BacklogBusterList library={[tiny]} onLaunchGame={onLaunchGame} />);
  fireEvent.click(screen.getByRole('button', { name: /choose picks/i }));
  fireEvent.click(screen.getByRole('button', { name: /^tiny game/i }));
  fireEvent.click(screen.getByRole('button', { name: /done picking/i }));

  fireEvent.click(screen.getByRole('button', { name: /launch tiny game/i }));
  expect(onLaunchGame).toHaveBeenCalledWith(expect.objectContaining({ name: 'Tiny Game' }));

  fireEvent.click(screen.getByRole('button', { name: /choose picks/i }));
  fireEvent.click(screen.getByRole('button', { name: /^tiny game/i }));
  expect(StorageService.get('backlogBusterListV1', [])).toEqual([]);
  expect(screen.getByText(/no buster picks yet/i)).toBeInTheDocument();
});

test('buster entries vanish when their game leaves the library', () => {
  StorageService.set('backlogBusterListV1', ['tinygame']);
  render(<BacklogBusterList library={[mid]} />);
  expect(screen.getByText(/no buster picks yet/i)).toBeInTheDocument();
});

test('saved threshold is reused and invalid values fall back to under-1h', () => {
  StorageService.set('backlogBusterThresholdV1', 120);
  render(<BacklogBusterList library={[mid]} />);
  fireEvent.click(screen.getByRole('button', { name: /choose picks/i }));
  expect(screen.getByRole('button', { name: 'Under 2h' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: /mid game/i })).toBeInTheDocument();
});
