import React from 'react';
import { User, Trophy, TrendingUp, Calendar, Gamepad2 } from 'lucide-react';
import { ShareCardWatermark } from './ShareCardWatermark';
import GamingPersonaService from '../services/GamingPersonaService';
import './PersonaShareCard.css';

export const PERSONA_SHARE_CARD_SIZE_PX = 1080;

export function PersonaShareCard({ persona = {}, username = 'Pilot', streaks = {} }) {
  const snapshot = persona?.snapshot || {};
  const baseIdentity = snapshot.personaIdentity || {};
  const gamingPersona = GamingPersonaService.getPersona();
  const primary = gamingPersona?.primaryPersona;
  const identity = {
    ...baseIdentity,
    label: primary?.label || baseIdentity.label || 'Calibrating Persona',
    description: gamingPersona?.summaryRoast || primary?.roast || baseIdentity.description || ''
  };
  const preferredBucket = persona?.preferredBucket || '';
  const currentStreak = streaks?.current || 0;
  const bestStreak = streaks?.best || 0;

  const bucketLabel = {
    '0-30': 'Sprint Sessions (0-30 min)',
    '30-60': 'Focused Runs (30-60 min)',
    '60-120': 'Extended Flights (1-2h)',
    '120+': 'Marathon Missions (2h+)'
  }[preferredBucket] || preferredBucket || 'Flexible sessions';

  return (
    <div className="persona-share-card" style={{ width: PERSONA_SHARE_CARD_SIZE_PX, height: PERSONA_SHARE_CARD_SIZE_PX }}>
      <div className="persona-share-card-glow" aria-hidden="true" />
      <Gamepad2 className="persona-share-watermark" size={320} aria-hidden="true" />

      <div className="persona-share-card-header">
        <span className="persona-share-card-brand">GAMEPILOT</span>
        <span className="persona-share-card-tag">Flight Persona</span>
      </div>

      <div className="persona-share-card-body">
        <div className="persona-share-card-hero">
          <User size={48} className="persona-share-card-icon" />
          <div>
            <span className="persona-share-card-eyebrow">{username || 'Pilot'} · Flight Persona</span>
            <h2 className="persona-share-card-title">{identity.label || 'Calibrating Persona'}</h2>
          </div>
        </div>

        {identity.anchors?.length > 0 && (
          <div className="persona-share-card-anchors">
            {identity.anchors.join(' · ')}
          </div>
        )}

        <div className="persona-share-card-grid">
          <div className="persona-share-card-stat">
            <Trophy size={20} />
            <strong>{snapshot.dominantMood || '—'}</strong>
            <span>Dominant Mood</span>
          </div>
          <div className="persona-share-card-stat">
            <TrendingUp size={20} />
            <strong>{bucketLabel}</strong>
            <span>Preferred Sessions</span>
          </div>
          <div className="persona-share-card-stat">
            <Calendar size={20} />
            <strong>{snapshot.avgSessionLength ? `${snapshot.avgSessionLength} min` : '—'}</strong>
            <span>Avg Session Length</span>
          </div>
          <div className="persona-share-card-stat">
            <User size={20} />
            <strong>{snapshot.peakPlayWindow || 'Anytime'}</strong>
            <span>Peak Play Window</span>
          </div>
        </div>

        <div className="persona-share-card-streak">
          <div className="persona-share-card-streak-label">
            <span>Activity Streak</span>
            <strong>{currentStreak} current · {bestStreak} best</strong>
          </div>
          <div className="persona-share-card-streak-bar">
            <div
              className="persona-share-card-streak-fill"
              style={{ width: `${bestStreak > 0 ? Math.min(Math.round((currentStreak / bestStreak) * 100), 100) : 0}%` }}
            />
          </div>
        </div>

        {identity.description && (
          <p className="persona-share-card-description">{identity.description}</p>
        )}
      </div>

      <ShareCardWatermark />
    </div>
  );
}
