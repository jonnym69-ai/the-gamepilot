import { renderHook, act } from '@testing-library/react';
import useSessionNotifications from './useSessionNotifications';

const mockToastSuccess = jest.fn();
const mockToastInfo = jest.fn();

jest.mock('../components/Toast', () => ({
  useToast: () => ({ success: mockToastSuccess, info: mockToastInfo }),
}));

const dispatchSessionEnded = (detail) => {
  act(() => {
    window.dispatchEvent(new CustomEvent('gamepilot:session-ended', { detail }));
  });
};

describe('useSessionNotifications', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('session saved toast reports the recorded playtime', () => {
    renderHook(() => useSessionNotifications());
    dispatchSessionEnded({ gameName: 'Hades', playtimeMinutes: 90 });
    expect(mockToastSuccess).toHaveBeenCalledWith('Session saved: +1h 30m to Hades', 5000);
  });

  test('short sessions report minutes only', () => {
    renderHook(() => useSessionNotifications());
    dispatchSessionEnded({ gameName: 'Hades', playtimeMinutes: 30 });
    expect(mockToastSuccess).toHaveBeenCalledWith('Session saved: +30m to Hades', 5000);
  });

  test('events without a game name are ignored', () => {
    renderHook(() => useSessionNotifications());
    dispatchSessionEnded({ playtimeMinutes: 30 });
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  test('monitor timeout warns the session will not auto-end', () => {
    renderHook(() => useSessionNotifications());
    act(() => {
      window.dispatchEvent(new CustomEvent('gamepilot:monitor-timeout', { detail: { gameName: 'Factorio' } }));
    });
    expect(mockToastInfo).toHaveBeenCalledWith(expect.stringContaining('Factorio'), 8000);
  });
});
