import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import YearWrappedModal, { buildWrappedSlides } from './YearWrappedModal';

const fullSnapshot = {
  hasData: true,
  summary: { playtimeHours: 312, uniqueGames: 24, sessions: 410 },
  habits: { daysActive: 132, avgSessionMinutes: 46, sessionsCount: 410 },
  topGames: [
    {
      id: 'a',
      name: 'Hades',
      platform: 'Steam',
      coverUrl: 'https://img/hades.jpg',
      totalPlaytime: 4320,
      sessions: 60,
      avgSessionMinutes: 72,
    },
    { id: 'b', name: 'Zomboid', platform: 'Steam', totalPlaytime: 3000, sessions: 40 },
  ],
  distributions: {
    topGenres: [{ label: 'Action', count: 40 }],
    topMoods: [{ label: 'Focused', count: 60 }],
  },
  deepStats: {
    longestSession: {
      gameName: 'Baldur’s Gate 3',
      playtimeMinutes: 301,
      timestamp: new Date(2025, 10, 12),
      coverUrl: 'https://img/bg3.jpg',
    },
  },
  milestones: {
    records: {
      longestStreakDays: { days: 9, startDate: '2025-03-01', endDate: '2025-03-09' },
      biggestMonth: { label: 'November', minutes: 4200 },
      mostSessionsDay: { date: '2025-11-12', count: 6 },
    },
    achievements: {
      unlockedThisYear: 87,
      gamesWithUnlocks: 14,
      rarest: { name: 'Champion of Elysium', gameName: 'Hades', percent: '0.8' },
    },
    finished: [
      { name: 'Hades', status: 'beaten', coverUrl: 'https://img/hades.jpg' },
      { name: 'Elden Ring', status: '100%' },
    ],
    comebacks: [{ name: 'Zomboid', gapDays: 120, returnedAt: new Date(2025, 5, 3).getTime() }],
    firsts: [{ name: 'Silksong', coverUrl: 'https://img/sk.jpg' }],
    firstsCount: 11,
    hasAny: true,
  },
  persona: {
    identityLabel: 'The Ashen Masochist',
    identityDescription: 'You pick games that fight back and you keep coming back.',
    dominantMood: 'Focused',
    dominantGenre: 'Action',
    preferredSessionLabel: 'Marathon Sessions',
    peakPlayWindow: 'Late Night',
    avgSessionMinutes: 46,
    identityId: 'ashen_masochist',
    identityThemeId: 'ashen_masochist',
    roast: 'You call it "one more run." It never is.',
  },
};

const sparseSnapshot = {
  hasData: true,
  summary: { playtimeHours: 2, uniqueGames: 1, sessions: 3 },
  topGames: [{ id: 'a', name: 'Tetris', totalPlaytime: 120, sessions: 3 }],
  distributions: { topGenres: [], topMoods: [] },
  deepStats: {},
  habits: {},
  milestones: { records: {}, finished: [], comebacks: [], firsts: [], achievements: null },
  persona: { identityLabel: 'Adaptive Pilot' },
};

describe('buildWrappedSlides', () => {
  test('returns empty deck when the snapshot has no data', () => {
    expect(buildWrappedSlides(null, 2025)).toEqual([]);
    expect(buildWrappedSlides({ hasData: false }, 2025)).toEqual([]);
  });

  test('builds the full deck in presentation order when data is rich', () => {
    const ids = buildWrappedSlides(fullSnapshot, 2025).map((s) => s.id);
    expect(ids).toEqual([
      'intro',
      'totals',
      'topGame',
      'flavor',
      'longestSession',
      'records',
      'achievements',
      'finished',
      'comeback',
      'firsts',
      'persona',
      'outro',
    ]);
  });

  test('skips slides that have nothing to show and always ends with persona + outro', () => {
    const ids = buildWrappedSlides(sparseSnapshot, 2025).map((s) => s.id);
    expect(ids).toEqual(['intro', 'totals', 'topGame', 'persona', 'outro']);
    expect(ids).not.toContain('records');
    expect(ids).not.toContain('finished');
  });
});

describe('YearWrappedModal', () => {
  test('opens on the intro slide and renders nothing without data', () => {
    const { container } = render(<YearWrappedModal snapshot={{ hasData: false }} year={2025} onClose={jest.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  test('walks the deck with Next/Previous and exposes slide progress', () => {
    render(<YearWrappedModal snapshot={fullSnapshot} year={2025} username="Nyx" onClose={jest.fn()} />);

    expect(screen.getByRole('dialog', { name: '2025 year in review' })).toBeInTheDocument();
    expect(screen.getByText(/Your\s+2025/)).toBeInTheDocument();
    expect(screen.getByText(/Nyx, here's what you actually got up to/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('312h')).toBeInTheDocument();
    expect(screen.getByText(/across 24 games in 410 sessions/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Hades')).toBeInTheDocument();
    expect(screen.getByText(/72h/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(screen.getByText('312h')).toBeInTheDocument();

    // Dots mirror the deck length.
    expect(screen.getAllByRole('button', { name: /Slide \d+/ })).toHaveLength(12);
  });

  test('shows the persona verdict with its evidence and roast near the end', () => {
    render(<YearWrappedModal snapshot={fullSnapshot} year={2025} onClose={jest.fn()} />);
    const dots = screen.getAllByRole('button', { name: /Slide \d+/ });
    fireEvent.click(dots[dots.length - 2]); // persona slide

    expect(screen.getAllByText('The Ashen Masochist').length).toBeGreaterThan(0);
    expect(screen.getByText('Why this verdict')).toBeInTheDocument();
    expect(screen.getByText(/Focused was your strongest mood signal/)).toBeInTheDocument();
    expect(screen.getByText(/Action shaped your genre profile/)).toBeInTheDocument();
    expect(screen.getByText(/most active window: late night/i)).toBeInTheDocument();
    expect(screen.getAllByText(/You call it "one more run/).length).toBeGreaterThan(0);
  });

  test('next on the final slide closes the deck, as do Escape and the close button', () => {
    const onClose = jest.fn();
    render(<YearWrappedModal snapshot={sparseSnapshot} year={2025} onClose={onClose} />);
    const dots = screen.getAllByRole('button', { name: /Slide \d+/ });
    fireEvent.click(dots[dots.length - 1]); // outro
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole('button', { name: 'Close year in review' }));
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  test('arrow keys navigate the deck', () => {
    render(<YearWrappedModal snapshot={sparseSnapshot} year={2025} onClose={jest.fn()} />);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText('2h')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByText(/Your\s+2025/)).toBeInTheDocument();
  });
});
