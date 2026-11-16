import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import GameCapturesRow from './GameCapturesRow';
import GameCapturesService from '../services/GameCapturesService';

jest.mock('../services/GameCapturesService');
jest.mock('../services/SessionRepository', () => ({
  __esModule: true,
  default: { getSessionHistory: jest.fn(() => []) },
}));

const capture = {
  dir: 'C:\\Users\\User\\Pictures\\Screenshots',
  name: 'Screenshot 2026-11-08 123621.png',
  filePath: 'C:\\Users\\User\\Pictures\\Screenshots\\Screenshot 2026-11-08 123621.png',
  fileUrl: 'file:///C:/Users/User/Pictures/Screenshots/Screenshot%202026-11-08%20123621.png',
  capturedAt: new Date(2026, 10, 8, 12, 36, 21).getTime(),
  kind: 'image',
  source: 'windows-screenshots',
};

beforeEach(() => {
  jest.clearAllMocks();
  GameCapturesService.withinSessionWindow.mockReturnValue(true);
});

test('lets the user explicitly assign an unmatched screenshot to the game', async () => {
  GameCapturesService.getAttribution
    .mockResolvedValueOnce({ byGame: new Map(), unattributed: [capture] })
    .mockResolvedValueOnce({ byGame: new Map([['Project Zomboid', [capture]]]), unattributed: [] });
  GameCapturesService.assign.mockReturnValue(true);

  render(<GameCapturesRow gameName="Project Zomboid" library={[{ name: 'Project Zomboid' }]} />);

  const assign = await screen.findByRole('button', { name: `Assign ${capture.name} to Project Zomboid` });
  fireEvent.click(assign);

  expect(GameCapturesService.assign).toHaveBeenCalledWith(capture, 'Project Zomboid');
  expect(await screen.findByText(/Captures linked to this game — 1/)).toBeInTheDocument();
});

test('filters generic screenshots to session windows and reveals all on toggle', async () => {
  const inSession = { ...capture, name: 'in-session.png', filePath: 'C:\\p\\in-session.png' };
  const outside = { ...capture, name: 'outside.png', filePath: 'C:\\p\\outside.png' };
  GameCapturesService.getAttribution.mockResolvedValueOnce({ byGame: new Map(), unattributed: [inSession, outside] });
  GameCapturesService.withinSessionWindow.mockImplementation((cap) => cap.name === 'in-session.png');

  render(<GameCapturesRow gameName="Project Zomboid" library={[{ name: 'Project Zomboid' }]} />);

  expect(await screen.findByText(/Review unmatched screenshots \(1 of 2 during sessions\)/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Assign outside\.png/ })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Assign in-session\.png/ })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('checkbox', { name: /Only screenshots taken while a session was live/ }));
  expect(screen.getByRole('button', { name: /Assign outside\.png/ })).toBeInTheDocument();
});

test('shows unmatched recorder captures in their own strip', async () => {
  const recorderCapture = {
    ...capture,
    name: 'HoboRPG 15_11_2026 15_48_50.png',
    filePath: 'A:\\Captures\\HoboRPG 15_11_2026 15_48_50.png',
    source: 'gameplay-recorder',
    titleHint: 'HoboRPG',
  };
  GameCapturesService.getAttribution.mockResolvedValueOnce({ byGame: new Map(), unattributed: [recorderCapture] });

  render(<GameCapturesRow gameName="Project Zomboid" library={[{ name: 'Project Zomboid' }]} />);

  expect(await screen.findByText(/From your recorders — unmatched \(1\)/)).toBeInTheDocument();
  expect(screen.queryByText(/Review unmatched screenshots/)).not.toBeInTheDocument();
});
