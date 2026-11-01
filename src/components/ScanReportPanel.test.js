import React from 'react';
import { render, screen } from '@testing-library/react';
import { ScanReportPanel } from './ScanReportPanel';
import { LibraryScanCoordinatorService } from '../services/LibraryScanCoordinatorService';

jest.mock('../services/LibraryScanCoordinatorService', () => ({
  LibraryScanCoordinatorService: {
    getLastScanReport: jest.fn(),
    clearLastScanReport: jest.fn(),
  },
}));

describe('ScanReportPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the empty state when no report exists', () => {
    LibraryScanCoordinatorService.getLastScanReport.mockReturnValue(null);
    render(<ScanReportPanel />);
    expect(screen.getByText(/No scan report yet/)).toBeInTheDocument();
  });

  it('shows per-platform game counts from the internal key and gameCount fallback', () => {
    LibraryScanCoordinatorService.getLastScanReport.mockReturnValue({
      summary: {
        totalGamesAfterDedupe: 70,
        scannedPlatformCount: 3,
        successfulPlatformCount: 2,
        emptyPlatformCount: 1,
        errorPlatformCount: 0,
        lastScanAt: '2026-10-25T01:57:38.000Z',
      },
      platformStatus: {
        Steam: { key: 'steam', scanStatus: 'found', gameCount: 55 },
        Epic: { key: 'epic', scanStatus: 'found', gameCount: 15 },
        GOG: { key: 'gog', scanStatus: 'empty', gameCount: 0 },
      },
      platformCounts: { steam: 55, epic: 15, gog: 0 },
    });

    render(<ScanReportPanel />);
    expect(screen.getByText('70')).toBeInTheDocument();
    expect(screen.getByText('55')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('falls back to gameCount when platformCounts lacks the internal key', () => {
    LibraryScanCoordinatorService.getLastScanReport.mockReturnValue({
      summary: { totalGamesAfterDedupe: 9, lastScanAt: '2026-10-25T01:57:38.000Z' },
      platformStatus: {
        Steam: { key: 'steam', scanStatus: 'found', gameCount: 9 },
      },
      platformCounts: {},
    });

    const { container } = render(<ScanReportPanel />);
    expect(container.querySelector('.scan-report-platform-count').textContent).toBe('9');
  });

  it('shows the error field as the row reason', () => {
    LibraryScanCoordinatorService.getLastScanReport.mockReturnValue({
      summary: { lastScanAt: '2026-10-25T01:57:38.000Z' },
      platformStatus: {
        'Battle.net': { key: 'battleNet', scanStatus: 'error', gameCount: 0, error: 'Registry hive missing' },
      },
      platformCounts: {},
    });

    render(<ScanReportPanel />);
    expect(screen.getByText('Registry hive missing')).toBeInTheDocument();
  });
});
