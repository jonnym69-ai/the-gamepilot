import React from 'react';
import { render, screen } from '@testing-library/react';
import { HabitsShareCard, HABITS_SHARE_CARD_SIZE_PX } from './HabitsShareCard';

const insights = {
  longestSession: { gameName: 'Project Zomboid', playtimeMinutes: 512, dateLabel: '12 Oct' },
  busiestDay: { dateLabel: '14 Oct', playtimeMinutes: 400, sessions: 4 },
  mostReturnedTo: { name: 'Hades', sessions: 9, totalPlaytime: 1800 },
  lateNightSessions: 6,
  weekendSessions: 11,
  repeatGames: 3,
};

const covers = {
  longestSession: {
    artwork: 'https://cdn.test/zomboid-portrait.jpg',
    fallbackSrc: 'https://cdn.test/zomboid-landscape.jpg',
    placeholder: 'data:image/svg+xml,zomboid',
  },
  mostReturnedTo: {
    artwork: 'https://cdn.test/hades-portrait.jpg',
    fallbackSrc: '',
    placeholder: 'data:image/svg+xml,hades',
  },
};

test('renders covers beside the game-naming stats when bundles are provided', () => {
  render(<HabitsShareCard insights={insights} covers={covers} />);
  const zomboidCover = screen.getByRole('img', { name: 'Project Zomboid cover' });
  const hadesCover = screen.getByRole('img', { name: 'Hades cover' });
  expect(zomboidCover.style.backgroundImage).toContain('zomboid-portrait.jpg');
  expect(zomboidCover.style.backgroundImage).toContain('zomboid-landscape.jpg');
  expect(zomboidCover.style.backgroundImage).toContain('data:image/svg+xml,zomboid');
  expect(hadesCover.style.backgroundImage).toContain('hades-portrait.jpg');
});

test('stats render without covers when no bundles are provided', () => {
  render(<HabitsShareCard insights={insights} covers={{}} />);
  expect(screen.queryByRole('img', { name: /cover/i })).not.toBeInTheDocument();
  expect(screen.getByText('Project Zomboid')).toBeInTheDocument();
  expect(screen.getByText('Hades')).toBeInTheDocument();
  expect(screen.getByText('6')).toBeInTheDocument();
});

test('renders with branding at the share-card size', () => {
  render(<HabitsShareCard insights={insights} username="Pilot" periodLabel="This Week" />);
  expect(HABITS_SHARE_CARD_SIZE_PX).toBe(1080);
  expect(screen.getByText('GAMEPILOT')).toBeInTheDocument();
  expect(screen.getByText('Pilot · This Week')).toBeInTheDocument();
});
