import { renderHook, act } from '@testing-library/react';
import useGamingStory from './useGamingStory';

// Mock GamingStoryService
jest.mock('../services/GamingStoryService', () => ({
  GamingStoryService: {
    updateStory: jest.fn(),
    shouldShowFirstStory: jest.fn(),
    markFirstStoryShown: jest.fn(),
  },
}));

const { GamingStoryService } = require('../services/GamingStoryService');

describe('useGamingStory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('initial state is null', () => {
    const { result } = renderHook(() => useGamingStory());
    expect(result.current.gamingStory).toBeNull();
  });

  test('showFirstStory sets story when shouldShowFirstStory is true', () => {
    const mockStory = { title: 'Test Story', summary: 'You played games!' };
    GamingStoryService.updateStory.mockReturnValue(mockStory);
    GamingStoryService.shouldShowFirstStory.mockReturnValue(true);

    const { result } = renderHook(() => useGamingStory());

    act(() => {
      result.current.showFirstStory([{ name: 'Test Game' }]);
    });

    expect(GamingStoryService.updateStory).toHaveBeenCalledWith([{ name: 'Test Game' }]);
    expect(GamingStoryService.markFirstStoryShown).toHaveBeenCalled();
    expect(result.current.gamingStory).toEqual(mockStory);
  });

  test('showFirstStory does nothing when shouldShowFirstStory is false', () => {
    const mockStory = { title: 'Test Story' };
    GamingStoryService.updateStory.mockReturnValue(mockStory);
    GamingStoryService.shouldShowFirstStory.mockReturnValue(false);

    const { result } = renderHook(() => useGamingStory());

    act(() => {
      result.current.showFirstStory([{ name: 'Test Game' }]);
    });

    expect(GamingStoryService.markFirstStoryShown).not.toHaveBeenCalled();
    expect(result.current.gamingStory).toBeNull();
  });

  test('showFirstStory does nothing when updateStory returns null', () => {
    GamingStoryService.updateStory.mockReturnValue(null);
    GamingStoryService.shouldShowFirstStory.mockReturnValue(true);

    const { result } = renderHook(() => useGamingStory());

    act(() => {
      result.current.showFirstStory([{ name: 'Test Game' }]);
    });

    expect(GamingStoryService.markFirstStoryShown).not.toHaveBeenCalled();
    expect(result.current.gamingStory).toBeNull();
  });

  test('dismissStory clears the story', () => {
    const mockStory = { title: 'Test Story' };
    GamingStoryService.updateStory.mockReturnValue(mockStory);
    GamingStoryService.shouldShowFirstStory.mockReturnValue(true);

    const { result } = renderHook(() => useGamingStory());

    act(() => {
      result.current.showFirstStory([{ name: 'Test Game' }]);
    });
    expect(result.current.gamingStory).toEqual(mockStory);

    act(() => {
      result.current.dismissStory();
    });
    expect(result.current.gamingStory).toBeNull();
  });
});
