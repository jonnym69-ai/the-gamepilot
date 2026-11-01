import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import HybridNavBar from './HybridNavBar';

let mockPathname = '/';
let mockLocation = { pathname: '/' };

jest.mock(
  'react-router-dom',
  () => ({
    Link: ({ to, className, children, ...props }) => (
      <a href={to} className={className} {...props}>
        {children}
      </a>
    ),
    NavLink: ({ to, end, className, children, ...props }) => {
      const isActive = end ? mockPathname === to : mockPathname === to || mockPathname.startsWith(`${to}/`);
      return (
        <a href={to} className={`${className || ''}${isActive ? ' active' : ''}`.trim()} {...props}>
          {children}
        </a>
      );
    },
    useLocation: () => mockLocation,
  }),
  { virtual: true }
);

jest.mock('../ThemeContext', () => ({
  useTheme: () => ({}),
}));

const renderNavigation = (route = '/') => {
  mockPathname = route;
  mockLocation = { pathname: route };
  return render(<HybridNavBar />);
};

describe('HybridNavBar', () => {
  test('provides a named navigation landmark and a branded home link', () => {
    renderNavigation('/library');

    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'GamePilot home' }).getAttribute('href')).toBe('/');
  });

  test('marks the current primary route as active', () => {
    renderNavigation('/library');

    expect(screen.getByRole('link', { name: 'Library' }).className).toContain('active');
    expect(screen.getByRole('link', { name: 'Home' }).className).not.toContain('active');
  });

  test('opens and closes secondary navigation with Escape', () => {
    renderNavigation();

    const moreButton = screen.getByRole('button', { name: 'More navigation options' });
    fireEvent.click(moreButton);

    expect(screen.getByLabelText('More pages')).not.toBeNull();
    expect(moreButton.getAttribute('aria-expanded')).toBe('true');

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByLabelText('More pages')).toBeNull();
    expect(moreButton.getAttribute('aria-expanded')).toBe('false');
  });

  test('opens the command palette from the Search control', () => {
    const listener = jest.fn();
    window.addEventListener('gamepilot:open-command-palette', listener);
    renderNavigation();

    fireEvent.click(screen.getByRole('button', { name: /Open command palette/i }));

    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener('gamepilot:open-command-palette', listener);
  });

  test('shows the complete secondary navigation', () => {
    renderNavigation();

    fireEvent.click(screen.getByRole('button', { name: 'More navigation options' }));

    expect(screen.getByRole('link', { name: /Hall of Champions/ }).getAttribute('href')).toBe('/timeline');
    expect(screen.getByRole('link', { name: /Recent Activity/ }).getAttribute('href')).toBe('/recent-activity');
    expect(screen.getByRole('link', { name: /Wishlist/ }).getAttribute('href')).toBe('/wishlist');
    expect(screen.getByRole('link', { name: /Feedback/ }).getAttribute('href')).toBe('/feedback');
    expect(screen.getByRole('link', { name: /Storage Manager/ }).getAttribute('href')).toBe('/storage-manager');
    expect(screen.getByRole('link', { name: /Your Gaming Life/ }).getAttribute('href')).toBe('/year-in-review');
    expect(screen.queryByText(/Export Hub/)).toBeNull();
    expect(screen.queryByText(/Gaming Links/)).toBeNull();
  });
});
