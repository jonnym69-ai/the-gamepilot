import React from 'react';
import { Gamepad2, User, TrendingUp, Award, Clock, Zap } from 'lucide-react';
import { resolveGameArtwork } from '../services/GameArtworkService';
import { formatPlaytime } from '../utils/formatPlaytime';
import { ShareCardWatermark } from './ShareCardWatermark';
import GamingPersonaService from '../services/GamingPersonaService';
import './IdentityShareCard.css';

export const IDENTITY_SHARE_CARD_SIZE_PX = 1080;

export function buildIdentityShareData(profile = {}, evolution = null) {
  const safeProfile = profile || {};
  const identity = safeProfile.identity || {};
  const stats = safeProfile.stats || {};
  const persona = safeProfile.persona || {};
  const gamingPersona = GamingPersonaService.getPersona();
  const primary = gamingPersona?.primaryPersona;

  const personaLabel = primary?.label || persona?.personaIdentity?.label || identity.personality || 'Uncharted Pilot';
  const personaRoast = gamingPersona?.summaryRoast || primary?.roast || persona?.personaIdentity?.description || identity.description || 'Your gaming identity is still forming.';
  const evidence = Array.isArray(primary?.evidence) ? primary.evidence : [];
  const subTraits = Array.isArray(gamingPersona?.subTraits) ? gamingPersona.subTraits : [];

  return {
    username: safeProfile.username || 'Pilot',
    title: safeProfile.title || 'Newbie',
    level: safeProfile.level || 1,
    identityLabel: personaLabel,
    identityDescription: personaRoast,
    playStyle: identity.playStyle || 'Balanced',
    favoriteMood: identity.favoriteMood || persona?.dominantMood || '—',
    favoriteGenre: identity.favoriteGenre || gamingPersona?.signals?.dominantGenre || persona?.dominantGenre || '—',
    totalPlaytime: stats.totalPlayTime || 0,
    sessions: stats.totalSessions || 0,
    librarySize: stats.librarySize || 0,
    platformDiversity: stats.platformDiversity || 0,
    achievementUnlocked: stats.achievementProgress?.unlocked || 0,
    signature: identity.signature || safeProfile.signature || null,
    evidence,
    subTraits,
    basedOnGame: primary?.basedOnGame || null,
    evolution: evolution
      ? {
        summary: evolution.summary || 'Your play profile stayed steady.',
        fromMood: evolution.opening?.dominantMood || null,
        toMood: evolution.closing?.dominantMood || null,
        fromGenre: evolution.opening?.dominantGenre || null,
        toGenre: evolution.closing?.dominantGenre || null,
        fromSessionLabel: evolution.opening?.preferredSessionLabel || null,
        toSessionLabel: evolution.closing?.preferredSessionLabel || null
      }
      : null
  };
}

const resolvePlaytime = (game) => {
  const value = Number(game?.time_played ?? game?.playtime ?? game?.totalPlaytime ?? 0);
  return Number.isFinite(value) ? value : 0;
};

const getMostPlayedGame = (library = []) => {
  if (!Array.isArray(library) || library.length === 0) return null;
  return [...library].sort((a, b) => resolvePlaytime(b) - resolvePlaytime(a))[0] || null;
};

export function IdentityShareCard({ profile = {}, evolution = null, library = [], coverGame = null, showCover = true, watermark = 'gamepilot' }) {
  const data = buildIdentityShareData(profile, evolution);
  const coverGameSource = coverGame || getMostPlayedGame(library);
  const coverUrl = showCover && coverGameSource ? resolveGameArtwork(coverGameSource, { surface: 'hero' }) : null;

  return (
    <div className="identity-share-card" style={{ width: IDENTITY_SHARE_CARD_SIZE_PX, height: IDENTITY_SHARE_CARD_SIZE_PX }}>
      {coverUrl && (
        <>
          <div
            className="identity-share-card-cover"
            style={{ backgroundImage: `url(${coverUrl})` }}
            aria-hidden="true"
          />
          <div className="identity-share-card-cover-overlay" aria-hidden="true" />
        </>
      )}
      <div className="identity-share-card-glow" aria-hidden="true" />
      <Gamepad2 className="identity-share-watermark" size={320} aria-hidden="true" />

      <div className="identity-share-card-header">
        <span className="identity-share-card-brand">GAMEPILOT</span>
        <span className="identity-share-card-tag">Player Identity</span>
      </div>

      <div className="identity-share-card-body">
        <div className="identity-share-card-hero">
          <div className="identity-share-card-avatar">
            <User size={64} />
          </div>
          <div className="identity-share-card-hero-text">
            <span className="identity-share-card-eyebrow">{data.username || 'Pilot'} · Level {data.level}</span>
            <h2 className="identity-share-card-title">{data.identityLabel}</h2>
            <p className="identity-share-card-description">{data.identityDescription}</p>
          </div>
        </div>

        <div className="identity-share-card-badges">
          <div className="identity-share-card-badge">
            <Award size={20} />
            <span>{data.title}</span>
          </div>
          <div className="identity-share-card-badge">
            <Zap size={20} />
            <span>{data.playStyle}</span>
          </div>
        </div>

        <div className="identity-share-card-stats">
          <div className="identity-share-card-stat">
            <Clock size={20} />
            <strong>{formatPlaytime(data.totalPlaytime)}</strong>
            <span>Total playtime</span>
          </div>
          <div className="identity-share-card-stat">
            <TrendingUp size={20} />
            <strong>{data.sessions}</strong>
            <span>Sessions</span>
          </div>
          <div className="identity-share-card-stat">
            <Award size={20} />
            <strong>{data.librarySize}</strong>
            <span>Games</span>
          </div>
          <div className="identity-share-card-stat">
            <User size={20} />
            <strong>{data.platformDiversity}</strong>
            <span>Platforms</span>
          </div>
        </div>

        <div className="identity-share-card-identity-grid">
          <div>
            <span>Top Mood</span>
            <strong>{data.favoriteMood}</strong>
          </div>
          <div>
            <span>Top Genre</span>
            <strong>{data.favoriteGenre}</strong>
          </div>
          <div>
            <span>Playstyle</span>
            <strong>{data.playStyle}</strong>
          </div>
          <div>
            <span>Achievements</span>
            <strong>{data.achievementUnlocked}</strong>
          </div>
        </div>

        {data.subTraits && data.subTraits.length > 0 && (
          <div className="identity-share-card-traits">
            {data.subTraits.slice(0, 5).map((trait) => (
              <span key={trait.id || trait.label} className="identity-share-card-trait-chip">
                {trait.label || trait.id}
              </span>
            ))}
          </div>
        )}

        {data.evidence && data.evidence.length > 0 && (
          <div className="identity-share-card-evidence">
            {data.evidence.slice(0, 3).map((item, index) => (
              <span key={`evidence-${index}`} className="identity-share-card-evidence-item">
                {item}
              </span>
            ))}
          </div>
        )}

        {data.basedOnGame && (
          <p className="identity-share-card-basis">Built from real play history, led by {data.basedOnGame}</p>
        )}

        {data.evolution && (
          <div className="identity-share-card-evolution">
            <span className="identity-share-card-evolution-label">Evolution</span>
            <p>{data.evolution.summary}</p>
            {data.evolution.fromMood && data.evolution.toMood && (
              <div className="identity-share-card-evolution-row">
                <span className="identity-share-card-evolution-from">{data.evolution.fromMood}</span>
                <TrendingUp size={16} />
                <span className="identity-share-card-evolution-to">{data.evolution.toMood}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="identity-share-card-footer">
        <ShareCardWatermark
          watermark={watermark}
          context="identity"
          ctaClassName="identity-share-card-cta"
          taglineClassName="identity-share-card-tagline"
        />
      </div>
    </div>
  );
}

export default IdentityShareCard;
