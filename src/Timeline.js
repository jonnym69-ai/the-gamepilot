import React, { useCallback, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import NavBar from './NavBar';
import LazyImage from './components/LazyImage';
import ShareMenu from './components/ShareMenu';
import PeriodChampionService from './services/PeriodChampionService';
import { LocalShareService } from './services/LocalShareService';
import { Trophy, Calendar, Clock } from 'lucide-react';
import './Timeline.css';

const formatChampionHours = (minutes) => {
  if (!minutes || minutes <= 0) return '0h';
  const h = Math.round(minutes / 60);
  if (h >= 1000) return `${(h / 1000).toFixed(1)}k h`;
  return `${h}h`;
};

const formatDetailedDuration = (minutes) => {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  const hours = Math.floor(total / 60);
  const remainder = total % 60;
  if (hours === 0) return `${remainder}m`;
  return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
};

const formatSessionDay = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
};

const formatPeriodLabel = (period, periodKey) => {
  if (period === 'week') {
    try {
      const [y, m, d] = periodKey.split('-').map(Number);
      const start = new Date(y, m - 1, d);
      const end = new Date(y, m - 1, d + 6);
      const fmt = (date) => `${date.toLocaleDateString('en-US', { month: 'short' })} ${date.getDate()}`;
      return `${fmt(start)} – ${fmt(end)}`;
    } catch { return periodKey; }
  }
  if (period === 'month') {
    try {
      const [y, m] = periodKey.split('-').map(Number);
      return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch { return periodKey; }
  }
  if (period === 'year') return periodKey;
  return periodKey;
};

const PERIOD_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
  { value: 'year', label: 'Yearly' },
];

const PERIOD_ICONS = {
  week: Calendar,
  month: Calendar,
  year: Trophy,
};

const PERIOD_COLORS = {
  week: '#8ab4f8',
  month: '#c58af9',
  year: '#fbbf24',
};

const getChampionYear = (champion) => Number(String(champion?.periodKey || '').slice(0, 4)) || null;

const buildChampionCaption = (champion) => {
  if (!champion) return '';
  const share = champion.totalPeriodMinutes > 0
    ? Math.round((champion.minutes / champion.totalPeriodMinutes) * 100)
    : 0;
  return [
    `${champion.game?.name} was my GamePilot ${champion.period} champion (${formatPeriodLabel(champion.period, champion.periodKey)}).`,
    `${formatDetailedDuration(champion.minutes)} across ${champion.sessionCount} session${champion.sessionCount === 1 ? '' : 's'} · longest sitting ${formatDetailedDuration(champion.longestSessionMinutes)} · ${share}% of my play that period.`,
    '#GamePilot #GamingStats',
  ].join('\n');
};

const buildCollectionCaption = (entries, label) => {
  const champions = [...new Set(entries.map((entry) => entry.game?.name).filter(Boolean))];
  return [
    `My GamePilot ${label} champions`,
    champions.length > 0 ? `Games that led the way: ${champions.join(', ')}` : '',
    `${entries.length} period${entries.length === 1 ? '' : 's'} tracked locally.`,
    '#GamePilot #GamingStats',
  ].filter(Boolean).join('\n');
};

function ShareCover({ champion, className = '' }) {
  const src = champion?.game?.portrait || champion?.game?.portraitFallback || champion?.game?.placeholder || '';
  return src ? (
    <img
      src={src}
      alt=""
      crossOrigin="anonymous"
      className={className}
      onError={(event) => {
        if (event.currentTarget.dataset.fallbackApplied === 'true') return;
        const fallback = champion?.game?.portraitFallback || champion?.game?.placeholder || '';
        if (fallback) {
          event.currentTarget.dataset.fallbackApplied = 'true';
          event.currentTarget.src = fallback;
        }
      }}
    />
  ) : (
    <div className={`${className} timeline-share-cover-fallback`}>{champion?.game?.name?.charAt(0) || '?'}</div>
  );
}

function ChampionShareSurface({ champion }) {
  const share = champion?.totalPeriodMinutes > 0
    ? Math.round((champion.minutes / champion.totalPeriodMinutes) * 100)
    : 0;
  return (
    <div className="timeline-share-surface timeline-share-champion">
      <div className="timeline-share-brand"><Trophy size={28} /> GamePilot · Hall of Champions</div>
      <div className="timeline-share-champion-cover"><ShareCover champion={champion} /></div>
      <div className="timeline-share-period">{formatPeriodLabel(champion.period, champion.periodKey)} · {champion.period} champion</div>
      <h2>{champion.game?.name}</h2>
      <div className="timeline-share-stat-grid">
        <div><strong>{formatDetailedDuration(champion.minutes)}</strong><span>played</span></div>
        <div><strong>{champion.sessionCount}</strong><span>sessions</span></div>
        <div><strong>{formatDetailedDuration(champion.longestSessionMinutes)}</strong><span>longest sitting</span></div>
        <div><strong>{share}%</strong><span>of period play</span></div>
      </div>
      {champion.personaSnapshot?.label && <p>{champion.personaSnapshot.label}</p>}
      <small>{formatDetailedDuration(champion.totalPeriodMinutes)} across {champion.totalPeriodSessions || champion.sessionCount} total sessions · Built locally with GamePilot</small>
    </div>
  );
}

function CollectionShareSurface({ entries, label }) {
  return (
    <div className="timeline-share-surface timeline-share-collection">
      <div className="timeline-share-brand"><Trophy size={28} /> GamePilot · Hall of Champions</div>
      <h2>{label}</h2>
      <p>{entries.length} period{entries.length === 1 ? '' : 's'} in my gaming history</p>
      <div className="timeline-share-collection-grid">
        {entries.map((champion) => (
          <div key={`${champion.period}-${champion.periodKey}`} className="timeline-share-collection-card">
            <div><ShareCover champion={champion} /></div>
            <span>{formatPeriodLabel(champion.period, champion.periodKey)}</span>
            <strong>{champion.game?.name}</strong>
            <small>{formatDetailedDuration(champion.minutes)} · {champion.sessionCount} sessions</small>
          </div>
        ))}
      </div>
      <footer>My gaming history, tracked locally with GamePilot</footer>
    </div>
  );
}

function YearBoardShareSurface({ year, yearChampion, monthlyChampions }) {
  return (
    <div className="timeline-share-surface timeline-share-year-board">
      <div className="timeline-share-brand"><Trophy size={28} /> GamePilot · My Gaming Year</div>
      <h2>{year}</h2>
      {yearChampion && (
        <div className="timeline-share-year-winner">
          <div><ShareCover champion={yearChampion} /></div>
          <section>
            <span>Game of the year</span>
            <strong>{yearChampion.game?.name}</strong>
            <p>{formatDetailedDuration(yearChampion.minutes)} · {yearChampion.sessionCount} sessions · longest {formatDetailedDuration(yearChampion.longestSessionMinutes)}</p>
          </section>
        </div>
      )}
      <div className="timeline-share-month-grid">
        {monthlyChampions.map((champion) => (
          <div key={champion.periodKey} className="timeline-share-month-card">
            <div><ShareCover champion={champion} /></div>
            <span>{formatPeriodLabel('month', champion.periodKey)}</span>
            <strong>{champion.game?.name}</strong>
            <small>{formatDetailedDuration(champion.minutes)} · {champion.sessionCount} sessions</small>
          </div>
        ))}
      </div>
      <footer>The games that defined my {year} · Built locally with GamePilot</footer>
    </div>
  );
}

function Timeline({ library = [] }) {
  const [filter, setFilter] = useState('all');
  const [, setRefreshKey] = useState(0);
  const [shareState, setShareState] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const shareSurfaceRef = useRef(null);

  // Auto-lock past periods on mount so the timeline is up to date.
  React.useEffect(() => {
    try {
      PeriodChampionService.lockChampionsIfNeeded({ library });
      setRefreshKey((k) => k + 1);
    } catch { /* ignore */ }
  }, [library]);

  const timeline = filter === 'all'
    ? PeriodChampionService.getFullTimeline({ library })
    : PeriodChampionService.getAllChampions(filter, { library });

  const allChampions = PeriodChampionService.getFullTimeline({ library });
  const stats = {
    totalWeeks: allChampions.filter((c) => c.period === 'week').length,
    totalMonths: allChampions.filter((c) => c.period === 'month').length,
    totalYears: allChampions.filter((c) => c.period === 'year').length,
    totalMinutes: allChampions.reduce((sum, c) => sum + (c.minutes || 0), 0),
    uniqueGames: new Set(allChampions.map((c) => c.game?.name).filter(Boolean)).size,
  };

  const hasAny = timeline.length > 0;
  const groups = useMemo(() => {
    if (filter !== 'all') {
      return [{
        period: filter,
        title: filter === 'week' ? 'Weekly champions' : filter === 'month' ? 'Monthly champions' : 'Yearly champions',
        entries: timeline,
      }];
    }
    return [
      { period: 'year', title: 'Yearly champions', entries: timeline.filter((entry) => entry.period === 'year') },
      { period: 'month', title: 'Monthly champions', entries: timeline.filter((entry) => entry.period === 'month') },
      { period: 'week', title: 'Your year in weeks', entries: timeline.filter((entry) => entry.period === 'week') },
    ].filter((group) => group.entries.length > 0);
  }, [filter, timeline]);

  const championYears = allChampions.map(getChampionYear).filter(Boolean);
  const latestYear = championYears.length > 0 ? Math.max(...championYears) : new Date().getFullYear();
  const yearChampion = allChampions.find((entry) => entry.period === 'year' && getChampionYear(entry) === latestYear)
    || allChampions.filter((entry) => getChampionYear(entry) === latestYear).sort((a, b) => b.minutes - a.minutes)[0]
    || null;
  const monthlyChampions = allChampions
    .filter((entry) => entry.period === 'month' && getChampionYear(entry) === latestYear)
    .sort((a, b) => String(a.periodKey).localeCompare(String(b.periodKey)));
  const collectionLabel = filter === 'all'
    ? 'complete Hall of Champions'
    : filter === 'week'
      ? 'weekly'
      : filter === 'month'
        ? 'monthly'
        : 'yearly';

  const showStatus = useCallback((message) => {
    setStatusMessage(message);
    window.setTimeout(() => setStatusMessage(''), 3500);
  }, []);

  const captureShareSurface = useCallback(async (type, payload) => {
    setIsCapturing(true);
    setShareState({ type, payload });
    try {
      await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
      if (!shareSurfaceRef.current) return null;
      const images = [...shareSurfaceRef.current.querySelectorAll('img')];
      await Promise.race([
        Promise.all(images.map((image) => image.complete
          ? Promise.resolve()
          : new Promise((resolve) => {
              image.addEventListener('load', resolve, { once: true });
              image.addEventListener('error', resolve, { once: true });
            }))),
        new Promise((resolve) => window.setTimeout(resolve, 2500)),
      ]);
      const canvas = await html2canvas(shareSurfaceRef.current, {
        scale: 1,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#0b1020',
        logging: false,
        width: shareSurfaceRef.current.scrollWidth,
        height: shareSurfaceRef.current.scrollHeight,
      });
      return await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    } catch (error) {
      console.error('Failed to create Hall of Champions share image:', error);
      showStatus('Could not create the share image.');
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, [showStatus]);

  const getShareDetails = (type, payload) => {
    if (type === 'champion') {
      return {
        caption: buildChampionCaption(payload),
        filename: `gamepilot-${payload.period}-champion-${payload.periodKey}.png`,
      };
    }
    if (type === 'year') {
      const names = [...new Set(payload.monthlyChampions.map((entry) => entry.game?.name).filter(Boolean))];
      return {
        caption: [
          `My GamePilot gaming year ${payload.year}`,
          payload.yearChampion ? `Game of the year: ${payload.yearChampion.game?.name} — ${formatDetailedDuration(payload.yearChampion.minutes)} across ${payload.yearChampion.sessionCount} sessions.` : '',
          names.length > 0 ? `Monthly champions: ${names.join(', ')}` : '',
          '#GamePilot #GamingStats',
        ].filter(Boolean).join('\n'),
        filename: `gamepilot-champions-${payload.year}.png`,
      };
    }
    return {
      caption: buildCollectionCaption(payload.entries, payload.label),
      filename: `gamepilot-${filter}-champions.png`,
    };
  };

  const saveBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const shareMenuProps = (type, payload) => {
    const details = getShareDetails(type, payload);
    const capture = () => captureShareSurface(type, payload);
    return {
      imageAvailable: true,
      disabled: isCapturing,
      buildCaption: () => details.caption,
      onCopyText: async (text = null) => {
        const success = await LocalShareService.copyTextToClipboard(text || details.caption);
        showStatus(success ? 'Share text copied.' : 'Could not copy share text.');
        return success;
      },
      onCopyImage: async () => {
        const blob = await capture();
        if (!blob) return false;
        const result = await LocalShareService.copyImageToClipboard(blob, details.filename);
        showStatus(result.success ? 'Share image copied.' : result.message || 'Could not copy image.');
        return result.success;
      },
      onSaveImage: async () => {
        const blob = await capture();
        if (!blob) return;
        saveBlob(blob, details.filename);
        showStatus('Share image saved.');
      },
      onShareText: async (channel, text = null) => {
        const result = await LocalShareService.openShareIntent(channel, text || details.caption);
        showStatus(result.success ? `Opened ${result.label}.` : result.message || 'Could not open share.');
      },
      onShareToDiscord: async (text = null) => {
        const blob = await capture();
        const result = await LocalShareService.shareToDiscord({ imageBlob: blob, text: text || details.caption, filename: details.filename });
        showStatus(result.success ? 'Discord opened with your champion share.' : result.message || 'Could not share to Discord.');
      },
      onShareToMessenger: async (text = null) => {
        const blob = await capture();
        const result = await LocalShareService.shareToMessenger({ imageBlob: blob, text: text || details.caption, filename: details.filename });
        showStatus(result.success ? 'Messenger opened with your champion share.' : result.message || 'Could not share to Messenger.');
      },
      onDownloadText: (text = null) => LocalShareService.downloadShareText(text || details.caption, details.filename.replace('.png', '.txt')),
      onNativeShare: async (text = null) => {
        const blob = await capture();
        const files = blob ? [new File([blob], details.filename, { type: 'image/png' })] : [];
        const result = await LocalShareService.shareWithNativeShare({ title: 'GamePilot Hall of Champions', text: text || details.caption, files });
        showStatus(result.success ? 'Shared successfully.' : result.message || 'Could not share.');
      },
    };
  };

  return (
    <div className="timeline-page">
      <NavBar />
      <div className="timeline-container">
        <div className="timeline-header">
          <h1 className="timeline-title">
            <Trophy size={28} className="timeline-title-icon" />
            Hall of Champions
          </h1>
          <p className="timeline-subtitle">
            Your most-played game each week, month, and year — a permanent log of where your hours went.
          </p>
          {hasAny && (
            <div className="timeline-share-actions">
              <ShareMenu
                {...shareMenuProps('collection', { entries: timeline, label: collectionLabel })}
                triggerLabel={filter === 'all' ? 'Share Hall' : `Share ${collectionLabel}`}
              />
              {(yearChampion || monthlyChampions.length > 0) && (
                <ShareMenu
                  {...shareMenuProps('year', { year: latestYear, yearChampion, monthlyChampions })}
                  triggerLabel={`Share ${latestYear} board`}
                />
              )}
            </div>
          )}
          {statusMessage && <div className="timeline-share-status" role="status">{statusMessage}</div>}
        </div>

        {hasAny && (
          <div className="timeline-stats-row">
            <div className="timeline-stat">
              <span className="timeline-stat-number">{stats.totalWeeks}</span>
              <span className="timeline-stat-label">Weeks logged</span>
            </div>
            <div className="timeline-stat">
              <span className="timeline-stat-number">{stats.totalMonths}</span>
              <span className="timeline-stat-label">Months logged</span>
            </div>
            <div className="timeline-stat">
              <span className="timeline-stat-number">{stats.totalYears}</span>
              <span className="timeline-stat-label">Years logged</span>
            </div>
            <div className="timeline-stat">
              <span className="timeline-stat-number">{stats.uniqueGames}</span>
              <span className="timeline-stat-label">Unique champions</span>
            </div>
            <div className="timeline-stat">
              <span className="timeline-stat-number">{formatChampionHours(stats.totalMinutes)}</span>
              <span className="timeline-stat-label">Total champion hours</span>
            </div>
          </div>
        )}

        <div className="timeline-filters">
          {PERIOD_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              className={`timeline-filter-btn ${filter === f.value ? 'active' : ''}`}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {!hasAny ? (
          <div className="timeline-empty">
            <Trophy size={48} className="timeline-empty-icon" />
            <h2 className="timeline-empty-title">No champions yet</h2>
            <p className="timeline-empty-text">
              Play a few sessions and GamePilot will start logging your most-played game each week.
              Come back here to see your full history — a permanent timeline of where your hours went.
            </p>
          </div>
        ) : (
          <div className="timeline-sections">
            {groups.map((group) => (
              <section key={group.period} className={`timeline-period-section timeline-period-${group.period}`}>
                <div className="timeline-section-heading">
                  <h2>{group.title}</h2>
                  <span>{group.entries.length} period{group.entries.length === 1 ? '' : 's'}</span>
                </div>
                <div className="timeline-cover-grid">
                  {group.entries.map((champion) => {
                    const PeriodIcon = PERIOD_ICONS[champion.period] || Calendar;
                    const color = PERIOD_COLORS[champion.period] || '#8ab4f8';
                    const portrait = champion.game?.portrait || null;
                    const portraitFallback = champion.game?.portraitFallback || null;
                    const placeholder = champion.game?.placeholder || null;
                    const isLive = !champion.lockedAt;
                    return (
                      <article key={`${champion.period}-${champion.periodKey}`} className="timeline-cover-card">
                        <div className="timeline-cover-art">
                          {portrait ? (
                            <LazyImage
                              src={portrait}
                              alt={`${champion.game.name} cover`}
                              fallbackSrc={portraitFallback}
                              placeholder={placeholder}
                              gameName={champion.game.name}
                              platform={champion.game.platform}
                              className="timeline-cover-image"
                            />
                          ) : (
                            <div className="timeline-cover-placeholder">
                              <span>{champion.game.name?.charAt(0)?.toUpperCase() || '?'}</span>
                              <small>{champion.game.name}</small>
                            </div>
                          )}
                          <div className="timeline-cover-shade" />
                          <div className="timeline-cover-period" style={{ backgroundColor: color }}>
                            <PeriodIcon size={12} />
                            {formatPeriodLabel(champion.period, champion.periodKey)}
                          </div>
                          {isLive && <span className="timeline-cover-live">Live</span>}
                          <div className="timeline-cover-hours">
                            <Clock size={13} />
                            {formatChampionHours(champion.minutes)}
                          </div>
                        </div>
                        <div className="timeline-cover-details">
                          <h3 title={champion.game.name}>{champion.game.name}</h3>
                          <div className="timeline-cover-stats">
                            <div>
                              <strong>{formatDetailedDuration(champion.minutes)}</strong>
                              <span>{champion.sessionCount} session{champion.sessionCount === 1 ? '' : 's'}</span>
                            </div>
                            <div>
                              <strong>{formatDetailedDuration(champion.longestSessionMinutes)}</strong>
                              <span>longest session</span>
                            </div>
                            <div>
                              <strong>{champion.totalPeriodMinutes > 0 ? `${Math.round((champion.minutes / champion.totalPeriodMinutes) * 100)}%` : '—'}</strong>
                              <span>of period play</span>
                            </div>
                          </div>
                          {champion.longestSessionAt && (
                            <div className="timeline-cover-longest-date">Longest sitting · {formatSessionDay(champion.longestSessionAt)}</div>
                          )}
                          <div className="timeline-cover-period-total">
                            {formatDetailedDuration(champion.totalPeriodMinutes)} across {champion.totalPeriodSessions || champion.sessionCount} total sessions · {champion.periodGameCount || 1} game{champion.periodGameCount === 1 ? '' : 's'}
                          </div>
                          {champion.personaSnapshot?.label && (
                            <div className="timeline-cover-persona">{champion.personaSnapshot.label}</div>
                          )}
                          {champion.runnerUp && (
                            <div className="timeline-cover-runner">
                              Beat {champion.runnerUp.name} by {formatChampionHours(Math.max(0, champion.minutes - champion.runnerUp.minutes))}
                            </div>
                          )}
                          <div className="timeline-card-share">
                            <ShareMenu {...shareMenuProps('champion', champion)} triggerLabel="Share pick" />
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
      <div className="timeline-share-render-root" aria-hidden="true">
        <div ref={shareSurfaceRef}>
          {shareState?.type === 'champion' && <ChampionShareSurface champion={shareState.payload} />}
          {shareState?.type === 'collection' && (
            <CollectionShareSurface entries={shareState.payload.entries} label={shareState.payload.label} />
          )}
          {shareState?.type === 'year' && (
            <YearBoardShareSurface
              year={shareState.payload.year}
              yearChampion={shareState.payload.yearChampion}
              monthlyChampions={shareState.payload.monthlyChampions}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default Timeline;
