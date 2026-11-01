import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import DiscoverQuickPicks from './DiscoverQuickPicks';
import { RecommendationEngine } from '../services/RecommendationEngine';
import { RecommendationExplainer } from '../services/RecommendationExplainer';
import SteamPublicService from '../services/SteamPublicService';
import OwnedBacklogService from '../services/OwnedBacklogService';
import PendingInstallService from '../services/PendingInstallService';
import RecommendationPreferenceService from '../services/RecommendationPreferenceService';

jest.mock('./LazyImage', () => ({ alt }) => <img alt={alt} />);
jest.mock('./OwnedGameModal', () => ({ game }) => <div data-testid="owned-modal">{game.name}</div>);
jest.mock('../services/OwnedBacklogService', () => ({
  __esModule: true,
  default: {
    keyFor: jest.fn((game) => {
      const id = game?.appid || game?.appName || game?.gogProductId || game?.itchId;
      return ['steam', 'epic', 'gog', 'itch'].includes(game?.source) && id ? `${game.source}:${id}` : null;
    }),
    getPool: jest.fn(async () => []),
    dismiss: jest.fn(),
  },
}));
jest.mock('../services/PendingInstallService', () => ({
  __esModule: true,
  default: { installOwnedGame: jest.fn(async () => true) },
}));

const DAY = 24 * 60 * 60 * 1000;
const EMPTY_FOCUS = { active: false, games: [], primary: null, genres: [] };

const entryFor = (game, extras = {}) => ({
  game,
  explanation: { previewReasons: [] },
  ...extras,
});

const makeLibrary = () => {
  const now = Date.now();
  return [
    // continue: played inside the 14-day window
    {
      name: 'Valheim',
      appid: 1,
      platform: 'Steam',
      time_played: 3000,
      last_played: now - 2 * DAY,
      genres: ['Survival'],
      userRating: 8,
    },
    // continue: played recently but with no proven signal — never a comfort pick
    { name: 'Peak', appid: 6, platform: 'Steam', time_played: 45, last_played: now - 3 * DAY, genres: ['Action'] },
    // comfort via rating (played, outside the recent window)
    {
      name: 'Hades',
      appid: 2,
      platform: 'Steam',
      time_played: 600,
      last_played: now - 40 * DAY,
      genres: ['Action'],
      userRating: 9,
    },
    // comfort via logged hours (played, outside the recent window)
    {
      name: 'Terraria',
      appid: 3,
      platform: 'Steam',
      time_played: 720,
      last_played: now - 90 * DAY,
      genres: ['Sandbox'],
    },
    // played but neither recent nor proven — only ever a wildcard
    {
      name: 'Zomboid',
      appid: 4,
      platform: 'Steam',
      time_played: 30,
      last_played: now - 60 * DAY,
      genres: ['Survival'],
    },
    // unplayed
    { name: 'Fez', appid: 5, platform: 'Steam', time_played: 0, last_played: null, genres: ['Puzzle'] },
  ];
};

const lastCall = () => RecommendationEngine.getPerfectPlayResult.mock.calls.at(-1);

beforeEach(() => {
  localStorage.clear();
  jest
    .spyOn(RecommendationEngine, 'getPerfectPlayResult')
    .mockImplementation((candidates, mood, genre, time, count) => ({
      entries: (candidates || []).slice(0, count).map((game) => entryFor(game)),
    }));
  jest.spyOn(RecommendationEngine, 'getCurrentPlayFocus').mockReturnValue(EMPTY_FOCUS);
  jest.spyOn(RecommendationExplainer, 'getSignatureGameReasoning').mockReturnValue(null);
});

afterEach(() => {
  delete window.electronAPI;
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('the mix builds one pick per job, each with its own factual reason', () => {
  const library = makeLibrary();
  render(<DiscoverQuickPicks library={library} />);
  expect(screen.getByRole('heading', { name: "Can't decide?" })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Play Valheim' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Play Hades' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Play Fez' })).toBeInTheDocument();
  expect(screen.getByText('Last played 2 days ago — easy to slip back into.')).toBeInTheDocument();
  expect(screen.getByText('You rated it 9/10.')).toBeInTheDocument();
  expect(screen.getByText('Unplayed in your library — a fresh pick.')).toBeInTheDocument();
  // One engine call per non-empty pool — continue, then comfort, then new.
  expect(RecommendationEngine.getPerfectPlayResult.mock.calls).toEqual([
    [[library[0], library[1]], null, null, null, 1],
    [[library[2], library[3]], null, null, null, 1],
    [[library[5]], null, null, null, 1],
  ]);
});

test('a selected intent toggles aria-pressed, persists, and toggles back to the mix', () => {
  render(<DiscoverQuickPicks library={makeLibrary()} />);
  const chip = screen.getByRole('button', { name: 'Something new' });
  fireEvent.click(chip);
  expect(chip).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'For you' })).toHaveAttribute('aria-pressed', 'false');
  expect(JSON.parse(localStorage.getItem('gamepilot-discoverQuickPicksV1'))).toEqual({ intent: 'new' });
  fireEvent.click(chip);
  expect(chip).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByRole('button', { name: 'For you' })).toHaveAttribute('aria-pressed', 'true');
  expect(JSON.parse(localStorage.getItem('gamepilot-discoverQuickPicksV1'))).toEqual({ intent: '' });
});

test('a saved mood/time selection from the old card is silently ignored', () => {
  localStorage.setItem('gamepilot-discoverQuickPicksV1', JSON.stringify({ mood: 'Relaxed', time: 'quick' }));
  render(<DiscoverQuickPicks library={makeLibrary()} />);
  expect(screen.getByRole('button', { name: 'For you' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.queryByRole('button', { name: 'Relaxed' })).not.toBeInTheDocument();
});

test('"Pick up a run" only offers recent or current-rotation games', () => {
  const library = makeLibrary();
  RecommendationEngine.getCurrentPlayFocus.mockReturnValue({
    active: true,
    games: [
      { name: 'Valheim', gameId: 1, distinctDays: 2, sessions: 5, lastPlayed: Date.now() - DAY, genres: ['Survival'] },
      {
        name: 'Zomboid',
        gameId: 4,
        distinctDays: 4,
        sessions: 2,
        lastPlayed: Date.now() - 3 * DAY,
        genres: ['Survival'],
      },
    ],
    primary: null,
    genres: ['Survival'],
  });
  render(<DiscoverQuickPicks library={library} />);
  fireEvent.click(screen.getByRole('button', { name: 'Pick up a run' }));
  // Valheim + Peak are recent; Zomboid qualifies through the rotation only.
  expect(lastCall()).toEqual([[library[0], library[1], library[4]], null, null, null, 3]);
  expect(screen.getByText('Part of your current rotation — 5 sessions recently.')).toBeInTheDocument();
  expect(screen.getByText('Last played 3 days ago — easy to slip back into.')).toBeInTheDocument();
  expect(screen.getByText('Part of your current rotation — 4 days this fortnight.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Play Hades' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Play Fez' })).not.toBeInTheDocument();
});

test('"Comfort pick" excludes unplayed games and recent games without a proven signal', () => {
  const library = makeLibrary();
  render(<DiscoverQuickPicks library={library} />);
  fireEvent.click(screen.getByRole('button', { name: 'Comfort pick' }));
  // Hades (rated 9) and Terraria (12h logged) qualify; Valheim and Peak are in
  // the continue pool, Zomboid has no proven signal, Fez is unplayed.
  expect(lastCall()).toEqual([[library[2], library[3]], null, null, null, 3]);
  expect(screen.getByText('You rated it 9/10.')).toBeInTheDocument();
  expect(screen.getByText('12h logged — one of your proven games.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Play Zomboid' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Play Fez' })).not.toBeInTheDocument();
});

test('"Something new" only offers unplayed candidates', () => {
  const library = makeLibrary();
  render(<DiscoverQuickPicks library={library} />);
  fireEvent.click(screen.getByRole('button', { name: 'Something new' }));
  expect(lastCall()).toEqual([[library[5]], null, null, null, 3]);
  expect(screen.getByRole('button', { name: 'Play Fez' })).toBeInTheDocument();
  expect(screen.getByText('Unplayed in your library — a fresh pick.')).toBeInTheDocument();
});

test('an unplayed pick reuses the signature-game link when one exists', () => {
  RecommendationExplainer.getSignatureGameReasoning.mockImplementation((game) =>
    game?.name === 'Fez' ? 'Shares Puzzle with Hades, one of your most-played games.' : null
  );
  render(<DiscoverQuickPicks library={makeLibrary()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Something new' }));
  expect(screen.getByText('Unplayed — shares Puzzle with Hades, one of your most-played games.')).toBeInTheDocument();
});

test('"Surprise me" draws from the whole eligible library', () => {
  const library = makeLibrary();
  render(<DiscoverQuickPicks library={library} />);
  RecommendationEngine.getPerfectPlayResult.mockReturnValue({
    entries: [entryFor(library[5]), entryFor(library[0])],
  });
  fireEvent.click(screen.getByRole('button', { name: 'Surprise me' }));
  expect(lastCall()).toEqual([library, null, null, null, 3]);
  expect(screen.getByText('Unplayed — a total wildcard.')).toBeInTheDocument();
  expect(screen.getByText('A wildcard from your library.')).toBeInTheDocument();
});

test('positive feedback renders as a human line, never the raw internal string', () => {
  const library = makeLibrary();
  RecommendationEngine.getPerfectPlayResult.mockReturnValue({
    entries: [entryFor(library[0], { feedbackReason: 'Raised by your earlier feedback' })],
  });
  render(<DiscoverQuickPicks library={library} />);
  expect(screen.getByText('This hit the mark for you before.')).toBeInTheDocument();
  expect(screen.queryByText(/Raised by your earlier feedback/)).not.toBeInTheDocument();
});

test('skipping swaps only that card, fills the same lane, and writes no taste feedback', () => {
  const library = makeLibrary();
  render(<DiscoverQuickPicks library={library} />);
  const saved = { ...localStorage };
  fireEvent.click(screen.getByRole('button', { name: 'Not this one: Hades' }));
  expect(screen.getAllByRole('button', { name: /^Play / }).map((button) => button.getAttribute('aria-label'))).toEqual([
    'Play Valheim',
    'Play Terraria',
    'Play Fez',
  ]);
  expect(screen.getByRole('button', { name: 'Not this one: Terraria' })).toHaveFocus();
  // The replacement kept the comfort job, not a random filler.
  expect(lastCall()).toEqual([[library[3]], null, null, null, 1]);
  expect(screen.getByText('12h logged — one of your proven games.')).toBeInTheDocument();
  expect(screen.getByText(/1 skipped for this visit/)).toBeInTheDocument();
  expect({ ...localStorage }).toEqual(saved);
});

test('skips last for this visit, then reset brings the picks back', () => {
  const library = makeLibrary();
  const { unmount } = render(<DiscoverQuickPicks library={library} />);
  for (let i = 0; i < 5; i += 1) {
    fireEvent.click(screen.getAllByRole('button', { name: /^Not this one: / })[0]);
  }
  expect(screen.getByText(/No picks to show — reset skipped picks or try another lane/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Reset skipped picks' })).toHaveFocus();
  expect(screen.queryByText(/Scan your library/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reset skipped picks' }));
  expect(screen.getAllByRole('button', { name: /^Play / })).toHaveLength(3);
  unmount();
  render(<DiscoverQuickPicks library={library} />);
  expect(screen.getByRole('button', { name: 'Play Valheim' })).toBeInTheDocument();
});

test('running games are excluded before scoring so they never consume a pick', () => {
  const library = makeLibrary();
  render(<DiscoverQuickPicks library={library} activeSessions={{ Valheim: {} }} />);
  expect(screen.getAllByRole('button', { name: /^Play / })).toHaveLength(3);
  expect(screen.queryByRole('button', { name: 'Play Valheim' })).not.toBeInTheDocument();
  RecommendationEngine.getPerfectPlayResult.mock.calls.forEach(([candidates]) => {
    expect(candidates.map((game) => game.name)).not.toContain('Valheim');
  });
});

test('launch buttons hand the game object through', () => {
  const launch = jest.fn();
  render(<DiscoverQuickPicks library={makeLibrary()} onLaunchGame={launch} />);
  fireEvent.click(screen.getByRole('button', { name: 'Play Hades' }));
  expect(launch).toHaveBeenCalledWith(expect.objectContaining({ name: 'Hades' }));
});

test('empty libraries keep the scan prompt; an exhausted lane gets an honest empty state', () => {
  RecommendationEngine.getPerfectPlayResult.mockReturnValue({ entries: [] });
  const { rerender } = render(<DiscoverQuickPicks library={makeLibrary()} />);
  expect(screen.getByText(/No picks to show — reset skipped picks or try another lane/)).toBeInTheDocument();
  rerender(<DiscoverQuickPicks library={[]} />);
  expect(screen.getByText(/Scan your library/)).toBeInTheDocument();
});

test('shows current Steam player counts on picks, timestamped and never labelled live', async () => {
  window.electronAPI = {
    steamPlayerCount: jest.fn(async (appid) => ({
      ok: appid !== '4',
      count: appid === '1' ? 42137 : 800,
      fetchedAt: 1790500000000,
    })),
  };
  render(<DiscoverQuickPicks library={makeLibrary()} />);
  expect(await screen.findByText('42k playing')).toBeInTheDocument();
  expect(screen.getByText('42k playing')).toHaveAttribute('title', expect.stringContaining('as of'));
  expect(screen.getAllByText(/800 playing/).length).toBeGreaterThan(0);
  expect(screen.queryByText(/live/i)).not.toBeInTheDocument();
});

test('skips player counts entirely when Steam public data is disabled', async () => {
  SteamPublicService.setEnabled(false);
  const api = jest.fn();
  window.electronAPI = { steamPlayerCount: api };
  render(<DiscoverQuickPicks library={makeLibrary()} />);
  expect(await screen.findByRole('button', { name: 'Play Valheim' })).toBeInTheDocument();
  expect(api).not.toHaveBeenCalled();
  expect(screen.queryByText(/playing/)).not.toBeInTheDocument();
});

const ownedGame = (name, source, extra = {}) => ({
  name,
  source,
  platform: source === 'steam' ? 'Steam' : 'Epic',
  installed: false,
  playtimeForever: 0,
  icon: null,
  ...extra,
});

describe('seasonal lane', () => {
  test('October shows a Halloween lane that only pools horror/survival metadata', () => {
    jest.useFakeTimers({ now: Date.parse('2026-10-15T12:00:00Z') });
    const library = makeLibrary();
    render(<DiscoverQuickPicks library={library} />);
    fireEvent.click(screen.getByRole('button', { name: 'Halloween' }));
    // Only Survival-genre Valheim and Zomboid match — Action/Sandbox/Puzzle stay out.
    expect(lastCall()).toEqual([[library[0], library[4]], null, null, null, 3]);
    expect(screen.getByRole('button', { name: 'Play Valheim' })).toBeInTheDocument();
    expect(screen.getAllByText('Horror / survival pick for Halloween.').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Play Hades' })).not.toBeInTheDocument();
  });

  test('empty seasonal pool shows its own empty state, not another lane', () => {
    jest.useFakeTimers({ now: Date.parse('2026-10-15T12:00:00Z') });
    RecommendationEngine.getPerfectPlayResult.mockReturnValue({ entries: [] });
    render(<DiscoverQuickPicks library={makeLibrary()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Halloween' }));
    expect(screen.getByText(/No matching games found in your library metadata/)).toBeInTheDocument();
  });

  test('December lane matches cozy/party but not party-based RPG', () => {
    jest.useFakeTimers({ now: Date.parse('2026-12-15T12:00:00Z') });
    const library = [
      { name: 'Stardew', appid: 9, platform: 'Steam', time_played: 500, genres: ['Cozy'] },
      { name: 'Jackbox', appid: 10, platform: 'Steam', time_played: 100, genres: ['Party game'] },
      { name: 'Tactics', appid: 11, platform: 'Steam', time_played: 900, genres: ['Party-Based RPG'] },
      { name: 'Shooter', appid: 12, platform: 'Steam', time_played: 900, genres: ['Action'] },
    ];
    render(<DiscoverQuickPicks library={library} />);
    fireEvent.click(screen.getByRole('button', { name: 'Christmas' }));
    expect(lastCall()).toEqual([[library[0], library[1]], null, null, null, 3]);
    expect(screen.getAllByText('Cozy / party pick for Christmas.').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Play Tactics' })).not.toBeInTheDocument();
  });

  test('outside the season there is no seasonal pill and a saved seasonal lane falls back', () => {
    jest.useFakeTimers({ now: Date.parse('2026-11-15T12:00:00Z') });
    localStorage.setItem('gamepilot-discoverQuickPicksV1', JSON.stringify({ intent: 'seasonal' }));
    render(<DiscoverQuickPicks library={makeLibrary()} />);
    expect(screen.queryByRole('button', { name: 'Halloween' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Christmas' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'For you' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Play Valheim' })).toBeInTheDocument();
  });
});

describe('not installed lane', () => {
  const pool = [
    ownedGame('Unmeasured Skies', 'steam', { appid: 55 }),
    ownedGame('Vault Digger', 'epic', { appName: 'vd' }),
  ];

  test('does not fetch the owned pool until the lane is selected', async () => {
    OwnedBacklogService.getPool.mockResolvedValue(pool);
    const launch = jest.fn();
    render(<DiscoverQuickPicks library={makeLibrary()} onLaunchGame={launch} />);
    expect(OwnedBacklogService.getPool).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Not installed' }));
    expect(OwnedBacklogService.getPool).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Unmeasured Skies')).toBeInTheDocument();
    expect(screen.getByText(/Owned on Steam — not installed\./)).toBeInTheDocument();
    expect(launch).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /^Play / })).not.toBeInTheDocument();
  });

  test('details opens the owned modal and install uses the install service', async () => {
    OwnedBacklogService.getPool.mockResolvedValue(pool);
    render(<DiscoverQuickPicks library={makeLibrary()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Not installed' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Unmeasured Skies details' }));
    expect(screen.getByTestId('owned-modal')).toHaveTextContent('Unmeasured Skies');

    fireEvent.click(screen.getByRole('button', { name: 'Install Vault Digger' }));
    await screen.findByText('Vault Digger');
    expect(PendingInstallService.installOwnedGame).toHaveBeenCalledWith(pool[1]);
  });

  test('a failed install shows a single alert and never launches', async () => {
    PendingInstallService.installOwnedGame.mockResolvedValue(false);
    OwnedBacklogService.getPool.mockResolvedValue(pool);
    const launch = jest.fn();
    render(<DiscoverQuickPicks library={makeLibrary()} onLaunchGame={launch} />);
    fireEvent.click(screen.getByRole('button', { name: 'Not installed' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Install Vault Digger' }));
    const alerts = await screen.findAllByRole('alert');
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toHaveTextContent(/Couldn't open the installer for Vault Digger/);
    expect(launch).not.toHaveBeenCalled();
    // Switching lanes clears the error.
    fireEvent.click(screen.getByRole('button', { name: 'For you' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('loading and a rejected pool get their own messages', async () => {
    let resolvePool;
    OwnedBacklogService.getPool.mockImplementation(() => new Promise((resolve) => (resolvePool = resolve)));
    render(<DiscoverQuickPicks library={makeLibrary()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Not installed' }));
    expect(screen.getByText(/Loading your owned games/)).toBeInTheDocument();
    await screen.findByRole('button', { name: 'Not installed' });
    OwnedBacklogService.getPool.mockRejectedValue(new Error('offline'));
    fireEvent.click(screen.getByRole('button', { name: 'For you' }));
    fireEvent.click(screen.getByRole('button', { name: 'Not installed' }));
    expect(await screen.findByText(/Could not load your owned games/)).toBeInTheDocument();
    resolvePool([]);
  });

  test('a late pool response cannot overwrite a lane switched meanwhile', async () => {
    let resolvePool;
    OwnedBacklogService.getPool.mockImplementation(() => new Promise((resolve) => (resolvePool = resolve)));
    render(<DiscoverQuickPicks library={makeLibrary()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Not installed' }));
    fireEvent.click(screen.getByRole('button', { name: 'Something new' }));
    await act(async () => resolvePool(pool));
    expect(screen.getByRole('button', { name: 'Play Fez' })).toBeInTheDocument();
    expect(screen.queryByText('Unmeasured Skies')).not.toBeInTheDocument();
  });

  test('skipping an owned card is visit-scoped and never hits the backlog dismissal list', async () => {
    OwnedBacklogService.getPool.mockResolvedValue(pool);
    render(<DiscoverQuickPicks library={makeLibrary()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Not installed' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Not this one: Unmeasured Skies' }));
    expect(screen.getByText(/1 skipped for this visit/)).toBeInTheDocument();
    expect(OwnedBacklogService.dismiss).not.toHaveBeenCalled();
  });
});

describe('set-aside preferences', () => {
  test('choosing a reason removes the card immediately and reset skips does not unpause', () => {
    render(<DiscoverQuickPicks library={makeLibrary()} />);
    fireEvent.change(screen.getByLabelText('Recommendation preference for Valheim'), {
      target: { value: 'technical' },
    });
    expect(screen.queryByRole('button', { name: 'Play Valheim' })).not.toBeInTheDocument();
    expect(screen.getByText(/Games you set aside remain in your library/)).toBeInTheDocument();
    // Skipping + resetting only affects this visit — the set-aside persists.
    fireEvent.click(screen.getByRole('button', { name: 'Not this one: Hades' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset skipped picks' }));
    expect(screen.queryByRole('button', { name: 'Play Valheim' })).not.toBeInTheDocument();
  });

  test('selecting Recommend normally brings the card back', () => {
    render(<DiscoverQuickPicks library={makeLibrary()} />);
    fireEvent.change(screen.getByLabelText('Recommendation preference for Hades'), {
      target: { value: 'refresher' },
    });
    expect(screen.queryByRole('button', { name: 'Play Hades' })).not.toBeInTheDocument();
    // The game left the candidate pool, so recovery happens from its details —
    // a live check that the service cleared the preference.
    expect(RecommendationPreferenceService.isSetAside('Hades')).toBe(true);
    RecommendationPreferenceService.setPreference('Hades', '');
    expect(RecommendationPreferenceService.isSetAside('Hades')).toBe(false);
  });
});
