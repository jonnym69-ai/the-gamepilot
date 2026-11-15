import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import GameCapturesRow from './GameCapturesRow';
import GameCapturesService from '../services/GameCapturesService';

jest.mock('../services/GameCapturesService');

const capture = {
  dir: 'C:\\Users\\User\\Pictures\\Screenshots',
  name: 'Screenshot 2026-11-08 123621.png',
  filePath: 'C:\\Users\\User\\Pictures\\Screenshots\\Screenshot 2026-11-08 123621.png',
  fileUrl: 'file:///C:/Users/User/Pictures/Screenshots/Screenshot%202026-11-08%20123621.png',
  capturedAt: new Date(2026, 10, 8, 12, 36, 21).getTime(),
  kind: 'image',
  source: 'windows-screenshots',
};

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
