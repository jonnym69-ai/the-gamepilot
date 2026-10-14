import React from 'react';
import { render, screen } from '@testing-library/react';
import EraShareCard from './EraShareCard';

const era = {
  name: 'The Zomboid Era',
  flavor: 'survival and stubbornness',
  dayCount: 47,
  snapshot: {
    totalMinutes: 5400,
    topGames: [
      { name: 'Project Zomboid', minutes: 3600 },
      { name: 'Hades', minutes: 1200 },
      { name: 'Terraria', minutes: 600 },
      { name: 'Overflow Game', minutes: 10 },
    ],
  },
};

test('renders the era identity, stats, and top three games', () => {
  render(<EraShareCard era={era} username="Moz" />);

  expect(screen.getByText('The Zomboid Era')).toBeInTheDocument();
  expect(screen.getByText('survival and stubbornness')).toBeInTheDocument();
  expect(screen.getByText('Day 47')).toBeInTheDocument();
  expect(screen.getByText('Moz')).toBeInTheDocument();
  expect(screen.getByText('Project Zomboid')).toBeInTheDocument();
  expect(screen.getByText('Terraria')).toBeInTheDocument();
  expect(screen.queryByText('Overflow Game')).not.toBeInTheDocument();
  expect(screen.getByText(/zero cloud tracking/i)).toBeInTheDocument();
});

test('renders nothing without an era and falls back on sparse data', () => {
  const view = render(<EraShareCard era={null} />);
  expect(screen.queryByText(/current gaming era/i)).not.toBeInTheDocument();
  view.unmount();

  render(<EraShareCard era={{ name: 'The Quiet Era' }} />);
  expect(screen.getByText('The Quiet Era')).toBeInTheDocument();
  expect(screen.getByText('Day 1')).toBeInTheDocument();
  expect(screen.getByText('a bit of everything')).toBeInTheDocument();
});
