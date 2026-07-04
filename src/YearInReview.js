import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { Award, BookOpen, Calendar, Clock, Download, Gamepad2, Target, TrendingUp, Trophy } from 'lucide-react';
import NavBar from './NavBar';
import { YearInReviewService } from './services/YearInReviewService';
import { ProgressionUnlockService } from './services/ProgressionUnlockService';
import { getEmptyLibraryFallback } from './services/EmptyLibraryFallbackData';
import StorageService from './services/StorageService';
import { LocalShareService } from './services/LocalShareService';
import ProfileService from './services/ProfileService';
import { YearInReviewShareCard, SHARE_CARD_SIZE_PX } from './components/YearInReviewShareCard';
import { YearInReviewStoryShareCard } from './components/YearInReviewStoryShareCard';
import ShareMenu from './components/ShareMenu';
import { formatPlaytime } from './utils/formatPlaytime';
import { GamingStoryService } from './services/GamingStoryService';
import GamingStoryPanel from './components/GamingStoryPanel';
import './YearInReview.css';

const COLOR_FUNCTION_PATTERN = /\b(color\(|color-mix\()/i;

const normalizeCssColor = (value, fallback = '#0f172a') => {
  if (!value || typeof value !== 'string') {
    return fallback;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext('2d');
  if (!context) {
    return fallback;
  }

  context.fillStyle = fallback;

  try {
    context.fillStyle = value;
    return context.fillStyle || fallback;
  } catch (error) {
    return fallback;
  }
};

const sanitizeExportClone = (sourceRoot, clonedDocument) => {
  if (!sourceRoot || !clonedDocument) {
    return;
  }

  const clonedRoot = clonedDocument.querySelector('.year-review-export-surface');
  if (!clonedRoot) {
    return;
  }

  const rootStyles = getComputedStyle(document.documentElement);
  const accentColor = normalizeCssColor(rootStyles.getPropertyValue('--accent-color').trim(), '#7c3aed');
  const cardBackground = normalizeCssColor(rootStyles.getPropertyValue('--card-bg').trim(), '#111827');
  const inputBackground = normalizeCssColor(rootStyles.getPropertyValue('--input-bg').trim(), '#1f2937');
  const borderColor = normalizeCssColor(rootStyles.getPropertyValue('--card-border').trim(), 'rgba(255, 255, 255, 0.16)');
  const textColor = normalizeCssColor(rootStyles.getPropertyValue('--text-color').trim(), '#f8fafc');
  const founderGlow = normalizeCssColor(rootStyles.getPropertyValue('--year-review-founder-glow').trim(), 'rgba(251, 146, 60, 0.12)');

  const sourceElements = sourceRoot.querySelectorAll('*');
  const clonedElements = clonedRoot.querySelectorAll('*');

  clonedRoot.style.background = normalizeCssColor(getComputedStyle(document.body).backgroundColor, '#0f172a');
  clonedRoot.style.color = textColor;

  clonedRoot.querySelectorAll('.year-review-kicker').forEach((node) => {
    node.style.background = 'rgba(124, 58, 237, 0.16)';
    node.style.color = accentColor;
  });

  clonedRoot.querySelectorAll('.year-review-deep-stat-featured').forEach((node) => {
    node.style.background = `linear-gradient(135deg, ${accentColor}, ${inputBackground})`;
    node.style.borderColor = borderColor;
  });

  sourceElements.forEach((sourceElement, index) => {
    const clonedElement = clonedElements[index];
    if (!clonedElement) {
      return;
    }

    const computed = getComputedStyle(sourceElement);
    const backgroundImage = computed.backgroundImage || '';
    const backgroundColor = computed.backgroundColor || '';
    const color = computed.color || '';
    const borderTopColor = computed.borderTopColor || '';
    const boxShadow = computed.boxShadow || '';

    if (COLOR_FUNCTION_PATTERN.test(backgroundImage)) {
      clonedElement.style.backgroundImage = 'none';
      clonedElement.style.backgroundColor = normalizeCssColor(backgroundColor, cardBackground);
    }

    if (COLOR_FUNCTION_PATTERN.test(backgroundColor)) {
      clonedElement.style.backgroundColor = normalizeCssColor(backgroundColor, cardBackground);
    }

    if (COLOR_FUNCTION_PATTERN.test(color)) {
      clonedElement.style.color = normalizeCssColor(color, textColor);
    }

    if (COLOR_FUNCTION_PATTERN.test(borderTopColor)) {
      clonedElement.style.borderColor = normalizeCssColor(borderTopColor, borderColor);
    }

    if (COLOR_FUNCTION_PATTERN.test(boxShadow)) {
      clonedElement.style.boxShadow = `0 18px 35px rgba(0, 0, 0, 0.22)`;
    }
  });

  clonedRoot.querySelectorAll('.year-review-export-surface-founder').forEach((node) => {
    node.style.boxShadow = `0 0 36px ${founderGlow}`;
  });

  clonedRoot.querySelectorAll('.year-review-chapter').forEach((node) => {
    node.style.opacity = '1';
    node.style.animation = 'none';
  });
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
  const storySectionRef = useRef(null);
  const storyShareCardRef = useRef(null);
  const noticeTimeoutRef = useRef(null);
  const [isCapturingStory, setIsCapturingStory] = useState(false);
  const availableYears = useMemo(() => YearInReviewService.getAvailableYears(library || []), [library]);
  const [selectedYear, setSelectedYear] = useState(() => availableYears[0] || new Date().getFullYear());
  const yearlyStory = useMemo(() => GamingStoryService.generatePeriodStory('yearly'), []);
  const recapCustomization = useMemo(() => ProgressionUnlockService.getRecapCustomization(), []);
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

  const pilotName = useMemo(() => StorageService.getString('profileUsername', '') || 'Pilot', []);

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
        logging: false,
        onclone: (clonedDocument) => sanitizeExportClone(exportRef.current, clonedDocument)
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

  const handleCopyShareText = useCallback(async (text = null) => {
    const shareText = text || ProfileService.appendSocialLinksToShareText(LocalShareService.buildYearInReviewShareText(snapshot, selectedYear));
    const success = await LocalShareService.copyTextToClipboard(shareText);
    showStatus(success ? 'Share text copied to clipboard.' : 'Could not copy share text.');
    return success;
  }, [snapshot, selectedYear, showStatus]);

  const generateShareCardBlob = useCallback(async () => {
    if (!shareCardRef.current) {
      showStatus('Share card not ready yet.');
      return null;
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
      return blob;
    } catch (error) {
      console.error('Failed to generate share card:', error);
      showStatus('Could not generate share card.');
      return null;
    } finally {
      setIsExportingShare(false);
    }
  }, [showStatus]);

  const handleSaveShareCard = useCallback(async () => {
    const blob = await generateShareCardBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gamepilot-share-${selectedYear}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showStatus(`Share card saved for ${selectedYear}.`);
  }, [generateShareCardBlob, selectedYear, showStatus]);

  const handleCopyShareCardImage = useCallback(async () => {
    const blob = await generateShareCardBlob();
    if (!blob) return false;
    const result = await LocalShareService.copyImageToClipboard(blob, `gamepilot-share-${selectedYear}.png`);
    showStatus(result.success ? 'Image copied to clipboard.' : result.message || 'Could not copy image.');
    return result.success;
  }, [generateShareCardBlob, selectedYear, showStatus]);

  const handleShareToChannel = useCallback(async (channel, text = null) => {
    const shareText = text || ProfileService.appendSocialLinksToShareText(LocalShareService.buildYearInReviewShareText(snapshot, selectedYear));
    const result = await LocalShareService.openShareIntent(channel, shareText);
    showStatus(result.success ? `Opened ${result.label}.` : result.message || 'Could not open share.');
  }, [snapshot, selectedYear, showStatus]);

  const handleShareToDiscord = useCallback(async (text = null) => {
    const shareText = text || ProfileService.appendSocialLinksToShareText(LocalShareService.buildYearInReviewShareText(snapshot, selectedYear));
    const { filename } = LocalShareService.buildSharePackage(snapshot, selectedYear);
    let imageBlob = null;

    if (snapshot?.hasData && LocalShareService.canCopyImage()) {
      imageBlob = await generateShareCardBlob();
    }

    const result = await LocalShareService.shareToDiscord({ imageBlob, text: shareText, filename });
    if (result.success) {
      showStatus(result.imageStaged
        ? 'Discord opened — your recap image and caption are copied, just paste them in.'
        : 'Discord opened — caption copied, save the image to attach it.');
    } else {
      showStatus(result.message || 'Could not share to Discord.');
    }
  }, [snapshot, selectedYear, generateShareCardBlob, showStatus]);

  const handleShareToMessenger = useCallback(async (text = null) => {
    const shareText = text || ProfileService.appendSocialLinksToShareText(LocalShareService.buildYearInReviewShareText(snapshot, selectedYear));
    const { filename } = LocalShareService.buildSharePackage(snapshot, selectedYear);
    let imageBlob = null;

    if (snapshot?.hasData && LocalShareService.canCopyImage()) {
      imageBlob = await generateShareCardBlob();
    }

    const result = await LocalShareService.shareToMessenger({ imageBlob, text: shareText, filename });
    if (result.success) {
      showStatus(result.imageStaged
        ? 'Messenger opened — your recap image and caption are copied, just paste them in.'
        : 'Messenger opened — caption copied, save the image to attach it.');
    } else {
      showStatus(result.message || 'Could not share to Messenger.');
    }
  }, [snapshot, selectedYear, generateShareCardBlob, showStatus]);

  const handleNativeShare = useCallback(async (text = null) => {
    const blob = await generateShareCardBlob();
    const { text: baseText, filename, title } = LocalShareService.buildSharePackage(snapshot, selectedYear);
    const shareText = text || ProfileService.appendSocialLinksToShareText(baseText);
    const files = blob ? [new File([blob], filename, { type: 'image/png' })] : [];
    const result = await LocalShareService.shareWithNativeShare({ title, text: shareText, files });
    showStatus(result.success ? 'Shared successfully.' : result.message || 'Native share failed.');
  }, [generateShareCardBlob, snapshot, selectedYear, showStatus]);

  const handleDownloadShareText = useCallback((text = null) => {
    const shareText = text || ProfileService.appendSocialLinksToShareText(LocalShareService.buildYearInReviewShareText(snapshot, selectedYear));
    const success = LocalShareService.downloadShareText(shareText, `gamepilot-share-${selectedYear}.txt`);
    showStatus(success ? 'Caption downloaded.' : 'Could not download caption.');
  }, [snapshot, selectedYear, showStatus]);

  return (
    <div className="year-review-page">
      <NavBar />
      <div className="year-review-shell">
        <header className="year-review-hero">
          <div className="year-review-hero-copy">
            <span className="year-review-kicker">Local recap</span>
            <h1>Year in Review</h1>
            <p>
              Revisit your top games, session rhythms, and play habits for the year.
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
              <ShareMenu
                onCopyText={handleCopyShareText}
                onCopyImage={handleCopyShareCardImage}
                onSaveImage={handleSaveShareCard}
                onShareText={handleShareToChannel}
                onShareToDiscord={handleShareToDiscord}
                onShareToMessenger={handleShareToMessenger}
                onDownloadText={handleDownloadShareText}
                onNativeShare={handleNativeShare}
                imageAvailable={snapshot?.hasData}
                disabled={isExportingShare}
                buildCaption={() => ProfileService.appendSocialLinksToShareText(LocalShareService.buildYearInReviewShareText(snapshot, selectedYear))}
              />
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
              {snapshot.seasonalStory && (
                <section className="year-review-story-section" ref={storySectionRef}>
                  <div className="year-review-story-header">
                    <BookOpen size={20} />
                    <h2>The Story of Your Year</h2>
                    <div style={{ marginLeft: 'auto' }}>
                      <ShareMenu
                      triggerLabel="Share Story"
                      imageAvailable
                      disabled={isCapturingStory}
                      onCopyText={async () => {
                        const lines = [];
                        lines.push(`The Story of My ${selectedYear} Gaming Year`);
                        lines.push(snapshot.seasonalStory.arc);
                        snapshot.seasonalStory.chapters.forEach((chapter) => {
                          if (chapter.hasData) {
                            lines.push(`${chapter.season}: ${chapter.headline}`);
                            if (chapter.stats) {
                              lines.push(`  ${chapter.stats.playtimeHours}h · ${chapter.stats.sessions} sessions${chapter.stats.topGame ? ` · Top: ${chapter.stats.topGame.name}` : ''}`);
                            }
                          }
                        });
                        lines.push('Powered by GamePilot');
                        const text = lines.join('\n');
                        const copied = await LocalShareService.copyTextToClipboard(ProfileService.appendSocialLinksToShareText(text));
                        return copied;
                      }}
                      onCopyImage={async () => {
                        if (!storyShareCardRef.current) return false;
                        setIsCapturingStory(true);
                        try {
                          const canvas = await html2canvas(storyShareCardRef.current, { scale: 2, backgroundColor: null, useCORS: true, logging: false });
                          const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
                          if (!blob) { showStatus('Could not generate story card.'); return false; }
                          const copied = await LocalShareService.copyImageToClipboard(blob);
                          showStatus(copied ? 'Story card copied to clipboard.' : 'Could not copy story card.');
                          return copied;
                        } catch (err) { console.error(err); showStatus('Could not generate story card.'); return false; }
                        finally { setIsCapturingStory(false); }
                      }}
                      onSaveImage={async () => {
                        if (!storyShareCardRef.current) return;
                        setIsCapturingStory(true);
                        try {
                          const canvas = await html2canvas(storyShareCardRef.current, { scale: 2, backgroundColor: null, useCORS: true, logging: false });
                          const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
                          if (!blob) { showStatus('Could not generate story card.'); return; }
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `gamepilot-story-${selectedYear}.png`;
                          document.body.appendChild(link); link.click(); document.body.removeChild(link);
                          URL.revokeObjectURL(url);
                          showStatus('Story card saved.');
                        } catch (err) { console.error(err); showStatus('Could not generate story card.'); }
                        finally { setIsCapturingStory(false); }
                      }}
                      onShareText={async (channel) => {
                        const lines = [];
                        lines.push(`The Story of My ${selectedYear} Gaming Year`);
                        lines.push(snapshot.seasonalStory.arc);
                        snapshot.seasonalStory.chapters.forEach((chapter) => {
                          if (chapter.hasData) {
                            lines.push(`${chapter.season}: ${chapter.headline}`);
                            if (chapter.stats) {
                              lines.push(`  ${chapter.stats.playtimeHours}h · ${chapter.stats.sessions} sessions${chapter.stats.topGame ? ` · Top: ${chapter.stats.topGame.name}` : ''}`);
                            }
                          }
                        });
                        lines.push('Powered by GamePilot');
                        const text = lines.join('\n');
                        const result = await LocalShareService.openShareIntent(channel, ProfileService.appendSocialLinksToShareText(text));
                        return result;
                      }}
                      onDownloadText={() => {
                        const lines = [];
                        lines.push(`The Story of My ${selectedYear} Gaming Year`);
                        lines.push(snapshot.seasonalStory.arc);
                        snapshot.seasonalStory.chapters.forEach((chapter) => {
                          if (chapter.hasData) {
                            lines.push(`${chapter.season}: ${chapter.headline}`);
                            if (chapter.stats) {
                              lines.push(`  ${chapter.stats.playtimeHours}h · ${chapter.stats.sessions} sessions${chapter.stats.topGame ? ` · Top: ${chapter.stats.topGame.name}` : ''}`);
                            }
                          }
                        });
                        lines.push('Powered by GamePilot');
                        const text = lines.join('\n');
                        LocalShareService.downloadShareText(ProfileService.appendSocialLinksToShareText(text), `story-of-${selectedYear}.txt`);
                        showStatus('Story caption downloaded.');
                      }}
                      buildCaption={() => {
                        const lines = [];
                        lines.push(`The Story of My ${selectedYear} Gaming Year`);
                        lines.push(snapshot.seasonalStory.arc);
                        snapshot.seasonalStory.chapters.forEach((chapter) => {
                          if (chapter.hasData) {
                            lines.push(`${chapter.season}: ${chapter.headline}`);
                            if (chapter.stats) {
                              lines.push(`  ${chapter.stats.playtimeHours}h · ${chapter.stats.sessions} sessions${chapter.stats.topGame ? ` · Top: ${chapter.stats.topGame.name}` : ''}`);
                            }
                          }
                        });
                        lines.push('Powered by GamePilot');
                        const text = lines.join('\n');
                        return ProfileService.appendSocialLinksToShareText(text);
                      }}
                      onNativeShare={async () => {
                        if (!storyShareCardRef.current) return;
                        setIsCapturingStory(true);
                        try {
                          const canvas = await html2canvas(storyShareCardRef.current, { scale: 2, backgroundColor: null, useCORS: true, logging: false });
                          const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
                          if (!blob) { showStatus('Could not generate story card.'); return; }
                          const file = new File([blob], `gamepilot-story-${selectedYear}.png`, { type: 'image/png' });
                          const shareText = ProfileService.appendSocialLinksToShareText(snapshot.seasonalStory.arc);
                          const result = await LocalShareService.shareWithNativeShare({ title: `The Story of My ${selectedYear} Gaming Year`, text: shareText, files: [file] });
                          showStatus(result.success ? 'Native share opened.' : result.message || 'Could not share.');
                        } catch (err) { console.error(err); showStatus('Could not generate story card.'); }
                        finally { setIsCapturingStory(false); }
                      }}
                    />
                  </div>
                  </div>
                  <p className="year-review-story-arc">{snapshot.seasonalStory.arc}</p>
                  <div className="year-review-story-chapters">
                    {snapshot.seasonalStory.chapters.map((chapter, index) => (
                      <article
                        key={chapter.season}
                        className={`year-review-chapter${chapter.hasData ? '' : ' year-review-chapter--empty'}`}
                      >
                        <div className="chapter-season-label">
                          <span>{chapter.season}</span>
                          {chapter.monthRange && <small>{chapter.monthRange}</small>}
                        </div>
                        <h3>{chapter.headline}</h3>
                        <p>{chapter.body}</p>
                        {chapter.hasData && chapter.stats && (
                          <div className="chapter-stats">
                            <span>{chapter.stats.playtimeHours}h</span>
                            <span>{chapter.stats.sessions} sessions</span>
                            {chapter.stats.topGame && (
                              <span className="chapter-top-game">{chapter.stats.topGame.name}</span>
                            )}
                          </div>
                        )}
                        {chapter.pivot && (
                          <div className="chapter-pivot">
                            <span>{chapter.pivot.text}</span>
                          </div>
                        )}
                        {index < snapshot.seasonalStory.chapters.length - 1 && chapter.hasData && snapshot.seasonalStory.chapters[index + 1]?.hasData && (
                          <div className="chapter-connector" />
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {yearlyStory && (
                <section className="year-review-highlights-row">
                  <div style={{ width: '100%' }}>
                    <GamingStoryPanel story={yearlyStory} />
                  </div>
                </section>
              )}

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
                    <span>Session days</span>
                    <strong>{snapshot.summary.activeDays}</strong>
                  </div>
                </article>
                <article className="year-review-mini-card">
                  <Calendar size={18} />
                  <div>
                    <span>Daily visits</span>
                    <strong>{snapshot.engagement.totalLogins}</strong>
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
                  <span>Most launches this year</span>
                  <strong>{snapshot.deepStats?.topBySessions?.name || '—'}</strong>
                  <p>
                    {snapshot.deepStats?.topBySessions
                      ? `You launched this ${snapshot.deepStats.topBySessions.sessions} time${snapshot.deepStats.topBySessions.sessions !== 1 ? 's' : ''} this year · ${formatPlaytime(snapshot.deepStats.topBySessions.totalPlaytime)} total`
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
                      <p>Your current level and category completion based on your local progression data.</p>
                    </div>
                  </div>
                  <div className="progression-headline">
                    <div>
                      <span>Current level</span>
                      <strong>Level {snapshot.progression?.level ?? 1}</strong>
                    </div>
                    <div>
                      <span>Total XP</span>
                      <strong>{(snapshot.progression?.xp ?? 0).toLocaleString()}</strong>
                    </div>
                    <div>
                      <span>Best streak</span>
                      <strong>{snapshot.engagement?.longestStreak ?? 0}</strong>
                    </div>
                  </div>
                  <div className="progression-groups">
                    {(snapshot.progression?.progressionGroups || []).map((group) => {
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

                <article className="year-review-panel year-review-progression-panel">
                  <div className="panel-heading">
                    <div>
                      <h2><Calendar size={20} /> Daily Engagement</h2>
                      <p>Check-in streaks and visit cadence tracked by your daily login flow.</p>
                    </div>
                  </div>
                  <div className="progression-headline">
                    <div>
                      <span>Current streak</span>
                      <strong>{snapshot.engagement.currentStreak}</strong>
                    </div>
                    <div>
                      <span>Best streak</span>
                      <strong>{snapshot.engagement.longestStreak}</strong>
                    </div>
                    <div>
                      <span>Total visits</span>
                      <strong>{snapshot.engagement.totalLogins}</strong>
                    </div>
                  </div>
                  <div className="mix-columns">
                    <div>
                      <span>Recap note</span>
                      <ul>
                        <li>
                          <strong>Session days</strong>
                          <span>Days where you completed tracked play sessions this year.</span>
                        </li>
                        <li>
                          <strong>Daily visits</strong>
                          <span>Total check-ins recorded by the daily engagement system.</span>
                        </li>
                      </ul>
                    </div>
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
            left: 0,
            opacity: 0,
            pointerEvents: 'none',
            zIndex: -1
          }}
        >
          <div ref={shareCardRef}>
            <YearInReviewShareCard
              snapshot={snapshot}
              year={selectedYear}
              username={pilotName}
              watermark={recapCustomization.shareCardWatermark || 'gamepilot'}
            />
          </div>
        </div>

        {/* Offscreen story share card — captured when sharing the seasonal story. */}
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            opacity: 0,
            pointerEvents: 'none',
            zIndex: -1
          }}
        >
          <div ref={storyShareCardRef}>
            {snapshot?.seasonalStory && (
              <YearInReviewStoryShareCard
                seasonalStory={snapshot.seasonalStory}
                year={selectedYear}
                username={pilotName}
              />
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default YearInReview;
