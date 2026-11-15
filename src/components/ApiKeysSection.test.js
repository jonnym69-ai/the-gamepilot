import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ApiKeysSection, { getConnectedKeyCount } from './ApiKeysSection';
import { ToastProvider } from './Toast';
import SteamGridDbService from '../services/SteamGridDbService';
import RetroAchievementsService from '../services/RetroAchievementsService';
import ItchAccountService from '../services/ItchAccountService';
import { openExternalUrl } from '../services/ElectronBridge';

jest.mock('../services/ElectronBridge', () => ({
  openExternalUrl: jest.fn().mockResolvedValue(true),
  getElectronAPI: jest.fn(() => null),
}));

jest.mock('../services/EpicAccountService', () => ({
  __esModule: true,
  default: {
    isLinked: jest.fn(() => false),
    getAccountMeta: jest.fn(() => null),
    refreshStatus: jest.fn(() => new Promise(() => {})),
    link: jest.fn(),
    disconnect: jest.fn(),
  },
}));

const renderSection = () =>
  render(
    <ToastProvider>
      <ApiKeysSection />
    </ToastProvider>
  );

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

test('renders a card per connected service', () => {
  renderSection();
  expect(screen.getByText('Steam')).toBeInTheDocument();
  expect(screen.getByText('Epic Games')).toBeInTheDocument();
  expect(screen.getByText('SteamGridDB')).toBeInTheDocument();
  expect(screen.getByText('RetroAchievements')).toBeInTheDocument();
  expect(screen.getByText('itch.io')).toBeInTheDocument();
  expect(screen.getByText('YouTube')).toBeInTheDocument();
});

test('each card offers a how-to walkthrough', () => {
  renderSection();
  expect(screen.getAllByText(/How do I (get a key|find my Steam64 ID)\?/)).toHaveLength(5);
});

test('the guide overlay pins itself to the viewport — body carries .App so .App > * CSS strips portals', () => {
  renderSection();
  fireEvent.click(screen.getAllByText(/How do I/)[0]);
  const backdrop = screen.getByTestId('api-key-guide-backdrop');
  expect(backdrop.style.position).toBe('fixed');
  expect(backdrop.style.zIndex).toBe('12000');
});

test('saving an SGDB key persists it and marks the card connected', () => {
  renderSection();
  fireEvent.change(screen.getByLabelText('SteamGridDB API key'), { target: { value: 'abc123' } });
  fireEvent.click(screen.getByText('Save key'));
  expect(SteamGridDbService.getApiKey()).toBe('abc123');
  expect(screen.getByText('Connected')).toBeInTheDocument();
});

test('guide modal opens with steps and links out to the key page', () => {
  renderSection();
  fireEvent.click(screen.getAllByText('How do I get a key?')[0]);
  expect(screen.getByText('Get a SteamGridDB key')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Open the SteamGridDB API page'));
  expect(openExternalUrl).toHaveBeenCalledWith('https://www.steamgriddb.com/profile/preferences/api');
});

test('getConnectedKeyCount counts saved keys', () => {
  expect(getConnectedKeyCount()).toBe(0);
  SteamGridDbService.setApiKey('k');
  ItchAccountService.setApiKey('k');
  RetroAchievementsService.setUsername('u');
  RetroAchievementsService.setApiKey('k');
  expect(getConnectedKeyCount()).toBe(3);
});
