/**
 * Global keyboard shortcuts, easter-egg keys, and controller navigation.
 *
 * Registers/unregisters all global input listeners. The controller
 * navigation effect depends on the current route, so it re-registers
 * on route change.
 */

import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { KeyboardShortcuts } from '../KeyboardShortcuts';
import { EasterEggService } from '../services/EasterEggService';

const CONTROLLER_NAV_ROUTES = [
  '/',
  '/library',
  '/recommendations',
  '/stats',
  '/profile',
  '/year-in-review',
  '/timeline',
  '/settings',
  '/feedback',
];

export default function useGlobalInput() {
  const navigate = useNavigate();
  const location = useLocation();

  // Controller navigation
  useEffect(() => {
    const currentPath = location.pathname || '/';

    const handleGlobalControllerNavigation = (event) => {
      const action = event?.detail?.action;
      if (!action) {
        return;
      }

      window.setTimeout(() => {
        if (event.defaultPrevented) {
          return;
        }

        if (action === 'scroll_down') {
          window.scrollBy({ top: 220, behavior: 'smooth' });
          return;
        }

        if (action === 'scroll_up') {
          window.scrollBy({ top: -220, behavior: 'smooth' });
          return;
        }

        if (currentPath === '/library') {
          return;
        }

        const currentRouteIndex = Math.max(0, CONTROLLER_NAV_ROUTES.indexOf(currentPath));

        if (action === 'page_next') {
          const nextRoute = CONTROLLER_NAV_ROUTES[(currentRouteIndex + 1) % CONTROLLER_NAV_ROUTES.length];
          navigate(nextRoute);
          return;
        }

        if (action === 'page_previous') {
          const previousRoute =
            CONTROLLER_NAV_ROUTES[
              (currentRouteIndex - 1 + CONTROLLER_NAV_ROUTES.length) % CONTROLLER_NAV_ROUTES.length
            ];
          navigate(previousRoute);
        }
      }, 0);
    };

    window.addEventListener('controllerInput', handleGlobalControllerNavigation);
    return () => window.removeEventListener('controllerInput', handleGlobalControllerNavigation);
  }, [location.pathname, navigate]);

  // Initialize keyboard shortcuts
  useEffect(() => {
    const focusSearchInput = () => {
      // Focus search input if we're on the library page
      const searchInput = document.querySelector('input[placeholder*="search" i], input[placeholder*="Search" i]');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    };

    KeyboardShortcuts.registerAction('focus_search', 'Ctrl+K', focusSearchInput, 'Focus search');

    KeyboardShortcuts.registerAction(
      'go_library',
      'Ctrl+L',
      () => {
        window.location.hash = '#/library';
      },
      'Go to Library'
    );

    KeyboardShortcuts.registerAction(
      'go_home',
      'Ctrl+H',
      () => {
        window.location.hash = '#/';
      },
      'Go to Home'
    );

    KeyboardShortcuts.registerAction(
      'go_profile',
      'Ctrl+P',
      () => {
        window.location.hash = '#/profile';
      },
      'Go to Profile'
    );

    KeyboardShortcuts.registerAction(
      'go_stats',
      'Ctrl+S',
      () => {
        window.location.hash = '#/stats';
      },
      'Go to Stats'
    );

    KeyboardShortcuts.registerAction(
      'go_settings',
      'Ctrl+T',
      () => {
        window.location.hash = '#/settings';
      },
      'Go to Settings'
    );

    KeyboardShortcuts.registerAction(
      'show_shortcuts',
      '?',
      () => {
        KeyboardShortcuts.showHelp();
      },
      'Show keyboard shortcuts'
    );

    return () => {
      KeyboardShortcuts.unregisterAction('focus_search');
      KeyboardShortcuts.unregisterAction('go_library');
      KeyboardShortcuts.unregisterAction('go_home');
      KeyboardShortcuts.unregisterAction('go_profile');
      KeyboardShortcuts.unregisterAction('go_stats');
      KeyboardShortcuts.unregisterAction('go_settings');
      KeyboardShortcuts.unregisterAction('show_shortcuts');
    };
  }, []);

  // Listen for easter egg inputs
  useEffect(() => {
    const handleKeyDown = (e) => {
      EasterEggService.handleKeyPress(e.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
