/**
 * Theme and visual-mode orchestration.
 *
 * Owns the active theme id, applies the theme class to document.body,
 * persists the theme to localStorage, and listens for cross-component
 * theme toggle events.
 */

import { useEffect, useState } from 'react';
import moodThemes from '../themes/moodThemes.json';
import proThemes from '../themes/proThemes.json';

const VALID_THEME_IDS = new Set([
  'light',
  'dark',
  ...moodThemes.map((themeConfig) => themeConfig?.id).filter(Boolean),
  ...proThemes.map((themeConfig) => themeConfig?.id).filter(Boolean),
]);

const resolveThemeClassName = (themeId) => {
  const normalizedThemeId = typeof themeId === 'string' ? themeId.trim() : '';
  return VALID_THEME_IDS.has(normalizedThemeId) ? normalizedThemeId : 'dark';
};

export default function useTheme() {
  const [theme, setTheme] = useState(() => {
    // Get theme from localStorage or default to 'relaxed'
    const savedTheme = localStorage.getItem('gamepilot-theme');
    return savedTheme || 'relaxed';
  });
  // Listen for themeChange events from other components (e.g. Settings).
  useEffect(() => {
    const handleThemeChange = (event) => {
      setTheme(event.detail);
    };

    window.addEventListener('themeChange', handleThemeChange);
    return () => window.removeEventListener('themeChange', handleThemeChange);
  }, []);

  // Apply theme globally and save to localStorage
  useEffect(() => {
    const animationsEnabled = localStorage.getItem('animationsEnabled') !== 'false';

    // Clear any invalid cached theme
    const savedTheme = localStorage.getItem('gamepilot-theme');
    if (savedTheme && !VALID_THEME_IDS.has(savedTheme)) {
      localStorage.removeItem('gamepilot-theme');
    }

    const themeClass = resolveThemeClassName(theme);

    if (theme !== themeClass) {
      setTheme(themeClass);
    }

    // Mutate only the classes this hook owns. InterfacePreferencesService and
    // ThemeContext apply their own body classes (compact-mode, has-user-accent,
    // reduced-motion, ornament-*, etc.) — assigning className wholesale would
    // wipe them on every theme change.
    const bodyClassList = document.body.classList;
    VALID_THEME_IDS.forEach((themeId) => {
      if (themeId !== themeClass) {
        bodyClassList.remove(themeId);
      }
    });
    bodyClassList.add('App');
    bodyClassList.add(themeClass);
    bodyClassList.toggle('no-animations', !animationsEnabled);
    localStorage.setItem('gamepilot-theme', themeClass);
  }, [theme]);

  return { theme, setTheme };
}
