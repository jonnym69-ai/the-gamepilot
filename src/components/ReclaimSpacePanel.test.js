import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ReclaimSpacePanel from './ReclaimSpacePanel';

const SCAN_RESULT = {
  ok: true,
  items: [
    {
      id: 'steam-shader-orphan:222:abc',
      kind: 'steam-shader-orphan',
      label: 'Steam app 222 (uninstalled)',
      path: 'C:\\Steam\\steamapps\\shadercache\\222',
      bytes: 2 * 1024 * 1024 * 1024,
    },
    {
      id: 'crash-dump:game.exe.1.dmp',
      kind: 'crash-dump',
      label: 'Crash dump — game.exe.1.dmp',
      path: 'C:\\Users\\U\\AppData\\Local\\CrashDumps\\game.exe.1.dmp',
      bytes: 512 * 1024 * 1024,
    },
  ],
  totalBytes: 2.5 * 1024 * 1024 * 1024,
};

beforeEach(() => {
  delete window.electronAPI;
});

test('tells the user the panel needs the desktop app when the bridge is missing', () => {
  render(<ReclaimSpacePanel />);
  expect(screen.getByText(/desktop app/)).toBeInTheDocument();
});

test('scans, lists reclaimable items checked by default, and cleans via ids only', async () => {
  const storageCleanerScan = jest.fn().mockResolvedValue(SCAN_RESULT);
  const storageCleanerClean = jest.fn().mockResolvedValue({
    ok: true,
    results: SCAN_RESULT.items.map((item) => ({ id: item.id, ok: true })),
  });
  window.electronAPI = { storageCleanerScan, storageCleanerClean };

  render(<ReclaimSpacePanel />);
  expect(screen.getByText(/orphaned shader caches/i)).toBeInTheDocument();
  expect(screen.getByText(/Recycle Bin/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /scan for reclaimable space/i }));
  expect(await screen.findByText('Steam app 222 (uninstalled)')).toBeInTheDocument();
  expect(screen.getByText(/recoverable/)).toBeInTheDocument();
  expect(screen.getByText('Crash dump — game.exe.1.dmp')).toBeInTheDocument();

  const checkboxes = screen.getAllByRole('checkbox');
  expect(checkboxes).toHaveLength(2);
  checkboxes.forEach((box) => expect(box).toBeChecked());

  fireEvent.click(screen.getByRole('button', { name: /clean selected/i }));
  expect(await screen.findByText(/Move 2 items .* to the Recycle Bin/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /yes, move to recycle bin/i }));
  await waitFor(() => expect(storageCleanerClean).toHaveBeenCalledTimes(1));

  // Only ids are sent back — never paths.
  expect(storageCleanerClean).toHaveBeenCalledWith(['steam-shader-orphan:222:abc', 'crash-dump:game.exe.1.dmp']);

  expect(await screen.findByText(/Moved 2 items/)).toBeInTheDocument();
});

test('reports per-item failures without hiding the rest', async () => {
  window.electronAPI = {
    storageCleanerScan: jest.fn().mockResolvedValue(SCAN_RESULT),
    storageCleanerClean: jest.fn().mockResolvedValue({
      ok: true,
      results: [
        { id: 'steam-shader-orphan:222:abc', ok: true },
        { id: 'crash-dump:game.exe.1.dmp', ok: false, error: 'file is locked' },
      ],
    }),
  };

  render(<ReclaimSpacePanel />);
  fireEvent.click(screen.getByRole('button', { name: /scan for reclaimable space/i }));
  await screen.findByText('Steam app 222 (uninstalled)');

  fireEvent.click(screen.getByRole('button', { name: /clean selected/i }));
  fireEvent.click(await screen.findByRole('button', { name: /yes, move to recycle bin/i }));

  expect(await screen.findByText(/file is locked/)).toBeInTheDocument();
});
