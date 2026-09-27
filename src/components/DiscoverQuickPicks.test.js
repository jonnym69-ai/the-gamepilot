import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import DiscoverQuickPicks from './DiscoverQuickPicks';
import { RecommendationEngine } from '../services/RecommendationEngine';

jest.mock('./LazyImage', () => ({ alt }) => <img alt={alt} />);

const entry = (name, extras = {}) => ({
  game: { name, appid: name, platform: 'Steam' },
  mood: 'Focused',
  estimatedSessionMinutes: 90,
  explanation: { previewReasons: [`${name} fits how you play`], summary: '90% confident' },
  ...extras,
});

const library = [
  { name: 'Hades', appid: 1, platform: 'Steam' },
  { name: 'Terraria', appid: 2, platform: 'Steam' },
  { name: 'Zomboid', appid: 3, platform: 'Steam' },
];

beforeEach(() => {
  localStorage.clear();
  jest.spyOn(RecommendationEngine, 'getPerfectPlayResult').mockReturnValue({
    entries: library.map((game) => entry(game.name, { game })),
  });
});

afterEach(() => jest.restoreAllMocks());

test('shows three engine picks immediately, before any mood is chosen', () => {
  render(<DiscoverQuickPicks library={library} />);
  expect(screen.getByRole('heading', { name: "Can't decide?" })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Play Hades' })).toBeInTheDocument();
  expect(screen.getByText('Hades fits how you play')).toBeInTheDocument();
  expect(RecommendationEngine.getPerfectPlayResult).toHaveBeenLastCalledWith(library, null, null, null, 3);
});

test('mood and time pills steer the same picks instantly and toggle off', () => {
  render(<DiscoverQuickPicks library={library} />);
  fireEvent.click(screen.getByRole('button', { name: 'Relaxed' }));
  expect(RecommendationEngine.getPerfectPlayResult).toHaveBeenLastCalledWith(
    expect.anything(),
    'Relaxed',
    null,
    null,
    3
  );
  fireEvent.click(screen.getByRole('button', { name: '~30 min' }));
  expect(RecommendationEngine.getPerfectPlayResult).toHaveBeenLastCalledWith(
    expect.anything(),
    'Relaxed',
    null,
    'quick',
    3
  );
  fireEvent.click(screen.getByRole('button', { name: 'Relaxed' }));
  expect(RecommendationEngine.getPerfectPlayResult).toHaveBeenLastCalledWith(expect.anything(), null, null, 'quick', 3);
});

test('launch buttons hand the game object through and running games are hidden', () => {
  const launch = jest.fn();
  render(<DiscoverQuickPicks library={library} onLaunchGame={launch} activeSessions={{ Hades: {} }} />);
  expect(screen.queryByRole('button', { name: 'Play Hades' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Play Terraria' }));
  expect(launch).toHaveBeenCalledWith(expect.objectContaining({ name: 'Terraria' }));
});

test('string explanations still render and empty libraries get a scan prompt', () => {
  RecommendationEngine.getPerfectPlayResult.mockReturnValue({
    entries: [entry('Hades', { explanation: 'Because you like Action' })],
  });
  const { rerender } = render(<DiscoverQuickPicks library={library} />);
  expect(screen.getByText('Because you like Action')).toBeInTheDocument();

  RecommendationEngine.getPerfectPlayResult.mockReturnValue({ entries: [] });
  rerender(<DiscoverQuickPicks library={[]} />);
  expect(screen.getByText(/Scan your library/)).toBeInTheDocument();
});
