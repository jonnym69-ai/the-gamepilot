import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { FreeGameRadar } from './services/FreeGameRadar';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import Home from './Home';
import PlayNextService from './services/PlayNextService';
import CurrentEraService from './services/CurrentEraService';
import SessionRepository from './services/SessionRepository';
import BuyRecommendationService from './services/BuyRecommendationService';
import WishlistService from './services/WishlistService';

jest.mock('./services/FreeGameRadar', () => ({
  ...jest.requireActual('./services/FreeGameRadar'),
  FreeGameRadar: { getEpicRadar: jest.fn(() => new Promise(() => {})) },
}));
jest.mock('./NavBar', () => () => null);
jest.mock('./components/LazyImage', () => ({ alt }) => <img alt={alt} />);
jest.mock('./components/MilestoneToast', () => () => null);
jest.mock('./components/LibrarianHubCarousel', () => () => <div>Identity hub</div>);
jest.mock('./components/DailyDoodleTitle', () => () => <div>Daily doodle</div>);
jest.mock('./components/DailyParadox', () => () => <div>Daily paradox</div>);
jest.mock('./components/PatchNotesBadge', () => () => <div>Patch notes</div>);
jest.mock('./components/WeeklyDigestCard', () => () => <div>Weekly digest</div>);
jest.mock('./components/SmartNudgeCard', () => () => <div>Smart nudge</div>);

const game = { name: 'Hades', platform: 'Steam', appid: 1145360, time_played: 120, genres: ['Action'] };

beforeEach(() => {
  localStorage.clear();
  FreeGameRadar.getEpicRadar.mockClear();
  localStorage.setItem('gettingStartedPreferences', JSON.stringify({ hasSeen: true }));
  jest.spyOn(PlayNextService, 'getPlayNext').mockReturnValue({
    mode: 'pick',
    primary: { game, reason: 'Fits your recent sessions.' },
    alternates: [{ game: { ...game, name: 'Terraria', appid: 105600 }, reason: 'Something different.' }],
  });
  jest.spyOn(CurrentEraService, 'getCurrentEra').mockReturnValue({
    name: 'The Hades Era',
    dayCount: 4,
    flavor: 'One more run.',
    snapshot: { totalMinutes: 120, topGames: [], windowDays: 14 },
  });
  jest
    .spyOn(SessionRepository, 'getSessionHistory')
    .mockReturnValue([{ gameName: 'Hades', playtimeMinutes: 40, endTime: new Date().toISOString() }]);
  jest.spyOn(BuyRecommendationService, 'getSnapshot').mockReturnValue({ enabled: false, entries: [] });
  jest.spyOn(WishlistService, 'isEnabled').mockReturnValue(false);
});

afterEach(() => jest.restoreAllMocks());

function BackButton() {
  const navigate = useNavigate();
  return <button onClick={() => navigate(-1)}>Go back</button>;
}

function setup(props = {}, route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Home library={[game]} {...props} />
      <BackButton />
    </MemoryRouter>
  );
}

test('Today shows the decision, Spotlight and compact story without mounting the old stacks', () => {
  const launch = jest.fn();
  setup({ onLaunchGame: launch });
  expect(screen.getByRole('heading', { name: 'Play Next' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: "Today's Spotlight" })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Your story' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'The Hades Era' })).toBeInTheDocument();
  expect(screen.getByText('Last recorded session')).toBeInTheDocument();
  expect(screen.queryByText('Weekly digest')).not.toBeInTheDocument();
  expect(screen.queryByText('Identity hub')).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Perfect Play' })).not.toBeInTheDocument();
  expect(screen.queryByText('Library shelves')).not.toBeInTheDocument();
  expect(BuyRecommendationService.getSnapshot).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Play', exact: true }));
  expect(launch).toHaveBeenCalledWith(game);
  fireEvent.click(screen.getByRole('button', { name: 'Another' }));
  fireEvent.click(screen.getByRole('button', { name: 'Play', exact: true }));
  expect(launch).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'Terraria' }));
});

test('manual views preserve deeper features and browser back navigation', () => {
  setup();
  const navigation = within(screen.getByRole('navigation', { name: 'Home sections' }));
  fireEvent.click(navigation.getByRole('link', { name: 'Discover' }));
  expect(screen.getByRole('heading', { name: 'Perfect Play', exact: true })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: "Today's Spotlight" })).not.toBeInTheDocument();
  expect(navigation.getByRole('link', { name: 'Discover' })).toHaveAttribute('aria-current', 'page');
  fireEvent.click(navigation.getByRole('link', { name: 'Activity' }));
  expect(screen.getByText('Weekly digest')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Session history' })).toHaveAttribute('href', '/recent-activity');
  expect(screen.queryByRole('heading', { name: 'Perfect Play', exact: true })).not.toBeInTheDocument();
  fireEvent.click(navigation.getByRole('link', { name: 'Identity' }));
  expect(screen.getByText('Identity hub')).toBeInTheDocument();
  expect(screen.getByText('Doodle & Paradox')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Full profile' })).toHaveAttribute('href', '/profile');
  fireEvent.click(navigation.getByRole('link', { name: 'Wishlist', exact: true }));
  expect(screen.getByRole('heading', { name: 'Track What to Buy Next' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Go back' }));
  expect(navigation.getByRole('link', { name: 'Identity' })).toHaveAttribute('aria-current', 'page');
  fireEvent.click(navigation.getByRole('link', { name: 'Today' }));
  expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Today');
});

test('Discover leads with rediscovery and Epic offers without fetching them on Today', () => {
  setup();
  expect(FreeGameRadar.getEpicRadar).not.toHaveBeenCalled();
  expect(screen.queryByRole('heading', { name: 'Epic Free Games' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: 'Discover', exact: true }));
  expect(screen.getByRole('heading', { name: 'Epic Free Games' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Rediscover your library' })).toBeInTheDocument();
  expect(FreeGameRadar.getEpicRadar).toHaveBeenCalledTimes(1);
  const main = within(screen.getByRole('main'));
  expect(main.getAllByRole('heading')[0]).toHaveTextContent('Rediscover your library');
  fireEvent.click(screen.getByRole('link', { name: 'Activity', exact: true }));
  expect(screen.queryByRole('heading', { name: 'Epic Free Games' })).not.toBeInTheDocument();
});

test('empty libraries get scan-first onboarding, not empty recommendation stacks', () => {
  const scan = jest.fn();
  const { rerender } = setup({ library: [], onScan: scan });
  fireEvent.click(screen.getByRole('button', { name: 'Scan Local Games' }));
  expect(scan).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('heading', { name: 'Your next session starts here' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Play Next' })).not.toBeInTheDocument();
  rerender(
    <MemoryRouter>
      <Home library={[]} loading onScan={scan} />
    </MemoryRouter>
  );
  expect(screen.getByRole('button', { name: 'Scanning...' })).toBeDisabled();
});

test('an invalid view falls back to Today and a missing pick has a useful fallback', () => {
  PlayNextService.getPlayNext.mockReturnValue(null);
  setup({}, '/?view=unknown');
  expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Today');
  expect(screen.getByText(/No pick just yet/)).toBeInTheDocument();
});

test('Dashboard retains its guided tools and weekly widgets', () => {
  setup({ mode: 'dashboard' }, '/dashboard');
  expect(screen.getByText('Library Today')).toBeInTheDocument();
  expect(screen.getByText('Weekly digest')).toBeInTheDocument();
  expect(screen.getByText('Tools & Recommendations')).toBeInTheDocument();
  expect(screen.queryByRole('navigation', { name: 'Home sections' })).not.toBeInTheDocument();
});

test('a directly opened Identity view survives remounting', () => {
  const { unmount } = setup({}, '/?view=identity');
  expect(screen.getByRole('link', { name: 'Identity', exact: true })).toHaveAttribute('aria-current', 'page');
  unmount();
  setup({}, '/?view=identity');
  expect(screen.getByText('Identity hub')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: "Today's Spotlight" })).not.toBeInTheDocument();
});

test('a new player sees honest story placeholders rather than invented progress', () => {
  CurrentEraService.getCurrentEra.mockReturnValue(null);
  SessionRepository.getSessionHistory.mockReturnValue([]);
  setup();
  expect(screen.getByText(/Your next era is taking shape/)).toBeInTheDocument();
  expect(screen.getByText(/No sessions recorded yet/)).toBeInTheDocument();
});

test('active sessions can still be ended directly from Today', () => {
  const endSession = jest.fn();
  setup({ activeSessions: { Hades: { startTime: Date.now() } }, endSession });
  fireEvent.click(screen.getByRole('button', { name: 'End session' }));
  expect(endSession).toHaveBeenCalledWith('Hades');
});
