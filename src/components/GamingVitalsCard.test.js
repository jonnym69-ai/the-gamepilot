import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import GamingVitalsCard from './GamingVitalsCard';
import SessionRepository from '../services/SessionRepository';
import GamingVitalsService from '../services/GamingVitalsService';
import CurrentEraService from '../services/CurrentEraService';
import WishlistService from '../services/WishlistService';
import ReleaseTrackerService from '../services/ReleaseTrackerService';

jest.mock('../services/SessionRepository', () => ({
  ...jest.requireActual('../services/SessionRepository'),
  __esModule: true,
  default: { getSessionHistory: jest.fn() },
}));
jest.mock('../services/GamingVitalsService', () => ({
  __esModule: true,
  default: { getVitals: jest.fn() },
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

const renderCard = () =>
  render(
    <MemoryRouter>
      <GamingVitalsCard />
    </MemoryRouter>
  );

const vitalsFixture = {
  today: { sessions: 2, minutes: 95, played: true },
  week: {
    days: 3,
    sessions: 5,
    minutes: 420,
    bands: { deep: 1, steady: 3, hop: 1 },
    topGame: 'Project Zomboid',
    focusLabel: 'a mixed rhythm',
  },
  weeklyNorm: 4,
  typicalStartHour: 21,
  streak: 4,
  daysSinceLast: 0,
  totalSessions: 12,
};

beforeEach(() => {
  jest.clearAllMocks();
  SessionRepository.getSessionHistory.mockReturnValue([]);
  GamingVitalsService.getVitals.mockReturnValue(null);
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

test('renders nothing when there are no vitals and no glance chips', () => {
  const { container } = renderCard();
  expect(container).toBeEmptyDOMElement();
});

test('renders nothing while session history is too sparse for vitals', () => {
  GamingVitalsService.getVitals.mockReturnValue({ ...vitalsFixture, totalSessions: 2 });
  const { container } = renderCard();
  expect(container).toBeEmptyDOMElement();
});

test('summarises today and the week when vitals exist', () => {
  GamingVitalsService.getVitals.mockReturnValue(vitalsFixture);
  renderCard();
  expect(screen.getByText('2 sessions')).toBeInTheDocument();
  expect(screen.getByText('3 evenings')).toBeInTheDocument();
  expect(screen.getByText(/4-day streak/)).toBeInTheDocument();
  expect(screen.getByText('~9pm')).toBeInTheDocument();
  expect(screen.getByText('a mixed rhythm')).toBeInTheDocument();
});

test('shows the current era as a chip linking to identity', () => {
  CurrentEraService.getCurrentEra.mockReturnValue({
    name: 'The Cozy Era',
    dayCount: 12,
    flavor: 'small games, big feelings',
    snapshot: { totalMinutes: 300 },
  });
  renderCard();
  const link = screen.getByRole('link', { name: /The Cozy Era/ });
  expect(link).toHaveAttribute('href', '/?view=identity');
  expect(link).toHaveTextContent('Day 12 · small games, big feelings');
});

test('labels an estimated era instead of a day count', () => {
  CurrentEraService.getCurrentEra.mockReturnValue({
    name: 'The Cozy Era',
    estimated: true,
    dayCount: null,
    snapshot: { totalMinutes: 300 },
  });
  renderCard();
  expect(screen.getByText('Estimated era')).toBeInTheDocument();
});

describe('wishlist release chip', () => {
  test('shows the next release when it lands within 14 days', () => {
    ReleaseTrackerService.getSummary.mockReturnValue(releaseIn(5));
    renderCard();
    expect(screen.getByText('Launch Day Game')).toBeInTheDocument();
    expect(screen.getByText('In 5 days')).toBeInTheDocument();
  });

  test('labels a day-zero release as out today', () => {
    ReleaseTrackerService.getSummary.mockReturnValue(releaseIn(0));
    renderCard();
    expect(screen.getByText('Out today')).toBeInTheDocument();
  });

  test('hides releases more than 14 days out', () => {
    ReleaseTrackerService.getSummary.mockReturnValue(releaseIn(15));
    renderCard();
    expect(screen.queryByText('Launch Day Game')).not.toBeInTheDocument();
  });

  test('hides non-day precision releases', () => {
    ReleaseTrackerService.getSummary.mockReturnValue(releaseIn(3, 'quarter'));
    renderCard();
    expect(screen.queryByText('Launch Day Game')).not.toBeInTheDocument();
  });
});

test('shows wishlist deal alerts and re-reads on the alerts event', () => {
  WishlistService.getAlertSummary.mockReturnValue({ count: 2 });
  renderCard();
  const link = screen.getByRole('link', { name: /2 wishlist price alerts/ });
  expect(link).toHaveAttribute('href', '/wishlist');

  WishlistService.getAlertSummary.mockReturnValue({ count: 5 });
  fireEvent(window, new CustomEvent('gamepilot:wishlist-alerts'));
  expect(screen.getByRole('link', { name: /5 wishlist price alerts/ })).toBeInTheDocument();
});

test('hides the deals chip when alerts are zero or wishlist is disabled', () => {
  WishlistService.getAlertSummary.mockReturnValue({ count: 0 });
  renderCard();
  expect(screen.queryByRole('link', { name: /wishlist price alert/ })).not.toBeInTheDocument();
});
