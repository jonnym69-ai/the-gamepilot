import React, { useState, useEffect } from 'react';
import { characterizeCurrentStreak } from '../services/StreakCharacterizerService';
import './StreakBadge.css';

const StreakBadge = () => {
  const [streak, setStreak] = useState(null);

  useEffect(() => {
    const update = () => {
      try {
        const char = characterizeCurrentStreak();
        setStreak(char);
      } catch {
        setStreak(null);
      }
    };
    update();
    window.addEventListener('gamepilot:session-ended', update);
    return () => window.removeEventListener('gamepilot:session-ended', update);
  }, []);

  if (!streak || streak.days < 3) return null;

  const typeIcons = {
    'late-night': '🌙',
    'genre-monopoly': '🎯',
    'single-game': '💍',
    'variety': '🎰',
    'weekend': '📅',
    'generic': '🔥'
  };

  const icon = typeIcons[streak.type] || '🔥';

  return (
    <div className="streak-badge" role="status" aria-live="polite">
      <span className="streak-badge-icon" aria-hidden="true">{icon}</span>
      <div className="streak-badge-content">
        <span className="streak-badge-label">{streak.label}</span>
        <span className="streak-badge-roast">{streak.roast}</span>
      </div>
    </div>
  );
};

export default StreakBadge;
