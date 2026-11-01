import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import YouTubeVideosPanel from './YouTubeVideosPanel';
import YouTubeSettings from './YouTubeSettings';
import { openExternalUrl } from '../services/ElectronBridge';

jest.mock('../services/ElectronBridge', () => ({
  ...jest.requireActual('../services/ElectronBridge'),
  openExternalUrl: jest.fn(),
}));

const game = { name: 'Terraria', platform: 'Steam' };
const videos = [
  {
    id: 'abcdefghij1',
    title: 'Terraria &amp; Friends',
    channelTitle: 'Channel A',
    thumbnailUrl: 'https://i.ytimg.com/vi/abcdefghij1/mqdefault.jpg',
  },
  {
    id: 'klmnopqrs2',
    title: 'Second video',
    channelTitle: 'Channel B',
    thumbnailUrl: 'https://i.ytimg.com/vi/klmnopqrs2/mqdefault.jpg',
  },
];

const deferred = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};

beforeEach(() => {
  jest.clearAllMocks();
  window.electronAPI = { youtubeSearch: jest.fn() };
});

afterEach(() => {
  delete window.electronAPI;
});

test('mounts with no selected category and performs no search', () => {
  render(<YouTubeVideosPanel game={game} />);
  expect(screen.getByText('Watch before you play')).toBeInTheDocument();
  for (const label of ['Gameplay', 'Reviews', 'Guides']) {
    expect(screen.getByRole('button', { name: label })).toHaveAttribute('aria-pressed', 'false');
  }
  expect(window.electronAPI.youtubeSearch).not.toHaveBeenCalled();
});

test('clicking a category searches and renders video cards', async () => {
  window.electronAPI.youtubeSearch.mockResolvedValue({ ok: true, videos });
  render(<YouTubeVideosPanel game={game} />);

  fireEvent.click(screen.getByRole('button', { name: 'Gameplay' }));
  expect(window.electronAPI.youtubeSearch).toHaveBeenCalledWith({ title: 'Terraria', category: 'gameplay' });
  expect(screen.getByRole('status')).toBeInTheDocument();

  expect(await screen.findByText('Terraria & Friends')).toBeInTheDocument();
  expect(screen.getByText('Channel A')).toBeInTheDocument();
  expect(screen.getByText(/may include other editions/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Gameplay' })).toHaveAttribute('aria-pressed', 'true');
});

test('video cards open the canonical watch URL in the browser', async () => {
  window.electronAPI.youtubeSearch.mockResolvedValue({ ok: true, videos });
  render(<YouTubeVideosPanel game={game} />);
  fireEvent.click(screen.getByRole('button', { name: 'Reviews' }));
  await screen.findByText('Second video');

  fireEvent.click(screen.getByRole('button', { name: /Terraria & Friends/ }));
  expect(openExternalUrl).toHaveBeenCalledWith('https://www.youtube.com/watch?v=abcdefghij1');
});

test('the on-YouTube fallback is always available and carries the query', () => {
  render(<YouTubeVideosPanel game={game} />);
  fireEvent.click(screen.getByRole('button', { name: /search on youtube/i }));
  const url = openExternalUrl.mock.calls[0][0];
  expect(url).toContain('https://www.youtube.com/results?search_query=');
  expect(decodeURIComponent(url)).toContain('Terraria gameplay');
});

test('missing key explains where to add it, with a settings link when routed', async () => {
  window.electronAPI.youtubeSearch.mockResolvedValue({ ok: false, error: 'missing-key' });
  render(
    <MemoryRouter>
      <YouTubeVideosPanel game={game} />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Guides' }));
  const link = await screen.findByRole('link', { name: /settings → connections/i });
  expect(link).toHaveAttribute('href', '/settings');
});

test.each([
  ['quota-exceeded', /request limit has been reached/i],
  ['invalid-key', /api key was rejected/i],
  ['access-denied', /denied this key/i],
  ['unavailable', /unavailable right now/i],
])('surfaces %s as readable text', async (code, pattern) => {
  window.electronAPI.youtubeSearch.mockResolvedValue({ ok: false, error: code });
  render(<YouTubeVideosPanel game={game} />);
  fireEvent.click(screen.getByRole('button', { name: 'Gameplay' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(pattern);
});

test('empty result shows an empty state and no cards', async () => {
  window.electronAPI.youtubeSearch.mockResolvedValue({ ok: true, videos: [] });
  render(<YouTubeVideosPanel game={game} />);
  fireEvent.click(screen.getByRole('button', { name: 'Gameplay' }));
  expect(await screen.findByText(/no videos found/i)).toBeInTheDocument();
  expect(screen.queryByText(/may include other editions/)).not.toBeInTheDocument();
});

test('a rejected bridge promise shows an alert and clears the spinner', async () => {
  window.electronAPI.youtubeSearch.mockRejectedValue(new Error('ipc exploded'));
  render(<YouTubeVideosPanel game={game} />);
  fireEvent.click(screen.getByRole('button', { name: 'Gameplay' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/unavailable right now/i);
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('absent bridge reports a desktop-only message', async () => {
  delete window.electronAPI;
  render(<YouTubeVideosPanel game={game} />);
  fireEvent.click(screen.getByRole('button', { name: 'Gameplay' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/desktop app/i);
});

test('a late response cannot overwrite a newer game or category', async () => {
  const first = deferred();
  const second = deferred();
  window.electronAPI.youtubeSearch
    .mockImplementationOnce(() => first.promise)
    .mockImplementationOnce(() => second.promise);

  const { rerender } = render(<YouTubeVideosPanel game={game} />);
  fireEvent.click(screen.getByRole('button', { name: 'Gameplay' }));

  // Switching games mid-flight resets the panel and discards the old request.
  rerender(<YouTubeVideosPanel game={{ name: 'Hades', platform: 'Steam' }} />);
  fireEvent.click(screen.getByRole('button', { name: 'Reviews' }));

  await act(async () => second.resolve({ ok: true, videos }));
  expect(await screen.findByText('Terraria & Friends')).toBeInTheDocument();

  // The stale gameplay response for Terraria arrives too late to matter.
  await act(async () => first.resolve({ ok: true, videos: [{ ...videos[0], title: 'Stale Result' }] }));
  expect(screen.queryByText('Stale Result')).not.toBeInTheDocument();
  expect(screen.getByText('Terraria & Friends')).toBeInTheDocument();
});

describe('YouTubeSettings', () => {
  beforeEach(() => {
    window.electronAPI = {
      youtubeStatus: jest.fn().mockResolvedValue({ ok: true, configured: false }),
      youtubeSetKey: jest.fn().mockResolvedValue({ ok: true }),
      youtubeClearKey: jest.fn().mockResolvedValue({ ok: true }),
    };
  });

  test('checks key status on mount and shows unconfigured', async () => {
    render(<YouTubeSettings />);
    await waitFor(() => expect(window.electronAPI.youtubeStatus).toHaveBeenCalled());
    expect(screen.queryByText('Key saved on this PC.')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/YouTube Videos/)).toHaveAttribute('type', 'password');
  });

  test('saving a valid draft calls set-key, clears the draft and reports saved', async () => {
    render(<YouTubeSettings />);
    await waitFor(() => expect(window.electronAPI.youtubeStatus).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText(/YouTube Videos/), { target: { value: '  AIza_test_key_1234567890  ' } });
    fireEvent.click(screen.getByRole('button', { name: /save key/i }));

    await waitFor(() => expect(window.electronAPI.youtubeSetKey).toHaveBeenCalledWith('AIza_test_key_1234567890'));
    expect(await screen.findByText('Key saved on this PC.')).toBeInTheDocument();
    expect(screen.getByLabelText(/YouTube Videos/)).toHaveValue('');
  });

  test('save failure surfaces an error and keeps the draft', async () => {
    window.electronAPI.youtubeSetKey.mockResolvedValue({ ok: false, error: 'invalid-key' });
    render(<YouTubeSettings />);
    await waitFor(() => expect(window.electronAPI.youtubeStatus).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText(/YouTube Videos/), { target: { value: 'whatever' } });
    fireEvent.click(screen.getByRole('button', { name: /save key/i }));
    expect(await screen.findByText(/does not look like a YouTube API key/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/YouTube Videos/)).toHaveValue('whatever');
  });

  test('remove clears the configured state', async () => {
    window.electronAPI.youtubeStatus.mockResolvedValue({ ok: true, configured: true });
    render(<YouTubeSettings />);
    expect(await screen.findByText('Key saved on this PC.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /remove key/i }));
    await waitFor(() => expect(window.electronAPI.youtubeClearKey).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText('Key saved on this PC.')).not.toBeInTheDocument());
  });
});
