import React, { useMemo, useState, useEffect } from 'react';
import './DailyDoodleTitle.css';

const TITLE_TEXT = 'GamePilot';
const LOGO_SRC = `${process.env.PUBLIC_URL}/gamepilotlogo.png`;

const DOODLE_LIBRARY = [
  {
    id: 'synthwave-runway',
    name: 'Neon Runway',
    accent: '🚀',
    fontFamily: '"Bungee", "Orbitron", "Exo 2", system-ui, sans-serif',
    background: 'linear-gradient(135deg, rgba(15,10,45,0.95), rgba(40,12,76,0.95))',
    border: '1px solid rgba(255,0,214,0.35)',
    shadow: '0 20px 45px rgba(255, 0, 214, 0.25)',
    letterPalette: [
      {
        gradient: 'linear-gradient(180deg, #f72585 0%, #b5179e 60%, #7209b7 100%)',
        shadow: '0 10px 25px rgba(247,37,133,0.6)',
        tilt: -6
      },
      {
        gradient: 'linear-gradient(180deg, #4895ef 0%, #4361ee 60%, #3a0ca3 100%)',
        shadow: '0 10px 25px rgba(67,97,238,0.45)',
        tilt: 3
      },
      {
        gradient: 'linear-gradient(180deg, #4cc9f0 0%, #4895ef 100%)',
        shadow: '0 10px 25px rgba(76,201,240,0.45)',
        tilt: -2
      }
    ],
    metaStyle: {
      color: 'rgba(255,255,255,0.85)',
      letterSpacing: '0.2em',
      textTransform: 'uppercase'
    },
    pattern: 'grid'
  },
  {
    id: 'pixel-parade',
    name: 'Pixel Parade',
    accent: '🕹️',
    fontFamily: '"Press Start 2P", "VT323", "Space Mono", monospace',
    background: 'linear-gradient(120deg, rgba(12,12,12,0.95), rgba(28,28,40,0.95))',
    border: '1px solid rgba(255,255,255,0.15)',
    shadow: '0 25px 35px rgba(0, 0, 0, 0.45)',
    letterPalette: [
      {
        gradient: 'linear-gradient(180deg, #ffb703 0%, #fb8500 100%)',
        shadow: '0 6px 12px rgba(251,133,0,0.55)',
        tilt: -2
      },
      {
        gradient: 'linear-gradient(180deg, #8ecae6 0%, #219ebc 100%)',
        shadow: '0 6px 12px rgba(33,158,188,0.5)',
        tilt: 4
      },
      {
        gradient: 'linear-gradient(180deg, #ff006e 0%, #d00000 100%)',
        shadow: '0 6px 12px rgba(208,0,0,0.55)',
        tilt: -4
      }
    ],
    metaStyle: {
      color: 'rgba(255,255,255,0.75)',
      letterSpacing: '0.05em',
      textTransform: 'uppercase'
    },
    pattern: 'pixels'
  },
  {
    id: 'nebula-script',
    name: 'Nebula Script',
    accent: '🌌',
    fontFamily: '"Sacramento", "Great Vibes", "Comfortaa", "Trebuchet MS", cursive',
    background: 'linear-gradient(135deg, rgba(3,7,30,0.95), rgba(20,33,61,0.95))',
    border: '1px solid rgba(118,93,255,0.35)',
    shadow: '0 25px 50px rgba(118,93,255,0.35)',
    letterPalette: [
      {
        gradient: 'linear-gradient(120deg, #ffee93 0%, #ffd6a5 100%)',
        shadow: '0 12px 30px rgba(255,214,165,0.5)',
        tilt: -2
      },
      {
        gradient: 'linear-gradient(120deg, #cdb4db 0%, #ffc8dd 100%)',
        shadow: '0 12px 30px rgba(205,180,219,0.5)',
        tilt: 5
      },
      {
        gradient: 'linear-gradient(120deg, #a0c4ff 0%, #90dbf4 100%)',
        shadow: '0 12px 30px rgba(160,196,255,0.45)',
        tilt: -5
      }
    ],
    metaStyle: {
      color: 'rgba(238,242,255,0.9)',
      letterSpacing: '0.08em',
      textTransform: 'capitalize'
    },
    pattern: 'stars'
  },
  {
    id: 'circuit-glow',
    name: 'Circuit Glow',
    accent: '💡',
    fontFamily: '"Rajdhani", "Sora", "Poppins", "Segoe UI", sans-serif',
    background: 'linear-gradient(140deg, rgba(5,17,38,0.95), rgba(7,36,64,0.92))',
    border: '1px solid rgba(0,255,135,0.3)',
    shadow: '0 30px 40px rgba(0, 255, 135, 0.2)',
    letterPalette: [
      {
        gradient: 'linear-gradient(180deg, #80ffdb 0%, #64dfdf 100%)',
        shadow: '0 12px 22px rgba(128,255,219,0.45)',
        tilt: -1
      },
      {
        gradient: 'linear-gradient(180deg, #56cfe1 0%, #48bfe3 100%)',
        shadow: '0 12px 22px rgba(86,207,225,0.45)',
        tilt: 2
      },
      {
        gradient: 'linear-gradient(180deg, #80ff72 0%, #7ee8fa 100%)',
        shadow: '0 12px 22px rgba(126,232,250,0.4)',
        tilt: -3
      }
    ],
    metaStyle: {
      color: 'rgba(128,255,219,0.85)',
      letterSpacing: '0.35em',
      textTransform: 'uppercase'
    },
    pattern: 'circuit'
  },
  {
    id: 'sunset-brush',
    name: 'Sunset Brush',
    accent: '🎨',
    fontFamily: '"Baloo 2", "Fredoka", "Nunito", system-ui, sans-serif',
    background: 'linear-gradient(135deg, rgba(255,140,66,0.92), rgba(255,94,98,0.9))',
    border: '1px solid rgba(255,255,255,0.35)',
    shadow: '0 30px 45px rgba(255,94,98,0.35)',
    letterPalette: [
      {
        gradient: 'linear-gradient(140deg, #fff3b0 0%, #ffe066 100%)',
        shadow: '0 8px 18px rgba(255,240,138,0.6)',
        tilt: -4
      },
      {
        gradient: 'linear-gradient(140deg, #ff9a8b 0%, #ff6a88 100%)',
        shadow: '0 8px 18px rgba(255,154,139,0.55)',
        tilt: 6
      },
      {
        gradient: 'linear-gradient(140deg, #fecfef 0%, #fda085 100%)',
        shadow: '0 8px 18px rgba(253,160,133,0.6)',
        tilt: -1
      }
    ],
    metaStyle: {
      color: 'rgba(80,34,25,0.9)',
      letterSpacing: '0.1em',
      textTransform: 'uppercase'
    },
    pattern: 'brush'
  }
];

const DOODLE_TRANSITIONS = [
  'slide-up',
  'slide-right',
  'zoom-pop',
  'tilt-drop',
  'fade-glow'
];

const THEME_DOODLE_MAP = {
  relaxed: 'sunset-brush',
  social: 'sunset-brush',
  creative: 'sunset-brush',
  sunset: 'sunset-brush',
  'sunset-paradise': 'sunset-brush',
  sporty: 'pixel-parade',
  competitive: 'pixel-parade',
  '16-bit-retro': 'pixel-parade',
  '8-bit-retro': 'pixel-parade',
  'retro-pipeline': 'pixel-parade',
  candy: 'pixel-parade',
  focused: 'circuit-glow',
  tactical: 'circuit-glow',
  digital: 'circuit-glow',
  'digital-ocean': 'circuit-glow',
  'circuit-glow': 'circuit-glow',
  'neon-pulse': 'synthwave-runway',
  energetic: 'synthwave-runway',
  'synthwave-runway': 'synthwave-runway',
  cyberpunk: 'circuit-glow',
  'cyberpunk-2077': 'circuit-glow',
  holographic: 'synthwave-runway',
  escapist: 'nebula-script',
  midnight: 'nebula-script',
  ocean: 'nebula-script',
  galaxy: 'nebula-script',
  'cosmic-nebula': 'nebula-script',
  'starfield-warp': 'nebula-script',
  'nebula-script': 'nebula-script',
  'arctic-aurora': 'nebula-script',
  'tropical-reef': 'sunset-brush',
  forest: 'sunset-brush',
  'forest-mist': 'sunset-brush',
  light: 'sunset-brush',
  dark: 'circuit-glow',
  custom: 'sunset-brush'
};

const THEME_TRANSITION_MAP = {
  relaxed: 'fade-glow',
  social: 'zoom-pop',
  creative: 'zoom-pop',
  sunset: 'tilt-drop',
  sporty: 'slide-right',
  competitive: 'slide-right',
  focused: 'slide-up',
  tactical: 'slide-up',
  energetic: 'tilt-drop',
  'neon-pulse': 'tilt-drop',
  cyberpunk: 'slide-up',
  'cyberpunk-2077': 'slide-up',
  holographic: 'zoom-pop',
  escapist: 'fade-glow',
  midnight: 'fade-glow',
  galaxy: 'fade-glow',
  'cosmic-nebula': 'fade-glow',
  'starfield-warp': 'fade-glow',
  ocean: 'slide-right',
  forest: 'slide-up',
  'forest-mist': 'fade-glow',
  light: 'fade-glow',
  dark: 'slide-up',
  custom: 'zoom-pop'
};

const getDayOfYear = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const getBaseIndex = (doodleId) => {
  if (!doodleId) return 0;
  return DOODLE_LIBRARY.findIndex((d) => d.id === doodleId) || 0;
};

const DailyDoodleTitle = ({ username, welcomeMessage, profilePic, themeId }) => {
  const normalizedTheme = themeId ? themeId.toLowerCase() : null;
  const [daySignature, setDaySignature] = useState(getDayOfYear());

  useEffect(() => {
    const syncSignature = () => setDaySignature(getDayOfYear());
    const interval = setInterval(syncSignature, 1000 * 60 * 30); // refresh twice per hour
    return () => clearInterval(interval);
  }, []);

  const doodle = useMemo(() => {
    const dayIndex = daySignature % DOODLE_LIBRARY.length;

    if (normalizedTheme) {
      const mappedId = THEME_DOODLE_MAP[normalizedTheme];
      if (mappedId) {
        const baseIndex = getBaseIndex(mappedId);
        const offsetIndex = (baseIndex + daySignature) % DOODLE_LIBRARY.length;
        return DOODLE_LIBRARY[offsetIndex];
      }
    }

    return DOODLE_LIBRARY[dayIndex];
  }, [normalizedTheme, daySignature]);

  const transitionVariant = useMemo(() => {
    if (normalizedTheme) {
      const mappedTransition = THEME_TRANSITION_MAP[normalizedTheme];
      if (mappedTransition) {
        return mappedTransition;
      }
    }
    const index = (daySignature + 3) % DOODLE_TRANSITIONS.length;
    return DOODLE_TRANSITIONS[index];
  }, [normalizedTheme, daySignature]);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(false);
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, [normalizedTheme, doodle.id, transitionVariant]);

  const dayLabel = useMemo(() => {
    const now = new Date();
    const weekday = now.toLocaleDateString(undefined, { weekday: 'long' });
    const monthDay = now.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
    return `${weekday} • ${monthDay}`;
  }, []);

  const letters = useMemo(() => {
    const palette = doodle.letterPalette;
    return TITLE_TEXT.split('').map((char, index) => {
      const style = palette[index % palette.length];
      return (
        <span
          key={`${doodle.id}-letter-${char}-${index}`}
          className="doodle-letter"
          style={{
            backgroundImage: style.gradient,
            textShadow: style.shadow,
            transform: `rotate(${style.tilt || 0}deg)`
          }}
        >
          {char}
        </span>
      );
    });
  }, [doodle]);

  const greeting = username ? `Welcome back, ${username}!` : 'Welcome to GamePilot';
  const avatarSrc = profilePic || LOGO_SRC;
  const avatarAlt = profilePic ? `${username || 'Player'} avatar` : 'GamePilot logo';

  const wrapperClasses = [
    'daily-doodle',
    `transition-${transitionVariant}`,
    mounted ? 'daily-doodle--enter' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapperClasses} aria-label={`GamePilot daily doodle - ${doodle.name}`}>
      <div
        className={`doodle-shell pattern-${doodle.pattern}`}
        style={{
          fontFamily: doodle.fontFamily,
          background: doodle.background,
          border: doodle.border,
          boxShadow: doodle.shadow
        }}
      >
        <div className="doodle-orbit" />
        <div className="doodle-trail" />
        <div className="doodle-logo" aria-hidden="true">
          <div className="doodle-logo-ring" />
          <img src={avatarSrc} alt={avatarAlt} loading="lazy" />
        </div>
        <div className="doodle-accent">{doodle.accent}</div>
        <div className="doodle-wordmark">
          {letters}
        </div>
        <div className="doodle-meta" style={doodle.metaStyle}>
          <span className="doodle-meta-label">{doodle.name} — {dayLabel}</span>
          <span className="doodle-meta-greeting">{greeting}</span>
          {welcomeMessage && (
            <span className="doodle-meta-tagline">{welcomeMessage}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyDoodleTitle;
