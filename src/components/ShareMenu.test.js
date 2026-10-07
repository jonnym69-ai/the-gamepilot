import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ShareMenu from './ShareMenu';

jest.mock('../services/ProfileService', () => ({
  __esModule: true,
  default: { getEnabledSocialLinks: () => [], getSocialLinks: () => [] },
  SOCIAL_PLATFORMS: [],
}));

test('prioritises local exports and common apps without deleting other choices', () => {
  render(<ShareMenu onCopyText={jest.fn()} onSaveImage={jest.fn()} onShareText={jest.fn()} imageAvailable />);
  fireEvent.click(screen.getByRole('button', { name: 'Share' }));
  expect(screen.getByRole('menuitem', { name: 'Save share image' })).toBeInTheDocument();
  expect(screen.getByRole('menuitem', { name: 'Discord' })).toBeInTheDocument();
  expect(screen.queryByRole('menuitem', { name: 'LinkedIn' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('menuitem', { name: 'More apps' }));
  expect(screen.getByRole('menuitem', { name: 'LinkedIn' })).toBeInTheDocument();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Share' })).toHaveFocus();
});

test('releases the keyboard listener on unmount', () => {
  const add = jest.spyOn(document, 'addEventListener');
  const remove = jest.spyOn(document, 'removeEventListener');
  const view = render(<ShareMenu onCopyText={jest.fn()} onShareText={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Share' }));
  const listener = add.mock.calls.find(([event]) => event === 'keydown')[1];
  view.unmount();
  expect(remove).toHaveBeenCalledWith('keydown', listener);
  jest.restoreAllMocks();
});
