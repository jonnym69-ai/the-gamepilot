import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, BookOpen, Scale, Sparkles } from 'lucide-react';
import StorageService from '../services/StorageService';
import InterfacePreferencesService from '../services/InterfacePreferencesService';
import { StartupPersonalizationService } from '../services/StartupPersonalizationService';
import './ExperienceModeBanner.css';

const DISMISS_KEY = 'experienceModeBannerDismissed';

const PRESETS = [
  { id: 'librarian', label: 'Librarian', Icon: BookOpen, hint: 'Pure tool. No streaks, daily, or quests.', apply: () => InterfacePreferencesService.applyLibrarianPreset() },
  { id: 'balanced', label: 'Balanced', Icon: Scale, hint: 'Tool-first with light gamification.', apply: () => InterfacePreferencesService.applyBalancedPreset() },
  { id: 'full', label: 'Full experience', Icon: Sparkles, hint: 'Everything on.', apply: () => InterfacePreferencesService.applyFullPreset() }
];

export default function ExperienceModeBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show once the taste questionnaire is done (avoid stacking modals)
    // and only if the user hasn't explicitly picked a mode or dismissed.
    try {
      const onboarded = StartupPersonalizationService.hasCompletedOnboarding();
      const mode = InterfacePreferencesService.getExperienceMode();
      const dismissed = StorageService.get(DISMISS_KEY, false);
      if (onboarded && !mode && !dismissed) {
        setVisible(true);
      }
    } catch (_err) {
      // Defensive: never block Home rendering because of this banner.
      setVisible(false);
    }
  }, []);

  if (!visible) return null;

  const handlePick = (preset) => {
    try { preset.apply(); } catch (_err) { /* ignore */ }
    StorageService.set(DISMISS_KEY, true);
    setVisible(false);
  };

  const handleDismiss = () => {
    StorageService.set(DISMISS_KEY, true);
    setVisible(false);
  };

  return (
    <div className="experience-mode-banner" role="region" aria-label="Choose your experience">
      <div className="experience-mode-copy">
        <strong>How do you want to use GamePilot?</strong>
        <span>Pick an experience mode \u2014 you can fine-tune or change it any time in Settings &rarr; Interface.</span>
      </div>
      <div className="experience-mode-actions">
        {PRESETS.map((preset) => {
          const Icon = preset.Icon;
          return (
            <button
              key={preset.id}
              type="button"
              className="experience-mode-btn"
              onClick={() => handlePick(preset)}
              title={preset.hint}
            >
              <Icon size={14} />
              {preset.label}
            </button>
          );
        })}
        <Link to="/settings" className="experience-mode-link" onClick={handleDismiss}>
          Customize instead
        </Link>
      </div>
      <button type="button" className="experience-mode-close" onClick={handleDismiss} aria-label="Dismiss">
        <X size={14} />
      </button>
    </div>
  );
}
