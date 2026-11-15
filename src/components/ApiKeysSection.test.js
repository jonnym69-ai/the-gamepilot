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

test('renders a card per key service', () => {
  renderSection();
  expect(screen.getByText('SteamGridDB')).toBeInTheDocument();
  expect(screen.getByText('RetroAchievements')).toBeInTheDocument();
  expect(screen.getByText('itch.io')).toBeInTheDocument();
  expect(screen.getByText('YouTube')).toBeInTheDocument();
});

test('each card offers a how-to walkthrough', () => {
  renderSection();
  expect(screen.getAllByText('How do I get a key?')).toHaveLength(4);
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
