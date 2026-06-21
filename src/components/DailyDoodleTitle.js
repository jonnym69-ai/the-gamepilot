import React, { useMemo, useState, useEffect } from 'react';
import { ProgressionUnlockService } from '../services/ProgressionUnlockService';
import { GamingIdentity } from '../GamingIdentity';
import StorageService from '../services/StorageService';
import './DailyDoodleTitle.css';

const DEFAULT_WORDMARK = 'GamePilot';
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

// Returns true when a CSS colour string is perceptually light
const isColorLight = (colorStr) => {
  if (!colorStr) return false;
  // Parse the first hex or rgb value from a gradient/solid string
  const hex = colorStr.match(/#([a-f\d]{6}|[a-f\d]{3})/i)?.[1];
  if (hex) {
    const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    // Perceived luminance (WCAG)
    return (0.299 * r + 0.587 * g + 0.114 * b) > 155;
  }
  const rgb = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgb) {
    return (0.299 * +rgb[1] + 0.587 * +rgb[2] + 0.114 * +rgb[3]) > 155;
  }
  return false;
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
  const [doodleStyle, setDoodleStyle] = useState(
    () => StorageService.getString('doodleStyleOverride') || 'auto'
  );
  const [daySignature, setDaySignature] = useState(getDayOfYear());
  const [currentDateTime, setCurrentDateTime] = useState(() => new Date());
  const [selectedLogoAnimation, setSelectedLogoAnimation] = useState(() => ProgressionUnlockService.getRewardPresentationCustomization()?.selectedLogoAnimation || 'synthwave-runway');
  const [profileCustomization, setProfileCustomization] = useState(() => ProgressionUnlockService.getProfileCustomization());
  const [doodleWordmark, setDoodleWordmark] = useState(
    () => StorageService.getString('doodleWordmark', DEFAULT_WORDMARK)
  );
  const [identity, setIdentity] = useState(() => GamingIdentity.getProfile());
  const doodleEnabled = StorageService.getString('enableDailyDoodle') !== 'false';
  const preferredTimeZone = StorageService.getString('timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const resolvedLogoAnimation = selectedLogoAnimation || 'synthwave-runway';


  useEffect(() => {
    const syncSignature = () => setDaySignature(getDayOfYear());
    const interval = setInterval(syncSignature, 1000 * 60 * 30); // refresh twice per hour
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleDoodleWordmarkUpdated = () => {
      setDoodleWordmark(StorageService.getString('doodleWordmark', DEFAULT_WORDMARK));
    };

    const handleRewardPresentationUpdated = (event) => {
      const nextAnimation = event?.detail?.selectedLogoAnimation;
      if (nextAnimation) {
        setSelectedLogoAnimation(nextAnimation);
        return;
      }

      setSelectedLogoAnimation(ProgressionUnlockService.getRewardPresentationCustomization()?.selectedLogoAnimation || 'synthwave-runway');
    };

    const handleProfileUpdated = () => {
      setProfileCustomization(ProgressionUnlockService.getProfileCustomization());
      setIdentity(GamingIdentity.getProfile());
    };

    const handleDoodleStyleUpdated = () => {
      setDoodleStyle(StorageService.getString('doodleStyleOverride') || 'auto');
    };

    window.addEventListener('gamepilot:reward-presentation-updated', handleRewardPresentationUpdated);
    window.addEventListener('gamepilot:profile-updated', handleProfileUpdated);
    window.addEventListener('gamepilot:doodle-style-updated', handleDoodleStyleUpdated);
    window.addEventListener('gamepilot:doodle-wordmark-updated', handleDoodleWordmarkUpdated);
    return () => {
      window.removeEventListener('gamepilot:reward-presentation-updated', handleRewardPresentationUpdated);
      window.removeEventListener('gamepilot:profile-updated', handleProfileUpdated);
      window.removeEventListener('gamepilot:doodle-style-updated', handleDoodleStyleUpdated);
      window.removeEventListener('gamepilot:doodle-wordmark-updated', handleDoodleWordmarkUpdated);
    };
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
  }, [daySignature, normalizedTheme]);

  // Final light-bg decision now that we have the resolved doodle
  const isLight = useMemo(() => {
    if (doodleStyle === 'dark') return false;
    if (doodleStyle === 'light') return true;
    const banners = ProgressionUnlockService.getProfileBanners();
    const banner = banners.find((b) => b.id === profileCustomization.selectedBanner);
    if (banner?.preview) return isColorLight(banner.preview);
    return isColorLight(doodle.background);
  }, [doodle, doodleStyle, profileCustomization.selectedBanner]);

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

  const handleDoodleClick = () => {
    setMounted(false);
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  };

  const dayLabel = useMemo(() => {
    const weekday = new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      timeZone: preferredTimeZone
    }).format(currentDateTime);
    const monthDay = new Intl.DateTimeFormat('en-GB', {
      month: 'long',
      day: 'numeric',
      timeZone: preferredTimeZone
    }).format(currentDateTime);
    return `${weekday} • ${monthDay}`;
  }, [currentDateTime, preferredTimeZone]);

  const timeLabel = useMemo(() => (
    new Intl.DateTimeFormat('en-GB', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: preferredTimeZone
    }).format(currentDateTime)
  ), [currentDateTime, preferredTimeZone]);

  const timeZoneLabel = useMemo(() => {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: preferredTimeZone,
      timeZoneName: 'short'
    }).formatToParts(currentDateTime);

    return parts.find((part) => part.type === 'timeZoneName')?.value || preferredTimeZone;
  }, [currentDateTime, preferredTimeZone]);

  const wordmark = doodleWordmark || DEFAULT_WORDMARK;
  const letters = useMemo(() => {
    const palette = doodle.letterPalette;
    return wordmark.split('').map((char, index) => {
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
  }, [doodle, wordmark]);

  // Reward-derived styling
  const rewardShellStyles = useMemo(() => {
    const frames = ProgressionUnlockService.getProfileFrames();
    const banners = ProgressionUnlockService.getProfileBanners();
    const frame = frames.find((f) => f.id === profileCustomization.selectedFrame);
    const banner = banners.find((b) => b.id === profileCustomization.selectedBanner);

    return {
      frameBorder: frame?.accentColor ? `1px solid ${frame.accentColor}` : undefined,
      frameShadow: frame?.shadowColor ? `0 20px 45px ${frame.shadowColor}` : undefined,
      bannerBackground: banner?.preview || undefined
    };
  }, [profileCustomization.selectedFrame, profileCustomization.selectedBanner]);

  const equippedTitle = useMemo(() => {
    const titles = ProgressionUnlockService.getProfileTitles();
    return titles.find((t) => t.id === profileCustomization.selectedTitle);
  }, [profileCustomization.selectedTitle]);

  // Gaming identity greeting / tagline
  const identityGreeting = useMemo(() => {
    if (!username) return 'Welcome to GamePilot';
    const sig = identity?.identity?.signature || identity?.signature;
    if (sig) return sig;
    const desc = identity?.identity?.description;
    if (desc) return desc;
    return `Welcome back, ${username}!`;
  }, [username, identity]);

  const identityTagline = useMemo(() => {
    if (welcomeMessage) return welcomeMessage;
    const desc = identity?.identity?.description;
    if (desc && desc !== identityGreeting) return desc;
    return null;
  }, [welcomeMessage, identity, identityGreeting]);

  const greeting = username ? identityGreeting : 'Welcome to GamePilot';
  const avatarSrc = profilePic || LOGO_SRC;
  const avatarAlt = profilePic ? `${username || 'Player'} avatar` : 'GamePilot logo';

  const wrapperClasses = [
    'daily-doodle',
    `transition-${transitionVariant}`,
    mounted ? 'daily-doodle--enter' : ''
  ]
    .filter(Boolean)
    .join(' ');

  if (!doodleEnabled) {
    return (
      <img src={LOGO_SRC} alt="GamePilot logo" className="logo-static" />
    );
  }

  return (
    <div 
      className={wrapperClasses} 
      aria-label={`GamePilot daily doodle - ${doodle.name}`}
      onClick={handleDoodleClick}
      style={{ cursor: 'pointer' }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleDoodleClick(); }}
    >
      <div
        className={`doodle-shell pattern-${doodle.pattern}${isLight ? ' doodle-shell--light' : ''}`}
        style={{
          fontFamily: doodle.fontFamily,
          background: rewardShellStyles.bannerBackground || doodle.background,
          border: rewardShellStyles.frameBorder || doodle.border,
          boxShadow: rewardShellStyles.frameShadow || doodle.shadow
        }}
      >
        <div className="doodle-orbit" />
        <div className="doodle-trail" />
        <div className={`doodle-logo logo-animation-${resolvedLogoAnimation}`} aria-hidden="true">
          <div className="doodle-logo-ring" />
          <div className="doodle-logo-particles">
            <span className="doodle-logo-particle particle-a" />
            <span className="doodle-logo-particle particle-b" />
            <span className="doodle-logo-particle particle-c" />
          </div>
          <img src={avatarSrc} alt={avatarAlt} loading="lazy" />
        </div>
        <div className="doodle-accent">{doodle.accent}</div>
        <div className="doodle-left">
          <div className="doodle-wordmark">
            {letters}
          </div>
          {equippedTitle?.name && (
            <div className="doodle-title-badge" style={{ '--title-accent': equippedTitle.accentColor || 'var(--accent)' }}>
              {equippedTitle.name}
            </div>
          )}
        </div>
        <div className="doodle-meta" style={{ ...doodle.metaStyle, '--identity-accent': equippedTitle?.accentColor || 'var(--accent)', ...(isLight ? { color: 'rgba(30,20,10,0.85)', textShadow: '0 1px 3px rgba(255,255,255,0.5)' } : {}) }}>
          <span className="doodle-meta-label">{doodle.name} — {dayLabel}</span>
          <span className="doodle-meta-datetime">{timeLabel} <span className="doodle-meta-timezone">{timeZoneLabel}</span></span>
          <span className="doodle-meta-greeting">{greeting}</span>
          {identityTagline && (
            <span className="doodle-meta-tagline">{identityTagline}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyDoodleTitle;
