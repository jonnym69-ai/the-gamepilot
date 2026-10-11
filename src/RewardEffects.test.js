import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Recommendations from './Recommendations';
import GamingLinks from './GamingLinks';
import HomeLayoutContent, { getTodayLayoutStyle } from './components/HomeLayoutContent';
import Rewards from './Rewards';
import StorageService from './services/StorageService';
import { AchievementTracker } from './AchievementSystem';
import { ProgressionUnlockService } from './services/ProgressionUnlockService';
import HowLongToBeatService from './services/HowLongToBeatService';
import { RecommendationEngine } from './services/RecommendationEngine';
import { UserBehaviorProfile } from './services/UserBehaviorProfile';

jest.mock('./NavBar', () => () => null);
jest.mock('./components/LazyImage', () => ({ alt }) => <img alt={alt} />);
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  Link: ({ to, children, ...props }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));
jest.mock('./components/Toast', () => ({ useToast: () => ({ success: jest.fn(), error: jest.fn() }) }));

beforeEach(() => {
  localStorage.clear();
  jest.spyOn(ProgressionUnlockService, 'getTotalXP').mockReturnValue(1000000);
});

afterEach(() => jest.restoreAllMocks());

test.each([
  ['getHomeLayoutVariants', 'selectHomeLayoutVariant', 'selectedHomeLayout'],
  ['getLibraryPresentationVariants', 'selectLibraryPresentationVariant', 'selectedLibraryVariant'],
  ['getCardStyles', 'selectCardStyle', 'selectedCardStyle'],
  ['getRecommendationPacks', 'selectRecommendationPack', 'selectedRecommendationPack'],
  ['getGamingLinksFeatures', 'selectGamingLinksFeatures', 'selectedGamingLinksFeatures'],
  ['getGamingLinksLayouts', 'selectGamingLinksLayout', 'selectedGamingLinksLayout'],
  ['getLogoAnimations', 'selectLogoAnimation', 'selectedLogoAnimation'],
])('%s selections persist and reject locked or unknown rewards', (catalog, select, key) => {
  const service = ProgressionUnlockService;
  const rewards = service[catalog]();
  for (const reward of rewards) {
    expect(service[select](reward.id).success).toBe(true);
    expect(service.getRewardPresentationCustomization()[key]).toBe(reward.id);
    expect(StorageService.get('rewardPresentationCustomization')[key]).toBe(reward.id);
  }
  expect(service[select]('missing-reward').success).toBe(false);
  service.getTotalXP.mockReturnValue(0);
  const before = service.getRewardPresentationCustomization()[key];
  for (const reward of service[catalog]().filter((item) => !item.unlocked)) {
    expect(service[select](reward.id).success).toBe(false);
    expect(service.getRewardPresentationCustomization()[key]).toBe(before);
  }
});

test.each([
  ['mission_control', ['Library', 'Persona', 'Tools', 'Wishlist']],
  ['focus_finder', ['Tools', 'Library', 'Wishlist']],
  ['dashboard_split', ['Library', 'Persona', 'Tools', 'Wishlist']],
  ['streamer_overlay', ['Library', 'Tools']],
  ['arcade_cabinet', ['Library', 'Persona', 'Tools', 'Wishlist']],
])('%s uses the intended sections in DOM and keyboard order', (layoutId, expected) => {
  const { rerender } = render(
    <HomeLayoutContent layoutId={layoutId}>
      <section key="library" className="home-library-section">
        Library
      </section>
      <section key="persona" className="home-persona-section">
        Persona
      </section>
      <section key="tools" className="home-tools-section">
        Tools
      </section>
      <section key="wishlist" className="home-wishlist-section">
        Wishlist
      </section>
    </HomeLayoutContent>
  );
  expect(screen.getByRole('main')).toHaveTextContent(expected.join(''));
  rerender(
    <HomeLayoutContent layoutId="mission_control">
      <section>Restored</section>
    </HomeLayoutContent>
  );
  expect(screen.getByRole('main')).toHaveTextContent('Restored');
});

test.each(['mission_control', 'focus_finder', 'dashboard_split', 'streamer_overlay', 'arcade_cabinet'])(
  '%s keeps explicitly selected Home views accessible without mounting other sections',
  (layoutId) => {
    const hiddenMount = jest.fn(() => <div>Hidden recommendation</div>);
    const HiddenRecommendation = hiddenMount;
    const { rerender } = render(
      <HomeLayoutContent layoutId={layoutId} view="identity">
        <HiddenRecommendation className="home-tools-section" />
        <section className="home-persona-section">Era archive</section>
        <section className="home-wishlist-section">Wishlist details</section>
      </HomeLayoutContent>
    );
    expect(screen.getByRole('main')).toHaveTextContent('Era archive');
    expect(screen.queryByText('Wishlist details')).not.toBeInTheDocument();
    expect(hiddenMount).not.toHaveBeenCalled();
    rerender(
      <HomeLayoutContent layoutId={layoutId} view="wishlist">
        <section className="home-persona-section">Era archive</section>
        <section className="home-wishlist-section">Wishlist details</section>
      </HomeLayoutContent>
    );
    expect(screen.getByRole('main')).toHaveTextContent('Wishlist details');
    expect(screen.queryByText('Era archive')).not.toBeInTheDocument();
  }
);

test('Rewards Home layout cards equip using the keyboard and link to the affected page', () => {
  render(<Rewards />);
  fireEvent.click(screen.getByRole('button', { name: /Home Layout/ }));
  fireEvent.keyDown(screen.getByRole('button', { name: 'Focus Finder' }), { key: 'Enter' });
  expect(ProgressionUnlockService.getRewardPresentationCustomization().selectedHomeLayout).toBe('focus_finder');
  expect(screen.getByRole('button', { name: 'Focus Finder' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('link', { name: 'View your Home layout' })).toHaveAttribute('href', '/');
});

test('Rewards totals include card styles, animations and showcase slots without counting gameplay titles as XP steps', () => {
  ProgressionUnlockService.getTotalXP.mockReturnValue(0);
  const summary = ProgressionUnlockService.getRewardCatalogSummary();
  expect(summary.totalCounts.total).toBeGreaterThan(0);
  expect(summary.unlockedCounts.total).toBeGreaterThan(0);
  expect(summary.totalCounts.cardStyles).toBe(ProgressionUnlockService.getCardStyles().length);
  expect(summary.totalCounts.logoAnimations).toBe(ProgressionUnlockService.getLogoAnimations().length);
  expect(summary.totalCounts.showcaseSlots).toBe(ProgressionUnlockService.getShowcaseSlots().length);
  expect(summary.totalCounts.total).toBe(
    Object.entries(summary.totalCounts).reduce((sum, [key, value]) => sum + (key === 'total' ? 0 : value), 0)
  );
  expect(summary.unlockedCounts.total).toBe(
    Object.entries(summary.unlockedCounts).reduce((sum, [key, value]) => sum + (key === 'total' ? 0 : value), 0)
  );
  expect(summary.nextUnlock.remainingXP).toBeGreaterThan(0);
  expect(summary.upcomingUnlocks.some((reward) => reward.signature)).toBe(false);
  render(<Rewards />);
  expect(screen.getByText(`${summary.unlockedCounts.total}/${summary.totalCounts.total}`)).toBeInTheDocument();
  expect(screen.queryByText('0 XP left')).not.toBeInTheDocument();
});

test('Rewards shows where XP comes from, including the latest bonus award', () => {
  AchievementTracker.grantXP('daily_checkin', 75, { streak: 2 });
  render(<Rewards />);
  const sources = screen.getByTestId('rewards-xp-sources');
  for (const label of ['hours played', 'sessions & habits', 'launches', 'check-ins & events']) {
    expect(sources).toHaveTextContent(label);
  }
  expect(sources).toHaveTextContent('Latest: +75 Daily check-in');
});

test('Home reward previews use the same layout definitions as Today', () => {
  render(<Rewards />);
  fireEvent.click(screen.getByRole('button', { name: /Home Layout/ }));
  const layouts = ProgressionUnlockService.getHomeLayoutVariants();
  expect(new Set(layouts.map((layout) => JSON.stringify(getTodayLayoutStyle(layout.id)))).size).toBe(5);
  for (const layout of layouts) {
    const card = screen.getByRole('button', { name: layout.name, exact: true });
    expect(screen.getByRole('img', { name: `${layout.name} Today preview` })).toHaveStyle(
      getTodayLayoutStyle(layout.id)
    );
    expect(card).toHaveTextContent('Today · Discover · Activity · Identity · Wishlist');
  }
});

test.each([
  ['getProfileFrames', 'selectProfileFrame', 'selectedFrame'],
  ['getProfileBanners', 'selectProfileBanner', 'selectedBanner'],
  ['getProfileTitles', 'selectProfileTitle', 'selectedTitle'],
])('%s broadcasts each equipped choice to mounted identity surfaces', (catalog, select, key) => {
  const listener = jest.fn();
  window.addEventListener('gamepilot:profile-updated', listener);
  try {
    for (const reward of ProgressionUnlockService[catalog]()) {
      if (!reward.unlocked) continue;
      listener.mockClear();
      const result = ProgressionUnlockService[select](reward.id);
      expect(result.success).toBe(true);
      expect(ProgressionUnlockService.getProfileCustomization()[key]).toBe(reward.id);
      expect(listener).toHaveBeenCalledTimes(1);
    }
  } finally {
    window.removeEventListener('gamepilot:profile-updated', listener);
  }
});

test('recommendation packs apply immediately and survive remounting', () => {
  const { unmount } = render(<Recommendations library={[]} onLaunchGame={jest.fn()} />);
  for (const pack of ProgressionUnlockService.getRecommendationPacks()) {
    act(() => ProgressionUnlockService.selectRecommendationPack(pack.id));
    expect(screen.getByTestId('recommendations-page')).toHaveStyle({
      '--recommendation-accent': pack.accentColor,
    });
  }
  unmount();
  render(<Recommendations library={[]} onLaunchGame={jest.fn()} />);
  expect(screen.getByTestId('recommendations-page')).toHaveStyle({
    '--recommendation-accent': '#f5b700',
  });
});

test('card styles reach recommendations, not just the Library', () => {
  render(<Recommendations library={[]} onLaunchGame={jest.fn()} />);
  for (const style of ProgressionUnlockService.getCardStyles()) {
    act(() => ProgressionUnlockService.selectCardStyle(style.id));
    expect(screen.getByTestId('recommendations-page')).toHaveClass(`reward-card-style-${style.id}`);
  }
});

test('Gaming Links provides defaults on first use and Category Icons has a visible effect', () => {
  render(<GamingLinks />);
  expect(screen.getByText('Steam')).toBeInTheDocument();
  expect(screen.queryByTestId('category-icon')).not.toBeInTheDocument();
  act(() => ProgressionUnlockService.selectGamingLinksFeatures('category_icons'));
  expect(screen.getAllByTestId('category-icon').length).toBeGreaterThan(0);
  act(() => ProgressionUnlockService.selectGamingLinksFeatures('basic_hover'));
  expect(screen.queryByTestId('category-icon')).not.toBeInTheDocument();
});

test('Recommendations leads with the picker and preserves hidden swipe data', () => {
  const shortlist = [{ name: 'Saved game', appid: 123 }];
  StorageService.set('swipeDeckShortlist', shortlist);
  StorageService.set('swipeDeckHistory', { '2026-10-01': [123] });
  render(<Recommendations library={shortlist} onLaunchGame={jest.fn()} />);
  expect(screen.getByRole('heading', { name: /Perfect Play/ })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Identity Picks/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /More ways to choose/ }));
  expect(screen.getByRole('button', { name: /Identity Picks/ })).toBeInTheDocument();
  expect(screen.queryByText('Swipe Deck')).not.toBeInTheDocument();
  expect(StorageService.get('swipeDeckShortlist')).toEqual(shortlist);
  expect(StorageService.get('swipeDeckHistory')).toEqual({ '2026-10-01': [123] });
});

const openRecommendationStyle = (name) => {
  fireEvent.click(screen.getByRole('button', { name: /More ways to choose/ }));
  fireEvent.click(screen.getByRole('button', { name }));
};

test('Untouched Shelf uses the shared unplayed classification and offers launch', () => {
  const unplayed = { name: 'New adventure', appid: 1, time_played: 2 };
  const launch = jest.fn();
  render(
    <Recommendations
      library={[
        unplayed,
        { name: 'Steam veteran', appid: 2, importedPlaytimeMinutes: 600 },
        { name: 'Played elsewhere', appid: 3, playedElsewhere: true },
        { name: 'Hidden game', appid: 4, hidden: true },
      ]}
      onLaunchGame={launch}
    />
  );
  openRecommendationStyle(/Untouched Shelf/);
  expect(screen.queryByText('Steam veteran')).not.toBeInTheDocument();
  expect(screen.queryByText('Played elsewhere')).not.toBeInTheDocument();
  expect(screen.queryByText('Hidden game')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Launch New adventure' }));
  expect(launch).toHaveBeenCalledWith(unplayed);
});

test('Momentum includes imported hours', () => {
  render(<Recommendations library={[{ name: 'Imported game', importedPlaytimeMinutes: 600 }]} />);
  openRecommendationStyle(/Momentum Picks/);
  expect(screen.getByText('Imported game')).toBeInTheDocument();
  expect(screen.getByText(/10h/)).toBeInTheDocument();
});

test('Short game suggestions require a known short completion estimate, not low playtime', () => {
  jest.spyOn(HowLongToBeatService, 'getEstimate').mockImplementation((game) => {
    const hours = { 'Short story': 1.5, 'Long RPG': 80, 'Invalid estimate': -1 }[game.name];
    return hours === undefined ? null : { mainStory: hours };
  });
  render(
    <Recommendations
      library={[
        { name: 'Short story' },
        { name: 'Long RPG', time_played: 60 },
        { name: 'Unknown length', time_played: 30 },
        { name: 'Invalid estimate' },
      ]}
    />
  );
  openRecommendationStyle(/Session Playlist/);
  expect(screen.getByText('Short story')).toBeInTheDocument();
  expect(screen.queryByText('Long RPG')).not.toBeInTheDocument();
  expect(screen.queryByText('Unknown length')).not.toBeInTheDocument();
  expect(screen.queryByText('Invalid estimate')).not.toBeInTheDocument();
});

test('Recommendation results are rendered once and launch the original game', () => {
  const game = { name: 'One clear pick', appid: 123 };
  jest.spyOn(RecommendationEngine, 'getRediscoverResult').mockReturnValue({ games: [game] });
  const launch = jest.fn();
  render(<Recommendations library={[game]} onLaunchGame={launch} />);
  openRecommendationStyle(/Rediscover/);
  expect(screen.getAllByText(game.name)).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: `Launch ${game.name}` }));
  expect(launch).toHaveBeenCalledWith(game);
});

test('The main picker records Perfect Play launch attribution', () => {
  const game = { name: 'Focused pick', appid: 456, genres: ['Strategy'] };
  jest.spyOn(RecommendationEngine, 'getPerfectPlaySelectionResult').mockReturnValue({
    games: [game],
    primaryGame: game,
    totalMatches: 1,
    entries: [],
  });
  const tracking = jest.spyOn(UserBehaviorProfile, 'trackRecommendationLaunch');
  const launch = jest.fn();
  render(<Recommendations library={[game]} onLaunchGame={launch} />);
  fireEvent.click(screen.getByRole('button', { name: 'Focused', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: /Play Now/ }));
  expect(launch).toHaveBeenCalledWith(game);
  expect(tracking).toHaveBeenCalledWith('perfect-play', 456, expect.any(Object));
});

test('The picker accepts time alone and displays each suggested game once', () => {
  const game = { name: 'Quick pick', appid: 456 };
  const alternate = { name: 'Another pick', appid: 789 };
  const select = jest.spyOn(RecommendationEngine, 'getPerfectPlaySelectionResult').mockReturnValue({
    games: [game, alternate],
    primaryGame: game,
    totalMatches: 2,
    entries: [{ game }, { game: alternate }],
  });
  const launch = jest.fn();
  render(<Recommendations library={[game, alternate]} onLaunchGame={launch} />);
  fireEvent.click(screen.getByRole('button', { name: '30 min' }));
  expect(select).toHaveBeenCalledWith([game, alternate], [], [], 30, 3);
  expect(screen.getAllByText('Quick pick')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Play Another pick' }));
  expect(launch).toHaveBeenCalledWith(alternate);
});

test('clearing Gaming Links stays empty after remounting', () => {
  StorageService.set('gamingLinks', [
    { id: 1, name: 'Steam', url: 'https://store.steampowered.com', category: 'Store' },
  ]);
  const { unmount } = render(<GamingLinks />);
  fireEvent.click(screen.getByRole('button', { name: 'Clear All Links' }));
  unmount();
  render(<GamingLinks />);
  expect(screen.queryByText('Steam')).not.toBeInTheDocument();
});
