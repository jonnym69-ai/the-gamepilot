import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import SeasonalHideAndSeek from './SeasonalHideAndSeek';
import { SeasonalHideAndSeekService } from '../services/SeasonalHideAndSeekService';

jest.mock('../services/SeasonalHideAndSeekService', () => ({
  SeasonalHideAndSeekService: {
    getActiveEvent: jest.fn(),
    getProgress: jest.fn(),
    findItem: jest.fn(),
  },
}));

const EVENT = {
  id: 'halloween',
  name: 'Pumpkin Hunt',
  icon: '🎃',
  itemEmoji: '🎃',
  itemName: 'Pumpkin',
  totalItems: 3,
  xpReward: 500,
  rewardName: 'Pumpkin King',
};

const progressWith = (found, completed = false) => ({
  ...EVENT,
  found,
  completed,
  progressPercent: Math.round((found.length / EVENT.totalItems) * 100),
});

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  SeasonalHideAndSeekService.getActiveEvent.mockReturnValue(EVENT);
});

test('renders the tracker and one hidden item per unfound spot', () => {
  SeasonalHideAndSeekService.getProgress.mockReturnValue(progressWith([]));
  render(<SeasonalHideAndSeek />);

  expect(screen.getByText('Pumpkin Hunt')).toBeInTheDocument();
  expect(screen.getByText('0 / 3 found')).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: /Hidden Pumpkin/ })).toHaveLength(3);
});

test('clicking a pumpkin removes it and updates the tracker', () => {
  SeasonalHideAndSeekService.getProgress
    .mockReturnValueOnce(progressWith([]))
    .mockReturnValue(progressWith(['halloween-item-0']));
  SeasonalHideAndSeekService.findItem.mockReturnValue({
    alreadyFound: false,
    justCompleted: false,
    ...progressWith(['halloween-item-0']),
  });

  render(<SeasonalHideAndSeek />);
  fireEvent.click(screen.getByRole('button', { name: 'Hidden Pumpkin 1' }));

  expect(SeasonalHideAndSeekService.findItem).toHaveBeenCalledWith('halloween', 'halloween-item-0');
  expect(screen.getByText('1 / 3 found')).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: /Hidden Pumpkin/ })).toHaveLength(2);
  expect(screen.queryByRole('button', { name: 'Hidden Pumpkin 1' })).not.toBeInTheDocument();
});

test('completing the hunt shows the reward toast and hides remaining items', () => {
  const full = progressWith(['halloween-item-0', 'halloween-item-1', 'halloween-item-2'], true);
  SeasonalHideAndSeekService.getProgress
    .mockReturnValueOnce(progressWith(['halloween-item-0', 'halloween-item-1']))
    .mockReturnValue(full);
  SeasonalHideAndSeekService.findItem.mockReturnValue({
    alreadyFound: false,
    justCompleted: true,
    ...full,
  });

  render(<SeasonalHideAndSeek />);
  fireEvent.click(screen.getByRole('button', { name: 'Hidden Pumpkin 3' }));

  expect(screen.getByText(/Pumpkin Hunt Complete!/)).toBeInTheDocument();
  expect(screen.getByText(/Pumpkin King/)).toBeInTheDocument();
  expect(screen.queryAllByRole('button', { name: /Hidden Pumpkin/ })).toHaveLength(0);
});

test('renders nothing when no event is active', () => {
  SeasonalHideAndSeekService.getActiveEvent.mockReturnValue(null);
  const { container } = render(<SeasonalHideAndSeek />);
  expect(container).toBeEmptyDOMElement();
});
