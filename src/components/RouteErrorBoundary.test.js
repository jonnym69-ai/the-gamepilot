import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RouteErrorBoundary from './RouteErrorBoundary';

// Suppress console.error noise from React when testing intentional errors
const originalError = console.error;
beforeEach(() => {
  console.error = jest.fn();
});
afterEach(() => {
  console.error = originalError;
});

const ThrowOnRender = ({ message = 'Test crash' }) => {
  throw new Error(message);
};

const GoodComponent = () => <div data-testid="good">All good</div>;

describe('RouteErrorBoundary', () => {
  test('renders children when no error occurs', () => {
    render(
      <RouteErrorBoundary>
        <GoodComponent />
      </RouteErrorBoundary>
    );
    expect(screen.getByTestId('good')).toBeInTheDocument();
  });

  test('shows error UI when a child throws', () => {
    render(
      <RouteErrorBoundary>
        <ThrowOnRender message="Kaboom" />
      </RouteErrorBoundary>
    );
    expect(screen.getByText('This page hit a snag')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
  });

  test('Try Again resets the boundary and re-renders children', () => {
    let shouldThrow = true;
    const ConditionalComponent = () => {
      if (shouldThrow) throw new Error('Conditional crash');
      return <div data-testid="recovered">Recovered</div>;
    };

    render(
      <RouteErrorBoundary>
        <ConditionalComponent />
      </RouteErrorBoundary>
    );

    expect(screen.getByText('This page hit a snag')).toBeInTheDocument();

    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));

    expect(screen.getByTestId('recovered')).toBeInTheDocument();
  });

  test('logs the error to console.error', () => {
    render(
      <RouteErrorBoundary>
        <ThrowOnRender message="Logged crash" />
      </RouteErrorBoundary>
    );
    expect(console.error).toHaveBeenCalled();
    const errorCall = console.error.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('RouteErrorBoundary')
    );
    expect(errorCall).toBeDefined();
  });

  test('has role="alert" for accessibility', () => {
    render(
      <RouteErrorBoundary>
        <ThrowOnRender />
      </RouteErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
