import React, { useMemo, useState } from 'react';
import { BarChart3, Gamepad2, Heart, Library, Rocket, ScanSearch, Settings, ShieldCheck, Sparkles, Target } from 'lucide-react';
import StorageService from '../services/StorageService';
import './FirstRunWalkthrough.css';

const WALKTHROUGH_STORAGE_KEY = 'firstRunWalkthroughCompleted';

const WALKTHROUGH_STEPS = [
  {
    icon: Rocket,
    eyebrow: 'Welcome aboard',
    title: 'GamePilot helps you decide what to play next.',
    body: 'It turns your local game library into a personal command center for choosing, launching, tracking, and rediscovering games without needing a cloud account.',
    highlights: ['Scan your library', 'Pick by mood or time', 'Keep everything local']
  },
  {
    icon: Target,
    eyebrow: 'Better recommendations',
    title: 'Recommendations are built around how you actually play.',
    body: 'Perfect Play, Surprise Me, Continue Playing, and Rediscover are there to cut through backlog paralysis and match the right game to the session you want right now.',
    highlights: ['Mood matching', 'Session length filters', 'Backlog rediscovery']
  },
  {
    icon: BarChart3,
    eyebrow: 'Habits and progression',
    title: 'XP rewards consistent gaming habits, not busywork.',
    body: 'GamePilot tracks sessions, active days, completions, streaks, and playtime to show your rhythm and unlock cosmetic rewards as you build momentum.',
    highlights: ['Habit XP', 'Levels', 'Local stats']
  },
  {
    icon: Library,
    eyebrow: 'Library control',
    title: 'Your library becomes easier to maintain.',
    body: 'Use ratings, favorites, collections, completion states, notes, custom cover art, and hidden games to keep your catalog useful instead of just large.',
    highlights: ['Collections', 'Ratings', 'Completion tracking']
  },
  {
    icon: ShieldCheck,
    eyebrow: 'Local-first by design',
    title: 'Your data stays on your machine.',
    body: 'GamePilot is designed as a local-first companion. The app focuses on practical organization, recommendations, stats, and customization without requiring backend tracking.',
    highlights: ['No cloud account required', 'Local preferences', 'Export-friendly data']
  },
  {
    icon: ScanSearch,
    eyebrow: 'Set up your command center',
    title: 'Start by scanning your local game installs.',
    body: 'GamePilot works best after it detects your launchers and builds your local library. You can scan now, review the Library, or open Settings if you want to tune things first.',
    highlights: ['Detect launchers', 'Review your library', 'Tune preferences']
  }
];

export const shouldShowFirstRunWalkthrough = () => StorageService.getString(WALKTHROUGH_STORAGE_KEY) !== 'true';

export const markFirstRunWalkthroughComplete = () => {
  StorageService.setString(WALKTHROUGH_STORAGE_KEY, 'true');
};

function FirstRunWalkthrough({ isOpen, onClose, onOpenLibrary, onOpenSettings, onStartScan }) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = WALKTHROUGH_STEPS[stepIndex];
  const Icon = step.icon;
  const isFinalStep = stepIndex === WALKTHROUGH_STEPS.length - 1;

  const progressPercent = useMemo(() => {
    return ((stepIndex + 1) / WALKTHROUGH_STEPS.length) * 100;
  }, [stepIndex]);

  if (!isOpen) {
    return null;
  }

  const closeWalkthrough = () => {
    markFirstRunWalkthroughComplete();
    onClose();
  };

  const handleNext = () => {
    if (isFinalStep) {
      closeWalkthrough();
      return;
    }
    setStepIndex((current) => Math.min(current + 1, WALKTHROUGH_STEPS.length - 1));
  };

  const handleBack = () => {
    setStepIndex((current) => Math.max(current - 1, 0));
  };

  const handleOpenLibrary = () => {
    closeWalkthrough();
    onOpenLibrary();
  };

  const handleOpenSettings = () => {
    closeWalkthrough();
    onOpenSettings();
  };

  const handleStartScan = () => {
    closeWalkthrough();
    if (typeof onStartScan === 'function') {
      onStartScan();
    }
  };

  return (
    <div className="walkthrough-overlay" role="dialog" aria-modal="true" aria-labelledby="walkthrough-title">
      <div className="walkthrough-modal">
        <div className="walkthrough-progress-track">
          <span style={{ width: `${progressPercent}%` }} />
        </div>

        <button className="walkthrough-skip" type="button" onClick={closeWalkthrough}>Skip</button>

        <div className="walkthrough-icon-wrap">
          <Icon size={34} />
        </div>

        <p className="walkthrough-eyebrow">{step.eyebrow}</p>
        <h2 id="walkthrough-title">{step.title}</h2>
        <p className="walkthrough-body">{step.body}</p>

        <div className="walkthrough-highlights">
          {step.highlights.map((highlight) => (
            <span key={highlight}>
              <Sparkles size={14} />
              {highlight}
            </span>
          ))}
        </div>

        <div className="walkthrough-support-card">
          <div>
            <Heart size={18} />
            <strong>Supporter extras</strong>
          </div>
          <p>Patreon supporters can unlock exclusive themes plus custom backgrounds and accent colors.</p>
        </div>

        <div className="walkthrough-footer">
          <div className="walkthrough-dots" aria-label={`Step ${stepIndex + 1} of ${WALKTHROUGH_STEPS.length}`}>
            {WALKTHROUGH_STEPS.map((item, index) => (
              <button
                key={item.title}
                type="button"
                className={index === stepIndex ? 'active' : ''}
                onClick={() => setStepIndex(index)}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>

          <div className="walkthrough-actions">
            {stepIndex > 0 && (
              <button type="button" className="walkthrough-secondary" onClick={handleBack}>Back</button>
            )}
            {isFinalStep && (
              <>
                <button type="button" className="walkthrough-secondary" onClick={handleOpenSettings}>
                  <Settings size={16} />
                  Settings
                </button>
                <button type="button" className="walkthrough-secondary" onClick={handleOpenLibrary}>
                  <Gamepad2 size={16} />
                  Library
                </button>
                <button type="button" className="walkthrough-primary" onClick={handleStartScan}>
                  <ScanSearch size={16} />
                  Scan now
                </button>
              </>
            )}
            {!isFinalStep && (
              <button type="button" className="walkthrough-primary" onClick={handleNext}>Next</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FirstRunWalkthrough;
