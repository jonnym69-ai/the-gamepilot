import { fireEvent, render, screen } from '@testing-library/react';
import LazyImage from './LazyImage';

// jsdom has no IntersectionObserver — fire the callback immediately so the
// component behaves as if the image scrolled into view.
beforeAll(() => {
  global.IntersectionObserver = class {
    constructor(callback) {
      this.callback = callback;
    }
    observe() {
      this.callback([{ isIntersecting: true }], this);
    }
    unobserve() {}
    disconnect() {}
  };
});

beforeEach(() => {
  window.localStorage.clear();
});

const getImg = () => screen.getByRole('img', { name: 'game' });

test('walks the fallbackSrcs chain when sources fail', () => {
  render(<LazyImage src="a.jpg" fallbackSrcs={['b.jpg', 'c.jpg']} alt="game" />);

  expect(getImg()).toHaveAttribute('src', 'a.jpg');
  fireEvent.error(getImg());
  expect(getImg()).toHaveAttribute('src', 'b.jpg');
  fireEvent.error(getImg());
  expect(getImg()).toHaveAttribute('src', 'c.jpg');
  fireEvent.error(getImg());
  // Chain exhausted: the image unmounts and the container shows the error state.
  expect(screen.queryByRole('img', { name: 'game' })).not.toBeInTheDocument();
});

test('supports the single fallbackSrc prop', () => {
  render(<LazyImage src="a.jpg" fallbackSrc="b.jpg" alt="game" />);
  fireEvent.error(getImg());
  expect(getImg()).toHaveAttribute('src', 'b.jpg');
});

test('skips a source already in the failed-image cache', () => {
  window.localStorage.setItem('gamepilot-gamepilot_failed_images', JSON.stringify({ 'a.jpg': Date.now() }));
  render(<LazyImage src="a.jpg" fallbackSrcs={['b.jpg']} alt="game" />);
  expect(getImg()).toHaveAttribute('src', 'b.jpg');
});
