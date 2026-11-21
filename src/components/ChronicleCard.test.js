import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ChronicleCard from './ChronicleCard';
import SessionRepository from '../services/SessionRepository';
import CurrentEraService from '../services/CurrentEraService';
import GameCapturesService from '../services/GameCapturesService';
import GamingPersonaService from '../services/GamingPersonaService';
import { LocalShareService } from '../services/LocalShareService';
import html2canvas from 'html2canvas';

jest.mock('html2canvas', () => jest.fn());
jest.mock('../services/SessionRepository', () => ({
  ...jest.requireActual('../services/SessionRepository'),
  getSessionHistory: jest.fn(),
}));
jest.mock('../services/CurrentEraService');
jest.mock('../services/GameCapturesService');
jest.mock('../services/GamingPersonaService');
jest.mock('../services/LocalShareService', () => ({
  LocalShareService: { downloadImageFromCanvas: jest.fn() },
}));
jest.mock('./personaVisuals', () => ({ getPersonaVisual: () => null }));
jest.mock('./LazyImage', () => {
  const MockLazyImage = ({ src, alt }) => <img src={src} alt={alt} />;
  return MockLazyImage;
});
jest.mock('../services/GameArtworkService', () => ({
  resolveGameArtworkBundle: (game) => ({
    artwork: game?.name ? `${game.name}-hero.jpg` : null,
    placeholder: null,
    fallbackSrc: null,
  }),
  getGameArtworkPlaceholder: () => null,
}));

const at = (month, day, minutes) => ({
  gameName: 'Project Zomboid',
  playtimeMinutes: minutes,
  startTime: new Date(2026, month, day, 20).toISOString(),
  endTime: new Date(2026, month, day, 21).toISOString(),
});

const sessions = [
  at(6, 13, 300),
  { ...at(6, 14, 120), gameName: 'Red Dead Redemption 2' },
  at(7, 2, 300),
  { ...at(7, 5, 120), gameName: 'Terraria' },
];

const library = [
  { name: 'Project Zomboid', importedPlaytimeMinutes: 9000, genres: ['Survival'] },
  { name: 'Red Dead Redemption 2', importedPlaytimeMinutes: 3000, genres: ['Adventure'] },
  { name: 'Terraria', importedPlaytimeMinutes: 2400, genres: ['Sandbox'] },
];

beforeEach(() => {
  jest.clearAllMocks();
  SessionRepository.getSessionHistory.mockReturnValue(sessions);
  CurrentEraService.getCurrentEra.mockReturnValue(null);
  GamingPersonaService.getPublicIdentity.mockReturnValue(null);
  GameCapturesService.readImageDataUrl.mockResolvedValue('data:image/png;base64,capture');
  GameCapturesService.getAttribution.mockResolvedValue({
    byGame: new Map([
      [
        'Project Zomboid',
        [
          {
            kind: 'image',
            name: 'zomboid.png',
            capturedAt: new Date(2026, 6, 13, 20, 30).getTime(),
          },
        ],
      ],
    ]),
    unattributed: [],
  });
  LocalShareService.downloadImageFromCanvas.mockResolvedValue({ success: true });
  html2canvas.mockResolvedValue({ id: 'canvas' });
});

test('renders the title page and contents, preferring a real capture for chapter art', async () => {
  render(<ChronicleCard library={library} username="Moz" />);

  expect(screen.getByRole('heading', { name: 'The Gaming Life of Moz' })).toBeInTheDocument();
  expect(screen.getByRole('navigation', { name: 'Chronicle contents' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Prologue' }));
  expect(screen.getByText(/reconstructed from launcher records/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: '‹ Contents' }));
  fireEvent.click(screen.getByRole('button', { name: /Chapter One — The Record Begins/ }));
  const captureArt = await screen.findByAltText('Project Zomboid chapter artwork');
  await waitFor(() => expect(captureArt).toHaveAttribute('src', 'data:image/png;base64,capture'));
  expect(GameCapturesService.readImageDataUrl).toHaveBeenCalled();
});

test('turns pages one leaf at a time, using the next game for art on repeats', async () => {
  render(<ChronicleCard library={library} username="Moz" />);

  expect(screen.getByRole('button', { name: 'Continue the story' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Prologue' }));
  expect(screen.getByText('Prologue')).toBeInTheDocument();
  expect(screen.getByText('1 / 3')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  expect(screen.getByText('Chapter I')).toBeInTheDocument();
  expect(await screen.findByAltText('Project Zomboid chapter artwork')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  expect(screen.getByText('Chapter II')).toBeInTheDocument();
  expect(await screen.findByAltText('Terraria chapter artwork')).toHaveAttribute('src', 'Terraria-hero.jpg');

  // Page heads are not collapsible in book mode; Next is disabled at the end.
  expect(screen.getByText(/Chapter Two —/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Chapter Two —/ })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  expect(screen.queryByRole('button', { name: /Chapter Three/ })).not.toBeInTheDocument();
});

test('expands the recorded sessions behind a chapter', async () => {
  render(<ChronicleCard library={library} username="Moz" />);

  fireEvent.click(screen.getByRole('button', { name: /Chapter One — The Record Begins/ }));

  const receipts = screen.getByText(/Receipts · 2 recorded sessions/);
  fireEvent.click(receipts);
  expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(2);
});

test('continues at the latest chapter for a returning reader', () => {
  render(<ChronicleCard library={library} username="Moz" />);

  fireEvent.click(screen.getByRole('button', { name: 'Continue the story' }));
  expect(screen.getByText('Chapter II')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Previous page' })).toBeEnabled();
});

test('shows the player’s own journal words inside the chapter', () => {
  SessionRepository.getSessionHistory.mockReturnValue([
    { ...at(6, 13, 60), note: 'The base finally feels like home.' },
  ]);
  render(<ChronicleCard library={[{ name: 'Project Zomboid' }]} username="Moz" />);

  fireEvent.click(screen.getByRole('button', { name: 'Open the book' }));
  expect(screen.getByText('“The base finally feels like home.”')).toBeInTheDocument();
  expect(screen.getByText(/— you,/)).toBeInTheDocument();
});

test('pluralizes singular counts everywhere, including the share card', async () => {
  SessionRepository.getSessionHistory.mockReturnValue([
    {
      gameName: 'Balatro',
      playtimeMinutes: 45,
      startTime: new Date(2026, 6, 13, 20).toISOString(),
      endTime: new Date(2026, 6, 13, 20, 45).toISOString(),
    },
  ]);
  GameCapturesService.getAttribution.mockResolvedValue({ byGame: new Map(), unattributed: [] });
  html2canvas.mockReturnValue(new Promise(() => {})); // keep the share stage mounted
  render(<ChronicleCard library={[{ name: 'Balatro', importedPlaytimeMinutes: 60 }]} username="Moz" />);

  await screen.findByText(/1 recorded session/);
  fireEvent.click(screen.getByRole('button', { name: 'Open the book' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  expect(screen.queryByText(/1 recorded sessions|1 sessions|1 games/)).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Share chapter' }));
  expect(await screen.findAllByText('1 session')).not.toHaveLength(0);
  expect(screen.getAllByText('1 game')).not.toHaveLength(0);
});

test('exports a chapter as a finished image', async () => {
  render(<ChronicleCard library={library} username="Moz" />);

  fireEvent.click(screen.getByRole('button', { name: /Chapter One — The Record Begins/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Share chapter' }));
  await waitFor(() => expect(html2canvas).toHaveBeenCalled());
  expect(LocalShareService.downloadImageFromCanvas).toHaveBeenCalledWith({ id: 'canvas' }, 'chronicle-2026-07.png');
  expect(await screen.findByRole('button', { name: 'Saved' })).toBeInTheDocument();
});
