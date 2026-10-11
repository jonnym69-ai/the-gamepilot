import { renderHook, act } from '@testing-library/react';
import useSessionNotifications from './useSessionNotifications';
import { generateSessionRoast } from '../services/SessionRoastService';

const mockToastSuccess = jest.fn();
const mockToastInfo = jest.fn();
const mockToastRoast = jest.fn();

jest.mock('../components/Toast', () => ({
  useToast: () => ({ success: mockToastSuccess, info: mockToastInfo, roast: mockToastRoast }),
}));

jest.mock('../services/SessionRoastService', () => ({
  generateSessionRoast: jest.fn(() => null),
}));

jest.mock('../services/RivalryService', () => ({
  generateRivalryToast: jest.fn(() => null),
}));

jest.mock('../services/StreakCharacterizerService', () => ({
  checkStreakMilestone: jest.fn(() => null),
  updateStreakCharacterization: jest.fn(),
}));

jest.mock('../services/IdentityShiftService', () => ({
  storeSnapshot: jest.fn(),
  checkIdentityShiftToast: jest.fn(() => null),
}));

const dispatchSessionEnded = (detail) => {
  act(() => {
    window.dispatchEvent(new CustomEvent('gamepilot:session-ended', { detail }));
  });
};

describe('useSessionNotifications XP feedback', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    generateSessionRoast.mockReturnValue(null);
  });

  test('session saved toast includes the XP the session earned', () => {
    renderHook(() => useSessionNotifications());
    dispatchSessionEnded({ gameName: 'Hades', playtimeMinutes: 90, xpEarned: 220 });
    expect(mockToastSuccess).toHaveBeenCalledWith('Session saved: +1h 30m to Hades · +220 XP', 5000);
  });

  test('roast toasts keep the XP suffix', () => {
    generateSessionRoast.mockReturnValue({ message: 'Two hours in Hades? Respect.' });
    renderHook(() => useSessionNotifications());
    dispatchSessionEnded({ gameName: 'Hades', playtimeMinutes: 120, xpEarned: 185 });
    expect(mockToastRoast).toHaveBeenCalledWith('Two hours in Hades? Respect. · +185 XP', 6000);
  });

  test('sessions without XP data keep the original message', () => {
    renderHook(() => useSessionNotifications());
    dispatchSessionEnded({ gameName: 'Hades', playtimeMinutes: 30 });
    expect(mockToastSuccess).toHaveBeenCalledWith('Session saved: +30m to Hades', 5000);
  });
});
