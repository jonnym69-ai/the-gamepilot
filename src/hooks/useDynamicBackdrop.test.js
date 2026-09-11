import { renderHook } from '@testing-library/react';
import useDynamicBackdrop from './useDynamicBackdrop';

// Mock services
jest.mock('../services/GameArtworkService', () => ({
  resolveGameArtwork: jest.fn(),
}));

jest.mock('../services/DynamicBackdropService', () => ({
  __esModule: true,
  default: {
    getSettings: jest.fn(() => ({ enabled: false })),
    getPalette: jest.fn(() => Promise.resolve(null)),
    generateBackdropCSS: jest.fn(() => null),
  },
}));

const { resolveGameArtwork } = require('../services/GameArtworkService');
const DynamicBackdropService = require('../services/DynamicBackdropService').default;

describe('useDynamicBackdrop', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.className = '';
    document.documentElement.style.cssText = '';
  });

  test('does not apply cover background when dynamicCoverBg is false', () => {
    renderHook(() => useDynamicBackdrop({ lastPlayedGame: { name: 'Test' }, dynamicCoverBg: false }));

    expect(document.body.classList.contains('dynamic-cover-bg')).toBe(false);
  });

  test('does not apply cover background when lastPlayedGame is null', () => {
    renderHook(() => useDynamicBackdrop({ lastPlayedGame: null, dynamicCoverBg: true }));

    expect(document.body.classList.contains('dynamic-cover-bg')).toBe(false);
  });

  test('applies cover background when enabled and game has artwork', () => {
    resolveGameArtwork.mockReturnValue('https://example.com/cover.jpg');

    renderHook(() => useDynamicBackdrop({ lastPlayedGame: { name: 'Test' }, dynamicCoverBg: true }));

    expect(document.body.classList.contains('dynamic-cover-bg')).toBe(true);
    expect(document.documentElement.style.getPropertyValue('--dynamic-cover-image')).toBe(
      'url(https://example.com/cover.jpg)'
    );
  });

  test('does not apply cover background when artwork is null', () => {
    resolveGameArtwork.mockReturnValue(null);

    renderHook(() => useDynamicBackdrop({ lastPlayedGame: { name: 'Test' }, dynamicCoverBg: true }));

    expect(document.body.classList.contains('dynamic-cover-bg')).toBe(false);
  });

  test('does not apply animated backdrop when disabled in settings', () => {
    DynamicBackdropService.getSettings.mockReturnValue({ enabled: false });

    renderHook(() => useDynamicBackdrop({ lastPlayedGame: { name: 'Test' }, dynamicCoverBg: false }));

    expect(document.body.classList.contains('dynamic-backdrop-active')).toBe(false);
  });

  test('does not apply animated backdrop when no lastPlayedGame', () => {
    DynamicBackdropService.getSettings.mockReturnValue({ enabled: true });

    renderHook(() => useDynamicBackdrop({ lastPlayedGame: null, dynamicCoverBg: false }));

    expect(document.body.classList.contains('dynamic-backdrop-active')).toBe(false);
  });
});
