import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SessionHistoryShare, { drawSessionHistoryCard } from './SessionHistoryShare';
import { LocalShareService } from '../services/LocalShareService';

jest.mock('../services/LocalShareService', () => ({
  LocalShareService: {
    downloadImageFromCanvas: jest.fn(),
    copyImageToClipboard: jest.fn(),
  },
}));
jest.mock('../services/RecentActivityAggregator', () => ({ formatDuration: (minutes) => `${minutes}m` }));

const breakdown = {
  days: 7,
  dateRange: ['2026-10-06', '2026-10-12'],
  overview: {
    totalPlaytimeLabel: '2h',
    totalPlaytimeMinutes: 120,
    totalSessions: 2,
    uniqueGames: 1,
    activeDays: 1,
    avgSessionLabel: '1h',
  },
  dailyTimeline: [{ totalMinutes: 120, games: { Hades: 120 } }],
  perGameBreakdown: [{ name: 'Hades', totalMinutes: 120 }],
};
let context;
beforeEach(() => {
  jest.clearAllMocks();
  context = { fillRect: jest.fn(), fillText: jest.fn(), measureText: (text) => ({ width: text.length * 10 }) };
  jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  jest
    .spyOn(HTMLCanvasElement.prototype, 'toBlob')
    .mockImplementation((callback) => callback(new Blob(['png'], { type: 'image/png' })));
  HTMLDialogElement.prototype.showModal = jest.fn();
  LocalShareService.downloadImageFromCanvas.mockResolvedValue({ success: true });
  LocalShareService.copyImageToClipboard.mockResolvedValue(true);
});
afterEach(() => jest.restoreAllMocks());

test('renders the selected period, exact totals and optional name on the card', () => {
  render(<SessionHistoryShare breakdown={breakdown} onClose={jest.fn()} />);
  expect(context.fillText).toHaveBeenCalledWith('My last 7 days', 60, 160);
  expect(context.fillText).toHaveBeenCalledWith('2h', 60, 277);
  fireEvent.change(screen.getByLabelText('Name on card (optional)'), { target: { value: 'Player' } });
  expect(context.fillText).toHaveBeenCalledWith('Player', 800, 98);
});

test('saves the preview canvas with a period-specific filename', async () => {
  render(<SessionHistoryShare breakdown={breakdown} onClose={jest.fn()} />);
  fireEvent.click(screen.getByText('Save PNG'));
  await waitFor(() =>
    expect(LocalShareService.downloadImageFromCanvas).toHaveBeenCalledWith(
      expect.any(HTMLCanvasElement),
      'gamepilot-session-history-7d-2026-10-12.png'
    )
  );
  expect(await screen.findByText('PNG download started.')).toBeInTheDocument();
});

test('copies locally and reports clipboard failures honestly', async () => {
  LocalShareService.copyImageToClipboard.mockResolvedValue(false);
  render(<SessionHistoryShare breakdown={breakdown} onClose={jest.fn()} />);
  fireEvent.click(screen.getByText('Copy image'));
  expect(await screen.findByText('Could not copy the image. Try Save PNG instead.')).toBeInTheDocument();
});

test('close returns control to the page', () => {
  const onClose = jest.fn();
  render(<SessionHistoryShare breakdown={breakdown} onClose={onClose} />);
  fireEvent.click(screen.getByText('Close'));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('zero-minute sessions produce finite chart coordinates', () => {
  const canvas = document.createElement('canvas');
  drawSessionHistoryCard(canvas, {
    ...breakdown,
    overview: { ...breakdown.overview, totalPlaytimeMinutes: 0 },
    dailyTimeline: [{ totalMinutes: 0, games: {} }],
  });
  context.fillRect.mock.calls.forEach((args) => args.forEach((value) => expect(Number.isFinite(value)).toBe(true)));
});
