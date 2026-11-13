import React from 'react';
import { getPersonaVisual, accentToRgb } from './personaVisuals';
import { getShareCardWatermark } from './ShareCardWatermark';

export const WRAPPED_PERSONA_CARD_SIZE = 1080;

// Share card for the Wrapped persona slide — the reveal distilled to one
// image: emblem, verdict label, the roast, and who earned it.
export default function WrappedPersonaShareCard({ persona, year, username }) {
  const p = persona || {};
  const visual = getPersonaVisual(p.identityThemeId, p.identityId);
  const PersonaIcon = visual.icon;
  const rgb = accentToRgb(visual.accent) || '255,140,26';
  return (
    <div
      className="wrapped-persona-share-card"
      style={{
        width: WRAPPED_PERSONA_CARD_SIZE,
        height: WRAPPED_PERSONA_CARD_SIZE,
        background: 'radial-gradient(circle at 50% 30%, #1a1d28 0%, #0b0d13 70%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'inherit',
        color: '#e8eaf0',
        textAlign: 'center',
        padding: 80,
        boxSizing: 'border-box',
      }}
    >
      <p style={{ margin: '0 0 28px', fontSize: 34, letterSpacing: 6, textTransform: 'uppercase', color: '#8b919f' }}>
        {username} · {year} in review
      </p>
      <div
        style={{
          width: 220,
          height: 220,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `rgba(${rgb}, 0.14)`,
          border: `3px solid ${visual.accent}`,
          boxShadow: `0 0 80px rgba(${rgb}, 0.45)`,
          color: visual.accent,
          marginBottom: 40,
        }}
      >
        <PersonaIcon size={110} aria-hidden="true" />
      </div>
      <h2 style={{ margin: '0 0 16px', fontSize: 64, fontWeight: 800, color: visual.accent }}>
        {p.identityLabel || 'Adaptive Pilot'}
      </h2>
      {p.identityDescription ? (
        <p style={{ margin: '0 0 32px', fontSize: 30, lineHeight: 1.4, color: '#c4c9d4', maxWidth: 800 }}>
          {p.identityDescription}
        </p>
      ) : null}
      {p.roast ? (
        <p style={{ margin: 0, fontSize: 28, fontStyle: 'italic', color: '#8b919f', maxWidth: 800 }}>
          &ldquo;{p.roast}&rdquo;
        </p>
      ) : null}
      <p style={{ marginTop: 60, fontSize: 24, color: '#565d6b' }}>
        {getShareCardWatermark('github', 'identity')?.cta || 'GamePilot — every number from local sessions'}
      </p>
    </div>
  );
}
