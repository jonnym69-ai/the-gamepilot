import React, { useState, useEffect } from 'react';
import { getActiveRivalry } from '../services/RivalryService';
import { resolveGameArtwork } from '../services/GameArtworkService';
import LazyImage from './LazyImage';
import './RivalryBanner.css';

const formatHours = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

const RivalryBanner = () => {
  const [rivalry, setRivalry] = useState(null);

  useEffect(() => {
    const update = () => {
      try {
        setRivalry(getActiveRivalry());
      } catch {
        setRivalry(null);
      }
    };
    update();
    window.addEventListener('gamepilot:session-ended', update);
    return () => window.removeEventListener('gamepilot:session-ended', update);
  }, []);

  if (!rivalry) return null;

  const { gameA, gameB, gameAMinutes, gameBMinutes, rounds } = rivalry;
  const total = gameAMinutes + gameBMinutes;
  const aPercent = total > 0 ? Math.round((gameAMinutes / total) * 100) : 50;
  const bPercent = 100 - aPercent;
  const leader = gameAMinutes >= gameBMinutes ? gameA : gameB;
  const margin = formatHours(Math.abs(gameAMinutes - gameBMinutes));

  return (
    <div className="rivalry-banner" role="status" aria-live="polite">
      <div className="rivalry-header">
        <span className="rivalry-label">Rivalry</span>
        {rounds > 1 && <span className="rivalry-rounds">Round {rounds}</span>}
      </div>
      <div className="rivalry-matchup">
        <div className="rivalry-game rivalry-game-a">
          <LazyImage
            src={resolveGameArtwork({ name: gameA })}
            alt=""
            className="rivalry-game-art"
            fallback={<div className="rivalry-game-art-placeholder">{gameA?.charAt(0)}</div>}
          />
          <span className="rivalry-game-name">{gameA}</span>
          <span className="rivalry-game-time">{formatHours(gameAMinutes)}</span>
        </div>
        <div className="rivalry-vs">
          <span className="rivalry-vs-text">VS</span>
          <span className="rivalry-margin">{leader} +{margin}</span>
        </div>
        <div className="rivalry-game rivalry-game-b">
          <LazyImage
            src={resolveGameArtwork({ name: gameB })}
            alt=""
            className="rivalry-game-art"
            fallback={<div className="rivalry-game-art-placeholder">{gameB?.charAt(0)}</div>}
          />
          <span className="rivalry-game-name">{gameB}</span>
          <span className="rivalry-game-time">{formatHours(gameBMinutes)}</span>
        </div>
      </div>
      <div className="rivalry-bar">
        <div className="rivalry-bar-a" style={{ width: `${aPercent}%` }} />
        <div className="rivalry-bar-b" style={{ width: `${bPercent}%` }} />
      </div>
    </div>
  );
};

export default RivalryBanner;
