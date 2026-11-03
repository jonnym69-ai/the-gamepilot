import React from 'react';
import { Gamepad2, Sparkles, Trophy } from 'lucide-react';
import { resolveGameArtworkBundle } from '../services/GameArtworkService';
import { getBlendedPlaytimeMinutes } from '../services/gameClassification';
import { formatPlaytime } from '../utils/formatPlaytime';
import ShowcaseService from '../services/ShowcaseService';
import { ShareCardWatermark } from './ShareCardWatermark';
import './ProfileShareCard.css';

export const PROFILE_SHARE_CARD_SIZE_PX = 1080;

// Share card for the profile's headline identity: persona roast up top,
// showcase covers below. Rendered off-screen and captured via html2canvas.
export function ProfileShareCard({ username = 'Pilot', persona = null, library = [], watermark = 'gamepilot' }) {
  const primary = persona?.primaryPersona || {};
  const label = primary.label || 'Gamer in Progress';
  const description = primary.description || null;
  const roast = persona?.summaryRoast || primary.roast || 'Still gathering the evidence.';
  const contextLine = persona?.contextLine || null;
  const evidence = Array.isArray(primary.evidence) ? primary.evidence.slice(0, 4) : [];

  const { games, mode } = ShowcaseService.getShowcaseGames(library);

  return (
    <div
      className="profile-share-card"
      style={{ width: PROFILE_SHARE_CARD_SIZE_PX, height: PROFILE_SHARE_CARD_SIZE_PX }}
    >
      <div className="profile-share-card-glow" aria-hidden="true" />
      <Gamepad2 className="profile-share-card-mark" size={300} aria-hidden="true" />

      <div className="profile-share-card-header">
        <span className="profile-share-card-brand">GAMEPILOT</span>
        <span className="profile-share-card-tag">Player Profile</span>
      </div>

      <div className="profile-share-card-body">
        <div className="profile-share-card-persona">
          <span className="profile-share-card-eyebrow">
            <Sparkles size={16} /> {username || 'Pilot'}
          </span>
          <h2 className="profile-share-card-title">{label}</h2>
          {description && <p className="profile-share-card-subtitle">{description}</p>}
          <p className="profile-share-card-roast">{roast}</p>
          {contextLine && <p className="profile-share-card-context">{contextLine}</p>}
          {evidence.length > 0 && (
            <div className="profile-share-card-evidence">
              {evidence.map((item, index) => (
                <span key={`evidence-${index}`} className="profile-share-card-evidence-item">
                  {item}
                </span>
              ))}
            </div>
          )}
        </div>

        {games.length > 0 && (
          <div className="profile-share-card-showcase">
            <div className="profile-share-card-showcase-label">
              <Trophy size={15} />
              <span>Showcase · {mode === 'custom' ? 'hand-picked' : 'most played'}</span>
            </div>
            <div className="profile-share-card-covers">
              {games.map((game) => {
                const { artwork, placeholder } = resolveGameArtworkBundle(game, { surface: 'portrait' });
                const minutes = getBlendedPlaytimeMinutes(game);
                return (
                  <div key={game.name} className="profile-share-card-cover">
                    <img
                      src={artwork || placeholder}
                      alt={game.name}
                      onError={(e) => {
                        if (e.currentTarget.src !== placeholder) e.currentTarget.src = placeholder;
                      }}
                    />
                    <div className="profile-share-card-cover-caption">
                      <span className="profile-share-card-cover-name">{game.name}</span>
                      {minutes > 0 && <span className="profile-share-card-cover-hours">{formatPlaytime(minutes)}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="profile-share-card-footer">
        <ShareCardWatermark
          watermark={watermark}
          context="profile"
          ctaClassName="profile-share-card-cta"
          taglineClassName="profile-share-card-tagline"
        />
      </div>
    </div>
  );
}

export default ProfileShareCard;
