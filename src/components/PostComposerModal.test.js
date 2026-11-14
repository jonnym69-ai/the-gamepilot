import React from 'react';
import { render, screen } from '@testing-library/react';
import PostComposerModal from './PostComposerModal';
import { ToastProvider } from './Toast';

test('post composer renders', () => {
  render(
    <ToastProvider>
      <PostComposerModal game={{ name: 'Test Game', platform: 'Epic' }} gameStats={{}} onClose={() => {}} />
    </ToastProvider>
  );
  expect(screen.getByText('Make a post')).toBeInTheDocument();
});

test('overlay pins itself to the viewport regardless of cascade conflicts', () => {
  render(
    <ToastProvider>
      <PostComposerModal game={{ name: 'Test Game', platform: 'Epic' }} gameStats={{}} onClose={() => {}} />
    </ToastProvider>
  );
  const overlay = screen.getByRole('dialog', { name: 'Make a post' });
  expect(overlay.style.position).toBe('fixed');
  expect(overlay.style.zIndex).toBe('12000');
});
