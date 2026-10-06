import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProGate from './ProGate';
import RecommendationTunerPanel from './RecommendationTunerPanel';
import CinematicExport from './CinematicExport';
import StorageManager from '../StorageManager';
import StorageService from '../services/StorageService';
import DiskUsageService from '../services/DiskUsageService';
import { HardwareDetector } from '../services/HardwareDetector';

jest.mock('../NavBar', () => () => null);
jest.mock('../services/HardwareDetector', () => ({
  HardwareDetector: { getSystemInfo: jest.fn().mockResolvedValue(null) },
}));

const renderInRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

test.each([
  'eras',
  'signature-titles',
  'save-backup',
  'data-export',
  'share-cards',
  'cinematic-export',
  'storage-manager',
  'recommendation-tuner',
  'era-archive',
  'year-over-year',
  'pro-themes',
  'unknown',
])('%s renders children — nothing is gated in the single-edition build', (feature) => {
  renderInRouter(
    <ProGate feature={feature}>
      <span>Included content</span>
    </ProGate>
  );
  expect(screen.getByText('Included content')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Explore Pro' })).not.toBeInTheDocument();
});

test('recommendation tuner mounts its editor and saves weights', () => {
  StorageService.set('customRecommendationWeights', { unplayedBonus: 42 });
  renderInRouter(<RecommendationTunerPanel />);
  expect(screen.getAllByRole('slider').length).toBeGreaterThan(0);
  fireEvent.change(screen.getAllByRole('slider')[0], { target: { value: '40' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Custom Weights' }));
  expect(StorageService.get('customRecommendationWeights').unplayedBonus).toBe(42);
});

test('cinematic export renders its real format and export controls', () => {
  renderInRouter(<CinematicExport isOpen library={[]} onClose={jest.fn()} />);
  expect(screen.getByRole('button', { name: /Vertical Poster/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Export Cinematic Card' })).toBeEnabled();
});

test('closed cinematic entry renders nothing', () => {
  const { container } = renderInRouter(<CinematicExport isOpen={false} library={[]} />);
  expect(container).toBeEmptyDOMElement();
});

test('Library Reclaimer mounts its real page', async () => {
  jest.spyOn(DiskUsageService, 'isEnabled').mockReturnValue(true);
  renderInRouter(<StorageManager library={[]} />);
  expect(await screen.findByRole('heading', { name: 'Library Reclaimer' })).toBeInTheDocument();
  expect(HardwareDetector.getSystemInfo).toHaveBeenCalledTimes(1);
});
