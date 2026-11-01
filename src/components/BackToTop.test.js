import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BackToTop from './BackToTop';

const setScrollY = (value) => {
  Object.defineProperty(window, 'scrollY', { value, configurable: true, writable: true });
};

describe('BackToTop', () => {
  beforeEach(() => {
    setScrollY(0);
    window.scrollTo = jest.fn();
    window.matchMedia = jest.fn().mockReturnValue({ matches: false });
  });

  test('is hidden until the page scrolls past the threshold, then scrolls to top', () => {
    render(<BackToTop />);
    expect(screen.queryByRole('button', { name: 'Back to top' })).not.toBeInTheDocument();

    setScrollY(700);
    fireEvent.scroll(window);
    const button = screen.getByRole('button', { name: 'Back to top' });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  test('stays hidden below the threshold and uses instant scroll with reduced motion', () => {
    window.matchMedia = jest.fn().mockReturnValue({ matches: true });
    render(<BackToTop />);

    setScrollY(599);
    fireEvent.scroll(window);
    expect(screen.queryByRole('button', { name: 'Back to top' })).not.toBeInTheDocument();

    setScrollY(6000);
    fireEvent.scroll(window);
    fireEvent.click(screen.getByRole('button', { name: 'Back to top' }));
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
  });
});
