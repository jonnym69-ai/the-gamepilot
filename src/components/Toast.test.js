import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ToastProvider, useToast } from './Toast';

const ToastHarness = () => {
  const { success, error } = useToast();

  return (
    <div>
      <button type="button" onClick={() => success('Library scan complete')}>Success</button>
      <button type="button" onClick={() => error('Launch failed')}>Error</button>
    </div>
  );
};

describe('ToastProvider', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test('announces urgent feedback and supports dismissal', () => {
    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Error' }));

    expect(screen.getByRole('alert').textContent).toContain('Launch failed');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    expect(screen.getByRole('alert').className).toContain('toast-error');
  });

  test('creates distinct notifications for rapid feedback', () => {
    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Success' }));
    fireEvent.click(screen.getByRole('button', { name: 'Success' }));

    expect(screen.getAllByText('Library scan complete')).toHaveLength(2);
  });

  test('removes feedback after its timeout', () => {
    jest.useFakeTimers();
    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Success' }));
    expect(screen.getByText('Library scan complete')).not.toBeNull();

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(screen.queryByText('Library scan complete')).toBeNull();
  });
});
