import React, { useEffect, useState, useCallback } from 'react';
import './CelebrationEffects.css';

// Confetti particle component
const ConfettiPiece = ({ color, delay, left, type }) => {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsActive(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const pieceType = type || Math.floor(Math.random() * 3);
  const shape = pieceType === 0 ? 'circle' : pieceType === 1 ? 'square' : 'triangle';
  
  return (
    <div
      className={`confetti-piece ${shape} ${isActive ? 'active' : ''}`}
      style={{
        backgroundColor: color,
        left: `${left}%`,
        animationDelay: `${delay}ms`
      }}
    />
  );
};

// Sparkle/star component
const Sparkle = ({ delay, top, left, size = 20 }) => {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsActive(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`sparkle ${isActive ? 'active' : ''}`}
      style={{
        top: `${top}%`,
        left: `${left}%`,
        width: size,
        height: size,
        animationDelay: `${delay}ms`
      }}
    >
      ✨
    </div>
  );
};

// Main celebration overlay
export const CelebrationOverlay = ({ 
  type = 'confetti', 
  duration = 3000, 
  onComplete,
  intensity = 'medium' 
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    // Generate particles based on intensity
    const particleCount = intensity === 'low' ? 30 : intensity === 'high' ? 100 : 60;
    const colors = ['#ff6b35', '#f093fb', '#3dd9ff', '#9b5cff', '#f5b700', '#22c55e', '#ff8c42'];
    
    const newParticles = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 500,
      left: Math.random() * 100,
      type: Math.floor(Math.random() * 3)
    }));
    
    setParticles(newParticles);

    // Auto-hide after duration
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, intensity, onComplete]);

  if (!isVisible) return null;

  return (
    <div className={`celebration-overlay ${type}`}>
      {type === 'confetti' && particles.map(p => (
        <ConfettiPiece key={p.id} {...p} />
      ))}
      {type === 'sparkles' && particles.slice(0, 20).map((p, i) => (
        <Sparkle 
          key={p.id} 
          delay={p.delay} 
          top={10 + Math.random() * 80} 
          left={p.left}
          size={15 + Math.random() * 20}
        />
      ))}
      {type === 'mixed' && (
        <>
          {particles.slice(0, 40).map(p => (
            <ConfettiPiece key={`c-${p.id}`} {...p} />
          ))}
          {particles.slice(0, 15).map((p, i) => (
            <Sparkle 
              key={`s-${p.id}`}
              delay={p.delay + 200} 
              top={10 + Math.random() * 80} 
              left={p.left}
              size={15 + Math.random() * 20}
            />
          ))}
        </>
      )}
    </div>
  );
};

// XP Gain flash effect
export const XPGainFlash = ({ amount, onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div className="xp-gain-flash">
      <div className="xp-gain-content">
        <span className="xp-plus">+</span>
        <span className="xp-amount">{amount.toLocaleString()}</span>
        <span className="xp-label">XP</span>
      </div>
    </div>
  );
};

// Unlock notification with celebration
export const UnlockCelebration = ({ 
  rewardName, 
  rewardType,
  xpBonus,
  onComplete,
  duration = 4000 
}) => {
  const [phase, setPhase] = useState('celebrating'); // celebrating, displaying, done

  useEffect(() => {
    const celebrateTimer = setTimeout(() => setPhase('displaying'), 1500);
    const displayTimer = setTimeout(() => {
      setPhase('done');
      onComplete?.();
    }, duration);

    return () => {
      clearTimeout(celebrateTimer);
      clearTimeout(displayTimer);
    };
  }, [duration, onComplete]);

  if (phase === 'done') return null;

  const getTypeIcon = () => {
    switch (rewardType) {
      case 'frame': return '🖼️';
      case 'banner': return '🎨';
      case 'title': return '🏆';
      case 'theme': return '🎭';
      case 'audio': return '🎵';
      case 'collection': return '📚';
      default: return '🎁';
    }
  };

  return (
    <div className="unlock-celebration">
      {phase === 'celebrating' && (
        <CelebrationOverlay 
          type="mixed" 
          intensity="high" 
          duration={1500}
        />
      )}
      <div className={`unlock-card ${phase}`}>
        <div className="unlock-icon">{getTypeIcon()}</div>
        <div className="unlock-text">
          <span className="unlock-label">Unlocked!</span>
          <strong className="unlock-name">{rewardName}</strong>
          {xpBonus > 0 && (
            <span className="unlock-bonus">+{xpBonus.toLocaleString()} XP Bonus</span>
          )}
        </div>
      </div>
    </div>
  );
};

// Hook for triggering celebrations
export const useCelebration = () => {
  const [activeCelebration, setActiveCelebration] = useState(null);

  const triggerConfetti = useCallback((options = {}) => {
    const id = Date.now();
    setActiveCelebration({ id, type: 'confetti', ...options });
    return id;
  }, []);

  const triggerSparkles = useCallback((options = {}) => {
    const id = Date.now();
    setActiveCelebration({ id, type: 'sparkles', ...options });
    return id;
  }, []);

  const triggerUnlock = useCallback((rewardData) => {
    const id = Date.now();
    setActiveCelebration({ id, type: 'unlock', ...rewardData });
    return id;
  }, []);

  const triggerXPGain = useCallback((amount) => {
    const id = Date.now();
    setActiveCelebration({ id, type: 'xpgain', amount });
    return id;
  }, []);

  const clearCelebration = useCallback(() => {
    setActiveCelebration(null);
  }, []);

  const CelebrationComponent = useCallback(() => {
    if (!activeCelebration) return null;

    switch (activeCelebration.type) {
      case 'confetti':
      case 'sparkles':
      case 'mixed':
        return (
          <CelebrationOverlay
            type={activeCelebration.type}
            intensity={activeCelebration.intensity}
            duration={activeCelebration.duration}
            onComplete={clearCelebration}
          />
        );
      case 'unlock':
        return (
          <UnlockCelebration
            rewardName={activeCelebration.rewardName}
            rewardType={activeCelebration.rewardType}
            xpBonus={activeCelebration.xpBonus}
            duration={activeCelebration.duration}
            onComplete={clearCelebration}
          />
        );
      case 'xpgain':
        return (
          <XPGainFlash
            amount={activeCelebration.amount}
            onComplete={clearCelebration}
          />
        );
      default:
        return null;
    }
  }, [activeCelebration, clearCelebration]);

  return {
    triggerConfetti,
    triggerSparkles,
    triggerUnlock,
    triggerXPGain,
    clearCelebration,
    CelebrationComponent
  };
};

export default CelebrationOverlay;
