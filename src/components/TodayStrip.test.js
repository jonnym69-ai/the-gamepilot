import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import TodayStrip from './TodayStrip';
import SessionRepository from '../services/SessionRepository';
import CurrentEraService from '../services/CurrentEraService';
import WishlistService from '../services/WishlistService';

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
