import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import RecentlyPlayedShelf from './RecentlyPlayedShelf';

jest.mock('./LazyImage', () => ({ alt }) => <img alt={alt} />);

const playedGame = (name, lastPlayed, minutes) => ({
  name,
  platform: 'Local',
  last_played: lastPlayed,
  time_played: minutes,
});

beforeEach(() => jest.useFakeTimers().setSystemTime(new Date('2026-09-28T12:00:00Z')));
afterEach(() => jest.useRealTimers());

test('renders nothing when no games have been played', () => {
  render(<RecentlyPlayedShelf library={[{ name: 'Never', platform: 'Local' }]} />);
  expect(screen.queryByRole('button', { name: /^Play / })).not.toBeInTheDocument();
  expect(screen.queryByText(/pick up where you left off/)).not.toBeInTheDocument();
});

test('shows most recently played games first and launches on click', () => {
  const launch = jest.fn();
  render(
    <RecentlyPlayedShelf
      library={[
        playedGame('Older', '2026-09-01T00:00:00Z', 120),
        playedGame('Newest', '2026-09-27T00:00:00Z', 300),
        playedGame('No playtime', '2026-09-28T00:00:00Z', 0),
      ]}
      onLaunchGame={launch}
    />
  );
  const buttons = screen.getAllByRole('button', { name: /^Play / });
  expect(buttons).toHaveLength(2);
  expect(buttons[0]).toHaveAccessibleName('Play Newest');
  fireEvent.click(buttons[0]);
  expect(launch).toHaveBeenCalledWith(expect.objectContaining({ name: 'Newest' }));
});
