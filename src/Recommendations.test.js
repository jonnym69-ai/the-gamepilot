import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Recommendations from './Recommendations';
import { RecommendationEngine } from './services/RecommendationEngine';
import { RecommendationExplainer } from './services/RecommendationExplainer';
import { GamingIdentity } from './GamingIdentity';
import { RECOMMENDATION_OUTCOME, UserBehaviorProfile } from './services/UserBehaviorProfile';
import { ToastProvider } from './components/Toast';

jest.mock('./NavBar', () => () => null);
jest.mock('./components/LazyImage', () => ({ alt }) => <img alt={alt} />);

const makeLibrary = () => [
  { name: 'Hades', appid: 1, platform: 'Steam', genres: ['Action', 'Roguelike'], time_played: 3000 },
  { name: 'Blasphemous', appid: 2, platform: 'Steam', genres: ['Action', 'Platformer'], time_played: 1200 },
  { name: 'Forager', appid: 3, platform: 'Steam', genres: ['Adventure', 'Indie'], time_played: 600 },
  { name: 'Stardew Valley', appid: 4, platform: 'Steam', genres: ['Simulation'], time_played: 60 },
  { name: 'Fez', appid: 5, platform: 'Steam', genres: ['Puzzle'], time_played: 0 },
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
  jest.spyOn(RecommendationExplainer, 'getDetailedExplanation').mockReturnValue(null);
  jest.spyOn(GamingIdentity, 'getProfile').mockReturnValue(null);
});

afterEach(() => {
  jest.restoreAllMocks();
});

function setup({ library = makeLibrary(), onLaunchGame = jest.fn() } = {}) {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Recommendations library={library} onLaunchGame={onLaunchGame} />
      </ToastProvider>
    </MemoryRouter>
  );
}

const openAlternatives = () => {
  fireEvent.click(screen.getByRole('button', { name: /More ways to choose/ }));
};

test('the hub leads with picks and factual copy, not mood selection', () => {
  setup();

  expect(
    screen.getByText('Picks from the games you already own — matched by how you actually play.')
  ).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /picks for right now/ })).toBeInTheDocument();
  expect(RecommendationEngine.getPerfectPlayResult).toHaveBeenCalledWith(expect.any(Array), null, null, null, 10);
  expect(screen.queryByText(/Pick a mood/)).not.toBeInTheDocument();
});

test('the alternatives grid offers Genre Mix, not Mood Mix', () => {
  setup();
  openAlternatives();

  expect(screen.getByRole('button', { name: /Genre Mix/ })).toBeInTheDocument();
  expect(screen.getByText('Stacks grouped by your library genres')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Mood Mix/ })).not.toBeInTheDocument();
});

test('genre mix stacks group games by genre and multi-genre games appear in each stack', () => {
  setup();
  openAlternatives();
  fireEvent.click(screen.getByRole('button', { name: /Genre Mix/ }));

  const cardFor = (title) => screen.getByRole('group', { name: title });
  const actionCard = cardFor('Action Mix');
  expect(within(actionCard).getByText('Hades')).toBeInTheDocument();
  expect(within(actionCard).getByText('Blasphemous')).toBeInTheDocument();
  expect(within(cardFor('Adventure Mix')).getByText('Forager')).toBeInTheDocument();
  expect(within(cardFor('Indie Mix')).getByText('Forager')).toBeInTheDocument();
  expect(within(cardFor('Roguelike Mix')).getByText('Hades')).toBeInTheDocument();

  // Biggest playtime lane leads: Action (3000 + 1200) before Roguelike (3000).
  const mixTitles = screen.getAllByRole('heading', { name: / Mix$/, level: 3 });
  expect(mixTitles).toHaveLength(6); // top-6 cap drops the zero-playtime Puzzle stack
  expect(mixTitles[0]).toHaveTextContent('Action Mix');
  expect(mixTitles[1]).toHaveTextContent('Roguelike Mix');
});

test('no mood labels render in mixes or card metadata', () => {
  setup();
  openAlternatives();
  fireEvent.click(screen.getByRole('button', { name: /Genre Mix/ }));

  ['Relaxed', 'Social', 'Creative', 'Focused', 'Competitive'].forEach((mood) => {
    expect(screen.queryByText(mood)).not.toBeInTheDocument();
  });
  // Strip cards carry the primary genre where the mood label used to sit.
  expect(screen.getAllByText('Action').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Adventure').length).toBeGreaterThan(0);
});

test('game rows show the primary genre instead of a mood label', () => {
  setup({
    library: [
      { name: 'Fez', appid: 5, platform: 'Steam', genres: ['Puzzle'], time_played: 0 },
      { name: 'Tunic', appid: 6, platform: 'Steam', genres: ['Action', 'Adventure'], time_played: 0 },
    ],
  });
  openAlternatives();
  fireEvent.click(screen.getByRole('button', { name: /Untouched Shelf/ }));

  // Fez (Puzzle) would have been labelled "Relaxed" and Tunic "Focused" by the
  // old mood mapping; rows now carry the primary genre instead.
  expect(screen.getByText(/Steam · Puzzle/)).toBeInTheDocument();
  expect(screen.getByText(/Steam · Action/)).toBeInTheDocument();
  ['Relaxed', 'Social', 'Creative', 'Focused', 'Competitive'].forEach((mood) => {
    expect(screen.queryByText(mood)).not.toBeInTheDocument();
  });
});

test('a library without genre data gets an honest empty state', () => {
  setup({ library: [{ name: 'Mystery Game', appid: 9, platform: 'Steam', time_played: 30 }] });
  openAlternatives();
  fireEvent.click(screen.getByRole('button', { name: /Genre Mix/ }));

  expect(screen.getByText('Not enough genre data to build mixes.')).toBeInTheDocument();
});

test('dismissing a pick records a not-for-me outcome and removes the row', () => {
  const outcomeSpy = jest.spyOn(UserBehaviorProfile, 'trackRecommendationOutcome');
  setup({
    library: [
      { name: 'Fez', appid: 5, platform: 'Steam', genres: ['Puzzle'], time_played: 0 },
      { name: 'Tunic', appid: 6, platform: 'Steam', genres: ['Action', 'Adventure'], time_played: 0 },
    ],
  });
  openAlternatives();
  fireEvent.click(screen.getByRole('button', { name: /Untouched Shelf/ }));

  fireEvent.click(screen.getByRole('button', { name: 'Not interested in Fez' }));

  expect(outcomeSpy).toHaveBeenCalledWith(
    '5',
    RECOMMENDATION_OUTCOME.NOT_FOR_ME,
    expect.objectContaining({ gameName: 'Fez' })
  );
  expect(screen.queryByText('Fez')).not.toBeInTheDocument();
  expect(screen.getByText('Tunic')).toBeInTheDocument();
});

test('style detail headers render the style title as a heading', () => {
  setup();
  openAlternatives();
  fireEvent.click(screen.getByRole('button', { name: /Untouched Shelf/ }));

  expect(screen.getByRole('heading', { name: 'Untouched Shelf' })).toBeInTheDocument();
});
