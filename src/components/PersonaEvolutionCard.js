import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import './PersonaEvolutionCard.css';

const renderMix = (mix = []) => {
  if (!Array.isArray(mix) || mix.length === 0) return null;
  return (
    <div className="persona-evolution-mix">
      {mix.slice(0, 3).map((entry) => (
        <span key={entry.label} className="persona-evolution-chip">
          {entry.label}
        </span>
      ))}
    </div>
  );
};

const PersonaSegment = ({ heading, persona }) => {
  if (!persona) return null;
  return (
    <div className="persona-evolution-segment">
      <span className="persona-evolution-heading">{heading}</span>
      <strong className="persona-evolution-label">{persona.identityLabel}</strong>
      <p className="persona-evolution-description">{persona.identityDescription}</p>
      <div className="persona-evolution-meta">
        {persona.dominantMood && (
          <div>
            <span>Mood</span>
            <strong>{persona.dominantMood}</strong>
          </div>
        )}
        {persona.dominantGenre && (
          <div>
            <span>Genre</span>
            <strong>{persona.dominantGenre}</strong>
          </div>
        )}
        {persona.preferredSessionLabel && (
          <div>
            <span>Sessions</span>
            <strong>{persona.preferredSessionLabel}</strong>
          </div>
        )}
      </div>
      {renderMix(persona.moodMix)}
    </div>
  );
};

const PersonaEvolutionCard = ({ evolution }) => {
  if (!evolution || !evolution.opening || !evolution.closing) {
    return (
      <div className="persona-evolution-card persona-evolution-empty">
        <Sparkles size={20} />
        <div>
          <strong>Your identity arc will appear here</strong>
          <p>Finish a few more sessions and GamePilot will map how your taste shifts over time — locally, no data leaves this device.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="persona-evolution-card">
      <div className="persona-evolution-summary">
        <Sparkles size={18} />
        <span>{evolution.summary}</span>
      </div>
      <div className="persona-evolution-arc">
        <PersonaSegment heading="Where you started" persona={evolution.opening} />
        <ArrowRight size={22} className="persona-evolution-arrow" />
        <PersonaSegment heading="Where you are now" persona={evolution.closing} />
      </div>
    </div>
  );
};

export default PersonaEvolutionCard;
