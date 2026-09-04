import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import moodThemes from './themes/moodThemes.json';
import { AchievementTracker } from './AchievementSystem';
import StorageService from './services/StorageService';
import InterfacePreferencesService from './services/InterfacePreferencesService';
import { SeasonalRewardService } from './services/SeasonalRewardService';

// Helper function to determine if text should be white or based on theme color
const getContrastColor = (bgColor) => {
  // Convert hex to RGB for luminance calculation
  const hex = bgColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate relative luminance (simplified)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return white for dark backgrounds, black for light backgrounds
  return luminance < 0.5 ? '#ffffff' : '#000000';
};

// Convert mood themes to CSS variable format
const convertMoodThemeToCSS = (theme) => ({
  '--bg-primary': theme.palette.background,
  '--bg-secondary': theme.palette.surface,
  '--bg-card': theme.palette.card || theme.palette.surface,
  '--bg-input': theme.palette.surface,
  '--bg-hover': theme.palette.hover,
  '--bg-active': theme.palette.primary,
  '--text-primary': theme.palette.text,
  '--text-secondary': theme.palette.text,
  '--text-muted': theme.palette.text,
  '--text-accent': theme.palette.accent,
  '--border-primary': theme.palette.secondary,
  '--border-secondary': theme.palette.primary,
  '--border-accent': theme.palette.accent,
  '--border-color': theme.palette.secondary,
  '--card-border': theme.palette.secondary,
  '--button-primary-bg': theme.palette.primary,
  '--button-primary-text': theme.palette.buttonText || getContrastColor(theme.palette.primary),
  '--button-primary-hover': theme.palette.accent,
  '--button-secondary-bg': theme.palette.secondary,
  '--button-secondary-text': theme.palette.buttonSecondaryText || getContrastColor(theme.palette.secondary),
  '--link-primary': theme.palette.accent,
  '--link-primary-hover': theme.palette.primary,
  '--text-color': theme.palette.text,
  '--card-bg': theme.palette.card || theme.palette.surface,
  '--input-bg': theme.palette.surface,
  '--button-bg': theme.palette.primary,
  '--button-text': theme.palette.buttonText || getContrastColor(theme.palette.primary),
  '--accent-color': theme.palette.accent,
  '--gradient-primary': theme.palette.primary,
  '--gradient-accent': theme.palette.accent,
  '--muted-color': theme.palette.text,
  '--text-inverse': theme.palette.primary,
  '--card': theme.palette.card || theme.palette.surface,
  // Button text color management to prevent clashes
  '--button-text-safe': getContrastColor(theme.palette.primary),
  '--button-secondary-text-safe': getContrastColor(theme.palette.secondary),
  '--header-bg': theme.palette.background,
  '--header-text': theme.palette.text,
  '--header-border': theme.palette.secondary,
  '--header-accent': theme.palette.accent,
  '--nav-bg': theme.palette.card || theme.palette.surface,
  '--nav-text': theme.palette.text,
  '--nav-hover': theme.palette.hover,
  '--nav-active': theme.palette.primary,
  '--page-title': theme.palette.text,
  '--page-subtitle': theme.palette.secondary,
  '--section-header': theme.palette.text,
  '--section-border': theme.palette.secondary,
  // Comprehensive container colors
  '--container-bg': theme.palette.card || theme.palette.surface,
  '--content-bg': theme.palette.surface,
  '--modal-bg': theme.palette.card || theme.palette.surface,
  '--sidebar-bg': theme.palette.card || theme.palette.surface,
  '--dropdown-bg': theme.palette.card || theme.palette.surface,
  '--tooltip-bg': theme.palette.primary,
  '--overlay-bg': 'rgba(0, 0, 0, 0.5)',
  '--shadow': theme.effects.shadow || '0 4px 20px rgba(0, 0, 0, 0.1)',
  // Theme-specific unique titles
  '--gamepilot-title': getThemeSpecificTitle(theme.id),
  '--home-title': getThemeSpecificHomeTitle(theme.id),
  '--library-title': getThemeSpecificLibraryTitle(theme.id),
  '--stats-title': getThemeSpecificStatsTitle(theme.id),
  '--achievements-title': getThemeSpecificAchievementsTitle(theme.id),
  '--profile-title': getThemeSpecificProfileTitle(theme.id),
  '--settings-title': getThemeSpecificSettingsTitle(theme.id)
});

// Theme-specific unique titles
const getThemeSpecificTitle = (themeId) => {
  const titles = {
    relaxed: "🌴 GamePilot - Chill Zone",
    social: "🔥 GamePilot - Social Hub", 
    focused: "⚡ GamePilot - Focus Mode",
    creative: "🎨 GamePilot - Art Studio",
    competitive: "⚔️ GamePilot - Battle Ready",
    sunset: "🌅 GamePilot - Golden Hour",
    midnight: "🌙 GamePilot - Midnight Mode",
    retro: "🕹️ GamePilot - Retro Arcade",
    forest: "🌲 GamePilot - Forest Realm",
    ocean: "🌊 GamePilot - Ocean Depths"
  };
  return titles[themeId] || "🎮 GamePilot";
};

const getThemeSpecificHomeTitle = (themeId) => {
  const titles = {
    relaxed: "🌴 Chill Home",
    social: "🔥 Social Hub", 
    focused: "⚡ Focus Central",
    creative: "🎨 Art Space",
    competitive: "⚔️ Battle Ready",
    sunset: "🌅 Sunset Lounge",
    midnight: "🌙 Midnight Station",
    retro: "🎮 16-Bit Game Room",
    forest: "🌳 Forest Cabin",
    ocean: "🌊 Ocean Deck",
    zen: "🎮 8-Bit Game Room",
    candy: "🍭 Candy Paradise",
    cyberpunk: "🤖 Cyberpunk Nexus",
    noir: "� Comic Headquarters",
    galaxy: "🌌 Space Station"
  };
  return titles[themeId] || "🏠 Home";
};

const getThemeSpecificLibraryTitle = (themeId) => {
  const titles = {
    relaxed: "🌴 Chill Library",
    social: "🔥 Social Collection", 
    focused: "⚡ Focus Library",
    creative: "🎨 Art Gallery",
    competitive: "⚔️ Battle Library",
    sunset: "🌅 Sunset Gallery",
    midnight: "🌙 Midnight Archive",
    retro: "🎮 16-Bit Console",
    forest: "🌳 Forest Library",
    ocean: "🌊 Ocean Archive",
    light: "📚 Library",
    zen: "🎮 8-Bit Arcade",
    candy: "🍭 Candy Shop",
    cyberpunk: "🤖 Cyberpunk Hub",
    noir: "� Comic Library",
    galaxy: "🌌 Cosmic Gateway"
  };
  return titles[themeId] || "📚 Library";
};

const getThemeSpecificStatsTitle = (themeId) => {
  const titles = {
    relaxed: "🌴 Chill Stats",
    social: "🔥 Social Analytics", 
    focused: "⚡ Focus Metrics",
    creative: "🎨 Art Insights",
    competitive: "⚔️ Battle Statistics",
    sunset: "🌅 Sunset Analytics",
    midnight: "🌙 Midnight Metrics",
    retro: "🎮 16-Bit High Scores",
    forest: "🌳 Forest Stats",
    ocean: "🌊 Ocean Analytics",
    zen: "🎮 8-Bit Stats",
    candy: "🍭 Candy Insights",
    cyberpunk: "🤖 Cyberpunk Data",
    noir: "� Comic Stats",
    galaxy: "🌌 Cosmic Statistics"
  };
  return titles[themeId] || "📊 Statistics";
};

const getThemeSpecificAchievementsTitle = (themeId) => {
  const titles = {
    relaxed: "🌴 Chill Achievements",
    social: "🔥 Social Trophies", 
    focused: "⚡ Focus Medals",
    creative: "🎨 Art Awards",
    competitive: "⚔️ Battle Badges",
    sunset: "🌅 Sunset Awards",
    midnight: "🌙 Midnight Badges",
    retro: "🎮 16-Bit Achievements",
    forest: "🌳 Forest Medals",
    ocean: "🌊 Ocean Trophies",
    zen: "🎮 8-Bit Achievements",
    candy: "🍭 Candy Trophies",
    cyberpunk: "🤖 Cyberpunk Badges",
    noir: "� Comic Achievements",
    galaxy: "🌌 Cosmic Achievements"
  };
  return titles[themeId] || "🏆 Achievements";
};

const getThemeSpecificProfileTitle = (themeId) => {
  const titles = {
    relaxed: "🌴 Chill Profile",
    social: "🔥 Social Profile", 
    focused: "⚡ Focus Profile",
    creative: "🎨 Artist Profile",
    competitive: "⚔️ Battle Profile",
    sunset: "🌅 Sunset Profile",
    midnight: "🌙 Midnight Profile",
    retro: "🎮 16-Bit Profile",
    forest: "🌳 Forest Profile",
    ocean: "🌊 Ocean Profile",
    zen: "🎮 8-Bit Profile",
    candy: "🍭 Candy Profile",
    cyberpunk: "🤖 Cyberpunk Profile",
    noir: "� Comic Profile",
    galaxy: "🌌 Cosmic Profile"
  };
  return titles[themeId] || "👤 Profile";
};

const getThemeSpecificSettingsTitle = (themeId) => {
  const titles = {
    relaxed: "🌴 Chill Settings",
    social: "🔥 Social Settings", 
    focused: "⚡ Focus Settings",
    creative: "🎨 Art Settings",
    competitive: "⚔️ Battle Settings",
    sunset: "🌅 Sunset Settings",
    midnight: "🌙 Midnight Settings",
    retro: "🎮 16-Bit Settings",
    forest: "🌳 Forest Settings",
    ocean: "🌊 Ocean Settings",
    zen: "🎮 8-Bit Settings",
    candy: "🍭 Candy Settings",
    cyberpunk: "🤖 Cyberpunk Settings",
    noir: "� Comic Settings",
    galaxy: "🌌 Cosmic Settings"
  };
  return titles[themeId] || "⚙️ Settings";
};

// Theme context
const ThemeContext = createContext(undefined);

export { ThemeContext };

// Theme provider component
export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState(() => {
    // Load saved theme from localStorage
    const savedTheme = StorageService.getString('theme');
    
    // Get all available themes
    const allThemes = {
      light: { name: 'Light', id: 'light' },
      dark: { name: 'Dark', id: 'dark' }
    };
    
    // Add mood themes
    moodThemes.forEach(theme => {
      allThemes[theme.id] = { name: theme.name, id: theme.id };
    });
    
    // Validate saved theme
    if (savedTheme && allThemes[savedTheme]) {
      return savedTheme;
    }

    if (savedTheme) {
      console.warn(`Invalid saved theme '${savedTheme}', falling back to dark. Available themes:`, Object.keys(allThemes));
    }

    // Check if autoSeasonalTheme is enabled
    const autoSeasonal = StorageService.getString('autoSeasonalTheme');
    if (autoSeasonal === 'true') {
      const seasonalTheme = SeasonalRewardService.getSeasonThemeId();
      if (seasonalTheme && allThemes[seasonalTheme]) {
        return seasonalTheme;
      }
    }

    return 'dark';
  });

  const [bigScreenMode, setBigScreenMode] = useState(() => !!InterfacePreferencesService.get('bigScreenMode'));
  const [compactMode, setCompactMode] = useState(() => StorageService.getString('compactMode') === 'true');
  const [autoTheme, setAutoTheme] = useState(() => StorageService.getString('autoTheme') === 'true');

  // Validate Patreon code and apply XP boost (no direct content unlocks)
  const validatePatreonCode = (code) => {
    const result = AchievementTracker.activatePatreonXPBoost(code);
    if (!result.success) {
      return result;
    }

    const xpStats = AchievementTracker.getXPStats();

    return {
      ...result,
      message: `${result.message} Current level: ${xpStats.level} (${xpStats.totalXP.toLocaleString()} XP).`,
      level: xpStats.level,
      totalXP: xpStats.totalXP
    };
  };

  // Legacy API surface retained for compatibility with older UI flows.
  const selectThemesWithCredits = () => {
    return {
      success: false,
      message: 'Theme credits have been retired. Themes now unlock through XP progression.'
    };
  };

  // Founder-exclusive themes require a founder tier; all other themes are free
  const isPatreonTheme = (themeId) => {
    const meta = moodThemes.find((t) => t.id === themeId);
    return Boolean(meta?.founderExclusive);
  };

  // Check if user has an active Patreon boost (any tier)
  const hasPatreonAccess = useCallback(() => {
    const profile = AchievementTracker.getPatreonBoostProfile();
    return Boolean(profile?.code) && profile.tier !== null && profile.tier !== 'none';
  }, []);

  // Founder-exclusive themes require founder status; everything else is open
  const hasPremiumAccess = useCallback(() => {
    return true;
  }, []);

  const hasFounderAccess = useCallback(() => {
    const profile = AchievementTracker.getPatreonBoostProfile();
    return Boolean(profile?.tier);
  }, []);

  // Get all available themes
  const getAvailableThemes = () => {
    const themes = {
      light: { name: 'Light', id: 'light' },
      dark: { name: 'Dark', id: 'dark' }
    };

    // Add mood themes
    moodThemes.forEach(theme => {
      themes[theme.id] = {
        name: theme.name,
        id: theme.id,
        patreonExclusive: isPatreonTheme(theme.id)
      };
    });

    return themes;
  };

  // Get all available themes
  const getAllThemes = () => {
    const themes = {
      light: { name: 'Light', id: 'light' },
      dark: { name: 'Dark', id: 'dark' }
    };
    

    // Add mood themes
    moodThemes.forEach(theme => {
      themes[theme.id] = { name: theme.name, id: theme.id };
    });

    return themes;
  };

  // Apply theme builder override if active
  useEffect(() => {
    const isBuilderActive = StorageService.getString('themeBuilderActive') === 'true';
    if (!isBuilderActive) return;

    const config = StorageService.get('themeBuilderConfig', null);
    if (!config) return;

    const root = document.documentElement;
    const bg = config.bgType === 'solid'
      ? config.solidColor
      : `linear-gradient(${config.gradientAngle}deg, ${config.gradientFrom}, ${config.gradientTo})`;

    const tc = config.textColor || '#ffffff';
    const tcRgb = tc
      .replace('#','')
      .match(/.{2}/g)
      .map((x) => parseInt(x,16))
      .join(', ');
    const effectColor = config.effectColor || '#ffffff';
    const effectRgb = effectColor
      .replace('#','')
      .match(/.{2}/g)
      .map((x) => parseInt(x,16))
      .join(', ');
    const effectSoft = `rgba(${effectRgb}, ${Math.min(0.8, 0.08 + (config.effectIntensity ?? 3) * 0.1)})`;

    const cssVars = {
      '--bg-primary': bg,
      '--bg-secondary': config.bgType === 'solid' ? config.solidColor : config.gradientFrom,
      '--bg-card': `rgba(255,255,255,0.${String(config.cardOpacity ?? 8).padStart(2, '0')})`,
      '--bg-input': `rgba(255,255,255,0.${String(Math.max(4, (config.cardOpacity ?? 8) - 4)).padStart(2, '0')})`,
      '--bg-hover': `rgba(255,255,255,0.${String(Math.min(20, (config.cardOpacity ?? 8) + 4)).padStart(2, '0')})`,
      '--text-primary': tc,
      '--text-secondary': `rgba(${tcRgb}, 0.8)`,
      '--text-muted': `rgba(${tcRgb}, 0.6)`,
      '--text-color': tc,
      '--text-accent': config.accent,
      '--border-primary': 'rgba(255,255,255,0.15)',
      '--border-secondary': 'rgba(255,255,255,0.1)',
      '--accent-color': config.accent,
      '--primary-color': config.accent,
      '--button-primary-bg': config.accent,
      '--button-primary-text': '#0f172a',
      '--link-primary': config.accent,
      '--gradient-primary': config.gradientFrom || config.solidColor,
      '--gradient-accent': config.gradientTo || config.solidColor,
      '--card-radius': `${config.cardRadius ?? 12}px`,
      '--card-blur': `${config.cardBlur ?? 12}px`,
      '--card-border-width': `${config.borderWidth ?? 1}px`,
      '--card-shadow-depth': config.shadowDepth ?? 10,
      '--builder-font': config.fontFamily === 'monospace' ? "'Fira Code', 'Cascadia Code', monospace" : config.fontFamily === 'serif' ? "'Merriweather', 'Georgia', serif" : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      '--neon-glow': config.neonGlow ? `0 0 ${Math.max(12, (config.shadowDepth ?? 10) * 2)}px ${config.accent}66, 0 0 4px ${config.accent}44` : `0 ${Math.max(4, (config.shadowDepth ?? 10) / 2)}px ${Math.max(12, (config.shadowDepth ?? 10) * 2)}px rgba(0, 0, 0, 0.2)`,
      '--builder-effect': config.effect || 'none',
      '--builder-effect-color': effectColor,
      '--builder-effect-soft': effectSoft,
      '--builder-effect-intensity': config.effectIntensity ?? 3,
      '--builder-effect-speed': `${Math.max(3, 18 - (config.particleSpeed ?? 3) * 3)}s`,
      '--builder-vignette': (config.vignette ?? 0) / 100,
      '--builder-grain': (config.grain ?? 0) / 100,
      '--builder-bloom': (config.bloom ?? 0) / 100,
      '--nav-text': tc,
      '--nav-bg': `rgba(255,255,255,0.${String(config.cardOpacity ?? 8).padStart(2, '0')})`,
      '--nav-hover': `rgba(255,255,255,0.${String(Math.min(20, (config.cardOpacity ?? 8) + 4)).padStart(2, '0')})`,
      '--nav-active': config.accent,
      '--header-text': tc,
      '--header-bg': bg,
      '--header-border': 'rgba(255,255,255,0.15)',
      '--header-accent': config.accent,
      '--card-bg': `rgba(255,255,255,0.${String(config.cardOpacity ?? 8).padStart(2, '0')})`,
      '--input-bg': `rgba(255,255,255,0.${String(Math.max(4, (config.cardOpacity ?? 8) - 4)).padStart(2, '0')})`,
      '--option-bg': config.bgType === 'solid' ? config.solidColor : config.gradientFrom,
      '--button-bg': config.accent,
      '--button-text': '#0f172a',
      '--muted-color': `rgba(${tcRgb}, 0.6)`,
      '--text-inverse': config.accent,
      '--card': `rgba(255,255,255,0.${String(config.cardOpacity ?? 8).padStart(2, '0')})`,
      '--container-bg': `rgba(255,255,255,0.${String(config.cardOpacity ?? 8).padStart(2, '0')})`,
      '--content-bg': bg,
      '--modal-bg': `rgba(255,255,255,0.${String(config.cardOpacity ?? 8).padStart(2, '0')})`,
      '--sidebar-bg': `rgba(255,255,255,0.${String(config.cardOpacity ?? 8).padStart(2, '0')})`,
      '--dropdown-bg': `rgba(255,255,255,0.${String(config.cardOpacity ?? 8).padStart(2, '0')})`,
      '--tooltip-bg': config.accent,
      '--page-title': tc,
      '--page-subtitle': `rgba(${tcRgb}, 0.8)`,
      '--section-header': tc,
      '--section-border': 'rgba(255,255,255,0.15)',
      '--shadow': '0 4px 20px rgba(0, 0, 0, 0.1)',
    };

    Object.entries(cssVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    document.body.classList.add('theme-builder-active');
    document.body.dataset.builderEffect = config.effect || 'none';
    return () => {
      document.body.classList.remove('theme-builder-active');
      delete document.body.dataset.builderEffect;
      Object.keys(cssVars).forEach((key) => {
        root.style.removeProperty(key);
      });
    };
  }, [currentTheme]);

  // Apply theme to DOM
  useEffect(() => {
    const root = document.documentElement;
    const allThemes = getAllThemes();

    // Remove all theme classes
    Object.keys(allThemes).forEach(themeId => {
      document.body.classList.remove(`${themeId}`);
    });

    // Add current theme class
    document.body.classList.add(currentTheme);

    // Skip normal theme CSS if theme builder is active
    const isBuilderActive = StorageService.getString('themeBuilderActive') === 'true';
    if (isBuilderActive) return;

    // Apply CSS variables based on theme
    const moodTheme = moodThemes.find(t => t.id === currentTheme);
    if (moodTheme) {
      const cssVars = convertMoodThemeToCSS(moodTheme);
      Object.entries(cssVars).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });

      // Handle custom background image for custom theme
      if (currentTheme === 'custom') {
        const customBgImage = StorageService.getString('customBgImage');
        const customBgOverlay = StorageService.getString('customBgOverlay', '30');
        
        if (customBgImage) {
          // Apply custom background with overlay
          root.style.setProperty('--custom-bg-image', `linear-gradient(rgba(0, 0, 0, ${parseInt(customBgOverlay) / 100}), rgba(0, 0, 0, ${parseInt(customBgOverlay) / 100})), url(${customBgImage})`);
          root.style.setProperty('--bg-primary', `linear-gradient(rgba(0, 0, 0, ${parseInt(customBgOverlay) / 100}), rgba(0, 0, 0, ${parseInt(customBgOverlay) / 100})), url(${customBgImage})`);
        }
      } else {
        // Clear custom background variables for other themes
        root.style.removeProperty('--custom-bg-image');
      }
    }
  }, [currentTheme]);

  useEffect(() => {
    if (bigScreenMode) {
      document.body.classList.add('big-screen-mode');
    } else {
      document.body.classList.remove('big-screen-mode');
    }
  }, [bigScreenMode]);

  useEffect(() => {
    const unsubscribe = InterfacePreferencesService.subscribe((prefs) => {
      setBigScreenMode(!!prefs.bigScreenMode);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (compactMode) {
      document.body.classList.add('compact-mode');
    } else {
      document.body.classList.remove('compact-mode');
    }
  }, [compactMode]);

  useEffect(() => {
    if (!autoTheme) return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const apply = () => {
      const next = mq.matches ? 'light' : 'dark';
      setCurrentTheme(next);
      StorageService.setString('theme', next);
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [autoTheme]);

  useEffect(() => {
    const activeTheme = moodThemes.find((theme) => theme.id === currentTheme);
    if (isPatreonTheme(activeTheme?.id) && !hasFounderAccess()) {
      setCurrentTheme('dark');
      StorageService.setString('theme', 'dark');
    }
  }, [currentTheme, hasFounderAccess]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('themeChange', { detail: currentTheme }));
    }
  }, [currentTheme]);

  // Listen for external theme-change requests (e.g. Pilot Persona apply).
  useEffect(() => {
    const handleRequest = (event) => {
      const themeId = event?.detail?.themeId;
      if (!themeId) return;
      const allThemes = getAvailableThemes();
      if (!allThemes[themeId]) return;
      const meta = moodThemes.find((theme) => theme.id === themeId);
      if (isPatreonTheme(meta?.id) && !hasFounderAccess()) return;
      setCurrentTheme(themeId);
      StorageService.setString('theme', themeId);
    };
    window.addEventListener('gamepilot:request-theme', handleRequest);
    return () => window.removeEventListener('gamepilot:request-theme', handleRequest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleBigScreenMode = () => {
    const next = !bigScreenMode;
    InterfacePreferencesService.set('bigScreenMode', next);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gamepilot:bigscreen-toggled', { detail: { enabled: next } }));
    }
  };

  const toggleCompactMode = () => {
    setCompactMode(prev => {
      const next = !prev;
      StorageService.setString('compactMode', String(next));
      return next;
    });
  };

  const toggleAutoTheme = () => {
    setAutoTheme(prev => {
      const next = !prev;
      StorageService.setString('autoTheme', String(next));
      return next;
    });
  };

  const value = {
    currentTheme,
    setTheme: (themeId) => {
      const allThemes = getAvailableThemes();
      if (allThemes[themeId]) {
        const selectedTheme = moodThemes.find((theme) => theme.id === themeId);
        if (isPatreonTheme(selectedTheme?.id) && !hasFounderAccess()) {
          return false;
        }
        setCurrentTheme(themeId);
        StorageService.setString('theme', themeId);
        StorageService.remove('themeBuilderActive');
        return true;
      } else {
        console.warn(`Theme '${themeId}' is not available. Available themes:`, Object.keys(allThemes));
        setCurrentTheme('dark');
        StorageService.setString('theme', 'dark');
        StorageService.remove('themeBuilderActive');
        return false;
      }
    },
    getCurrentTheme: () => getAvailableThemes()[currentTheme] || { name: 'Dark' },
    availableThemes: getAvailableThemes(),
    moodThemes,
    getThemeMeta: (themeId) => moodThemes.find(theme => theme.id === themeId),
    getFounderTier: () => AchievementTracker.getPatreonBoostProfile().tier || null,
    validatePatreonCode,
    selectThemesWithCredits,
    isPatreonTheme,
    hasPatreonAccess,
    hasPremiumAccess,
    hasFounderAccess,
    getAvailableThemes,
    bigScreenMode,
    toggleBigScreenMode,
    compactMode,
    toggleCompactMode,
    autoTheme,
    toggleAutoTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Export all theme-specific title functions
export { 
  getThemeSpecificTitle,
  getThemeSpecificHomeTitle,
  getThemeSpecificLibraryTitle,
  getThemeSpecificStatsTitle,
  getThemeSpecificAchievementsTitle,
  getThemeSpecificProfileTitle,
  getThemeSpecificSettingsTitle
};

export default ThemeProvider;
