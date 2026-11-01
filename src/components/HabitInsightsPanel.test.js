import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import html2canvas from 'html2canvas';
import HabitInsightsPanel from './HabitInsightsPanel';
import { findLibraryGame } from '../services/PeriodChampionService';
import { resolveGameArtworkBundle } from '../services/GameArtworkService';
import { StatsAggregationService } from '../services/StatsAggregationService';

jest.mock('html2canvas', () =>
  jest.fn(() =>
    Promise.resolve({
      toBlob: (callback) => callback(new Blob(['png'], { type: 'image/png' })),
    })
  )
);
jest.mock('../services/LocalShareService', () => ({
  LocalShareService: {
    copyTextToClipboard: jest.fn(() => Promise.resolve(true)),
    copyImageToClipboard: jest.fn(() => Promise.resolve(true)),
    openShareIntent: jest.fn(() => Promise.resolve(true)),
    getSupportedChannels: jest.fn(() => [{ id: 'x', label: 'X' }]),
    canCopyImage: jest.fn(() => true),
    canUseNativeShare: jest.fn(() => false),
  },
}));
jest.mock('../services/ProfileService', () => ({
  __esModule: true,
  default: {
    getCurrentUsername: jest.fn(() => 'Pilot'),
    getEnabledSocialLinks: jest.fn(() => []),
    getSocialLinks: jest.fn(() => []),
    appendSocialLinksToShareText: jest.fn((text) => text),
  },
  ProfileService: {
    getCurrentUsername: jest.fn(() => 'Pilot'),
    getEnabledSocialLinks: jest.fn(() => []),
    getSocialLinks: jest.fn(() => []),
    appendSocialLinksToShareText: jest.fn((text) => text),
  },
  SOCIAL_PLATFORMS: {},
}));
jest.mock('../services/UserBehaviorProfile', () => ({
  UserBehaviorProfile: {
    getPersonaSnapshot: jest.fn(() => ({})),
    getPeakPlayHours: jest.fn(() => []),
    getTopMoods: jest.fn(() => []),
    getTimeOfDay: jest.fn(() => 'Evening'),
  },
}));
jest.mock('../services/StatsAggregationService', () => ({
  StatsAggregationService: {
    getDashboardData: jest.fn(),
  },
}));
jest.mock('../services/GameCurationService', () => ({
  GameCurationService: {
    enrichLibrary: jest.fn((library) => library),
    getGameCompletion: jest.fn(() => ({ status: 'not-started' })),
    getDateAdded: jest.fn(() => null),
  },
}));
jest.mock('../GamingIdentity', () => ({
  GamingIdentity: {
    getSignatureGames: jest.fn(() => []),
    detectTasteClusters: jest.fn(() => []),
  },
}));
jest.mock('../services/GamingPersonaService', () => ({
  __esModule: true,
  default: {
    getPersona: jest.fn(() => ({
      primaryPersona: { label: 'The Explorer' },
      summaryRoast: 'You try everything once.',
      signals: {},
    })),
  },
}));
jest.mock('../services/RecommendationEngine', () => ({
  isGameUnplayed: jest.fn(() => false),
}));
jest.mock('../services/PeriodChampionService', () => ({
  findLibraryGame: jest.fn(),
}));
jest.mock('../services/GameArtworkService', () => ({
  resolveGameArtworkBundle: jest.fn(),
}));

const library = [{ name: 'Hades', appid: 1145360, platform: 'steam', genres: ['Action'], time_played: 6000 }];

const dashboard = {
  periods: {
    all: {
      label: 'All Time',
      playtimeMinutes: 6000,
      playtimeHours: 100,
      sessions: 20,
      avgSessionMinutes: 300,
      recentSessions: [],
      moodCounts: {},
      habitInsights: {
        longestSession: { gameName: 'Hades', platform: 'steam', playtimeMinutes: 400, dateLabel: '12 Oct' },
        busiestDay: { dateLabel: '14 Oct', playtimeMinutes: 400, sessions: 3 },
        mostReturnedTo: {
          id: '1145360',
          name: 'Hades',
          platform: 'steam',
          coverUrl: '',
          sessions: 5,
          totalPlaytime: 900,
        },
        weekendSessions: 2,
        lateNightSessions: 1,
        repeatGames: 1,
      },
    },
  },
  importedPlaytime: { totalMinutes: 0 },
};

beforeEach(() => {
  jest.clearAllMocks();
  URL.createObjectURL = jest.fn(() => 'blob:mock');
  URL.revokeObjectURL = jest.fn();
  StatsAggregationService.getDashboardData.mockReturnValue(dashboard);
  findLibraryGame.mockReturnValue(library[0]);
  resolveGameArtworkBundle.mockReturnValue({
    artwork: 'https://cdn.test/hades-portrait.jpg',
    fallbackSrc: '',
    placeholder: 'data:image/svg+xml,hades',
  });
});

test('renders a share menu and mounts the hidden share card with resolved covers', () => {
  render(<HabitInsightsPanel library={library} />);
  expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument();
  // Hidden card renders the habits title + cover for both game-naming stats.
  expect(screen.getByText('Deeper Play Habits')).toBeInTheDocument();
  expect(screen.getAllByRole('img', { name: 'Hades cover' })).toHaveLength(2);
  expect(resolveGameArtworkBundle).toHaveBeenCalledWith(library[0], expect.objectContaining({ surface: 'portrait' }));
});

test('save share image rasterizes the hidden card through html2canvas', async () => {
  render(<HabitInsightsPanel library={library} />);
  fireEvent.click(screen.getByRole('button', { name: /share/i }));
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Save share image' }));
  await waitFor(() => expect(html2canvas).toHaveBeenCalled());
  expect(html2canvas).toHaveBeenCalledWith(expect.any(HTMLElement), expect.objectContaining({ useCORS: true }));
});

test('covers fall back to a session stub when the game is not in the library', () => {
  findLibraryGame.mockReturnValue(null);
  render(<HabitInsightsPanel library={library} />);
  expect(resolveGameArtworkBundle).toHaveBeenCalledWith(
    expect.objectContaining({ name: 'Hades', appid: 1145360 }),
    expect.objectContaining({ surface: 'portrait' })
  );
  expect(screen.getAllByRole('img', { name: 'Hades cover' })).toHaveLength(2);
});
