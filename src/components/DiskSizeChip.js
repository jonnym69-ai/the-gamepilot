import React, { useEffect, useState } from 'react';
import { HardDrive } from 'lucide-react';
import DiskUsageService, { formatBytes } from '../services/DiskUsageService';

// Small chip slot-in for Library cards. Renders only when we have a cached
// size — never blocks the card render and never triggers its own scan; the
// Library page warmup populates the cache in the background.
const DiskSizeChip = ({ game, className = '' }) => {
  const [entry, setEntry] = useState(() => DiskUsageService.getCached(game));

  useEffect(() => {
    setEntry(DiskUsageService.getCached(game));
    if (!game) return undefined;
    // Re-check after the typical warmup window so we update once the scan
    // completes without forcing a re-render storm.
    const handle = setTimeout(() => {
      setEntry(DiskUsageService.getCached(game));
    }, 1500);
    return () => clearTimeout(handle);
  }, [game]);

  if (!entry || !entry.ok || !entry.bytes) return null;

  return (
    <span
      className={`disk-size-chip ${className}`}
      title={`${formatBytes(entry.bytes)} on disk${entry.truncated ? ' (estimate; folder partially scanned)' : ''}`}
    >
      <HardDrive size={11} aria-hidden="true" />
      <span>{formatBytes(entry.bytes)}</span>
    </span>
  );
};

export default DiskSizeChip;
