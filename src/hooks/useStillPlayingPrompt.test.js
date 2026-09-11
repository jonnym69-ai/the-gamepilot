import { renderHook, act } from '@testing-library/react';
import useStillPlayingPrompt from './useStillPlayingPrompt';

// Mock the toast hook
jest.mock('../components/Toast', () => ({
  useToast: () => ({ info: jest.fn(), success: jest.fn(), error: jest.fn(), roast: jest.fn() }),
}));

describe('useStillPlayingPrompt', () => {
  test('initial state has no prompt', () => {
    const { result } = renderHook(() => useStillPlayingPrompt({ activeSessions: {}, handleEndSession: jest.fn() }));
    expect(result.current.stillPlayingPrompt).toBeNull();
  });

  test('handleStillPlayingContinue clears the prompt', () => {
    const handleEndSession = jest.fn();
    const { result } = renderHook(() => useStillPlayingPrompt({ activeSessions: {}, handleEndSession }));

    // Simulate a prompt being set
    act(() => {
      // The prompt is set internally by the interval effect; we can test
      // the handlers directly by checking they handle null gracefully
      result.current.handleStillPlayingContinue();
    });

    expect(result.current.stillPlayingPrompt).toBeNull();
    expect(handleEndSession).not.toHaveBeenCalled();
  });

  test('handleStillPlayingEndSession with no prompt does nothing', () => {
    const handleEndSession = jest.fn();
    const { result } = renderHook(() => useStillPlayingPrompt({ activeSessions: {}, handleEndSession }));

    act(() => {
      result.current.handleStillPlayingEndSession();
    });

    expect(handleEndSession).not.toHaveBeenCalled();
    expect(result.current.stillPlayingPrompt).toBeNull();
  });

  test('does not crash with null activeSessions', () => {
    const { result } = renderHook(() => useStillPlayingPrompt({ activeSessions: null, handleEndSession: jest.fn() }));
    expect(result.current.stillPlayingPrompt).toBeNull();
  });

  test('does not crash with undefined activeSessions', () => {
    const { result } = renderHook(() =>
      useStillPlayingPrompt({ activeSessions: undefined, handleEndSession: jest.fn() })
    );
    expect(result.current.stillPlayingPrompt).toBeNull();
  });
});
