import React from 'react';
import { render, screen } from '@testing-library/react';
import BoldText from './BoldText';

test('renders **bold** markers as strong elements', () => {
  render(<BoldText>You played **42 hours** this week.</BoldText>);
  expect(screen.getByText('42 hours', { selector: 'strong' })).toBeInTheDocument();
  expect(screen.getByText(/You played/)).toBeInTheDocument();
});

test('malicious markup stays literal text — no nodes are created', () => {
  const payload = '<img src=x onerror=alert(1)> **safe** <script>alert(2)</script>';
  render(<BoldText>{payload}</BoldText>);
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
  // The payload renders as inert text, and the real bold marker still works.
  expect(screen.getByText(/onerror=alert\(1\)/)).toBeInTheDocument();
  expect(screen.getByText(/<script>alert\(2\)<\/script>/)).toBeInTheDocument();
  expect(screen.getByText('safe', { selector: 'strong' })).toBeInTheDocument();
});

test('handles null children', () => {
  render(
    <div data-testid="wrap">
      <BoldText>{null}</BoldText>
    </div>
  );
  expect(screen.getByTestId('wrap')).toBeEmptyDOMElement();
});
