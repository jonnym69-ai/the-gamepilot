import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import SeasonalShelf from './SeasonalShelf';

jest.mock('./LazyImage', () => ({ alt, src }) => <img alt={alt} src={src || undefined} />);

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 9, 15)); // mid-October
});
afterEach(() => {
  jest.useRealTimers();
});

const library = [
  { name: 'Spooky Manor', platform: 'Local', genres: ['Horror'], installed: true, installDir: 'C:\\games\\spooky' },
  { name: 'Cozy Farm', platform: 'Local', genres: ['Cozy'], installed: true, installDir: 'C:\\games\\farm' },
  { name: 'Dark Thriller', platform: 'Local', genres: ['Thriller', 'Action'], installed: true },
];

test('shows only library games matching the seasonal theme', () => {
  render(<SeasonalShelf library={library} />);
  expect(screen.getByText(/Haunted Harvest Shelf/)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Spooky Manor' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Dark Thriller' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Cozy Farm' })).not.toBeInTheDocument();
});

test('launches a shelf pick with the existing library object', () => {
  const launch = jest.fn();
  render(<SeasonalShelf library={library} onLaunchGame={launch} />);
  fireEvent.click(screen.getByRole('button', { name: 'Play Spooky Manor' }));
  expect(launch).toHaveBeenCalledWith(library[0]);
});

test('hides entirely when no installed game fits the theme', () => {
  const { container } = render(<SeasonalShelf library={[{ name: 'Calm', genres: ['Cozy'], installed: true }]} />);
  expect(container).toBeEmptyDOMElement();
});

test('skips games that are not installed', () => {
  render(<SeasonalShelf library={[{ name: 'Ghosted', genres: ['Horror'], installed: false }]} />);
  expect(screen.queryByRole('heading', { name: 'Ghosted' })).not.toBeInTheDocument();
});
