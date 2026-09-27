import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import DailySpotlightCard from './DailySpotlightCard';
import DailySpotlightService from '../services/DailySpotlightService';
import StorageService from '../services/StorageService';

jest.mock('./LazyImage', () => ({ alt }) => <img alt={alt} />);
const game = { name: 'Project Zomboid', platform: 'Steam', appid: 108600, time_played: 120 };
const NOW = new Date('2026-09-23T12:00:00Z');

beforeEach(() => {
  localStorage.clear();
  StorageService.setString('timezone', 'UTC');
  window.electronAPI = { steamSpotlight: jest.fn().mockResolvedValue({ ok: false }) };
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
  delete window.electronAPI;
});

test('renders a useful local card without a launch nudge or automatic fact requests', () => {
  render(<DailySpotlightCard library={[game]} />);
  expect(screen.getByRole('heading', { name: "Today's Spotlight" })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Project Zomboid' })).toBeInTheDocument();
  expect(screen.getByText('2h')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /play|launch/i })).not.toBeInTheDocument();
  expect(screen.getByRole('checkbox', { name: /online Steam facts/i })).not.toBeChecked();
  expect(window.electronAPI.steamSpotlight).not.toHaveBeenCalled();
});

test('opt-in shows sourced store facts and timestamped zero players rather than claiming live data', async () => {
  window.electronAPI.steamSpotlight.mockResolvedValue({
    ok: true,
    store: {
      releaseDate: '8 Nov, 2013',
      developers: ['The Indie Stone'],
      publishers: [],
      genres: ['Survival'],
      metacritic: 82,
      fetchedAt: NOW.getTime(),
    },
    players: { count: 0, fetchedAt: NOW.getTime() },
  });
  render(<DailySpotlightCard library={[game]} />);
  fireEvent.click(screen.getByRole('checkbox', { name: /online Steam facts/i }));
  expect(await screen.findByText('The Indie Stone')).toBeInTheDocument();
  expect(screen.getByText('8 Nov, 2013')).toBeInTheDocument();
  expect(screen.getByText('82 / 100')).toBeInTheDocument();
  expect(screen.getByText('0')).toBeInTheDocument();
  expect(screen.getByText(/Concurrent Steam players/)).toBeInTheDocument();
  expect(screen.queryByText(/playing right now/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/^copies sold$/i)).not.toBeInTheDocument();
  expect(screen.getAllByText(/checked/i).length).toBeGreaterThan(0);
  expect(DailySpotlightService.isEnabled()).toBe(true);
});

test('shows the Steam blurb and a manual screenshot gallery only while online facts are enabled', async () => {
  const screenshots = [1, 2, 3, 4].map((index) => ({
    path_full: `https://shared.akamai.steamstatic.com/ss_${index}.jpg`,
    path_thumbnail: `https://shared.akamai.steamstatic.com/ss_${index}.thumb.jpg`,
  }));
  window.electronAPI.steamSpotlight.mockResolvedValue({
    ok: true,
    store: { shortDescription: 'Survive the apocalypse.', screenshots, fetchedAt: Date.now() },
  });
  render(<DailySpotlightCard library={[game]} />);
  expect(screen.queryByRole('button', { name: /show.*screenshot/i })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('checkbox', { name: /online Steam facts/i }));
  expect(await screen.findByText('Survive the apocalypse.')).toBeInTheDocument();
  expect(screen.getByAltText('Project Zomboid screenshot 1')).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: /show.*screenshot/i })).toHaveLength(4);
  fireEvent.click(screen.getByRole('button', { name: 'Show Project Zomboid screenshot 3' }));
  expect(screen.getByAltText('Project Zomboid screenshot 3')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Show Project Zomboid screenshot 3' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  fireEvent.click(screen.getByRole('checkbox', { name: /online Steam facts/i }));
  expect(screen.queryByRole('button', { name: /show.*screenshot/i })).not.toBeInTheDocument();
  expect(screen.getByAltText('Project Zomboid artwork')).toBeInTheDocument();
  expect(screen.getByText('Survive the apocalypse.')).toBeInTheDocument();
});

test('keeps library artwork when Steam has no screenshots and explains partial data', async () => {
  DailySpotlightService.setEnabled(true);
  window.electronAPI.steamSpotlight.mockResolvedValue({
    ok: true,
    players: { count: 12, fetchedAt: Date.now() },
    store: null,
  });
  render(<DailySpotlightCard library={[game]} />);
  await waitFor(() =>
    expect(screen.getByRole('status')).toHaveTextContent(/store description and screenshots are unavailable/i)
  );
  expect(screen.getByAltText('Project Zomboid artwork')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /show.*screenshot/i })).not.toBeInTheDocument();
});

test('non-Steam games use saved metadata without pretending it comes from Steam', () => {
  render(
    <DailySpotlightCard
      library={[
        { name: 'Local Game', platform: 'GOG', developer: 'Local Studio', releaseYear: 2001, genres: ['Adventure'] },
      ]}
    />
  );
  expect(screen.getByText('Local Studio')).toBeInTheDocument();
  expect(screen.getByText('2001')).toBeInTheDocument();
  expect(screen.getByText(/Facts from your saved library/)).toBeInTheDocument();
  expect(screen.queryByText(/Concurrent Steam players/)).not.toBeInTheDocument();
});

test('handles empty libraries without leaving an empty card', () => {
  render(<DailySpotlightCard library={[]} />);
  expect(screen.queryByRole('heading', { name: "Today's Spotlight" })).not.toBeInTheDocument();
});

test('retains cached facts offline with their original timestamps', async () => {
  DailySpotlightService.setEnabled(true);
  StorageService.set('dailySpotlightFactsV1', {
    108600: {
      store: { developers: ['Cached Studio'], fetchedAt: NOW.getTime() },
      players: { count: 123, fetchedAt: NOW.getTime() },
      attemptedAt: 1,
      complete: true,
    },
  });
  window.electronAPI.steamSpotlight.mockRejectedValue(new Error('offline'));
  render(<DailySpotlightCard library={[game]} />);
  expect(screen.getByText('Cached Studio')).toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/saved facts/i));
  expect(screen.getByText('123')).toBeInTheDocument();
});

test('does not display an old request under a new spotlight game', async () => {
  DailySpotlightService.setEnabled(true);
  let resolveOld;
  window.electronAPI.steamSpotlight.mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveOld = resolve;
      })
  );
  const { rerender } = render(<DailySpotlightCard library={[game]} />);
  await waitFor(() => expect(window.electronAPI.steamSpotlight).toHaveBeenCalled());
  rerender(<DailySpotlightCard library={[{ name: 'Different Game', platform: 'Local' }]} />);
  await act(async () => resolveOld({ ok: true, store: { developers: ['Wrong Studio'], fetchedAt: NOW.getTime() } }));
  expect(screen.getByRole('heading', { name: 'Different Game' })).toBeInTheDocument();
  expect(screen.queryByText('Wrong Studio')).not.toBeInTheDocument();
});

test('rotates on calendar rollover while mounted and on returning from sleep', () => {
  jest.useFakeTimers().setSystemTime(new Date('2026-09-23T23:59:30Z'));
  const second = { name: 'Other Game', platform: 'Local' };
  render(<DailySpotlightCard library={[game, second]} />);
  const first = screen.getByRole('heading', { level: 3 }).textContent;
  act(() => jest.advanceTimersByTime(60000));
  expect(screen.getByRole('heading', { level: 3 }).textContent).not.toBe(first);
  jest.setSystemTime(new Date('2026-09-25T12:00:00Z'));
  fireEvent.focus(window);
  expect(screen.getByRole('heading', { level: 3 }).textContent).toBe(first);
});
