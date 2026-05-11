import React, { useMemo } from 'react';
import moodThemes from '../themes/moodThemes.json';
import { ProgressionUnlockService } from '../services/ProgressionUnlockService';
import StorageService from '../services/StorageService';
import './AnimatedBackground.css';

const DEFAULT_PARTICLES = 80;
const MAX_PARTICLES = 48;
const MAX_WAVE_BUBBLES = 24;
const MAX_MATRIX_COLUMNS = 56;
const MAX_RETRO_BLOCKS = 24;

const seededValue = (index, salt = 0) => {
  const x = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

const AnimatedBackground = ({ themeId }) => {
  const animationsEnabled = StorageService.getString('animationsEnabled') !== 'false';

  const animationConfig = useMemo(() => {
    if (!themeId) return null;
    const theme = moodThemes.find((entry) => entry.id === themeId);
    if (!theme || !theme.animation || !theme.animation.enabled) return null;

    if (theme.isPremium && !ProgressionUnlockService.isThemeUnlocked(theme.id)) {
      return null;
    }

    return {
      type: theme.animation.type,
      color: theme.animation.color || 'rgba(255, 255, 255, 0.8)',
      intensity: theme.animation.intensity || 0.6,
      speed: theme.animation.speed || 'medium',
      particleCount: theme.animation.particleCount || DEFAULT_PARTICLES,
      config: theme.animation
    };
  }, [themeId]);

  const renderWaveBubbles = () => {
    const baseCount = Math.min(animationConfig.particleCount, MAX_WAVE_BUBBLES);
    const count = Math.max(8, Math.round(baseCount * (animationConfig.intensity || 0.6)));
    return Array.from({ length: count }).map((_, index) => {
      const delay = seededValue(index, 1) * 6;
      const duration = 6 + seededValue(index, 2) * 6;
      const left = seededValue(index, 3) * 100;
      const size = 4 + seededValue(index, 4) * 6;
      return (
        <span
          key={`wave-bubble-${index}`}
          className="wave-bubble"
          style={{
            left: `${left}%`,
            width: `${size}px`,
            height: `${size}px`,
            animationDelay: `${delay}s`,
            animationDuration: `${duration}s`,
            background: animationConfig.color
          }}
        />
      );
    });
  };

  if (!animationsEnabled || !animationConfig) {
    return null;
  }

  const renderParticles = (className) => {
    const count = Math.min(animationConfig.particleCount, MAX_PARTICLES);
    return Array.from({ length: count }).map((_, index) => {
      const delay = (index % 10) * 0.35;
      const duration = 4 + (index % 5);
      const left = seededValue(index, 5) * 100;
      const size = 4 + seededValue(index, 6) * 4;
      return (
        <span
          key={`${className}-${index}`}
          className={className}
          style={{
            left: `${left}%`,
            animationDelay: `${delay}s`,
            animationDuration: `${duration}s`,
            width: className.includes('particle') ? `${size}px` : undefined,
            background: animationConfig.color,
          }}
        />
      );
    });
  };

  const renderMatrixCode = () => {
    const columns = Math.min(animationConfig.particleCount, MAX_MATRIX_COLUMNS);
    return Array.from({ length: columns }).map((_, index) => {
      const delay = seededValue(index, 7) * 5;
      const duration = 4 + seededValue(index, 8) * 4;
      const left = (index / columns) * 100;
      return (
        <span
          key={`matrix-${index}`}
          className="matrix-column"
          style={{
            left: `${left}%`,
            animationDelay: `${delay}s`,
            animationDuration: `${duration}s`,
          }}
        />
      );
    });
  };

  const renderRetroBlocks = () => {
    const blocks = Math.min(animationConfig.particleCount, MAX_RETRO_BLOCKS);
    return Array.from({ length: blocks }).map((_, index) => {
      const delay = seededValue(index, 9) * 6;
      const duration = 6 + seededValue(index, 10) * 6;
      const size = 40 + seededValue(index, 11) * 20;
      const top = seededValue(index, 12) * 100;
      return (
        <span
          key={`retro-${index}`}
          className="retro-block"
          style={{
            top: `${top}%`,
            width: `${size}px`,
            height: `${size / 2}px`,
            animationDelay: `${delay}s`,
            animationDuration: `${duration}s`,
            background: animationConfig.color,
          }}
        />
      );
    });
  };

  const renderByType = () => {
    switch (animationConfig.type) {
      case 'rain':
        return <div className="rain-layer">{renderParticles('rain-drop')}</div>;
      case 'snow':
        return <div className="snow-layer">{renderParticles('snow-flake')}</div>;
      case 'starfield':
        return <div className="starfield-layer">{renderParticles('star-particle')}</div>;
      case 'matrix-rain':
        return <div className="matrix-layer">{renderMatrixCode()}</div>;
      case 'retro-blocks':
        return <div className="retro-layer">{renderRetroBlocks()}</div>;
      case 'waves':
        return (
          <div className="waves-layer" style={{ '--wave-color': animationConfig.color }}>
            <div className="wave" />
            <div className="wave" />
            <div className="wave" />
            <div className="wave-glow" />
            {renderWaveBubbles()}
          </div>
        );
      case 'pulse':
        return (
          <div
            className="pulse-layer"
            style={{
              '--pulse-color': animationConfig.color,
              '--pulse-intensity': animationConfig.intensity
            }}
          />
        );
      default:
        return <div className="ambient-layer" />;
    }
  };

  const backgroundClasses = [
    'animated-background',
    `animated-${animationConfig.type}`,
    `speed-${animationConfig.speed}`
  ];

  if (animationConfig.type === 'waves') {
    backgroundClasses.push('has-wave-overlay');
  }

  return (
    <div className={backgroundClasses.join(' ')} aria-hidden="true">
      {renderByType()}
    </div>
  );
};

export default AnimatedBackground;
