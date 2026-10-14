import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import TodayStrip from './TodayStrip';
import CalendarXPService from '../services/CalendarXPService';
import SessionRepository from '../services/SessionRepository';
import CurrentEraService from '../services/CurrentEraService';
import { SeasonalHideAndSeekService } from '../services/SeasonalHideAndSeekService';
import WishlistService from '../services/WishlistService';

jest.mock('../services/CalendarXPService', () => ({
  __esModule: true,
  default: { getFullCalendarStatus: jest.fn(), processDailyCheckin: jest.fn() },
}));
jest.mock('../services/SessionRepository', () => ({
  __esModule: true,
  default: { getSessionHistory: jest.fn() },
}));
jest.mock('../services/CurrentEraService', () => ({
  __esModule: true,
  default: { getCurrentEra: jest.fn() },
}));
jest.mock('../services/SeasonalHideAndSeekService', () => ({
  __esModule: true,
  SeasonalHideAndSeekService: { getActiveProgress: jest.fn() },
}));
jest.mock('../services/WishlistService', () => ({
  __esModule: true,
  default: { isEnabled: jest.fn(() => true), getAlertSummary: jest.fn(() => ({ count: 0 })) },
}));

const renderStrip = () =>
  render(
    <MemoryRouter>
      <TodayStrip />
    </MemoryRouter>
  );

const statusWith = (overrides = {}) => ({
  streak: { currentStreak: 3, longestStreak: 5 },
  canCheckIn: true,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  CalendarXPService.getFullCalendarStatus.mockReturnValue(statusWith());
  SessionRepository.getSessionHistory.mockReturnValue([]);
  CurrentEraService.getCurrentEra.mockReturnValue(null);
  SeasonalHideAndSeekService.getActiveProgress.mockReturnValue(null);
  WishlistService.getAlertSummary.mockReturnValue({ count: 0 });
});

test('offers a check-in that grants XP and shows the running streak', () => {
  CalendarXPService.processDailyCheckin.mockReturnValue({ success: true, xpEarned: 75 });
  CalendarXPService.getFullCalendarStatus
    .mockReturnValueOnce(statusWith())
    .mockReturnValueOnce(statusWith({ canCheckIn: false, streak: { currentStreak: 4, longestStreak: 5 } }));

  renderStrip();
  expect(screen.getByText(/Day 3 streak/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /Check in/i }));
  expect(CalendarXPService.processDailyCheckin).toHaveBeenCalledTimes(1);
  expect(screen.getByText(/Day 4 streak/)).toBeInTheDocument();
});

test('summarises the last seven days of sessions', () => {
  const recent = Date.now() - 2 * 60 * 60 * 1000;
  const old = Date.now() - 10 * 24 * 60 * 60 * 1000;
  SessionRepository.getSessionHistory.mockReturnValue([
    { gameName: 'A', endTime: recent, playtimeMinutes: 90 },
    { gameName: 'B', endTime: recent, playtimeMinutes: 30 },
    { gameName: 'Old', endTime: old, playtimeMinutes: 500 },
  ]);

  renderStrip();
  expect(screen.getByText(/2 sessions · 2h/)).toBeInTheDocument();
});

test('shows the current era and the active hunt progress', () => {
  CurrentEraService.getCurrentEra.mockReturnValue({
    name: 'The Cozy Era',
    dayCount: 12,
    snapshot: { totalMinutes: 300 },
  });
  SeasonalHideAndSeekService.getActiveProgress.mockReturnValue({
    id: 'halloween',
    name: 'Pumpkin Hunt',
    icon: '🎃',
    found: ['halloween-item-0'],
    totalItems: 5,
    completed: false,
  });

  renderStrip();
  expect(screen.getByText('The Cozy Era')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Pumpkin Hunt: 1 of 5 found/ })).toBeInTheDocument();
});

test('teases the daily paradox with a link to the dashboard doodle tab', () => {
  renderStrip();
  const teaser = screen.getByRole('link', { name: /Today's paradox/ });
  expect(teaser).toHaveAttribute('href', '/dashboard?tab=doodle');
});

test('shows wishlist deal alerts and re-reads on the alerts event', () => {
  WishlistService.getAlertSummary.mockReturnValue({ count: 2 });
  renderStrip();
  const link = screen.getByRole('link', { name: /2 wishlist price alerts/ });
  expect(link).toHaveAttribute('href', '/wishlist');

  WishlistService.getAlertSummary.mockReturnValue({ count: 5 });
  fireEvent(window, new CustomEvent('gamepilot:wishlist-alerts'));
  expect(screen.getByRole('link', { name: /5 wishlist price alerts/ })).toBeInTheDocument();
});

test('hides the deals chip when alerts are zero or wishlist is disabled', () => {
  WishlistService.getAlertSummary.mockReturnValue({ count: 0 });
  renderStrip();
  expect(screen.queryByRole('link', { name: /wishlist price alert/ })).not.toBeInTheDocument();
});
