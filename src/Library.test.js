import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock(
  'react-router-dom',
  () => ({
    useNavigate: () => jest.fn(),
    useLocation: () => ({ pathname: '/library', search: '', hash: '', state: null }),
    Link: ({ children, ...rest }) => <a {...rest}>{children}</a>,
  }),
  { virtual: true }
);

jest.mock('./NavBar', () => () => <nav data-testid="nav-bar" />);

jest.mock('./ThemeContext', () => {
  const ReactLib = require('react');
  return {
    ThemeContext: ReactLib.createContext({ currentTheme: 'dark' }),
    getThemeSpecificLibraryTitle: jest.fn(() => 'Game Library'),
  };
});

jest.mock('./components/Toast', () => ({
  useToast: () => ({
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  }),
  ToastProvider: ({ children }) => <>{children}</>,
}));

jest.mock('./services/HardwareDetector', () => ({
  HardwareDetector: {
    getSystemInfo: jest.fn(() => new Promise(() => {})),
  },
}));

const Library = require('./Library').default;
const { HardwareDetector } = require('./services/HardwareDetector');

// Mock child components
jest.mock(
  './components/GameModal',
  () =>
    ({ game, isOpen, onClose, onLaunch, theme }) =>
      isOpen ? (
        <div data-testid="game-modal">
          <h2>{game?.name}</h2>
          <button onClick={onClose}>Close</button>
          <button onClick={() => onLaunch(game)}>Launch</button>
        </div>
      ) : null
);

jest.mock(
  './components/ExportModal',
  () =>
    ({ isOpen, onClose }) =>
      isOpen ? <div data-testid="export-modal">Export Modal</div> : null
);

jest.mock('./components/LibraryShareCard', () => ({
  __esModule: true,
  default: () => null,
  LIBRARY_SHARE_CARD_SIZE_PX: 1080,
}));

jest.mock('./components/TopRatedShareCard', () => ({
  __esModule: true,
  default: () => null,
  TOP_RATED_SHARE_CARD_SIZE_PX: 1080,
}));

jest.mock('./components/LazyImage', () => ({ src, alt, style }) => (
  <img src={src} alt={alt} style={style} data-testid="lazy-image" />
));

jest.mock('./components/HLTBChip', () => () => null);

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
    mood: 'Competitive',
    time_played: 120,
  },
  {
    appid: '2',
    name: 'Stardew Valley',
    platform: 'Steam',
    genres: ['Simulation', 'Indie'],
    mood: 'Relaxed',
    time_played: 200,
  },
  {
    appid: '3',
    name: 'Counter-Strike 2',
    platform: 'Steam',
    genres: ['Action', 'Shooter'],
    mood: 'Social',
    time_played: 300,
  },
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
    endSession: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('[]'); // Empty favorites
    // StorageService resolves the real jsdom localStorage — clear it so
    // saved views written by one test don't leak into the next render.
    window.localStorage.clear();
    HardwareDetector.getSystemInfo.mockImplementation(() => new Promise(() => {}));
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

  test('triggers scan callback from scan library action', async () => {
    const onScanLibrary = jest.fn();
    await renderLibrary({ onScanLibrary });

    fireEvent.click(screen.getByRole('button', { name: '🔄 Scan' }));
    expect(onScanLibrary).toHaveBeenCalledTimes(1);
  });

  test('sorts A–Z by sortName override when present', async () => {
    const library = [
      { name: 'Zebra Game', genres: ['Action'], platform: 'Steam', sortName: 'Aardvark Game' },
      { name: 'Mango Game', genres: ['Action'], platform: 'Steam' },
    ];
    await renderLibrary({ library });

    const zebra = screen.getByText('Zebra Game');
    const mango = screen.getByText('Mango Game');
    // sortName "Aardvark Game" pulls Zebra ahead of Mango alphabetically.
    expect(zebra.compareDocumentPosition(mango) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test('groups games by platform with section headers', async () => {
    const mixedLibrary = [
      { appid: '1', name: 'Witcher 3', platform: 'Steam', genres: ['RPG'], time_played: 10 },
      { appid: '2', name: 'Stardew Valley', platform: 'GOG', genres: ['Sim'], time_played: 20 },
      { appid: '3', name: 'Fortnite', platform: 'Epic', genres: ['Action'], time_played: 30 },
    ];
    await renderLibrary({ library: mixedLibrary });

    fireEvent.change(screen.getByRole('combobox', { name: 'Group by' }), { target: { value: 'platform' } });

    expect(screen.getByRole('heading', { name: 'Epic' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'GOG' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Steam' })).toBeInTheDocument();
  });

  test('saved views capture sort state and recall it on apply', async () => {
    const setSortBy = jest.fn();
    await renderLibrary({ setSortBy });

    // Change sort, then save it as a named view
    fireEvent.change(screen.getByDisplayValue('Name'), { target: { value: 'most-played' } });
    fireEvent.click(screen.getByRole('button', { name: '+ Save view' }));
    fireEvent.change(screen.getByLabelText('Saved view name'), { target: { value: 'Heavy hitters' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    // Move the sort elsewhere, then recall the view
    fireEvent.change(screen.getByDisplayValue('Most Played'), { target: { value: 'name' } });
    fireEvent.click(screen.getByRole('button', { name: 'Heavy hitters' }));

    expect(setSortBy).toHaveBeenLastCalledWith('most-played');
  });

  test('delete button removes a saved view chip', async () => {
    await renderLibrary();

    fireEvent.click(screen.getByRole('button', { name: '+ Save view' }));
    fireEvent.change(screen.getByLabelText('Saved view name'), { target: { value: 'Backlog' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('button', { name: 'Backlog' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete view Backlog' }));
    expect(screen.queryByRole('button', { name: 'Backlog' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete view Backlog' })).not.toBeInTheDocument();
  });
});
