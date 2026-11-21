import React, { useState, useEffect, useCallback } from 'react';
import StorageService from '../services/StorageService';
import './GuidedTour.css';

const TOUR_STORAGE_KEY = 'guidedTourCompleted';
export const TOUR_START_EVENT = 'gamepilot:start-guided-tour';

const TOUR_STEPS = [
  {
    selector: null,
    emoji: '🛩️',
    title: 'Welcome to GamePilot',
    body: 'Your games have been recording your life. GamePilot reads it back — your library, sessions and biography all stay on your machine.',
  },
  {
    selector: '.nav-search-pill',
    title: 'Search Everything',
    body: 'Jump to any game or page. Press / anywhere in the app to open the command palette instantly.',
  },
  {
    selector: 'a[href="#/"]',
    title: 'Home — Your Daily Cockpit',
    body: 'The doodle greets you by mood and time of day, Play Next picks something worth starting, and your gaming vitals show the week taking shape.',
  },
  {
    selector: '.home-view-navigation',
    title: 'Six Views on Home',
    body: 'Today is the cockpit. Discover finds something to play, Activity tracks sessions and recaps, Chronicle writes your biography, Identity holds your persona and eras, and Wishlist watches prices.',
  },
  {
    selector: 'a[href="#/library"]',
    title: 'Library',
    body: 'Scan Steam, Epic, GOG, and local folders, then manage, rate, and organise everything you own.',
  },
  {
    selector: 'a[href="#/recommendations"]',
    title: 'Recommendations',
    body: 'Picks matched to your moods, session length, and playstyle — pulled from your own library, not a store chart.',
  },
  {
    selector: 'a[href="#/profile"]',
    title: 'Profile',
    body: 'Your gaming persona lives here — archetypes, roasts, signature games, and your equipped identity gear.',
  },
  {
    selector: '.dropdown-toggle',
    title: 'More Pages',
    body: 'Your Gaming Life, Hall of Champions, Recent Activity, Trending, Storage Manager, and Feedback live under this menu.',
  },
  {
    selector: null,
    emoji: '📖',
    title: 'The Story Is the Point',
    body: 'Every session sharpens your persona, names your eras, and writes your Chronicle. Replay this tour anytime from Settings → About & Feedback.',
  },
];

const POPOVER_WIDTH = 320;
const POPOVER_HEIGHT_ESTIMATE = 190;
const MARGIN = 14;

const GuidedTour = () => {
  const [isActive, setIsActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);

  const finishTour = useCallback(() => {
    StorageService.set(TOUR_STORAGE_KEY, true);
    setIsActive(false);
    setStepIndex(0);
    setTargetRect(null);
  }, []);

  const startTour = useCallback(() => {
    setStepIndex(0);
    setIsActive(true);
  }, []);

  // The tour is opt-in only: it starts on demand (Settings → About & Feedback,
  // or the first-story card) rather than interrupting the first-run reveal.
  useEffect(() => {
    const handleStartRequest = () => startTour();

    window.addEventListener(TOUR_START_EVENT, handleStartRequest);
    return () => window.removeEventListener(TOUR_START_EVENT, handleStartRequest);
  }, [startTour]);

  const step = TOUR_STEPS[stepIndex];

  const measureTarget = useCallback(() => {
    if (!isActive || !step) {
      return;
    }

    if (!step.selector) {
      setTargetRect(null);
      return;
    }

    const element = document.querySelector(step.selector);
    if (!element) {
      setTargetRect(null);
      return;
    }

    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      setTargetRect(null);
      return;
    }

    setTargetRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });
  }, [isActive, step]);

  // Measure whenever the step changes
  useEffect(() => {
    if (!isActive) {
      return undefined;
    }

    const raf = requestAnimationFrame(measureTarget);
    return () => cancelAnimationFrame(raf);
  }, [isActive, stepIndex, measureTarget]);

  // Keep position accurate on resize and scroll
  useEffect(() => {
    if (!isActive) {
      return undefined;
    }

    const handleReposition = () => measureTarget();
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isActive, measureTarget]);

  // Escape skips the tour
  useEffect(() => {
    if (!isActive) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        finishTour();
      }
      if (event.key === 'ArrowRight') {
        setStepIndex((index) => Math.min(index + 1, TOUR_STEPS.length - 1));
      }
      if (event.key === 'ArrowLeft') {
        setStepIndex((index) => Math.max(index - 1, 0));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, finishTour]);

  const handleNext = useCallback(() => {
    if (stepIndex >= TOUR_STEPS.length - 1) {
      finishTour();
      return;
    }
    setStepIndex(stepIndex + 1);
  }, [stepIndex, finishTour]);

  const handleBack = useCallback(() => {
    setStepIndex((index) => Math.max(index - 1, 0));
  }, []);

  if (!isActive || !step) {
    return null;
  }

  const isLastStep = stepIndex === TOUR_STEPS.length - 1;

  // Spotlight position: over the target, or full-screen for centered steps
  const spotlightStyle = targetRect
    ? {
        top: targetRect.top - 6,
        left: targetRect.left - 6,
        width: targetRect.width + 12,
        height: targetRect.height + 12,
      }
    : {
        top: '50%',
        left: '50%',
        width: 0,
        height: 0,
      };

  // Popover position: below the target if there's room, otherwise above; centered steps sit mid-screen
  let popoverStyle;
  if (!targetRect) {
    popoverStyle = {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  } else {
    const spaceBelow = window.innerHeight - (targetRect.top + targetRect.height);
    const showBelow = spaceBelow > POPOVER_HEIGHT_ESTIMATE + MARGIN * 2;
    const left = Math.min(
      Math.max(MARGIN, targetRect.left + targetRect.width / 2 - POPOVER_WIDTH / 2),
      window.innerWidth - POPOVER_WIDTH - MARGIN
    );

    popoverStyle = showBelow
      ? { top: targetRect.top + targetRect.height + MARGIN, left }
      : { top: Math.max(MARGIN, targetRect.top - POPOVER_HEIGHT_ESTIMATE - MARGIN), left };
  }

  return (
    <div className="guided-tour-layer" role="dialog" aria-label="Guided tour" aria-modal="true">
      <div className="guided-tour-spotlight" style={spotlightStyle} aria-hidden="true" />
      <div className="guided-tour-popover" style={popoverStyle}>
        <div className="guided-tour-header">
          {step.emoji && <span className="guided-tour-emoji">{step.emoji}</span>}
          <span className="guided-tour-step-count">
            Step {stepIndex + 1} of {TOUR_STEPS.length}
          </span>
        </div>
        <h3 className="guided-tour-title">{step.title}</h3>
        <p className="guided-tour-body">{step.body}</p>
        <div className="guided-tour-progress" aria-hidden="true">
          {TOUR_STEPS.map((_, index) => (
            <span
              key={index}
              className={`guided-tour-dot ${index === stepIndex ? 'active' : ''} ${index < stepIndex ? 'done' : ''}`}
            />
          ))}
        </div>
        <div className="guided-tour-actions">
          <button type="button" className="guided-tour-btn ghost" onClick={finishTour}>
            Skip tour
          </button>
          <div className="guided-tour-actions-right">
            {stepIndex > 0 && (
              <button type="button" className="guided-tour-btn" onClick={handleBack}>
                Back
              </button>
            )}
            <button type="button" className="guided-tour-btn primary" onClick={handleNext}>
              {isLastStep ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
        <span className="guided-tour-hint">Esc to skip · ← → to step</span>
      </div>
    </div>
  );
};

export default GuidedTour;
