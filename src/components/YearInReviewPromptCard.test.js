import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import YearInReviewPromptCard from './YearInReviewPromptCard';
import { YearInReviewService } from '../services/YearInReviewService';
import StorageService from '../services/StorageService';

jest.mock('../services/YearInReviewService', () => ({
  YearInReviewService: { getYearSnapshot: jest.fn() },
}));

jest.mock('../services/StorageService', () => ({
  __esModule: true,
  default: { getString: jest.fn(() => null), setString: jest.fn() },
}));

const SNAPSHOT = {
  hasData: true,
  summary: { playtimeHours: 214.5, sessions: 62, uniqueGames: 38 },
  topGames: [{ name: 'Project Zomboid' }],
  eras: {
    stretches: [
      { name: 'The Balatro Era', startMonth: 6, endMonth: 6, playtimeMinutes: 1200, sessionCount: 8 },
      { name: 'The Zomboid Era', startMonth: 2, endMonth: 5, playtimeMinutes: 8000, sessionCount: 40 },
    ],
  },
};

const renderCard = (now, library = []) =>
  render(
    <MemoryRouter>
      <YearInReviewPromptCard library={library} now={now} />
    </MemoryRouter>
  );

beforeEach(() => {
  jest.clearAllMocks();
  StorageService.getString.mockReturnValue(null);
  YearInReviewService.getYearSnapshot.mockReturnValue(SNAPSHOT);
});

test('shows an era-led teaser in December for the current year', () => {
  renderCard(new Date(2026, 11, 10));

  expect(YearInReviewService.getYearSnapshot).toHaveBeenCalledWith([], 2026);
  expect(screen.getByText(/your 2026 in review is ready/i)).toBeInTheDocument();
  expect(screen.getByText(/214\.5h across 38 games — and it was the year of the Zomboid Era\./i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /watch your year/i })).toHaveAttribute(
    'href',
    '/year-in-review?year=2026&tab=milestones&wrapped=1'
  );
});

test('points at the previous year during the early-January grace window', () => {
  renderCard(new Date(2027, 0, 8));
  expect(YearInReviewService.getYearSnapshot).toHaveBeenCalledWith([], 2026);
  expect(screen.getByText(/your 2026 in review is ready/i)).toBeInTheDocument();
});

test('hides outside the recap window and after the January grace period', () => {
  const { unmount } = renderCard(new Date(2026, 5, 15));
  expect(screen.queryByLabelText(/year in review/i)).not.toBeInTheDocument();
  unmount();

  renderCard(new Date(2027, 0, 16));
  expect(screen.queryByLabelText(/year in review/i)).not.toBeInTheDocument();
  expect(YearInReviewService.getYearSnapshot).not.toHaveBeenCalled();
});

test('dismiss persists the year and hides the card for that year only', () => {
  renderCard(new Date(2026, 11, 20));
  fireEvent.click(screen.getByRole('button', { name: /dismiss 2026 year in review/i }));
  expect(StorageService.setString).toHaveBeenCalledWith('yearInReviewPromptDismissedV1', '2026');
  expect(screen.queryByLabelText(/year in review/i)).not.toBeInTheDocument();
});

test('stays hidden when the year was already dismissed', () => {
  StorageService.getString.mockReturnValue('2026');
  renderCard(new Date(2026, 11, 20));
  expect(screen.queryByLabelText(/year in review/i)).not.toBeInTheDocument();
});

test('hides when the year has too few tracked sessions to recap', () => {
  YearInReviewService.getYearSnapshot.mockReturnValue({ hasData: true, summary: { sessions: 2 } });
  renderCard(new Date(2026, 11, 10));
  expect(screen.queryByLabelText(/year in review/i)).not.toBeInTheDocument();
});

test('falls back to the top game when no era stretch exists', () => {
  YearInReviewService.getYearSnapshot.mockReturnValue({
    ...SNAPSHOT,
    eras: { stretches: [] },
  });
  renderCard(new Date(2026, 11, 10));
  expect(screen.getByText(/214\.5h across 38 games — Project Zomboid led the way\./i)).toBeInTheDocument();
});
