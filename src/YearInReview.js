import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { Award, Calendar, Clock, Download, FileText, Gamepad2, Image, Target, TrendingUp, Trophy } from 'lucide-react';
import NavBar from './NavBar';
import { DataExportService } from './services/DataExportService';
import { YearInReviewService } from './services/YearInReviewService';
import { getEmptyLibraryFallback } from './services/EmptyLibraryFallbackData';
import './YearInReview.css';

const formatPlaytime = (minutes) => {
  const safeMinutes = Math.max(0, Math.round(Number(minutes) || 0));
  if (safeMinutes < 60) {
    return `${safeMinutes}m`;
  }
  const hours = safeMinutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1).replace(/\.0$/, '')}h`;
};

const formatStamp = (value) => {
  if (!value) {
    return 'Just now';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Just now'
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const SkeletonCard = () => (
  <div className="skeleton-card">
    <div className="skeleton-header">
      <div className="skeleton-icon" />
      <div className="skeleton-title" />
    </div>
    <div className="skeleton-content">
      <div className="skeleton-line" />
      <div className="skeleton-line short" />
      <div className="skeleton-line" />
    </div>
  </div>
);

function YearInReview({ library = [], theme, onLaunchGame, activeSessions = {}, endSession, getPlaytimeStats, getMostPlayedGames }) {
  const exportRef = useRef(null);
  const noticeTimeoutRef = useRef(null);
  const availableYears = useMemo(() => YearInReviewService.getAvailableYears(library || []), [library]);
  const [selectedYear, setSelectedYear] = useState(() => availableYears[0] || new Date().getFullYear());
  const [statusMessage, setStatusMessage] = useState('');
  const [isExportingImage, setIsExportingImage] = useState(false);
  const isLoading = false;

  useEffect(() => {
    if (!availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0] || new Date().getFullYear());
    }
  }, [availableYears, selectedYear]);

  useEffect(() => () => {
    if (noticeTimeoutRef.current) {
      window.clearTimeout(noticeTimeoutRef.current);
    }
  }, []);

  const showStatus = useCallback((message) => {
    setStatusMessage(message);
    if (noticeTimeoutRef.current) {
      window.clearTimeout(noticeTimeoutRef.current);
    }
    noticeTimeoutRef.current = window.setTimeout(() => setStatusMessage(''), 4000);
  }, []);

  const snapshot = useMemo(
    () => YearInReviewService.getYearSnapshot(library || getEmptyLibraryFallback(), selectedYear),
    [library, selectedYear]
  );

  const maxMonthlyHours = useMemo(() => {
    const values = Object.values(snapshot.monthly?.playtimeHours || {});
    return Math.max(1, ...values);
  }, [snapshot.monthly]);

  const standoutMonth = useMemo(() => Object.entries(snapshot.monthly?.playtimeHours || {})
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0] || null, [snapshot.monthly]);

  const handleExportJson = useCallback(() => {
    try {
      const payload = YearInReviewService.buildExportPayload(library || getEmptyLibraryFallback(), selectedYear);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      DataExportService.downloadFile(blob, `gamepilot-year-in-review-${selectedYear}.json`);
      showStatus(`Year in Review JSON exported for ${selectedYear}.`);
    } catch (error) {
      console.error('Failed to export Year in Review JSON:', error);
      showStatus('Could not export Year in Review JSON.');
    }
  }, [library, selectedYear, showStatus]);

  const handleExportImage = useCallback(async () => {
    if (!exportRef.current) {
      showStatus('Could not find the recap surface to export.');
      return;
    }

    setIsExportingImage(true);
    try {
      const canvas = await html2canvas(exportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: getComputedStyle(document.body).backgroundColor || '#0f172a',
        logging: false
      });
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) {
        throw new Error('Canvas export returned an empty blob.');
      }
      DataExportService.downloadFile(blob, `gamepilot-year-in-review-${selectedYear}.png`);
      showStatus(`Year in Review image exported for ${selectedYear}.`);
    } catch (error) {
      console.error('Failed to export Year in Review image:', error);
      showStatus('Could not export Year in Review image.');
    } finally {
      setIsExportingImage(false);
    }
  }, [selectedYear, showStatus]);

  return (
    <div className="year-review-page">
      <NavBar />
      <div className="year-review-shell">
        <header className="year-review-hero">
          <div className="year-review-hero-copy">
            <span className="year-review-kicker">Local recap</span>
            <h1>Year in Review</h1>
            <p>
              Revisit your top games, session rhythms, achievement moments, and progression milestones for the year.
              Everything on this page is generated from your local GamePilot data.
            </p>
          </div>
          <div className="year-review-controls">
            <label className="year-review-year-picker">
              <span>Review year</span>
              <select value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))}>
                {availableYears.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </label>
            <div className="year-review-actions">
              <button type="button" onClick={handleExportImage} disabled={isExportingImage}>
                <Image size={16} />
                <span>{isExportingImage ? 'Exporting...' : 'Export PNG'}</span>
              </button>
              <button type="button" onClick={handleExportJson}>
                <FileText size={16} />
                <span>Export JSON</span>
              </button>
            </div>
          </div>
        </header>

        {statusMessage && (
          <div className="year-review-status">
            <Download size={16} />
            <span>{statusMessage}</span>
          </div>
        )}

        <div ref={exportRef} className="year-review-export-surface">
          <section className="year-review-summary-grid">
            {isLoading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : (
              snapshot.summaryCards.map((card) => (
                <article key={card.id} className="year-review-summary-card">
                  <span className="summary-card-title">{card.title}</span>
                  <strong>{card.value}</strong>
                  <p>{card.detail}</p>
                </article>
              ))
            )}
          </section>

          {!snapshot.hasData ? (
            <section className="year-review-empty-state">
              <Trophy size={28} />
              <h2>No completed sessions logged for {selectedYear}</h2>
              <p>
                Start and finish a few gaming sessions to generate a recap for this year. The page will fill in automatically as your local history grows.
              </p>
            </section>
          ) : (
            <>
              <section className="year-review-highlights-row">
                <article className="year-review-mini-card">
                  <Clock size={18} />
                  <div>
                    <span>Playtime</span>
                    <strong>{formatPlaytime(snapshot.summary.playtimeMinutes)}</strong>
                  </div>
                </article>
                <article className="year-review-mini-card">
                  <Gamepad2 size={18} />
                  <div>
                    <span>Sessions</span>
                    <strong>{snapshot.summary.sessions}</strong>
                  </div>
                </article>
                <article className="year-review-mini-card">
                  <Calendar size={18} />
                  <div>
                    <span>Active days</span>
                    <strong>{snapshot.summary.activeDays}</strong>
                  </div>
                </article>
                <article className="year-review-mini-card">
                  <Target size={18} />
                  <div>
                    <span>Avg session</span>
                    <strong>{formatPlaytime(snapshot.summary.avgSessionMinutes)}</strong>
                  </div>
                </article>
              </section>

              <section className="year-review-main-grid">
                <article className="year-review-panel year-review-persona-panel">
                  <div className="panel-heading">
                    <div>
                      <h2><Award size={20} /> Player Identity</h2>
                      <p>Your local play profile for {selectedYear}.</p>
                    </div>
                  </div>
                  <div className="identity-badge">
                    <strong>{snapshot.persona.identityLabel}</strong>
                    <span>{snapshot.persona.identityDescription}</span>
                  </div>
                  <div className="identity-grid">
                    <div>
                      <span>Top mood</span>
                      <strong>{snapshot.persona.dominantMood || '—'}</strong>
                    </div>
                    <div>
                      <span>Top genre</span>
                      <strong>{snapshot.persona.dominantGenre || '—'}</strong>
                    </div>
                    <div>
                      <span>Session style</span>
                      <strong>{snapshot.persona.preferredSessionLabel}</strong>
                    </div>
                    <div>
                      <span>Peak window</span>
                      <strong>{snapshot.persona.peakPlayWindow || '—'}</strong>
                    </div>
                  </div>
                  {snapshot.evolution && (
                    <div className="identity-arc">
                      <div>
                        <span>Opening stretch</span>
                        <strong>{snapshot.evolution.opening.identityLabel}</strong>
                      </div>
                      <div>
                        <span>Final stretch</span>
                        <strong>{snapshot.evolution.closing.identityLabel}</strong>
                      </div>
                      <p>{snapshot.evolution.summary}</p>
                    </div>
                  )}
                </article>

                <article className="year-review-panel year-review-timeline-panel">
                  <div className="panel-heading">
                    <div>
                      <h2><TrendingUp size={20} /> Monthly Rhythm</h2>
                      <p>{standoutMonth ? `${standoutMonth[0]} led the year with ${standoutMonth[1]} hours logged.` : 'Monthly playtime totals.'}</p>
                    </div>
                  </div>
                  <div className="month-bars">
                    {Object.entries(snapshot.monthly.playtimeHours).map(([month, hours]) => (
                      <div key={month} className="month-bar-row">
                        <div className="month-bar-labels">
                          <span>{month}</span>
                          <strong>{hours}h</strong>
                        </div>
                        <div className="month-bar-track">
                          <div className="month-bar-fill" style={{ width: `${Math.max((hours / maxMonthlyHours) * 100, hours > 0 ? 8 : 0)}%` }} />
                        </div>
                        <small>{snapshot.monthly.sessionCounts[month]} sessions</small>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="year-review-panel year-review-achievements-panel">
                  <div className="panel-heading">
                    <div>
                      <h2><Trophy size={20} /> Achievement Moments</h2>
                      <p>
                        {snapshot.achievements.historyAvailable
                          ? `${snapshot.achievements.trackedUnlocksThisYear} tracked unlocks landed this year.`
                          : 'Recent unlock highlights will fill in as achievement history accumulates.'}
                      </p>
                    </div>
                  </div>
                  <div className="achievement-summary-strip">
                    <div>
                      <span>Tracked this year</span>
                      <strong>{snapshot.achievements.trackedUnlocksThisYear}</strong>
                    </div>
                    <div>
                      <span>Total unlocked</span>
                      <strong>{snapshot.achievements.totalUnlocked}</strong>
                    </div>
                    <div>
                      <span>Completion</span>
                      <strong>{snapshot.achievements.completionPercentage}%</strong>
                    </div>
                  </div>
                  <div className="achievement-highlight-list">
                    {snapshot.achievements.highlights.length > 0 ? snapshot.achievements.highlights.map((entry) => (
                      <div key={`${entry.id}-${entry.unlockedAt}`} className="achievement-highlight-row">
                        <div className="achievement-highlight-icon">{entry.icon || '🏆'}</div>
                        <div className="achievement-highlight-copy">
                          <strong>{entry.name}</strong>
                          <span>{entry.rarity || 'Milestone'} · {entry.xp ? `${entry.xp} XP` : 'Achievement unlocked'}</span>
                        </div>
                        <small>{formatStamp(entry.unlockedAt)}</small>
                      </div>
                    )) : (
                      <div className="achievement-highlight-empty">
                        Complete more tracked milestones to build out your unlock timeline.
                      </div>
                    )}
                  </div>
                </article>

                <article className="year-review-panel year-review-breakdown-panel">
                  <div className="panel-heading">
                    <div>
                      <h2><Calendar size={20} /> Your Mix</h2>
                      <p>Platform, mood, and genre signals that shaped the year.</p>
                    </div>
                  </div>
                  <div className="mix-columns">
                    <div>
                      <span>Platforms</span>
                      <ul>
                        {snapshot.distributions.topPlatforms.map((entry) => (
                          <li key={entry.label}>
                            <strong>{entry.label}</strong>
                            <span>{entry.count} sessions</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span>Moods</span>
                      <ul>
                        {snapshot.distributions.topMoods.map((entry) => (
                          <li key={entry.label}>
                            <strong>{entry.label}</strong>
                            <span>{entry.count} sessions</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span>Genres</span>
                      <ul>
                        {snapshot.distributions.topGenres.map((entry) => (
                          <li key={entry.label}>
                            <strong>{entry.label}</strong>
                            <span>{entry.count} sessions</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </article>

                <article className="year-review-panel year-review-progression-panel">
                  <div className="panel-heading">
                    <div>
                      <h2><Target size={20} /> Progression Snapshot</h2>
                      <p>Current unlock momentum connected to your play history.</p>
                    </div>
                  </div>
                  <div className="progression-headline">
                    <div>
                      <span>Current level</span>
                      <strong>Level {snapshot.progression.level}</strong>
                    </div>
                    <div>
                      <span>Total XP</span>
                      <strong>{snapshot.progression.xp.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span>Next unlock</span>
                      <strong>{snapshot.progression.nextUnlock?.name || 'All caught up'}</strong>
                    </div>
                  </div>
                  <div className="progression-groups">
                    {snapshot.progression.progressionGroups.map((group) => {
                      const percent = group.total > 0 ? Math.min((group.unlocked / group.total) * 100, 100) : 0;
                      return (
                        <div key={group.key} className="progression-group-row">
                          <div className="progression-group-labels">
                            <span>{group.label}</span>
                            <strong>{group.unlocked}/{group.total}</strong>
                          </div>
                          <div className="progression-group-track">
                            <div className="progression-group-fill" style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default YearInReview;