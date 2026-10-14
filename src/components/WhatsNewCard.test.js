import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import WhatsNewCard from './WhatsNewCard';
import StorageService from '../services/StorageService';
import { APP_VERSION } from '../appVersion';
import { WHATS_NEW } from '../whatsNew';

jest.mock('../services/StorageService', () => ({
  __esModule: true,
  default: { getString: jest.fn(() => null), setString: jest.fn() },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

test('shows the curated bullets once per version for returning users', () => {
  render(<WhatsNewCard hasLibrary />);

  expect(screen.getByLabelText(`What's new in version ${APP_VERSION}`)).toBeInTheDocument();
  expect(screen.getByText(`New in ${APP_VERSION}`)).toBeInTheDocument();
  WHATS_NEW.forEach((item) => expect(screen.getByText(item)).toBeInTheDocument());
});

test('dismiss persists the seen version and hides the card', () => {
  render(<WhatsNewCard hasLibrary />);
  fireEvent.click(screen.getByRole('button', { name: /got it/i }));

  expect(StorageService.setString).toHaveBeenCalledWith('whatsNewSeenVersion', APP_VERSION);
  expect(screen.queryByLabelText(/what's new/i)).not.toBeInTheDocument();
});

test('hides for first-run users and after the version was seen', () => {
  const view = render(<WhatsNewCard hasLibrary={false} />);
  expect(screen.queryByLabelText(/what's new/i)).not.toBeInTheDocument();
  view.unmount();

  StorageService.getString.mockReturnValue(APP_VERSION);
  render(<WhatsNewCard hasLibrary />);
  expect(screen.queryByLabelText(/what's new/i)).not.toBeInTheDocument();
});
