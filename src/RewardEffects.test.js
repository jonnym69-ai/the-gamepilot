import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Recommendations from './Recommendations';
import GamingLinks from './GamingLinks';
import HomeLayoutContent from './components/HomeLayoutContent';
import Rewards from './Rewards';
import StorageService from './services/StorageService';
import { ProgressionUnlockService } from './services/ProgressionUnlockService';

jest.mock('./NavBar', () => () => null);
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

test('Rewards Home layout cards equip using the keyboard and link to the affected page', () => {
  render(<Rewards />);
  fireEvent.click(screen.getByRole('button', { name: /Home Layout/ }));
  fireEvent.keyDown(screen.getByRole('button', { name: 'Focus Finder' }), { key: 'Enter' });
  expect(ProgressionUnlockService.getRewardPresentationCustomization().selectedHomeLayout).toBe('focus_finder');
  expect(screen.getByRole('button', { name: 'Focus Finder' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('link', { name: 'View your Home layout' })).toHaveAttribute('href', '/');
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
