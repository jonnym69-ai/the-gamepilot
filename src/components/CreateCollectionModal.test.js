import React from 'react';
import { render, screen, within } from '@testing-library/react';
import CreateCollectionModal from './CreateCollectionModal';

jest.mock('../services/UserRuleCollectionService', () => ({
  UserRuleCollectionService: {
    create: jest.fn(),
  },
}));

const baseProps = {
  isOpen: true,
  onClose: jest.fn(),
  library: [{ name: 'Hades', appid: 1, platform: 'Steam', genres: ['Action'] }],
  onCreated: jest.fn(),
};

test('renders as a modal dialog portaled outside its parent subtree', () => {
  render(
    <div data-testid="shelf-host">
      <CreateCollectionModal {...baseProps} />
    </div>
  );

  // The dialog exists in the document but not inside the host subtree —
  // it is portaled to document.body so no transformed ancestor can trap
  // the fixed-position overlay.
  expect(screen.getByRole('dialog', { name: 'Create Smart Collection' })).toBeInTheDocument();
  const host = screen.getByTestId('shelf-host');
  expect(within(host).queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Save Collection' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
});

test('renders nothing when closed', () => {
  render(<CreateCollectionModal {...baseProps} isOpen={false} />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
