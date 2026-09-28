import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import FreeToPlayEssentials from './FreeToPlayEssentials';
import catalogue from '../constants/FreeToPlayEssentials.json';
import { openExternalUrl } from '../services/ElectronBridge';

jest.mock('./LazyImage', () => ({ alt, src }) => <img alt={alt} src={src} />);
jest.mock('../services/ElectronBridge', () => ({ openExternalUrl: jest.fn().mockResolvedValue(true) }));

afterEach(() => jest.clearAllMocks());

test('starts with three curated Steam games and switches platform without fetching a catalogue', () => {
  render(<FreeToPlayEssentials />);
  expect(screen.getAllByRole('article')).toHaveLength(3);
  expect(screen.getByRole('heading', { name: 'Counter-Strike 2' })).toBeInTheDocument();
  expect(screen.getByText(/Prime Status is a paid upgrade/)).toBeInTheDocument();
  expect(screen.getByText(/not a live ranking/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Battle.net' }));
  expect(screen.getByRole('button', { name: 'Battle.net' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getAllByRole('article')).toHaveLength(3);
  expect(screen.getByRole('heading', { name: 'Hearthstone' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Counter-Strike 2' })).not.toBeInTheDocument();
  expect(openExternalUrl).not.toHaveBeenCalled();
});

test('opens the official page only on request and handles link failures', async () => {
  openExternalUrl.mockRejectedValueOnce(new Error('unavailable'));
  render(<FreeToPlayEssentials />);
  fireEvent.click(screen.getByRole('button', { name: 'Official page for Counter-Strike 2' }));
  expect(openExternalUrl).toHaveBeenCalledWith(catalogue[0].url);
  expect(await screen.findByRole('alert')).toHaveTextContent(/Could not open/);
});

test('launches only an exact installed library match and uses the existing game object', () => {
  const launch = jest.fn();
  const installed = { name: 'Counter-Strike 2', platform: 'Steam', appid: 730, installDir: 'C:\\Games\\CS2' };
  const { rerender } = render(<FreeToPlayEssentials library={[installed]} onLaunchGame={launch} />);
  fireEvent.click(screen.getByRole('button', { name: 'Play Counter-Strike 2' }));
  expect(launch).toHaveBeenCalledWith(installed);
  rerender(<FreeToPlayEssentials library={[{ ...installed, installed: false }]} onLaunchGame={launch} />);
  expect(screen.queryByRole('button', { name: 'Play Counter-Strike 2' })).not.toBeInTheDocument();
  rerender(
    <FreeToPlayEssentials
      library={[{ name: 'Counter-Strike 2', platform: 'Local', installed: true }]}
      onLaunchGame={launch}
    />
  );
  expect(screen.queryByRole('button', { name: 'Play Counter-Strike 2' })).not.toBeInTheDocument();
  rerender(
    <FreeToPlayEssentials library={[installed]} onLaunchGame={launch} activeSessions={{ 'Counter-Strike 2': {} }} />
  );
  expect(screen.getByRole('button', { name: 'Counter-Strike 2 is running' })).toBeDisabled();
});

test('matches a scanned Battle.net alias but never guesses that the League client means TFT is installed', () => {
  const launch = jest.fn();
  const overwatch = {
    name: 'Overwatch 2',
    platform: 'Battle.net',
    installDir: 'C:\\Games\\Overwatch',
    launchId: 'Pro',
  };
  render(
    <FreeToPlayEssentials
      library={[overwatch, { name: 'League of Legends', platform: 'Riot', installDir: 'C:\\Riot' }]}
      onLaunchGame={launch}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Battle.net' }));
  fireEvent.click(screen.getByRole('button', { name: 'Play Overwatch' }));
  expect(launch).toHaveBeenCalledWith(overwatch);
  fireEvent.click(screen.getByRole('button', { name: 'Riot' }));
  expect(screen.queryByRole('button', { name: 'Play Teamfight Tactics' })).not.toBeInTheDocument();
});

test('catalogue is bounded, uses official HTTPS pages, and labels every game with moods and cost caveats', () => {
  const hosts = new Set([
    'store.steampowered.com',
    'us.shop.battle.net',
    'diabloimmortal.blizzard.com',
    'store.epicgames.com',
    'www.fallguys.com',
    'www.leagueoflegends.com',
    'playvalorant.com',
    'teamfighttactics.leagueoflegends.com',
  ]);
  expect(new Set(catalogue.map((game) => game.id)).size).toBe(catalogue.length);
  for (const platform of new Set(catalogue.map((game) => game.platform))) {
    expect(catalogue.filter((game) => game.platform === platform)).toHaveLength(3);
  }
  for (const game of catalogue) {
    const url = new URL(game.url);
    expect(url.protocol).toBe('https:');
    expect(hosts.has(url.hostname)).toBe(true);
    expect(game.moods.length).toBeGreaterThan(0);
    expect(game.costNote).toBeTruthy();
  }
});
