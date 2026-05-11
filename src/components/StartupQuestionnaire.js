import React, { useMemo, useState } from 'react';
import { Crown, Sparkles } from 'lucide-react';
import { GENRES, MOODS } from '../constants/GenresMoods';
import { StartupPersonalizationService } from '../services/StartupPersonalizationService';
import './StartupQuestionnaire.css';

const STEP_COUNT = 4;

const VIBE_DESCRIPTIONS = {
  'Comfort Seeker': 'You come to games to relax, reset, and settle into familiar favorites.',
  'Challenge Chaser': 'You like tough fights, mastery arcs, and testing your limits.',
  'Story Hunter': 'You want rich worlds, strong characters, and memorable narrative beats.',
  Experimenter: 'You like trying weird, fresh, or surprising things instead of staying in one lane.',
  Completionist: 'You love finishing systems, collecting everything, and clearing the map.',
  'Variety Seeker': 'You like bouncing between different moods, genres, and session styles.'
};

const STYLE_DESCRIPTIONS = {
  Cozy: 'Warm, relaxed, soft-energy cockpit feel.',
  Focused: 'Clean, purposeful, mission-control energy.',
  Energetic: 'Lively, bright, momentum-forward presentation.',
  Prestige: 'Premium, polished, celebratory identity feel.',
  Minimal: 'Quiet, sharp, uncluttered librarian mode.'
};

export default function StartupQuestionnaire({ isOpen, founderTier, onComplete, onSkip }) {
  const [step, setStep] = useState(0);
  const [selectedMoods, setSelectedMoods] = useState([]);
  const [favoriteGenres, setFavoriteGenres] = useState([]);
  const [sessionPreference, setSessionPreference] = useState('medium');
  const [playerVibe, setPlayerVibe] = useState('Variety Seeker');
  const [personalizationStyle, setPersonalizationStyle] = useState('Focused');

  const founderEnhanced = Boolean(founderTier);
  const sessionOptions = useMemo(() => StartupPersonalizationService.getSessionOptions(), []);
  const playerVibes = useMemo(() => StartupPersonalizationService.getPlayerVibes(), []);
  const personalizationStyles = useMemo(() => StartupPersonalizationService.getPersonalizationStyles(), []);

  if (!isOpen) {
    return null;
  }

  const toggleSelection = (value, values, setter, maxSelections) => {
    if (values.includes(value)) {
      setter(values.filter((entry) => entry !== value));
      return;
    }

    if (values.length >= maxSelections) {
      return;
    }

    setter([...values, value]);
  };

  const canContinue = (() => {
    if (step === 0) return selectedMoods.length >= 2;
    if (step === 1) return favoriteGenres.length >= 3;
    if (step === 2) return Boolean(sessionPreference);
    return Boolean(playerVibe && personalizationStyle);
  })();

  const handleComplete = () => {
    const savedProfile = StartupPersonalizationService.completeOnboarding({
      selectedMoods,
      favoriteGenres,
      sessionPreference,
      playerVibe,
      personalizationStyle
    }, {
      founderEnhanced
    });

    window.dispatchEvent(new CustomEvent('gamepilot:startup-questionnaire-completed', {
      detail: savedProfile
    }));

    onComplete?.(savedProfile);
  };

  const handleSkip = () => {
    const savedProfile = StartupPersonalizationService.skipOnboarding();

    window.dispatchEvent(new CustomEvent('gamepilot:startup-questionnaire-completed', {
      detail: savedProfile
    }));

    onSkip?.(savedProfile);
  };

  return (
    <div className="startup-questionnaire-overlay">
      <div className={`startup-questionnaire-modal ${founderEnhanced ? 'founder-enhanced' : ''}`}>
        <div className="startup-questionnaire-header">
          <div className="startup-questionnaire-kicker">
            <Sparkles size={16} /> First Launch Personalization
          </div>
          <h2>Make GamePilot feel like your own gaming librarian from day one.</h2>
          <p>
            Pick the moods, genres, and session style that best fit your habits. GamePilot will use this as a local starting seed for identity and recommendations, then adapt over time as your real play history grows.
          </p>
          {founderEnhanced && (
            <div className="startup-founder-pill">
              <Crown size={16} /> {founderTier} Founder enhanced onboarding
            </div>
          )}
          <div className="startup-questionnaire-progress">
            {Array.from({ length: STEP_COUNT }).map((_, index) => (
              <span key={`progress-${index}`} className={index <= step ? 'active' : ''} />
            ))}
          </div>
        </div>

        <div className="startup-questionnaire-body">
          {step === 0 && (
            <div className="startup-questionnaire-step">
              <h3>Which moods match your gaming habits?</h3>
              <p>Choose 2-4. This helps GamePilot understand the emotional lane you return to most often.</p>
              <div className="startup-chip-grid">
                {MOODS.map((mood) => (
                  <button
                    key={mood}
                    type="button"
                    className={`startup-chip ${selectedMoods.includes(mood) ? 'selected' : ''}`}
                    onClick={() => toggleSelection(mood, selectedMoods, setSelectedMoods, 4)}
                  >
                    <span className="startup-chip-title">{mood}</span>
                    <span className="startup-chip-subtitle">Fits your usual mood-driven play decisions.</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="startup-questionnaire-step">
              <h3>Which genres are your favorites?</h3>
              <p>Choose 3-5. These seed cold-start recommendations before GamePilot has enough behavior data to learn from real sessions.</p>
              <div className="startup-chip-grid">
                {GENRES.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    className={`startup-chip ${favoriteGenres.includes(genre) ? 'selected' : ''}`}
                    onClick={() => toggleSelection(genre, favoriteGenres, setFavoriteGenres, 5)}
                  >
                    <span className="startup-chip-title">{genre}</span>
                    <span className="startup-chip-subtitle">Used to seed early recommendation affinity.</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="startup-questionnaire-step">
              <h3>How long would you usually play for?</h3>
              <p>This gives GamePilot an initial session-length bias for suggestions like Perfect Play and other time-aware recommendation surfaces.</p>
              <div className="startup-choice-grid">
                {sessionOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`startup-choice-card ${sessionPreference === option.id ? 'selected' : ''}`}
                    onClick={() => setSessionPreference(option.id)}
                  >
                    <strong>{option.label}</strong>
                    <span>{option.description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="startup-questionnaire-step">
              <h3>Choose the vibe for your GamePilot.</h3>
              <p>Pick the identity that feels most like you, then choose how you want your cockpit to feel. Founders get an enhanced personalization finish layered on top.</p>
              <div className="startup-choice-grid" style={{ marginBottom: '18px' }}>
                {playerVibes.map((vibe) => (
                  <button
                    key={vibe}
                    type="button"
                    className={`startup-choice-card ${playerVibe === vibe ? 'selected' : ''}`}
                    onClick={() => setPlayerVibe(vibe)}
                  >
                    <strong>{vibe}</strong>
                    <span>{VIBE_DESCRIPTIONS[vibe]}</span>
                  </button>
                ))}
              </div>
              <div className="startup-choice-grid">
                {personalizationStyles.map((style) => (
                  <button
                    key={style}
                    type="button"
                    className={`startup-choice-card ${personalizationStyle === style ? 'selected' : ''}`}
                    onClick={() => setPersonalizationStyle(style)}
                  >
                    <strong>{style}</strong>
                    <span>{STYLE_DESCRIPTIONS[style]}</span>
                  </button>
                ))}
              </div>
              <div className="startup-summary" style={{ marginTop: '20px' }}>
                <div className="startup-summary-card">
                  <span>Moods</span>
                  <strong>{selectedMoods.join(', ')}</strong>
                </div>
                <div className="startup-summary-card">
                  <span>Genres</span>
                  <strong>{favoriteGenres.join(', ')}</strong>
                </div>
                <div className="startup-summary-card">
                  <span>Session style</span>
                  <strong>{sessionOptions.find((option) => option.id === sessionPreference)?.label}</strong>
                </div>
                <div className="startup-summary-card">
                  <span>Identity</span>
                  <strong>{playerVibe} • {personalizationStyle}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="startup-questionnaire-footer">
          <button
            type="button"
            className="ghost"
            onClick={handleSkip}
          >
            Skip for now
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => setStep((current) => Math.max(0, current - 1))}
            disabled={step === 0}
          >
            Back
          </button>
          {step === STEP_COUNT - 1 ? (
            <button type="button" className="primary" onClick={handleComplete} disabled={!canContinue}>
              Finish setup
            </button>
          ) : (
            <button
              type="button"
              className="primary"
              onClick={() => setStep((current) => Math.min(STEP_COUNT - 1, current + 1))}
              disabled={!canContinue}
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
