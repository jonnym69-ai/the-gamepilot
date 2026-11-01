import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { FreeGameRadar } from './services/FreeGameRadar';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import Home from './Home';
import { ToastProvider } from './components/Toast';
import PlayNextService from './services/PlayNextService';
import CurrentEraService from './services/CurrentEraService';
import SessionRepository from './services/SessionRepository';
import BuyRecommendationService from './services/BuyRecommendationService';
import WishlistService from './services/WishlistService';

jest.mock('./services/FreeGameRadar', () => ({
  ...jest.requireActual('./services/FreeGameRadar'),
  FreeGameRadar: {
    getEpicRadar: jest.fn(() => new Promise(() => {})),
    getGiveaways: jest.fn(() => new Promise(() => {})),
  },
}));
jest.mock('./NavBar', () => () => null);
jest.mock('./components/LazyImage', () => ({ alt, onLoad }) => <img alt={alt} onLoad={onLoad} />);
jest.mock('./components/LibrarianHubCarousel', () => () => <div>Identity hub</div>);
jest.mock('./components/DailyDoodleTitle', () => () => <div>Daily doodle</div>);

const game = { name: 'Hades', platform: 'Steam', appid: 1145360, time_played: 120, genres: ['Action'] };

beforeEach(() => {
  localStorage.clear();
  FreeGameRadar.getEpicRadar.mockClear();
  FreeGameRadar.getGiveaways.mockClear();
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
      <ToastProvider>
        <Home library={[game]} {...props} />
      </ToastProvider>
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
  expect(screen.getByRole('link', { name: 'Session history' })).toHaveAttribute('href', '/recent-activity');
  expect(screen.queryByRole('heading', { name: 'Perfect Play', exact: true })).not.toBeInTheDocument();
  fireEvent.click(navigation.getByRole('link', { name: 'Identity' }));
  expect(screen.getByText('Identity hub')).toBeInTheDocument();
  expect(screen.queryByText('Doodle & Paradox')).not.toBeInTheDocument();
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
  expect(FreeGameRadar.getGiveaways).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Free-to-play essentials' })).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Epic Free Games' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: 'Discover', exact: true }));
  expect(screen.getByRole('heading', { name: 'Epic Free Games' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: "Can't decide?" })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Rediscover your library' })).toBeInTheDocument();
  expect(FreeGameRadar.getEpicRadar).toHaveBeenCalledTimes(1);
  const main = within(screen.getByRole('main'));
  expect(main.getAllByRole('heading')[0]).toHaveTextContent("Can't decide?");
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
      <ToastProvider>
        <Home library={[]} loading onScan={scan} />
      </ToastProvider>
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

test('Activity view explains empty states instead of showing a blank stack', () => {
  SessionRepository.getSessionHistory.mockReturnValue([]);
  setup({}, '/?view=activity');
  expect(screen.getByText(/No sessions recorded yet/)).toBeInTheDocument();
});

test('Today preserves every Home tab and session control', () => {
  const endSession = jest.fn();
  setup({ activeSessions: { Hades: { startTime: Date.now() } }, endSession });
  expect(screen.getByRole('heading', { name: 'Play Next' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: "Today's Spotlight" })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Your story' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'End session' }));
  expect(endSession).toHaveBeenCalledWith('Hades');
  const navigation = within(screen.getByRole('navigation', { name: 'Home sections' }));
  for (const view of ['Discover', 'Activity', 'Identity', 'Wishlist', 'Today']) {
    fireEvent.click(navigation.getByRole('link', { name: view, exact: true }));
    expect(navigation.getByRole('link', { name: view, exact: true })).toHaveAttribute('aria-current', 'page');
  }
});

test('active sessions can still be ended directly from Today', () => {
  const endSession = jest.fn();
  setup({ activeSessions: { Hades: { startTime: Date.now() } }, endSession });
  fireEvent.click(screen.getByRole('button', { name: 'End session' }));
  expect(endSession).toHaveBeenCalledWith('Hades');
});

const wishlistEntry = (name, conviction = 'strong', overrides = {}) => {
  const reason = overrides.reason || `Fits the same groove as Project Zomboid.`;
  return {
    id: name,
    game: { name, appid: overrides.appid || 999001, genres: overrides.genres || ['Survival'] },
    genre: 'Survival',
    explanation: { confidence: 0 },
    meta: {
      conviction,
      primaryReason: reason,
      buyReasons: [reason],
      evidence: conviction === 'strong' ? ['cluster', 'signature-genre'] : [],
      ownedAlternative: overrides.ownedAlternative || null,
      wishlistItem: { name, currentPrice: { price: 9.99, priceFormatted: '$9.99' } },
    },
  };
};

test('Buy Next cycles one wishlist card at a time and never shows a percentage', () => {
  BuyRecommendationService.getSnapshot.mockReturnValue({
    enabled: true,
    strongCount: 3,
    backlogFallback: null,
    entries: [
      wishlistEntry('Rust'),
      wishlistEntry('Valheim II', { appid: 999002 }),
      wishlistEntry('Sons of the Forest', { appid: 999003 }),
    ],
    message: 'Ranked from your wishlist and what you actually play.',
  });
  setup({}, '/?view=wishlist');

  expect(screen.getByRole('heading', { name: 'Rust' })).toBeInTheDocument();
  expect(screen.getByText('1 / 3')).toBeInTheDocument();
  expect(screen.getByText('Strong fit')).toBeInTheDocument();
  expect(screen.queryByText(/% match/)).not.toBeInTheDocument();
  expect(screen.queryByText(/%/)).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Next pick' }));
  expect(screen.getByRole('heading', { name: 'Valheim II' })).toBeInTheDocument();
  expect(screen.getByText('2 / 3')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Next pick' }));
  expect(screen.getByRole('heading', { name: 'Sons of the Forest' })).toBeInTheDocument();
  expect(screen.getByText('3 / 3')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Next pick' }));
  expect(screen.getByRole('heading', { name: 'Rust' })).toBeInTheDocument();
  expect(screen.getByText('1 / 3')).toBeInTheDocument();
});

test('Buy Next with no strong picks shows the not-ready message and a backlog alternative', () => {
  const launch = jest.fn();
  const backlogGame = { name: 'Dusty Shelf', appid: 111, genres: ['Survival'], time_played: 0 };
  BuyRecommendationService.getSnapshot.mockReturnValue({
    enabled: true,
    strongCount: 0,
    backlogFallback: {
      game: backlogGame,
      sharedGenres: ['Survival'],
      reason: 'Unplayed, and it sits right in your Survival lane.',
    },
    entries: [wishlistEntry('Meh Game', 'weak')],
    message: 'Nothing on your wishlist is calling yet — you might not be ready to buy.',
  });
  setup({ onLaunchGame: launch }, '/?view=wishlist');

  expect(screen.getByText(/might not be ready to buy/)).toBeInTheDocument();
  expect(screen.getByText('Try this from your backlog instead')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Dusty Shelf' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Meh Game' })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Play' }));
  expect(launch).toHaveBeenCalledWith(backlogGame);

  fireEvent.click(screen.getByRole('button', { name: 'Show wishlist picks anyway' }));
  expect(screen.getByRole('heading', { name: 'Meh Game' })).toBeInTheDocument();
});

test('Buy Next card renders cover-fit art over a blurred backdrop layer', () => {
  BuyRecommendationService.getSnapshot.mockReturnValue({
    enabled: true,
    strongCount: 1,
    backlogFallback: null,
    entries: [wishlistEntry('Rust')],
    message: 'Ranked from your wishlist and what you actually play.',
  });
  setup({}, '/?view=wishlist');

  expect(screen.getByTestId('buy-next-art-backdrop')).toHaveAttribute('aria-hidden', 'true');
  expect(screen.getByRole('img', { name: 'Rust' })).toBeInTheDocument();
});

test('Buy Next art slot switches to a landscape aspect when the loaded art is landscape', () => {
  BuyRecommendationService.getSnapshot.mockReturnValue({
    enabled: true,
    strongCount: 1,
    backlogFallback: null,
    entries: [wishlistEntry('Rust')],
    message: 'Ranked from your wishlist and what you actually play.',
  });
  setup({}, '/?view=wishlist');

  expect(screen.getByTestId('buy-next-art')).not.toHaveClass('buy-next-art--landscape');

  const img = screen.getByRole('img', { name: 'Rust' });
  Object.defineProperty(img, 'naturalWidth', { value: 460, configurable: true });
  Object.defineProperty(img, 'naturalHeight', { value: 215, configurable: true });
  fireEvent.load(img);

  expect(screen.getByTestId('buy-next-art')).toHaveClass('buy-next-art--landscape');
});

test('an owned-alternative line on a strong pick launches the owned game', () => {
  const launch = jest.fn();
  const ownedGame = { name: 'Owned Survival', appid: 555, genres: ['Survival'], time_played: 0 };
  BuyRecommendationService.getSnapshot.mockReturnValue({
    enabled: true,
    strongCount: 1,
    backlogFallback: null,
    entries: [
      wishlistEntry('Rust', 'strong', {
        ownedAlternative: { name: 'Owned Survival', appid: 555, sharedGenres: ['Survival'], game: ownedGame },
      }),
    ],
    message: 'Ranked from your wishlist and what you actually play.',
  });
  setup({ onLaunchGame: launch }, '/?view=wishlist');

  expect(screen.getByText(/You already own Owned Survival in this space/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Play' }));
  expect(launch).toHaveBeenCalledWith(ownedGame);
});

test('Today surfaces games newly added to the library with one-tap play tiles', () => {
  localStorage.setItem('gamepilot-scanTimestampsV1', JSON.stringify({ Hades: Date.now() }));
  setup();

  expect(screen.getByText('New to your library')).toBeInTheDocument();
  const tile = screen.getByRole('button', { name: 'Play Hades' });
  expect(within(tile).getByText('added today')).toBeInTheDocument();
});

test('New to your library stays hidden when nothing was scanned recently', () => {
  setup();
  expect(screen.queryByText('New to your library')).not.toBeInTheDocument();
});
