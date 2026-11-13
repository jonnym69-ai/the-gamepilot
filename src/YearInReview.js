import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import {
  Award,
  BookOpen,
  Calendar,
  Download,
  Hourglass,
  ListOrdered,
  Medal,
  NotebookPen,
  Play,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import NavBar from './NavBar';
import { YearInReviewService } from './services/YearInReviewService';
import { getRecapSeasonYear } from './utils/recapSeason';
import { getEmptyLibraryFallback } from './services/EmptyLibraryFallbackData';
import { LocalShareService } from './services/LocalShareService';
import ProfileService from './services/ProfileService';
import PersonaHistoryService from './services/PersonaHistoryService';
import { getGameArtworkPlaceholder } from './services/GameArtworkService';
import { YearInReviewShareCard, SHARE_CARD_SIZE_PX } from './components/YearInReviewShareCard';
import { YearInReviewStoryShareCard } from './components/YearInReviewStoryShareCard';
import { MilestonesShareCard, buildMilestonesShareCaption } from './components/MilestonesShareCard';
import { EraTimelineBar, eraTimelineColor } from './components/EraTimelineBar';
import ShareMenu from './components/ShareMenu';
import YearWrappedModal from './components/YearWrappedModal';
import LazyImage from './components/LazyImage';
import { formatPlaytime } from './utils/formatPlaytime';
import './YearInReview.css';

const COLOR_FUNCTION_PATTERN = /\b(color\(|color-mix\()/i;

const YEAR_REVIEW_TABS = Object.freeze([
  { id: 'overview', label: 'Overview' },
  { id: 'story', label: 'Story' },
  { id: 'milestones', label: 'Milestones' },
  { id: 'eras', label: 'Eras' },
  { id: 'numbers', label: 'Numbers' },
]);

const MILESTONE_STATUS_LABELS = Object.freeze({ beaten: 'Beaten', completed: 'Completed', '100%': '100%' });

const formatMilestoneDate = (ms) => {
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const MONTH_TICK_LABELS = Object.freeze([
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]);

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
  const borderColor = normalizeCssColor(
    rootStyles.getPropertyValue('--card-border').trim(),
    'rgba(255, 255, 255, 0.16)'
  );
  const textColor = normalizeCssColor(rootStyles.getPropertyValue('--text-color').trim(), '#f8fafc');

  const sourceElements = sourceRoot.querySelectorAll('*');
  const clonedElements = clonedRoot.querySelectorAll('*');

  clonedRoot.style.background = normalizeCssColor(getComputedStyle(document.body).backgroundColor, '#0f172a');
  clonedRoot.style.color = textColor;

  clonedRoot.querySelectorAll('.year-review-kicker').forEach((node) => {
    node.style.background = 'rgba(124, 58, 237, 0.16)';
    node.style.color = accentColor;
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
};

function YearInReview({ library = [] }) {
  const exportRef = useRef(null);
  const shareCardRef = useRef(null);
  const storyShareCardRef = useRef(null);
  const milestonesShareCardRef = useRef(null);
  const noticeTimeoutRef = useRef(null);
  const tabButtonRefs = useRef({});
  const [isCapturingStory, setIsCapturingStory] = useState(false);
  const [isCapturingMilestones, setIsCapturingMilestones] = useState(false);
  const [isCapturingAll, setIsCapturingAll] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  // ?wrapped=1 lands straight in the slide presentation (Home prompt deep link).
  const [wrappedOpen, setWrappedOpen] = useState(() => searchParams.get('wrapped') === '1');
  const closeWrapped = useCallback(() => {
    setWrappedOpen(false);
    setSearchParams((previous) => {
      const params = new URLSearchParams(previous);
      params.delete('wrapped');
      return params;
    });
  }, [setSearchParams]);
  const activeTab = YEAR_REVIEW_TABS.some((tab) => tab.id === requestedTab) ? requestedTab : 'overview';
  const requestedYear = Number(searchParams.get('year'));
  const requestedYearValid =
    Number.isInteger(requestedYear) && requestedYear >= 1970 && requestedYear <= new Date().getFullYear() + 1;
  const availableYears = useMemo(() => YearInReviewService.getAvailableYears(library || []), [library]);
  const yearOptions = useMemo(() => {
    if (requestedYearValid && !availableYears.includes(requestedYear)) {
      return [...availableYears, requestedYear].sort((left, right) => right - left);
    }
    return availableYears;
  }, [availableYears, requestedYear, requestedYearValid]);
  const [selectedYear, setSelectedYear] = useState(() =>
    requestedYearValid ? requestedYear : availableYears[0] || new Date().getFullYear()
  );
  const [statusMessage, setStatusMessage] = useState('');
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [isExportingShare, setIsExportingShare] = useState(false);

  useEffect(() => {
    if (requestedYearValid) {
      if (selectedYear !== requestedYear) {
        setSelectedYear(requestedYear);
      }
    } else if (!availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0] || new Date().getFullYear());
    }
  }, [availableYears, selectedYear, requestedYear, requestedYearValid]);

  useEffect(
    () => () => {
      if (noticeTimeoutRef.current) {
        window.clearTimeout(noticeTimeoutRef.current);
      }
    },
    []
  );

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

  // Persist the year's persona into the yearbook — past years immediately,
  // the current year only once it's settled (Dec 20 onward).
  useEffect(() => {
    if (!snapshot?.hasData || !snapshot?.persona?.identityLabel) return;
    const now = new Date();
    const currentYear = now.getFullYear();
    if (snapshot.year > currentYear) return;
    if (snapshot.year === currentYear && (now.getMonth() !== 11 || now.getDate() < 20)) return;
    PersonaHistoryService.archiveYear(snapshot.year, {
      id: snapshot.persona.identityId || snapshot.persona.identityLabel,
      label: snapshot.persona.identityLabel,
      themeId: snapshot.persona.identityThemeId || null,
    });
  }, [snapshot]);

  const pilotName = useMemo(() => ProfileService.getCurrentUsername() || 'Pilot', []);

  const maxMonthlyHours = useMemo(() => {
    const values = Object.values(snapshot.monthly?.playtimeHours || {});
    return Math.max(1, ...values);
  }, [snapshot.monthly]);

  const standoutMonth = useMemo(
    () =>
      Object.entries(snapshot.monthly?.playtimeHours || {}).sort(
        (left, right) => right[1] - left[1] || left[0].localeCompare(right[0])
      )[0] || null,
    [snapshot.monthly]
  );

  const activeMonths = useMemo(() => {
    const counts = snapshot.monthly?.sessionCounts || {};
    return MONTH_TICK_LABELS.filter((label) => counts[label] > 0);
  }, [snapshot.monthly]);

  // Contiguous runs of session-less months collapsed into "Jan–Jun, Nov" style.
  const quietMonthsLabel = useMemo(() => {
    const counts = snapshot.monthly?.sessionCounts || {};
    const runs = [];
    let runStart = -1;
    MONTH_TICK_LABELS.forEach((label, index) => {
      if (counts[label] > 0) {
        if (runStart >= 0) {
          runs.push(
            runStart === index - 1
              ? MONTH_TICK_LABELS[runStart]
              : `${MONTH_TICK_LABELS[runStart]}–${MONTH_TICK_LABELS[index - 1]}`
          );
          runStart = -1;
        }
      } else if (runStart < 0) {
        runStart = index;
      }
    });
    if (runStart >= 0) {
      runs.push(
        runStart === MONTH_TICK_LABELS.length - 1
          ? MONTH_TICK_LABELS[runStart]
          : `${MONTH_TICK_LABELS[runStart]}–${MONTH_TICK_LABELS[MONTH_TICK_LABELS.length - 1]}`
      );
    }
    return runs.join(', ');
  }, [snapshot.monthly]);

  const selectTab = useCallback(
    (tabId, { moveFocus = false } = {}) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          next.set('tab', tabId);
          return next;
        },
        { replace: false }
      );
      if (moveFocus) {
        tabButtonRefs.current[tabId]?.focus();
      }
    },
    [setSearchParams]
  );

  const handleTabKeyDown = useCallback(
    (event, index) => {
      let targetIndex = null;
      if (event.key === 'ArrowRight') {
        targetIndex = (index + 1) % YEAR_REVIEW_TABS.length;
      } else if (event.key === 'ArrowLeft') {
        targetIndex = (index - 1 + YEAR_REVIEW_TABS.length) % YEAR_REVIEW_TABS.length;
      } else if (event.key === 'Home') {
        targetIndex = 0;
      } else if (event.key === 'End') {
        targetIndex = YEAR_REVIEW_TABS.length - 1;
      }
      if (targetIndex !== null) {
        event.preventDefault();
        selectTab(YEAR_REVIEW_TABS[targetIndex].id, { moveFocus: true });
      }
    },
    [selectTab]
  );

  const handleExportImage = useCallback(async () => {
    if (!exportRef.current) {
      showStatus('Could not find the recap surface to export.');
      return;
    }

    setIsExportingImage(true);
    setIsCapturingAll(true);
    try {
      // Tabbed content mounts lazily — paint every panel before capturing so
      // the export covers the whole year, not just the active tab.
      await new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      });
      const canvas = await html2canvas(exportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: getComputedStyle(document.body).backgroundColor || '#0f172a',
        logging: false,
        onclone: (clonedDocument) => sanitizeExportClone(exportRef.current, clonedDocument),
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
      setIsCapturingAll(false);
      setIsExportingImage(false);
    }
  }, [selectedYear, showStatus]);

  const handleCopyShareText = useCallback(
    async (text = null) => {
      const shareText =
        text ||
        ProfileService.appendSocialLinksToShareText(
          LocalShareService.buildYearInReviewShareText(snapshot, selectedYear)
        );
      const success = await LocalShareService.copyTextToClipboard(shareText);
      showStatus(success ? 'Share text copied to clipboard.' : 'Could not copy share text.');
      return success;
    },
    [snapshot, selectedYear, showStatus]
  );

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
        logging: false,
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

  const handleShareToChannel = useCallback(
    async (channel, text = null) => {
      const shareText =
        text ||
        ProfileService.appendSocialLinksToShareText(
          LocalShareService.buildYearInReviewShareText(snapshot, selectedYear)
        );
      const result = await LocalShareService.openShareIntent(channel, shareText);
      showStatus(result.success ? `Opened ${result.label}.` : result.message || 'Could not open share.');
    },
    [snapshot, selectedYear, showStatus]
  );

  const handleShareToDiscord = useCallback(
    async (text = null) => {
      const shareText =
        text ||
        ProfileService.appendSocialLinksToShareText(
          LocalShareService.buildYearInReviewShareText(snapshot, selectedYear)
        );
      const { filename } = LocalShareService.buildSharePackage(snapshot, selectedYear);
      let imageBlob = null;

      if (snapshot?.hasData && LocalShareService.canCopyImage()) {
        imageBlob = await generateShareCardBlob();
      }

      const result = await LocalShareService.shareToDiscord({ imageBlob, text: shareText, filename });
      if (result.success) {
        showStatus(
          result.imageStaged
            ? 'Discord opened — your recap image and caption are copied, just paste them in.'
            : 'Discord opened — caption copied, save the image to attach it.'
        );
      } else {
        showStatus(result.message || 'Could not share to Discord.');
      }
    },
    [snapshot, selectedYear, generateShareCardBlob, showStatus]
  );

  const handleShareToMessenger = useCallback(
    async (text = null) => {
      const shareText =
        text ||
        ProfileService.appendSocialLinksToShareText(
          LocalShareService.buildYearInReviewShareText(snapshot, selectedYear)
        );
      const { filename } = LocalShareService.buildSharePackage(snapshot, selectedYear);
      let imageBlob = null;

      if (snapshot?.hasData && LocalShareService.canCopyImage()) {
        imageBlob = await generateShareCardBlob();
      }

      const result = await LocalShareService.shareToMessenger({ imageBlob, text: shareText, filename });
      if (result.success) {
        showStatus(
          result.imageStaged
            ? 'Messenger opened — your recap image and caption are copied, just paste them in.'
            : 'Messenger opened — caption copied, save the image to attach it.'
        );
      } else {
        showStatus(result.message || 'Could not share to Messenger.');
      }
    },
    [snapshot, selectedYear, generateShareCardBlob, showStatus]
  );

  const handleNativeShare = useCallback(
    async (text = null) => {
      const blob = await generateShareCardBlob();
      const { text: baseText, filename, title } = LocalShareService.buildSharePackage(snapshot, selectedYear);
      const shareText = text || ProfileService.appendSocialLinksToShareText(baseText);
      const files = blob ? [new File([blob], filename, { type: 'image/png' })] : [];
      const result = await LocalShareService.shareWithNativeShare({ title, text: shareText, files });
      showStatus(result.success ? 'Shared successfully.' : result.message || 'Native share failed.');
    },
    [generateShareCardBlob, snapshot, selectedYear, showStatus]
  );

  const handleDownloadShareText = useCallback(
    (text = null) => {
      const shareText =
        text ||
        ProfileService.appendSocialLinksToShareText(
          LocalShareService.buildYearInReviewShareText(snapshot, selectedYear)
        );
      const success = LocalShareService.downloadShareText(shareText, `gamepilot-share-${selectedYear}.txt`);
      showStatus(success ? 'Caption downloaded.' : 'Could not download caption.');
    },
    [snapshot, selectedYear, showStatus]
  );

  const buildStoryCaption = useCallback(() => {
    const paragraphs = snapshot?.story?.paragraphs || [];
    if (paragraphs.length === 0) return '';
    const lines = [`The Story of My ${selectedYear} Gaming Year`, ''];
    paragraphs.forEach((paragraph) => lines.push(paragraph.text));
    lines.push('', 'Powered by GamePilot');
    return ProfileService.appendSocialLinksToShareText(lines.join('\n'));
  }, [snapshot.story, selectedYear]);

  const buildMilestonesCaption = useCallback(
    () =>
      ProfileService.appendSocialLinksToShareText(
        buildMilestonesShareCaption(snapshot?.milestones, selectedYear, pilotName)
      ),
    [snapshot, selectedYear, pilotName]
  );

  const captureMilestonesCard = useCallback(async () => {
    if (!milestonesShareCardRef.current) {
      showStatus('Could not generate milestones card.');
      return null;
    }
    const canvas = await html2canvas(milestonesShareCardRef.current, {
      scale: 2,
      backgroundColor: null,
      useCORS: true,
      logging: false,
    });
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  }, [showStatus]);

  const storyLeadText = useMemo(() => {
    const paragraphs = snapshot?.story?.paragraphs || [];
    return paragraphs
      .slice(0, 4)
      .map((paragraph) => paragraph.text)
      .join(' ');
  }, [snapshot.story]);

  // Outside the Dec–Jan recap season the page reads as the always-on "Your
  // Gaming Life" home for eras, months and lifetime stats; inside it the same
  // page leads with the year-in-review event headline instead.
  const recapSeasonYear = getRecapSeasonYear();

  return (
    <div className="year-review-page">
      <NavBar />
      <div className="year-review-shell">
        <header className="year-review-hero">
          <div className="year-review-hero-copy">
            <span className="year-review-kicker">{recapSeasonYear !== null ? 'Your Gaming Life' : 'Local recap'}</span>
            <h1>{recapSeasonYear !== null ? `${selectedYear} Year in Review` : 'Your Gaming Life'}</h1>
            <p>
              Revisit your top games, session rhythms, and play habits for the year. Everything on this page is
              generated from your local GamePilot data — every launcher and every tracked session counts, offline
              sessions included, right through December 31.
            </p>
          </div>
          <div className="year-review-controls">
            <label className="year-review-year-picker">
              <span>Review year</span>
              <select
                value={selectedYear}
                onChange={(event) => {
                  const nextYear = Number(event.target.value);
                  setSelectedYear(nextYear);
                  setSearchParams((previous) => {
                    const params = new URLSearchParams(previous);
                    params.set('year', String(nextYear));
                    return params;
                  });
                }}
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
            <div className="year-review-actions">
              {snapshot?.hasData && (
                <button type="button" className="year-review-watch" onClick={() => setWrappedOpen(true)}>
                  <Play size={16} />
                  <span>Watch the wrap</span>
                </button>
              )}
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
                buildCaption={() =>
                  ProfileService.appendSocialLinksToShareText(
                    LocalShareService.buildYearInReviewShareText(snapshot, selectedYear)
                  )
                }
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

        {snapshot.hasData && (
          <div className="year-review-tabs" role="tablist" aria-label="Year in review sections">
            {YEAR_REVIEW_TABS.map((tab, index) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`year-review-tab-${tab.id}`}
                aria-selected={activeTab === tab.id}
                aria-controls={`year-review-panel-${tab.id}`}
                tabIndex={activeTab === tab.id ? 0 : -1}
                ref={(node) => {
                  tabButtonRefs.current[tab.id] = node;
                }}
                className={`year-review-tab${activeTab === tab.id ? ' active' : ''}`}
                onClick={() => selectTab(tab.id)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        <div ref={exportRef} className="year-review-export-surface">
          {!snapshot.hasData ? (
            <section className="year-review-empty-state">
              <Trophy size={28} />
              <h2>No tracked sessions logged for {selectedYear}</h2>
              <p>
                This recap is built only from real sessions GamePilot tracked. Imported Steam/GOG playtime is a lifetime
                total with no dates attached, so it can't be placed into {selectedYear}. Launch games through GamePilot
                and this page will fill in automatically.
              </p>
            </section>
          ) : (
            <>
              {(activeTab === 'overview' || isCapturingAll) && (
                <div
                  role="tabpanel"
                  id="year-review-panel-overview"
                  aria-labelledby="year-review-tab-overview"
                  className="year-review-tabpanel"
                >
                  <section className="year-review-summary-grid">
                    {snapshot.summaryCards.map((card) => (
                      <article key={card.id} className="year-review-summary-card">
                        <span className="summary-card-title">{card.title}</span>
                        <strong>{card.value}</strong>
                        <p>{card.detail}</p>
                      </article>
                    ))}
                  </section>

                  <article className="year-review-panel year-review-identity-panel">
                    <div className="panel-heading">
                      <div>
                        <h2>
                          <Award size={20} /> Player Identity
                        </h2>
                        <p>Your local play profile for {selectedYear}.</p>
                      </div>
                    </div>
                    <div className="identity-badge">
                      <strong>{snapshot.persona.identityLabel}</strong>
                      <span>{snapshot.persona.roast || snapshot.persona.identityDescription}</span>
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

                  {snapshot.eras?.stretches?.length > 0 && (
                    <button type="button" className="year-review-era-strip" onClick={() => selectTab('eras')}>
                      <div className="year-review-era-strip-copy">
                        <span className="year-review-kicker">Month by month</span>
                        <strong>The Eras of Your {selectedYear}</strong>
                        <span className="year-review-era-strip-cta">
                          {snapshot.eras.stretches.length} stretch
                          {snapshot.eras.stretches.length === 1 ? '' : 'es'} — open the Eras tab →
                        </span>
                      </div>
                      <EraTimelineBar stretches={snapshot.eras.stretches} />
                      <div className="year-review-era-strip-legend">
                        {snapshot.eras.stretches.map((era, index) => (
                          <span key={`${era.startMonth}-${era.endMonth}`}>
                            <i style={{ backgroundColor: eraTimelineColor(index) }} />
                            {era.monthLabel} · {era.name}
                          </span>
                        ))}
                      </div>
                    </button>
                  )}
                </div>
              )}

              {(activeTab === 'story' || isCapturingAll) && (
                <div
                  role="tabpanel"
                  id="year-review-panel-story"
                  aria-labelledby="year-review-tab-story"
                  className="year-review-tabpanel"
                >
                  {snapshot.story?.paragraphs?.length > 0 && (
                    <section className="year-review-story-section">
                      <div className="year-review-story-header">
                        <BookOpen size={20} />
                        <h2>The Story of Your Year</h2>
                        <div style={{ marginLeft: 'auto' }}>
                          <ShareMenu
                            triggerLabel="Share Story"
                            imageAvailable
                            disabled={isCapturingStory}
                            onCopyText={async () => LocalShareService.copyTextToClipboard(buildStoryCaption())}
                            onCopyImage={async () => {
                              if (!storyShareCardRef.current) return false;
                              setIsCapturingStory(true);
                              try {
                                const canvas = await html2canvas(storyShareCardRef.current, {
                                  scale: 2,
                                  backgroundColor: null,
                                  useCORS: true,
                                  logging: false,
                                });
                                const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
                                if (!blob) {
                                  showStatus('Could not generate story card.');
                                  return false;
                                }
                                const copied = await LocalShareService.copyImageToClipboard(blob);
                                showStatus(copied ? 'Story card copied to clipboard.' : 'Could not copy story card.');
                                return copied;
                              } catch (err) {
                                console.error(err);
                                showStatus('Could not generate story card.');
                                return false;
                              } finally {
                                setIsCapturingStory(false);
                              }
                            }}
                            onSaveImage={async () => {
                              if (!storyShareCardRef.current) return;
                              setIsCapturingStory(true);
                              try {
                                const canvas = await html2canvas(storyShareCardRef.current, {
                                  scale: 2,
                                  backgroundColor: null,
                                  useCORS: true,
                                  logging: false,
                                });
                                const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
                                if (!blob) {
                                  showStatus('Could not generate story card.');
                                  return;
                                }
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = `gamepilot-story-${selectedYear}.png`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                URL.revokeObjectURL(url);
                                showStatus('Story card saved.');
                              } catch (err) {
                                console.error(err);
                                showStatus('Could not generate story card.');
                              } finally {
                                setIsCapturingStory(false);
                              }
                            }}
                            onShareText={async (channel) =>
                              LocalShareService.openShareIntent(channel, buildStoryCaption())
                            }
                            onDownloadText={() => {
                              LocalShareService.downloadShareText(buildStoryCaption(), `story-of-${selectedYear}.txt`);
                              showStatus('Story caption downloaded.');
                            }}
                            buildCaption={buildStoryCaption}
                            onNativeShare={async () => {
                              if (!storyShareCardRef.current) return;
                              setIsCapturingStory(true);
                              try {
                                const canvas = await html2canvas(storyShareCardRef.current, {
                                  scale: 2,
                                  backgroundColor: null,
                                  useCORS: true,
                                  logging: false,
                                });
                                const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
                                if (!blob) {
                                  showStatus('Could not generate story card.');
                                  return;
                                }
                                const file = new File([blob], `gamepilot-story-${selectedYear}.png`, {
                                  type: 'image/png',
                                });
                                const shareText = ProfileService.appendSocialLinksToShareText(storyLeadText);
                                const result = await LocalShareService.shareWithNativeShare({
                                  title: `The Story of My ${selectedYear} Gaming Year`,
                                  text: shareText,
                                  files: [file],
                                });
                                showStatus(
                                  result.success ? 'Native share opened.' : result.message || 'Could not share.'
                                );
                              } catch (err) {
                                console.error(err);
                                showStatus('Could not generate story card.');
                              } finally {
                                setIsCapturingStory(false);
                              }
                            }}
                          />
                        </div>
                      </div>
                      <div className="year-review-story-paragraphs">
                        {snapshot.story.paragraphs.map((paragraph) => (
                          <p key={paragraph.id} className={paragraph.covers?.length ? 'yir-story-para' : undefined}>
                            {paragraph.covers?.map((cover) => (
                              <LazyImage
                                key={cover.name}
                                className="yir-story-cover"
                                src={cover.portrait}
                                fallbackSrc={cover.portraitFallback}
                                placeholder={cover.placeholder}
                                gameName={cover.name}
                                alt={`${cover.name} cover`}
                              />
                            ))}
                            <span>{paragraph.text}</span>
                          </p>
                        ))}
                      </div>
                    </section>
                  )}

                  {snapshot.journalNotes?.length > 0 && (
                    <article className="year-review-panel year-review-journal-panel">
                      <div className="panel-heading">
                        <div>
                          <h2>
                            <NotebookPen size={20} /> Session Journal
                          </h2>
                          <p>One-line notes you left after sessions in {selectedYear}.</p>
                        </div>
                      </div>
                      <ul className="year-review-journal-list">
                        {snapshot.journalNotes.map((entry, index) => (
                          <li key={`${entry.gameName}-${entry.dateLabel}-${index}`}>
                            <div className="year-review-journal-meta">
                              <strong>{entry.gameName}</strong>
                              <span>{entry.dateLabel}</span>
                            </div>
                            <p>&ldquo;{entry.note}&rdquo;</p>
                          </li>
                        ))}
                      </ul>
                    </article>
                  )}
                </div>
              )}

              {(activeTab === 'milestones' || isCapturingAll) && (
                <div
                  role="tabpanel"
                  id="year-review-panel-milestones"
                  aria-labelledby="year-review-tab-milestones"
                  className="year-review-tabpanel"
                >
                  <article className="year-review-panel year-review-milestones-panel">
                    <div className="panel-heading">
                      <div>
                        <h2>
                          <Trophy size={20} /> Milestones
                        </h2>
                        <p>What you finished, found and came back to in {selectedYear}.</p>
                      </div>
                      {snapshot.milestones?.hasAny && (
                        <ShareMenu
                          triggerLabel="Share Milestones"
                          imageAvailable
                          disabled={isCapturingMilestones}
                          onCopyText={async () => LocalShareService.copyTextToClipboard(buildMilestonesCaption())}
                          onCopyImage={async () => {
                            setIsCapturingMilestones(true);
                            try {
                              const blob = await captureMilestonesCard();
                              if (!blob) return false;
                              const copied = await LocalShareService.copyImageToClipboard(blob);
                              showStatus(copied ? 'Milestones card copied.' : 'Could not copy milestones card.');
                              return copied;
                            } catch (err) {
                              console.error(err);
                              showStatus('Could not generate milestones card.');
                              return false;
                            } finally {
                              setIsCapturingMilestones(false);
                            }
                          }}
                          onSaveImage={async () => {
                            setIsCapturingMilestones(true);
                            try {
                              const blob = await captureMilestonesCard();
                              if (!blob) return;
                              const url = URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = `gamepilot-milestones-${selectedYear}.png`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              URL.revokeObjectURL(url);
                              showStatus('Milestones card saved.');
                            } catch (err) {
                              console.error(err);
                              showStatus('Could not generate milestones card.');
                            } finally {
                              setIsCapturingMilestones(false);
                            }
                          }}
                          onShareText={async (channel) =>
                            LocalShareService.openShareIntent(channel, buildMilestonesCaption())
                          }
                          onDownloadText={() => {
                            LocalShareService.downloadShareText(
                              buildMilestonesCaption(),
                              `milestones-${selectedYear}.txt`
                            );
                            showStatus('Milestones caption downloaded.');
                          }}
                          buildCaption={buildMilestonesCaption}
                          onNativeShare={async () => {
                            setIsCapturingMilestones(true);
                            try {
                              const blob = await captureMilestonesCard();
                              if (!blob) return;
                              const file = new File([blob], `gamepilot-milestones-${selectedYear}.png`, {
                                type: 'image/png',
                              });
                              const result = await LocalShareService.shareWithNativeShare({
                                title: `My ${selectedYear} Gaming Milestones`,
                                text: buildMilestonesCaption(),
                                files: [file],
                              });
                              showStatus(
                                result.success ? 'Native share opened.' : result.message || 'Could not share.'
                              );
                            } catch (err) {
                              console.error(err);
                              showStatus('Could not generate milestones card.');
                            } finally {
                              setIsCapturingMilestones(false);
                            }
                          }}
                        />
                      )}
                    </div>

                    <section className="year-review-milestone-section" aria-label="Finished games">
                      <h3 className="year-review-milestone-heading">Finished</h3>
                      {snapshot.milestones?.finished?.length > 0 ? (
                        <div className="year-review-finished-grid">
                          {snapshot.milestones.finished.map((game) => (
                            <article key={game.name} className="year-review-finished-card">
                              <div className="year-review-finished-cover">
                                <LazyImage
                                  src={game.coverUrl}
                                  placeholder={getGameArtworkPlaceholder({
                                    game: { name: game.name },
                                    surface: 'portrait',
                                  })}
                                  gameName={game.name}
                                  alt={`${game.name} cover`}
                                />
                                <span
                                  className={`year-review-status-chip status-${String(game.status).replace('%', 'pct')}`}
                                >
                                  {MILESTONE_STATUS_LABELS[game.status] || game.status}
                                </span>
                              </div>
                              <div className="year-review-finished-copy">
                                <strong>{game.name}</strong>
                                <span>{formatMilestoneDate(game.at)}</span>
                                {game.finishingSession && (
                                  <small>
                                    Rolled credits in a {formatPlaytime(game.finishingSession.minutes)} session on{' '}
                                    {formatMilestoneDate(game.finishingSession.endTime)}
                                  </small>
                                )}
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <p className="year-review-milestone-empty">
                          Nothing marked finished yet — confirm beaten games from the Achievement Sweep on Home →
                          Identity.
                        </p>
                      )}
                    </section>

                    {snapshot.milestones?.achievements && (
                      <section className="year-review-milestone-section" aria-label="Achievement milestones">
                        <h3 className="year-review-milestone-heading">
                          <Medal size={16} /> Achievements
                        </h3>
                        <div className="year-review-milestone-stats">
                          <div className="year-review-milestone-stat">
                            <span>Unlocked this year</span>
                            <strong>{snapshot.milestones.achievements.unlockedThisYear}</strong>
                          </div>
                          <div className="year-review-milestone-stat">
                            <span>Games with unlocks</span>
                            <strong>{snapshot.milestones.achievements.gamesWithUnlocks}</strong>
                          </div>
                          {snapshot.milestones.achievements.rarest && (
                            <div className="year-review-milestone-stat">
                              <span>Rarest unlock</span>
                              <strong>{snapshot.milestones.achievements.rarest.name}</strong>
                              <p>
                                {snapshot.milestones.achievements.rarest.percent}% of players ·{' '}
                                {snapshot.milestones.achievements.rarest.gameName}
                              </p>
                            </div>
                          )}
                          {snapshot.milestones.achievements.busiestDay && (
                            <div className="year-review-milestone-stat">
                              <span>Biggest unlock day</span>
                              <strong>{snapshot.milestones.achievements.busiestDay.count}</strong>
                              <p>{formatMilestoneDate(snapshot.milestones.achievements.busiestDay.date)}</p>
                            </div>
                          )}
                        </div>
                      </section>
                    )}

                    {snapshot.milestones?.comebacks?.length > 0 && (
                      <section className="year-review-milestone-section" aria-label="Comeback games">
                        <h3 className="year-review-milestone-heading">
                          <RotateCcw size={16} /> Comebacks
                        </h3>
                        <ul className="year-review-comeback-list">
                          {snapshot.milestones.comebacks.map((entry) => (
                            <li key={entry.name}>
                              <LazyImage
                                className="year-review-comeback-cover"
                                src={entry.coverUrl}
                                placeholder={getGameArtworkPlaceholder({
                                  game: { name: entry.name },
                                  surface: 'portrait',
                                })}
                                gameName={entry.name}
                                alt=""
                              />
                              <span>
                                {entry.name} — back after {entry.gapDays} days ({formatMilestoneDate(entry.returnedAt)})
                              </span>
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}

                    {snapshot.milestones?.firsts?.length > 0 && (
                      <section className="year-review-milestone-section" aria-label="First-time games">
                        <h3 className="year-review-milestone-heading">
                          <Sparkles size={16} /> Firsts
                          <span className="year-review-milestone-sub">
                            {snapshot.milestones.firstsCount} new games this year
                          </span>
                        </h3>
                        <div className="year-review-firsts-row">
                          {snapshot.milestones.firsts.map((game) => (
                            <div key={game.name} className="year-review-first-tile">
                              <LazyImage
                                className="year-review-first-cover"
                                src={game.coverUrl}
                                placeholder={getGameArtworkPlaceholder({
                                  game: { name: game.name },
                                  surface: 'portrait',
                                })}
                                gameName={game.name}
                                alt={`${game.name} cover`}
                              />
                              <strong>{game.name}</strong>
                              <span>{formatPlaytime(game.playtimeMinutes)}</span>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {(snapshot.milestones?.records?.longestStreakDays ||
                      snapshot.milestones?.records?.biggestMonth ||
                      snapshot.milestones?.records?.mostSessionsDay) && (
                      <section className="year-review-milestone-section" aria-label="Yearly records">
                        <h3 className="year-review-milestone-heading">
                          <Calendar size={16} /> Records
                        </h3>
                        <div className="year-review-milestone-stats">
                          {snapshot.milestones.records.longestStreakDays && (
                            <div className="year-review-milestone-stat">
                              <span>Longest streak</span>
                              <strong>
                                {snapshot.milestones.records.longestStreakDays.days} day
                                {snapshot.milestones.records.longestStreakDays.days === 1 ? '' : 's'}
                              </strong>
                              <p>
                                {formatMilestoneDate(snapshot.milestones.records.longestStreakDays.startDate)} –{' '}
                                {formatMilestoneDate(snapshot.milestones.records.longestStreakDays.endDate)}
                              </p>
                            </div>
                          )}
                          {snapshot.milestones.records.biggestMonth && (
                            <div className="year-review-milestone-stat">
                              <span>Biggest month</span>
                              <strong>{snapshot.milestones.records.biggestMonth.label}</strong>
                              <p>{formatPlaytime(snapshot.milestones.records.biggestMonth.minutes)}</p>
                            </div>
                          )}
                          {snapshot.milestones.records.mostSessionsDay && (
                            <div className="year-review-milestone-stat">
                              <span>Most sessions in a day</span>
                              <strong>{snapshot.milestones.records.mostSessionsDay.count}</strong>
                              <p>{formatMilestoneDate(snapshot.milestones.records.mostSessionsDay.date)}</p>
                            </div>
                          )}
                        </div>
                      </section>
                    )}
                  </article>
                </div>
              )}

              {(activeTab === 'eras' || isCapturingAll) && (
                <div
                  role="tabpanel"
                  id="year-review-panel-eras"
                  aria-labelledby="year-review-tab-eras"
                  className="year-review-tabpanel"
                >
                  {(snapshot.eras?.stretches?.length > 0 || snapshot.eras?.recorded?.length > 0) && (
                    <section className="year-review-eras-section">
                      <div className="year-review-eras-header">
                        <div>
                          <span className="year-review-kicker">Month by month</span>
                          <h2>
                            <Hourglass size={21} /> The Eras of Your Year
                          </h2>
                          <p>
                            Consecutive months that shared the same dominant genre, mood, and top game merge into one
                            stretch — your {selectedYear} as a series of eras.
                          </p>
                        </div>
                      </div>
                      {snapshot.eras?.stretches?.length > 0 && (
                        <EraTimelineBar stretches={snapshot.eras.stretches} showLabels />
                      )}
                      {snapshot.eras?.stretches?.length > 0 && (
                        <div className="year-review-era-track">
                          {snapshot.eras.stretches.map((era) => (
                            <article
                              key={`${era.startMonth}-${era.endMonth}`}
                              className="year-review-era-card"
                              style={{ flexGrow: era.monthCount }}
                            >
                              <span className="year-review-era-months">{era.monthLabel}</span>
                              <h3>{era.name}</h3>
                              <div className="year-review-era-signature">
                                {era.dominantGenre && era.dominantGenre !== 'Unknown' && (
                                  <span>{era.dominantGenre}</span>
                                )}
                                {era.dominantMood && era.dominantMood !== 'Unknown' && <span>{era.dominantMood}</span>}
                              </div>
                              <div className="year-review-era-stats">
                                <span>{era.playtimeHours}h</span>
                                <span>
                                  {era.sessionCount} session{era.sessionCount === 1 ? '' : 's'}
                                </span>
                                {era.topGame && <span className="year-review-era-top-game">{era.topGame}</span>}
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                      {snapshot.eras?.recorded?.length > 0 && (
                        <div className="year-review-recorded-eras">
                          <span className="year-review-recorded-eras-label">
                            Era changes GamePilot recorded in {selectedYear}
                          </span>
                          <ul>
                            {snapshot.eras.recorded.map((entry) => (
                              <li key={`${entry.since}-${entry.name}`}>
                                <strong>{entry.name}</strong>
                                <span>
                                  began {entry.dateLabel}
                                  {entry.topGame ? ` · led by ${entry.topGame}` : ''}
                                  {entry.isCurrent ? ' · still going' : ''}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </section>
                  )}

                  {snapshot.championJourney?.yearChampion && (
                    <section className="year-review-champion-journey">
                      <div className="year-review-champion-heading">
                        <div>
                          <span className="year-review-kicker">Your year in games</span>
                          <h2>
                            <Trophy size={21} /> Champion journey
                          </h2>
                          <p>The games that defined each month, led by your most-played game of {selectedYear}.</p>
                        </div>
                      </div>
                      <div className="year-review-year-champion">
                        <div className="year-review-year-champion-cover">
                          <LazyImage
                            src={snapshot.championJourney.yearChampion.game?.portrait}
                            fallbackSrc={snapshot.championJourney.yearChampion.game?.portraitFallback}
                            placeholder={snapshot.championJourney.yearChampion.game?.placeholder}
                            gameName={snapshot.championJourney.yearChampion.game?.name}
                            platform={snapshot.championJourney.yearChampion.game?.platform}
                            alt={`${snapshot.championJourney.yearChampion.game?.name} cover`}
                          />
                        </div>
                        <div className="year-review-year-champion-copy">
                          <span>Game of {selectedYear}</span>
                          <h3>{snapshot.championJourney.yearChampion.game?.name}</h3>
                          <div className="year-review-year-champion-stats">
                            <div>
                              <strong>{formatPlaytime(snapshot.championJourney.yearChampion.minutes)}</strong>
                              <span>played</span>
                            </div>
                            <div>
                              <strong>{snapshot.championJourney.yearChampion.sessionCount}</strong>
                              <span>sessions</span>
                            </div>
                            <div>
                              <strong>
                                {formatPlaytime(snapshot.championJourney.yearChampion.longestSessionMinutes)}
                              </strong>
                              <span>longest sitting</span>
                            </div>
                            <div>
                              <strong>
                                {Math.round(
                                  (snapshot.championJourney.yearChampion.minutes /
                                    Math.max(1, snapshot.championJourney.yearChampion.totalPeriodMinutes)) *
                                    100
                                )}
                                %
                              </strong>
                              <span>of yearly play</span>
                            </div>
                          </div>
                          <p>
                            {formatPlaytime(snapshot.championJourney.yearChampion.totalPeriodMinutes)} across{' '}
                            {snapshot.championJourney.yearChampion.totalPeriodSessions} sessions and{' '}
                            {snapshot.championJourney.yearChampion.periodGameCount} games this year.
                          </p>
                        </div>
                      </div>
                      {snapshot.championJourney.monthlyChampions.length > 0 && (
                        <div className="year-review-month-champions">
                          {snapshot.championJourney.monthlyChampions.map((champion) => (
                            <article key={champion.periodKey} className="year-review-month-champion">
                              <div className="year-review-month-cover">
                                <LazyImage
                                  src={champion.game?.portrait}
                                  fallbackSrc={champion.game?.portraitFallback}
                                  placeholder={champion.game?.placeholder}
                                  gameName={champion.game?.name}
                                  platform={champion.game?.platform}
                                  alt={`${champion.game?.name} cover`}
                                />
                                <span>{champion.monthLabel}</span>
                              </div>
                              <div className="year-review-month-copy">
                                <strong title={champion.game?.name}>{champion.game?.name}</strong>
                                <span>
                                  {formatPlaytime(champion.minutes)} · {champion.sessionCount} session
                                  {champion.sessionCount === 1 ? '' : 's'}
                                </span>
                                <small>Longest: {formatPlaytime(champion.longestSessionMinutes)}</small>
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                    </section>
                  )}
                </div>
              )}

              {(activeTab === 'numbers' || isCapturingAll) && (
                <div
                  role="tabpanel"
                  id="year-review-panel-numbers"
                  aria-labelledby="year-review-tab-numbers"
                  className="year-review-tabpanel"
                >
                  <article className="year-review-panel year-review-timeline-panel">
                    <div className="panel-heading">
                      <div>
                        <h2>
                          <TrendingUp size={20} /> Monthly Rhythm
                        </h2>
                        <p>
                          {standoutMonth
                            ? `${standoutMonth[0]} led the year with ${standoutMonth[1]} hours logged.`
                            : 'Monthly playtime totals.'}
                        </p>
                      </div>
                    </div>
                    <div className="month-bars">
                      {activeMonths.map((month) => {
                        const hours = snapshot.monthly.playtimeHours[month] || 0;
                        return (
                          <div key={month} className="month-bar-row">
                            <div className="month-bar-labels">
                              <span>{month}</span>
                              <strong>{hours}h</strong>
                            </div>
                            <div className="month-bar-track">
                              <div
                                className="month-bar-fill"
                                style={{ width: `${Math.max((hours / maxMonthlyHours) * 100, hours > 0 ? 8 : 0)}%` }}
                              />
                            </div>
                            <small>{snapshot.monthly.sessionCounts[month]} sessions</small>
                          </div>
                        );
                      })}
                      {quietMonthsLabel && <p className="month-bar-quiet">{quietMonthsLabel}: no tracked sessions</p>}
                    </div>
                  </article>

                  <section className="year-review-deep-stats-grid">
                    <article className="year-review-deep-stat-card">
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
                    <article className="year-review-panel year-review-breakdown-panel">
                      <div className="panel-heading">
                        <div>
                          <h2>
                            <Calendar size={20} /> Your Mix
                          </h2>
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

                    <article className="year-review-panel year-review-top-games-panel">
                      <div className="panel-heading">
                        <div>
                          <h2>
                            <ListOrdered size={20} /> Top Games
                          </h2>
                          <p>Ranked by real tracked playtime in {selectedYear}.</p>
                        </div>
                      </div>
                      <ol className="year-review-top-games">
                        {(snapshot.topGames || []).map((game, index) => (
                          <li key={game.id || game.name || index}>
                            <span className="year-review-top-game-rank">{index + 1}</span>
                            <div className="year-review-top-game-info">
                              <strong>{game.name}</strong>
                              <span>
                                {formatPlaytime(game.totalPlaytime)} · {game.sessions} session
                                {game.sessions === 1 ? '' : 's'}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </article>
                  </section>
                </div>
              )}
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
            zIndex: -1,
          }}
        >
          <div ref={shareCardRef}>
            <YearInReviewShareCard snapshot={snapshot} year={selectedYear} username={pilotName} />
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
            zIndex: -1,
          }}
        >
          <div ref={storyShareCardRef}>
            {snapshot?.story?.paragraphs?.length > 0 && (
              <YearInReviewStoryShareCard
                story={snapshot.story}
                stretches={snapshot.eras?.stretches}
                year={selectedYear}
                username={pilotName}
              />
            )}
          </div>
        </div>

        {/* Offscreen milestones share card — captured when sharing the milestones tab. */}
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            opacity: 0,
            pointerEvents: 'none',
            zIndex: -1,
          }}
        >
          <div ref={milestonesShareCardRef}>
            {snapshot?.milestones?.hasAny && (
              <MilestonesShareCard milestones={snapshot.milestones} year={selectedYear} username={pilotName} />
            )}
          </div>
        </div>
      </div>

      {wrappedOpen && snapshot?.hasData && (
        <YearWrappedModal snapshot={snapshot} year={selectedYear} username={pilotName} onClose={closeWrapped} />
      )}
    </div>
  );
}

export default YearInReview;
