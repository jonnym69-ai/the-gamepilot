import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Library from './Library';

// Mock child components
jest.mock('./components/GameModal', () => ({ game, isOpen, onClose, onLaunch, theme }) => (
  isOpen ? (
    <div data-testid="game-modal">
      <h2>{game?.name}</h2>
      <button onClick={onClose}>Close</button>
      <button onClick={() => onLaunch(game)}>Launch</button>
    </div>
  ) : null
));

jest.mock('./components/ExportModal', () => ({ isOpen, onClose }) => (
  isOpen ? <div data-testid="export-modal">Export Modal</div> : null
));

jest.mock('./components/LazyImage', () => ({ src, alt, style }) => (
  <img src={src} alt={alt} style={style} data-testid="lazy-image" />
));

// Mock AchievementTracker
jest.mock('./AchievementSystem', () => ({
  AchievementTracker: {
    trackFeatureUsage: jest.fn(),
    trackPlatformUsage: jest.fn()
  }
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock library data
const mockLibrary = [
  {
    appid: '1',
    name: 'The Witcher 3: Wild Hunt',
    platform: 'Steam',
    genres: ['RPG', 'Adventure'],
    mood: 'Escapist',
    time_played: 120
  },
  {
    appid: '2',
    name: 'Stardew Valley',
    platform: 'Steam',
    genres: ['Simulation', 'Indie'],
    mood: 'Relaxed',
    time_played: 200
  },
  {
    appid: '3',
    name: 'Counter-Strike 2',
    platform: 'Steam',
    genres: ['Action', 'Shooter'],
    mood: 'Social',
    time_played: 300
  }
];

describe('Library Component', () => {
  const defaultProps = {
    library: mockLibrary,
    onLaunchGame: jest.fn(),
    activeSessions: {},
    sortBy: 'name',
    setSortBy: jest.fn(),
    filterMood: '',
    setFilterMood: jest.fn(),
    filterGenre: '',
    setFilterGenre: jest.fn(),
    filterPlatform: '',
    setFilterPlatform: jest.fn(),
    filterMaxTime: '',
    setFilterMaxTime: jest.fn(),
    theme: 'dark',
    onUpdatePrice: jest.fn(),
    searchQuery: '',
    setSearchQuery: jest.fn(),
    endSession: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('[]'); // Empty favorites
  });

  test('renders library with games', () => {
    render(<Library {...defaultProps} />);

    expect(screen.getByText('The Witcher 3: Wild Hunt')).toBeInTheDocument();
    expect(screen.getByText('Stardew Valley')).toBeInTheDocument();
    expect(screen.getByText('Counter-Strike 2')).toBeInTheDocument();
  });

  test('displays correct number of games', () => {
    render(<Library {...defaultProps} />);

    expect(screen.getByText('Showing 3 of 3 games')).toBeInTheDocument();
  });

  test('filters games by search query', async () => {
    const mockSetSearchQuery = jest.fn();
    render(<Library {...defaultProps} setSearchQuery={mockSetSearchQuery} />);

    const searchInput = screen.getByPlaceholderText('Search games...');
    fireEvent.change(searchInput, { target: { value: 'Witcher' } });

    // Wait for debounced search
    await waitFor(() => {
      expect(mockSetSearchQuery).toHaveBeenCalledWith('Witcher');
    }, { timeout: 400 });
  });

  test('filters games by mood', () => {
    const mockSetFilterMood = jest.fn();
    render(<Library {...defaultProps} setFilterMood={mockSetFilterMood} />);

    const moodSelect = screen.getAllByRole('combobox')[0]; // First select (mood)
    fireEvent.change(moodSelect, { target: { value: 'Escapist' } });

    expect(mockSetFilterMood).toHaveBeenCalledWith('Escapist');
  });

  test('filters games by genre', () => {
    const mockSetFilterGenre = jest.fn();
    render(<Library {...defaultProps} setFilterGenre={mockSetFilterGenre} />);

    const genreSelect = screen.getAllByRole('combobox')[1]; // Second select (genre)
    fireEvent.change(genreSelect, { target: { value: 'RPG' } });

    expect(mockSetFilterGenre).toHaveBeenCalledWith('RPG');
  });

  test('sorts games by different criteria', () => {
    const mockSetSortBy = jest.fn();
    render(<Library {...defaultProps} setSortBy={mockSetSortBy} />);

    const sortSelect = screen.getByRole('combobox', { name: /sort by/i });
    fireEvent.change(sortSelect, { target: { value: 'most-played' } });

    expect(mockSetSortBy).toHaveBeenCalledWith('most-played');
  });

  test('opens game modal when clicking on game card', () => {
    render(<Library {...defaultProps} />);

    const gameTitle = screen.getByText('The Witcher 3: Wild Hunt');
    fireEvent.click(gameTitle);

    expect(screen.getByTestId('game-modal')).toBeInTheDocument();
    expect(screen.getByText('The Witcher 3: Wild Hunt')).toBeInTheDocument();
  });

  test('toggles between grid and list view', () => {
    render(<Library {...defaultProps} />);

    const listButton = screen.getByRole('button', { name: /list/i });
    fireEvent.click(listButton);

    // Should still render games (view mode change doesn't affect data)
    expect(screen.getByText('The Witcher 3: Wild Hunt')).toBeInTheDocument();
  });

  test('shows export modal when export button is clicked', () => {
    render(<Library {...defaultProps} />);

    const exportButton = screen.getByText('Export Data');
    fireEvent.click(exportButton);

    expect(screen.getByTestId('export-modal')).toBeInTheDocument();
  });

  test('loads more games when Load More button is clicked', () => {
    // Create a larger library to trigger pagination
    const largeLibrary = Array.from({ length: 60 }, (_, i) => ({
      appid: `${i + 1}`,
      name: `Game ${i + 1}`,
      platform: 'Steam',
      genres: ['Action'],
      mood: 'Social',
      time_played: 50
    }));

    render(<Library {...defaultProps} library={largeLibrary} />);

    // Initially shows 50 games
    expect(screen.getByText('Showing 50 of 60 games')).toBeInTheDocument();

    // Click Load More
    const loadMoreButton = screen.getByText('Load 10 More Games');
    fireEvent.click(loadMoreButton);

    // Should now show more games
    expect(screen.getByText('Showing 60 of 60 games')).toBeInTheDocument();
  });
});
