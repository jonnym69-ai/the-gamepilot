import React, { useState, useEffect, useRef } from 'react';
import './CelebrationEffects.css';

const AnimatedProgressBar = ({ 
  percent, 
  height = 8, 
  color = 'linear-gradient(90deg, #ff6b35, #f093fb)',
  backgroundColor = 'rgba(255, 255, 255, 0.1)',
  showPercentage = false,
  animate = true,
  shimmer = true,
  className = ''
}) => {
  const [displayPercent, setDisplayPercent] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const prevPercentRef = useRef(0);

  useEffect(() => {
    if (!animate) {
      setDisplayPercent(percent);
      return;
    }

    const startValue = prevPercentRef.current;
    const endValue = percent;
    const duration = 800;
    const startTime = performance.now();

    const animateProgress = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function: easeOutCubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      const currentValue = startValue + (endValue - startValue) * easeProgress;
      setDisplayPercent(Math.round(currentValue));

      if (progress < 1) {
        requestAnimationFrame(animateProgress);
      } else {
        // Check if we just reached 100%
        if (endValue >= 100 && startValue < 100) {
          setIsComplete(true);
          setTimeout(() => setIsComplete(false), 1500);
        }
      }
    };

    requestAnimationFrame(animateProgress);
    prevPercentRef.current = percent;
  }, [percent, animate]);

  return (
    <div 
      className={`animated-progress-container ${className} ${isComplete ? 'complete' : ''}`}
      style={{ height }}
    >
      <div 
        className="animated-progress-track"
        style={{ backgroundColor, height }}
      >
        <div 
          className={`animated-progress-fill ${shimmer ? 'shimmer' : ''}`}
          style={{ 
            width: `${displayPercent}%`,
            background: color,
            height
          }}
        />
      </div>
      {showPercentage && (
        <span className="animated-progress-text">{displayPercent}%</span>
      )}
    </div>
  );
};

// Segmented progress bar for multi-step progress
export const SegmentedProgressBar = ({ 
  segments, 
  activeIndex, 
  completedColor = '#22c55e',
  activeColor = '#ff6b35',
  pendingColor = 'rgba(255, 255, 255, 0.1)',
  height = 6,
  gap = 4
}) => {
  return (
    <div className="segmented-progress" style={{ gap }}>
      {segments.map((segment, index) => {
        const isCompleted = index < activeIndex;
        const isActive = index === activeIndex;
        
        return (
          <div
            key={index}
            className={`segment ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}
            style={{
              backgroundColor: isCompleted ? completedColor : isActive ? activeColor : pendingColor,
              height,
              flex: 1
            }}
            title={segment.label || `Step ${index + 1}`}
          >
            {isActive && <div className="segment-pulse" />}
          </div>
        );
      })}
    </div>
  );
};

// Circular progress indicator
export const CircularProgress = ({ 
  percent, 
  size = 60, 
  strokeWidth = 4,
  color = '#ff6b35',
  backgroundColor = 'rgba(255, 255, 255, 0.1)',
  showPercentage = false
}) => {
  const [displayPercent, setDisplayPercent] = useState(0);
  const prevPercentRef = useRef(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (displayPercent / 100) * circumference;

  useEffect(() => {
    const startValue = prevPercentRef.current;
    const endValue = percent;
    const duration = 600;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      const currentValue = startValue + (endValue - startValue) * easeProgress;
      setDisplayPercent(Math.round(currentValue));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
    prevPercentRef.current = percent;
  }, [percent]);

  return (
    <div className="circular-progress" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%',
            transition: 'stroke-dashoffset 0.3s ease-out'
          }}
        />
      </svg>
      {showPercentage && (
        <span className="circular-progress-text">{displayPercent}%</span>
      )}
    </div>
  );
};

// XP progress bar with level indicator
export const XPProgressBar = ({ 
  currentXP, 
  nextLevelXP,
  level,
  showLabel = true
}) => {
  const percent = Math.min((currentXP / nextLevelXP) * 100, 100);
  const remaining = nextLevelXP - currentXP;

  return (
    <div className="xp-progress-container">
      <div className="xp-progress-header">
        {showLabel && (
          <>
            <span className="xp-level-badge">Lv {level}</span>
            <span className="xp-remaining">{remaining.toLocaleString()} XP to next</span>
          </>
        )}
      </div>
      <AnimatedProgressBar 
        percent={percent} 
        height={10}
        color="linear-gradient(90deg, #f5b700, #ff6b35, #f093fb)"
        shimmer={true}
      />
    </div>
  );
};

// Streak progress indicator
export const StreakProgress = ({ 
  currentStreak, 
  nextMilestone,
  className = ''
}) => {
  const progress = nextMilestone ? (currentStreak / nextMilestone) * 100 : 100;
  const remaining = nextMilestone ? nextMilestone - currentStreak : 0;

  return (
    <div className={`streak-progress ${className}`}>
      <div className="streak-progress-header">
        <span className="streak-fire">🔥 {currentStreak} day streak</span>
        {remaining > 0 && (
          <span className="streak-next">{remaining} days to {nextMilestone}</span>
        )}
      </div>
      <AnimatedProgressBar 
        percent={progress}
        height={6}
        color="linear-gradient(90deg, #ff8c42, #ff6b35, #f5b700)"
        shimmer={true}
      />
    </div>
  );
};

export default AnimatedProgressBar;
