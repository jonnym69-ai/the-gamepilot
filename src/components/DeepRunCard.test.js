import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DeepRunCard, { pickPalateCleanser } from './DeepRunCard';
import CurrentEraService from '../services/CurrentEraService';

jest.mock('../services/CurrentEraService', () => ({
  __esModule: true,
  default: { getCurrentEra: jest.fn(() => null) },
}));
jest.mock('./LazyImage', () => ({
  __esModule: true,
  default: ({ src, alt }) => <img src={src} alt={alt} />,
}));

const era = (overrides = {}) => ({
  name: 'The Project Zomboid Era',
  topGame: 'Project Zomboid',
  dayCount: 18,
  estimated: false,
  ...overrides,
});

const LIBRARY = [
  { name: 'Project Zomboid', genres: ['Survival', 'RPG'], time_played: 5000, last_played: Date.now() },
  { name: 'State of Decay 2', genres: ['Survival'], time_played: 0, last_played: null },
  { name: 'Hades', genres: ['Action', 'Roguelite'], time_played: 800, last_played: Date.now() - 30 * 86400000 },
];

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

describe('pickPalateCleanser', () => {
  test('prefers an unplayed game sharing the era game genre', () => {
    const pick = pickPalateCleanser(LIBRARY, 'Project Zomboid');
    expect(pick.game.name).toBe('State of Decay 2');
    expect(pick.unplayed).toBe(true);
    expect(pick.sharedGenres.map((g) => g.toLowerCase())).toContain('survival');
  });

  test('returns null when no library game shares a genre', () => {
    expect(pickPalateCleanser([LIBRARY[0], LIBRARY[2]], 'Project Zomboid')).toBeNull();
  });

  test('returns null when the era game has no comparable genres', () => {
    const library = [
      { name: 'Unknown Game', genres: [], time_played: 100 },
      { name: 'State of Decay 2', genres: ['Survival'] },
    ];
    expect(pickPalateCleanser(library, 'Unknown Game')).toBeNull();
  });
});

describe('DeepRunCard', () => {
  test('renders the era day count and a same-itch suggestion for long eras', () => {
    CurrentEraService.getCurrentEra.mockReturnValue(era());
    render(<DeepRunCard library={LIBRARY} onLaunchGame={jest.fn()} />);

    expect(screen.getByText(/Day 18 of The Project Zomboid Era/)).toBeInTheDocument();
    expect(screen.getByText('State of Decay 2')).toBeInTheDocument();
    expect(screen.getByText(/untouched in your library/)).toBeInTheDocument();
  });

  test.each([
    ['an estimated era', era({ estimated: true, dayCount: null })],
    ['a short era', era({ dayCount: 3 })],
    ['no era', null],
  ])('stays hidden for %s', (_label, value) => {
    CurrentEraService.getCurrentEra.mockReturnValue(value);
    const { container } = render(<DeepRunCard library={LIBRARY} />);
    expect(container).toBeEmptyDOMElement();
  });

  test('launches the suggested game', () => {
    const onLaunchGame = jest.fn();
    CurrentEraService.getCurrentEra.mockReturnValue(era());
    render(<DeepRunCard library={LIBRARY} onLaunchGame={onLaunchGame} />);
    fireEvent.click(screen.getByRole('button', { name: /Play State of Decay 2/i }));
    expect(onLaunchGame).toHaveBeenCalledWith(expect.objectContaining({ name: 'State of Decay 2' }));
  });

  test('dismiss persists for the era signature', () => {
    CurrentEraService.getCurrentEra.mockReturnValue(era());
    render(<DeepRunCard library={LIBRARY} />);
    fireEvent.click(screen.getByRole('button', { name: /Dismiss this suggestion/i }));
    expect(screen.queryByText(/Day 18 of/)).not.toBeInTheDocument();

    render(<DeepRunCard library={LIBRARY} />);
    expect(screen.queryByText(/Day 18 of/)).not.toBeInTheDocument();
  });
});
