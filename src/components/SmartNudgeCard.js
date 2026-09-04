import React, { useState, useEffect } from 'react';
import { Clock, X, Play, EyeOff } from 'lucide-react';
import { SmartNudgeService } from '../services/SmartNudgeService';
import { resolveGameArtwork, getGameArtworkPlaceholder } from '../services/GameArtworkService';

/**
 * SmartNudgeCard — a gentle, dismissible reminder about a dormant game.
 * Shows once per day when a good candidate exists. Not naggy — one card,
 * no repeated notifications, easy to dismiss permanently.
 */
const SmartNudgeCard = ({ library = [], onLaunchGame }) => {
  const [nudge, setNudge] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return;
    const result = SmartNudgeService.getNudge(library);
    if (result) {
      SmartNudgeService.markShown();
      setNudge(result);
    }
  }, [library, dismissed]);

  if (!nudge || dismissed) return null;

  const artwork = resolveGameArtwork(nudge.game, { surface: 'portrait' });
  const placeholder = getGameArtworkPlaceholder({ game: nudge.game, surface: 'portrait' });

  const handleDismiss = () => {
    setDismissed(true);
    setNudge(null);
  };

  const handleDismissPermanently = () => {
    SmartNudgeService.dismiss();
    setDismissed(true);
    setNudge(null);
  };

  const handleLaunch = () => {
    if (onLaunchGame && nudge.game) onLaunchGame(nudge.game);
    setNudge(null);
  };

  return (
    <div className="smart-nudge-card">
      <div className="smart-nudge-card-header">
        <Clock size={14} />
        <span>It's been a while</span>
        <button
          className="smart-nudge-card-close"
          onClick={handleDismiss}
          aria-label="Dismiss for today"
          title="Dismiss for today"
        >
          <X size={14} />
        </button>
      </div>
      <div className="smart-nudge-card-body">
        <div className="smart-nudge-card-art">
          {artwork ? (
            <img src={artwork} alt={nudge.game.name} onError={(e) => { e.target.style.display = 'none'; }} />
          ) : (
            <div className="smart-nudge-card-placeholder">{placeholder}</div>
          )}
        </div>
        <div className="smart-nudge-card-info">
          <div className="smart-nudge-card-name">{nudge.game.name}</div>
          <div className="smart-nudge-card-message">{nudge.message}</div>
          <div className="smart-nudge-card-actions">
            <button className="smart-nudge-card-play" onClick={handleLaunch}>
              <Play size={14} /> Jump back in
            </button>
            <button className="smart-nudge-card-dismiss" onClick={handleDismissPermanently} title="Stop showing these reminders">
              <EyeOff size={12} /> Don't remind me
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartNudgeCard;
