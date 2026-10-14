import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import TrendingNowCard from './TrendingNowCard';

jest.mock('./LazyImage', () => ({ alt }) => <img alt={alt} />);

const game = (name, appid) => ({ name, platform: 'Steam', appid });

afterEach(() => {
  delete window.electronAPI;
});

test('shows owned games that are on the live Steam chart', async () => {
  window.electronAPI = {
    steamMostPlayed: jest.fn().mockResolvedValue({
      ok: true,
      rows: [
        { appid: 730, rank: 1, concurrent: 1011472, peak: 1280126 },
        { appid: 570, rank: 2, concurrent: 763192, peak: 859106 },
      ],
      fetchedAt: Date.now(),
    }),
  };
  const library = [game('Counter-Strike 2', 730), game('Not On Chart', 999999)];

  render(<TrendingNowCard library={library} />);

  expect(await screen.findByText(/trending in your library/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Launch Counter-Strike 2' })).toHaveTextContent(
    '#1 globally · 1,011,472 playing'
  );
  expect(screen.queryByRole('button', { name: 'Launch Not On Chart' })).not.toBeInTheDocument();
});

test('launches the game on click', async () => {
  window.electronAPI = {
    steamMostPlayed: jest.fn().mockResolvedValue({
      ok: true,
      rows: [{ appid: 730, rank: 1, concurrent: 100, peak: 200 }],
      fetchedAt: Date.now(),
    }),
  };
  const onLaunchGame = jest.fn();
  render(<TrendingNowCard library={[game('Counter-Strike 2', 730)]} onLaunchGame={onLaunchGame} />);

  fireEvent.click(await screen.findByRole('button', { name: 'Launch Counter-Strike 2' }));
  expect(onLaunchGame).toHaveBeenCalledWith(expect.objectContaining({ name: 'Counter-Strike 2' }));
});

test('hides without the bridge, on failure, or with zero matches', async () => {
  const view = render(<TrendingNowCard library={[game('Solo', 1)]} />);
  expect(screen.queryByText(/trending in your library/i)).not.toBeInTheDocument();
  view.unmount();

  window.electronAPI = { steamMostPlayed: jest.fn().mockRejectedValue(new Error('offline')) };
  const utils = render(<TrendingNowCard library={[game('Solo', 1)]} />);
  await Promise.resolve();
  expect(screen.queryByText(/trending in your library/i)).not.toBeInTheDocument();
  utils.unmount();

  window.electronAPI = {
    steamMostPlayed: jest.fn().mockResolvedValue({ ok: true, rows: [{ appid: 730, rank: 1 }] }),
  };
  render(<TrendingNowCard library={[game('Solo', 1)]} />);
  await Promise.resolve();
  expect(screen.queryByText(/trending in your library/i)).not.toBeInTheDocument();
});
