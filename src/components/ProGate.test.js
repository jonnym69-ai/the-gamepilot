import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProGate, { EditionComparison } from './ProGate';
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
  global.__APP_EDITION__ = 'free';
  jest.clearAllMocks();
});

afterEach(() => {
  global.__APP_EDITION__ = 'free';
  jest.restoreAllMocks();
});

test.each(['eras', 'signature-titles', 'save-backup', 'data-export', 'share-cards'])(
  '%s renders in Free',
  (feature) => {
    renderInRouter(
      <ProGate feature={feature}>
        <span>Included content</span>
      </ProGate>
    );
    expect(screen.getByText('Included content')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Explore Pro' })).not.toBeInTheDocument();
  }
);

test('Free does not mount gated children and links to a working local comparison page', () => {
  const mounted = jest.fn();
  function Child() {
    mounted();
    return <div>Paid content</div>;
  }
  render(
    <MemoryRouter initialEntries={['/feature']}>
      <Routes>
        <Route
          path="/feature"
          element={
            <ProGate feature="cinematic-export">
              <Child />
            </ProGate>
          }
        />
        <Route path="/editions" element={<EditionComparison />} />
      </Routes>
    </MemoryRouter>
  );
  expect(mounted).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Explore Pro' }));
  expect(screen.getByRole('region', { name: 'GamePilot editions' })).toHaveTextContent('GamePilot Free');
  expect(screen.getByRole('button', { name: 'Pro sales coming soon' })).toBeDisabled();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(screen.getAllByRole('link').every((link) => link.getAttribute('href').startsWith('/'))).toBe(true);
});

test('Pro comparison has no purchase prompt or activation controls', () => {
  global.__APP_EDITION__ = 'pro';
  renderInRouter(<EditionComparison />);
  expect(screen.getByText(/Installed edition:/)).toHaveTextContent('GamePilot Pro');
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});

test.each(['free', 'pro'])('unknown gates do not render children in %s', (edition) => {
  global.__APP_EDITION__ = edition;
  renderInRouter(
    <ProGate feature="unknown">
      <span>Unavailable content</span>
    </ProGate>
  );
  expect(screen.queryByText('Unavailable content')).not.toBeInTheDocument();
});

test('Free tuner cannot edit or erase saved Pro weights', () => {
  StorageService.set('customRecommendationWeights', { unplayedBonus: 42 });
  renderInRouter(<RecommendationTunerPanel />);
  expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  expect(StorageService.get('customRecommendationWeights')).toEqual({ unplayedBonus: 42 });
});

test('Pro tuner can save weights and Free preserves them after remount', () => {
  global.__APP_EDITION__ = 'pro';
  const view = renderInRouter(<RecommendationTunerPanel />);
  fireEvent.change(screen.getAllByRole('slider')[0], { target: { value: '40' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Custom Weights' }));
  expect(StorageService.get('customRecommendationWeights').moodHighRateBonus).toBe(40);
  view.unmount();
  global.__APP_EDITION__ = 'free';
  renderInRouter(<RecommendationTunerPanel />);
  expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  expect(StorageService.get('customRecommendationWeights').moodHighRateBonus).toBe(40);
});

test('Free cinematic entry offers a closeable preview without export controls', () => {
  const close = jest.fn();
  renderInRouter(<CinematicExport isOpen library={[]} onClose={close} />);
  expect(screen.getByRole('dialog', { name: 'Cinematic exports' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Export Cinematic Card' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Close cinematic exports' }));
  expect(close).toHaveBeenCalledTimes(1);
});

test('Pro cinematic entry renders its real format and export controls', () => {
  global.__APP_EDITION__ = 'pro';
  renderInRouter(<CinematicExport isOpen library={[]} onClose={jest.fn()} />);
  expect(screen.getByRole('button', { name: /Vertical Poster/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Export Cinematic Card' })).toBeEnabled();
});

test.each(['free', 'pro'])('closed cinematic entry renders nothing in %s', (edition) => {
  global.__APP_EDITION__ = edition;
  const { container } = renderInRouter(<CinematicExport isOpen={false} library={[]} />);
  expect(container).toBeEmptyDOMElement();
});

test('Free Library Reclaimer does not mount scanners or request hardware information', () => {
  const measure = jest.spyOn(DiskUsageService, 'measure');
  renderInRouter(<StorageManager library={[{ name: 'Test Game', installDir: 'C:/test-game' }]} />);
  expect(screen.getByRole('button', { name: 'Explore Pro' })).toBeInTheDocument();
  expect(measure).not.toHaveBeenCalled();
  expect(HardwareDetector.getSystemInfo).not.toHaveBeenCalled();
});

test('Pro Library Reclaimer mounts its real page', async () => {
  global.__APP_EDITION__ = 'pro';
  jest.spyOn(DiskUsageService, 'isEnabled').mockReturnValue(true);
  renderInRouter(<StorageManager library={[]} />);
  expect(await screen.findByRole('heading', { name: 'Library Reclaimer' })).toBeInTheDocument();
  expect(HardwareDetector.getSystemInfo).toHaveBeenCalledTimes(1);
});
