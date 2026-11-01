import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RecentActivity from './RecentActivity';
import { buildRecentActivityBreakdown } from './services/RecentActivityAggregator';

jest.mock('./NavBar', () => () => null);
jest.mock('./components/EmptyState', () => () => <div>Empty</div>);
jest.mock('./components/SessionHistoryShare', () => () => null);
jest.mock('./services/RecentActivityAggregator', () => ({
  buildRecentActivityBreakdown: jest.fn(),
  formatDuration: (minutes) => `${minutes}m`,
}));

const breakdown = {
  hasData: true,
  overview: {
    totalPlaytimeLabel: '10h',
    activeDays: 5,
    totalSessions: 9,
    uniqueGames: 2,
    avgSessionLabel: '66m',
    topGame: { name: 'Hades', totalLabel: '8h' },
    busiestDay: { label: 'Mon', totalLabel: '3h', sessions: 2 },
  },
  dailyTimeline: [],
  perGameBreakdown: [
    {
      name: 'Hades',
      sessions: 6,
      totalMinutes: 480,
      avgSessionMinutes: 80,
      firstPlayedLabel: 'May 1',
      lastPlayedLabel: 'May 5',
    },
    {
      name: 'Fez',
      sessions: 3,
      totalMinutes: 120,
      avgSessionMinutes: 40,
      firstPlayedLabel: 'May 2',
      lastPlayedLabel: 'May 4',
    },
  ],
  genreCounts: {},
  platformCounts: {},
  moodCounts: {},
  timeOfDayCounts: {
    'Morning (6–12)': 60,
    'Afternoon (12–18)': 120,
    'Evening (18–24)': 240,
    'Night (0–6)': 180,
  },
  sessionLengthCounts: { 'Short (<30m)': 4, 'Long (2h+)': 5 },
};

beforeEach(() => {
  buildRecentActivityBreakdown.mockReturnValue(breakdown);
});

function setup() {
  return render(
    <MemoryRouter initialEntries={['/recent-activity']}>
      <Routes>
        <Route path="/" element={<div>Activity home</div>} />
        <Route path="/recent-activity" element={<RecentActivity />} />
      </Routes>
    </MemoryRouter>
  );
}

test('per-game table shows a share-of-period column with proportional percentages', async () => {
  setup();
  expect(await screen.findByRole('columnheader', { name: 'Share' })).toBeInTheDocument();
  expect(screen.getByText('80%')).toBeInTheDocument(); // 480 / 600
  expect(screen.getByText('20%')).toBeInTheDocument(); // 120 / 600
});

test('back button returns to the home activity view, not the removed stats page', async () => {
  setup();
  await screen.findByRole('columnheader', { name: 'Share' });
  fireEvent.click(screen.getByTitle('Back'));
  expect(await screen.findByText('Activity home')).toBeInTheDocument();
});
