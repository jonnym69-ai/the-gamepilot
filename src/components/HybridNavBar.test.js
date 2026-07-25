import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import HybridNavBar from './HybridNavBar';

let mockPathname = '/';
let mockLocation = { pathname: '/' };

jest.mock('react-router-dom', () => ({
  Link: ({ to, className, children, ...props }) => <a href={to} className={className} {...props}>{children}</a>,
  NavLink: ({ to, end, className, children, ...props }) => {
    const isActive = end ? mockPathname === to : mockPathname === to || mockPathname.startsWith(`${to}/`);
    return <a href={to} className={`${className || ''}${isActive ? ' active' : ''}`.trim()} {...props}>{children}</a>;
  },
  useLocation: () => mockLocation
}), { virtual: true });

jest.mock('../ThemeContext', () => ({
  useTheme: () => ({
    bigScreenMode: false,
    toggleBigScreenMode: jest.fn()
  })
}));

jest.mock('../services/LabsService', () => ({
  isEnabled: jest.fn(() => false),
  subscribe: jest.fn(() => jest.fn())
}));

const renderNavigation = (route = '/') => {
  mockPathname = route;
  mockLocation = { pathname: route };
  return render(<HybridNavBar />);
};

describe('HybridNavBar', () => {
  test('marks the current primary route as active', () => {
    renderNavigation('/library');

    expect(screen.getByRole('link', { name: 'Library' }).className).toContain('active');
    expect(screen.getByRole('link', { name: 'Home' }).className).not.toContain('active');
  });

  test('opens and closes secondary navigation with Escape', () => {
    renderNavigation();

    const moreButton = screen.getByRole('button', { name: 'More navigation options' });
    fireEvent.click(moreButton);

    expect(screen.getByLabelText('More pages and tools')).not.toBeNull();
    expect(moreButton.getAttribute('aria-expanded')).toBe('true');

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByLabelText('More pages and tools')).toBeNull();
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
});
