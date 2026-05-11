import React, { useEffect, useState } from 'react';
import { Trophy, Sparkles } from 'lucide-react';
import './LevelUpToast.css';

const LevelUpToast = ({ show, level, xpTotal, onClose }) => {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (show) {
      setExiting(false);
      const timer = setTimeout(() => {
        setExiting(true);
        setTimeout(onClose, 500);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className={`level-up-toast ${exiting ? 'exiting' : ''}`}>
      <div className="toast-content">
        <div className="toast-icon">
          <Sparkles className="sparkle-icon" />
        </div>
        <div className="toast-text">
          <h4>LEVEL UP!</h4>
          <div className="level-number">{level}</div>
          <p>{xpTotal.toLocaleString()} XP Total</p>
        </div>
        <Trophy className="trophy-icon" />
      </div>
      <div className="confetti-container">
        {[...Array(20)].map((_, i) => (
          <div 
            key={i} 
            className="confetti"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 0.5}s`,
              backgroundColor: ['#4ade80', '#fbbf24', '#60a5fa', '#f472b6', '#a78bfa'][Math.floor(Math.random() * 5)]
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default LevelUpToast;
