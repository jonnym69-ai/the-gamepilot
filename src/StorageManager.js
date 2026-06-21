import React, { useEffect, useMemo, useState, useCallback } from 'react';
import NavBar from './NavBar';
import { HardDrive, RefreshCw, Trash2, Search, Filter, Play, ExternalLink, ThermometerSnowflake, Zap, Disc3 } from 'lucide-react';
import DiskUsageService, { formatBytes, getDiskKey } from './services/DiskUsageService';
import { StorageDriveMapper } from './services/StorageDriveMapper';
import { HardwareDetector } from './services/HardwareDetector';
import UninstallModal from './components/UninstallModal';
import LazyImage from './components/LazyImage';
import { resolveGameArtwork, getGameArtworkPlaceholder } from './services/GameArtworkService';
import './StorageManager.css';

const SORT_OPTIONS = [
  { value: 'size', label: 'Size (largest first)' },
  { value: 'reclaim', label: 'Most reclaimable (cold + big)' },
  { value: 'cold', label: 'Coldest (longest unplayed)' },
  { value: 'name', label: 'Name (A → Z)' }
];

const COLD_THRESHOLD_OPTIONS = [
  { value: 30, label: '30 days' },
  { value: 60, label: '60 days' },
  { value: 90, label: '90 days' },
  { value: 120, label: '120 days' },
  { value: 180, label: '6 months' },
  { value: 365, label: '1 year' },
  { value: 0, label: 'Never played' }
];

const formatLastPlayed = (lastPlayed) => {
  if (!lastPlayed) return 'Never';
  const t = new Date(lastPlayed).getTime();
  if (!Number.isFinite(t) || t === 0) return 'Never';
  const days = Math.round((Date.now() - t) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.round(days / 30)}mo ago`;
  return `${Math.round(days / 365)}y ago`;
};

const formatHours = (minutes) => {
  const total = Number(minutes) || 0;
  if (total <= 0) return '—';
  const hrs = Math.round(total / 60);
  if (hrs >= 1) return `${hrs}h`;
  return `${total}m`;
};

// Storage Manager page — gives the user one screen to see how much disk
// every installed game takes, sort by reclaimable space / coldness, and
// open the safe uninstall modal for each one.
function StorageManager({ library = [], onLaunchGame = () => {} }) {
  const [scanProgress, setScanProgress] = useState({ scanned: 0, total: 0, running: false });
  const [tick, setTick] = useState(0); // re-render trigger as cache fills in
  const [filterPlatform, setFilterPlatform] = useState('');
  const [sortBy, setSortBy] = useState('size');
  const [search, setSearch] = useState('');
  const [coldDays, setColdDays] = useState(60);
  const [uninstallTarget, setUninstallTarget] = useState(null);
  const [enabled, setEnabled] = useState(() => DiskUsageService.isEnabled());

  // Only games with an installDir can be measured. Anything else (web games,
  // free-game-radar entries, etc.) is filtered out up front so the page only
  // shows actionable rows.
  const measurableGames = useMemo(
    () => (Array.isArray(library) ? library.filter((g) => g && g.installDir) : []),
    [library]
  );

  // Throttled sequential warmup. We want the user to see the cache fill in
  // progressively rather than the page freezing while every folder is
  // walked, so we measure one at a time and bump `tick` to re-render.
  const runScan = useCallback(async ({ force = false } = {}) => {
    if (!DiskUsageService.isEnabled()) return;
    if (measurableGames.length === 0) return;
    if (force) DiskUsageService.clearStaleErrors();
    setScanProgress({ scanned: 0, total: measurableGames.length, running: true });
    let scanned = 0;
    for (const game of measurableGames) {
      const cached = DiskUsageService.getCached(game);
      if (!force && cached && cached.ok) {
        scanned += 1;
        setScanProgress({ scanned, total: measurableGames.length, running: true });
        continue;
      }
      try { await DiskUsageService.measure(game, { force }); }
      catch { /* ignore — measure caches its own errors */ }
      scanned += 1;
      setScanProgress({ scanned, total: measurableGames.length, running: true });
      setTick((t) => t + 1);
      await new Promise((r) => setTimeout(r, 60));
    }
    setScanProgress((p) => ({ ...p, running: false }));
    setTick((t) => t + 1);
  }, [measurableGames]);

  useEffect(() => {
    // Refresh hardware info so StorageDriveMapper has an up-to-date
    // driveTypeMap. This is fire-and-forget — the page re-renders via tick
    // once the IPC round-trip completes and caches systemInfo.
    HardwareDetector.getSystemInfo().then(() => setTick((t) => t + 1)).catch(() => {});
    // Auto-kick a scan on first mount; if everything is already cached it
    // returns instantly.
    runScan();
  }, [runScan]);

  const platformOptions = useMemo(() => {
    const set = new Set();
    measurableGames.forEach((g) => g?.platform && set.add(g.platform));
    return Array.from(set).sort();
  }, [measurableGames]);

  const decorated = useMemo(() => {
    void tick; // re-evaluate when cache changes
    const q = search.trim().toLowerCase();
    return measurableGames
      .filter((g) => !filterPlatform || g.platform === filterPlatform)
      .filter((g) => !q || (g.name || '').toLowerCase().includes(q))
      .filter((g) => {
        if (coldDays === 0) {
          // Never played
          return !g.last_played || g.time_played === 0 || g.time_played == null;
        }
        if (!g.last_played) return true; // show never-played in all thresholds
        const ms = new Date(g.last_played).getTime();
        if (!Number.isFinite(ms) || ms === 0) return true;
        const days = Math.round((Date.now() - ms) / 86400000);
        return days >= coldDays;
      })
      .map((g) => {
        const entry = DiskUsageService.getCached(g);
        const bytes = entry?.ok ? entry.bytes : 0;
        return {
          game: g,
          bytes,
          known: Boolean(entry?.ok),
          lastPlayedMs: g.last_played ? new Date(g.last_played).getTime() : 0,
          score: DiskUsageService.reclaimScore(g)
        };
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'reclaim': return b.score - a.score;
          case 'cold': {
            const aCold = a.lastPlayedMs || -Infinity;
            const bCold = b.lastPlayedMs || -Infinity;
            return aCold - bCold; // oldest first; never-played sinks lowest
          }
          case 'name': return (a.game.name || '').localeCompare(b.game.name || '');
          case 'size':
          default: return b.bytes - a.bytes;
        }
      });
  }, [measurableGames, filterPlatform, search, sortBy, tick, coldDays]);

  const totalKnownBytes = useMemo(
    () => decorated.reduce((sum, row) => sum + (row.known ? row.bytes : 0), 0),
    [decorated]
  );
  const knownCount = decorated.filter((r) => r.known).length;
  const reclaimablePool = useMemo(
    () => decorated
      .filter((r) => r.known && r.score > 1.5)
      .reduce((sum, r) => sum + r.bytes, 0),
    [decorated]
  );

  // Fast-drive cold storage: games on NVMe/SSD that are cold by threshold
  const fastDriveColdBytes = useMemo(() => {
    return decorated.reduce((sum, row) => {
      if (!row.known || row.bytes <= 0) return sum;
      const driveInfo = StorageDriveMapper.resolve(row.game);
      if (!driveInfo.drive || (!driveInfo.drive.isNVMe && !driveInfo.drive.isSSD)) return sum;
      return sum + row.bytes;
    }, 0);
  }, [decorated]);

  const progressPercent = scanProgress.total > 0
    ? Math.round((scanProgress.scanned / scanProgress.total) * 100)
    : 0;

  if (!enabled) {
    return (
      <div className="storage-manager-page">
        <NavBar />
        <div className="storage-manager-empty">
          <HardDrive size={28} />
          <h1>Library Reclaimer is off</h1>
          <p>
            GamePilot can scan your installed games to find cold, heavy titles that might not be
            worth keeping around. Everything stays local — but it does I/O work, so it's opt-in.
          </p>
          <button
            type="button"
            onClick={() => { DiskUsageService.setEnabled(true); setEnabled(true); }}
          >
            Enable Library Reclaimer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="storage-manager-page">
      <NavBar />

      <header className="storage-manager-hero">
        <div className="storage-manager-hero-text">
          <div className="storage-manager-hero-title">
            <HardDrive size={20} />
            <h1>Library Reclaimer</h1>
          </div>
          <p>
            Find the cold, heavy games in your library and reclaim space for your next obsession.
            GamePilot never deletes files — uninstalls are handed to each launcher's official tool.
          </p>
        </div>
        <div className="storage-manager-hero-stats">
          <div className="storage-manager-hero-stat">
            <span>Measured</span>
            <strong>{formatBytes(totalKnownBytes)}</strong>
            <em>{knownCount} / {measurableGames.length} games</em>
          </div>
          <div className="storage-manager-hero-stat reclaim">
            <span>Reclaim candidates</span>
            <strong>{formatBytes(reclaimablePool)}</strong>
            <em>cold + big</em>
          </div>
          <div className="storage-manager-hero-stat fast-cold">
            <span>Fast drive cold</span>
            <strong>{formatBytes(fastDriveColdBytes)}</strong>
            <em>NVMe/SSD unplayed</em>
          </div>
          <button
            type="button"
            className="storage-manager-rescan"
            onClick={() => runScan({ force: true })}
            disabled={scanProgress.running}
            title="Re-walk every install folder"
          >
            <RefreshCw size={14} className={scanProgress.running ? 'spin' : ''} />
            {scanProgress.running ? `Scanning ${scanProgress.scanned}/${scanProgress.total}` : 'Rescan'}
          </button>
        </div>
        {scanProgress.running && (
          <div className="storage-manager-progress">
            <div className="storage-manager-progress-bar" style={{ width: `${progressPercent}%` }} />
          </div>
        )}
      </header>

      <div className="storage-manager-controls">
        <div className="storage-manager-search">
          <Search size={14} />
          <input
            type="text"
            placeholder="Filter by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label className="storage-manager-control">
          <Filter size={12} />
          <select value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)}>
            <option value="">All platforms</option>
            {platformOptions.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label className="storage-manager-control">
          <ThermometerSnowflake size={12} />
          <span>Cold threshold</span>
          <select value={coldDays} onChange={(e) => setColdDays(Number(e.target.value))}>
            {COLD_THRESHOLD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>
        <label className="storage-manager-control">
          <span>Sort</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            {SORT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </label>
      </div>

      {decorated.length === 0 ? (
        <div className="storage-manager-empty">
          <p>No installed games match those filters.</p>
        </div>
      ) : (
        <div className="storage-manager-table" role="table">
          <div className="storage-manager-row storage-manager-row-head" role="row">
            <div role="columnheader">Game</div>
            <div role="columnheader">Platform</div>
            <div role="columnheader" className="num">Size</div>
            <div role="columnheader" className="num">Hours</div>
            <div role="columnheader" className="num">Last played</div>
            <div role="columnheader" className="actions">Actions</div>
          </div>
          {decorated.map(({ game, bytes, known }) => {
            const lastPlayedMs = game.last_played ? new Date(game.last_played).getTime() : 0;
            const daysSincePlayed = lastPlayedMs ? Math.round((Date.now() - lastPlayedMs) / 86400000) : Infinity;
            const isCold = daysSincePlayed >= 30;
            const isVeryCold = daysSincePlayed >= 60;
            const reclaimPrompt = !game.time_played || isVeryCold
              ? 'Never played — is this worth keeping installed?'
              : isCold
                ? `Not played in ${daysSincePlayed} days — is this worth keeping installed?`
                : null;
            const driveInfo = StorageDriveMapper.resolve(game);
            return (
            <div className={`storage-manager-row${isCold ? ' cold-game' : ''}`} role="row" key={getDiskKey(game) || game.name}>
              <div className="storage-manager-cell-game">
                <div className="storage-manager-cell-art">
                  <LazyImage
                    src={resolveGameArtwork(game, { surface: 'recommendation_card' })}
                    alt={game.name}
                    placeholder={getGameArtworkPlaceholder({ game, surface: 'recommendation_card' })}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div className="storage-manager-cell-meta">
                  <strong>{game.name}</strong>
                  {reclaimPrompt && <span className="reclaim-prompt">{reclaimPrompt}</span>}
                  {game.installDir && <code title={game.installDir}>{game.installDir}</code>}
                </div>
              </div>
              <div role="cell">{game.platform || '—'}</div>
              <div role="cell" className="num">
                {known ? formatBytes(bytes) : <span className="muted">…</span>}
              </div>
              <div role="cell" className="num">{formatHours(game.time_played)}</div>
              <div role="cell" className="num">{formatLastPlayed(game.last_played)}</div>
              <div role="cell" className="actions">
                <span
                  className={`drive-badge ${driveInfo.cssClass}`}
                  title={driveInfo.name}
                >
                  {driveInfo.type === 'NVMe' && <Zap size={10} />}
                  {driveInfo.type === 'SSD' && <Disc3 size={10} />}
                  {driveInfo.type === 'HDD' && <HardDrive size={10} />}
                  {driveInfo.type}
                </span>
                <button
                  type="button"
                  className="storage-manager-action launch"
                  onClick={() => onLaunchGame(game)}
                  title="Launch"
                >
                  <Play size={12} />
                </button>
                <button
                  type="button"
                  className="storage-manager-action uninstall"
                  onClick={() => setUninstallTarget(game)}
                  title="Uninstall…"
                >
                  <Trash2 size={12} />
                  <span>Uninstall…</span>
                </button>
                {game.installDir && window.electronAPI?.openExternal && (
                  <button
                    type="button"
                    className="storage-manager-action"
                    onClick={() => window.electronAPI.openExternal(`file:///${game.installDir.replace(/\\/g, '/')}`)}
                    title="Open install folder"
                  >
                    <ExternalLink size={12} />
                  </button>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}

      <UninstallModal
        isOpen={Boolean(uninstallTarget)}
        game={uninstallTarget}
        onClose={() => setUninstallTarget(null)}
        onCompleted={(g) => {
          // We don't auto-remove from the library — the launcher's uninstaller
          // hasn't necessarily finished yet. The next library scan will pick
          // up the change. We do invalidate the size cache so a rescan
          // reflects reclaimed space.
          if (g) {
            try {
              const key = getDiskKey(g);
              if (key) {
                const raw = window.localStorage.getItem('diskUsageCacheV1');
                if (raw) {
                  const parsed = JSON.parse(raw);
                  delete parsed[key];
                  window.localStorage.setItem('diskUsageCacheV1', JSON.stringify(parsed));
                  setTick((t) => t + 1);
                }
              }
            } catch { /* swallow */ }
          }
        }}
      />
    </div>
  );
}

export default StorageManager;
