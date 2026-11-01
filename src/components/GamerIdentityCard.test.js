import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GamerIdentityCard, { buildIdentityCanvas } from './GamerIdentityCard';
import { LocalShareService } from '../services/LocalShareService';
import { resolveGameArtworkBundle } from '../services/GameArtworkService';

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
}));
jest.mock('../services/LocalShareService', () => ({
  LocalShareService: {
    copyTextToClipboard: jest.fn(),
    copyImageToClipboard: jest.fn(),
  },
}));
jest.mock('../services/GameArtworkService', () => ({
  resolveGameArtworkBundle: jest.fn(),
}));
jest.mock('../services/UserBehaviorProfile', () => ({
  UserBehaviorProfile: {
    getTopMoods: jest.fn(() => []),
    getTopGenres: jest.fn(() => [{ genre: 'Action' }]),
    getPeakPlayHours: jest.fn(() => []),
    getTimeOfDay: jest.fn(() => 'Evening'),
  },
}));
jest.mock('../services/StatsAggregationService', () => ({
  StatsAggregationService: {
    getDashboardData: jest.fn(() => ({
      periods: { all: { playtimeMinutes: 6000, sessions: 20, avgSessionMinutes: 300 } },
      importedPlaytime: { totalMinutes: 0 },
    })),
  },
}));
jest.mock('../services/GamingPersonaService', () => ({
  __esModule: true,
  default: {
    getPersona: jest.fn(() => ({
      primaryPersona: { label: 'The Explorer' },
      summaryRoast: 'You try everything once.',
      subTraits: [{ label: 'Curious' }],
      signals: {},
      confidence: 'high',
      blendFactor: 1,
    })),
  },
}));
jest.mock('../services/StartupPersonalizationService', () => ({
  StartupPersonalizationService: {
    hasCompletedOnboarding: jest.fn(() => true),
  },
}));

let context;
const library = [
  { name: 'Hades', appid: 1145360, platform: 'steam', time_played: 6000 },
  { name: 'Stardew Valley', appid: 413150, platform: 'steam', time_played: 1200 },
];

beforeEach(() => {
  jest.clearAllMocks();
  resolveGameArtworkBundle.mockReturnValue({
    artwork: 'https://cdn.test/hades-portrait.jpg',
    fallbackSrc: '',
    placeholder: 'data:image/svg+xml,placeholder',
  });
  LocalShareService.copyImageToClipboard.mockResolvedValue(true);
  context = {
    scale: jest.fn(),
    createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
    fillRect: jest.fn(),
    strokeRect: jest.fn(),
    fillText: jest.fn(),
    measureText: (text) => ({ width: String(text).length * 10 }),
    beginPath: jest.fn(),
    roundRect: jest.fn(),
    rect: jest.fn(),
    clip: jest.fn(),
    fill: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    drawImage: jest.fn(),
  };
  jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  jest
    .spyOn(HTMLCanvasElement.prototype, 'toBlob')
    .mockImplementation((callback) => callback(new Blob(['png'], { type: 'image/png' })));
  jest.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,mock');
});

afterEach(() => jest.restoreAllMocks());

test('share copies the rendered card image, not a text summary', async () => {
  global.Image = class {
    set src(value) {
      this._src = value;
      setTimeout(() => this.onload && this.onload(), 0);
    }
  };

  render(<GamerIdentityCard library={library} />);
  fireEvent.click(screen.getByTitle('Copy card image'));

  await waitFor(() => expect(LocalShareService.copyImageToClipboard).toHaveBeenCalled());
  expect(LocalShareService.copyImageToClipboard).toHaveBeenCalledWith(
    expect.any(Blob),
    expect.stringContaining('gamepilot-identity-')
  );
  expect(LocalShareService.copyTextToClipboard).not.toHaveBeenCalled();
  expect(await screen.findByText('Card image copied. Paste it wherever you share.')).toBeInTheDocument();
});

test('the exported card draws the most-played game cover from the artwork bundle', async () => {
  global.Image = class {
    set src(value) {
      this._src = value;
      setTimeout(() => this.onload && this.onload(), 0);
    }
  };

  const identity = {
    label: 'The Explorer',
    description: 'You try everything once.',
    tags: ['Curious'],
    totalGames: 2,
    totalHours: 100,
    totalSessions: 20,
    avgSession: 300,
    topGame: library[0],
  };
  await buildIdentityCanvas(identity);

  expect(resolveGameArtworkBundle).toHaveBeenCalledWith(library[0], expect.objectContaining({ surface: 'portrait' }));
  expect(context.drawImage).toHaveBeenCalled();
  expect(context.fillText).toHaveBeenCalledWith('MOST PLAYED', 552, 402);
});

test('the card still draws cleanly when no top game exists', async () => {
  global.Image = class {
    set src(value) {
      this._src = value;
      setTimeout(() => this.onerror && this.onerror(), 0);
    }
  };
  resolveGameArtworkBundle.mockReturnValue({ artwork: '', fallbackSrc: '', placeholder: '' });

  const canvas = await buildIdentityCanvas({
    label: 'Rookie',
    description: 'Just starting out.',
    tags: [],
    totalGames: 0,
    totalHours: 0,
    totalSessions: 0,
    avgSession: 0,
    topGame: null,
  });

  expect(canvas).toBeInstanceOf(HTMLCanvasElement);
  expect(context.drawImage).not.toHaveBeenCalled();
});
