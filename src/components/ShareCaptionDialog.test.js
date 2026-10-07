import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ShareCaptionDialog from './ShareCaptionDialog';

const props = { isOpen: true, channel: { id: 'x', label: 'X' }, caption: 'My recap' };

test('preserves edited caption after a failed share', async () => {
  const onClose = jest.fn();
  render(<ShareCaptionDialog {...props} onClose={onClose} onShare={async () => ({ success: false })} />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'My edited recap' } });
  fireEvent.click(screen.getByRole('button', { name: 'Continue to X' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Sharing failed');
  expect(screen.getByRole('textbox')).toHaveValue('My edited recap');
  expect(onClose).not.toHaveBeenCalled();
});

test('waits for sharing and prevents duplicate submissions', async () => {
  let finish;
  const onShare = jest.fn(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const onClose = jest.fn();
  render(<ShareCaptionDialog {...props} onClose={onClose} onShare={onShare} />);
  fireEvent.click(screen.getByRole('button', { name: 'Continue to X' }));
  expect(screen.getByRole('button', { name: 'Preparing…' })).toBeDisabled();
  fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', ctrlKey: true });
  expect(onShare).toHaveBeenCalledTimes(1);
  finish({ success: true });
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
});

test('blank captions cannot silently fall back to private generated text', () => {
  render(<ShareCaptionDialog {...props} caption=" " onClose={jest.fn()} onShare={jest.fn()} />);
  expect(screen.getByRole('button', { name: 'Continue to X' })).toBeDisabled();
  expect(screen.getByText(/Review your display name/)).toBeInTheDocument();
});
