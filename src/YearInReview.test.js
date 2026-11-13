import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import YearInReview from './YearInReview';
import { YearInReviewService } from './services/YearInReviewService';
import { getRecapSeasonYear } from './utils/recapSeason';

jest.mock('html2canvas', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('./components/LazyImage', () => ({ alt }) => <img alt={alt} />);
jest.mock('./services/YearInReviewService', () => ({
  YearInReviewService: {
    getAvailableYears: jest.fn(() => [2024]),
    getYearSnapshot: jest.fn(),
  },
}));
jest.mock('./utils/recapSeason', () => ({ getRecapSeasonYear: jest.fn(() => null) }));

const ROAST = 'The Doomsday Prepper who replays everything: Every multiplayer game becomes a rehearsal.';

const baseSnapshot = {
  year: 2024,
  hasData: true,
  summary: {
    playtimeMinutes: 7200,
    playtimeHours: 120,
    sessions: 40,
    uniqueGames: 4,
    activeDays: 22,
    avgSessionMinutes: 180,
    longestSessionMinutes: 300,
  },
  summaryCards: [
    { id: 'headline', title: '2024 at a Glance', value: '120h', detail: '40 sessions across 4 games' },
    { id: 'top-game', title: 'Most Played', value: 'Stardew Valley', detail: '60h · 20 launches this year' },
    { id: 'longest-session', title: 'Longest Session', value: 'Celeste', detail: '5h · Feb 4' },
    { id: 'habits', title: 'Days Active', value: '22', detail: '40 sessions · ~180 min avg' },
    { id: 'busiest-day', title: 'Busiest Day', value: 'Feb 4', detail: '5h across 2 sessions' },
    { id: 'mood', title: 'Mood of the Year', value: 'Cozy', detail: '30 tracked sessions' },
    { id: 'top-genre', title: 'Top Genre', value: 'RPG', detail: '25 tracked sessions' },
    { id: 'platform', title: 'Platform Home', value: 'Steam', detail: '40 sessions' },
  ],
  distributions: {
    topPlatforms: [{ label: 'Steam', count: 40 }],
    topMoods: [{ label: 'Cozy', count: 30 }],
    topGenres: [{ label: 'RPG', count: 25 }],
  },
  topGames: [
    { id: 'Stardew Valley', name: 'Stardew Valley', platform: 'Steam', totalPlaytime: 3600, sessions: 20 },
    { id: 'Celeste', name: 'Celeste', platform: 'Steam', totalPlaytime: 1800, sessions: 12 },
  ],
  persona: {
    identityLabel: 'RPG steady player',
    identityDescription: 'A year of cosy sessions.',
    roast: ROAST,
    dominantMood: 'Cozy',
    dominantGenre: 'RPG',
    preferredSessionLabel: 'Marathon Missions',
    peakPlayWindow: 'Evening',
  },
  evolution: null,
  habits: { daysActive: 22, avgSessionMinutes: 180, sessionsCount: 40 },
  monthly: {
    playtimeHours: { Jan: 20, Feb: 30, Mar: 10 },
    playtimeMinutes: { Jan: 1200, Feb: 1800, Mar: 600 },
    sessionCounts: { Jan: 8, Feb: 14, Mar: 6 },
  },
  story: {
    paragraphs: [
      { id: 'opener', text: 'Your year started on 10 Jan with Stardew Valley.' },
      { id: 'dominant', text: 'Stardew Valley took 50% of your year — 60h over 20 launches.' },
      { id: 'closer', text: 'Verdict: RPG steady player.' },
    ],
  },
  deepStats: {
    longestSession: { gameName: 'Celeste', playtimeMinutes: 300, dateLabel: 'Feb 4' },
    busiestDay: { dateLabel: 'Feb 4', playtimeMinutes: 300, sessions: 2 },
    topBySessions: { name: 'Stardew Valley', sessions: 20, totalPlaytime: 3600 },
    weekendSessions: 12,
    weekendPlaytimeMinutes: 900,
    lateNightSessions: 3,
    lateNightPlaytimeMinutes: 240,
    gamesWithMultipleSessions: 2,
  },
  championJourney: { yearChampion: null, monthlyChampions: [] },
  eras: {
    stretches: [
      {
        name: 'The Stardew Valley Era',
        startMonth: 0,
        endMonth: 1,
        monthLabel: 'Jan–Feb',
        monthCount: 2,
        dominantGenre: 'RPG',
        dominantMood: 'Cozy',
        topGame: 'Stardew Valley',
        playtimeMinutes: 3000,
        playtimeHours: 50,
        sessionCount: 22,
      },
    ],
    recorded: [],
  },
  journalNotes: [{ gameName: 'Stardew Valley', note: 'good farm day', dateLabel: 'Jan 10', playtimeMinutes: 60 }],
  milestones: {
    hasAny: true,
    finished: [
      {
        name: 'Celeste',
        status: 'completed',
        at: new Date(2024, 5, 5, 20).getTime(),
        coverUrl: 'https://img/celeste.jpg',
        finishingSession: { endTime: new Date(2024, 5, 5, 20).getTime(), minutes: 180 },
        playtimeMinutes: 1800,
      },
      {
        name: 'Baldurs Gate 3',
        status: 'beaten',
        at: new Date(2024, 8, 12, 21).getTime(),
        coverUrl: '',
        finishingSession: null,
        playtimeMinutes: 600,
      },
    ],
    achievements: {
      unlockedThisYear: 12,
      gamesWithUnlocks: 3,
      rarest: { name: 'Cloud Nine', gameName: 'Celeste', percent: 1.2, unlockedAt: new Date(2024, 5, 5).getTime() },
      busiestDay: { date: '2024-06-05', count: 4 },
    },
    comebacks: [{ name: 'Rust', gapDays: 92, returnedAt: new Date(2024, 3, 3, 19).getTime(), coverUrl: '' }],
    firsts: [{ name: 'Hades', firstPlayedAt: new Date(2024, 1, 2, 20).getTime(), coverUrl: '', playtimeMinutes: 300 }],
    firstsCount: 5,
    records: {
      longestStreakDays: { days: 6, startDate: '2024-01-05', endDate: '2024-01-10' },
      biggestMonth: { label: 'February', minutes: 1800 },
      mostSessionsDay: { date: '2024-02-04', count: 3 },
    },
  },
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <YearInReview library={[{ name: 'Stardew Valley' }]} />
    </MemoryRouter>
  );

const selectTab = (name) => fireEvent.click(screen.getByRole('tab', { name }));

beforeEach(() => {
  jest.clearAllMocks();
  YearInReviewService.getYearSnapshot.mockReturnValue(baseSnapshot);
  getRecapSeasonYear.mockReturnValue(null);
});

test('renders five tabs with Overview active by default', () => {
  renderPage();

  const tabs = screen.getAllByRole('tab');
  expect(tabs.map((tab) => tab.textContent)).toEqual(['Overview', 'Story', 'Milestones', 'Eras', 'Numbers']);
  expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');

  // Overview shows the uniform glance grid, the single identity card and the era strip.
  expect(screen.getByText('2024 at a Glance')).toBeInTheDocument();
  expect(screen.getByText('Busiest Day')).toBeInTheDocument();
  expect(screen.getByText('Top Genre')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /Player Identity/ })).toBeInTheDocument();
  expect(screen.getByText(/open the Eras tab/)).toBeInTheDocument();
});

test('the persona roast appears exactly once, on Overview only', () => {
  renderPage();

  expect(screen.getAllByText(ROAST)).toHaveLength(1);

  selectTab('Story');
  expect(screen.queryByText(ROAST)).not.toBeInTheDocument();

  selectTab('Eras');
  expect(screen.queryByText(ROAST)).not.toBeInTheDocument();

  selectTab('Numbers');
  expect(screen.queryByText(ROAST)).not.toBeInTheDocument();

  selectTab('Overview');
  expect(screen.getAllByText(ROAST)).toHaveLength(1);
});

test('Story tab renders the generated narrative paragraphs', () => {
  renderPage();
  selectTab('Story');

  // The offscreen story share card repeats these texts — scope to the panel.
  const panel = within(screen.getByRole('tabpanel'));
  expect(panel.getByRole('heading', { name: 'The Story of Your Year' })).toBeInTheDocument();
  expect(panel.getByText('Your year started on 10 Jan with Stardew Valley.')).toBeInTheDocument();
  expect(panel.getByText('Verdict: RPG steady player.')).toBeInTheDocument();
  expect(panel.getByText(/good farm day/)).toBeInTheDocument(); // journal lives on the story tab
});

test('Milestones tab renders finished games, achievements, comebacks, firsts and records', () => {
  renderPage();
  selectTab('Milestones');

  const panel = within(screen.getByRole('tabpanel'));
  expect(panel.getByRole('heading', { name: /Milestones/ })).toBeInTheDocument();

  // Finished grid: name, status chip and the finishing-session line.
  expect(panel.getByText('Celeste')).toBeInTheDocument();
  expect(panel.getByText('Completed')).toBeInTheDocument();
  expect(panel.getByText('Beaten')).toBeInTheDocument();
  expect(panel.getByText(/Rolled credits in a 3h session/)).toBeInTheDocument();

  // Achievements stat row.
  expect(panel.getByText('Unlocked this year')).toBeInTheDocument();
  expect(panel.getByText('12')).toBeInTheDocument();
  expect(panel.getByText('Cloud Nine')).toBeInTheDocument();
  expect(panel.getByText(/1\.2% of players/)).toBeInTheDocument();

  // Comebacks, firsts and records.
  expect(panel.getByText(/Rust — back after 92 days/)).toBeInTheDocument();
  expect(panel.getByText('5 new games this year')).toBeInTheDocument();
  expect(panel.getByText('Hades')).toBeInTheDocument();
  expect(panel.getByText('Longest streak')).toBeInTheDocument();
  expect(panel.getByText('6 days')).toBeInTheDocument();
  expect(panel.getByText('February')).toBeInTheDocument();
});

test('Milestones tab shows the finished empty state when nothing is marked', () => {
  YearInReviewService.getYearSnapshot.mockReturnValue({
    ...baseSnapshot,
    milestones: {
      finished: [],
      achievements: null,
      comebacks: [],
      firsts: [],
      firstsCount: 0,
      records: {},
      hasAny: false,
    },
  });
  renderPage();
  selectTab('Milestones');

  const panel = within(screen.getByRole('tabpanel'));
  expect(panel.getByText(/Nothing marked finished yet/)).toBeInTheDocument();
});

test('Eras tab renders stretches and the era timeline', () => {
  renderPage();
  selectTab('Eras');

  expect(screen.getByText('The Eras of Your Year')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'The Stardew Valley Era' })).toBeInTheDocument();
  expect(screen.getByText('Jan–Feb')).toBeInTheDocument();
});

test('Numbers tab collapses months with no sessions into one line', () => {
  renderPage();
  selectTab('Numbers');

  expect(screen.getByText('Monthly Rhythm')).toBeInTheDocument();
  // Only the three active months get bars; Apr–Dec collapse into one line.
  expect(screen.getByText('8 sessions')).toBeInTheDocument();
  expect(screen.getByText('14 sessions')).toBeInTheDocument();
  expect(screen.getByText('6 sessions')).toBeInTheDocument();
  expect(screen.getByText('Apr–Dec: no tracked sessions')).toBeInTheDocument();
  expect(screen.queryByText('0 sessions')).not.toBeInTheDocument();
  expect(screen.getByText('Top Games')).toBeInTheDocument();
  expect(screen.getByText('Your Mix')).toBeInTheDocument();
});

test('no streak content survives anywhere on the page', () => {
  renderPage();

  for (const tab of ['Overview', 'Story', 'Eras', 'Numbers']) {
    selectTab(tab);
    expect(screen.queryByText(/streak/i)).not.toBeInTheDocument();
  }
});

test('shows an honest empty state when the year has no tracked sessions', () => {
  YearInReviewService.getYearSnapshot.mockReturnValue({
    ...baseSnapshot,
    hasData: false,
    eras: { stretches: [], recorded: [] },
    story: { paragraphs: [] },
    journalNotes: [],
  });

  renderPage();

  expect(screen.getByText('No tracked sessions logged for 2024')).toBeInTheDocument();
  expect(screen.getByText(/Imported Steam\/GOG playtime is a lifetime total/)).toBeInTheDocument();
  expect(screen.queryByRole('tab')).not.toBeInTheDocument();
});

test('titles the page Your Gaming Life outside the recap season', () => {
  renderPage();
  expect(screen.getByRole('heading', { name: 'Your Gaming Life', level: 1 })).toBeInTheDocument();
});

test('titles the page as the year in review during the December–January season', () => {
  getRecapSeasonYear.mockReturnValue(2024);
  renderPage();
  expect(screen.getByRole('heading', { name: '2024 Year in Review', level: 1 })).toBeInTheDocument();
  expect(screen.getByText('Your Gaming Life')).toBeInTheDocument();
});
