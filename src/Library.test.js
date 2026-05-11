import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/library', search: '', hash: '', state: null }),
  Link: ({ children, ...rest }) => <a {...rest}>{children}</a>
}), { virtual: true });

jest.mock('./NavBar', () => () => <nav data-testid="nav-bar" />);

jest.mock('./ThemeContext', () => {
  const ReactLib = require('react');
  return {
    ThemeContext: ReactLib.createContext({ currentTheme: 'dark' }),
    getThemeSpecificLibraryTitle: jest.fn(() => 'Game Library')
  };
});

jest.mock('./components/Toast', () => ({
  useToast: () => ({
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn()
  }),
  ToastProvider: ({ children }) => <>{children}</>
}));

jest.mock('./services/HardwareDetector', () => ({
  HardwareDetector: {
    getSystemInfo: jest.fn(() => new Promise(() => {}))
  }
}));

jest.mock('./services/FreeGameRadar', () => ({
  FreeGameRadar: {
    getFreeGames: jest.fn(() => new Promise(() => {}))
  }
}));

jest.mock('./services/ProgressionUnlockService', () => ({
  ProgressionUnlockService: {
    getLibraryPresentationPreference: jest.fn(() => 'classic_shelf'),
    getRewardPresentationCustomization: jest.fn(() => ({ selectedLibraryVariant: 'classic_shelf' })),
    getLibraryPresentationVariants: jest.fn(() => ([
      { id: 'classic_shelf', name: 'Classic Shelf', preview: 'linear-gradient(135deg, #ff6b35, #ff8c42)' }
    ]))
  }
}));

const Library = require('./Library').default;
const { HardwareDetector } = require('./services/HardwareDetector');
const { FreeGameRadar } = require('./services/FreeGameRadar');

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
    onScanLibrary: jest.fn(),
    activeSessions: {},
    theme: 'dark',
    onUpdatePrice: jest.fn(),
    searchQuery: '',
    setSearchQuery: jest.fn(),
    endSession: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('[]'); // Empty favorites
    HardwareDetector.getSystemInfo.mockImplementation(() => new Promise(() => {}));
    FreeGameRadar.getFreeGames.mockImplementation(() => new Promise(() => {}));
  });

  const renderLibrary = async (overrides = {}) => {
    return render(<Library {...defaultProps} {...overrides} />);
  };

  test('renders library with games', async () => {
    await renderLibrary();

    expect(screen.getByText('The Witcher 3: Wild Hunt')).toBeInTheDocument();
    expect(screen.getByText('Stardew Valley')).toBeInTheDocument();
    expect(screen.getByText('Counter-Strike 2')).toBeInTheDocument();
  });

  test('filters games by search query', async () => {
    jest.useFakeTimers();
    const mockSetSearchQuery = jest.fn();
    await renderLibrary({ setSearchQuery: mockSetSearchQuery });

    const searchInput = screen.getByPlaceholderText('Search games...');
    fireEvent.change(searchInput, { target: { value: 'Witcher' } });
    jest.advanceTimersByTime(350);

    await waitFor(() => {
      expect(mockSetSearchQuery).toHaveBeenCalledWith('Witcher');
    });
    jest.useRealTimers();
  });

  test('opens game modal when clicking on game card', async () => {
    await renderLibrary();

    const gameTitle = screen.getByText('The Witcher 3: Wild Hunt');
    fireEvent.click(gameTitle);

    expect(screen.getByTestId('game-modal')).toBeInTheDocument();
    expect(screen.getAllByText('The Witcher 3: Wild Hunt').length).toBeGreaterThan(0);
  });

  test('toggles between grid and list view', async () => {
    await renderLibrary();

    const viewButtons = screen.getAllByRole('button').filter((button) => button.className.includes('view-btn'));
    const listButton = viewButtons[1];
    fireEvent.click(listButton);

    // Should still render games after view mode switch
    expect(screen.getByText('The Witcher 3: Wild Hunt')).toBeInTheDocument();
  });

  test('shows export modal when export button is clicked', async () => {
    await renderLibrary();

    const exportButton = screen.getByText('Export Data');
    fireEvent.click(exportButton);

    expect(screen.getByTestId('export-modal')).toBeInTheDocument();
  });

  test('triggers scan callback from scan library action', async () => {
    const onScanLibrary = jest.fn();
    await renderLibrary({ onScanLibrary });

    fireEvent.click(screen.getByText('🔄 Scan Library'));
    expect(onScanLibrary).toHaveBeenCalledTimes(1);
  });
});
