import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import PlayNextCard from './PlayNextCard';
import PlayNextService from '../services/PlayNextService';

jest.mock('./LazyImage', () => ({ alt }) => <img alt={alt} />);
jest.mock('../services/GameArtworkService', () => ({
  resolveGameArtworkBundle: jest.fn((game) => ({
    artwork: game?.appid ? `https://art/${game.appid}.jpg` : null,
    fallbackSrc: null,
    placeholder: null,
  })),
}));

const games = [
  { name: 'Project Zomboid', appid: 'pz' },
  { name: 'Terraria', appid: 't2' },
  { name: 'Hades', appid: 'h3' },
];

const pickResult = {
  mode: 'pick',
  primary: { game: games[0], reason: 'Fits your taste.', detail: '~90m typical session' },
  alternates: [
    { game: games[1], reason: 'Something different.', detail: null },
    { game: games[2], reason: 'Short and sharp.', detail: null },
  ],
};

beforeEach(() => {
  jest.spyOn(PlayNextService, 'getPlayNext').mockReturnValue(pickResult);
});

afterEach(() => jest.restoreAllMocks());

test('renders alternates as visible chips and clicking one promotes it to the main pick', () => {
  render(<PlayNextCard library={games} onLaunchGame={jest.fn()} />);

  const alternates = screen.getByRole('group', { name: 'Other picks' });
  fireEvent.click(screen.getByRole('button', { name: /Terraria/ }));

  expect(alternates).toBeInTheDocument();
  expect(screen.getByText('Something different.')).toBeInTheDocument();
  // The promoted game left the alternates row; the previous pick joined it.
  expect(screen.getByRole('button', { name: /Project Zomboid/ })).toBeInTheDocument();
  expect(alternates).not.toHaveTextContent('Terraria');
});

test('resume mode shows the journal note under the reason', () => {
  PlayNextService.getPlayNext.mockReturnValue({
    mode: 'resume',
    primary: { game: games[0], reason: "Day 5 of The Zomboid Era. The run isn't over.", note: 'cleared the mall' },
    alternates: [],
  });
  render(<PlayNextCard library={games} />);
  expect(screen.getByText('“cleared the mall”')).toBeInTheDocument();
});

test('single pick renders no alternates row', () => {
  PlayNextService.getPlayNext.mockReturnValue({
    mode: 'pick',
    primary: pickResult.primary,
    alternates: [],
  });
  render(<PlayNextCard library={games} />);
  expect(screen.queryByRole('group', { name: 'Other picks' })).not.toBeInTheDocument();
});
