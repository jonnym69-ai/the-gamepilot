import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import DiscoverHighlights from './DiscoverHighlights';
import { FreeGameRadar } from '../services/FreeGameRadar';
import { openExternalUrl } from '../services/ElectronBridge';
import StorageService from '../services/StorageService';

jest.mock('./LazyImage', () => ({ alt }) => <img alt={alt} />);
jest.mock('../services/ElectronBridge', () => ({ openExternalUrl: jest.fn().mockResolvedValue(true) }));
const NOW = new Date('2026-09-27T12:00:00Z').getTime();
const offer = {
  id: 'epic-test',
  title: 'Free Adventure',
  description: 'Explore a new world.',
  url: 'https://store.epicgames.com/p/free-adventure',
  startDate: '2026-09-24',
  endDate: '2026-10-01',
};
const library = [
  { name: 'One', platform: 'Local' },
  { name: 'Two', platform: 'Local' },
  { name: 'Three', platform: 'Local' },
];

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(NOW);
  localStorage.clear();
  jest.spyOn(FreeGameRadar, 'getEpicRadar').mockResolvedValue({
    games: [
      offer,
      { ...offer, id: 'upcoming', title: 'Next Adventure', startDate: '2026-10-01', endDate: '2026-10-08' },
    ],
    checkedAt: NOW,
    stale: false,
  });
  jest.spyOn(FreeGameRadar, 'getGiveaways').mockResolvedValue({
    games: [
      {
        id: 'gp-1',
        title: 'Cool Giveaway',
        description: 'Free on another store.',
        image: 'https://www.gamerpower.com/offers/1/x.jpg',
        url: 'https://www.gamerpower.com/open/cool-giveaway',
        worth: '$19.99',
        endDate: '2026-10-05T23:59:00.000Z',
        platform: 'Steam',
        source: 'GamerPower',
      },
    ],
    checkedAt: NOW,
    stale: false,
  });
});
afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
  jest.clearAllMocks();
});

test('shows free offers and future dates separately, opens Epic only on request', async () => {
  render(<DiscoverHighlights library={[]} />);
  expect(await screen.findByText('Free Adventure')).toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Refresh Epic offers' })).toBeEnabled());
  expect(screen.getByText('Coming next')).toBeInTheDocument();
  expect(screen.getByText('Next Adventure')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'View Next Adventure on Epic' })).not.toBeInTheDocument();
  expect(openExternalUrl).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'View Free Adventure on Epic' }));
  expect(openExternalUrl).toHaveBeenCalledWith(offer.url);
});

test('hiding the radar is persistent and stops requests until it is shown again', async () => {
  const { unmount } = render(<DiscoverHighlights library={[]} />);
  await screen.findByText('Free Adventure');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Refresh Epic offers' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Hide radar' }));
  unmount();
  FreeGameRadar.getEpicRadar.mockClear();
  FreeGameRadar.getGiveaways.mockClear();
  render(<DiscoverHighlights library={[]} />);
  expect(FreeGameRadar.getEpicRadar).not.toHaveBeenCalled();
  expect(FreeGameRadar.getGiveaways).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Show free games radar' }));
  await screen.findByText('Free Adventure');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Refresh Epic offers' })).toBeEnabled());
  expect(FreeGameRadar.getEpicRadar).toHaveBeenCalledTimes(1);
});

test('shows stale data honestly and supports a manual retry', async () => {
  FreeGameRadar.getEpicRadar.mockResolvedValueOnce({
    games: [offer],
    checkedAt: NOW - 7200000,
    stale: true,
    error: 'Offline.',
  });
  render(<DiscoverHighlights library={[]} />);
  expect(await screen.findByText('Last seen free')).toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Refresh Epic offers' })).toBeEnabled());
  const epicRadar = screen.getByRole('region', { name: 'Epic Free Games' });
  expect(within(epicRadar).getByRole('status')).toHaveTextContent(/verify availability/i);
  fireEvent.click(screen.getByRole('button', { name: 'Refresh Epic offers' }));
  expect(await screen.findByText('Free to keep')).toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Refresh Epic offers' })).toBeEnabled());
  expect(FreeGameRadar.getEpicRadar).toHaveBeenLastCalledWith({ forceRefresh: true });
});

test('expired offers disappear while the page stays open', async () => {
  FreeGameRadar.getEpicRadar.mockResolvedValue({
    games: [{ ...offer, endDate: new Date(NOW + 30000).toISOString() }],
    checkedAt: NOW,
    stale: false,
  });
  render(<DiscoverHighlights library={[]} />);
  await screen.findByText('Free Adventure');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Refresh Epic offers' })).toBeEnabled());
  act(() => jest.advanceTimersByTime(60000));
  expect(screen.queryByText('Free Adventure')).not.toBeInTheDocument();
});

test('rediscovery uses a separate spotlight and preserves its launch callback', async () => {
  StorageService.set('discoverEpicRadarVisible', false);
  const launch = jest.fn();
  render(<DiscoverHighlights library={library} onLaunchGame={launch} />);
  expect(screen.getByRole('heading', { name: 'Rediscover your library' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: "Today's Spotlight" })).not.toBeInTheDocument();
  expect(screen.getByText(/No playtime recorded here yet/)).toBeInTheDocument();
  const rediscovery = screen.getByRole('region', { name: 'Rediscover your library' });
  fireEvent.click(within(rediscovery).getByRole('button', { name: /^Play / }));
  expect(launch).toHaveBeenCalledWith(expect.objectContaining({ platform: 'Local' }));
  expect(FreeGameRadar.getEpicRadar).not.toHaveBeenCalled();
});

test('shows cross-platform giveaways with honest dates and opens them only on request', async () => {
  render(<DiscoverHighlights library={[]} />);
  expect(await screen.findByText('Cool Giveaway')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'More free games' })).toBeInTheDocument();
  expect(screen.getByText(/Free to keep · Steam/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'View the Cool Giveaway giveaway' }));
  expect(openExternalUrl).toHaveBeenCalledWith('https://www.gamerpower.com/open/cool-giveaway');
});

test('external discovery shows one category at a time and stops giveaway timers on essentials', async () => {
  render(<DiscoverHighlights library={[]} />);
  await screen.findByText('Free Adventure');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Refresh Epic offers' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Free-to-play essentials' }));
  expect(screen.getByRole('heading', { name: 'Selected free-to-play games' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Epic Free Games' })).not.toBeInTheDocument();
  expect(screen.queryByText('Cool Giveaway')).not.toBeInTheDocument();
  FreeGameRadar.getEpicRadar.mockClear();
  FreeGameRadar.getGiveaways.mockClear();
  act(() => jest.advanceTimersByTime(3600000));
  expect(FreeGameRadar.getEpicRadar).not.toHaveBeenCalled();
  expect(FreeGameRadar.getGiveaways).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Hide radar' }));
  expect(screen.queryByRole('heading', { name: 'Selected free-to-play games' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Show free games radar' }));
  expect(screen.getByRole('heading', { name: 'Selected free-to-play games' })).toBeInTheDocument();
  expect(FreeGameRadar.getGiveaways).not.toHaveBeenCalled();
});

test('giveaway cache wording matches on-open and manual refresh behaviour', async () => {
  render(<DiscoverHighlights library={[]} />);
  await screen.findByText('Cool Giveaway');
  const giveaways = within(screen.getByRole('region', { name: 'More free games' }));
  expect(giveaways.getByText(/Checks when opened/)).toBeInTheDocument();
  expect(giveaways.queryByText(/Refreshes hourly while visible/)).not.toBeInTheDocument();
  await waitFor(() => expect(giveaways.getByRole('button', { name: 'Refresh giveaway listings' })).toBeEnabled());
  fireEvent.click(giveaways.getByRole('button', { name: 'Refresh giveaway listings' }));
  await waitFor(() => expect(giveaways.getByRole('button', { name: 'Refresh giveaway listings' })).toBeEnabled());
  expect(FreeGameRadar.getGiveaways).toHaveBeenLastCalledWith({ forceRefresh: true });
});

test('giveaway feed reports failures honestly without breaking the Epic radar', async () => {
  FreeGameRadar.getGiveaways.mockResolvedValue({
    games: [],
    checkedAt: null,
    stale: true,
    error: 'Giveaway listings are temporarily unavailable.',
  });
  render(<DiscoverHighlights library={[]} />);
  expect(await screen.findByText('Free Adventure')).toBeInTheDocument();
  expect(await screen.findByText(/Giveaway listings are temporarily unavailable/)).toBeInTheDocument();
});
