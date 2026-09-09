/**
 * Theme and visual-mode orchestration.
 *
 * Owns the active theme id and big-screen-mode flag, applies the
 * theme class to document.body, persists the theme to localStorage,
 * and listens for cross-component theme/big-screen toggle events.
 */

import { useEffect, useState } from 'react';
import moodThemes from '../themes/moodThemes.json';

const VALID_THEME_IDS = new Set(['light', 'dark', ...moodThemes.map((themeConfig) => themeConfig?.id).filter(Boolean)]);

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
  const [bigScreenMode, setBigScreenMode] = useState(() => localStorage.getItem('gamepilot-bigScreenMode') === 'true');

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
    const bigScreenMode = localStorage.getItem('gamepilot-bigScreenMode') === 'true';
    const newBodyClass = `App ${themeClass}${animationsEnabled ? '' : ' no-animations'}${bigScreenMode ? ' big-screen-mode' : ''}`;

    if (theme !== themeClass) {
      setTheme(themeClass);
    }

    // Only update if the class has actually changed
    if (document.body.className !== newBodyClass) {
      document.body.className = newBodyClass;
      localStorage.setItem('gamepilot-theme', themeClass);
    }
  }, [theme]);

  // React to big-screen mode toggle from ThemeContext
  useEffect(() => {
    const handleBigScreenToggle = () => {
      const animationsEnabled = localStorage.getItem('animationsEnabled') !== 'false';
      const themeClass = resolveThemeClassName(theme);
      const bigScreenMode = localStorage.getItem('gamepilot-bigScreenMode') === 'true';
      const newBodyClass = `App ${themeClass}${animationsEnabled ? '' : ' no-animations'}${bigScreenMode ? ' big-screen-mode' : ''}`;
      if (document.body.className !== newBodyClass) {
        document.body.className = newBodyClass;
      }
    };
    window.addEventListener('gamepilot:bigscreen-toggled', handleBigScreenToggle);
    const handleBigScreenState = (e) => {
      setBigScreenMode(!!e?.detail?.enabled);
    };
    window.addEventListener('gamepilot:bigscreen-toggled', handleBigScreenState);
    return () => {
      window.removeEventListener('gamepilot:bigscreen-toggled', handleBigScreenToggle);
      window.removeEventListener('gamepilot:bigscreen-toggled', handleBigScreenState);
    };
  }, [theme]);

  return { theme, setTheme, bigScreenMode, setBigScreenMode };
}
