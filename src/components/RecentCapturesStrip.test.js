import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import RecentCapturesStrip from './RecentCapturesStrip';
import GameCapturesService from '../services/GameCapturesService';

jest.mock('../services/GameCapturesService', () => ({
  __esModule: true,
  default: {
    getAttribution: jest.fn(),
    getClipPosterFrame: jest.fn(() => Promise.resolve(null)),
    open: jest.fn(),
  },
}));

const capture = (name, capturedAt, kind = 'image') => ({
  name,
  filePath: `D:/shots/${name}`,
  fileUrl: `file:///D:/shots/${name}`,
  capturedAt,
  kind,
  source: 'game-bar',
});

const library = [{ name: 'Project Zomboid' }, { name: 'Hades' }];

beforeEach(() => {
  jest.clearAllMocks();
});

test('renders nothing while there are no attributed captures', async () => {
  GameCapturesService.getAttribution.mockResolvedValue({ byGame: new Map(), unattributed: [] });
  const { container } = render(<RecentCapturesStrip library={library} />);
  await waitFor(() => expect(GameCapturesService.getAttribution).toHaveBeenCalled());
  await waitFor(() => expect(container).toBeEmptyDOMElement());
});

test('shows the newest attributed captures across games with their names', async () => {
  const older = Date.now() - 5 * 24 * 60 * 60 * 1000;
  const newer = Date.now() - 24 * 60 * 60 * 1000;
  GameCapturesService.getAttribution.mockResolvedValue({
    byGame: new Map([
      ['Project Zomboid', [capture('pz-old.png', older), capture('pz-new.png', newer)]],
      ['Hades', [capture('hades.png', newer - 1000)]],
    ]),
    unattributed: [],
  });

  render(<RecentCapturesStrip library={library} />);
  await screen.findAllByText('Project Zomboid');
  expect(screen.getAllByText('Project Zomboid')).toHaveLength(2);
  expect(screen.getByText('Hades')).toBeInTheDocument();

  const buttons = screen.getAllByRole('button');
  expect(buttons[0]).toHaveAccessibleName(/pz-new\.png/);
  expect(buttons).toHaveLength(3);
});

test('opens the capture file when clicked', async () => {
  const shot = capture('pz.png', Date.now());
  GameCapturesService.getAttribution.mockResolvedValue({
    byGame: new Map([['Project Zomboid', [shot]]]),
    unattributed: [],
  });

  render(<RecentCapturesStrip library={library} />);
  const thumb = await screen.findByRole('button', { name: /pz\.png/ });
  fireEvent.click(thumb);
  expect(GameCapturesService.open).toHaveBeenCalledWith(shot);
});
