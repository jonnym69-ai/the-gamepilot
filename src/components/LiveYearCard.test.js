import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LiveYearCard, { buildYearRecap } from './LiveYearCard';
import SessionRepository from '../services/SessionRepository';

jest.mock('../services/SessionRepository', () => ({
  __esModule: true,
  default: { getSessionHistory: jest.fn(() => []) },
}));

const DAY_MS = 24 * 60 * 60 * 1000;
const thisYear = (month, day) => new Date(new Date().getFullYear(), month, day).toISOString();

const renderCard = () =>
  render(
    <MemoryRouter>
      <LiveYearCard />
    </MemoryRouter>
  );

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

describe('buildYearRecap', () => {
  test('returns null when the year has no recorded minutes', () => {
    expect(buildYearRecap([{ gameName: 'X', playtimeMinutes: 0, endTime: thisYear(0, 5) }])).toBeNull();
    expect(buildYearRecap([])).toBeNull();
  });

  test('aggregates only the current year and names the top game', () => {
    const recap = buildYearRecap([
      { gameName: 'Hades', playtimeMinutes: 300, endTime: thisYear(1, 3) },
      { gameName: 'Hades', playtimeMinutes: 120, endTime: thisYear(2, 4) },
      { gameName: 'Celeste', playtimeMinutes: 60, endTime: thisYear(3, 1) },
      // Prior year — pace data only, not counted
      { gameName: 'Old', playtimeMinutes: 9999, endTime: new Date(Date.now() - 400 * DAY_MS).toISOString() },
    ]);

    expect(recap.totalMinutes).toBe(480);
    expect(recap.sessionCount).toBe(3);
    expect(recap.gamesPlayed).toBe(2);
    expect(recap.daysIn).toBe(3);
    expect(recap.topGame).toEqual({ name: 'Hades', minutes: 420 });
  });

  test('flags onBestPace only when the projected year beats the best prior year', () => {
    const now = new Date();
    const earlyThisYear = new Date(now.getFullYear(), 0, 15).toISOString();
    const lastYear = new Date(now.getFullYear() - 1, 5, 1).toISOString();

    const ahead = buildYearRecap(
      [
        { gameName: 'Hades', playtimeMinutes: 1200, endTime: earlyThisYear },
        { gameName: 'Old', playtimeMinutes: 300, endTime: lastYear },
      ],
      now
    );
    expect(ahead.onBestPace).toBe(true);

    const behind = buildYearRecap(
      [
        { gameName: 'Hades', playtimeMinutes: 60, endTime: earlyThisYear },
        { gameName: 'Old', playtimeMinutes: 999999, endTime: lastYear },
      ],
      now
    );
    expect(behind.onBestPace).toBe(false);
  });
});

describe('LiveYearCard', () => {
  test('renders the year counter with stats and a gaming-life link', () => {
    SessionRepository.getSessionHistory.mockReturnValue([
      { gameName: 'Hades', playtimeMinutes: 200, endTime: thisYear(1, 2) },
      { gameName: 'Celeste', playtimeMinutes: 80, endTime: thisYear(2, 5) },
    ]);
    renderCard();

    const card = screen.getByLabelText(`${new Date().getFullYear()} so far`);
    expect(card).toHaveTextContent('4h 40m played');
    expect(card).toHaveTextContent('2 sessions');
    expect(card).toHaveTextContent('2 games');
    expect(screen.getByRole('link', { name: /See your gaming life/i })).toHaveAttribute('href', '/gaming-life');
  });

  test('hides when there is no recorded year data', () => {
    SessionRepository.getSessionHistory.mockReturnValue([]);
    renderCard();
    expect(screen.queryByLabelText(/so far/i)).not.toBeInTheDocument();
  });

  test('hide button persists for the current year', () => {
    SessionRepository.getSessionHistory.mockReturnValue([
      { gameName: 'Hades', playtimeMinutes: 120, endTime: thisYear(1, 2) },
    ]);
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: /Hide the .* counter until next year/i }));
    expect(screen.queryByLabelText(/so far/i)).not.toBeInTheDocument();

    renderCard();
    expect(screen.queryByLabelText(/so far/i)).not.toBeInTheDocument();
  });
});
