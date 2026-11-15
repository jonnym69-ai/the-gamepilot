import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ChronicleCard from './ChronicleCard';
import SessionRepository from '../services/SessionRepository';
import GameCapturesService from '../services/GameCapturesService';
import GamingPersonaService from '../services/GamingPersonaService';
import { LocalShareService } from '../services/LocalShareService';
import html2canvas from 'html2canvas';

jest.mock('html2canvas', () => jest.fn());
jest.mock('../services/SessionRepository', () => ({
  ...jest.requireActual('../services/SessionRepository'),
  getSessionHistory: jest.fn(),
}));
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
  expect(screen.getByText(/reconstructed from launcher records/)).toBeInTheDocument();
  const captureArt = await screen.findByAltText('Project Zomboid chapter artwork');
  await waitFor(() => expect(captureArt).toHaveAttribute('src', 'data:image/png;base64,capture'));
  expect(GameCapturesService.readImageDataUrl).toHaveBeenCalled();
});

test('uses the next game for art when a dominant game repeats and collapses chapters', async () => {
  render(<ChronicleCard library={library} username="Moz" />);

  expect(await screen.findByAltText('Terraria chapter artwork')).toHaveAttribute('src', 'Terraria-hero.jpg');
  const chapterToggle = screen
    .getAllByRole('button', { name: /Chapter One — The Record Begins/ })
    .find((button) => button.hasAttribute('aria-expanded'));
  fireEvent.click(chapterToggle);
  expect(chapterToggle).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByText(/The chronicle opens/)).not.toBeInTheDocument();
});

test('expands the recorded sessions behind a chapter', async () => {
  render(<ChronicleCard library={library} username="Moz" />);

  const receipts = screen.getAllByText(/Receipts · 2 recorded sessions/)[0];
  fireEvent.click(receipts);
  expect(within(screen.getAllByRole('list')[0]).getAllByRole('listitem')).toHaveLength(2);
});

test('exports a chapter as a finished image', async () => {
  render(<ChronicleCard library={library} username="Moz" />);

  fireEvent.click(screen.getAllByRole('button', { name: 'Share chapter' })[0]);
  await waitFor(() => expect(html2canvas).toHaveBeenCalled());
  expect(LocalShareService.downloadImageFromCanvas).toHaveBeenCalledWith({ id: 'canvas' }, 'chronicle-2026-07.png');
  expect(await screen.findByRole('button', { name: 'Saved' })).toBeInTheDocument();
});
