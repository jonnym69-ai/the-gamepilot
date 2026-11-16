import React from 'react';
import { render, screen } from '@testing-library/react';
import ScrollStrip from './ScrollStrip';

test('renders children inside the strip and passes group semantics through', () => {
  render(
    <ScrollStrip className="captures-strip" role="group" aria-label="Your captures">
      <span>item one</span>
      <span>item two</span>
    </ScrollStrip>
  );
  const group = screen.getByRole('group', { name: 'Your captures' });
  expect(group).toBeInTheDocument();
  expect(group).toHaveClass('scroll-strip-body', 'captures-strip');
  expect(screen.getByText('item one')).toBeInTheDocument();
  expect(screen.getByText('item two')).toBeInTheDocument();
});

test('hides the arrows when nothing overflows (jsdom has no layout)', () => {
  render(
    <ScrollStrip role="group" aria-label="strip">
      <span>item</span>
    </ScrollStrip>
  );
  expect(screen.queryByRole('button', { name: 'Scroll left' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Scroll right' })).not.toBeInTheDocument();
});
