import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import TodayStrip from './TodayStrip';
import SessionRepository from '../services/SessionRepository';
import CurrentEraService from '../services/CurrentEraService';
import WishlistService from '../services/WishlistService';
import ReleaseTrackerService from '../services/ReleaseTrackerService';

jest.mock('../services/SessionRepository', () => ({
  __esModule: true,
  default: { getSessionHistory: jest.fn() },
}));
jest.mock('../services/CurrentEraService', () => ({
  __esModule: true,
  default: { getCurrentEra: jest.fn() },
}));
jest.mock('../services/WishlistService', () => ({
  __esModule: true,
  default: { isEnabled: jest.fn(() => true), getAlertSummary: jest.fn(() => ({ count: 0 })) },
}));
jest.mock('../services/ReleaseTrackerService', () => ({
  __esModule: true,
  WISHLIST_RELEASES_EVENT: 'gamepilot:wishlist-releases',
  default: { getSummary: jest.fn(() => null) },
}));

const renderStrip = () =>
  render(
    <MemoryRouter>
      <TodayStrip />
    </MemoryRouter>
  );

beforeEach(() => {
  jest.clearAllMocks();
  SessionRepository.getSessionHistory.mockReturnValue([]);
  CurrentEraService.getCurrentEra.mockReturnValue(null);
  WishlistService.getAlertSummary.mockReturnValue({ count: 0 });
  ReleaseTrackerService.getSummary.mockReturnValue(null);
});

const releaseIn = (days, precision = 'day') => {
  const releaseAt = new Date();
  releaseAt.setDate(releaseAt.getDate() + days);
  return {
    upcoming: [],
    releasedToday: [],
    nextRelease: {
      appid: '42',
      name: 'Launch Day Game',
      releaseAt: releaseAt.toISOString(),
      precision,
      daysUntil: days,
    },
  };
};

describe('wishlist release chip', () => {
  test('shows the next release when it lands within 14 days', () => {
    ReleaseTrackerService.getSummary.mockReturnValue(releaseIn(5));
    renderStrip();
    expect(screen.getByText('Launch Day Game')).toBeInTheDocument();
    expect(screen.getByText('In 5 days')).toBeInTheDocument();
  });

  test('labels a day-zero release as out today', () => {
    ReleaseTrackerService.getSummary.mockReturnValue(releaseIn(0));
    renderStrip();
    expect(screen.getByText('Out today')).toBeInTheDocument();
  });

  test('hides releases more than 14 days out', () => {
    ReleaseTrackerService.getSummary.mockReturnValue(releaseIn(15));
    renderStrip();
    expect(screen.queryByText('Launch Day Game')).not.toBeInTheDocument();
  });

  test('hides non-day precision releases', () => {
    ReleaseTrackerService.getSummary.mockReturnValue(releaseIn(3, 'quarter'));
    renderStrip();
    expect(screen.queryByText('Launch Day Game')).not.toBeInTheDocument();
  });
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

test('shows the current era', () => {
  CurrentEraService.getCurrentEra.mockReturnValue({
    name: 'The Cozy Era',
    dayCount: 12,
    snapshot: { totalMinutes: 300 },
  });

  renderStrip();
  expect(screen.getByText('The Cozy Era')).toBeInTheDocument();
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
