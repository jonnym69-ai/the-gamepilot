import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { PerfectPlaySelector } from './PerfectPlaySelector';
import { RecommendationEngine } from '../services/RecommendationEngine';
import { RecommendationTuningService } from '../services/RecommendationTuningService';
import { RecommendationExplainer } from '../services/RecommendationExplainer';

jest.mock('./LazyImage', () => ({ alt }) => <img alt={alt} data-testid="lazy-art" />);

const makeLibrary = () => [
  { name: 'Hades', appid: 1, platform: 'Steam', genres: ['Action'], time_played: 3000, launch_count: 40 },
  { name: 'Terraria', appid: 2, platform: 'Steam', genres: ['Sandbox'], time_played: 1200, launch_count: 12 },
  { name: 'Fez', appid: 3, platform: 'Steam', genres: ['Puzzle'], time_played: 0, launch_count: 0 },
];

const payloadFor = (games) => ({
  recommendationType: 'perfect-play',
  entries: games.map((game) => ({ game })),
  games,
  primaryEntry: games.length ? { game: games[0] } : null,
  primaryGame: games[0] || null,
});

beforeEach(() => {
  localStorage.clear();
  jest
    .spyOn(RecommendationEngine, 'getPerfectPlayResult')
    .mockImplementation((library, mood, genre, time, count) => payloadFor((library || []).slice(0, count)));
  jest.spyOn(RecommendationTuningService, 'applyTuningToWeights');
  jest.spyOn(RecommendationExplainer, 'getDetailedExplanation').mockReturnValue(null);
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('shows picks immediately with no mood, genre, or time selection step', () => {
  const library = makeLibrary();
  render(<PerfectPlaySelector library={library} />);

  expect(RecommendationEngine.getPerfectPlayResult).toHaveBeenCalledWith(library, null, null, null, 10);
  expect(RecommendationTuningService.applyTuningToWeights).toHaveBeenCalled();
  expect(screen.getByText('Top picks from your library, ranked by how you actually play.')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: '3 picks for right now' })).toBeInTheDocument();
  expect(screen.getByText('✨ Best Match')).toBeInTheDocument();
  expect(screen.getByText('Hades')).toBeInTheDocument();
  expect(screen.getByText('Other picks')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Play Terraria' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Play Fez' })).toBeInTheDocument();

  // The old pickers and gated empty state are gone.
  expect(screen.queryByText(/Select Moods/)).not.toBeInTheDocument();
  expect(screen.queryByText(/Select Genres/)).not.toBeInTheDocument();
  expect(screen.queryByText(/Available Time/)).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Relaxed' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Competitive' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Any Time' })).not.toBeInTheDocument();
  expect(screen.queryByText(/to get started/)).not.toBeInTheDocument();
});

test('reason chips receive null mood, genre, and time', () => {
  render(<PerfectPlaySelector library={makeLibrary()} />);

  expect(RecommendationExplainer.getDetailedExplanation).toHaveBeenCalled();
  RecommendationExplainer.getDetailedExplanation.mock.calls.forEach(([game, mood, genre, time, type]) => {
    expect(game).toBeTruthy();
    expect(mood).toBeNull();
    expect(genre).toBeNull();
    expect(time).toBeNull();
    expect(type).toBe('perfect-play');
  });
});

test('familiarity toggle persists the bias and re-ranks picks', () => {
  render(<PerfectPlaySelector library={makeLibrary()} />);
  const callsBefore = RecommendationEngine.getPerfectPlayResult.mock.calls.length;

  fireEvent.click(screen.getByRole('button', { name: 'Fresh' }));

  expect(JSON.parse(localStorage.getItem('gamepilot-familiarityBias'))).toBe('fresh');
  expect(screen.getByRole('button', { name: 'Fresh' })).toHaveClass('selected');
  expect(RecommendationEngine.getPerfectPlayResult.mock.calls.length).toBeGreaterThan(callsBefore);
});

test('tuning controls still persist through the tuning service', () => {
  render(<PerfectPlaySelector library={makeLibrary()} />);

  fireEvent.click(screen.getByRole('button', { name: 'Exploration slot on' }));

  expect(screen.getByRole('button', { name: 'Exploration slot off' })).toBeInTheDocument();
  const stored = JSON.parse(localStorage.getItem('gamepilot-recommendationTuning'));
  expect(stored.explorationEnabled).toBe(false);
});

test('selecting a pick hands the game object through', () => {
  const onGameSelected = jest.fn();
  render(<PerfectPlaySelector library={makeLibrary()} onGameSelected={onGameSelected} />);

  fireEvent.click(screen.getByRole('button', { name: 'Play Now' }));
  expect(onGameSelected).toHaveBeenCalledWith(expect.objectContaining({ name: 'Hades' }));

  fireEvent.click(screen.getByRole('button', { name: 'Play Fez' }));
  expect(onGameSelected).toHaveBeenCalledWith(expect.objectContaining({ name: 'Fez' }));
});

test('best match and list rows render cover artwork', () => {
  render(<PerfectPlaySelector library={makeLibrary()} />);

  // Best Match art is labelled with the game; row thumbs are decorative.
  expect(screen.getByRole('img', { name: 'Hades' })).toBeInTheDocument();
  expect(screen.getAllByTestId('lazy-art')).toHaveLength(3);
});

test('an empty library gets an honest empty state instead of a picker', () => {
  render(<PerfectPlaySelector library={[]} />);

  expect(screen.getByRole('heading', { name: '0 picks for right now' })).toBeInTheDocument();
  expect(screen.getByText('No picks to show right now.')).toBeInTheDocument();
  expect(screen.queryByText(/Select Moods/)).not.toBeInTheDocument();
});
