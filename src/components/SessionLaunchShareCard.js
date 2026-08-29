import React from 'react';
import { Radio, Gamepad2 } from 'lucide-react';
import { resolveGameArtwork } from '../services/GameArtworkService';
import { ShareCardWatermark } from './ShareCardWatermark';
import './SessionLaunchShareCard.css';

export const SESSION_LAUNCH_SHARE_CARD_SIZE_PX = 1080;

export function buildSessionLaunchShareData(game = {}) {
  const safeGame = game || {};
  const platform = safeGame.platform || safeGame.brandPlatform || (safeGame.launchSources?.[0]?.platform) || null;

  return {
    name: safeGame.name || 'Unknown Game',
    coverUrl: resolveGameArtwork(safeGame, { surface: 'portrait' }),
    platform
  };
}

export function SessionLaunchShareCard({ game = {}, watermark = 'gamepilot' }) {
  const data = buildSessionLaunchShareData(game);

  return (
    <div className="session-launch-share-card">
      <div className="session-launch-share-card-glow" aria-hidden="true" />
      <Gamepad2 className="session-launch-share-watermark" size={320} aria-hidden="true" />

      <div className="session-launch-share-card-header">
        <span className="session-launch-share-card-brand">GAMEPILOT</span>
        <span className="session-launch-share-card-tag">Going Live</span>
      </div>

      <div className="session-launch-share-card-body">
        {data.coverUrl && (
          <div
            className="session-launch-share-card-cover-frame"
            style={{ backgroundImage: `url(${data.coverUrl})` }}
            aria-hidden="true"
          />
        )}

        <div className="session-launch-share-card-title-wrap">
          <h2 className="session-launch-share-card-title">{data.name}</h2>
          {data.platform && (
            <span className="session-launch-share-card-platform">{data.platform}</span>
          )}
        </div>

        <div className="session-launch-share-card-badges">
          <span className="session-launch-share-card-badge live-badge">
            <Radio size={16} />
            Starting Session
          </span>
        </div>
      </div>

      <div className="session-launch-share-card-footer">
        <ShareCardWatermark watermark={watermark} context="game" />
      </div>
    </div>
  );
}

export default SessionLaunchShareCard;
