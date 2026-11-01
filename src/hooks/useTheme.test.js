import { renderHook, act } from '@testing-library/react';
import useTheme from './useTheme';

const BODY_CLASSES_TO_KEEP = ['has-user-accent', 'compact-mode'];

beforeEach(() => {
  localStorage.clear();
  document.body.className = '';
});

describe('useTheme', () => {
  test('applies the resolved theme class without wiping unrelated body classes', () => {
    document.body.className = BODY_CLASSES_TO_KEEP.join(' ');
    localStorage.setItem('gamepilot-theme', 'dark');

    renderHook(() => useTheme());

    expect(document.body.classList.contains('has-user-accent')).toBe(true);
    expect(document.body.classList.contains('compact-mode')).toBe(true);
    expect(document.body.classList.contains('App')).toBe(true);
    expect(document.body.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('gamepilot-theme')).toBe('dark');
  });

  test('adds no-animations when animations are disabled without touching preference classes', () => {
    document.body.className = BODY_CLASSES_TO_KEEP.join(' ');
    localStorage.setItem('animationsEnabled', 'false');

    renderHook(() => useTheme());

    expect(document.body.classList.contains('no-animations')).toBe(true);
    expect(document.body.classList.contains('has-user-accent')).toBe(true);
    expect(document.body.classList.contains('compact-mode')).toBe(true);
  });

  test('does not add no-animations when animations are enabled', () => {
    localStorage.setItem('animationsEnabled', 'true');
    document.body.className = 'has-user-accent';

    renderHook(() => useTheme());

    expect(document.body.classList.contains('no-animations')).toBe(false);
    expect(document.body.classList.contains('has-user-accent')).toBe(true);
  });

  test('re-applies no-animations off when the preference flips back on', () => {
    localStorage.setItem('animationsEnabled', 'false');
    const { rerender } = renderHook(() => useTheme());
    expect(document.body.classList.contains('no-animations')).toBe(true);

    localStorage.setItem('animationsEnabled', 'true');
    act(() => {
      window.dispatchEvent(new CustomEvent('themeChange', { detail: 'light' }));
    });
    rerender();

    expect(document.body.classList.contains('no-animations')).toBe(false);
    expect(document.body.classList.contains('light')).toBe(true);
  });

  test('removes the previous theme class when the theme changes', () => {
    localStorage.setItem('gamepilot-theme', 'dark');
    document.body.className = 'has-user-accent';
    renderHook(() => useTheme());
    expect(document.body.classList.contains('dark')).toBe(true);

    act(() => {
      window.dispatchEvent(new CustomEvent('themeChange', { detail: 'light' }));
    });

    expect(document.body.classList.contains('dark')).toBe(false);
    expect(document.body.classList.contains('light')).toBe(true);
    expect(document.body.classList.contains('has-user-accent')).toBe(true);
    expect(localStorage.getItem('gamepilot-theme')).toBe('light');
  });

  test('cleans up an invalid saved theme and falls back to dark', () => {
    localStorage.setItem('gamepilot-theme', 'not-a-theme');

    renderHook(() => useTheme());

    expect(document.body.classList.contains('dark')).toBe(true);
    expect(document.body.classList.contains('not-a-theme')).toBe(false);
    expect(localStorage.getItem('gamepilot-theme')).toBe('dark');
  });
});
