import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import EraTransitionCard from './EraTransitionCard';
import CurrentEraService from '../services/CurrentEraService';
import StorageService from '../services/StorageService';

jest.mock('../services/CurrentEraService', () => ({
  __esModule: true,
  default: { getEraTransition: jest.fn() },
}));

jest.mock('../services/StorageService', () => ({
  __esModule: true,
  default: { getString: jest.fn(() => null), setString: jest.fn() },
}));

const TRANSITION = {
  endedEra: { name: 'The Zomboid Era', topGame: 'Project Zomboid', days: 47 },
  newEra: { name: 'The Gauntlet Era', topGame: 'Hades' },
  transitionedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
  signature: 'a>b',
};

beforeEach(() => {
  jest.clearAllMocks();
});

test('renders the ended era and its successor when a fresh transition exists', () => {
  CurrentEraService.getEraTransition.mockReturnValue(TRANSITION);
  render(<EraTransitionCard />);

  expect(screen.getByText(/an era has ended/i)).toBeInTheDocument();
  expect(screen.getByText('The Zomboid Era')).toBeInTheDocument();
  expect(screen.getByText(/47 days · led by Project Zomboid/i)).toBeInTheDocument();
  expect(screen.getByText(/now living in The Gauntlet Era/i)).toBeInTheDocument();
});

test('dismiss persists the signature and hides the card', () => {
  CurrentEraService.getEraTransition.mockReturnValue(TRANSITION);
  render(<EraTransitionCard />);
  fireEvent.click(screen.getByRole('button', { name: /dismiss era transition/i }));
  expect(StorageService.setString).toHaveBeenCalledWith('eraTransitionDismissedV1', 'a>b');
  expect(screen.queryByText('The Zomboid Era')).not.toBeInTheDocument();
});

test('hides when dismissed before, stale, or no transition exists', () => {
  StorageService.getString.mockReturnValue('a>b');
  CurrentEraService.getEraTransition.mockReturnValue(TRANSITION);
  const { unmount } = render(<EraTransitionCard />);
  expect(screen.queryByText('The Zomboid Era')).not.toBeInTheDocument();
  unmount();

  StorageService.getString.mockReturnValue(null);
  CurrentEraService.getEraTransition.mockReturnValue({
    ...TRANSITION,
    transitionedAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
  });
  const view = render(<EraTransitionCard />);
  expect(screen.queryByText('The Zomboid Era')).not.toBeInTheDocument();
  view.unmount();

  CurrentEraService.getEraTransition.mockReturnValue(null);
  render(<EraTransitionCard />);
  expect(screen.queryByLabelText(/era transition/i)).not.toBeInTheDocument();
});
