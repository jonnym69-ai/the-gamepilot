import { renderHook, act } from '@testing-library/react';
import useSeasonalFeatures from './useSeasonalFeatures';

// Mock services
jest.mock('../services/CalendarXPService', () => ({
  __esModule: true,
  default: {
    processBirthdayReward: jest.fn(),
    checkAnniversaryReward: jest.fn(),
    processChristmasReward: jest.fn(),
  },
}));

jest.mock('../services/SeasonalRewardService', () => ({
  SeasonalRewardService: {
    trackGamePlay: jest.fn(),
  },
}));

const CalendarXPService = require('../services/CalendarXPService').default;
const { SeasonalRewardService } = require('../services/SeasonalRewardService');

describe('useSeasonalFeatures', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('calls calendar reward functions on mount', () => {
    renderHook(() => useSeasonalFeatures({ library: [] }));

    expect(CalendarXPService.processBirthdayReward).toHaveBeenCalled();
    expect(CalendarXPService.checkAnniversaryReward).toHaveBeenCalled();
    expect(CalendarXPService.processChristmasReward).toHaveBeenCalled();
  });

  test('re-checks calendar rewards when library changes', () => {
    const { rerender } = renderHook(({ library }) => useSeasonalFeatures({ library }), {
      initialProps: { library: [] },
    });

    expect(CalendarXPService.processBirthdayReward).toHaveBeenCalledTimes(1);

    rerender({ library: [{ name: 'New Game' }] });
    expect(CalendarXPService.processBirthdayReward).toHaveBeenCalledTimes(2);
  });

  test('trackGamePlay calls SeasonalRewardService', () => {
    const { result } = renderHook(() => useSeasonalFeatures({ library: [] }));

    act(() => {
      result.current.trackGamePlay({ name: 'Test Game' });
    });

    expect(SeasonalRewardService.trackGamePlay).toHaveBeenCalledWith({ name: 'Test Game' });
  });

  test('calendar errors are caught and logged', () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    CalendarXPService.processBirthdayReward.mockImplementation(() => {
      throw new Error('Calendar error');
    });

    renderHook(() => useSeasonalFeatures({ library: [] }));

    expect(consoleWarnSpy).toHaveBeenCalledWith('Calendar auto-reward check failed:', expect.any(Error));
    consoleWarnSpy.mockRestore();
  });
});
