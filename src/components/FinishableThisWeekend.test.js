import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import FinishableThisWeekend from './FinishableThisWeekend';
import HowLongToBeatService from '../services/HowLongToBeatService';

jest.mock('./LazyImage', () => ({ alt }) => <img alt={alt} />);

jest.mock('../services/HowLongToBeatService', () => ({
  __esModule: true,
  default: {
    isEnabled: jest.fn(() => true),
    getCached: jest.fn(() => null),
    getEstimate: jest.fn(() => null),
    warmup: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('../services/BacklogCoachService', () => ({
  BacklogCoachService: {
    getSessionCountByGame: jest.fn(() => ({})),
    isBacklogGame: jest.fn(() => true),
  },
}));

const game = (name, minutes = 0) => ({ name, platform: 'Steam', appid: name.length, time_played: minutes });

beforeEach(() => {
  jest.clearAllMocks();
  HowLongToBeatService.isEnabled.mockReturnValue(true);
  HowLongToBeatService.getCached.mockReturnValue(null);
  HowLongToBeatService.getEstimate.mockReturnValue(null);
});

test('lists backlog games whose remaining HLTB time fits a weekend', () => {
  HowLongToBeatService.getEstimate.mockImplementation((g) => (g.name === 'Short Tale' ? { mainStory: 6 } : null));
  const library = [game('Short Tale', 60), game('No Estimate'), game('Finished', 500)];
  library[2].completed = true;

  render(<FinishableThisWeekend library={library} />);

  expect(screen.getByText(/finishable this weekend/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Launch Short Tale' })).toHaveTextContent('~5.0h left');
  expect(screen.queryByRole('button', { name: 'Launch No Estimate' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Launch Finished' })).not.toBeInTheDocument();
});

test('excludes games with too much remaining or already beaten', () => {
  HowLongToBeatService.getEstimate.mockImplementation(
    (g) => ({ 'Too Long': { mainStory: 40 }, 'Done Already': { mainStory: 2 } })[g.name] || null
  );
  const library = [game('Too Long', 0), game('Done Already', 180)];

  render(<FinishableThisWeekend library={library} />);

  expect(screen.queryByText(/finishable this weekend/i)).not.toBeInTheDocument();
});

test('launches a pick and hides when HLTB is disabled', () => {
  HowLongToBeatService.getEstimate.mockReturnValue({ mainStory: 4 });
  const onLaunchGame = jest.fn();
  const view = render(<FinishableThisWeekend library={[game('Quickie')]} onLaunchGame={onLaunchGame} />);
  fireEvent.click(screen.getByRole('button', { name: 'Launch Quickie' }));
  expect(onLaunchGame).toHaveBeenCalledWith(expect.objectContaining({ name: 'Quickie' }));

  view.unmount();
  HowLongToBeatService.isEnabled.mockReturnValue(false);
  render(<FinishableThisWeekend library={[game('Quickie')]} />);
  expect(screen.queryByText(/finishable this weekend/i)).not.toBeInTheDocument();
});

test('warms the HLTB cache for backlog titles missing estimates', () => {
  HowLongToBeatService.getEstimate.mockReturnValue(null);
  render(<FinishableThisWeekend library={[game('Cold Game')]} />);
  expect(HowLongToBeatService.warmup).toHaveBeenCalledWith([expect.objectContaining({ name: 'Cold Game' })]);
});
