import React from 'react';
import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockInfo = jest.fn();

jest.mock('../components/Toast', () => ({
  useToast: () => ({ info: mockInfo }),
}));

jest.mock('../services/FreeGameRadar', () => ({
  FreeGameRadar: {
    getEpicRadar: jest.fn(),
    getGiveaways: jest.fn(),
  },
}));

jest.mock('../services/StorageService', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

const useFreeGameNotifications = require('./useFreeGameNotifications').default;
const { FreeGameRadar } = require('../services/FreeGameRadar');
const StorageService = require('../services/StorageService').default;

const HookHarness = () => {
  useFreeGameNotifications();
  return null;
};

describe('useFreeGameNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('seeds silently on first run — no toast for the existing catalog', async () => {
    StorageService.get.mockReturnValue(null);
    FreeGameRadar.getEpicRadar.mockResolvedValue({ games: [{ id: 'epic-1', title: 'Epic Freebie' }] });
    FreeGameRadar.getGiveaways.mockResolvedValue({ games: [{ id: 'gp-1', title: 'Giveaway One' }] });

    render(<HookHarness />);

    await waitFor(() => expect(StorageService.set).toHaveBeenCalled());
    expect(mockInfo).not.toHaveBeenCalled();
    expect(StorageService.set).toHaveBeenCalledWith('freeGameNotifiedIdsV1', {
      epic: ['epic-1'],
      giveaways: ['gp-1'],
    });
  });

  test('toasts when a genuinely new offer appears after seeding', async () => {
    StorageService.get.mockReturnValue({ epic: ['epic-1'], giveaways: ['gp-1'] });
    FreeGameRadar.getEpicRadar.mockResolvedValue({
      games: [
        { id: 'epic-1', title: 'Epic Freebie' },
        { id: 'epic-2', title: 'Fresh Drop' },
      ],
    });
    FreeGameRadar.getGiveaways.mockResolvedValue({ games: [{ id: 'gp-1', title: 'Giveaway One' }] });

    render(<HookHarness />);

    await waitFor(() => expect(mockInfo).toHaveBeenCalledWith('New free game: Fresh Drop — find it on Discover', 7000));
  });

  test('a source that failed on first run seeds silently on its first success', async () => {
    // Epic seeded previously; giveaways never succeeded so its set is null.
    StorageService.get.mockReturnValue({ epic: ['epic-1'], giveaways: null });
    FreeGameRadar.getEpicRadar.mockResolvedValue({ games: [{ id: 'epic-1', title: 'Epic Freebie' }] });
    FreeGameRadar.getGiveaways.mockResolvedValue({
      games: [
        { id: 'gp-1', title: 'Giveaway One' },
        { id: 'gp-2', title: 'Giveaway Two' },
      ],
    });

    render(<HookHarness />);

    await waitFor(() => expect(StorageService.set).toHaveBeenCalled());
    expect(mockInfo).not.toHaveBeenCalled();
    expect(StorageService.set).toHaveBeenCalledWith('freeGameNotifiedIdsV1', {
      epic: ['epic-1'],
      giveaways: ['gp-1', 'gp-2'],
    });
  });

  test('keeps prior seen ids when a source fails and does not toast', async () => {
    StorageService.get.mockReturnValue({ epic: ['epic-1'], giveaways: ['gp-1'] });
    FreeGameRadar.getEpicRadar.mockRejectedValue(new Error('offline'));
    FreeGameRadar.getGiveaways.mockResolvedValue({ games: [{ id: 'gp-1', title: 'Giveaway One' }] });

    render(<HookHarness />);

    await waitFor(() => expect(StorageService.set).toHaveBeenCalled());
    expect(mockInfo).not.toHaveBeenCalled();
    // Epic's previous seen-set is preserved despite the failed fetch.
    expect(StorageService.set).toHaveBeenCalledWith('freeGameNotifiedIdsV1', {
      epic: ['epic-1'],
      giveaways: ['gp-1'],
    });
  });
});
