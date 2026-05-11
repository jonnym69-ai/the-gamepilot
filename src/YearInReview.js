import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { Award, Calendar, Clock, Crown, Download, Gamepad2, Image, Target, TrendingUp, Trophy } from 'lucide-react';
import NavBar from './NavBar';
import { AchievementTracker } from './AchievementSystem';
import { YearInReviewService } from './services/YearInReviewService';
import { getEmptyLibraryFallback } from './services/EmptyLibraryFallbackData';
import StorageService from './services/StorageService';
import { YearInReviewShareCard, SHARE_CARD_SIZE_PX } from './components/YearInReviewShareCard';
import './YearInReview.css';

const SUPPORT_TIER_WEIGHT = {
  Bronze: 1,
  Silver: 2,
  Gold: 3,
  Platinum: 4
};

const resolveHighestSupportTier = (tiers = []) => {
  return tiers
    .filter((tier) => typeof tier === 'string')
    .sort((left, right) => (SUPPORT_TIER_WEIGHT[right] || 0) - (SUPPORT_TIER_WEIGHT[left] || 0))[0] || null;
};

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
  const shareCardRef = useRef(null);
  const noticeTimeoutRef = useRef(null);
  const availableYears = useMemo(() => YearInReviewService.getAvailableYears(library || []), [library]);
  const [selectedYear, setSelectedYear] = useState(() => availableYears[0] || new Date().getFullYear());
  const [statusMessage, setStatusMessage] = useState('');
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [isExportingShare, setIsExportingShare] = useState(false);
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

  const founderProfile = useMemo(() => {
    const savedUsername = StorageService.getString('profileUsername', '');
    const userFounders = StorageService.get('userFounders', []);

    const localFounder = userFounders.find((founder) => founder.name?.toLowerCase() === savedUsername.trim().toLowerCase()) || null;
    const boostTier = AchievementTracker.getPatreonBoostProfile().tier || null;
    const tier = resolveHighestSupportTier([localFounder?.tier, boostTier]);

    return {
      name: savedUsername || 'Pilot',
      tier,
      isFounder: Boolean(tier)
    };
  }, []);

  const maxMonthlyHours = useMemo(() => {
    const values = Object.values(snapshot.monthly?.playtimeHours || {});
    return Math.max(1, ...values);
  }, [snapshot.monthly]);

  const standoutMonth = useMemo(() => Object.entries(snapshot.monthly?.playtimeHours || {})
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0] || null, [snapshot.monthly]);

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
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `gamepilot-year-in-review-${selectedYear}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showStatus(`Year in Review image exported for ${selectedYear}.`);
    } catch (error) {
      console.error('Failed to export Year in Review image:', error);
      showStatus('Could not export Year in Review image.');
    } finally {
      setIsExportingImage(false);
    }
  }, [selectedYear, showStatus]);

  const handleExportShareCard = useCallback(async () => {
    if (!shareCardRef.current) {
      showStatus('Share card not ready yet.');
      return;
    }
    setIsExportingShare(true);
    try {
      const canvas = await html2canvas(shareCardRef.current, {
        width: SHARE_CARD_SIZE_PX,
        height: SHARE_CARD_SIZE_PX,
        windowWidth: SHARE_CARD_SIZE_PX,
        windowHeight: SHARE_CARD_SIZE_PX,
        scale: 1,
        useCORS: true,
        backgroundColor: '#0d1224',
        logging: false
      });
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) {
        throw new Error('Share card export returned an empty blob.');
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `gamepilot-share-${selectedYear}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showStatus(`Share card saved for ${selectedYear}.`);
    } catch (error) {
      console.error('Failed to export share card:', error);
      showStatus('Could not export share card.');
    } finally {
      setIsExportingShare(false);
    }
  }, [selectedYear, showStatus]);

  return (
    <div className="year-review-page">
      <NavBar />
      <div className={`year-review-shell ${founderProfile.isFounder ? `year-review-shell-founder year-review-shell-founder-${founderProfile.tier.toLowerCase()}` : ''}`}>
        <header className="year-review-hero">
          <div className="year-review-hero-copy">
            <span className="year-review-kicker">Local recap</span>
            <h1>Year in Review</h1>
            <p>
              Revisit your top games, session rhythms, achievement moments, and progression milestones for the year.
              Everything on this page is generated from your local GamePilot data.
            </p>
            {founderProfile.isFounder && (
              <div className={`year-review-founder-stamp year-review-founder-stamp-${founderProfile.tier.toLowerCase()}`}>
                <Crown size={16} />
                <span>{founderProfile.tier} Founder Edition · {founderProfile.name}</span>
              </div>
            )}
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
              <button
                type="button"
                onClick={handleExportShareCard}
                disabled={isExportingShare || !snapshot?.hasData}
                title="Save a 1080x1080 image perfect for sharing"
              >
                <Image size={16} />
                <span>{isExportingShare ? 'Saving...' : 'Save share image'}</span>
              </button>
              <button type="button" onClick={handleExportImage} disabled={isExportingImage}>
                <Download size={16} />
                <span>{isExportingImage ? 'Exporting...' : 'Export full recap'}</span>
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

        <div ref={exportRef} className={`year-review-export-surface ${founderProfile.isFounder ? `year-review-export-surface-founder year-review-export-surface-founder-${founderProfile.tier.toLowerCase()}` : ''}`}>
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

              <section className="year-review-deep-stats-grid">
                <article className="year-review-deep-stat-card year-review-deep-stat-featured">
                  <span>Longest session</span>
                  <strong>{snapshot.deepStats?.longestSession?.gameName || '—'}</strong>
                  <p>
                    {snapshot.deepStats?.longestSession
                      ? `${formatPlaytime(snapshot.deepStats.longestSession.playtimeMinutes)} on ${snapshot.deepStats.longestSession.dateLabel || 'your biggest play day'}`
                      : 'Finish a tracked session to reveal your biggest single sitting.'}
                  </p>
                </article>
                <article className="year-review-deep-stat-card">
                  <span>Busiest day</span>
                  <strong>{snapshot.deepStats?.busiestDay?.dateLabel || '—'}</strong>
                  <p>
                    {snapshot.deepStats?.busiestDay
                      ? `${formatPlaytime(snapshot.deepStats.busiestDay.playtimeMinutes)} across ${snapshot.deepStats.busiestDay.sessions} sessions`
                      : 'Your most active day will appear here.'}
                  </p>
                </article>
                <article className="year-review-deep-stat-card">
                  <span>Most returned to</span>
                  <strong>{snapshot.deepStats?.topBySessions?.name || '—'}</strong>
                  <p>
                    {snapshot.deepStats?.topBySessions
                      ? `${snapshot.deepStats.topBySessions.sessions} sessions · ${formatPlaytime(snapshot.deepStats.topBySessions.totalPlaytime)}`
                      : 'The game you kept coming back to will appear here.'}
                  </p>
                </article>
                <article className="year-review-deep-stat-card">
                  <span>Late-night runs</span>
                  <strong>{snapshot.deepStats?.lateNightSessions || 0}</strong>
                  <p>{formatPlaytime(snapshot.deepStats?.lateNightPlaytimeMinutes || 0)} played after-hours.</p>
                </article>
                <article className="year-review-deep-stat-card">
                  <span>Weekend play</span>
                  <strong>{snapshot.deepStats?.weekendSessions || 0}</strong>
                  <p>{formatPlaytime(snapshot.deepStats?.weekendPlaytimeMinutes || 0)} logged on weekends.</p>
                </article>
                <article className="year-review-deep-stat-card">
                  <span>Repeat games</span>
                  <strong>{snapshot.deepStats?.gamesWithMultipleSessions || 0}</strong>
                  <p>Games with more than one session this year.</p>
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
                      <span>Quests completed</span>
                      <strong>{snapshot.achievements.questsCompletedThisYear}</strong>
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

        {/* Offscreen share card — rasterised on demand by handleExportShareCard.
            Kept in the DOM (not display:none) so html2canvas can read its layout. */}
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            top: 0,
            left: -99999,
            pointerEvents: 'none',
            opacity: 0
          }}
        >
          <div ref={shareCardRef}>
            <YearInReviewShareCard
              snapshot={snapshot}
              year={selectedYear}
              username={founderProfile.name}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default YearInReview;