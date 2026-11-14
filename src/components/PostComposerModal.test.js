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
