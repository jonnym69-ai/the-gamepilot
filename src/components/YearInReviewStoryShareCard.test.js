import React from 'react';
import { render, screen } from '@testing-library/react';
import { YearInReviewStoryShareCard } from './YearInReviewStoryShareCard';

jest.mock('./ShareCardWatermark', () => ({
  ShareCardWatermark: () => <span>watermark</span>,
}));

const cover = (name, appid) => ({
  name,
  portrait: appid ? `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/library_600x900.jpg` : null,
  portraitFallback: null,
  placeholder: 'data:image/svg+xml,tile',
});

const story = {
  paragraphs: [
    {
      id: 'opener',
      text: 'Your year started on 13 Jul with Mark of the Deep.',
      covers: [cover('Mark of the Deep', '1234567')],
    },
    { id: 'dominance', text: 'Project Zomboid took 90% of your year.', covers: [cover('Project Zomboid', '108600')] },
    { id: 'peak-month', text: 'Sep was your busiest month — 137h.', covers: [] },
    { id: 'verdict', text: 'Verdict: Doomsday Prepper.', covers: [] },
    { id: 'extra', text: 'A fifth chapter that stays off the card.', covers: [cover('Hidden', '1')] },
  ],
};

test('story share card renders cover tiles beside their paragraphs', () => {
  render(<YearInReviewStoryShareCard story={story} stretches={[]} year={2026} username="Moz" />);

  expect(screen.getByTitle('Mark of the Deep')).toBeInTheDocument();
  expect(screen.getByTitle('Project Zomboid')).toBeInTheDocument();
  // Paragraphs without covers render as plain text rows.
  expect(screen.getByText('Sep was your busiest month — 137h.')).toBeInTheDocument();
  // Only the first four paragraphs make the card.
  expect(screen.queryByText(/fifth chapter/)).not.toBeInTheDocument();
  expect(screen.queryByTitle('Hidden')).not.toBeInTheDocument();
});
