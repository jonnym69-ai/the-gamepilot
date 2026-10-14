import React from 'react';
import { render, screen } from '@testing-library/react';
import MonthlyRecapStrip from './MonthlyRecapStrip';
import SessionRepository from '../services/SessionRepository';
import CurrentEraService from '../services/CurrentEraService';
import HabitTrackerService from '../services/HabitTrackerService';

jest.mock('../services/SessionRepository', () => ({
  __esModule: true,
  default: { getSessionHistory: jest.fn(() => []) },
}));
jest.mock('../services/CurrentEraService', () => ({
  __esModule: true,
  default: { getCurrentEra: jest.fn(() => null) },
}));
jest.mock('../services/HabitTrackerService', () => ({
  __esModule: true,
  default: { getStreaks: jest.fn(() => ({ current: 0 })) },
}));

const thisMonth = (day) => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), day).toISOString();
};

beforeEach(() => {
  jest.clearAllMocks();
});

test('hides when the month has no sessions', () => {
  SessionRepository.getSessionHistory.mockReturnValue([]);
  render(<MonthlyRecapStrip />);
  expect(screen.queryByLabelText(/recap so far/i)).not.toBeInTheDocument();
});

test('summarises the current month from local sessions', () => {
  SessionRepository.getSessionHistory.mockReturnValue([
    { gameName: 'Hades', playtimeMinutes: 120, endTime: thisMonth(1) },
    { gameName: 'Hades', playtimeMinutes: 60, endTime: thisMonth(2) },
    { gameName: 'Slay the Spire', playtimeMinutes: 30, endTime: thisMonth(2) },
    // Previous month — excluded
    { gameName: 'Old Game', playtimeMinutes: 999, endTime: new Date(Date.now() - 40 * 86400000).toISOString() },
  ]);
  CurrentEraService.getCurrentEra.mockReturnValue({ name: 'The Gauntlet Era', snapshot: { totalMinutes: 500 } });
  HabitTrackerService.getStreaks.mockReturnValue({ current: 3 });

  render(<MonthlyRecapStrip />);

  const strip = screen.getByLabelText(/recap so far/i);
  expect(strip).toHaveTextContent('3h 30m played');
  expect(strip).toHaveTextContent('3 sessions');
  expect(strip).toHaveTextContent('2 days in');
  expect(strip).toHaveTextContent('3-day streak');
  expect(screen.getByText('Hades')).toBeInTheDocument();
  expect(screen.getByText(/The Gauntlet Era/i)).toBeInTheDocument();
  expect(screen.queryByText(/Old Game/i)).not.toBeInTheDocument();
});
